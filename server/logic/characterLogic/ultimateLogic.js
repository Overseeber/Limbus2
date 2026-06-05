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
    // Callisto-specific
    redLines: [],
    skulls: [],
    damageInstances: 0,
    gravityDisabled: false,
    // Valencina-specific
    alternateCounter: 0,
    enemySide: 'right',
    facingLocked: false,
    movingToEnemy: false,
    restrictOrigin: null,
    // Slash effects to spawn on clients
    slashEvents: [],
    debrisEvents: [],
    // Track whether we've changed phase (for slash spawning)
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

/**
 * CALLISTO ULTIMATE (Closing Time - Installation Art no. 1)
 * Server-authoritative, faithfully recreated from oldclientgameplay reference.
 *
 * Timing: 0.3s per frame, 1.0s between attacks (per spec)
 *
 * Phase 0: cpose — 1.5s centered pose
 * Phase 1: Attack 1 setup — teleport enemy 100px right, zoom to 1.8
 * Phase 2: Attack 1 — cuf1 + cus1 (damage + slash), zoom to 1.5
 * Phase 3: Attack 2 setup — cuf2, enemy at (x+88, y-180), zoom 1.3, hold 0.5s
 * Phase 4: Attack 2 — cuf3 + cus2 (damage + slash), zoom 1.2
 * Phase 5: Attack 3 setup — teleport enemy to ground 200px in front, cuf4 + cus3 (damage + slash), zoom 1.8
 * Phase 6: Attack 3 cooldown
 * Phase 7: Attack 4 setup — Callisto teleport upward 400px, drift toward enemy, cuf5, hold 1s
 * Phase 8: Attack 4 — teleport 300px in front of enemy, cuf6 + cus4 (damage + slash), zoom 1.3
 * Phase 9: Attack 5 setup — center, enemy in front, cs3f2 + cs3s1, zoom 3.0
 * Phase 10: Attack 5 — 20 damage instances at 0.05s each, red lines
 * Phase 11: Final hold — cuend, 21 debris, zoom 1.0, hold 3s
 */
function updateCallistoUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

  targetEnemies.forEach(e => { if (e) { clampToArena(e); if (ult.gravityDisabled) e.velocity.y = 0; } });
  clampToArena(fighter);

  // Timer decrement (non-attack phases only)
  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 3 || ult.phase === 5 || ult.phase === 7 || ult.phase === 9 || ult.phase === 11)
    ult.timer -= dt;

  // Set sprite based on current phase
  // Sprites per phase: cpose(0,1), cuf1(2), cuf2(3), cuf3(4), cuf4(5,6), cuf5(7), cuf6(8), cs3f2(9,10), cuend(11)
  ult.prevPhase = ult.phase;

  switch (ult.phase) {
    // ============ PHASE 0: OPENING POSE - "cpose" for 1.5 seconds ============
    case 0:
      ult.currentSprite = 'cpose';
      ult.cameraZoom = 2.5;
      ult.backgroundDim = 0.7;
      if (ult.timer <= 0) {
        ult.phase = 1;
        ult.timer = 0.3; // Brief delay before attack 1
      }
      break;

    // ============ PHASE 1: ATTACK 1 SETUP ============
    case 1:
      ult.currentSprite = 'cpose';
      if (ult.timer <= 0) {
        // Teleport opponent to 100 pixels to the RIGHT of Callisto (matching old client)
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + (fighter.facing * 100));
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
          }
        });
        ult.cameraZoom = 1.8;
        ult.phase = 2;
        ult.attackFrame = 0;
        ult.attackTimer = 0.3;
        // Set cuf1 sprite
        ult.currentSprite = 'cuf1';
      }
      break;

    // ============ PHASE 2: ATTACK 1 - cuf1 + cus1 ============
    case 2:
      ult.currentSprite = 'cuf1';
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          // Deal damage with cus1
          targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, false); });
          ult.slashEvents.push({ type: 'cus1', frame: 1, offsetX: 0, offsetY: -10 });
          ult.cameraZoom = 1.5;
          ult.attackTimer = 0.3;
        } else {
          // End attack sequence
          ult.phase = 3;
          ult.timer = 1.0; // 1 second before next attack
        }
      }
      break;

    // ============ PHASE 3: ATTACK 2 SETUP ============
    case 3:
      if (ult.timer <= 0) {
        // Switch to cuf2 AND teleport enemy simultaneously
        ult.currentSprite = 'cuf2';
        ult.cameraZoom = 1.3;
        // Position enemy at Callisto's position offset (facing-aware) — flip with Callisto
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + (fighter.facing * 88));
            e.position.y = clampY(fighter.position.y - 180);
            e.velocity.x = 0;
            e.velocity.y = 0;
            ult.gravityDisabled = true; // Keep enemy suspended
          }
        });
        ult.phase = 4;
        ult.attackFrame = 0;
        ult.attackTimer = 0.5; // Hold cuf2 for 0.5 seconds
      }
      break;

    // ============ PHASE 4: ATTACK 2 - cuf3 + cus2 ============
    case 4:
      ult.currentSprite = 'cuf3';
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          // Deal damage with cus2
          targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 2, false); });
          ult.slashEvents.push({ type: 'cus2', frame: 1, offsetX: 0, offsetY: -10 });
          ult.cameraZoom = 1.2;
          ult.attackTimer = 0.3;
        } else {
          ult.phase = 5;
          ult.timer = 1.0; // 1 second before next attack
        }
      }
      break;

    // ============ PHASE 5: ATTACK 3 SETUP + IMMEDIATE DAMAGE ============
    case 5:
      if (ult.timer <= 0) {
        // Teleport enemy to ground 200 pixels in front of Callisto (matching old client)
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + (fighter.facing * 200));
            e.position.y = clampY(ARENA_HEIGHT - 100);
            e.velocity.x = 0;
            e.velocity.y = 0;
            ult.gravityDisabled = false;
          }
        });
        ult.cameraZoom = 1.8;
        ult.currentSprite = 'cuf4';
        // Deal damage with cus3
        targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 3, true); });
        ult.slashEvents.push({ type: 'cus3', frame: 1, offsetX: 0, offsetY: -10 });
        ult.phase = 6;
        ult.attackFrame = 1;
        ult.attackTimer = 0.3;
      }
      break;

    // ============ PHASE 6: ATTACK 3 COOLDOWN ============
    case 6:
      ult.currentSprite = 'cuf4';
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.phase = 7;
        ult.timer = 1.0; // 1 second before next attack
      }
      break;

    // ============ PHASE 7: ATTACK 4 SETUP - Teleport upward, drift ============
    case 7:
      if (ult.timer <= 0) {
        // Teleport Callisto upward by 500 pixels
        fighter.position.y = clampY(fighter.position.y - 500);
        fighter.velocity.x = fighter.facing * 10; // Slow drift toward enemy
        fighter.velocity.y = 0;
        ult.currentSprite = 'cuf5';
        ult.cameraZoom = 1.8;
        ult.gravityDisabled = true; // Prevent gravity during ascent
        ult.phase = 8;
        ult.attackFrame = 0;
        ult.attackTimer = 1.0; // Hold for 1 second
      }
      break;

    // ============ PHASE 8: ATTACK 4 - cuf5 hold, then teleport + cuf6 + cus4 ============
    case 8:
      // Set sprite based on attackFrame so cuf6 is never overridden
      if (ult.attackFrame === 0) {
        ult.currentSprite = 'cuf5'; // Show cuf5 during the 1-second hold
      } else {
        ult.currentSprite = 'cuf6'; // Show cuf6 after teleport + damage
      }
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        if (ult.attackFrame === 0) {
          // Hold expired: teleport 300 pixels IN FRONT of enemy, switch to cuf6, deal damage
          ult.attackFrame = 1;
          ult.gravityDisabled = false;
          targetEnemies.forEach(e => {
            if (e) {
              const teleX = clampX(e.position.x + (e.facing * 300));
              fighter.position.x = teleX;
              fighter.position.y = e.position.y;
              fighter.velocity.x = 0;
              fighter.velocity.y = 0;
            }
          });
          ult.cameraZoom = 1.3;
          ult.currentSprite = 'cuf6';
          targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 4, false); });
          ult.slashEvents.push({ type: 'cus4', frame: 1, offsetX: 0, offsetY: -10 });
          // Show cuf6 for a brief moment before moving on
          ult.attackTimer = 0.3;
        } else {
          // Done showing cuf6, move to attack 5
          ult.phase = 9;
          ult.timer = 1.0;
        }
      }
      break;

    // ============ PHASE 9: ATTACK 5 SETUP - Center, zoom in ============
    case 9:
      if (ult.timer <= 0) {
        // Teleport Callisto to center
        fighter.position.x = clampX(ARENA_WIDTH / 2);
        fighter.position.y = clampY(ARENA_HEIGHT - 100);
        fighter.velocity.x = 0;
        fighter.velocity.y = 0;
        // Position enemy directly in front of Callisto (respect facing)
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + (fighter.facing * 120));
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
            ult.gravityDisabled = true;
          }
        });
        ult.currentSprite = 'cs3f2';
        ult.slashEvents.push({ type: 'cs3s1', frame: 1, offsetX: 0, offsetY: -10 });
        ult.cameraZoom = 3.0; // Zoom in
        ult.damageInstances = 0;
        ult.phase = 10;
        ult.attackFrame = 0;
        ult.attackTimer = 0.05; // 20 instances over 1 second = 0.05s each
      }
      break;

    // ============ PHASE 10: ATTACK 5 - 20 damage instances with red lines ============
    case 10:
      ult.currentSprite = 'cs3f2';
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        ult.damageInstances++;
        if (ult.damageInstances <= 20) {
          // Deal 1/20th of base damage per instance
          targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, Math.floor(fighter.baseDamage / 20), false, 5, false); });
          // Spawn red line effect
          const bottomX = random(100, ARENA_WIDTH - 100);
          const topX = clampX(bottomX + random(-100, 100));
          ult.redLines.push({
            topX, bottomX,
            topY: 0,
            bottomY: ARENA_HEIGHT,
            opacity: 0,
            maxOpacity: 1,
            fadeSpeed: 2
          });
          ult.attackTimer = 0.05;
        } else {
          // All 20 instances done
          ult.phase = 11;
          ult.timer = 3.0; // Hold for 3 seconds
        }
      }
      break;

    // ============ PHASE 11: FINAL HOLD - cuend, debris, zoom out ============
    case 11:
      ult.currentSprite = 'cuend';
      ult.cameraZoom = 1.0; // Zoom out
      ult.backgroundDim = 0;
      
      // Fade in red lines
      ult.redLines.forEach(rl => {
        if (rl.opacity < rl.maxOpacity) rl.opacity += rl.fadeSpeed * dt;
      });

      // On first entry, spawn 21 debris instances
      if (ult.damageInstances > 0 && (!ult.skulls || ult.skulls.length === 0)) {
        const skullTypes = ['cbsk1', 'cbsk2', 'cbsk3'];
        for (let i = 0; i < 21; i++) {
          const randomSkull = skullTypes[Math.floor(random(0, 3))];
          const randomScale = random(1.0, 3.0);
          const randomX = clampX(fighter.position.x + random(-500, 500));
          // Y starts 500 pixels UNDER the arena
          const randomY = ARENA_HEIGHT + random(100, 500);
          const randomRotation = random(-Math.PI / 3, Math.PI / 3);

          ult.skulls = ult.skulls || [];
          ult.skulls.push({
            type: randomSkull,
            x: randomX,
            y: randomY,
            scale: randomScale,
            rotation: randomRotation,
            timer: 3.0
          });
        }
        // Mark damageInstances as 0 so we only spawn once
        ult.damageInstances = 0;
        
        // Deal bonus damage once when debris spawns
        targetEnemies.forEach(e => { if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage*2.7, false, 4, false); });
      }
      
      // Keep enemies in place
      targetEnemies.forEach(e => { if (e) e.velocity.y = 0; });
      break;
  }
}

