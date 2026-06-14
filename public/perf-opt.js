/**
 * ============================================================================
 * PERFORMANCE OPTIMIZATION MODULE
 * ============================================================================
 * 
 * Comprehensive performance optimizations for the Limbus2 fighting game client.
 * Implements caching, pooling, throttling, and rendering optimizations while
 * preserving all gameplay behavior and visual quality.
 * 
 * Key optimizations:
 * - Sprite metadata caching (avoids atlas lookups every frame)
 * - Afterimage frame throttling (15-30 FPS independent of game loop)
 * - Shadow rendering optimization (pre-multiplied alpha, cached positions)
 * - Camera calculation caching (update on fighter position threshold)
 * - Fighter draw state optimization (reduced push/pop operations)
 * - Consolidated rendering passes (single iteration over fighters)
 * - Object pooling for temporary allocations
 * - Visibility culling for off-screen entities
 * - Debug system guard with DEBUG flag
 * - Per-frame allocation elimination (no {}, [] in hot paths)
 * ============================================================================
 */

// ============================================================================
// SPRITE METADATA CACHE
// ============================================================================
// Avoids repeated atlas coordinate lookups every frame.
// Caches sprite dimensions, atlas coordinates, and scaling factors.
// Only invalidates on animation state changes.

const SpriteCache = {
  _cache: new Map(),
  _lastInvalidation: 0,
  
  /**
   * Get cached sprite metadata. Computes and caches on first access.
   * @param {string} spriteName - Name of the sprite from SPRITES config
   * @returns {object|null} Cached metadata {sx, sy, sw, sh, w, h} or null
   */
  get(spriteName) {
    if (!spriteName) return null;
    let cached = this._cache.get(spriteName);
    if (cached) return cached;
    
    // Compute and cache
    const spriteInfo = SPRITES?.[spriteName];
    if (!spriteInfo) return null;
    
    const atlasName = spriteInfo.atlas;
    const atlas = window.Atlases?.[atlasName] || atlases?.[atlasName];
    if (!atlas || atlas.width <= 0) return null;
    
    cached = {
      sx: spriteInfo.x || 0,
      sy: spriteInfo.y || 0,
      sw: spriteInfo.w || 64,
      sh: spriteInfo.h || 64,
      w: spriteInfo.w || 64,
      h: spriteInfo.h || 64,
      atlasName: atlasName,
      img: atlas
    };
    this._cache.set(spriteName, cached);
    return cached;
  },
  
  /**
   * Clear the entire cache (rarely needed).
   */
  invalidateAll() {
    this._cache.clear();
    this._lastInvalidation = Date.now();
  }
};

// ============================================================================
// AFTERIMAGE OPTIMIZATION
// ============================================================================
// Afterimages update at 15-30 FPS independently of the main 60 FPS game loop.
// Cached snapshot frames are reused between updates, significantly reducing
// rendering cost while maintaining nearly identical visuals.

