/**
 * MATCH CLASS - Server-side authoritative game simulation
 * Owns fighters, ticking, attacks, match state, and broadcasting
 * No external dependencies on global io, gameplayEngine, or room.matchFighters
 *
 * SERVER RESPONSIBILITIES:
 * - Movement (velocity, position, gravity)
 * - Combat (hit detection, damage calculation, attack resolution)
 * - Collisions (player-to-player, wall boundaries)
 * - State machines (idle, attack, guard, dash, staggered, defeated)
 * - Abilities (validation, execution, cooldowns)
 * - Knockback and stun
 * - Status effects (burn, bleed, rupture, etc.)
 * - Match rules (win conditions, match end)
 *
 * CLIENT RESPONSIBILITIES:
 * - Rendering (sprites, animations, particles)
 * - UI (health bars, cooldown indicators, menus)
 * - Camera (positioning, zoom, shake effects)
 * - Input collection (sending input intent to server)
 * - Snapshot application (applying server state to local fighters)
 * - Interpolation (smoothing movement between snapshots)
 * - Audio (sound effects, music)
 */

const GameplayEngine = require('./gameplayEngine');
const SLAM_ATTACK_RADIUS = 80;

class Match {
    constructor(room, io) {
        this.room = room;
        this.io = io;
        this.engine = new GameplayEngine();
        
        this.players = {};
        this.running = false;
        this.interval = null;
        this.tickRate = 50; // 50ms = 20 ticks per second
    }

    /**
     * Initialize match with players from room
     */
    initialize(playerConfigs) {
        this.players = {};
        
        playerConfigs.forEach(config => {
            const charKey = config.characterKey || 'JOHN';
            const charConfig = this.engine.getCharacterConfig(charKey);
            
            if (!charConfig) {
                console.warn(`Character config not found for ${charKey}`);
                return;
            }
            
            // Initialize authoritative game state through GameplayEngine
            const gameState = this.engine.initializeCharacter(config.clientId, charKey);
            gameState.dashCharges = charConfig.dashCharges || 3;
            gameState.dashTimer = 0;
            gameState.dashDurationTimer = 0;
            gameState.isDashing = false;
            gameState.canDash = true;
            gameState.hitTimer = 0; // hitstun timer
            
            // Set starting position
            const index = config.index || 0;
            const spacing = 300;
            const centerX = 700;
            const totalWidth = (playerConfigs.length - 1) * spacing;
            const startX = centerX - totalWidth / 2;
            
            gameState.position = {
                x: startX + (index * spacing),
                y: 600
            };
            gameState.facing = index === 0 ? 1 : -1;
            
            this.players[config.clientId] = {
                clientId: config.clientId,
                characterKey: charKey,
                gameState: gameState,
                config: charConfig,
                input: {
                    left: false,
                    right: false,
                    up: false,
                    down: false,
                    attack: false,
                    guard: false,
                    dash: false,
                    slam: false,
                    attackPressed: false,
                    attackReleased: false
                },
                prevInput: {
                    left: false,
                    right: false,
                    up: false,
                    down: false,
                    attack: false,
                    guard: false,
                    dash: false
                },
                // Attack sequence state - RESTORED original game feel
                attackTimer: 0,           // Cooldown before next attack allowed
                attackSequence: 0,        // 0=none, 1=light, 2=medium, 3=heavy
                attackPhase: 'none',      // none, startup, active, recovery
                attackFrameTimer: 0,      // Time into current attack phase
                attackFrame: 0,           // Current animation frame for client
                strikeActive: false,      // Whether hitbox is currently active
                lastAttackTime: 0,        // When last attack was initiated
                attackHoldStart: null,    // Timestamp when attack input began
                attackRequestActive: false,
                attackCharge: false,      // Whether current attack is charged
                attackCounter: 0,         // 1-3 rotation counter
                hitTargetsThisAttack: [], // Track who we've hit this attack
                dashAttackActive: false,  // Whether dash attack animation is playing
                // Slam state
                isSlamAttacking: false,
                slamLandingHitbox: null,
                // Dash attack state
                dashAttackQueued: false,  // Whether dash attack is pending
                dashAttackInitiated: false, // Whether dash attack was triggered
                dashAttackResolved: false  // Whether dash attack damage has been applied
            };
        });
    }

    /**
     * Start the match
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        this.interval = setInterval(() => this.tick(), this.tickRate);
        
        console.log(`Match started in room ${this.room.id} with ${Object.keys(this.players).length} players`);
    }

    /**
     * Stop the match
     */
    stop() {
        if (!this.running) return;
        
        this.running = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        console.log(`Match stopped in room ${this.room.id}`);
    }

