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

  // If ending sequence transitioned to summary, show combat over menu
  if (typeof showCombatOverMenu !== 'undefined' && showCombatOverMenu) {
    // Draw result panel
    const panelW = 520;
    const panelH = 220;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2 + 20;
    push();
    fill(12, 12, 12, 220);
    stroke(255, 60);
    rect(panelX, panelY, panelW, panelH, 12);
    pop();

    // Draw buttons: Return to Character Select, Restart Duel
    const btnW = 220;
    const btnH = 48;
    const gap = 24;
    const leftX = panelX + (panelW / 2) - btnW - (gap / 2);
    const rightX = panelX + (panelW / 2) + (gap / 2);
    const btnY = panelY + panelH - 80;

    // Draw left button
    push();
    fill(40, 110, 200);
    noStroke();
    rect(leftX, btnY, btnW, btnH, 8);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('Return to Character Select', leftX + btnW / 2, btnY + btnH / 2);
    pop();

    // Draw right button
    push();
    fill(60, 180, 90);
    noStroke();
    rect(rightX, btnY, btnW, btnH, 8);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('Restart Duel', rightX + btnW / 2, btnY + btnH / 2);
    pop();

    // Draw small time/info text
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

function drawHud() {
  drawBattleTimer();
  drawPlayerHud();
  
  // Draw multi-player HUDs for all non-player-controlled fighters
  if (window.allFighters && window.allFighters.length >= 2) {
    drawMultiPlayerHuds();
  }
  
  // Draw pause menu button
  drawPauseMenuButton();
}

function drawPlayerHud() {
  const controlledFighter = getPlayerControlledFighter();
  if (!controlledFighter) return;
  
  const panelX = 16;
  const panelY = height - 148;
  const panelWidth = 240;
  const panelHeight = 132;
  const comboSize = 16 + min(18, controlledFighter.combo * 1.5);
  const comboRatio = constrain(controlledFighter.comboTimer / controlledFighter.comboTimeout, 0, 1);

  push();
  fill(20, 180);
  stroke(255, 20);
  rect(panelX, panelY, panelWidth, panelHeight, 10);
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(comboSize);
  text(`Combo: ${controlledFighter.combo}`, panelX + 12, panelY + 12);
  textSize(12);
  fill('#222');
  rect(panelX + 12, panelY + 12 + comboSize + 8, panelWidth - 24, 10, 5);
  fill('#ffcc33');
  rect(panelX + 12, panelY + 12 + comboSize + 8, (panelWidth - 24) * comboRatio, 10, 5);

  fill(255);
  textSize(14);
  text(`Name: ${controlledFighter.name}`, panelX + 12, panelY + 52);
  text(`HP: ${controlledFighter.hp.toFixed(0)} / ${controlledFighter.maxHp}`, panelX + 12, panelY + 72);
  text(`State: ${controlledFighter.state}`, panelX + 12, panelY + 92);

  const hpBarX = panelX + 12;
  const hpBarY = panelY + 110;
  const hpWidth = panelWidth - 24;
  fill('#222');
  rect(hpBarX, hpBarY, hpWidth, 8, 4);
  fill('#42d492');
  rect(hpBarX, hpBarY, hpWidth * (controlledFighter.hp / controlledFighter.maxHp), 8, 4);
  
  // Stagger Bar
  fill('#222');
  rect(hpBarX, hpBarY + 14, hpWidth, 6, 3);
  const staggerPercent = constrain(controlledFighter.stagger / controlledFighter.staggerThreshold, 0, 1);
  if (staggerPercent > 0) {
    fill(255, 100 + staggerPercent * 50, 50);
    rect(hpBarX, hpBarY + 14, hpWidth * staggerPercent, 6, 3);
  }
  
  drawDashCharges(controlledFighter, hpBarX, hpBarY + 24, hpWidth);
  
  // Draw Installation Art ability icon and cooldown for Callisto
  if (controlledFighter.characterKey === 'CALLISTO') {
    drawInstallationArtUI(controlledFighter, panelX + panelWidth + 8, panelY + panelHeight - 48);
  }
  
  // Draw Time to Hunt ability icon and cooldown for Valencina
  if (controlledFighter.characterKey === 'VALENCINA') {
    drawTimeToHuntUI(controlledFighter, panelX + panelWidth + 8, panelY + panelHeight - 48);
  }
  
  pop();
}

function getOpponentFighter() {
  const controlledFighter = getPlayerControlledFighter();
  if (!controlledFighter) return null;
  return controlledFighter === player ? enemy : player;
}

function drawInstallationArtUI(fighter, x, y) {
  const iconSize = 48;
  const cooldown = fighter.installationArtCooldown || 0;
  const maxCooldown = 10;
  const isActive = fighter.installationArtActive || false;
  
  push();
  
  // Draw ability icon background
  fill(isActive ? '#ffcc33' : '#333');
  stroke(255, 100);
  strokeWeight(2);
  rect(x, y, iconSize, iconSize, 8);
  
  // Draw ability icon (using text as placeholder for now)
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(20);
  text('🎨', x + iconSize/2, y + iconSize/2);
  
  // Draw cooldown overlay
  if (cooldown > 0) {
    fill(0, 150);
    noStroke();
    const cooldownHeight = (cooldown / maxCooldown) * iconSize;
    rect(x, y + (iconSize - cooldownHeight), iconSize, cooldownHeight, 8);
    
    // Draw cooldown text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(cooldown.toFixed(1), x + iconSize/2, y + iconSize/2);
  }
  
  // Draw activation indicator
  if (isActive) {
    stroke('#ffcc33');
    strokeWeight(3);
    noFill();
    rect(x - 2, y - 2, iconSize + 4, iconSize + 4, 10);
  }
  
  // Draw key hint
  fill(255, 200);
  textAlign(CENTER, TOP);
  textSize(10);
  text('Q', x + iconSize/2, y + iconSize + 4);
  
  pop();
}

function drawTimeToHuntUI(fighter, x, y) {
  const iconSize = 48;
  const cooldown = fighter.timeToHuntCooldown || 0;
  const maxCooldown = 15;
  const isActive = fighter.lastHitOpponent && fighter.lastHitOpponent.gameTimeTarget;
  
  push();
  
  // Draw ability icon background
  fill(isActive ? '#ff6b9d' : '#333');
  stroke(255, 100);
  strokeWeight(2);
  rect(x, y, iconSize, iconSize, 8);
  
  // Draw ability icon (using text as placeholder for now)
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(20);
  text('⚡', x + iconSize/2, y + iconSize/2);
  
  // Draw cooldown overlay
  if (cooldown > 0) {
    fill(0, 150);
    noStroke();
    const cooldownHeight = (cooldown / maxCooldown) * iconSize;
    rect(x, y + (iconSize - cooldownHeight), iconSize, cooldownHeight, 8);
    
    // Draw cooldown text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(cooldown.toFixed(1), x + iconSize/2, y + iconSize/2);
  }
  
  // Draw activation indicator
  if (isActive) {
    stroke('#ff6b9d');
    strokeWeight(3);
    noFill();
    rect(x - 2, y - 2, iconSize + 4, iconSize + 4, 10);
  }
  
  // Draw key hint
  fill(255, 200);
  textAlign(CENTER, TOP);
  textSize(10);
  text('Q', x + iconSize/2, y + iconSize + 4);
  
  pop();
}

function drawMultiPlayerHuds() {
  if (!window.allFighters) return;
  
  const controlledFighter = getPlayerControlledFighter();
  // Filter out the controlled/local player's fighter to show all other fighters
  // In local CPU mode, !isPlayerControlled works. In network room mode, all fighters have
  // isPlayerControlled=true, so we use reference comparison against the controlled fighter.
  const otherFighters = window.allFighters.filter(f => f !== controlledFighter);
  
  // Draw HUD panels for other fighters in top right
  const startX = width - 256;
  const startY = 16;
  const panelSpacing = 140;
  
  otherFighters.forEach((fighter, index) => {
    const panelX = startX;
    const panelY = startY + (index * panelSpacing);
    drawFighterHudPanel(fighter, panelX, panelY, `P${fighter.playerId || index + 1}`);
  });
}

function drawFighterHudPanel(fighter, panelX, panelY, playerLabel) {
  const panelWidth = 240;
  const panelHeight = 120;
  const comboSize = 14 + min(16, fighter.combo * 1.2);
  const comboRatio = constrain(fighter.comboTimer / fighter.comboTimeout, 0, 1);

  push();
  fill(20, 180);
  stroke(255, 20);
  rect(panelX, panelY, panelWidth, panelHeight, 10);
  noStroke();
  
  // Player label and name
  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);
  text(playerLabel, panelX + 12, panelY + 8);
  
  // Show DEFEATED status or name
  if (fighter.isDefeated) {
    fill(255, 100, 100);
    textSize(14);
    text('DEFEATED', panelX + 50, panelY + 8);
  } else {
    fill(255);
    textSize(14);
    text(fighter.name, panelX + 50, panelY + 8);
  }
  
  // Combo (only for non-defeated players)
  if (!fighter.isDefeated) {
    textSize(comboSize);
    text(`Combo: ${fighter.combo}`, panelX + 12, panelY + 28);
    textSize(10);
    fill('#222');
    rect(panelX + 12, panelY + 28 + comboSize + 4, panelWidth - 24, 8, 4);
    fill('#ffcc33');
    rect(panelX + 12, panelY + 28 + comboSize + 4, (panelWidth - 24) * comboRatio, 8, 4);
  }

  // Stats
  fill(255);
  textSize(12);
  if (fighter.isDefeated) {
    text('HP: 0 / ' + fighter.maxHp, panelX + 12, panelY + 52);
    text('State: DEFEATED', panelX + 12, panelY + 68);
  } else {
    text(`HP: ${fighter.hp.toFixed(0)} / ${fighter.maxHp}`, panelX + 12, panelY + 52);
    text(`State: ${fighter.state}`, panelX + 12, panelY + 68);
  }
  
  // Health bar
  const hpBarX = panelX + 12;
  const hpBarY = panelY + 86;
  const hpWidth = panelWidth - 24;
  fill('#222');
  rect(hpBarX, hpBarY, hpWidth, 6, 3);
  
  if (fighter.isDefeated) {
    fill(100, 50, 50); // Dark red for defeated
  } else {
    fill('#42d492');
  }
  rect(hpBarX, hpBarY, hpWidth * (fighter.isDefeated ? 0 : fighter.hp / fighter.maxHp), 6, 3);
  
  // Stagger bar (only for non-defeated players)
  if (!fighter.isDefeated) {
    fill('#222');
    rect(hpBarX, hpBarY + 10, hpWidth, 4, 2);
    const staggerPercent = constrain(fighter.stagger / fighter.staggerThreshold, 0, 1);
    if (staggerPercent > 0) {
      fill(255, 100 + staggerPercent * 50, 50);
      rect(hpBarX, hpBarY + 10, hpWidth * staggerPercent, 4, 2);
    }
  }
  
  pop();
}

