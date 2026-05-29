/**
 * ULTIMATE LOGIC - Server-side authoritative ultimate implementations
 * Stateless pure functions that take game state and return updated state
 * All timing, positioning, damage, and sequencing controlled server-side
 */

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 700;

/**
 * Initialize ultimate state structures for ultimate sequences
 */
function initUltimate(fighter) {
  return {
    active: true,
    phase: 0,
    timer: 0,
    attackFrame: 0,
    attackTimer: 0,
    totalDamage: 0,
    cameraZoom: 2.5,
    backgroundDim: 0.7,
    name: 'ULTIMATE',
    dialogue: '',
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
    restrictOrigin: null
  };
}

/**
 * ===== JOHN ULTIMATE (Basic Template) =====
 * 2-hit basic ultimate sequence
 */
function updateJohnUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

  // Clamp positions
  targetEnemies.forEach(e => { if (e) clampToArena(e); });
  clampToArena(fighter);

  // Timer decrement (only in non-attack phases)
  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 3) {
    ult.timer -= dt;
  }

  switch (ult.phase) {
    case 0: // Intro pose
      if (ult.timer <= 0) {
        ult.phase = 1;
        ult.timer = 0.5;
      }
      break;

    case 1: // Attack 1 setup
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + (fighter.facing * 80));
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
          }
        });
        ult.phase = 2;
        ult.attackFrame = 0;
        ult.attackTimer = 0.3;
        ult.cameraZoom = 1.8;
      }
      break;

    case 2: // Attack 1 - deal damage
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, false);
          });
          ult.attackTimer = 0.3;
        } else {
          ult.phase = 3;
          ult.timer = 0.5;
        }
      }
      break;

    case 3: // Final attack setup
      if (ult.timer <= 0) {
        ult.phase = 4;
        ult.attackFrame = 0;
        ult.attackTimer = 0.3;
      }
      break;

    case 4: // Final attack
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage * 2, true, 2, true);
          });
          ult.cameraZoom = 1.0;
          ult.backgroundDim = 0;
          ult.attackTimer = 1.0;
        } else {
          ult.phase = 5;
          ult.timer = 0.1;
        }
      }
      break;

    case 5: // End - set phase to 11 to trigger endUltimate in match
      // Wait for timer to expire
      if (ult.timer <= 0) {
        ult.timer = 0;
      }
      break;
  }
}

/**
 * ===== CALLISTO ULTIMATE (Closing Time) =====
 * 5-phase ultimate with multiple attack sequences
 * Each phase transition sets a sprite for the client
 */
