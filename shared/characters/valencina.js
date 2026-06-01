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
  staggerRecoveryDelay: 2.0,
  staggerRecoveryRate: 12,
  
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
      startup: 0.08, active: 0.12, recovery: 0.32,
      range: 200, damage: 1.0, knockback: 30, staggerDamage: 50, combo: 1,
      startupBackward: 110, attackForward: 360,
      onAttackEffects: { poiseCountGain: 3 }
    },
    medium: {
      startup: 0.12, active: 0.16, recovery: 0.40,
      range: 240, damage: 1.2, knockback: 50, staggerDamage: 75, combo: 2,
      startupBackward: 130, attackForward: 400,
      onAttackEffects: { poisePotencyGain: 1 }
    },
    heavy: {
      startup: 0.20, active: 0.20, recovery: 0.50,
      range: 300, damage: 1.6, knockback: 80, staggerDamage: 120, combo: 3,
      startupBackward: 150, attackForward: 460,
      onAttackEffects: { consumeAccelerationRound: true }
    }
  },
  
  // ON HIT EFFECTS - Every successful hit inflicts these
  onHitEffects: { burnPotency: 2, burnCount: 2, tremorPotency: 2, tremorCount: 2 },
  
  abilities: {
    timeToHunt: {
      cooldown: 30,
      range: 150,
      baseDamage: 1.2,
      knockback: 100,
      gameTargetDuration: 10,
      activationAnimation: 'de1',
      statusEffects: [
        { type: 'Burn', count: 4, potency: 4 },
        { type: 'Tremor', count: 4, potency: 4 }
      ]
    },
    disposial: {
      cooldown: 12, range: 200, baseDamage: 1.5,
      statusEffects: [
        { type: 'Tremor', count: 6, potency: 6 },
        { type: 'Burn', count: 6, potency: 6 }
      ]
    }
  },
  
  // UNIQUE STATUS DEFINTIONS
  // These are statuses like Burn/Bleed - they appear in the statuses array
  // and are rendered in the status row on the fighter
  
  accelerationRounds: {
    max: 10,
    startingValue: 10,
    rangeBonus: 1.0,         // +100% range
    damageBonus: 0.3,        // +30% damage
    poisePotencyGain: 4,     // Gain 4 Poise Potency
    poiseCountGain: 4        // Gain 4 Poise Count
  },
  
  precognition: {
    max: 30,
    startingValue: 30
    // 3% × Precognition evade chance (max 90%)
    // Lose 1 on passive evade
    // At 0: Enter Overheat
  },
  
  overheat: {
    max: 30,
    startingValue: 30,
    damageReduction: 0.2,    // -20% damage dealt
    losePerHit: 1,
    losePerSecond: 0.2       // Lose 1 every 5 seconds
  },
  
  acceleratingFuture: {
    speedPerStack: 0.5,          // +0.5 speed per stack
    maxSpeedBonus: 5,            // Maximum +5 speed
    intervalReductionPerStack: 2.5, // -2.5% per stack
    maxIntervalReduction: 80     // Maximum -80%
  },
  
  shin: {
    activationThreshold: 0.5,
    protectionGain: 1,           // Gain 1 Protection status
    damagePerPoisePotency: 0.03, // +3% per Poise Potency
    maxDamageBonus: 0.15
  },
  
  ultimate: {
    name: 'Disposal',
    cooldown: 0, range: 250, baseDamage: 2.0,
    poiseCountGain: 3, poisePotencyGain: 5,
    accelerationRoundReload: 20,
    phases: 5
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VALENCINA_CONFIG;
}