    /**
     * Main game tick - runs every 50ms
     */
    tick() {
        if (!this.running) return;

        const dt = this.tickRate / 1000; // Convert to seconds

        // Update combo timers and combat state once per tick
        this.engine.updateCombos(dt);

        // Update each player's authoritative state
        Object.values(this.players).forEach(player => {
            if (!player.gameState.isDefeated) {
                // Process input with edge detection
                this.processInput(player, dt);

                // Update physics (includes attack phase timer)
                this.updatePhysics(player, dt);

                // Resolve collisions
                this.resolveCollisions(player);

                // After collision resolution, check ground snap to prevent floating
                // Collision pushes can lift players above ground, causing them to hover
                if (player.gameState.position.y >= 595) {
                    player.gameState.position.y = 600;
                    player.gameState.velocity.y = 0;
                    player.gameState.onGround = true;
                }

                // Check attacks during active frame (RESTORED rect-based detection)
                if (player.strikeActive && player.attackSequence > 0) {
                    this.checkAttackHits(player);
                }

                // Update gameplay state through GameplayEngine
                const config = {
                    staggerThreshold: player.config.staggerThreshold,
                    staggerLength: player.config.staggerLength
                };

                const events = this.engine.updateFighter(player.gameState, dt, config, player.input);

                // Handle events from GameplayEngine
                this.handleEvents(player, events);
            }
        });

        // Check win condition
        this.checkWinCondition();

        // Broadcast snapshot to all clients
        this.broadcastSnapshot();
    }

