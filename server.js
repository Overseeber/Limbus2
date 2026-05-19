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
        this.room = null; // stores room ID string
        this.state = 'MainMenu'; // MainMenu, CharacterSelect, InGame, PostGame
        this.ready = false;
    }
}

class Room {
    constructor(id)
    {
        this.id = id;
        this.clients = []; // stores socket IDs (strings)
        this.match = null;
        this.type = '1v1'; // 1v1, free-for-all, etc.
    }
}

function createRoom(id) {//makes new room
    if (roomList[id]) return roomList[id];//returns if room already exists
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

// Helper to notify all clients in a room of its state using Socket.IO rooms
function emitRoomState(roomId) {
    const room = roomList[roomId];
    if (!room) return;
    const state = getRoomState(room);
    io.to(roomId).emit('roomState', state);
}

// Get room list data with occupancy info for the lobby
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

// Broadcast room list to all connected clients
function broadcastRoomList() {
    io.sockets.emit('roomsList', getRoomsData());
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

function broadcastEvent(event, excludeSocketId = null, roomId = null) {
    // Broadcast an event to all clients in the specified room (or the sender's room)
    // using Socket.IO rooms for efficient delivery
    if (!roomId) {
        if (!excludeSocketId) return;
        const client = clientList[excludeSocketId];
        if (!client || !client.room) return;
        roomId = client.room;
    }
    const room = roomList[roomId];
    if (!room) return;

    if (excludeSocketId) {
        // Send to everyone in the room except the sender
        room.clients.forEach(cid => {
            if (cid === excludeSocketId) return;
            const s = io.sockets.sockets.get(cid);
            if (s) s.emit('event', event);
        });
    } else {
        io.to(roomId).emit('event', event);
    }
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

  function detectHit(attacker, defenders, attackData) {

    const hits = [];

    const attackHitbox = attackData.hitbox;

    const attackPos = attacker.fighter.pos.copy().add(
        getAttackOffset(attacker.fighter.attackdir)
    );

    // attack box edges
    const atkLeft = attackPos.x;
    const atkRight = attackPos.x + attackHitbox.width;
    const atkTop = attackPos.y;
    const atkBottom = attackPos.y + attackHitbox.height;

    for (const defender of defenders) {

        // don't hit self
        if (defender.id === attacker.id) continue;

        const defPos = defender.fighter.pos;
        const defHitbox = defender.fighter.hitbox;

        // defender edges
        const defLeft = defPos.x;
        const defRight = defPos.x + defHitbox.width;
        const defTop = defPos.y;
        const defBottom = defPos.y + defHitbox.height;

        // overlap test
        const overlap =
            atkRight >= defLeft &&
            atkLeft <= defRight &&
            atkBottom >= defTop &&
            atkTop <= defBottom;

        if (overlap) {
            hits.push(defender);
        }
    }

    return hits;
}

  function getdmgandknockback(fighter){
    //get characte specific damage buffs/debuffs here
  }

  function getonhit(attacker, defender, attackData) {
    //get unique on hit effects here for each character, type of attack as well
  }


  //if hit, do hit things
  function resolveHit(attacker, defender, attackData) {
    const damage = attacker.baseDamage
    getonhit(attacker, defender, attackData);
    getdmgandknockback(attacker);
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

function updategravity(fighter) {
    // Apply gravity to fighter's vertical velocity
    fighter.vel.y += GRAVITY * deltaTime;
}

function endBattle(match, winner) {
}

class Status {
    constructor(type, potency, count) {
        this.type = type;
        this.potency = potency;
        this.count = count;
    }
}

function getStatusMods(fighter) {
    const mods = {
        haste: 1.1,
        bind: 1.1,
        proc: 1.1,
        frag: 1.1
    };

    fighter.statuses.forEach(status => {
        if (status.type === 'haste') {
        //haste inc speed by 10% addiivelty
            mods.haste += 0.1 * status.potency; //mutliply by char speed and add this val to char speed
        } else if (status.type === 'bind') {
        //bind dec speed by 10% addiivelty
            mods.bind += 0.1 * status.potency; //mutliply by char speed and subtract this val from char speed
        } else if (status.type === 'proc') {
        //proc makes next attack do 10% more damage per stack
            mods.proc += 0.1 * status.potency; //mutliply by char damage and add this val to char damage for next attack, then reset proc mod to 1 after attack
        } else if (status.type === 'frag') {
        //frag makes you take 10% more damage per stack
            mods.frag += 0.1 * status.potency; //mutliply by char damage taken and add this val to char damage taken for next hit, then reset frag mod to 1 after hit
        }
    });

    return mods;


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

    // Register client in clientList first
    clientList[socket.id] = client;

    // Do NOT auto-assign to a room.
    // Client starts in the lobby and must manually create or join a room.
    // Default character is set when they join a room.
    client.fighter.class = 'JOHN'; // default, will be set properly on join

    console.log(socket.id + ' connected (no room assigned)');

    //for testing, log room list and client list
    console.log('Current Rooms:', Object.keys(roomList));
    console.log('Current Clients:', Object.keys(clientList));

    // Send current rooms data to the client so they can see available rooms
    socket.emit('roomsList', getRoomsData());
    

    // Create and join a room
    socket.on('createRoom', (roomId) => {
        if (!roomId) return;
        // Leave current room first
        if (client.room) {
            const oldRoom = roomList[client.room];
            if (oldRoom) {
                oldRoom.clients = oldRoom.clients.filter(id => id !== socket.id);
                socket.leave(client.room);
                // Clean up empty rooms (except room1 which is the default)
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
        // Leave current room first
        if (client.room) {
            const oldRoom = roomList[client.room];
            if (oldRoom) {
                oldRoom.clients = oldRoom.clients.filter(id => id !== socket.id);
                socket.leave(client.room);
                // Clean up empty rooms (except room1 which is the default)
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
        // Clean up empty rooms (except room1 which is the default)
        if (room.clients.length === 0 && room.id !== 'room1') {
            delete roomList[room.id];
        }
        client.room = null;
        emitRoomState(room.id);
        broadcastRoomList();
    });

    // Change character selection for this client in their room
    socket.on('changeCharacter', (characterKey) => {
        client.fighter.class = characterKey;
        // Unready the client when they change character
        client.ready = false;
        if (client.room) emitRoomState(client.room);
    });

    // Toggle ready state for this client
    socket.on('toggleReady', () => {
        client.ready = !client.ready;
        if (client.room) emitRoomState(client.room);
    });

    // Start the battle (sent by room host / first client when all ready)
    socket.on('startBattle', () => {
        const room = roomList[client.room];
        if (!room) return;
        const state = getRoomState(room);
        if (state.allReady) {
            io.to(client.room).emit('battleStart', {
                slots: state.slots
            });
            console.log('Battle started in room ' + client.room);
        }
    });

    // Broadcast inputs to room peers using Socket.IO rooms
    socket.on('input', (data) => {
        // If client is in a room, broadcast to other clients in room using Socket.IO
        if (client.room) {
            socket.to(client.room).emit('peerInput', { from: socket.id, data });
        }
    });

    //if room is in combat, process inputs and update game state accordingly, then broadcast updates to clients in room
    if (roomList[client.room] && roomList[client.room].match) {
        const otherFightersInRoom = roomList[client.room].match.fighters.filter(f => f.id !== client.fighter.id); //all other fighters
        // Process combat inputs and update game state
            // Validate and process inputData (e.g., move, attack, guard)
            // Update fighter state based on input
            // Broadcast resulting game state changes to all clients in the room
        socket.on('INPUT_MOVE', (direction,magnitude) => {// left right, and jump
            // Validate move input and update fighter position
            detectcollision(client.fighter, otherFightersInRoom); //check for collisions with other fighters and stage boundaries, and adjust position accordingly
            const result = validMove(client.fighter, { direction, magnitude });
            if (result.valid) {
                client.fighter.pos.set(result.position.x, result.position.y);
              //broadcast new position to other clients in room in interval loop, not immediately to avoid spamming updates
            }
        });

        socket.on('INPUT_DASH', (direction) => {
            // Validate dash input and update fighter position and state
            //check how dash works client side, then implement server side with same logic but also check for collisions and boundaries, and broadcast new position to other clients in room in interval loop, not immediately to avoid spamming updates
        });



         socket.on('INPUT_ATTACK', (sequence) => {//sequence canbe either withch basic attack in sequence or attack type (dash or slam)
            // Validate attack input and update fighter state
            const Hitplayers = detectHit(socket.client, otherFightersInRoom, attackData); //defender is everyone else in the room, attackData includes attack type, direction, range, etc.
            //if true, continue, if false, stop, set defender to those in attack range and direction, not all fighters in room
            

            if (!attackData.valid) return;
        for (const defenders of Hitplayers) {
            getStatusMods(socket.client.fighter); //get status mods for damage calculation
            getonhit(socket.client.fighter, defenders, attackData); //get unique on hit effects here for each character, type of attack as well 
            resolveHit(socket.client.fighter, defenders, attackData);
         }
           //check attacker bleed status
        });
          socket.on('INPUT_GUARD', (inputData) => {
            // Validate guard input and update fighter state
           
        });
    }


    // Handle disconnect
    socket.on('disconnect', () => {
        // Remove from any room
        if (client.room && roomList[client.room]) {
            const room = roomList[client.room];
            room.clients = room.clients.filter(id => id !== socket.id);
            socket.leave(client.room);
            // Clean up empty rooms (except room1 which is the default)
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
//pro game(paly) loop, runs every 50ms (20 ticks per second)
setInterval(() => {
    // Game loop logic here, runs every 50ms (20 ticks per second)
    // Process inputs, update game state, handle matches, etc.
    if (roomList[roomId] && roomList[roomId].match) {
        const match = roomList[roomId].match;
        // Process match logic, e.g. update fighter positions, check for hits, apply damage, etc.
        // Emit updated match state to clients in the room
    }
}, 50);
//match searching
setInterval(() => {
    // If client is searching for a room, update room list every 5 seconds
    if (clientList[socket.id].state == "MainMenu") {
        broadcastRoomList();
    }

}, 2000 );
