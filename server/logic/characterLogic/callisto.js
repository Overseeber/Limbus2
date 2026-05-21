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
 * INSTALLATION ART - Server Implementation
 * Callisto performs a massive AOE attack that hits all nearby enemies
 * Consumes Corpus Ingredient and applies heavy status effects
 */
function executeInstallationArt(state, abilityConfig, targetStates, config) {
  // Ensure targetStates is an array
  const targets = Array.isArray(targetStates) ? targetStates : [targetStates];

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
    abilityConfig.statusEffects.forEach(statusConfig => {
      // Check for Callisto's Artwork: Tibia bonus
      let finalPotency = statusConfig.potency || 1;
      if (statusConfig.type === 'Bleed' && state.resources.artworkTibiaStacks > 0) {
        finalPotency += state.resources.artworkTibiaStacks;
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

  // APPLY BLEED STATUS
  targetState.statuses.push({
    type: 'Bleed',
    count: 4,
    potency: 4,
    duration: 0
  });

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
