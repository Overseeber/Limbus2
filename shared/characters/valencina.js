/**
 * VALENCINA - SHARED CHARACTER CONFIG
 * This file contains ONLY character stats, constants, and ability configurations.
 * NO gameplay logic, NO rendering code, NO p5.js dependencies.
 * 
 * Server and client both load this file to access shared character data.
 */

const VALENCINA_CONFIG = {
  // IDENTITY
  id: 'VALENCINA',
  name: 'Valencina',
  title: 'The Accelerating Future',
  
  // COMBAT STATS
  hp: 3204,
  maxHp: 3204,
  speed: 9,
  attackInterval: 1.0,
  baseDamage: 21,
  knockbackMultiplier: 1.0,
  staggerThreshold: 1300,
  staggerLength: 5,
  
  // MOVEMENT PHYSICS
  acceleration: 1800,     // Acceleration rate (pixels/s²)
  friction: 0.85,         // Friction multiplier (0-1)
  // NOTE: values below use server-per-second units derived from the old client
  // Old client used per-frame jumpStrength = -20 and gravity = 0.6 (per-frame increments).
  // Convert to per-second units (≈60fps): jumpHeight = 20 * 60 = 1200, gravity = 0.6 * 3600 = 2160
  jumpHeight: 1200,       // Jump initial velocity (pixels/s)
  gravity: 2160,          // Gravity acceleration (pixels/s²)
  dashSpeed: 800,         // Dash movement speed
  dashDuration: 0.16,     // Dash duration in seconds
  dashCooldown: 1.0,      // Cooldown between dashes
  airControl: 0.6,        // Air movement responsiveness (0-1)
  
  // VISUAL CONFIG (client-only)
  color: '#ff6b9d',
  weapon: 'La Spada di Palermo',
  spriteType: 'atlas',
  defaultSprite: 'idle',
  
  // ATTACK SEQUENCES - Frame-based timing for responsive combat
  attacks: {
    light: {
      startup: 0.08,        // Time before hitbox activates
      active: 0.12,         // Hitbox active duration
      recovery: 0.32,       // Recovery time after attack
      range: 100,           // Attack range in pixels
      damage: 1.0,          // Damage multiplier
      knockback: 30,        // Knockback amount
      staggerDamage: 50,    // Stagger damage
      combo: 1              // Combo sequence position
    },
    medium: {
      startup: 0.12,
      active: 0.16,
      recovery: 0.40,
      range: 120,
      damage: 1.2,
      knockback: 50,
      staggerDamage: 75,
      combo: 2
    },
    heavy: {
      startup: 0.20,
      active: 0.20,
      recovery: 0.50,
      range: 150,
      damage: 1.6,
      knockback: 80,
      staggerDamage: 120,
      combo: 3
    }
  },
  
  abilities: {
    timeToHunt: {
      cooldown: 8,
      range: 150,
      baseDamage: 1.2,
      knockback: 100,
      statusEffects: [
        { type: 'Burn', count: 4, potency: 4 },
        { type: 'Tremor', count: 4, potency: 4 }
      ]
    },
    disposial: {
      cooldown: 12,
      range: 200,
      baseDamage: 1.5,
      statusEffects: [
        { type: 'Tremor', count: 6, potency: 6 },
        { type: 'Burn', count: 6, potency: 6 }
      ]
    }
  },
  
  // RESOURCE SYSTEMS
  accelerationRounds: {
    max: 10,
    gainPerReload: 10,
    consumePerAbility: 1
  },
  
  precognition: {
    max: 30,
    startingValue: 30,
    gainPerHit: 1,
    gainPerEvade: 1,
    gainPerBlock: 1,
    consumePerAbility: 1
  },
  
  overheat: {
    max: 30,
    losePerHit: 1,
    losePerBlock: 1,
    burnDamageScaling: 0.5 // Overheat increases burn damage
  },
  
  shin: {
    activationThreshold: 0.5, // Activate at <50% HP
    damageBonus: 0.2, // +20% damage
    speedBonus: 1.5, // 1.5x speed
    burnBonusPotency: 2 // +2 potency per burn
  },
  
  // STATUS EFFECT MODIFIERS
  statusModifiers: {
    Burn: {
      potencyBonus: 1 // +1 potency per Overheat stack
    }
  },
  
  // ULTIMATE ABILITY CONFIG
  ultimate: {
    name: 'Disposal',
    cooldown: 0, // Filled by server
    range: 250,
    baseDamage: 2.0,
    statusEffects: [
      { type: 'Burn', count: 8, potency: 8 },
      { type: 'Tremor', count: 8, potency: 8 },
      { type: 'Fragile', count: 1, potency: 1 }
    ],
    duration: 2.5,
    phases: 5
  }
};

// Export for server/client usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VALENCINA_CONFIG;
}
