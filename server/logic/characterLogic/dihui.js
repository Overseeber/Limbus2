/**
 * DIHUI STAR - SERVER-SIDE CHARACTER LOGIC
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

function removeStatus(fighter, type) {
  fighter.statuses = fighter.statuses.filter(s => s.type !== type);
}

//====================================================================
// ON SUCCESSFUL HIT
//====================================================================
/**
 * Called when Dihui Star successfully hits a target.
 * - Inflict 1 [Bladetrail Afterimage] on target
 * - Gain 1 [Poise Potency] (NOT Poise Count - changed per spec)
 */
function onSuccessfulHit(state, targetState, damage, config) {
  const effects = { statusesApplied: [] };

  if (!targetState || targetState.isDefeated) {
    return { success: false, reason: 'No valid target' };
  }

  // Store last hit opponent for targeting
  state.lastHitOpponent = targetState.id;

  // Inflict 1 Bladetrail Afterimage on target (count tracks stacks, potency tracks damage bonus)
  const ba = ensureStatus(targetState, 'Bladetrail Afterimage', 1, 0);
  effects.statusesApplied.push('Bladetrail Afterimage');

  // Gain 1 Poise Potency (not count - changed per spec: "on hit: gain 1 poise potency")
  ensureStatus(state, 'Poise', 0, 1);
  effects.poiseGained = true;

  // Track total Bladetrail Afterimage inflicted for [Dihui Star's Blade]
  const bladeStatus = getStatus(state, "Dihui Star's Blade");
  if (bladeStatus) {
    bladeStatus.count = Math.min(bladeStatus.count + 1, 99);
  } else {
    state.statuses.push({ type: "Dihui Star's Blade", count: 1, potency: 0, timer: 0 });
  }

  // NOTE: ultimate availability is handled dynamically by updateSystems(),
  // which re-evaluates on every tick based on current blade count.
  // Do not set ultimateAvailable here - it would incorrectly re-enable
  // ultimate immediately after use before the blade has been consumed.
  // The Shin status is also handled by updateSystems if needed.
  // See: updateSystems() in this file.
  
  // Fire event if the threshold was JUST crossed (for potential use elsewhere)
  if (getStatusCount(state, "Dihui Star's Blade") >= config.dihuiBlade.ultimateThreshold) {
    effects.ultimateThresholdReached = true;
  }

  return { success: true, ...effects };
}

//====================================================================
// ATTACK-SPECIFIC PER-ATTACK EFFECTS
//====================================================================
function applyAttack1Effects(state) {
  // Attack 1: Gain 3 Poise Count
  ensureStatus(state, 'Poise', 3, 0);
}

function applyAttack2Effects(state) {
  // Attack 2: Gain 3 Poise Count
  ensureStatus(state, 'Poise', 3, 0);
}

function applyAttack3Effects(state, targetState) {
  const result = { inflictedBladetrailAfterimage: false, bonusCritDamage: false };

  // Attack 3: Inflict 1 Bladetrail Afterimage
  if (targetState && !targetState.isDefeated) {
    ensureStatus(targetState, 'Bladetrail Afterimage', 1, 0);
    result.inflictedBladetrailAfterimage = true;
  }

  // Attack 3: Deal +30% damage on Critical Hit (handled in calculateDamage)
  result.bonusCritDamage = true;

  return result;
}

//====================================================================
// BLADETRAIL AFTERIMAGE DAMAGE BONUS
//====================================================================
function calculateBladetrailDamageBonus(attackerState, targetState, config) {
  const baCount = getStatusCount(targetState, 'Bladetrail Afterimage');
  const bonusPercent = baCount * (config.bladetrailAfterimage.damageBonusPerStack || 0.01);
  return Math.min(bonusPercent, 0.99); // Max 99% bonus
}

