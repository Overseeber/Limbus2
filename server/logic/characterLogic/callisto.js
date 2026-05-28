/**
 * CALLISTO - SERVER-SIDE ABILITY LOGIC
 * Pure JavaScript implementations of Callisto's abilities
 * Server authority: These functions execute on the server and determine game outcomes
 */

/**
 * SLAM ATTACK - Server Implementation
 * Callisto charges forward and slams with his weapon
 */
function executeSlamAttack(state, abilityConfig, targetState, config) {
  if (!targetState) {
    return { success: false, reason: 'No target' };
  }

  // Calculate damage
  const baseDamage = abilityConfig.baseDamage;
  const damage = Math.floor(baseDamage * state.baseDamage);

  // Check hit (simplified - full hit detection would be more complex)
  const hit = true; // In full version, would validate range/position

  if (!hit) {
    return {
      success: true,
      ability: 'slam',
      hit: false,
      reason: 'Target out of range'
    };
  }

  // APPLY DAMAGE
  targetState.hp = Math.max(0, targetState.hp - damage);

  // APPLY STATUS EFFECTS
  const appliedStatuses = [];
  abilityConfig.statusEffects.forEach(statusConfig => {
    targetState.statuses.push({
      type: statusConfig.type,
      count: 1,
      potency: statusConfig.potency || 1,
      duration: statusConfig.duration || 0
    });
    appliedStatuses.push(statusConfig.type);
  });

  // APPLY KNOCKBACK
  if (abilityConfig.knockback) {
    targetState.velocity.x = abilityConfig.knockback * state.facing * config.knockbackMultiplier;
  }

  // CONSUME RESOURCES (if any)
  if (abilityConfig.corpusCost) {
    state.resources.corpusIngredient -= abilityConfig.corpusCost;
  }

  // GAIN ARTWORK STACKS (if any)
  if (abilityConfig.gainArtworkStacks) {
    state.resources.artworkTibiaStacks += abilityConfig.gainArtworkStacks;
  }

  return {
    success: true,
    ability: 'slam',
    hit: true,
    damage: damage,
    targetHp: targetState.hp,
    statuses: appliedStatuses,
    defeated: targetState.hp <= 0
  };
}

/**
 * INSTALLATION ART NO. 3: IMPROVISED RIBCAGE - Server Implementation
 * Callisto performs a windup (cguard) then executes (cevade) an attack
 * that originates from ground beneath the target, spawning cbsk1.
 * 
 * Behavior:
 * 1. Windup: 0.5 seconds (cguard sprite)
 * 2. Execute: Spawn cbsk1 at target location, deal damage
 * 3. Effects: 2x radius, 8 bleed, sinking potency = damage dealt, 1 sinking count
 * 4. 500% damage dealt as stagger damage
 * 5. Counts as normal attack (normal combo/damage flow)
 */
function executeInstallationArt(state, abilityConfig, targetStates, config) {
  const targets = Array.isArray(targetStates) ? targetStates : targetStates ? [targetStates] : [];
  if (targets.length === 0) {
    return {
      success: false,
      reason: 'No targets',
      ability: 'installationArt'
    };
  }

  // VALIDATE CORPUS COST
  if (state.resources.corpusIngredient < abilityConfig.corpusCost) {
    return {
      success: false,
      reason: 'Not enough Corpus Ingredient',
      current: state.resources.corpusIngredient,
      required: abilityConfig.corpusCost
    };
  }

  // EXECUTE ATTACK ON EACH TARGET
  const results = [];
  targets.forEach(targetState => {
    if (!targetState || targetState.isDefeated) {
      return;
    }

    const baseDamage = abilityConfig.baseDamage;
    const damage = Math.floor(baseDamage * state.baseDamage);

    // APPLY DAMAGE
    targetState.hp = Math.max(0, targetState.hp - damage);

    // APPLY STATUS EFFECTS
    const appliedStatuses = [];
    
    // Apply 8 bleed
    targetState.statuses.push({
      type: 'Bleed',
      count: 8,
      potency: 8,
      duration: 0
    });
    appliedStatuses.push('Bleed');
    
    // Apply sinking potency equal to damage dealt
    targetState.statuses.push({
      type: 'Sinking',
      count: 1, // 1 sinking count
      potency: damage, // sinking potency equal to damage dealt
      duration: 0
    });
    appliedStatuses.push('Sinking');

    // Apply stagger damage = 500% of damage dealt
    targetState.stagger += damage * 5;

    results.push({
      targetId: targetState.id,
      hit: true,
      damage: damage,
      targetHp: targetState.hp,
      statuses: appliedStatuses,
      defeated: targetState.hp <= 0,
      staggerDamage: damage * 5
    });
  });

  // CONSUME CORPUS INGREDIENT
  state.resources.corpusIngredient -= abilityConfig.corpusCost;

  // GAIN ARTWORK: TIBIA STACKS
  if (abilityConfig.gainArtworkStacks) {
    const stacksGained = Math.floor(abilityConfig.corpusCost / 10);
    state.resources.artworkTibiaStacks += stacksGained;
  }

  return {
    success: true,
    ability: 'installationArt',
    corpusConsumed: abilityConfig.corpusCost,
    corpusRemaining: state.resources.corpusIngredient,
    artworkStacksGained: Math.floor(abilityConfig.corpusCost / 10),
    artworkStacksTotal: state.resources.artworkTibiaStacks,
    cooldown: abilityConfig.cooldown,
    targetsHit: results.length,
    results: results
  };
}

/**
 * ON HIT - Server Implementation
 * Called when Callisto successfully hits a target
 * Gains Corpus Ingredient and applies Bleed status
 */
function onSuccessfulHit(state, targetState, damage, config) {
  // GAIN CORPUS INGREDIENT
  const corpusGain = config.corpusIngredient.gainPerHit;
  state.resources.corpusIngredient = Math.min(
    state.resources.corpusIngredient + corpusGain,
    state.resources.maxCorpusIngredient
  );

  // APPLY BLEED STATUS (use engine.applyStatus for proper stacking)
  if (typeof this.applyStatus === 'function') {
    this.applyStatus(targetState, 'Bleed', 4, 4);
  } else {
    const bleedExisting = targetState.statuses.find(s => s.type === 'Bleed');
    if (bleedExisting) { bleedExisting.count += 4; bleedExisting.potency += 4; }
    else targetState.statuses.push({ type: 'Bleed', count: 4, potency: 4, timer: 0 });
  }

  return {
    success: true,
    corpusGained: corpusGain,
    corpusCurrent: state.resources.corpusIngredient,
    statusApplied: 'Bleed'
  };
}

/**
 * ON HIT TAKEN - Server Implementation
 * Called when Callisto receives damage
 */
function onReceiveHit(state, damage, attacker, config) {
  // Callisto has no special receive effects yet
  return { success: true };
}

// Export for server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    executeSlamAttack,
    executeInstallationArt,
    onSuccessfulHit,
    onReceiveHit,
    slam: executeSlamAttack,
    installationArt: executeInstallationArt
  };
}
