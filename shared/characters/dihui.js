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
  baseDamage: 2,
  comboDamage: 1,           // Per-combo bonus damage: Damage = BaseDamage + (ComboDamage × ComboCount)
  maxCombo: 12,             // Maximum combo count
  knockbackMultiplier: 0.0, // 0% knockback
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
  
  // STATE-BASED SPRITE MAPPINGS
  sprites: {
    idle: 'didle',
    hurt: 'dhurt',
    move: 'dmove',
    jump: 'dmove',
    guard: 'dguard',
    evade: 'devade',
    halt: ['dhalt1', 'dhalt2'],
    joust: ['djoust2', 'djoust3', 'djoust4']
  },
  
  // ATTACK SEQUENCES
  attacks: {
    light: {
      startup: 0.30, active: 0.12, recovery: 0.32,
      range: 200, damage: 1.0, knockback: 30, staggerDamage: 50, combo: 1,
      startupBackward: 110, attackForward: 360,
      onAttackEffects: { poiseCountGain: 3 },
      animation: {
        windup: 'draw1',
        hit: ['ds1f1', 'ds1s1']
      }
    },
    medium: {
      startup: 0.30, active: 0.16, recovery: 0.40,
      range: 240, damage: 1.2, knockback: 50, staggerDamage: 75, combo: 2,
      startupBackward: 130, attackForward: 400,
      onAttackEffects: { poiseCountGain: 3 },
      animation: {
        windup: 'ds1f1',
        hit: ['ds2f1', 'ds2s1'],
        recovery: 'ds2f2'
      }
    },
    heavy: {
      startup: 0.30, active: 0.20, recovery: 0.50,
      range: 300, damage: 1.6, knockback: 80, staggerDamage: 120, combo: 3,
      startupBackward: 150, attackForward: 460,
      onAttackEffects: { inflictBladetrailAfterimage: true, critBonusDamage: 0.3 },
      animation: {
        windup: 'ds2f2',
        hit: ['ds3f1', 'ds3s1'],
        recovery: 'ds3f2'
      }
    }
  },
  
  // ON HIT EFFECTS - Every successful hit inflicts these
  // Poise behavior changed: now gives Poise Potency instead of Poise Count
  onHitEffects: { bladetrailAfterimagePotency: 1, poisePotencyGain: 1 },
  
  abilities: {
    deathedge: {
      name: 'Deathedge [絶命]',
      cooldown: 14,
      range: 999, // Range calculated dynamically from cast to teleport position
      baseDamage: 2.0, // +100% damage (base is 1.0, so 2.0 = +100%)
      knockback: 100,
      target: 'furthest', // Target furthest enemy
      // Windup: 0.1s per frame, ds1f1 is final frame after hold
      windupFrames: ['draw1', 'draw2', 'draw3', 'draw4', 'draw5', 'draw6'],
      windupFrameDuration: 0.1, // 0.1 seconds per frame
      windupHoldDuration: 0.3, // Hold 0.3 seconds after draw6 before ds1f1
      windupFinalSprite: 'ds1f1',
      // Post-teleport: 0.1s per frame, ds2f2 hold 0.2s
      postTeleportFrames: ['djoust3', 'djoust4', 'ds2f2'],
      postTeleportFrameDuration: 0.1, // 0.1 seconds per frame
      postTeleportHoldDuration: 0.2, // Hold 0.2 seconds after ds2f2
      // Attack: dhalt1 (with dline), then dhalt2 hold 0.3s
      attackFrames: ['dhalt1', 'dhalt2'],
      attackFrameDuration: 0.1, // 0.1 seconds per frame
      attackHoldDuration: 0.3, // Hold 0.3 seconds after dhalt2
      // Dline spawning
      dlinePerTenAfterimages: 1, // Spawn 1 dline per 10 bladetrail afterimages (rounded down) +1
      teleportBehind: true, // Teleport behind enemy
      teleportFrontIfAtEdge: true // If enemy has back to edge, teleport in front instead
    }
  },
  
  // UNIQUE STATUS DEFINITIONS
  
  bladetrailAfterimage: {
    max: 99,
    startingValue: 0,
    damageBonusPerStack: 0.01,  // +1% damage per stack
    // Visual: For every 10 stacks, draw one [dba] at center of opponent's position
    // +- random(50) in both axis, random rotation
    // Attached to owner of status, does not rotate after spawning
    // When this status gets consumed, remove this image
    dbaPerTenStacks: 1,         // 1 dba sprite per 10 stacks
    dbaSpawnRangeX: 50,         // +-50 random offset X
    dbaSpawnRangeY: 50          // +-50 random offset Y
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
    ultimateThreshold: 20,          // 20 stacks to unlock ultimate
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