//====================================================================
// LACERATING AFTERIMAGES - SHIELD SYSTEM
//====================================================================
function updateShieldSystem(state, dt, config) {
  const events = [];

  // Initialize shield if not present
  if (state.resources.shieldHp === undefined) {
    state.resources.shieldHp = config.laceratingAfterimages.shieldMax;
    state.resources.shieldMax = config.laceratingAfterimages.shieldMax;
    state.resources.shieldRegenTimer = 0;
    state.resources.shieldBrokenTimer = 0;
    state.resources.shieldLastDamageTime = 0;
  }

  const shieldConfig = config.laceratingAfterimages;

  // Check if shield has taken damage recently
  if (state.resources.shieldLastDamageTime > 0) {
    const timeSinceDamage = (Date.now() - state.resources.shieldLastDamageTime) / 1000;

    if (state.resources.shieldHp > 0) {
      // Shield still active - regen after regenDelay seconds without damage
      if (timeSinceDamage >= shieldConfig.shieldRegenDelay) {
        state.resources.shieldHp = Math.min(
          state.resources.shieldMax,
          state.resources.shieldHp + shieldConfig.shieldRegenRate * dt
        );
      }
    } else {
      // Shield broken - wait shieldBrokenDelay before recovery
      if (timeSinceDamage >= shieldConfig.shieldBrokenDelay) {
        state.resources.shieldHp = Math.min(
          state.resources.shieldMax,
          state.resources.shieldHp + shieldConfig.shieldRegenRate * dt
        );
      }
    }
  }

  return events;
}

/**
 * Apply shield damage absorption.
 * Shield absorbs damage before HP.
 * Returns actual HP damage taken (after shield absorbs).
 */
function applyShieldAbsorption(state, damage) {
  if (state.resources.shieldHp === undefined || state.resources.shieldHp <= 0) {
    return damage; // No shield, full damage to HP
  }

  state.resources.shieldLastDamageTime = Date.now();

  if (state.resources.shieldHp >= damage) {
    // Shield absorbs all damage
    state.resources.shieldHp -= damage;
    return 0;
  } else {
    // Shield breaks, remaining damage hits HP
    const overflow = damage - state.resources.shieldHp;
    state.resources.shieldHp = 0;
    return overflow;
  }
}

//====================================================================
// LACERATING AFTERIMAGES - DAMAGE BONUS
//====================================================================
function calculateMissingHpDamageBonus(state, config) {
  const hpPercent = state.hp / state.maxHp;
  const missingPercent = 1 - hpPercent;
  
  // +10% damage for every 15% missing HP, max +50%
  const steps = Math.floor(missingPercent / 0.15);
  const bonus = steps * 0.10;
  return Math.min(bonus, 0.50);
}

//====================================================================
// ON RECEIVE HIT
//====================================================================
function onReceiveHit(state, damage, attacker, config) {
  const effects = {};

  // Apply shield absorption first
  const hpDamage = applyShieldAbsorption(state, damage);
  if (hpDamage !== damage) {
    effects.shieldAbsorbed = damage - hpDamage;
  }
  effects.hpDamage = hpDamage;

  // When hit: Gain 5 Poise Potency and 1 Poise Count
  ensureStatus(state, 'Poise', config.laceratingAfterimages.poiseGainOnHit.count || 1, config.laceratingAfterimages.poiseGainOnHit.potency || 5);

  // Consume excess Poise Potency (>20) to inflict Bladetrail Afterimage on attacker
  const poise = getStatus(state, 'Poise');
  if (poise && poise.potency > 20) {
    const excess = poise.potency - 20;
    poise.potency = 20;
    // Inflict Bladetrail Afterimage on attacker equal to consumed amount
    if (attacker && !attacker.isDefeated) {
      ensureStatus(attacker, 'Bladetrail Afterimage', excess, 0);
      effects.bladetrailAfterimageInflicted = excess;
    }
  }

  return { success: true, ...effects };
}

//====================================================================
// SUPERPOSED AFTERIMAGE - STATE HISTORY TRACKING
//====================================================================
/**
 * Initialize afterimage history buffer on the fighter state.
 * Stores structured state snapshots for delayed afterimage rendering and attacks.
 */
