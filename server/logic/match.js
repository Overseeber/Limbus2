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
                }
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
     * Process player input
     */
    processInput(player, dt) {
        const input = player.input;
        const state = player.gameState;

        // Apply input to velocity based on character config
        if (input.left) {
            state.velocity.x = -player.config.speed;
            state.facing = -1;
        } else if (input.right) {
            state.velocity.x = player.config.speed;
            state.facing = 1;
        } else {
            state.velocity.x = 0;
        }

        // Jump input
        if (input.up && state.onGround) {
            state.velocity.y = -player.config.jumpHeight;
            state.onGround = false;
        }

        // Attack input
        if (input.attack) {
            // Attack handling will be done through GameplayEngine
            // For now, just set attack flag
            state.isAttacking = true;
        }

        // Guard input
        if (input.guard) {
            state.isGuarding = true;
        } else {
            state.isGuarding = false;
        }

        // Dash input
        if (input.dash && state.canDash) {
            state.isDashing = true;
            state.dashTimer = 0.3; // 300ms dash duration
            state.canDash = false;
            state.dashCooldown = 1.0; // 1 second cooldown
        }
    }

    /**
     * Update physics for a player
     */
    updatePhysics(player, dt) {
        const state = player.gameState;

        // Apply gravity
        if (!state.onGround) {
            state.velocity.y += 980 * dt; // Gravity
        }

        // Apply velocity to position
        state.position.x += state.velocity.x * dt;
        state.position.y += state.velocity.y * dt;

        // Ground collision
        if (state.position.y >= 600) {
            state.position.y = 600;
            state.velocity.y = 0;
            state.onGround = true;
        }

        // Wall boundaries
        if (state.position.x < 50) state.position.x = 50;
        if (state.position.x > 1350) state.position.x = 1350;

        // Update dash timer
        if (state.isDashing) {
            state.dashTimer -= dt;
            if (state.dashTimer <= 0) {
                state.isDashing = false;
            }
        }

        // Update dash cooldown
        if (state.dashCooldown > 0) {
            state.dashCooldown -= dt;
            if (state.dashCooldown <= 0) {
                state.canDash = true;
                state.dashCooldown = 0;
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
     * Execute ability with server authority
     */
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
                isDashing: player.gameState.isDashing || false
            }))
        };
        console.log("snapshot sent");
       // this.io.to(this.room.id).emit('snapshot', snapshot);
       this.io.emit('snapshot', snapshot);
       console.log("EMITTING TO ROOM:", this.room.id);
      
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
