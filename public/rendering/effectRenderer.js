/**
 * EFFECT RENDERER - Client-side visual effects
 * Handles particles, screen shake, damage numbers, and visual effects
 * Called by the game loop and ability results from server
 */

// Damage numbers array
let damageNumbers = [];
const MAX_DAMAGE_NUMBERS = 50;

const DAMAGE_CONSTANTS = {
  BASE_Y_OFFSET: -50,
  BASE_SIZE: 16,
  LIFE_DURATION: 1.0,
  DAMPING: 0.98,
  GRAVITY: 0.06,
  EVADE_GRAVITY: 0.08,
  STROKE_WEIGHT: 2,
  DEPOWERED_TEXT_SIZE: 10,
  EVADE_SIZE: 20,
  CRITICAL_TEXT_SIZE: 12,
  ICON_SIZE: 16,
  COLOR: {
    NORMAL_DAMAGE: { fill: [255, 255, 255], stroke: [0, 0, 0] },
    BLOCKED_DAMAGE: { fill: [100, 200, 255], stroke: [70, 150, 220] },
    EVADE: { fill: [150, 255, 150], stroke: [100, 200, 100] },
    CRITICAL_DAMAGE: { fill: [255, 255, 0], stroke: [200, 200, 0] },
    BURN_DAMAGE: { fill: [255, 140, 0], stroke: [200, 100, 0] },
    BLEED_DAMAGE: { fill: [255, 50, 50], stroke: [200, 0, 0] },
    TREMOR_DAMAGE: { fill: [255, 255, 0], stroke: [200, 200, 0] },
    RUPTURE_DAMAGE: { fill: [50, 255, 50], stroke: [0, 200, 0] }
  }
};

function spawnDamageNumber(amount, position, facing = 1, isBlocked = false, damageType = 'normal', isCritical = false, attackType = 'normal', textOverride = null) {
  if (damageNumbers.length >= MAX_DAMAGE_NUMBERS) {
    damageNumbers.shift(); // Remove oldest
  }

  damageNumbers.push(new DamageNumber(
    amount,
    position.x,
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET,
    facing,
    isBlocked,
    damageType,
    isCritical,
    attackType,
    textOverride
  ));
}

function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    damageNumbers[i].update(dt);
    if (damageNumbers[i].finished) {
      damageNumbers.splice(i, 1);
    }
  }
}

function drawDamageNumbers() {
  for (let i = 0, len = damageNumbers.length; i < len; i++) {
    damageNumbers[i].draw();
  }
}

class FloatingIndicator {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.alpha = 255;
    this.life = DAMAGE_CONSTANTS.LIFE_DURATION;
    this.finished = false;
  }

  update(dt) {
    this.life -= dt;
    this.alpha = map(this.life, 1, 0, 255, 0);
    this.pos.add(this.vel);
    this.vel.mult(DAMAGE_CONSTANTS.DAMPING);
    this.finished = this.life <= 0;
  }

  draw() {
    throw new Error('draw() method must be implemented by subclass');
  }
}

class DamageNumber extends FloatingIndicator {
  constructor(value, x, y, facing, isBlocked = false, damageType = 'normal', isCritical = false, attackType = 'normal', textOverride = null) {
    super(x, y);
    this.value = value;
    this.vel = createVector(
      facing * 1.5 + random(-0.5, 0.5),
      random(-2.4, -1.4)
    );
    this.size = this.computeSize(value);
    this.isBlocked = isBlocked;
    this.damageType = damageType;
    this.isCritical = isCritical;
    this.attackType = attackType;
    this.textOverride = textOverride;
  }

  computeSize(value) {
    let baseSize;
    if (value <= 70) {
      baseSize = DAMAGE_CONSTANTS.BASE_SIZE + value * 0.35;
    } else if (value <= 500) {
      baseSize = DAMAGE_CONSTANTS.BASE_SIZE + 70 * 0.35 + (value - 70) * 0.1;
    } else {
      baseSize = DAMAGE_CONSTANTS.BASE_SIZE + 70 * 0.35 + 430 * 0.1 + log(value - 499) * 4;
    }
    if (this.isCritical) {
      baseSize *= 1.3;
    }
    return baseSize;
  }

  update(dt) {
    super.update(dt);
    this.vel.y -= DAMAGE_CONSTANTS.GRAVITY;
  }

