/**
 * VALENCINA - SERVER-SIDE CHARACTER LOGIC
 * Complete kit restoration from oldclientgameplay reference.
 * ALL calculations are server-authoritative.
 * 
 * Systems implemented:
 * - Basic Attacks with combo scaling: Damage = 21 + (3 × ComboCount)
 * - On Hit Effects: 2 Burn Pot/Count, 2 Tremor Pot/Count
 * - Attack 1: Gain 3 Poise Count
 * - Attack 2: Gain 1 Poise Potency
 * - Attack 3: Consume 1 Acceleration Round → Trigger Tremor Burst, Bonus Damage
 * - Acceleration Round Consume: +100% range, +30% damage, 4 Poise Pot/Count, Tremor Burst
 * - Time to Hunt (Q, 30s CD): Game Target status (speed=1, no jump/dash, 10s)
 * - Disposal Ultimate: Full phase execution with proper status applications
 * - Eye of Precognition: 3% × Precognition evade chance, lose 1 on evade
 * - Overheat: Enter at 0 Precognition, -20% damage, lose 1 per hit/5s, restore at 0
 * - Accelerating Future: +0.5 speed/stack (max +5), -2.5% interval/stack (max -80%)
 * - Shin (心): HP<50% OR Ultimate available → 1 Protection, +3% damage per Poise Pot (max 15%)
 */

//====================================================================
// UTILITY FUNCTIONS
//====================================================================

/**
 * Get status from a fighter's statuses array
 */
function getStatus(fighter, type) {
  if (!fighter || !fighter.statuses) return null;
  return fighter.statuses.find(s => s.type === type);
}

/**
 * Check if a fighter has a specific status
 */
function hasStatus(fighter, type) {
  return getStatus(fighter, type) !== null;
}

/**
 * Get status potency value
 */
function getStatusPotency(fighter, type) {
  const s = getStatus(fighter, type);
  return s ? (s.potency || 0) : 0;
}

/**
 * Get status count value
 */
function getStatusCount(fighter, type) {
  const s = getStatus(fighter, type);
  return s ? (s.count || 0) : 0;
}

//====================================================================
// DAMAGE CALCULATION
//====================================================================

/**
 * Calculate Valencina's basic attack damage
 * Formula: Damage = BaseDamage + (ComboDamage × ComboCount)
 * From oldclientgameplay reference.
 */
function calculateAttackDamage(state, config) {
  const baseDamage = config.baseDamage || 21;
  const comboDamage = config.comboDamage || 3;
  const comboCount = state.combo || 0;
  
  let damage = baseDamage + (comboDamage * comboCount);
  
  // Acceleration Round bonus: +30% damage when consumed
  if (state.resources.accelerationRoundActive) {
    damage = Math.floor(damage * (1 + (config.accelerationRounds.damageBonus || 0.3)));
  }
  
  return Math.max(1, Math.floor(damage));
}

/**
 * Calculate bonus damage from Acceleration Round consumption
 * Formula: (Burn Potency + Tremor Potency) / 2
 * Applied to target.
 */
function calculateAccelerationRoundBonusDamage(attackerState, targetState) {
  const burnPot = getStatusPotency(targetState, 'Burn');
  const tremorPot = getStatusPotency(targetState, 'Tremor');
  const damage = Math.floor((burnPot + tremorPot) / 2);
  return damage;
}

/**
 * Calculate Shin damage bonus
 * +3% damage for every Poise Potency, capped at +15%
 */
function calculateShinDamageBonus(state, config) {
  if (!state.resources.shinActive) return 0;
  const poisePot = getStatusPotency(state, 'Poise');
  const bonus = Math.min(poisePot * (config.shin.damagePerPoisePotency || 0.03), config.shin.maxDamageBonus || 0.15);
  return bonus;
}

//====================================================================
// ON SUCCESSFUL HIT - RESTORED FROM REFERENCE
//====================================================================