    /**
     * Process player input with proper attack system
     * RESTORED: Original game input handling for responsive combat
     */
    processInput(player, dt) {
        const input = player.input;
        const prevInput = player.prevInput;
        const state = player.gameState;
        const config = player.config;
        
        // End dash attack joust animation when the fighter provides any input
        // during the deceleration phase. This allows the player to cancel the
        // joust sprite early by pressing keys (move, attack, guard, jump, dash).
        if (!state.isDashing && player.dashAttackActive) {
            const hasAnyInput = input.left || input.right || input.up || input.down || 
                                input.attack || input.guard || input.dash || input.slam ||
                                input.attackPressed;
            if (hasAnyInput) {
                player.dashAttackActive = false;
            }
        }
        
        // MOVEMENT INPUT - RESTORED: Direct velocity setting like original game
        // Original game used: vel.x = moveDir * speed (instant response, no acceleration)
        // Speed is in pixels/frame; convert to pixels/second: speed * 60
        const maxSpeed = (config.speed || 9) * 60;
        
        // Don't allow movement input during hitstun or stagger active phase
        if (state.state !== 'hit' && !(state.state === 'staggered' && state.staggerTimer > 0)) {
            // DASHING: Skip movement input and friction - dash maintains its own velocity
            // Reference: during dash, movement input is skipped entirely
            if (state.isDashing) {
                // Still update facing direction based on input for dash attack direction
                if (input.left) {
                    state.facing = -1;
                } else if (input.right) {
                    state.facing = 1;
                }
                // Don't apply friction or override velocity during dash
                // Dash velocity stays at full dashSpeed * 60
            } else if (input.left) {
                state.velocity.x = -maxSpeed;
                state.facing = -1;
            } else if (input.right) {
                state.velocity.x = maxSpeed;
                state.facing = 1;
            } else {
                // No directional input - decelerate with friction
                const friction = config.friction || 0.85;
                state.velocity.x *= friction;
                if (Math.abs(state.velocity.x) < 0.1) state.velocity.x = 0;
            }
        } else {
            // During hitstun/stagger, decelerate
            const friction = config.friction || 0.85;
            state.velocity.x *= friction;
            if (Math.abs(state.velocity.x) < 0.1) state.velocity.x = 0;
        }
        
        // Air control - reduced movement in air
        if (!state.onGround && (input.left || input.right)) {
            const airControl = config.airControl || 0.6;
            state.velocity.x *= airControl;
        }

        // JUMP INPUT - edge triggered
        if (input.up && !prevInput.up && state.onGround && state.state !== 'hit' && 
            state.state !== 'staggered' && !state.isAttacking) {
            const jumpHeight = config.jumpHeight || 1200;
            state.velocity.y = -jumpHeight;
            state.onGround = false;
        }

        // GUARD INPUT
        if (input.guard && !state.isAttacking && state.state !== 'hit' && state.state !== 'staggered') {
            state.isGuarding = true;
        } else {
            state.isGuarding = false;
        }

        // DASH INPUT - edge triggered
        const dashEdge = input.dash && !prevInput.dash;
        if (dashEdge && state.dashCharges > 0 && !state.isAttacking && state.onGround && 
            state.state !== 'hit' && state.state !== 'staggered' && state.state !== 'slam') {
            const dashDir = input.right ? 1 : (input.left ? -1 : state.facing);
            const dashSpeed = ((typeof config.dashSpeed !== 'undefined' ? config.dashSpeed : 60) * 60);
            state.velocity.x = dashDir * dashSpeed;
            state.isDashing = true;
            state.dashTimer = 0;
            state.dashDurationTimer = 0;
            state.dashCharges -= 1;
            state.canDash = state.dashCharges > 0;
            player.dashAttackQueued = false;
            player.dashAttackInitiated = false;
            player.dashAttackResolved = false;
            player.dashAttackActive = false;
        }
        
        // DASH ATTACK - Auto-triggers when opponent is within dash attack range
        // Uses the dash attack's effective hit range (227px rect-adjusted) so it
        // triggers whenever the enemy is reachable by the dash attack hitbox.
        // The enemy doesn't need to be directly in front - proximity during dash
        // is sufficient to initiate the attack.
        if (state.isDashing && !player.dashAttackResolved) {
            const defenders = Object.values(this.players).filter(p => 
                p.clientId !== player.clientId && !p.gameState.isDefeated
            );
            const dashAttackRange = 227;
            const hasTargetInRange = defenders.some(d => 
                Math.abs(state.position.x - d.gameState.position.x) < dashAttackRange
            );
            if (hasTargetInRange) {
                player.dashAttackInitiated = true;
                player.dashAttackQueued = true;
            }
        }

        // ATTACK INPUT - Use explicit edge-triggered flags from client for reliable detection
        // At 20tps, quick clicks can be missed by prevInput comparison alone
        const attackPressed = input.attackPressed || (input.attack && !prevInput.attack);
        const attackReleased = input.attackReleased || (!input.attack && prevInput.attack && player.attackRequestActive);

        // Determine whether we can start another attack now.
        // Allow chaining if the last attack started recently enough, even if normal cooldown remains.
        const now = Date.now();
        const comboWindow = 750;
        const canChainAttack = !player.attackCharge && player.attackCounter > 0 && (now - player.lastAttackTime) < comboWindow;
        const canAttackNow = player.attackTimer <= 0 || canChainAttack;

        // IMPORTANT: Only set attackHoldStart ONCE per press, not every tick.
        // The client holds attackPressed sticky for 120ms. Without this check,
        // attackHoldStart gets reset every tick, breaking the fallback timer.
        if (attackPressed && !state.isAttacking && state.state !== 'hit' && 
            state.state !== 'staggered' && state.state !== 'slam' && canAttackNow) {
            if (!player.attackHoldStart) {
                player.attackHoldStart = now;
                player.attackRequestActive = true;
            }
        }

        // RESTORED: Start attack on release (like original game: press to charge, release to swing)
        // Also handle the case where client sends continuous attack (no release detected at 20tps)
        // If attack is held for more than one tick and we have an active request, start attack
        if (player.attackRequestActive && state.state !== 'attack' && state.state !== 'attacking') {
            if (attackReleased) {
                const now = Date.now();
                const heldDuration = now - (player.attackHoldStart || now);
                const isCharged = heldDuration >= 300;
                
                // Use attackCounter for 1-3 rotation like original game
                const timeSinceLastAttack = now - player.lastAttackTime;
                const comboWindow = 500;
                let sequence = 1;

                if (!isCharged && timeSinceLastAttack < comboWindow && player.attackCounter > 0) {
                    sequence = (player.attackCounter % 3) + 1;
                } else if (isCharged) {
                    sequence = 3;
                } else {
                    sequence = 1;
                }

                this.startAttack(player, sequence, isCharged);
            } 
            // FALLBACK: If client attack is held for >300ms and input is still attack=true,
            // treat as a tap attack (release may have been missed between ticks)
            else if (input.attack && player.attackHoldStart) {
                const heldMs = Date.now() - player.attackHoldStart;
                if (heldMs > 100 && heldMs < 400) {
                    // Likely a tap attack - release was missed, start attack now
                    const now = Date.now();
                    const heldDuration = now - player.attackHoldStart;
                    const isCharged = heldDuration >= 300;
                    const timeSinceLastAttack = now - player.lastAttackTime;
                    const comboWindow = 500;
                    let sequence = 1;
                    
                    if (!isCharged && timeSinceLastAttack < comboWindow && player.attackCounter > 0) {
                        sequence = (player.attackCounter % 3) + 1;
                    } else if (isCharged) {
                        sequence = 3;
                    }
                    
                    this.startAttack(player, sequence, isCharged);
                }
            }
        }

        // SLAM ATTACK - When in air and pressing S (down) key
        // Slam triggers while in air and down is pressed (not on ground, not attacking)
        if (input.down && !input.up && !state.onGround && !state.isAttacking && 
            state.state !== 'hit' && state.state !== 'staggered' && !player.isSlamAttacking) {
            this.startSlamAttack(player);
        }
    }

    /**
     * RESTORED: Start an attack with proper phase timing
     */
    startAttack(player, sequence, isCharged) {
        const config = player.config;
        const state = player.gameState;
        
        // Get attack definition
        const attackKey = sequence === 1 ? 'light' : sequence === 2 ? 'medium' : 'heavy';
        const attackDef = config.attacks[attackKey];
        
        if (!attackDef) return;
        
        // Set attack state
        const now = Date.now();
        player.attackSequence = sequence;
        player.attackPhase = 'startup';
        player.attackFrameTimer = 0;
        player.attackFrame = 0;
        player.strikeActive = false;
        player.lastAttackTime = now;
        player.attackCharge = isCharged;
        player.attackRequestActive = false;
        player.attackHoldStart = null;
        player.hitTargetsThisAttack = [];
        
        state.isAttacking = true;
        state.state = 'attacking';
        
        // Set attack cooldown based on attack interval
        player.attackTimer = config.attackInterval || 0.75;
        
        // Update attack counter for rotation
        player.attackCounter = sequence;
        
        console.log(`[Attack] ${player.clientId} started attack ${sequence} (${attackKey}), phase=startup`);
    }

