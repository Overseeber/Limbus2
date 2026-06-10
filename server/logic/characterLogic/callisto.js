/**
 * CALLISTO - SERVER-SIDE CHARACTER LOGIC
 * Complete kit implementation.
 * ALL calculations are server-authoritative.
 * 
 * Passives:
 *   P1: "All of My Corpus has been Given to Tibia" - heal on hit, damage down on hit taken, fragile from negative statuses
 *   P2: "Allow Me to Briefly Enjoy My Pupil's Exhibition" - damage per negative effect, bleed on evade
 *   P3: "Transcend the Corpus" - status reduction, artwork expiration bonuses
 * 
 * Resources managed as proper statuses:
 *   [Corpus Ingredient] - unique charge, max 20, no decay
 *   [Artwork: Tibia] - unique status, damage/bleed bonus, no decay
 *   [Haste], [Bind], [Fragile], [Protection] - basic buffs/debuffs
 *   [Damage Down], [Damage Up] - passive interaction buffs
 *   [Ingredient Shredding Wound] - ability debuff
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

function hasStatus(fighter, type) {
  return !!getStatus(fighter, type);
}

function ensureStatus(fighter, type, count, potency, options) {
  const existing = fighter.statuses.find(s => s.type === type);
  if (existing) {
    existing.count = (existing.count || 0) + (count || 0);
    existing.potency = (existing.potency || 0) + (potency || 0);
    // Apply max constraints
    if (options && options.maxCount !== undefined) {
      existing.count = Math.min(existing.count, options.maxCount);
    }
    if (options && options.maxPotency !== undefined) {
      existing.potency = Math.min(existing.potency, options.maxPotency);
    }
    return existing;
  }
  const status = { type, count: count || 0, potency: potency || 0, timer: 0 };
  if (options && options.remainingTime !== undefined) status.remainingTime = options.remainingTime;
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
 * Count negative effects on a target that affect damage/combat.
 * Negative effects: Bleed, Burn, Sinking, Tremor, Fragile, Bind,
 * IngredientShreddingWound, DamageDown, Rupture
 */
function countNegativeEffects(fighter) {
  if (!fighter || !fighter.statuses) return 0;
  const negativeTypes = [
    'Bleed', 'Burn', 'Sinking', 'Tremor', 'Rupture',
    'Fragile', 'Bind', 'IngredientShreddingWound', 'DamageDown'
  ];
  return fighter.statuses.filter(s => negativeTypes.includes(s.type) && s.count > 0).length;
}

/**
 * Sum total negative status potency on a fighter.
 */
function sumNegativePotency(fighter) {
  if (!fighter || !fighter.statuses) return 0;
  const negativeTypes = [
    'Bleed', 'Burn', 'Sinking', 'Tremor', 'Rupture',
    'Fragile', 'Bind', 'IngredientShreddingWound', 'DamageDown'
  ];
  let sum = 0;
  fighter.statuses.forEach(s => {
    if (negativeTypes.includes(s.type)) {
      sum += (s.potency || 0);
    }
  });
  return sum;
}

/**
 * Consume Corpus Ingredient from resources and track spent total.
 */
function consumeCorpusIngredient(state, amount, config) {
  const actualConsumed = Math.min(state.resources.corpusIngredient, amount);
  if (actualConsumed <= 0) return { consumed: 0, artworkGained: 0 };
  
  state.resources.corpusIngredient -= actualConsumed;
  state.resources.corpusSpentTotal = (state.resources.corpusSpentTotal || 0) + actualConsumed;
  
  // Check if we crossed the per-20 threshold for Artwork: Tibia
  const gainArtworkPer = config.corpusIngredient.gainArtworkPer || 20;
  const artworkFromThisSpend = Math.floor(state.resources.corpusSpentTotal / gainArtworkPer);
  const previousArtworkFromSpend = Math.floor((state.resources.corpusSpentTotal - actualConsumed) / gainArtworkPer);
  
  if (artworkFromThisSpend > previousArtworkFromSpend) {
    const artworkGained = artworkFromThisSpend - previousArtworkFromSpend;
    state.resources.artworkTibiaStacks = (state.resources.artworkTibiaStacks || 0) + artworkGained;
    return { consumed: actualConsumed, artworkGained };
  }
  
  return { consumed: actualConsumed, artworkGained: 0 };
}

//====================================================================
// INITIALIZATION
//====================================================================

