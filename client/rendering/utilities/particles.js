/**
 * PARTICLE SYSTEM - Client-side rendering utility
 * Handles particle effects for visual feedback
 * Pure client-side visual system - no gameplay logic
 */

const RenderingParticleSystem = {
  particles: [],
  
  /**
   * Initialize particle system
   */
  init() {
    this.particles = [];
  },
  
  /**
   * Update all particles
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Update velocity (gravity, friction)
      if (p.gravity) {
        p.vy += p.gravity * dt;
      }
      if (p.friction) {
        p.vx *= p.friction;
        p.vy *= p.friction;
      }
      
      // Update lifetime
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      
      // Update size
      if (p.shrink) {
        p.size *= p.shrink;
      }
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  },
  
  /**
   * Draw all particles
   */
  draw() {
    for (const p of this.particles) {
      push();
      translate(p.x, p.y);
      
      if (p.rotation) {
        rotate(p.rotation);
      }
      
      fill(p.color[0], p.color[1], p.color[2], p.alpha * 255);
      noStroke();
      
      if (p.shape === 'circle') {
        ellipse(0, 0, p.size, p.size);
      } else if (p.shape === 'rect') {
        rectMode(CENTER);
        rect(0, 0, p.size, p.size);
      } else if (p.shape === 'line') {
        stroke(p.color[0], p.color[1], p.color[2], p.alpha * 255);
        strokeWeight(p.size);
        line(-p.length / 2, 0, p.length / 2, 0);
      }
      
      pop();
    }
  },
  
  /**
   * Spawn a particle
   * @param {Object} config - Particle configuration
   */
  spawn(config) {
    const particle = {
      x: config.x || 0,
      y: config.y || 0,
      vx: config.vx || 0,
      vy: config.vy || 0,
      size: config.size || 10,
      color: config.color || [255, 255, 255],
      life: config.life || 1,
      maxLife: config.life || 1,
      shape: config.shape || 'circle',
      gravity: config.gravity || 0,
      friction: config.friction || 1,
      shrink: config.shrink || 1,
      rotation: config.rotation || 0,
      length: config.length || 10
    };
    
    this.particles.push(particle);
  },
  
  /**
   * Spawn burst of particles
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} count - Number of particles
   * @param {Object} config - Particle configuration
   */
  spawnBurst(x, y, count, config) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = config.speed || 5;
      
      this.spawn({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ...config
      });
    }
  },
  
  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
  },
  
  /**
   * Get particle count
   * @returns {number} Number of active particles
   */
  getCount() {
    return this.particles.length;
  }
};

// Export for client use (browser-compatible)
window.RenderingParticleSystem = RenderingParticleSystem;
