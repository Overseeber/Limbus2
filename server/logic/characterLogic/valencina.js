/**
 * VALENCINA - SERVER-SIDE CHARACTER LOGIC
 * Complete kit restoration from oldclientgameplay reference.
 * ALL calculations are server-authoritative.
 * 
 * All unique passives/resources are managed as proper statuses
 * so they render visually on the client status row like Burn/Bleed.
 */

//====================================================================
// UTILITY FUNCTIONS
//====================================================================

function getStatus(fighter, type) {
  if (!fighter || !fighter.statuses) return null;
  return fighter.statuses.find(s => s.type === type);
}

function getStatusPotency(fighter, type) {
  const s = getStatus(fighter, type);
  return s ? (s.potency || 0) : 0;
}

function getStatusCount(fighter, type) {
  const s = getStatus(fighter, type);
  return s ? (s.count || 0) : 0;
}

function ensureStatus(fighter, type, count, potency) {
  const existing = fighter.statuses.find(s => s.type === type);
  if (existing) {
    existing.count = (existing.count || 0) + (count || 0);
    existing.potency = (existing.potency || 0) + (potency || 0);
    return existing;
  }
  const status = { type, count: count || 0, potency: potency || 0, timer: 0 };
  fighter.statuses.push(status);
  return status;
}

function setStatusCount(fighter, type, count) {
  const existing = fighter.statuses.find(s => s.type === type);
  if (existing) {
    existing.count = count;
  } else {
    fighter.statuses.push({ type, count: count || 0, potency: 0, timer: 0 });
  }
}

function removeStatus(fighter, type) {
  fighter.statuses = fighter.statuses.filter(s => s.type !== type);
}

/**
 * Calculate Valencina's basic attack damage
 * Formula: Damage = BaseDamage + (ComboDamage × ComboCount)
 */
function calculateAttackDamage(state, config) {
  const baseDamage = config.baseDamage || 21;
  const comboDamage = config.comboDamage || 3;
  const comboCount = state.combo || 0;
  let damage = baseDamage + (comboDamage * comboCount);
  return Math.max(1, Math.floor(damage));
}

/**
 * Calculate bonus damage: (Burn Potency + Tremor Potency) / 2
 */
function calculateAccelerationRoundBonusDamage(attackerState, targetState) {
  const burnPot = getStatusPotency(targetState, 'Burn');
  const tremorPot = getStatusPotency(targetState, 'Tremor');
  return Math.floor((burnPot + tremorPot) / 2);
}

//====================================================================
// ON SUCCESSFUL HIT - RESTORED FROM REFERENCE
//====================================================================
/**
 * Called when Valencina successfully hits a target.
 * - Inflict 2 Burn Potency, 2 Burn Count on target
 * - Inflict 2 Tremor Potency, 2 Tremor Count on target
 * - Gain 1 [Accelerating Future] per hit
 * - Track last hit opponent for Time to Hunt
 */
function onSuccessfulHit(state, targetState, damage, config) {
  const effects = { statusesApplied: [], acceleratingFutureGained: false, overheatLost: false };

  if (!targetState || targetState.isDefeated) {
    return { success: false, reason: 'No valid target' };
  }

  // Store last hit opponent for Time to Hunt targeting
  state.lastHitOpponent = targetState.id;

  // Apply 2 Burn + 2 Tremor to target
  const b = getStatus(targetState, 'Burn');
  if (b) { b.count += 2; b.potency += 2; }
  else targetState.statuses.push({ type: 'Burn', count: 2, potency: 2, timer: 0 });
  const t = getStatus(targetState, 'Tremor');
  if (t) { t.count += 2; t.potency += 2; }
  else targetState.statuses.push({ type: 'Tremor', count: 2, potency: 2, timer: 0 });
  effects.statusesApplied.push('Burn', 'Tremor');

  // Gain 1 Accelerating Future per hit (unique status)
  const af = ensureStatus(state, 'Accelerating Future', 1, 0);
  effects.acceleratingFutureGained = true;

  // Apply Accelerating Future effects to speed/interval
  applyAcceleratingFutureEffects(state, config);

  // On hit (landing an attack): lose 1 Precognition
  const precogHit = getStatus(state, 'Precognition');
  if (precogHit && precogHit.count > 0) {
    precogHit.count = Math.max(0, precogHit.count - 1);
    effects.precognitionLost = 1;
  }

  // On hit (landing an attack): lose 1 Overheat
  const oh = getStatus(state, 'Overheat');
  if (oh && oh.count > 0) {
    oh.count = Math.max(0, oh.count - 1);
    effects.overheatLost = true;
    if (oh.count <= 0) {
      exitOverheat(state, config);
      effects.overheatExited = true;
    }
  }

  return { success: true, ...effects };
}