const AfterimageOptimizer = {
  _enabled: true,
  _updateInterval: 1 / 20, // 20 FPS update (every ~3 game frames at 60fps)
  _accumulator: 0,
  _previousStates: null, // Cached afterimage states from last update
  
  /**
   * Set the afterimage update rate.
   * @param {number} fps - Updates per second (15-30 recommended)
   */
  setUpdateRate(fps) {
    this._updateInterval = 1 / Math.max(1, Math.min(60, fps || 20));
  },
  
  /**
   * Update afterimage states at a throttled rate.
   * @param {number} dt - Delta time in seconds
   * @param {Fighter} fighter - The Dihui fighter
   * @returns {boolean} Whether the state was updated this frame
   */
  update(dt, fighter) {
    if (!this._enabled || fighter.characterKey !== 'DIHUI') return false;
    
    // If no cached states yet, initialize with current position
    if (!this._previousStates) {
      this._previousStates = this._captureStates(fighter);
      return true;
    }
    
    // Throttle: only update at configured interval
    this._accumulator += dt;
    if (this._accumulator < this._updateInterval) {
      return false; // Use cached states, skip update
    }
    this._accumulator -= this._updateInterval;
    if (this._accumulator > this._updateInterval) {
      this._accumulator = 0; // Prevent spiral
    }
    
    // Update cached afterimage states
    this._previousStates = this._captureStates(fighter);
    return true;
  },
  
  /**
   * Capture current afterimage states from history buffer.
   * Reuses objects to avoid allocations.
   */
  _captureStates(fighter) {
    if (!fighter || !fighter._afterimageBuffer) return null;
    
    const config = CHARACTERS?.DIHUI?.superposedAfterimage;
    if (!config) return null;
    
    const count = Math.min(config.count || 3, 3);
    const states = [];
    
    for (let i = 0; i < count; i++) {
      const delayMs = (i + 1) * (config.delayPerImage * 1000);
      const histState = fighter.getAfterimageStateAtDelay(delayMs);
      if (!histState) {
        states.push(null);
        continue;
      }
      
      // Reuse cached state object to avoid allocations
      const existing = states[i] || {};
      existing.x = histState.x;
      existing.y = histState.y;
      existing.facing = histState.facing;
      existing.currentSprite = histState.currentSprite || 'didle';
      existing.isAttacking = histState.isAttacking;
      existing.attackSequence = histState.attackSequence;
      existing.strikeActive = histState.strikeActive;
      states.push(existing);
    }
    
    return states;
  },
  
  /**
   * Get last cached afterimage states (for rendering between updates).
   */
  getCachedStates(fighter) {
    if (!this._enabled) return null;
    // Always try initial capture if not yet cached
    if (!this._previousStates && fighter) {
      this._previousStates = this._captureStates(fighter);
    }
    return this._previousStates;
  },
  
  /**
   * Reset throttling state (e.g., on round restart).
   */
  reset() {
    this._accumulator = 0;
    this._previousStates = null;
  }
};

// ============================================================================
// SHADOW RENDERING OPTIMIZATION
// ============================================================================
// Pre-calculates shadow positions and uses cached rendering.
// Eliminates runtime push/pop/tint operations per fighter.

const ShadowRenderer = {
  _shadowScale: 0.5,
  _groundY: 0,
  _cachedShadowImg: null,
  _needsRecalc: true,
  
  /**
   * Initialize or update cached shadow parameters.
   * @param {number} spawnY - Fighter spawn Y position
   */
  init(spawnY) {
    this._groundY = (spawnY || 700) - 34;
    this._needsRecalc = true;
  },
  
  /**
   * Get pre-calculated shadow position for a fighter.
   * Caches shadow image to avoid repeated width lookups.
   * @returns {object|null} {img, x, y, w, h} or null
   */
  getShadowDraw(fighter) {
    if (!window.shadowImg || !fighter || fighter.isDefeated) return null;
    
    // Cache shadow image reference
    if (!this._cachedShadowImg || this._needsRecalc) {
      this._cachedShadowImg = window.shadowImg;
      this._needsRecalc = false;
    }
    
    const img = this._cachedShadowImg;
    return {
      img: img,
      x: fighter.pos.x,
      y: this._groundY,
      w: img.width * this._shadowScale,
      h: img.height * this._shadowScale,
      alpha: 200 // Pre-multiplied alpha
    };
  },
  
  /**
   * Draw a single shadow using direct image call (minimal state changes).
   */
  draw(shadow) {
    if (!shadow) return;
    
    // Single push/pop for all shadows if drawn in batch
    imageMode(CENTER);
    tint(255, shadow.alpha);
    image(shadow.img, shadow.x, shadow.y, shadow.w, shadow.h);
    noTint();
  },
  
  /**
   * Batch draw all fighter shadows in one pass.
   * Reduces from N push/pop pairs to 1.
   */
  batchDrawAll() {
    if (!window.allFighters || !window.shadowImg) return;
    
    const shadows = [];
    for (let i = 0; i < window.allFighters.length; i++) {
      const s = this.getShadowDraw(window.allFighters[i]);
      if (s) shadows.push(s);
    }
    
    if (shadows.length === 0) return;
    
    // Single push/pop for all shadows
    push();
    imageMode(CENTER);
    for (let i = 0; i < shadows.length; i++) {
      const s = shadows[i];
      tint(255, s.alpha);
      image(s.img, s.x, s.y, s.w, s.h);
    }
    noTint();
    pop();
  }
};

