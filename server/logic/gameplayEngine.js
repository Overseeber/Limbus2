/**
 * GAMEPLAY ENGINE - SERVER-SIDE AUTHORITY
 */

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 700;
const GRAVITY = 0.6;

// Combo system constants (matches OldClientGameplay feel)
const COMBO_DURATION = 1.4;        // Seconds before combo resets from inactivity
const COMBO_DAMAGE_PER_STACK = 2;  // Bonus damage per combo stack
const MAX_COMBO = 99;              // Maximum combo count

class GameplayEngine {
  constructor() {
    this.combatState = {};
    this.characterLogic = {};
    this.groundY = ARENA_HEIGHT - 100;
  }

  initializeCharacter(characterId, characterKey) {
    const config = this.getCharacterConfig(characterKey);
    if (!config) throw new Error(`Invalid character: ${characterKey}`);

    const state = {
      id: characterId, characterKey, hp: config.maxHp, maxHp: config.maxHp,
      baseDamage: config.baseDamage, speed: config.speed,
      knockbackMultiplier: config.knockbackMultiplier || 1.0, kbResist: 0.08,
      position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, facing: 1,
      onGround: true, canDash: true, dashCooldown: 0,
      isAttacking: false, isGuarding: false, isDashing: false,
      state: 'idle',
      // === STAGGER SYSTEM (authoritative) ===
      stagger: 0,                    // Current stagger buildup
      staggerThreshold: config.staggerThreshold || 1000,  // Stagger threshold
      staggerTimer: 0,               // Timer for active stagger duration
      staggerRecoveryTimer: 0,       // Delay before stagger recovery begins
      staggerRecoveryRate: config.staggerRecoveryRate || 12,  // Decay rate per second
      staggerRecoveryDelay: config.staggerRecoveryDelay || 2.0, // Recovery delay in seconds
      staggerDuration: 0,            // Total stagger duration when staggered
      // ==========================
      isDefeated: false,
      attackCooldown: 0, abilityCooldowns: {}, statuses: [],
      combo: 0, comboTimer: 0, attackCounter: 0, resources: {}
    };
    this.initializeCharacterResources(state, characterKey, config);
    Object.keys(config.abilities || {}).forEach(a => { state.abilityCooldowns[a] = 0; });
    this.combatState[characterId] = { combo: 0, comboTimer: 0, attackCounter: 0, chargeAttack: false, lastAttackHit: false, hitTargetsThisAttack: [] };
    return state;
  }

  resetHitTargets(id) { const s = this.combatState[id]; if (s) s.hitTargetsThisAttack = []; }
  hasHitTargetThisAttack(id, tid) { const s = this.combatState[id]; return s && s.hitTargetsThisAttack.includes(tid); }
  markHitTarget(id, tid) { const s = this.combatState[id]; if (s) s.hitTargetsThisAttack.push(tid); }

  initializeCharacterResources(state, characterKey, config) {
    if (characterKey === 'CALLISTO') {
      state.resources = { corpusIngredient: 0, maxCorpusIngredient: config.corpusIngredient.max, artworkTibiaStacks: 0, corpusSpentTotal: 0, slamCooldownActive: false, slamBuffActive: false };
    } else if (characterKey === 'VALENCINA') {
      const valencinaLogic = require('./characterLogic/valencina');
      state.resources = {};
      valencinaLogic.initializeResources(state, config);
    }
  }

  getCharacterConfig(key) { try { return require(`../../shared/characters/${key.toLowerCase()}`); } catch(e) { return null; } }

  calcAttackBox(pos, facing, range) { return { x: pos.x + facing * (range / 2), y: pos.y - 28, w: range, h: 70 }; }
  getPlayerBox(pos) { return { x: pos.x - 25, y: pos.y - 36, w: 50, h: 72 }; }
  hitOpponent(box, dPos, cd) { return this.checkRectOverlap(this.getPlayerBox(dPos), { x: box.x - box.w / 2, y: box.y, w: box.w, h: box.h }) && !cd; }
  checkRectOverlap(r1, r2) { return !(r1.x + r1.w < r2.x || r2.x + r2.w < r1.x || r1.y + r1.h < r2.y || r2.y + r2.h < r1.y); }
  
  checkHit(aPos, tPos, range, facing) {
    const dist = Math.hypot(aPos.x - tPos.x, aPos.y - tPos.y);
    if (dist > range) return false;
    const inFront = facing > 0 ? tPos.x > aPos.x : tPos.x < aPos.x;
    return inFront || (!inFront && Math.abs(aPos.x - tPos.x) < range * 0.3);
  }

  checkCircleHit(aPos, dPos, radius, cd) {
    return Math.hypot(aPos.x - dPos.x, aPos.y - dPos.y) <= radius && !cd;
  }

