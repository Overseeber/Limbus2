var express = require('express');
var app = express();
var server = app.listen(3000);
app.use(express.static('public'));

var socket = require('socket.io');
var io = socket(server);
var clientList = {};
var roomList = {};

// Import server-authoritative gameplay systems
const GameplayEngine = require('./server/logic/gameplayEngine');
const characterLogic = require('./server/logic/characterLogic');
const abilityHandler = require('./server/logic/abilityHandler');

// Create authoritative gameplay engine for all matches
const gameplayEngine = new GameplayEngine();

// Minimal server-side Vector2 implementation for position/velocity math.
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    copy() {
        return new Vector2(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
}

console.log("Server is Running");

class Client {
    constructor(id)
    {
        this.id = id;
        this.fighter = null;
        this.room = null;
        this.state = 'MainMenu';
        this.ready = false;
    }
}

class Room {
    constructor(id)
    {
        this.id = id;
        this.clients = [];
        this.match = null;
        this.type = '1v1';
        this.matchFighters = {}; // Server-side authoritative fighter states
        this.matchActive = false;
        this.tickInterval = null;
    }
}

function createRoom(id) {
    if (roomList[id]) return roomList[id];
    const r = new Room(id);
    roomList[id] = r;
    return r;
}

function getRoomState(room) {
    let slots = [];

    for (let i = 0; i < room.clients.length; i++) {
        let id = room.clients[i];
        let client = clientList[id];

        let character = null;
        let ready = false;

        if (client) {
            ready = client.ready;

            if (client.fighter) {
                character = client.fighter.class;
            }
        }

        slots.push({
            clientId: id,
            character: character,
            ready: ready
        });
    }

    let allReady = true;

    if (slots.length < 2) {
        allReady = false;
    }

    for (let i = 0; i < slots.length; i++) {
        if (slots[i].ready == false) {
            allReady = false;
        }
    }

    return {
        id: room.id,
        slots: slots,
        allReady: allReady
    };
}

function emitRoomState(roomId) {
    const room = roomList[roomId];
    if (!room) return;
    const state = getRoomState(room);
    io.to(roomId).emit('roomState', state);
}

function getRoomsData() {
    return Object.keys(roomList).map(roomId => {
        const room = roomList[roomId];
        return {
            id: roomId,
            players: room.clients.length,
            maxPlayers: 2
        };
    });
}

function broadcastRoomList() {
    io.sockets.emit('roomsList', getRoomsData());
}

// Server-side fighter state (authoritative)
class ServerFighter {
    constructor(name, clientId, room) {
        this.clientId = clientId;
        this.class = name.class;
        this.hp = name.hp;
        this.maxHp = name.maxHp;
        this.speed = name.speed;
        this.jumpHeight = name.jumpHeight;
        this.baseDamage = name.baseDamage;
        this.staggerThreshold = name.staggerThreshold;
        this.staggerLength = name.staggerLength;
        this.weapon = name.weapon;
        this.knockbackMultiplier = name.knockbackMultiplier;
        this.combo = 0;
        this.comboTimer = 0;
        this.attackCounter = 0;
        this.hitbox = { width: 50, height: 50 };
        this.state = 'idle';
        this.pos = new Vector2(0, 0);
        this.vel = new Vector2(0, 0);
        this.stagger = 0;
        this.isStaggered = false;
        this.staggerTimer = 0;
        this.staggerRecoveryTimer = 0;
        this.statuses = [];
        this.isDefeated = false;
        this.facing = 1;
        this.room = room;
        
        // Initialize authoritative game state
        this.gameState = gameplayEngine.initializeCharacter(clientId, this.class);
        this.gameState.position = { x: 0, y: 0 };
        this.gameState.position.z = 0; // FIX: Ensure z property exists
    }

    takeDamage(amount, source) {
        this.hp = Math.max(0, this.hp - amount);
        this.gameState.hp = this.hp;
        console.log(`${this.class} took ${amount} damage from ${source.class}. Remaining HP: ${this.hp}`);
        
        if (this.hp <= 0) {
            this.isDefeated = true;
            this.state = 'defeated';
            this.gameState.isDefeated = true;
        }
    }

    heal(amount, source) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.gameState.hp = this.hp;
        console.log(`${this.class} healed ${amount} HP from ${source.class}. Current HP: ${this.hp}`);
    }

    // Apply results from authoritative combat resolution
    applyCombatResult(result) {
        if (result.hit) {
            this.hp = result.defenderHp;
            this.gameState.hp = result.defenderHp;
            
            if (result.defeated) {
                this.isDefeated = true;
                this.state = 'defeated';
                this.gameState.isDefeated = true;
            }
            
            // Apply knockback position
            if (result.knockback) {
                this.pos.x += result.knockback * this.facing;
                this.gameState.position.x = this.pos.x;
            }
            
            // Apply stagger
            if (result.staggerResult && result.staggerResult.staggered) {
                this.isStaggered = true;
                this.staggerTimer = result.staggerResult.duration;
                this.state = 'staggered';
                this.gameState.state = 'staggered';
            }
        }
    }
}

