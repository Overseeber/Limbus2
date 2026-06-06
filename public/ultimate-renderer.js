/**
 * ULTIMATE RENDERER - Client-side rendering for ultimate sequences
 * Receives authoritative state from server snapshots
 * Handles: background dimming, name display, damage counter, effects
 */

// Store active ultimate data locally for smooth rendering
let activeUltimateData = {};

/**
 * Apply ultimate state from server snapshot to local fighter
 * Called during snapshot processing in sketch.js
 */
function applyUltimateState(fighter, state) {
  // Ultimate active state
  fighter.ultimateActive = !!state.ultimateActive;
  fighter.ultimatePhase = state.ultimatePhase || 0;
  fighter.ultimateTimer = state.ultimateTimer || 0;
  fighter.ultimateAttackFrame = state.ultimateAttackFrame || 0;
  fighter.ultimateAttackTimer = state.ultimateAttackTimer || 0;
  fighter.ultimateTotalDamage = Number(state.ultimateTotalDamage) || 0;
  fighter.ultimateCameraZoom = state.ultimateCameraZoom || 1;
  fighter.ultimateBackgroundDim = state.ultimateBackgroundDim || 0;
  fighter.ultimateName = state.ultimateName || '';
  fighter.ultimateDialogue = state.ultimateDialogue || '';
  
  // Visual effects data
  if (state.ultimateRedLines) {
    fighter.ultimateRedLines = state.ultimateRedLines;
  }
  if (state.ultimateSkulls) {
    fighter.ultimateSkulls = state.ultimateSkulls;
  }
  
  // Apply ultimate sprite to fighter's current sprite for animation
  if (fighter.ultimateActive && state.ultimateSprite) {
    fighter.currentSprite = state.ultimateSprite;
    fighter.state = 'ultimate';
  }
}

/**
 * Draw the ultimate background dim overlay
 */
function drawUltimateBackgroundDim(dimAmount) {
  // Smoothly fade the background dim to the requested target dimAmount
  if (typeof window.__currentUltimateDim === 'undefined') window.__currentUltimateDim = 0;
  const target = dimAmount || 0;
  window.__currentUltimateDim = lerp(window.__currentUltimateDim, target, 0.12);
  const cur = window.__currentUltimateDim;
  if (cur <= 0.005) return;

  const bgWidth = window.bgScaledWidth || ARENA_WIDTH;
  const bgHeight = window.bgScaledHeight || ARENA_HEIGHT;
  const bgLeft = (ARENA_WIDTH / 2) - (bgWidth / 2);
  const bgTop = (ARENA_HEIGHT / 2) - (bgHeight / 2);

  push();
  noStroke();
  fill(0, 0, 0, cur * 191); // 75% max opacity
  rect(bgLeft, bgTop, bgWidth, bgHeight);
  pop();
}

/**
 * Draw ultimate name image behind the character.
 * Rendered in screen space (unaffected by camera/zoom), during intro phase (Phase 0).
 */
function drawUltimateName(x, y, name, phase, cameraZoom) {
  if (!name || phase !== 0) return;

  // Map ultimate names to image keys (case-insensitive)
  const nameToImage = {
    'Rendspace': 'rendspace',
    'UTTERMOST REND SPACE - STRING SEVERANCE': 'rendspace',
    'DISPOSAL': 'disposal',
    'Disposal': 'disposal',
    'Closing Time': 'closing',
    'CLOSING TIME': 'closing',
    'Closing Time - Installation Art no. 1: Your Flesh and Bones as the Gallery\'s Seats': 'closing'
  };

  const imageKey = nameToImage[name];
  if (!imageKey || !window.ultimateImages || !window.ultimateImages[imageKey]) {
    // Fallback to text if image not found
    const size = typeof cameraZoom === 'number' ? Math.max(140, 180 / cameraZoom) : 180;
    const strokeW = typeof cameraZoom === 'number' ? Math.max(4, 10 / cameraZoom) : 10;

    push();
    textAlign(CENTER, CENTER);
    textSize(size);
    fill(255, 255, 255, 220);
    stroke(0, 0, 0, 255);
    strokeWeight(strokeW);
    text(name.toUpperCase(), x, y);
    pop();
    return;
  }

  const img = window.ultimateImages[imageKey];
  if (!img || img.width <= 0) return;

  // Draw image in screen space (centered on screen, unaffected by camera/zoom)
  push();
  imageMode(CENTER);
  // Draw at screen center, not at fighter position
  // Images are at full size (no scaling)
  image(img, width / 2, height / 2);
  pop();
}

/**
 * Draw ultimate dialogue text
 */
function drawUltimateDialogue(x, y, dialogue, phase) {
  if (!dialogue || phase > 1) return;
  
  push();
  textAlign(CENTER, CENTER);
  
  const baseSize = 16;
  fill(255, 255, 255, 200);
  noStroke();
  textSize(baseSize);
  text(dialogue, x, y - 220);
  
  pop();
}

/**
 * Draw ultimate damage counter (bottom-right corner, screen space)
 */
