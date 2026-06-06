// ==========================
// 🔥 BATTLE UI - ATLAS REWORK
// Uses sprites from public/data/UI/battleui.png
// Cell size: 64x64 (BATTLE_UI_CELL)
// Arena: 1200x720
// ==========================

function drawReadyScreen() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(30);
  text('BIMBUSGAME:', width / 2, height / 2 - 80);
  textSize(18);
  text('WASD move, Right Click attack, Left Click defend, E evade', width / 2, height / 2 - 30);
  text('Hold Right Click to charge heavy attack. Press ENTER to start.', width / 2, height / 2 + 0);
  pop();
}

function drawSummary() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(36);
  text(summaryText, width / 2, height / 2 - 80);
  if (typeof showCombatOverMenu !== 'undefined' && showCombatOverMenu) {
    const panelW = 520;
    const panelH = 220;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2 + 20;
    push();
    fill(12, 12, 12, 220);
    stroke(255, 60);
    rect(panelX, panelY, panelW, panelH, 12);
    pop();
    const btnW = 220;
    const btnH = 48;
    const gap = 24;
    const leftX = panelX + (panelW / 2) - btnW - (gap / 2);
    const rightX = panelX + (panelW / 2) + (gap / 2);
    const btnY = panelY + panelH - 80;
    push();
    fill(40, 110, 200);
    noStroke();
    rect(leftX, btnY, btnW, btnH, 8);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('Return to Character Select', leftX + btnW / 2, btnY + btnH / 2);
    pop();
    push();
    fill(60, 180, 90);
    noStroke();
    rect(rightX, btnY, btnW, btnH, 8);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('Restart Duel', rightX + btnW / 2, btnY + btnH / 2);
    pop();
    textSize(14);
    fill(200);
    text(`Time: ${battleTimer.toFixed(1)}s`, width / 2, panelY + 40);
  } else {
    textSize(18);
    text('Press ENTER to restart the duel.', width / 2, height / 2 + 0);
    text(`Time: ${battleTimer.toFixed(1)}s`, width / 2, height / 2 + 40);
  }
  pop();
}

// ==========================
// 🎯 MAIN HUD
// ==========================
function drawHud() {
  drawBattleTimer();
  drawPlayerHud();
  if (window.allFighters && window.allFighters.length >= 2) {
    drawMultiPlayerHuds();
  }
  drawPauseMenuButton();
}

// ==========================
// 👤 PLAYER HUD (bottom-left)
// ==========================
function drawPlayerHud() {
  const controlledFighter = getPlayerControlledFighter();
  if (!controlledFighter) return;
  const fighter = controlledFighter;

  // --- Positions ---
  const titleX = 12;                       // left edge
  const titleY = height - 196;             // top of player hud stack
  const titleW = 384;                      // fallbacktitle = 6 cells
  const titleH = 64;                       // 1 cell
  const barW = titleW;
  const barStartY = titleY + titleH + 4;   // HP bar starts below title

  // === Title bar (fallbacktitle) ===
  drawBattleUISprite('fallbacktitle', titleX + titleW/2, titleY + titleH/2, titleW, titleH);

  // === Text overlay on title ===
  push();
  noStroke();
  const safeHp = (fighter.hp !== null && fighter.hp !== undefined) ? fighter.hp : 0;
  const safeMaxHp = (fighter.maxHp !== null && fighter.maxHp !== undefined) ? fighter.maxHp : 1;
  const hpPercent = safeHp / safeMaxHp;

  fill(255);
  textAlign(LEFT, CENTER);
  textSize(13);
  text(fighter.name, titleX + 14, titleY + 18);

  textAlign(RIGHT, CENTER);
  text(`${safeHp.toFixed(0)} / ${safeMaxHp}`, titleX + titleW - 14, titleY + 18);

  textAlign(LEFT, CENTER);
  textSize(10);
  fill(200);
  text(`State: ${fighter.state}`, titleX + 14, titleY + 38);
  text(`Combo: ${fighter.combo}`, titleX + 14, titleY + 54);
  pop();

  // === HP Bar ===
  push();
  noStroke();
  fill(20, 20, 20, 180);
  rect(titleX, barStartY, barW, 8, 4);
  if (hpPercent > 0.6) fill(66, 212, 146);
  else if (hpPercent > 0.3) fill(255, 204, 51);
  else fill(217, 77, 77);
  rect(titleX, barStartY, barW * hpPercent, 8, 4);
  pop();

  // === Stagger Bar ===
  const staggerY = barStartY + 12;
  const staggerPercent = constrain(fighter.stagger / fighter.staggerThreshold, 0, 1);
  push();
  noStroke();
  fill(20, 20, 20, 180);
  rect(titleX, staggerY, barW, 6, 3);
  if (staggerPercent > 0) {
    fill(255, 100 + staggerPercent * 50, 50);
    rect(titleX, staggerY, barW * staggerPercent, 6, 3);
  }
  pop();

  // === Dash Charges (ring sprites) ===
  const dashY = staggerY + 10;
  drawDashChargesRing(fighter, titleX, dashY, barW);

  // === Ultimate Gauge Indicator (above ability icon) ===
  const ultX = titleX + 200;
  const ultY = titleY - 30; // above the title bar
  // Use closingui sprite as placeholder for all characters
  const ultActive = fighter.ultimateActive || fighter.ultimateMeter >= 100;
  drawBattleUISprite(ultActive ? 'closingui' : 'closingdeactiveui', ultX, ultY, 140, 32);

  // Ability Icon (bottom-right of player hud area)
  const abilityX = titleX + titleW + 16;
  const abilityY = titleY + titleH - 32; // align with bottom of title bar area

  // Background slot
  drawBattleUISprite('fallbackability', abilityX, abilityY, 64, 64);

  // Character-specific ability icon (drawn on top of slot)
  if (fighter.characterKey === 'CALLISTO') {
    drawBattleAbilityIcon(fighter, 'cability', 'coff', fighter.installationArtActive, fighter.installationArtCooldown, 10, abilityX, abilityY, 64);
  } else if (fighter.characterKey === 'VALENCINA') {
    const valActive = fighter.lastHitOpponent && fighter.lastHitOpponent.gameTimeTarget;
    drawBattleAbilityIcon(fighter, 'vability', 'voff', valActive, fighter.timeToHuntCooldown, 15, abilityX, abilityY, 64);
  } else if (fighter.characterKey === 'DIHUI') {
    drawBattleAbilityIcon(fighter, 'dability', 'doff', fighter.deathedgeActive, fighter.deathedgeCooldown, 14, abilityX, abilityY, 64);
  }
}

