/**
 * Constants for damage number system
 */
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
  COLOR: {
    NORMAL_DAMAGE: { fill: [255, 220, 40], stroke: [0, 0, 0] },
    BLOCKED_DAMAGE: { fill: [100, 200, 255], stroke: [70, 150, 220] },
    EVADE: { fill: [150, 255, 150], stroke: [100, 200, 100] }
  }
};

/**
 * Array to store all active damage numbers and indicators
 */
let damageNumbers = [];

/**
 * Updates all damage numbers and removes finished ones
 * @param {number} dt - Delta time in seconds
 */
function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    damageNumbers[i].update(dt);
    if (damageNumbers[i].finished) {
      damageNumbers.splice(i, 1);
    }
  }
}

/**
 * Draws all active damage numbers and indicators
 */
function drawDamageNumbers() {
  for (let i = 0, len = damageNumbers.length; i < len; i++) {
    damageNumbers[i].draw();
  }
}

/**
 * Spawns a new damage number
 * @param {number} amount - Damage amount
 * @param {p5.Vector} position - Position to spawn at
 * @param {number} facing - Direction facing (-1 or 1)
 * @param {boolean} isBlocked - Whether damage was blocked
 */
function spawnDamageNumber(amount, position, facing, isBlocked = false) {
  damageNumbers.push(new DamageNumber(
    amount, 
    position.x, 
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET, 
    facing, 
    isBlocked
  ));
}

/**
 * Spawns an evade indicator
 * @param {p5.Vector} position - Position to spawn at
 */
function spawnEvadeIndicator(position) {
  damageNumbers.push(new EvadeIndicator(
    position.x, 
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET
  ));
}

/**
 * Spawns a tremor indicator
 * @param {p5.Vector} position - Position to spawn at
 */
function spawnTremorIndicator(position) {
  damageNumbers.push(new TremorIndicator(
    position.x, 
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET
  ));
}

/**
 * Base class for floating indicators (damage numbers, evade indicators, etc.)
 */
class FloatingIndicator {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.alpha = 255;
    this.life = DAMAGE_CONSTANTS.LIFE_DURATION;
    this.finished = false;
  }

  /**
   * Updates the indicator's position and state
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this.life -= dt;
    this.alpha = map(this.life, 1, 0, 255, 0);
    this.pos.add(this.vel);
    this.vel.mult(DAMAGE_CONSTANTS.DAMPING);
    this.finished = this.life <= 0;
  }

  /**
   * Abstract method for drawing the indicator
   */
  draw() {
    throw new Error('draw() method must be implemented by subclass');
  }
}

/**
 * Damage number display class
 */
class DamageNumber extends FloatingIndicator {
  constructor(value, x, y, facing, isBlocked = false) {
    super(x, y);
    this.value = value;
    this.vel = createVector(
      facing * 1.5 + random(-0.5, 0.5), 
      random(-2.4, -1.4)
    );
    this.size = this.computeSize(value);
    this.isBlocked = isBlocked;
  }

  /**
   * Calculates text size based on damage value
   * @param {number} value - Damage amount
   * @returns {number} Text size
   */
  computeSize(value) {
    if (value <= 70) {
      return DAMAGE_CONSTANTS.BASE_SIZE + value * 0.35;
    }
    if (value <= 500) {
      return DAMAGE_CONSTANTS.BASE_SIZE + 70 * 0.35 + (value - 70) * 0.1;
    }
    return DAMAGE_CONSTANTS.BASE_SIZE + 70 * 0.35 + 430 * 0.1 + log(value - 499) * 4;
  }

  update(dt) {
    super.update(dt);
    this.vel.y -= DAMAGE_CONSTANTS.GRAVITY;
  }

  draw() {
    push();
    textAlign(CENTER, TOP);
    textSize(this.size);
    
    const colors = this.isBlocked 
      ? DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE 
      : DAMAGE_CONSTANTS.COLOR.NORMAL_DAMAGE;
    
    fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
    stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
    strokeWeight(DAMAGE_CONSTANTS.STROKE_WEIGHT);
    
    text(`${floor(this.value)}`, this.pos.x, this.pos.y);
    
    if (this.isBlocked) {
      fill(DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE.fill[0], 
           DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE.fill[1], 
           DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE.fill[2], 
           this.alpha);
      textSize(DAMAGE_CONSTANTS.DEPOWERED_TEXT_SIZE);
      text('depowered', this.pos.x, this.pos.y + this.size * 0.8);
    }
    
    pop();
  }
}

/**
 * Evade indicator display class
 */
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

/**
 * Tremor indicator display class
 */
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
    
    // Use orange/red colors for tremor to distinguish from evade
    fill(255, 100, 50, this.alpha);
    stroke(255, 50, 0, this.alpha);
    strokeWeight(DAMAGE_CONSTANTS.STROKE_WEIGHT);
    
    text('Tremor', this.pos.x, this.pos.y);
    pop();
  }
}