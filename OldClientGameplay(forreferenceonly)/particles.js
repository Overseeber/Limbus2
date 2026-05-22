// ==========================
// 🎯 RESOURCE-EFFICIENT PARTICLE SYSTEM
// ==========================

// Particle pool for object recycling (resource efficient)
const PARTICLE_POOL_SIZE = 100;
let particlePool = [];
let activeParticles = [];

// Particle types with configurations
const PARTICLE_TYPES = {
  SPARK: {
    name: 'spark',
    lifetime: 0.3,
    gravity: 0.2,
    friction: 0.95,
    size: { min: 2, max: 4 },
    speed: { min: 50, max: 150 },
    spread: Math.PI * 0.5, // 90 degree spread
    color: { r: 255, g: 200, b: 100 }, // Yellow-orange sparks
    fadeOut: true
  },
  DEBRIS: {
    name: 'debris',
    lifetime: 0.8,
    gravity: 0.5,
    friction: 0.92,
    size: { min: 3, max: 8 },
    speed: { min: 30, max: 100 },
    spread: Math.PI * 0.8, // 144 degree spread
    color: { r: 150, g: 120, b: 80 }, // Brown debris
    fadeOut: true
  },
  GUARD_SPARK: {
    name: 'guard_spark',
    lifetime: 0.2,
    gravity: 0.1,
    friction: 0.96,
    size: { min: 1, max: 3 },
    speed: { min: 80, max: 200 },
    spread: Math.PI * 0.3, // 54 degree spread (more focused)
    color: { r: 200, g: 200, b: 255 }, // Blue-white guard sparks
    fadeOut: true
  }
};

// Particle class definition
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 2;
    this.lifetime = 0;
    this.maxLifetime = 0.3;
    this.type = null;
    this.config = null; // Cache config to avoid repeated lookups
    this.color = { r: 255, g: 255, b: 255 };
    this.alpha = 255;
    this.active = false;
  }

  initialize(x, y, type, angle = null) {
    this.config = PARTICLE_TYPES[type];
    if (!this.config) return false;

    this.x = x;
    this.y = y;
    this.type = type;
    this.maxLifetime = this.config.lifetime;
    this.lifetime = this.config.lifetime;
    
    // Random velocity spread
    const spreadAngle = angle !== null ? angle : random(-this.config.spread / 2, this.config.spread / 2);
    const speed = random(this.config.speed.min, this.config.speed.max);
    this.vx = cos(spreadAngle) * speed;
    this.vy = sin(spreadAngle) * speed - random(20, 50); // Add upward bias
    
    this.size = random(this.config.size.min, this.config.size.max);
    this.color = { ...this.config.color };
    this.alpha = 255;
    this.active = true;
    
    return true;
  }

  update(dt) {
    if (!this.active) return;

    // Update lifetime
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.active = false;
      return;
    }

    // Use cached config
    const config = this.config;
    if (!config) return;

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Apply physics
    this.vy += config.gravity * dt * 60; // Scale gravity by 60 for consistency
    this.vx *= config.friction;
    this.vy *= config.friction;

    // Update alpha for fade out
    if (config.fadeOut) {
      this.alpha = (this.lifetime / this.maxLifetime) * 255;
    }
  }

  draw() {
    if (!this.active) return;

    push();
    
    // Set color with alpha
    const alpha = max(0, min(255, this.alpha));
    fill(this.color.r, this.color.g, this.color.b, alpha);
    noStroke();
    
    // Draw simple shape based on particle type
    switch (this.type) {
      case 'SPARK':
      case 'GUARD_SPARK':
        // Draw as small diamond/star shape
        push();
        translate(this.x, this.y);
        rotate(frameCount * 0.1); // Slight rotation for sparkle effect
        rectMode(CENTER);
        rect(0, 0, this.size, this.size);
        pop();
        break;
        
      case 'DEBRIS':
        // Draw as irregular rectangle
        push();
        translate(this.x, this.y);
        rotate(random(TWO_PI)); // Random rotation
        rectMode(CENTER);
        rect(0, 0, this.size * random(0.8, 1.2), this.size * random(0.6, 1.4));
        pop();
        break;
        
      default:
        // Default circle
        circle(this.x, this.y, this.size);
        break;
    }
    
    pop();
  }
}

// Initialize particle pool
function initializeParticlePool() {
  particlePool = [];
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    particlePool.push(new Particle());
  }
  activeParticles = [];
}

// Get particle from pool
function getParticleFromPool() {
  // Find inactive particle - use indexed loop for better performance
  for (let i = 0, len = particlePool.length; i < len; i++) {
    if (!particlePool[i].active) {
      return particlePool[i];
    }
  }
  
  // If no inactive particles, recycle oldest active one
  if (activeParticles.length > 0) {
    const recycled = activeParticles.shift();
    recycled.reset();
    return recycled;
  }
  
  // Create new particle if pool is exhausted (shouldn't happen with proper sizing)
  return new Particle();
}

// Spawn particles at position
function spawnParticles(x, y, type, count = 5, angle = null) {
  const particles = [];
  
  for (let i = 0; i < count; i++) {
    const particle = getParticleFromPool();
    if (particle.initialize(x, y, type, angle)) {
      activeParticles.push(particle);
      particles.push(particle);
    }
  }
  
  return particles;
}

// Spawn guard sparks (focused spread)
function spawnGuardSparks(x, y, count = 8) {
  return spawnParticles(x, y, 'GUARD_SPARK', count, 0); // Angle 0 = right direction
}

// Spawn slam debris (wide spread)
function spawnSlamDebris(x, y, count = 12) {
  return spawnParticles(x, y, 'DEBRIS', count);
}

// Spawn hit sparks (medium spread)
function spawnHitSparks(x, y, count = 6) {
  return spawnParticles(x, y, 'SPARK', count);
}

// Update all particles
function updateParticles(dt) {
  // Update active particles
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const particle = activeParticles[i];
    particle.update(dt);
    
    // Remove inactive particles
    if (!particle.active) {
      activeParticles.splice(i, 1);
    }
  }
}

// Draw all particles
function drawParticles() {
  for (let i = 0, len = activeParticles.length; i < len; i++) {
    activeParticles[i].draw();
  }
}

// Get particle count for debugging
function getParticleCount() {
  return activeParticles.length;
}

// Clear all particles
function clearParticles() {
  for (let i = 0, len = activeParticles.length; i < len; i++) {
    activeParticles[i].active = false;
  }
  activeParticles.length = 0;
}

// Initialize system when script loads
initializeParticlePool();