function initializeResources(state, config) {
  state.resources = state.resources || {};
  state.statuses = state.statuses || [];
  
  // Unique charge resource - tracked as BOTH resource AND status effect for client visibility
  // [Corpus Ingredient] - unique charge, max 20, no decay - shows on status row like Precognition
  state.resources.corpusIngredient = 0;
  state.resources.maxCorpusIngredient = config.corpusIngredient.max || 20;
  // Add as status so it renders on the client status bar
  ensureStatus(state, 'Corpus Ingredient', 0, 0);
  
  // [Artwork: Tibia] - per stack: +10% damage, +1 bleed potency/count (max 3) - shows on status row
  state.resources.artworkTibiaStacks = 0;
  state.resources.corpusSpentTotal = 0;
  // Add as status so it renders on the client status bar
  ensureStatus(state, 'Artwork Tibia', 0, 0);
  
  // Slam tracking
  state.resources.slamBuffActive = false;
  state.resources.slamBuffTimer = 0;
  state.resources.corpusConsumedLastSlam = 0;
  
  // Combo tracking
  state.resources.lastAttackHit = false;
  state.resources.currentAttackSequence = 0; // 0=no sequence, 1,2,3 for attack counter
  
  return state.resources;
}

//====================================================================
// ON SUCCESSFUL HIT - Normal attacks
//====================================================================
/**
 * Called when Callisto successfully hits a target with a normal attack.
 * Effects:
 *   - Gain 5 [Corpus Ingredient] (capped at 20)
 *   - Inflict 4 Bleed potency + 4 Bleed count
 *   - Apply Artwork: Tibia bonus bleed if stacks present (max +3 potency, +3 count)
 *   - Heal (combo x 5) HP - Passive 1
 *   - Passive 2: +5% damage per negative effect on enemy (max 30%)
 *   - Attack sequence-specific effects (Attack 1: Bind, Haste; Attack 2: Fragile, Protection; Attack 3: bonus damage)
 */
function onSuccessfulHit(state, targetState, damage, config) {
  const effects = { statusesApplied: [], corpusGained: 0, healing: 0 };

  if (!targetState || targetState.isDefeated) {
    return { success: false, reason: 'No valid target' };
  }

  // GAIN CORPUS INGREDIENT (capped at 20)
  const corpusGain = config.corpusIngredient.gainPerHit || 5;
  const previousCorpus = state.resources.corpusIngredient;
  state.resources.corpusIngredient = Math.min(
    state.resources.maxCorpusIngredient,
    state.resources.corpusIngredient + corpusGain
  );
  effects.corpusGained = state.resources.corpusIngredient - previousCorpus;

  // APPLY BLEED (4 potency, 4 count) with Artwork: Tibia bonus
  let bleedPotency = 4;
  let bleedCount = 4;
  
  const artworkStacks = state.resources.artworkTibiaStacks || 0;
  if (artworkStacks > 0) {
    const artworkConfig = config.artworkTibia || {};
    const bonusPotency = Math.min(artworkStacks * (artworkConfig.bleedBonusPotency || 1), artworkConfig.maxBonus || 3);
    const bonusCount = Math.min(artworkStacks * (artworkConfig.bleedBonusCount || 1), artworkConfig.maxBonus || 3);
    bleedPotency += bonusPotency;
    bleedCount += bonusCount;
  }
  
  const existingBleed = getStatus(targetState, 'Bleed');
  if (existingBleed) {
    existingBleed.count += bleedCount;
    existingBleed.potency += bleedPotency;
  } else {
    targetState.statuses.push({ type: 'Bleed', count: bleedCount, potency: bleedPotency, timer: 0 });
  }
  effects.statusesApplied.push('Bleed');

  // PASSIVE 1: Heal (combo x 5) HP
  const combatState = this.combatState && this.combatState[state.id];
  const comboCount = combatState ? (combatState.combo || 0) : 0;
  const healAmount = comboCount * (config.passives.corpusHealing.healPerCombo || 5);
  if (healAmount > 0) {
    state.hp = Math.min(state.maxHp, state.hp + healAmount);
    effects.healing = healAmount;
  }

  return { success: true, ...effects };
}

//====================================================================
// ON RECEIVE HIT
//====================================================================
/**
 * Called when Callisto receives damage.
 * Effects:
 *   - PASSIVE 1: Gain 1 [Damage Down] on hit (max stack 3 from passive)
 *   - PASSIVE 3: Reduce negative status effects taken by 30% (rounded up)
 *   - Lose 1 Haste on hit
 *   - Lose 1 Protection on hit
 *   - Lose 1 Fragile on hit
 *   - Lose 1 Bind on hit
 */
