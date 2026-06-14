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

/**
 * Toggle impact visuals on/off.
 * Can be called from settings panel.
 */
function toggleImpactVisuals() {
  graphicsSettings.enableImpactVisuals = !graphicsSettings.enableImpactVisuals;
  if (!graphicsSettings.enableImpactVisuals) {
    clearImpactVisuals();
  }
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

    // Per-type state — all sizes scaled x2 for more visible impact
    // (x2 applied to base sizes, speeds unchanged to keep duration natural)
    switch (type) {
      case 'spark': {
        this.spriteName = SPARK_SPRITES[fastRandInt(3)];
        this.size = fastRandRange(32, 56);          // was 16-28 (x2)
        this.sizeSpeed = fastRandRange(60, 120);     // same speed
        break;
      }
      case 'flash': {
        this.spriteName = FLASH_SPRITES[fastRandInt(3)];
        this.size = 0;
        this.maxSize = fastRandRange(80, 140);       // was 40-70 (x2)
        this.expandSpeed = fastRandRange(240, 400);  // was 120-200 (x2)
        this.fadeSpeed = fastRandRange(2.0, 3.5);    // same
        break;
      }
      case 'wave': {
        this.spriteName = WAVE_SPRITES[fastRandInt(3)];
        this.size = 0;
        this.maxSize = fastRandRange(100, 180);      // was 50-90 (x2)
        this.expandSpeed = fastRandRange(200, 360);  // was 100-180 (x2)
        this.fadeSpeed = fastRandRange(2.0, 3.0);
        break;
      }
      case 'slash': {
        this.spriteName = 'slash';
        this.width = 0;
        this.height = fastRandRange(60, 100);        // was 30-50 (x2)
        this.maxWidth = fastRandRange(240, 400);     // was 120-200 (x2)
        this.expandSpeed = fastRandRange(600, 1000); // was 300-500 (x2)
        this.contractSpeed = fastRandRange(120, 240);// was 60-120 (x2)
        break;
      }
      case 'heavyimpact': {
        this.spriteName = 'heavyimpact';
        this.width = 0;
        this.height = fastRandRange(80, 120);        // was 40-60 (x2)
        this.maxWidth = fastRandRange(360, 560);     // was 180-280 (x2)
        this.expandSpeed = fastRandRange(800, 1200); // was 400-600 (x2)
        this.contractSpeed = fastRandRange(160, 280);// was 80-140 (x2)
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
      tint(255, 255, 255, this.alpha);
    }

    noStroke();
    imageMode(CENTER);

    // Draw based on type
    if (this.type === 'spark') {
      image(img, 0, 0, this.size, this.size, cached.sx, cached.sy, cached.sw, cached.sh);
    } else if (this.type === 'flash') {
      image(img, 0, 0, this.size, this.size, cached.sx, cached.sy, cached.sw, cached.sh);
    } else if (this.type === 'wave') {
      image(img, 0, 0, this.size, this.size, cached.sx, cached.sy, cached.sw, cached.sh);
    } else if (this.type === 'slash' || this.type === 'heavyimpact') {
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
 * @param {boolean} isBlocking - Whether the target is blocking (if true, slash not drawn)
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

  // Spawn impact slash + heavyimpact if target is NOT blocking (tinted)
  // Parry is also a defensive state — slash is NOT drawn on parry either
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

/**
 * Spawn impact visuals for a parry event.
 * The defender (parrier) provides the tint color, but the visual
 * appears on the attacker's (parried fighter's) position.
 * Slash portion is NOT drawn on parry (consistent with blocking).
 *
 * @param {number} x - World X position (parried fighter location)
 * @param {number} y - World Y position
 * @param {string} defenderCharKey - Character key of the one who parried (tint source)
 */
function spawnParryImpactVisuals(x, y, defenderCharKey) {
  if (!graphicsSettings.enableImpactVisuals) return;

  const tint = IMPACT_TINTS[defenderCharKey] || DEFAULT_TINT;

  // Sparks (not tinted) - fewer for parry since it's a brief event
  for (let i = 0; i < random(2, 4); i++) {
    const visual = new ImpactVisual('spark', x, y, tint, random(-PI, PI));
    activeImpactVisuals.push(visual);
  }

  // Flash (tinted with defender's color)
  for (let i = 0; i < random(2, 3); i++) {
    const visual = new ImpactVisual('flash', x, y, tint, random(-PI, PI));
    activeImpactVisuals.push(visual);
  }

  // Impact wave (tinted with defender's color) — no slash on parry
  for (let i = 0; i < random(1, 2); i++) {
    const visual = new ImpactVisual('wave', x, y, tint, random(-PI, PI));
    activeImpactVisuals.push(visual);
  }
  // Intentionally no slash/heavyimpact — parry is a defensive action, no blade cuts through
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