function drawOverheadHealthbars() {
  if (!window.allFighters) {
    // Fallback to original function for 2-player battles
    drawOverheadHealthbar();
    return;
  }
  
  // Draw triangular indicator above player-controlled fighter
  const controlledFighter = getPlayerControlledFighter();
  if (controlledFighter && !controlledFighter.isDefeated) {
    drawPlayerIndicator(controlledFighter);
  }
  
  // Draw overhead healthbars for all non-player-controlled fighters
  window.allFighters.forEach(fighter => {
    if (fighter.isPlayerControlled) return;
    
    push();
    
    // Calculate position above fighter's head
    const barWidth = 60;
    const barHeight = 4;
    const nameOffset = 15;
    const barOffset = 3;
    const controlTypeOffset = 28;
    
    // Get fighter's position and apply camera transforms
    const fighterX = fighter.pos.x;
    const fighterY = fighter.pos.y - 60;
    
    // Draw name with player identifier and defeated status
    if (fighter.isDefeated) {
      fill(255, 100, 100);
    } else {
      fill(255);
    }
    textAlign(CENTER, CENTER);
    textSize(10);
    stroke(0, 0, 0, 150);
    strokeWeight(2);
    
    let displayName;
    if (fighter.isDefeated) {
      displayName = fighter.playerId ? `P${fighter.playerId}: DEFEATED` : 'DEFEATED';
    } else {
      displayName = fighter.playerId ? `P${fighter.playerId}: ${fighter.name}` : fighter.name;
    }
    text(displayName, fighterX, fighterY - nameOffset);
    
    // Draw control type (AI or Player)
    if (!fighter.isDefeated) {
      const controlType = fighter.isAI ? 'AI' : (fighter.clientId || 'player');
      if (fighter.isAI) {
        fill(255, 150, 100);
      } else {
        fill(100, 200, 255);
      }
      textSize(8);
      text(controlType, fighterX, fighterY - controlTypeOffset);
    }
    
    // Draw healthbar background
    noStroke();
    fill(0, 0, 0, 150);
    rect(fighterX - barWidth/2, fighterY - barOffset, barWidth, barHeight, 2);
    
    // Draw healthbar fill
    if (fighter.isDefeated) {
      fill(100, 50, 50); // Dark red for defeated
    } else {
      const healthPercent = fighter.hp / fighter.maxHp;
      if (healthPercent > 0.6) {
        fill(66, 212, 146);
      } else if (healthPercent > 0.3) {
        fill(255, 204, 51);
      } else {
        fill(217, 77, 77);
      }
      rect(fighterX - barWidth/2, fighterY - barOffset, barWidth * healthPercent, barHeight, 2);
    }
    
    pop();
  });
}