function updateCallistoUltimate(fighter, ult, enemies, dt) {
  // Set sprite based on current phase first
  switch (ult.phase) {
    case 0: ult.currentSprite = 'cpose'; break;
    case 1: ult.currentSprite = 'cpose'; break;
    case 2: ult.currentSprite = 'cuf1'; break;
    case 3: ult.currentSprite = 'cuf2'; break;
    case 4: ult.currentSprite = 'cuf3'; break;
    case 5: ult.currentSprite = 'cuf4'; break;
    case 6: ult.currentSprite = 'cuf4'; break;
    case 7: ult.currentSprite = 'cuf5'; break;
    case 8: ult.currentSprite = 'cuf6'; break;
    case 9: ult.currentSprite = 'cs3f2'; break;
    case 10: ult.currentSprite = 'cs3f2'; break;
    case 11: ult.currentSprite = 'cuend'; break;
    default: ult.currentSprite = 'cidle'; break;
  }
  
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

  targetEnemies.forEach(e => { if (e) { clampToArena(e); if (ult.gravityDisabled) { e.velocity.y = 0; } } });
  clampToArena(fighter);

  // Timer decrement (non-attack phases)
  if (ult.phase === 0 || ult.phase === 1 || ult.phase === 3 || ult.phase === 5 || ult.phase === 7 || ult.phase === 9 || ult.phase === 11) {
    ult.timer -= dt;
  }

  switch (ult.phase) {
    case 0: // Centered pose - 1.5 seconds
      if (ult.timer <= 0) {
        ult.phase = 1;
        ult.timer = 0.3;
        fighter.facing = 1;
      }
      break;

    case 1: // Attack 1 setup - teleport enemy to right
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + 100);
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
          }
        });
        ult.cameraZoom = 1.8;
        ult.phase = 2;
        ult.attackFrame = 0;
        ult.attackTimer = 0.3;
      }
      break;

    case 2: // Attack 1 - cus1 strike
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, false);
          });
          ult.cameraZoom = 1.5;
          ult.attackTimer = 0.3;
        } else {
          ult.phase = 3;
          ult.timer = 1.0;
        }
      }
      break;

    case 3: // Attack 2 setup
      if (ult.timer <= 0) {
        ult.cameraZoom = 1.3;
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + 88);
            e.position.y = clampY(fighter.position.y - 180);
            e.velocity.x = 0;
            e.velocity.y = 0;
            ult.gravityDisabled = true;
          }
        });
        ult.phase = 4;
        ult.attackFrame = 0;
        ult.attackTimer = 0.5;
      }
      break;

    case 4: // Attack 2 - cus2 strike
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          if (typeof dealUltDamage === 'function') {
            targetEnemies.forEach(e => {
              if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 2, false);
            });
          }
          ult.cameraZoom = 1.2;
          ult.attackTimer = 0.3;
        } else {
          ult.phase = 5;
          ult.timer = 1.0;
        }
      }
      break;

    case 5: // Attack 3 setup + immediate damage
      if (ult.timer <= 0) {
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
        targetEnemies.forEach(e => {
          if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 3, true);
        });
        ult.phase = 6;
        ult.attackFrame = 1;
        ult.attackTimer = 0.3;
      }
      break;

    case 6: // Attack 3 cooldown
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.phase = 7;
        ult.timer = 1.0;
      }
      break;

    case 7: // Attack 4 setup - teleport upward, drift
      if (ult.timer <= 0) {
        fighter.position.y = clampY(fighter.position.y - 400);
        fighter.velocity.x = fighter.facing * 2;
        fighter.velocity.y = 0;
        ult.cameraZoom = 1.8;
        ult.gravityDisabled = true;
        ult.phase = 8;
        ult.attackFrame = 0;
        ult.attackTimer = 1.0;
      }
      break;

    case 8: // Attack 4 - strike
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
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
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 4, false);
          });
          ult.attackTimer = 0.3;
        } else {
          ult.phase = 9;
          ult.timer = 1.0;
        }
      }
      break;

    case 9: // Attack 5 setup - 20 rapid hits
      if (ult.timer <= 0) {
        fighter.position.x = clampX(ARENA_WIDTH / 2);
        fighter.position.y = clampY(ARENA_HEIGHT - 100);
        fighter.velocity.x = 0;
        fighter.velocity.y = 0;
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + 120);
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
            ult.gravityDisabled = true;
          }
        });
        ult.cameraZoom = 3.0;
        ult.damageInstances = 0;
        ult.phase = 10;
        ult.attackFrame = 0;
        ult.attackTimer = 0.05;
      }
      break;

    case 10: // Attack 5 - 20 damage instances
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        ult.damageInstances++;
        if (ult.damageInstances <= 20) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, Math.floor(fighter.baseDamage / 20), false, 5, false);
          });
          // Add red line effect
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
          ult.cameraZoom = 1.0;
          ult.phase = 11;
          ult.timer = 3.0;
        }
      }
      break;

    case 11: // Final hold
      // Fade in red lines
      ult.redLines.forEach(rl => {
        if (rl.opacity < rl.maxOpacity) rl.opacity += rl.fadeSpeed * dt;
      });
      // Keep gravity disabled for enemies during final hold
      targetEnemies.forEach(e => {
        if (e) { e.velocity.y = 0; }
      });
      break;
  }
}

/**
 * ===== VALENCINA ULTIMATE (Disposal) =====
 * 6-phase ultimate with multi-hit sequences
 */