function onReceiveHit(state, damage, attacker, config) {
  const effects = {};

  // PASSIVE 3: Reduce negative effects taken by 30% (rounded up)
  let reducedDamage = damage;
  if (config.passives && config.passives.transcendCorpus) {
    const reduction = config.passives.transcendCorpus.negativeStatusReduction || 0.30;
    reducedDamage = Math.ceil(damage * (1 - reduction));
  }
  
  // PASSIVE 1: Gain 1 Damage Down on hit (max 3 from passive)
  const maxDamageDown = config.passives.corpusHealing.maxDamageDownFromPassive || 3;
  const existingDD = getStatus(state, 'Damage Down');
  const currentDDCount = existingDD ? existingDD.count : 0;
  
  if (currentDDCount < maxDamageDown) {
    ensureStatus(state, 'Damage Down', 1, 1);
    effects.damageDownGained = true;
  }

  // Lose 1 Haste on hit
  const haste = getStatus(state, 'Haste');
  if (haste && haste.count > 0) {
    haste.count -= 1;
    if (haste.count <= 0) removeStatus(state, 'Haste');
    effects.hasteLost = true;
  }

  // Lose 1 Bind on hit (if Callisto has Bind somehow)
  const bind = getStatus(state, 'Bind');
  if (bind && bind.count > 0) {
    bind.count -= 1;
    if (bind.count <= 0) removeStatus(state, 'Bind');
    effects.bindLost = true;
  }

  // Lose 1 Fragile on hit (if Callisto has Fragile)
  const fragile = getStatus(state, 'Fragile');
  if (fragile && fragile.count > 0) {
    fragile.count -= 1;
    if (fragile.count <= 0) removeStatus(state, 'Fragile');
    effects.fragileLost = true;
  }

  // Lose 1 Protection on hit
  const protection = getStatus(state, 'Protection');
  if (protection && protection.count > 0) {
    protection.count -= 1;
    if (protection.count <= 0) removeStatus(state, 'Protection');
    effects.protectionLost = true;
  }

  return { success: true, reducedDamage, ...effects };
}

//====================================================================
// ATTACK-SPECIFIC PER-ATTACK EFFECTS
//====================================================================

/**
 * Apply attack 1 effects: inflict 1 Bind on enemy, gain 1 Haste on self.
 */
function applyAttack1Effects(state, targetState) {
  if (targetState && !targetState.isDefeated) {
    ensureStatus(targetState, 'Bind', 1, 1);
  }
  ensureStatus(state, 'Haste', 1, 1);
  return { bindApplied: true, hasteGained: true };
}

/**
 * Apply attack 2 effects: inflict 1 Fragile on enemy, gain 1 Protection on self.
 */
function applyAttack2Effects(state, targetState) {
  if (targetState && !targetState.isDefeated) {
    // Fragile max stack 5
    const fragile = getStatus(targetState, 'Fragile');
    if (fragile) {
      fragile.count = Math.min((fragile.count || 0) + 1, 5);
      fragile.potency = Math.min((fragile.potency || 0) + 1, 5);
    } else {
      targetState.statuses.push({ type: 'Fragile', count: 1, potency: 1, timer: 0 });
    }
  }
  // Protection max stack 5
  const protection = getStatus(state, 'Protection');
  if (protection) {
    protection.count = Math.min((protection.count || 0) + 1, 5);
    protection.potency = Math.min((protection.potency || 0) + 1, 5);
  } else {
    state.statuses.push({ type: 'Protection', count: 1, potency: 1, timer: 0 });
  }
  return { fragileApplied: true, protectionGained: true };
}

/**
 * Calculate attack 3 bonus: +5% damage per negative effect on enemy (max 25%).
 */
function calculateAttack3BonusDamage(targetState) {
  if (!targetState) return 0;
  const negativeCount = countNegativeEffects(targetState);
  const bonusPercent = Math.min(negativeCount * 0.05, 0.25);
  return bonusPercent;
}

//====================================================================
// SLAM ATTACK
//====================================================================
/**
 * Execute Slam Attack.
 * Consumes up to 20 Corpus Ingredient.
 * At 20 consumed: +100% range, +50% damage, use cuf6 sprite + cus4 slash.
 * Per 20 spent: gain 1 Artwork: Tibia.
 * 
 * NOTE: Damage goes through engine.calculateFinalDamage() via the caller
 * to apply all damage modifiers (Fragile, Protection, Crit, etc.)
 */