function broadcastEvent(event, excludeSocketId = null, roomId = null) {
    if (!roomId) {
        if (!excludeSocketId) return;
        const client = clientList[excludeSocketId];
        if (!client || !client.room) return;
        roomId = client.room;
    }
    const room = roomList[roomId];
    if (!room) return;

    if (excludeSocketId) {
        room.clients.forEach(cid => {
            if (cid === excludeSocketId) return;
            const s = io.sockets.sockets.get(cid);
            if (s) s.emit('event', event);
        });
    } else {
        io.to(roomId).emit('event', event);
    }
}

// =====================
// SERVER GAME TICK
// =====================
function runGameTick(room) {
    if (!room.matchActive || !room.matchFighters) return;
    
    const fighters = Object.values(room.matchFighters);
    if (fighters.length < 2) return;
    
    const fighterA = fighters[0];
    const fighterB = fighters[1];
    
    const dt = 0.05; // 50ms tick rate
    
    // Update authoritative state for each fighter
    [fighterA, fighterB].forEach(fighter => {
        if (!fighter.isDefeated) {
            const config = {
                staggerThreshold: fighter.staggerThreshold,
                staggerLength: fighter.staggerLength
            };
            
            // Let GameplayEngine process tick updates
            const events = gameplayEngine.updateFighter(fighter.gameState, dt, config);
            
            // Sync back to ServerFighter
            fighter.pos.x = fighter.gameState.position.x;
            fighter.pos.y = fighter.gameState.position.y;
            fighter.hp = fighter.gameState.hp;
            fighter.state = fighter.gameState.state;
            fighter.stagger = fighter.gameState.stagger;
            fighter.isDefeated = fighter.gameState.isDefeated;
            fighter.statuses = fighter.gameState.statuses;
            
            // Handle status damage events for broadcasting
            events.forEach(event => {
                if (event.type === 'BURN_DAMAGE' || event.type === 'BLEED_DAMAGE' || 
                    event.type === 'RUPTURE_DAMAGE' || event.type === 'BLEED_ATTACK_DAMAGE') {
                    broadcastEvent({
                        type: 'STATUS_DAMAGE',
                        fighterId: fighter.clientId,
                        eventType: event.type,
                        damage: event.damage,
                        hp: fighter.hp
                    }, null, room.id);
                }
                if (event.type === 'DEFEATED') {
                    broadcastEvent({
                        type: 'FIGHTER_DEFEATED',
                        fighterId: fighter.clientId,
                        defeatedBy: null
                    }, null, room.id);
                }
            });
        }
    });
    
    // Broadcast state update to all clients in room
    const stateUpdate = {
        type: 'GAME_STATE_UPDATE',
        fighters: {}
    };
    
    [fighterA, fighterB].forEach(fighter => {
        stateUpdate.fighters[fighter.clientId] = {
            hp: fighter.hp,
            maxHp: fighter.maxHp,
            position: { x: fighter.pos.x, y: fighter.pos.y },
            velocity: { x: fighter.vel.x, y: fighter.vel.y },
            facing: fighter.facing,
            state: fighter.state,
            stagger: fighter.stagger,
            isDefeated: fighter.isDefeated,
            combo: fighter.combo,
            attackCounter: fighter.attackCounter,
            statuses: fighter.statuses.map(s => ({ ...s }))
        };
    });
    
    io.to(room.id).emit('gameState', stateUpdate);
}