function initAfterimageHistory(state) {
  if (!state.afterimageHistory) {
    state.afterimageHistory = [];
  }
}

/**
 * Record current state into the afterimage history buffer.
 * Stores position, facing, sprite/state info, and attack state at this tick.
 * Cap the buffer to the maximum needed (delay * tickRate + margin).
 */
function recordAfterimageSnapshot(state, dt, config) {
  const maxDelay = config.superposedAfterimage.count * config.superposedAfterimage.delayPerImage; // 1.5s
  const maxSamples = Math.ceil(maxDelay / dt) + 5;

  state.afterimageHistory = state.afterimageHistory || [];
  state.afterimageHistory.push({
    x: state.position.x,
    y: state.position.y,
    facing: state.facing,
    isAttacking: state.isAttacking || false,
    state: state.state,
    attackSequence: state.attackSequence,
    attackPhase: state.attackPhase,
    strikeActive: state.strikeActive || false,
    timestamp: Date.now()
  });

  // Keep buffer capped
  if (state.afterimageHistory.length > maxSamples) {
    state.afterimageHistory.splice(0, state.afterimageHistory.length - maxSamples);
  }
}

/**
 * Get a historical state snapshot at a specific delay in seconds.
 * Returns the closest recorded state to (now - delayMs).
 */
function getAfterimageState(state, delaySeconds, config) {
  if (!state.afterimageHistory || state.afterimageHistory.length === 0) return null;
  
  const history = state.afterimageHistory;
  const targetTime = Date.now() - (delaySeconds * 1000);
  
  // Binary search for closest timestamp
  let lo = 0, hi = history.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (history[mid].timestamp <= targetTime) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  
  return history[best] || null;
}

/**
 * Resolve attacks from all afterimages.
 * Afterimages mimic the real Dihui's attack state with a delay.
 * They deal damage, raise combo, use poise/crit, but:
 *  - Cannot be hit / inflict on-hit effects
 *  - No collision
 * 
 * @param {Object} state - Dihui's current state
 * @param {Object} config - Dihui config
 * @param {Array} enemies - Array of enemy states to check hits against
 * @param {Function} engineReference - Reference to gameplay engine methods (resolveAttack, calculateDamage, etc.)
 * @returns {Array} afterimageHitEvents - Events for broadcasting
 */