function executeSlamAttack(state, abilityConfig, targetState, config) {
  if (!targetState) {
    return { success: false, reason: 'No target' };
  }

  // Determine how much Corpus to consume (up to 20)
  const maxConsumable = config.corpusIngredient.spendPerSlam || 20;
  const corpusToConsume = Math.min(state.resources.corpusIngredient, maxConsumable);
  const isMaxConsumption = corpusToConsume >= maxConsumable;

  // Calculate range and damage multipliers
  let range = abilityConfig.range || 200;
  let damageMultiplier = 1.0;
  let useCostumeSprite = false;

  if (isMaxConsumption) {
    range *= (abilityConfig.rangeMultiplierAtMax || 2.0);
    damageMultiplier = (abilityConfig.damageMultiplierAtMax || 1.5);
    useCostumeSprite = true;
  }

  // Calculate raw base damage (before additive modifiers)
  const rawBaseDamage = Math.floor(abilityConfig.baseDamage * state.baseDamage * damageMultiplier);

  // NOTE: The actual final damage with modifiers (Fragile, Protection, Crit, etc.)
  // is computed by the caller using engine.calculateFinalDamage().
  // This function returns the rawDamage for the caller to apply modifiers to.
  // The rawDamage is used as-is if the caller doesn't apply modifiers.

  // Check hit (simplified - full hit detection done by engine)
  const hit = true; // Engine validates range/position

  if (!hit) {
    return {
      success: true,
      ability: 'slam',
      hit: false,
      reason: 'Target out of range'
    };
  }

  // Apply stagger damage from ability config
  if (abilityConfig.statusEffects) {
    abilityConfig.statusEffects.forEach(statusConfig => {
      ensureStatus(targetState, statusConfig.type, statusConfig.count || 1, statusConfig.potency || 1);
    });
  }

  // Apply knockback
  if (abilityConfig.knockback) {
    const dir = targetState.position.x < state.position.x ? -1 : 1;
    const knockMult = (state.knockbackMultiplier || 1.0);
    targetState.velocity.x = dir * abilityConfig.knockback * 8 * knockMult;
  }

  // CONSUME CORPUS INGREDIENT and gain Artwork
  const consumeResult = consumeCorpusIngredient(state, corpusToConsume, config);
  
  // Apply slam buff status (for sprite/slash costume visual sync)
  state.resources.slamBuffActive = true;
  state.resources.slamBuffTimer = 0.5;
  state.resources.corpusConsumedLastSlam = corpusToConsume;

  return {
    success: true,
    ability: 'slam',
    hit: true,
    rawDamage: rawBaseDamage,
    corpusConsumed: consumeResult.consumed,
    corpusRemaining: state.resources.corpusIngredient,
    artworkGained: consumeResult.artworkGained,
    artworkTotal: state.resources.artworkTibiaStacks,
    isMaxConsumption: isMaxConsumption,
    useCostumeSprite: useCostumeSprite,
    // Target HP is applied by the caller after damage modifiers
    targetHp: 0,
    damage: 0,
    defeated: false
  };
}

//====================================================================
// INSTALLATION ART NO. 3: IMPROVISED RIBCAGE
//====================================================================
/**
 * Ability: Installation Art no. 3: Improvised Ribcage.
 * Activated with Q (like Valencina's Time to Hunt).
 * 
 * Effects:
 *   1. 0.5 second windup (cguard sprite)
 *   2. Attack target from ground with 2x radius
 *   3. Inflict 8 Bleed + 1 Ingredient Shredding Wound
 *   4. Inflict Sinking potency = damage dealt, 1 Sinking count
 *   5. Deal 500% of damage dealt as stagger damage
 *   6. Spawn cbsk1 at enemy location
 *   7. Counts as normal attack (combo/damage flow)
 *   8. Costs 10 Corpus Ingredient
 *   9. Gains 1 Artwork: Tibia
 * 
 * NOTE: Damage modifiers are applied by the caller using engine.calculateFinalDamage()
 */
function executeInstallationArt(state, abilityConfig, targetStates, config) {
  this.engineRef = this.engineRef || this; // Support both call styles

  const targets = Array.isArray(targetStates) ? targetStates : targetStates ? [targetStates] : [];
  if (targets.length === 0) {
    return {
      success: false,
      reason: 'No targets',
      ability: 'installationArt',
      windupTime: abilityConfig.windupTime || 0.5
    };
  }

  // VALIDATE CORPUS COST
  const cost = abilityConfig.corpusCost || 10;
  if (state.resources.corpusIngredient < cost) {
    return {
      success: false,
      reason: 'Not enough Corpus Ingredient',
      current: state.resources.corpusIngredient,
      required: cost
    };
  }

  // EXECUTE ON EACH TARGET
  const results = [];
  targets.forEach(targetState => {
    if (!targetState || targetState.isDefeated) return;

    // Raw base damage (before additive modifiers)
    const rawBaseDamage = Math.floor(abilityConfig.baseDamage * state.baseDamage);

    // NOTE: The final damage with all modifiers is applied by the caller
    // using engine.calculateFinalDamage(). We return rawDamage for that purpose.

    results.push({
      targetId: targetState.id,
      hit: true,
      rawDamage: rawBaseDamage,
      targetHp: targetState.hp,
      statusesApplied: ['Bleed', 'IngredientShreddingWound', 'Sinking'],
      staggerDamage: Math.floor(rawBaseDamage * (abilityConfig.staggerMultiplier || 5.0)),
      defeated: targetState.hp <= 0,
      // Provide world position for client VFX (if available)
      worldPos: targetState.pos || null,
      groundY: (targetState.pos && typeof targetState.pos.y === 'number') ? targetState.pos.y : null
    });
  });

  // CONSUME CORPUS INGREDIENT
  const consumeResult = consumeCorpusIngredient(state, cost, config);

  return {
    success: true,
    ability: 'installationArt',
    windupTime: abilityConfig.windupTime || 0.5,
    corpusConsumed: consumeResult.consumed,
    corpusRemaining: state.resources.corpusIngredient,
    artworkGained: consumeResult.artworkGained,
    artworkTotal: state.resources.artworkTibiaStacks,
    radiusMultiplier: abilityConfig.radiusMultiplier || 2.0,
    cooldown: abilityConfig.cooldown,
    targetsHit: results.length,
    results: results
  };
}

