// ==========================
// ==========================
// 💥 IMPACT VISUAL SYSTEM (OPTIMIZED)
// ==========================

// Graphics settings with impact visuals toggle
const graphicsSettings = {
  enableImpactVisuals: true,
  maxActiveVisuals: 60 // Hard cap to prevent performance degradation
};

// Character-specific tints for impact visuals
const IMPACT_TINTS = {
  VALENCINA: { r: 255, g: 247, b: 133 },
  CALLISTO:  { r: 219, g: 0,   b: 55 },
  DIHUI:     { r: 66,  g: 5,   b: 235 }
};

// Default tint for unknown characters
const DEFAULT_TINT = { r: 255, g: 255, b: 255 };

// Active impact visual instances
let activeImpactVisuals = [];

// Pre-allocated sprite name choices to avoid array creation per instance
const SPARK_SPRITES = ['cspark1', 'cspark2', 'cspark3'];
const FLASH_SPRITES = ['flash1', 'flash2', 'flash3'];
const WAVE_SPRITES = ['swav1', 'swav2', 'swav3'];

// Shared random function that's faster than Math.random for visual purposes
let _rngSeed = 1;
function fastRand() {
  _rngSeed = (_rngSeed * 16807) % 2147483647;
  return (_rngSeed - 1) / 2147483646;
}
function fastRandRange(min, max) {
  return min + fastRand() * (max - min);
}
function fastRandInt(n) {
  return Math.floor(fastRand() * n);
}

// Impact visual class for individual particle effects
class ImpactVisual {
  constructor(type, x, y, tint, rotation = 0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.tint = tint;
    this.rotation = rotation;
    this.active = true;
    this.alpha = 255;

    // Per-type state
    switch (type) {
      case 'spark': {
        this.spriteName = SPARK_SPRITES[fastRandInt(3)];
        this.size = fastRandRange(16, 28);
        this.sizeSpeed = fastRandRange(60, 120);
        break;
      }
      case 'flash': {
        this.spriteName = FLASH_SPRITES[fastRandInt(3)];
        this.size = 0;
        this.maxSize = fastRandRange(40, 70);
        this.expandSpeed = fastRandRange(120, 200);
        this.fadeSpeed = fastRandRange(2.0, 3.5);
        break;
      }
      case 'wave': {
        this.spriteName = WAVE_SPRITES[fastRandInt(3)];
        this.size = 0;
        this.maxSize = fastRandRange(50, 90);
        this.expandSpeed = fastRandRange(100, 180);
        this.fadeSpeed = fastRandRange(2.0, 3.0);
        break;
      }
      case 'slash': {
        this.spriteName = 'slash';
        this.width = 0;
        this.height = fastRandRange(30, 50);
        this.maxWidth = fastRandRange(120, 200);
        this.expandSpeed = fastRandRange(300, 500);
        this.contractSpeed = fastRandRange(60, 120);
        break;
      }
      case 'heavyimpact': {
        this.spriteName = 'heavyimpact';
        this.width = 0;
        this.height = fastRandRange(40, 60);
        this.maxWidth = fastRandRange(180, 280);
        this.expandSpeed = fastRandRange(400, 600);
        this.contractSpeed = fastRandRange(80, 140);
        break;
      }
    }
  }

  update(dt) {
    if (!this.active) return;

    switch (this.type) {
      case 'spark':
        this.size -= this.sizeSpeed * dt;
        if (this.size <= 0) {
          this.active = false;
        }
        break;

      case 'flash':
        if (this.size < this.maxSize) {
          this.size += this.expandSpeed * dt;
          if (this.size > this.maxSize) this.size = this.maxSize;
        }
        this.alpha -= this.fadeSpeed * 255 * dt;
        if (this.alpha <= 0) {
          this.active = false;
        }
        break;

      case 'wave':
        if (this.size < this.maxSize) {
          this.size += this.expandSpeed * dt;
          if (this.size > this.maxSize) this.size = this.maxSize;
        }
        this.alpha -= this.fadeSpeed * 255 * dt;
        if (this.alpha <= 0) {
          this.active = false;
        }
        break;

      case 'slash':
        if (this.width < this.maxWidth) {
          this.width += this.expandSpeed * dt;
          if (this.width > this.maxWidth) this.width = this.maxWidth;
        }
        this.height -= this.contractSpeed * dt;
        if (this.height <= 1) {
          this.active = false;
        }
        break;

      case 'heavyimpact':
        if (this.width < this.maxWidth) {
          this.width += this.expandSpeed * dt;
          if (this.width > this.maxWidth) this.width = this.maxWidth;
        }
        this.height -= this.contractSpeed * dt;
        if (this.height <= 1) {
          this.active = false;
        }
        break;
    }
  }