function resolveAfterimageAttacks(state, config, enemies, engineRef) {
  const events = [];
  if (!state.afterimageHistory || state.afterimageHistory.length === 0) return events;
  
  const afterimageConfig = config.superposedAfterimage;
  if (!afterimageConfig) return events;
  
  // Track per-afterimage the PREVIOUS strikeActive state.
  // We fire only on the RISING EDGE of strikeActive (false→true transition).
  // Afterimages that are in the same "active" state across multiple ticks
  // will only hit once when the strike first becomes active.
  if (!state._afterimagePrevStrikes) {
    state._afterimagePrevStrikes = [false, false, false];
  }
  
  const scConfig = afterimageConfig.colors; // color config (just for reference)
  
  // Check each afterimage
  for (let i = 0; i < afterimageConfig.count; i++) {
    const delay = (i + 1) * afterimageConfig.delayPerImage; // 0.5, 1.0, 1.5
    const histState = getAfterimageState(state, delay, config);
    
    if (!histState) continue;
    
    // Get the current strike-active state from this afterimage's historical view
    const currentStrike = histState.strikeActive && histState.isAttacking;
    const prevStrike = state._afterimagePrevStrikes[i];
    
    // Update the tracked previous state for next tick
    state._afterimagePrevStrikes[i] = currentStrike;
    
    // Only fire on the RISING EDGE: false → true transition
    if (!currentStrike || prevStrike) {
      continue;
    }
    
    // If prevStrike was false and currentStrike is true, we fire ONCE
    
    // The afterimage attacks using the delayed position and facing
    const atkPos = { x: histState.x, y: histState.y };
    const atkFacing = histState.facing;
    
    // Determine attack data based on the sequence from the historical state
    const attackKey = histState.attackSequence === 1 ? 'light' : 
                     histState.attackSequence === 2 ? 'medium' : 'heavy';
    const attackDef = config.attacks[attackKey];
    if (!attackDef) continue;
    
    // Check each enemy for hit
    enemies.forEach(enemy => {
      if (enemy.isDefeated) return;
      
      // Simple distance + facing check (same as GameplayEngine.checkAttackHit)
      const dx = Math.abs(atkPos.x - enemy.position.x);
      const dy = Math.abs(atkPos.y - enemy.position.y);
      const inRange = dx < attackDef.range && dy < 72;
      const inFront = atkFacing > 0 ? enemy.position.x > atkPos.x : enemy.position.x < atkPos.x;
      const behindGrace = Math.abs(atkPos.x - enemy.position.x) < attackDef.range * 0.3;
      
      if (!inRange) return;
      if (!inFront && !behindGrace) return;
      
      // Hit detected!
      let baseDamage = attackDef.damage || 1.0;
      
      // Knockback
      const knockback = attackDef.knockback || 0;
      const knockDir = enemy.position.x < atkPos.x ? -1 : 1;
      
      // Calculate damage with combo and poise/crit (same as real Dihui)
      // Combo bonus
      let d = baseDamage * (state.baseDamage || 5);
      const comboCount = engineRef.combatState?.[state.id]?.combo || 0;
      d += comboCount * 2; // COMBO_DAMAGE_PER_STACK from engine
      
      // Attack 3 bonus
      if (histState.attackSequence === 3) d *= 2;
      
      // Poise crit system
      let isCrit = false;
      const poise = getStatus(state, 'Poise');
      let critChance = 0;
      if (poise) critChance += 0.05 * poise.potency;
      if (critChance > 0 && Math.random() < critChance) {
        isCrit = true;
        d *= 1.5;
        // Consume 1 poise count
        if (poise) {
          poise.count -= 1;
          if (poise.count <= 0) removeStatus(state, 'Poise');
        }
      }
      
      // Stagger bonus
      if (enemy.state === 'staggered') d *= 2;
      
      const finalDamage = Math.floor(d);
      
      // Apply damage directly
      enemy.hp = Math.max(0, enemy.hp - finalDamage);
      
      // Apply stagger
      if (!enemy.isGuarding) {
        enemy.stagger += finalDamage * 1.2;
        const threshold = enemy.staggerThreshold || 1000;
        if (enemy.stagger >= threshold && enemy.state !== 'staggered') {
          enemy.state = 'staggered';
          enemy.staggerTimer = enemy.staggerDuration || 5;
          enemy.stagger = threshold;
        }
      }
      
      // Hit reaction
      if (enemy.state !== 'staggered') {
        enemy.state = 'hit';
        enemy.hitTimer = 0.18;
      }
      
      // Apply knockback
      if (knockback > 0) {
        const mult = (state.knockbackMultiplier) || 1.0;
        enemy.velocity.x = knockDir * knockback * 8 * mult;
        enemy.position.x = Math.max(60, Math.min(1400 - 60, enemy.position.x));
      }
      
      // Raise combo count for afterimage hits
      if (engineRef.addCombo) {
        engineRef.addCombo(state.id);
      }
      
      // Store hit event for broadcasting
      events.push({
        type: 'AFTERIMAGE_HIT',
        afterimageIndex: i,
        targetId: enemy.id,
        damage: finalDamage,
        knockback: knockback,
        isCrit: isCrit,
        defenderHp: enemy.hp,
        defeated: enemy.hp <= 0
      });
    });
  }
  
  return events;
}

