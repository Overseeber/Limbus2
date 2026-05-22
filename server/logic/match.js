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
                lastAttackTime: 0         // When last attack was initiated
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
        const maxSpeed = config.speed || 9;
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

        // JUMP INPUT - Use jumpHeight from config
        if (input.up && state.onGround) {
            const jumpHeight = config.jumpHeight || 300;
            state.velocity.y = -jumpHeight;
            state.onGround = false;
        }

        // GUARD INPUT
        if (input.guard && !state.isAttacking) {
            state.isGuarding = true;
        } else {
            state.isGuarding = false;
        }

        // DASH INPUT - Directional movement boost
        if (input.dash && state.canDash && !state.isAttacking) {
            const dashDir = input.right ? 1 : (input.left ? -1 : state.facing);
            const dashSpeed = config.dashSpeed || 800;
            state.velocity.x = dashDir * dashSpeed;
            state.isDashing = true;
            state.dashTimer = 0;
            state.canDash = false;
            state.dashCooldown = config.dashCooldown || 1.0;
        }

        // ATTACK INPUT - Initiate or continue combo
        if (input.attack && !state.isAttacking && player.attackTimer <= 0) {
            // Determine attack type based on held duration or simple sequence
            const timeSinceLastAttack = Date.now() - player.lastAttackTime;
            const comboWindow = 300; // 300ms window for combo
            
            if (timeSinceLastAttack < comboWindow && player.attackSequence > 0) {
                // Continue combo
                player.attackSequence = Math.min(3, player.attackSequence + 1);
            } else {
                // Start new combo
                player.attackSequence = 1;
            }
            
            player.attackPhase = 'startup';
            player.attackFrameTimer = 0;
            player.strikeActive = false;
            player.lastAttackTime = Date.now();
            state.isAttacking = true;
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
            const gravity = config.gravity || 980;
            state.velocity.y += gravity * dt;
            state.velocity.y = Math.min(state.velocity.y, 500); // Terminal velocity
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

        // WALL BOUNDARIES - Keep in arena
        if (state.position.x < 50) state.position.x = 50;
        if (state.position.x > 1350) state.position.x = 1350;

        // DASH TIMER
        if (state.isDashing) {
            state.dashTimer += dt;
            const dashDuration = config.dashDuration || 0.16;
            if (state.dashTimer >= dashDuration) {
                state.isDashing = false;
            }
        }

        // DASH COOLDOWN
        if (state.dashCooldown > 0) {
            state.dashCooldown -= dt;
            if (state.dashCooldown <= 0) {
                state.canDash = true;
                state.dashCooldown = 0;
            }
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
                    player.attackSequence = 0;
                    player.attackTimer = config.attackInterval || 0.75;
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
        
        // Increment attack counter
        attacker.gameState.attackCounter = Math.min(3, (attacker.gameState.attackCounter || 0) + 1);
        
        // Broadcast attack results
        this.broadcast({
            type: 'attackResult',
            attackerId: attackerId,
            hits: results,
            attackCounter: attacker.gameState.attackCounter
        });
        
        return results;
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

        // Find all defenders
        const defenders = Object.values(this.players).filter(p => 
            p.clientId !== attacker.clientId && !p.gameState.isDefeated
        );

        // Check each defender for hit
        defenders.forEach(defender => {
            // Simple distance check - check if defender is within range
            const dx = Math.abs(defender.gameState.position.x - attacker.gameState.position.x);
            const dy = Math.abs(defender.gameState.position.y - attacker.gameState.position.y);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if in range and facing correct direction
            const inRange = distance <= attackDef.range;
            const facingCorrect = Math.sign(defender.gameState.position.x - attacker.gameState.position.x) === attacker.gameState.facing;

            if (inRange && facingCorrect) {
                // Apply damage based on attack definition
                const damage = Math.round(attackDef.damage * attacker.config.baseDamage);
                const knockback = attackDef.knockback;
                const staggerDamage = attackDef.staggerDamage;

                // Apply knockback
                const knockDir = Math.sign(defender.gameState.position.x - attacker.gameState.position.x) || 1;
                defender.gameState.velocity.x = knockback * knockDir * 0.5; // Scale knockback

                // Apply damage
                defender.gameState.hp = Math.max(0, defender.gameState.hp - damage);

                // Broadcast hit
                this.broadcast({
                    type: 'HIT',
                    attackerId: attacker.clientId,
                    targetId: defender.clientId,
                    damage: damage,
                    attackSequence: attacker.attackSequence,
                    hp: defender.gameState.hp
                });

                // Check defeat
                if (defender.gameState.hp <= 0) {
                    defender.gameState.isDefeated = true;
                    this.broadcast({
                        type: 'FIGHTER_DEFEATED',
                        fighterId: defender.clientId,
                        defeatedBy: attacker.clientId
                    });
                }

                // Mark attack as having hit (don't allow multiple hits per attack)
                attacker.strikeActive = false;
            }
        });
    }

    executeAbility(attackerId, abilityId, targetId) {
        if (!this.running) return;
        
        const attacker = this.players[attackerId];
        if (!attacker || attacker.gameState.isDefeated) return;
        
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
                onGround: player.gameState.onGround || false,
                // Attack state for client-side animation
                attackSequence: player.attackSequence || 0,
                attackPhase: player.attackPhase || 'none',
                strikeActive: player.strikeActive || false
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
