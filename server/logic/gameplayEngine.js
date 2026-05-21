/**
 * GAMEPLAY ENGINE - SERVER-SIDE AUTHORITY
 * Pure JavaScript (no p5.js, no window object)
 * 
 * Handles all authoritative game logic:
 * - Damage calculation and application
 * - Hit detection
 * - Ability validation and execution
 * - Cooldown management
 * - Status effect application and resolution
 * - Movement validation
 * - Combat state transitions
 */

class GameplayEngine {
  constructor() {
    this.combatState = {};
    this.characterLogic = {};
  }

  /**
   * INITIALIZE CHARACTER STATE
   * Called when a character joins the battle
   */
  initializeCharacter(characterId, characterKey) {
    const config = this.getCharacterConfig(characterKey);
    if (!config) {
      throw new Error(`Invalid character: ${characterKey}`);
    }

    const state = {
      id: characterId,
      characterKey: characterKey,
      hp: config.maxHp,
      maxHp: config.maxHp,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      facing: 1, // 1 = right, -1 = left
      
      // COMBAT STATE
      state: 'idle', // idle, attacking, stunned, defeated
      stagger: 0,
      staggerTimer: 0,
      isDefeated: false,
      
      // COOLDOWNS
      attackCooldown: 0,
      abilityCooldowns: {},
      
      // STATUS EFFECTS
      statuses: [],
      
      // CHARACTER-SPECIFIC RESOURCES
      resources: {}
    };

    // Initialize character-specific resources
    this.initializeCharacterResources(state, characterKey, config);
    
    // Initialize ability cooldowns
    Object.keys(config.abilities || {}).forEach(abilityName => {
      state.abilityCooldowns[abilityName] = 0;
    });

    return state;
  }

  /**
   * INITIALIZE CHARACTER-SPECIFIC RESOURCES
   */
  initializeCharacterResources(state, characterKey, config) {
    if (characterKey === 'CALLISTO') {
      state.resources = {
        corpusIngredient: 0,
        maxCorpusIngredient: config.corpusIngredient.max,
        artworkTibiaStacks: 0,
        corpusSpentTotal: 0
      };
    } else if (characterKey === 'VALENCINA') {
      state.resources = {
        accelerationRounds: 0,
        maxAccelerationRounds: config.accelerationRounds.max,
        precognition: config.precognition.startingValue,
        maxPrecognition: config.precognition.max,
        overheat: 0,
        maxOverheat: config.overheat.max,
        shinActive: false
      };
    }
  }

  /**
   * GET CHARACTER CONFIG
   */
  getCharacterConfig(characterKey) {
    const configs = {
      'CALLISTO': require('../characters/callisto.js'),
      'VALENCINA': require('../characters/valencina.js'),
      'JOHN': require('../characters/john.js')
    };
    return configs[characterKey];
  }

  /**
   * VALIDATE AND EXECUTE ABILITY
   * Server authority: Validates all ability conditions before execution
   */
  executeAbility(state, abilityName, targetId, targetState) {
    const config = this.getCharacterConfig(state.characterKey);
    const abilityConfig = config.abilities[abilityName];

    if (!abilityConfig) {
      return { success: false, reason: 'Invalid ability' };
    }

    // CHECK COOLDOWN
    if (state.abilityCooldowns[abilityName] > 0) {
      return { 
        success: false, 
        reason: 'Ability on cooldown',
        remainingCooldown: state.abilityCooldowns[abilityName]
      };
    }

    // CHECK STATE (must not be stunned/defeated)
    if (state.isDefeated || state.state === 'stunned') {
      return { success: false, reason: 'Cannot act in current state' };
    }

    // CHARACTER-SPECIFIC VALIDATION
    const validationResult = this.validateCharacterAbility(
      state, 
      abilityName, 
      abilityConfig, 
      config
    );
    if (!validationResult.success) {
      return validationResult;
    }

    // EXECUTE CHARACTER-SPECIFIC ABILITY
    const result = this.executeCharacterAbility(
      state, 
      abilityName, 
      abilityConfig,
      targetState,
      config
    );

    if (result.success) {
      // SET COOLDOWN
      state.abilityCooldowns[abilityName] = abilityConfig.cooldown;
    }

    return result;
  }

  /**
   * VALIDATE CHARACTER-SPECIFIC ABILITIES
   */
  validateCharacterAbility(state, abilityName, abilityConfig, config) {
    if (state.characterKey === 'CALLISTO') {
      if (abilityName === 'installationArt') {
        const corpusCost = config.abilities.installationArt.corpusCost;
        if (state.resources.corpusIngredient < corpusCost) {
          return { 
            success: false, 
            reason: 'Not enough Corpus Ingredient',
            current: state.resources.corpusIngredient,
            required: corpusCost
          };
        }
      }
    } else if (state.characterKey === 'VALENCINA') {
      if (abilityName === 'timeToHunt') {
        if (state.resources.precognition <= 0) {
          return { 
            success: false, 
            reason: 'No Precognition available'
          };
        }
      }
    }

    return { success: true };
  }

  /**
   * EXECUTE CHARACTER-SPECIFIC ABILITY
   * Delegates to character-specific logic handlers
   */
  executeCharacterAbility(state, abilityName, abilityConfig, targetState, config) {
    // This will call character-specific ability logic
    const handler = this.getCharacterAbilityHandler(state.characterKey, abilityName);
    if (handler) {
      return handler.call(this, state, abilityConfig, targetState, config);
    }
    
    return { success: false, reason: 'No handler for ability' };
  }