  draw() {
    push();
    textAlign(CENTER, TOP);

    let colors;
    if (this.isCritical) {
      colors = DAMAGE_CONSTANTS.COLOR.CRITICAL_DAMAGE;
    } else if (this.isBlocked) {
      colors = DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE;
    } else {
      switch (this.damageType) {
        case 'burn':
          colors = DAMAGE_CONSTANTS.COLOR.BURN_DAMAGE;
          break;
        case 'bleed':
          colors = DAMAGE_CONSTANTS.COLOR.BLEED_DAMAGE;
          break;
        case 'tremor':
          colors = DAMAGE_CONSTANTS.COLOR.TREMOR_DAMAGE;
          break;
        case 'rupture':
          colors = DAMAGE_CONSTANTS.COLOR.RUPTURE_DAMAGE;
          break;
        default:
          colors = DAMAGE_CONSTANTS.COLOR.NORMAL_DAMAGE;
      }
    }

    this.drawAttackIcon(colors);

    textSize(this.size);
    fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
    stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
    strokeWeight(DAMAGE_CONSTANTS.STROKE_WEIGHT);

    const damageTextX = this.pos.x - (DAMAGE_CONSTANTS.ICON_SIZE / 2);
    text(`${floor(this.value)}`, damageTextX, this.pos.y);

    if (this.isCritical) {
      fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
      textSize(DAMAGE_CONSTANTS.CRITICAL_TEXT_SIZE);
      text('CRITICAL!', damageTextX, this.pos.y + this.size * 0.8);
    }

    if (this.isBlocked) {
      fill(
        DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE.fill[0],
        DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE.fill[1],
        DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE.fill[2],
        this.alpha
      );
      textSize(DAMAGE_CONSTANTS.DEPOWERED_TEXT_SIZE);
      text('depowered', damageTextX, this.pos.y + this.size * 0.8);
    }

    pop();
  }

  drawAttackIcon(colors) {
    push();
    const iconX = this.pos.x + (this.size / 2) + 5;
    const iconY = this.pos.y + (this.size / 2) - (DAMAGE_CONSTANTS.ICON_SIZE / 2);

    fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
    stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
    strokeWeight(1);

    switch (this.attackType) {
      case 'normal':
        rect(iconX, iconY, DAMAGE_CONSTANTS.ICON_SIZE, DAMAGE_CONSTANTS.ICON_SIZE, 2);
        break;
      case 'slam':
        triangle(
          iconX + DAMAGE_CONSTANTS.ICON_SIZE / 2, iconY,
          iconX, iconY + DAMAGE_CONSTANTS.ICON_SIZE,
          iconX + DAMAGE_CONSTANTS.ICON_SIZE, iconY + DAMAGE_CONSTANTS.ICON_SIZE
        );
        break;
      case 'dash':
        ellipse(
          iconX + DAMAGE_CONSTANTS.ICON_SIZE / 2,
          iconY + DAMAGE_CONSTANTS.ICON_SIZE / 2,
          DAMAGE_CONSTANTS.ICON_SIZE
        );
        break;
      case 'ultimate':
        push();
        translate(
          iconX + DAMAGE_CONSTANTS.ICON_SIZE / 2,
          iconY + DAMAGE_CONSTANTS.ICON_SIZE / 2
        );
        rotate(PI / 4);
        rect(
          -DAMAGE_CONSTANTS.ICON_SIZE / 2,
          -DAMAGE_CONSTANTS.ICON_SIZE / 2,
          DAMAGE_CONSTANTS.ICON_SIZE,
          DAMAGE_CONSTANTS.ICON_SIZE,
          2
        );
        pop();
        break;
      default:
        rect(iconX, iconY, DAMAGE_CONSTANTS.ICON_SIZE, DAMAGE_CONSTANTS.ICON_SIZE, 2);
    }

    pop();
  }
}

class EvadeIndicator extends FloatingIndicator {
  constructor(x, y) {
    super(x, y);
    this.vel = createVector(random(-0.5, 0.5), -2.8);
    this.size = DAMAGE_CONSTANTS.EVADE_SIZE;
  }

  update(dt) {
    super.update(dt);
    this.vel.y -= DAMAGE_CONSTANTS.EVADE_GRAVITY;
  }

  draw() {
    push();
    textAlign(CENTER, CENTER);
    textSize(this.size);

    const colors = DAMAGE_CONSTANTS.COLOR.EVADE;
    fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
    stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
    strokeWeight(DAMAGE_CONSTANTS.STROKE_WEIGHT);

    text('evade', this.pos.x, this.pos.y);
    pop();
  }
}

class TremorIndicator extends FloatingIndicator {
  constructor(x, y) {
    super(x, y);
    this.vel = createVector(random(-0.5, 0.5), -2.8);
    this.size = DAMAGE_CONSTANTS.EVADE_SIZE;
  }

  update(dt) {
    super.update(dt);
    this.vel.y -= DAMAGE_CONSTANTS.EVADE_GRAVITY;
  }

  draw() {
    push();
    textAlign(CENTER, CENTER);
    textSize(this.size);

    fill(255, 100, 50, this.alpha);
    stroke(255, 50, 0, this.alpha);
    strokeWeight(DAMAGE_CONSTANTS.STROKE_WEIGHT);
    text('Tremor', this.pos.x, this.pos.y);
    pop();
  }
}