/**
 * VALENCINA ULTIMATE (Disposal)
 * All timing, positioning, damage server-authoritative.
 * Fully restored with proper status application per phase:
 *   Attack 1: 3 Burn Pot + 3 Tremor Pot
 *   Attack 2: 3 Burn Pot + 3 Tremor Pot
 *   Attack 3: 6 Burn Count + 6 Tremor Count
 *   Attack 4: Trigger Tremor Burst
 *   Attack 5: Trigger Tremor Burst x3, deal (Burn+Tre Pot)/2 bonus damage, Reload to 20
 *   On use: Gain 3 Poise Count + 5 Poise Potency
 */
function updateValencinaUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];
  targetEnemies.forEach(e => { if (e) clampToArena(e); });
  clampToArena(fighter);

  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 3 || ult.phase === 5 || ult.phase === 7 || ult.phase === 9 || ult.phase === 11)
    ult.timer -= dt;

  ult.prevPhase = ult.phase;

  const lockOrRelease = (e) => {
    if (!e) return;
    if (Math.abs(e.velocity.x) < 50) return true;
    return false;
  };

  /**
   * Apply Valencina-specific ultimate status effects per phase.
   */
  function applyUltimateStatuses(enemy, phase) {
    if (!enemy || enemy.isDefeated) return;
    
    // Ensure statuses array exists
    if (!enemy.statuses) enemy.statuses = [];
    
    function addOrStack(type, count, potency) {
      const existing = enemy.statuses.find(s => s.type === type);
      if (existing) {
        existing.count = (existing.count || 0) + count;
        existing.potency = (existing.potency || 0) + (potency || 0);
      } else {
        enemy.statuses.push({ type, count, potency: potency || 0, timer: 0 });
      }
    }

    switch (phase) {
      case 1: // Attack 1: Inflict 3 Burn Potency, 3 Tremor Potency
        addOrStack('Burn', 0, 3);
        addOrStack('Tremor', 0, 3);
        break;
      case 2: // Attack 2: Inflict 3 Burn Potency, 3 Tremor Potency
        addOrStack('Burn', 0, 3);
        addOrStack('Tremor', 0, 3);
        break;
      case 3: // Attack 3: Inflict 6 Burn Count, 6 Tremor Count
        addOrStack('Burn', 6, 0);
        addOrStack('Tremor', 6, 0);
        break;
      case 4: // Attack 4: Trigger Tremor Burst
        triggerTremorBurst(enemy);
        break;
      case 5: // Attack 5: Trigger Tremor Burst 3 times + bonus damage
        for (let i = 0; i < 3; i++) {
          triggerTremorBurst(enemy);
        }
        // Bonus damage: (Burn Potency + Tremor Potency) / 2
        const burnPot = enemy.statuses.find(s => s.type === 'Burn')?.potency || 0;
        const tremorPot = enemy.statuses.find(s => s.type === 'Tremor')?.potency || 0;
        const bonusDamage = Math.floor((burnPot + tremorPot) / 2);
        if (bonusDamage > 0) {
          enemy.hp = Math.max(0, enemy.hp - bonusDamage);
        }
        break;
    }
  }

  function triggerTremorBurst(enemy) {
    if (!enemy || enemy.isDefeated) return;
    const tremor = enemy.statuses.find(s => s.type === 'Tremor');
    if (tremor && tremor.count > 0) {
      tremor.count -= 1;
      const pot = tremor.potency || 0;
      enemy.stagger = (enemy.stagger || 0) + pot;
      if (tremor.count <= 0) {
        enemy.statuses = enemy.statuses.filter(s => s.type !== 'Tremor');
      }
    }
  }

  // On ultimate start (phase 0→1 transition), apply poise gain
  if (ult.phase === 0 && ult.timer <= 0) {
    // Gain 3 Poise Count, 5 Poise Potency (once per ultimate)
    if (!ult.poiseApplied) {
      const existingPoise = fighter.statuses.find(s => s.type === 'Poise');
      if (existingPoise) {
        existingPoise.count += 3;
        existingPoise.potency += 5;
      } else {
        fighter.statuses.push({ type: 'Poise', count: 3, potency: 5, timer: 0 });
      }
      ult.poiseApplied = true;
    }
  }

  switch (ult.phase) {
    case 0:
      ult.currentSprite = 'dist1';
      ult.cameraZoom = 2.5;
      ult.backgroundDim = 0.7;
      if (ult.timer <= 0) { ult.phase = 1; ult.timer = 0.1; }
      break;

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

    case 2:
      targetEnemies.forEach(e => { if (e && lockOrRelease(e)) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
      fighter.facing = 1;
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1:
            ult.currentSprite = 's1f1';
            targetEnemies.forEach(e => { if (e) { dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, true); applyUltimateStatuses(e, 1); } });
            ult.slashEvents.push({ type: 's1s1', frame: 1, offsetX: 0, offsetY: -10 });
            ult.attackTimer = 0.1; break;
          case 2:
            ult.currentSprite = 's1f2';
            targetEnemies.forEach(e => { if (e) { dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, true); applyUltimateStatuses(e, 1); } });
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

    case 3:
      ult.currentSprite = 's1f3';
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        ult.phase = 4; ult.attackFrame = 0; ult.attackTimer = 0.1;
      }
      break;

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
            targetEnemies.forEach(e => { if (e) { dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 2, true); applyUltimateStatuses(e, 2); } });
            ult.slashEvents.push({ type: 's1s4', frame: 2, offsetX: 0, offsetY: -10 });
            ult.attackTimer = 0.1; break;
          case 3: ult.phase = 5; ult.timer = 0.05; break;
        }
      }
      break;

    case 5:
      ult.currentSprite = 's4f1';
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x + 100); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        fighter.facing = 1; fighter.velocity.x = 0; fighter.velocity.y = 0;
        ult.phase = 6; ult.attackFrame = 0; ult.attackTimer = 0.1;
      }
      break;

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
            targetEnemies.forEach(e => { if (e) { dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 3, true); applyUltimateStatuses(e, 3); } });
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

    case 7:
      ult.currentSprite = 'd1';
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => { if (e) { e.position.x = clampX(fighter.position.x - 80); e.position.y = fighter.position.y; e.velocity.x = 0; e.velocity.y = 0; } });
        ult.phase = 8; ult.attackFrame = 0; ult.attackTimer = 0.1;
      }
      break;

    case 8:
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
            targetEnemies.forEach(e => { if (e) { dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 4, false); applyUltimateStatuses(e, 4); } });
            ult.slashEvents.push({ type: 's1s3', frame: 3, offsetX: 15, offsetY: -5 });
            ult.cameraZoom = 3.5; ult.backgroundDim = 0.8;
            ult.attackTimer = 1.0;
            break;
          case 4:
            ult.phase = 9; ult.timer = 0.05; break;
        }
      }
      break;

    case 9:
      ult.currentSprite = 'de2';
      ult.phase = 10; ult.attackFrame = 0; ult.attackTimer = 0.1; ult.alternateCounter = 0;
      break;

    case 10:
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
            targetEnemies.forEach(e => { if (e) { dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 5, false); applyUltimateStatuses(e, 5); } });
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
          
          // Reload Acceleration Round to 20
          if (fighter.resources) {
            fighter.resources.accelerationRounds = 20;
          }
          
          ult.cameraZoom = 1.0; ult.backgroundDim = 0;
          ult.phase = 11; ult.timer = 3.0;
        }
      }
      break;

    case 11:
      ult.currentSprite = 'de3';
      targetEnemies.forEach(e => { if (e) clampToArena(e); });
      break;
  }
}

