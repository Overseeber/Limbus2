# Task Progress - UI, Gameplay, and Networking Fixes

## Fix 1: Damage Number and Status Font Consistency
- [x] Verified `damage.js` already uses `textFont(NumberFont)` for damage numbers, evade indicators, tremor indicators
- [x] **CRITICAL FINDING**: `public/rendering/effectRenderer.js` contains a *duplicate* set of DamageNumber, StaggerDamageNumber, EvadeIndicator, and TremorIndicator classes that were missing `textFont(NumberFont)` calls
- [x] **Fix applied**: Added `textFont(NumberFont)` to ALL draw() methods in effectRenderer.js:
  - `DamageNumber.draw()` - main damage text
  - `StaggerDamageNumber.draw()` - stagger numbers and tremor burst text
  - `EvadeIndicator.draw()` - evade text
  - `TremorIndicator.draw()` - tremor text
- [x] Verified subtext (CRITICAL!, DEPOWERED, TREMOR BURST) inherits font from push()/pop() scope

## Fix 2: Stagger State Never Activates
- [x] **Root cause 1**: In `resolveAttack()`, stagger buildup was calculated AFTER the threshold check
- [x] **Fix**: Moved stagger buildup before threshold check so current hit can trigger stagger
- [x] **Root cause 2**: In `updateFighter()`, hitstun logic forced `state = 'hurt'` every tick, overriding the 'staggered' state
- [x] **Fix**: Added protection: when state is 'staggered', hitTimer/hitstunTimer are cleared and hurt state override is skipped
- [x] Stagger now persists for its full duration (e.g., 5 seconds for Valencina), then properly exits and resets stagger to 0

## Fix 3: Leave Room Button Does Not Work
- [x] **Root cause**: The "Leave Room" visual in `drawLobby()` was just rect+text with NO clickable button
- [x] **Fix**: Replaced with proper `UIButton` that calls `Network.leaveRoom()`, clears local state, and returns to room matchmaking
- [x] Also fixed `drawPreMatchLobby()` leave button to stay in LOBBY state (room matchmaking) instead of going to MODE_SELECT

## Fix 4: Valencina Ultimate Availability Bug
- [x] **Root cause**: `canActivateUltimate()` didn't check `_hasExitedOverheatOnce`
- [x] **Fix**: Added `_hasExitedOverheatOnce` check - ultimate unavailable at match start, requires completing one Overheat cycle first