//====================================================================
// ACCELERATING FUTURE
//====================================================================
function applyAcceleratingFutureEffects(state, config) {
  const afCount = getStatusCount(state, 'Accelerating Future');
  const afConfig = config.acceleratingFuture || {};
  
  const speedBonus = Math.min(afCount * (afConfig.speedPerStack || 0.5), afConfig.maxSpeedBonus || 5);
  const intervalReduction = Math.min(afCount * (afConfig.intervalReductionPerStack || 2.5), afConfig.maxIntervalReduction || 80);
  
  state.resources.acceleratingFuture = afCount;
  state.resources.acceleratingFutureSpeedBonus = speedBonus;
  state.resources.acceleratingFutureIntervalReduction = intervalReduction;
  state.resources.effectiveSpeed = (config.speed || 9) + speedBonus;
  state.resources.effectiveAttackInterval = (config.attackInterval || 1.0) * (1 - intervalReduction / 100);
}

//====================================================================
// ATTACK-SPECIFIC PER-ATTACK EFFECTS
//====================================================================
function applyAttack1Effects(state) {
  // Attack 1: Gain 3 Poise Count
  ensureStatus(state, 'Poise', 3, 0);
}

function applyAttack2Effects(state) {
  // Attack 2: Gain 1 Poise Potency
  ensureStatus(state, 'Poise', 0, 1);
}

function applyAttack3Effects(state, targetState) {
  const result = { consumedAccelerationRound: false, triggeredTremorBurst: false, bonusDamage: 0 };

  const currentAR = getStatusCount(state, 'Acceleration Round');
  if (currentAR <= 0) return result;

  // Consume 1 Acceleration Round
  const arStatus = getStatus(state, 'Acceleration Round');
  if (arStatus) arStatus.count = Math.max(0, arStatus.count - 1);
  result.consumedAccelerationRound = true;

  // Tremor Burst on target
  const tremorBurst = triggerTremorBurst(targetState);
  if (tremorBurst) result.triggeredTremorBurst = true;

  // Bonus damage: (Burn Pot + Tremor Pot) / 2
  const bonusDamage = calculateAccelerationRoundBonusDamage(state, targetState);
  if (bonusDamage > 0 && targetState && !targetState.isDefeated) {
    targetState.hp = Math.max(0, targetState.hp - bonusDamage);
    result.bonusDamage = bonusDamage;
  }

  // Gain 4 Poise Potency and Count from AR consumption
  ensureStatus(state, 'Poise', 4, 4);

  return result;
}

//====================================================================
// ACCELERATION ROUND CONSUMPTION
//====================================================================
function consumeAccelerationRound(state, targetState, config) {
  const currentAR = getStatusCount(state, 'Acceleration Round');
  if (currentAR <= 0) return { success: false, reason: 'No Acceleration Rounds' };

  const arStatus = getStatus(state, 'Acceleration Round');
  if (arStatus) arStatus.count = Math.max(0, arStatus.count - 1);

  // Set active flag for next attack
  state.resources.accelerationRoundActive = true;

  // Gain 4 Poise
  ensureStatus(state, 'Poise', config.accelerationRounds.poiseCountGain || 4, config.accelerationRounds.poisePotencyGain || 4);

  // Tremor Burst
  const burstResult = triggerTremorBurst(targetState);

  // Bonus damage
  let bonusDamage = 0;
  if (targetState && !targetState.isDefeated) {
    bonusDamage = calculateAccelerationRoundBonusDamage(state, targetState);
    if (bonusDamage > 0) targetState.hp = Math.max(0, targetState.hp - bonusDamage);
  }

  return { success: true, accelerationRoundsRemaining: getStatusCount(state, 'Acceleration Round'), poiseCountGain: 4, poisePotencyGain: 4, triggeredTremorBurst: !!burstResult, bonusDamage };
}