// Generic ability icon drawer
function drawBattleAbilityIcon(fighter, activeName, offName, isActive, cooldown, maxCd, x, y, size) {
  // Draw icon based on state
  if (isActive) {
    drawBattleUISprite(activeName, x, y, size, size);
  } else if (cooldown > 0) {
    drawBattleUISprite(offName, x, y, size, size);
  } else {
    drawBattleUISprite(activeName, x, y, size, size);
  }

  // Cooldown overlay
  if (cooldown > 0) {
    push();
    noStroke();
    fill(0, 150);
    const cdH = (cooldown / maxCd) * size;
    rectMode(CORNER);
    rect(x - size/2, y + size/2 - cdH, size, cdH);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(10);
    text(cooldown.toFixed(1), x, y);
    pop();
  }

  // Activation glow
  if (isActive) {
    push();
    noFill();
    stroke('#ffcc33');
    strokeWeight(2);
    rect(x - size/2 - 1, y - size/2 - 1, size + 2, size + 2, 4);
    pop();
  }

  // Key hint
  push();
  fill(255, 200);
  textAlign(CENTER, TOP);
  textSize(9);
  text('Q', x, y + size/2 + 4);
  pop();
}

function getOpponentFighter() {
  const controlledFighter = getPlayerControlledFighter();
  if (!controlledFighter) return null;
  return controlledFighter === player ? enemy : player;
}

// ==========================
// 👥 MULTI-PLAYER HUD PANELS (top-right)
// ==========================
function drawMultiPlayerHuds() {
  if (!window.allFighters) return;
  const controlledFighter = getPlayerControlledFighter();
  const others = window.allFighters.filter(f => f !== controlledFighter);
  others.forEach((fighter, i) => {
    const x = width - 330;
    const y = 80 + i * 140;
    drawFighterHudPanel(fighter, x, y);
  });
}

