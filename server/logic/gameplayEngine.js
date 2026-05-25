/**
 * GAMEPLAY ENGINE - SERVER-SIDE AUTHORITY
 */

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 700;
const GRAVITY = 0.6;

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
      state: 'idle', stagger: 0, staggerTimer: 0, staggerRecoveryTimer: 0, isDefeated: false,
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
      state.resources = { accelerationRounds: 0, maxAccelerationRounds: config.accelerationRounds.max, precognition: config.precognition.startingValue, maxPrecognition: config.precognition.max, overheat: 0, maxOverheat: config.overheat.max, shinActive: false };
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

  checkAttackHit(aPos, dPos, range, facing, cd) {
    return { hit: this.hitOpponent(this.calcAttackBox(aPos, facing, range), dPos, cd > 0), distance: Math.hypot(aPos.x - dPos.x, 0) };
  }

  calculateDamage(base, attacker, defender) {
    let d = base * (attacker.baseDamage || 1);
    const cs = this.combatState[attacker.id] || {};
    d += (cs.combo || 0) * 2;
    if (cs.attackCounter === 3) d *= 2;
    if (cs.chargeAttack) d *= 1.4;
    if (this.hasStatus(defender, 'Poise')) d *= 1.15;
    if (defender.state === 'staggered') d *= 2;
    if (attacker.characterKey === 'CALLISTO' && attacker.resources.artworkTibiaStacks > 0) d *= 1 + 0.1 * attacker.resources.artworkTibiaStacks;
    if (this.hasStatus(defender, 'Fragile')) { const s = this.getStatus(defender, 'Fragile'); d *= 1 + 0.1 * s.potency; }
    if (this.hasStatus(defender, 'Protection')) { const s = this.getStatus(defender, 'Protection'); d *= 1 - 0.1 * s.potency; }
    if (this.hasStatus(defender, 'Sinking')) { const s = this.getStatus(defender, 'Sinking'); d *= Math.max(0.5, 1 - 0.05 * Math.floor(s.potency / 5)); }
    return Math.floor(d);
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

  applyStagger(fighter, amount, config) {
    fighter.stagger += amount;
    if (fighter.stagger >= (config.staggerThreshold || 1000) && fighter.state !== 'staggered') {
      fighter.state = 'staggered'; fighter.staggerTimer = config.staggerLength || 5; fighter.stagger = config.staggerThreshold || 1000;
      return { staggered: true, duration: config.staggerLength || 5 };
    }
    return { staggered: false, stagger: fighter.stagger };
  }

  updateStagger(fighter, dt, config) {
    const threshold = config.staggerThreshold || 1000, length = config.staggerLength || 5;
    if (fighter.state === 'staggered') {
      if (fighter.staggerTimer > 0) {
        fighter.staggerTimer -= dt; fighter.stagger = (fighter.staggerTimer / length) * threshold;
        if (fighter.staggerTimer <= 0) { fighter.staggerRecoveryTimer = length; fighter.stagger = 0; return { state: 'recovering', recoveryTimer: length }; }
        return { state: 'staggered', timer: fighter.staggerTimer };
      }
    }
    if (fighter.staggerRecoveryTimer > 0) {
      fighter.staggerRecoveryTimer -= dt;
      if (fighter.staggerRecoveryTimer <= 0) { fighter.state = 'idle'; fighter.stagger = 0; return { state: 'idle' }; }
      return { state: 'recovering' };
    }
    return { state: fighter.state };
  }

  applyStatus(target, type, count, potency) {
    const existing = target.statuses.find(s => s.type === type);
    if (existing) { existing.count = (existing.count || 0) + (count || 1); existing.potency = (existing.potency || 0) + (potency || 0); return { applied: false, updated: true, count: existing.count, potency: existing.potency }; }
    target.statuses.push({ type, count: count || 1, potency: potency || 0, timer: 0 });
    return { applied: true };
  }

  processStatuses(fighter, dt) {
    const events = [];
    fighter.statuses = fighter.statuses.filter(s => {
      switch (s.type) {
        case 'Burn': s.timer += dt; if (s.timer >= 1) { s.timer = 0; s.count -= 1; fighter.hp = Math.max(0, fighter.hp - s.potency); events.push({ type: 'BURN_DAMAGE', damage: s.potency, hp: fighter.hp }); } return s.count > 0;
        case 'Bleed': s.timer += dt; if (s.timer >= 1) { s.timer = 0; s.potency = Math.max(0, s.potency - 1); } return s.potency > 0 && s.count > 0;
        case 'Tremor': s.timer += dt; if (s.count <= 0) { fighter.stagger += s.potency; events.push({ type: 'TREMOR_STAGGER', amount: s.potency }); return false; } return true;
        case 'Haste': case 'Bind': case 'Sinking': s.timer += dt; return s.count > 0;
        case 'Fragile': case 'Protection': case 'Poise': return s.count > 0;
        default: s.timer += dt; return s.count > 0 && s.timer < 30;
      }
    });
    if (fighter.hp <= 0 && !fighter.isDefeated) { fighter.isDefeated = true; fighter.velocity.x = 0; fighter.velocity.y = 0; fighter.state = 'defeated'; events.push({ type: 'DEFEATED' }); }
    return events;
  }

  consumeOnHit(fighter) {
    const events = [];
    const bleed = fighter.statuses.find(s => s.type === 'Bleed');
    if (bleed) { bleed.count -= 1; if (bleed.count <= 0) { const d = bleed.potency; if (d > 0) { fighter.hp = Math.max(0, fighter.hp - d); events.push({ type: 'BLEED_DAMAGE', damage: d }); } fighter.statuses = fighter.statuses.filter(s => s.type !== 'Bleed'); } }
    const rupture = fighter.statuses.find(s => s.type === 'Rupture');
    if (rupture) { const d = rupture.potency; fighter.hp = Math.max(0, fighter.hp - d); events.push({ type: 'RUPTURE_DAMAGE', damage: d }); rupture.count -= 1; if (rupture.count <= 0) fighter.statuses = fighter.statuses.filter(s => s.type !== 'Rupture'); }
    const sink = fighter.statuses.find(s => s.type === 'Sinking');
    if (sink) { sink.count -= 1; if (sink.count <= 0) fighter.statuses = fighter.statuses.filter(s => s.type !== 'Sinking'); }
    return events;
  }

  consumeBleedOnAttack(fighter) {
    const events = [];
    const bleed = fighter.statuses.find(s => s.type === 'Bleed');
    if (bleed && bleed.potency > 0) { const d = bleed.potency; fighter.hp = Math.max(0, fighter.hp - d); events.push({ type: 'BLEED_ATTACK_DAMAGE', damage: d }); bleed.count -= 1; if (bleed.count <= 0) fighter.statuses = fighter.statuses.filter(s => s.type !== 'Bleed'); }
    return events;
  }

  addCombo(id) { const s = this.combatState[id]; if (!s) return 0; s.combo = (s.combo || 0) + 1; s.comboTimer = 1.4; return s.combo; }
  updateCombos(dt) { Object.values(this.combatState).forEach(s => { if (s.comboTimer > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) s.combo = 0; } }); }
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
    if (state.characterKey === 'VALENCINA' && name === 'timeToHunt' && state.resources.precognition <= 0) return { success: false, reason: 'No Precognition' };
    return { success: true };
  }

  executeCharacterAbility(state, name, ac, targetState, config) {
    try { const logic = require(`./characterLogic/${state.characterKey.toLowerCase()}`); const h = logic[name]; if (h) return h.call(this, state, ac, targetState, config); } catch(e) {}
    return { success: false, reason: 'No handler' };
  }

  applyDamage(target, damage) {
    if (target.isDefeated) return { success: false, reason: 'Defeated' };
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) { target.isDefeated = true; target.velocity.x = 0; target.velocity.y = 0; return { success: true, damage, defeated: true, finalHp: 0 }; }
    return { success: true, damage, defeated: false, finalHp: target.hp };
  }

  resolveAttack(attacker, defender, attackData, config) {
    const result = { success: false, hit: false, damage: 0, knockback: 0, staggerResult: null, statuses: [], defenderHp: defender.hp, defeated: false, wasGuarded: false };
    const range = attackData.range || 100;
    const hit = this.checkAttackHit(attacker.position, defender.position, attackData.isDashAttack ? range * 1.5 : range, attacker.facing, defender.hitCooldown || 0);
    if (!hit.hit) { result.reason = 'Missed'; return result; }
    result.hit = true;

    let base = attackData.baseDamage || attacker.baseDamage, knock = attackData.knockback || 0, stagger = attackData.staggerDamage || 0;
    if (defender.isGuarding) { base *= 0.5; knock = Math.floor(knock * 0.5); stagger = 0; result.wasGuarded = true; }

    const dmg = this.calculateDamage(base, attacker, defender);
    const ap = this.applyDamage(defender, dmg);
    result.damage = ap.damage; result.defenderHp = defender.hp; result.defeated = ap.defeated;

    if (defender.state !== 'staggered') { defender.state = 'hit'; defender.hitTimer = 0.18; }
    if (knock) { const dir = defender.position.x < attacker.position.x ? -1 : 1; const fk = this.calculateKnockback(knock, attacker); this.applyKnockback(defender, fk, dir, attacker); result.knockback = fk; }
    if (stagger && defender.state !== 'staggered') { defender.stagger += stagger; result.staggerResult = { staggered: false, stagger: defender.stagger }; if (defender.stagger >= (config.staggerThreshold || 1000)) { defender.state = 'staggered'; defender.staggerTimer = config.staggerLength || 5; defender.stagger = config.staggerThreshold || 1000; result.staggerResult = { staggered: true, duration: config.staggerLength || 5 }; } }
    if (attackData.statusEffects) attackData.statusEffects.forEach(s => { this.applyStatus(defender, s.type, s.count, s.potency); result.statuses.push(s.type); });
    const ce = this.consumeOnHit(defender); if (ce.length) result.consumeEvents = ce;
    const be = this.consumeBleedOnAttack(attacker); if (be.length) result.bleedAttackEvents = be;
    const cs = this.combatState[attacker.id] || {}; cs.chargeAttack = !!attackData.chargeAttack; this.combatState[attacker.id] = cs;
    this.addCombo(attacker.id); this.incrementAttackCounter(attacker.id);
    result.chargeAttack = cs.chargeAttack; result.success = true;
    return result;
  }

  updateCooldowns(state, dt) { Object.keys(state.abilityCooldowns).forEach(a => { if (state.abilityCooldowns[a] > 0) state.abilityCooldowns[a] -= dt; }); }

  updateFighter(state, dt, config, playerInput) {
    const events = [];
    this.updateCooldowns(state, dt);
    // Handle hurt/stun state: decrement timer until it expires
    // Hitstun always lasts the full duration regardless of input.
    // The "exit early on input" behavior is purely client-side visual for the local player.
    if (state.state === 'hit') {
      state.hitTimer = (state.hitTimer || 0) - dt;
      if (state.hitTimer <= 0) {
        state.state = 'idle';
        state.hitTimer = 0;
        events.push({ type: 'STATE_CHANGE', from: 'hit', to: 'idle' });
      }
    }
    const su = this.updateStagger(state, dt, config);
    if (su.state !== state.state) events.push({ type: 'STATE_CHANGE', from: state.state, to: su.state });
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
    const e = [];
    if (state.resources.precognition > 0) state.resources.precognition = Math.max(0, state.resources.precognition - 2 * dt);
    if (state.hp / state.maxHp < this.getCharacterConfig('VALENCINA').shin.activationThreshold && !state.resources.shinActive) { state.resources.shinActive = true; e.push({ type: 'SHIN_ACTIVATED' }); }
    return e;
  }

  hasStatus(f, t) { return f.statuses && f.statuses.some(s => s.type === t); }
  getStatus(f, t) { return f.statuses && f.statuses.find(s => s.type === t); }
  removeStatus(f, t) { f.statuses = f.statuses.filter(s => s.type !== t); }
  isDefeated(s) { return s.hp <= 0; }

  getStateSnapshot(state) {
    return { id: state.id, characterKey: state.characterKey, hp: state.hp, maxHp: state.maxHp, position: { ...state.position }, velocity: { ...state.velocity }, facing: state.facing, state: state.state, stagger: state.stagger, isDefeated: state.isDefeated, statuses: state.statuses.map(s => ({ ...s })), resources: { ...state.resources }, abilityCooldowns: { ...state.abilityCooldowns } };
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = GameplayEngine;