  /**
   * GET CHARACTER-SPECIFIC ABILITY HANDLER
   */
  getCharacterAbilityHandler(characterKey, abilityName) {
    // These will be defined in character-specific files
    if (characterKey === 'CALLISTO') {
      return require('./characterLogic/callisto.js')[abilityName];
    } else if (characterKey === 'VALENCINA') {
      return require('./characterLogic/valencina.js')[abilityName];
    }
    return null;
  }

  /**
   * CALCULATE DAMAGE - AUTHORITATIVE
   * Server determines final damage based on attacker/defender stats
   */
  calculateDamage(attacker, defender, baseDamage, config) {
    let damage = baseDamage * attacker.baseDamage;

    // CHARACTER-SPECIFIC DAMAGE MODIFIERS
    const modifier = this.getCharacterDamageModifier(attacker, defender, config);
    damage *= modifier;

    // ROUND DOWN
    return Math.floor(damage);
  }

  /**
   * GET CHARACTER-SPECIFIC DAMAGE MODIFIERS
   */
  getCharacterDamageModifier(attacker, defender, config) {
    let modifier = 1.0;

    if (attacker.characterKey === 'CALLISTO') {
      // Artwork: Tibia bonus
      if (attacker.resources.artworkTibiaStacks > 0) {
        const callistoConfig = this.getCharacterConfig('CALLISTO');
        modifier *= (1 + attacker.resources.artworkTibiaStacks * callistoConfig.artworkTibia.damageBonus);
      }
    }

    // DEFENDER STATUS EFFECTS
    if (defender.statuses.length > 0) {
      if (defender.hasStatus('Fragile')) {
        modifier *= 1.5; // 50% more damage
      }
      if (defender.hasStatus('Protection')) {
        modifier *= 0.5; // 50% less damage
      }
    }

    return modifier;
  }

  /**
   * APPLY DAMAGE - AUTHORITATIVE
   * Server applies damage and broadcasts to all clients
   */
  applyDamage(target, damage, attacker) {
    if (target.isDefeated) {
      return { success: false, reason: 'Target already defeated' };
    }

    target.hp = Math.max(0, target.hp - damage);

    // CHECK FOR DEFEAT
    if (target.hp <= 0) {
      target.isDefeated = true;
      return {
        success: true,
        damage: damage,
        defeated: true,
        finalHp: 0
      };
    }

    return {
      success: true,
      damage: damage,
      defeated: false,
      finalHp: target.hp
    };
  }

  /**
   * APPLY STATUS EFFECT - AUTHORITATIVE
   */
  applyStatus(target, statusType, count = 1, potency = 1) {
    const existingStatus = target.statuses.find(s => s.type === statusType);
    
    if (existingStatus) {
      existingStatus.count = (existingStatus.count || 0) + count;
      existingStatus.potency = (existingStatus.potency || 0) + potency;
    } else {
      target.statuses.push({
        type: statusType,
        count: count,
        potency: potency,
        duration: 0
      });
    }

    return {
      success: true,
      status: statusType,
      count: existingStatus ? existingStatus.count : count,
      potency: existingStatus ? existingStatus.potency : potency
    };
  }

  /**
   * UPDATE COOLDOWNS
   * Called each server tick
   */
  updateCooldowns(state, dt) {
    Object.keys(state.abilityCooldowns).forEach(abilityName => {
      if (state.abilityCooldowns[abilityName] > 0) {
        state.abilityCooldowns[abilityName] -= dt;
      }
    });
  }

  /**
   * UPDATE CHARACTER-SPECIFIC SYSTEMS
   * Called each server tick
   */
  updateCharacterSystems(state, dt) {
    if (state.characterKey === 'CALLISTO') {
      this.updateCallistoSystems(state, dt);
    } else if (state.characterKey === 'VALENCINA') {
      this.updateValencinaSystems(state, dt);
    }
  }

  /**
   * UPDATE CALLISTO-SPECIFIC SYSTEMS
   */
  updateCallistoSystems(state, dt) {
    // Regenerate Corpus Ingredient slowly
    if (state.resources.corpusIngredient < state.resources.maxCorpusIngredient) {
      state.resources.corpusIngredient = Math.min(
        state.resources.maxCorpusIngredient,
        state.resources.corpusIngredient + (5 * dt)
      );
    }
  }

  /**
   * UPDATE VALENCINA-SPECIFIC SYSTEMS
   */
  updateValencinaSystems(state, dt) {
    // Precognition decays when not gaining it
    if (state.resources.precognition > 0) {
      state.resources.precognition = Math.max(0, state.resources.precognition - (2 * dt));
    }
    
    // Check for Shin activation
    const hpPercent = state.hp / state.maxHp;
    const valencinConfig = this.getCharacterConfig('VALENCINA');
    if (hpPercent < valencinConfig.shin.activationThreshold && !state.resources.shinActive) {
      state.resources.shinActive = true;
    }
  }

  /**
   * CHECK DEFEAT CONDITION
   */
  isDefeated(state) {
    return state.hp <= 0;
  }

  /**
   * HELPER: HAS STATUS
   */
  hasStatus(state, statusType) {
    return state.statuses.some(s => s.type === statusType);
  }

  /**
   * HELPER: GET STATUS
   */
  getStatus(state, statusType) {
    return state.statuses.find(s => s.type === statusType);
  }
}

// Export for server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameplayEngine;
}
