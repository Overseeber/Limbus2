
# Migration Guide: Refactoring Characters to New Architecture

This guide shows how to migrate character methods from the monolithic `Fighter` class to the new three-layer architecture.

## Overview

```
OLD: fighter-modular.js (3411 lines)
├── Stats + config
├── Gameplay logic (damage, hit detection, abilities)
├── Rendering logic (sprites, particles, animation)
├── UI logic (HUD, status bars)
└── Client-side authority

NEW: Three-layer architecture
├── /shared/characters/callisto.js (stats only)
├── /server/logic/characterLogic/callisto.js (gameplay)
├── /public/rendering/characterVFX/callisto.js (visuals)
└── Server authority for gameplay
```

---

## Step 1: Extract Character Config

### Before (in characters.js)
```javascript
CALLISTO: {
  name: 'Callisto',
  hp: 2819,
  speed: 9,
  attackInterval: 0.75,
  baseDamage: 27,
  // 200+ lines of methods...
  onSuccessfulHit: function(damage, opponent, fighter) { },
  activateUltimate: function(fighter, enemies) { },
  // etc...
}
```

### After (in shared/characters/callisto.js)
```javascript
const CALLISTO_CONFIG = {
  id: 'CALLISTO',
  name: 'Callisto',
  hp: 2819,
  speed: 9,
  attackInterval: 0.75,
  baseDamage: 27,
  // NO methods!
  // NO rendering code!
  // NO p5.js functions!
  
  abilities: {
    slam: { cooldown: 5, range: 200, baseDamage: 1.5 },
    installationArt: { cooldown: 10, range: 300, corpusCost: 10 }
  }
};
```

**What to extract:**
- ✅ Stats (hp, speed, damage)
- ✅ Cooldown values
- ✅ Ability configurations
- ✅ Resource system constants
- ❌ NO methods
- ❌ NO rendering code

---

## Step 2: Move Gameplay Logic to Server

### Example: Callisto's Slam Attack

#### Before (Client-side, in Fighter class)
```javascript
class Fighter {
  executeSlamAttack(opponent) {
    // Calculate damage
    const damage = this.baseDamage * 1.5;
    
    // Check hit (client does this!)
    const distance = dist(this.pos.x, this.pos.y, opponent.pos.x, opponent.pos.y);
    if (distance > 200) return;
    
    // Apply damage (client modifies opponent!)
    opponent.hp -= damage;
    
    // Apply status effects (client does this!)
    opponent.addStatus('Stagger', 25);
    
    // Visual effects
    this.spawnSlashEffect('slam');
    addScreenShake(damage);
  }
}
```

**Problems:**
- ❌ Client calculates damage (can be manipulated)
- ❌ Client determines hit/miss (can cheat)
- ❌ Client modifies opponent state (no authority)
- ❌ Client applies statuses (can be prevented)

#### After (Server-side, in server/logic/characterLogic/callisto.js)
```javascript
function executeSlamAttack(state, abilityConfig, targetState, config) {
  // Use PURE JAVASCRIPT ONLY
  // NO p5.js functions (no dist(), createVector(), random(), etc.)
  // NO window object
  
  // Server validates ability conditions
  if (state.abilityCooldowns.slam > 0) {
    return { success: false, reason: 'On cooldown' };
  }
  
  if (!targetState) {
    return { success: false, reason: 'No target' };
  }
  
  // Server calculates damage (clients can't see the calculation)
  const baseDamage = abilityConfig.baseDamage;
  const damage = Math.floor(baseDamage * state.baseDamage);
  
  // Server determines hit (authoritative)
  const distance = Math.hypot(
    state.position.x - targetState.position.x,
    state.position.y - targetState.position.y
  );
  const hit = distance <= abilityConfig.range;
  
  if (!hit) {
    return { success: true, hit: false, reason: 'Out of range' };
  }
  
  // Server applies damage (authoritative)
  targetState.hp = Math.max(0, targetState.hp - damage);
  
  // Server applies statuses (authoritative)
  targetState.statuses.push({
    type: 'Stagger',
    count: 1,
    potency: 25,
    duration: 2
  });
  
  // Server applies knockback
  targetState.velocity.x = abilityConfig.knockback * state.facing * config.knockbackMultiplier;
  
  // Return result for clients to render
  return {
    success: true,
    hit: true,
    damage: damage,
    targetHp: targetState.hp,
    defeated: targetState.hp <= 0,
    statuses: ['Stagger']
  };
}
```