// ==========================
// SCREEN SHAKE SYSTEM
// ==========================
let screenShakeX = 0;
let screenShakeY = 0;
let screenShakeIntensity = 0;
let isUltimateShake = false;

function addScreenShake(intensity, isUltimate = false) {
  let shakeAmount;
  if (isUltimate) {
    const cappedDamage = Math.min(intensity, 60);
    shakeAmount = Math.min(cappedDamage * 0.5, 30);
    isUltimateShake = true;
  } else {
    const cappedDamage = Math.min(intensity, 40);
    shakeAmount = Math.min(cappedDamage * 0.3, 12);
    isUltimateShake = false;
  }
  
  if (shakeAmount > screenShakeIntensity) {
    screenShakeIntensity = shakeAmount;
    if (isUltimate) isUltimateShake = true;
  }
}

function updateScreenShake(dt) {
  if (screenShakeIntensity > 0) {
    const decayRate = isUltimateShake ? 0.04 : 0.06;
    screenShakeIntensity -= decayRate * dt * 60;
    
    if (screenShakeIntensity <= 0) {
      screenShakeIntensity = 0;
      screenShakeX = 0;
      screenShakeY = 0;
      isUltimateShake = false;
    } else {
      const maxShake = Math.min(screenShakeIntensity, 20);
      screenShakeX = (Math.random() * 2 - 1) * maxShake;
      screenShakeY = (Math.random() * 2 - 1) * maxShake;
    }
  }
}

function getScreenShakeOffset() {
  return { x: screenShakeX, y: screenShakeY };
}

// ==========================
// PARTICLE SYSTEM
// ==========================
let particles = [];
const MAX_PARTICLES = 200;

function spawnSlamDebris(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push({
      x: x + random(-20, 20),
      y: y,
      vx: random(-200, 200),
      vy: random(-300, -50),
      life: random(0.3, 0.8),
      maxLife: random(0.3, 0.8),
      size: random(3, 8),
      type: 'debris'
    });
  }
}

function spawnGuardSparks(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push({
      x: x,
      y: y,
      vx: random(-150, 150),
      vy: random(-150, 150),
      life: 0.3,
      maxLife: 0.3,
      size: random(2, 5),
      type: 'spark'
    });
  }
}

function spawnEvadeIndicator(position) {
  if (damageNumbers.length >= MAX_DAMAGE_NUMBERS) {
    damageNumbers.shift();
  }
  damageNumbers.push(new EvadeIndicator(
    position.x,
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET
  ));
}

function spawnTremorIndicator(position) {
  if (damageNumbers.length >= MAX_DAMAGE_NUMBERS) {
    damageNumbers.shift();
  }
  damageNumbers.push(new TremorIndicator(
    position.x,
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET
  ));
}

function spawnBurnParticle(x, y) {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift();
  }
  particles.push({
    x: x,
    y: y,
    vx: random(-30, 30),
    vy: random(-80, -40),
    life: random(0.5, 1.0),
    maxLife: random(0.5, 1.0),
    size: random(2, 5),
    type: 'burn'
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    if (p.type === 'debris') {
      p.vy += 500 * dt; // Gravity
    }
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const alpha = map(p.life, 0, p.maxLife, 0, 255);
    
    push();
    noStroke();
    
    switch (p.type) {
      case 'debris':
        fill(150, 100, 50, alpha);
        rect(p.x, p.y, p.size, p.size);
        break;
      case 'spark':
        fill(255, 255, 200, alpha);
        ellipse(p.x, p.y, p.size);
        break;
      case 'evade':
        fill(150, 150, 255, alpha * 0.3);
        ellipse(p.x, p.y, p.size);
        break;
      case 'tremor':
        fill(150, 100, 255, alpha);
        ellipse(p.x, p.y, p.size);
        break;
      case 'burn':
        fill(255, 150, 50, alpha);
        ellipse(p.x, p.y, p.size);
        break;
    }
    
    pop();
  }
}

// ==========================
// STATUS VISUALS
// ==========================
const STATUS_ICONS = {
  Burn: '🔥',
  Bleed: '💧',
  Tremor: '🌀',
  Rupture: '💥',
  Sinking: '⬇',
  Charge: '⚡',
  Poise: '🛡',
  Haste: '⏩',
  Bind: '⛓',
  Fragile: '💔',
  Protection: '🛡',
  Precognition: '👁',
  Overheat: '🌡',
  Stagger: '💫'
};

function getStatusIcon(type) {
  return STATUS_ICONS[type] || '❓';
}

// Cleanup function to reset all visual arrays
function resetVisualEffects() {
  damageNumbers = [];
  particles = [];
  screenShakeIntensity = 0;
  screenShakeX = 0;
  screenShakeY = 0;
}