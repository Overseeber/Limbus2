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
const { 
  initUltimate, 
  updateJohnUltimate, 
  updateCallistoUltimate, 
  updateValencinaUltimate,
  dealUltDamage,
  clampToArena,
  clampX,
  clampY
} = require('./characterLogic/ultimateLogic');
const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 700;
const SLAM_ATTACK_RADIUS = 80;
const EVADE_DISTANCE = 230; // ~1 attack range
const EVADE_MAX_DURATION = 1.0; // max 1 second

function computeHitShakeIntensity(damage, options = {}) {
  const normalizedDamage = Math.max(0, Math.min(damage || 0, options.isUltimate ? 80 : 45));
  let intensity = normalizedDamage * (options.attackType === 'slam' ? 0.35 : options.attackType === 'dash' ? 0.3 : options.isUltimate ? 0.45 : 0.28);
  if (options.defeated) {
    intensity += options.isUltimate ? 4 : 2;
  }
  if (options.staggered) {
    intensity += 2;
  }
  intensity = Math.max(2, intensity);
  if (options.attackType === 'slam') {
    intensity = Math.min(24, intensity);
  } else if (options.attackType === 'dash') {
    intensity = Math.min(16, intensity);
  } else if (options.isUltimate) {
    intensity = Math.min(30, intensity);
  } else {
    intensity = Math.min(14, intensity);
  }
  return intensity;
}

class Match {
    constructor(room, io) {
        this.room = room;
        this.io = io;
        this.engine = new GameplayEngine();
        
        this.players = {};
        this.running = false;
        this.interval = null;
        this.tickRate = 50; // 50ms = 20 ticks per second
        this.hitstopTimer = 0;
        this.hitstopActive = false;
    }

