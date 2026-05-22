/**
 * GAMEPLAY ENGINE - SERVER-SIDE AUTHORITY
 * Pure JavaScript (no p5.js, no window object)
 * 
 * Handles all authoritative game logic:
 * - Damage calculation and application
 * - Hit detection
 * - Stagger system
 * - Status effect application and resolution  
 * - Combo system
 * - Ability validation and execution
 * - Cooldown management
 * - Movement validation
 * - Combat state transitions
 * - Knockback calculation
 * - Defeat detection
 */

// Arena constants (mirrored from public/constants.js)
const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 700;
const GRAVITY = 0.6;

class GameplayEngine {
  constructor() {
    this.combatState = {};
    this.characterLogic = {};
    this.groundY = ARENA_HEIGHT - 100; // Match spawnY = height - 100
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
      baseDamage: config.baseDamage,
      speed: config.speed,
      knockbackMultiplier: config.knockbackMultiplier || 1.0,
      kbResist: 0.08,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      facing: 1, // 1 = right, -1 = left
      
      // PHYSICS STATE
      onGround: true,
      canDash: true,
      dashCooldown: 0,
      
      // ACTION FLAGS
      isAttacking: false,
      isGuarding: false,
      isDashing: false,
      
      // COMBAT STATE
      state: 'idle', // idle, attacking, staggered, recovering, defeated
      stagger: 0,
      staggerTimer: 0,
      staggerRecoveryTimer: 0,
      isDefeated: false,
      
      // COOLDOWNS
      attackCooldown: 0,
      abilityCooldowns: {},
      
      // STATUS EFFECTS
      statuses: [],
      
      // COMBO SYSTEM
      combo: 0,
      comboTimer: 0,
      attackCounter: 0,
      
      // CHARACTER-SPECIFIC RESOURCES
      resources: {}
    };

    // Initialize character-specific resources
    this.initializeCharacterResources(state, characterKey, config);
    
    // Initialize ability cooldowns
    Object.keys(config.abilities || {}).forEach(abilityName => {
      state.abilityCooldowns[abilityName] = 0;
    });

