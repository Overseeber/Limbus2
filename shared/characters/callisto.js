/**
 * CALLISTO - SHARED CHARACTER CONFIG
 * This file contains ONLY character stats, constants, and ability configurations.
 * NO gameplay logic, NO rendering code, NO p5.js dependencies.
 * 
 * Server and client both load this file to access shared character data.
 * 
 * Full kit specification:
 * - Weapon: Magnum Opus: Tibia (Base damage: 27, Combo damage: 4)
 * - On hit: 4 Bleed, 5 Corpus Ingredient
 * - Slam: consume up to 20 Corpus Ingredient for +100% range, +50% damage
 * - Per 20 spent Corpus: gain 1 Artwork: Tibia
 * - 3-passive system with full status interactions
 * - 5-phase ultimate requiring 5 Artwork: Tibia stacks
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
  comboDamage: 4,           // Bonus damage per combo stack
  knockbackMultiplier: 1.0,
  staggerThreshold: 1409,
  staggerLength: 6,
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
  color: '#8b4513',
  weapon: 'Magnum Opus: Tibia',
  spriteType: 'atlas',
  defaultSprite: 'cidle',
  
  // SPRITE ASSIGNMENTS
  sprites: {
    idle: 'cidle',
    jump: 'cs1f1',
    hurt: 'churt',
    guard: 'cguard',
    evade: 'evade',
    slam: 'cs1f2',
    slamSlash: 'cs1s1',
    dash: 'cmove',
    dashEnd: 'chalt',
    dashAttack: 'cjoust',
    dashAttackSlash: 'csj1',
    ultimatePose: 'cpose',
    // Ultimate sprites per phase
    ult1: 'cuf1',
    ult1Slash: 'cus1',
    ult2Setup: 'cuf2',
    ult2: 'cuf3',
    ult2Slash: 'cus2',
    ult3: 'cuf4',
    ult3Slash: 'cus3',
    ult4Setup: 'cuf5',
    ult4: 'cuf6',
    ult4Slash: 'cus4',
    ult5Setup: 'cs3f2',
    ult5Slash: 'cs3s1',
    ultEnd: 'cuend',
    // Ability sprites
    abilityWindup: 'cguard',
    abilityExecute: 'cevade',
    abilitySlash1: 'cbsk1',
    abilitySlash2: 'cbsk2',
    abilitySlash3: 'cbsk3',
    // Costume override for slam at 20 Corpus
    slamCostumeSprite: 'cuf6',
    slamCostumeSlash: 'cus4'
  },
  
  // ATTACK SEQUENCES
  attacks: {
    light: {
      startup: 0.30,
      active: 0.12,
      recovery: 0.28,
      range: 130,
      damage: 1.0,
      knockback: 40,
      staggerDamage: 60,
      combo: 1,
      startupBackward: 110,
      attackForward: 340,
      // Attack 1 effects
      statusOnHit: [
        { type: 'Bind', count: 1, potency: 1 }
      ],
      selfStatus: [
        { type: 'Haste', count: 1, potency: 1 }
      ]
    },
    medium: {
      startup: 0.30,
      active: 0.16,
      recovery: 0.36,
      range: 160,
      damage: 1.25,
      knockback: 65,
      staggerDamage: 90,
      combo: 2,
      startupBackward: 130,
      attackForward: 380,
      // Attack 2 effects
      statusOnHit: [
        { type: 'Fragile', count: 1, potency: 1, maxStack: 5 }
      ],
      selfStatus: [
        { type: 'Protection', count: 1, potency: 1, maxStack: 5 }
      ]
    },
    heavy: {
      startup: 0.30,
      active: 0.18,
      recovery: 0.45,
      range: 200,
      damage: 1.8,
      knockback: 100,
      staggerDamage: 150,
      combo: 3,
      startupBackward: 150,
      attackForward: 440,
      // Attack 3 effects: +5% damage per negative effect on enemy (max 25%)
      negativeEffectDamageBonus: 0.05,
      maxNegativeEffectBonus: 0.25
    },
    // Dash attack (uses joust sprite)
    dashAttack: {
      startup: 0.08,
      active: 0.15,
      recovery: 0.30,
      range: 180,
      damage: 1.15,
      knockback: 80,
      staggerDamage: 100,
      combo: 1
    }
  },
  
  // ABILITIES
  abilities: {
    slam: {
      id: 'slamAttack',
      cooldown: 5,
      range: 200,
      baseDamage: 1.5,
      knockback: 150,
      maxCorpusConsumed: 20,
      // When consuming 20 Corpus:
      rangeMultiplierAtMax: 2.0,     // +100% range
      damageMultiplierAtMax: 1.5,    // +50% damage
      // Per 20 Corpus spent: gain 1 Artwork: Tibia
      corpusPerArtwork: 20,
      spriteCostume: 'cuf6',
      slashCostume: 'cus4',
      statusEffects: [
        { type: 'Stagger', duration: 2, potency: 50 }
      ]
    },
    installationArt: {
      id: 'installationArt',
      cooldown: 10,
      range: 300,
      baseDamage: 1.0,
      windupTime: 0.5,         // 0.5 second windup
      radiusMultiplier: 2.0,   // 2x radius
      bleedOnHit: 8,           // Inflict 8 bleed
      staggerMultiplier: 5.0,  // 500% of damage dealt as stagger
      statusEffects: [
        { type: 'Bleed', count: 8, potency: 8 },
        { type: 'IngredientShreddingWound', count: 1, potency: 1 },
        { type: 'Sinking', count: 1 },  // sinking potency = damage dealt (set by server)
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
    spendPerSlam: 20,          // Max spend on slam
    spendPerAbility: 10,
    gainArtworkPer: 20         // Per 20 spent gain 1 Artwork
  },
  
  artworkTibia: {
    damageBonus: 0.1,           // +10% damage per stack
    bleedBonusPotency: 1,       // +1 bleed potency per stack on inflict (max 3)
    bleedBonusCount: 1,         // +1 bleed count per stack on inflict (max 3)
    maxBonus: 3,                // Max bonus bleed potency/count from artwork
    // When expires: gain 2 Damage Up and 2 Protection
    expirationDamageUp: 2,
    expirationProtection: 2
  },
  
  // STATUS EFFECT DEFINITIONS (for reference/sync)
  statusDefinitions: {
    CorpusIngredient: {
      name: 'Corpus Ingredient',
      maxStack: 20,
      uniqueCharge: true,       // Functions like charge (doesn't decay)
      decayWithTime: false
    },
    ArtworkTibia: {
      name: 'Artwork: Tibia',
      perStackDamageBonus: 0.1,  // +10% damage per stack
      perStackBleedPotencyBonus: 1, // +1 bleed potency on inflict (max 3)
      perStackBleedCountBonus: 1,   // +1 bleed count on inflict (max 3)
      decayWithTime: false
    },
    Haste: {
      name: 'Haste',
      speedPerStack: 1,
      loseOnHit: 1,
      decayWithTime: false
    },
    Bind: {
      name: 'Bind',
      speedLossPerStack: 1,
      minSpeed: 1,
      loseOnHit: 1,
      decayWithTime: false
    },
    Fragile: {
      name: 'Fragile',
      damageIncreasePerStack: 0.1, // 10% per stack
      maxStack: 5,
      loseOnHit: 1,
      decayWithTime: false
    },
    Protection: {
      name: 'Protection',
      damageReductionPerStack: 0.1, // 10% per stack
      maxStack: 5,
      loseOnHit: 1,
      decayWithTime: false
    },
    IngredientShreddingWound: {
      name: 'Ingredient Shredding Wound',
      damageReduction: 0.1,     // 10% less damage
      speedLoss: 3,             // Lose 3 movement speed
      scalesWithStack: false,   // Does not scale with stack
      loseOnHit: 1,
      decayWithTime: false
    },
    DamageDown: {
      name: 'Damage Down',
      damageReductionPerStack: 0.1,
      loseOnAttackHit: 1,       // Reduce stack by 1 on attack hit
      maxStack: 10,
      decayWithTime: false
    },
    DamageUp: {
      name: 'Damage Up',
      damageIncreasePerStack: 0.1,
      loseOnAttackHit: 1,       // Reduce stack by 1 on attack hit
      decayWithTime: false
    }
  },
  
  // PASSIVE SYSTEM
  passives: {
    // Passive 1: All of My Corpus has been Given to Tibia
    corpusHealing: {
      name: 'All of My Corpus has been Given to Tibia',
      healPerCombo: 5,             // Heal (combo x 5) on hit
      damageDownGainOnHitTaken: 1, // Gain 1 Damage Down when hit (max 3)
      maxDamageDownFromPassive: 3, // Do not gain Damage Down if stack >= 3
      negativePotencyFragileThreshold: 20, // For every 20 sum of negative status potency, gain 1 Fragile
    },
    // Passive 2: Allow Me to Briefly Enjoy My Pupil's Exhibition
    exhibitionDamage: {
      name: 'Allow Me to Briefly Enjoy My Pupil\'s Exhibition',
      damagePerNegativeEffect: 0.05, // 5% per negative effect
      maxDamageBonus: 0.30,          // Max 30%
      evadeBleedPotency: 2,          // Inflict 2 bleed potency on evade
      evadeBleedCount: 2             // Inflict 2 bleed count on evade
    },
    // Passive 3: Transcend the Corpus
    transcendCorpus: {
      name: 'Transcend the Corpus',
      negativeStatusReduction: 0.30,  // Reduce negative effects taken by 30%
      negativeStatusReductionRoundedUp: true,
      artworkExpirationDamageUp: 2,   // Gain 2 Damage Up when Artwork expires
      artworkExpirationProtection: 2   // Gain 2 Protection when Artwork expires
    }
  },
  
  // ULTIMATE: Closing Time - Installation Art no. 1
  ultimate: {
    name: 'Closing Time - Installation Art no. 1: Your Flesh and Bones as the Gallery\'s Seats',
    artworkRequired: 3,         // Available at 3 Artwork: Tibia stacks
    cooldown: 0,
    range: 300,
    baseDamage: 2.0,
    phases: 5,
    duration: 3,
    // Phase-by-phase effects
    phaseEffects: {
      1: { // Attack 1
        bleed: 8
      },
      2: { // Attack 2
        bind: 1,
        haste: 1
      },
      3: { // Attack 3
        damageDown: 1,
        damageUp: 1
      },
      4: { // Attack 4: Trigger bleed 1 time for every 5 Corpus Ingredient
        bleedTriggerPerCorpus: 5
      },
      5: { // Attack 5
        bleed: 5,
        burn: 5,
        ingredientShreddingWound: 3,
        damageMultiplier: 2.7  // Deal 270% more damage
      }
    },
    // On ult end: consume all Artwork: Tibia, Corpus Ingredient, reset spent corpus
    statusEffects: [
      { type: 'Bleed', count: 10, potency: 10 },
      { type: 'Sinking', count: 2 },
      { type: 'Stagger', duration: 2, potency: 100 }
    ]
  }
};

// Export for server/client usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CALLISTO_CONFIG;
}