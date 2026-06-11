# Task Progress - Room Select & Unified Pre-Match Fixes

- [x] Analyze requirements and current codebase state
- [x] Fix room list display when not in a room (merged old drawLobby room selection into unified pre-match via drawRoomSelection)
- [x] Move leave room button to top-left corner (next to room code)
- [x] Simplify opponent display to small square (100x100) in bottom-right with name + ready/waiting indicator
- [x] Fix CPU mode to use unified pre-match system (drawCPULobby instead of old character select flow)
- [x] Clean up keyPressed handler for LOBBY state (just returns, all mouse-based)
- [ ] Old drawLobby still exists as dead code (can be cleaned up later)
- [x] Verify all changes work together

## Summary of Changes

### `public/sketch.js`

**drawPreMatchLobby()**: 
- Added early returns for multiplayer no-room state (`drawRoomSelection()`) and CPU mode (`drawCPULobby()`)
- Leave button moved to top-left (x:20, y:45)
- Room code displayed at top-left (x:20, y:20)

**drawRoomSelection()** (new):
- Shows available rooms as clickable UIButton list with player count squares
- Create New Room button
- Connection status when not connected

**drawCPULobby()** (new):
- Character name display at top-center
- CPU opponent info in bottom-right square
- Start Battle, Switch Character, and AI Toggle buttons

**drawOpponentDisplay()**:
- Simplified from 200x120 panel to 100x100 square
- Shows character name and ready/waiting indicator with colored borders

**keyPressed()**:
- LOBBY state now just returns (no keyboard controls needed)

**mousePressed() MODE_SELECT**:
- CPU button now uses `setBattleState(BATTLE_STATES.LOBBY)` directly