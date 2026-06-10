/**
 * ============================================================================
 * DEBUG UI - Consolidated debug overlay for development
 * ============================================================================
 * 
 * All debug visualizations are controlled by a single toggle that can be
 * enabled/disabled from the graphics settings panel. Debug starts disabled.
 * 
 * Features (all gated by debugGraphicsEnabled):
 * - Attack hitboxes (rect-based) with range indicators
 * - Attack phase labels (STARTUP / ACTIVE / RECOVERY)
 * - Player states and state transitions
 * - Player sprite names
 * - Player hitbox outlines (green rect)
 * - Stagger buildup % bars
 * - Recovery/attack sequencing info
 * - FPS counter
 */

// Global debug graphics toggle — starts disabled
// Set to true via Graphics Settings panel or dev console
let debugGraphicsEnabled = false;

/**
 * Toggle debug graphics on/off
 * @param {boolean} [force] Optional forced state
 */
function setDebugGraphics(force) {
  debugGraphicsEnabled = (typeof force === 'boolean') ? force : !debugGraphicsEnabled;
  console.log('[DEBUG] Debug graphics:', debugGraphicsEnabled ? 'ENABLED' : 'DISABLED');
}

/**
 * Master debug overlay function — call once per frame after all fighters are drawn.
 * Draws all debug visualizations gated by debugGraphicsEnabled.
 */
function drawDebugUI() {
  if (!debugGraphicsEnabled) return;
  if (!window.allFighters) return;

  // Per-fighter debug overlays
  for (const fighter of window.allFighters) {
    if (!fighter || !fighter.pos) continue;
    
    drawFighterDebugInfo(fighter);
    
    // Attack hitboxes + range when attacking
    if (fighter.attackSequence > 0 && fighter.attackPhase && fighter.attackPhase !== 'none') {
      drawDebugAttackHitbox(fighter);
    }
  }
}

/**
 * Draw FPS counter in top-left corner
 */
function drawDebugFPS() {
  push();
  fill(0, 200, 0);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text(`FPS: ${nf(frameRate(), 2, 1)}`, 10, 10);
  
  // Also draw frame count & delta
  fill(150, 200, 150);
  textSize(10);
  text(`Frame: ${frameCount}  DT: ${(deltaTime || 0).toFixed(1)}ms`, 10, 26);
  pop();
}

/**
 * Draw all debug info for a single fighter
 */
function drawFighterDebugInfo(fighter) {
  const x = fighter.pos.x;
  const y = fighter.pos.y;
  const facing = fighter.facing || 1;

  push();
  textAlign(LEFT, CENTER);
  
  // --- Top: Player state & sprite name ---
  const infoY = y - 80;
  fill(0, 0, 0, 160);
  noStroke();
  const infoText = `${fighter.name || 'Fighter'}`;
  const stateText = `State: ${fighter.state || '?'}  Sprite: ${fighter.currentSprite || '?'}`;
  
  // Background behind text
  const tw1 = textWidth(infoText);
  const tw2 = textWidth(stateText);
  const maxW = Math.max(tw1, tw2) + 12;
  
  rectMode(CORNER);
  rect(x - maxW / 2, infoY - 14, maxW, 36, 4);
  
  fill(255);
  textSize(11);
  text(infoText, x - maxW / 2 + 6, infoY);
  fill(180, 255, 180);
  textSize(9);
  text(stateText, x - maxW / 2 + 6, infoY + 18);
  
  // --- Attack sequencing info ---
  if (fighter.attackSequence > 0) {
    const seqY = infoY - 30;
    fill(0, 0, 0, 160);
    noStroke();
    const seqText = `AtkSeq:${fighter.attackSequence} Phase:${fighter.attackPhase || 'none'} Frame:${fighter.attackFrame || 0}/${fighter.totalAttackFrames || '?'}`;
    const seqW = textWidth(seqText) + 12;
    rect(x - seqW / 2, seqY - 8, seqW, 18, 4);
    fill(255, 200, 100);
    textSize(9);
    text(seqText, x - seqW / 2 + 6, seqY + 8);
  }
  
  // --- Stagger buildup % ---
  const staggerPercent = fighter.staggerThreshold > 0 
    ? constrain(fighter.stagger / fighter.staggerThreshold, 0, 1) 
    : 0;
  const stgY = y + 50;
  const stgW = 60;
  fill(0, 0, 0, 160);
  noStroke();
  rect(x - stgW / 2, stgY, stgW, 12, 3);
  if (staggerPercent > 0) {
    fill(255, 100 + staggerPercent * 100, 50);
    rect(x - stgW / 2, stgY, stgW * staggerPercent, 12, 3);
  }
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(8);
  text(`Stagger: ${(staggerPercent * 100).toFixed(0)}%`, x, stgY + 6);
  
  // --- Recovery timer ---
  if (fighter.staggerRecoveryTimer > 0) {
    const recY = stgY + 16;
    fill(255, 200, 100);
    textSize(8);
    textAlign(CENTER, CENTER);
    text(`Recovery: ${fighter.staggerRecoveryTimer.toFixed(2)}s`, x, recY);
  }
  
  // --- Evade indicator (gray ellipse) ---
  if (fighter.state === 'evade') {
    noStroke();
    fill(138, 138, 138, 180);
    ellipse(x, y - 10, 12, 12);
  }
  
  // --- Player hitbox outline (green rect) ---
  if (!fighter.isDefeated) {
    const hbY = y - 36;
    noFill();
    stroke(0, 255, 0, 120);
    strokeWeight(1);
    rect(x - 25, hbY, 50, 72);
  }
  
  pop();
}