function drawPlayerIndicator(fighter) {
  push();
  
  const indicatorSize = 20;
  const indicatorY = fighter.pos.y - 90;
  const indicatorX = fighter.pos.x;
  
  // Draw triangular indicator pointing down
  fill(100, 255, 100);
  stroke(0, 0, 0, 200);
  strokeWeight(2);
  
  triangle(
    indicatorX - indicatorSize/2, indicatorY - indicatorSize/2,
    indicatorX + indicatorSize/2, indicatorY - indicatorSize/2,
    indicatorX, indicatorY + indicatorSize/2
  );
  
  pop();
}


function drawDashCharges(fighter, x, y, width) {
  const count = fighter.dashCharges;
  const total = 3;
  const size = (width - (total - 1) * 4) / total;
  for (let i = 0; i < total; i++) {
    fill(i < count ? '#4da6ff' : '#2f3f5f');
    rect(x + i * (size + 4), y, size, 6, 3);
  }
}

function drawStatusPanel(fighter, x, y) {
  push();
  fill(20, 160);
  stroke(255, 20);
  rect(x, y, 220, 110, 10);
  noStroke();
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  text(`${fighter.name}`, x + 12, y + 10);
  text(`HP: ${fighter.hp.toFixed(0)} / ${fighter.maxHp}`, x + 12, y + 28);
  text(`Combo: ${fighter.combo}`, x + 12, y + 46);
  text(`State: ${fighter.state}`, x + 12, y + 64);

  const barWidth = 196;
  fill('#222');
  rect(x + 12, y + 86, barWidth, 14, 6);
  fill('#42d492');
  rect(x + 12, y + 86, barWidth * (fighter.hp / fighter.maxHp), 14, 6);

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
    
    // Draw potency on the left
    fill(255);
    textSize(8);
    textAlign(LEFT, CENTER);
    text(status.potency, px, py + 9);
    
    // Draw placeholder shape in the middle
    drawStatusPlaceholder(status.type, px + 13, py + 9);
    
    // Draw status count on the right
    fill(255);
    textSize(8);
    textAlign(RIGHT, CENTER);
    text(status.count, px + 24, py + 9);
  }
}