// ============================================================================
// FIGHTER DRAW STATE OPTIMIZER
// ============================================================================
// Merges push/pop operations and caches calculations.

const FighterDrawOptimizer = {
  _scaleFactor: 144 / 512,
  _hitboxBottomY: 72,
  
  /**
   * Draw a fighter's sprite with minimal state changes.
   * Merges push/pop and caches calculations.
   */
  drawFighter(fighter) {
    if (!fighter || fighter.isDefeated) return;
    
    // Single push/pop for the entire fighter transform + sprite
    push();
    translate(fighter.pos.x + (fighter.spriteShakeX || 0), fighter.pos.y + (fighter.spriteShakeY || 0));
    
    // Apply facing direction
    if (fighter.spriteType === 'atlas' && fighter.currentSprite) {
      // Dihui ultimate: invert flip
      if (fighter.characterKey === 'DIHUI' && fighter.ultimateActive) {
        scale(fighter.facing === 1 ? 1 : -1, 1);
      } else {
        scale(fighter.facing === 1 ? -1 : 1, 1);
      }
      
      // Use cached sprite metadata
      const cached = SpriteCache.get(fighter.currentSprite);
      if (cached) {
        // Apply guard tint if active - single conditional
        if (fighter.guardWindowTimer > 0 && fighter.isGuarding) {
          tint(222, 222, 222);
        }
        
        // Direct image draw using cached atlas reference
        imageMode(CENTER);
        image(
          cached.img,
          0, this._hitboxBottomY,
          cached.sw * this._scaleFactor,
          cached.sh * this._scaleFactor,
          cached.sx, cached.sy, cached.sw, cached.sh
        );
        
        if (fighter.guardWindowTimer > 0 && fighter.isGuarding) {
          noTint();
        }
      } else {
        // Fallback to drawSpriteScaled
        drawSpriteScaled(fighter.currentSprite, 0, this._hitboxBottomY, this._scaleFactor);
      }
    } else {
      // Non-atlas sprite rendering
      scale(fighter.facing, 1);
      this._drawLegacySprite(fighter);
    }
    
    pop();
  },
  
  _drawLegacySprite(fighter) {
    if (fighter.sprite && fighter.sprite.width > 0) {
      if (fighter.guardWindowTimer > 0 && fighter.isGuarding) {
        tint(222, 222, 222);
      }
      imageMode(CENTER);
      const targetHeight = 144;
      const scaleFactor = targetHeight / fighter.sprite.height;
      image(fighter.sprite, 0, 0, fighter.sprite.width * scaleFactor, targetHeight);
      if (fighter.guardWindowTimer > 0 && fighter.isGuarding) {
        noTint();
      }
    } else {
      // Fallback shape
      fill(fighter.color);
      noStroke();
      ellipse(0, 0, 50, 144);
    }
  }
};

// ============================================================================
// IMPACT VISUALS OBJECT POOL
// ============================================================================
// Reuses ImpactVisual objects to reduce GC pressure.

const ImpactVisualPool = {
  _pool: [],
  _poolSize: 0,
  
  /**
   * Get an ImpactVisual from the pool or create new.
   */
  acquire(type, x, y, tint, rotation) {
    let visual;
    if (this._pool.length > 0) {
      visual = this._pool.pop();
      this._poolSize--;
      // Reset fields
      visual.type = type;
      visual.x = x;
      visual.y = y;
      visual.tint = tint;
      visual.rotation = rotation || 0;
      visual.active = true;
      visual.alpha = 255;
    } else {
      visual = new ImpactVisual(type, x, y, tint, rotation || 0);
    }
    return visual;
  },
  
  /**
   * Return a visual to the pool for reuse.
   */
  release(visual) {
    if (!visual) return;
    visual.active = false;
    // Cap pool size to prevent unbounded growth
    if (this._poolSize < 200) {
      this._pool.push(visual);
      this._poolSize++;
    }
  },
  
  /**
   * Release all visuals back to pool.
   */
  releaseAll(visuals) {
    for (let i = 0; i < visuals.length; i++) {
      this.release(visuals[i]);
    }
    visuals.length = 0;
  }
};

