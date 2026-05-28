# CS4U Interview Questions

## 1. Walk through OOP elements

This project uses object-oriented design primarily inside the client game code and the server match logic.

### Key objects

- `Fighter` (`public/fighter-modular.js`)
  - Represents a single combatant in the game.
  - Encapsulates state, movement, attack logic, AI behavior, animation state, and collision handling.
  - Methods include `update(dt, opponents)`, `applyMovement(dt, opponent)`, `updateAIControls(opponent)`, `processKeyPressed(key)`, and `requestGuard(opponent)`.

- `Match` (`server/logic/match.js`)
  - Represents a server-authoritative match session.
  - Owns player game state, tick loop, input processing, physics, attack resolution, AI simulation, and snapshot broadcasting.
  - Methods include `initialize(playerConfigs)`, `start()`, `tick()`, `handleInput(playerId, input)`, `broadcastSnapshot()`, and `endMatch(winnerId)`.

- `Client` and `Room` (`server.js`)
  - `Client` stores connection metadata, selected character, room membership, and ready state.
  - `Room` stores active clients, room ID, current match instance, and room type.

- `Network` (`public/client-network.js`)
  - A client-side network abstraction that handles Socket.IO connection management and local fallback simulation.
  - Provides methods like `sendInput(input)`, `requestAbility(abilityId, targetId)`, `createRoom(roomId)`, and `startCpuBattle(config)`.

### Data structures used

- Arrays
  - `players` in `public/sketch.js` stores local selection slots.
  - `room.clients` in `server.js` stores connected socket IDs.
  - `window.allFighters` stores active fighter objects during battle.

- Objects / dictionaries
  - `clientList` maps socket IDs to `Client` instances.
  - `roomList` maps room IDs to `Room` instances.
  - `this.players` in `Match` maps player/client IDs to authoritative player state objects.
  - `player.input` / `player.prevInput` store latest and previous input states.

- Configuration objects
  - Character roster data is stored globally in `CHARACTERS`.
  - Button definitions in `public/sketch.js` use simple objects with callbacks.

## 2. Explain how clients are managed (rooms, games, etc)

### Room management

- Clients connect to the Node/Express server with Socket.IO.
- Each connection becomes a `Client` object stored in `clientList[socket.id]`.
- Rooms are created with `createRoom(roomId)` and stored in `roomList[roomId]`.
- Room membership is tracked in `room.clients` and the client object is updated with `client.room`.
- The server emits `roomState` to all clients in a room when membership or ready status changes.

### Game flow

- In multiplayer mode, two clients join the same room.
- Each client selects a character and toggles ready.
- When both slots are ready, a `Match` instance is created and started for the room.
- The server runs the authoritative simulation and emits `snapshot` messages to clients.
- Clients render the battle using incoming server state and send input events back.

### CPU / local fallback mode

- CPU mode can run locally when the client has no server connection.
- When connected, CPU mode can also be requested as a server match using `startCpuBattle(config)`.
- Locally, `initCPUBattle()` creates two `Fighter` objects and updates them directly in the client loop.
- Server-authoritative CPU battles run in a special hidden room and still use the same `Match` class.

## 3. Explain data allocation

### Data stored on the Client

- UI state and scene state:
  - `battleState`, menu selection state, `cpuOpponentCharacter`, `cpuOpponentAIEnabled`.
- Local input state:
  - `keyState`, `inputHoldTimers`, sticky edge detection state.
- Local fighter view state:
  - `window.allFighters`, `player`, `enemy`, and their visual/interpolation targets.
- Local simulation fallback state:
  - When disconnected, clients run fighters locally using `Fighter.update()`.

### Data stored on the Server

- Authoritative match state:
  - `Match.players` stores each fighter’s game state, position, velocity, health, status, and attack state.
- Client connection state:
  - `Client` objects store socket IDs, selected character, room, and ready status.
- Room state:
  - `Room` objects store room membership and whether a match is currently active.
- Gameplay rules and server-side AI decisions.

### Why these decisions?

- The server stores authoritative gameplay state because synchronized combat requires a single source of truth.
- The server also handles input validation, hit detection, and win condition determination to prevent desynchronization.
- The client stores UI and rendering state to keep the interface responsive and to permit smooth animation/interpolation.
- Local fighter simulation is stored client-side only for fallback/offline behavior.
- This split balances responsiveness with correctness: client rendering is immediate, while server logic remains authoritative.

## 4. Walk through data events (Socket.IO)

### Important Socket.IO events

- `roomsList`
  - Sent by the server to all connected clients with a list of available multiplayer rooms.

- `joinedRoom`
  - Sent to the client after joining a room.

- `roomState`
  - Sent by the server to all clients in a room whenever the join list or ready statuses change.
  - Contains slot assignments, selected characters, and ready flags.

- `battleStart`
  - Sent by the server once a match begins.
  - Triggers client-side battle initialization (`initRoomBattle`).

- `input`
  - Sent from the client to the server containing the player’s current input state.
  - Includes sticky edge flags like `attackPressed`, `attackReleased`, `dash`, `slam`, and `evade`.

- `ability`
  - Sent when the client requests a character ability.
  - The server validates and executes the ability using the authoritative `Match` logic.

- `snapshot`
  - Sent from the server to all clients at 20 ticks per second.
  - Contains serialized state for each player: position, velocity, health, action state, input state, attack state, and more.
  - The client applies it via `applySnapshot()` and interpolates to smooth motion.

- `event`
  - General broadcast for match events like hits, stagger starts/ends, and match end information.

### Event flow

1. Client sends `input` continuously during battle.
2. Server receives input and stores it in the authoritative `Match` state.
3. The server `tick()` loop processes input, updates physics, resolves attacks, and checks win conditions.
4. Server broadcasts `snapshot` updates to players.
5. Clients apply snapshots and render fighter state with interpolation.
6. For CPU matches, the server may also simulate AI inputs before processing.

## 5. Lessons & Resources used

### Lessons learned from this codebase

- Server-authoritative architecture is crucial for fighting games where state consistency matters.
- Input edge detection must be held long enough to survive low-frequency ticks.
- Local interpolation and visual-only state should mirror authoritative state without overriding it.
- AI and passive opponent modes should be treated as a distinct source of input, not a client-side visual effect.
- Separating `Room`, `Client`, and `Match` logic improves clarity between lobby management and gameplay.

### Resources and documentation

- Socket.IO documentation for event handling and room management.
- Node.js/Express documentation for server setup and static file delivery.
- General game architecture patterns for client-server authoritative simulation.
- p5.js documentation for rendering and input handling.
- Existing code comments in `server/logic/match.js` and `public/fighter-modular.js` which describe restored gameplay behavior and input handling.