**Rules for server-side code:**
- ✅ Use pure JavaScript math
- ✅ Use `Math.hypot()` instead of `dist()`
- ✅ Use `Math.random()` instead of `random()`
- ✅ Use `Math.max()/min()` instead of `constrain()`
- ✅ Use plain objects `{ x, y }` instead of `createVector()`
- ✅ NO `window` object
- ✅ NO Canvas operations
- ✅ NO p5.js globals

---

## Step 3: Keep Rendering on Client

### Example: Callisto Slam Visual Effects

#### Before (in Fighter class)
```javascript
class Fighter {
  draw() {
    // Draw everything in one place!
    this.drawSprite();
    this.drawSlashEffects();
    this.drawUltimateEffects();
    this.drawStatusEffects();
    this.drawHealthBar();
  }
  
  spawnSlashEffect(slashType) {
    // Spawn slash effects when ability activates
    const effect = {
      type: slashType,
      pos: this.pos.copy(),
      timer: 0.5
    };
    this.slashEffects.push(effect);
  }
}
```

#### After (Client-side, in public/rendering/characterVFX/callisto.js)
```javascript
/**
 * CALLISTO VISUAL EFFECTS
 * Client-side rendering for Callisto's abilities
 * Called when server broadcasts ability results
 */

function spawnSlamVisualEffect(fighter, target, damage) {
  // Spawn slash effect at attacker position
  const slashEffect = {
    type: 'slam_slash',
    pos: createVector(fighter.pos.x, fighter.pos.y),
    timer: 0.5,
    facing: fighter.facing
  };
  fighter.slashEffects.push(slashEffect);
  
  // Spawn damage number at target
  spawnDamageNumber(damage, target.pos.copy(), fighter.facing);
  
  // Add screen shake
  addScreenShake(damage * 0.1);
  
  // Add sprite shake
  fighter.addSpriteShake(damage * 0.5);
}

function drawCallistoVFX(dt) {
  // Draw all Callisto-specific visual effects
  // This gets called from the main render system
  
  // Corpus Ingredient particles
  if (fighter.resources.corpusIngredient > 0) {
    drawCorpusIngredientIndicator(fighter);
  }
  
  // Artwork: Tibia stacks visual
  if (fighter.resources.artworkTibiaStacks > 0) {
    drawArtworkTibiaStacks(fighter);
  }
}
```

**Rendering stays on client because:**
- ✅ Visual effects are not authoritative
- ✅ Rendering doesn't affect gameplay
- ✅ Can use p5.js for graphics
- ✅ Each client can customize appearance
- ✅ Low bandwidth (just positions/effects)

---

## Step 4: Migrate Ability by Ability

### Checklist for Each Ability

For each character ability, follow this process:

**1. Extract Config** → `/shared/characters/`
```javascript
abilities: {
  abilityName: {
    cooldown: X,
    range: Y,
    baseDamage: Z,
    resourceCost: W,
    statusEffects: [...]
  }
}
```

**2. Implement Server Logic** → `/server/logic/characterLogic/`
```javascript
function executeAbilityName(state, abilityConfig, targetState, config) {
  // Pure JavaScript
  // Validate → Calculate → Apply → Return result
}
```

**3. Implement Client Rendering** → `/public/rendering/characterVFX/`
```javascript
function spawnAbilityNameVisuals(fighter, target, result) {
  // p5.js rendering
  // Spawns effects based on server result
}
```

**4. Add Network Handler** → Update `server.js` or ability system
```javascript
socket.on('ABILITY', (data) => {
  const result = gameplayEngine.executeAbility(
    state,
    data.ability,
    data.targetId,
    targetState
  );
  socket.emit('ABILITY_RESULT', result);
});
```

---

## Example: Complete Migration of Valencina's Time to Hunt

### Step 1: Extract Config