    /**
     * RESTORED: Start a slam attack
     */
    startSlamAttack(player) {
        const state = player.gameState;
        
        // Only usable in mid-air
        if (state.onGround) return;
        
        state.state = 'slam';
        state.isAttacking = true;
        player.isSlamAttacking = true;
        
        // Set slam landing hitbox
        player.slamLandingHitbox = {
            x: state.position.x,
            y: 600, // Ground level
            radius: SLAM_ATTACK_RADIUS,
            damage: player.config.baseDamage * 2
        };
        
        console.log(`[Slam] ${player.clientId} started slam attack`);
    }

    /**
     * Update physics for a player with gravity and collision
     * RESTORED: Added attack phase transitions + proper slam
     */
    updatePhysics(player, dt) {
        const state = player.gameState;
        const config = player.config;

        // SLAM GRAVITY - Override velocity for fast descent
        if (player.isSlamAttacking && !state.onGround) {
            const slamTerminalSpeed = 30 * 60; // emulate old client 30 units/frame at 60fps
            state.velocity.y = Math.max(state.velocity.y, slamTerminalSpeed);
            state.velocity.x *= 0.9; // Slow horizontal movement during slam
        }
        // NORMAL GRAVITY
        else if (!state.onGround) {
            const gravity = (typeof config.gravity !== 'undefined') ? config.gravity : 36;
            state.velocity.y += gravity * dt;
            state.velocity.y = Math.min(state.velocity.y, 2000);
        }

        // APPLY VELOCITY - Update position
        state.position.x += state.velocity.x * dt;
        state.position.y += state.velocity.y * dt;

        // CHECK FOR SLAM LANDING
        if (player.isSlamAttacking && state.position.y >= 600) {
            state.position.y = 600;
            state.velocity.y = 0;
            state.onGround = true;
            state.isAttacking = false;
            // Keep state as 'slam' after landing so the client shows the slam sprite.
            // The player must provide input to stand back up (cleared in processInput).
            state.state = 'slam';
            player.isSlamAttacking = false;
            player.slamLandingHitbox = null;
            player.attackTimer = 1.0; // Slam cooldown
            this.resolveSlamLanding(player);
            return;
        }

        // GROUND COLLISION
        if (state.position.y >= 600) {
            state.position.y = 600;
            state.velocity.y = 0;
            state.onGround = true;
            
            // Reset state from slam when landing naturally
            if (state.state === 'slam') {
                state.state = 'idle';
                player.isSlamAttacking = false;
            }
        }

        // WALL BOUNDARIES
        let hitBoundary = false;
        if (state.position.x < 50) {
            state.position.x = 50;
            hitBoundary = state.velocity.x < 0;
        }
        if (state.position.x > 1350) {
            state.position.x = 1350;
            hitBoundary = state.velocity.x > 0;
        }

        if (hitBoundary) {
            if (player.dashAttackInitiated && !player.dashAttackResolved) {
                player.dashAttackResolved = true;
                player.dashAttackQueued = false;
                player.dashAttackInitiated = false;
                this.resolveDashAttack(player);
            }
            state.velocity.x = 0;
            if (state.isDashing) {
                state.isDashing = false;
            }
        }

        // DASH TIMER / DURATION
        if (state.isDashing) {
            state.dashDurationTimer += dt;
            const dashDuration = config.dashDuration || 0.2;
            if (state.dashDurationTimer >= dashDuration) {
                state.isDashing = false;
                state.velocity.x *= 0.3; // Slow down after dash
                state.dashDurationTimer = 0;
                // Clear dash attack state
                player.dashAttackInitiated = false;
                player.dashAttackResolved = false;
                player.dashAttackQueued = false;
                // If this was a dash attack (sequence=0), clear the attacking state
                // but keep dashAttackActive so the client shows joust during deceleration
                if (player.attackSequence === 0) {
                    state.isAttacking = false;
                    state.state = 'idle';
                    player.attackSequence = 0;
                    player.attackPhase = 'none';
                    player.strikeActive = false;
                    player.attackFrame = 0;
                    // dashAttackActive stays true for deceleration phase
                }
            }
            
            // RESOLVE DASH ATTACK if triggered during dash
            if (player.dashAttackInitiated && !player.dashAttackResolved) {
                player.dashAttackResolved = true;
                player.dashAttackQueued = false;
                this.resolveDashAttack(player);
            }
        } else {
            // NOT dashing - clear dash attack flag after deceleration stops
            // dashAttackActive will be cleared when velocity reaches near-zero
            // or when the fighter starts a new action
        }

        // DASH RECHARGE
        if (state.dashCharges >= 3) {
            state.dashTimer = 0;
            state.canDash = true;
        } else {
            state.dashTimer += dt;
            const dashCooldown = config.dashCooldown || 3.0;
            while (state.dashTimer >= dashCooldown && state.dashCharges < 3) {
                state.dashCharges += 1;
                state.dashTimer -= dashCooldown;
            }
            state.canDash = state.dashCharges > 0;
        }

        // ATTACK COOLDOWN
        player.attackTimer -= dt;
        if (player.attackTimer < 0) player.attackTimer = 0;

        // RESTORED: ATTACK SEQUENCE PHASE TIMING
        if (state.isAttacking && player.attackSequence > 0 && player.attackPhase !== 'none') {
            const attackKey = player.attackSequence === 1 ? 'light' :
                             player.attackSequence === 2 ? 'medium' : 'heavy';
            const attackDef = config.attacks[attackKey];
            
            if (!attackDef) {
                this.endAttack(player);
                return;
            }

            player.attackFrameTimer += dt;

            // Transition through attack phases
            if (player.attackPhase === 'startup') {
                if (player.attackFrameTimer >= attackDef.startup) {
                    player.attackPhase = 'active';
                    player.attackFrameTimer = 0;
                    player.strikeActive = true;
                }
            } else if (player.attackPhase === 'active') {
                if (player.attackFrameTimer >= attackDef.active) {
                    player.attackPhase = 'recovery';
                    player.attackFrameTimer = 0;
                    player.strikeActive = false;
                }
            } else if (player.attackPhase === 'recovery') {
                if (player.attackFrameTimer >= attackDef.recovery) {
                    // Attack complete
                    this.endAttack(player);
                }
            }
        }

        // Clear dashAttackActive when the fighter stops moving fast enough
        // This makes joust sprite transition to idle once deceleration is done
        if (!state.isDashing && player.dashAttackActive && Math.abs(state.velocity.x) < 10) {
            player.dashAttackActive = false;
        }
    }
    