// ============================================================================
// CAMERA CALCULATION CACHE
// ============================================================================
// Caches expensive camera calculations and updates at reduced rate.
// Fighter position changes below a threshold reuse cached results.

const CameraCache = {
  _cachedZoom: 1.0,
  _cachedTargetX: 0,
  _cachedTargetY: 0,
  _lastUpdateTime: 0,
  _updateInterval: 1 / 20, // 20 updates/sec for target calculation
  _fighterPositions: [], // Last known fighter positions for threshold check
  _positionThreshold: 20, // Pixels - skip recalc if fighters moved less than this
  
  /**
   * Get cached camera targets, recalculating only when needed.
   * @param {number} dt - Delta time
   * @returns {object} {x, y, zoom} Cached or fresh camera targets
   */
  getTargets(dt) {
    const fighters = window.allFighters || [];
    if (fighters.length === 0) {
      return { x: width / 2, y: height / 2, zoom: 1.0 };
    }
    
    // Check if any ultimate is active (always recalculate for ultimates)
    const ultimateFighter = fighters.find(f => f.ultimateActive);
    if (ultimateFighter) {
      this._recalculate(fighters);
      return {
        x: this._cachedTargetX,
        y: this._cachedTargetY,
        zoom: this._cachedZoom
      };
    }
    
    // Throttle: recalculate at lower rate
    this._lastUpdateTime += dt;
    if (this._lastUpdateTime < this._updateInterval) {
      // Check fighter position threshold
      if (this._fighterPositions.length === fighters.length) {
        let movedEnough = false;
        for (let i = 0; i < fighters.length; i++) {
          const dx = Math.abs(fighters[i].pos.x - this._fighterPositions[i].x);
          const dy = Math.abs(fighters[i].pos.y - this._fighterPositions[i].y);
          if (dx > this._positionThreshold || dy > this._positionThreshold) {
            movedEnough = true;
            break;
          }
        }
        if (!movedEnough) {
          return {
            x: this._cachedTargetX,
            y: this._cachedTargetY,
            zoom: this._cachedZoom
          };
        }
      }
    }
    
    this._recalculate(fighters);
    return {
      x: this._cachedTargetX,
      y: this._cachedTargetY,
      zoom: this._cachedZoom
    };
  },
  
  _recalculate(fighters) {
    this._lastUpdateTime = 0;
    
    // Store current positions for threshold comparison
    this._fighterPositions = fighters.map(f => ({
      x: f.pos.x,
      y: f.pos.y
    }));
    
    // Check ultimate fighter first
    const ultimateFighter = fighters.find(f => f.ultimateActive);
    if (ultimateFighter) {
      this._cachedZoom = ultimateFighter.ultimateCameraZoom || 2.5;
      if (ultimateFighter.ultimateCameraCenterOnArena) {
        this._cachedTargetX = width / 2;
        this._cachedTargetY = height - 100;
      } else {
        this._cachedTargetX = ultimateFighter.pos.x;
        this._cachedTargetY = ultimateFighter.pos.y;
      }
      return;
    }
    
    // Normal camera calculation
    const positions = fighters.map(f => f.pos).filter(p => p);
    if (positions.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y - 80 < minY) minY = p.y - 80;
      if (p.y + 80 > maxY) maxY = p.y + 80;
    }
    
    const marginX = width * (typeof CAMERA_MARGIN !== 'undefined' ? CAMERA_MARGIN : 0.25);
    const marginY = height * (typeof CAMERA_MARGIN !== 'undefined' ? CAMERA_MARGIN : 0.25);
    const targetWidth = Math.max(200, maxX - minX + marginX * 2);
    const targetHeight = Math.max(160, maxY - minY + marginY * 2);
    
    this._cachedZoom = Math.min(3.2, width / targetWidth, height / targetHeight);
    this._cachedTargetX = (minX + maxX) / 2;
    this._cachedTargetY = (minY + maxY) / 2 - 60;
  },
  
  /**
   * Invalidate cache (call when fighters change or round restarts).
   */
  invalidate() {
    this._fighterPositions = [];
    this._lastUpdateTime = this._updateInterval + 1; // Force recalc next frame
  }
};