function drawFighterHudPanel(fighter, panelX, panelY) {
  const isDefeated = fighter.isDefeated;
  const charKey = fighter.characterKey;
  const panelW = 320; // 5 cells * 64
  const panelH = 128; // 2 cells * 64

  // Pick correct enemy bar sprite
  let sprite = 'fallbackenemy';
  let dedSprite = 'fallbackenemy';
  if (charKey === 'DIHUI') { sprite = 'dihuienemy'; dedSprite = 'dihuienemyded'; }
  else if (charKey === 'VALENCINA') { sprite = 'valenemy'; dedSprite = 'valenemyded'; }
  else if (charKey === 'CALLISTO') { sprite = 'calenemy'; dedSprite = 'calenemyded'; }

  drawBattleUISprite(isDefeated ? dedSprite : sprite, panelX + panelW/2, panelY + panelH/2, panelW, panelH);

  // Overlay info
  push();
  noStroke();
  fill(isDefeated ? '#ff6464' : '#ffffff');
  textAlign(LEFT, CENTER);
  textSize(12);
  const label = `P${fighter.playerId || 1}`;
  text(label, panelX + 12, panelY + 18);
  textSize(13);
  text(isDefeated ? 'DEFEATED' : fighter.name, panelX + 50, panelY + 18);

  if (!isDefeated) {
    const safeHp = fighter.hp !== null && fighter.hp !== undefined ? fighter.hp : 0;
    const safeMaxHp = fighter.maxHp || 100;
    fill('#ffffff');
    textSize(11);
    text(`HP: ${safeHp.toFixed(0)} / ${safeMaxHp}`, panelX + 12, panelY + 44);
    fill(200);
    textSize(10);
    text(`State: ${fighter.state || 'unknown'}`, panelX + 12, panelY + 62);

    const comboRatio = constrain(fighter.comboTimer / fighter.comboTimeout, 0, 1);
    fill('#ffcc33');
    textSize(13);
    text(`Combo: ${fighter.combo}`, panelX + 12, panelY + 82);
    fill('#111');
    rect(panelX + 12, panelY + 94, panelW - 24, 6, 3);
    fill('#ffcc33');
    rect(panelX + 12, panelY + 94, (panelW - 24) * comboRatio, 6, 3);
  }

  const hpBarX = panelX + 12;
  const hpBarY = panelY + panelH - 18;
  const hpBarW = panelW - 24;
  fill('#222');
  rect(hpBarX, hpBarY, hpBarW, 6, 3);
  fill(isDefeated ? '#663333' : '#42d492');
  rect(hpBarX, hpBarY, hpBarW * (isDefeated ? 0 : fighter.hp / fighter.maxHp), 6, 3);

  if (!isDefeated) {
    fill('#222');
    rect(hpBarX, hpBarY + 10, hpBarW, 4, 2);
    const staggerPercent = constrain(fighter.stagger / fighter.staggerThreshold, 0, 1);
    if (staggerPercent > 0) {
      fill(255, 100 + staggerPercent * 50, 50);
      rect(hpBarX, hpBarY + 10, hpBarW * staggerPercent, 4, 2);
    }
  }
  pop();
}

// ==========================
// 💡 OVERHEAD HEALTHBARS
// ==========================
function drawOverheadHealthbars() {
  if (!window.allFighters) {
    drawOverheadHealthbar();
    return;
  }
  const controlledFighter = getPlayerControlledFighter();
  if (controlledFighter && !controlledFighter.isDefeated) {
    drawPlayerIndicator(controlledFighter);
  }
  window.allFighters.forEach(fighter => {
    if (fighter.isPlayerControlled) return;
    push();
    const barWidth = 60;
    const barHeight = 4;
    const nameOffset = 15;
    const barOffset = 3;
    const controlTypeOffset = 28;
    const fx = fighter.pos.x;
    const fy = fighter.pos.y - 60;

    fill(fighter.isDefeated ? '#ff6464' : '#ffffff');
    textAlign(CENTER, CENTER);
    textSize(10);
    stroke(0, 0, 0, 150);
    strokeWeight(2);
    let name = fighter.isDefeated ? 'DEFEATED' : (fighter.playerId ? `P${fighter.playerId}: ${fighter.name}` : fighter.name);
    text(name, fx, fy - nameOffset);

    if (!fighter.isDefeated) {
      fill(fighter.isAI ? '#ff9664' : '#64c8ff');
      textSize(8);
      text(fighter.isAI ? 'AI' : 'player', fx, fy - controlTypeOffset);
    }

    noStroke();
    fill(0, 0, 0, 150);
    rect(fx - barWidth/2, fy - barOffset, barWidth, barHeight, 2);
    if (fighter.isDefeated) {
      fill(100, 50, 50);
    } else {
      const hp = fighter.hp / fighter.maxHp;
      fill(hp > 0.6 ? '#42d492' : hp > 0.3 ? '#ffcc33' : '#d94d4d');
      rect(fx - barWidth/2, fy - barOffset, barWidth * hp, barHeight, 2);
    }
    pop();
  });
}

function drawPlayerIndicator(fighter) {
  push();
  fill(100, 255, 100);
  stroke(0, 0, 0, 200);
  strokeWeight(2);
  const s = 20;
  triangle(
    fighter.pos.x - s/2, fighter.pos.y - 90 - s/2,
    fighter.pos.x + s/2, fighter.pos.y - 90 - s/2,
    fighter.pos.x, fighter.pos.y - 90 + s/2
  );
  pop();
}