    /**
     * Helper: End an attack cleanly
     */
    endAttack(player) {
        const state = player.gameState;
        state.isAttacking = false;
        state.state = 'idle';
        player.attackSequence = 0;
        player.attackPhase = 'none';
        player.attackFrameTimer = 0;
        player.attackFrame = 0;
        player.attackCharge = false;
        player.strikeActive = false;
        player.lastAttackTime = Date.now();
        // Don't reset attackTimer here; preserve any remaining cooldown so the combo timing is correct.
        console.log(`[Attack] ${player.clientId} attack complete`);
    }

    /**
     * Resolve collisions between players
     */
    resolveCollisions(player) {
        Object.values(this.players).forEach(other => {
            if (other.clientId === player.clientId) return;
            if (other.gameState.isDefeated) return;

            const dx = player.gameState.position.x - other.gameState.position.x;
            const dy = player.gameState.position.y - other.gameState.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = 50;

            if (distance < minDistance) {
                const overlap = minDistance - distance;
                let pushX;
                let pushY;

                if (distance <= 0.0001) {
                    // Perfect overlap guard: separate evenly along X axis to avoid NaN and invalid state
                    pushX = overlap / 2 * (player.gameState.position.x <= other.gameState.position.x ? -1 : 1);
                    pushY = 0;
                } else {
                    pushX = (dx / distance) * overlap / 2;
                    pushY = (dy / distance) * overlap / 2;
                }

                player.gameState.position.x += pushX;
                player.gameState.position.y += pushY;
                other.gameState.position.x -= pushX;
                other.gameState.position.y -= pushY;
            }
        });
    }

    /**
     * Handle events from GameplayEngine
     */
    handleEvents(player, events) {
        events.forEach(event => {
            switch (event.type) {
                case 'BURN_DAMAGE':
                case 'BLEED_DAMAGE':
                case 'RUPTURE_DAMAGE':
                case 'BLEED_ATTACK_DAMAGE':
                    this.broadcast({
                        type: 'STATUS_DAMAGE',
                        fighterId: player.clientId,
                        eventType: event.type,
                        damage: event.damage,
                        hp: player.gameState.hp
                    });
                    break;
                    
                case 'DEFEATED':
                    this.broadcast({
                        type: 'FIGHTER_DEFEATED',
                        fighterId: player.clientId,
                        defeatedBy: null
                    });
                    break;
                    
                case 'STAGGER_START':
                    this.broadcast({
                        type: 'STAGGER_START',
                        fighterId: player.clientId,
                        duration: event.duration
                    });
                    break;
                    
                case 'STAGGER_END':
                    this.broadcast({
                        type: 'STAGGER_END',
                        fighterId: player.clientId
                    });
                    break;
            }
        });
    }

    /**
     * Check win condition
     */
    checkWinCondition() {
        const activePlayers = Object.values(this.players).filter(p => !p.gameState.isDefeated);
        
        if (activePlayers.length <= 1) {
            const winner = activePlayers.length === 1 ? activePlayers[0] : null;
            this.endMatch(winner ? winner.clientId : null);
        }
    }

