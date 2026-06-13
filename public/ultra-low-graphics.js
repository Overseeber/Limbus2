/**
 * ============================================================================
 * ULTRA LOW GRAPHICS MODE
 * ============================================================================
 * 
 * When enabled, replaces ALL image/sprite rendering with simple colored shapes.
 * No images are drawn - everything becomes rectangles, ellipses, and text.
 * 
 * Toggle: Settings panel (pause menu) -> Graphics -> "ULTRA LOW: ON/OFF"
 * Global flag: window.ultraLowGraphics (boolean)
 * ============================================================================
 */

// Global flag - false by default
window.ultraLowGraphics = false;

/**
 * UI COLORS - Simple flat colors for ultra low graphics mode
 * Each color is [r, g, b] array
 */
const ULG_COLORS = {
  // Background
  BG_SKY: [20, 20, 40],
  BG_TERRAIN: [30, 45, 30],
  BG_FLOOR: [50, 50, 60],
  BG_VIEW: [40, 30, 50],
  
  // Fighters
  VALENCINA: [180, 80, 200],     // Purple
  CALLISTO: [60, 160, 220],      // Blue
  DIHUI: [220, 200, 60],         // Yellow
  
  // UI
  HP_BAR: [66, 212, 146],        // Green
  HP_BAR_LOW: [217, 77, 77],     // Red
  HP_BAR_MID: [255, 204, 51],    // Yellow
  HP_BG: [20, 20, 20],
  
  // Effects
  HIT_FLASH: [255, 255, 255],
  SHADOW: [0, 0, 0],
};

/**
 * Get the ULG color for a character
 */
function getCharacterULGColor(characterKey) {
  switch (characterKey) {
    case 'VALENCINA': return ULG_COLORS.VALENCINA;
    case 'CALLISTO': return ULG_COLORS.CALLISTO;
    case 'DIHUI': return ULG_COLORS.DIHUI;
    default: return [150, 150, 150];
  }
}

/**
 * Draw a fighter as a simple rectangle in ultra low graphics mode
 */
function drawFighterULG(fighter) {
  if (!window.ultraLowGraphics) return;
  if (fighter.isDefeated) return;
  
  const x = fighter.pos.x;
  const y = fighter.pos.y;
  const facing = fighter.facing || 1;
  const w = 50;  // Width of character rect
  const h = 144; // Height of character rect
  
  push();
  rectMode(CENTER);
  
  // Get character color
  const color = getCharacterULGColor(fighter.characterKey);
  
  // Draw body
  fill(color[0], color[1], color[2], 220);
  noStroke();
  rect(x, y, w, h, 4);
  
  // Draw head
  fill(color[0] + 40, color[1] + 40, color[2] + 40, 220);
  ellipse(x, y - h/2 - 8, 30, 30);
  
  // Draw eyes based on facing direction
  fill(255);
  noStroke();
  const eyeX = x + (facing * 6);
  const eyeY = y - h/2 - 10;
  ellipse(eyeX, eyeY, 6, 6);
  fill(0);
  ellipse(eyeX + (facing * 2), eyeY, 3, 3);
  
  // Draw stance color band
  const stateColors = {
    idle: [color[0] * 0.5, color[1] * 0.5, color[2] * 0.5],
    attack: [255, 220, 80],
    hit: [255, 80, 80],
    guard: [80, 180, 255],
    dash: [255, 200, 100],
    run: color,
    jump: color,
    stagger: [255, 150, 50],
    slam: [255, 100, 255],
    evade: [100, 255, 255],
    hurt: [255, 60, 60],
    blocked: [80, 80, 255]
  };
  
  const stateColor = stateColors[fighter.state] || color;
  fill(stateColor[0], stateColor[1], stateColor[2], 200);
  rect(x, y + h/4, w * 0.8, 6, 2);
  
  // Draw guard indicator
  if (fighter.isGuarding) {
    push();
    noFill();
    stroke(80, 180, 255, 180);
    strokeWeight(3);
    const guardDir = facing === 1 ? 1 : -1;
    arc(x + guardDir * 10, y, 60, 80, -PI/3, PI/3);
    pop();
  }
  
  // Draw charging indicator
  if (fighter.chargeAttack) {
    push();
    fill(255, 200, 50, 150 + sin(frameCount * 0.2) * 50);
    noStroke();
    ellipse(x, y - h/2 - 30, 20, 20);
    fill(255, 255, 200);
    textAlign(CENTER, CENTER);
    textSize(10);
    text('!', x, y - h/2 - 30);
    pop();
  }
  
  pop();
}

/**
 * Draw the arena background as simple colored layers in ULG mode
 */
function drawArenaULG() {
  if (!window.ultraLowGraphics) return;
  
  // Sky layer
  fill(ULG_COLORS.BG_SKY[0], ULG_COLORS.BG_SKY[1], ULG_COLORS.BG_SKY[2]);
  noStroke();
  rect(0, 0, ARENA_WIDTH || width, (ARENA_HEIGHT || height) * 0.4);
  
  // Terrain layer
  fill(ULG_COLORS.BG_TERRAIN[0], ULG_COLORS.BG_TERRAIN[1], ULG_COLORS.BG_TERRAIN[2]);
  rect(0, (ARENA_HEIGHT || height) * 0.4, ARENA_WIDTH || width, (ARENA_HEIGHT || height) * 0.3);
  
  // Floor layer
  fill(ULG_COLORS.BG_FLOOR[0], ULG_COLORS.BG_FLOOR[1], ULG_COLORS.BG_FLOOR[2]);
  rect(0, (ARENA_HEIGHT || height) * 0.7, ARENA_WIDTH || width, (ARENA_HEIGHT || height) * 0.3);
  
  // Draw floor line
  fill(180, 180, 200, 100);
  rect(0, (ARENA_HEIGHT || height) * 0.7, ARENA_WIDTH || width, 2);
  
  // Draw some simple ground markers
  fill(60, 60, 70, 80);
  for (let i = 0; i < (ARENA_WIDTH || width); i += 80) {
    rect(i, (ARENA_HEIGHT || height) * 0.7 + 10, 40, 4);
  }
}