**File:** `/shared/characters/valencina.js`
```javascript
abilities: {
  timeToHunt: {
    cooldown: 8,
    range: 150,
    baseDamage: 1.2,
    knockback: 100,
    precognitionCost: 1,
    statusEffects: [
      { type: 'Burn', count: 2, potency: 2 },
      { type: 'Tremor', count: 2, potency: 2 }
    ]
  }
}
```

### Step 2: Server Logic

**File:** `/server/logic/characterLogic/valencina.js`
```javascript
function executeTimeToHunt(state, abilityConfig, targetState, config) {
  // Validate precognition
  if (state.resources.precognition < config.precognition.consumePerAbility) {
    return { success: false, reason: 'Not enough Precognition' };
  }
  
  // Calculate damage (Shin bonus if active)
  let damage = Math.floor(abilityConfig.baseDamage * state.baseDamage);
  if (state.resources.shinActive) {
    damage = Math.floor(damage * (1 + config.shin.damageBonus));
  }
  
  // Apply damage
  targetState.hp = Math.max(0, targetState.hp - damage);
  
  // Apply statuses with Shin bonus
  abilityConfig.statusEffects.forEach(statusConfig => {
    let potency = statusConfig.potency;
    if (state.resources.shinActive && statusConfig.type === 'Burn') {
      potency += config.shin.burnBonusPotency;
    }
    
    targetState.statuses.push({
      type: statusConfig.type,
      count: statusConfig.count,
      potency: potency
    });
  });
  
  // Consume precognition
  state.resources.precognition -= config.precognition.consumePerAbility;
  
  // Return authoritative result
  return {
    success: true,
    damage: damage,
    targetHp: targetState.hp,
    statuses: ['Burn', 'Tremor'],
    precognitionRemaining: state.resources.precognition
  };
}
```

### Step 3: Client Rendering

**File:** `/public/rendering/characterVFX/valencina.js`
```javascript
function spawnTimeToHuntVisuals(fighter, target, result) {
  // When server sends ability result, spawn visuals
  
  if (!result.hit) return;
  
  // Spawn slash effect
  const slashEffect = {
    type: 'timeToHunt_slash',
    pos: createVector(fighter.pos.x, fighter.pos.y),
    targetPos: createVector(target.pos.x, target.pos.y),
    timer: 0.4,
    facing: fighter.facing
  };
  fighter.slashEffects.push(slashEffect);
  
  // Spawn damage number
  spawnDamageNumber(result.damage, target.pos.copy(), fighter.facing);
  
  // Screen shake proportional to damage
  addScreenShake(Math.min(result.damage * 0.15, 3));
  
  // Add burn effect particles
  for (let i = 0; i < 5; i++) {
    spawnBurnParticle(
      target.pos.x + random(-30, 30),
      target.pos.y + random(-20, 20)
    );
  }
}
```

### Step 4: Network Integration

**File:** `/server/server.js`
```javascript
socket.on('ABILITY', (data) => {
  if (data.ability === 'timeToHunt') {
    const result = executeTimeToHunt(
      playerState,
      VALENCINA_CONFIG.abilities.timeToHunt,
      opponentState,
      VALENCINA_CONFIG
    );
    
    socket.emit('ABILITY_RESULT', result);
    socket.broadcast.emit('OPPONENT_ABILITY', result);
  }
});
```

---

## Migration Checklist

### For Each Character

- [ ] Extract config to `/shared/characters/`
  - [ ] Stats
  - [ ] Ability configs
  - [ ] Resource system constants
  
- [ ] Move gameplay to `/server/logic/characterLogic/`
  - [ ] `executeAbility()` functions (pure JavaScript)
  - [ ] `onSuccessfulHit()` logic
  - [ ] `onReceiveHit()` logic
  - [ ] Resource update functions
  - [ ] Status effect logic
  
- [ ] Create rendering in `/public/rendering/characterVFX/`
  - [ ] Ability visual effects
  - [ ] Resource indicator rendering
  - [ ] Status effect visuals
  - [ ] Ultimate cutscene visuals
  
- [ ] Integrate with networking
  - [ ] Update server ability handlers
  - [ ] Update client effect spawning
  - [ ] Test multiplayer sync
  - [ ] Test CPU mode

