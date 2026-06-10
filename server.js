var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var server = app.listen(port);
app.use(express.static('public')); //ai assisted port stuff
app.use('/shared', express.static('shared'));

var socket = require('socket.io');
var io = socket(server);
var clientList = {};
var roomList = {};

// Import server-authoritative gameplay systems ai assisted port stuff
const GameplayEngine = require('./server/logic/gameplayEngine');
const characterLogic = require('./server/logic/characterLogic');
const abilityHandler = require('./server/logic/abilityHandler');
const Match = require('./server/logic/match');

// Create authoritative gameplay engine for all matches
//const gameplayEngine = new GameplayEngine();

console.log("Server is Running, git pull remindeer");
class Client {
    constructor(id)
    {
        this.id = id;
        this.character = 'VALENCINA'; // Default character
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
    return Object.keys(roomList)
        .map(roomId => roomList[roomId])
        .filter(room => room.type !== 'cpu')
        .map(room => ({
            id: room.id,
            players: room.clients.length,
            maxPlayers: 2
        }));
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

function resetRoomReadyState(room) {
    if (!room || !room.clients) return;
    room.clients.forEach(clientId => {
        const client = clientList[clientId];
        if (client) client.ready = false;
    });
}

function handleForfeit(socket, client, room) {
    if (!room || !room.match) return;
    const forfeiterId = socket.id;
    const winnerId = room.clients.find(id => id !== forfeiterId) || null;

    room.match.endMatch(winnerId, {
        returnToLobby: true,
        reason: 'forfeit',
        forfeiterId: forfeiterId
    });
    room.match = null;
    resetRoomReadyState(room);
    emitRoomState(room.id);
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
    console.log('Client connected:', socket.id);
  
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
            socket.emit('error', { message: 'noroomie' });
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
   
    socket.on('startBattle', () => {
        const room = roomList[client.room];
        if (!room) return;
        const state = getRoomState(room);
        if (state.allReady) {
            // create the game for that sepcific room
            room.match = new Match(room, io);
            
            // Initialize match with players from room
            const playerConfigs = room.clients.map((cid, index) => {
                const c = clientList[cid];
                return {
                    clientId: cid,
                    characterKey: c.character || 'VALENCINA',
                    index: index
                };
            });
            
            room.match.initialize(playerConfigs);
            room.match.start();
            
            io.to(client.room).emit('battleStart', {
                slots: state.slots
            });
        }
    });
//cpu battles are ai assisted for testing purposes
    socket.on('startCpuBattle', (data) => {
        const roomId = `cpu-${socket.id}`;
        let room = roomList[roomId];
        if (!room) {
            room = createRoom(roomId);
            room.type = 'cpu';
        }

        if (client.room && client.room !== roomId) {
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

        client.ready = true;

        const playerConfigs = [
            {
                clientId: socket.id,
                characterKey: (data && data.characterKey) || client.character || 'VALENCINA',
                index: 0
            },
            {
                clientId: `CPU_${socket.id}`,
                characterKey: (data && data.cpuCharacterKey) || 'CALLISTO',
                index: 1,
                ai: !!(data && data.cpuAIEnabled)
            }
        ];

        room.match = new Match(room, io);
        room.match.initialize(playerConfigs);
        room.match.start();

        io.to(room.id).emit('battleStart', {
            slots: [
                { clientId: playerConfigs[0].clientId, character: playerConfigs[0].characterKey, ready: true },
                { clientId: playerConfigs[1].clientId, character: playerConfigs[1].characterKey, ready: true }
            ]
        });

        console.log('CPU battle started in room ' + room.id + ' for player ' + socket.id);
    });

    socket.on('input', (input) => {
        const room = roomList[client.room];
        if (!room || !room.match) return;

        room.match.handleInput(socket.id, input);
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

        const attackType = data.heavy ? 'heavy' : 'light';
        const attackDef = attacker.config.attacks[attackType];
        if (!attackDef) return;
        
        const attackData = {
            range: attackDef.range,
            baseDamage: attackDef.damage,
            knockback: attackDef.knockback,
            staggerDamage: attackDef.staggerDamage || (attacker.config.baseDamage * 0.5),
            statusEffects: attackDef.statusEffects || [],
            chargeAttack: !!data.heavy
        };
        
        room.match.resolveAttack(socket.id, attackData);
    });

    socket.on('event', (event) => {
        if (!event || !event.type) return;
        if (event.type === 'FORFEIT_MATCH') {
            if (!client.room) return;
            const room = roomList[client.room];
            if (!room || !room.match) return;
            handleForfeit(socket, client, room);
        }
    });

    // no peer input, server only
   

    // Handle disconnect
    socket.on('disconnect', () => {
        if (client.room && roomList[client.room]) {
            const room = roomList[client.room];
            
            const remainingClientIds = room.clients.filter(id => id !== socket.id);
            
            if (room.match) {
                const winnerId = remainingClientIds.length > 0 ? remainingClientIds[0] : null;
                room.match.endMatch(winnerId, {
                    returnToLobby: true,
                    reason: 'disconnect',
                    forfeiterId: socket.id
                });
                room.match = null;
                resetRoomReadyState(room);
            }
            
            room.clients = remainingClientIds;
            socket.leave(client.room);
            if (room.clients.length === 0 && room.id !== 'room1') {
                delete roomList[room.id];
            }
            if (room.clients.length > 0) {
                emitRoomState(room.id);
            }
        }
        delete clientList[socket.id];
    });

    socket.on("changeState", (newState) => {
        client.state = newState;
    });
});




