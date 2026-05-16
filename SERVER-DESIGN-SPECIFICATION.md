# Server-Side Design Specification
## Complete Multiplayer Fighting Game Architecture

**Status:** Design Document (NOT YET IMPLEMENTED)  
**Target Tick Rate:** 60 TPS (fixed tick simulation)  
**Architecture Model:** Server-Authoritative, Event-Driven  

---

## Table of Contents
1. [Server Architecture Overview](#server-architecture-overview)
2. [Server Responsibilities](#server-responsibilities)
3. [Event System (Core Design)](#event-system-core-design)
4. [No Direct Mutation Rule](#no-direct-mutation-rule)
5. [Status System Design](#status-system-design)
6. [Server Game Loop (Strict Order)](#server-game-loop-strict-order)
7. [Shared Data Design](#shared-data-design)
8. [Determinism Rules](#determinism-rules)
9. [Optional Future Systems](#optional-future-systems)
10. [Implementation Checklist](#implementation-checklist)

---

## Server Architecture Overview

### Tech Stack
```
Node.js 11.x+
├── Express 5.x (HTTP server, static file serving)
├── Socket.IO 4.x (WebSocket real-time communication)
└── File-based world state (entities, events, world)
```

### Server Conceptual Structure

```
┌─────────────────────────────────────────────────────┐
│                  SERVER (Node.js)                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Socket.IO Connection Manager                │  │
│  │  - Accept client connections                 │  │
│  │  - Register/unregister fighters              │  │
│  │  - Broadcast state updates                   │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  World State Manager                         │  │
│  │  - fighters Map (entityId → Fighter)         │  │
│  │  - activeMatches Map (matchId → Battle)      │  │
│  │  - timers, projectiles, AoE zones            │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  Main Simulation Loop (60 TPS)               │  │
│  │  1. Collect Inputs                           │  │
│  │  2. Generate Events                          │  │
│  │  3. Resolve Events (centralized)             │  │
│  │  4. Update World State                       │  │
│  │  5. Broadcast Snapshots (20 Hz)              │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  Event Queue & Handlers                      │  │
│  │  - InputQueue → Validated Intents            │  │
│  │  - EventQueue → Resolved Actions             │  │
│  │  - Event Handlers (HIT, MOVE, STATUS, etc)   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Server Responsibilities by Category

---

## Server Responsibilities

### A. Gameplay Authority

The server is the **single source of truth** for all game state.

#### 1. HP Management
```javascript
// Server tracks authoritative HP
class ServerFighter {
  constructor() {
    this.hp = this.maxHp;           // Authoritative HP
    this.hpPredicted = this.maxHp;  // For client feedback
  }
  
  takeDamage(amount, source) {
    // Only server can reduce HP
    this.hp = Math.max(0, this.hp - amount);
    return { hp: this.hp, isDead: this.hp <= 0 };
  }
  
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp;
  }
}
```

**Clients cannot:**
- ~~Modify HP directly~~
- ~~Apply damage to other fighters~~
- ~~Heal without server permission~~

#### 2. Damage Calculation
```javascript
calculateDamage(attacker, defender, move) {
  let baseDamage = move.baseDamage || 30;
  
  // Attacker multipliers
  const attackerMult = (1 + (attacker.combo * 0.02));
  
  // Defender multipliers
  const defenderMult = defender.hasStatus('Protection') ? 0.9 : 1.0;
  
  // Stagger bonus
  const staggerBonus = defender.stagger > defender.staggerThreshold ? 1.5 : 1.0;
  
  const finalDamage = Math.floor(baseDamage * attackerMult * defenderMult * staggerBonus);
  return Math.max(1, finalDamage);
}
```

#### 3. Movement Validation
```javascript
// Server validates all movement
validateMove(fighter, moveRequest) {
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
```

#### 4. Collision Detection
```javascript
// Server detects all collisions
function detectCollisions(fighters) {
  const collisions = [];
  
  for (let i = 0; i < fighters.length; i++) {
    for (let j = i + 1; j < fighters.length; j++) {
      const f1 = fighters[i];
      const f2 = fighters[j];
      
      const dist = distance(f1.pos, f2.pos);
      if (dist < (f1.radius + f2.radius)) {
        collisions.push({
          fighter1: f1.id,
          fighter2: f2.id,
          distance: dist,
          normal: normalize(subtract(f2.pos, f1.pos))
        });
      }
    }
  }
  
  return collisions;
}
```

#### 5. Hit Detection
```javascript
// Server detects if an attack lands
detectHits(attacker, defendersInRange) {
  const hits = [];
  
  defendersInRange.forEach(defender => {
    // Check if defender is in attack hitbox
    if (isInHitbox(defender.pos, attacker.attackHitbox)) {
      // Check if defender is guarding
      const blocked = defender.isGuarding && 
                      isFacingTowards(defender, attacker);
      
      hits.push({
        target: defender.id,
        blocked: blocked,
        parryable: !blocked && defender.parryWindow > 0
      });
    }
  });
  
  return hits;
}
```

#### 6. Knockback Resolution
```javascript
// Server applies knockback
applyKnockback(target, knockbackAmount, direction) {
  // Knockback has mass (affected by status effects)
  let finalKnockback = knockbackAmount;
  
  if (target.hasStatus('Heavy')) {
    finalKnockback *= 0.7;
  }
  if (target.hasStatus('Fragile')) {
    finalKnockback *= 1.3;
  }
  
  // Apply velocity
  target.vel.x = direction.x * finalKnockback;
  target.vel.y = direction.y * knockbackAmount * 0.5;
}
```

#### 7. Status Effects (Server Authority)
```javascript
// Server manages all status effects
applyStatus(fighter, statusType, duration, potency) {
  const status = {
    type: statusType,
    duration: duration,        // in ticks
    potency: potency,
    appliedAt: getCurrentTick(),
    stackCount: 1
  };
  
  // Check for existing status
  const existing = fighter.statuses.find(s => s.type === statusType);
  if (existing) {
    existing.stackCount += status.stackCount;
    existing.potency += potency;
  } else {
    fighter.statuses.push(status);
  }
  
  return status;
}
```

#### 8. Cooldowns & Attack Intervals
```javascript
// Server tracks cooldowns
class CooldownManager {
  constructor(fighter) {
    this.fighter = fighter;
    this.cooldowns = new Map();
  }
  
  canUseAbility(abilityId) {
    const remaining = this.getRemainingCooldown(abilityId);
    return remaining <= 0;
  }
  
  startCooldown(abilityId, duration) {
    this.cooldowns.set(abilityId, {
      endTick: getCurrentTick() + duration,
      duration: duration
    });
  }
  
  getRemainingCooldown(abilityId) {
    const cd = this.cooldowns.get(abilityId);
    if (!cd) return 0;
    return Math.max(0, cd.endTick - getCurrentTick());
  }
  
  update() {
    // Remove expired cooldowns
    for (const [id, cd] of this.cooldowns) {
      if (cd.endTick <= getCurrentTick()) {
        this.cooldowns.delete(id);
      }
    }
  }
}
```

#### 9. Stagger Logic
```javascript
// Server manages stagger mechanic
updateStagger(fighter, deltaTime) {
  // Stagger decay (recovery)
  if (fighter.stagger > 0) {
    fighter.stagger -= fighter.staggerRecoveryRate * deltaTime;
    fighter.stagger = Math.max(0, fighter.stagger);
  }
  
  // Check stagger threshold
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
```

#### 10. Death Logic
```javascript
// Server handles fighter defeat
processDeath(fighter) {
  if (fighter.hp <= 0 && !fighter.isDefeated) {
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
```

### B. AI Execution (Server-Side)

The server runs **all AI decisions** authoritatively.

#### AI Architecture
```javascript
class ServerAI {
  constructor(fighter, opponents) {
    this.fighter = fighter;
    this.opponents = opponents;
    this.stateMachine = new AIStateMachine(fighter);
  }
  
  update(deltaTime) {
    // 1. Perception
    const visibleEnemies = this.perceive();
    const threat = this.assessThreat(visibleEnemies);
    
    // 2. Decision
    const decision = this.decide(threat);
    
    // 3. Action
    this.executeDecision(decision);
  }
  
  perceive() {
    // Find visible enemies
    return this.opponents.filter(opp => 
      distance(this.fighter.pos, opp.pos) < this.fighter.visionRange &&
      !opp.isDefeated
    );
  }
  
  assessThreat(enemies) {
    if (enemies.length === 0) return { level: 'IDLE', target: null };
    
    // Calculate threat level based on proximity, HP, stagger
    const closest = enemies.reduce((prev, curr) =>
      distance(this.fighter.pos, prev.pos) < distance(this.fighter.pos, curr.pos) ? prev : curr
    );
    
    const dist = distance(this.fighter.pos, closest.pos);
    const hpRatio = this.fighter.hp / this.fighter.maxHp;
    
    let level = 'IDLE';
    if (dist < 100) level = 'DANGER';
    else if (dist < 300) level = 'THREAT';
    else level = 'PATROL';
    
    if (hpRatio < 0.3) level = 'RETREAT';
    
    return { level, target: closest };
  }
  
  decide(threat) {
    switch (threat.level) {
      case 'DANGER':
        return { action: 'ATTACK', target: threat.target };
      case 'THREAT':
        return { action: 'APPROACH', target: threat.target };
      case 'PATROL':
        return { action: 'PATROL' };
      case 'RETREAT':
        return { action: 'GUARD' };
      case 'IDLE':
        return { action: 'IDLE' };
    }
  }
  
  executeDecision(decision) {
    // Generate input event
    switch (decision.action) {
      case 'ATTACK':
        this.queueAttack(decision.target);
        break;
      case 'APPROACH':
        this.queueMovement(decision.target);
        break;
      case 'GUARD':
        this.queueGuard();
        break;
      case 'PATROL':
        this.queuePatrol();
        break;
    }
  }
}
```

#### Behavior Trees (Optional Advanced Pattern)
```javascript
// Example behavior tree for complex AI
const aiBehavior = {
  selector: [
    // Priority 1: Heal if low HP
    {
      condition: () => fighter.hp < fighter.maxHp * 0.2,
      action: 'USE_HEAL_ABILITY'
    },
    // Priority 2: Attack if enemy visible
    {
      condition: () => hasVisibleEnemy(),
      sequence: [
        { action: 'FACE_ENEMY' },
        { action: 'ATTACK' }
      ]
    },
    // Priority 3: Patrol
    {
      action: 'PATROL'
    }
  ]
};
```

### C. Projectile Simulation (Server-Only)

If the game uses projectiles, they are **entirely server-managed**.

#### Projectile System
```javascript
class ProjectileManager {
  constructor() {
    this.projectiles = [];
  }
  
  spawnProjectile(attacker, config) {
    const projectile = {
      id: generateId(),
      owner: attacker.id,
      pos: attacker.pos.copy(),
      vel: computeVelocity(config.direction, config.speed),
      damage: config.damage,
      lifetime: config.lifetime || 5.0,
      radius: config.radius || 10,
      hitTargets: new Set(), // Prevent multiple hits on same target
      createdAt: getCurrentTick()
    };
    
    this.projectiles.push(projectile);
    
    broadcastEvent({
      type: 'PROJECTILE_SPAWNED',
      projectile: projectile
    });
  }
  
  update(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      
      // Update position
      proj.pos.x += proj.vel.x * deltaTime;
      proj.pos.y += proj.vel.y * deltaTime;
      
      // Check lifetime
      const elapsed = (getCurrentTick() - proj.createdAt) / TICK_RATE;
      if (elapsed > proj.lifetime) {
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // Check collisions with fighters
      worlds.fighters.forEach(fighter => {
        if (fighter.id === proj.owner || proj.hitTargets.has(fighter.id)) return;
        
        const dist = distance(proj.pos, fighter.pos);
        if (dist < proj.radius + fighter.radius) {
          proj.hitTargets.add(fighter.id);
          
          // Apply hit
          const damage = proj.damage;
          fighter.takeDamage(damage, { type: 'PROJECTILE', source: proj.owner });
          
          broadcastEvent({
            type: 'PROJECTILE_HIT',
            projectileId: proj.id,
            targetId: fighter.id,
            damage: damage
          });
        }
      });
    }
  }
}
```

---

## Event System (Core Design)

The **event queue** is the central nervous system of the server.

### Event Flow Architecture

```
CLIENT INPUT           SERVER EVENT QUEUE              WORLD STATE
   ↓                         ↓                              ↓
socket.on('input')    → [InputQueue] → [EventQueue]  → updateFighter()
  { type: 'MOVE' }        processes       resolves         ↓
                          validates       in order      broadcast
socket.on('event')    → [InputQueue]                   snapshot
  { type: 'HIT' }         converts
                          to events
```

### Event Types (Comprehensive List)

```javascript
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
  
  // Projectile Events
  PROJECTILE_SPAWNED: 'PROJECTILE_SPAWNED', // { projectile }
  PROJECTILE_HIT: 'PROJECTILE_HIT',   // { projectile, target, damage }
  PROJECTILE_DESTROY: 'PROJECTILE_DESTROY' // { projectile }
};
```

### Event Queue Implementation

```javascript
class EventQueue {
  constructor() {
    this.queue = [];
    this.eventHandlers = new Map();
    this.registerHandlers();
  }
  
  // Add event to queue
  enqueue(event) {
    // Validate event
    if (!event.type) {
      console.error('Event missing type:', event);
      return false;
    }
    
    // Add timestamp
    event.timestamp = getCurrentTick();
    event.sequenceId = this.queue.length;
    
    this.queue.push(event);
    return true;
  }
  
  // Process all queued events in order (FIFO)
  processAll(world) {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      this.process(event, world);
    }
  }
  
  // Process single event
  process(event, world) {
    const handler = this.eventHandlers.get(event.type);
    
    if (!handler) {
      console.warn('No handler for event type:', event.type);
      return;
    }
    
    try {
      handler.call(this, event, world);
    } catch (error) {
      console.error('Error processing event:', event, error);
    }
  }
  
  // Register event handlers
  registerHandlers() {
    this.eventHandlers.set('HIT', this.handleHit);
    this.eventHandlers.set('MOVE', this.handleMove);
    this.eventHandlers.set('STATUS_APPLY', this.handleStatusApply);
    this.eventHandlers.set('STAGGER_START', this.handleStaggerStart);
    // ... etc
  }
  
  handleHit = (event, world) => {
    const attacker = world.getFighter(event.attackerId);
    const target = world.getFighter(event.targetId);
    
    if (!attacker || !target) return;
    
    const damage = event.damage || 0;
    target.takeDamage(damage, attacker);
    
    // Broadcast to clients
    io.emit('event', {
      type: 'HIT',
      attackerId: attacker.id,
      targetId: target.id,
      damage: damage,
      targetHp: target.hp
    });
  }
  
  handleMove = (event, world) => {
    const fighter = world.getFighter(event.fighterId);
    if (!fighter) return;
    
    const validated = validateMove(fighter, event);
    if (!validated.valid) return;
    
    fighter.pos = validated.position;
  }
  
  handleStatusApply = (event, world) => {
    const target = world.getFighter(event.targetId);
    if (!target) return;
    
    applyStatus(target, event.status.type, event.status.duration, event.status.potency);
    
    io.emit('event', {
      type: 'STATUS_APPLY',
      targetId: target.id,
      status: event.status
    });
  }
  
  // ... more handlers
}
```

---

## No Direct Mutation Rule

**Core Principle:** Fighters never directly modify each other. All changes flow through the event system.

### ❌ FORBIDDEN Pattern
```javascript
// This is NOT allowed server-side either
function resolveHit(attacker, defender) {
  defender.hp -= 30;  // ❌ Direct mutation
  defender.statuses.push(newStatus);  // ❌ Direct mutation
}
```

### ✅ CORRECT Pattern
```javascript
function resolveHit(attacker, defender) {
  // Generate events instead
  eventQueue.enqueue({
    type: 'HIT',
    attackerId: attacker.id,
    targetId: defender.id,
    damage: 30,
    knockback: 5
  });
  
  eventQueue.enqueue({
    type: 'STATUS_APPLY',
    targetId: defender.id,
    status: { type: 'Burn', duration: 5, potency: 2 }
  });
  
  // Events are processed in order by handlers
  eventQueue.processAll(world);
}
```

### Why This Matters
1. **Determinism:** Same input sequence = same output
2. **Replay-ability:** Record events, replay any match
3. **Debugging:** Trace exact order of state changes
4. **Rollback:** Easily rewind to previous state
5. **Consistency:** No race conditions or order ambiguity

---

## Status System Design

### Status as Pure Data

```javascript
class Status {
  constructor(type, duration, potency) {
    this.type = type;           // e.g. 'Burn', 'Poison', 'Bind'
    this.duration = duration;   // in ticks
    this.potency = potency;     // numeric value (damage/effect strength)
    this.stackCount = 1;        // number of stacks
    this.tickCounter = 0;       // current tick in duration
    this.appliedAt = getCurrentTick();
  }
  
  tick() {
    this.tickCounter++;
    return this.tickCounter >= this.duration; // true if expired
  }
  
  isActive() {
    return this.tickCounter < this.duration;
  }
}
```

### Status Effects Processing (Server Tick)

```javascript
function processStatusTicks(fighter, deltaTime) {
  const ticksToProcess = Math.ceil(deltaTime * TICK_RATE);
  
  for (let i = fighter.statuses.length - 1; i >= 0; i--) {
    const status = fighter.statuses[i];
    
    // Tick the status
    let isExpired = false;
    for (let t = 0; t < ticksToProcess; t++) {
      isExpired = status.tick();
      
      if (!isExpired) {
        // Apply tick effects
        switch (status.type) {
          case 'Burn':
            // Burn damage every tick
            fighter.takeDamage(status.potency * 0.5, { source: 'Burn' });
            eventQueue.enqueue({
              type: 'STATUS_TICK',
              targetId: fighter.id,
              status: status.type,
              damage: status.potency * 0.5
            });
            break;
            
          case 'Poison':
            // Poison reduces HP over time
            fighter.takeDamage(status.potency * 0.3, { source: 'Poison' });
            break;
            
          case 'Bleed':
            // Bleed triggers on hit (handled in receiveHit)
            break;
            
          case 'Haste':
            // No per-tick effect, just stat modification
            break;
            
          // ... other status types
        }
      }
      
      if (isExpired) break;
    }
    
    // Remove expired status
    if (isExpired) {
      fighter.statuses.splice(i, 1);
      eventQueue.enqueue({
        type: 'STATUS_REMOVE',
        targetId: fighter.id,
        status: status.type
      });
    }
  }
}
```

### Status Effect Modifiers

```javascript
function getStatusModifiers(fighter) {
  const modifiers = {
    damageMultiplier: 1.0,
    speedMultiplier: 1.0,
    defenseMultiplier: 1.0,
    cooldownMultiplier: 1.0
  };
  
  fighter.statuses.forEach(status => {
    switch (status.type) {
      case 'Haste':
        modifiers.speedMultiplier *= 1.2 * status.stackCount;
        break;
      case 'Weakness':
        modifiers.damageMultiplier *= 0.8;
        break;
      case 'Protection':
        modifiers.defenseMultiplier *= 0.9;
        break;
      case 'Fragile':
        modifiers.defenseMultiplier *= 1.1 * status.stackCount;
        break;
      case 'Bind':
        modifiers.speedMultiplier *= 0.5;
        break;
      // ... etc
    }
  });
  
  return modifiers;
}
```

---

## Server Game Loop (Strict Order)

This is the **exact sequence** that must execute every frame on the server at 60 TPS.

```javascript
const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE; // ~16.67ms
let currentTick = 0;

// Main server loop
setInterval(() => {
  const tickStart = performance.now();
  
  // ============================================================
  // PHASE 1: COLLECT INPUTS
  // ============================================================
  // Client inputs were already queued in socket.on('input')
  // Input queue is processed here to generate events
  
  for (const fighter of world.fighters) {
    if (fighter.isAI) {
      // AI generates its own inputs
      const aiInput = fighter.ai.generateInput();
      inputQueue.enqueue({
        fighterId: fighter.id,
        input: aiInput
      });
    }
    // Player inputs already in queue from socket.on('input')
  }
  
  // ============================================================
  // PHASE 2: GENERATE EVENTS FROM INPUTS
  // ============================================================
  // Convert inputs to game events
  
  while (inputQueue.length > 0) {
    const inputEvent = inputQueue.dequeue();
    const fighter = world.getFighter(inputEvent.fighterId);
    
    if (!fighter || fighter.isDefeated) continue;
    
    // Validate cooldowns, state machines, etc.
    if (inputEvent.input.action === 'ATTACK') {
      if (fighter.canAttack()) {
        eventQueue.enqueue({
          type: 'HIT',
          attackerId: fighter.id,
          targetId: inputEvent.input.targetId,
          damage: calculateDamage(fighter, inputEvent.input),
          knockback: calculateKnockback(fighter, inputEvent.input)
        });
      }
    } else if (inputEvent.input.action === 'MOVE') {
      eventQueue.enqueue({
        type: 'MOVE',
        fighterId: fighter.id,
        position: inputEvent.input.position
      });
    }
    // ... handle other input types
  }
  
  // ============================================================
  // PHASE 3: RESOLVE MOVEMENT
  // ============================================================
  // Process all MOVE events
  
  const moveEvents = eventQueue.filterByType('MOVE');
  moveEvents.forEach(event => {
    const fighter = world.getFighter(event.fighterId);
    const validated = validateMove(fighter, event);
    
    if (validated.valid) {
      fighter.pos = validated.position;
    }
  });
  
  // Apply velocity/physics
  world.fighters.forEach(fighter => {
    if (fighter.isDefeated) return;
    
    fighter.vel.y += GRAVITY; // Apply gravity
    fighter.pos.x += fighter.vel.x * (TICK_DURATION / 1000);
    fighter.pos.y += fighter.vel.y * (TICK_DURATION / 1000);
    
    // Boundary checking
    if (fighter.pos.y > FLOOR_Y) {
      fighter.pos.y = FLOOR_Y;
      fighter.vel.y = 0;
      fighter.onGround = true;
    }
  });
  
  // ============================================================
  // PHASE 4: RESOLVE ATTACKS / COLLISION DETECTION
  // ============================================================
  // Check which attacks actually land
  
  world.fighters.forEach(attacker => {
    if (attacker.isDefeated || !attacker.isAttacking) return;
    
    // Check if attack hitbox overlaps with any defender
    const defendersHit = detectHits(attacker, world.fighters);
    
    defendersHit.forEach(defender => {
      // Check if already hit this frame
      if (attacker.alreadyHit.has(defender.id)) return;
      attacker.alreadyHit.add(defender.id);
      
      // Check if defender is guarding
      if (defender.isGuarding) {
        eventQueue.enqueue({
          type: 'BLOCK',
          defenderId: defender.id,
          attackerId: attacker.id,
          damage: attacker.currentAttackDamage * 0.45
        });
      } else if (defender.parryWindow > 0) {
        eventQueue.enqueue({
          type: 'PARRY',
          defenderId: defender.id,
          attackerId: attacker.id
        });
      } else {
        eventQueue.enqueue({
          type: 'HIT',
          attackerId: attacker.id,
          targetId: defender.id,
          damage: attacker.currentAttackDamage,
          knockback: attacker.currentKnockback
        });
      }
    });
  });
  
  // ============================================================
  // PHASE 5: RESOLVE COMBAT EVENTS
  // ============================================================
  // Process all HIT, BLOCK, PARRY events
  
  eventQueue.processAll(world);
  
  // This calls handlers like:
  // - handleHit: Apply damage, knockback, apply hit effects
  // - handleBlock: Reduce damage, trigger counter logic
  // - handleParry: Stun attacker, knockback both
  
  // ============================================================
  // PHASE 6: APPLY STATUS EFFECTS
  // ============================================================
  // Process status ticks (Burn damage, Poison, etc.)
  
  world.fighters.forEach(fighter => {
    processStatusTicks(fighter, TICK_DURATION / 1000);
  });
  
  // ============================================================
  // PHASE 7: CLEANUP / DEATH
  // ============================================================
  // Remove defeated fighters, check for match end
  
  world.fighters.forEach(fighter => {
    processDeath(fighter);
  });
  
  // Check for match end
  const activeFighters = world.fighters.filter(f => !f.isDefeated);
  if (activeFighters.length <= 1) {
    endMatch(world, activeFighters[0]);
  }
  
  // ============================================================
  // PHASE 8: BROADCAST STATE (Every 3rd tick = 20 Hz)
  // ============================================================
  // Send state update to all clients
  
  currentTick++;
  if (currentTick % 3 === 0) {  // 60 / 3 = 20 Hz broadcast
    const snapshot = {
      tick: currentTick,
      fighters: world.fighters.map(f => ({
        id: f.id,
        pos: f.pos,
        vel: f.vel,
        hp: f.hp,
        maxHp: f.maxHp,
        statuses: f.statuses,
        state: f.state,
        isDefeated: f.isDefeated
      }))
    };
    
    io.emit('stateUpdate', snapshot);
  }
  
  // ============================================================
  // PHASE 9: LOG PERFORMANCE
  // ============================================================
  
  const tickEnd = performance.now();
  const tickTime = tickEnd - tickStart;
  
  if (tickTime > TICK_DURATION * 0.8) {
    console.warn(`⚠️  Slow tick: ${tickTime.toFixed(2)}ms (${((tickTime / TICK_DURATION) * 100).toFixed(1)}% of budget)`);
  }
  
}, TICK_DURATION);
```

### Tick Budget Analysis
```
Tick Duration: 16.67ms
├── Phase 1 (Collect Inputs): 0.5ms
├── Phase 2 (Generate Events): 1ms
├── Phase 3 (Resolve Movement): 2ms
├── Phase 4 (Collision/Hits): 3ms
├── Phase 5 (Combat Events): 2ms
├── Phase 6 (Status Ticks): 2ms
├── Phase 7 (Death/Cleanup): 1ms
├── Phase 8 (Broadcast): 1.5ms
├── Phase 9 (Logging): 0.5ms
└── TOTAL: 13.5ms (Budget headroom: ~3.17ms)
```

---

## Shared Data Design

### Constants File (`shared-constants.js`)

This file is used by **both server and client** (read-only on client).

```javascript
// shared-constants.js
// Used by server for authority, by client for UI/prediction

export const CHARACTERS = {
  VALENCINA: {
    name: 'Valencina',
    hp: 2000,
    speed: 2.5,
    baseDamage: 40,
    attackInterval: 1.0,
    staggerThreshold: 100,
    staggerLength: 1.5,
    
    // Attack definitions (server: authority, client: animation)
    attacks: {
      basic_1: {
        damage: 40,
        startup: 12,      // frames before hit
        active: 8,        // frames that can hit
        recovery: 20,     // frames after hit
        knockback: 5,
        priority: 1
      },
      basic_2: {
        damage: 50,
        startup: 15,
        active: 8,
        recovery: 25,
        knockback: 8,
        priority: 1
      },
      basic_3: {
        damage: 70,
        startup: 18,
        active: 10,
        recovery: 35,
        knockback: 12,
        priority: 1
      }
    },
    
    // Special abilities
    abilities: {
      dash_attack: {
        damage: 60,
        cooldown: 3.0,
        duration: 0.16,
        knockback: 10,
        requirements: {
          minDistance: 100,
          maxDistance: 300
        }
      },
      ultimate: {
        damage: 200,
        cooldown: 15.0,
        duration: 3.0,
        knockback: 15
      }
    },
    
    // Status resistances (server: damage calculations, client: display)
    statusResistances: {
      Burn: 0.8,      // Take 20% less burn damage
      Poison: 0.9,
      Bleed: 1.0
    }
  },
  
  CALLISTO: {
    // ... similar structure
  }
};

export const ARENA = {
  WIDTH: 1280,
  HEIGHT: 720,
  FLOOR_Y: 600,
  GRAVITY: 0.8
};

export const STATUSES = {
  Burn: {
    duration: 5.0,
    damagePerTick: 5,
    stackable: true,
    maxStacks: 10
  },
  Poison: {
    duration: 8.0,
    damagePerTick: 3,
    stackable: true,
    maxStacks: 5
  },
  Bleed: {
    duration: 6.0,
    triggerOnHit: true,      // Triggers damage when hit
    damageOnTrigger: 30,
    stackable: true,
    maxStacks: 5
  },
  Haste: {
    duration: 4.0,
    speedMultiplier: 1.2,
    stackable: false
  },
  Bind: {
    duration: 3.0,
    speedMultiplier: 0.5,
    stackable: false
  },
  Protection: {
    duration: 5.0,
    damageMultiplier: 0.9,
    stackable: true,
    maxStacks: 5
  },
  Fragile: {
    duration: 5.0,
    damageMultiplier: 1.1,
    stackable: true,
    maxStacks: 5
  }
};

export const TICK_RATE = 60;
export const BROADCAST_RATE = 20; // Hz
export const NETWORK_TICKRATE = 1000 / TICK_RATE;
```

### How Shared Constants Are Used

**Server (Authoritative):**
```javascript
const CHAR_DATA = CHARACTERS.VALENCINA;
const damage = CHAR_DATA.attacks.basic_1.damage;
const staggerThreshold = CHAR_DATA.staggerThreshold;

// Server calculates from source of truth
applyStatus(fighter, STATUSES.Burn.type, STATUSES.Burn.duration);
```

**Client (Display/Prediction Only):**
```javascript
const CHAR_DATA = CHARACTERS.VALENCINA;

// Client uses for UI display
drawHpBar(fighter.hp, CHAR_DATA.maxHp);

// Client uses for animation startup (local prediction)
const attackData = CHAR_DATA.attacks.basic_1;
playAnimation('basic_1', attackData.startup);
```

---

## Determinism Rules

### Rules for Server Determinism

```javascript
// ✅ DETERMINISTIC
function calculateDamage(attacker, defender, attackData) {
  let damage = attackData.damage;
  
  // Use deterministic calculations only
  const comboMultiplier = 1 + (attacker.combo * 0.02);
  const modifiers = getStatusModifiers(defender);
  
  return Math.floor(damage * comboMultiplier * modifiers.defenseMultiplier);
}

// ❌ NON-DETERMINISTIC
function calculateDamage(attacker, defender, attackData) {
  let damage = attackData.damage;
  
  // Random damage variation breaks replay
  damage += Math.random() * 10;  // ❌ Don't do this
  
  // Current time breaks determinism
  if (Date.now() % 2 === 0) {   // ❌ Don't do this
    damage *= 1.1;
  }
  
  return damage;
}
```

### Guarantees for Replay-ability

```javascript
class ServerSimulation {
  constructor() {
    this.recordedEvents = [];
    this.currentTick = 0;
  }
  
  recordEvent(event) {
    // Record every event that affects state
    this.recordedEvents.push({
      tick: this.currentTick,
      event: event
    });
  }
  
  replay(fromTick = 0) {
    // Recreate exact state by replaying events
    const state = new GameState();
    
    for (let i = 0; i < this.recordedEvents.length; i++) {
      const { tick, event } = this.recordedEvents[i];
      
      if (tick < fromTick) continue;
      
      // Apply event to state
      applyEvent(state, event);
    }
    
    return state;
  }
}
```

### Seeding for AI Reproducibility

```javascript
// If AI uses randomness, seed it with tick number
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    // Deterministic pseudo-random (based on seed)
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// In AI logic:
const aiRandom = new SeededRandom(currentTick + fighter.id);
const randomDirection = aiRandom.next() > 0.5 ? 1 : -1;
```

---

## Optional Future Systems

These systems are **described but NOT implemented yet**. They are architectural considerations for advanced features.

### 1. Interpolation (Client-Side Smoothing)

**Purpose:** Smooth visual transitions between authoritative server updates (20 Hz → 60 FPS rendering).

**Concept:**
```javascript
class InterpolationSystem {
  constructor() {
    this.previousState = null;
    this.currentState = null;
  }
  
  addServerSnapshot(snapshot) {
    this.previousState = this.currentState;
    this.currentState = snapshot;
  }
  
  getInterpolatedState(alpha) {
    // alpha: 0 = previous, 1 = current
    const interpolated = {
      fighters: this.currentState.fighters.map((fighter, i) => ({
        ...fighter,
        pos: {
          x: lerp(
            this.previousState.fighters[i].pos.x,
            fighter.pos.x,
            alpha
          ),
          y: lerp(
            this.previousState.fighters[i].pos.y,
            fighter.pos.y,
            alpha
          )
        }
      }))
    };
    return interpolated;
  }
}
```

**Implementation:**
- Client receives snapshot every ~50ms (20 Hz)
- Client renders at 60 FPS using interpolation between snapshots
- Smooth visual movement without server-side changes

### 2. Client-Side Prediction

**Purpose:** Reduce perceived latency by predicting server state client-side.

**Concept:**
```javascript
class PredictionSystem {
  constructor(clientTick) {
    this.lastServerState = null;
    this.clientTick = clientTick;
    this.predictedState = null;
  }
  
  onServerSnapshot(snapshot) {
    this.lastServerState = snapshot;
  }
  
  predictNextState() {
    // Apply pending inputs locally
    let predicted = JSON.parse(JSON.stringify(this.lastServerState));
    
    // Apply momentum, gravity, etc. without server
    predicted.fighters.forEach(fighter => {
      fighter.pos.y += fighter.vel.y * (1 / 60);
      fighter.vel.y += GRAVITY * (1 / 60);
    });
    
    return predicted;
  }
}
```

**Implementation:**
- Client simulates local fighter movement immediately
- Server processes same input, sends authoritative correction
- If prediction was wrong, client reconciles (smooth blending)

### 3. Rollback / Frame Synchronization

**Purpose:** For fighting games, deterministically sync frame-perfect gameplay.

**Concept:**
```javascript
class RollbackSystem {
  constructor() {
    this.savedStates = new Map();    // tick → state
    this.inputBuffer = new Map();    // tick → input
  }
  
  saveState(tick, state) {
    this.savedStates.set(tick, JSON.parse(JSON.stringify(state)));
  }
  
  rollback(toTick) {
    // Restore saved state at that tick
    const savedState = this.savedStates.get(toTick);
    
    // Simulate forward with corrected inputs
    let state = JSON.parse(JSON.stringify(savedState));
    for (let t = toTick; t < currentTick; t++) {
      const input = this.inputBuffer.get(t);
      state = simulateFrame(state, input);
    }
    
    return state;
  }
}
```

**Implementation:**
- Server never resimulates (too expensive)
- Client can rollback locally for lag compensation
- Used in peer-to-peer fighting games (Tekken, GGPO)

### 4. Reconciliation (Fixing Prediction Errors)

**Purpose:** Smoothly correct client prediction when server disagrees.

**Concept:**
```javascript
class ReconciliationSystem {
  compareStates(clientState, serverState) {
    const differences = {
      hp: [],
      position: [],
      status: []
    };
    
    serverState.fighters.forEach((serverFighter, i) => {
      const clientFighter = clientState.fighters[i];
      
      if (serverFighter.hp !== clientFighter.hp) {
        differences.hp.push({
          fighterId: serverFighter.id,
          expected: clientFighter.hp,
          actual: serverFighter.hp
        });
      }
    });
    
    return differences;
  }
  
  reconcile(clientState, serverState, alpha = 0.2) {
    // Smoothly blend toward server state
    serverState.fighters.forEach((serverFighter, i) => {
      const clientFighter = clientState.fighters[i];
      
      // Smooth correction
      clientFighter.hp += (serverFighter.hp - clientFighter.hp) * alpha;
    });
    
    return clientState;
  }
}
```

### 5. Lag Compensation

**Purpose:** Allow players to feel responsive despite network latency.

**Concept:**
```javascript
class LagCompensationSystem {
  constructor() {
    this.networkLatency = 0;
    this.latencySamples = [];
  }
  
  recordLatency(sentTime, receivedTime) {
    const latency = (receivedTime - sentTime) / 2;
    this.latencySamples.push(latency);
    
    // Average last 10 samples
    if (this.latencySamples.length > 10) {
      this.latencySamples.shift();
    }
    
    this.networkLatency = this.latencySamples.reduce((a, b) => a + b) / this.latencySamples.length;
  }
  
  compensateInput(input, latency = this.networkLatency) {
    // Server processes input as if it was sent (latency) ago
    const compensatedTick = currentServerTick - Math.floor(latency * TICK_RATE);
    
    return {
      ...input,
      processedAtTick: compensatedTick
    };
  }
}
```

---

## Implementation Checklist

### Phase 1: Core Systems (Required)
- [ ] World state manager (fighters, entities, match state)
- [ ] Event queue system (enqueue, process, handlers)
- [ ] Fighter class (HP, status, cooldowns)
- [ ] Combat resolution (damage, knockback, stagger)
- [ ] Status effect system (apply, tick, remove)
- [ ] Collision detection (hit detection, boundaries)
- [ ] Death/match end logic
- [ ] 60 TPS game loop with proper phase ordering
- [ ] Socket.IO event handlers (input, event)
- [ ] State snapshot broadcasting (20 Hz)

### Phase 2: Advanced Combat
- [ ] Combo system
- [ ] Parry/block/counter mechanics
- [ ] Stagger accumulation and recovery
- [ ] Ultimate ability system
- [ ] Attack startup/active/recovery frames
- [ ] Knockback physics with mass/status modifiers

### Phase 3: AI System
- [ ] Basic AI state machine
- [ ] Threat assessment
- [ ] Behavior tree (optional, advanced)
- [ ] AI input generation
- [ ] Seeded randomness for determinism

### Phase 4: Polish & Optimization
- [ ] Performance monitoring (tick time budgeting)
- [ ] Event logging/debugging
- [ ] Determinism validation (replay system)
- [ ] Network optimization (message compression)

### Phase 5: Advanced Features (Optional)
- [ ] Interpolation system
- [ ] Client-side prediction
- [ ] Rollback/reconciliation
- [ ] Lag compensation
- [ ] Spectator system

---

## Summary

This specification defines a **production-grade multiplayer server** with:

✅ **Clear Separation:** Input → Events → Resolution → Broadcast  
✅ **Authority:** Server is always source of truth  
✅ **Determinism:** Same inputs = same results, always  
✅ **Scalability:** Event-driven design, no tight coupling  
✅ **Debugging:** Replay any match from event log  
✅ **Extensibility:** New status types, abilities, mechanics easily added  

The server handles ALL gameplay logic authoritatively while the client handles only rendering and input capture. This architecture scales from 1v1 to 4-player battles with confidence.