    // Initialize combat state
    this.combatState[characterId] = {
      combo: 0,
      comboTimer: 0,
      attackCounter: 0,
      chargeAttack: false,
      lastAttackHit: false
    };

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
        corpusSpentTotal: 0,
        slamCooldownActive: false,
        slamBuffActive: false
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
    try {
      return require(`../../shared/characters/${characterKey.toLowerCase()}`);
    } catch (e) {
      return null;
    }
  }

  // ============================
  // HIT DETECTION
  // ============================

  /**
   * Check if an attack hits a target based on distance
   * Pure JS replacement for p5.js dist()
   */
  checkHit(attackerPos, targetPos, attackRange, facing) {
    const dx = attackerPos.x - targetPos.x;
    const dy = attackerPos.y - targetPos.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance > attackRange) return false;
    
    // Check if target is in front of attacker (based on facing direction)
    const isInFront = facing > 0 
      ? targetPos.x > attackerPos.x 
      : targetPos.x < attackerPos.x;
    
    // Allow a small area behind for forgiveness  
    const behindThreshold = attackRange * 0.3;
    const isBehind = !isInFront && Math.abs(attackerPos.x - targetPos.x) < behindThreshold;
    
    return isInFront || isBehind;
  }

  /**
   * Rect-based hitbox overlap detection
   */
  checkRectOverlap(box1, box2) {
    return !(
      box1.x + box1.w < box2.x ||
      box2.x + box2.w < box1.x ||
      box1.y + box1.h < box2.y ||
      box2.y + box2.h < box1.y
    );
  }

  // ============================
  // DAMAGE CALCULATION
  // ============================

  /**
   * Calculate final damage with all modifiers
   * This is the AUTHORITATIVE damage calculation
   */
  calculateDamage(baseDamage, attacker, defender) {
    let damage = baseDamage;

    // Apply base damage scaling
    damage = damage * (attacker.baseDamage || 1);

    // Get combat state for attacker
    const combatState = this.combatState[attacker.id] || {};

    // Combo bonus: +2 per combo count
    damage += (combatState.combo || 0) * 2;

    // Attack counter bonus: 200% on 3rd hit
    if (combatState.attackCounter === 3) {
      damage *= 2.0;
    }

    // Charge attack bonus: 40%
    if (combatState.chargeAttack) {
      damage *= 1.4;
    }

    // Poise bonus: 15%
    if (this.hasStatus(defender, 'Poise')) {
      damage *= 1.15;
    }

    // Staggered target bonus: 2x damage
    if (defender.state === 'staggered') {
      damage *= 2;
    }

    // Character-specific: Callisto's Artwork: Tibia bonus
    if (attacker.characterKey === 'CALLISTO' && attacker.resources.artworkTibiaStacks > 0) {
      const artworkBonus = 1 + (attacker.resources.artworkTibiaStacks * 0.1);
      damage *= artworkBonus;
    }

    // Defender status effects
    if (this.hasStatus(defender, 'Fragile')) {
      const fragileStatus = this.getStatus(defender, 'Fragile');
      const fragileMultiplier = 1 + (0.1 * fragileStatus.potency);
      damage *= fragileMultiplier;
    }

    if (this.hasStatus(defender, 'Protection')) {
      const protectionStatus = this.getStatus(defender, 'Protection');
      const protectionMultiplier = 1 - (0.1 * protectionStatus.potency);
      damage *= protectionMultiplier;
    }

    // Sinking resistance penalty
    if (this.hasStatus(defender, 'Sinking')) {
      const sinkingStatus = this.getStatus(defender, 'Sinking');
      const resistancePenalty = 1 - (0.05 * Math.floor(sinkingStatus.potency / 5));
      damage *= Math.max(0.5, resistancePenalty);
    }

    // Round down
    return Math.floor(damage);
  }

  /**
   * Calculate knockback amount
   */
  calculateKnockback(baseKnockback, attacker) {
    let knockback = baseKnockback || 0;
    knockback *= (attacker.knockbackMultiplier || 1.0);
    return Math.max(0, Math.floor(knockback));
  }

  /**
   * Apply knockback to a fighter
   */
  applyKnockback(fighter, knockback, direction) {
    fighter.velocity.x = knockback * direction;
    fighter.velocity.y = -5; // Slight upward pop
    
    // Clamp to arena boundaries
    fighter.position.x = Math.max(60, Math.min(ARENA_WIDTH - 60, fighter.position.x + knockback * direction));
  }

  // ============================
  // STAGGER SYSTEM
  // ============================

  /**
   * Apply stagger damage to a fighter
   */
  applyStagger(fighter, staggerAmount, config) {
    const threshold = config.staggerThreshold || 1000;
    const length = config.staggerLength || 5;
    
    fighter.stagger += staggerAmount;
    
    // Check if stagger threshold is reached
    if (fighter.stagger >= threshold && fighter.state !== 'staggered') {
      fighter.state = 'staggered';
      fighter.staggerTimer = length;
      fighter.stagger = threshold;
      
      return {
        staggered: true,
        duration: length
      };
    }
    
    return { staggered: false, stagger: fighter.stagger };
  }

  /**
   * Update stagger state (called per tick)
   */
  updateStagger(fighter, dt, config) {
    const threshold = config.staggerThreshold || 1000;
    const length = config.staggerLength || 5;
    
    if (fighter.state === 'staggered') {
      if (fighter.staggerTimer > 0) {
        fighter.staggerTimer -= dt;
        // Stagger bar decreases over time
        fighter.stagger = (fighter.staggerTimer / length) * threshold;
        
        if (fighter.staggerTimer <= 0) {
          // Enter recovery phase
          fighter.staggerRecoveryTimer = length;
          fighter.stagger = 0;
          return { state: 'recovering', recoveryTimer: length };
        }
        return { state: 'staggered', timer: fighter.staggerTimer };
      }
    }
    
    if (fighter.staggerRecoveryTimer > 0) {
      fighter.staggerRecoveryTimer -= dt;
      if (fighter.staggerRecoveryTimer <= 0) {
        fighter.state = 'idle';
        fighter.stagger = 0;
        return { state: 'idle' };
      }
      return { state: 'recovering', recoveryTimer: fighter.staggerRecoveryTimer };
    }
    
    return { state: fighter.state };
  }

  // ============================
  // STATUS EFFECT SYSTEM
  // ============================

  /**
   * Apply a status effect to a fighter
   */
  applyStatus(target, statusType, count, potency) {
    const existing = target.statuses.find(s => s.type === statusType);
    
    if (existing) {
      existing.count = (existing.count || 0) + (count || 1);
      existing.potency = (existing.potency || 0) + (potency || 0);
      return {
        applied: false,
        updated: true,
        count: existing.count,
        potency: existing.potency
      };
    } else {
      target.statuses.push({
        type: statusType,
        count: count || 1,
        potency: potency || 0,
        timer: 0
      });
      return {
        applied: true,
        updated: false,
        count: count || 1,
        potency: potency || 0
      };
    }
  }

  /**
   * Process status effects for a tick
   */
  processStatuses(fighter, dt) {
    const events = [];
    
    fighter.statuses = fighter.statuses.filter(status => {
      switch (status.type) {
        case 'Burn':
          status.timer += dt;
          if (status.timer >= 1) {
            status.timer = 0;
            status.count -= 1;
            const burnDamage = status.potency;
            fighter.hp = Math.max(0, fighter.hp - burnDamage);
            events.push({ type: 'BURN_DAMAGE', damage: burnDamage, hp: fighter.hp });
          }
          return status.count > 0;

        case 'Bleed':
          status.timer += dt;
          if (status.timer >= 1) {
            status.timer = 0;
            status.potency = Math.max(0, status.potency - 1);
          }
          return status.potency > 0 && status.count > 0;

        case 'Tremor':
          status.timer += dt;
          if (status.count <= 0) {
            fighter.stagger += status.potency;
            events.push({ type: 'TREMOR_STAGGER', amount: status.potency });
            return false;
          }
          return true;

        case 'Haste':
          return status.count > 0;

        case 'Bind':
          return status.count > 0;

        case 'Sinking':
          status.timer += dt;
          return status.count > 0;

        case 'Fragile':
        case 'Protection':
          return status.count > 0;

        case 'Poise':
          // Count decreases on crit
          return status.count > 0;

        default:
          status.timer += dt;
          return status.count > 0 && status.timer < 30;
      }
    });
    
    // Check defeat from status damage
    if (fighter.hp <= 0 && !fighter.isDefeated) {
      fighter.isDefeated = true;
      fighter.velocity.x = 0;
      fighter.velocity.y = 0;
      fighter.state = 'defeated';
      events.push({ type: 'DEFEATED' });
    }
    
    return events;
  }

  /**
   * Consume statuses when a fighter is hit
   */
  consumeOnHit(fighter) {
    const events = [];
    
    // Bleed: lose 1 count, trigger damage if reaches 0
    const bleedStatus = fighter.statuses.find(s => s.type === 'Bleed');
    if (bleedStatus) {
      bleedStatus.count -= 1;
      if (bleedStatus.count <= 0) {
        const damage = bleedStatus.potency;
        if (damage > 0) {
          fighter.hp = Math.max(0, fighter.hp - damage);
          events.push({ type: 'BLEED_DAMAGE', damage });
        }
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Bleed');
      }
    }
    
    // Rupture: lose 1 count, trigger damage
    const ruptureStatus = fighter.statuses.find(s => s.type === 'Rupture');
    if (ruptureStatus) {
      const ruptureDamage = ruptureStatus.potency;
      fighter.hp = Math.max(0, fighter.hp - ruptureDamage);
      events.push({ type: 'RUPTURE_DAMAGE', damage: ruptureDamage });
      
      ruptureStatus.count -= 1;
      if (ruptureStatus.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Rupture');
      }
    }
    
    // Sinking: lose 1 count
    const sinkingStatus = fighter.statuses.find(s => s.type === 'Sinking');
    if (sinkingStatus) {
      sinkingStatus.count -= 1;
      if (sinkingStatus.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Sinking');
      }
    }
    
    return events;
  }

  /**
   * Consume Bleed when the fighter attacks
   */
  consumeBleedOnAttack(fighter) {
    const events = [];
    
    const bleedStatus = fighter.statuses.find(s => s.type === 'Bleed');
    if (bleedStatus && bleedStatus.potency > 0) {
      const damage = bleedStatus.potency;
      fighter.hp = Math.max(0, fighter.hp - damage);
      events.push({ type: 'BLEED_ATTACK_DAMAGE', damage });
      
      bleedStatus.count -= 1;
      if (bleedStatus.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Bleed');
      }
    }
    
    return events;
  }

  // ============================
  // COMBO SYSTEM
  // ============================

  /**
   * Add combo to attacker
   */
  addCombo(attackerId) {
    const combatState = this.combatState[attackerId];
    if (!combatState) return 0;
    
    combatState.combo = (combatState.combo || 0) + 1;
    combatState.comboTimer = 1.4;
    return combatState.combo;
  }

  /**
   * Update combos (call per tick)
   */
  updateCombos(dt) {
    Object.values(this.combatState).forEach(state => {
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) {
          state.combo = 0;
        }
      }
    });
  }

  // ============================
  // ATTACK COUNTER SYSTEM
  // ============================

  /**
   * Increment attack counter (1-3 rotation)
   */
  incrementAttackCounter(attackerId) {
    const combatState = this.combatState[attackerId];
    if (!combatState) return 0;
    
    combatState.attackCounter = Math.min(3, (combatState.attackCounter || 0) + 1);
    return combatState.attackCounter;
  }

  // ============================
  // MOVEMENT
  // ============================

  /**
   * Apply gravity to a fighter
   */
  applyGravity(fighter) {
    if (fighter.position.y < this.groundY) {
      fighter.velocity.y += GRAVITY;
    }
    
    fighter.position.y += fighter.velocity.y;
    
    // Ground clamp
    if (fighter.position.y >= this.groundY) {
      fighter.position.y = this.groundY;
      fighter.velocity.y = 0;
    }
  }

  /**
   * Validate a movement request
   */
  validateMovement(fighter, velocity) {
    const newX = fighter.position.x + velocity.x;
    const newY = fighter.position.y + velocity.y;
    
    // Boundary check
    if (newX < 60 || newX > ARENA_WIDTH - 60) {
      return {
        valid: false,
        reason: 'BOUNDARY',
        clampedX: Math.max(60, Math.min(ARENA_WIDTH - 60, newX))
      };
    }
    
    // Speed validation
    const speed = Math.abs(velocity.x);
    if (speed > (fighter.speed || 9) * 1.5) {
      return {
        valid: false,
        reason: 'SPEED_EXCEEDED'
      };
    }
    
    return { valid: true, x: newX, y: newY };
  }

  // ============================
  // VALIDATE AND EXECUTE ABILITY
  // ============================

  /**
   * Validate and execute an ability with full server authority
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

    // CHECK STATE (must not be staggered/defeated)
    if (state.isDefeated || state.state === 'staggered') {
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
   */
  executeCharacterAbility(state, abilityName, abilityConfig, targetState, config) {
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
    try {
      const logic = require(`./characterLogic/${characterKey.toLowerCase()}`);
      return logic[abilityName];
    } catch (e) {
      return null;
    }
  }

  // ============================
  // DAMAGE APPLICATION
  // ============================

  /**
   * Apply damage to a target (authoritative)
   */
  applyDamage(target, damage, attacker) {
    if (target.isDefeated) {
      return { success: false, reason: 'Target already defeated' };
    }

    target.hp = Math.max(0, target.hp - damage);

    // CHECK FOR DEFEAT
    if (target.hp <= 0) {
      target.isDefeated = true;
      target.velocity.x = 0;
      target.velocity.y = 0;
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

  // ============================
  // FULL COMBAT RESOLUTION
  // ============================

  /**
   * Fully resolve an attack with all systems
   * This is the main entry point for combat resolution
   */
  resolveAttack(attacker, defender, attackData, config) {
    const result = {
      success: false,
      hit: false,
      damage: 0,
      knockback: 0,
      staggerResult: null,
      statuses: [],
      defenderHp: defender.hp,
      defeated: false
    };

    // Check hit
    const attackRange = attackData.range || 100;
    const hit = this.checkHit(
      attacker.position,
      defender.position,
      attackRange,
      attacker.facing
    );

    if (!hit) {
      result.reason = 'Missed';
      return result;
    }

    result.hit = true;

    // Base damage multiplier can be modified by guard
    let baseDamage = attackData.baseDamage || attacker.baseDamage;
    let knockbackAmount = attackData.knockback || 0;
    let staggerAmount = attackData.staggerDamage || 0;

    if (defender.isGuarding) {
      baseDamage = baseDamage * 0.5;
      knockbackAmount = Math.floor(knockbackAmount * 0.5);
      staggerAmount = 0;
      result.wasGuarded = true;
    }

    // Calculate damage
    const finalDamage = this.calculateDamage(baseDamage, attacker, defender);
    
    // Apply damage
    const applyResult = this.applyDamage(defender, finalDamage, attacker);
    result.damage = applyResult.damage;
    result.defenderHp = defender.hp;
    result.defeated = applyResult.defeated;

    // Apply knockback
    if (knockbackAmount) {
      const finalKnockback = this.calculateKnockback(knockbackAmount, attacker);
      this.applyKnockback(defender, finalKnockback, attacker.facing);
      result.knockback = finalKnockback;
    }

    // Apply stagger
    if (staggerAmount) {
      result.staggerResult = this.applyStagger(defender, staggerAmount, config);
    }

    // Apply attack status effects
    if (attackData.statusEffects) {
      attackData.statusEffects.forEach(statusConfig => {
        this.applyStatus(defender, statusConfig.type, statusConfig.count, statusConfig.potency);
        result.statuses.push(statusConfig.type);
      });
    }

    // Consume on-hit statuses
    const consumeEvents = this.consumeOnHit(defender);
    result.consumeEvents = consumeEvents;

    // Consume bleed effects when attacker hits
    const bleedAttackEvents = this.consumeBleedOnAttack(attacker);
    if (bleedAttackEvents.length) {
      result.bleedAttackEvents = bleedAttackEvents;
    }

    // Track charge attack state for damage scaling
    const combatState = this.combatState[attacker.id] || {};
    combatState.chargeAttack = !!attackData.chargeAttack || !!attackData.heavy;
    this.combatState[attacker.id] = combatState;

    // Combo
    this.addCombo(attacker.id);

    // Attack counter
    this.incrementAttackCounter(attacker.id);

    result.chargeAttack = combatState.chargeAttack;
    result.success = true;
    return result;
  }

  // ============================
  // UPDATE FUNCTIONS
  // ============================

  /**
   * Update cooldowns (called per tick)
   */
  updateCooldowns(state, dt) {
    Object.keys(state.abilityCooldowns).forEach(abilityName => {
      if (state.abilityCooldowns[abilityName] > 0) {
        state.abilityCooldowns[abilityName] -= dt;
      }
    });
  }

  /**
   * Full update for a fighter each tick
   */
  updateFighter(state, dt, config) {
    const events = [];

    // Update cooldowns
    this.updateCooldowns(state, dt);

    // Update stagger
    const staggerUpdate = this.updateStagger(state, dt, config);
    if (staggerUpdate.state !== state.state) {
      events.push({ type: 'STATE_CHANGE', from: state.state, to: staggerUpdate.state });
    }

    // Process status effects
    const statusEvents = this.processStatuses(state, dt);
    events.push(...statusEvents);

    // Update character-specific systems
    const charEvents = this.updateCharacterSystems(state, dt);
    events.push(...charEvents);

    return events;
  }

  /**
   * Update character-specific systems
   */
  updateCharacterSystems(state, dt) {
    if (state.characterKey === 'CALLISTO') {
      return this.updateCallistoSystems(state, dt);
    } else if (state.characterKey === 'VALENCINA') {
      return this.updateValencinaSystems(state, dt);
    }
    return [];
  }

  /**
   * Update Callisto-specific systems
   */
  updateCallistoSystems(state, dt) {
    const events = [];
    
    // Regenerate Corpus Ingredient slowly
    if (state.resources.corpusIngredient < state.resources.maxCorpusIngredient) {
      state.resources.corpusIngredient = Math.min(
        state.resources.maxCorpusIngredient,
        state.resources.corpusIngredient + (5 * dt)
      );
    }

    // Handle slam buff expiry
    if (state.resources.slamBuffActive) {
      state.resources.slamBuffTimer -= dt;
      if (state.resources.slamBuffTimer <= 0) {
        state.resources.slamBuffActive = false;
        events.push({ type: 'SLAM_BUFF_EXPIRED' });
      }
    }

    return events;
  }

  /**
   * Update Valencina-specific systems
   */
  updateValencinaSystems(state, dt) {
    const events = [];
    
    // Precognition decays when not gaining it
    if (state.resources.precognition > 0) {
      state.resources.precognition = Math.max(0, state.resources.precognition - (2 * dt));
    }
    
    // Check for Shin activation
    const hpPercent = state.hp / state.maxHp;
    const valencinaConfig = this.getCharacterConfig('VALENCINA');
    if (hpPercent < valencinaConfig.shin.activationThreshold && !state.resources.shinActive) {
      state.resources.shinActive = true;
      events.push({ type: 'SHIN_ACTIVATED' });
    }

    return events;
  }

  // ============================
  // STATUS HELPERS
  // ============================

  hasStatus(fighter, statusType) {
    return fighter.statuses && fighter.statuses.some(s => s.type === statusType);
  }

  getStatus(fighter, statusType) {
    return fighter.statuses && fighter.statuses.find(s => s.type === statusType);
  }

  removeStatus(fighter, statusType) {
    fighter.statuses = fighter.statuses.filter(s => s.type !== statusType);
  }

  /**
   * Check defeat
   */
  isDefeated(state) {
    return state.hp <= 0;
  }

  /**
   * Get state snapshot for broadcasting
   */
  getStateSnapshot(state) {
    return {
      id: state.id,
      characterKey: state.characterKey,
      hp: state.hp,
      maxHp: state.maxHp,
      position: { ...state.position },
      velocity: { ...state.velocity },
      facing: state.facing,
      state: state.state,
      stagger: state.stagger,
      isDefeated: state.isDefeated,
      statuses: state.statuses.map(s => ({ ...s })),
      resources: { ...state.resources },
      abilityCooldowns: { ...state.abilityCooldowns }
    };
  }
}

// Export for server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameplayEngine;
}