---

## Common Migration Patterns

### Pattern 1: Damage + Status Application

**Old (Client):**
```javascript
opponent.hp -= damage;
opponent.addStatus('Stagger', 25);
```

**New (Server):**
```javascript
targetState.hp = Math.max(0, targetState.hp - damage);
targetState.statuses.push({ type: 'Stagger', potency: 25 });
return { success: true, damage, statuses: ['Stagger'] };
```

**New (Client - Receive):**
```javascript
opponent.hp = result.damage;
opponent.statuses = result.statuses;
spawnStatusEffectVFX(opponent, result.statuses);
```

### Pattern 2: Resource Consumption

**Old (Client):**
```javascript
fighter.corpusIngredient -= 10;
```

**New (Server):**
```javascript
state.resources.corpusIngredient -= abilityConfig.corpusCost;
return { corpusRemaining: state.resources.corpusIngredient };
```

**New (Client - Receive):**
```javascript
fighter.resources.corpusIngredient = result.corpusRemaining;
updateCorpusIndicator();
```

### Pattern 3: Range/Distance Checks

**Old (Client):**
```javascript
if (dist(this.pos.x, this.pos.y, opponent.pos.x, opponent.pos.y) > 200) return;
```

**New (Server - Pure JS):**
```javascript
const distance = Math.hypot(
  state.position.x - targetState.position.x,
  state.position.y - targetState.position.y
);
if (distance > abilityConfig.range) return { success: false, reason: 'Out of range' };
```

### Pattern 4: Random Number Generation

**Old (Client):**
```javascript
const randomEffect = random(effects);
```

**New (Server - Pure JS):**
```javascript
const randomEffect = effects[Math.floor(Math.random() * effects.length)];
```

---

## Testing Migration

### Unit Testing (Server Logic)
```javascript
// Test server-side logic without p5.js
const callistoLogic = require('./server/logic/characterLogic/callisto.js');

let state = { hp: 100, baseDamage: 27 };
let target = { hp: 100 };
const result = callistoLogic.executeSlamAttack(state, config, target, config);

console.assert(result.success === true);
console.assert(target.hp < 100);
console.assert(result.damage > 0);
```

### Integration Testing (Network)
```javascript
// Test multiplayer communication
socket.emit('ABILITY', { ability: 'slam', targetId: 'opponent' });
socket.on('ABILITY_RESULT', (result) => {
  console.assert(result.success === true);
  updateOpponentUI(result);
});
```

### Visual Testing (Client)
```javascript
// Test rendering without affecting gameplay
spawnTimeToHuntVisuals(localFighter, opponent, serverResult);
// Verify:
// - Slash effect appears
// - Damage number displays
// - Screen shakes appropriately
// - Burn particles spawn
```

---

## Troubleshooting

### "ReferenceError: dist is not defined"
**Problem:** Using p5.js function in server code
**Solution:** Replace `dist()` with `Math.hypot()` in server files

### "Cannot read property 'copy' of undefined"
**Problem:** Using `createVector()` in server code  
**Solution:** Use plain objects: `{ x, y }` instead of p5.Vector

### "Math.random() is not a function"
**Problem:** Typo or wrong context
**Solution:** Use `Math.random()` not `random()`

### Damage calculation differs between server/client
**Problem:** Different damage formulas in two places
**Solution:** Keep single formula in `/shared/characters/` or server, clients only render

### Abilities not triggering on opponent
**Problem:** Client-side ability still being used
**Solution:** Update network handler to use server GameplayEngine

---

## Summary

**New Architecture Benefits:**
- ✅ Server authority (prevents cheating)
- ✅ Clean separation of concerns
- ✅ Easy to add new characters (3 files)
- ✅ Easier to maintain and debug
- ✅ Works for multiplayer and CPU battles
- ✅ Scales well

**Migration Process:**
1. Extract config → `/shared/characters/`
2. Implement gameplay → `/server/logic/characterLogic/`
3. Implement rendering → `/public/rendering/characterVFX/`
4. Integrate network → Update server handlers
5. Test thoroughly → Unit + integration + visual

---

*End of Migration Guide*