function updateValencinaUltimate(fighter, ult, enemies, dt) {
  const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

  targetEnemies.forEach(e => { if (e) clampToArena(e); });
  clampToArena(fighter);

  // Timer decrement (non-attack phases)
  if (ult.phase === 0 || ult.phase === 1 || (ult.phase >= 3 && ult.phase % 2 === 1)) {
    ult.timer -= dt;
  }

  switch (ult.phase) {
    case 0: // Initial pose - 1 second
      if (ult.timer <= 0) {
        ult.phase = 1;
        ult.timer = 0.1;
      }
      break;

    case 1: // Attack 1 setup - random enemy positioning
      if (ult.timer <= 0) {
        fighter.position.x = clampX(ARENA_WIDTH / 2);
        fighter.position.y = clampY(ARENA_HEIGHT - 100);
        targetEnemies.forEach((e, i) => {
          if (e) {
            const side = Math.random() < 0.5 ? -1 : 1;
            e.position.x = clampX(fighter.position.x + (side * (80 + i * 20)));
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
          }
        });
        if (targetEnemies.length > 0 && targetEnemies[0]) {
          fighter.facing = targetEnemies[0].position.x > fighter.position.x ? 1 : -1;
        }
        fighter.velocity.x = 0;
        fighter.velocity.y = 0;
        ult.phase = 2;
        ult.attackFrame = 0;
        ult.attackTimer = 0.1;
      }
      break;

    case 2: // Attack 1 sequence: s1f2 strike
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 1, true);
          });
          ult.attackTimer = 0.1;
        } else if (ult.attackFrame === 2) {
          ult.attackTimer = 0.1;
        } else {
          ult.phase = 3;
          ult.timer = 0.1;
        }
      }
      break;

    case 3: // Attack 2 setup
      if (ult.timer <= 0) {
        fighter.position.x = clampX(ARENA_WIDTH / 2);
        fighter.position.y = clampY(ARENA_HEIGHT - 100);
        targetEnemies.forEach((e, i) => {
          if (e) {
            const side = Math.random() < 0.5 ? -1 : 1;
            e.position.x = clampX(fighter.position.x + (side * (80 + i * 20)));
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
          }
        });
        if (targetEnemies.length > 0 && targetEnemies[0]) {
          fighter.facing = targetEnemies[0].position.x > fighter.position.x ? 1 : -1;
        }
        fighter.velocity.x = 0;
        fighter.velocity.y = 0;
        ult.phase = 4;
        ult.attackFrame = 0;
        ult.attackTimer = 0.1;
      }
      break;

    case 4: // Attack 2 sequence: s4f1 strike
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 2, true);
          });
          ult.attackTimer = 0.1;
        } else {
          ult.phase = 5;
          ult.timer = 0.1;
        }
      }
      break;

    case 5: // Attack 3 setup
      if (ult.timer <= 0) {
        fighter.position.x = clampX(ARENA_WIDTH / 2);
        fighter.position.y = clampY(ARENA_HEIGHT - 100);
        targetEnemies.forEach((e, i) => {
          if (e) {
            const side = Math.random() < 0.5 ? -1 : 1;
            e.position.x = clampX(fighter.position.x + (side * (80 + i * 20)));
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
            e.velocity.y = 0;
          }
        });
        if (targetEnemies.length > 0 && targetEnemies[0]) {
          fighter.facing = targetEnemies[0].position.x > fighter.position.x ? 1 : -1;
        }
        fighter.velocity.x = 0;
        fighter.velocity.y = 0;
        ult.phase = 6;
        ult.attackFrame = 0;
        ult.attackTimer = 0.1;
      }
      break;

    case 6: // Attack 3 sequence: s3f2 strike
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 3, true);
          });
          ult.attackTimer = 0.1;
        } else {
          ult.phase = 7;
          ult.timer = 0.1;
        }
      }
      break;

    case 7: // Attack 4 setup - teleport all to center
      if (ult.timer <= 0) {
        targetEnemies.forEach(e => {
          if (e) { ult.restrictOrigin = null; }
        });
        const centerX = ARENA_WIDTH / 2;
        const centerY = ARENA_HEIGHT - 100;
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = centerX;
            e.position.y = centerY;
            e.velocity.x = 0;
            e.velocity.y = 0;
          }
        });
        const valTargetX = centerX - (fighter.facing * 80);
        fighter.position.x = clampX(valTargetX);
        fighter.position.y = centerY;
        if (fighter.position.x !== valTargetX) {
          targetEnemies.forEach(e => {
            if (e) {
              e.position.x = clampX(fighter.position.x + (fighter.facing * 80));
            }
          });
        }
        fighter.velocity.x = 0;
        fighter.velocity.y = 0;
        ult.phase = 8;
        ult.attackFrame = 0;
        ult.attackTimer = 0.2;
      }
      break;

    case 8: // Attack 4: d2 + diss1, teleport, de1 + damage
      ult.attackTimer -= dt;
      if (ult.attackTimer <= 0) {
        ult.attackFrame++;
        if (ult.attackFrame === 1) {
          ult.attackTimer = 0.2;
        } else if (ult.attackFrame === 2) {
          let targetX = targetEnemies.length > 0 && targetEnemies[0] ? targetEnemies[0].position.x + 50 : fighter.position.x + 50;
          targetX = Math.min(targetX, ARENA_WIDTH - 300);
          fighter.position.x = targetX;
          fighter.position.y = targetEnemies.length > 0 && targetEnemies[0] ? targetEnemies[0].position.y : ARENA_HEIGHT - 100;
          ult.attackTimer = 0.2;
        } else if (ult.attackFrame === 3) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 4, true);
          });
          ult.cameraZoom = 3.5;
          ult.backgroundDim = 0.8;
          ult.attackTimer = 0.2;
        } else {
          ult.phase = 9;
          ult.timer = 1.0;
        }
      }
      break;

    case 9: // Attack 5 setup
      if (ult.timer <= 0) {
        ult.phase = 10;
        ult.attackFrame = 0;
        ult.attackTimer = 0.2;
        ult.alternateCounter = 0;
      }
      break;

    case 10: // Attack 5: 5 rapid hits + final knockback
      ult.attackTimer -= dt;
      // Lock enemies in front
      if (ult.attackFrame < 5) {
        targetEnemies.forEach(e => {
          if (e) {
            e.position.x = clampX(fighter.position.x + (fighter.facing * 80));
            e.position.y = fighter.position.y;
            e.velocity.x = 0;
          }
        });
      }
      if (ult.attackTimer <= 0) {
        if (ult.attackFrame < 5) {
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage, false, 5, false);
          });
          ult.attackFrame++;
          ult.attackTimer = 0.2;
        } else if (ult.attackFrame === 5) {
          // Final hit
          targetEnemies.forEach(e => {
            if (e) dealUltDamage(fighter, ult, e, fighter.baseDamage * 2, true, 5, true);
          });
          targetEnemies.forEach(e => {
            if (e) e.velocity.x = fighter.facing * 20;
          });
          ult.cameraZoom = 1.0;
          ult.backgroundDim = 0;
          ult.phase = 11;
          ult.timer = 3.0;
        }
      }
      break;

    case 11: // Final hold
      break;
  }
}

