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
    this.hp = 9999;
    this.maxHp = 9999;
    this.speed = 5;
    this.attackInterval = 1.0;
    this.attackTimer = 0;
    this.kbResist = 0.08;
    this.dashCharges = 3;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.16;
    this.dashCooldown = 3;
    this.stagger = 0;
    this.staggerThreshold = 1000;
    this.staggerRecovery = 10;
    this.staggerTimer = 0;
    this.staggerLength = 5;
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
    this.parryIndicator = 0;
    this.dashAttacked = false;
    this.evadeRequested = false;
    this.parryCount = 3;
    this.parryTimer = 0;
    this.parryStunTimer = 0;
    this.ai = {
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
      attack: false,
      defend: false,
      evade: false,
    };
    this.name = 'John Limbus';
    this.title = 'glory to limbus company';
    this.weapon = 'bus';
    this.baseDamage = 5;
    this.dashAttacked = false;
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
    this.evadeRequested = true;
  }

  startEvade(opponent) {
    if (this.evadeTimer > 0 || this.isEvading) {
      return;
    }
    this.isEvading = true;
    this.evadeTimer = 0.22;
    this.state = 'evade';
    this.facing = opponent.pos.x > this.pos.x ? 1 : -1;
    this.vel.x = -this.facing * 18;
    this.vel.y = -3;
  }

  update(dt, opponent) {
    this.attackTimer = max(0, this.attackTimer - dt);
    this.evadeTimer = max(0, this.evadeTimer - dt);
    this.parryWindow = max(0, this.parryWindow - dt);
    this.parryIndicator = max(0, this.parryIndicator - dt);
    this.parryTimer = max(0, this.parryTimer - dt);
    this.parryStunTimer = max(0, this.parryStunTimer - dt);
    this.staggerTimer = max(0, this.staggerTimer - dt);
    this.comboTimer = max(0, this.comboTimer - dt);
    this.hitCooldown = max(0, this.hitCooldown - dt);

    if (this.comboTimer <= 0) {
      this.combo = 0;
    }

    if (this.parryTimer <= 0 && this.parryCount < 3) {
      this.parryCount += 1;
      this.parryTimer = 10;
    }

    if (this.state === 'attack' && this.attackTimer <= 0) {
      this.state = 'idle';
      this.strikeActive = false;
    }

    if (this.state === 'hit' && this.staggerTimer <= 0) {
      this.state = 'idle';
    }

    if ((this.state === 'parry' || this.state === 'parried') && this.parryStunTimer <= 0) {
      this.state = 'idle';
    }

    if (this.isEvading && this.evadeTimer <= 0) {
      this.isEvading = false;
      this.state = 'idle';
    }

    if (this.isAI) {
      this.updateAIControls(opponent);
    }

    this.applyMovement(dt, opponent);
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
    const absDistance = abs(distance);
    
    // Basic movement
    this.ai.moveLeft = distance < -80;
    this.ai.moveRight = distance > 80;
    this.ai.moveUp = random() < 0.003 && absDistance < 220;
    this.ai.moveDown = false;
    
    // Check if opponent is about to attack (strikeActive with parryWindow)
    const opponentAttacking = opponent.strikeActive && opponent.parryWindow > 0;
    const opponentInRange = absDistance < 150;
    
    // Evade when opponent is attacking and in range
    if (opponentAttacking && opponentInRange && this.evadeTimer <= 0 && !this.isEvading) {
      this.ai.evade = true;
      this.requestEvade();
      return;
    }
    this.ai.evade = false;
    
    // Block when opponent is in attack range
    if (opponentInRange && this.parryCount > 0) {
      this.ai.defend = random() < 0.03;
    } else {
      this.ai.defend = false;
    }
    
    // Dash attack when in close range
    if (absDistance < 100 && this.dashCharges > 0 && this.attackTimer <= 0 && random() < 0.01) {
      this.startDash();
    }
    
    // Regular attack when in range and not on cooldown
    this.ai.attack = absDistance < 120 && this.attackTimer <= 0 && !opponentAttacking;
    
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

  applyMovement(dt, opponent) {
    if (this.state === 'hit' || this.state === 'parry' || this.state === 'parried' || this.parryStunTimer > 0) {
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
      // Dash attack: move in and strike, then dash through enemy.
      if (!this.dashAttacked && abs(this.pos.x - opponent.pos.x) < 80) {
        this.executeAttack(opponent, true);
        this.dashAttacked = true;
        this.vel.x = this.facing * 60;
        this.dashDuration += 0.16;
      }
    }

    if (this.isEvading) {
      const desiredGap = 120;
      const distance = abs(this.pos.x - opponent.pos.x);
      if (distance < desiredGap) {
        this.vel.x = -this.facing * 18;
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
    if (this.evadeRequested) {
      this.startEvade(opponent);
      this.evadeRequested = false;
    }

    if (this.attackRelease && !this.isEvading) {
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
    this.vel.x = this.facing * 50;
    this.dashDuration = 0.16;
    this.dashAttacked = false;
  }

  executeAttack(opponent, ignoreParry = false) {
    // If attacker has no parry count, interrupt their attack (it goes through as if they didn't attack)
    if (!ignoreParry && this.parryCount <= 0) {
      this.state = 'idle';
      this.strikeActive = false;
      return;
    }

    const attackType = this.chargeAttack ? 'heavy' : 'light';
    this.state = 'attack';
    this.strikeActive = true;
    this.parryWindow = 0.18;
    this.lastAttackHit = false;

    const damage = attackType === 'heavy' ? this.baseDamage * 2 : this.baseDamage;
    const range = attackType === 'heavy' ? 96 : 70;
    const knockback = attackType === 'heavy' ? 18 * 0.5 : 12 * 0.5; // 50% knockback
    const baseHit = this.calcAttackBox(range);

    if (!ignoreParry && this.checkParry(opponent, range)) {
      this.attackTimer = this.attackInterval;
      return;
    }

    if ((this.attackTimer <= 0 || ignoreParry) && this.hitOpponent(opponent, baseHit)) {
      const finalDamage = this.calculateDamage(damage, opponent);
      opponent.receiveHit(finalDamage, this, knockback);
      this.onSuccessfulHit(finalDamage);
    }
    this.attackTimer = this.attackInterval;
  }

  calcAttackBox(range) {
    const x = this.pos.x + this.facing * (range / 2);
    const y = this.pos.y - 28;
    return { x, y, w: range, h: 70 };
  }

  hitOpponent(opponent, box) {
    const playerBox = { x: opponent.pos.x - 25, y: opponent.pos.y - 36, w: 50, h: 72 };
    const attackBox = { x: box.x - box.w / 2, y: box.y, w: box.w, h: box.h };
    return this.rectOverlap(playerBox, attackBox) && opponent.hitCooldown <= 0;
  }

  rectOverlap(r1, r2) {
    return !(r1.x + r1.w < r2.x || r2.x + r2.w < r1.x || r1.y + r1.h < r2.y || r2.y + r2.h < r1.y);
  }

  checkParry(opponent, range) {
    if (opponent.strikeActive && opponent.parryWindow > 0 && abs(this.pos.x - opponent.pos.x) < range + 200) {
      return this.onParry(opponent);
    }
    return false;
  }

  onParry(attacker) {
    if (this.parryCount <= 0) return false; // Cannot parry if no parries left
    const attackerRight = attacker.pos.x > this.pos.x;
    this.state = 'parry';
    attacker.state = 'parried';
    attacker.vel.x = attackerRight ? 12 : -12;
    this.vel.x = attackerRight ? -10 : 10;
    attacker.strikeActive = false;
    this.strikeActive = false;
    attacker.parryWindow = 0;
    this.parryWindow = 0;
    attacker.hitCooldown = 0.15;
    this.hitCooldown = 0.15;
    this.parryIndicator = 0.35;
    attacker.parryIndicator = 0.35;
    this.attackTimer = this.attackInterval;
    attacker.attackTimer = attacker.attackInterval;
    this.combo = max(0, this.combo - 1);
    // Only the defender (parrier) loses parry count, not the attacker
    this.parryCount -= 1;
    attacker.parryStunTimer = 0.2;
    this.parryStunTimer = 0.2;
    return true;
  }

  calculateDamage(base, opponent) {
    let damage = base + this.combo * 2;
    if (this.chargeAttack) damage *= 1.4;
    if (this.hasStatus('Poise')) {
      damage *= 1.15;
    }
    if (opponent.state === 'staggered') {
      damage *= 1.1; // Passive: 10% more damage on staggered enemies
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
    const awayFromAttacker = this.pos.x < attacker.pos.x ? -1 : 1;
    this.vel.x = awayFromAttacker * knockback * strength;
    this.vel.y = -5;
    this.hitCooldown = 0.25;
    this.staggerTimer = 0.18;

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
    this.parryCount = min(3, this.parryCount + 1);
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
    // Draw parry charges
    for (let i = 0; i < 5; i++) {
      fill(i < this.parryCount ? '#ffff00' : '#333');
      ellipse(x - 20 + i * 10, y + 15, 6, 6);
    }
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

    if (this.parryIndicator > 0) {
      push();
      noFill();
      stroke(255, 255, 0, map(this.parryIndicator, 0, 0.35, 0, 220));
      strokeWeight(3);
      ellipse(this.pos.x, this.pos.y - 30, 90 + (0.35 - this.parryIndicator) * 30, 100 + (0.35 - this.parryIndicator) * 30);
      pop();
    }

    // Draw player hitbox
    stroke(0, 255, 0);
    noFill();
    rect(this.pos.x - 25, this.pos.y - 36, 50, 72);

    if (this.strikeActive) {
      const range = this.chargeAttack ? 96 : 70;
      const box = this.calcAttackBox(range);
      stroke(255, 0, 0);
      noFill();
      rect(box.x - box.w / 2, box.y, box.w, box.h);
    }
  }
}