/**
 * Called when Valencina successfully hits a target.
 * Effects (from oldclientgameplay reference):
 * - Inflict 2 Burn Potency, 2 Burn Count
 * - Inflict 2 Tremor Potency, 2 Tremor Count
 * - Gain 1 Accelerating Future stack
 * - Track last hit opponent for Time to Hunt
 */
function onSuccessfulHit(state, targetState, damage, config) {
  const effects = {
    statusesApplied: [],
    acceleratingFutureGained: false,
    lastHitOpponent: targetState ? targetState.id : null
  };

  if (!targetState || targetState.isDefeated) {
    return { success: false, reason: 'No valid target' };
  }

  // Store last hit opponent for Time to Hunt targeting
  state.lastHitOpponent = targetState.id;

  // Apply 2 Burn Potency + 2 Burn Count
  if (typeof this.applyStatus === 'function') {
    this.applyStatus(targetState, 'Burn', 2, 2);
    this.applyStatus(targetState, 'Tremor', 2, 2);
  } else {
    const b = targetState.statuses.find(s => s.type === 'Burn');
    if (b) { b.count += 2; b.potency += 2; }
    else targetState.statuses.push({ type: 'Burn', count: 2, potency: 2, timer: 0 });
    
    const t = targetState.statuses.find(s => s.type === 'Tremor');
    if (t) { t.count += 2; t.potency += 2; }
    else targetState.statuses.push({ type: 'Tremor', count: 2, potency: 2, timer: 0 });
  }
  effects.statusesApplied.push('Burn', 'Tremor');

  // Gain 1 Accelerating Future per successful hit
  state.resources.acceleratingFuture = (state.resources.acceleratingFuture || 0) + 1;
  effects.acceleratingFutureGained = true;

  // Apply Accelerating Future status for client display
  const afCount = state.resources.acceleratingFuture || 0;
  const existingAF = state.statuses.find(s => s.type === 'Accelerating Future');
  if (existingAF) {
    existingAF.count = afCount;
  } else {
    state.statuses.push({ type: 'Accelerating Future', count: afCount, potency: 1, timer: 0 });
  }

  return {
    success: true,
    ...effects
  };
}

//====================================================================
// ACCELERATING FUTURE - APPLY EFFECTS
//====================================================================

/**
 * Apply Accelerating Future passive effects.
 * Oldclientgameplay reference:
 * - +0.5 movement speed per stack (max +5)
 * - -2.5% attack interval per stack (max -80%)
 */
function applyAcceleratingFutureEffects(state, config) {
  const stacks = state.resources.acceleratingFuture || 0;
  const afConfig = config.acceleratingFuture || {};
  
  // Movement speed bonus: +0.5 per stack, max +5
  const speedBonus = Math.min(stacks * (afConfig.speedPerStack || 0.5), afConfig.maxSpeedBonus || 5);
  state.resources.acceleratingFutureSpeedBonus = speedBonus;
  
  // Attack interval reduction: -2.5% per stack, max -80%
  const intervalReduction = Math.min(stacks * (afConfig.intervalReductionPerStack || 2.5), afConfig.maxIntervalReduction || 80);
  state.resources.acceleratingFutureIntervalReduction = intervalReduction;
}

//====================================================================
// ATTACK-SPECIFIC PER-ATTACK EFFECTS
//====================================================================

/**
 * Apply effects for Attack 1 (combo sequence 1):
 * - Gain 3 Poise Count
 */
function applyAttack1Effects(state) {
  const existing = state.statuses.find(s => s.type === 'Poise');
  if (existing) {
    existing.count += 3;
  } else {
    state.statuses.push({ type: 'Poise', count: 3, potency: 0, timer: 0 });
  }
}

/**
 * Apply effects for Attack 2 (combo sequence 2):
 * - Gain 1 Poise Potency
 */
function applyAttack2Effects(state) {
  const existing = state.statuses.find(s => s.type === 'Poise');
  if (existing) {
    existing.potency += 1;
  } else {
    state.statuses.push({ type: 'Poise', count: 0, potency: 1, timer: 0 });
  }
}