/**
 * Draws a placeholder shape for status effects
 * @param {string} statusType - Type of status effect
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 */
function drawStatusPlaceholder(statusType, x, y) {
  push();
  fill(255, 255, 255, 200);
  stroke(0, 0, 0, 150);
  strokeWeight(1);
  
  const shapeSize = 8;
  
  switch (statusType) {
    case 'Burn':
      // Flame shape (triangle)
      triangle(x, y - shapeSize/2, x - shapeSize/2, y + shapeSize/2, x + shapeSize/2, y + shapeSize/2);
      break;
    case 'Bleed':
      // Droplet shape (circle)
      ellipse(x, y, shapeSize);
      break;
    case 'Tremor':
      // Star shape (diamond)
      push();
      translate(x, y);
      rotate(PI / 4);
      rect(-shapeSize/2, -shapeSize/2, shapeSize, shapeSize, 1);
      pop();
      break;
    case 'Rupture':
      // Burst shape (hexagon approximation)
      beginShape();
      for (let i = 0; i < 6; i++) {
        const angle = (PI * 2 / 6) * i;
        const px = x + cos(angle) * shapeSize/2;
        const py = y + sin(angle) * shapeSize/2;
        vertex(px, py);
      }
      endShape(CLOSE);
      break;
    case 'Sinking':
      // Wave shape (arc)
      arc(x, y, shapeSize, shapeSize, 0, PI);
      break;
    case 'Charge':
      // Lightning shape (zigzag)
      beginShape();
      vertex(x - shapeSize/2, y);
      vertex(x - shapeSize/4, y - shapeSize/3);
      vertex(x, y + shapeSize/3);
      vertex(x + shapeSize/4, y - shapeSize/3);
      vertex(x + shapeSize/2, y);
      endShape();
      break;
    case 'Poise':
      // Shield shape (square with rounded corners)
      rect(x - shapeSize/2, y - shapeSize/2, shapeSize, shapeSize, 2);
      break;
    default:
      // Default circle
      ellipse(x, y, shapeSize);
  }
  
  pop();
}