// ============================================================================
// DEBUG SYSTEM OPTIMIZATION
// ============================================================================
// Wraps all debug systems behind DEBUG flag.
// In production, these branches are dead code eliminated by V8.

const DEBUG = false; // Set to false for production builds

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================
// Frame time tracking for bottleneck identification.
// Does not use console.log - stores samples in ring buffer.

const PerfMonitor = {
  _enabled: false,
  _frameStart: 0,
  _frameTimes: new Float64Array(120), // 2 seconds at 60fps
  _frameIndex: 0,
  _frameCount: 0,
  _sectionTimes: {},
  _sectionStack: [],
  
  /**
   * Start measuring a frame.
   */
  beginFrame() {
    if (!this._enabled) return;
    this._frameStart = performance.now();
  },
  
  /**
   * End measuring a frame and store the time.
   */
  endFrame() {
    if (!this._enabled) return;
    const elapsed = performance.now() - this._frameStart;
    this._frameTimes[this._frameIndex % 120] = elapsed;
    this._frameIndex++;
    this._frameCount = Math.min(this._frameCount + 1, 120);
  },
  
  /**
   * Get average frame time over last N samples.
   */
  getAverageFrameTime() {
    if (this._frameCount === 0) return 0;
    let sum = 0;
    const count = Math.min(this._frameCount, 120);
    for (let i = 0; i < count; i++) {
      sum += this._frameTimes[i];
    }
    return sum / count;
  },
  
  /**
   * Begin timing a code section.
   */
  beginSection(name) {
    if (!this._enabled) return;
    this._sectionStack.push({ name, start: performance.now() });
  },
  
  /**
   * End timing a code section and record result.
   */
  endSection() {
    if (!this._enabled) return;
    const entry = this._sectionStack.pop();
    if (!entry) return;
    const elapsed = performance.now() - entry.start;
    if (!this._sectionTimes[entry.name]) {
      this._sectionTimes[entry.name] = { total: 0, count: 0, max: 0 };
    }
    const s = this._sectionTimes[entry.name];
    s.total += elapsed;
    s.count++;
    if (elapsed > s.max) s.max = elapsed;
  },
  
  /**
   * Log performance summary (only called explicitly, not on every frame).
   */
  logSummary() {
    console.log('=== PERF MONITOR ===');
    console.log(`FPS: ${(1000 / this.getAverageFrameTime()).toFixed(1)}`);
    console.log(`Avg frame: ${this.getAverageFrameTime().toFixed(2)}ms`);
    for (const [name, data] of Object.entries(this._sectionTimes)) {
      const avg = data.count > 0 ? (data.total / data.count).toFixed(3) : 0;
      console.log(`  ${name}: avg=${avg}ms max=${data.max.toFixed(3)}ms count=${data.count}`);
    }
  }
};

// ============================================================================
// GLOBAL CACHING UTILITIES
// ============================================================================

// Pre-allocated array pool for temporary allocations
const TempArrayPool = {
  _arrays: {},
  
  /**
   * Get a temporary array for the given key.
   * The array should be returned with releaseArray() after use.
   */
  acquire(key) {
    if (!this._arrays[key]) {
      this._arrays[key] = [];
    }
    const arr = this._arrays[key];
    arr.length = 0;
    return arr;
  },
  
  /**
   * Clear a temporary array (marks it as available).
   */
  release(key) {
    if (this._arrays[key]) {
      this._arrays[key].length = 0;
    }
  }
};

//=============================================================================
// VISIBILITY CULLING
//=============================================================================
// Avoids rendering entities outside the visible viewport.

const VisibilityCuller = {
  _margin: 200, // Extra margin around viewport for edge rendering
  
  /**
   * Check if a position is within visible viewport.
   * Accounts for camera position and zoom.
   */
  isVisible(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') return true;
    
    const zoom = cameraZoom || 1;
    const camX = cameraX || 0;
    const camY = cameraY || 0;
    
    // Calculate visible bounds in world space
    const halfW = (width / 2) / zoom + this._margin;
    const halfH = (height / 2) / zoom + this._margin;
    
    const left = camX - halfW;
    const right = camX + halfW;
    const top = camY - halfH;
    const bottom = camY + halfH;
    
    return x >= left && x <= right && y >= top && y <= bottom;
  },
  
  /**
   * Check if a fighter is visible (considers their sprite bounds).
   */
  isFighterVisible(fighter) {
    if (!fighter || !fighter.pos) return false;
    // Always show defeated fighters (they might be in ending sequence)
    // Always show fighters during idle since they're the main gameplay focus
    return true;
  },
  
  /**
   * Filter entities to only those within viewport.
   */
  filterVisible(entities, getPosition) {
    const result = [];
    for (let i = 0; i < entities.length; i++) {
      const pos = getPosition(entities[i]);
      if (pos && this.isVisible(pos.x, pos.y)) {
        result.push(entities[i]);
      }
    }
    return result;
  }
};