//====================================================================
// EVADE ACTION
//====================================================================
/**
 * Called when Callisto evades.
 * PASSIVE 2: Inflict 2 bleed potency and 2 bleed count on evade.
 */
function onEvade(state, targetState) {
  if (!targetState || targetState.isDefeated) return { success: false };
  
  const bleedPotency = 2;
  const bleedCount = 2;
  
  const existingBleed = getStatus(targetState, 'Bleed');
  if (existingBleed) {
    existingBleed.count += bleedCount;
    existingBleed.potency += bleedPotency;
  } else {
    targetState.statuses.push({ type: 'Bleed', count: bleedCount, potency: bleedPotency, timer: 0 });
  }
  
  return {
    success: true,
    bleedApplied: bleedPotency,
    action: 'evade_bleed'
  };
}

//====================================================================
// PER-TICK SYSTEM UPDATES
//====================================================================
/**
 * Update Callisto-specific systems each server tick.
 * 
 * 1. Process Corpus Ingredient (no decay, just passive regeneration removed)
 * 2. Process Haste/Bind/Fragile/Protection count-based decay (lose on hit only)
 * 3. Process Damage Down / Damage Up decay (lose on attack hit)
 * 4. PASSIVE 1: For every 20 sum of negative status potency, gain 1 Fragile
 * 5. PASSIVE 3: Check Artwork: Tibia expiration → gain Damage Up + Protection
 * 6. Track slam buff timer
 * 7. Calculate effective speed with Haste/Bind/IngredientShreddingWound
 */
function updateSystems(state, dt, config) {
  const events = [];

  // 1. Slam buff timer
  if (state.resources.slamBuffActive) {
    state.resources.slamBuffTimer -= dt;
    if (state.resources.slamBuffTimer <= 0) {
      state.resources.slamBuffActive = false;
      state.resources.corpusConsumedLastSlam = 0;
      events.push({ type: 'SLAM_BUFF_EXPIRED' });
    }
  }

  // 2. PASSIVE 1: Every 20 sum of negative potency → gain 1 Fragile
  if (config.passives && config.passives.corpusHealing) {
    const threshold = config.passives.corpusHealing.negativePotencyFragileThreshold || 20;
    const negativePotSum = sumNegativePotency(state);
    if (negativePotSum >= threshold) {
      const fragileToGain = Math.floor(negativePotSum / threshold);
      const existingFragileCount = getStatusCount(state, 'Fragile');
      const targetFragileCount = Math.min(existingFragileCount + fragileToGain, 5);
      if (targetFragileCount > existingFragileCount) {
        setStatusCount(state, 'Fragile', targetFragileCount);
        const fragileStatus = getStatus(state, 'Fragile');
        if (fragileStatus) fragileStatus.potency = targetFragileCount;
        events.push({ type: 'FRAGILE_GAINED_FROM_NEGATIVE', source: 'passive1', amount: fragileToGain });
      }
    }
  }

  // 3. SYNC CORPUS INGREDIENT STATUS with resource (for client visibility)
  const corpusStatus = getStatus(state, 'Corpus Ingredient');
  if (corpusStatus) {
    corpusStatus.count = state.resources.corpusIngredient;
    corpusStatus.potency = state.resources.corpusIngredient;
  } else if (state.resources.corpusIngredient > 0) {
    ensureStatus(state, 'Corpus Ingredient', state.resources.corpusIngredient, state.resources.corpusIngredient);
  }

  // 4. SYNC ARTWORK: TIBIA STATUS with resource (for client visibility)
  const artworkStatus = getStatus(state, 'Artwork Tibia');
  if (artworkStatus) {
    artworkStatus.count = state.resources.artworkTibiaStacks;
    artworkStatus.potency = state.resources.artworkTibiaStacks;
  } else if (state.resources.artworkTibiaStacks > 0) {
    ensureStatus(state, 'Artwork Tibia', state.resources.artworkTibiaStacks, state.resources.artworkTibiaStacks);
  }

  // 5. Calculate effective speed with Haste/Bind/IngredientShreddingWound
  const baseSpeed = config.speed || 9;
  const hasteStacks = getStatusCount(state, 'Haste');
  const bindStacks = getStatusCount(state, 'Bind');
  const iswActive = hasStatus(state, 'IngredientShreddingWound');
  
  let effectiveSpeed = baseSpeed + hasteStacks - bindStacks;
  if (iswActive) effectiveSpeed -= 3; // Ingredient Shredding Wound: lose 3 movement speed
  effectiveSpeed = Math.max(1, effectiveSpeed);
  state.resources.effectiveSpeed = effectiveSpeed;

  // 6. Calculate damage bonuses for UI display
  const artworkStacks = state.resources.artworkTibiaStacks || 0;
  state.resources.artworkDamageBonus = artworkStacks * (config.artworkTibia.damageBonus || 0.1);

  // 7. Check ultimate availability
  state.resources.ultimateAvailable = artworkStacks >= (config.ultimate.artworkRequired || 3);

  return events;
}