/**
 * DIHUI STAR ULTIMATE (Uttermost Rend Space - String Severance)
 * Server-authoritative cinematic sequence.
 *
 * Phase 0: du1 opening pose — 3s (zoom in)
 * Phase 1: du1 hold — 2s (teleport target center, Dihui right edge)
 * Phase 2: du2 — 1s, teleport to opposite edge, zoom out
 * Phase 3: djoust1→djoust2→djoust3→djoust4 — 0.2s each
 * Phase 4: dhalt1→dhalt2 — hold 3s (camera centers on Dihui, zoom in)
 * Phase 5: du3→du4→du5→du6→du7 — hold 2s
 * Phase 6: du8 — spawn dline instances, deal damage
 * Phase 7: Hold 3s, return to combat
 */
function updateDihuiUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

  targetEnemies.forEach(e => { if (e) clampToArena(e); });
  clampToArena(fighter);

  // Timer decrement (non-attack phases only)
  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 2 || ult.phase === 3 || ult.phase === 4 || ult.phase === 5 || ult.phase === 6 || ult.phase === 7 || ult.phase === 11)
    ult.timer -= dt;

  ult.prevPhase = ult.phase;

  switch (ult.phase) {
    // ============ PHASE 0: OPENING POSE - Animation sequence ============
    case 0:
      ult.currentSprite = 'draw5';
      ult.cameraZoom = 2.5;
      ult.backgroundDim = 0.7;
      
      // Initialize attackFrame on first entry and start animation immediately
      if (ult.attackFrame === undefined) {
        ult.attackFrame = 0;
        ult.timer = 0; // Start immediately
      }
      
      if (ult.timer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1:
            ult.currentSprite = 'draw4';
            ult.timer = 0.2;
            break;
          case 2:
            ult.currentSprite = 'draw3';
            ult.timer = 0.2;
            break;
          case 3:
            ult.currentSprite = 'draw2';
            ult.timer = 0.2;
            break;
          case 4:
            ult.currentSprite = 'draw1';
            ult.timer = 1.0;
            break;
          case 5:
            // Animation complete, transition to phase 1
            // Teleport target to center, Dihui to right edge
            const centerX = clampX(ARENA_WIDTH / 2);
            targetEnemies.forEach(e => {
              if (e) {
                e.position.x = centerX;
                e.position.y = clampY(ARENA_HEIGHT - 100);
                e.velocity.x = 0;
                e.velocity.y = 0;
              }
            });
            fighter.position.x = clampX(ARENA_WIDTH - 150);
            fighter.position.y = clampY(ARENA_HEIGHT - 100);
            fighter.velocity.x = 0;
            fighter.velocity.y = 0;
            ult.phase = 1;
            ult.timer = 2.0; // Hold du1 for 2 more seconds
            break;
        }
      }
      break;

    // ============ PHASE 1: du1 hold ============
    case 1:
      ult.currentSprite = 'du1';
      if (ult.timer <= 0) {
        ult.currentSprite = 'du2';
        ult.phase = 2;
        ult.timer = 1.0; // Hold du2 for 1 second
      }
      break;

    // ============ PHASE 2: du2 hold, teleport to opposite edge ============
    case 2:
      ult.currentSprite = 'du2';
      if (ult.timer <= 0) {
        // Teleport to opposite edge
        fighter.position.x = clampX(100);
        fighter.position.y = clampY(ARENA_HEIGHT - 100);
        fighter.velocity.x = 0;
        fighter.velocity.y = 0;
        ult.cameraZoom = 2.0; // Zoom out to show entire arena
        ult.phase = 3;
        ult.timer = 0.2;
        ult.attackFrame = 0;
      }
      break;

    // ============ PHASE 3: Joust sequence ============
    case 3:
      ult.timer -= dt;
      ult.cameraZoom = 0.5; // Zoom in on Dihui
      if (ult.timer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1:
            ult.currentSprite = 'djoust1';
            ult.timer = 0.2;
            break;
          case 2:
            ult.currentSprite = 'djoust2';
            ult.timer = 0.2;
            break;
          case 3:
            ult.currentSprite = 'djoust3';
            ult.timer = 0.2;
            break;
          case 4:
            ult.currentSprite = 'djoust4';
            ult.timer = 1.0;
            break;
          default:
            ult.phase = 4;
            ult.timer = 1.0;
            ult.currentSprite = 'dhalt1';
           
            break;
        }
      }
      break;

    // ============ PHASE 4: dhalt1→dhalt2 ============
    case 4:
      if (ult.timer <= 0) {
        if (ult.currentSprite === 'dhalt1') {
          ult.currentSprite = 'dhalt2';
          ult.timer = 1.5; // Hold for 3 seconds
  
        } else {
          ult.cameraZoom = 0.5;
          ult.phase = 5;
          ult.timer = 0.3;
          ult.attackFrame = 0;
        }
      }
      break;

    // ============ PHASE 5: du3→du4→du5→du6→du7 ============
    case 5:
      ult.timer -= dt;
       ult.cameraZoom = 2.25;
      if (ult.timer <= 0) {
        ult.attackFrame++;
        switch (ult.attackFrame) {
          case 1:
            ult.currentSprite = 'du3';
            ult.timer = 0.3;
            break;
          case 2:
            ult.currentSprite = 'du4';
            ult.timer = 0.3;
            break;
          case 3:
            ult.currentSprite = 'du5';
            ult.timer = 0.3;
            break;
          case 4:
            ult.currentSprite = 'du6';
            ult.timer = 0.3;
            break;
          case 5:
            ult.currentSprite = 'du7';
            ult.timer = 2.0; // Hold 2 seconds
            break;
          default:
            ult.phase = 6;
            ult.timer = 0.5;
            ult.currentSprite = 'du8';
            ult.cameraZoom = 0.5; // Zoom out
            break;
        }
      }
      break;

    // ============ PHASE 6: du8 + dline spawn + damage ============
    case 6:
      ult.currentSprite = 'du8';
      ult.timer -= dt;
      
      // On first entry, spawn dline instances and deal damage
      if (!ult.dlineSpawned) {
        // Sum all bladetrail afterimages from all enemies
        let totalAfterimage = 0;
        targetEnemies.forEach(e => {
          if (e && e.statuses) {
            const ba = e.statuses.find(s => s.type === 'Bladetrail Afterimage');
            if (ba) totalAfterimage += ba.count;
          }
        });
        ult.dlineCount = Math.min(Math.floor(totalAfterimage / 3)+1, 33);
        ult.dlineSpawned = true;
        for (let i = 0; i < ult.dlineCount; i++) {
          const offsetX = random(-50, 50);
          const offsetY = random(-50, 50);
          ult.slashEvents.push({ type: 'dline', frame: 1, offsetX, offsetY });// should be spawned at random rotations on each enemy
        }
      
        // Deal damage: +24 Base Damage, + Target Max HP × Bladetrail Afterimage %
        targetEnemies.forEach(e => {
          if (e && !e.isDefeated) {
            const ba = e.statuses.find(s => s.type === 'Bladetrail Afterimage');
            const baCount = ba ? ba.count : 0;
            const hpPercentDamage = Math.floor(e.maxHp * baCount * 0.01);
            
            // Combo-based damage: BaseDamage + (5 × ComboCount)
            const comboCount = fighter.combo || 0;
            const baseDmg = 24; // +24 Base Damage from ultimate
            const comboDamage = 5;
            const attackDamage = Math.floor(baseDmg + (comboDamage * comboCount) + hpPercentDamage);
            
            dealUltDamage(fighter, ult, e, attackDamage, true, 6, true);
            
            // Consume ALL Bladetrail Afterimage at ultimate end
            if (ba) {
              ba.count = 0;
              e.statuses = e.statuses.filter(s => s.type !== 'Bladetrail Afterimage');
            }
          }
        });
           ult.cameraZoom = 0.25; // Zoom out
        ult.phase = 7;
        ult.timer = 0.0; // Hold for 3 seconds
      }
      
      if (ult.timer <= 0) {
        ult.phase = 7;
        ult.timer = 0.5;
      }
      break;

    // ============ PHASE 7: Return to combat ============
    case 7:
       ult.timer -= dt;
      if (ult.timer <= 0) {
        // Transition to phase 11 (final hold) so match.js updateUltimates detects phase >= 11
        // and calls endUltimate to restore normal gameplay
        
        ult.phase = 11;
        ult.timer = 3.0; // Hold for 3 seconds, then match.js ends the ultimate
      }
      break;

    // ============ PHASE 11: Final hold - wait for match.js to end ultimate ============
    case 11:
      ult.currentSprite = ult.currentSprite || 'du8';
      ult.cameraZoom = 0.5;
      ult.backgroundDim = 0;
      // Timer counts down; when it reaches 0, match.js updateUltimates will detect
      // phase >= 11 and timer <= 0 and call endUltimate() to restore gameplay.
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

  // Apply combo-based damage for Valencina: Damage = BaseDamage + (3 × ComboCount)
  let actualDamage = damage;
  if (fighter.characterKey === 'VALENCINA') {
    const comboCount = fighter.combo || 0;
    actualDamage = Math.floor((fighter.baseDamage || 21) + (3 * comboCount));
  } else if (fighter.characterKey === 'CALLISTO') {
    // Apply Artwork: Tibia bonus if active
    const artworkBonus = fighter.resources?.artworkTibiaStacks || 0;
    if (artworkBonus > 0) {
      actualDamage = Math.floor(damage * (1 + 0.1 * artworkBonus));
    }
  }

  actualDamage = Math.floor(actualDamage);
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

module.exports = { initUltimate, updateJohnUltimate, updateCallistoUltimate, updateValencinaUltimate, updateDihuiUltimate, dealUltDamage, clampToArena, clampX, clampY };