/**
 * Apply effects for Attack 3 (combo sequence 3):
 * - Consume 1 Acceleration Round (if available)
 * - Trigger Tremor Burst
 * - Deal bonus damage: (Burn Potency + Tremor Potency) / 2
 * 
 * Returns effect result for damage application.
 */
function applyAttack3Effects(state, targetState) {
  const result = {
    consumedAccelerationRound: false,
    triggeredTremorBurst: false,
    bonusDamage: 0
  };

  // Check if Acceleration Round > 0
  const currentAR = state.resources.accelerationRounds || 0;
  if (currentAR <= 0) {
    return result; // No Acceleration Round, no effect
  }

  // Spend 1 Acceleration Round
  state.resources.accelerationRounds = Math.max(0, currentAR - 1);
  result.consumedAccelerationRound = true;

  // Trigger Tremor Burst
  const tremorBurst = triggerTremorBurst(state, targetState);
  if (tremorBurst) {
    result.triggeredTremorBurst = true;
  }

  // Deal bonus damage: (Burn Potency + Tremor Potency) / 2
  const bonusDamage = calculateAccelerationRoundBonusDamage(state, targetState);
  if (bonusDamage > 0 && targetState && !targetState.isDefeated) {
    targetState.hp = Math.max(0, targetState.hp - bonusDamage);
    result.bonusDamage = bonusDamage;
  }

  // Gain Poise from Acceleration Round consumption
  const poiseCountGain = 4;
  const poisePotencyGain = 4;
  const existingPoise = state.statuses.find(s => s.type === 'Poise');
  if (existingPoise) {
    existingPoise.count += poiseCountGain;
    existingPoise.potency += poisePotencyGain;
  } else {
    state.statuses.push({ type: 'Poise', count: poiseCountGain, potency: poisePotencyGain, timer: 0 });
  }

  return result;
}

//====================================================================
// ACCELERATION ROUND CONSUMPTION
//====================================================================

/**
 * Manually consume an Acceleration Round (from evade input).
 * Oldclientgameplay reference:
 * - Range: +100%
 * - Damage: +30%
 * - Gain 4 Poise Potency, 4 Poise Count
 * - Trigger Tremor Burst
 * - Deal bonus damage: (Burn Potency + Tremor Potency) / 2
 */
function consumeAccelerationRound(state, targetState, config) {
  const currentAR = state.resources.accelerationRounds || 0;
  if (currentAR <= 0) {
    return { success: false, reason: 'No Acceleration Rounds' };
  }

  // Spend 1 Acceleration Round
  state.resources.accelerationRounds = Math.max(0, currentAR - 1);
  
  // Set active flag for damage/range bonus (lasts for next attack)
  state.resources.accelerationRoundActive = true;

  // Gain Poise
  const poiseCountGain = config.accelerationRounds.poiseCountGain || 4;
  const poisePotencyGain = config.accelerationRounds.poisePotencyGain || 4;
  const existingPoise = state.statuses.find(s => s.type === 'Poise');
  if (existingPoise) {
    existingPoise.count += poiseCountGain;
    existingPoise.potency += poisePotencyGain;
  } else {
    state.statuses.push({ type: 'Poise', count: poiseCountGain, potency: poisePotencyGain, timer: 0 });
  }

  // Trigger Tremor Burst on target
  const burstResult = triggerTremorBurst(state, targetState);
  
  // Deal bonus damage: (Burn Potency + Tremor Potency) / 2
  let bonusDamage = 0;
  if (targetState && !targetState.isDefeated) {
    bonusDamage = calculateAccelerationRoundBonusDamage(state, targetState);
    if (bonusDamage > 0) {
      targetState.hp = Math.max(0, targetState.hp - bonusDamage);
    }
  }

  return {
    success: true,
    accelerationRoundsRemaining: state.resources.accelerationRounds,
    poiseCountGain,
    poisePotencyGain,
    triggeredTremorBurst: burstResult !== null,
    bonusDamage
  };
}

//====================================================================
// TREMOR BURST
//====================================================================

/**
 * Trigger Tremor Burst on target.
 * Consumes Tremor status, adds potency to target's stagger.
 * Used by Acceleration Round consumption and Attack 3.
 */
