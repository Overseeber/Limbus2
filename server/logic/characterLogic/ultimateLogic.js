/**
 * ULTIMATE LOGIC - Server-side authoritative ultimate implementations
 * Stateless pure functions that take game state and return updated state
 * All timing, positioning, damage, and sequencing controlled server-side
 */

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 700;

function initUltimate(fighter) {
  return {
    active: true,
    phase: 0,
    timer: 0,
    attackFrame: 0,
    attackTimer: 0,
    totalDamage: 0,
    lastHitstop: 0,
    cameraZoom: 2.5,
    backgroundDim: 0.7,
    name: 'ULTIMATE',
    dialogue: '',
    currentSprite: '',
    redLines: [],
    skulls: [],
    damageInstances: 0,
    gravityDisabled: false,
    alternateCounter: 0,
    enemySide: 'right',
    facingLocked: false,
    movingToEnemy: false,
    restrictOrigin: null,
    slashEvents: [],
    prevPhase: -1,
    prevAttackFrame: -1
  };
}

function updateJohnUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];
  switch (ult.phase) {
    case 0: ult.currentSprite = 'idle'; break;
    case 1: ult.currentSprite = 'idle'; break;
    case 2: ult.currentSprite = 's1f1'; break;
    default: ult.currentSprite = 'idle'; break;
  }
  targetEnemies.forEach(e => { if (e) clampToArena(e); });
  clampToArena(fighter);
  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 3) ult.timer -= dt;
  switch (ult.phase) {
    case 0:
      if (ult.timer <= 0) { ult.phase = 1; ult.timer = 0.5; }
      break;
    case 1:
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + (fighter.facing * 80)); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        ult.phase = 2; ult.attackFrame = 0; ult.attackTimer = 0.3; ult.cameraZoom = 1.8;
      }
      break;
    case 2:
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) { targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, false); }); ult.attackTimer = 0.3; }
        else { ult.phase = 3; ult.timer = 0.5; }
      }
      break;
    case 3:
      if (ult.timer <= 0) { ult.phase = 4; ult.attackFrame = 0; ult.attackTimer = 0.3; }
      break;
    case 4:
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) { targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage * 2, true, 2, true); }); ult.cameraZoom = 1.0; ult.backgroundDim = 0; ult.attackTimer = 1.0; }
        else { ult.phase = 5; ult.timer = 0.1; }
      }
      break;
    case 5: if (ult.timer <= 0) ult.timer = 0; break;
  }
}

function updateCallistoUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];
  targetEnemies.forEach(e => { if (e) { clampToArena(e); if (ult.gravityDisabled) e.velocity.y = 0; } });
  clampToArena(fighter);
  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 3 || ult.phase === 5 || ult.phase === 7 || ult.phase === 9 || ult.phase === 11) ult.timer -= dt;
  ult.prevPhase = ult.phase;
  const sprites = ['cpose','cpose','cuf1','cuf2','cuf3','cuf4','cuf4','cuf5','cuf6','cs3f2','cs3f2','cuend'];
  ult.currentSprite = sprites[ult.phase] || 'cidle';
  // (full callisto implementation preserved from earlier - shortened for file size)
  // Full implementation follows with same logic as before
  switch (ult.phase) {
    case 0:
      if (ult.timer <= 0) { ult.phase = 1; ult.timer = 0.3; fighter.facing = 1; }
      break;
    case 1:
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        ult.cameraZoom = 1.8; ult.phase = 2; ult.attackFrame = 0; ult.attackTimer = 0.3;
      }
      break;
    case 2:
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) { targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, false); }); ult.slashEvents.push({ type: 'cus1', frame: 1 }); ult.cameraZoom = 1.5; ult.attackTimer = 0.3; }
        else { ult.phase = 3; ult.timer = 1.0; }
      }
      break;
    case 3:
      if (ult.timer <= 0) {
        ult.cameraZoom = 1.3;
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 88); e.position.y = clampY(fighter.position.y - 180); e.velocity.x = 0; e.velocity.y = 0; ult.gravityDisabled = true; } });
        ult.phase = 4; ult.attackFrame = 0; ult.attackTimer = 0.5;
      }
      break;
    case 4:
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) { targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 2, false); }); ult.slashEvents.push({ type: 'cus2', frame: 1 }); ult.cameraZoom = 1.2; ult.attackTimer = 0.3; }
        else { ult.phase = 5; ult.timer = 1.0; }
      }
      break;
    case 5:
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + (fighter.facing * 200)); e.position.y = clampY(ARENA_HEIGHT - 100); e.velocity.x = 0; e.velocity.y = 0; ult.gravityDisabled = false; } });
        ult.cameraZoom = 1.8;
        targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 3, true); });
        ult.slashEvents.push({ type: 'cus3', frame: 1 }); ult.phase = 6; ult.attackFrame = 1; ult.attackTimer = 0.3;
      }
      break;
    case 6:
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) { ult.phase = 7; ult.timer = 1.0; }
      break;
    case 7:
      if (ult.timer <= 0) {
        fighter.position.y = clampY(fighter.position.y - 400); fighter.velocity.x = fighter.facing * 2; fighter.velocity.y = 0;
        ult.cameraZoom = 1.8; ult.gravityDisabled = true; ult.phase = 8; ult.attackFrame = 0; ult.attackTimer = 1.0;
      }
      break;
    case 8:
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          ult.gravityDisabled = false;
          targetEnemies.forEach(e => { if (e) { const teleX = clampX(e.position.x + (e.facing * 300)); fighter.position.x = teleX; fighter.position.y = e.position.y; fighter.velocity.x = 0; fighter.velocity.y = 0; } });
          ult.cameraZoom = 1.3;
          targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 4, false); });
          ult.slashEvents.push({ type: 'cus4', frame: 1 }); ult.attackTimer = 0.3;
        } else { ult.phase = 9; ult.timer = 1.0; }
      }
      break;
    case 9:
      if (ult.timer <= 0) {
        fighter.position.x = clampX(ARENA_WIDTH / 2); fighter.position.y = clampY(ARENA_HEIGHT - 100); fighter.velocity.x = 0; fighter.velocity.y = 0;
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 120); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; ult.gravityDisabled = true; } });
        ult.cameraZoom = 3.0; ult.damageInstances = 0; ult.phase = 10; ult.attackFrame = 0; ult.attackTimer = 0.05;
      }
      break;
    case 10:
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++; ult.damageInstances++;
        if (ult.damageInstances <= 20) {
          targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, Math.floor(fighter.baseDamage / 20), false, 5, false); });
          const bottomX = random(100, ARENA_WIDTH - 100);
          const topX = clampX(bottomX + random(-100, 100));
          ult.redLines.push({ topX, bottomX, topY: 0, bottomY: ARENA_HEIGHT, opacity: 0, maxOpacity: 1, fadeSpeed: 2 });
          ult.attackTimer = 0.05;
        } else { ult.cameraZoom = 1.0; ult.phase = 11; ult.timer = 3.0; }
      }
      break;
    case 11:
      ult.redLines.forEach(rl => { if (rl.opacity < rl.maxOpacity) rl.opacity += rl.fadeSpeed * dt; });
      targetEnemies.forEach(e => { if (e) e.velocity.y = 0; });
      break;
  }
}

/**
 * VALENCINA ULTIMATE (Disposal)
 * All timing, positioning, damage server-authoritative.
 * Knockback is always purely horizontal and applied instantly on hit.
 *
 * ATTACK 4: d2+diss1(no dmg) → teleport 50px right → de1+s1s3(dmg+KB) hold 1s
 * ATTACK 5: de2 + alternating s1s3/js1 (5 hits, all with knockback)
 *   Each hit: slash → 0.1s → damage+knockback
 *   Final: de3 + 2x dmg + strong horizontal KB, zoom out, hold 3s
 */
function updateValencinaUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];
  targetEnemies.forEach(e => { if (e) clampToArena(e); });
  clampToArena(fighter);

  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 3 || ult.phase === 5 || ult.phase === 7 || ult.phase === 9 || ult.phase === 11)
    ult.timer -= dt;

  ult.prevPhase = ult.phase;

  // Helper: only lock position if not being knocked back (velocity < 50 threshold)
  const lockOrRelease = (e) => {
    if (!e) return;
    if (Math.abs(e.velocity.x) < 50) {
      return true; // can lock
    }
    return false; // being knocked back, don't override velocity
  };

  switch (ult.phase) {
    // ============ PHASE 0: OPENING POSE - "dist1" for 3 seconds ============
    case 0:
      ult.currentSprite = 'dist1';
      ult.cameraZoom = 2.5;
      ult.backgroundDim = 0.7;
      if (ult.timer <= 0) {
        ult.phase = 1;
        ult.timer = 0.1;
      }
      break;

    // ============ PHASE 1: ATTACK 1 SETUP ============
    case 1:
      ult.currentSprite = 'dist1';
      if (ult.timer <= 0 && !ult.movingToEnemy) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        fighter.facing = 1;
        const targetX = targetEnemies.length > 0 && targetEnemies[0] ? targetEnemies[0].position.x - 140 : fighter.position.x;
        fighter.position.x = clampX(targetX);
        fighter.velocity.x = 0; fighter.velocity.y = 0;
        ult.movingToEnemy = true;
        ult.phase = 2; ult.attackFrame = 0; ult.attackTimer = 0.1;
      }
      break;

    // ============ PHASE 2: ATTACK 1 (s1f1+s1s1 → s1f2+s1s2 → s1f3) ============
    case 2:
      targetEnemies.forEach(e => { if (e && lockOrRelease(e)) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
      fighter.facing = 1;
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1:
            ult.currentSprite = 's1f1';
            targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, true); });
            ult.slashEvents.push({ type: 's1s1', frame: 1, offsetX: 0, offsetY: -10 });
            ult.attackTimer = 0.1; break;
          case 2:
            ult.currentSprite = 's1f2';
            targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, true); });
            ult.slashEvents.push({ type: 's1s2', frame: 2, offsetX: 15, offsetY: -5 });
            ult.attackTimer = 0.1; break;
          case 3:
            ult.currentSprite = 's1f3';
            ult.attackTimer = 0.1; break;
          case 4:
            ult.phase = 3; ult.timer = 0.05; ult.movingToEnemy = false; break;
        }
      }
      break;

    // ============ PHASE 3: ATTACK 2 SETUP ============
    case 3:
      ult.currentSprite = 's1f3';
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        ult.phase = 4; ult.attackFrame = 0; ult.attackTimer = 0.1;
      }
      break;

    // ============ PHASE 4: ATTACK 2 (s4f2 → s4f1+s1s4) ============
    case 4:
      targetEnemies.forEach(e => { if (e && lockOrRelease(e)) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
      fighter.facing = 1;
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1: ult.currentSprite = 's4f2'; ult.attackTimer = 0.1; break;
          case 2:
            ult.currentSprite = 's4f1';
            targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 2, true); });
            ult.slashEvents.push({ type: 's1s4', frame: 2, offsetX: 0, offsetY: -10 });
            ult.attackTimer = 0.1; break;
          case 3: ult.phase = 5; ult.timer = 0.05; break;
        }
      }
      break;

    // ============ PHASE 5: ATTACK 3 SETUP ============
    case 5:
      ult.currentSprite = 's4f1';
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        fighter.facing = 1; fighter.velocity.x = 0; fighter.velocity.y = 0;
        ult.phase = 6; ult.attackFrame = 0; ult.attackTimer = 0.1;
      }
      break;

    // ============ PHASE 6: ATTACK 3 (s3f1 → s3f2+s1s4 → s3f3, then 1s → repos) ============
    case 6:
      targetEnemies.forEach(e => { if (e && lockOrRelease(e)) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
      fighter.facing = 1;
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1: ult.currentSprite = 's3f1'; ult.attackTimer = 0.1; break;
          case 2:
            ult.currentSprite = 's3f2';
            targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 3, true); });
            ult.slashEvents.push({ type: 's1s4', frame: 2, offsetX: 0, offsetY: -10 });
            ult.attackTimer = 0.1; break;
          case 3: ult.currentSprite = 's3f3'; ult.attackTimer = 1.0; break;
          case 4:
            if (targetEnemies.length > 0 && targetEnemies[0]) {
              const enemy = targetEnemies[0];
              let valX = enemy.position.x + 300;
              if (valX > ARENA_WIDTH - 100) { valX = ARENA_WIDTH - 100; enemy.position.x = clampX(valX - 300); }
              fighter.position.x = clampX(valX); fighter.position.y = enemy.position.y;
            }
            ult.currentSprite = 'd1';
            fighter.facing = -1;
            ult.facingLocked = true;
            fighter.velocity.x = 0; fighter.velocity.y = 0;
            ult.phase = 7; ult.timer = 0.05;
            break;
        }
      }
      break;

    // ============ PHASE 7: ATTACK 4 SETUP ============
    case 7:
      ult.currentSprite = 'd1';
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x - 80); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        ult.phase = 8; ult.attackFrame = 0; ult.attackTimer = 0.1;
      }
      break;

    // ============ PHASE 8: ATTACK 4 (d2+diss1(no dmg) → teleport 50px right → de1+s1s3(dmg+KB) hold 1s) ============
    case 8:
      // Don't override velocity during knockback phases
      targetEnemies.forEach(e => { if (e && lockOrRelease(e)) { e.position.x = clampX(fighter.position.x - 80); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
      fighter.facing = -1;
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1:
            ult.currentSprite = 'd2';
            ult.slashEvents.push({ type: 'diss1', frame: 1, offsetX: 15, offsetY: -5 });
            ult.attackTimer = 0.1; break;
          case 2:
            if (targetEnemies.length > 0 && targetEnemies[0]) {
              const enemy = targetEnemies[0];
              let targetX = enemy.position.x + 50;
              if (targetX > ARENA_WIDTH - 100) { targetX = ARENA_WIDTH - 100; enemy.position.x = clampX(targetX - 50); }
              fighter.position.x = clampX(targetX); fighter.position.y = enemy.position.y;
            }
            ult.currentSprite = 'de1';
            ult.attackTimer = 0.1; break;
          case 3:
            // Deal damage WITHOUT knockback — hold enemy in place during Attack 4
            targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 4, false); });
            ult.slashEvents.push({ type: 's1s3', frame: 3, offsetX: 15, offsetY: -5 });
            ult.cameraZoom = 3.5; ult.backgroundDim = 0.8;
            ult.attackTimer = 1.0; // Hold de1 pose for 1 second
            break;
          case 4:
            ult.phase = 9; ult.timer = 0.05; break;
        }
      }
      break;

    // ============ PHASE 9: ATTACK 5 SETUP - de2 ============
    case 9:
      ult.currentSprite = 'de2';
      ult.phase = 10; ult.attackFrame = 0; ult.attackTimer = 0.1; ult.alternateCounter = 0;
      break;

    // ============ PHASE 10: ATTACK 5 (de2 + 5 hits, all with knockback) ============
    case 10:
      // Lock only if not being knocked back - let knockback persist through frames
      targetEnemies.forEach(e => { if (e && lockOrRelease(e)) { e.position.x = clampX(fighter.position.x - 80); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
      fighter.facing = -1;
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        if (ult.attackFrame < 10) {
          if (ult.attackFrame % 2 === 0) {
            const hitIndex = Math.floor(ult.attackFrame / 2);
            if (hitIndex % 2 === 0) ult.slashEvents.push({ type: 's1s3', frame: hitIndex + 1, offsetX: 15, offsetY: -5 });
            else ult.slashEvents.push({ type: 'js1', frame: hitIndex + 1, offsetX: 0, offsetY: -10 });
            ult.attackTimer = 0.1;
          } else {
            // Deal damage WITHOUT knockback — hold enemy in place during Attack 5 rapid hits
            targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 5, false); });
            ult.attackTimer = 0.1;
          }
          ult.attackFrame++;
        } else {
          ult.currentSprite = 'de3';
          targetEnemies.forEach(e => {
            if (e) {
              dealUltDamage(fighter, ult, e, fighter.baseDamage * 2, true, 5, false);
              const dir = e.position.x < fighter.position.x ? -1 : 1;
              e.velocity.x = dir * 1600;
              e.velocity.y = 0;
              e.state = 'hit';
              e.hitTimer = 0.5;
            }
          });
          ult.cameraZoom = 1.0; ult.backgroundDim = 0;
          ult.phase = 11; ult.timer = 3.0;
        }
      }
      break;

    // ============ PHASE 11: FINAL HOLD — 3 seconds ============
    case 11:
      ult.currentSprite = 'de3';
      targetEnemies.forEach(e => { if (e) clampToArena(e); });
      break;
  }
}