// ==========================
// ⚡ DASH CHARGES (ring sprites)
// ==========================
function drawDashChargesRing(fighter, x, y, width) {
  const count = fighter.dashCharges;
  const total = 3;
  // Each charge segment: 3 cells * 64 = 192 native, displayed at ~24x24
  const segSize = min(24, (width - (total - 1) * 8) / total);
  push();
  noStroke();
  for (let i = 0; i < total; i++) {
    const cx = x + i * (segSize + 8) + segSize/2;
    if (i < count) {
      drawBattleUISprite('ring', cx, y + segSize/2, segSize, segSize);
    } else {
      drawBattleUISprite('ringoff', cx, y + segSize/2, segSize, segSize);
    }
  }
  pop();
}

// ==========================
// 📋 STATUS PANEL
// ==========================
function drawStatusPanel(fighter, x, y) {
  push();
  fill(20, 160);
  stroke(255, 20);
  rect(x, y, 220, 110, 10);
  noStroke();
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  const safeHp = (fighter.hp !== null && fighter.hp !== undefined) ? fighter.hp : 0;
  const safeMaxHp = (fighter.maxHp !== null && fighter.maxHp !== undefined) ? fighter.maxHp : 1;
  text(`${fighter.name}`, x + 12, y + 10);
  text(`HP: ${safeHp.toFixed(0)} / ${safeMaxHp}`, x + 12, y + 28);
  text(`Combo: ${fighter.combo}`, x + 12, y + 46);
  text(`State: ${fighter.state}`, x + 12, y + 64);
  const barWidth = 196;
  fill('#222');
  rect(x + 12, y + 86, barWidth, 14, 6);
  fill('#42d492');
  rect(x + 12, y + 86, barWidth * (safeHp / safeMaxHp), 14, 6);
  const comboRatio = constrain(fighter.comboTimer / fighter.comboTimeout, 0, 1);
  fill('#222');
  rect(x + 12, y + 104, barWidth, 10, 5);
  fill('#ffcc33');
  rect(x + 12, y + 104, barWidth * comboRatio, 10, 5);
  drawStatusRows(fighter, x + 12, y + 124);
  pop();
}

function drawStatusRows(fighter, x, y) {
  const rowHeight = 22;
  const statusCount = min(14, fighter.statuses.length);
  for (let index = 0; index < statusCount; index++) {
    const status = fighter.statuses[index];
    const row = floor(index / 7);
    const col = index % 7;
    const px = x + col * 30;
    const py = y + row * rowHeight;
    fill(255);
    textSize(8);
    textAlign(LEFT, CENTER);
    text(status.potency, px + 2, py + 9);
    drawStatusIcon(status.type, px + 15, py + 9, 21);
    fill(255);
    textSize(8);
    textAlign(RIGHT, CENTER);
    text(status.count, px + 25, py + 9);
  }
}

// ==========================
// ☰ PAUSE MENU BUTTON
// ==========================
function drawPauseMenuButton() {
  const s = 40;
  const bx = width - s - 12;
  const by = 12;
  push();
  fill(50, 50, 50, 200);
  stroke(255, 100);
  strokeWeight(2);
  rect(bx, by, s, s, 8);
  stroke(255);
  strokeWeight(3);
  const sp = 8;
  const ly = by + s/2;
  line(bx + 10, ly - sp, bx + s - 10, ly - sp);
  line(bx + 10, ly, bx + s - 10, ly);
  line(bx + 10, ly + sp, bx + s - 10, ly + sp);
  pop();
}

// ==========================
// ⏱ BATTLE TIMER (romanui)
// ==========================
function drawBattleTimer() {
  if (typeof battleState === 'undefined' || battleState !== 'battle') return;
  // romanui is 6x2 = 384x128 native, display at ~256x64
  push();
  drawBattleUISprite('romanui', width / 2, 28, 240, 64);
  pop();

  push();
  resetMatrix();
  textAlign(CENTER, CENTER);
  textSize(20);
  noStroke();
  fill(255);
  const display = (typeof battleTimer !== 'undefined') ? battleTimer.toFixed(1) : '0.0';
  text(`${display}s`, width / 2, 28);
  pop();
}