  checkAttackHit(aPos, dPos, range, facing, cd, hitArea = 'box') {
    if (hitArea === 'circle') {
      return { hit: this.checkCircleHit(aPos, dPos, range, cd > 0), distance: Math.hypot(aPos.x - dPos.x, aPos.y - dPos.y) };
    }
    return { hit: this.hitOpponent(this.calcAttackBox(aPos, facing, range), dPos, cd > 0), distance: Math.hypot(aPos.x - dPos.x, 0) };
  }

  calculateDamage(base, attacker, defender) {
    let d = base * (attacker.baseDamage || 1);
    const cs = this.combatState[attacker.id] || {};
    
    // VALENCINA: Use custom formula: Damage = BaseDamage + (ComboDamage × ComboCount)
    if (attacker.characterKey === 'VALENCINA') {
      const comboCount = cs.combo || 0;
      const comboDamage = 3; // From oldclientgameplay reference
      d = (attacker.baseDamage || 21) + (comboDamage * comboCount);
    } else {
      d += (cs.combo || 0) * COMBO_DAMAGE_PER_STACK;
    }
    
    if (cs.attackCounter === 3) d *= 2;
    if (cs.chargeAttack) d *= 1.4;
    // DOUBLE DAMAGE while staggered (authoritative server-side)
    if (defender.state === 'staggered') d *= 2;
    if (attacker.characterKey === 'CALLISTO' && attacker.resources.artworkTibiaStacks > 0) d *= 1 + 0.1 * attacker.resources.artworkTibiaStacks;
    // Sinking on attacker: lose 1% damage dealt per potency
    if (this.hasStatus(attacker, 'Sinking')) { const s = this.getStatus(attacker, 'Sinking'); d *= Math.max(0.5, 1 - 0.01 * s.potency); }
    // Fragile on defender: take 10% more damage per potency stack
    if (this.hasStatus(defender, 'Fragile')) { const s = this.getStatus(defender, 'Fragile'); d *= 1 + 0.1 * s.potency; }
    // Protection on defender: take 10% less damage per potency stack
    if (this.hasStatus(defender, 'Protection')) { const s = this.getStatus(defender, 'Protection'); d *= Math.max(0.1, 1 - 0.1 * s.potency); }
    // Sinking on defender: lose 5% damage resistance per 5 potency (take MORE damage)
    if (this.hasStatus(defender, 'Sinking')) { const s = this.getStatus(defender, 'Sinking'); d *= 1 + 0.05 * Math.floor(s.potency / 5); }
    // Poise crit system: +5% crit chance per potency, on crit multiply damage x1.5
    const critResult = this.rollCrit(attacker);
    if (critResult.isCrit) d *= 1.5;
    return { damage: Math.floor(d), isCrit: critResult.isCrit };
  }

  calculateKnockback(base, attacker) { return Math.floor(Math.max(0, base) * (attacker.knockbackMultiplier || 1.0)); }

  applyKnockback(fighter, knockback, direction, attacker) {
    if (knockback <= 0) return;
    const mult = (attacker && attacker.knockbackMultiplier) || 1.0;
    // Horizontal knockback only - NO vertical pop to prevent upward drifting at 20tps
    // At 20tps, even tiny upward velocity creates visible drift before gravity catches it
    fighter.velocity.x = direction * knockback * 8 * mult;
    // Don't set onGround=false unless we actually pop up
    // This keeps gravity working on the ground plane and prevents cumulative floating
    fighter.position.x = Math.max(60, Math.min(ARENA_WIDTH - 60, fighter.position.x));
  }

  /**
   * Authoritative stagger application
   * Adds stagger buildup, checks threshold, emits events
   * @returns {{ staggered: boolean, duration: number, events: Array, stagger: number }}
   */
  applyStagger(fighter, amount, config) {
    const events = [];
    const threshold = config.staggerThreshold || fighter.staggerThreshold || 1000;
    const length = config.staggerLength || 5;
    
    fighter.stagger += amount;
    
    // Clamp stagger to 0..threshold (never exceed threshold when not staggered)
    if (fighter.stagger > threshold && fighter.state !== 'staggered') {
      fighter.stagger = threshold;
    }
    
    // Reset recovery timer when taking stagger damage - recovery only starts after delay
    fighter.staggerRecoveryTimer = config.staggerRecoveryDelay || fighter.staggerRecoveryDelay || 2.0;
    
    // Check if stagger threshold reached
    if (fighter.stagger >= threshold && fighter.state !== 'staggered') {
      // Enter staggered state
      fighter.state = 'staggered';
      fighter.staggerTimer = length;
      fighter.staggerDuration = length;
      fighter.stagger = threshold; // Set to exactly threshold
      fighter.staggerRecoveryTimer = 0; // Reset recovery when entering stagger
      
      // Tremor: consume on burst (stagger threshold reached) - original game behavior
      const tremorEvents = this.consumeTremor(fighter, config);
      
      events.push({ type: 'STAGGER_START', duration: length });
      
      return { staggered: true, duration: length, events, tremorEvents };
    }
    
    events.push({ type: 'STAGGER_INCREASE', amount: amount, stagger: fighter.stagger });
    return { staggered: false, stagger: fighter.stagger, events };
  }

