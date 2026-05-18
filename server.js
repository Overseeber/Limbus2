var express = require('express');
var app = express();
var server = app.listen(3000);
app.use(express.static('public'));

var socket = require('socket.io');
var io = socket(server);
var clientList = {};
var roomList = {};

// Minimal server-side Vector2 implementation for position/velocity math.
class Vector2 { //2 diemtional vector
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {//teleportst and stufdf
        this.x = x;
        this.y = y;
        return this;
    }

    copy() { //dubing
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
        this.state = 'MainMenu'; // MainMenu, CharacterSelect, InGame, PostGame
    }
}

class Room {
    constructor(id)
    {
        this.id = id;
        this.clients = [];
        this.match = null;
        this.type = '1v1'; // 1v1, free-for-all, etc.
    }
}

// Rooms registry (roomId -> Room)
const ROOMS = {};

function createRoom(id) {//makes new room
    if (ROOMS[id]) return ROOMS[id];//returns if room aready exists
    const r = new Room(id);
    ROOMS[id] = r;
    return r;
}

function getRoomState(room) {//checks room state
    const slots = (room.clients || []).map(cid => {
        const client = clientList[cid];
        return {
            clientId: cid,
            character: client && client.fighter ? client.fighter.class : null
        };
    });
    return { id: room.id, slots };
}

//get client side match with server side, then resolve any conflicts
class Fighter {
    constructor(name)
    {
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
        this.hitbox = { width: 50, height: 50 }; // Example hitbox size
        this.state= 'idle'; // idle, attacking, moving, staggered
        this.pos= new Vector2(0,0);
        this.vel = new Vector2(0,0);
        this.statuses = [];
        
    }

    takeDamage(amount,source)
    {
      this.hp = Math.max(0, this.hp - amount);
      console.log(`${this.class} took ${amount} damage from ${source.class}. Remaining HP: ${this.hp}`);

    }

    heal(amount,source)
    {
      this.hp += Math.min(this.maxHp, this.hp + amount);
      console.log(`${this.class} healed ${amount} HP from ${source.class}. Current HP: ${this.hp}`);
    }


    

}

//functions for stuff

function broadcastEvent(event, excludeClientId = null) {
    // Broadcast an event to all clients in the same room, excluding the sender if specified
    const roomId = clientList[excludeClientId] ? clientList[excludeClientId].room : null;
    if (!roomId) return;
    const room = ROOMS[roomId];
    if (!room) return;

    room.clients.forEach(cid => {
        if (cid === excludeClientId) return;
        const s = io.sockets.sockets.get(cid);
        if (s) s.emit('event', event);
    });
}

function validMove(fighter, moveRequest) {
    const { dx, dy, direction } = moveRequest;
  
     // Check speed limits
    if (Math.abs(dx) > fighter.maxSpeed * deltaTime) {
        return { valid: false, reason: 'SPEED_EXCEEDED' };
    }
  
     // Check boundaries
    if (fighter.x + dx < 0 || fighter.x + dx > ARENA_WIDTH) {
        return { valid: false, reason: 'BOUNDARY_EXCEEDED' };
  }
  
  return { valid: true, position: { x: fighter.x + dx, y: fighter.y + dy } };
    }

function detectcollision(fighterA, fighterB) {
    return !(
      fighterA.pos.x + fighterA.hitbox.width < fighterB.pos.x ||    
        fighterA.pos.x > fighterB.pos.x + fighterB.hitbox.width ||
        fighterA.pos.y + fighterA.hitbox.height < fighterB.pos.y ||
        fighterA.pos.y > fighterB.pos.y + fighterB.hitbox.height
    );
    //do collision stuff here
  }

  function detecthit(){
    //check if hitbox of attack overlaps with opponent hitbox, if so, apply damage and knockback
  }

  function applyKnockback(fighter, knockbackAmount, direction){
    //move fighter in direction of knockback by knockbackAmount, while checking for collisions and boundaries
  }

  function applyStatusEffect(fighter, statusType, potency, count){
    //add status effect to fighter's statuses array, and apply any immediate effects (e.g. damage over time)
  }

  class Cooldownmanager {
    constructor() {
      this.cooldowns = {};
    }
}

