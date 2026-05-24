/**
 * JOHN - SHARED CHARACTER CONFIG
 * Test character with balanced stats.
 * NO gameplay logic, NO rendering code, NO p5.js dependencies.
 */

const JOHN_CONFIG = {
  // IDENTITY
  id: 'JOHN',
  name: 'John Limbus Company',
  title: 'Default Fighter',
  
  // COMBAT STATS
  hp: 6767,
  maxHp: 6767,
  speed: 7.5,
  attackInterval: 1.0,
  baseDamage: 15,
  knockbackMultiplier: 1.0,
  staggerThreshold: 1000,
  staggerLength: 5,
  // MOVEMENT PHYSICS (defaults for John)
  friction: 0.85,
  jumpHeight: 1200,       // Jump initial velocity (pixels/s) - OLD CLIENT: jumpStrength = -20 at 60fps
  gravity: 2160,          // Gravity acceleration (pixels/s²) - OLD CLIENT: 0.6 pixels/frame²
  dashSpeed: 60,
  dashDuration: 0.2,
  dashCooldown: 3.0,
  dashCharges: 3,
  airControl: 0.6,
  
  // VISUAL CONFIG (client-only)
  color: '#3498db',
  weapon: 'fist',
  spriteType: 'simple',
  defaultSprite: 'idle',
  
  // UNIQUE ABILITY CONFIGS
  abilities: {},
  
  // RESOURCE SYSTEMS
  resources: {},
  
  // STATUS EFFECT MODIFIERS
  statusModifiers: {},

  // ATTACK DEFINITIONS - RESTORED from OldClientGameplay
  attacks: {
    light: {
      startup: 0.1,      // Windup before hitbox active
      active: 0.15,     // Duration hitbox is active
      recovery: 0.2,    // Recovery after hitbox
      range: 120,        // Attack range in pixels
      damage: 1.0,       // Damage multiplier
      knockback: 12,     // Knockback force
      staggerDamage: 60  // Stagger damage dealt
    },
    medium: {
      startup: 0.15,
      active: 0.2,
      recovery: 0.25,
      range: 140,
      damage: 1.2,
      knockback: 15,
      staggerDamage: 80
    },
    heavy: {
      startup: 0.2,
      active: 0.25,
      recovery: 0.3,
      range: 160,
      damage: 1.5,
      knockback: 18,
      staggerDamage: 100
    }
  },

  // ULTIMATE ABILITY CONFIG
  ultimate: {
    name: 'Basic Ultimate',
    cooldown: 0,
    range: 200,
    baseDamage: 1.5,
    statusEffects: [],
    duration: 2,
    phases: 1
  }
};

// Export for server/client usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JOHN_CONFIG;
}
