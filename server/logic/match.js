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
            gameState.isDashing = false;
            gameState.canDash = true;
            
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
                    dash: false
                },
                // Attack sequence state
                attackTimer: 0,           // Cooldown before next attack allowed
                attackSequence: 0,        // 0=none, 1=light, 2=medium, 3=heavy
                attackPhase: 'startup',   // startup, active, recovery
                attackFrameTimer: 0,      // Time into current attack phase
                strikeActive: false,      // Whether hitbox is currently active
                lastAttackTime: 0,        // When last attack was initiated
                attackHoldStart: null,    // Timestamp when attack input began
                attackRequestActive: false,
                attackCharge: false,      // Whether current attack is charged
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
                // Process input
                this.processInput(player, dt);

                // Update physics
                this.updatePhysics(player, dt);

                // Resolve collisions
                this.resolveCollisions(player);

                // Check attacks during active frame
                if (player.strikeActive && player.attackSequence > 0) {
                    this.checkAttackHits(player);
                }

                // Update gameplay state through GameplayEngine
                const config = {
                    staggerThreshold: player.config.staggerThreshold,
                    staggerLength: player.config.staggerLength
                };

                const events = this.engine.updateFighter(player.gameState, dt, config);

                // Handle events from GameplayEngine
                this.handleEvents(player, events);
            }
        });

        // Check win condition
        this.checkWinCondition();

        // Broadcast snapshot to all clients
        this.broadcastSnapshot();
        console.log("tick running");
    }

    /**
     * Process player input with proper acceleration-based movement
     */
    processInput(player, dt) {
        const input = player.input;
        const state = player.gameState;
        const config = player.config;
        
        // MOVEMENT INPUT - Acceleration-based for responsive feel
        // Shared configs use per-frame style 'speed' (old client). Convert to pixels/second by *60.
        const maxSpeed = (config.speed || 9) * 60;
        const acceleration = config.acceleration || 1800;
        
        let targetVelX = 0;
        
        if (input.left) {
            targetVelX = -maxSpeed;
            state.facing = -1;
        } else if (input.right) {
            targetVelX = maxSpeed;
            state.facing = 1;
        }
        
        // Accelerate/decelerate smoothly
        const accelAmount = acceleration * dt;
        if (targetVelX > state.velocity.x) {
            state.velocity.x = Math.min(targetVelX, state.velocity.x + accelAmount);
        } else if (targetVelX < state.velocity.x) {
            state.velocity.x = Math.max(targetVelX, state.velocity.x - accelAmount);
        }
        
        // Apply friction when no input
        if (targetVelX === 0 && state.onGround) {
            const friction = config.friction || 0.85;
            state.velocity.x *= friction;
            if (Math.abs(state.velocity.x) < 0.1) state.velocity.x = 0;
        }
        
        // Air control - reduced movement in air
        if (!state.onGround && (input.left || input.right)) {
            const airControl = config.airControl || 0.6;
            state.velocity.x *= airControl;
        }

        // JUMP INPUT - Use jumpHeight from config (converted to pixels/s if needed)
        if (input.up && state.onGround) {
            const jumpHeight = config.jumpHeight || 1200; // already scaled in shared configs
            // Debug logging to investigate jump/gravity issues
            console.log(`[Jump] player=${player.clientId} jumpHeight=${jumpHeight} gravity=${config.gravity} dt=${dt}`);
            state.velocity.y = -jumpHeight;
            state.onGround = false;
            console.log(`[Jump] player=${player.clientId} vy_after=${state.velocity.y}`);
        }

        // GUARD INPUT
        if (input.guard && !state.isAttacking) {
            state.isGuarding = true;
        } else {
            state.isGuarding = false;
        }

        // DASH INPUT - Directional movement boost with charge-based recovery
        if (input.dash && state.dashCharges > 0 && !state.isAttacking && state.onGround) {
            const dashDir = input.right ? 1 : (input.left ? -1 : state.facing);
            const dashSpeed = ((typeof config.dashSpeed !== 'undefined' ? config.dashSpeed : 60) * 60);
            state.velocity.x = dashDir * dashSpeed;
            state.isDashing = true;
            state.dashTimer = 0;
            state.dashCharges -= 1;
            state.canDash = state.dashCharges > 0;
            player.dashAttackQueued = false; // Reset dash attack flag
        }
        
        // DASH ATTACK - Trigger attack during dash if attack input occurs
        if (input.attack && state.isDashing && !player.dashAttackQueued) {
            player.dashAttackQueued = true;
            player.dashAttackInitiated = true;
        }

        // ATTACK INPUT - Track press/release for light vs charged attacks
        const now = Date.now();
        const attackPressed = input.attack && !player.input.attack;
        const attackReleased = !input.attack && player.input.attack && player.attackRequestActive;

        if (attackPressed) {
            player.attackHoldStart = now;
            player.attackRequestActive = true;
        }

        if (attackReleased && !state.isAttacking && player.attackTimer <= 0) {
            const heldDuration = now - (player.attackHoldStart || now);
            const isCharged = heldDuration >= 300;
            const timeSinceLastAttack = now - player.lastAttackTime;
            const comboWindow = 300; // 300ms window for combo

            if (!isCharged && timeSinceLastAttack < comboWindow && player.attackSequence > 0) {
                player.attackSequence = Math.min(3, player.attackSequence + 1);
            } else {
                player.attackSequence = isCharged ? 3 : 1;
            }

            player.attackPhase = 'startup';
            player.attackFrameTimer = 0;
            player.strikeActive = false;
            player.lastAttackTime = now;
            player.attackCharge = isCharged;
            player.attackRequestActive = false;
            player.attackHoldStart = null;
            state.isAttacking = true;
            state.state = 'attacking';
        }
    }

    /**
     * Update physics for a player with gravity and collision
     */
    updatePhysics(player, dt) {
        const state = player.gameState;
        const config = player.config;

        // GRAVITY - Continuous acceleration when airborne
        if (!state.onGround) {
            // Shared configs now use per-second gravity (converted from old client)
            const gravity = (typeof config.gravity !== 'undefined') ? config.gravity : 36;
            state.velocity.y += gravity * dt;
            // Raise terminal velocity to match higher movement units
            state.velocity.y = Math.min(state.velocity.y, 2000);
        }

        // APPLY VELOCITY - Update position
        state.position.x += state.velocity.x * dt;
        state.position.y += state.velocity.y * dt;

        // GROUND COLLISION
        if (state.position.y >= 600) {
            state.position.y = 600;
            state.velocity.y = 0;
            state.onGround = true;
        }

        // WALL BOUNDARIES - Keep in arena and stop dash when hitting an edge
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
            state.velocity.x = 0;
            if (state.isDashing) {
                state.isDashing = false;
            }
        }

        // DASH TIMER / RECHARGE
        if (state.isDashing) {
            state.dashTimer += dt;
            const dashDuration = config.dashDuration || 0.2;
            if (state.dashTimer >= dashDuration) {
                state.isDashing = false;
                // Reset dash attack flags when dash ends
                player.dashAttackInitiated = false;
                player.dashAttackResolved = false;
            }
            
            // RESOLVE DASH ATTACK if triggered during dash
            if (player.dashAttackInitiated && !player.dashAttackResolved) {
                player.dashAttackResolved = true;
                this.resolveDashAttack(player);
            }
        }

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

        // ATTACK SEQUENCE TIMER - Handle attack phases (startup, active, recovery)
        if (state.isAttacking && player.attackSequence > 0) {
            const attackDef = config.attacks[
                player.attackSequence === 1 ? 'light' :
                player.attackSequence === 2 ? 'medium' :
                'heavy'
            ];
            
            if (!attackDef) {
                state.isAttacking = false;
                player.attackSequence = 0;
                player.attackCharge = false;
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
                    state.isAttacking = false;
                    state.state = 'idle';
                    player.attackSequence = 0;
                    player.attackPhase = 'none';
                    player.attackTimer = config.attackInterval || 0.75;
                    player.attackCharge = false;
                }
            }
        }
    }

    /**
     * Resolve collisions between players
     */
    resolveCollisions(player) {
        // Simple circle collision detection
        Object.values(this.players).forEach(other => {
            if (other.clientId === player.clientId) return;
            if (other.gameState.isDefeated) return;

            const dx = player.gameState.position.x - other.gameState.position.x;
            const dy = player.gameState.position.y - other.gameState.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = 50; // Sum of radii

            if (distance < minDistance) {
                // Push players apart
                const overlap = minDistance - distance;
                const pushX = (dx / distance) * overlap / 2;
                const pushY = (dy / distance) * overlap / 2;

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
     * Handle player input
     */
    handleInput(playerId, input) {
        if (!this.running) return;

        const player = this.players[playerId];
        if (!player || player.gameState.isDefeated) return;

        // Store input state
        player.input = input;
    }

    /**
     * Resolve attack with server authority
     */
    resolveAttack(attackerId, attackData) {
        if (!this.running) return;
        
        const attacker = this.players[attackerId];
        if (!attacker || attacker.gameState.isDefeated || attacker.gameState.state === 'staggered') return;
        
        // Find all valid targets
        const defenders = Object.values(this.players).filter(p => 
            p.clientId !== attackerId && !p.gameState.isDefeated
        );
        
        if (defenders.length === 0) return;
        
        const results = [];
        
        // Check each defender for hit
        defenders.forEach(defender => {
            const hit = this.engine.checkHit(
                attacker.gameState.position,
                defender.gameState.position,
                attackData.range || 100,
                attacker.gameState.facing
            );
            
            if (hit) {
                const config = {
                    staggerThreshold: attacker.config.staggerThreshold,
                    staggerLength: attacker.config.staggerLength
                };
                
                const result = this.engine.resolveAttack(
                    attacker.gameState,
                    defender.gameState,
                    attackData,
                    config
                );
                
                results.push({
                    targetId: defender.clientId,
                    damage: result.damage,
                    defenderHp: result.defenderHp,
                    hit: result.hit,
                    defeated: result.defeated,
                    knockback: result.knockback
                });
            }
        });
        
        // Update charged attack state
        attacker.gameState.attackCharge = !!attackData.chargeAttack;

        if (results.length > 0) {
            attacker.gameState.attackCounter = Math.min(3, (attacker.gameState.attackCounter || 0) + 1);
        }

        // Broadcast attack results
        this.broadcast({
            type: 'attackResult',
            attackerId: attackerId,
            hits: results,
            attackCounter: attacker.gameState.attackCounter,
            chargeAttack: attacker.gameState.attackCharge
        });
        
        return results;
    }

    /**
     * Resolve dash attack - high speed attack during dash
     */
    resolveDashAttack(player) {
        const attacker = player;
        const state = player.gameState;
        const config = player.config;
        
        // Dash attacks use enhanced stats
        const attackData = {
            range: 168,           // 40% increased range
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
            const hit = this.engine.checkHit(
                state.position,
                defender.gameState.position,
                attackData.range,
                state.facing
            );
            
            if (hit) {
                const result = this.engine.resolveAttack(
                    state,
                    defender.gameState,
                    attackData,
                    {
                        staggerThreshold: attacker.config.staggerThreshold,
                        staggerLength: attacker.config.staggerLength
                    }
                );
                
                results.push({
                    targetId: defender.clientId,
                    damage: result.damage,
                    defenderHp: result.defenderHp,
                    hit: result.hit,
                    defeated: result.defeated,
                    knockback: result.knockback
                });
            }
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
     * Resolve slam attack - AOE attack after jumping
     */
    resolveSlamAttack(player, targetId) {
        const attacker = player;
        const state = player.gameState;
        const config = player.config;
        
        // Validate slam can be used
        if (state.onGround) {
            return { success: false, reason: 'Cannot slam on ground' };
        }
        
        const abilityConfig = config.abilities.slam;
        if (!abilityConfig) {
            return { success: false, reason: 'No slam config' };
        }
        
        // Slam creates an AOE at current position with landing damage
        const slamPos = { x: state.position.x, y: 600 }; // Assume ground Y
        const slamRadius = abilityConfig.range || 200;
        
        const defenders = Object.values(this.players).filter(p => 
            p.clientId !== attacker.clientId && !p.gameState.isDefeated
        );
        
        const results = [];
        
        defenders.forEach(defender => {
            const dx = defender.gameState.position.x - slamPos.x;
            const dy = defender.gameState.position.y - slamPos.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance <= slamRadius) {
                const attackData = {
                    range: slamRadius,
                    baseDamage: abilityConfig.baseDamage,
                    knockback: abilityConfig.knockback,
                    staggerDamage: abilityConfig.baseDamage * 100, // Heavy stagger
                    statusEffects: abilityConfig.statusEffects || [],
                    chargeAttack: false
                };
                
                const result = this.engine.resolveAttack(
                    state,
                    defender.gameState,
                    attackData,
                    {
                        staggerThreshold: attacker.config.staggerThreshold,
                        staggerLength: attacker.config.staggerLength
                    }
                );
                
                results.push({
                    targetId: defender.clientId,
                    damage: result.damage,
                    defenderHp: result.defenderHp,
                    hit: true,
                    defeated: result.defeated,
                    knockback: result.knockback
                });
            }
        });
        
        // Broadcast slam attack results
        this.broadcast({
            type: 'slamAttackResult',
            attackerId: attacker.clientId,
            slamPos: slamPos,
            radius: slamRadius,
            hits: results
        });
        
        return { success: true, results };
    }

    /**
     * Check and resolve attack hits during active frame
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

            // Keep attack counter state in sync for the attacker
            attacker.gameState.attackCounter = Math.min(3, (attacker.gameState.attackCounter || 0) + 1);

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
                defeated: result.defeated
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

            // Mark attack as having hit (don't allow multiple hits per attack)
            attacker.strikeActive = false;
        });
    }

    executeAbility(attackerId, abilityId, targetId) {
        if (!this.running) return;
        
        const attacker = this.players[attackerId];
        if (!attacker || attacker.gameState.isDefeated) return;
        
        // Handle slam attack specially (direct server-side resolution)
        if (abilityId === 'slamAttack') {
            return this.resolveSlamAttack(attacker, targetId);
        }
        
        const target = targetId ? this.players[targetId] : null;
        
        // Execute ability through GameplayEngine
        const result = this.engine.executeAbility(
            attacker.gameState,
            abilityId,
            targetId,
            target ? target.gameState : null
        );
        
        // Broadcast result
        result.fighterId = attackerId;
        result.abilityId = abilityId;
        this.broadcast({
            type: 'abilityResult',
            ...result
        });
        
        return result;
    }

    /**
     * Broadcast snapshot to all clients in room
     */
//     async broadcastSnapshot() {
//         const snapshot = {
//             players: Object.values(this.players).map(player => ({
//                 id: player.clientId,
//                 x: player.gameState.position.x,
//                 y: player.gameState.position.y,
//                 vx: player.gameState.velocity.x,
//                 vy: player.gameState.velocity.y,
//                 hp: player.gameState.hp,
//                 maxHp: player.gameState.maxHp,
//                 state: player.gameState.state,
//                 facing: player.gameState.facing,
//                 statuses: player.gameState.statuses,
//                 isDefeated: player.gameState.isDefeated,
//                 isAttacking: player.gameState.isAttacking || false,
//                 isGuarding: player.gameState.isGuarding || false,
//                 isDashing: player.gameState.isDashing || false
//             }))
//         };
//         console.log("snapshot sent");
//        // this.io.to(this.room.id).emit('snapshot', snapshot);
//        //this.io.emit('snapshot', snapshot);
//        this.room.clients.forEach(id => {
//     const socket = this.io.sockets.sockets.get(id);
//     if (socket) socket.emit('snapshot', snapshot);
// });
// console.log("ROOM CLIENT IDS:", this.room.clients);
// console.log("SOCKET IDS IN ROOM:", await this.io.in(this.room.id).allSockets());
//     //    console.log("EMITTING TO ROOM:", this.room.id);
//     //    console.log("ROOM SOCKETS:", await this.io.in(this.room.id).allSockets());
      
//     }
broadcastSnapshot() {
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
                // Attack state for client-side animation
                attackSequence: player.attackSequence || 0,
                attackPhase: player.attackPhase || 'none',
                strikeActive: player.strikeActive || false,
                attackCounter: player.gameState.attackCounter || 0,
                chargeAttack: player.attackCharge || (this.engine.combatState[player.clientId] || {}).chargeAttack || false
            }))
        };

        console.log("snapshot sent");
        console.log("EMIT snapshot to room:", this.room.id);
        this.io.to(this.room.id).emit('snapshot', snapshot);

        this.io.in(this.room.id).allSockets()
            .then(sockets => {
                console.log("room sockets:", sockets);
            })
            .catch(err => {
                console.error("Failed to inspect room sockets:", err);
            });
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
    endMatch(winnerId) {
        this.stop();
        
        const winner = winnerId ? this.players[winnerId] : null;
        
        this.broadcast({
            type: 'MATCH_END',
            winnerId: winnerId,
            winnerCharacter: winner ? winner.characterKey : null
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
