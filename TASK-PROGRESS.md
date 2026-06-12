# Task Progress - UI, Gameplay, and Networking Fixes

## Fix 1: Damage Number and Status Font Consistency
- [x] Verified damage.js already uses NumberFont (Excelsior) for all damage numbers, evade indicators, and tremor indicators
- [x] Verified status icons already use NumberFont in ui.js drawStatusRows()
- [x] All combat numbers are already using NumberFont consistently

## Fix 2: Stagger State Never Activates
- [x] **Root cause identified**: In `resolveAttack()`, stagger buildup was calculated AFTER the threshold check
- [x] **Fix applied**: Moved stagger buildup to happen BEFORE the threshold check, so the current hit's stagger damage can trigger stagger entry immediately
- [x] Refactored the entire stagger+hit logic flow: stagger buildup adds first, then threshold check happens, then hurt state is set only if threshold not reached
- [x] Fixed the logic for guarded hits (no stagger buildup, but still needs hurt state)

## Fix 3: Leave Room Button Does Not Work
- [x] **Root cause identified**: The "Leave Room" visual in `drawLobby()` was just a rect+text with NO clickable button
- [x] **Fix applied**: Replaced rect+text with a proper `UIButton` instance that:
  - Calls `Network.leaveRoom()` to send leave request to server
  - Clears local room state (`myRoomState`, `myRoomId`)
  - Clears `gameMode`
  - Transitions battle state to `MODE_SELECT`
- [x] Also fixed the same issue in `drawPreMatchLobby()` for the unified pre-match system's Leave button

## Fix 4: Valencina Ultimate Availability Bug
- [x] **Root cause identified**: `canActivateUltimate()` only checked if Overheat status was absent, but didn't verify that the player had completed at least one Overheat cycle
- [x] **Fix applied**: Added check for `_hasExitedOverheatOnce` in `canActivateUltimate()`:
  - At match start, `_hasExitedOverheatOnce` is false → ultimate unavailable
  - Valencina must enter and exit Overheat (complete at least one cycle) before ultimate becomes available
  - After first Overheat exit, ultimate is available when NOT in Overheat (existing behavior)