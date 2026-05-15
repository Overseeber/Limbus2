const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Serve static files from /public (preferred) and fallback to project root
const path = require('path');
const publicDir = path.join(__dirname, 'public');
if (require('fs').existsSync(publicDir)) {
  app.use(express.static(publicDir));
  console.log('Serving static from /public');
} else {
  app.use(express.static(__dirname));
  console.log('Serving static from project root');
}

const PORT = process.env.PORT || 3000;

// Simple authoritative world state
const entities = new Map(); // key = entityId (socket.id or playerId), value = { id, hp, maxHp, statuses: [] }
const eventQueue = [];

function findEntity(id) {
  if (!id) return null;
  // try direct id
  if (entities.has(id)) return entities.get(id);
  // try numeric playerId match
  for (const e of entities.values()) {
    if (e.playerId && String(e.playerId) === String(id)) return e;
    if (e.characterKey && String(e.characterKey) === String(id)) return e;
  }
  return null;
}

function enqueueEvent(ev) {
  eventQueue.push(ev);
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  // create lightweight entity record for this connection
  const ent = { id: socket.id, hp: 1000, maxHp: 1000, statuses: [] };
  entities.set(socket.id, ent);

  socket.emit('welcome', { id: socket.id });

  socket.on('register', (data) => {
    // optional: clients can register metadata (playerId, characterKey, maxHp)
    const e = entities.get(socket.id);
    if (!e) return;
    if (data.playerId) e.playerId = data.playerId;
    if (data.characterKey) e.characterKey = data.characterKey;
    if (data.maxHp) { e.maxHp = data.maxHp; e.hp = data.maxHp; }
    console.log('registered entity', socket.id, data);
  });

  socket.on('input', (input) => {
    // store input for processing (could be used for movement validation)
    enqueueEvent({ type: 'INPUT', socket: socket.id, data: input, time: Date.now() });
  });

  socket.on('event', (ev) => {
    // Expect structured events from client: REQUEST_HIT, STATUS_APPLY, etc.
    ev._from = socket.id;
    enqueueEvent(ev);
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
    entities.delete(socket.id);
  });
});

// Authoritative handlers
function applyDamage(targetId, amount, attackerId, meta = {}) {
  const target = findEntity(targetId);
  if (!target) return null;
  const dmg = Math.max(0, Number(amount) || 0);
  target.hp = Math.max(0, (target.hp || target.maxHp || 0) - dmg);
  // emit event to clients for visuals
  io.emit('event', { type: 'HIT', attackerId, targetId: target.id || target.playerId, damage: dmg, meta });
  return { targetId: target.id, hp: target.hp };
}

function applyStatus(targetId, status) {
  const target = findEntity(targetId);
  if (!target) return null;
  target.statuses = target.statuses || [];
  target.statuses.push(status);
  io.emit('event', { type: 'STATUS_APPLIED', targetId: target.id || target.playerId, status });
  return status;
}

// Simulation loop: fixed tick
const TICK_RATE = 60; // ticks per second
setInterval(() => {
  const tickStart = Date.now();
  // 1) Process queued events
  while (eventQueue.length > 0) {
    const ev = eventQueue.shift();
    if (!ev || !ev.type) continue;
    switch (ev.type) {
      case 'REQUEST_HIT':
      case 'HIT': {
        // ev: { attackerId, targetId, damage }
        const attackerId = ev.attackerId || ev.attacker || ev._from;
        const targetId = ev.targetId || ev.target;
        applyDamage(targetId, ev.damage || 0, attackerId, ev.meta || {});
        break;
      }
      case 'STATUS_APPLY':
      case 'APPLY_STATUS': {
        const targetId = ev.targetId || ev.target;
        applyStatus(targetId, ev.status || ev.data || {});
        break;
      }
      case 'INPUT': {
        // if needed, could validate input here
        // optional broadcast for debugging
        // io.emit('inputDebug', ev);
        break;
      }
      default:
        console.log('Unhandled event type', ev.type, ev);
    }
  }

  // 2) Periodic authoritative snapshot broadcast (20Hz recommended)
  // We'll send a lighter update at ~20Hz using time sampling
}, 1000 / TICK_RATE);

// Broadcast lighter state snapshots on separate interval
setInterval(() => {
  const snapshot = [];
  for (const e of entities.values()) {
    snapshot.push({ id: e.id, playerId: e.playerId || null, hp: e.hp, maxHp: e.maxHp, statuses: e.statuses });
  }
  io.emit('stateUpdate', { time: Date.now(), entities: snapshot });
}, 1000 / 20);

// Simple user list update
setInterval(() => {
  io.emit('updatelist', { time: new Date().toTimeString(), users: Array.from(entities.keys()) });
}, 1000);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