// =====================
// HIT DETECTION & COMBAT (SERVER AUTHORITY)
// =====================
function detectcollision(fighterA, fighterB) {
    return !(
        fighterA.pos.x + fighterA.hitbox.width < fighterB.pos.x ||    
        fighterA.pos.x > fighterB.pos.x + fighterB.hitbox.width ||
        fighterA.pos.y + fighterB.hitbox.height < fighterB.pos.y ||
        fighterA.pos.y > fighterB.pos.y + fighterB.hitbox.height
    );
}

function detectHit(attacker, defenders, attackData) {
    const hits = [];
    const attackRange = attackData.range || 100;
    
    for (const defender of defenders) {
        if (defender.id === attacker.id || defender.isDefeated) continue;
        
        // Use authoritative GameplayEngine hit detection
        const hit = gameplayEngine.checkHit(
            attacker.fighter.gameState.position,
            defender.fighter.gameState.position,
            attackRange,
            attacker.fighter.facing
        );
        
        if (hit) {
            hits.push(defender);
        }
    }
    return hits;
}

function resolveHit(attacker, defender, attackData) {
    const config = {
        staggerThreshold: attacker.fighter.staggerThreshold,
        staggerLength: attacker.fighter.staggerLength
    };
    
    const result = gameplayEngine.resolveAttack(
        attacker.fighter.gameState,
        defender.fighter.gameState,
        attackData,
        config
    );
    
    // Apply results to server-side fighter objects
    attacker.fighter.applyCombatResult({
        ...result,
        attackerId: attacker.id
    });
    defender.fighter.applyCombatResult({
        ...result,
        defenderId: defender.id
    });
    
    return result;
}

function updateStagger(fighter) {
    if (fighter.stagger >= fighter.staggerThreshold) {
        if (!fighter.isStaggered) {
            fighter.isStaggered = true;
            fighter.staggerTimer = fighter.staggerLength || 5;
            
            broadcastEvent({
                type: 'STAGGER_START',
                fighterId: fighter.clientId,
                duration: fighter.staggerLength || 5
            });
        }
    }
    
    if (fighter.isStaggered) {
        fighter.staggerTimer -= 0.05;
        if (fighter.staggerTimer <= 0) {
            fighter.isStaggered = false;
            fighter.staggerRecoveryTimer = fighter.staggerLength || 5;
            
            broadcastEvent({
                type: 'STAGGER_RECOVER',
                fighterId: fighter.clientId
            });
        }
    }
    
    if (fighter.staggerRecoveryTimer > 0) {
        fighter.staggerRecoveryTimer -= 0.05;
        if (fighter.staggerRecoveryTimer <= 0) {
            fighter.state = 'idle';
            fighter.stagger = 0;
            
            broadcastEvent({
                type: 'STAGGER_END',
                fighterId: fighter.clientId
            });
        }
    }
}

function processDeath(fighter) {
    if (fighter.hp <= 0 && !fighter.isDefeated) {
        fighter.isDefeated = true;
        fighter.vel.x = 0;
        fighter.vel.y = 0;
        
        broadcastEvent({
            type: 'FIGHTER_DEFEATED',
            fighterId: fighter.clientId,
            defeatedBy: fighter.lastAttackedBy || null
        });
        
        // Check for battle end
        const room = fighter.room;
        if (room) {
            const activeFighters = Object.values(room.matchFighters).filter(f => !f.isDefeated);
            if (activeFighters.length <= 1) {
                endBattle(room, activeFighters[0]);
            }
        }
    }
}

function updateMatch(match) {
    Object.values(match).forEach(fighter => {
        updateStagger(fighter);
        processDeath(fighter);
    });
}

