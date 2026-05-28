/**
 * VALENCINA - SERVER-SIDE ABILITY LOGIC
 * Pure JavaScript implementations of Valencina's abilities
 * Server authority: These functions execute on the server and determine game outcomes
 */

/**
 * TIME TO HUNT - Server Implementation
 * Valencina marks a target and deals damage with bonus status effects
 * Consumes Precognition to activate
 */
function executeTimeToHunt(state, abilityConfig, targetState, config) {
  if (!targetState) {
    return { success: false, reason: 'No target' };
  }

  // VALIDATE PRECOGNITION COST
  if (state.resources.precognition < config.precognition.consumePerAbility) {
    return {
      success: false,
      reason: 'Not enough Precognition',
      current: state.resources.precognition,
      required: config.precognition.consumePerAbility
    };
  }

  // Calculate damage
  let baseDamage = abilityConfig.baseDamage;
  let damage = Math.floor(baseDamage * state.baseDamage);

  // SHIN BONUS: +20% damage if active
  if (state.resources.shinActive) {
    damage = Math.floor(damage * (1 + config.shin.damageBonus));
  }

  // Check hit (simplified)
  const hit = true;

  if (!hit) {
    return {
      success: true,
      ability: 'timeToHunt',
      hit: false,
      reason: 'Target out of range'
    };
  }

  // APPLY DAMAGE
  targetState.hp = Math.max(0, targetState.hp - damage);

  // APPLY STATUS EFFECTS
  const appliedStatuses = [];
  
  // APPLY GAME TARGET - Main effect of Time to Hunt
  // Sets speed to 1, restricts jumping and dashing for 10 seconds
  // FIX 2: Use remainingTime for proper timer countdown via processStatuses
  targetState.statuses.push({
    type: 'Game Target',
    count: 1,
    potency: 1,
    duration: 10,  // 10 second duration
    remainingTime: 10, // Timers will decrement this via processStatuses
    timer: 0
  });
  
  // FIX 2: Apply server-side speed/restriction effects immediately
  // The opponent's speed, canJump, and canDash are set server-side
  // and replicated through snapshots. The client applies these visually.
  targetState.speed = 1;
  targetState.canJump = false;
  targetState.canDash = false;
  appliedStatuses.push('Game Target');
  
  // Apply additional status effects from config if any
  if (abilityConfig.statusEffects) {
    abilityConfig.statusEffects.forEach(statusConfig => {
      // Apply Shin bonus to status effects
      let finalPotency = statusConfig.potency || 1;
      if (state.resources.shinActive && statusConfig.type === 'Burn') {
        finalPotency += config.shin.burnBonusPotency;
      }

      targetState.statuses.push({
        type: statusConfig.type,
        count: statusConfig.count || 1,
        potency: finalPotency,
        duration: statusConfig.duration || 0
      });
      appliedStatuses.push(statusConfig.type);
    });
  }

  // APPLY KNOCKBACK
  if (abilityConfig.knockback) {
    targetState.velocity.x = abilityConfig.knockback * state.facing;
  }

  // CONSUME PRECOGNITION
  state.resources.precognition -= config.precognition.consumePerAbility;

  // MARK TARGET (for gameplay effects)
  state.lastMarkedTarget = targetState.id;

  return {
    success: true,
    ability: 'timeToHunt',
    hit: true,
    damage: damage,
    targetHp: targetState.hp,
    statuses: appliedStatuses,
    precognitionRemaining: state.resources.precognition,
    cooldown: abilityConfig.cooldown,
    defeated: targetState.hp <= 0
  };
}

/**
 * DISPOSIAL - Server Implementation
 * Valencina's ultimate-adjacent ability that hits an area
 * Applies heavy Burn and Tremor status effects
 */
function executeDisposal(state, abilityConfig, targetStates, config) {
  // Ensure targetStates is an array
  const targets = Array.isArray(targetStates) ? targetStates : [targetStates];

  // VALIDATE PRECOGNITION COST (if costs are defined)
  if (config.precognition && state.resources.precognition < config.precognition.consumePerAbility) {
    return {
      success: false,
      reason: 'Not enough Precognition',
      current: state.resources.precognition,
      required: config.precognition.consumePerAbility
    };
  }

  // EXECUTE ATTACK ON EACH TARGET
  const results = [];
  targets.forEach(targetState => {
    if (!targetState || targetState.isDefeated) {
      return;
    }

    let baseDamage = abilityConfig.baseDamage;
    let damage = Math.floor(baseDamage * state.baseDamage);

    // SHIN BONUS: +20% damage if active
    if (state.resources.shinActive) {
      damage = Math.floor(damage * (1 + config.shin.damageBonus));
    }

    // APPLY DAMAGE
    targetState.hp = Math.max(0, targetState.hp - damage);

    // APPLY STATUS EFFECTS
    const appliedStatuses = [];
    abilityConfig.statusEffects.forEach(statusConfig => {
      // Apply Shin bonus to Burn effects
      let finalPotency = statusConfig.potency || 1;
      if (state.resources.shinActive && statusConfig.type === 'Burn') {
        finalPotency += config.shin.burnBonusPotency;
      }

      targetState.statuses.push({
        type: statusConfig.type,
        count: statusConfig.count || 1,
        potency: finalPotency,
        duration: statusConfig.duration || 0
      });
      appliedStatuses.push(statusConfig.type);
    });

    results.push({
      targetId: targetState.id,
      hit: true,
      damage: damage,
      targetHp: targetState.hp,
      statuses: appliedStatuses,
      defeated: targetState.hp <= 0
    });
  });

  // CONSUME PRECOGNITION
  if (config.precognition) {
    state.resources.precognition -= config.precognition.consumePerAbility;
  }

  return {
    success: true,
    ability: 'disposial',
    targetsHit: results.length,
    precognitionRemaining: state.resources.precognition || 0,
    results: results
  };
}