//====================================================================
// PER-TICK SYSTEM UPDATES
//====================================================================
function updateSystems(state, dt, config) {
  const events = [];

  // Update shield system
  events.push(...updateShieldSystem(state, dt, config));

  // Consume excess Poise Potency (>20) to inflict Bladetrail Afterimage
  const poise = getStatus(state, 'Poise');
  if (poise && poise.potency > 20 && state.lastHitOpponent) {
    // This is handled in onReceiveHit - but also check periodically for passive overflow
    const excess = poise.potency - 20;
    poise.potency = 20;
    // The target is our lastHitOpponent for passive overflow
    const targetPlayer = state.lastHitOpponent;
    if (targetPlayer && typeof targetPlayer === 'object' && !targetPlayer.isDefeated) {
      ensureStatus(targetPlayer, 'Bladetrail Afterimage', excess, 0);
      events.push({ type: 'BLADETRAIL_AFTERIMAGE_INFLICTED', amount: excess });
    }
  }

  // 3. Update ultimate availability dynamically based on Dihui Star's Blade count
  const bladeStatus = getStatus(state, "Dihui Star's Blade");
  const bladeCount = bladeStatus ? bladeStatus.count : 0;
  const requiresBlade = config.dihuiBlade?.ultimateThreshold || 20;
  const wasAvailable = state.resources.ultimateAvailable;
  state.resources.ultimateAvailable = bladeCount >= requiresBlade;
  
  // If ultimate availability just transitioned, emit event
  if (state.resources.ultimateAvailable && !wasAvailable) {
    events.push({ type: 'ULTIMATE_AVAILABLE' });
  }

  return events;
}

//====================================================================
// DEATHEDGE - ABILITY
//====================================================================
/**
 * NEW IMPLEMENTATION per spec:
 * Range = from cast position to teleported position (horizontal only, ignore vertical)
 * Attack: [dhalt1 with [dline] >dhalt2 (hold 0.3s)]
 *   - Spawn 1 dline for every 10 [Bladetrail Afterimage] (rounded down) + 1 in the aoe
 *   - Inflict 1 [Bladetrail Afterimage] for every 5% missing hp on target
 *   - Consume up to 10 [Bladetrail Afterimage] and deal [Bladetrail Afterimage consumed] % of target max hp
 * 
 * This function is called from match.js _resolveDeathedgeExecution
 * with state, abilityConfig, targetState, config, and an extra 'options' param
 * that contains: castPosition, teleportPosition, baCountPreConsume
 */
