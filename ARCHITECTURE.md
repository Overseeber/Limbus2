# Limbus Company Fighting Game - Architecture Refactor

## Overview

This document describes the refactored character and gameplay architecture that separates concerns into three distinct layers:

1. **Shared Configuration** - Character stats, constants, ability configs
2. **Server-Side Gameplay Logic** - Combat resolution, damage calculation, hit detection, ability execution
3. **Client-Side Rendering** - Visuals, sprites, particles, VFX, UI

This architecture implements **server-authoritative gameplay** where the server makes all critical gameplay decisions, preventing client-side manipulation and ensuring fair multiplayer.

---

## Directory Structure

```
Limbus2/
├── shared/
│   └── characters/
│       ├── index.js          # Character config registry
│       ├── callisto.js       # Callisto stats & constants
│       ├── valencina.js      # Valencina stats & constants
│       └── john.js           # John stats & constants
│
├── server/
│   └── logic/
│       ├── gameplayEngine.js # Core combat resolution
│       └── characterLogic/
│           ├── callisto.js   # Callisto abilities (server)
│           └── valencina.js  # Valencina abilities (server)
│
├── public/
│   ├── fighter-modular.js    # Fighter class (REFACTORED - visuals only)
│   ├── characters.js         # LEGACY - TO BE REFACTORED
│   ├── sketch.js             # Game loop (unchanged)
│   └── rendering/            # NEW - Client-side visuals
│       ├── spriteSystem.js
│       ├── characterVFX/
│       │   ├── callisto.js
│       │   └── valencina.js
│       ├── effectRenderer.js
│       ├── UIRenderer.js
│       └── cutsceneRenderer.js
│
└── index.html                # HTML - loads both shared & client scripts

```

---

## 1. Shared Character Configuration

### Location
`/shared/characters/[characterName].js`

### Purpose
Defines character metadata, stats, and constants that both client and server need.

### Contents (ONLY)
- Character ID, name, title
- Combat stats (HP, speed, damage)
- Ability configurations (cooldowns, ranges, base damage)
- Resource system constants
- Status effect modifiers

### Example: CALLISTO_CONFIG
```javascript
const CALLISTO_CONFIG = {
  // Identity
  id: 'CALLISTO',
  name: 'Callisto',
  
  // Stats
  hp: 2819,
  speed: 9,
  baseDamage: 27,
  
  // Abilities
  abilities: {
    slam: {
      cooldown: 5,
      range: 200,
      baseDamage: 1.5
    },
    installationArt: {
      cooldown: 10,
      range: 300,
      corpusCost: 10
    }
  },
  
  // Resources
  corpusIngredient: { max: 20 },
  artworkTibia: { damageBonus: 0.1 }
};
```

### NO Config Content
- ❌ Methods/functions
- ❌ p5.js functions (dist, createVector, etc.)
- ❌ Rendering logic
- ❌ Particle systems
- ❌ Animation frame data
- ❌ Sprite references
- ❌ UI rendering

---

## 2. Server-Side Gameplay Logic

### Location
`/server/logic/`

### Purpose
Implements authoritative game logic. Server owns all critical gameplay decisions.

### Core Files

#### gameplayEngine.js
Main gameplay resolution engine containing:

**Character Initialization**
```javascript
initializeCharacter(characterId, characterKey)
→ Returns character game state (hp, resources, cooldowns, statuses)
```

**Ability Validation & Execution**
```javascript
executeAbility(state, abilityName, targetId, targetState)
→ Validates ability conditions
→ Calls character-specific ability handler
→ Applies damage, statuses, resource consumption
→ Returns result broadcast to clients
```

**Damage Calculation**
```javascript
calculateDamage(attacker, defender, baseDamage, config)
→ Pure JS calculation (NO p5.js)
→ Applies character-specific modifiers
→ Returns final damage value
```

**Status Effects**
```javascript
applyStatus(target, statusType, count, potency)
→ Server-authoritative status application
→ Prevents client-side status manipulation
```

#### Character-Specific Logic
`/server/logic/characterLogic/[character].js`

Contains character-specific ability implementations:

**Callisto** (`callisto.js`)
```javascript
executeSlamAttack(state, abilityConfig, targetState, config)
executeInstallationArt(state, abilityConfig, targetStates, config)
onSuccessfulHit(state, targetState, damage, config)
```

**Valencina** (`valencina.js`)
```javascript
executeTimeToHunt(state, abilityConfig, targetState, config)
executeDisposal(state, abilityConfig, targetStates, config)
onSuccessfulHit(state, targetState, damage, config)
onReceiveHit(state, damage, attacker, config)
updateShinSystem(state, config)
```

### Server Authority Guarantees
- ✅ Server calculates damage (clients can't modify)
- ✅ Server validates ability conditions (cooldowns, resources)
- ✅ Server determines hit/miss
- ✅ Server applies status effects
- ✅ Server manages cooldowns
- ✅ Server resolves combat outcomes

### Pure JavaScript Requirements
- ✅ Use `Math.*` instead of p5.js `random()`, `dist()`, etc.
- ✅ Use plain objects for positions: `{ x, y }` not `createVector()`
- ✅ No `window` object references
- ✅ No Canvas/DOM operations
- ✅ No graphics libraries

---

## 3. Client-Side Rendering (Visuals Only)

### Location
`/public/rendering/`

### Purpose
Handles all visual presentation based on server game state.

### Responsibilities
- ✅ Render sprites and animations
- ✅ Spawn visual effects (particles, slash effects)
- ✅ Screen shake and camera effects
- ✅ Display HUD, health bars, status icons
- ✅ Render ultimate cutscenes
- ✅ Play sound effects
- ✅ Color grading, screen overlays

### Cannot Do
- ❌ Calculate damage
- ❌ Validate abilities
- ❌ Determine hit detection
- ❌ Manage combat state
- ❌ Apply status effects (server does this)
- ❌ Make authoritative gameplay decisions

### Key Components

#### spriteSystem.js
Manages sprite atlases and rendering

```javascript
loadSpriteAtlases(atlases)  // Load sprite sheets
drawSprite(spriteName, x, y, options)  // Render cached sprite
getCurrentAnimationFrame(fighter)  // Get current animation frame
```

#### characterVFX/[character].js
Character-specific visual effects

```javascript
// Example: Callisto VFX
spawnCorpusIngredientVFX(position, count)
spawnBleedEffect(target)
spawnInstallationArtSlash(position, targeting)
```

#### effectRenderer.js
Generic effect rendering

```javascript
drawParticles(dt)
drawSlashEffects(dt)
addScreenShake(intensity)
drawScreenShake(intensity)
```

#### UIRenderer.js
HUD and status displays

```javascript
drawHealthBar(fighter, screenPos)
drawStatusEffects(fighter, screenPos)
drawAbilityCooldowns(fighter)
drawResourceBars(fighter)  // Corpus, Precognition, Overheat, etc.
```

#### cutsceneRenderer.js
Ultimate ability visuals

```javascript
renderUltimateSequence(fighter, phase, timer)
drawCameraZoom(zoomLevel)
drawBackgroundDim(dimAmount)
```

---

## 4. Networking Refactor

### Current Problem
```javascript
// BAD: Client authority
Client sends: 'ATTACK'
Client calculates: damage, hit detection, status effects
Client modifies: targetHP, statuses, cooldowns
Server just mirrors back the results
→ Clients can manipulate damage/immunity
```

### New Architecture
```javascript
// GOOD: Server authority
Client sends: { type: 'ABILITY', id: 'slam', targetId: 'opponent' }
Server validates: ability conditions, cooldown, state
Server calculates: damage, hit detection, status effects
Server broadcasts: { type: 'ABILITY_RESULT', damage: 50, hit: true, statuses: ['Stagger'] }
Client renders: health bar reduction, stagger animation, slash effect
→ Clients cannot modify gameplay
```

### Socket.IO Events (Proposed)

**Client → Server**
```javascript
socket.emit('ABILITY', {
  characterKey: 'CALLISTO',
  ability: 'slam',
  targetId: 'opponent123'
});

socket.emit('ABILITY', {
  characterKey: 'VALENCINA',
  ability: 'timeToHunt',
  targetId: 'opponent456'
});

socket.emit('MOVEMENT', {
  direction: { x: 1, y: 0 },
  facing: 1
});
```

**Server → Clients**
```javascript
socket.emit('ABILITY_RESULT', {
  attackerId: 'player1',
  ability: 'slam',
  targetId: 'opponent',
  damage: 50,
  hit: true,
  statuses: [{ type: 'Stagger', potency: 25 }],
  targetHp: 2750,
  defeated: false
});

socket.emit('STATE_UPDATE', {
  fighters: [
    {
      id: 'player1',
      hp: 2819,
      statuses: [],
      resources: { corpusIngredient: 15 }
    },
    // ...
  ]
});
```

---

## 5. Fighter Class Refactoring Strategy

### Phase 1: Split Concerns (Current)
The `Fighter` class mixes:
- Gameplay logic
- Rendering logic
- Animation logic
- Physics
- Status effects
- Ultimate mechanics

### Phase 2: Separate into Layers

**Client-Only Fighter**
```javascript
class ClientFighter {
  constructor(id, characterKey, config) {
    this.id = id;
    this.characterKey = characterKey;
    
    // Game state (from server)
    this.hp = config.hp;
    this.statuses = [];
    this.resources = {};
    
    // Visual state (client)
    this.spriteState = 'idle';
    this.animationFrame = 0;
    this.spriteShake = { x: 0, y: 0 };
  }
  
  // Client-side only methods
  updateSprite(dt) { }
  updateAnimation(dt) { }
  draw() { }
  drawStatusEffects() { }
}
```

**Server-Only GameFighter** (Conceptual)
```javascript
// Not a class, just state + logic functions
const fighterState = {
  id: 'player1',
  characterKey: 'CALLISTO',
  hp: 2819,
  resources: { corpusIngredient: 10 },
  abilityCooldowns: {},
  statuses: []
};

// Gameplay functions
gameplayEngine.executeAbility(fighterState, 'slam', targetState, config);
gameplayEngine.applyDamage(fighterState, 50, attacker);
```

### Phase 3: Messaging Between Layers
```javascript
// Server game loop
gameplayEngine.updateCharacterSystems(fighterState, dt);
gameplayEngine.updateCooldowns(fighterState, dt);

// Broadcast to clients
socket.emit('STATE_UPDATE', fighterState);

// Client receives update
localFighter.hp = update.hp;
localFighter.resources = update.resources;
localFighter.statuses = update.statuses;

// Client renders visuals based on server state
localFighter.draw();
```

---

## 6. Implementation Roadmap

### Stage 1: Configuration Layer (✅ DONE)
- [x] Create `/shared/characters/` config files
- [x] Extract stats from CHARACTERS object
- [x] Create character config registry

### Stage 2: Server Logic (✅ DONE)
- [x] Create `GameplayEngine` class
- [x] Implement ability validation and execution
- [x] Implement damage calculation
- [x] Implement status effect application
- [x] Create character-specific ability logic

### Stage 3: Client Rendering (TODO)
- [ ] Create rendering layer architecture
- [ ] Extract sprite rendering from Fighter
- [ ] Extract VFX rendering from Fighter
- [ ] Extract HUD rendering from Fighter
- [ ] Separate animation logic

### Stage 4: Networking Integration (TODO)
- [ ] Implement server-authoritative ability handling
- [ ] Update Socket.IO event handlers
- [ ] Remove client-side damage calculation
- [ ] Implement server state broadcasting
- [ ] Update client state reception

### Stage 5: Fighter Class Refactoring (TODO)
- [ ] Separate client-only Fighter class
- [ ] Remove gameplay logic from client Fighter
- [ ] Keep only rendering/animation logic
- [ ] Integrate with server state updates

### Stage 6: Testing & Validation (TODO)
- [ ] Test multiplayer with server authority
- [ ] Test CPU mode (local GameplayEngine)
- [ ] Validate all abilities work server-side
- [ ] Performance testing
- [ ] Security audit (check for client exploits)

---

## 7. Pure JavaScript Utilities

Since server-side code cannot use p5.js, here are replacements:

```javascript
// DISTANCE CALCULATION
// p5.js: dist(x1, y1, x2, y2)
// Pure JS: 
function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// RANDOM NUMBER
// p5.js: random(min, max)
// Pure JS:
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// CONSTRAIN VALUE
// p5.js: constrain(value, min, max)
// Pure JS:
function constrain(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// VECTOR OPERATIONS
// p5.js: createVector(x, y)
// Pure JS:
const vector = { x: 0, y: 0 };

// RECTANGLE OVERLAP
// p5.js: (uses dist() and rect collision)
// Pure JS:
function rectOverlap(r1, r2) {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h &&
         r1.y + r1.h > r2.y;
}
```

---

## 8. Benefits of This Architecture

### Scalability
- ✅ Adding new characters only requires 3 files:
  1. `/shared/characters/newchar.js` (config)
  2. `/server/logic/characterLogic/newchar.js` (abilities)
  3. `/public/rendering/characterVFX/newchar.js` (visuals)

### Security
- ✅ Server makes all authoritative decisions
- ✅ Clients cannot modify game state
- ✅ Prevents damage manipulation, cooldown cheating, status immunity

### Maintainability
- ✅ Clear separation of concerns
- ✅ Each layer has specific responsibility
- ✅ Easier to debug (server logs game decisions)
- ✅ Easier to test (can test server logic without p5.js)

### Flexibility
- ✅ Easy to run same gameplay logic in multiple contexts:
  - Multiplayer (server authoritative)
  - CPU battles (local GameplayEngine instance)
  - Replays (replay server state)
  - AI opponents (server-side AI)

### Performance
- ✅ Server processes once, broadcasts to all clients
- ✅ Clients only handle rendering
- ✅ Reduces computation on client devices
- ✅ Scales better with many players

---

## 9. Character Data Format Reference

### Ability Configuration
```javascript
abilities: {
  abilityName: {
    cooldown: 5,           // Seconds
    range: 200,            // Pixels
    baseDamage: 1.5,       // Multiplier of baseDamage
    knockback: 150,        // Pixel distance
    resourceCost: 10,      // Corpus/Precognition/etc
    statusEffects: [
      {
        type: 'Stagger',
        count: 1,
        potency: 25,
        duration: 2
      }
    ]
  }
}
```

### Status Effect Format
```javascript
{
  type: 'Bleed',           // Status name
  count: 4,                // Stacks of this status
  potency: 4,              // Damage/effect strength
  duration: 0              // How long it lasts (0 = until consumed)
}
```

### Resource System Format
```javascript
resources: {
  corpusIngredient: {
    max: 20,
    gainPerHit: 5,
    spendPerAbility: 10,
    gainArtworkPer: 10
  }
}
```

---

## 10. Next Steps

1. **Complete rendering layer** - Separate all visual code from Fighter class
2. **Integrate GameplayEngine into server.js** - Replace current server logic
3. **Update networking** - Implement server-authoritative ability system
4. **Test thoroughly** - Verify all abilities work with server authority
5. **Remove client-side gameplay** - Clean up legacy client logic
6. **Document and validate** - Ensure architecture is solid and secure

---

## Files Affected

### Created (New)
- `/shared/characters/callisto.js`
- `/shared/characters/valencina.js`
- `/shared/characters/john.js`
- `/shared/characters/index.js`
- `/server/logic/gameplayEngine.js`
- `/server/logic/characterLogic/callisto.js`
- `/server/logic/characterLogic/valencina.js`
- `ARCHITECTURE.md` (this file)

### To Be Refactored
- `/public/fighter-modular.js` - Remove gameplay logic, keep rendering
- `/public/characters.js` - Move to config files
- `/server/server.js` - Integrate GameplayEngine

### Unchanged
- `/public/sketch.js` - Game loop continues to work
- `/public/client-network.js` - Update with new ability events
- `/public/ui.js` - Rendering layer

---

## Questions & Clarifications

**Q: Why separate server logic and client rendering?**
A: Prevents cheating, ensures fair multiplayer, allows server-side AI, enables replays.

**Q: Can we reuse Fighter class?**
A: Yes - refactor it to be client-only, handle rendering/animation only. Server uses pure data + functions.

**Q: What about CPU battles?**
A: Create local GameplayEngine instance on client, bypass server. Same ability logic works.

**Q: How do we handle latency?**
A: Clients predict locally, server sends authoritative updates, clients reconcile if wrong.

---

*End of Architecture Document*