function drawUltimateDamageCounter(totalDamage) {
  if (!totalDamage || totalDamage <= 0) return;
  
  push();
  textAlign(RIGHT, BOTTOM);
  
  // Background
  fill(0, 0, 0, 150);
  noStroke();
  rectMode(CORNER);
  rect(width - 200, height - 60, 190, 50, 8);
  
  // Label
  fill(200, 200, 200);
  textSize(14);
  text("ULTIMATE DAMAGE", width - 15, height - 40);
  
  // Damage number
  fill(255, 215, 0);
  textSize(22);
  text(Math.floor(totalDamage).toString(), width - 15, height - 10);
  
  pop();
}

/**
 * Draw red line effects (Callisto ultimate)
 */
function drawUltimateRedLines(redLines) {
  if (!redLines || redLines.length === 0) return;
  
  push();
  strokeWeight(3);
  noFill();
  
  redLines.forEach(rl => {
    if (rl.opacity <= 0) return;
    
    // Red lines with alpha
    stroke(255, 50, 50, rl.opacity * 255);
    line(rl.topX, rl.topY, rl.bottomX, rl.bottomY);
    
    // Glow effect
    stroke(255, 0, 0, rl.opacity * 100);
    strokeWeight(6);
    line(rl.topX, rl.topY, rl.bottomX, rl.bottomY);
  });
  
  pop();
}

/**
 * Draw skull/debris effects (Callisto ultimate ending)
 * Uses actual sprite atlas sprites (cbsk1, cbsk2, cbsk3) instead of emoji text
 */
function drawUltimateSkulls(skulls) {
  if (!skulls || skulls.length === 0) return;
  
  const targetHeight = 144;
  const baseScale = targetHeight / 512;
  
  skulls.forEach(skull => {
    push();
    translate(skull.x, skull.y);
    rotate(skull.rotation || 0);
    
    // Apply the skull's scale on top of the base sprite scale
    const finalScale = baseScale * (skull.scale || 1);
    scale(finalScale);
    
    // Draw the actual sprite from atlas
    if (skull.type && typeof drawSprite === 'function') {
      drawSprite(skull.type, 0, 0);
    } else {
      // Fallback: simple colored rectangle
      fill(200, 50, 50, 200);
      noStroke();
      rectMode(CENTER);
      rect(0, 0, 64, 64);
      rectMode(CORNER);
    }
    
    pop();
  });
}

/**
 * Render all ultimate visual elements
 * Called during the draw loop after camera transform
 */
function renderUltimate(fighter) {
  if (!fighter || !fighter.ultimateActive) return;

  const x = fighter.pos ? fighter.pos.x : width / 2;
  const y = fighter.pos ? fighter.pos.y : height / 2;
  const phase = fighter.ultimatePhase || 0;
  const camZoom = fighter.ultimateCameraZoom || 1;

  // Draw dialogue (world space, affected by camera)
  drawUltimateDialogue(x, y, fighter.ultimateDialogue, phase);

  // Draw red lines (Callisto)
  if (fighter.ultimateRedLines) {
    drawUltimateRedLines(fighter.ultimateRedLines);
  }

  // Draw skulls (Callisto ending)
  if (fighter.ultimateSkulls) {
    drawUltimateSkulls(fighter.ultimateSkulls);
  }
}

/**
 * Draw ultimate name images in screen space (behind characters, above background)
 * Called during draw loop with camera transform temporarily popped
 */
function renderUltimateNameImages() {
  const fighters = window.allFighters || [];
  let ultimateFighter = null;

  // Check for fighters in ultimate state OR in phase 0 (intro pose)
  fighters.forEach(f => {
    if (f.ultimateActive || (f.ultimatePhase === 0 && f.ultimateName)) {
      ultimateFighter = f;
    }
  });

  if (!ultimateFighter) return;

  drawUltimateName(
    ultimateFighter.pos ? ultimateFighter.pos.x : width / 2,
    ultimateFighter.pos ? ultimateFighter.pos.y : height / 2,
    ultimateFighter.ultimateName,
    ultimateFighter.ultimatePhase || 0,
    ultimateFighter.ultimateCameraZoom || 1
  );
}

/**
 * Draw UI overlay elements for ultimate (screen space)
 * Called after camera transform is popped
 */
function renderUltimateUI() {
  // Find any fighter in ultimate state
  const fighters = window.allFighters || [];
  let anyUltimateActive = false;
  let totalDamage = 0;

  fighters.forEach(f => {
    if (f.ultimateActive) {
      anyUltimateActive = true;
      totalDamage += f.ultimateTotalDamage || 0;
    }
  });

  if (!anyUltimateActive) return;

  // Draw damage counter
  drawUltimateDamageCounter(totalDamage);
}

/**
 * Hide non-essential UI elements during ultimate
 */
function shouldHideGameplayUI() {
  const fighters = window.allFighters || [];
  return fighters.some(f => f.ultimateActive);
}

// Export for global use
window.applyUltimateState = applyUltimateState;
window.renderUltimate = renderUltimate;
window.renderUltimateUI = renderUltimateUI;
window.renderUltimateNameImages = renderUltimateNameImages;
window.drawUltimateBackgroundDim = drawUltimateBackgroundDim;
window.shouldHideGameplayUI = shouldHideGameplayUI;