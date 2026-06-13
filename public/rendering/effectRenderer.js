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
  STAGGER_TEXT_SIZE: 10,
  TREMOR_TEXT_SIZE: 10,
  ICON_SIZE: 16,
  COLOR: {
    NORMAL_DAMAGE: { fill: [255, 255, 255], stroke: [0, 0, 0] },
    BLOCKED_DAMAGE: { fill: [56, 213, 245], stroke: [40, 170, 200] },
    CRITICAL_DAMAGE: { fill: [246, 255, 0], stroke: [200, 220, 0] },
    BURN_DAMAGE: { fill: [255, 140, 0], stroke: [200, 100, 0] },
    BLEED_DAMAGE: { fill: [255, 50, 50], stroke: [200, 0, 0] },
    TREMOR_DAMAGE: { fill: [231, 255, 143], stroke: [180, 210, 100] },
    RUPTURE_DAMAGE: { fill: [50, 255, 50], stroke: [0, 200, 0] },
    STAGGER_DAMAGE: { fill: [231, 255, 143], stroke: [180, 210, 100] },
    SINKING_DAMAGE: { fill: [77, 159, 255], stroke: [40, 100, 200] }
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

function spawnStaggerDamage(amount, position, facing = 1, sourceType = 'normal') {
  if (damageNumbers.length >= MAX_DAMAGE_NUMBERS) {
    damageNumbers.shift();
  }

  damageNumbers.push(new StaggerDamageNumber(
    amount,
    position.x,
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET - 30,
    facing,
    sourceType
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
        case 'sinking':
          colors = DAMAGE_CONSTANTS.COLOR.SINKING_DAMAGE;
          break;
        default:
          colors = DAMAGE_CONSTANTS.COLOR.NORMAL_DAMAGE;
      }
    }

    // Set text size first before measuring
    textSize(this.size);

    const damageText = this.textOverride || `${floor(this.value)}`;
    const textW = textWidth(damageText);

    // Draw source icon to the LEFT of the damage number text
    const sourceIconSize = constrain(this.size * 0.55, 12, 18);
    const sourceIconX = this.pos.x - (textW / 2) - sourceIconSize - 6;
    const sourceIconY = this.pos.y + max(1, this.size * 0.05);

    this.drawSourceIcon(sourceIconX, sourceIconY, sourceIconSize, colors);

    // Draw the damage number text
    fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
    stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
    strokeWeight(DAMAGE_CONSTANTS.STROKE_WEIGHT);
    textFont(NumberFont);

    text(damageText, this.pos.x, this.pos.y);

    // Draw subtext for critical, depowered, tremor burst
    let subText = null;
    let subColor = null;

    if (this.isCritical) {
      subText = 'CRITICAL!';
      subColor = DAMAGE_CONSTANTS.COLOR.CRITICAL_DAMAGE;
    } else if (this.isBlocked) {
      subText = 'DEPOWERED';
      subColor = DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE;
    } else if (this.damageType === 'tremor') {
      subText = 'TREMOR BURST';
      subColor = DAMAGE_CONSTANTS.COLOR.TREMOR_DAMAGE;
    }

    if (subText) {
      const sColor = subColor || colors;
      fill(sColor.fill[0], sColor.fill[1], sColor.fill[2], this.alpha);
      stroke(sColor.stroke[0], sColor.stroke[1], sColor.stroke[2], this.alpha);
      textSize(DAMAGE_CONSTANTS.DEPOWERED_TEXT_SIZE);
      text(subText, this.pos.x, this.pos.y + this.size * 0.8);
    }

    pop();
  }

  drawSourceIcon(x, y, iconSize, colors) {
    push();
    imageMode(CENTER);
    noStroke();

    // Determine which icon to draw based on damage source
    let statusType = 'Weapon';
    if (this.damageType === 'burn') statusType = 'Burn';
    else if (this.damageType === 'bleed') statusType = 'Bleed';
    else if (this.damageType === 'rupture') statusType = 'Rupture';
    else if (this.damageType === 'tremor') statusType = 'Tremor';
    else if (this.damageType === 'sinking') statusType = 'Sinking';
    else if (this.isBlocked) statusType = 'Weapon';
    else statusType = 'Weapon';

    // Try to use drawStatusIcon if available
    if (typeof drawStatusIcon === 'function') {
      drawStatusIcon(statusType, x + iconSize / 2, y + iconSize / 2, iconSize);
    } else {
      // Fallback: draw simple colored shape
      fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
      stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
      strokeWeight(1);
      rect(x, y, iconSize, iconSize, 2);
    }

    pop();
  }
}

/**
 * StaggerDamageNumber - Displays stagger damage as a separate floating number
 * in light yellow with source indicator on the left.
 */
