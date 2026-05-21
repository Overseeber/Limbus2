/**
 * MATCH CLASS - Server-side authoritative game simulation
 * Owns fighters, ticking, attacks, match state, and broadcasting
 * No external dependencies on global io, gameplayEngine, or room.matchFighters
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
                config: charConfig
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
                const config = {
                    staggerThreshold: player.config.staggerThreshold,
                    staggerLength: player.config.staggerLength
                };
                
                // Let GameplayEngine process tick updates
                const events = this.engine.updateFighter(player.gameState, dt, config);
                
                // Handle events from GameplayEngine
                this.handleEvents(player, events);
            }
        });
        
        // Check win condition
        this.checkWinCondition();
        
        // Broadcast state to all clients
        this.broadcastState();
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
        
        // Process input through GameplayEngine
        // This would need to be implemented in GameplayEngine
        // For now, this is a placeholder
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
     * Broadcast state to all clients in room
     */
    broadcastState() {
        const snapshot = {
            type: 'GAME_STATE_UPDATE',
            fighters: {}
        };
        
        Object.values(this.players).forEach(player => {
            snapshot.fighters[player.clientId] = this.engine.getStateSnapshot(player.gameState);
        });
        
        this.io.to(this.room.id).emit('gameState', snapshot);
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