  /**
   * Authoritative stagger state machine update
   * Called each server tick with authoritative dt
   * 
   * Three phases:
   * 1. ACTIVE STAGGER - fighter is locked, timer counts down
   * 2. RECOVERY DELAY - stagger exits but buildup still decays slowly
   * 3. CONTINUOUS DECAY - normal passive decay
   * 
   * @returns {{ state: string, stagger: number, phase: string, events: Array }}
   */
  updateStagger(fighter, dt, config) {
    const events = [];
    const threshold = config.staggerThreshold || fighter.staggerThreshold || 1000;
    const length = config.staggerLength || fighter.staggerDuration || 5;
    const recoveryDelay = config.staggerRecoveryDelay || fighter.staggerRecoveryDelay || 2.0;
    const recoveryRate = config.staggerRecoveryRate || fighter.staggerRecoveryRate || 12;
    
    // PHASE 1: ACTIVE STAGGER - Fighter is completely locked, timer counts down
    if (fighter.state === 'staggered' && fighter.staggerTimer > 0) {
      fighter.staggerTimer -= dt;
      
      if (fighter.staggerTimer <= 0) {
        // Stagger active duration expired - RESET stagger to 0 and enter recovery delay phase
        fighter.staggerTimer = 0;
        fighter.stagger = 0; // RESET stagger to 0 - must build up again
        fighter.staggerRecoveryTimer = recoveryDelay * 0.5; // Shorter recovery delay after reset
        
        // Emit stagger end event
        events.push({ type: 'STAGGER_END' });
        
        return { state: 'staggered', stagger: 0, phase: 'active_end', events };
      }
      
      return { state: 'staggered', stagger: fighter.stagger, phase: 'active', events };
    }
    
    // PHASE 2: RECOVERY DELAY - Exiting stagger, slow decay before normal recovery
    if (fighter.staggerRecoveryTimer > 0) {
      fighter.staggerRecoveryTimer -= dt;
      
      // During delay, stagger decays very slowly
      const delayRecoveryRate = recoveryRate * 0.2; // 20% of normal recovery during delay
      fighter.stagger = Math.max(0, fighter.stagger - delayRecoveryRate * dt);
      
      // When delay expires, fighter returns to idle
      if (fighter.staggerRecoveryTimer <= 0) {
        fighter.staggerRecoveryTimer = 0;
        // Exit staggered state if still in it
        if (fighter.state === 'staggered') {
          fighter.state = 'idle';
          events.push({ type: 'STAGGER_EXIT', reason: 'recovery_delay_expired' });
        }
        return { state: 'idle', stagger: fighter.stagger, phase: 'recovered', events };
      }
      
      // Fighter was in staggered state, transitioning to idle during recovery
      if (fighter.state === 'staggered') {
        fighter.state = 'idle';
        events.push({ type: 'STAGGER_EXIT', reason: 'recovery_began' });
      }
      
      return { state: 'idle', stagger: fighter.stagger, phase: 'recovery_delay', events };
    }
    
    // PHASE 3: CONTINUOUS DECAY - Stagger decreases passively over time
    if (fighter.stagger > 0) {
      fighter.stagger = Math.max(0, fighter.stagger - recoveryRate * dt);
    }
    
    return { state: fighter.state, stagger: fighter.stagger, phase: 'decay', events };
  }

  applyStatus(target, type, count, potency, duration) {
    const existing = target.statuses.find(s => s.type === type);
    if (existing) { 
      existing.count = (existing.count || 0) + (count || 1); 
      existing.potency = (existing.potency || 0) + (potency || 0); 
      if (typeof duration === 'number') existing.remainingTime = duration;
      if (typeof duration === 'number') existing.duration = duration;
      return { type: 'STATUS_APPLIED', statusType: type, count: existing.count, potency: existing.potency, updated: true }; 
    }
    const status = { type, count: count || 1, potency: potency || 0, timer: 0 };
    if (typeof duration === 'number') {
      status.remainingTime = duration;
      status.duration = duration;
    }
    target.statuses.push(status);
    return { type: 'STATUS_APPLIED', statusType: type, count: status.count, potency: status.potency, applied: true };
  }