//====================================================================
// TREMOR BURST
//====================================================================
function triggerTremorBurst(targetState) {
  if (!targetState || targetState.isDefeated) return null;
  const tremor = getStatus(targetState, 'Tremor');
  if (!tremor || tremor.count <= 0) return null;

  tremor.count -= 1;
  const potency = tremor.potency || 0;
  if (potency > 0) targetState.stagger = (targetState.stagger || 0) + potency;

  if (tremor.count <= 0) removeStatus(targetState, 'Tremor');

  return { consumed: true, staggerAdded: potency };
}

//====================================================================
// TIME TO HUNT - ABILITY
//====================================================================
function executeTimeToHunt(state, abilityConfig, targetState, config) {
  if (!targetState || targetState.isDefeated) {
    return { success: false, reason: 'No valid target' };
  }

  const gameTargetDuration = abilityConfig.gameTargetDuration || 10;

  // Apply [Game Target] unique status on target with remainingTime for duration tracking
  const existingGT = getStatus(targetState, 'Game Target');
  if (existingGT) {
    existingGT.remainingTime = gameTargetDuration;
    existingGT.timer = 0;
  } else {
    targetState.statuses.push({
      type: 'Game Target',
      count: 1,
      potency: 1,
      duration: gameTargetDuration,
      remainingTime: gameTargetDuration,
      timer: 0
    });
  }

  // Set server-side restrictions immediately
  targetState.speed = 1;
  targetState.canJump = false;
  targetState.canDash = false;

  // Apply status effects
  const appliedStatuses = ['Game Target'];
  if (abilityConfig.statusEffects) {
    abilityConfig.statusEffects.forEach(statusConfig => {
      ensureStatus(targetState, statusConfig.type, statusConfig.count || 1, statusConfig.potency || 1);
      appliedStatuses.push(statusConfig.type);
    });
  }

  // Apply knockback
  if (abilityConfig.knockback && targetState.velocity) {
    targetState.velocity.x = abilityConfig.knockback * (state.facing || 1);
  }

  return {
    success: true,
    ability: 'timeToHunt',
    hit: true,
    activationAnimation: abilityConfig.activationAnimation || 'de1',
    cooldown: abilityConfig.cooldown || 30,
    targetId: targetState.id,
    statuses: appliedStatuses,
    gameTargetDuration
  };
}

//====================================================================
// DISPOSAL - ULTIMATE
//====================================================================
function executeDisposal(state, abilityConfig, targetStates, config) {
  const targets = Array.isArray(targetStates) ? targetStates : [targetStates];
  const results = [];

  targets.forEach(targetState => {
    if (!targetState || targetState.isDefeated) return;
    let damage = Math.floor((abilityConfig.baseDamage || 1.5) * (state.baseDamage || 21));
    if (state.resources.shinActive) damage = Math.floor(damage * (1 + 0.2));

    targetState.hp = Math.max(0, targetState.hp - damage);

    const appliedStatuses = [];
    if (abilityConfig.statusEffects) {
      abilityConfig.statusEffects.forEach(statusConfig => {
        ensureStatus(targetState, statusConfig.type, statusConfig.count || 1, statusConfig.potency || 1);
        appliedStatuses.push(statusConfig.type);
      });
    }

    results.push({ targetId: targetState.id, hit: true, damage, targetHp: targetState.hp, statuses: appliedStatuses, defeated: targetState.hp <= 0 });
  });

  return { success: true, ability: 'disposial', targetsHit: results.length, results };
}

//====================================================================
// PRECOGNITION SYSTEM
//====================================================================

/**
 * Check Precognition passive evade BEFORE damage is applied.
 * Called from the attack resolution pipeline.
 * Chance: 3% × Precognition count (max 90%)
 * If evade succeeds, lose 1 Precognition count.
 */
function checkPrecognitionEvade(state) {
  if (!state || state.isDefeated) return false;
  
  const precogStatus = getStatus(state, 'Precognition');
  if (!precogStatus || precogStatus.count <= 0) return false;

  const evadeChance = Math.min(0.03 * precogStatus.count, 0.9);
  if (Math.random() < evadeChance) {
    precogStatus.count = Math.max(0, precogStatus.count - 1);
    state.lastEvadeTime = Date.now();
    return true;
  }
  return false;
}

/**
 * Called when Valencina manually evades (presses E key).
 * Lose 1 Precognition count.
 */