function triggerTremorBurst(attackerState, targetState) {
  if (!targetState || targetState.isDefeated) return null;

  const tremor = targetState.statuses.find(s => s.type === 'Tremor');
  if (!tremor || tremor.count <= 0) return null;

  // Consume Tremor count
  tremor.count -= 1;

  // Add Tremor potency to target's stagger
  const tremorPotency = tremor.potency || 0;
  if (tremorPotency > 0) {
    targetState.stagger = (targetState.stagger || 0) + tremorPotency;
  }

  // Remove Tremor if count reaches 0
  if (tremor.count <= 0) {
    targetState.statuses = targetState.statuses.filter(s => s.type !== 'Tremor');
  }

  return {
    consumed: true,
    staggerAdded: tremorPotency
  };
}

//====================================================================
// TIME TO HUNT - ABILITY
//====================================================================

/**
 * TIME TO HUNT (Q key, 30 second cooldown)
 * Oldclientgameplay reference:
 * - Target: Last opponent successfully hit by Valencina
 * - Activation Animation: de1
 * - Game Target: Speed=1, no jump, no dash, 10 seconds
 * - No special activation conditions
 * - No precognition cost (restored from reference: reference doesn't require precognition)
 */
function executeTimeToHunt(state, abilityConfig, targetState, config) {
  if (!targetState || targetState.isDefeated) {
    return { success: false, reason: 'No valid target' };
  }

  // Apply Game Target status on target
  const gameTargetDuration = abilityConfig.gameTargetDuration || 10;
  
  // Apply Game Target status
  const existingGT = targetState.statuses.find(s => s.type === 'Game Target');
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
  
  // Apply server-side restrictions immediately
  targetState.speed = 1;
  targetState.canJump = false;
  targetState.canDash = false;
  
  // Apply status effects from config
  const appliedStatuses = ['Game Target'];
  if (abilityConfig.statusEffects) {
    abilityConfig.statusEffects.forEach(statusConfig => {
      if (typeof this.applyStatus === 'function') {
        this.applyStatus(targetState, statusConfig.type, statusConfig.count || 1, statusConfig.potency || 1);
      } else {
        const existing = targetState.statuses.find(s => s.type === statusConfig.type);
        if (existing) {
          existing.count += statusConfig.count || 1;
          existing.potency += statusConfig.potency || 1;
        } else {
          targetState.statuses.push({
            type: statusConfig.type,
            count: statusConfig.count || 1,
            potency: statusConfig.potency || 1,
            timer: 0
          });
        }
      }
      appliedStatuses.push(statusConfig.type);
    });
  }

  // Apply knockback
  if (abilityConfig.knockback) {
    targetState.velocity.x = abilityConfig.knockback * (state.facing || 1);
  }

  return {
    success: true,
    ability: 'timeToHunt',
    hit: true,
    cooldown: abilityConfig.cooldown || 30,
    targetId: targetState.id,
    statuses: appliedStatuses,
    gameTargetDuration
  };
}

//====================================================================
// DISPOSAL - ULTIMATE
//====================================================================

/**
 * Execute Disposal ultimate effects on targets.
 * This handles the initial damage + status burst on ultimate activation.
 * Phase-by-phase execution is handled in ultimateLogic.js.
 */