// ==========================
// 📋 PAUSE MENU
// ==========================
function drawPauseMenu() {
  const menuWidth = 300;
  const menuHeight = 200;
  const menuX = (width - menuWidth) / 2;
  const menuY = (height - menuHeight) / 2;
  push();
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, 0, width, height);
  fill(30, 30, 30, 240);
  stroke(255, 100);
  strokeWeight(2);
  rect(menuX, menuY, menuWidth, menuHeight, 12);
  fill(255);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(24);
  text('PAUSED', width / 2, menuY + 20);
  const options = ['SETTINGS', 'FORFEIT MATCH'];
  const optionHeight = 50;
  const optionStartY = menuY + 60;
  options.forEach((option, index) => {
    const optionY = optionStartY + (index * optionHeight);
    const isSelected = index === pauseMenuOption;
    if (isSelected) {
      fill(60, 60, 80, 200);
      stroke(100, 150, 255);
    } else {
      fill(40, 40, 40, 200);
      stroke(255, 50);
    }
    strokeWeight(1);
    rect(menuX + 20, optionY, menuWidth - 40, 40, 8);
    if (isSelected) {
      fill(100, 150, 255);
    } else {
      fill(200);
    }
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    text(option, width / 2, optionY + 20);
  });
  fill(150);
  textSize(12);
  text('Use UP/DOWN to select, ENTER to confirm, ESC to close', width / 2, menuY + menuHeight - 20);
  pop();
}

function drawSettingsPanel() {
  const panelWidth = 500;
  const panelHeight = 320;
  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2;
  push();
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  fill(28, 28, 28, 240);
  stroke(255, 100);
  strokeWeight(2);
  rect(panelX, panelY, panelWidth, panelHeight, 12);
  noStroke();
  fill(255);
  textAlign(CENTER, TOP);
  textSize(26);
  text('SETTINGS (Placeholder)', width / 2, panelY + 18);
  fill(200);
  textSize(14);
  textAlign(LEFT, TOP);
  text('- Audio: (placeholder)', panelX + 24, panelY + 64);
  text('- Controls: (placeholder)', panelX + 24, panelY + 88);
  text('- Graphics: (placeholder)', panelX + 24, panelY + 112);
  fill(180);
  textSize(12);
  textAlign(CENTER, TOP);
  text('Click anywhere or press ESC to go back', width / 2, panelY + panelHeight - 28);
  pop();
}

// ==========================
// 🏆 COMBAT OVER / RESULT SCREEN
// ==========================
function drawCombatOver() {
  push();
  for (let i = 0; i < height; i += 8) {
    const t = i / height;
    fill(18 + t * 50, 16 + t * 30, 40 + t * 80, 220);
    noStroke();
    rect(0, i, width, 8);
  }
  push();
  noFill();
  stroke(255, 24);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width / 2, height / 2, width * 0.92, height * 0.86, 44);
  pop();

  // Win/Lose sprite (6x6 = 384x384 native, display at 60% = ~230x230)
  const isWin = combatOverOutcome && combatOverOutcome.toLowerCase().includes('win');
  drawBattleUISprite(isWin ? 'win' : 'lose', width / 2, 150, 230, 230);

  textAlign(CENTER, CENTER);
  textSize(48);
  noStroke();
  fill(248, 200, 92);
  text(combatOverOutcome || 'COMBAT OVER', width / 2, 310);

  textSize(22);
  fill(220);
  text(combatOverLine || summaryText || 'Combat has ended.', width / 2, 350);

  const panelW = 620;
  const panelH = 340;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2 + 30;
  push();
  fill(10, 10, 18, 220);
  stroke(255, 64);
  strokeWeight(1.5);
  rect(panelX, panelY, panelW, panelH, 18);
  pop();
  push();
  noFill();
  stroke(255, 16);
  strokeWeight(1);
  for (let ring = 0; ring < 3; ring++) {
    rect(panelX + panelW / 2, panelY + panelH / 2, panelW - ring * 50, panelH - ring * 50, 18);
  }
  pop();

  const btnW = 300;
  const btnH = 56;
  const btnX = panelX + (panelW - btnW) / 2;
  const btnY = panelY + panelH - 100;
  combatOverButtons = [];
  const returnBtn = new UIButton(btnX, btnY, btnW, btnH, () => {
    resetLobbyReadyState();
    window.allFighters = null;
    player = null;
    enemy = null;
    showCombatOverMenu = false;
    setBattleState(BATTLE_STATES.LOBBY);
  });
  returnBtn.draw('Return to Lobby', {
    stroke: [120, 180, 255],
    fill: [40, 80, 180],
    text: 255,
    textSize: 18,
    radius: 12
  });
  combatOverButtons.push(returnBtn);
  push();
  fill(180);
  textSize(14);
  text(`Time: ${battleTimer.toFixed(1)}s`, width / 2, panelY + 36);
  pop();
  pop();
}