/**
 * DIHUI STAR - SHARED CHARACTER CONFIG
 * This file contains ONLY character stats, constants, and ability configurations.
 * NO gameplay logic, NO rendering code, NO p5.js dependencies.
 * 
 * Server and client both load this file to access shared character data.
 */

const DIHUI_CONFIG = {
  // IDENTITY
  id: 'DIHUI',
  name: 'Dihui Star',
  title: 'Ten Feet of Blue',
  
  // COMBAT STATS
  hp: 1918,
  maxHp: 1918,
  speed: 9,
  attackInterval: 1.0,
  baseDamage: 5,
  comboDamage: 5,           // Per-combo bonus damage: Damage = BaseDamage + (ComboDamage × ComboCount)
  knockbackMultiplier: 1.0, // 100% knockback
  staggerThreshold: 959,
  staggerLength: 4,
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
  color: '#2e74ff',
  weapon: "Dihui Star's Blade",
  spriteType: 'atlas',
  defaultSprite: 'didle',
  
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
      onAttackEffects: { poiseCountGain: 3 }
    },
    heavy: {
      startup: 0.20, active: 0.20, recovery: 0.50,
      range: 300, damage: 1.6, knockback: 80, staggerDamage: 120, combo: 3,
      startupBackward: 150, attackForward: 460,
      onAttackEffects: { inflictBladetrailAfterimage: true, critBonusDamage: 0.3 }
    }
  },
  
  // ON HIT EFFECTS - Every successful hit inflicts these
  onHitEffects: { bladetrailAfterimagePotency: 1, poiseCountGain: 1 },
  
  abilities: {
    deathedge: {
      cooldown: 30,
      range: 300,
      baseDamage: 2.0,
      knockback: 100,
      statusEffects: [
        { type: 'Bladetrail Afterimage', count: 0, potency: 0 }
      ],
      bladeRequired: 50,
      damagePerAfterimage: 0.02  // +2% per Bladetrail Afterimage on target
    }
  },
  
  // UNIQUE STATUS DEFINITIONS
  
  bladetrailAfterimage: {
    max: 99,
    startingValue: 0,
    damageBonusPerStack: 0.01,  // +1% damage per stack
    dbaPerTenStacks: 1          // 1 dba sprite per 10 stacks
  },
  
  superposedAfterimage: {
    // 3 trailing afterimages with delays: 0.5s, 1.0s, 1.5s
    count: 3,
    delayPerImage: 0.5,
    colors: [
      [0, 0, 255, 0.7],     // Blue, 70% opacity
      [255, 0, 255, 0.5],   // Purple, 50% opacity
      [255, 0, 0, 0.3]      // Red, 30% opacity
    ]
  },
  
  dihuiBlade: {
    // Unsheathing Dihui Star's Blade
    damageReductionPerStack: 0.01,  // -1% damage taken per stack
    critDamagePerStack: 0.01,       // +1% critical damage per stack
    ultimateThreshold: 50,          // 50 stacks to unlock ultimate
    shinName: 'Shin (心) - Dihui Star',
    shinTitle: 'Lacerating Afterimages for Myriad Moments'
  },
  
  laceratingAfterimages: {
    // Consume excess Poise Potency (>20) to inflict Bladetrail Afterimage
    shieldHp: 400,
    shieldMax: 400,
    shieldRegenDelay: 10,    // 10 seconds without damage to start regen
    shieldRegenRate: 1,      // 1 shield HP per second
    shieldBrokenDelay: 30,   // 30 seconds before recovery begins after shield breaks
    damagePerMissingHp: 0.10 / 0.15, // +10% damage for every 15% missing HP, max +50%
    poiseGainOnHit: { potency: 5, count: 1 }
  },
  
  ultimate: {
    name: 'Uttermost Rend Space - String Severance',
    nameJP: '空間斬 - 絕緣',
    cooldown: 0, range: 300, baseDamage: 2.0,
    baseDamageGain: 24,       // Gain +24 Base Damage
    critMultiplier: 2.0,      // Critical Hits deal 200% damage
    bladetrailHpPercent: 0.01, // Target Max HP × Bladetrail Afterimage %
    // At ultimate end: Consume ALL Bladetrail Afterimage
    phases: 11
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DIHUI_CONFIG;
}