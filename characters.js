// ==========================
// 🔥 SPRITE ATLAS SYSTEM
// ==========================
let atlases = {};
const CELL = 256;

// ==========================
// 🔥 SPRITE DATABASE
// ==========================
const SPRITES = {

  // =====================================================
  // 🔴 VALENCINA
  // =====================================================

  // ===== val1 =====
  idle:   { atlas: "val1", x:0,y:0,w:2,h:2 },
  guard:  { atlas: "val1", x:2,y:0,w:2,h:3 },
  hurt:   { atlas: "val1", x:4,y:0,w:2,h:2 },
  evade:  { atlas: "val1", x:6,y:0,w:2,h:2 },
  prepat: { atlas: "val1", x:0,y:2,w:2,h:2 },
  halt1:  { atlas: "val1", x:2,y:3,w:3,h:2 },
  moving: { atlas: "val1", x:5,y:2,w:3,h:2 },
  s1f1:   { atlas: "val1", x:0,y:5,w:3,h:3 },
  s1f2:   { atlas: "val1", x:4,y:5,w:4,h:3 },

  // ===== val2 =====
  s1f3: { atlas:"val2", x:0,y:0,w:3,h:3, offsetX:+30 },
  halt2:{ atlas:"val2", x:0,y:3,w:3,h:2 },
  s2f1: { atlas:"val2", x:3,y:0,w:5,h:2 },
  joust:{ atlas:"val2", x:3,y:2,w:5,h:2 },
  s3f1: { atlas:"val2", x:0,y:5,w:3,h:2 },
  s3f2: { atlas:"val2", x:3,y:4,w:3,h:2 },
  s3f3: { atlas:"val2", x:3,y:6,w:3,h:2 },
  dist1:{ atlas:"val2", x:6,y:4,w:2,h:2 },

  // ===== val3 =====
  s4f1: { atlas:"val3", x:0,y:0,w:4,h:2 },
  s4f2: { atlas:"val3", x:0,y:2,w:3,h:3 },
  s4f3: { atlas:"val3", x:0,y:5,w:3,h:2 },
  s4f4: { atlas:"val3", x:4,y:0,w:4,h:3, offsetY:+256 },
  d1:   { atlas:"val3", x:3,y:3,w:3,h:2 },
  d2:   { atlas:"val3", x:3,y:5,w:3,h:2 },

  // ===== valdisposal =====
  de1:{ atlas:"valdisposal", x:2,y:0,w:4,h:2 },
  de2:{ atlas:"valdisposal", x:1,y:2,w:5,h:2 },
  de3:{ atlas:"valdisposal", x:0,y:4,w:8,h:2 },

  // ===== vslash1 =====
  s1s1:{ atlas:"vslash1", x:0,y:0,w:4,h:3 },
  s1s2:{ atlas:"vslash1", x:4,y:0,w:4,h:3 },
  s1s3:{ atlas:"vslash1", x:3,y:3,w:5,h:2 },
  js1: { atlas:"vslash1", x:3,y:5,w:5,h:2 },

  // ===== vslash2 =====
  s1s4:{ atlas:"vslash2", x:0,y:2,w:4,h:3 },
  s2s1:{ atlas:"vslash2", x:0,y:0,w:4,h:2 },
  s2s2:{ atlas:"vslash2", x:4,y:0,w:4,h:3, offsetY:+256 },
  diss1:{ atlas:"vslash2", x:4,y:3,w:4,h:2 },


  // =====================================================
  // 🔵 CALLISTO
  // (all prefixed with c)
  // =====================================================

  // ===== Cal1 =====
  cidle:   { atlas:"cal1", x:0, y:0, w:3, h:2 },
  cevade:  { atlas:"cal1", x:3, y:0, w:3, h:2 },
  cguard:  { atlas:"cal1", x:6, y:0, w:2, h:4 },
  churt:   { atlas:"cal1", x:0, y:2, w:3, h:2 },
  cs1f1:   { atlas:"cal1", x:3, y:2, w:3, h:3 },
  cs3f1:   { atlas:"cal1", x:0, y:4, w:3, h:2 },

  cuend: {
    atlas:"cal1",
    x:4, y:5, w:4, h:3,
    offsetY:+256
  },

  cmove: { atlas:"cal1", x:0, y:6, w:4, h:2 },

  // ===== Cal2 =====
  cs2f1: { atlas:"cal2", x:0, y:0, w:4, h:4 },
  cs3f3: { atlas:"cal2", x:4, y:0, w:4, h:2 },
  cs3f4: { atlas:"cal2", x:4, y:2, w:4, h:2 },
  cjoust:{ atlas:"cal2", x:0, y:4, w:5, h:2 },
  cpose: { atlas:"cal2", x:0, y:6, w:4, h:2 },

  // ===== Cal3 =====
  cs3f2:{ atlas:"cal3", x:5, y:0, w:3, h:3 },

  cs1f2: {
    atlas:"cal3",
    x:0, y:0, w:4, h:3,
    offsetY:+256
  },

  cs1f3: {
    atlas:"cal3",
    x:0, y:3, w:4, h:3,
    offsetY:+256
  },

  chalt: { atlas:"cal3", x:0, y:6, w:5, h:2 },

  cuf2: {
    atlas:"cal3",
    x:5, y:3, w:3, h:5,
    offsetY:+256
  },

  // ===== Cal4 =====
  cuf1: {
    atlas:"cal4",
    x:0, y:0, w:4, h:3,
    offsetX:-256,
    offsetY:+256
  },

  cuf3: {
    atlas:"cal4",
    x:4, y:0, w:4, h:6,
    offsetY:+256
  },

  cuf4: {
    atlas:"cal4",
    x:0, y:5, w:5, h:3,
    offsetX:+256,
    offsetY:+256
  },

  // ===== Cal5 =====
  cuf5:{ atlas:"cal5", x:0, y:0, w:4, h:4 },

  cuf6:{
    atlas:"cal5",
    x:1, y:4, w:6, h:3,
    offsetX:-256
  },

  // ===== Cslash1 =====
  cs2s1:{ atlas:"cslash1", x:0, y:0, w:5, h:4 },
  cjs1: { atlas:"cslash1", x:0, y:4, w:5, h:2 },
  cs3s1:{ atlas:"cslash1", x:5, y:3, w:3, h:3 },
  cs3s2:{ atlas:"cslash1", x:4, y:6, w:4, h:2 },

  cbsk1:{ atlas:"cslash1", x:2, y:6, w:2, h:2 },
  cbsk2:{ atlas:"cslash1", x:0, y:6, w:2, h:2 },
  cbsk3:{ atlas:"cslash1", x:6, y:0, w:2, h:2 },

  // ===== Cslash2 =====
  cus1:{
    atlas:"cslash2",
    x:0, y:0, w:4, h:4,
    offsetY:+256
  },

  cus2:{ atlas:"cslash2", x:4, y:0, w:4, h:5 },

  cus3:{
    atlas:"cslash2",
    x:0, y:5, w:5, h:3,
    offsetY:+512
  },

  // ===== Cslash3 =====
  cs1s1:{ atlas:"cslash3", x:0, y:0, w:4, h:3 },

  cus4:{
    atlas:"cslash3",
    x:0, y:3, w:8, h:4,
    offsetX:-256
  }
};

// ==========================
// 🔥 PRE-SCALED SPRITE LOADING
// ==========================
function loadSpriteAtlases() {

  // ===== Valencina =====
  atlases.val1 = loadImage("data/valencina/val1.png");
  atlases.val2 = loadImage("data/valencina/val2.png");
  atlases.val3 = loadImage("data/valencina/val3.png");
  atlases.valdisposal = loadImage("data/valencina/valdisposal.png");
  atlases.vslash1 = loadImage("data/valencina/vslash1.png");
  atlases.vslash2 = loadImage("data/valencina/vslash2.png");

  // ===== Callisto =====
  atlases.cal1 = loadImage("data/callisto/cal1.png");
  atlases.cal2 = loadImage("data/callisto/cal2.png");
  atlases.cal3 = loadImage("data/callisto/cal3.png");
  atlases.cal4 = loadImage("data/callisto/cal4.png");
  atlases.cal5 = loadImage("data/callisto/cal5.png");

  atlases.cslash1 = loadImage("data/callisto/cslash1.png");
  atlases.cslash2 = loadImage("data/callisto/cslash2.png");
  atlases.cslash3 = loadImage("data/callisto/cslash3.png");

  // Pre-scale all atlas images to common sizes asynchronously
  const preScaleAtlases = async () => {
    for (const [atlasName, img] of Object.entries(atlases)) {
      // Wait for image to be fully loaded
      if (img && img.width > 0) {
        for (const scale of COMMON_SCALES) {
          if (scale !== 1.0) {
            const newWidth = img.width * scale;
            const newHeight = img.height * scale;
            const pg = createGraphics(newWidth, newHeight);
            pg.image(img, 0, 0, newWidth, newHeight);
            
            const cacheKey = `${atlasName}_scaled_${scale}`;
            if (!window.PRE_SCALED_ATLASES) {
              window.PRE_SCALED_ATLASES = {};
            }
            window.PRE_SCALED_ATLASES[cacheKey] = pg;
          }
        }
      } else {
        // Wait for image to load if not ready
        await new Promise(resolve => {
          const checkLoaded = () => {
            if (img && img.width > 0) {
              resolve();
            } else {
              setTimeout(checkLoaded, 50);
            }
          };
          checkLoaded();
        });
      }
    }
    console.log("Pre-scaled atlases loaded");
  };

  // Start pre-scaling but don't block game initialization
  preScaleAtlases();

  // Pre-cache sprite data after atlases start loading
  setTimeout(() => {
    precacheSpriteData();
  }, 100);
}

// ==========================
// 🧩 CACHED SPRITE DRAWING SYSTEM
// ==========================

// Cache for sprite calculations
const SPRITE_CACHE = new Map();

// Pre-resized sprite cache for common scales
const RESIZED_SPRITE_CACHE = new Map();
const COMMON_SCALES = [0.8, 1.0, 1.2, 1.5, 2.0];

// Pre-calculate sprite data
function precacheSpriteData() {
  for (const [name, sprite] of Object.entries(SPRITES)) {
    const sx = sprite.x * CELL;
    const sy = sprite.y * CELL;
    const sw = sprite.w * CELL;
    const sh = sprite.h * CELL;
    const offsetX = sprite.offsetX || 0;
    const offsetY = sprite.offsetY || 0;
    
    SPRITE_CACHE.set(name, {
      sprite, sx, sy, sw, sh, offsetX, offsetY,
      img: null // Will be set when atlases load
    });
  }
}

// Get or create pre-resized sprite
function getResizedSprite(name, scale) {
  const cacheKey = `${name}_${scale}`;
  
  // Return cached version if exists
  if (RESIZED_SPRITE_CACHE.has(cacheKey)) {
    return RESIZED_SPRITE_CACHE.get(cacheKey);
  }
  
  // Create new resized sprite
  const cached = SPRITE_CACHE.get(name);
  if (!cached || !cached.img) return null;
  
  const newWidth = cached.sw * scale;
  const newHeight = cached.sh * scale;
  
  // Create offscreen graphics for resizing
  const pg = createGraphics(newWidth, newHeight);
  pg.image(cached.img, 0, 0, newWidth, newHeight, cached.sx, cached.sy, cached.sw, cached.sh);
  
  // Cache the resized version
  const resizedSprite = {
    img: pg,
    width: newWidth,
    height: newHeight,
    offsetX: cached.offsetX * scale,
    offsetY: cached.offsetY * scale
  };
  
  RESIZED_SPRITE_CACHE.set(cacheKey, resizedSprite);
  return resizedSprite;
}