function executeDeathedge(state, abilityConfig, targetState, config, options) {
  if (!targetState || targetState.isDefeated) {
    return { success: false, reason: 'No valid target' };
  }

  // --- Get Bladetrail Afterimage count on target before consumption ---
  const baCount = options?.baCountPreConsume ?? getStatusCount(targetState, 'Bladetrail Afterimage');
  
  // --- Consume up to 10 Bladetrail Afterimage ---
  const baToConsume = Math.min(baCount, 10);
  
  // Remove consumed Bladetrail Afterimage from target
  if (baToConsume > 0) {
    const baStatus = getStatus(targetState, 'Bladetrail Afterimage');
    if (baStatus) {
      baStatus.count = Math.max(0, (baStatus.count || 0) - baToConsume);
      if (baStatus.count <= 0) {
        removeStatus(targetState, 'Bladetrail Afterimage');
      }
    }
  }
  
  const baAfterConsume = getStatusCount(targetState, 'Bladetrail Afterimage');

  // --- Calculate range: horizontal distance between cast position and teleported position ---
  const castPos = options?.castPosition || state.position;
  const teleportPos = options?.teleportPosition || state.position;
  const attackRange = Math.abs(teleportPos.x - castPos.x);
  
  // Check if target is in range (horizontal only, ignore vertical)
  const targetInRange = Math.abs(targetState.position.x - teleportPos.x) <= attackRange;

  if (!targetInRange) {
    return {
      success: true,
      hit: false,
      reason: 'Target out of range',
      abilityId: 'deathedge',
      baConsumed: baToConsume,
      cooldown: abilityConfig.cooldown || 14
    };
  }

  // --- Inflict 1 [Bladetrail Afterimage] for every 5% missing hp on target ---
  const targetMissingHpPercent = 1 - (targetState.hp / targetState.maxHp);
  const baToInflict = Math.floor(targetMissingHpPercent / 0.05); // 1 per 5% missing hp
  if (baToInflict > 0) {
    ensureStatus(targetState, 'Bladetrail Afterimage', baToInflict, 0);
  }

  // --- Deal damage: [Bladetrail Afterimage consumed] % of target max hp ---
  const consumedPercentDamage = Math.floor(targetState.maxHp * (baToConsume / 100));
  
  // --- Base damage: +100% ---
  const baseDamage = abilityConfig.baseDamage || 2.0;
  let calculatedDamage = Math.floor(baseDamage * (state.baseDamage || 5));
  
  // Add consumed % of target max hp damage
  calculatedDamage += consumedPercentDamage;
  
  // Apply blade status damage bonus
  const bladeStatus = getStatus(state, "Dihui Star's Blade");
  const bladeDamageBonus = bladeStatus ? bladeStatus.count * (config.dihuiBlade.critDamagePerStack || 0.01) : 0;
  if (bladeDamageBonus > 0) {
    calculatedDamage = Math.floor(calculatedDamage * (1 + bladeDamageBonus));
  }

  // Apply damage
  targetState.hp = Math.max(0, targetState.hp - calculatedDamage);

  // Apply on-hit effects (inflict Bladetrail Afterimage from onSuccessfulHit, gain Poise Potency)
  const hitEffects = onSuccessfulHit(state, targetState, calculatedDamage, config);

  // --- Dline spawning calculations ---
  // Spawn 1 dline for every 10 [Bladetrail Afterimage] (rounded down) + 1
  const dlineCount = Math.floor(baAfterConsume / 10) + 1;

  return {
    success: true,
    abilityId: 'deathedge',
    ability: 'deathedge',
    hit: true,
    damage: calculatedDamage,
    targetHp: targetState.hp,
    dlineCount: dlineCount,
    baConsumed: baToConsume,
    baInflicted: baToInflict,
    baAfterConsume: baAfterConsume,
    targetId: targetState.id,
    defeated: targetState.hp <= 0,
    statusesApplied: hitEffects?.statusesApplied || [],
    cooldown: abilityConfig.cooldown || 14
  };
}

//====================================================================
// RESOURCE INITIALIZATION
//====================================================================
function initializeResources(state, config) {
  state.resources = state.resources || {};
  state.statuses = state.statuses || [];

  // Start with 0 Bladetrail Afterimage inflicted (tracked via Dihui Star's Blade status)
  // [Dihui Star's Blade] - unique status for tracking inflicted afterimages
  ensureStatus(state, "Dihui Star's Blade", 0, 0);

  // Initialize shield system
  state.resources.shieldHp = config.laceratingAfterimages.shieldMax;
  state.resources.shieldMax = config.laceratingAfterimages.shieldMax;
  state.resources.shieldRegenTimer = 0;
  state.resources.shieldBrokenTimer = 0;
  state.resources.shieldLastDamageTime = 0;
  state.resources.ultimateAvailable = false;

  return state.resources;
}

//====================================================================
// EXPORTS
//====================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    deathedge: executeDeathedge,
    executeDeathedge,
    onSuccessfulHit,
    onReceiveHit,
    applyAttack1Effects,
    applyAttack2Effects,
    applyAttack3Effects,
    updateSystems,
    calculateBladetrailDamageBonus,
    calculateMissingHpDamageBonus,
    applyShieldAbsorption,
    initializeResources,
    getStatus,
    getStatusPotency,
    getStatusCount,
    ensureStatus,
    removeStatus,
    // Superposed Afterimage exports
    initAfterimageHistory,
    recordAfterimageSnapshot,
    getAfterimageState,
    resolveAfterimageAttacks
  };
}
