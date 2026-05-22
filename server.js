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
const Match = require('./server/logic/match');

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
        this.character = 'JOHN'; // Default character
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
            character = client.character;
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

// ServerFighter class removed - Match.players now owns authoritative state
// Match class handles all game simulation through GameplayEngine

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
        io.to(roomId).except(excludeSocketId).emit('event', event);
    } else {
        io.to(roomId).emit('event', event);
    }
}

// =====================
// OLD COMBAT FUNCTIONS REMOVED
// These are now handled by Match class
// - runGameTick -> Match.tick()
// - detectcollision -> removed (duplicate logic)
// - detectHit -> Match.resolveAttack()
// - resolveHit -> Match.resolveAttack()
// - updateStagger -> GameplayEngine handles stagger
// - processDeath -> GameplayEngine handles defeat
// - updateMatch -> Match.tick()
// - endBattle -> Match.endMatch()
// =====================

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
//    const fighter = new ServerFighter({ class: 'JOHN', hp: null, maxHp: null, speed: null, jumpHeight: null, baseDamage: null, staggerThreshold: null, staggerLength: null, weapon: 'Sword', knockbackMultiplier: 1 }, socket.id, null);
//    client.fighter = fighter;

    clientList[socket.id] = client;

//     // Initialize character config for the default class
//     const defaultConfig = gameplayEngine.getCharacterConfig('JOHN');
//     if (defaultConfig) {
//         fighter.hp = defaultConfig.maxHp;
//         fighter.maxHp = defaultConfig.maxHp;
//         fighter.speed = defaultConfig.speed;
//         fighter.baseDamage = defaultConfig.baseDamage;
//         fighter.staggerThreshold = defaultConfig.staggerThreshold;
//         fighter.staggerLength = defaultConfig.staggerLength;
//     }
//     fighter._initializeGameState();

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
            console.log('JOIN ROOM:', socket.id, '->', room.id);
            io.in(room.id).allSockets().then(sockets => {
                console.log('room sockets after join:', room.id, sockets);
            });
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
            console.log('JOIN ROOM:', socket.id, '->', room.id);
            io.in(room.id).allSockets().then(sockets => {
                console.log('room sockets after join:', room.id, sockets);
            });
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
        client.character = characterKey;
        client.ready = false;
        if (client.room) emitRoomState(client.room);
    });

    // Toggle ready state
    // socket.on('toggleReady', () => {
    //     client.ready = !client.ready;
    //     if (client.room) emitRoomState(client.room);
    // });
socket.on('toggleReady', () => {
    client.ready = !client.ready;

    const room = roomList[client.room];
    if (!room) return;

    emitRoomState(client.room);
});
    // Start the battle with full server authority
    socket.on('startBattle', () => {
        const room = roomList[client.room];
        if (!room) return;
        const state = getRoomState(room);
        if (state.allReady) {
            // Create Match instance with proper architecture
            room.match = new Match(room, io);
            
            // Initialize match with players from room
            const playerConfigs = room.clients.map((cid, index) => {
                const c = clientList[cid];
                return {
                    clientId: cid,
                    characterKey: c.character || 'JOHN',
                    index: index
                };
            });
            
            room.match.initialize(playerConfigs);
            room.match.start();
            
            io.to(client.room).emit('battleStart', {
                slots: state.slots
            });
            console.log('Battle started in room ' + client.room);
            io.in(client.room).allSockets().then(sockets => {
                console.log('room sockets:', sockets);
            }).catch(err => {
                console.error('Failed to read room sockets for', client.room, err);
            });
        }
    });
    socket.on('input', (input) => {

    const room = roomList[client.room];

    if (!room || !room.match) return;

    const player = room.match.getPlayer(socket.id);

    if (!player) return;

    player.input = input;
  //  console.log("ROOM MEMBERS:", io.in(client.room).allSockets());
    
   // console.log(player.clientId, player.input);
});
    // Handle ability requests with full server authority
    socket.on('ability', (data) => {
        const room = roomList[client.room];
        if (!room || !room.match) return;
        
        room.match.executeAbility(socket.id, data.abilityId, data.targetId);
    });

    // Handle basic attack inputs with server authority
    socket.on('basicAttack', (data) => {
        const room = roomList[client.room];
        if (!room || !room.match) return;
        
        const attacker = room.match.getPlayer(socket.id);
        if (!attacker || attacker.gameState.isDefeated || attacker.gameState.state === 'staggered') return;
        
        // Create attack data
        const attackData = {
            range: data.heavy ? 294 : 231,
            baseDamage: data.heavy ? attacker.config.baseDamage * 2 : attacker.config.baseDamage,
            knockback: data.heavy ? 9 : 6,
            staggerDamage: attacker.config.baseDamage * 0.5,
            statusEffects: [],
            heavy: data.heavy || false
        };
        
        room.match.resolveAttack(socket.id, attackData);
    });

    // no peer input, server only
   

    // Handle disconnect
    socket.on('disconnect', () => {
        if (client.room && roomList[client.room]) {
            const room = roomList[client.room];
            
            // End match if active
            if (room.match) {
                room.match.endMatch(null);
                room.match = null;
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

// Old game loop removed - Match class handles its own ticking
// Room list broadcast
setInterval(() => {
    broadcastRoomList();
}, 2000);



