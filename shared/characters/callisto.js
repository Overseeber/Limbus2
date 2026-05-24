/**
 * CALLISTO - SHARED CHARACTER CONFIG
 * This file contains ONLY character stats, constants, and ability configurations.
 * NO gameplay logic, NO rendering code, NO p5.js dependencies.
 * 
 * Server and client both load this file to access shared character data.
 */

const CALLISTO_CONFIG = {
  // IDENTITY
  id: 'CALLISTO',
  name: 'Callisto',
  title: 'Maestro of Corporism',
  
  // COMBAT STATS
  hp: 2819,
  maxHp: 2819,
  speed: 9,
  attackInterval: 0.75,
  baseDamage: 27,
  knockbackMultiplier: 2.0,
  staggerThreshold: 1409,
  staggerLength: 6,
  
  // MOVEMENT PHYSICS
  friction: 0.85,         // Friction multiplier (0-1)
  jumpHeight: 1200,       // Jump initial velocity (pixels/s) - OLD CLIENT: jumpStrength = -20 at 60fps
  gravity: 2160,          // Gravity acceleration (pixels/s²) - OLD CLIENT: 0.6 pixels/frame²
  dashSpeed: 60,          // Dash movement speed (old client per-frame units)
  dashDuration: 0.2,      // Dash duration in seconds
  dashCooldown: 3.0,      // Dash recharge cooldown between dash charges
  dashCharges: 3,         // Maximum dash charges
  airControl: 0.6,        // Air movement responsiveness (0-1)
  
  // VISUAL CONFIG (client-only)
  color: '#8b4513',
  weapon: 'Magnum Opus: Tibia',
  spriteType: 'atlas',
  defaultSprite: 'cidle',
  
  // ATTACK SEQUENCES - Frame-based timing for responsive combat
  attacks: {
    light: {
      startup: 0.06,        // Faster startup for aggressive feel
      active: 0.12,
      recovery: 0.28,       // Shorter recovery for combos
      range: 120,           // Longer reach
      damage: 1.0,
      knockback: 40,        // More knockback
      staggerDamage: 60,
      combo: 1
    },
    medium: {
      startup: 0.10,
      active: 0.16,
      recovery: 0.36,
      range: 140,           // Extended reach
      damage: 1.25,
      knockback: 65,        // Higher knockback
      staggerDamage: 90,
      combo: 2
    },
    heavy: {
      startup: 0.18,
      active: 0.18,
      recovery: 0.45,
      range: 180,           // Long range heavy
      damage: 1.8,          // High damage
      knockback: 100,       // Significant knockback
      staggerDamage: 150,   // Heavy stagger damage
      combo: 3
    }
  },
  
  abilities: {
    slam: {
      cooldown: 5,
      range: 200,
      baseDamage: 1.5,
      knockback: 150,
      statusEffects: [
        { type: 'Stagger', duration: 2, potency: 50 }
      ]
    },
    installationArt: {
      cooldown: 10,
      range: 300,
      baseDamage: 1.0,
      statusEffects: [
        { type: 'Bleed', count: 8, potency: 8 },
        { type: 'Sinking', count: 1 },
        { type: 'Stagger', duration: 1 }
      ],
      corpusCost: 10,
      gainArtworkStacks: 1
    }
  },
  
  // RESOURCE SYSTEMS
  corpusIngredient: {
    max: 20,
    gainPerHit: 5,
    spendPerAbility: 10,
    gainArtworkPer: 10
  },
  
  artworkTibia: {
    damageBonus: 0.1, // +10% per stack
    bleedBonusPotency: 1 // +1 potency per stack
  },
  
  // STATUS EFFECT IMMUNITIES / RESISTANCES
  statusResistances: {},
  
  // ULTIMATE ABILITY CONFIG
  ultimate: {
    name: 'Closing Time - Installation Art no. 1: Your Flesh and Bones as the Gallery Seats',
    cooldown: 0, // Filled by server
    range: 300,
    baseDamage: 2.0,
    statusEffects: [
      { type: 'Bleed', count: 10, potency: 10 },
      { type: 'Sinking', count: 2 },
      { type: 'Stagger', duration: 2, potency: 100 }
    ],
    duration: 3,
    phases: 5
  }
};

// Export for server/client usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CALLISTO_CONFIG;
}
