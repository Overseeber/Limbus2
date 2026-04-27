const ARENA_WIDTH = 900;
const ARENA_HEIGHT = 500;
const GRAVITY = 0.6;
const FLOOR_Y = ARENA_HEIGHT - 80;
const DEBUG = false;
const CAMERA_MARGIN = 1 / 7;

let player;
let enemy;
let battleState = 'ready';
let winner = null;
let summaryText = '';
let lastMouseDown = null;
let battleTimer = 0;
let damageNumbers = [];
let cameraZoom = 1;
let cameraX = 0;
let cameraY = 0;

function setup() {
  createCanvas(ARENA_WIDTH, ARENA_HEIGHT);
  document.oncontextmenu = () => false;
  initBattle();
}

function initBattle() {
  player = new Fighter('Player', 140, FLOOR_Y, false, {
    color: '#4dc9ff',
    controls: {
      left: 'a',
      right: 'd',
      up: 'w',
      down: 's',
      evade: 'e',
    },
  });

  enemy = new Fighter('Adversary', ARENA_WIDTH - 140, FLOOR_Y, true, {
    color: '#ff6e6e',
    controls: null,
  });

  battleState = 'ready';
  winner = null;
  summaryText = '';
  battleTimer = 0;
  player.reset();
  enemy.reset();
}

function draw() {
  background(28);

  if (battleState === 'ready') {
    drawReadyScreen();
  } else if (battleState === 'battle') {
    updateBattle();
    beginCamera();
    drawArena();
    player.draw();
    enemy.draw();
    drawDamageNumbers();
    endCamera();
  } else if (battleState === 'summary') {
    beginCamera();
    drawArena();
    player.draw();
    enemy.draw();
    drawDamageNumbers();
    endCamera();
    drawSummary();
  }

  drawHud();
}

function drawArena() {
  noStroke();
  fill('#1f1f1f');
  rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  fill('#333');
  rect(0, FLOOR_Y + 50, ARENA_WIDTH, ARENA_HEIGHT - FLOOR_Y - 50);
  fill('#555');
  rect(0, FLOOR_Y + 50, ARENA_WIDTH, 6);
  if (DEBUG) {
    fill(255);
    textSize(12);
    text(`FPS: ${nf(frameRate(), 2, 1)}`, 12, 18);
  }
}

function drawReadyScreen() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(30);
  text('BIMBUSGAME:', width / 2, height / 2 - 80);
  textSize(18);
  text('WASD move, Right Click attack, Left Click defend, E evade', width / 2, height / 2 - 30);
  text('Hold Right Click to charge heavy attack. Press ENTER to start.', width / 2, height / 2 + 0);
  text('If the enemy attacks while you strike, you can parry them in the right window.', width / 2, height / 2 + 40);
  pop();
}

function updateBattle() {
  const dt = deltaTime / 1000;
  battleTimer += dt;
  player.handleInput();
  enemy.updateAI(player);

  player.update(dt, enemy);
  enemy.update(dt, player);
  updateDamageNumbers(dt);

  if (player.isDead() || enemy.isDead()) {
    battleState = 'summary';
    winner = player.isDead() ? enemy : player;
    summaryText = `${winner.name} wins!`;
  }
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
  drawDashCharges(player, hpBarX, hpBarY + 14, hpWidth);
  pop();
}