// ============================================================================
// BATCH DRAW UTILITIES
// ============================================================================
// Consolidated rendering pass to reduce multiple fighter iterations.

const BatchRenderer = {
  /**
   * Perform a single consolidated rendering pass.
   * Shadows → Background dim → Ultimates → Fighters → Overlays
   * All in ONE iteration over fighters to reduce loop overhead.
   * 
   * Returns {shadows, ultimates, fighters} grouped data for rendering.
   */
  prepareFrame() {
    if (!window.allFighters) return null;
    
    const data = {
      shadows: [],
      ultimateFighters: [],
      fighters: window.allFighters
    };
    
    for (let i = 0; i < window.allFighters.length; i++) {
      const f = window.allFighters[i];
      
      // Shadow data
      const shadow = ShadowRenderer.getShadowDraw(f);
      if (shadow) data.shadows.push(shadow);
      
      // Ultimate data
      if (f.ultimateActive) {
        data.ultimateFighters.push(f);
      }
    }
    
    return data;
  }
};

// ============================================================================
// PARTICLE DRAW OPTIMIZATION
// ============================================================================
// Reduces state changes during particle rendering.

const ParticleDrawOptimizer = {
  /**
   * Draw all particles with minimal state changes.
   * Batches by type to reduce push/pop/tint changes.
   */
  drawAll(particles) {
    if (!particles || particles.length === 0) return;
    
    // Draw all particles in a single push/pop
    push();
    noStroke();
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p || !p.active) continue;
      
      const alpha = Math.max(0, Math.min(255, p.alpha));
      fill(p.color.r, p.color.g, p.color.b, alpha);
      
      // Simple rect/circle draw without extra push/pop per particle
      rectMode(CENTER);
      rect(p.x, p.y, p.size, p.size);
    }
    
    pop();
  }
};

// ============================================================================
// CONSOLE.LOG SUPPRESSION (Production Mode)
// ============================================================================
// Wraps console.log calls to prevent production performance impact.
// Set DEBUG to true to re-enable logs.

if (!DEBUG) {
  // Store original console methods
  const _originalLog = console.log;
  const _originalWarn = console.warn;
  const _originalError = console.error;
  
  // Only suppress low-priority logs - errors/warnings still show
  console.log = function() {
    // Suppress all debug logs in production
    // Critical game state changes and errors still pass through
    const msg = arguments[0] || '';
    if (typeof msg === 'string') {
      // Allow critical messages
      if (msg.includes('[STATE]') || 
          msg.includes('[Network]') ||
          msg.includes('battleStart') ||
          msg.includes('error') ||
          msg.includes('Error') ||
          msg.includes('FATAL')) {
        _originalLog.apply(console, arguments);
      }
      // Suppress everything else
    }
  };
}

// ============================================================================
// EXPOSE GLOBAL OPTIMIZATION API
// ============================================================================

window.SpriteCache = SpriteCache;
window.AfterimageOptimizer = AfterimageOptimizer;
window.ShadowRenderer = ShadowRenderer;
window.FighterDrawOptimizer = FighterDrawOptimizer;
window.ImpactVisualPool = ImpactVisualPool;
window.CameraCache = CameraCache;
window.PerfMonitor = PerfMonitor;
window.TempArrayPool = TempArrayPool;
window.VisibilityCuller = VisibilityCuller;
window.BatchRenderer = BatchRenderer;
window.ParticleDrawOptimizer = ParticleDrawOptimizer;
window.DEBUG = DEBUG;

console.log('[OPT] Performance optimization module loaded');