    /**
     * Handle player input - stores current input state only
     * prevInput is updated ONCE per tick in broadcastSnapshot to prevent
     * edge detection failures when multiple packets arrive between ticks.
     * At 20tps with 60fps client, 2-3 packets per tick all have the same
     * sticky flags, which would cause handleInput to clobber prevInput
     * and lose edge detection.
     */
    handleInput(playerId, input) {
        if (!this.running) return;

        const player = this.players[playerId];
        if (!player || player.gameState.isDefeated) return;

        // Store current input state (merge with defaults)
        // ONLY overwrite input, NOT prevInput here.
        // prevInput will be set in broadcastSnapshot once per tick.
        player.input = { 
            left: !!input.left,
            right: !!input.right,
            up: !!input.up,
            down: !!input.down,
            attack: !!input.attack,
            guard: !!input.guard,
            dash: !!input.dash,
            slam: !!input.slam,
            attackPressed: !!input.attackPressed,
            attackReleased: !!input.attackReleased
        };
    }

    /**
     * RESTORED: Check and resolve attack hits during active frame
     * Uses rect-based hit detection from GameplayEngine
     */
    checkAttackHits(attacker) {
        if (!attacker.strikeActive || !attacker.attackSequence) return;

        const attackType = attacker.attackSequence === 1 ? 'light' :
                          attacker.attackSequence === 2 ? 'medium' : 'heavy';
        const attackDef = attacker.config.attacks[attackType];
        
        if (!attackDef) return;

        const attackData = {
            range: attackDef.range,
            baseDamage: attackDef.damage,
            knockback: attackDef.knockback,
            staggerDamage: attackDef.staggerDamage,
            statusEffects: attackDef.statusEffects || [],
            chargeAttack: attacker.attackCharge || false
        };

        // Find all defenders
        const defenders = Object.values(this.players).filter(p => 
            p.clientId !== attacker.clientId && !p.gameState.isDefeated
        );

        defenders.forEach(defender => {
            // RESTORED: Use rect-based hit detection
            const hitResult = this.engine.checkAttackHit(
                attacker.gameState.position,
                defender.gameState.position,
                attackDef.range,
                attacker.gameState.facing,
                defender.gameState.hitCooldown || 0
            );

            if (!hitResult.hit) return;

            // Check if we already hit this target this attack
            if (attacker.hitTargetsThisAttack && attacker.hitTargetsThisAttack.includes(defender.clientId)) {
                return;
            }

            // Track this target as hit
            if (!attacker.hitTargetsThisAttack) {
                attacker.hitTargetsThisAttack = [];
            }
            attacker.hitTargetsThisAttack.push(defender.clientId);

            const result = this.engine.resolveAttack(
                attacker.gameState,
                defender.gameState,
                attackData,
                {
                    staggerThreshold: attacker.config.staggerThreshold,
                    staggerLength: attacker.config.staggerLength
                }
            );

            if (!result.hit) return;

            // Broadcast hit result
            this.broadcast({
                type: 'HIT',
                attackerId: attacker.clientId,
                targetId: defender.clientId,
                damage: result.damage,
                attackSequence: attacker.attackSequence,
                hp: defender.gameState.hp,
                knockback: result.knockback,
                statuses: result.statuses || [],
                staggerResult: result.staggerResult || null,
                chargeAttack: result.chargeAttack || false,
                defeated: result.defeated,
                wasGuarded: result.wasGuarded || false
            });

            if (result.consumeEvents) {
                result.consumeEvents.forEach(ev => {
                    if (ev.type === 'BLEED_DAMAGE' || ev.type === 'RUPTURE_DAMAGE' || ev.type === 'BLEED_ATTACK_DAMAGE') {
                        this.broadcast({
                            type: 'STATUS_DAMAGE',
                            fighterId: defender.clientId,
                            eventType: ev.type,
                            damage: ev.damage,
                            hp: defender.gameState.hp
                        });
                    }
                });
            }

            if (result.bleedAttackEvents) {
                result.bleedAttackEvents.forEach(ev => {
                    this.broadcast({
                        type: 'STATUS_DAMAGE',
                        fighterId: attacker.clientId,
                        eventType: ev.type,
                        damage: ev.damage,
                        hp: attacker.gameState.hp
                    });
                });
            }

            if (result.defeated) {
                defender.gameState.isDefeated = true;
                this.broadcast({
                    type: 'FIGHTER_DEFEATED',
                    fighterId: defender.clientId,
                    defeatedBy: attacker.clientId
                });
            }
        });
    }