function updateStagger(fighter) { // run every time is hit, only run constantly once fighter is staggered
     if (fighter.stagger >= fighter.staggerThreshold) {
    if (!fighter.isStaggered) {
      fighter.isStaggered = true;
      fighter.staggerTimer = fighter.staggerDuration;
      
      // Emit stagger event for clients
      broadcastEvent({
        type: 'STAGGER_START',
        fighterId: fighter.id,
        duration: fighter.staggerDuration
      });
    }
  }
  
  // Stagger recovery
  if (fighter.isStaggered) {
    fighter.staggerTimer -= deltaTime;
    if (fighter.staggerTimer <= 0) {
      fighter.isStaggered = false;
      broadcastEvent({
        type: 'STAGGER_END',
        fighterId: fighter.id
      });
    }
  }
}

function processDeath(fighter) { if (fighter.hp <= 0 && !fighter.isDefeated) {
    fighter.isDefeated = true;
    fighter.defeatedAt = getCurrentTick();
    fighter.vel.x = 0;
    fighter.vel.y = 0;
    
    // Emit death event
    broadcastEvent({
      type: 'FIGHTER_DEFEATED',
      fighterId: fighter.id,
      defeatedBy: fighter.lastAttackedBy || null
    });
    
    // Check for battle end (only 1 fighter remaining)
    const activeFighters = match.fighters.filter(f => !f.isDefeated);
    if (activeFighters.length <= 1) {
      endBattle(match, activeFighters[0]);
    }
  }
}

class Status {
    constructor(type, potency, count) {
        this.type = type;
        this.potency = potency;
        this.count = count;
    }
}

const EVENT_TYPES = {
  // Input Events (from client → server)
  INPUT_MOVE: 'INPUT_MOVE',           // { direction, magnitude }
  INPUT_ATTACK: 'INPUT_ATTACK',       // { sequence }
  INPUT_GUARD: 'INPUT_GUARD',         // { pressed }
  INPUT_DASH: 'INPUT_DASH',           // { direction }
  INPUT_ABILITY: 'INPUT_ABILITY',     // { abilityId }
  
  // Combat Events (server → all)
  HIT: 'HIT',                         // { attacker, target, damage, knockback }
  BLOCK: 'BLOCK',                     // { defender, attacker, damage_reduced }
  PARRY: 'PARRY',                     // { defender, attacker }
  COUNTER: 'COUNTER',                 // { defender, attacker, damage }
  
  // Status Events
  STATUS_APPLY: 'STATUS_APPLY',       // { target, status, duration, potency }
  STATUS_TICK: 'STATUS_TICK',         // { target, status, damage }
  STATUS_REMOVE: 'STATUS_REMOVE',     // { target, status }
  
  // Movement Events
  MOVE: 'MOVE',                       // { fighter, position, velocity }
  DASH: 'DASH',                       // { fighter, direction, duration }
  
  // Stagger Events
  STAGGER_START: 'STAGGER_START',     // { fighter, duration }
  STAGGER_END: 'STAGGER_END',         // { fighter }
  
  // Ability Events
  ABILITY_START: 'ABILITY_START',     // { fighter, ability, startup }
  ABILITY_HIT: 'ABILITY_HIT',         // { fighter, target, damage }
  ABILITY_END: 'ABILITY_END',         // { fighter, ability }
  
  // Ultimate Events
  ULTIMATE_START: 'ULTIMATE_START',   // { fighter, duration }
  ULTIMATE_HIT: 'ULTIMATE_HIT',       // { fighter, targets, damage }
  ULTIMATE_END: 'ULTIMATE_END',       // { fighter }
  
  // Game Events
  FIGHTER_DEFEATED: 'FIGHTER_DEFEATED', // { fighter, defeatedBy }
  MATCH_END: 'MATCH_END',             // { winner, loser }
  

};