function executeDisposal(state, abilityConfig, targetStates, config) {
  const targets = Array.isArray(targetStates) ? targetStates : [targetStates];
  const results = [];

  targets.forEach(targetState => {
    if (!targetState || targetState.isDefeated) return;

    // Calculate damage
    let baseDamage = abilityConfig.baseDamage || 1.5;
    let damage = Math.floor(baseDamage * (state.baseDamage || 21));
    
    // Shin bonus
    if (state.resources.shinActive) {
      damage = Math.floor(damage * (1 + 0.2));
    }

    // Apply damage
    targetState.hp = Math.max(0, targetState.hp - damage);

    // Apply status effects
    const appliedStatuses = [];
    if (abilityConfig.statusEffects) {
      abilityConfig.statusEffects.forEach(statusConfig => {
        if (typeof this.applyStatus === 'function') {
          this.applyStatus(targetState, statusConfig.type, statusConfig.count || 1, statusConfig.potency || 1);
        } else {
          const existing = targetState.statuses.find(s => s.type === statusConfig.type);
          if (existing) {
            existing.count += statusConfig.count || 1;
            existing.potency += statusConfig.potency || 1;
          } else {
            targetState.statuses.push({
              type: statusConfig.type,
              count: statusConfig.count || 1,
              potency: statusConfig.potency || 1,
              timer: 0
            });
          }
        }
        appliedStatuses.push(statusConfig.type);
      });
    }

    results.push({
      targetId: targetState.id,
      hit: true,
      damage,
      targetHp: targetState.hp,
      statuses: appliedStatuses,
      defeated: targetState.hp <= 0
    });
  });

  return {
    success: true,
    ability: 'disposial',
    targetsHit: results.length,
    results
  };
}

//====================================================================
// PRECOGNITION SYSTEM
//====================================================================

/**
 * Update Precognition system each tick.
 * Oldclientgameplay reference:
 * - Starts battle with 30 Precognition
 * - When attacked: chance to evade = 3% × Precognition (max 90%)
 * - Lose 1 on passive evade
 * - At 0: Enter Overheat
 * 
 * This is called from the main update loop. Passive evade is triggered
 * when Valencina would be hit (checked before damage application).
 */
function updatePrecognition(state, dt, config) {
  const events = [];

  // Check if Precognition reached 0 → transition to Overheat
  if (state.resources.precognition <= 0 && state.resources.overheat <= 0 && !state.resources.overheatActive) {
    enterOverheat(state, config);
    events.push({ type: 'OVERHEAT_ENTERED' });
  }

  return events;
}

/**
 * Check if Valencina's Precognition passive evades an incoming attack.
 * Called BEFORE damage is applied.
 * Chance: 3% × Precognition (max 90%)
 * Lose 1 Precognition on successful evade.
 */
function checkPrecognitionEvade(state) {
  if (!state || state.isDefeated) return false;
  
  const precognition = state.resources.precognition || 0;
  if (precognition <= 0) return false;
  
  // 3% × Precognition, max 90%
  const evadeChance = Math.min(0.03 * precognition, 0.9);
  
  if (Math.random() < evadeChance) {
    // Successful evade
    state.resources.precognition = Math.max(0, state.resources.precognition - 1);
    state.lastEvadeTime = Date.now();
    return true;
  }
  
  return false;
}

//====================================================================
// OVERHEAT SYSTEM
//====================================================================

/**
 * Enter Overheat state.
 * Oldclientgameplay reference:
 * - Gain 30 Overheat
 * - Damage dealt: -20%
 * - Whenever hit or attacked: Lose 1 Overheat
 * - Every 5 seconds: Lose 1 Overheat
 * - At 0: Remove Overheat, restore 30 Precognition, return to Precognition
 */
function enterOverheat(state, config) {
  state.resources.overheatActive = true;
  state.resources.overheat = config.overheat.startingValue || 30;
  state.resources.precognition = 0; // All precognition consumed
  
  // Apply damage reduction
  state.resources.overheatDamageReduction = config.overheat.damageReduction || 0.2;
}

/**
 * Update Overheat system each tick.
 * - Lose 1 Overheat every 5 seconds
 * - When hit/attacked, lose 1 (handled in onReceiveHit)
 * - At 0: Exit Overheat, restore Precognition
 */
function updateOverheat(state, dt, config) {
  const events = [];

  if (!state.resources.overheatActive || state.resources.overheat <= 0) {
    // If overheat is active but count reached 0, exit
    if (state.resources.overheatActive && state.resources.overheat <= 0) {
      exitOverheat(state, config);
      events.push({ type: 'OVERHEAT_EXITED' });
    }
    return events;
  }

  // Every 5 seconds: lose 1 Overheat
  state.resources.overheatTimer = (state.resources.overheatTimer || 0) + dt;
  if (state.resources.overheatTimer >= 5.0) {
    state.resources.overheatTimer = 0;
    state.resources.overheat = Math.max(0, state.resources.overheat - 1);
    
    if (state.resources.overheat <= 0) {
      exitOverheat(state, config);
      events.push({ type: 'OVERHEAT_EXITED' });
    }
  }

  return events;
}