function drawEnemyHud() {
  const panelX = width - 256;
  const panelY = 16;
  const panelWidth = 240;
  const panelHeight = 84;
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
  drawDashCharges(enemy, panelX + 12, panelY + 12 + comboSize + 30, panelWidth - 24);
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

function beginCamera() {
  updateCamera();
  push();
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(-cameraX, -cameraY);
}

function endCamera() {
  pop();
}

function updateCamera() {
  const left = min(player.pos.x, enemy.pos.x);
  const right = max(player.pos.x, enemy.pos.x);
  const top = min(player.pos.y - 80, enemy.pos.y - 80);
  const bottom = max(player.pos.y + 80, enemy.pos.y + 80);
  const marginX = width * CAMERA_MARGIN;
  const marginY = height * CAMERA_MARGIN;
  const targetWidth = max(200, right - left + marginX * 2);
  const targetHeight = max(160, bottom - top + marginY * 2);
  const desiredZoom = min(1.6, width / targetWidth, height / targetHeight);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const zoomSpeed = desiredZoom < cameraZoom ? 0.28 : 0.08;
  cameraZoom = lerp(cameraZoom, desiredZoom, zoomSpeed);
  cameraX = lerp(cameraX, centerX, 0.12);
  cameraY = lerp(cameraY, centerY, 0.12);
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
  let offsetY = 0;
  fighter.statuses.slice(0, 14).forEach((status, index) => {
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
  });
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

function keyPressed() {
  if (battleState === 'ready' && keyCode === ENTER) {
    battleState = 'battle';
    return;
  }
  if (battleState === 'summary' && keyCode === ENTER) {
    initBattle();
    return;
  }
  if (battleState === 'battle') {
    player.processKeyPressed(key);
    if (key === ' ' || keyCode === 32) {
      player.startDash();
    }
  }
}

function keyReleased() {
  if (battleState === 'battle') {
    player.processKeyReleased(key);
  }
}

function mousePressed() {
  if (battleState !== 'battle') {
    return;
  }

  if (mouseButton === LEFT) {
    player.requestAttack();
    lastMouseDown = millis();
  } else if (mouseButton === RIGHT) {
    player.requestGuard();
  }
}

function mouseReleased() {
  if (battleState !== 'battle') {
    return;
  }

  if (mouseButton === LEFT) {
    const held = millis() - (lastMouseDown || 0);
    player.releaseAttack(held > 300);
    lastMouseDown = null;
  } else if (mouseButton === RIGHT) {
    player.releaseGuard();
  }
}

class Fighter {
  constructor(name, x, y, isAI, config = {}) {
    this.name = name;
    this.spawnX = x;
    this.spawnY = y;
    this.isAI = isAI;
    this.color = config.color || '#fff';
    this.controls = config.controls || {};
    this.reset();
  }

  reset() {
    this.pos = createVector(this.spawnX, this.spawnY);
    this.vel = createVector(0, 0);
    this.facing = this.spawnX > width / 2 ? -1 : 1;
    this.state = 'idle';
    this.hp = 1000;
    this.maxHp = 1000;
    this.speed = 3.4;
    this.attackInterval = 0.5;
    this.attackTimer = 0;
    this.kbResist = 0.08;
    this.dashCharges = 3;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.16;
    this.dashCooldown = 5;
    this.stagger = 0;
    this.staggerThreshold = 18;
    this.staggerRecovery = 1.5;
    this.staggerTimer = 0;
    this.staggerLength = 0.75;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboTimeout = 1.4;
    this.statuses = [];
    this.remainingSlide = 0;
    this.isDucking = false;
    this.isGuarding = false;
    this.isCountering = false;
    this.isEvading = false;
    this.evadeTimer = 0;
    this.chargeMeter = 0;
    this.attackRequest = false;
    this.attackRelease = false;
    this.guardRequest = false;
    this.parryWindow = 0;
    this.strikeActive = false;
    this.pendingCounter = false;
    this.lastAttackHit = false;
    this.hitCooldown = 0;
    this.ai = {
      moveLeft: false,
      moveRight: false,
      attack: false,
      defend: false,
    };
  }

  isDead() {
    return this.hp <= 0;
  }

  handleInput() {
    if (this.isAI) {
      return;
    }
    this.ai.moveLeft = keyIsDown(this.controls.left.toUpperCase().charCodeAt(0));
    this.ai.moveRight = keyIsDown(this.controls.right.toUpperCase().charCodeAt(0));
    this.ai.moveUp = keyIsDown(this.controls.up.toUpperCase().charCodeAt(0));
    this.ai.moveDown = keyIsDown(this.controls.down.toUpperCase().charCodeAt(0));
  }

  processKeyPressed(keyValue) {
    const keyLower = keyValue.toLowerCase();
    if (keyLower === this.controls.up) {
      this.jumpRequest = true;
    }
    if (keyLower === this.controls.down) {
      this.duckRequest = true;
    }
    if (keyLower === this.controls.evade) {
      this.requestEvade();
    }
  }

  processKeyReleased(keyValue) {
    const keyLower = keyValue.toLowerCase();
    if (keyLower === this.controls.down) {
      this.duckRequest = false;
    }
    if (keyLower === this.controls.up) {
      this.jumpRequest = false;
    }
  }

  requestAttack() {
    this.attackRequest = true;
  }

  releaseAttack(isCharged) {
    if (this.attackRequest) {
      this.attackRelease = true;
      this.chargeAttack = isCharged;
    }
  }

  requestGuard() {
    this.guardRequest = true;
    this.isGuarding = true;
  }

  releaseGuard() {
    this.guardRequest = false;
    this.isGuarding = false;
    this.isCountering = false;
  }

  requestEvade() {
    if (this.evadeTimer <= 0 && !this.isEvading) {
      this.isEvading = true;
      this.evadeTimer = 0.22;
      this.state = 'evade';
      this.vel.x = -this.facing * 7;
      this.vel.y = -3;
    }
  }

  update(dt, opponent) {
    this.attackTimer = max(0, this.attackTimer - dt);
    this.evadeTimer = max(0, this.evadeTimer - dt);
    this.parryWindow = max(0, this.parryWindow - dt);
    this.staggerTimer = max(0, this.staggerTimer - dt);
    this.comboTimer = max(0, this.comboTimer - dt);
    this.hitCooldown = max(0, this.hitCooldown - dt);

    if (this.comboTimer <= 0) {
      this.combo = 0;
    }

    if (this.state === 'attack' && this.attackTimer <= 0) {
      this.state = 'idle';
      this.strikeActive = false;
    }

    if (this.state === 'hit' && this.staggerTimer <= 0) {
      this.state = 'idle';
    }

    if (this.isEvading && this.evadeTimer <= 0) {
      this.isEvading = false;
      this.state = 'idle';
    }

    if (this.isAI) {
      this.updateAIControls(opponent);
    }

    this.applyMovement(dt);
    this.applyGravity(dt);
    this.applyDashRecharge(dt);
    this.applyStatuses(dt);
    this.cleanupPosition();

    this.processActions(opponent, dt);
  }

  updateAI(opponent) {
    this.updateAIControls(opponent);
  }

  updateAIControls(opponent) {
    const distance = opponent.pos.x - this.pos.x;
    this.ai.moveLeft = distance < -80;
    this.ai.moveRight = distance > 80;
    this.ai.moveUp = random() < 0.003 && abs(distance) < 220;
    this.ai.moveDown = false;
    this.ai.attack = abs(distance) < 120 && this.attackTimer <= 0;
    this.ai.defend = random() < 0.01;
    if (this.ai.attack) {
      this.requestAttack();
      this.releaseAttack(false);
    }
    if (this.ai.defend) {
      this.requestGuard();
    } else {
      this.releaseGuard();
    }
  }

  applyMovement(dt) {
    if (this.state === 'hit') {
      return;
    }

    let moveDir = 0;
    if (this.ai.moveLeft) moveDir -= 1;
    if (this.ai.moveRight) moveDir += 1;

    if (moveDir !== 0) {
      this.facing = moveDir;
    }

    if (!this.isDashing) {
      this.vel.x = moveDir * this.speed;
    }

    if (this.duckRequest && this.onGround()) {
      this.state = 'duck';
      this.isDucking = true;
      this.vel.x *= 0.7;
    } else {
      this.isDucking = false;
    }

    if (this.jumpRequest && this.onGround() && !this.isDucking) {
      this.vel.y = -11;
      this.state = 'jump';
      this.jumpRequest = false;
    }

    if (this.isDashing) {
      this.dashDuration -= dt;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
      }
    }

    if (this.state !== 'attack' && !this.isEvading && this.state !== 'hit' && !this.isDashing) {
      if (moveDir === 0) {
        this.state = 'idle';
      } else {
        this.state = 'run';
      }
    }
  }

  applyGravity(dt) {
    if (!this.onGround()) {
      this.vel.y += GRAVITY;
    }
    this.pos.add(this.vel);
  }

  cleanupPosition() {
    this.pos.x = constrain(this.pos.x, 60, width - 60);
    if (this.pos.y >= this.spawnY) {
      this.pos.y = this.spawnY;
      this.vel.y = 0;
    }
  }

  processActions(opponent, dt) {
    if (this.attackRelease && this.attackTimer <= 0 && !this.isEvading) {
      this.executeAttack(opponent);
      this.attackRequest = false;
      this.attackRelease = false;
    }

    if (this.isGuarding) {
      this.state = 'guard';
      if (this.ai.defend && random() < 0.02) {
        this.isCountering = true;
      }
    }

    if (this.strikeActive && this.parryWindow <= 0) {
      this.strikeActive = false;
    }
  }

  applyDashRecharge(dt) {
    if (this.dashCharges >= 3) {
      this.dashTimer = 0;
      return;
    }
    this.dashTimer += dt;
    while (this.dashTimer >= this.dashCooldown && this.dashCharges < 3) {
      this.dashCharges += 1;
      this.dashTimer -= this.dashCooldown;
    }
  }

  startDash() {
    if (this.dashCharges <= 0 || this.isDashing || !this.onGround()) {
      return;
    }
    this.dashCharges -= 1;
    this.isDashing = true;
    this.state = 'dash';
    this.vel.x = this.facing * 16;
    this.dashDuration = 0.16;
  }

  executeAttack(opponent) {
    const attackType = this.chargeAttack ? 'heavy' : 'light';
    this.state = 'attack';
    this.attackTimer = this.attackInterval;
    this.chargeAttack = false;
    this.strikeActive = true;
    this.parryWindow = 0.18;
    this.lastAttackHit = false;

    const damage = attackType === 'heavy' ? 18 : 10;
    const range = attackType === 'heavy' ? 96 : 70;
    const knockback = attackType === 'heavy' ? 18 : 12;
    const baseHit = this.calcAttackBox(range);

    if (this.checkParry(opponent, range)) {
      return;
    }

    if (this.hitOpponent(opponent, baseHit)) {
      const finalDamage = this.calculateDamage(damage);
      opponent.receiveHit(finalDamage, this, knockback);
      this.onSuccessfulHit(finalDamage);
    }
  }

  calcAttackBox(range) {
    const x = this.pos.x + this.facing * (range + 20);
    const y = this.pos.y - 28;
    return { x, y, w: range, h: 70 };
  }

  hitOpponent(opponent, box) {
    const withinRange = abs(opponent.pos.x - box.x) < box.w;
    const verticalMatch = abs(opponent.pos.y - box.y) < box.h;
    return withinRange && verticalMatch && opponent.hitCooldown <= 0;
  }

  checkParry(opponent, range) {
    if (opponent.strikeActive && opponent.parryWindow > 0 && abs(this.pos.x - opponent.pos.x) < range + 20) {
      this.onParry(opponent);
      return true;
    }
    return false;
  }

  onParry(attacker) {
    this.state = 'parry';
    attacker.state = 'parried';
    attacker.vel.x = this.facing * 6;
    this.vel.x = -this.facing * 4;
    attacker.strikeActive = false;
    attacker.parryWindow = 0;
    attacker.hitCooldown = 0.15;
    this.combo = max(0, this.combo - 1);
  }

  calculateDamage(base) {
    let damage = base + this.combo * 2;
    if (this.chargeAttack) damage *= 1.4;
    if (this.hasStatus('Poise')) {
      damage *= 1.15;
    }
    return damage;
  }

  receiveHit(amount, attacker, knockback) {
    if (this.isGuarding) {
      amount *= 0.45;
      if (this.isCountering) {
        attacker.receiveHit(amount * 0.8, this, knockback * 0.8);
        this.isCountering = false;
      }
    }

    if (this.isEvading) {
      return;
    }

    if (this.state === 'hit' || this.hitCooldown > 0) {
      return;
    }

    this.hp -= amount;
    spawnDamageNumber(amount, this.pos.copy(), attacker.facing);
    this.state = 'hit';
    this.stagger += amount * 1.2;
    const strength = max(1, amount * 0.05);
    this.vel.x = this.facing * -knockback * strength;
    this.vel.y = -5;
    this.hitCooldown = 0.25;

    if (this.stagger >= this.staggerThreshold) {
      this.state = 'staggered';
      this.staggerTimer = this.staggerLength;
      this.stagger = 0;
      this.addStatus('Tremor', 2, 4);
    }

    this.consumeStatusOnHit();
    this.addCombo(attacker);
  }

  onSuccessfulHit(damage) {
    this.lastAttackHit = true;
    this.comboTimer = this.comboTimeout;
    this.combo += 1;
    if (this.combo > 5) {
      this.addStatus('Charge', 1, 1);
    }
  }

  addCombo(attacker) {
    if (attacker === this && this.comboTimer > 0) {
      return;
    }
    this.comboTimer = this.comboTimeout;
  }

  hasStatus(type) {
    return this.statuses.some((status) => status.type === type);
  }

  addStatus(type, count, potency) {
    const existing = this.statuses.find((status) => status.type === type);
    if (existing) {
      existing.count += count;
      existing.potency = max(existing.potency, potency);
    } else {
      this.statuses.push({ type, count, potency, timer: 1.0 });
    }
  }

  consumeStatus(type) {
    const status = this.statuses.find((s) => s.type === type);
    if (!status) return;
    status.count -= 1;
    if (status.count <= 0) {
      this.statuses = this.statuses.filter((s) => s.type !== type);
    }
  }

  consumeStatusOnHit() {
    ['Rupture', 'Bleed', 'Sinking'].forEach((type) => {
      const status = this.statuses.find((s) => s.type === type);
      if (!status) return;
      status.count -= 1;
      if (status.count <= 0) {
        this.statuses = this.statuses.filter((s) => s.type !== type);
      }
      if (type === 'Rupture' || type === 'Bleed') {
        this.hp -= status.potency;
      }
    });
  }

  applyStatuses(dt) {
    this.statuses.forEach((status) => {
      status.timer -= dt;
      if (status.timer <= 0) {
        status.timer = 1;
        status.count -= 1;
        if (status.type === 'Burn') {
          this.hp -= status.potency;
        }
        if (status.type === 'Rupture') {
          this.hp -= status.potency;
        }
        if (status.type === 'Bleed') {
          this.hp -= status.potency;
        }
        if (status.type === 'Tremor') {
          this.stagger += status.potency;
        }
        if (status.type === 'Sinking') {
          this.speed = max(1.6, this.speed - 0.04 * status.potency);
        }
        if (status.type === 'Poise') {
          // no-op until crit logic added
        }
      }
    });
    this.statuses = this.statuses.filter((status) => status.count > 0);
  }

  drawStatusEffects() {
    if (this.statuses.length === 0) return;
    const baseY = this.pos.y + 10;
    const rowLimit = 7;
    const cellWidth = 48;
    this.statuses.forEach((status, index) => {
      const row = floor(index / rowLimit);
      const col = index % rowLimit;
      const totalRow = min(rowLimit, this.statuses.length - row * rowLimit);
      const startX = this.pos.x - (totalRow - 1) * cellWidth * 0.5;
      const x = startX + col * cellWidth;
      const y = baseY + row * 24;
      push();
      textAlign(CENTER, CENTER);
      rectMode(CENTER);
      fill(statusColor(status.type));
      noStroke();
      rect(x, y, 34, 18, 6);
      fill(255);
      textSize(10);
      text(`${status.potency}`, x - 10, y);
      text(`${status.count}`, x + 10, y);
      pop();
    });
  }

  onGround() {
    return this.pos.y >= this.spawnY - 0.01;
  }

  drawWorldHpBar() {
    if (!this.isAI) return;
    const barWidth = 120;
    const x = this.pos.x;
    const y = this.pos.y - 90;
    push();
    rectMode(CENTER);
    fill(0, 180);
    rect(x, y, barWidth, 18, 8);
    fill('#42d492');
    rect(x - barWidth / 2 + (barWidth * (this.hp / this.maxHp)) / 2, y, barWidth * (this.hp / this.maxHp), 10, 5);
    fill(255);
    textSize(14);
    textAlign(CENTER, BOTTOM);
    text(this.name, x, y - 10);
    pop();
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    fill(this.color);
    noStroke();
    ellipse(0, -30, 52, 72);
    fill(30);
    rectMode(CENTER);
    rect(this.facing * 20, -42, 20, 6, 4);
    if (this.isGuarding) {
      stroke('#90ee90');
      strokeWeight(3);
      noFill();
      ellipse(0, -30, 72, 88);
    }
    if (this.state === 'attack') {
      stroke('#ffd24d');
      strokeWeight(4);
      line(this.facing * 22, -50, this.facing * 70, -60);
    }
    if (this.state === 'evade') {
      fill('#8a8a8a');
      ellipse(0, -40, 12, 12);
    }
    pop();
    this.drawWorldHpBar();
    this.drawStatusEffects();

    if (DEBUG && this.strikeActive) {
      const box = this.calcAttackBox(70);
      stroke(255, 0, 0);
      noFill();
      rect(box.x, box.y, box.w, box.h);
    }
  }
}

function updateDamageNumbers(dt) {
  damageNumbers = damageNumbers.filter((num) => {
    num.update(dt);
    return !num.finished;
  });
}

function drawDamageNumbers() {
  damageNumbers.forEach((num) => num.draw());
}

function spawnDamageNumber(amount, position, facing) {
  damageNumbers.push(new DamageNumber(amount, position.x, position.y - 50, facing));
}

class DamageNumber {
  constructor(value, x, y, facing) {
    this.value = value;
    this.pos = createVector(x, y);
    this.vel = createVector(facing * 1.5 + random(-0.5, 0.5), random(-2.4, -1.4));
    this.alpha = 255;
    this.life = 1.0;
    this.size = this.computeSize(value);
  }

  computeSize(value) {
    if (value <= 70) {
      return 16 + value * 0.35;
    }
    if (value <= 500) {
      return 16 + 70 * 0.35 + (value - 70) * 0.1;
    }
    return 16 + 70 * 0.35 + 430 * 0.1 + log(value - 499) * 4;
  }

  update(dt) {
    this.life -= dt;
    this.alpha = map(this.life, 1, 0, 255, 0);
    this.pos.add(this.vel);
    this.vel.y -= 0.06;
    this.vel.mult(0.98);
    this.finished = this.life <= 0;
  }

  draw() {
    push();
    textAlign(CENTER, CENTER);
    textSize(this.size);
    fill(255, 220, 40, this.alpha);
    stroke(0, this.alpha);
    strokeWeight(2);
    text(`${floor(this.value)}`, this.pos.x, this.pos.y);
    pop();
  }
}

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}