function endBattle(room, winner) {
    room.matchActive = false;
    if (room.tickInterval) {
        clearInterval(room.tickInterval);
        room.tickInterval = null;
    }
    
    io.to(room.id).emit('event', {
        type: 'MATCH_END',
        winnerId: winner ? winner.clientId : null,
        winnerCharacter: winner ? winner.class : null
    });
}

// Status effect system
function getStatusMods(fighter) {
    const mods = {
        haste: 1.1,
        bind: 1.1,
        proc: 1.1,
        frag: 1.1
    };

    fighter.statuses.forEach(status => {
        if (status.type === 'haste') {
            mods.haste += 0.1 * status.potency;
        } else if (status.type === 'bind') {
            mods.bind += 0.1 * status.potency;
        } else if (status.type === 'proc') {
            mods.proc += 0.1 * status.potency;
        } else if (status.type === 'frag') {
            mods.frag += 0.1 * status.potency;
        }
    });

    return mods;
}

const EVENT_TYPES = {
  INPUT_MOVE: 'INPUT_MOVE',
  INPUT_ATTACK: 'INPUT_ATTACK',
  INPUT_GUARD: 'INPUT_GUARD',
  INPUT_DASH: 'INPUT_DASH',
  INPUT_ABILITY: 'INPUT_ABILITY',
  
  HIT: 'HIT',
  BLOCK: 'BLOCK',
  PARRY: 'PARRY',
  COUNTER: 'COUNTER',
  
  STATUS_APPLY: 'STATUS_APPLY',
  STATUS_TICK: 'STATUS_TICK',
  STATUS_REMOVE: 'STATUS_REMOVE',
  
  MOVE: 'MOVE',
  DASH: 'DASH',
  
  STAGGER_START: 'STAGGER_START',
  STAGGER_END: 'STAGGER_END',
  
  ABILITY_START: 'ABILITY_START',
  ABILITY_HIT: 'ABILITY_HIT',
  ABILITY_END: 'ABILITY_END',
  
  ULTIMATE_START: 'ULTIMATE_START',
  ULTIMATE_HIT: 'ULTIMATE_HIT',
  ULTIMATE_END: 'ULTIMATE_END',
  
  FIGHTER_DEFEATED: 'FIGHTER_DEFEATED',
  MATCH_END: 'MATCH_END',
};