class StaggerDamageNumber extends FloatingIndicator {
  constructor(value, x, y, facing, sourceType = 'normal') {
    super(x, y);
    this.value = value;
    this.sourceType = sourceType;
    this.vel = createVector(
      facing * 1.2 + random(-0.4, 0.4),
      random(-2.0, -1.0)
    );
    this.size = 12;
  }

  update(dt) {
    super.update(dt);
    this.vel.y -= DAMAGE_CONSTANTS.GRAVITY * 0.7;
  }

  draw() {
    push();
    textAlign(CENTER, TOP);

    const colors = DAMAGE_CONSTANTS.COLOR.STAGGER_DAMAGE;

    // Source icon to the left
    const iconSize = 12;
    const iconX = this.pos.x - 20 - iconSize;
    const iconY = this.pos.y + 2;

    this.drawSourceIcon(iconX, iconY, iconSize, colors);

    // Stagger number
    textSize(this.size);
    fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
    stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
    strokeWeight(1);
    textFont(NumberFont);
    text(`${floor(this.value)}`, this.pos.x, this.pos.y);

    if (this.sourceType === 'tremor') {
      textSize(DAMAGE_CONSTANTS.TREMOR_TEXT_SIZE);
      fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
      stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
      strokeWeight(1);
      textFont(NumberFont);
      text('TREMOR BURST', this.pos.x, this.pos.y + this.size * 0.8);
    }

    pop();
  }

  drawSourceIcon(x, y, iconSize, colors) {
    push();
    imageMode(CENTER);
    noStroke();

    // Determine which icon to draw based on stagger source
    let statusType = this.sourceType === 'tremor' ? 'Tremor' : 'Weapon';

    // Try to use drawStatusIcon if available
    if (typeof drawStatusIcon === 'function') {
      drawStatusIcon(statusType, x + iconSize / 2, y + iconSize / 2, iconSize);
    } else {
      // Fallback: draw simple colored shape
      fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
      stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
      strokeWeight(1);
      rect(x, y, iconSize, iconSize, 2);
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
    textFont(NumberFont);

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
    textFont(NumberFont);

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
  // Use same values for both ultimate and normal attacks
  const cappedDamage = Math.min(intensity, 40);
  shakeAmount = Math.min(cappedDamage * 0.3, 12);
  isUltimateShake = false;
  
  if (shakeAmount > screenShakeIntensity) {
    screenShakeIntensity = shakeAmount;
  }
}

function updateScreenShake(dt) {
  if (screenShakeIntensity > 0) {
    const decayRate = 0.06;
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
    vy: random(-60, -20),
    life: random(0.3, 0.6),
    maxLife: random(0.3, 0.6),
    size: random(2, 5),
    type: 'burn'
  });
}

function spawnBleedParticle(x, y) {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift();
  }
  particles.push({
    x: x + random(-10, 10),
    y: y,
    vx: random(-20, 20),
    vy: random(-40, -10),
    life: random(0.4, 0.8),
    maxLife: random(0.4, 0.8),
    size: random(2, 6),
    type: 'bleed'
  });
}

function spawnStatusParticles(statusType, x, y, count = 5) {
  const particleType = statusType === 'Burn' ? 'burn' :
                       statusType === 'Bleed' ? 'bleed' :
                       statusType === 'Sinking' ? 'sinking' : 'default';
  
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push({
      x: x + random(-15, 15),
      y: y + random(-15, 15),
      vx: random(-40, 40),
      vy: random(-50, -10),
      life: random(0.3, 0.7),
      maxLife: random(0.3, 0.7),
      size: random(2, 5),
      type: particleType
    });
  }
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
    p.vy += 200 * dt;
    p.alpha = p.life / p.maxLife;
  }
}

function drawParticles() {
  for (let i = 0, len = particles.length; i < len; i++) {
    const p = particles[i];
    const alpha = p.alpha * 255;

    push();
    noStroke();

    switch (p.type) {
      case 'debris':
        fill(120, 100, 80, alpha);
        rect(p.x, p.y, p.size, p.size);
        break;
      case 'spark':
        fill(255, 255, 200, alpha);
        ellipse(p.x, p.y, p.size);
        break;
      case 'burn':
        fill(255, 140 + random(-20, 20), 0, alpha);
        ellipse(p.x, p.y, p.size);
        break;
      case 'bleed':
        fill(200 + random(-20, 20), 20, 20, alpha);
        ellipse(p.x, p.y, p.size);
        break;
      case 'sinking':
        fill(50, 150, 255, alpha);
        rect(p.x, p.y, p.size, p.size);
        break;
      default:
        fill(255, alpha);
        ellipse(p.x, p.y, p.size);
    }

    pop();
  }
}

function clearEffects() {
  damageNumbers = [];
  particles = [];
}