function drawSprite(name, x, y) {
  const cached = SPRITE_CACHE.get(name);
  if (!cached) {
    console.error("Missing cached sprite:", name);
    return null;
  }
  
  let img = atlases[cached.sprite.atlas];
  if (!img) {
    console.error("Missing atlas:", cached.sprite.atlas);
    return null;
  }
  
  // Check if image is loaded
  if (img.width <= 0 || img.height <= 0) {
    console.warn("Atlas not loaded yet:", cached.sprite.atlas);
    return null;
  }
  
  // Update cache with image reference
  cached.img = img;

  push();
  translate(x, y);
  image(
    img,
    -cached.sw/2 + cached.offsetX,
    -cached.sh + cached.offsetY,
    cached.sw, cached.sh,
    cached.sx, cached.sy,
    cached.sw, cached.sh
  );
  pop();
  
  return { width: cached.sw, height: cached.sh };
}

function drawSpriteScaled(name, x, y, spriteScale = 1) {
  const cached = SPRITE_CACHE.get(name);
  if (!cached) return null;
  
  // Use pre-resized sprite for common scales
  if (COMMON_SCALES.includes(spriteScale)) {
    const resized = getResizedSprite(name, spriteScale);
    if (resized) {
      push();
      translate(x, y);
      image(
        resized.img,
        -resized.width/2 + resized.offsetX,
        -resized.height + resized.offsetY,
        resized.width, resized.height,
        0, 0, resized.width, resized.height
      );
      pop();
      return { width: resized.width, height: resized.height };
    }
  }
  
  // Fallback to runtime scaling for uncommon scales
  let img = cached.img || atlases[cached.sprite.atlas];
  if (!img) {
    console.warn("Missing atlas for scaled sprite:", cached.sprite.atlas);
    return null;
  }
  
  // Check if image is loaded
  if (img.width <= 0 || img.height <= 0) {
    console.warn("Atlas not loaded yet for scaled sprite:", cached.sprite.atlas);
    return null;
  }

  push();
  translate(x, y);
  
  // Only apply scale if needed
  if (spriteScale !== 1) {
    scale(spriteScale, spriteScale);
  }
  
  image(
    img,
    -cached.sw/2 + cached.offsetX,
    -cached.sh + cached.offsetY,
    cached.sw, cached.sh,
    cached.sx, cached.sy,
    cached.sw, cached.sh
  );
  pop();
  
  return { width: cached.sw * spriteScale, height: cached.sh * spriteScale };
}

// Fighter management system
let fighterCount = 2;
let nextFighterId = 3;

// Character roster system
const CHARACTERS = {
  JOHN: {
    name: 'John Limbus Company',
    title: 'Default Fighter',
    hp: 9999,
    speed: 7.5,
    attackInterval: 1,
    baseDamage: 15,
    staggerThreshold: 1000,
    staggerLength: 5,
    color: '#3498db',
    weapon: 'fist',
    sprite: 'data/dummy/idle.png',
    // Character-specific methods
    onSuccessfulHit: function(damage, opponent, fighter) {
      // Default implementation - no special effects
    },
    onReceiveHit: function(amount, attacker, fighter) {
      // Default implementation - no special effects
    },
    onUpdate: function(dt, opponent, fighter) {
      // Default implementation - no special effects
    },
    processKeyPressed: function(key, fighter) {
      // Default implementation - no special abilities
    },
    initializeCharacter: function(fighter) {
      // Default initialization
      fighter.weapon = this.weapon;
    },

    // 🖼️ BASIC ULTIMATE TEMPLATE
    // This is a simple template that can be easily modified for each character
    activateUltimate: function(fighter, enemies) {
      // Handle both single opponent (backward compatibility) and multiple enemies
      const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

      fighter.ultimateActive = true;
      fighter.ultimatePhase = 0;
      fighter.ultimateTimer = 1; // 1 second initial pose
      fighter.ultimateTotalDamage = 0;
      fighter.ultimateDamageDealt = 0;
      fighter.ultimateCameraZoom = 2.5;
      fighter.ultimateBackgroundDim = 0.7;

      // Set ultimate name and dialogue (customize per character)
      fighter.ultimateName = "BASIC ULTIMATE";
      fighter.ultimateDialogue = "This is a basic ultimate template!";

      // Set all enemies as protected during ultimate
      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.ultimateProtected = true;
          enemy.setState('idle');
          // Lock enemy stagger bar during ultimate
          enemy.ultimateStaggerLocked = true;
          enemy.originalStaggerDecay = enemy.staggerDecayRate || 1;
          enemy.staggerDecayRate = 0; // Prevent stagger decay
        }
      });

      // Turn off collision between all players during ultimate
      fighter.originalCollisionEnabled = fighter.collisionEnabled !== false;
      fighter.collisionEnabled = false; // Disable collision

      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.originalCollisionEnabled = enemy.collisionEnabled !== false;
          enemy.collisionEnabled = false; // Disable enemy collision
        }
      });

      // Teleport to center of arena with boundary clamping
      const centerPos = this.clampToArena(width / 2, height - 100);
      fighter.pos.x = centerPos.x;
      fighter.pos.y = centerPos.y;

      // Halt all momentum/velocity on teleport for all fighters
      fighter.vel.x = 0;
      fighter.vel.y = 0;
      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.vel.x = 0;
          enemy.vel.y = 0;
        }
      });

      // Set initial pose (use idle sprite for basic template, but only for atlas sprites)
      if (fighter.spriteType === 'atlas') {
        fighter.currentSprite = 'idle';
      }

      console.log(`[BASIC ULTIMATE] ${fighter.name} activated ${fighter.ultimateName}!`);
    },

    updateUltimate: function(fighter, enemies, dt) {
      // Handle both single opponent (backward compatibility) and multiple enemies
      const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

      // ENFORCE BOUNDARIES CONTINUOUSLY - PREVENT ALL CLIPPING
      this.enforceBoundaries(fighter);
      targetEnemies.forEach(enemy => {
        if (enemy) {
          this.enforceBoundaries(enemy);
        }
      });

      // Only decrement ultimate timer when not in attack sequences
      if (fighter.ultimatePhase === 0 || fighter.ultimatePhase === 1 ||
          (fighter.ultimatePhase >= 3 && fighter.ultimatePhase % 2 === 1)) {
        fighter.ultimateTimer -= dt;
      }

      switch (fighter.ultimatePhase) {
        case 0: // Initial pose (1 second)
          if (fighter.ultimateTimer <= 0) {
            fighter.ultimatePhase = 1;
            fighter.ultimateTimer = 0.5; // Timing before first attack
          }
          break;

        case 1: // Attack 1 setup - Position enemies and attack
          if (fighter.ultimateTimer <= 0) {
            // Position all enemies in front of the character
            targetEnemies.forEach((enemy, index) => {
              if (enemy) {
                const enemyPos = this.clampToArena(fighter.pos.x + (fighter.facing * 80), fighter.pos.y);
                enemy.pos.x = enemyPos.x;
                enemy.pos.y = enemyPos.y;
                enemy.vel.x = 0;
                enemy.vel.y = 0;
              }
            });

            fighter.ultimatePhase = 2;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.3;
          }
          break;

        case 2: // Attack 1 sequence - Deal damage
          fighter.ultimateAttackTimer -= dt;

          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;

            switch (fighter.ultimateAttackFrame) {
              case 1:
                // Deal damage to ALL enemies
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 1);
                  }
                });
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 2:
                // End attack sequence
                fighter.ultimatePhase = 3;
                fighter.ultimateTimer = 0.5; // Timing before final attack
                break;
            }
          }
          break;

        case 3: // Final attack setup
          if (fighter.ultimateTimer <= 0) {
            fighter.ultimatePhase = 4;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.3;
          }
          break;

        case 4: // Final attack sequence - Deal final damage and zoom out
          fighter.ultimateAttackTimer -= dt;

          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;

            switch (fighter.ultimateAttackFrame) {
              case 1:
                // Deal final damage to ALL enemies (2x damage)
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage * 2, true, 2);
                  }
                });

                // Zoom out camera during final attack
                fighter.ultimateCameraZoom = 1.0;
                fighter.ultimateBackgroundDim = 0;
                fighter.ultimateAttackTimer = 1.0; // Hold for 1 second
                break;
              case 2:
                // Move to final phase to allow ending
                fighter.ultimatePhase = 5;
                fighter.ultimateTimer = 0.1; // Short timer to end immediately
                break;
            }
          }
          break;

        case 5: // Final hold phase
          if (fighter.ultimateTimer <= 0) {
            // Ultimate will end via the generic system
          }
          break;
      }
    },

    endUltimate: function(fighter) {
      // Reset ultimate states
      if (fighter.spriteType === 'atlas') {
        fighter.currentSprite = 'idle';
      }
      fighter.ultimateCameraZoom = 1;
      fighter.ultimateBackgroundDim = 0;

      // Remove protection from all enemies
      if (fighter.allEnemies && Array.isArray(fighter.allEnemies)) {
        fighter.allEnemies.forEach(enemy => {
          if (enemy) {
            enemy.ultimateProtected = false;
            enemy.setState('idle');
            // Unlock enemy stagger bar
            if (enemy.ultimateStaggerLocked) {
              enemy.ultimateStaggerLocked = false;
              enemy.staggerDecayRate = enemy.originalStaggerDecay || 1;
            }
          }
        });
      }

      // Restore collision
      if (fighter.originalCollisionEnabled !== undefined) {
        fighter.collisionEnabled = fighter.originalCollisionEnabled;
      }

      console.log(`[BASIC ULTIMATE] ${fighter.name}'s ultimate ended`);
    },

    // Helper methods for ultimate
    clampToArena: function(x, y) {
      const margin = 100;
      return {
        x: constrain(x, margin, width - margin),
        y: constrain(y, margin, height - margin)
      };
    },

    enforceBoundaries: function(fighter) {
      const clamped = this.clampToArena(fighter.pos.x, fighter.pos.y);
      fighter.pos.x = clamped.x;
      fighter.pos.y = clamped.y;

      // Stop velocity if hitting boundaries
      if (fighter.pos.x <= 100 || fighter.pos.x >= width - 100) {
        fighter.vel.x = 0;
      }
    },

    dealUltimateDamage: function(fighter, enemy, damage, isFinalAttack = false, attackPhase = 1, applyKnockback = true) {
      // Store original values before modification
      const previousProtected = enemy.ultimateProtected;
      const previousCooldown = enemy.hitCooldown;

      // Calculate knockback amount (increased for ultimate)
      const knockbackAmount = !applyKnockback ? 0 : (isFinalAttack ? 150 : 100);

      // Apply damage with custom knockback
      enemy.ultimateProtected = false;
      enemy.receiveHit(damage, fighter, knockbackAmount);

      // Restore ultimate protection and cooldown after damage is applied
      enemy.ultimateProtected = previousProtected;
      enemy.hitCooldown = previousCooldown;

      // Add doubled ultimate screenshake
      if (typeof addScreenShake === 'function') {
        addScreenShake(damage, true); // isUltimate = true for doubled intensity
      }

      // ENFORCE BOUNDARIES AFTER KNOCKBACK - PREVENT ALL CLIPPING
      this.enforceBoundaries(enemy);
      this.enforceBoundaries(fighter);

      // Reset stagger to original value (prevent any stagger gain)
      enemy.stagger = enemy.stagger; // Keep current stagger

      // Add friction to knockback unless it's final attack
      if (!isFinalAttack && enemy.vel.x !== 0) {
        enemy.vel.x *= 0.8; // Apply friction (20% reduction)
      }

      // Stop character from pushing enemy
      fighter.vel.x = 0;
      fighter.vel.y = 0;

      fighter.ultimateTotalDamage += damage;
      fighter.ultimateDamageDealt += damage;

      console.log(`[BASIC ULTIMATE] Damage applied: ${damage}, total: ${fighter.ultimateTotalDamage}`);
    }
  },
