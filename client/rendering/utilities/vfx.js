/**
 * VFX SYSTEM - Client-side rendering utility
 * Handles visual effects like slash effects, screen flash, etc.
 * Pure client-side visual system - no gameplay logic
 */

const RenderingVFX = {
  activeEffects: [],
  
  /**
   * Initialize VFX system
   */
  init() {
    this.activeEffects = [];
  },
  
  /**
   * Update all visual effects
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      
      effect.life -= dt;
      
      if (effect.life <= 0) {
        this.activeEffects.splice(i, 1);
      }
    }
  },
  
  /**
   * Draw all visual effects
   */
  draw() {
    for (const effect of this.activeEffects) {
      this.drawEffect(effect);
    }
  },
  
  /**
   * Draw a single effect
   * @param {Object} effect - Effect object
   */
  drawEffect(effect) {
    const alpha = effect.life / effect.maxLife;
    
    push();
    translate(effect.x, effect.y);
    
    if (effect.rotation) {
      rotate(effect.rotation);
    }
    
    if (effect.scale) {
      scale(effect.scale);
    }
    
    switch (effect.type) {
      case 'slash':
        this.drawSlashEffect(effect, alpha);
        break;
      case 'flash':
        this.drawFlashEffect(effect, alpha);
        break;
      case 'explosion':
        this.drawExplosionEffect(effect, alpha);
        break;
      default:
        console.warn('Unknown effect type:', effect.type);
    }
    
    pop();
  },
  
  /**
   * Draw slash effect
   * @param {Object} effect - Effect configuration
   * @param {number} alpha - Opacity (0-1)
   */
  drawSlashEffect(effect, alpha) {
    if (effect.spriteName && typeof drawSprite === 'function') {
      // Use sprite if available
      drawSprite(effect.spriteName, 0, 0);
    } else {
      // Fallback to line drawing
      stroke(255, 255, 255, alpha * 255);
      strokeWeight(effect.size || 5);
      line(-effect.length / 2, 0, effect.length / 2, 0);
    }
  },
  
  /**
   * Draw flash effect
   * @param {Object} effect - Effect configuration
   * @param {number} alpha - Opacity (0-1)
   */
  drawFlashEffect(effect, alpha) {
    noStroke();
    fill(255, 255, 255, alpha * 255);
    rectMode(CENTER);
    rect(0, 0, effect.width || width, effect.height || height);
  },
  
  /**
   * Draw explosion effect
   * @param {Object} effect - Effect configuration
   * @param {number} alpha - Opacity (0-1)
   */
  drawExplosionEffect(effect, alpha) {
    noStroke();
    fill(effect.color[0], effect.color[1], effect.color[2], alpha * 255);
    ellipse(0, 0, effect.size || 50, effect.size || 50);
  },
  
  /**
   * Spawn a slash effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} config - Effect configuration
   */
  spawnSlash(x, y, config) {
    const effect = {
      type: 'slash',
      x: x,
      y: y,
      life: config.life || 0.3,
      maxLife: config.life || 0.3,
      rotation: config.rotation || 0,
      scale: config.scale || 1,
      spriteName: config.spriteName || null,
      length: config.length || 100,
      size: config.size || 5
    };
    
    this.activeEffects.push(effect);
  },
  
  /**
   * Spawn a flash effect
   * @param {Object} config - Effect configuration
   */
  spawnFlash(config) {
    const effect = {
      type: 'flash',
      x: 0,
      y: 0,
      life: config.life || 0.1,
      maxLife: config.life || 0.1,
      width: config.width || width,
      height: config.height || height
    };
    
    this.activeEffects.push(effect);
  },
  
  /**
   * Spawn an explosion effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} config - Effect configuration
   */
  spawnExplosion(x, y, config) {
    const effect = {
      type: 'explosion',
      x: x,
      y: y,
      life: config.life || 0.5,
      maxLife: config.life || 0.5,
      color: config.color || [255, 200, 100],
      size: config.size || 50
    };
    
    this.activeEffects.push(effect);
  },
  
  /**
   * Clear all effects
   */
  clear() {
    this.activeEffects = [];
  },
  
  /**
   * Get effect count
   * @returns {number} Number of active effects
   */
  getCount() {
    return this.activeEffects.length;
  }
};

// Export for client use (browser-compatible)
window.RenderingVFX = RenderingVFX;