io.sockets.on('connection', (socket) => {
  
    console.log(socket.id + ' ' + 'is connected');

    const client = new Client(socket.id);
    const fighter = new ServerFighter({ class: null, hp: null, maxHp: null, speed: null, jumpHeight: null, baseDamage: null, staggerThreshold: null, staggerLength: null, weapon: 'Sword', knockbackMultiplier: 1 }, socket.id, null);
    client.fighter = fighter;

    clientList[socket.id] = client;

    client.fighter.class = 'JOHN';

    console.log(socket.id + ' connected (no room assigned)');

    console.log('Current Rooms:', Object.keys(roomList));
    console.log('Current Clients:', Object.keys(clientList));

    socket.emit('roomsList', getRoomsData());

    // Create and join a room
    socket.on('createRoom', (roomId) => {
        if (!roomId) return;
        if (client.room) {
            const oldRoom = roomList[client.room];
            if (oldRoom) {
                oldRoom.clients = oldRoom.clients.filter(id => id !== socket.id);
                socket.leave(client.room);
                if (oldRoom.clients.length === 0 && oldRoom.id !== 'room1') {
                    delete roomList[oldRoom.id];
                }
            }
        }

        const room = createRoom(roomId);
        if (!room.clients.includes(socket.id)) {
            room.clients.push(socket.id);
            client.room = room.id;
            socket.join(room.id);
        }
        socket.emit('joinedRoom', room.id);
        emitRoomState(room.id);
        broadcastRoomList();
    });

    // Join existing room
    socket.on('joinRoom', (roomId) => {
        const room = roomList[roomId];
        if (!room) {
            socket.emit('error', { message: 'ROOM_NOT_FOUND' });
            return;
        }
        if (client.room) {
            const oldRoom = roomList[client.room];
            if (oldRoom) {
                oldRoom.clients = oldRoom.clients.filter(id => id !== socket.id);
                socket.leave(client.room);
                if (oldRoom.clients.length === 0 && oldRoom.id !== 'room1') {
                    delete roomList[oldRoom.id];
                }
            }
        }

        if (!room.clients.includes(socket.id)) {
            room.clients.push(socket.id);
            client.room = room.id;
            socket.join(room.id);
        }
        socket.emit('joinedRoom', room.id);
        emitRoomState(room.id);
        broadcastRoomList();
    });

    // Leave current room
    socket.on('leaveRoom', () => {
        if (!client.room) return;
        const room = roomList[client.room];
        if (!room) return;
        room.clients = room.clients.filter(id => id !== socket.id);
        socket.leave(client.room);
        if (room.clients.length === 0 && room.id !== 'room1') {
            delete roomList[room.id];
        }
        client.room = null;
        emitRoomState(room.id);
        broadcastRoomList();
    });

    // Change character selection
    socket.on('changeCharacter', (characterKey) => {
        client.fighter.class = characterKey;
        client.ready = false;
        if (client.room) emitRoomState(client.room);
    });

    // Toggle ready state
    socket.on('toggleReady', () => {
        client.ready = !client.ready;
        if (client.room) emitRoomState(client.room);
    });

    // Start the battle with full server authority
    socket.on('startBattle', () => {
        const room = roomList[client.room];
        if (!room) return;
        const state = getRoomState(room);
        if (state.allReady) {
            // Initialize authoritative match state
            room.matchActive = true;
            room.matchFighters = {};
            
            // Create server-authoritative fighters from each client
            room.clients.forEach(cid => {
                const c = clientList[cid];
                if (!c) return;
                
                const charKey = c.fighter.class || 'JOHN';
                const charConfig = gameplayEngine.getCharacterConfig(charKey);
                if (!charConfig) return;
                
                const serverFighter = new ServerFighter({
                    class: charKey,
                    hp: charConfig.maxHp,
                    maxHp: charConfig.maxHp,
                    speed: charConfig.speed,
                    jumpHeight: 20,
                    baseDamage: charConfig.baseDamage,
                    staggerThreshold: charConfig.staggerThreshold,
                    staggerLength: charConfig.staggerLength,
                    weapon: charConfig.weapon || 'None',
                    knockbackMultiplier: charConfig.knockbackMultiplier || 1.0
                }, cid, room);
                
                // Set starting positions
                const index = room.clients.indexOf(cid);
                const spacing = 300;
                const centerX = 700;
                const totalWidth = (room.clients.length - 1) * spacing;
                const startX = centerX - totalWidth / 2;
                
                serverFighter.pos.x = startX + (index * spacing);
                serverFighter.pos.y = 600;
                serverFighter.facing = index === 0 ? 1 : -1;
                serverFighter.gameState.position = { x: serverFighter.pos.x, y: serverFighter.pos.y };
                serverFighter.gameState.facing = serverFighter.facing;
                
                room.matchFighters[cid] = serverFighter;
            });
            
            // Start server game tick
            if (room.tickInterval) clearInterval(room.tickInterval);
            room.tickInterval = setInterval(() => runGameTick(room), 50);
            
            io.to(client.room).emit('battleStart', {
                slots: state.slots
            });
            console.log('Battle started in room ' + client.room);
        }
    });

    // Handle ability requests with full server authority
    socket.on('ability', (data) => {
        const room = roomList[client.room];
        if (!room || !room.matchActive) return;
        
        const attackerFighter = room.matchFighters[socket.id];
        const targetFighter = data.targetId ? room.matchFighters[data.targetId] : null;
        
        if (!attackerFighter || attackerFighter.isDefeated) return;
        
        // Execute ability through authoritative gameplay engine
        const result = gameplayEngine.executeAbility(
            attackerFighter.gameState,
            data.abilityId,
            data.targetId,
            targetFighter ? targetFighter.gameState : null
        );
        
        // Apply results to server fighter states
        if (result.success) {
            attackerFighter.hp = attackerFighter.gameState.hp;
            
            if (result.damage !== undefined && result.targetHp !== undefined && targetFighter) {
                targetFighter.hp = result.targetHp;
            }
            
            if (result.defeated && targetFighter) {
                targetFighter.isDefeated = true;
                targetFighter.gameState.isDefeated = true;
            }
        }
        
        // Broadcast result to room
        result.fighterId = socket.id;
        result.abilityId = data.abilityId;
        io.to(client.room).emit('abilityResult', result);
    });

    // Handle basic attack inputs with server authority
    socket.on('basicAttack', (data) => {
        const room = roomList[client.room];
        if (!room || !room.matchActive) return;
        
        const attackerFighter = room.matchFighters[socket.id];
        if (!attackerFighter || attackerFighter.isDefeated || attackerFighter.state === 'staggered') return;
        
        // Find all valid targets
        const defenders = room.clients
            .filter(cid => cid !== socket.id)
            .map(cid => ({
                id: cid,
                fighter: room.matchFighters[cid]
            }))
            .filter(d => d.fighter && !d.fighter.isDefeated);
        
        if (defenders.length === 0) return;
        
        // Create attack data
        const attackData = {
            range: data.heavy ? 294 : 231,
            baseDamage: data.heavy ? attackerFighter.baseDamage * 2 : attackerFighter.baseDamage,
            knockback: data.heavy ? 9 : 6,
            staggerDamage: attackerFighter.baseDamage * 0.5,
            statusEffects: [],
            heavy: data.heavy || false
        };
        
        // Detect who got hit
        const hits = detectHit({ id: socket.id, fighter: attackerFighter }, defenders, attackData);
        
        // Resolve each hit
        const results = [];
        hits.forEach(def => {
            const result = resolveHit(
                { id: socket.id, fighter: attackerFighter },
                def.fighter,
                attackData
            );
            
            // Increment attack counter
            attackerFighter.attackCounter = Math.min(3, (attackerFighter.attackCounter || 0) + 1);
            
            results.push({
                targetId: def.id,
                damage: result.damage,
                defenderHp: result.defenderHp,
                hit: result.hit,
                defeated: result.defeated,
                knockback: result.knockback
            });
        });
        
        // Broadcast attack results
        io.to(client.room).emit('attackResult', {
            attackerId: socket.id,
            hits: results,
            attackCounter: attackerFighter.attackCounter
        });
    });

    // Broadcast inputs to room peers
    socket.on('input', (data) => {
        if (client.room) {
            socket.to(client.room).emit('peerInput', { from: socket.id, data });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (client.room && roomList[client.room]) {
            const room = roomList[client.room];
            
            // End match if active
            if (room.matchActive) {
                room.matchActive = false;
                if (room.tickInterval) {
                    clearInterval(room.tickInterval);
                    room.tickInterval = null;
                }
                io.to(room.id).emit('event', {
                    type: 'MATCH_END',
                    winnerId: null,
                    reason: 'DISCONNECT'
                });
            }
            
            room.clients = room.clients.filter(id => id !== socket.id);
            socket.leave(client.room);
            if (room.clients.length === 0 && room.id !== 'room1') {
                delete roomList[room.id];
            }
            emitRoomState(room.id);
        }
        delete clientList[socket.id];
        console.log('Client has disconnected', socket.id);
    });

    socket.on("changeState", (newState) => {
        client.state = newState;
        console.log(socket.id + " -> " + newState);
    });
});

// Game loop, runs every 50ms (20 ticks per second)
setInterval(() => {
    Object.values(roomList).forEach(room => {
        if (!room.matchActive) return;
        
        // Game tick is now handled by runGameTick called from the startBattle interval
        // This is a safety net for any rooms that might have been missed
    });
}, 50);

// Room list broadcast
setInterval(() => {
    broadcastRoomList();
}, 2000);