/**
 * Draw a debug attack hitbox overlay for a single fighter.
 * Mirrors server-side attack box calculation for verification.
 */
function drawDebugAttackHitbox(fighter) {
  if (!fighter || !fighter.pos) return;

  const charKey = fighter.characterKey || (fighter.constructor && fighter.constructor.name);
  const charConfig = (typeof CHARACTERS !== 'undefined' && CHARACTERS[charKey]) || 
                     (window.CHARACTERS && window.CHARACTERS[charKey]) || null;
  
  // Determine attack range from the current attack sequence
  let attackRange = 120;
  if (fighter.attackSequence > 0 && charConfig && charConfig.attacks) {
    const attackKey = fighter.attackSequence === 1 ? 'light' :
                      fighter.attackSequence === 2 ? 'medium' : 'heavy';
    const attackDef = charConfig.attacks[attackKey];
    if (attackDef && attackDef.range) {
      attackRange = attackDef.range;
    }
  }
  
  // Calculate attack box using same formula as server (calcAttackBox)
  const facing = fighter.facing || 1;
  const atkBox = {
    x: fighter.pos.x + facing * (attackRange / 2),
    y: fighter.pos.y - 28,
    w: attackRange,
    h: 70
  };
  
  const boxX = atkBox.x - atkBox.w / 2;
  const boxY = atkBox.y;
  const boxW = atkBox.w;
  const boxH = atkBox.h;
  
  push();
  // Attack hitbox fill — red when strike is active, yellow during startup/recovery
  const hitboxColor = fighter.strikeActive ? color(255, 50, 50, 120) : color(255, 255, 50, 80);
  fill(hitboxColor);
  stroke(fighter.strikeActive ? color(255, 0, 0) : color(255, 255, 0));
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH);
  
  // Attack label with range info
  const attackLabel = fighter.strikeActive ? 'HITBOX ACTIVE' : 
                      fighter.attackPhase === 'startup' ? 'STARTUP' :
                      fighter.attackPhase === 'recovery' ? 'RECOVERY' : 'ATTACK';
  fill(255);
  textSize(10);
  textAlign(LEFT, BOTTOM);
  text(`${attackLabel} Seq:${fighter.attackSequence} Rng:${attackRange} Ph:${fighter.attackPhase}`, boxX, boxY - 5);
  
  // Range line from fighter center to edge of hitbox
  stroke(255, 200, 0, 100);
  strokeWeight(1);
  line(fighter.pos.x, fighter.pos.y - 30, fighter.pos.x + facing * attackRange, fighter.pos.y - 30);
  pop();
}