/**
 * Helper: clamp position to arena
 */
function clampToArena(fighter) {
  fighter.position.x = clampX(fighter.position.x);
  fighter.position.y = clampY(fighter.position.y);
  if (fighter.position.x <= 100 || fighter.position.x >= ARENA_WIDTH - 100) {
    fighter.velocity.x = 0;
  }
}

function clampX(x) { return Math.max(100, Math.min(ARENA_WIDTH - 100, x)); }
function clampY(y) { return Math.max(100, Math.min(ARENA_HEIGHT - 100, y)); }

/**
 * Helper: deal damage during ultimate, prevent stagger gain
 * Returns hit data for broadcasting hit events
 */
function dealUltDamage(fighter, ult, enemy, damage, isFinal, phase, applyKnockback) {
  if (!enemy || enemy.isDefeated) return null;

  const originalStagger = enemy.stagger || 0;
  const knockbackAmount = !applyKnockback ? 0 : (isFinal ? 150 : 100);

  // Apply damage directly to server game state
  const actualDamage = Math.floor(damage);
  enemy.hp = Math.max(0, enemy.hp - actualDamage);
  
  // Apply knockback
  if (knockbackAmount > 0) {
    const dir = enemy.position.x < fighter.position.x ? -1 : 1;
    enemy.velocity.x = dir * knockbackAmount * 8;
  }

  // Set enemy to hurt state
  enemy.state = 'hit';
  enemy.hitTimer = 0.18;

  // Check defeat
  const defeated = enemy.hp <= 0;
  if (defeated) {
    enemy.isDefeated = true;
    enemy.velocity.x = 0;
    enemy.velocity.y = 0;
  }

  // Restore stagger (prevent any stagger gain during ultimate)
  enemy.stagger = originalStagger;

  // Clamp after knockback
  clampToArena(enemy);
  clampToArena(fighter);

  // Zero out fighter velocity
  fighter.velocity.x = 0;
  fighter.velocity.y = 0;

  ult.totalDamage += actualDamage;

  return {
    damage: actualDamage,
    hp: enemy.hp,
    defeated: defeated,
    knockback: knockbackAmount
  };
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

module.exports = {
  initUltimate,
  updateJohnUltimate,
  updateCallistoUltimate,
  updateValencinaUltimate,
  dealUltDamage,
  clampToArena,
  clampX,
  clampY
};