CALLISTO: {
    name: 'Callisto',
    title: 'Maestro of Corporism',
    hp: 2819,
    speed: 9,
    attackInterval: 0.75,
    baseDamage: 27,
    staggerThreshold: 1409,
    staggerLength: 6,
    color: '#8b4513',
    weapon: 'Magnum Opus: Tibia',
    knockbackMultiplier: 2.0, // 200% knockback
    spriteType: 'atlas', // Use same atlas system as Valencina
    
    // 🎨 CALLISTO'S UNIQUE ABILITIES
    corpusIngredient: 0,           // Current corpus ingredient stacks (0-20)
    maxCorpusIngredient: 20,       // Maximum corpus ingredient stacks
    artworkTibiaStacks: 0,         // Artwork: Tibia stacks (gain 1 per 10 corpus spent)
    slamCooldown: 0,               // Cooldown for slam attack
    slamActive: false,             // Is slam attack active
    corpusSpentTotal: 0,           // Track total corpus spent to calculate artwork stacks
    
    // Character-specific methods
    onSuccessfulHit: function(damage, opponent, fighter) {
      if (!opponent) return;
      
      // Increment combo count for Callisto
      fighter.combo++;
      fighter.comboTimer = 1.4; // Reset combo timer
      
      // ON HIT: Inflict 4 bleed and bleed count
      opponent.addStatus('Bleed', 4, 4);
      
      // ON HIT: Gain 5 [Corpus Ingredient]
      fighter.corpusIngredient = Math.min(
        fighter.corpusIngredient + 5,
        fighter.maxCorpusIngredient
      );
      
      console.log(`🎨 Callisto gained 5 Corpus Ingredient! Total: ${fighter.corpusIngredient}/${fighter.maxCorpusIngredient}`);
    },

    applyArtworkBleedBonus: function(opponent, fighter) {
      if (!opponent || fighter.artworkTibiaStacks <= 0) return;
      const bleedStatus = opponent.statuses.find((s) => s.type === 'Bleed');
      if (!bleedStatus) return;
      const bonusPotency = fighter.artworkTibiaStacks;
      bleedStatus.potency += bonusPotency;
      console.log(`🎨 Callisto's Artwork: Tibia added +${bonusPotency} bleed potency to ${opponent.name}`);
    },
    
    onReceiveHit: function(amount, attacker, fighter) {
      // Callisto has no special receive hit mechanics yet
    },
    
    onUpdate: function(dt, opponent, fighter) {
      // Update slam cooldown
      if (fighter.slamCooldown > 0) {
        fighter.slamCooldown -= dt;
      }
      
      // Update Installation Art timer
      if (typeof this.updateInstallationArt === 'function') {
        this.updateInstallationArt(fighter, dt, opponent);
      }
      
      // Update slam active state based on fighter state
      if (fighter.state === 'slam') {
        fighter.slamActive = true;
      } else if (fighter.slamActive && fighter.onGround()) {
        fighter.slamActive = false;
      }
    },

    updateInstallationArt: function(fighter, dt, opponent) {
      if (fighter.installationArtCooldown > 0) {
        fighter.installationArtCooldown = Math.max(0, fighter.installationArtCooldown - dt);
      }
      if (fighter.installationArtActive) {
        fighter.installationArtTimer -= dt;
        
        // Execute attack after 0.5 second delay
        if (fighter.installationArtTimer <= 0 && !fighter.installationArtExecuted) {
          fighter.installationArtExecuted = true;
          
          // Use cevade sprite for execution - but keep cguard for additional 0.5s
          fighter.currentSprite = 'cevade';
          console.log(`[DEBUG] Installation Art - Set sprite to cevade, current: ${fighter.currentSprite}`);
          
          console.log('[DEBUG] Installation Art - Executing AOE attack!');
          this.executeImprovisedRibcage(fighter);
        }
        
        // End ability after execution + additional 0.5 seconds (total 1.0s from start)
        if (fighter.installationArtTimer <= -0.5) {
          fighter.installationArtActive = false;
          fighter.installationArtExecuted = false;
          fighter.installationArtTimer = 0;
          
          // Reset sprite back to normal
          fighter.currentSprite = 'cidle';
          console.log(`[DEBUG] Installation Art - Reset sprite to cidle, current: ${fighter.currentSprite}`);
        }
      }
    },
    
    // Find closest target for abilities
    findClosestTarget: function(fighter) {
      console.log(`[DEBUG] findClosestTarget - allEnemies: ${fighter.allEnemies ? fighter.allEnemies.length : 'null'}`);
      if (fighter.allEnemies && Array.isArray(fighter.allEnemies)) {
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        fighter.allEnemies.forEach((enemy, index) => {
          console.log(`[DEBUG] Enemy ${index}: ${enemy ? enemy.name : 'null'}, HP: ${enemy ? enemy.hp : 'null'}`);
          if (enemy && enemy.hp > 0) {
            const distance = dist(fighter.pos.x, fighter.pos.y, enemy.pos.x, enemy.pos.y);
            console.log(`[DEBUG] Distance to ${enemy.name}: ${distance}`);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestEnemy = enemy;
              console.log(`[DEBUG] New closest: ${enemy.name} at distance ${distance}`);
            }
          }
        });
        
        console.log(`[DEBUG] Final closest target: ${closestEnemy ? closestEnemy.name : 'None'}`);
        return closestEnemy;
      }
      console.log('[DEBUG] No allEnemies array found');
      return null;
    },
    
    processKeyPressed: function(key, fighter) {
      // Slam attack on Space key (when not on ground)
      if (key === ' ' && !fighter.onGround() && fighter.slamCooldown <= 0) {
        this.useSlamAttack(fighter);
      }
      
      // Installation Art ability on Q key
      if (key === 'q' && !fighter.installationArtActive) {
        this.useInstallationArt(fighter);
      }
    },
    
    // 💥 Slam Attack Ability
    useSlamAttack: function(fighter, opponent) {
      if (fighter.onGround() || fighter.slamCooldown > 0) return;
      
      const corpusToSpend = Math.min(fighter.corpusIngredient, 20);
      
      if (corpusToSpend === 0) {
        console.log('🎨 No Corpus Ingredient to spend for slam!');
        return;
      }
      
      // Consume up to 20 Corpus Ingredient
      fighter.corpusIngredient -= corpusToSpend;
      fighter.corpusSpentTotal += corpusToSpend;
      
      // Consume bleed stacks when using this ability
      if (fighter.statusSystem && typeof fighter.statusSystem.consumeOnAbility === 'function') {
        fighter.statusSystem.consumeOnAbility();
      }
      
      // Gain 1 Artwork: Tibia for every 10 spent Corpus Ingredient
      const newArtworkStacks = Math.floor(fighter.corpusSpentTotal / 10);
      if (newArtworkStacks > fighter.artworkTibiaStacks) {
        fighter.artworkTibiaStacks = newArtworkStacks;
        console.log(`🎨 Callisto gained Artwork: Tibia! Total stacks: ${fighter.artworkTibiaStacks}`);
      }
      
      // Slam attack mechanics
      fighter.executeSlamAttack(opponent);
      
      // Apply temporary buffs during slam
      this.applySlamBuffs(fighter, corpusToSpend);
      
      // Slam cooldown (adjust as needed for balance)
      fighter.slamCooldown = 2;
      
      console.log(`💥 Callisto used Slam Attack! Spent ${corpusToSpend} Corpus Ingredient`);
    },
    
    // Apply temporary buffs from slam attack
    applySlamBuffs: function(fighter, corpusSpent) {
      // Save original values before modifying (only on first slam buff application)
      if (!fighter.slamBuffActive) {
        fighter.originalAttackRange = fighter.attackRange;
        fighter.originalAttackInterval = fighter.attackInterval;
        fighter.slamBuffActive = true;
      }
      
      // Gain 100% range (2x multiplier)
      fighter.attackRange = fighter.originalAttackRange * 2;
      
      // -50% attack interval (divide by 2, which is 50% reduction)
      fighter.attackInterval = fighter.originalAttackInterval * 0.5;
      
      // 3 second duration for buffs
      fighter.slamBuffTimer = 3;
    },
    
    // Calculate damage with Artwork: Tibia bonus
    calculateArtworkDamageBonus: function(fighter) {
      // Per stack of Artwork: Tibia: Deal +10% damage
      return fighter.artworkTibiaStacks * 0.1;
    },
    
    // Installation Art ability
    useInstallationArt: function(fighter) {
      if (fighter.installationArtActive) return;
      if (fighter.installationArtCooldown > 0) {
        console.log(`🎨 Installation Art on cooldown: ${fighter.installationArtCooldown.toFixed(1)}s`);
        return;
      }
      
      fighter.installationArtActive = true;
      fighter.installationArtTimer = 0.5;
      fighter.installationArtExecuted = false;
      
      // Consume bleed stacks when using this ability
      if (fighter.statusSystem && typeof fighter.statusSystem.consumeOnAbility === 'function') {
        fighter.statusSystem.consumeOnAbility();
      }
      
      // Use cguard sprite for windup
      fighter.currentSprite = 'cguard';
      console.log(`[DEBUG] Installation Art - Set sprite to cguard, current: ${fighter.currentSprite}`);
      
      console.log('🎨 Callisto activated Installation Art!');
    },

    // Execute Improvised Ribcage attack (AOE - hits all players in range)
    executeImprovisedRibcage: function(fighter) {
      const attackRange = 300; // Same range as hitbox check
      let targetsHit = 0;
      
      console.log(`[DEBUG] Installation Art AOE - Fighter position: (${fighter.pos.x.toFixed(1)}, ${fighter.spawnY.toFixed(1)})`);
      console.log(`[DEBUG] Installation Art AOE - Attack range: ${attackRange}px`);
      
      // Count as normal attack (damage + combo)
      fighter.attackCounter = Math.min(3, fighter.attackCounter + 1);
      fighter.attackCounterDisplay = fighter.attackCounter;
      fighter.attackCounterTimer = 1.0;
      
      // Increment combo count for Callisto
      fighter.combo++;
      fighter.comboTimer = 1.4; // Reset combo timer
      
      // Use cevade sprite for execution
      fighter.currentSprite = 'cevade';
      
      // Find all targets in range (AOE)
      const allTargets = [];
      
      console.log(`[DEBUG] Installation Art AOE - window.fighters: ${window.fighters ? window.fighters.length : 'null'}`);
      console.log(`[DEBUG] Installation Art AOE - lastHitOpponent: ${fighter.lastHitOpponent ? fighter.lastHitOpponent.name : 'null'}`);
      
      // Add opponent if in range
      if (fighter.lastHitOpponent && fighter.lastHitOpponent.hp > 0) {
        const distance = dist(fighter.pos.x, fighter.spawnY, fighter.lastHitOpponent.pos.x, fighter.lastHitOpponent.spawnY);
        console.log(`[DEBUG] Installation Art AOE - Distance to lastHitOpponent ${fighter.lastHitOpponent.name}: ${distance.toFixed(1)}px`);
        if (distance <= attackRange) {
          allTargets.push(fighter.lastHitOpponent);
          console.log(`[DEBUG] Installation Art AOE - Added lastHitOpponent to targets`);
        } else {
          console.log(`[DEBUG] Installation Art AOE - lastHitOpponent out of range`);
        }
      }
      
      // Add all other fighters in range
      if (window.fighters && window.fighters.length > 0) {
        console.log(`[DEBUG] Installation Art AOE - Checking ${window.fighters.length} fighters...`);
        for (let i = 0; i < window.fighters.length; i++) {
          const otherFighter = window.fighters[i];
          console.log(`[DEBUG] Installation Art AOE - Fighter ${i}: ${otherFighter ? otherFighter.name : 'null'}, HP: ${otherFighter ? otherFighter.hp : 'null'}, IsSelf: ${otherFighter === fighter}`);
          
          if (otherFighter !== fighter && otherFighter.hp > 0) {
            const distance = dist(fighter.pos.x, fighter.spawnY, otherFighter.pos.x, otherFighter.spawnY);
            console.log(`[DEBUG] Installation Art AOE - Distance to ${otherFighter.name}: ${distance.toFixed(1)}px`);
            
            if (distance <= attackRange) {
              // Avoid duplicates
              if (!allTargets.includes(otherFighter)) {
                allTargets.push(otherFighter);
                console.log(`[DEBUG] Installation Art AOE - Added ${otherFighter.name} to targets`);
              } else {
                console.log(`[DEBUG] Installation Art AOE - ${otherFighter.name} already in targets (duplicate)`);
              }
            } else {
              console.log(`[DEBUG] Installation Art AOE - ${otherFighter.name} out of range`);
            }
          } else {
            console.log(`[DEBUG] Installation Art AOE - Skipping ${otherFighter ? otherFighter.name : 'null'} (self or dead)`);
          }
        }
      } else {
        console.log(`[DEBUG] Installation Art AOE - No window.fighters available!`);
      }
      
      console.log(`[DEBUG] Installation Art AOE - Total targets found: ${allTargets.length}`);
      
      // Fallback: If no targets found, try alternative targeting
      if (allTargets.length === 0) {
        console.log(`[DEBUG] Installation Art AOE - No targets found, trying fallback methods...`);
        
        // Try to find any enemy using different methods
        if (typeof window.allFighters !== 'undefined' && window.allFighters && window.allFighters.length > 0) {
          console.log(`[DEBUG] Installation Art AOE - Checking window.allFighters: ${window.allFighters.length} fighters`);
          for (let otherFighter of window.allFighters) {
            if (otherFighter !== fighter && otherFighter.hp > 0) {
              const distance = dist(fighter.pos.x, fighter.spawnY, otherFighter.pos.x, otherFighter.spawnY);
              console.log(`[DEBUG] Installation Art AOE - Fallback distance to ${otherFighter.name}: ${distance.toFixed(1)}px`);
              
              if (distance <= attackRange) {
                allTargets.push(otherFighter);
                console.log(`[DEBUG] Installation Art AOE - Fallback added ${otherFighter.name} to targets`);
              }
            }
          }
        }
        
        // Try using opponent parameter if available
        if (typeof opponent !== 'undefined' && opponent && opponent.hp > 0 && opponent !== fighter) {
          const distance = dist(fighter.pos.x, fighter.spawnY, opponent.pos.x, opponent.spawnY);
          console.log(`[DEBUG] Installation Art AOE - Distance to opponent ${opponent.name}: ${distance.toFixed(1)}px`);
          
          if (distance <= attackRange) {
            allTargets.push(opponent);
            console.log(`[DEBUG] Installation Art AOE - Added opponent ${opponent.name} to targets`);
          }
        }
        
        console.log(`[DEBUG] Installation Art AOE - After fallback, targets found: ${allTargets.length}`);
      }
      
      // Apply effects to all targets in range
      allTargets.forEach(target => {
        // Calculate and deal damage
        const damage = fighter.baseDamage;
        const finalDamage = fighter.calculateDamage(damage, target);
        target.receiveHit(finalDamage, fighter, 0);
        
        // Apply 8 bleed
        target.addStatus('Bleed', 8, 8);
        
        // Apply sinking potency by damage dealt and 1 sinking count
        target.addStatus('Sinking', 1, finalDamage);
        
        // Deal 500% of damage dealt to stagger damage
        target.stagger += finalDamage * 5;
        
        // Spawn random cbsk slash effect at target location
        const cbskEffects = ['cbsk1', 'cbsk2', 'cbsk3'];
        const randomCbsk = random(cbskEffects);
        
        // Create slash effect directly at target position (horizontal only)
        const effect = {
          type: randomCbsk,
          pos: { x: target.pos.x, y: 0 }, // Inherit only horizontal position, y will be ground level
          facing: target.facing,
          timer: 5.0, // 5 seconds for cbsk effects
          targetOffset: { x: 0, y: 0 },
          owner: fighter, // Add to caster's effects so they get drawn
          rotation: random(-PI/4, PI/4) // Random -45 to 45 degrees
        };
        
        // Add to caster's slash effects (not target's) so all effects get drawn
        if (fighter.slashEffects.length < 6) {
          fighter.slashEffects.push(effect);
        }
        
        console.log(`[DEBUG] Installation Art - Spawned ${randomCbsk} effect on ${target.name} at ground level`);
        
        targetsHit++;
        console.log(`🎨 Installation Art hit ${target.name}! Damage: ${finalDamage.toFixed(1)}, Stagger: ${(finalDamage * 5).toFixed(1)}`);
      });
      
      // Set cooldown
      fighter.installationArtCooldown = 10;
      
      console.log(`🎨 Installation Art executed! Hit ${targetsHit} targets in range`);
    },

    
    // Initialize character
    initializeCharacter: function(fighter) {
      fighter.weapon = this.weapon;
      fighter.corpusIngredient = 0;
      fighter.artworkTibiaStacks = 0;
      fighter.corpusSpentTotal = 0;
      fighter.slamCooldown = 0;
      fighter.slamActive = false;
      fighter.slamBuffActive = false;
      fighter.slamBuffTimer = 0;
      
      // Installation Art properties
      fighter.installationArtActive = false;
      fighter.installationArtTimer = 0;
      fighter.installationArtExecuted = false;
      fighter.installationArtCooldown = 0;
    },

    // 🎨 CALLISTO'S ULTIMATE: Closing Time - Installation Art no. 1: Your Flesh and Bones as the Gallery's Seats
    activateUltimate: function(fighter, enemies) {
      // Handle both single opponent (backward compatibility) and multiple enemies
      const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

      fighter.ultimateActive = true;
      fighter.ultimatePhase = 0;
      fighter.ultimateTimer = 1.5; // 1.5 seconds for centered pose (cpose)
      fighter.ultimateTotalDamage = 0;
      fighter.ultimateDamageDealt = 0;
      fighter.ultimateCameraZoom = 2.5;
      fighter.ultimateBackgroundDim = 0.7;

      // Set ultimate name and dialogue
      fighter.ultimateName = "CLOSING TIME";
      fighter.ultimateDialogue = "Installation Art no. 1: Your Flesh and Bones as the Gallery's Seats";

      // Initialize ultimate-specific properties
      fighter.ultimateRedLines = []; // Array to store red line effects
      fighter.ultimateSkulls = []; // Array to store skull instances
      fighter.ultimateDamageInstances = 0; // Counter for attack 5 damage instances
      fighter.ultimateGravityDisabled = false;

      // Set all enemies as protected during ultimate
      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.ultimateProtected = true;
          enemy.setState('idle');
          // Lock enemy stagger bar during ultimate
          enemy.ultimateStaggerLocked = true;
          enemy.originalStaggerDecay = enemy.staggerDecayRate || 1;
          enemy.staggerDecayRate = 0; // Prevent stagger decay
          // Store original position for restoration
          enemy.ultimateOriginalPos = { x: enemy.pos.x, y: enemy.pos.y };
        }
      });

      // Turn off collision between all players during ultimate
      fighter.originalCollisionEnabled = fighter.collisionEnabled !== false;
      fighter.collisionEnabled = false; // Disable collision

      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.originalCollisionEnabled = enemy.collisionEnabled !== false;
          enemy.collisionEnabled = false; // Disable enemy collision
        }
      });

      // Teleport to center of arena with boundary clamping
      const centerPos = this.clampToArena(width / 2, height - 100);
      fighter.pos.x = centerPos.x;
      fighter.pos.y = centerPos.y;

      // Halt all momentum/velocity on teleport for all fighters
      fighter.vel.x = 0;
      fighter.vel.y = 0;
      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.vel.x = 0;
          enemy.vel.y = 0;
        }
      });

      // Set initial pose (cpose for 3 seconds)
      fighter.currentSprite = 'cpose';

      // Initialize ultimate state
      fighter.ultimateAttackFrame = 0;
      fighter.ultimateAttackTimer = 0;

      console.log(`[CLOSING TIME] ${fighter.name} activated CLOSING TIME!`);
    },

    updateUltimate: function(fighter, enemies, dt) {
      // Handle both single opponent (backward compatibility) and multiple enemies
      const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];

      // ENFORCE BOUNDARIES CONTINUOUSLY - PREVENT ALL CLIPPING
      this.enforceBoundaries(fighter);
      targetEnemies.forEach(enemy => {
        if (enemy) {
          this.enforceBoundaries(enemy);
        }
      });

      // Only decrement ultimate timer when not in attack sequences
      if (fighter.ultimatePhase === 0 || fighter.ultimatePhase === 1 || 
          fighter.ultimatePhase === 3 || fighter.ultimatePhase === 5 ||
          fighter.ultimatePhase === 7 || fighter.ultimatePhase === 9 ||
          fighter.ultimatePhase === 11) {
        fighter.ultimateTimer -= dt;
      }

      switch (fighter.ultimatePhase) {
        case 0: // Centered pose (cpose) - 1.5 seconds
          if (fighter.ultimateTimer <= 0) {
            fighter.ultimatePhase = 1;
            fighter.ultimateTimer = 0.3; // Timing before attack 1
          }
          break;

        case 1: // Attack 1 setup
          if (fighter.ultimateTimer <= 0) {
            // Teleport opponent to 100 pixels to the right of Callisto
            targetEnemies.forEach(enemy => {
              if (enemy) {
                const enemyPos = this.clampToArena(fighter.pos.x + 100, fighter.pos.y);
                enemy.pos.x = enemyPos.x;
                enemy.pos.y = enemyPos.y;
                enemy.vel.x = 0;
                enemy.vel.y = 0;
              }
            });

            fighter.ultimateCameraZoom = 1.8; // Zoom out before attack 1
            fighter.ultimatePhase = 2;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.3;
            fighter.currentSprite = 'cuf1';
          }
          break;

        case 2: // Attack 1 sequence
          fighter.ultimateAttackTimer -= dt;

          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;

            switch (fighter.ultimateAttackFrame) {
              case 1:
                // Deal damage with cus1 without knockback
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 1, false);
                     fighter.ultimateCameraZoom = 1.5; 
                  }
                });
                fighter.spawnSlashEffect('cus1', { x: 0, y: -10 });
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 2:
                // End attack sequence
                fighter.ultimatePhase = 3;
                fighter.ultimateTimer = 1; // 1 second before next attack
                break;
            }
          }
          break;

        case 3: // Attack 2 setup
          if (fighter.ultimateTimer <= 0) {
            fighter.ultimateCameraZoom = 1.3; // Zoom out before attack 2
            fighter.currentSprite = 'cuf2';
            
            // Draw opponent at callisto's position (x+88, y-180)
            targetEnemies.forEach(enemy => {
              if (enemy) {
                const enemyPos = this.clampToArena(fighter.pos.x + 88, fighter.pos.y - 180);
                enemy.pos.x = enemyPos.x;
                enemy.pos.y = enemyPos.y;
                enemy.vel.x = 0;
                enemy.vel.y = 0;
                enemy.ultimateGravityDisabled = true; // Prevent enemy from moving after teleport
              }
            });

            fighter.ultimatePhase = 4;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.5; // Hold for 0.5 sec
          }
          break;

        case 4: // Attack 2 sequence
          fighter.ultimateAttackTimer -= dt;

          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;

            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.currentSprite = 'cuf3';
                fighter.spawnSlashEffect('cus2', { x: 0, y: -10 });
                fighter.ultimateCameraZoom = 1.2;
                // Deal damage with cus2 without knockback
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 2, false);
                  }
                });
                
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 2:
                // End attack sequence
                fighter.ultimatePhase = 5;
                fighter.ultimateTimer = 1; // 1 second before next attack
                break;
            }
          }
          break;

        case 5: // Attack 3 setup + execution
          if (fighter.ultimateTimer <= 0) {
            // Teleport enemy to the ground 200 pixels in front of Callisto
            targetEnemies.forEach(enemy => {
              if (enemy) {
                const enemyPos = this.clampToArena(fighter.pos.x + (fighter.facing * 200), height - 100);
                enemy.pos.x = enemyPos.x;
                enemy.pos.y = enemyPos.y;
                enemy.vel.x = 0;
                enemy.vel.y = 0;
                enemy.ultimateGravityDisabled = false; // Prevent enemy from moving after teleport
              }
            });

            fighter.ultimateCameraZoom = 1.8; // Zoom out before attack 3
            fighter.currentSprite = 'cuf4';

            // Execute attack at the same time as teleport
            targetEnemies.forEach(enemy => {
              if (enemy) {
                this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 3);
              }
            });
            fighter.spawnSlashEffect('cus3', { x: 0, y: -10 });

            fighter.ultimatePhase = 6;
            fighter.ultimateAttackFrame = 1;
            fighter.ultimateAttackTimer = 0.3;
          }
          break;

        case 6: // Attack 3 cooldown
          fighter.ultimateAttackTimer -= dt;

          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimatePhase = 7;
            fighter.ultimateTimer = 1; // 1 second before next attack
          }
          break;

        case 7: // Attack 4 setup - teleport upward and drift toward opponent
          if (fighter.ultimateTimer <= 0) {
            // Teleport Callisto upward by 500 pixels and begin drifting toward the opponent
            const newY = this.clampToArena(fighter.pos.x, fighter.pos.y - 400).y;
            fighter.pos.y = newY;
            fighter.vel.x = fighter.facing * 2;
            fighter.vel.y = 0;
            fighter.currentSprite = 'cuf5';
            fighter.ultimateCameraZoom = 1.8; // Zoom outward while moving vertically
            fighter.ultimateGravityDisabled = true;

            fighter.ultimatePhase = 8;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 1; // Hold for 1 second
          }
          break;

        case 8: // Attack 4 sequence
          fighter.ultimateAttackTimer -= dt;

          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;

            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.ultimateGravityDisabled = false;
                // Teleport 300 pixels in front of the enemy
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    const teleportPos = this.clampToArena(enemy.pos.x + (enemy.facing * 300), enemy.pos.y);
                    fighter.pos.x = teleportPos.x;
                    fighter.pos.y = teleportPos.y;
                    fighter.vel.x = 0;
                    fighter.vel.y = 0;
                  }
                });

                fighter.currentSprite = 'cuf6';
                // Deal damage with cus4
                fighter.ultimateCameraZoom = 1.3;
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 4);
                  }
                });
                fighter.spawnSlashEffect('cus4', { x: 0, y: -10 });
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 2:
                // End attack sequence
                fighter.ultimatePhase = 9;
                fighter.ultimateTimer = 1; // 1 second before next attack
                break;
            }
          }
          break;

        case 9: // Attack 5 setup - teleport to center with enemy in front
          if (fighter.ultimateTimer <= 0) {
            const centerPos = this.clampToArena(width / 2, height - 100);
            fighter.pos.x = centerPos.x;
            fighter.pos.y = centerPos.y;
            fighter.vel.x = 0;
            fighter.vel.y = 0;

            targetEnemies.forEach(enemy => {
              if (enemy) {
                const enemyFrontX = this.clampToArena(fighter.pos.x + 120, fighter.pos.y).x;
                enemy.pos.x = enemyFrontX;
                enemy.pos.y = fighter.pos.y;
                enemy.vel.x = 0;
                enemy.vel.y = 0;
                enemy.ultimateGravityDisabled = true; // Prevent enemy from moving after teleport
              }
            });

            fighter.currentSprite = 'cs3f2';
            fighter.spawnSlashEffect('cs3s1', { x: 0, y: -10 });
            fighter.ultimateCameraZoom = 3.0; // Zoom in to Callisto
            fighter.ultimateDamageInstances = 0; // Reset damage counter
            
            fighter.ultimatePhase = 10;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.05; // 20 instances over 1 second = 0.05s each
          }
          break;

        case 10: // Attack 5 sequence - 20 damage instances with red lines
          fighter.ultimateAttackTimer -= dt;

          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            fighter.ultimateDamageInstances++;

            // Deal damage instance
            if (fighter.ultimateDamageInstances <= 20) {
              targetEnemies.forEach(enemy => {
                if (enemy) {
                  this.dealUltimateDamage(fighter, enemy, fighter.baseDamage / 20, false, 5, false);
                }
              });

              // Spawn red line effect
              const bottomX = random(100, width - 100);
              const topX = constrain(bottomX + random(-100, 100), 100, width - 100);
              const lineEffect = {
                type: 'redLine',
                topX,
                bottomX,
                topY: 0,
                bottomY: height,
                opacity: 0,
                maxOpacity: 1,
                fadeSpeed: 2
              };
              fighter.ultimateRedLines.push(lineEffect);

              fighter.ultimateAttackTimer = 0.05; // Next instance in 0.05s
            } else {
              // All 20 instances done
              fighter.currentSprite = 'cuend'; // Switch to u (cuend)
              fighter.ultimateCameraZoom = 1.0; // Zoom out
              
              // Spawn 21 skull instances
              for (let i = 0; i < 21; i++) {
                const skullTypes = ['cbsk1', 'cbsk2', 'cbsk3'];
                const randomSkull = skullTypes[Math.floor(random(0, skullTypes.length))];
                const randomScale = random(1, 2);
                const randomX = constrain(fighter.pos.x + random(-500, 500), 100, width - 100);
                const randomY = height + random(100, 500);
                const randomRotation = random(-PI/3, PI/3); // +- 60 degrees

                const skullEffect = {
                  type: randomSkull,
                  x: randomX,
                  y: randomY,
                  scale: randomScale,
                  rotation: randomRotation,
                  timer: 3 // Hold for 3 seconds
                };
                fighter.ultimateSkulls.push(skullEffect);
              }

              fighter.ultimatePhase = 11;
              fighter.ultimateTimer = 3; // Hold for 3 seconds
            }
          }
          break;

        case 11: // Final hold phase - skulls visible
          // Update red line fade-in
          fighter.ultimateRedLines.forEach(line => {
            if (line.opacity < line.maxOpacity) {
              line.opacity += line.fadeSpeed * dt;
            }
          });

          if (fighter.ultimateTimer <= 0) {
            // Ultimate will end via the generic system
          }
          break;
      }
    },

    endUltimate: function(fighter) {
      // Reset ultimate states
      fighter.currentSprite = 'cidle';
      fighter.ultimateCameraZoom = 1;
      fighter.ultimateBackgroundDim = 0;
      fighter.ultimateGravityDisabled = false;

      // Clear ultimate effects
      fighter.ultimateRedLines = [];
      fighter.ultimateSkulls = [];
      fighter.ultimateDamageInstances = 0;

      // Remove protection from all enemies
      if (fighter.allEnemies && Array.isArray(fighter.allEnemies)) {
        fighter.allEnemies.forEach(enemy => {
          if (enemy) {
            enemy.ultimateProtected = false;
            enemy.setState('idle');
            // Unlock enemy stagger bar
            if (enemy.ultimateStaggerLocked) {
              enemy.ultimateStaggerLocked = false;
              enemy.staggerDecayRate = enemy.originalStaggerDecay || 1;
            }
            // Restore original positions
            if (enemy.ultimateOriginalPos) {
              enemy.pos.x = enemy.ultimateOriginalPos.x;
              enemy.pos.y = enemy.ultimateOriginalPos.y;
            }
            // Reset gravity disable
            enemy.ultimateGravityDisabled = false;
          }
        });
      }

      // Restore collision
      if (fighter.originalCollisionEnabled !== undefined) {
        fighter.collisionEnabled = fighter.originalCollisionEnabled;
      }

      // Consume all stored resource stacks at ultimate end
      fighter.corpusIngredient = 0;
      fighter.artworkTibiaStacks = 0;
      fighter.corpusSpentTotal = 0;
      console.log(`🎨 Callisto consumed all Corpus Ingredient and Artwork: Tibia at ultimate end`);

      console.log(`[CLOSING TIME] ${fighter.name}'s ultimate ended`);
    },

    // Helper methods for ultimate
    clampToArena: function(x, y) {
      const margin = 100;
      return {
        x: constrain(x, margin, width - margin),
        y: constrain(y, margin, height - margin)
      };
    },

    enforceBoundaries: function(fighter) {
      const clamped = this.clampToArena(fighter.pos.x, fighter.pos.y);
      fighter.pos.x = clamped.x;
      fighter.pos.y = clamped.y;

      // Stop velocity if hitting boundaries
      if (fighter.pos.x <= 100 || fighter.pos.x >= width - 100) {
        fighter.vel.x = 0;
      }
    },

    dealUltimateDamage: function(fighter, enemy, damage, isFinalAttack = false, attackPhase = 1, applyKnockback = true) {
      // Store original values before modification
      const previousProtected = enemy.ultimateProtected;
      const previousCooldown = enemy.hitCooldown;

      // Calculate knockback amount (increased for ultimate)
      const knockbackAmount = !applyKnockback ? 0 : (isFinalAttack ? 150 : 100);

      // Apply damage with custom knockback
      enemy.ultimateProtected = false;
      enemy.receiveHit(damage, fighter, knockbackAmount);

      // Restore ultimate protection and cooldown after damage is applied
      enemy.ultimateProtected = previousProtected;
      enemy.hitCooldown = previousCooldown;

      // Add doubled ultimate screenshake
      if (typeof addScreenShake === 'function') {
        addScreenShake(damage, true); // isUltimate = true for doubled intensity
      }

      // ENFORCE BOUNDARIES AFTER KNOCKBACK - PREVENT ALL CLIPPING
      this.enforceBoundaries(enemy);
      this.enforceBoundaries(fighter);

      // Reset stagger to original value (prevent any stagger gain)
      enemy.stagger = enemy.stagger; // Keep current stagger

      // Add friction to knockback unless it's final attack
      if (!isFinalAttack && enemy.vel.x !== 0) {
        enemy.vel.x *= 0.8; // Apply friction (20% reduction)
      }

      // Stop character from pushing enemy
      fighter.vel.x = 0;
      fighter.vel.y = 0;

      fighter.ultimateTotalDamage += damage;
      fighter.ultimateDamageDealt += damage;

      console.log(`[CLOSING TIME] Damage applied: ${damage}, total: ${fighter.ultimateTotalDamage}`);
    }
  },

  VALENCINA: {
    name: 'Valencina',
    title: 'The Accelerating Future',
    hp: 3204,
    speed: 9,//val speed is 9
    attackInterval: 1,
    baseDamage: 21,
    staggerThreshold: 1300,
    staggerLength: 5,
    color: '#ff6b9d',
    weapon: 'La Spada di Palermo',
    spriteType: 'atlas', // Use sprite atlas system
    
    // 🎯 VALENCINA'S UNIQUE ABILITIES
    accelerationRounds: 0,        // Current acceleration round stacks
    maxAccelerationRounds: 10,    // Maximum acceleration round stacks
    precognition: 30,            // Starting precognition count
    maxPrecognition: 30,         // Maximum precognition
    overheat: 0,                 // Overheat count
    maxOverheat: 30,             // Maximum overheat
    combo: 0,                    // Current combo counter
    shinActive: false,           // Shin (心) - Valencina status
    knockbackMultiplier: 1.0,    // 100% knockback
    protection: 0,               // Protection stacks
    poiseCount: 0,               // Poise count
    poisePotency: 0,             // Poise potency
    burnPotency: 0,              // Burn potency
    burnCount: 0,                // Burn count
    tremorPotency: 0,            // Tremor potency
    tremorCount: 0,              // Tremor count
    gameTimeTarget: false,       // Game target status
    accelerationActive: false,   // Acceleration round active
    timeToHuntCooldown: 0,      // Time to Hunt cooldown
    disposialActive: false,     // Disposial ultimate active
    disposialPhase: 0,          // Disposial phase (1-5)
    lastEvadeTime: 0,           // Last evade time for precognition
    lastHitTime: 0,             // Last hit time for precognition
    
    // Character-specific methods
    onSuccessfulHit: function(damage, opponent, fighter) {
      if (!opponent) return;
      
      // Track last hit opponent for Time to Hunt ability
      fighter.lastHitOpponent = opponent;
      
      // ON HIT: Inflict 2 burn potency and count
      opponent.addStatus('Burn', 2, 2);
      // ON HIT: Inflict 2 tremor potency and count
      opponent.addStatus('Tremor', 2, 2);
      
      // Accelerating Future: Gain combo and apply effects
      fighter.combo++;
      this.applyAcceleratingFuture(fighter);
      
      // Eye of Precognition: Gain 1 precognition on hit
      if (fighter.precognition < fighter.maxPrecognition) {
        fighter.precognition++;
      }
      fighter.lastHitTime = Date.now();
      
      // ❤️ Shin (心) - Valencina: Check activation at <50% HP
      this.checkShinActivation(fighter);
    },
    
    onReceiveHit: function(amount, attacker, fighter) {
      // 👁️ Eye of Precognition: Gain 1 precognition when hit
      if (fighter.precognition < fighter.maxPrecognition) {
        fighter.precognition++;
      }
      fighter.lastHitTime = Date.now();
      
      // 🔥 Overheat effects: Lose 1 overheat when hit
      if (fighter.overheat > 0) {
        fighter.overheat--;
        this.checkOverheatEnd(fighter);
      }
    },
    
    onUpdate: function(dt, opponent, fighter) {
      // 🔄 Update Valencina's unique systems
      this.updatePrecognition(fighter, dt);
      this.updateOverheat(fighter, dt);
      this.updateTimeToHuntCooldown(fighter, dt);
    },
    
    processKeyPressed: function(key, fighter) {
      // ⚡ Time to Hunt ability (Q key)
      console.log(`[DEBUG] Time to Hunt - Key: ${key}, Cooldown: ${fighter.timeToHuntCooldown}, Type: ${typeof fighter.timeToHuntCooldown}`);
      if (key === 'q') {
        // Initialize cooldown if undefined
        if (fighter.timeToHuntCooldown === undefined) {
          fighter.timeToHuntCooldown = 0;
          console.log('[DEBUG] Time to Hunt - Initialized cooldown to 0');
        }
        
        if (fighter.timeToHuntCooldown <= 0) {
          console.log('[DEBUG] Time to Hunt - Activating!');
          this.useTimeToHunt(fighter);
        } else {
          console.log(`[DEBUG] Time to Hunt - On cooldown: ${fighter.timeToHuntCooldown.toFixed(1)}s`);
        }
      }
      
      // 🚀 Acceleration Round activation (manual evade reload)
      if (key === 'e' && fighter.accelerationRounds > 0 && fighter.precognition > 0) {
        this.useAccelerationRound(fighter);
      }
    },
    
    endUltimate: function(fighter) {
      // Reset ultimate states
      fighter.currentSprite = 'idle';
      fighter.ultimateCameraZoom = 1;
      fighter.ultimateBackgroundDim = 0;
      
      // Remove protection from all enemies
      if (fighter.allEnemies && Array.isArray(fighter.allEnemies)) {
        fighter.allEnemies.forEach(enemy => {
          if (enemy) {
            enemy.ultimateProtected = false;
            enemy.setState('idle');
            // Unlock enemy stagger bar
            if (enemy.ultimateStaggerLocked) {
              enemy.ultimateStaggerLocked = false;
              enemy.staggerDecayRate = enemy.originalStaggerDecay || 1;
            }
          }
       });
      }
    },
    
    // UNIQUE ABILITY METHODS
    
    // Time to Hunt - Q key ability
    useTimeToHunt: function(fighter) {
      if (!fighter.lastHitOpponent) {
        console.log('[DEBUG] Time to Hunt - No lastHitOpponent found!');
        return;
      }
      
      const target = fighter.lastHitOpponent;
      
      // Apply Game Target status to opponent (duration: 10 seconds)
      target.addStatus('Game Target', 10, 0); // 10 second duration, 0 potency
      
      // Store original speed and set to 1
      target.originalSpeed = target.originalSpeed || target.speed;
      target.speed = 1;
      
      // Store reference for cleanup
      target.gameTargetCaster = fighter;
      
      fighter.timeToHuntCooldown = 15; // 15 second cooldown
      console.log(`⚡ Time to Hunt activated on ${target.name}! Speed set to 1 for 10 seconds.`);
    },
   
    
    // 🚀 Acceleration Round ability
    useAccelerationRound: function(fighter) {
      if (fighter.accelerationRounds >= fighter.maxAccelerationRounds) return;
      
      fighter.accelerationRounds++;
      fighter.accelerationActive = true;
      
      // Range +100%
      fighter.attackRange *= 2;
      
      // Deal +30% damage (150% against shields)
      fighter.baseDamage *= 1.3;
      
      // Gain 4 poise count and potency
      fighter.poiseCount += 4;
      fighter.poisePotency += 4;
      
      // Trigger tremor burst
      this.triggerTremorBurst(fighter);
      
      // Lose 1 precognition
      fighter.precognition--;
      
      console.log(`🚀 Acceleration Round activated! Stack: ${fighter.accelerationRounds}`);
    },
    
    // 💥 Trigger Tremor Burst
    triggerTremorBurst: function(fighter) {
      const damage = Math.floor((fighter.burnPotency + fighter.tremorPotency) / 2);
      if (fighter.lastHitOpponent && damage > 0) {
        fighter.lastHitOpponent.takeDamage(damage);
        console.log(`💥 Tremor Burst dealt ${damage} damage!`);
      }
    },   
    
    // 👁️ Eye of Precognition system
    updatePrecognition: function(fighter, dt) {
      // Check for passive evade chance (3% x current precognition, max 90%)
      if (fighter.precognition > 0 && !fighter.isEvading) {
        const evadeChance = Math.min(0.03 * fighter.precognition, 0.9); // 3% per precognition count, max 90%
        if (Math.random() < evadeChance) {
          // Trigger precognition evade
          fighter.triggerEvade();
          fighter.precognition--;
          
          // Acceleration Round reload: once per precognition stage
          if (fighter.accelerationRounds < fighter.maxAccelerationRounds) {
            fighter.accelerationRounds++;
            console.log(`🔄 Acceleration Round reloaded on evade! Stack: ${fighter.accelerationRounds}`);
          }
        }
      }
      
      // Gain 1 precognition after 5 seconds without evade/hit
      const timeSinceLastAction = (Date.now() - Math.max(fighter.lastEvadeTime, fighter.lastHitTime)) / 1000;
      if (timeSinceLastAction >= 5 && fighter.precognition < fighter.maxPrecognition) {
        fighter.precognition++;
        fighter.lastEvadeTime = Date.now(); // Reset timer
      }
      
      // Check for overheat transition
      if (fighter.precognition <= 0 && fighter.overheat === 0) {
        this.enterOverheat(fighter);
      }
    },
    
    // 🔥 Overheat system
    enterOverheat: function(fighter) {
      fighter.overheat = 30;
      fighter.baseDamage *= 0.8; // -20% damage
      console.log('🔥 Valencina entered OVERHEAT!');
    },
    
    updateOverheat: function(fighter, dt) {
      if (fighter.overheat > 0) {
        // Lose 1 overheat every 5 seconds
        if (Math.random() < dt / 5) {
          fighter.overheat--;
          this.checkOverheatEnd(fighter);
        }
      }
    },
    
    checkOverheatEnd: function(fighter) {
      if (fighter.overheat <= 0) {
        fighter.overheat = 0;
        fighter.baseDamage /= 0.8; // Restore damage
        fighter.precognition = 30; // Return to precognition
        console.log('👁️ Valencina returned to PRECOGNITION!');
      }
    },
    
    // 🔄 Accelerating Future passive
    applyAcceleratingFuture: function(fighter) {
      // For every 1 combo: Gain 1 movement speed (max +5), Lower attack interval by 5% (max -50%)
      const speedBuff = Math.min(fighter.combo, 5); // Cap speed buff at +5
      fighter.speed = 9 + speedBuff; // Base 9 + buff (max 14)
      
      const intervalReduction = Math.min(fighter.combo * 0.05, 0.5); // Cap reduction at 50%
      fighter.attackInterval = 1 * (1 - intervalReduction); // Base 1 second
      
      if (fighter.addStatus) {
        fighter.addStatus('Accelerating Future', fighter.combo, 1);
      }
    },
    
    // ❤️ Shin (心) - Valencina passive
    checkShinActivation: function(fighter) {
      if (fighter.hp < fighter.maxHp * 0.5 && !fighter.shinActive) {
        fighter.shinActive = true;
        fighter.protection = 1; // Gain 1 protection (10% damage reduction)
        
        if (fighter.addStatus) {
          fighter.addStatus('Shin (心) - Valencina', 999, 1); // Permanent until HP restored
          console.log('❤️ Shin (心) - Valencina status applied!');
        }
        console.log('❤️ Shin (心) - Valencina activated!');
      }
    },
    
    // 💪 Shin damage bonus calculation
    calculateShinDamageBonus: function(fighter) {
      if (!fighter.shinActive) return 0;
      // Deal +3% for every poise potency on self (max 15%)
      const damageBonus = Math.min(fighter.poisePotency * 0.03, 0.15);
      return damageBonus;
    },
    
    // ⚡ Disposial Ultimate
    activateDisposial: function(fighter) {
      if (fighter.disposialActive) return;
      
      fighter.disposialActive = true;
      fighter.disposialPhase = 1;
      
      // Gain 3 poise count and 5 poise potency
      fighter.poiseCount += 3;
      fighter.poisePotency += 5;
      
      console.log('⚡ DISPOSIAL ULTIMATE ACTIVATED!');
    },
    
    // Ultimate system methods
    activateUltimate: function(fighter, enemies) {
      // Handle both single opponent (backward compatibility) and multiple enemies
      const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];
      
      fighter.ultimateActive = true;
      fighter.ultimatePhase = 0;
      fighter.ultimateTimer = 3; // 3 seconds for centered pose (dist1)
      fighter.ultimateTotalDamage = 0;
      fighter.ultimateDamageDealt = 0;
      fighter.ultimateCameraZoom = 2.5;
      fighter.ultimateBackgroundDim = 0.7;
      
      // Set ultimate name and dialogue
      fighter.ultimateName = "DISPOSAL";
      fighter.ultimateDialogue = "I'm sick and tired of Ticket and her meddling fools—to hell with you all! Yeah, I hate you all! The damn Famiglia, you, and Ticket, too!";
      
      // [On use] gain 3 poise count and 5 poise potency
      fighter.poiseCount += 3;
      fighter.poisePotency += 5;
      
      // Set all enemies as protected during ultimate
      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.ultimateProtected = true;
          enemy.setState('idle');
          // Lock enemy stagger bar during ultimate
          enemy.ultimateStaggerLocked = true;
          enemy.originalStaggerDecay = enemy.staggerDecayRate || 1;
          enemy.staggerDecayRate = 0; // Prevent stagger decay
        }
      });
      
      // Turn off collision between all players during ultimate
      fighter.originalCollisionEnabled = fighter.collisionEnabled !== false;
      fighter.collisionEnabled = false; // Disable collision
      
      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.originalCollisionEnabled = enemy.collisionEnabled !== false;
          enemy.collisionEnabled = false; // Disable enemy collision
        }
      });
      
      // Teleport to center of arena with boundary clamping
      const centerPos = this.clampToArena(width / 2, height - 100);
      fighter.pos.x = centerPos.x;
      fighter.pos.y = centerPos.y;
      
      // Halt all momentum/velocity on teleport for all fighters
      fighter.vel.x = 0;
      fighter.vel.y = 0;
      targetEnemies.forEach(enemy => {
        if (enemy) {
          enemy.vel.x = 0;
          enemy.vel.y = 0;
        }
      });
      
      // Set initial pose (dist1 for 3 seconds)
      fighter.currentSprite = 'dist1';
      
      // Initialize ultimate state
      fighter.ultimateAttackFrame = 0;
      fighter.ultimateAttackTimer = 0;
      fighter.ultimateAlternateCounter = 0;
      fighter.ultimateEnemySide = 'right'; // Enemy starts on right
      fighter.ultimateFacingLocked = false; // Track if facing is locked to left
      
      console.log(`[DISPOSAL] ${fighter.name} activated DISPOSAL! Gained 3 poise count and 5 poise potency.`);
    },
    
    updateUltimate: function(fighter, enemies, dt) {
      // Handle both single opponent (backward compatibility) and multiple enemies
      const targetEnemies = Array.isArray(enemies) ? enemies : [enemies];
      
      // ENFORCE BOUNDARIES CONTINUOUSLY - PREVENT ALL CLIPPING
      this.enforceBoundaries(fighter);
      targetEnemies.forEach(enemy => {
        if (enemy) {
          this.enforceBoundaries(enemy);
        }
      });
      
      // Only decrement ultimate timer when not in attack sequences
      // Don't decrement during any attack phases (2, 4, 6, 8, 10) or approach phases
      if (fighter.ultimatePhase === 0 || fighter.ultimatePhase === 1 || 
          (fighter.ultimatePhase >= 3 && fighter.ultimatePhase % 2 === 1)) {
        fighter.ultimateTimer -= dt;
      }
      
      console.log('[ULTIMATE DEBUG] Update called - phase:', fighter.ultimatePhase, 'timer:', fighter.ultimateTimer.toFixed(3), 'targets:', targetEnemies.length);
      
      switch (fighter.ultimatePhase) {
        case 0: // Initial pose (1 second)
          if (fighter.ultimateTimer <= 0) {
            fighter.ultimatePhase = 1;
            fighter.ultimateTimer = 0.1; // Timing before first attack
            fighter.currentSprite = 'dist1'; // Keep dist1 sprite instead of switching to idle
          }
          break;
          
        case 1: // Attack 1: Random enemy positioning, attack all enemies
          if (fighter.ultimateTimer <= 0) {
            // Keep Valencina in center of battleground
            const valencinaPos = this.clampToArena(width / 2, height - 100);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Position all enemies randomly around the center for multi-target attack
            targetEnemies.forEach((enemy, index) => {
              if (enemy) {
                // Randomly position enemy on left or right side within attack range
                const randomSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
                const enemyTargetX = fighter.pos.x + (randomSide * (80 + index * 20)); // Spread enemies out
                const enemyPos = this.clampToArena(enemyTargetX, fighter.pos.y);
                enemy.pos.x = enemyPos.x;
                enemy.pos.y = enemyPos.y;
              }
            });
            
            // Make Valencina face the first enemy (or center if no enemies)
            if (targetEnemies.length > 0 && targetEnemies[0]) {
              fighter.facing = targetEnemies[0].pos.x > fighter.pos.x ? 1 : -1;
            }
            
            // Halt all momentum/velocity on teleport for all fighters
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.vel.x = 0;
                enemy.vel.y = 0;
              }
            });
            
            // Start attack sequence immediately (no need to approach)
            fighter.ultimatePhase = 2;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.1;
            fighter.currentSprite = 's1f1';
            fighter.ultimateMovingToEnemy = false; // Enemy is already in position
          }
          break;
          
        case 2: // Attack 1 sequence: s1f1 > s1f2 > s1f3 - attack all enemies
          fighter.ultimateAttackTimer -= dt;
          
          // Valencina stays in center - no position adjustment needed
          
          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            console.log('[ULTIMATE DEBUG] Attack 1 frame:', fighter.ultimateAttackFrame, 'sprite:', fighter.currentSprite, 'targets:', targetEnemies.length);
            
            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.currentSprite = 's1f2';
                fighter.ultimateAttackTimer = 0.1;
                // Deal damage to ALL enemies with s1s2 and apply knockback
                console.log('[ULTIMATE DEBUG] About to deal damage for s1f2 to all enemies');
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 1);
                  }
                });
                fighter.spawnSlashEffect('s1s2', { x: 15, y: -5 });
                // Valencina stays in center - no repositioning needed
                break;
              case 2:
                fighter.currentSprite = 's1f3';
                fighter.ultimateAttackTimer = 0.1;
                break;
              case 3:
                // End attack sequence - hold s1f3 sprite
                fighter.ultimatePhase = 3;
                fighter.ultimateTimer = 0.1; // Timing before next attack
                fighter.currentSprite = 's1f3'; // Hold last attack sprite
                fighter.ultimateMovingToEnemy = false;
                break;
            }
          }
          break;
          
        case 3: // Attack 2 setup - Random enemy positioning, attack all enemies
          if (fighter.ultimateTimer <= 0) {
            // Keep Valencina in center of battleground
            const valencinaPos = this.clampToArena(width / 2, height - 100);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Position all enemies randomly around the center for multi-target attack
            targetEnemies.forEach((enemy, index) => {
              if (enemy) {
                // Randomly position enemy on left or right side within attack range
                const randomSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
                const enemyTargetX = fighter.pos.x + (randomSide * (80 + index * 20)); // Spread enemies out
                const enemyPos = this.clampToArena(enemyTargetX, fighter.pos.y);
                enemy.pos.x = enemyPos.x;
                enemy.pos.y = enemyPos.y;
              }
            });
            
            // Make Valencina face the first enemy (or center if no enemies)
            if (targetEnemies.length > 0 && targetEnemies[0]) {
              fighter.facing = targetEnemies[0].pos.x > fighter.pos.x ? 1 : -1;
            }
            
            // Halt all momentum/velocity on teleport for all fighters
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.vel.x = 0;
                enemy.vel.y = 0;
              }
            });
            
            fighter.ultimatePhase = 4;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.1;
            fighter.currentSprite = 's4f2';
          }
          break;
          
        case 4: // Attack 2 sequence: s4f2 > s4f1 - attack all enemies
          fighter.ultimateAttackTimer -= dt;
          
          // Valencina stays in center - no position adjustment needed
          
          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            
            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.currentSprite = 's4f1';
                fighter.ultimateAttackTimer = 0.1;
                // Deal damage to ALL enemies
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 1);
                  }
                });
                break;
              case 2:
                // End attack sequence
                fighter.ultimatePhase = 5;
                fighter.ultimateTimer = 0.1;
                fighter.currentSprite = 's4f1'; // Hold last attack sprite
                break;
            }
          }
          break;
          
        case 5: // Attack 3 setup - Random enemy positioning, attack all enemies
          if (fighter.ultimateTimer <= 0) {
            // Keep Valencina in center of battleground
            const valencinaPos = this.clampToArena(width / 2, height - 100);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Position all enemies randomly around the center for multi-target attack
            targetEnemies.forEach((enemy, index) => {
              if (enemy) {
                // Randomly position enemy on left or right side within attack range
                const randomSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
                const enemyTargetX = fighter.pos.x + (randomSide * (80 + index * 20)); // Spread enemies out
                const enemyPos = this.clampToArena(enemyTargetX, fighter.pos.y);
                enemy.pos.x = enemyPos.x;
                enemy.pos.y = enemyPos.y;
              }
            });
            
            // Make Valencina face the first enemy (or center if no enemies)
            if (targetEnemies.length > 0 && targetEnemies[0]) {
              fighter.facing = targetEnemies[0].pos.x > fighter.pos.x ? 1 : -1;
            }
            
            // Halt all momentum/velocity on teleport for all fighters
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.vel.x = 0;
                enemy.vel.y = 0;
              }
            });
            
            fighter.ultimatePhase = 6;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.1;
            fighter.currentSprite = 's3f2';
          }
          break;
          
        case 6: // Attack 3 sequence: s3f2 - attack all enemies
          fighter.ultimateAttackTimer -= dt;
          
          // Valencina stays in center - no position adjustment needed
          
          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            
            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.currentSprite = 's3f2';
                fighter.ultimateAttackTimer = 0.1;
                // Deal damage to ALL enemies
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 3);
                  }
                });
                fighter.spawnSlashEffect('s1s4', { x: 0, y: -10 });
                break;
              case 2:
                // End attack sequence
                fighter.ultimatePhase = 7;
                fighter.ultimateTimer = 0.1;
                fighter.currentSprite = 's3f2'; // Hold last attack sprite
                break;
            }
          }
          break;
          
        case 7: // Attack 4 setup - teleport all enemies to center
          if (fighter.ultimateTimer <= 0) {
            // Reset movement restriction for attacks 4-5 for all enemies
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.ultimateRestrictOrigin = null;
              }
            });
            
            // Teleport all enemies to center of battleground with boundary clamping
            const centerPos = this.clampToArena(width / 2, height - 100);
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.pos.x = centerPos.x;
                enemy.pos.y = centerPos.y;
              }
            });
            
            // Position Valencina for attack range with boundary clamping
            const valencinaTargetX = centerPos.x - (fighter.facing * 80);
            const valencinaPos = this.clampToArena(valencinaTargetX, centerPos.y);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Re-position all enemies to maintain 80px distance if Valencina was clamped
            if (valencinaPos.x !== valencinaTargetX) {
              targetEnemies.forEach(enemy => {
                if (enemy) {
                  enemy.pos.x = valencinaPos.x + (fighter.facing * 80);
                  const finalEnemyPos = this.clampToArena(enemy.pos.x, enemy.pos.y);
                  enemy.pos.x = finalEnemyPos.x;
                  enemy.pos.y = finalEnemyPos.y;
                }
              });
            }
            
            // Halt all momentum/velocity on teleport for all fighters
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.vel.x = 0;
                enemy.vel.y = 0;
              }
            });
            
            fighter.ultimatePhase = 8;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.2;
            fighter.currentSprite = 'd2';
          }
          break;
          
        case 8: // Attack 4 sequence: d2 with diss1 (no damage), teleport, de1 with s1s3 (simultaneous) - attack all enemies
          fighter.ultimateAttackTimer -= dt;
          
          // Lock all enemies position in front of Valencina during de1 and de2 attacks
          if (fighter.currentSprite === 'de1' || fighter.currentSprite === 'de2') {
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.pos.x = fighter.pos.x + (fighter.facing * 80);
                enemy.pos.y = fighter.pos.y;
                enemy.vel.x = 0; // Stop any movement
                enemy.vel.y = 0;
              }
            });
          }
          
          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            
            switch (fighter.ultimateAttackFrame) {
              case 1:
                // d2 with diss1 (no damage) - d2 should not disappear when drawing diss1
                fighter.currentSprite = 'd2';
                fighter.spawnSlashEffect('diss1', { x: 15, y: -5 });
                fighter.ultimateAttackTimer = 0.2;
                break;
              case 2:
                // Teleport 50 pixels to the right of first enemy with 300px barrier
                let targetX = targetEnemies.length > 0 && targetEnemies[0] ? 
                  targetEnemies[0].pos.x + 50 : fighter.pos.x + 50;
                const battlegroundWidth = 1200;
                const barrier = 300;
                
                // Ensure Valencina stays within barrier boundaries
                if (targetX > battlegroundWidth - barrier) {
                  targetX = battlegroundWidth - barrier;
                  // Adjust all enemies position to maintain 50px distance
                  targetEnemies.forEach(enemy => {
                    if (enemy) {
                      enemy.pos.x = targetX - 50;
                    }
                  });
                }
                
                fighter.pos.x = targetX;
                fighter.pos.y = targetEnemies.length > 0 && targetEnemies[0] ? targetEnemies[0].pos.y : height - 100;
                fighter.currentSprite = 'de1';
                fighter.ultimateAttackTimer = 0.2;
                break;
              case 3:
                // de1 with s1s3 (simultaneous) - deal damage to ALL enemies at same time as showing de1
                targetEnemies.forEach(enemy => {
                  if (enemy) {
                    this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 4);
                  }
                });
                fighter.spawnSlashEffect('s1s3', { x: 15, y: -5 });
                
                // Increase zoom when switching to de1
                fighter.ultimateCameraZoom = 3.5; // Increased zoom for de1-de3 sequence
                fighter.ultimateBackgroundDim = 0.8; // Increase background dimming
                console.log('[ULTIMATE DEBUG] Increased zoom for de1-de3 sequence');
                // Reposition after knockback
                setTimeout(() => {
                  if (targetEnemies.length > 0 && targetEnemies[0]) {
                    const valencinaTargetX = targetEnemies[0].pos.x - (fighter.facing * 80);
                    const valencinaPos = this.clampToArena(valencinaTargetX, targetEnemies[0].pos.y);
                    fighter.pos.x = valencinaPos.x;
                    fighter.pos.y = valencinaPos.y;
                    fighter.vel.x = 0;
                    fighter.vel.y = 0;
                  }
                }, 100);
                fighter.ultimateAttackTimer = 0.2;
                break;
              case 4:
                // End attack sequence - hold de1 sprite
                fighter.ultimatePhase = 9;
                fighter.ultimateTimer = 1.0; // Timing before next attack
                fighter.currentSprite = 'de1'; // Hold last attack sprite
                break;
            }
          }
          break;
          
        case 9: // Attack 5: de2 with alternating s2f1/joust (5 times), then de3 with knockback
          if (fighter.ultimateTimer <= 0) {
            fighter.currentSprite = 'de2';
            fighter.ultimatePhase = 10;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.2;
            fighter.ultimateAlternateCounter = 0;
          }
          break;
          
        case 10: // Attack 5 sequence: de2 with s1s3 and js1 alternating 5 times, 5 damage instances at 0.1 second intervals
          fighter.ultimateAttackTimer -= dt;
          
          // Lock all enemies position in front of Valencina during de2 attacks
          if (fighter.currentSprite === 'de2') {
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.pos.x = fighter.pos.x + (fighter.facing * 80);
                enemy.pos.y = fighter.pos.y;
                enemy.vel.x = 0; // Stop any movement
              }
            });
          }
          
          if (fighter.ultimateAttackFrame < 5) {
            // Alternate between s1s3 and js1 slash effects
            if (fighter.ultimateAttackFrame % 2 === 0) {
              // s1s3 slash effect
              fighter.spawnSlashEffect('s1s3', { x: 15, y: -5 });
            } else {
              // js1 slash effect
              fighter.spawnSlashEffect('js1', { x: 0, y: -10 });
            }
            // Deal damage for each attack
            targetEnemies.forEach(enemy => {
              if (enemy) {
                this.dealUltimateDamage(fighter, enemy, fighter.baseDamage, false, 5);
              }
            });
            fighter.ultimateAttackFrame++;
            fighter.ultimateAttackTimer = 0.2; // 0.2 second intervals
          } else if (fighter.ultimateAttackFrame === 5) {
            // Final attack - de3 with 2x damage and zoom out
            fighter.currentSprite = 'de3';
            targetEnemies.forEach(enemy => {
              if (enemy) {
                this.dealUltimateDamage(fighter, enemy, fighter.baseDamage * 2, true, 5); // Mark as final attack
              }
            });
            
            // Knockback all enemies (only happens at de3)
            targetEnemies.forEach(enemy => {
              if (enemy) {
                enemy.vel.x = fighter.facing * 20;
              }
            });
            
            // Zoom out camera during knockback
            fighter.ultimateCameraZoom = 1.0; // Reset zoom
            fighter.ultimateBackgroundDim = 0; // Reset background dimming
            console.log('[ULTIMATE DEBUG] Zooming out during final knockback');
            
            // End attack sequence
            fighter.ultimatePhase = 11;
            fighter.ultimateTimer = 3.0; // Hold position for 3 seconds
          }
          break;
          
        case 11: // Final hold position
          if (fighter.ultimateTimer <= 0) {
            // End ultimate
            fighter.ultimateTimer = 0;
          }
          break;
      }
    },
    
    // 🔄 Update cooldowns
    updateTimeToHuntCooldown: function(fighter, dt) {
      if (fighter.timeToHuntCooldown > 0) {
        fighter.timeToHuntCooldown -= dt;
      }
    },
    
    // Helper methods for ultimate
    clampToArena: function(x, y) {
      const margin = 100;
      return {
        x: constrain(x, margin, width - margin),
        y: constrain(y, margin, height - margin)
      };
    },
    
    enforceBoundaries: function(fighter) {
      const clamped = this.clampToArena(fighter.pos.x, fighter.pos.y);
      fighter.pos.x = clamped.x;
      fighter.pos.y = clamped.y;
      
      // Stop velocity if hitting boundaries
      if (fighter.pos.x <= 100 || fighter.pos.x >= width - 100) {
        fighter.vel.x = 0;
      }
    },
    
    spawnSlashEffect: function(type, offset = { x: 0, y: 0 }) {
      // This method should not be called directly on character
      // The fighter's spawnSlashEffect method handles slash effects properly
      console.warn('Character method called - use fighter.spawnSlashEffect() instead');
    },
    
    addCombo: function(fighter) {
      // Add combo to fighter
      fighter.combo = (fighter.combo || 0) + 1;
      console.log(`Combo increased to: ${fighter.combo}`);
    },
    
    calculateDamage: function(baseDamage) {
      // Calculate damage with combo bonus
      const comboMultiplier = 1 + (this.combo * 0.1);
      let damage = Math.floor(baseDamage * comboMultiplier);
      
      // Apply Shin damage bonus if active
      const shinBonus = this.calculateShinDamageBonus(this);
      if (shinBonus > 0) {
        damage = Math.floor(damage * (1 + shinBonus));
      }
      
      return damage;
    },
    
    dealUltimateDamage: function(fighter, enemy, damage, isFinalAttack = false, attackPhase = 1, applyKnockback = true) {
      // Store original values before modification
      const previousProtected = enemy.ultimateProtected;
      const previousCooldown = enemy.hitCooldown;
      const originalStagger = enemy.stagger;
      
      // Calculate knockback amount (increased for ultimate)
      const knockbackAmount = !applyKnockback ? 0 : (isFinalAttack ? 150 : 100);
      
      // Apply damage with custom knockback
      enemy.ultimateProtected = false;
      enemy.receiveHit(damage, fighter, knockbackAmount);
      
      // Restore ultimate protection and cooldown after damage is applied
      enemy.ultimateProtected = previousProtected;
      enemy.hitCooldown = previousCooldown;
      
      // Add doubled ultimate screenshake
      if (typeof addScreenShake === 'function') {
        addScreenShake(damage, true); // isUltimate = true for doubled intensity
      }
      
      // ENFORCE BOUNDARIES AFTER KNOCKBACK - PREVENT CLIPPING
      this.enforceBoundaries(enemy);
      this.enforceBoundaries(fighter);
      
      // Reset stagger to original value (prevent any stagger gain)
      enemy.stagger = originalStagger;
      
      // Add friction to knockback unless it's final attack
      if (!isFinalAttack && enemy.vel.x !== 0) {
        enemy.vel.x *= 0.8; // Apply friction (20% reduction)
      }
      
      // For attacks 1-3, restrict enemy movement to max 100px from current position
      if (attackPhase === 1 || attackPhase === 2 || attackPhase === 3) {
        // Store original position if not already stored
        if (!enemy.ultimateRestrictOrigin) {
          enemy.ultimateRestrictOrigin = { x: enemy.pos.x, y: enemy.pos.y };
        }
        
        // Define valid movement boundaries (100px max from origin, 100px from arena boundaries)
        const maxDistance = 100;
        const boundaryMargin = 100;
        const arenaLeft = boundaryMargin;
        const arenaRight = width - boundaryMargin;
        
        // Calculate allowed movement range
        const minX = Math.max(enemy.ultimateRestrictOrigin.x - maxDistance, arenaLeft);
        const maxX = Math.min(enemy.ultimateRestrictOrigin.x + maxDistance, arenaRight);
        
        // Clamp enemy position to allowed range
        enemy.pos.x = constrain(enemy.pos.x, minX, maxX);
        
        // Stop velocity if outside allowed range
        if (enemy.pos.x <= minX || enemy.pos.x >= maxX) {
          enemy.vel.x = 0;
        }
      }
      
      // Stop Valencina from pushing enemy - zero out her velocity
      fighter.vel.x = 0;
      fighter.vel.y = 0;
      
      // Build combo for Valencina during ultimate - 1 combo per hit like regular attacks
      console.log('[ULTIMATE DEBUG] Before addCombo - fighter combo:', fighter.combo);
      fighter.addCombo(fighter);
      console.log('[ULTIMATE DEBUG] After addCombo - fighter combo:', fighter.combo);
      
      // Apply character-specific onSuccessfulHit effects (status effects, etc.)
      const character = CHARACTERS[fighter.characterKey];
      if (character && character.onSuccessfulHit) {
        character.onSuccessfulHit(damage, enemy, fighter);
      }
      
      fighter.ultimateTotalDamage += damage;
      fighter.ultimateDamageDealt += damage;
      console.log('[ULTIMATE DEBUG] Damage applied - total:', fighter.ultimateTotalDamage);
    }
  },
    
    // Initialize character
    initializeCharacter: function(fighter) {
      console.log('[DEBUG] Valencina initializeCharacter called for:', fighter.name);
      fighter.weapon = this.weapon;
      
      // Initialize Valencina-specific properties
      fighter.timeToHuntCooldown = 0;
      fighter.gameTimeTarget = false;
      fighter.accelerationRounds = 0;
      fighter.precognition = this.maxPrecognition;
      fighter.overheat = 0;
      fighter.combo = 0;
      fighter.shinActive = false;
      fighter.protection = 0;
      fighter.poiseCount = 0;
      fighter.poisePotency = 0;
      fighter.burnPotency = 0;
      fighter.burnCount = 0;
      fighter.tremorPotency = 0;
      fighter.tremorCount = 0;
      fighter.accelerationActive = false;
      fighter.disposialActive = false;
      fighter.disposialPhase = 0;
      fighter.lastEvadeTime = 0;
      fighter.lastHitTime = 0;
      
      console.log('[DEBUG] Valencina initialized - timeToHuntCooldown:', fighter.timeToHuntCooldown);
    }
};