function onManualEvade(state) {
  if (!state || state.isDefeated) return { success: false };
  
  const precogStatus = getStatus(state, 'Precognition');
  if (precogStatus && precogStatus.count > 0) {
    precogStatus.count = Math.max(0, precogStatus.count - 1);
    return { success: true, precognitionLost: 1 };
  }
  return { success: false, reason: 'No Precognition' };
}

/**
 * Update Precognition system each tick.
 * At 0: Enter Overheat
 */
function updatePrecognition(state, config) {
  const precogStatus = getStatus(state, 'Precognition');
  const overheatStatus = getStatus(state, 'Overheat');
  
  state.resources.precognition = precogStatus ? precogStatus.count : 0;

  if (precogStatus && precogStatus.count <= 0 && (!overheatStatus || overheatStatus.count <= 0)) {
    enterOverheat(state, config);
    return [{ type: 'OVERHEAT_ENTERED' }];
  }
  return [];
}

//====================================================================
// OVERHEAT SYSTEM
//====================================================================
function enterOverheat(state, config) {
  removeStatus(state, 'Precognition');
  const startingValue = config.overheat.startingValue || 30;
  const oh = getStatus(state, 'Overheat');
  if (oh) {
    oh.count = startingValue;
    oh.potency = 0;
    oh.timer = 0;
  } else {
    ensureStatus(state, 'Overheat', startingValue, 0);
  }
  state.resources.overheatDamageReduction = config.overheat.damageReduction || 0.2;
  state.resources.overheat = startingValue;
}

function exitOverheat(state, config) {
  removeStatus(state, 'Overheat');
  state.resources.overheatDamageReduction = 0;
  state.resources.overheatTimer = 0;
  state.resources.overheat = 0;
  // Restore Precognition
  ensureStatus(state, 'Precognition', config.precognition.startingValue || 30, 0);
}

function updateOverheat(state, dt, config) {
  const events = [];
  const oh = getStatus(state, 'Overheat');
  if (!oh || oh.count <= 0) {
    if (oh && oh.count <= 0) {
      exitOverheat(state, config);
      events.push({ type: 'OVERHEAT_EXITED' });
    }
    state.resources.overheat = 0;
    return events;
  }

  state.resources.overheat = oh.count;

  // Every 5 seconds: lose 1 Overheat
  state.resources.overheatTimer = (state.resources.overheatTimer || 0) + dt;
  if (state.resources.overheatTimer >= 5.0) {
    state.resources.overheatTimer = 0;
    oh.count = Math.max(0, oh.count - 1);
    state.resources.overheat = oh.count;
    if (oh.count <= 0) {
      exitOverheat(state, config);
      events.push({ type: 'OVERHEAT_EXITED' });
    }
  }
  return events;
}

function onReceiveHit(state, damage, attacker, config) {
  const effects = {};

  // Check Precognition passive evade first
  if (checkPrecognitionEvade(state)) {
    return { success: true, evaded: true, reason: 'PRECOGNITION_EVADE' };
  }

  // Lose 1 Precognition if she has Precognition (not in Overheat)
  const precog = getStatus(state, 'Precognition');
  if (precog && precog.count > 0) {
    precog.count = Math.max(0, precog.count - 1);
    effects.precognitionLost = 1;
  }

  // Lose 1 Overheat on being hit
  const oh = getStatus(state, 'Overheat');
  if (oh && oh.count > 0) {
    oh.count = Math.max(0, oh.count - (config.overheat.losePerHit || 1));
    effects.overheatLoss = config.overheat.losePerHit || 1;
    if (oh.count <= 0) {
      exitOverheat(state, config);
      effects.overheatExited = true;
    }
  }

  // Check Shin activation
  checkShinActivation(state, config);

  return { success: true, ...effects };
}

//====================================================================
// SHIN (心) SYSTEM
//====================================================================
function checkShinActivation(state, config) {
  if (state.resources.shinActive) return false;

  const hpPercent = (state.hp || 0) / (state.maxHp || 3204);
  const ultimateAvailable = state.resources.ultimateAvailable || false;

  if (hpPercent < (config.shin.activationThreshold || 0.5) || ultimateAvailable) {
    state.resources.shinActive = true;
    // Gain 1 Protection status
    ensureStatus(state, 'Protection', config.shin.protectionGain || 1, 1);
    // Add [Shin (心) - Valencina] unique status
    ensureStatus(state, 'Shin (心) - Valencina', 1, hpPercent < 0.5 ? 1 : 2);
    return true;
  }
  return false;
}

