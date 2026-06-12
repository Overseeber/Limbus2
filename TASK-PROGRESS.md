# Performance Optimization Pass - Task Progress

## Server-Side Optimizations (match.js)

### Snapshot Optimization
- [ ] Cache player snapshot data structures to avoid full rebuild every tick
- [ ] Avoid deep-cloning status arrays every snapshot tick when unchanged
- [ ] Remove repetitive `Object.values(this.players)` calls by caching player arrays

### Gameplay Loop Optimization
- [ ] Cache `require('./characterLogic/valencina')` calls (called every tick for every non-Valencina player)
- [ ] Cache `require('./characterLogic/dihui')` and `require('./characterLogic/callisto')` calls
- [ ] Avoid redundant `Object.values(this.players).filter(p => !p.gameState.isDefeated)` patterns
- [ ] Optimize `findClosestEnemy` / `findFurthestEnemy` to use cached player arrays
- [ ] Reduce duplicate `Object.values(this.players)` calls in `updateUltimates`
- [ ] Optimize `broadcastSnapshot` to avoid creating new objects every tick

### Console Spam Removal (server-side)
- [ ] Remove high-frequency gameplay logs from match.js

## GameplayEngine Optimizations
- [ ] Cache status lookups in `getDamageModifierSum` (called repeatedly by `calculateDamage`)
- [ ] Reduce repeated `getStatus`/`hasStatus` calls in damage calculation
- [ ] Optimize `processStatuses` event array allocations

## Client-Side Optimizations

### Console Spam Removal
- [ ] Remove high-frequency logs from `sketch.js` (snapshot received, network events, etc.)
- [ ] Remove debug logs from `handleStatusDamageNetworkEvent`
- [ ] Remove ability result logs
- [ ] Remove per-frame debug logs in `processSnapshot`

### Visual/Combat Optimization
- [ ] Optimize `updateCombatZoom` to reduce per-frame computation
- [ ] Optimize `processSnapshot` to reduce allocations in hot path
- [ ] Optimize particle system rendering (avoid `rotate(random(TWO_PI))` in draw)

### Memory/Allocation
- [ ] Reduce temporary object creation in `handleNetworkEvent` handlers
- [ ] Optimize `applySnapshot` buffer handling
- [ ] Reduce garbage collection pressure in hit event handlers

## Verification
- [ ] Ensure gameplay behaves identically
- [ ] Verify snapshots function correctly
- [ ] Verify console spam is removed but important logs remain