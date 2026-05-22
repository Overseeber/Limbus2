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
  acceleration: 1800,
  friction: 0.85,
  // Using old-client derived per-second values: jumpHeight = 20*60 = 1200, gravity = 0.6*3600 = 2160
  jumpHeight: 1200,
  gravity: 2160,
  dashSpeed: 800,
  dashDuration: 0.16,
  dashCooldown: 1.0,
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