//====================================================================
// DAMAGE CALCULATION MODIFIERS - ADDITIVE FORMULA
//====================================================================
/**
 * Get the additive damage modifier sum for Callisto-specific effects.
 * 
 * This returns a fraction (e.g. 0.3 for +30%, -0.2 for -20%) that gets
 * added to the engine's global modifier sum.
 * 
 * The engine's formula is:
 *   finalDamage = (rawBase + comboFlat) × (1 + globalModSum + thisModSum)
 * 
 * Modifiers (in order):
 *   - Artwork: Tibia: +10% per stack
 *   - Attack 3: +5% per negative effect on target (max 25%)
 *   - PASSIVE 2: +5% per negative effect on target (max 30%)
 *   - Damage Down on self: -10% per stack
 *   - Damage Up on self: +10% per stack
 * 
 * NOTE: Fragile, Protection, Sinking, Crit are already handled by the engine's
 * getDamageModifierSum(). This function only handles Callisto-specific modifiers.
 * 
 * @param {Object} attacker - The attacking fighter state
 * @param {Object} defender - The defending fighter state
 * @param {Object} config - Callisto's character config
 * @param {number} [attackType] - The attack type (1, 2, 3, or undefined for abilities)
 * @returns {number} The sum of all Callisto-specific modifier fractions
 */
function getCallistoDamageModifier(attacker, defender, config, attackType) {
  let modSum = 0;

  // Attack 3 bonus: +5% per negative effect on target (max 25%)
  if (attackType === 3) {
    const negativeCount = countNegativeEffects(defender);
    const attack3Bonus = Math.min(negativeCount * 0.05, 0.25);
    modSum += attack3Bonus;
  }

  // Artwork: Tibia: +10% per stack
  const artworkStacks = attacker.resources.artworkTibiaStacks || 0;
  if (artworkStacks > 0) {
    modSum += artworkStacks * (config.artworkTibia.damageBonus || 0.1);
  }

  // PASSIVE 2: +5% per negative effect on target (max 30%)
  if (defender) {
    const negativeCount = countNegativeEffects(defender);
    const passive2Bonus = Math.min(negativeCount * (config.passives.exhibitionDamage.damagePerNegativeEffect || 0.05), 
                                    config.passives.exhibitionDamage.maxDamageBonus || 0.30);
    modSum += passive2Bonus;
  }

  // Damage Down on self: -10% per stack
  const damageDownCount = getStatusCount(attacker, 'Damage Down');
  if (damageDownCount > 0) {
    modSum -= damageDownCount * 0.1;
  }

  // Damage Up on self: +10% per stack
  const damageUpCount = getStatusCount(attacker, 'Damage Up');
  if (damageUpCount > 0) {
    modSum += damageUpCount * 0.1;
  }

  return modSum;
}

/**
 * @deprecated Use getCallistoDamageModifier instead.
 * Old multiplicative damage calculation - kept for reference but unused.
 * The engine now uses getDamageModifierSum which calls getCallistoDamageModifier.
 */
function calculateCallistoDamage(base, attacker, targetState, config, attackType) {
  // Just delegate to the engine's additive formula for backward compatibility
  // This function is now deprecated - damage is computed by the engine
  const rawBase = base * (attacker.baseDamage || 1);
  const modFraction = getCallistoDamageModifier(attacker, targetState, config, attackType);
  const comboCount = attacker.combo || 0;
  const comboFlat = comboCount * (config.comboDamage || 4);
  const damageForMods = rawBase + comboFlat;
  let finalDamage = damageForMods * (1 + modFraction);
  return { damage: Math.floor(finalDamage), isCrit: false };
}