    /**
     * Initialize match with players from room
     */
    initialize(playerConfigs) {
        this.players = {};
        
        playerConfigs.forEach(config => {
            const charKey = config.characterKey || 'VALENCINA';
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
            gameState.isEvading = false; // evade state
            gameState.evadeTimer = 0;    // evade duration timer
            
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
                ai: !!config.ai,
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
                attackReleased: false,
                evade: false
            },
            prevInput: {
                left: false,
                right: false,
                up: false,
                down: false,
                attack: false,
                guard: false,
                dash: false,
                evade: false
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
                comboHoldTimer: 0,        // Time remaining for combo-ready hold state
                dashAttackActive: false,  // Whether dash attack animation is playing
                // Slam state
                isSlamAttacking: false,
                // Visual-only slam hold flag: shows slam sprite after landing
                slamHoldVisual: false,
                slamLandingHitbox: null,
                // Dash attack state
                dashAttackQueued: false,  // Whether dash attack is pending
                dashAttackInitiated: false, // Whether dash attack was triggered
                dashAttackResolved: false,  // Whether dash attack damage has been applied
                // Ability state (character-specific animation and timing)
                installationArtActive: false,   // Callisto Installation Art animation active
                installationArtTimer: 0,        // Timer for Installation Art animation
                timeToHuntCasting: false,       // Valencina Time to Hunt casting animation
                timeToHuntCastTimer: 0,          // Timer for Time to Hunt casting
                // Ultimate state
                ultimate: null,                 // null = not active, object = active with sequence data
                ultimateActive: false           // Quick check flag for ultimate state
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
    }

/**
 * Main game tick - runs every 50ms
 */
tick() {
    if (!this.running) return;

    const dt = this.tickRate / 1000; // Convert to seconds

        if (this.hitstopTimer > 0) {
            this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
            if (this.hitstopTimer <= 0) {
                this.hitstopTimer = 0;
                this.hitstopActive = false;
            }
            // Even during hitstop, advance ultimate sequences so cinematic ultimates
            // (and their timers/phases) continue to progress and don't softlock.
            try {
                this.updateUltimates(dt);
            } catch (e) {
                console.error('[updateUltimates] error during hitstop:', e);
            }

            this.checkWinCondition();
            this.broadcastSnapshot();
            return;
        }


        // Track match start time for opening phase (first 2.5 seconds)
        if (!this.matchStartTime) {
            this.matchStartTime = Date.now();
        }
        const timeSinceStart = (Date.now() - this.matchStartTime) / 1000;
        const isOpeningPhase = timeSinceStart < 2.5;

        // Update each player's authoritative state
        Object.values(this.players).forEach(player => {
            if (!player.gameState.isDefeated) {
                // Skip GameplayEngine state processing if player is under ultimate protection
                // This keeps enemies locked in their current state during ultimate sequences
                if (player.gameState.ultimateProtected) {
                    // Still update status effects, but skip state machine processing
                    const events = this.engine.processStatuses(player.gameState, dt);
                    this.handleEvents(player, events);
                    
                    // CRITICAL: Apply knockback velocity to position so enemies actually move
                    // Velocity is set by dealUltDamage but physics is skipped for protected players
                    player.gameState.position.x += player.gameState.velocity.x * dt;
                    
                    // Apply friction to knockback so it decays naturally
                    player.gameState.velocity.x *= 0.92;
                    if (Math.abs(player.gameState.velocity.x) < 1) {
                        player.gameState.velocity.x = 0;
                    }
                    
                    // Clamp to arena after knockback movement
                    if (player.gameState.position.x < 50) {
                        player.gameState.position.x = 50;
                        player.gameState.velocity.x = 0;
                    }
                    if (player.gameState.position.x > 1350) {
                        player.gameState.position.x = 1350;
                        player.gameState.velocity.x = 0;
                    }
                    
                    // Keep them in hit state during ultimate
                    if (player.gameState.state === 'hit') {
                        player.gameState.hitTimer = 999; // Lock in hit state
                    }
                    return;
                }
                
        // Update gameplay state through GameplayEngine FIRST
        // This allows hit/stagger state to exit on input before input processing
        const config = {
            staggerThreshold: player.config.staggerThreshold,
            staggerLength: player.config.staggerLength,
            staggerRecoveryDelay: player.config.staggerRecoveryDelay || 2.0,
            staggerRecoveryRate: player.config.staggerRecoveryRate || 12
        };
        const events = this.engine.updateFighter(player.gameState, dt, config, player.input);

                // Handle events from GameplayEngine
                this.handleEvents(player, events);

                // Process Valencina's Game Target status on all fighters each tick
                // This restricts speed/jump/dash for any fighter with Game Target active
                if (player.characterKey === 'VALENCINA') {
                    const valencinaLogic = require('./characterLogic/valencina');
                    valencinaLogic.processGameTargetStatus(player.gameState, player.config);
                } else {
                    // Non-Valencina characters also need Game Target processing in case they are affected
                    try {
                        const valencinaLogic = require('./characterLogic/valencina');
                        valencinaLogic.processGameTargetStatus(player.gameState, player.config);
                    } catch(e) {}
                }
                
                // Update ability animation timers
                this.updateAbilityAnimations(player, dt);

                // Now process input with edge detection (after state updates)
                // Skip AI input during opening phase
                if (player.ai && !isOpeningPhase) {
                    this.simulateAIInput(player);
                } else if (player.ai && isOpeningPhase) {
                    // Clear AI input during opening to let animations play
                    player.input = { 
                        left: false, right: false, up: false, down: false,
                        attack: false, guard: false, dash: false, slam: false,
                        attackPressed: false, attackReleased: false, evade: false,
                        abilityQ: false, abilityX: false
                    };
                }

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
            }
        });

        // Update ultimate sequences each tick so cinematic ultimates progress
        // even when no hitstop is active.
        try {
            this.updateUltimates(dt);
        } catch (e) {
            console.error('[updateUltimates] error during tick:', e);
        }

        // Check win condition
        this.checkWinCondition();

        // Broadcast snapshot to all clients
        this.broadcastSnapshot();
    }

    startHitstop(duration, source = '') {
        if (!duration || duration <= 0) return;
        const hitstopDuration = Math.max(this.hitstopTimer, duration);
        if (hitstopDuration <= 0) return;
        this.hitstopTimer = hitstopDuration;
        this.hitstopActive = true;
    }

    /**
     * Process player input with proper attack system
     * RESTORED: Original game input handling for responsive combat
     */
    /**
     * Check if any player has an active ultimate — locks all controls
     */
    isUltimateActive() {
        return Object.values(this.players).some(p => p.ultimateActive);
    }

    processInput(player, dt) {
        // CRITICAL: If any ultimate is active, block ALL player input
        // The ultimate user shouldn't move, and enemies shouldn't fight back
        if (this.isUltimateActive()) {
            return;
        }

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

        // If fighter is in landed slam visual hold, any valid input should exit the visual
        // immediately so the player is responsive after the slam sequence. This keeps
        // the gameplay state idle (inputs accepted) while preserving the slam sprite
        // until the player provides input — mimics 'hurt' visual persistence.
        if (player.slamHoldVisual && state.onGround) {
            // Only treat new input presses (edges) as clearing the slam visual.
            // Use prevInput to detect edges so held keys don't clear the visual.
            const prev = player.prevInput || {};
            const leftEdge = input.left && !prev.left;
            const rightEdge = input.right && !prev.right;
            const upEdge = input.up && !prev.up;
            const downEdge = input.down && !prev.down;
            const attackEdge = input.attackPressed || (input.attack && !prev.attack);
            const guardEdge = input.guard && !prev.guard;
            const dashEdge = input.dash && !prev.dash;
            const slamEdge = input.slam && !prev.slam;

            const slamExitInput = leftEdge || rightEdge || upEdge || downEdge || attackEdge || guardEdge || dashEdge || slamEdge;
            if (slamExitInput) {
                player.slamHoldVisual = false;
                state.isAttacking = false;
                state.state = 'idle';
            }
        }
        
        // MOVEMENT INPUT - RESTORED: Direct velocity setting like original game
        // Use state.speed (which may be modified by Game Target status)  
        // Fallback to config.speed if state.speed is not set
        const moveSpeed = (state.speed !== undefined && state.speed !== null) ? state.speed : (config.speed || 9);
        const maxSpeed = moveSpeed * 60;
        
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
        // Check both state conditions AND canJump flag (Game Target sets canJump=false)
        const canJump = (state.canJump !== false) && state.state !== 'hit' && 
                       (state.state !== 'staggered' || (state.state === 'staggered' && state.staggerTimer <= 0));
        if (input.up && !prevInput.up && state.onGround && canJump && !state.isAttacking) {
            const jumpHeight = config.jumpHeight || 1200;
            state.velocity.y = -jumpHeight;
            state.onGround = false;
        }

        // GUARD INPUT
        const guardEdge = input.guard && !prevInput.guard;
        const canGuard = state.state !== 'hit' && 
                        (state.state !== 'staggered' || (state.state === 'staggered' && state.staggerTimer <= 0));
        if (guardEdge && !state.isAttacking && canGuard) {
            // AUTO-FACE toward closest enemy when guard is FIRST pressed (edge-triggered)
            // This prevents continuous re-facing every tick while holding guard
            this.faceClosestEnemy(player);
            state.isGuarding = true;
        } else if (!input.guard) {
            state.isGuarding = false;
        }

        // DASH INPUT - edge triggered
        const dashEdge = input.dash && !prevInput.dash;
        const canDash = state.state !== 'hit' && state.state !== 'slam' &&
                       (state.state !== 'staggered' || (state.state === 'staggered' && state.staggerTimer <= 0));
        if (dashEdge && state.dashCharges > 0 && !state.isAttacking && state.onGround && canDash) {
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
        const comboHoldActive = player.comboHoldTimer > 0 && player.attackPhase === 'comboHold';
        const canAttackNow = player.attackTimer <= 0 || canChainAttack;

        // Allow attack if not in hit state (stagger is OK with staggerTimer <= 0)
        const canAttack = state.state !== 'hit' && state.state !== 'slam' &&
                         (state.state !== 'staggered' || (state.state === 'staggered' && state.staggerTimer <= 0));

        // Interrupt held combo state with any non-attack input.
        if (comboHoldActive && (
            input.left || input.right || input.up || input.down || input.guard ||
            input.dash || input.slam || input.evade || input.abilityQ || input.abilityX
        ) && !input.attack && !input.attackPressed && !input.attackReleased) {
            this.clearComboHold(player);
            state.state = 'idle';
        }

        // IMPORTANT: Only set attackHoldStart ONCE per press, not every tick.
        // The client holds attackPressed sticky for 120ms. Without this check,
        // attackHoldStart gets reset every tick, breaking the fallback timer.
        if (attackPressed && !state.isAttacking && canAttack && canAttackNow) {
            if (!player.attackHoldStart) {
                player.attackHoldStart = now;
                player.attackRequestActive = true;
            }
        }

        // RESTORED: Start attack on release (like original game: press to charge, release to swing)
        // Allow next attack to begin immediately if the fighter is still in combo-hold state.
        if (player.attackRequestActive && ((state.state !== 'attack' && state.state !== 'attacking') || comboHoldActive)) {
            // Also handle the case where client sends continuous attack (no release detected at 20tps)
            // If attack is held for more than one tick and we have an active request, start attack
            if (attackReleased) {
                const now = Date.now();
                const heldDuration = now - (player.attackHoldStart || now);
                const isCharged = heldDuration >= 300;
                
                // Use attackCounter for 1-3 rotation like original game
                const timeSinceLastAttack = now - player.lastAttackTime;
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

        // SLAM ATTACK - Require sticky slam input from client (down+attack)
        // Only trigger slam when the client explicitly sent the slam sticky flag
        // and the fighter is airborne. This prevents down-only inputs from
        // accidentally starting a slam on the server.
        const canSlam = state.state !== 'hit' && 
                       (state.state !== 'staggered' || (state.state === 'staggered' && state.staggerTimer <= 0));
        if (input.slam && !input.up && !state.onGround && !state.isAttacking && canSlam && !player.isSlamAttacking) {
            this.startSlamAttack(player);
        }

        // EVADE INPUT - edge triggered
        // Pressing evade key when not already evading and not in a state that blocks it
        const evadeEdge = input.evade && !prevInput.evade;
        if (evadeEdge && !state.isEvading && state.state !== 'hit' && 
            state.state !== 'staggered' && !state.isAttacking && !state.isDashing) {
            this.startEvade(player);
        }

        // ABILITY INPUT - Q and X keys for character-specific abilities
        // These are edge-triggered to prevent repeated activation
        const abilityQEdge = input.abilityQ && !prevInput.abilityQ;
        const abilityXEdge = input.abilityX && !prevInput.abilityX;

        // Check if fighter can use abilities (not in certain states)
        const canUseAbility = state.state !== 'hit' && state.state !== 'slam' &&
                             (state.state !== 'staggered' || (state.state === 'staggered' && state.staggerTimer <= 0)) &&
                             !state.isDefeated;

        // Execute Character-specific abilities
        if (canUseAbility) {
            if (abilityQEdge) {
                if (player.characterKey === 'CALLISTO') {
                    this.executeAbility(player.clientId, 'installationArt', null);
                } else if (player.characterKey === 'VALENCINA') {
                    this.executeAbility(player.clientId, 'timeToHunt', null);
                }
            }
            if (abilityXEdge) {
                // X key activates ultimate for all characters
                // Always available for testing
                this.activateUltimate(player);
            }
        }

        // EVADE INTERRUPTION: Any player input OR being hit ends evade immediately
        // Check if currently evading
        if (state.isEvading) {
            // Check for any new input that should cancel evade
            const anyInputEdge = 
                (input.left && !prevInput.left) ||
                (input.right && !prevInput.right) ||
                (input.up && !prevInput.up) ||
                (input.down && !prevInput.down) ||
                (input.attack && !prevInput.attack) ||
                (input.guard && !prevInput.guard) ||
                (input.dash && !prevInput.dash) ||
                (input.slam && !prevInput.slam) ||
                input.attackPressed;

            if (anyInputEdge) {
                // Determine the correct state to transition to based on current input
                this.exitEvade(player, input);
            }
        }
    }

    /**
     * Find the closest non-defeated enemy to this player
     * @param {Object} player - The player to find enemies for
     * @returns {Object|null} The closest enemy player object, or null if none found
     */
    findClosestEnemy(player) {
        let closestEnemy = null;
        let closestDist = Infinity;
        
        Object.values(this.players).forEach(other => {
            if (other.clientId === player.clientId) return;
            if (other.gameState.isDefeated) return;
            
            const dx = player.gameState.position.x - other.gameState.position.x;
            const dy = player.gameState.position.y - other.gameState.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < closestDist) {
                closestDist = dist;
                closestEnemy = other;
            }
        });
        
        return closestEnemy;
    }

    /**
     * Auto-face the player toward their closest enemy.
     * Called ONCE at action startup (attack, guard, evade).
     * This is SERVER AUTHORITATIVE — clients never auto-rotate.
     * @param {Object} player - The player to adjust facing for
     */
    faceClosestEnemy(player) {
        const enemy = this.findClosestEnemy(player);
        if (!enemy) return;
        
        // Face toward the closest enemy
        const state = player.gameState;
        state.facing = enemy.gameState.position.x > state.position.x ? 1 : -1;
    }

    /**
     * Start evade - SERVER AUTHORITATIVE
     * 1. Auto-faces toward the closest enemy
     * 2. Moves the fighter backwards (away from that enemy)
     * 3. Sets evade state and timer
     * This preserves fighting-game backstep behavior.
     */
    startEvade(player) {
        const state = player.gameState;
        
        // STEP 1: AUTO-FACE toward closest enemy before evade movement
        // This ensures evade moves backward relative to the opponent
        this.faceClosestEnemy(player);
        
        // Compute evade direction: backwards relative to facing
        // After faceClosestEnemy, the player faces the enemy, so
        // moving in -facing direction means moving away from the enemy
        const evadeDir = -state.facing; // Always move opposite to facing (backwards)
        
        // Teleport the fighter ~66% of evade distance instantly
        // This gives the responsive snap feel of the original evade
        state.position.x += evadeDir * EVADE_DISTANCE * 0.66;
        state.position.y += EVADE_DISTANCE * 0.2 * 0.3; // slight vertical pop
        
        // Clamp to arena bounds
        state.position.x = Math.max(60, Math.min(1340, state.position.x));
        state.position.y = Math.max(100, Math.min(600, state.position.y));
        
        // Apply velocity as leftover momentum (the remaining ~34% of distance)
        // Moves backward in the direction we're now facing away from the enemy
        const remainingDistance = EVADE_DISTANCE * 0.34;
        const evadeVelocity = remainingDistance / 0.15; // cover remaining distance over ~0.15s
        
        state.velocity.x = evadeDir * evadeVelocity;
        state.velocity.y = 0; // No vertical velocity on ground
        
        // Set evade state
        state.isEvading = true;
        state.evadeTimer = EVADE_MAX_DURATION;
        state.state = 'evade';
    }

    /**
     * Exit evade state - SERVER AUTHORITATIVE
     * Transitions to the appropriate state based on current input.
     * Called when input is detected during evade, or when timer expires.
     */
    exitEvade(player, input) {
        const state = player.gameState;
        
        if (!state.isEvading) return;
        
        state.isEvading = false;
        state.evadeTimer = 0;
        
        // Determine correct state based on input
        // Priority: attack > guard > movement > idle
        if (input.attack || input.attackPressed) {
            // Player pressed attack during evade -> will be handled by attack input processing
            state.state = 'idle';
        } else if (input.guard) {
            state.isGuarding = true;
            state.state = 'guard';
        } else if (input.dash) {
            // Dash will be started by the dash input processing
            state.state = 'idle';
        } else if (input.left || input.right) {
            // Movement will be applied by movement input processing
            state.state = 'idle';
        } else if (input.up) {
            // Jump will be started by jump input processing
            state.state = 'idle';
        } else if (input.slam) {
            // Slam will be started by slam input processing
            state.state = 'idle';
        } else {
            state.state = 'idle';
        }
    }

    /**
     * RESTORED: Start an attack with proper phase timing
     * Auto-faces toward the closest enemy before starting the attack startup.
     */
    startAttack(player, sequence, isCharged) {
        const config = player.config;
        const state = player.gameState;
        
        // AUTO-FACE toward closest enemy before attack startup
        // This ensures hitboxes face the correct direction
        this.faceClosestEnemy(player);
        
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
        player.comboHoldTimer = 0;
        player.lastAttackTime = now;
        player.attackCharge = isCharged;
        player.attackRequestActive = false;
        player.attackHoldStart = null;
        player.hitTargetsThisAttack = [];
        // Clear per-attack hit flag for combo miss detection
        const cs = this.engine.combatState[state.id];
        if (cs) cs.lastAttackHit = false;
        
        // Apply a subtle startup windup impulse for attack weight.
        const startupBackward = attackDef.startupBackward || attackDef.windupBackward || 100;
        state.velocity.x = -state.facing * startupBackward;
        
        state.isAttacking = true;
        state.state = 'attacking';
        
        // Set attack cooldown based on attack interval
        player.attackTimer = config.attackInterval || 0.75;
        
        // Update attack counter for rotation
        player.attackCounter = sequence;
    }

    /**
     * Update ability animation timers - manages animation state during ability execution
     * Decrements timers and resets animation flags when timers expire
     */
    updateAbilityAnimations(player, dt) {
        // Update Installation Art animation timer (Callisto)
        if (player.installationArtActive) {
            player.installationArtTimer -= dt;
            if (player.installationArtTimer <= 0) {
                player.installationArtActive = false;
                player.installationArtTimer = 0;
                // Return to idle state after ability animation completes
                if (player.gameState.state === 'attack') {
                    player.gameState.state = 'idle';
                    player.gameState.isAttacking = false;
                    // Clear attack animation state to prevent sprite from lingering
                    player.gameState.attackPhase = 'none';
                    player.gameState.attackSequence = 0;
                }
            }
        }

        // Update Time to Hunt casting animation timer (Valencina)
        if (player.timeToHuntCasting) {
            player.timeToHuntCastTimer -= dt;
            if (player.timeToHuntCastTimer <= 0) {
                player.timeToHuntCasting = false;
                player.timeToHuntCastTimer = 0;
                // Return to idle state after ability animation completes
                if (player.gameState.state === 'attack') {
                    player.gameState.state = 'idle';
                    player.gameState.isAttacking = false;
                    // Clear attack animation state to prevent sprite from lingering
                    player.gameState.attackPhase = 'none';
                    player.gameState.attackSequence = 0;
                }
            }
        }
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
            // Do NOT keep gameplay in an 'attack' blocking state. Instead set the
            // gameplay state back to 'idle' and set a visual-only flag so clients
            // can show the slam sprite until the player provides input. This
            // prevents the player from being locked out of inputs after landing.
            state.state = 'idle';
            player.isSlamAttacking = false;
            player.slamHoldVisual = true;
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
            
            // If any stray 'slam' state remained, clear it and visual flag
            if (state.state === 'slam') {
                state.state = 'idle';
                player.isSlamAttacking = false;
                player.slamHoldVisual = false;
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

        if (player.comboHoldTimer > 0) {
            player.comboHoldTimer -= dt;
            if (player.comboHoldTimer <= 0) {
                player.comboHoldTimer = 0;
                this.clearComboHold(player);
            }
        }

        if (state.state === 'attack' && player.attackPhase === 'comboHold' && player.comboHoldTimer <= 0) {
            this.clearComboHold(player);
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

        // EVADE TIMER - Server-authoritative duration countdown
        if (state.isEvading) {
            state.evadeTimer -= dt;
            if (state.evadeTimer <= 0) {
                // Auto-exit evade when timer expires (max 1 second)
                this.exitEvade(player, {});
                state.evadeTimer = 0;
            }
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
                    const activeForward = attackDef.attackForward || attackDef.activeForward || 320;
                    state.velocity.x = state.facing * activeForward;
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

        // Miss detection: if this attack didn't hit anyone, reset combo
        const cs = this.engine.combatState[state.id];
        if (cs && !cs.lastAttackHit) {
            this.engine.resetCombo(state.id);
        }
        // Clear the per-attack hit flag for next attack
        if (cs) cs.lastAttackHit = false;

        const now = Date.now();
        const comboWindow = 750; // ms used for combo chain detection
        const comboHoldSeconds = comboWindow / 1000; // attack timer uses seconds
        const attackKey = player.attackSequence === 1 ? 'light' : player.attackSequence === 2 ? 'medium' : 'heavy';
        const attackDef = player.config.attacks ? player.config.attacks[attackKey] : null;

        state.isAttacking = false;
        player.attackCharge = false;
        player.strikeActive = false;
        player.lastAttackTime = now;

        if (player.attackCounter > 0) {
            state.state = 'attack';
            player.attackPhase = 'comboHold';
            player.attackFrameTimer = attackDef ? attackDef.recovery : 0;
            player.comboHoldTimer = comboHoldSeconds;
        } else {
            state.state = 'idle';
            player.attackSequence = 0;
            player.attackPhase = 'none';
            player.attackFrameTimer = 0;
            player.attackFrame = 0;
            player.comboHoldTimer = 0;
        }
        // Don't reset attackTimer here; preserve any remaining cooldown so the combo timing is correct.
    }

    /**
     * Helper: End combo hold and return to idle state when the combo window expires.
     */
    clearComboHold(player) {
        const state = player.gameState;
        state.isAttacking = false;
        state.state = 'idle';
        player.attackSequence = 0;
        player.attackPhase = 'none';
        player.attackFrameTimer = 0;
        player.attackFrame = 0;
        player.strikeActive = false;
        player.comboHoldTimer = 0;
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
                case 'STATUS_DAMAGE':
                    this.broadcast({
                        type: 'STATUS_DAMAGE',
                        fighterId: player.clientId,
                        statusType: event.statusType,
                        damage: event.damage,
                        hp: player.gameState.hp
                    });
                    break;

                case 'STATUS_APPLIED':
                    this.broadcast({
                        type: 'STATUS_APPLIED',
                        fighterId: player.clientId,
                        statusType: event.statusType,
                        count: event.count,
                        potency: event.potency
                    });
                    break;

                case 'STATUS_CONSUMED':
                    this.broadcast({
                        type: 'STATUS_CONSUMED',
                        fighterId: player.clientId,
                        statusType: event.statusType,
                        remaining: event.remaining
                    });
                    break;

                case 'STATUS_EXPIRED':
                    this.broadcast({
                        type: 'STATUS_EXPIRED',
                        fighterId: player.clientId,
                        statusType: event.statusType
                    });
                    break;

                case 'STAGGER_INCREASE':
                    this.broadcast({
                        type: 'STAGGER_INCREASE',
                        fighterId: player.clientId,
                        statusType: event.statusType,
                        amount: event.amount
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
                    
                case 'STAGGER_EXIT':
                    this.broadcast({
                        type: 'STAGGER_EXIT',
                        fighterId: player.clientId,
                        reason: event.reason || ''
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
        if (!player || player.gameState.isDefeated || player.ai) return;

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
            attackReleased: !!input.attackReleased,
            evade: !!input.evade,
            abilityQ: !!input.abilityQ,
            abilityX: !!input.abilityX
        };
    }

    simulateAIInput(player) {
        if (!player || player.gameState.isDefeated) return;

        const enemy = this.findClosestEnemy(player);
        const input = player.input;

        input.left = false;
        input.right = false;
        input.up = false;
        input.down = false;
        input.attack = false;
        input.guard = false;
        input.dash = false;
        input.slam = false;
        input.attackPressed = false;
        input.attackReleased = false;
        input.evade = false;
        input.abilityQ = false;
        input.abilityX = false;

        if (!enemy || !player.ai) {
            return;
        }

        const state = player.gameState;
        const dx = enemy.gameState.position.x - state.position.x;
        const distance = Math.abs(dx);
        const approachDirection = dx > 0 ? 1 : -1;
        const canAct = !state.isAttacking && !state.isDashing && !state.isEvading && state.onGround && state.state !== 'hit' && state.state !== 'staggered';

        // Basic positioning
        if (distance > 280) {
            if (approachDirection > 0) input.right = true;
            else input.left = true;
        } else if (distance < 150) {
            if (approachDirection > 0) input.left = true;
            else input.right = true;
        }

        // Random attack decision when close enough
        if (canAct && distance < 240 && Math.random() < 0.1) {
            input.attack = true;
            input.attackPressed = true;
            if (Math.random() < 0.5) {
                input.attackReleased = true;
            }
        }

        // Guard when very close or threatened
        if (distance < 140 && Math.random() < 0.2) {
            input.guard = true;
        }

        // Dash occasionally to close or reposition
        if (canAct && Math.random() < 0.03) {
            input.dash = true;
        }

        // Evade occasionally for variety
        if (!state.isEvading && Math.random() < 0.02) {
            input.evade = true;
        }
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

            // FIX 1: Set lastHitOpponent server-side when a hit lands
            attacker.gameState.lastHitOpponent = defender.clientId;

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

            // VALENCINA: Apply per-attack effects on hit
            if (attacker.characterKey === 'VALENCINA') {
                const valencinaLogic = require('./characterLogic/valencina');
                
                if (attacker.attackSequence === 1) {
                    // Attack 1: Gain 3 Poise Count
                    valencinaLogic.applyAttack1Effects(attacker.gameState);
                } else if (attacker.attackSequence === 2) {
                    // Attack 2: Gain 1 Poise Potency
                    valencinaLogic.applyAttack2Effects(attacker.gameState);
                } else if (attacker.attackSequence === 3) {
                    // Attack 3: Consume 1 Acceleration Round, Trigger Tremor Burst, Bonus Damage
                    const attack3Result = valencinaLogic.applyAttack3Effects(attacker.gameState, defender.gameState);
                    
                    // Broadcast extra effects
                    if (attack3Result.consumedAccelerationRound) {
                        this.broadcast({
                            type: 'ACCELERATION_ROUND_CONSUMED',
                            fighterId: attacker.clientId,
                            remaining: attacker.gameState.resources.accelerationRounds
                        });
                    }
                    if (attack3Result.bonusDamage > 0) {
                        this.broadcast({
                            type: 'BONUS_DAMAGE',
                            fighterId: attacker.clientId,
                            targetId: defender.clientId,
                            damage: attack3Result.bonusDamage,
                            source: 'acceleration_round_burst'
                        });
                    }
                }
                
                // Clear accelerationRoundActive after attack resolves
                attacker.gameState.resources.accelerationRoundActive = false;
            }

            let hitstopSeconds = attackDef.hitstop || 0;
            if (!hitstopSeconds) {
                hitstopSeconds = attackType === 'light' ? 0.03 : attackType === 'medium' ? 0.05 : 0.08;
            }
            if (attacker.attackSequence === 3) {
                hitstopSeconds = Math.max(hitstopSeconds, 0.14);
            }
            if (result.staggerResult && result.staggerResult.staggered) {
                hitstopSeconds = Math.max(hitstopSeconds, 0.18);
            }
            if (result.defeated) {
                hitstopSeconds = Math.max(hitstopSeconds, 0.22);
            }
            this.startHitstop(hitstopSeconds, `attack-${attackType}`);

            // Broadcast hit result
            this.broadcast({
                type: 'HIT',
                attackerId: attacker.clientId,
                targetId: defender.clientId,
                damage: result.damage,
                isCrit: result.isCrit || false,
                attackType: attackType || null,
                attackSequence: attacker.attackSequence,
                hp: defender.gameState.hp,
                knockback: result.knockback,
                statuses: result.statuses || [],
                staggerResult: result.staggerResult || null,
                chargeAttack: result.chargeAttack || false,
                defeated: result.defeated,
                wasGuarded: result.wasGuarded || false,
                shakeType: 'hit',
                shakeIntensity: computeHitShakeIntensity(result.damage, {
                    attackType: attackType,
                    defeated: result.defeated,
                    staggered: !!(result.staggerResult && result.staggerResult.staggered)
                })
            });

            if (result.consumeEvents) {
                result.consumeEvents.forEach(ev => {
                    if (ev.type === 'STATUS_DAMAGE') {
                        this.broadcast({
                            type: 'STATUS_DAMAGE',
                            fighterId: defender.clientId,
                            statusType: ev.statusType,
                            damage: ev.damage,
                            hp: defender.gameState.hp
                        });
                    }
                });
            }

            if (result.bleedAttackEvents) {
                result.bleedAttackEvents.forEach(ev => {
                    if (ev.type === 'STATUS_DAMAGE') {
                        this.broadcast({
                            type: 'STATUS_DAMAGE',
                            fighterId: attacker.clientId,
                            statusType: ev.statusType,
                            damage: ev.damage,
                            hp: attacker.gameState.hp
                        });
                    }
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
            
            // FIX 1: Set lastHitOpponent for dash attacks
            state.lastHitOpponent = defender.clientId;

            // Apply damage and knockback directly without going through
            // engine.resolveAttack (which re-checks facing with rect-based detection).
            // Dash attacks hit regardless of facing.
            const dmgResult = this.engine.calculateDamage(attackData.baseDamage, state, defender.gameState);
            const ap = this.engine.applyDamage(defender.gameState, dmgResult.damage);

            // Call character-specific onSuccessfulHit for dash attacks
            this.engine.callOnSuccessfulHit(state, defender.gameState, dmgResult.damage);

            // Consume status effects on hit for dash attacks
            const ce = this.engine.consumeOnHit(defender.gameState);
            const be = this.engine.consumeBleedOnAttack(state);
            this.handleEvents(player, ce.concat(be));
            
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

            let dashHitstop = 0.10;
            if (defender.gameState.state === 'staggered') {
                dashHitstop = Math.max(dashHitstop, 0.16);
            }
            if (result.defeated) {
                dashHitstop = Math.max(dashHitstop, 0.18);
            }
            this.startHitstop(dashHitstop, 'dash');
            
            results.push({
                targetId: defender.clientId,
                damage: result.damage,
                defenderHp: result.defenderHp,
                hit: result.hit,
                defeated: result.defeated,
                knockback: result.knockback,
                shakeType: 'dash',
                shakeIntensity: computeHitShakeIntensity(result.damage, {
                    attackType: 'dash',
                    defeated: result.defeated,
                    staggered: defender.gameState.state === 'staggered'
                })
            });
        });
        
        // Dash attack combo: increment on hit, reset on miss
        if (results.length > 0) {
            this.engine.addCombo(state.id);
            this.engine.incrementAttackCounter(state.id);
            // Reset combo for all hit defenders
            results.forEach(r => {
                this.engine.resetCombo(r.targetId);
            });

            this.broadcast({
                type: 'dashAttackResult',
                attackerId: attacker.clientId,
                hits: results
            });
        } else {
            // Dash attack whiffed - reset combo
            this.engine.resetCombo(state.id);
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
                // FIX 1: Set lastHitOpponent for slam landing
                state.lastHitOpponent = defender.clientId;

                const attackData = {
                    range: slamRadius,
                    baseDamage: config.baseDamage * 2,
                    knockback: 150,
                    staggerDamage: config.baseDamage * 100,
                    statusEffects: [],
                    chargeAttack: false,
                    isDashAttack: false,
                    hitArea: 'circle'
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
                    if (result.hit) {
                    let slamHitstop = 0.16;
                    if (result.staggerResult && result.staggerResult.staggered) {
                        slamHitstop = Math.max(slamHitstop, 0.20);
                    }
                    if (result.defeated) {
                        slamHitstop = Math.max(slamHitstop, 0.24);
                    }
                    this.startHitstop(slamHitstop, 'slam');
                }

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
                    knockback: result.knockback,
                    shakeType: 'slam',
                    shakeIntensity: computeHitShakeIntensity(result.damage, {
                        attackType: 'slam',
                        defeated: result.defeated,
                        staggered: !!(result.staggerResult && result.staggerResult.staggered)
                    })
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
        
        // Determine target using lastHitOpponent if no explicit targetId provided
        let resolvedTargetId = targetId;
        if (!resolvedTargetId) {
            // FIX: Use lastHitOpponent for targeting
            resolvedTargetId = attacker.gameState.lastHitOpponent || null;
        }
        
        const targetPlayer = resolvedTargetId ? this.players[resolvedTargetId] : null;
        let targetState = targetPlayer ? targetPlayer.gameState : null;

        // For single-target abilities, resolve against lastHitOpponent
        if (!targetState && ['timeToHunt', 'installationArt'].includes(abilityId)) {
            // Fall back to closest enemy if no lastHitOpponent
            const closestEnemy = this.findClosestEnemy(attacker);
            if (closestEnemy) {
                targetState = closestEnemy.gameState;
                resolvedTargetId = closestEnemy.clientId;
            }
        }

        // For AOE abilities, resolve against all enemy targets if no explicit target was supplied.
        if (!targetState && ['disposial', 'ultimate'].includes(abilityId)) {
            targetState = Object.values(this.players)
                .filter(p => p.clientId !== attacker.clientId && !p.gameState.isDefeated)
                .map(p => p.gameState);
        }

        // Set ability animation states BEFORE executing to ensure state is sent in next snapshot
        if (abilityId === 'installationArt') {
            attacker.installationArtActive = true;
            attacker.installationArtTimer = 1.0; // 1 second animation
            attacker.gameState.state = 'attack';
            attacker.gameState.isAttacking = true;
        } else if (abilityId === 'timeToHunt') {
            attacker.timeToHuntCasting = true;
            attacker.timeToHuntCastTimer = 0.8; // 0.8 second casting animation
            attacker.gameState.state = 'attack';
            attacker.gameState.isAttacking = true;
        }

        const result = this.engine.executeAbility(
            attacker.gameState,
            abilityId,
            resolvedTargetId,
            targetState
        );

        if (!result) return null;
        
        // Set ability result flags for client cleanup
        if (abilityId === 'timeToHunt') {
            result.abilityId = 'timeToHunt';
        }
        if (abilityId === 'installationArt') {
            result.abilityId = 'installationArt';
        }
        
        if (targetPlayer) {
            result.targetId = targetPlayer.clientId;
        } else if (resolvedTargetId) {
            result.targetId = resolvedTargetId;
        }
        if (!result.targetId && Array.isArray(targetState) && targetState.length > 0) {
            result.targetIds = targetState.map(ts => ts.id);
        }

        // Consume Bleed on ability use (attacker takes bleed damage)
        const bleedEvents = this.engine.consumeBleedOnAbility(attacker.gameState);
        if (bleedEvents.length) this.handleEvents(attacker, bleedEvents);

        result.fighterId = attackerId;
        result.abilityId = abilityId;
        const payload = { type: 'abilityResult', ...result };
        this.broadcast(payload);
        this.io.to(this.room.id).emit('abilityResult', result);

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
            hitstop: {
                active: this.hitstopTimer > 0,
                timer: this.hitstopTimer
            },
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
                // Evade state
                isEvading: player.gameState.isEvading || false,
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
                    attackReleased: !!player.input?.attackReleased,
                    evade: !!player.input?.evade,
                    abilityQ: !!player.input?.abilityQ,
                    abilityX: !!player.input?.abilityX
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
                // Visual-only flag: client should hold slam sprite until player input
                slamHold: !!player.slamHoldVisual,
                // Dash attack state
                dashAttackQueued: player.dashAttackQueued || false,
                dashAttackActive: player.dashAttackActive || false,
                // Combo state (authoritative, for UI rendering)
                combo: (this.engine.combatState[player.clientId] || {}).combo || 0,
                comboTimer: (this.engine.combatState[player.clientId] || {}).comboTimer || 0,
                // Stagger state (authoritative - full snapshot for client rendering)
                stagger: player.gameState.stagger || 0,
                staggerThreshold: player.gameState.staggerThreshold || 1000,
                staggerTimer: player.gameState.staggerTimer || 0,
                staggerRecoveryTimer: player.gameState.staggerRecoveryTimer || 0,
                staggerDuration: player.gameState.staggerDuration || 0,
                // Ability cooldowns (for UI countdown timers)
                abilityCooldowns: { ...player.gameState.abilityCooldowns } || {},
                // Character-specific ability resources
                resources: { ...player.gameState.resources } || {},
                // Ability animation states (for synced ability visuals)
                installationArtActive: !!player.installationArtActive,
                installationArtTimer: player.installationArtTimer || 0,
                timeToHuntCasting: !!player.timeToHuntCasting,
                timeToHuntCastTimer: player.timeToHuntCastTimer || 0,
                // Ultimate state (server-authoritative)
                ultimateActive: !!player.ultimateActive,
                ultimatePhase: player.ultimate ? player.ultimate.phase : 0,
                ultimateTimer: player.ultimate ? player.ultimate.timer : 0,
                ultimateAttackFrame: player.ultimate ? player.ultimate.attackFrame : 0,
                ultimateAttackTimer: player.ultimate ? player.ultimate.attackTimer : 0,
                ultimateTotalDamage: player.ultimate ? player.ultimate.totalDamage : 0,
                ultimateCameraZoom: player.ultimate ? player.ultimate.cameraZoom : 1,
                ultimateBackgroundDim: player.ultimate ? player.ultimate.backgroundDim : 0,
                ultimateName: player.ultimate ? player.ultimate.name : '',
                ultimateDialogue: player.ultimate ? player.ultimate.dialogue : '',
                // Ultimate visual effects data
                ultimateRedLines: player.ultimate ? player.ultimate.redLines || [] : [],
                ultimateSkulls: player.ultimate ? player.ultimate.skulls || [] : [],
                // Ultimate sprite for client animation
                ultimateSprite: player.ultimate ? player.ultimate.currentSprite || '' : ''
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
     * Update ultimate sequences for all players
     * Server-authoritative timing, positioning, and damage
     * Broadcasts hit events so client shows damage numbers and hurt reactions
     * Also broadcasts slash events for client visual effects
     */
    updateUltimates(dt) {
        Object.values(this.players).forEach(player => {
            if (!player.ultimateActive || !player.ultimate || player.gameState.isDefeated) return;
            
            // Track HP of enemies before update to detect individual hits
            const enemyPrevHp = {};
            Object.values(this.players)
                .filter(p => p.clientId !== player.clientId && !p.gameState.isDefeated)
                .forEach(enemy => {
                    enemyPrevHp[enemy.clientId] = enemy.gameState.hp;
                });
            
            // Get enemies (all other non-defeated players)
            const enemies = Object.values(this.players)
                .filter(p => p.clientId !== player.clientId && !p.gameState.isDefeated)
                .map(p => p.gameState);
            const enemyPlayers = Object.values(this.players)
                .filter(p => p.clientId !== player.clientId && !p.gameState.isDefeated);
            
            // Clear slash events from previous tick before updating
            if (player.ultimate.slashEvents) {
                player.ultimate.slashEvents = [];
            }
            
            // Update the appropriate ultimate sequence
            const prevDamage = player.ultimate.totalDamage;
            switch (player.characterKey) {
                case 'JOHN':
                    updateJohnUltimate(player.gameState, player.ultimate, enemies, dt);
                    break;
                case 'CALLISTO':
                    updateCallistoUltimate(player.gameState, player.ultimate, enemies, dt);
                    break;
                case 'VALENCINA':
                    updateValencinaUltimate(player.gameState, player.ultimate, enemies, dt);
                    break;
            }
            
            // Broadcast slash events for this tick
            if (player.ultimate.slashEvents && player.ultimate.slashEvents.length > 0) {
                player.ultimate.slashEvents.forEach(slashEvent => {
                    this.broadcast({
                        type: 'ULTIMATE_SLASH',
                        fighterId: player.clientId,
                        slashType: slashEvent.type,
                        offsetX: slashEvent.offsetX || 0,
                        offsetY: slashEvent.offsetY || 0,
                        frame: slashEvent.frame || 0
                    });
                });
            }
            
            // Start ultimate hitstop if an ultimate damage event requested it
            if (player.ultimate && player.ultimate.lastHitstop > 0) {
                this.startHitstop(player.ultimate.lastHitstop, 'ultimate');
                player.ultimate.lastHitstop = 0;
            }

            // Broadcast hit events for each enemy that lost HP
            Object.values(this.players)
                .filter(p => p.clientId !== player.clientId && !p.gameState.isDefeated)
                .forEach(enemy => {
                    const prevHp = enemyPrevHp[enemy.clientId];
                    const damageTaken = prevHp - enemy.gameState.hp;
                    if (damageTaken > 0) {
                        this.broadcast({
                            type: 'HIT',
                            attackerId: player.clientId,
                            targetId: enemy.clientId,
                            damage: damageTaken,
                            hp: enemy.gameState.hp,
                            knockback: enemy.gameState.hitTimer > 0.3 ? 300 : 100, // Detect strong knockback
                            statuses: [],
                            defeated: enemy.gameState.isDefeated || false,
                            isUltimate: true
                        });
                        
                        if (enemy.gameState.isDefeated) {
                            this.broadcast({
                                type: 'FIGHTER_DEFEATED',
                                fighterId: enemy.clientId,
                                defeatedBy: player.clientId
                            });
                        }
                    }
                });
            
            // Check if ultimate should end (phase >= 11 and timer expired)
            if (player.ultimate.phase >= 11 && player.ultimate.timer !== undefined) {
                if (player.ultimate.timer <= 0) {
                    this.endUltimate(player);
                }
            }
        });
    }

    /**
     * Activate ultimate - server authoritative
     * Teleports user to center, locks targets, sets up sequence
     */
    activateUltimate(player) {
        if (player.ultimateActive) return;
        if (player.gameState.isDefeated) return;
        
        const state = player.gameState;
        const config = player.config;
        
        // Create ultimate state
        player.ultimate = initUltimate(state);
        player.ultimateActive = true;
        
        // Set ultimate name and dialogue based on character
        switch (player.characterKey) {
            case 'JOHN':
                player.ultimate.name = 'BASIC ULTIMATE';
                player.ultimate.dialogue = 'Basic ultimate sequence!';
                player.ultimate.timer = 1.0;
                break;
            case 'CALLISTO':
                player.ultimate.name = 'CLOSING TIME';
                player.ultimate.dialogue = "Installation Art no. 1: Your Flesh and Bones as the Gallery's Seats";
                player.ultimate.timer = 1.5;
                break;
            case 'VALENCINA':
                player.ultimate.name = 'DISPOSAL';
                player.ultimate.dialogue = "I'm sick and tired of Ticket and her meddling fools—to hell with you all!";
                player.ultimate.timer = 3.0; // Opening pose lasts 3 seconds (per spec)
                break;
        }
        
        // Protect enemies - they can't act during ultimate
        Object.values(this.players).forEach(other => {
            if (other.clientId === player.clientId) return;
            other.gameState.ultimateProtected = true;
            other.gameState.state = 'idle';
            other.gameState.isAttacking = false;
            other.gameState.velocity.x = 0;
            other.gameState.velocity.y = 0;
        });
        
        // Disable collision for all players
        Object.values(this.players).forEach(other => {
            other.gameState.collisionEnabled = false;
        });
        
        // Teleport to center of arena
        state.position.x = ARENA_WIDTH / 2;
        state.position.y = ARENA_HEIGHT - 100;
        state.velocity.x = 0;
        state.velocity.y = 0;
        
        // Set facing direction based on enemy positions
        const enemy = this.findClosestEnemy(player);
        if (enemy) {
            state.facing = enemy.gameState.position.x > state.position.x ? 1 : -1;
        }
        
        
        // Broadcast ultimate start
        this.broadcast({
            type: 'ULTIMATE_START',
            fighterId: player.clientId,
            characterKey: player.characterKey,
            ultimateName: player.ultimate.name,
            ultimateDialogue: player.ultimate.dialogue
        });
    }

    /**
     * End ultimate - restore normal gameplay state
     */
    endUltimate(player) {
        if (!player.ultimateActive) return;
        
        const state = player.gameState;
        
        // Remove protection from all enemies
        Object.values(this.players).forEach(other => {
            if (other.clientId === player.clientId) return;
            other.gameState.ultimateProtected = false;
            other.gameState.state = 'idle';
            other.gameState.isAttacking = false;
        });
        
        // Restore collision
        Object.values(this.players).forEach(other => {
            other.gameState.collisionEnabled = true;
        });
        
        // Reset ultimate state
        player.ultimateActive = false;
        player.ultimate = null;
        
        // Reset camera
        state.ultimateCameraZoom = 1;
        state.ultimateBackgroundDim = 0;
        
        
        // Broadcast ultimate end
        this.broadcast({
            type: 'ULTIMATE_END',
            fighterId: player.clientId
        });
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