/**
 * Draw HUD elements as simple shapes in ULG mode
 */
function drawHudULG() {
  if (!window.ultraLowGraphics) return;
  if (!window.allFighters) return;
  
  const controlledFighter = getPlayerControlledFighter();
  if (!controlledFighter) return;
  
  // Draw simple HP bar (bottom left)
  const barX = 20;
  const barY = height - 40;
  const barW = 250;
  const barH = 16;
  
  // Background
  fill(30, 30, 30, 200);
  noStroke();
  rect(barX, barY, barW, barH, 4);
  
  // HP fill
  const hpPercent = controlledFighter.hp / controlledFighter.maxHp;
  let hpColor;
  if (hpPercent > 0.6) hpColor = ULG_COLORS.HP_BAR;
  else if (hpPercent > 0.3) hpColor = ULG_COLORS.HP_BAR_MID;
  else hpColor = ULG_COLORS.HP_BAR_LOW;
  
  fill(hpColor[0], hpColor[1], hpColor[2]);
  rect(barX + 2, barY + 2, (barW - 4) * hpPercent, barH - 4, 3);
  
  // HP text
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(14);
  text(`${controlledFighter.hp.toFixed(0)} / ${controlledFighter.maxHp}`, barX + 8, barY + barH/2);
  
  // Fighter name
  fill(200);
  textSize(12);
  text(controlledFighter.name || 'Player', barX, barY - 10);
  
  // Draw opponent HP bars (top right)
  const opponents = window.allFighters.filter(f => f !== controlledFighter);
  opponents.forEach((opponent, i) => {
    const oppBarX = width - 270;
    const oppBarY = 20 + i * 60;
    const oppBarW = 250;
    const oppBarH = 14;
    
    fill(30, 30, 30, 200);
    rect(oppBarX, oppBarY, oppBarW, oppBarH, 4);
    
    const oppHpPercent = opponent.hp / opponent.maxHp;
    fill(opponent.isDefeated ? ULG_COLORS.HP_BAR_LOW : ULG_COLORS.HP_BAR);
    rect(oppBarX + 2, oppBarY + 2, (oppBarW - 4) * oppHpPercent, oppBarH - 4, 3);
    
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(`${opponent.name || 'Opponent'}`, oppBarX, oppBarY - 8);
    text(`${opponent.hp.toFixed(0)}`, oppBarX + 8, oppBarY + oppBarH/2);
    
    // Draw defeat indicator
    if (opponent.isDefeated) {
      fill(255, 60, 60);
      text('DEFEATED', oppBarX + oppBarW/2, oppBarY + oppBarH/2);
    }
  });
  
  // Battle timer (center top)
  if (typeof battleTimer !== 'undefined') {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(`${battleTimer.toFixed(1)}s`, width / 2, 16);
  }
  
  // Dash charges
  const dashY = height - 18;
  const dashCount = controlledFighter.dashCharges || 0;
  for (let i = 0; i < 3; i++) {
    fill(i < dashCount ? [100, 200, 255] : [60, 60, 60]);
    rect(20 + i * 22, dashY, 18, 6, 2);
  }
  
  // Combo counter
  if (controlledFighter.combo > 1) {
    fill(255, 220, 80);
    textAlign(LEFT, CENTER);
    textSize(20);
    text(`COMBO x${controlledFighter.combo}`, barX, barY - 30);
  }
  
  // Stagger bar
  const staggerPercent = controlledFighter.stagger / (controlledFighter.staggerThreshold || 1000);
  if (staggerPercent > 0) {
    fill(30, 30, 30, 200);
    rect(barX, barY + barH + 6, barW, 8, 3);
    fill(255, 100 + staggerPercent * 50, 50);
    rect(barX + 1, barY + barH + 7, (barW - 2) * Math.min(1, staggerPercent), 6, 2);
  }
}

/**
 * Draw damage numbers as simple text in ULG mode
 */
function drawDamageNumberULG(damage, pos, isCrit, damageType) {
  if (!window.ultraLowGraphics) return;
  
  push();
  textAlign(CENTER, CENTER);
  
  if (isCrit) {
    fill(255, 200, 50);
    textSize(24);
  } else {
    fill(255, 255, 100);
    textSize(18);
  }
  
  noStroke();
  text(Math.round(damage).toString(), pos.x, pos.y);
  pop();
}

/**
 * Draw a simple shadow ellipse for fighters in ULG mode
 */
function drawShadowULG(fighter) {
  if (!window.ultraLowGraphics) return;
  if (fighter.isDefeated) return;
  
  const groundY = fighter.spawnY - 34;
  push();
  fill(0, 0, 0, 80);
  noStroke();
  ellipse(fighter.pos.x, groundY, 40, 10);
  pop();
}