  draw() {
    if (!this.active) return;

    const spriteName = this.spriteName;
    const cached = PARTICLE_SPRITE_CACHE.get(spriteName);
    if (!cached) return;

    let img = cached.img || atlases[cached.sprite.atlas];
    if (!img || img.width <= 0 || img.height <= 0) return;
    cached.img = img;

    push();
    translate(this.x, this.y);

    // Apply rotation
    if (this.rotation !== 0) {
      rotate(this.rotation);
    }

    // Sparks are NOT tinted; all others use character tint
    if (this.type !== 'spark' && this.tint) {
      tint(this.tint.r, this.tint.g, this.tint.b, this.alpha);
    } else if (this.type !== 'spark') {
      tint(255, 255, 255, this.alpha);
    } else {
      // Sparks: white with full alpha, no tint
      tint(255, 255, 255, this.alpha);
    }

    noStroke();
    imageMode(CENTER);

    // Draw based on type
    if (this.type === 'spark') {
      // Sparks: use uniform size
      image(img, 0, 0, this.size, this.size, cached.sx, cached.sy, cached.sw, cached.sh);
    } else if (this.type === 'flash') {
      // Flash: uniform expand
      image(img, 0, 0, this.size, this.size, cached.sx, cached.sy, cached.sw, cached.sh);
    } else if (this.type === 'wave') {
      // Wave: uniform expand
      image(img, 0, 0, this.size, this.size, cached.sx, cached.sy, cached.sw, cached.sh);
    } else if (this.type === 'slash' || this.type === 'heavyimpact') {
      // Slash/Heavy: lengthwise expand, heightwise contract
      image(img, 0, 0, this.width, this.height, cached.sx, cached.sy, cached.sw, cached.sh);
    }

    pop();
  }
}

/**
 * Spawn impact visuals at a given position.
 * Called when damage is dealt to an opponent.
 *
 * @param {number} x - World X position of the hit
 * @param {number} y - World Y position of the hit
 * @param {string} attackerCharKey - Character key of the attacker (for tint)
 * @param {boolean} isBlocking - Whether the target is blocking
 * @param {boolean} isSlamOrUltimateOrThirdHit - Whether this is a slam/ultimate/3rd hit (heavy impact)
 */
function spawnImpactVisuals(x, y, attackerCharKey, isBlocking = false, isSlamOrUltimateOrThirdHit = false) {
  // Respect graphics settings
  if (!graphicsSettings.enableImpactVisuals) return;

  const tint = IMPACT_TINTS[attackerCharKey] || DEFAULT_TINT;

  // Always spawn sparks (not tinted)
  for (let i = 0; i < random(3, 6); i++) {
    const visual = new ImpactVisual('spark', x, y, tint, random(-PI, PI));
    activeImpactVisuals.push(visual);
  }

  // Always spawn flash (tinted)
  for (let i = 0; i < random(2, 4); i++) {
    const visual = new ImpactVisual('flash', x, y, tint, random(-PI, PI));
    activeImpactVisuals.push(visual);
  }

  // Always spawn impact wave (tinted)
  for (let i = 0; i < random(1, 3); i++) {
    const visual = new ImpactVisual('wave', x, y, tint, random(-PI, PI));
    activeImpactVisuals.push(visual);
  }

  // Spawn impact slash if target is NOT blocking (tinted)
  if (!isBlocking) {
    for (let i = 0; i < random(1, 3); i++) {
      const visual = new ImpactVisual('slash', x, y, tint, random(-PI * 0.25, PI * 0.25));
      activeImpactVisuals.push(visual);
    }

    // Spawn heavy impact only for specific cases (tinted)
    if (isSlamOrUltimateOrThirdHit) {
      for (let i = 0; i < random(1, 3); i++) {
        const visual = new ImpactVisual('heavyimpact', x, y, tint, random(-PI * 0.2, PI * 0.2));
        activeImpactVisuals.push(visual);
      }
    }
  }
}

// Update all active impact visuals
function updateImpactVisuals(dt) {
  for (let i = activeImpactVisuals.length - 1; i >= 0; i--) {
    const visual = activeImpactVisuals[i];
    visual.update(dt);
    if (!visual.active) {
      activeImpactVisuals.splice(i, 1);
    }
  }
}

// Draw all active impact visuals
function drawImpactVisuals() {
  for (let i = 0; i < activeImpactVisuals.length; i++) {
    activeImpactVisuals[i].draw();
  }
}

// Clear all impact visuals
function clearImpactVisuals() {
  activeImpactVisuals = [];
}