/**
 * Exit Overheat: remove damage reduction, restore Precognition.
 */
function exitOverheat(state, config) {
  state.resources.overheatActive = false;
  state.resources.overheat = 0;
  state.resources.overheatDamageReduction = 0;
  state.resources.overheatTimer = 0;
  
  // Restore 30 Precognition
  state.resources.precognition = config.precognition.startingValue || 30;
}

/**
 * Called when Valencina takes a hit during Overheat.
 * Lose 1 Overheat.
 */
function onReceiveHit(state, damage, attacker, config) {
  const effects = {};

  // Check Precognition passive evade first
  if (checkPrecognitionEvade(state)) {
    // Evaded the hit!
    return { success: true, evaded: true, reason: 'PRECOGNITION_EVADE' };
  }

  // During Overheat: lose 1 Overheat on being attacked
  if (state.resources.overheatActive && state.resources.overheat > 0) {
    state.resources.overheat = Math.max(0, state.resources.overheat - (config.overheat.losePerHit || 1));
    effects.overheatLoss = config.overheat.losePerHit || 1;
  }

  // Check Shin activation
  checkShinActivation(state, config);

  return {
    success: true,
    ...effects
  };
}

//====================================================================
// SHIN (心) SYSTEM
//====================================================================

/**
 * Check and activate Shin (心) - Valencina.
 * Oldclientgameplay reference:
 * - Passive activates when HP below 50% OR Ultimate becomes available
 * - Gain 1 Protection (10% damage reduction)
 * - +3% damage per Poise Potency (max 15%)
 * 
 * This is checked on hit taken and on ultimate available.
 */
function checkShinActivation(state, config) {
  if (state.resources.shinActive) return false; // Already active

  // Check condition: HP < 50% OR ultimate available
  const hpPercent = (state.hp || 0) / (state.maxHp || 3204);
  const ultimateAvailable = state.resources.ultimateAvailable || false;
  
  if (hpPercent < (config.shin.activationThreshold || 0.5) || ultimateAvailable) {
    // Activate Shin
    state.resources.shinActive = true;
    
    // Gain 1 Protection status
    const protectionCount = config.shin.protectionGain || 1;
    const existingProtection = state.statuses.find(s => s.type === 'Protection');
    if (existingProtection) {
      existingProtection.count += protectionCount;
    } else {
      state.statuses.push({ type: 'Protection', count: protectionCount, potency: 1, timer: 0 });
    }
    
    // Add Shin status for client display
    state.statuses.push({ type: 'Shin (心) - Valencina', count: 1, potency: hpPercent < 0.5 ? 1 : 2, timer: 0 });
    
    return true;
  }
  
  return false;
}

/**
 * Check if Shin is active and calculate damage bonus.
 * Returns damage multiplier (1.0 = no bonus).
 */
function applyShinDamageBonus(state, damage) {
  if (!state.resources.shinActive) return damage;
  
  const poisePot = getStatusPotency(state, 'Poise');
  const bonusPercent = Math.min(poisePot * 0.03, 0.15); // +3% per Poise Pot, max 15%
  
  if (bonusPercent > 0) {
    return Math.floor(damage * (1 + bonusPercent));
  }
  
  return damage;
}

//====================================================================
// ON EVADE
//====================================================================

/**
 * Called when Valencina successfully evades via Precognition passive.
 * Old client gains resources on evade.
 */
function onEvade(state, config) {
  const effects = {};
  
  // Gain 1 Precognition back on evade
  if (state.resources.precognition < (config.precognition.max || 30)) {
    state.resources.precognition += 1;
    effects.precognitionGain = 1;
  }
  
  // Acceleration Round: gain 1 on evade
  if (state.resources.accelerationRounds < (config.accelerationRounds.max || 10)) {
    state.resources.accelerationRounds += 1;
    effects.accelerationRoundsGain = 1;
  }

  return {
    success: true,
    ...effects
  };
}