function statusColor(type) {
  switch (type) {
    case 'Burn': return '#ff8f1a';
    case 'Bleed': return '#d94d4d';
    case 'Tremor': return '#9f8fff';
    case 'Rupture': return '#ff4dc3';
    case 'Sinking': return '#4d9fff';
    case 'Charge': return '#ffee4d';
    case 'Poise': return '#4dff8d';
    default: return '#999';
  }
}

function drawPauseMenuButton() {
  const buttonSize = 40;
  const buttonX = width - buttonSize - 16;
  const buttonY = 16;
  
  push();
  fill(50, 50, 50, 200);
  stroke(255, 100);
  strokeWeight(2);
  rect(buttonX, buttonY, buttonSize, buttonSize, 8);
  
  // Draw three horizontal lines (menu icon)
  stroke(255);
  strokeWeight(3);
  const lineSpacing = 8;
  const lineY = buttonY + buttonSize / 2;
  line(buttonX + 10, lineY - lineSpacing, buttonX + buttonSize - 10, lineY - lineSpacing);
  line(buttonX + 10, lineY, buttonX + buttonSize - 10, lineY);
  line(buttonX + 10, lineY + lineSpacing, buttonX + buttonSize - 10, lineY + lineSpacing);
  
  pop();
}

function drawBattleTimer() {
  if (typeof battleState === 'undefined' || battleState !== 'battle') return;
  push();
  resetMatrix();
  textAlign(CENTER, TOP);
  textSize(28);
  stroke(0, 180);
  strokeWeight(3);
  fill(255);
  const display = (typeof battleTimer !== 'undefined') ? battleTimer.toFixed(1) : '0.0';
  text(`${display}s`, width / 2, 12);
  pop();
}

function drawPauseMenu() {
  const menuWidth = 300;
  const menuHeight = 200;
  const menuX = (width - menuWidth) / 2;
  const menuY = (height - menuHeight) / 2;
  
  push();
  // Semi-transparent background overlay
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, 0, width, height);
  
  // Menu panel
  fill(30, 30, 30, 240);
  stroke(255, 100);
  strokeWeight(2);
  rect(menuX, menuY, menuWidth, menuHeight, 12);
  
  // Menu title
  fill(255);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(24);
  text('PAUSED', width / 2, menuY + 20);
  
  // Menu options
  const options = ['SETTINGS', 'FORFEIT MATCH'];
  const optionHeight = 50;
  const optionStartY = menuY + 60;
  
  options.forEach((option, index) => {
    const optionY = optionStartY + (index * optionHeight);
    const isSelected = index === pauseMenuOption;
    
    // Option background
    if (isSelected) {
      fill(60, 60, 80, 200);
      stroke(100, 150, 255);
    } else {
      fill(40, 40, 40, 200);
      stroke(255, 50);
    }
    strokeWeight(1);
    rect(menuX + 20, optionY, menuWidth - 40, 40, 8);
    
    // Option text
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
  
  // Instructions
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
  // Background overlay
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);

  // Panel
  fill(28, 28, 28, 240);
  stroke(255, 100);
  strokeWeight(2);
  rect(panelX, panelY, panelWidth, panelHeight, 12);

  // Title
  noStroke();
  fill(255);
  textAlign(CENTER, TOP);
  textSize(26);
  text('SETTINGS (Placeholder)', width / 2, panelY + 18);

  // Placeholder content
  fill(200);
  textSize(14);
  textAlign(LEFT, TOP);
  text('- Audio: (placeholder)', panelX + 24, panelY + 64);
  text('- Controls: (placeholder)', panelX + 24, panelY + 88);
  text('- Graphics: (placeholder)', panelX + 24, panelY + 112);

  // Back hint
  fill(180);
  textSize(12);
  textAlign(CENTER, TOP);
  text('Click anywhere or press ESC to go back', width / 2, panelY + panelHeight - 28);

  pop();
}

function drawCombatOver() {
  // Fullscreen combat over screen (separate from SUMMARY)
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

  textAlign(CENTER, CENTER);
  textSize(64);
  fill(248, 200, 92);
  text(combatOverOutcome || 'COMBAT OVER', width / 2, 120);

  textSize(26);
  fill(220);
  text(combatOverLine || summaryText || 'Combat has ended.', width / 2, 180);

  // Large center panel with options
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

  // Button
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

  // Small footer info
  push();
  fill(180);
  textSize(14);
  text(`Time: ${battleTimer.toFixed(1)}s`, width / 2, panelY + 36);
  pop();

  pop();
}