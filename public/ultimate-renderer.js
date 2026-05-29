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
  fighter.ultimateTotalDamage = state.ultimateTotalDamage || 0;
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
}

/**
 * Draw the ultimate background dim overlay
 */
function drawUltimateBackgroundDim(dimAmount) {
  if (!dimAmount || dimAmount <= 0) return;
  
  // Draw semi-transparent black overlay over entire screen (camera space)
  // This is drawn BEFORE the camera transform so it covers the whole screen
  push();
  noStroke();
  fill(0, 0, 0, dimAmount * 200); // 0-200 alpha based on dim amount
  rect(0, 0, windowWidth, windowHeight);
  pop();
}

/**
 * Draw ultimate name text behind the character sprite
 * Drawn in world space so it stays behind the character
 */
function drawUltimateName(x, y, name, phase, cameraZoom) {
  if (!name || phase > 1) return; // Only show during initial pose
  
  push();
  textAlign(CENTER, CENTER);
  
  // Scale text based on camera zoom
  const baseSize = 42;
  const textSize = baseSize / cameraZoom;
  
  // Shadow for readability
  fill(0, 0, 0, 180);
  noStroke();
  textSize(textSize);
  text(name, x + 3, y - 180 / cameraZoom + 3);
  
  // Main text
  fill(255, 215, 0); // Gold color
  textSize(textSize);
  text(name, x, y - 180 / cameraZoom);
  
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
  rect(windowWidth - 200, windowHeight - 60, 190, 50, 8);
  
  // Label
  fill(200, 200, 200);
  textSize(14);
  text("ULTIMATE DAMAGE", windowWidth - 15, windowHeight - 40);
  
  // Damage number
  fill(255, 215, 0);
  textSize(22);
  text(Math.floor(totalDamage).toString(), windowWidth - 15, windowHeight - 10);
  
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
  
  redLines.forEach(line => {
    if (line.opacity <= 0) return;
    
    // Red lines with alpha
    stroke(255, 50, 50, line.opacity * 255);
    line(line.topX, line.topY, line.bottomX, line.bottomY);
    
    // Glow effect
    stroke(255, 0, 0, line.opacity * 100);
    strokeWeight(6);
    line(line.topX, line.topY, line.bottomX, line.bottomY);
  });
  
  pop();
}

/**
 * Draw skull effects (Callisto ultimate ending)
 */
function drawUltimateSkulls(skulls) {
  if (!skulls || skulls.length === 0) return;
  
  push();
  textAlign(CENTER, CENTER);
  textSize(32);
  
  skulls.forEach(skull => {
    push();
    translate(skull.x, skull.y);
    rotate(skull.rotation || 0);
    scale(skull.scale || 1);
    
    // Skull emoji or text
    fill(255, 255, 255, 200);
    text("💀", 0, 0);
    
    pop();
  });
  
  pop();
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
  
  // Draw ultimate name
  drawUltimateName(x, y, fighter.ultimateName, phase, camZoom);
  
  // Draw dialogue
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
window.drawUltimateBackgroundDim = drawUltimateBackgroundDim;
window.shouldHideGameplayUI = shouldHideGameplayUI;