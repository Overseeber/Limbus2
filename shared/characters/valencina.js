/**
 * VALENCINA - SHARED CHARACTER CONFIG
 * This file contains ONLY character stats, constants, and ability configurations.
 * NO gameplay logic, NO rendering code, NO p5.js dependencies.
 * 
 * Server and client both load this file to access shared character data.
 * Fully restored from oldclientgameplay reference.
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
  comboDamage: 3,          // Per-combo bonus damage (restored from reference)
  knockbackMultiplier: 1.0, // 100% knockback
  staggerThreshold: 1300,
  staggerLength: 5,
  staggerRecoveryDelay: 2.0,    // Delay before stagger recovery begins (seconds)
  staggerRecoveryRate: 12,      // Stagger decay rate per second during recovery
  
  // MOVEMENT PHYSICS
  friction: 0.85,
  jumpHeight: 1200,
  gravity: 2160,
  dashSpeed: 60,
  dashDuration: 0.2,
  dashCooldown: 3.0,
  dashCharges: 3,
  airControl: 0.6,
  
  // VISUAL CONFIG (client-only)
  color: '#ff6b9d',
  weapon: 'La Spada di Palermo',
  spriteType: 'atlas',
  defaultSprite: 'idle',
  
  // ATTACK SEQUENCES
  attacks: {
    light: {
      startup: 0.08,
      active: 0.12,
      recovery: 0.32,
      range: 200,
      damage: 1.0,
      knockback: 30,
      staggerDamage: 50,
      combo: 1,
      startupBackward: 110,
      attackForward: 360,
      // Per-attack effects (restored from reference)
      onAttackEffects: {
        poiseCountGain: 3    // Attack 1: Gain 3 Poise Count
      }
    },
    medium: {
      startup: 0.12,
      active: 0.16,
      recovery: 0.40,
      range: 240,
      damage: 1.2,
      knockback: 50,
      staggerDamage: 75,
      combo: 2,
      startupBackward: 130,
      attackForward: 400,
      onAttackEffects: {
        poisePotencyGain: 1  // Attack 2: Gain 1 Poise Potency
      }
    },
    heavy: {
      startup: 0.20,
      active: 0.20,
      recovery: 0.50,
      range: 300,
      damage: 1.6,
      knockback: 80,
      staggerDamage: 120,
      combo: 3,
      startupBackward: 150,
      attackForward: 460,
      onAttackEffects: {
        consumeAccelerationRound: true  // Attack 3: Spend 1 Acceleration Round
      }
    }
  },
  
  // ON HIT EFFECTS (restored from reference)
  onHitEffects: {
    burnPotency: 2,
    burnCount: 2,
    tremorPotency: 2,
    tremorCount: 2
  },
  
  abilities: {
    timeToHunt: {
      cooldown: 30,           // 30 seconds (restored from reference)
      range: 150,
      baseDamage: 1.2,
      knockback: 100,
      // Game Target status: speed=1, no jump, no dash, 10 seconds
      gameTargetDuration: 10,
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
  
  // RESOURCE SYSTEMS (restored from reference)
  accelerationRounds: {
    max: 10,
    startingValue: 10,       // Start battle with 10
    gainPerReload: 10,
    consumePerAbility: 1,    // Attack 3 consumes 1
    // Effects when consumed
    rangeBonus: 1.0,         // +100% range
    damageBonus: 0.3,        // +30% damage
    poisePotencyGain: 4,     // Gain 4 Poise Potency
    poiseCountGain: 4,       // Gain 4 Poise Count
    // Bonus damage formula: (Burn Potency + Tremor Potency) / 2
  },
  
  precognition: {
    max: 30,
    startingValue: 30,       // Start battle with 30
    // Passive evade: 3% × Precognition (max 90%)
    // Lose 1 on passive evade
    // When 0: enter Overheat
  },
  
  overheat: {
    max: 30,
    startingValue: 30,       // Enter with 30
    damageReduction: 0.2,    // -20% damage dealt
    losePerHit: 1,           // Lose 1 on hit or being attacked
    losePerSecond: 0.2,      // Lose 1 every 5 seconds
  },
  
  // ACCELERATING FUTURE (restored from reference)
  acceleratingFuture: {
    speedPerStack: 0.5,      // +0.5 speed per stack
    maxSpeedBonus: 5,        // Maximum +5 speed
    intervalReductionPerStack: 2.5,  // -2.5% per stack
    maxIntervalReduction: 80  // Maximum -80%
  },
  
  shin: {
    activationThreshold: 0.5, // Activate at <50% HP
    protectionGain: 1,        // Gain 1 Protection (10% damage reduction)
    damagePerPoisePotency: 0.03, // +3% damage per Poise Potency
    maxDamageBonus: 0.15,     // Maximum +15%
  },
  
  // ULTIMATE ABILITY CONFIG (restored from reference)
  ultimate: {
    name: 'Disposal',
    cooldown: 0,
    range: 250,
    baseDamage: 2.0,
    // On ultimate use: gain 3 Poise Count, 5 Poise Potency
    poiseCountGain: 3,
    poisePotencyGain: 5,
    // Attack 1-2: 3 Burn/Tremor Potency each
    // Attack 3: 6 Burn/Tremor Count  
    // Attack 4: Trigger Tremor Burst
    // Attack 5: Trigger Tremor Burst, deal (Burn+Tre Potency)/2 × 3, Reload to 20
    accelerationRoundReload: 20,
    phases: 5
  }
};

// Export for server/client usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VALENCINA_CONFIG;
}