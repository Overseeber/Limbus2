# Task Progress - Settings/Pause Menu & Debug Gating

## Debug Gating (move debug visuals behind debugGraphicsEnabled flag)
- [x] Player hitbox (green rect) - ALREADY GATED in debug-ui.js
- [x] "buildup %" stagger bar - ALREADY GATED in debug-ui.js
- [ ] Attack indicator (yellow ellipse/arc/line) in fighter-modular.js draw() - needs gating
- [ ] Sprite name text (VALENCINA debug) in fighter-modular.js draw() - needs gating
- [ ] Stagger timer in fighter-modular.js drawOverlays() - needs gating
- [ ] Stagger immunity text in fighter-modular.js drawOverlays() - needs gating
- [ ] Attack Cycle X/3 text in fighter-modular.js drawOverlays() - needs gating

## Pause System Rework
- [ ] When in menu (pause/settings), player inputs don't control fighter
- [ ] Click does not exit settings menu, only ESC does
- [ ] When paused, match is 'paused' (fighters frozen, timer stopped)
- [ ] Add pause overlay with darkened background + "PAUSED" text
- [ ] Add unpause countdown (3-2-1) before resuming gameplay