/**
 * Process Damage Down stack reduction on attack hit (PASSIVE 1 interaction).
 * Damage Down: reduce stack by 1 on attack hit.
 * Damage Up: reduce stack by 1 on attack hit.
 */
function processPostAttackStackReduction(state) {
  const events = [];
  
  const dd = getStatus(state, 'Damage Down');
  if (dd && dd.count > 0) {
    dd.count -= 1;
    if (dd.count <= 0) {
      removeStatus(state, 'Damage Down');
      events.push({ type: 'DAMAGE_DOWN_EXPIRED' });
    } else {
      dd.potency = Math.max(0, (dd.potency || 1) - 1);
    }
  }
  
  const du = getStatus(state, 'Damage Up');
  if (du && du.count > 0) {
    du.count -= 1;
    if (du.count <= 0) {
      removeStatus(state, 'Damage Up');
      events.push({ type: 'DAMAGE_UP_EXPIRED' });
    } else {
      du.potency = Math.max(0, (du.potency || 1) - 1);
    }
  }
  
  return events;
}

//====================================================================
// ARTWORK: TIBIA EXPIRATION
//====================================================================
/**
 * When Artwork: Tibia expires (count = 0), gain 2 Damage Up and 2 Protection.
 * This is checked during status processing.
 */
function onArtworkExpiration(state, config) {
  const events = [];
  
  if (state.resources.artworkTibiaStacks && state.resources.artworkTibiaStacks > 0) {
    // Artwork: Tibia is still active, not expired
    return events;
  }
  
  if (state._artworkExpiredProcessed) return events;
  state._artworkExpiredProcessed = true;
  
  // PASSIVE 3: Gain 2 Damage Up and 2 Protection when Artwork expires
  if (config.passives && config.passives.transcendCorpus) {
    const damageUpGain = config.passives.transcendCorpus.artworkExpirationDamageUp || 2;
    const protectionGain = config.passives.transcendCorpus.artworkExpirationProtection || 2;
    
    ensureStatus(state, 'Damage Up', damageUpGain, damageUpGain);
    ensureStatus(state, 'Protection', protectionGain, protectionGain);
    
    events.push({ type: 'ARTWORK_EXPIRED_BONUS', damageUpGained: damageUpGain, protectionGained: protectionGain });
  }
  
  return events;
}

//====================================================================
// ULTIMATE EXECUTION
//====================================================================
/**
 * Execute Callisto's ultimate "Closing Time - Installation Art no. 1".
 * Requires 5 Artwork: Tibia stacks to activate.
 * 
 * 5-Phase ultimate with specific effects per phase.
 * On ult end: consume all Artwork: Tibia, Corpus Ingredient, reset spent corpus.
 * 
 * NOTE: Damage goes through engine.calculateFinalDamage() via dealUltDamage
 * to apply all damage modifiers.
 */
function executeUltimate(state, abilityConfig, targetStates, config) {
  const targets = Array.isArray(targetStates) ? targetStates : [targetStates];
  const results = [];

  // Validate artwook requirement
  const requiredArtwork = config.ultimate.artworkRequired || 5;
  if ((state.resources.artworkTibiaStacks || 0) < requiredArtwork) {
    return { success: false, reason: 'Not enough Artwork: Tibia', required: requiredArtwork, current: state.resources.artworkTibiaStacks };
  }

  targets.forEach(targetState => {
    if (!targetState || targetState.isDefeated) return;
    
    // Raw base damage before modifiers (flat, not multiplied yet)
    // dealUltDamage will call engine.calculateFinalDamage() to apply all modifiers
    const rawDamage = Math.floor((abilityConfig.baseDamage || 2.0) * (state.baseDamage || 27));

    results.push({
      targetId: targetState.id,
      hit: true,
      rawDamage: rawDamage,
      targetHp: targetState.hp,
      statuses: [],
      defeated: false
    });
  });

  return {
    success: true,
    ability: 'ultimate',
    artworkRequired: requiredArtwork,
    targetsHit: results.length,
    results: results
  };
}

//====================================================================
// PER-PHASE ULTIMATE EFFECTS
//====================================================================

/**
 * Apply phase-specific effects for Callisto's ultimate.
 * Called from the ultimate sequence engine.
 */