  processStatuses(fighter, dt) {
    const events = [];
    fighter.statuses = fighter.statuses.filter(s => {
      switch (s.type) {
        case 'Burn':
          s.timer += dt;
          if (s.timer >= 1) {
            s.timer = 0;
            s.count -= 1;
            fighter.hp = Math.max(0, fighter.hp - s.potency);
            events.push({ type: 'STATUS_DAMAGE', statusType: 'Burn', damage: s.potency, hp: fighter.hp });
          }
          if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: 'Burn' }); return false; }
          return true;
        case 'Bleed':
          s.timer += dt;
          if (s.timer >= 1) {
            s.timer = 0;
            s.potency = Math.max(0, s.potency - 1);
          }
          if (s.potency <= 0 || s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: 'Bleed' }); return false; }
          return true;
        case 'Tremor':
          if (s.count <= 0) {
            // Tremor burst: add potency to stagger
            fighter.stagger += s.potency;
            events.push({ type: 'STAGGER_INCREASE', statusType: 'Tremor', amount: s.potency, stagger: fighter.stagger });
            // Check if tremor burst triggers stagger
            const threshold = fighter.staggerThreshold || 1000;
            if (fighter.stagger >= threshold && fighter.state !== 'staggered') {
              fighter.state = 'staggered';
              fighter.staggerTimer = 5;
              fighter.staggerDuration = 5;
              fighter.stagger = threshold;
              fighter.staggerRecoveryTimer = 0;
              events.push({ type: 'STAGGER_START', duration: 5 });
            }
            events.push({ type: 'STATUS_EXPIRED', statusType: 'Tremor' });
            return false;
          }
          return true;
        case 'Rupture':
          if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: 'Rupture' }); return false; }
          return true;
        case 'Sinking':
          s.timer += dt;
          if (typeof s.remainingTime === 'number') {
            s.remainingTime -= dt;
            if (s.remainingTime <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: 'Sinking' }); return false; }
          }
          if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: 'Sinking' }); return false; }
          return true;
        case 'Charge':
          if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: 'Charge' }); return false; }
          return true;
        case 'Poise':
          if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: 'Poise' }); return false; }
          return true;
        case 'Fragile':
        case 'Protection':
          if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: s.type }); return false; }
          return true;
        case 'Haste':
        case 'Bind':
        case 'Game Target':
          s.timer += dt;
          if (typeof s.remainingTime === 'number') {
            s.remainingTime -= dt;
            if (s.remainingTime <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: s.type }); return false; }
          }
          if (typeof s.duration === 'number' && s.timer >= s.duration) { events.push({ type: 'STATUS_EXPIRED', statusType: s.type }); return false; }
          if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: s.type }); return false; }
          return true;
        case 'Precognition':
        case 'Overheat':
        case 'Acceleration Round':
        case 'Shin (心) - Valencina':
          // Unique passive statuses should only expire by explicit count depletion,
          // not by generic duration/timer decay.
          return s.count > 0;
        default:
          s.timer += dt;
          if (typeof s.remainingTime === 'number') {
            s.remainingTime -= dt;
            if (s.remainingTime <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: s.type }); return false; }
          }
          if (typeof s.duration !== 'number') {
            // Preserve non-time-based statuses indefinitely unless their count drops to zero.
            if (s.count <= 0) { events.push({ type: 'STATUS_EXPIRED', statusType: s.type }); return false; }
            return true;
          }
          const maxDuration = s.duration;
          if (s.count <= 0 || s.timer >= maxDuration) { events.push({ type: 'STATUS_EXPIRED', statusType: s.type }); return false; }
          return true;
      }
    });
    if (fighter.hp <= 0 && !fighter.isDefeated) {
      fighter.isDefeated = true;
      fighter.velocity.x = 0;
      fighter.velocity.y = 0;
      fighter.state = 'defeated';
      events.push({ type: 'DEFEATED' });
    }
    return events;
  }

  consumeBleedOnAttack(fighter) {
    const events = [];
    const bleed = fighter.statuses.find(s => s.type === 'Bleed');
    if (bleed && bleed.potency > 0) {
      const d = bleed.potency;
      fighter.hp = Math.max(0, fighter.hp - d);
      events.push({ type: 'STATUS_DAMAGE', statusType: 'Bleed', damage: d, trigger: 'attack' });
      bleed.count -= 1;
      if (bleed.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Bleed');
        events.push({ type: 'STATUS_EXPIRED', statusType: 'Bleed' });
      }
    }
    if (fighter.hp <= 0 && !fighter.isDefeated) {
      fighter.isDefeated = true; fighter.velocity.x = 0; fighter.velocity.y = 0; fighter.state = 'defeated';
      events.push({ type: 'DEFEATED' });
    }
    return events;
  }

  consumeOnHit(fighter) {
    const events = [];

    const bleed = fighter.statuses.find(s => s.type === 'Bleed');
    if (bleed) {
      bleed.count -= 1;
      events.push({ type: 'STATUS_CONSUMED', statusType: 'Bleed', remaining: bleed.count });
      if (bleed.count <= 0) {
        const damage = bleed.potency || 0;
        if (damage > 0) {
          fighter.hp = Math.max(0, fighter.hp - damage);
          events.push({ type: 'STATUS_DAMAGE', statusType: 'Bleed', damage: damage, trigger: 'hit' });
        }
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Bleed');
        events.push({ type: 'STATUS_EXPIRED', statusType: 'Bleed' });
      }
    }

    const rupture = fighter.statuses.find(s => s.type === 'Rupture');
    if (rupture) {
      rupture.count -= 1;
      const damage = rupture.potency || 0;
      if (damage > 0) {
        fighter.hp = Math.max(0, fighter.hp - damage);
        events.push({ type: 'STATUS_DAMAGE', statusType: 'Rupture', damage: damage, trigger: 'hit' });
      }
      events.push({ type: 'STATUS_CONSUMED', statusType: 'Rupture', remaining: rupture.count });
      if (rupture.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Rupture');
        events.push({ type: 'STATUS_EXPIRED', statusType: 'Rupture' });
      }
    }

    const sinking = fighter.statuses.find(s => s.type === 'Sinking');
    if (sinking) {
      sinking.count -= 1;
      events.push({ type: 'STATUS_CONSUMED', statusType: 'Sinking', remaining: sinking.count });
      if (sinking.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Sinking');
        events.push({ type: 'STATUS_EXPIRED', statusType: 'Sinking' });
      }
    }

    if (fighter.hp <= 0 && !fighter.isDefeated) {
      fighter.isDefeated = true; fighter.velocity.x = 0; fighter.velocity.y = 0; fighter.state = 'defeated';
      events.push({ type: 'DEFEATED' });
    }
    return events;
  }

  addCombo(id) {
    const s = this.combatState[id];
    if (!s) return 0;
    s.combo = Math.min((s.combo || 0) + 1, MAX_COMBO);
    s.comboTimer = COMBO_DURATION;
    s.lastAttackHit = true;
    return s.combo;
  }

  resetCombo(id) {
    const s = this.combatState[id];
    if (!s) return;
    s.combo = 0;
    s.comboTimer = 0;
  }

  updateCombos(dt) {
    Object.values(this.combatState).forEach(s => {
      if (s.comboTimer > 0) {
        s.comboTimer -= dt;
        if (s.comboTimer <= 0) {
          s.combo = 0;
          s.comboTimer = 0;
        }
      }
    });
  }
  incrementAttackCounter(id) { const s = this.combatState[id]; if (!s) return 0; s.attackCounter = Math.min(3, (s.attackCounter || 0) + 1); return s.attackCounter; }

  applyGravity(fighter) {
    if (fighter.position.y < this.groundY) fighter.velocity.y += GRAVITY;
    fighter.position.y += fighter.velocity.y;
    if (fighter.position.y >= this.groundY) { fighter.position.y = this.groundY; fighter.velocity.y = 0; }
  }

  validateMovement(fighter, v) {
    const nx = fighter.position.x + v.x;
    if (nx < 60 || nx > ARENA_WIDTH - 60) return { valid: false, reason: 'BOUNDARY', clampedX: Math.max(60, Math.min(ARENA_WIDTH - 60, nx)) };
    if (Math.abs(v.x) > (fighter.speed || 9) * 1.5) return { valid: false, reason: 'SPEED_EXCEEDED' };
    return { valid: true, x: nx, y: fighter.position.y + v.y };
  }

  executeAbility(state, name, targetId, targetState) {
    const config = this.getCharacterConfig(state.characterKey);
    const ac = config.abilities[name];
    if (!ac) return { success: false, reason: 'Invalid ability' };
    if (state.abilityCooldowns[name] > 0) return { success: false, reason: 'Cooldown', remaining: state.abilityCooldowns[name] };
    if (state.isDefeated || state.state === 'staggered') return { success: false, reason: 'Cannot act' };
    const v = this.validateCharacterAbility(state, name, ac, config);
    if (!v.success) return v;
    const r = this.executeCharacterAbility(state, name, ac, targetState, config);
    if (r.success) state.abilityCooldowns[name] = ac.cooldown;
    return r;
  }

  validateCharacterAbility(state, name, ac, config) {
    if (state.characterKey === 'CALLISTO' && name === 'installationArt') {
      const cost = config.abilities.installationArt.corpusCost;
      if (state.resources.corpusIngredient < cost) return { success: false, reason: 'Not enough Corpus', current: state.resources.corpusIngredient, required: cost };
    }
    if (state.characterKey === 'VALENCINA' && name === 'timeToHunt') {
      // Time to Hunt no longer requires Precognition (restored from reference)
      // Check cooldown only - handled by executeAbility
      return { success: true };
    }
    return { success: true };
  }

  executeCharacterAbility(state, name, ac, targetState, config) {
    try { const logic = require(`./characterLogic/${state.characterKey.toLowerCase()}`); const h = logic[name]; if (h) return h.call(this, state, ac, targetState, config); } catch(e) {}
    return { success: false, reason: 'No handler' };
  }

  callOnSuccessfulHit(attacker, defender, damage) {
    if (!attacker.characterKey) return null;
    try {
      const logic = require(`./characterLogic/${attacker.characterKey.toLowerCase()}`);
      if (logic.onSuccessfulHit) {
        const config = this.getCharacterConfig(attacker.characterKey);
        return logic.onSuccessfulHit.call(this, attacker, defender, damage, config);
      }
    } catch(e) {}
    return null;
  }

  applyDamage(target, damage) {
    if (target.isDefeated) return { success: false, reason: 'Defeated' };
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) { target.isDefeated = true; target.velocity.x = 0; target.velocity.y = 0; return { success: true, damage, defeated: true, finalHp: 0 }; }
    return { success: true, damage, defeated: false, finalHp: target.hp };
  }

  /**
   * Authoritative attack resolution with full stagger integration
   * 
   * Stagger buildup = damage * 1.2 (original game behavior)
   * Taking damage resets recovery timer
   * Double damage while staggered is in calculateDamage
   */
  resolveAttack(attacker, defender, attackData, config) {
    const result = { success: false, hit: false, damage: 0, knockback: 0, staggerResult: null, statuses: [], defenderHp: defender.hp, defeated: false, wasGuarded: false, staggerEvents: [] };
    const range = attackData.range || 100;
    const attackRange = attackData.hitArea === 'circle' ? range : (attackData.isDashAttack ? range * 1.5 : range);
    const hit = this.checkAttackHit(attacker.position, defender.position, attackRange, attacker.facing, defender.hitCooldown || 0, attackData.hitArea);
    if (!hit.hit) { result.reason = 'Missed'; return result; }
    result.hit = true;

    // VALENCINA: Check Precognition passive evade before resolving damage
    // If defender has [Precognition] status, check for evade (3% x count, max 90%)
    if (defender.characterKey === 'VALENCINA') {
      try {
        const valencinaLogic = require('./characterLogic/valencina');
        if (valencinaLogic.checkPrecognitionEvade(defender)) {
          // Evaded! Return with hit=true but no damage
          result.evaded = true;
          result.evadeReason = 'PRECOGNITION_EVADE';
          return result;
        }
      } catch(e) {}
    }

    let base = attackData.baseDamage || attacker.baseDamage, knock = attackData.knockback || 0;
    if (defender.isGuarding) { base *= 0.5; knock = Math.floor(knock * 0.5); result.wasGuarded = true; }

    const dmgResult = this.calculateDamage(base, attacker, defender);
    const ap = this.applyDamage(defender, dmgResult.damage);
    result.damage = ap.damage; result.defenderHp = defender.hp; result.defeated = ap.defeated;
    result.isCrit = dmgResult.isCrit;

    // Reset defender's combo when they get hit (getting hit breaks offensive momentum)
    this.resetCombo(defender.id);

    // Set hit state only if not staggered (staggered state takes priority)
    if (defender.state !== 'staggered') { defender.state = 'hit'; defender.hitTimer = 0.18; }
    
    // Apply knockback
    if (knock) { const dir = defender.position.x < attacker.position.x ? -1 : 1; const fk = this.calculateKnockback(knock, attacker); this.applyKnockback(defender, fk, dir, attacker); result.knockback = fk; }
    
    // STAGGER SYSTEM: Buildup is based on ACTUAL DAMAGE TAKEN * 1.2 (original game)
    // When guarding, no stagger is applied (guarded hits don't build stagger)
    if (!result.wasGuarded) {
      const staggerBuildup = Math.floor(result.damage * 1.2);
      defender.stagger += staggerBuildup;
      
      // RESET recovery timer when taking damage - recovery only starts after delay expires
      // This is critical: every hit resets the recovery process
      const recoveryDelay = config.staggerRecoveryDelay || defender.staggerRecoveryDelay || 2.0;
      defender.staggerRecoveryTimer = recoveryDelay;
      
      // Clamp stagger to 0..threshold (never exceed threshold unless staggered)
      const threshold = config.staggerThreshold || defender.staggerThreshold || 1000;
      if (defender.stagger > threshold && defender.state !== 'staggered') {
        defender.stagger = threshold;
      }
      
      result.staggerResult = { staggered: false, stagger: defender.stagger };
      
      // Check if stagger threshold reached
      if (defender.stagger >= threshold && defender.state !== 'staggered') {
        const length = config.staggerLength || defender.staggerDuration || 5;
        defender.state = 'staggered';
        defender.staggerTimer = length;
        defender.staggerDuration = length;
        defender.stagger = threshold;
        defender.staggerRecoveryTimer = 0; // Reset recovery when entering stagger
        
        // Emit stagger start event
        result.staggerEvents.push({ type: 'STAGGER_START', targetId: defender.id, duration: length });
        result.staggerResult = { staggered: true, duration: length };
        
        // Tremor: consume on burst (stagger threshold reached)
        const tremorEvents = this.consumeTremor(defender, config);
        if (tremorEvents.length) result.staggerEvents = result.staggerEvents.concat(tremorEvents);
      } else {
        result.staggerEvents.push({ type: 'STAGGER_INCREASE', targetId: defender.id, amount: staggerBuildup });
      }
    }
    
    // Apply status effects from attack
    if (attackData.statusEffects) attackData.statusEffects.forEach(s => { this.applyStatus(defender, s.type, s.count, s.potency); result.statuses.push(s.type); });
    
    // Call character-specific onSuccessfulHit for per-hit status application
    const hitEffects = this.callOnSuccessfulHit(attacker, defender, result.damage, config);
    if (hitEffects) {
      if (hitEffects.statusesApplied) hitEffects.statusesApplied.forEach(s => result.statuses.push(s));
      else if (hitEffects.statusApplied) result.statuses.push(hitEffects.statusApplied);
    }
    
    // Consume status effects on hit
    const ce = this.consumeOnHit(defender); if (ce.length) result.consumeEvents = ce;
    const be = this.consumeBleedOnAttack(attacker); if (be.length) result.bleedAttackEvents = be;
    
    // Track charge attack and combo
    const cs = this.combatState[attacker.id] || {}; cs.chargeAttack = !!attackData.chargeAttack; this.combatState[attacker.id] = cs;
    this.addCombo(attacker.id); this.incrementAttackCounter(attacker.id);
    result.chargeAttack = cs.chargeAttack; result.success = true;
    return result;
  }

  updateCooldowns(state, dt) { Object.keys(state.abilityCooldowns).forEach(a => { if (state.abilityCooldowns[a] > 0) state.abilityCooldowns[a] -= dt; }); }

  updateFighter(state, dt, config, playerInput) {
    const events = [];
    this.updateCooldowns(state, dt);
    // Handle hurt/stun state: allow any player input to exit hit early.
    if (state.state === 'hit') {
      const inputReceived = playerInput && (
        playerInput.left || playerInput.right || playerInput.up || playerInput.down ||
        playerInput.attack || playerInput.attackPressed || playerInput.attackReleased ||
        playerInput.guard || playerInput.dash || playerInput.slam || playerInput.evade ||
        playerInput.abilityQ || playerInput.abilityX
      );
      if (inputReceived) {
        state.state = 'idle';
        state.hitTimer = 0;
        events.push({ type: 'STATE_CHANGE', from: 'hit', to: 'idle' });
      } else {
        // Hold hit state until the player provides input.
        // Do not auto-transition out of hit by timer expiration.
        state.hitTimer = Math.max(0, (state.hitTimer || 0) - dt);
      }
    }
    // Update stagger state machine (handles all three phases)
    const su = this.updateStagger(state, dt, config);
    if (su.events && su.events.length) {
      su.events.forEach(ev => events.push(ev));
    }
    if (su.state !== state.state && su.state) {
      events.push({ type: 'STATE_CHANGE', from: state.state, to: su.state });
    }
    events.push(...this.processStatuses(state, dt));
    events.push(...this.updateCharacterSystems(state, dt));
    return events;
  }

  updateCharacterSystems(state, dt) {
    if (state.characterKey === 'CALLISTO') return this.updateCallistoSystems(state, dt);
    if (state.characterKey === 'VALENCINA') return this.updateValencinaSystems(state, dt);
    return [];
  }

  updateCallistoSystems(state, dt) {
    const e = [];
    if (state.resources.corpusIngredient < state.resources.maxCorpusIngredient) state.resources.corpusIngredient = Math.min(state.resources.maxCorpusIngredient, state.resources.corpusIngredient + 5 * dt);
    if (state.resources.slamBuffActive) { state.resources.slamBuffTimer -= dt; if (state.resources.slamBuffTimer <= 0) { state.resources.slamBuffActive = false; e.push({ type: 'SLAM_BUFF_EXPIRED' }); } }
    return e;
  }

  updateValencinaSystems(state, dt) {
    try {
      const valencinaLogic = require('./characterLogic/valencina');
      const config = this.getCharacterConfig('VALENCINA');
      if (!config) return [];
      return valencinaLogic.updateSystems(state, dt, config);
    } catch (e) {
      // Fallback if module not available
      return [];
    }
  }

  rollCrit(attacker) {
    let critChance = 0;
    const poise = this.getStatus(attacker, 'Poise');
    if (poise) critChance += 0.05 * poise.potency;
    if (critChance <= 0) return { isCrit: false };
    const roll = Math.random();
    const isCrit = roll < critChance;
    if (isCrit && poise) {
      poise.count -= 1;
      if (poise.count <= 0) attacker.statuses = attacker.statuses.filter(s => s.type !== 'Poise');
    }
    return { isCrit, critChance };
  }

  consumeBleedOnAbility(fighter) {
    const events = [];
    const bleed = fighter.statuses.find(s => s.type === 'Bleed');
    if (bleed && bleed.potency > 0) {
      const d = bleed.potency;
      fighter.hp = Math.max(0, fighter.hp - d);
      events.push({ type: 'STATUS_DAMAGE', statusType: 'Bleed', damage: d, trigger: 'ability' });
      bleed.count -= 1;
      if (bleed.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Bleed');
        events.push({ type: 'STATUS_EXPIRED', statusType: 'Bleed' });
      }
    }
    if (fighter.hp <= 0 && !fighter.isDefeated) {
      fighter.isDefeated = true; fighter.velocity.x = 0; fighter.velocity.y = 0; fighter.state = 'defeated';
      events.push({ type: 'DEFEATED' });
    }
    return events;
  }

  consumeCharge(fighter) {
    const events = [];
    const charge = fighter.statuses.find(s => s.type === 'Charge');
    if (charge) {
      charge.count -= 1;
      events.push({ type: 'STATUS_CONSUMED', statusType: 'Charge', remaining: charge.count });
      if (charge.count <= 0) {
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Charge');
        events.push({ type: 'STATUS_EXPIRED', statusType: 'Charge' });
      }
    }
    return events;
  }

  /**
   * Consume Tremor status on stagger burst
   * Tremor adds its potency to stagger when consumed
   * If this pushes stagger to threshold, triggers stagger
   */
  consumeTremor(fighter, config) {
    const events = [];
    const tremor = fighter.statuses.find(s => s.type === 'Tremor');
    if (tremor) {
      tremor.count -= 1;
      events.push({ type: 'STATUS_CONSUMED', statusType: 'Tremor', remaining: tremor.count });
      if (tremor.count <= 0) {
        // Add tremor potency to stagger
        fighter.stagger += tremor.potency;
        events.push({ type: 'STAGGER_INCREASE', statusType: 'Tremor', amount: tremor.potency, stagger: fighter.stagger });
        
        // Check if tremor burst triggers stagger
        const threshold = config.staggerThreshold || fighter.staggerThreshold || 1000;
        if (fighter.stagger >= threshold && fighter.state !== 'staggered') {
          const length = config.staggerLength || fighter.staggerDuration || 5;
          fighter.state = 'staggered';
          fighter.staggerTimer = length;
          fighter.staggerDuration = length;
          fighter.stagger = threshold;
          fighter.staggerRecoveryTimer = 0;
          events.push({ type: 'STAGGER_START', duration: length });
        }
        
        fighter.statuses = fighter.statuses.filter(s => s.type !== 'Tremor');
        events.push({ type: 'STATUS_EXPIRED', statusType: 'Tremor' });
      }
    }
    return events;
  }

  hasStatus(f, t) { return f.statuses && f.statuses.some(s => s.type === t); }
  getStatus(f, t) { return f.statuses && f.statuses.find(s => s.type === t); }
  removeStatus(f, t) { f.statuses = f.statuses.filter(s => s.type !== t); }
  isDefeated(s) { return s.hp <= 0; }

  getStateSnapshot(state) {
    return { 
      id: state.id, characterKey: state.characterKey, hp: state.hp, maxHp: state.maxHp, 
      position: { ...state.position }, velocity: { ...state.velocity }, facing: state.facing, 
      state: state.state, 
      // Full stagger snapshot data
      stagger: state.stagger, 
      staggerThreshold: state.staggerThreshold,
      staggerTimer: state.staggerTimer,
      staggerRecoveryTimer: state.staggerRecoveryTimer,
      staggerDuration: state.staggerDuration,
      isDefeated: state.isDefeated, statuses: state.statuses.map(s => ({ ...s })), 
      resources: { ...state.resources }, abilityCooldowns: { ...state.abilityCooldowns } 
    };
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = GameplayEngine;