function applyShinDamageBonus(state, damage) {
  if (!state.resources.shinActive) return damage;
  const poisePot = getStatusPotency(state, 'Poise');
  const bonusPercent = Math.min(poisePot * 0.03, 0.15);
  if (bonusPercent > 0) return Math.floor(damage * (1 + bonusPercent));
  return damage;
}

//====================================================================
// PER-TICK SYSTEM UPDATES
//====================================================================
function updateSystems(state, dt, config) {
  const events = [];

  // 1. Update Precognition → Overheat transition (precognition only enters overheat, never regenerates)
  events.push(...updatePrecognition(state, config));

  // 2. Update Overheat decay (overheat exiting restores precognition)
  events.push(...updateOverheat(state, dt, config));

  // 3. Apply Accelerating Future effects
  applyAcceleratingFutureEffects(state, config);

  // 4. Check Shin activation
  checkShinActivation(state, config);

  // 5. Update ultimate availability: available when NOT in Overheat
  //    (Overheat count > 0 means overheated, can't ult)
  const oh = getStatus(state, 'Overheat');
  state.resources.ultimateAvailable = !oh || oh.count <= 0;

  return events;
}

//====================================================================
// GAME TARGET STATUS PROCESSING
//====================================================================
/**
 * Process all fighters for Game Target status effects.
 * Called from Match tick for every fighter.
 * If a fighter has Game Target status, restrict speed/jump/dash.
 */
function processGameTargetStatus(state, config) {
  const gt = getStatus(state, 'Game Target');
  if (gt && gt.count > 0 && (gt.remainingTime === undefined || gt.remainingTime > 0)) {
    // Game Target active: restrict movement
    state.speed = 1;
    state.canJump = false;
    state.canDash = false;
    return true;
  } else {
    // No Game Target: restore normal stats
    state.speed = config.speed || 9;
    state.canJump = true;
    state.canDash = true;
    return false;
  }
}

//====================================================================
// RESOURCE INITIALIZATION
//====================================================================
function initializeResources(state, config) {
  state.resources = state.resources || {};
  
  // All unique passives are statuses - initialize them
  state.statuses = state.statuses || [];
  
  // [Precognition] - unique status, starts with 30
  ensureStatus(state, 'Precognition', config.precognition.startingValue || 30, 0);
  
  // [Acceleration Round] - unique status, starts with 10
  ensureStatus(state, 'Acceleration Round', config.accelerationRounds.startingValue || 10, 0);
  
  // Internal tracking
  state.resources.maxAccelerationRounds = config.accelerationRounds.max || 10;
  state.resources.accelerationRoundActive = false;
  state.resources.overheatDamageReduction = 0;
  state.resources.overheatTimer = 0;
  state.resources.shinActive = false;
  state.resources.ultimateAvailable = false;
  state.resources.acceleratingFutureSpeedBonus = 0;
  state.resources.acceleratingFutureIntervalReduction = 0;
  state.resources.effectiveSpeed = config.speed || 9;
  state.resources.effectiveAttackInterval = config.attackInterval || 1.0;
  state.resources.lastEvadeTime = Date.now();
  
  return state.resources;
}

//====================================================================
// EXPORTS
//====================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    executeTimeToHunt,
    executeDisposal,
    consumeAccelerationRound,
    calculateAttackDamage,
    calculateShinDamageBonus: applyShinDamageBonus,
    applyAttack1Effects,
    applyAttack2Effects,
    applyAttack3Effects,
    triggerTremorBurst,
    onSuccessfulHit,
    onReceiveHit,
    checkPrecognitionEvade,
    onManualEvade,
    updatePrecognition,
    updateOverheat,
    enterOverheat,
    exitOverheat,
    updateSystems,
    checkShinActivation,
    processGameTargetStatus,
    applyAcceleratingFutureEffects,
    initializeResources,
    getStatus,
    getStatusPotency,
    getStatusCount,
    ensureStatus,
    removeStatus,
    
    timeToHunt: executeTimeToHunt,
    disposial: executeDisposal,
    updateShinSystem: checkShinActivation
  };
}