//====================================================================
// PER-TICK SYSTEM UPDATES
//====================================================================

/**
 * Main per-tick update for all Valencina passive systems.
 * Called from GameplayEngine.updateValencinaSystems().
 */
function updateSystems(state, dt, config) {
  const events = [];

  // 1. Update Precognition → Overheat transition check
  const precogEvents = updatePrecognition(state, dt, config);
  events.push(...precogEvents);

  // 2. Update Overheat decay
  const overheatEvents = updateOverheat(state, dt, config);
  events.push(...overheatEvents);

  // 3. Apply Accelerating Future effects
  applyAcceleratingFutureEffects(state, config);

  // 4. Check Shin activation (periodically)
  checkShinActivation(state, config);

  // 5. Process Game Target status cleanup
  processGameTargetStatus(state, config);

  // 6. Clear accelerationRoundActive flag after one attack
  // This is cleared in the attack resolution, but as a fallback:
  if (state.resources.accelerationRoundActive) {
    // Will be cleared by the attack system after the next attack resolves
  }

  return events;
}

/**
 * Process Game Target status: restore speed/jump/dash when status expires.
 */
function processGameTargetStatus(state, config) {
  // Check if target has Game Target status
  const gtStatus = state.statuses.find(s => s.type === 'Game Target');
  
  if (!gtStatus || gtStatus.remainingTime <= 0 || gtStatus.count <= 0) {
    // Status expired or not present - restore normal stats
    state.speed = config.speed || 9;
    state.canJump = true;
    state.canDash = true;
  }
}

//====================================================================
// RESOURCE INITIALIZATION
//====================================================================

/**
 * Initialize Valencina-specific resources when match starts.
 */
function initializeResources(state, config) {
  state.resources = state.resources || {};
  
  // Acceleration Rounds: start with 10
  state.resources.accelerationRounds = config.accelerationRounds.startingValue || 10;
  state.resources.maxAccelerationRounds = config.accelerationRounds.max || 10;
  state.resources.accelerationRoundActive = false;
  
  // Precognition: start with 30
  state.resources.precognition = config.precognition.startingValue || 30;
  state.resources.maxPrecognition = config.precognition.max || 30;
  
  // Overheat: starts at 0 (inactive)
  state.resources.overheat = 0;
  state.resources.maxOverheat = config.overheat.max || 30;
  state.resources.overheatActive = false;
  state.resources.overheatDamageReduction = 0;
  state.resources.overheatTimer = 0;
  
  // Shin: starts inactive
  state.resources.shinActive = false;
  state.resources.ultimateAvailable = false;
  
  // Accelerating Future: starts at 0
  state.resources.acceleratingFuture = 0;
  state.resources.acceleratingFutureSpeedBonus = 0;
  state.resources.acceleratingFutureIntervalReduction = 0;
  
  // Tracking
  state.resources.lastHitOpponent = null;
  state.resources.lastEvadeTime = Date.now();
  
  return state.resources;
}

//====================================================================
// EXPORTS
//====================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Core ability execution
    executeTimeToHunt,
    executeDisposal,
    consumeAccelerationRound,
    
    // Attack system integration
    calculateAttackDamage,
    calculateShinDamageBonus,
    applyAttack1Effects,
    applyAttack2Effects,
    applyAttack3Effects,
    triggerTremorBurst,
    
    // On-hit/on-hit-taken
    onSuccessfulHit,
    onReceiveHit,
    onEvade,
    
    // Passive systems
    checkPrecognitionEvade,
    updatePrecognition,
    updateOverheat,
    enterOverheat,
    exitOverheat,
    updateSystems,
    checkShinActivation,
    processGameTargetStatus,
    applyAcceleratingFutureEffects,
    
    // Resource initialization
    initializeResources,
    
    // Aliases for backward compatibility
    timeToHunt: executeTimeToHunt,
    disposial: executeDisposal,
    
    // Shin system alias
    updateShinSystem: checkShinActivation
  };
}