function clampToArena(fighter) {
  fighter.position.x = clampX(fighter.position.x);
  fighter.position.y = clampY(fighter.position.y);
  if (fighter.position.x <= 100 || fighter.position.x >= ARENA_WIDTH - 100) fighter.velocity.x = 0;
}

function clampX(x) { return Math.max(100, Math.min(ARENA_WIDTH - 100, x)); }
function clampY(y) { return Math.max(100, Math.min(ARENA_HEIGHT - 100, y)); }

function dealUltDamage(fighter, ult, enemy, damage, isFinal, phase, applyKnockback) {
  if (!enemy || enemy.isDefeated) return null;
  const originalStagger = enemy.stagger || 0;
  let knockbackAmount = 0;
  if (applyKnockback) knockbackAmount = isFinal ? 300 : 100;

  const actualDamage = Math.floor(damage);
  enemy.hp = Math.max(0, enemy.hp - actualDamage);

  if (knockbackAmount > 0 && !isFinal) {
    const dir = enemy.position.x < fighter.position.x ? -1 : 1;
    enemy.velocity.x = dir * knockbackAmount * 8;
    enemy.velocity.y = 0;
  }

  enemy.state = 'hit';
  enemy.hitTimer = 0.18;
  const defeated = enemy.hp <= 0;
  if (defeated) { enemy.isDefeated = true; enemy.velocity.x = 0; enemy.velocity.y = 0; }
  enemy.stagger = originalStagger;
  clampToArena(enemy);
  clampToArena(fighter);
  fighter.velocity.x = 0; fighter.velocity.y = 0;
  ult.totalDamage += actualDamage;

  if (ult) {
    const ultHitstop = isFinal ? 0.20 : 0.08;
    ult.lastHitstop = Math.max(ult.lastHitstop || 0, ultHitstop);
  }

  return { damage: actualDamage, hp: enemy.hp, defeated, knockback: knockbackAmount };
}

function random(min, max) { return min + Math.random() * (max - min); }

module.exports = { initUltimate, updateJohnUltimate, updateCallistoUltimate, updateValencinaUltimate, dealUltDamage, clampToArena, clampX, clampY };