    /**
     * Resolve dash attack - RESTORED with reference behavior
     * Reference flow:
     * 1. Set state='attack' + strikeActive (for animation/damage)
     * 2. Apply dash velocity in ORIGINAL direction (continue dashing through opponent)
     * 3. Set facing towards opponent for attack animation (sprite direction only)
     * 4. Extend dash duration by 0.16s to let the attack animation play
     * 5. Immediately resolve damage against all targets in range
     * 6. Set a short attack timer to auto-clear isAttacking when dash ends
     * 7. Spawn slash effect (client handles this via snapshot)
     */
    resolveDashAttack(player) {
        const attacker = player;
        const state = player.gameState;
        const config = player.config;
        
        // PRESERVE original dash direction for velocity AND facing throughout the dash
        // The fighter dashes in the direction of input, maintaining facing towards
        // that direction even when passing through opponents.
        const dashDir = state.velocity.x >= 0 ? 1 : -1;
        state.facing = dashDir; // Face the dash direction, not the opponent
        
        // Set attack state for CLIENT ANIMATION
        // Use attackSequence=0 as a special marker for dash attacks.
        // Do NOT set state.isAttacking or state.state='attacking' because that
        // blocks jump/dash/guard input processing and traps the fighter in
        // attack state until the dash ends.
        // Instead, rely on dashAttackActive flag for the client sprite logic.
        attacker.strikeActive = false;
        attacker.attackSequence = 0; // Special: 0 means dash attack for client
        attacker.attackPhase = 'active';
        attacker.dashAttackActive = true; // Flag for client to show joust during attack + deceleration
        
        // RE-APPLY dash velocity in ORIGINAL direction to continue through opponent
        // Reference: vel.x = facing * 60 (per frame), but we preserve original dash dir
        state.velocity.x = dashDir * 60 * 60;
        
        // REFERENCE: Extend dash duration by 0.16s to allow full attack animation
        // Reset duration timer so dash continues through opponent
        state.dashDurationTimer = 0;
        
        // Dash attacks use enhanced stats
        // Reference: base dash range = 168 (40% over base 120) with 50% bonus for dash = 252 center distance
        // Rect-adjusted: 252 - 25 (half player box) ≈ 227
        const attackData = {
            range: 227,           // Rect-adjusted for 252 center distance reference
            baseDamage: 1.5,      // 1.5x base damage multiplier
            knockback: 80,        // Moderate knockback
            staggerDamage: 60,    // Stagger damage
            statusEffects: [],
            chargeAttack: false,
            isDashAttack: true
        };
        
        const defenders = Object.values(this.players).filter(p => 
            p.clientId !== attacker.clientId && !p.gameState.isDefeated
        );
        
        const results = [];
        
        defenders.forEach(defender => {
            // Dash attacks use distance-based hit detection centered on the attacker.
            // The dash sweeps through space, so the hitbox should catch anything
            // within range regardless of facing direction. This prevents close-range
            // and overlapping misses that occur with rect-based forward-offset boxes.
            const dx = Math.abs(state.position.x - defender.gameState.position.x);
            const dy = Math.abs(state.position.y - defender.gameState.position.y);
            const isInRange = dx < attackData.range && dy < 72; // 72 = hitbox height
            const hitCooldownActive = defender.gameState.hitCooldown > 0;
            
            if (!isInRange || hitCooldownActive) return;
            
            // Apply damage and knockback directly without going through
            // engine.resolveAttack (which re-checks facing with rect-based detection).
            // Dash attacks hit regardless of facing.
            const dmg = this.engine.calculateDamage(attackData.baseDamage, state, defender.gameState);
            const ap = this.engine.applyDamage(defender.gameState, dmg);
            
            if (defender.gameState.state !== 'staggered') {
                defender.gameState.state = 'hit';
                defender.gameState.hitTimer = 0.18;
            }
            
            if (attackData.knockback) {
                const dir = defender.gameState.position.x < state.position.x ? -1 : 1;
                const fk = this.engine.calculateKnockback(attackData.knockback, state);
                this.engine.applyKnockback(defender.gameState, fk, dir, state);
            }
            
            if (attackData.staggerDamage && defender.gameState.state !== 'staggered') {
                defender.gameState.stagger += attackData.staggerDamage;
                if (defender.gameState.stagger >= (attacker.config.staggerThreshold || 1000)) {
                    defender.gameState.state = 'staggered';
                    defender.gameState.staggerTimer = attacker.config.staggerLength || 5;
                    defender.gameState.stagger = attacker.config.staggerThreshold || 1000;
                }
            }
            
            const result = {
                damage: ap.damage,
                defenderHp: ap.finalHp,
                hit: true,
                defeated: ap.defeated,
                knockback: attackData.knockback || 0
            };
            
            results.push({
                targetId: defender.clientId,
                damage: result.damage,
                defenderHp: result.defenderHp,
                hit: result.hit,
                defeated: result.defeated,
                knockback: result.knockback
            });
        });
        
        // Broadcast dash attack results
        if (results.length > 0) {
            this.broadcast({
                type: 'dashAttackResult',
                attackerId: attacker.clientId,
                hits: results
            });
        }
    }

