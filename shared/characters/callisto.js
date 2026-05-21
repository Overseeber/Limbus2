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
  
  // VISUAL CONFIG (client-only)
  color: '#8b4513',
  weapon: 'Magnum Opus: Tibia',
  spriteType: 'atlas',
  defaultSprite: 'cidle',
  
  // UNIQUE ABILITY CONFIGS
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
