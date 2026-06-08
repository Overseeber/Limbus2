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
  CRITICAL_SIZE: 24,
  CRITICAL_TEXT_SIZE: 12,
  ICON_SIZE: 16,
  COLOR: {
    NORMAL_DAMAGE: { fill: [255, 255, 255], stroke: [0, 0, 0] },
    BLOCKED_DAMAGE: { fill: [56, 213, 245], stroke: [40, 180, 220] },
    EVADE: { fill: [150, 255, 150], stroke: [100, 200, 100] },
    CRITICAL_DAMAGE: { fill: [246, 255, 0], stroke: [200, 220, 0] },
    BURN_DAMAGE: { fill: [255, 140, 0], stroke: [200, 100, 0] },
    BLEED_DAMAGE: { fill: [255, 50, 50], stroke: [200, 0, 0] },
    TREMOR_DAMAGE: { fill: [231, 255, 143], stroke: [180, 210, 100] },
    RUPTURE_DAMAGE: { fill: [50, 255, 50], stroke: [0, 200, 0] }
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
 * @param {string} damageType - Type of damage ('normal', 'burn', 'bleed', 'tremor', 'rupture')
 * @param {boolean} isCritical - Whether this is a critical hit
 * @param {string} attackType - Type of attack ('normal', 'slam', 'dash', 'ultimate')
 */
function spawnDamageNumber(amount, position, facing, isBlocked = false, damageType = 'normal', isCritical = false, attackType = 'normal') {
  damageNumbers.push(new DamageNumber(
    amount, 
    position.x, 
    position.y + DAMAGE_CONSTANTS.BASE_Y_OFFSET, 
    facing, 
    isBlocked,
    damageType,
    isCritical,
    attackType
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
  constructor(value, x, y, facing, isBlocked = false, damageType = 'normal', isCritical = false, attackType = 'normal') {
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
  }

  /**
   * Calculates text size based on damage value and critical status
   * @param {number} value - Damage amount
   * @returns {number} Text size
   */
  computeSize(value) {
    let baseSize;
    if (value <= 70) {
      baseSize = DAMAGE_CONSTANTS.BASE_SIZE + value * 0.35;
    } else if (value <= 500) {
      baseSize = DAMAGE_CONSTANTS.BASE_SIZE + 70 * 0.35 + (value - 70) * 0.1;
    } else {
      baseSize = DAMAGE_CONSTANTS.BASE_SIZE + 70 * 0.35 + 430 * 0.1 + log(value - 499) * 4;
    }
    
    // Increase size for critical hits
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
    
    // Get colors based on damage type and critical status
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
    
    // Scale icon with damage text size
    const scaledIconSize = this.size;
    
    // Draw the source icon to the left of the damage number
    // Icon is centered vertically with the damage number
    const damageTextX = this.pos.x + (scaledIconSize / 2) + 8;
    const damageTextY = this.pos.y;
    const iconX = this.pos.x - (scaledIconSize / 2) - 8;
    const iconY = this.pos.y + (this.size / 2)+400;
    this.drawAttackIcon(iconX, iconY, colors, scaledIconSize);
    
    // Draw damage number
    textSize(this.size);
    fill(colors.fill[0], colors.fill[1], colors.fill[2], this.alpha);
    stroke(colors.stroke[0], colors.stroke[1], colors.stroke[2], this.alpha);
    strokeWeight(DAMAGE_CONSTANTS.STROKE_WEIGHT);
    text(`${floor(this.value)}`, damageTextX, damageTextY);
    
    // Determine subtext for critical, depowered, or tremor burst
    let subText = null;
    let subTextColor = colors;
    let subTextSize = DAMAGE_CONSTANTS.DEPOWERED_TEXT_SIZE;
    if (this.isCritical) {
      subText = 'CRITICAL!';
      subTextSize = DAMAGE_CONSTANTS.CRITICAL_TEXT_SIZE;
      subTextColor = DAMAGE_CONSTANTS.COLOR.CRITICAL_DAMAGE;
    } else if (this.isBlocked) {
      subText = 'DEPOWERED';
      subTextColor = DAMAGE_CONSTANTS.COLOR.BLOCKED_DAMAGE;
    } else if (this.damageType === 'tremor') {
      subText = 'TREMOR BURST';
      subTextColor = DAMAGE_CONSTANTS.COLOR.TREMOR_DAMAGE;
      subTextSize = DAMAGE_CONSTANTS.CRITICAL_TEXT_SIZE;
    }
    
    if (subText) {
      fill(subTextColor.fill[0], subTextColor.fill[1], subTextColor.fill[2], this.alpha);
      stroke(subTextColor.stroke[0], subTextColor.stroke[1], subTextColor.stroke[2], this.alpha);
      textSize(subTextSize);
      text(subText, damageTextX, damageTextY + this.size * 0.8);
    }
    
    pop();
  }
  
  /**
   * Draws a placeholder icon for the attack type
   * @param {Object} colors - Color object for the icon
   */
  drawAttackIcon(iconX, iconY, colors, scaledSize) {
    push();
    imageMode(CENTER);
    noStroke();

    if (this.damageType === 'burn') {
      drawStatusIcon('Burn', iconX, iconY, scaledSize);
    } else if (this.damageType === 'bleed') {
      drawStatusIcon('Bleed', iconX, iconY, scaledSize);
    } else if (this.damageType === 'rupture') {
      drawStatusIcon('Rupture', iconX, iconY, scaledSize);
    } else if (this.damageType === 'tremor') {
      drawStatusIcon('Tremor', iconX, iconY, scaledSize);
    } else {
      drawStatusIcon('Weapon', iconX, iconY, scaledSize);
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