/**
 * ON HIT - Server Implementation
 * Called when Valencina successfully hits a target
 * Gains Precognition and Acceleration Rounds
 */
function onSuccessfulHit(state, targetState, damage, config) {
  const effects = {};

  // GAIN PRECOGNITION
  if (state.resources.precognition < config.precognition.max) {
    state.resources.precognition += config.precognition.gainPerHit;
    effects.precognitionGain = config.precognition.gainPerHit;
  }

  // GAIN ACCELERATION ROUND
  if (state.resources.accelerationRounds < config.accelerationRounds.max) {
    state.resources.accelerationRounds += config.accelerationRounds.gainPerHit;
    effects.accelerationRoundsGain = config.accelerationRounds.gainPerHit;
  }

  // APPLY BURN AND TREMOR
  targetState.statuses.push({
    type: 'Burn',
    count: 2,
    potency: 2,
    duration: 0
  });
  targetState.statuses.push({
    type: 'Tremor',
    count: 2,
    potency: 2,
    duration: 0
  });

  effects.statusesApplied = ['Burn', 'Tremor'];

  return {
    success: true,
    ...effects
  };
}

/**
 * ON HIT TAKEN - Server Implementation
 * Called when Valencina receives damage
 * Gains Precognition and may lose Overheat
 */
function onReceiveHit(state, damage, attacker, config) {
  const effects = {};

  // GAIN PRECOGNITION
  if (state.resources.precognition < config.precognition.max) {
    state.resources.precognition += config.precognition.gainPerHit;
    effects.precognitionGain = config.precognition.gainPerHit;
  }

  // LOSE OVERHEAT
  if (state.resources.overheat > 0) {
    state.resources.overheat -= config.overheat.losePerHit;
    effects.overheatLoss = config.overheat.losePerHit;
  }

  // CHECK SHIN ACTIVATION
  const hpPercent = state.hp / state.maxHp;
  if (hpPercent < config.shin.activationThreshold && !state.resources.shinActive) {
    state.resources.shinActive = true;
    effects.shinActivated = true;
  }

  return {
    success: true,
    ...effects
  };
}

/**
 * ON EVADE - Server Implementation
 * Called when Valencina successfully dodges an attack
 * Gains Precognition and Acceleration Rounds
 */
function onEvade(state, config) {
  const effects = {};

  // GAIN PRECOGNITION
  if (state.resources.precognition < config.precognition.max) {
    state.resources.precognition += config.precognition.gainPerEvade;
    effects.precognitionGain = config.precognition.gainPerEvade;
  }

  // GAIN ACCELERATION ROUND
  if (state.resources.accelerationRounds < config.accelerationRounds.max) {
    state.resources.accelerationRounds += config.accelerationRounds.gainPerHit;
    effects.accelerationRoundsGain = config.accelerationRounds.gainPerHit;
  }

  return {
    success: true,
    ...effects
  };
}

/**
 * SHIN SYSTEM - Server Implementation
 * Valencina's passive that activates at <50% HP
 * Provides stat bonuses while active
 */
function updateShinSystem(state, config) {
  const hpPercent = state.hp / state.maxHp;
  const wasActive = state.resources.shinActive;

  // CHECK ACTIVATION CONDITION
  if (hpPercent < config.shin.activationThreshold) {
    state.resources.shinActive = true;
  } else {
    state.resources.shinActive = false;
  }

  return {
    shinActive: state.resources.shinActive,
    activated: !wasActive && state.resources.shinActive,
    deactivated: wasActive && !state.resources.shinActive,
    hpPercent: hpPercent
  };
}

// Export for server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    executeTimeToHunt,
    executeDisposal,
    onSuccessfulHit,
    onReceiveHit,
    onEvade,
    updateShinSystem,
    timeToHunt: executeTimeToHunt,
    disposial: executeDisposal
  };
}