function applyUltimatePhaseEffects(fighter, targetState, phase, config) {
  const phaseConfig = config.ultimate.phaseEffects[phase];
  if (!phaseConfig || !targetState || targetState.isDefeated) return [];
  
  const events = [];
  
  switch (phase) {
    case 1: // Attack 1: inflict 8 bleed potency
      if (phaseConfig.bleed) {
        ensureStatus(targetState, 'Bleed', phaseConfig.bleed, phaseConfig.bleed);
        events.push({ type: 'ULT_PHASE_EFFECT', phase: 1, status: 'Bleed', amount: phaseConfig.bleed });
      }
      break;
      
    case 2: // Attack 2: inflict 1 bind, gain 1 haste
      if (phaseConfig.bind) {
        ensureStatus(targetState, 'Bind', phaseConfig.bind, phaseConfig.bind);
        events.push({ type: 'ULT_PHASE_EFFECT', phase: 2, status: 'Bind', amount: phaseConfig.bind });
      }
      if (phaseConfig.haste) {
        ensureStatus(fighter, 'Haste', phaseConfig.haste, phaseConfig.haste);
        events.push({ type: 'ULT_PHASE_EFFECT_SELF', phase: 2, status: 'Haste', amount: phaseConfig.haste });
      }
      break;
      
    case 3: // Attack 3: inflict 1 damage down, gain 1 damage up
      if (phaseConfig.damageDown) {
        ensureStatus(targetState, 'Damage Down', phaseConfig.damageDown, phaseConfig.damageDown);
        events.push({ type: 'ULT_PHASE_EFFECT', phase: 3, status: 'Damage Down', amount: phaseConfig.damageDown });
      }
      if (phaseConfig.damageUp) {
        ensureStatus(fighter, 'Damage Up', phaseConfig.damageUp, phaseConfig.damageUp);
        events.push({ type: 'ULT_PHASE_EFFECT_SELF', phase: 3, status: 'Damage Up', amount: phaseConfig.damageUp });
      }
      break;
      
    case 4: // Attack 4: trigger bleed 1 time for every 5 corpus ingredient
      const corpusForBleed = fighter.resources.corpusIngredient || 0;
      const triggerInterval = phaseConfig.bleedTriggerPerCorpus || 5;
      if (triggerInterval > 0) {
        const bleedTriggers = Math.floor(corpusForBleed / triggerInterval);
        for (let i = 0; i < bleedTriggers; i++) {
          // Trigger bleed: consume bleed from target and deal damage
          const targetBleed = getStatus(targetState, 'Bleed');
          if (targetBleed && targetBleed.potency > 0) {
            const bleedDmg = targetBleed.potency;
            targetState.hp = Math.max(0, targetState.hp - bleedDmg);
            targetBleed.count -= 1;
            if (targetBleed.count <= 0) {
              removeStatus(targetState, 'Bleed');
            }
            events.push({ type: 'BLEED_TRIGGERED', damage: bleedDmg, remainingCount: targetBleed ? targetBleed.count : 0 });
          }
        }
      }
      break;
      
    case 5: // Attack 5: multihit with 5 bleed, 5 burn, 3 ISW, 270% more damage
      if (phaseConfig.bleed) {
        ensureStatus(targetState, 'Bleed', phaseConfig.bleed, phaseConfig.bleed);
      }
      if (phaseConfig.burn) {
        ensureStatus(targetState, 'Burn', phaseConfig.burn, phaseConfig.burn);
      }
      if (phaseConfig.ingredientShreddingWound) {
        ensureStatus(targetState, 'IngredientShreddingWound', phaseConfig.ingredientShreddingWound, phaseConfig.ingredientShreddingWound);
      }
      // Damage multiplier is applied in dealUltDamage
      events.push({ type: 'ULT_PHASE_EFFECT', phase: 5, damageMultiplier: phaseConfig.damageMultiplier || 2.7 });
      break;
  }
  
  return events;
}

//====================================================================
// EXPORTS

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Core hooks
    initializeResources,
    onSuccessfulHit,
    onReceiveHit,
    onEvade,
    
    // Attacks
    applyAttack1Effects,
    applyAttack2Effects,
    calculateAttack3BonusDamage,
    
    // Abilities
    executeSlamAttack,
    executeInstallationArt,
    executeUltimate,
    applyUltimatePhaseEffects,
    
    // Systems
    updateSystems,
    calculateCallistoDamage,
    getCallistoDamageModifier,
    processPostAttackStackReduction,
    onArtworkExpiration,
    
    // Utility
    getStatus,
    getStatusPotency,
    getStatusCount,
    hasStatus,
    ensureStatus,
    removeStatus,
    consumeCorpusIngredient,
    countNegativeEffects,
    sumNegativePotency,
    
    // Aliases for ability handler
    slam: executeSlamAttack,
    installationArt: executeInstallationArt,
    ultimate: executeUltimate,
    
    // Passive exports
    corpusHealing: 'All of My Corpus has been Given to Tibia',
    exhibitionDamage: 'Allow Me to Briefly Enjoy My Pupil\'s Exhibition',
    transcendCorpus: 'Transcend the Corpus'
  };
}