let currentCharacter = 'JOHN';

function switchCharacter(characterKey) {
  if (CHARACTERS[characterKey]) {
    currentCharacter = characterKey;
    console.log(`Switched to ${CHARACTERS[characterKey].name}`);
  }
}

function getCurrentCharacter() {
  return CHARACTERS[currentCharacter];
}

// Fighter management functions
function addNewFighter() {
  const playerId = `player${nextFighterId}`;
  const newPlayer = {
    name: playerId,
    title: `Player ${nextFighterId}`,
    hp: 5000,
    speed: 5,
    attackInterval: 1,
    baseDamage: 18,
    staggerThreshold: 1200,
    staggerLength: 5,
    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
    weapon: 'Default Weapon',
    sprite: 'dummy/idle.png',
    
    // Default methods
    onSuccessfulHit: function(damage, opponent, fighter) {
      // Default implementation - no special effects
    },
    onReceiveHit: function(amount, attacker, fighter) {
      // Default implementation - no special effects
    },
    onUpdate: function(dt, opponent, fighter) {
      // Default implementation - no special effects
    },
    processKeyPressed: function(key, fighter) {
      // Default implementation - no special abilities
    },
    initializeCharacter: function(fighter) {
      // Default initialization
      fighter.weapon = this.weapon;
    }
  };
  
  CHARACTERS[playerId] = newPlayer;
  nextFighterId++;
  fighterCount++;
  
  return playerId;
}

function removeFighter(fighterId) {
  if (CHARACTERS[fighterId] && fighterCount > 1) {
    delete CHARACTERS[fighterId];
    fighterCount--;
    return true;
  }
  return false;
}

function getAvailableFighters() {
  return Object.keys(CHARACTERS);
}

// Add new status effects to statusColor function
function statusColor(type) {
  const colors = {
    'Burn': '#ff0000',      // red
    'Bleed': '#ff8800',     // orange  
    'Tremor': '#ffff00',    // yellow
    'Rupture': '#00ff00',   // green
    'Sinking': '#0088ff',   // blue
    'Charge': '#8800ff',    // purple
    'Poise': '#ffffff',     // white
    'Game Target': '#ff1744',
    'Precognition': '#e1f5fe',
    'Overheat': '#ff6b6b',
    'Acceleration Rounds': '#ff9800', // orange
    'Accelerating Future': '#4caf50', // green
    'Shin (心) - Valencina': '#e91e63'  // pink
  };
  return colors[type] || '#ffffff';
}
