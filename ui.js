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
  textSize(32);
  text(summaryText, width / 2, height / 2 - 40);
  textSize(18);
  text('Press ENTER to restart the duel.', width / 2, height / 2 + 0);
  text(`Time: ${battleTimer.toFixed(1)}s`, width / 2, height / 2 + 40);
  pop();
}

function drawHud() {
  drawPlayerHud();
  drawEnemyHud();
}

function drawPlayerHud() {
  const panelX = 16;
  const panelY = height - 148;
  const panelWidth = 240;
  const panelHeight = 132;
  const comboSize = 16 + min(18, player.combo * 1.5);
  const comboRatio = constrain(player.comboTimer / player.comboTimeout, 0, 1);

  push();
  fill(20, 180);
  stroke(255, 20);
  rect(panelX, panelY, panelWidth, panelHeight, 10);
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(comboSize);
  text(`Combo: ${player.combo}`, panelX + 12, panelY + 12);
  textSize(12);
  fill('#222');
  rect(panelX + 12, panelY + 12 + comboSize + 8, panelWidth - 24, 10, 5);
  fill('#ffcc33');
  rect(panelX + 12, panelY + 12 + comboSize + 8, (panelWidth - 24) * comboRatio, 10, 5);

  fill(255);
  textSize(14);
  text(`Name: ${player.name}`, panelX + 12, panelY + 52);
  text(`HP: ${player.hp.toFixed(0)} / ${player.maxHp}`, panelX + 12, panelY + 72);
  text(`State: ${player.state}`, panelX + 12, panelY + 92);

  const hpBarX = panelX + 12;
  const hpBarY = panelY + 110;
  const hpWidth = panelWidth - 24;
  fill('#222');
  rect(hpBarX, hpBarY, hpWidth, 8, 4);
  fill('#42d492');
  rect(hpBarX, hpBarY, hpWidth * (player.hp / player.maxHp), 8, 4);
  
  // Stagger Bar
  fill('#222');
  rect(hpBarX, hpBarY + 14, hpWidth, 6, 3);
  const staggerPercent = constrain(player.stagger / player.staggerThreshold, 0, 1);
  if (staggerPercent > 0) {
    fill(255, 100 + staggerPercent * 50, 50);
    rect(hpBarX, hpBarY + 14, hpWidth * staggerPercent, 6, 3);
  }
  
  drawDashCharges(player, hpBarX, hpBarY + 24, hpWidth);
  pop();
}

function drawEnemyHud() {
  const panelX = width - 256;
  const panelY = 16;
  const panelWidth = 240;
  const panelHeight = 132;
  const comboSize = 16 + min(18, enemy.combo * 1.5);
  const comboRatio = constrain(enemy.comboTimer / enemy.comboTimeout, 0, 1);

  push();
  fill(20, 180);
  stroke(255, 20);
  rect(panelX, panelY, panelWidth, panelHeight, 10);
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(comboSize);
  text(`Combo: ${enemy.combo}`, panelX + 12, panelY + 12);
  textSize(12);
  fill('#222');
  rect(panelX + 12, panelY + 12 + comboSize + 8, panelWidth - 24, 10, 5);
  fill('#ffcc33');
  rect(panelX + 12, panelY + 12 + comboSize + 8, (panelWidth - 24) * comboRatio, 10, 5);

  fill(255);
  textSize(14);
  text(`Name: ${enemy.name}`, panelX + 12, panelY + 52);
  text(`HP: ${enemy.hp.toFixed(0)} / ${enemy.maxHp}`, panelX + 12, panelY + 72);
  text(`State: ${enemy.state}`, panelX + 12, panelY + 92);
  
  
  const hpBarX = panelX + 12;
  const hpBarY = panelY + 110;
  const hpWidth = panelWidth - 24;
  fill('#222');
  rect(hpBarX, hpBarY, hpWidth, 8, 4);
  fill('#42d492');
  rect(hpBarX, hpBarY, hpWidth * (enemy.hp / enemy.maxHp), 8, 4);
  
  // Stagger Bar
  fill('#222');
  rect(hpBarX, hpBarY + 14, hpWidth, 6, 3);
  const staggerPercent = constrain(enemy.stagger / enemy.staggerThreshold, 0, 1);
  if (staggerPercent > 0) {
    fill(255, 100 + staggerPercent * 50, 50);
    rect(hpBarX, hpBarY + 14, hpWidth * staggerPercent, 6, 3);
  }
  
  drawDashCharges(enemy, panelX + 12, panelY + 24, hpWidth);
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
    fill(statusColor(status.type));
    rect(px, py, 26, 18, 4);
    fill(255);
    textSize(10);
    textAlign(CENTER, CENTER);
    text(status.type.charAt(0), px + 13, py + 9);
  }
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