io.sockets.on('connection', (socket) => {
  
    console.log(socket.id + ' ' + 'is connected');
    //every client gets a fighter assigned to them, and they can control that fighter with inputs that are sent to the server, which then processes the inputs and updates the game state accordingly, and sends updates back to all clients to keep them in sync

    const client = new Client(socket.id);
    // blank state fighter; class is null until client selects
    const fighter = new Fighter({ class: null, hp: null, maxHp: null, speed: null, jumpHeight: null, baseDamage: null, staggerThreshold: null, staggerLength: null, weapon: 'Sword', knockbackMultiplier: 1 });
    client.fighter = fighter;
    client.room = null; // not in a room yet
//if no rooms in room list, create new room and add client to it, otherwise add client to existing room with less than 2 clients
    if (Object.keys(roomList).length === 0) {
        const roomId = 'room1';//intitiate first room
        const room = new Room(roomId);
        room.clients.push(client);//add client to room
        client.room = room;//assign room to client
        roomList[roomId] = room;//add room to room list
        socket.emit('joinedRoom', roomId);//notify client of room join
    } else {
        let addedToRoom = false;//add client to existing room
        for (const roomId in roomList) {
            const room = roomList[roomId];
            if (room.clients.length < 2) {
                room.clients.push(client);
                client.room = room;
                socket.emit('joinedRoom', room.id);
                addedToRoom = true;
                break;
            }
        }
        if (!addedToRoom) {
            const newRoomId = 'room' + (Object.keys(roomList).length + 1);
            const newRoom = new Room(newRoomId);
            newRoom.clients.push(client);
            client.room = newRoom;
            roomList[newRoomId] = newRoom;
        }
    }
    //for testing, log room list and client list
    console.log('Current Rooms:', Object.keys(roomList));
    console.log('Current Clients:', Object.keys(clientList));
//order of operations here is: client connects -> server creates client object and fighter object -> client sends inputs to server -> server processes inputs and updates fighter state -> server broadcasts updated state to all clients

    // register client
    clientList[socket.id] = client;

    // Send current rooms list to the client
    socket.emit('roomsList', Object.keys(ROOMS));

    // Helper to notify all clients in a room of its state
    function emitRoomState(roomId) {
        const room = ROOMS[roomId];
        if (!room) return;
        const state = getRoomState(room);
        (room.clients || []).forEach(cid => {
            const s = io.sockets.sockets.get(cid);
            if (s) s.emit('roomState', state);
        });
    }

    // Create and join a room
    socket.on('createRoom', (roomId) => {
        if (!roomId) return;
        const room = createRoom(roomId);
        if (!room.clients.includes(socket.id)) {
            room.clients.push(socket.id);
            client.room = room.id;
        }
        socket.emit('joinedRoom', room.id);
        emitRoomState(room.id);
    });

    // Join existing room
    socket.on('joinRoom', (roomId) => {
        const room = ROOMS[roomId];
        if (!room) {
            socket.emit('error', { message: 'ROOM_NOT_FOUND' });
            return;
        }
        if (!room.clients.includes(socket.id)) {
            room.clients.push(socket.id);
            client.room = room.id;
        }
        socket.emit('joinedRoom', room.id);
        emitRoomState(room.id);
    });

    // Leave current room
    socket.on('leaveRoom', () => {
        if (!client.room) return;
        const room = ROOMS[client.room];
        if (!room) return;
        room.clients = room.clients.filter(id => id !== socket.id);
        client.room = null;
        emitRoomState(room.id);
    });

    // Change character selection for this client in their room
    socket.on('changeCharacter', (characterKey) => {
        client.fighter.class = characterKey;
        // Optionally, populate other fighter stats server-side from a CHARACTERS list if available
        if (client.room) emitRoomState(client.room);
    });

    // Broadcast inputs to room peers
    socket.on('input', (data) => {
        // If client is in a room, broadcast to other clients in room
        if (client.room) {
            const room = ROOMS[client.room];
            if (room) {
                room.clients.forEach(cid => {
                    if (cid === socket.id) return;
                    const s = io.sockets.sockets.get(cid);
                    if (s) s.emit('peerInput', { from: socket.id, data });
                });
            }
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        // Remove from any room
        if (client.room && ROOMS[client.room]) {
            const room = ROOMS[client.room];
            room.clients = room.clients.filter(id => id !== socket.id);
            emitRoomState(room.id);
        }
        delete clientList[socket.id];
        console.log('Client has disconnected', socket.id);
    });


 socket.on("changeState", (newState) => {

    players[socket.id].state = newState;

    console.log(socket.id + " -> " + newState);

    });
    socket.on('input', (data) => {
        console.log('Received input from client', socket.id, data);
        socket.broadcastEvent(data, socket.id); // Broadcast the input event to all other clients (you may want to include the sender's ID in the event data)
        // Process input and update fighter state
        // For example, if data is { type: 'move', direction: 'left', magnitude: 1 }, you would update fighter's position accordingly
    });


  socket.on('disconnect', () => {
      
        delete clientList[socket.id];
        console.log(clientList.hasOwnProperty(socket.id));
        console.log('Client has disconnected')
        
    });
    

});



setInterval(() => {

    
}, 50 );