    /**
     * RESTORED: Resolve slam attack landing with AOE damage
     */
    resolveSlamLanding(player) {
        const state = player.gameState;
        const config = player.config;
        
        // Slam position (at ground level)
        const slamPos = { x: state.position.x, y: 600 };
        const slamRadius = SLAM_ATTACK_RADIUS;
        
        const defenders = Object.values(this.players).filter(p => 
            p.clientId !== player.clientId && !p.gameState.isDefeated
        );
        
        let hitAny = false;
        
        defenders.forEach(defender => {
            const dx = defender.gameState.position.x - slamPos.x;
            const dy = defender.gameState.position.y - slamPos.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance <= slamRadius) {
                const attackData = {
                    range: slamRadius,
                    baseDamage: config.baseDamage * 2,
                    knockback: 150,
                    staggerDamage: config.baseDamage * 100,
                    statusEffects: [],
                    chargeAttack: false,
                    isDashAttack: false
                };
                
                const result = this.engine.resolveAttack(
                    state,
                    defender.gameState,
                    attackData,
                    {
                        staggerThreshold: config.staggerThreshold,
                        staggerLength: config.staggerLength
                    }
                );
                
                hitAny = true;
                
                this.broadcast({
                    type: 'slamHit',
                    attackerId: player.clientId,
                    targetId: defender.clientId,
                    slamPos: slamPos,
                    radius: slamRadius,
                    damage: result.damage,
                    defenderHp: result.defenderHp,
                    hit: result.hit,
                    defeated: result.defeated,
                    knockback: result.knockback
                });
            }
        });
        
        // Broadcast slam landing for VFX
        this.broadcast({
            type: 'slamLanding',
            attackerId: player.clientId,
            slamPos: slamPos,
            radius: slamRadius,
            hitAny: hitAny
        });
    }

    executeAbility(attackerId, abilityId, targetId) {
        if (!this.running) return;
        
        const attacker = this.players[attackerId];
        if (!attacker || attacker.gameState.isDefeated) return;
        
        // Handle slam attack specially (direct server-side resolution)
        if (abilityId === 'slamAttack') {
            return this.startSlamAttack(attacker);
        }
        
        const target = targetId ? this.players[targetId] : null;
        
        const result = this.engine.executeAbility(
            attacker.gameState,
            abilityId,
            targetId,
            target ? target.gameState : null
        );
        
        result.fighterId = attackerId;
        result.abilityId = abilityId;
        this.broadcast({
            type: 'abilityResult',
            ...result
        });
        
        return result;
    }

    /**
     * Broadcast snapshot to all clients
     */
    broadcastSnapshot() {
        // Update prevInput for next tick (done here to ensure proper edge detection)
        Object.values(this.players).forEach(player => {
            player.prevInput = { ...player.input };
        });

        const snapshot = {
            players: Object.values(this.players).map(player => ({
                id: player.clientId,
                x: player.gameState.position.x,
                y: player.gameState.position.y,
                vx: player.gameState.velocity.x,
                vy: player.gameState.velocity.y,
                hp: player.gameState.hp,
                maxHp: player.gameState.maxHp,
                state: player.gameState.state,
                facing: player.gameState.facing,
                statuses: player.gameState.statuses,
                isDefeated: player.gameState.isDefeated,
                isAttacking: player.gameState.isAttacking || false,
                isGuarding: player.gameState.isGuarding || false,
                isDashing: player.gameState.isDashing || false,
                dashCharges: player.gameState.dashCharges || 0,
                onGround: player.gameState.onGround || false,
                // Input state for remote player hold logic
                input: {
                    left: !!player.input?.left,
                    right: !!player.input?.right,
                    up: !!player.input?.up,
                    down: !!player.input?.down,
                    attack: !!player.input?.attack,
                    guard: !!player.input?.guard,
                    dash: !!player.input?.dash,
                    slam: !!player.input?.slam,
                    attackPressed: !!player.input?.attackPressed,
                    attackReleased: !!player.input?.attackReleased
                },
                // Attack state for client animation
                attackSequence: player.attackSequence || 0,
                attackPhase: player.attackPhase || 'none',
                attackFrameTimer: player.attackFrameTimer || 0,
                attackFrame: player.attackFrame || 0,
                strikeActive: player.strikeActive || false,
                attackCounter: player.attackCounter || 0,
                chargeAttack: player.attackCharge || false,
                // Slam state
                isSlamAttacking: player.isSlamAttacking || false,
                // Dash attack state
                dashAttackQueued: player.dashAttackQueued || false,
                dashAttackActive: player.dashAttackActive || false
            }))
        };

        this.io.to(this.room.id).emit('snapshot', snapshot);
    }

    /**
     * Broadcast event to all clients in room
     */
    broadcast(event) {
        this.io.to(this.room.id).emit('event', event);
    }

    /**
     * End match
     */
    endMatch(winnerId, options = {}) {
        this.stop();
        
        const winner = winnerId ? this.players[winnerId] : null;
        
        this.broadcast({
            type: 'MATCH_END',
            winnerId: winnerId,
            winnerCharacter: winner ? winner.characterKey : null,
            returnToLobby: !!options.returnToLobby,
            reason: options.reason || null,
            forfeiterId: options.forfeiterId || null
        });
        
        console.log(`Match ended in room ${this.room.id}. Winner: ${winner ? winner.characterKey : 'None'}`);
    }

    /**
     * Get player by ID
     */
    getPlayer(playerId) {
        return this.players[playerId];
    }

    /**
     * Get all players
     */
    getAllPlayers() {
        return Object.values(this.players);
    }

    /**
     * Get active (non-defeated) players
     */
    getActivePlayers() {
        return Object.values(this.players).filter(p => !p.gameState.isDefeated);
    }
}

module.exports = Match;