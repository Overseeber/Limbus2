// ==========================
// 🔥 SPRITE ATLAS SYSTEM
// ==========================
let atlases = {};
const CELL = 256;

// ==========================
// 🔥 SPRITE DATABASE
// ==========================
const SPRITES = {
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
  s1f3: { atlas:"val2", x:0,y:0,w:3,h:3, offsetX: +30 },
  halt2:{ atlas:"val2", x:0,y:3,w:3,h:2 },
  s2f1: { atlas:"val2", x:3,y:0,w:5,h:2 },
  joust:{ atlas:"val2", x:3,y:2,w:5,h:2 },
  s3f1: { atlas:"val2", x:0,y:5,w:3,h:2 },
  s3f2: { atlas:"val2", x:3,y:4,w:3,h:2 },
  s3f3: { atlas:"val2", x:3,y:6,w:3,h:2 },
  dist1:{ atlas:"val2", x:6,y:4,w:2,h:2 },

  // ===== val3 =====
  s4f1:   { atlas:"val3", x:0,y:0,w:4,h:2 },
  s4f2:   { atlas:"val3", x:0,y:2,w:3,h:3 },
  s4f3:   { atlas:"val3", x:0,y:5,w:3,h:2 },
  s4f4:   { atlas:"val3", x:4,y:0,w:4,h:3, offsetY:+256 }, // custom anchor
  d1:     { atlas:"val3", x:3,y:3,w:3,h:2 },
  d2:     { atlas:"val3", x:3,y:5,w:3,h:2 },

  // ===== valdisposal =====
  de1:{ atlas:"valdisposal", x:2,y:0,w:4,h:2 },
  de2:{ atlas:"valdisposal", x:1,y:2,w:5,h:2 },
  de3:{ atlas:"valdisposal", x:0,y:4,w:8,h:2 },

  // ===== slash1 =====
  s1s1:{ atlas:"vslash1", x:0,y:0,w:4,h:3 },
  s1s2:{ atlas:"vslash1", x:4,y:0,w:4,h:3 },
  s1s3:{ atlas:"vslash1", x:3,y:3,w:5,h:2 },
  js1: { atlas:"vslash1", x:3,y:5,w:5,h:2 },

  // ===== slash2 =====
  s1s4:{ atlas:"vslash2", x:0,y:2,w:4,h:3,  },//offsetY:+256
  s2s1:{ atlas:"vslash2", x:0,y:0,w:4,h:2 },
  s2s2:{ atlas:"vslash2", x:4,y:0,w:4,h:3, offsetY:+256 },
  diss1:{atlas:"vslash2", x:4,y:3,w:4,h:2 }
};

// ==========================
// 🔥 PRE-SCALED SPRITE LOADING
// ==========================
function loadSpriteAtlases() {
  // Load atlases first
  atlases.val1 = loadImage("data/valencina/val1.png");
  atlases.val2 = loadImage("data/valencina/val2.png");
  atlases.val3 = loadImage("data/valencina/val3.png");
  atlases.valdisposal = loadImage("data/valencina/valdisposal.png");
  atlases.vslash1 = loadImage("data/valencina/vslash1.png");
  atlases.vslash2 = loadImage("data/valencina/vslash2.png");
  
  // Pre-scale all atlas images to common sizes
  setTimeout(() => {
    for (const [atlasName, img] of Object.entries(atlases)) {
      if (img && img.width > 0) {
        // Create pre-scaled versions for common scales
        for (const scale of COMMON_SCALES) {
          if (scale !== 1.0) {
            const newWidth = img.width * scale;
            const newHeight = img.height * scale;
            const pg = createGraphics(newWidth, newHeight);
            pg.image(img, 0, 0, newWidth, newHeight);
            
            // Store pre-scaled version
            const cacheKey = `${atlasName}_scaled_${scale}`;
            if (!window.PRE_SCALED_ATLASES) window.PRE_SCALED_ATLASES = {};
            window.PRE_SCALED_ATLASES[cacheKey] = pg;
          }
        }
      }
    }
    console.log('Pre-scaled atlases loaded');
  }, 1000);
  
  // Pre-cache sprite data after atlases start loading
  precacheSpriteData();
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
  if (!img) return null;

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
    sprite: 'dummy/idle.png',
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
    }
  },
  VALENCINA: {
    name: 'Valencina',
    title: 'The Accelerating Future',
    hp: 3204,
    speed: 3,
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
      this.updateDisposialUltimate(fighter, opponent, dt);
    },
    
    processKeyPressed: function(key, fighter) {
      // ⚡ Time to Hunt ability (Q key)
      if (key === 'q' && fighter.timeToHuntCooldown <= 0) {
        this.useTimeToHunt(fighter);
      }
      
      // 🚀 Acceleration Round activation (manual evade reload)
      if (key === 'e' && fighter.accelerationRounds > 0 && fighter.precognition > 0) {
        this.useAccelerationRound(fighter);
      }
    },
    
    initializeCharacter: function(fighter) {
      // 🎯 Initialize Valencina's unique properties
      fighter.weapon = this.weapon;
      fighter.precognition = 30;
      fighter.accelerationRounds = 0;
      fighter.combo = 0;
      fighter.overheat = 0;
      fighter.shinActive = false;
      fighter.protection = 0;
      fighter.poiseCount = 0;
      fighter.poisePotency = 0;
      fighter.burnPotency = 0;
      fighter.burnCount = 0;
      fighter.tremorPotency = 0;
      fighter.tremorCount = 0;
      fighter.gameTimeTarget = false;
      fighter.accelerationActive = false;
      fighter.timeToHuntCooldown = 0;
      fighter.disposialActive = false;
      fighter.disposialPhase = 0;
      fighter.lastEvadeTime = Date.now();
      fighter.lastHitTime = Date.now();
    },
    
    // 🎯 UNIQUE ABILITY METHODS
    
    // ⚡ Time to Hunt - Q key ability
    useTimeToHunt: function(fighter) {
      if (!fighter.lastHitOpponent) return;
      
      // Apply Game Target status to opponent (duration: 5 hits or 10 sec, whichever comes first)
      fighter.lastHitOpponent.gameTimeTarget = true;
      fighter.lastHitOpponent.speed = 1; // Set speed to 1
      fighter.lastHitOpponent.gameTargetDuration = 10; // 10 seconds
      fighter.lastHitOpponent.gameTargetHits = 5; // 5 hits
      fighter.lastHitOpponent.gameTargetHitsTaken = 0; // Track hits received
      
      fighter.timeToHuntCooldown = 15; // 15 second cooldown
      console.log('⚡ Time to Hunt activated!');
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
      fighter.speed = 3 + speedBuff; // Base 3 + buff (max 8)
      
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
    activateUltimate: function(fighter, opponent) {
      fighter.ultimateActive = true;
      fighter.ultimatePhase = 0;
      fighter.ultimateTimer = 1; // 1 second initial pose
      fighter.ultimateTotalDamage = 0;
      fighter.ultimateDamageDealt = 0;
      fighter.ultimateCameraZoom = 2.5;
      fighter.ultimateBackgroundDim = 0.7;
      
      // Set ultimate name and dialogue
      fighter.ultimateName = "DISPOSAL";
      fighter.ultimateDialogue = "I'm sick and tired of Ticket and her meddling fools—to hell with you all! Yeah, I hate you all! The damn Famiglia, you, and Ticket, too!";
      
      // Set opponent as protected during ultimate
      if (fighter.opponent) {
        fighter.opponent.ultimateProtected = true;
        fighter.opponent.setState('idle');
        // Lock enemy stagger bar during ultimate
        fighter.opponent.ultimateStaggerLocked = true;
        fighter.opponent.originalStaggerDecay = fighter.opponent.staggerDecayRate || 1;
        fighter.opponent.staggerDecayRate = 0; // Prevent stagger decay
      }
      
      // Store Valencina's original combo delay and stop it during ultimate
      fighter.originalComboDelay = fighter.comboDelay || 0;
      fighter.comboDelay = 0; // Stop combo delay
      
      // Turn off collision between both players during ultimate
      fighter.originalCollisionEnabled = fighter.collisionEnabled !== false;
      fighter.collisionEnabled = false; // Disable collision
      
      if (fighter.opponent) {
        fighter.opponent.originalCollisionEnabled = fighter.opponent.collisionEnabled !== false;
        fighter.opponent.collisionEnabled = false; // Disable opponent collision
      }
      
      // Teleport to center of arena with boundary clamping
      const centerPos = this.clampToArena(width / 2, height - 100);
      fighter.pos.x = centerPos.x;
      fighter.pos.y = centerPos.y; // Ground level, not midair
      
      // Halt all momentum/velocity on teleport
      fighter.vel.x = 0;
      fighter.vel.y = 0;
      if (fighter.opponent) {
        fighter.opponent.vel.x = 0;
        fighter.opponent.vel.y = 0;
      }
      
      // Set initial pose
      fighter.currentSprite = 'dist1';
      
      // Setup ultimate display
      fighter.ultimateName = 'DISPOSAL';
      fighter.ultimateDialogue = "I'm sick and tired of Ticket and her meddling fools—to hell with you all! Yeah, I hate you all! The damn Famiglia, you, and Ticket, too!";
      
      // Setup camera zoom and background dimming
      fighter.ultimateCameraZoom = 2.5; // Zoom in
      fighter.ultimateBackgroundDim = 0.7; // Dim background
      
      // Store original positions for later
      fighter.ultimateOriginalPos = fighter.pos.copy();
      
      // Initialize ultimate state
      fighter.ultimatePhase = 0;
      fighter.ultimateTimer = 1.0; // 1 second for initial pose
      fighter.ultimateAttackFrame = 0;
      fighter.ultimateAttackTimer = 0;
      fighter.ultimateEnemySide = 'right'; // Enemy starts on right
      fighter.ultimateAlternateCounter = 0;
      
      // Play dialogue
      fighter.currentDialogue = fighter.ultimateDialogue;
      fighter.dialogueTimer = 10; // Show for 10 seconds
      
      // Prevent enemy from dying until final attack
      opponent.ultimateProtected = true;
    },
    
    updateUltimate: function(fighter, opponent, dt) {
      // ENFORCE BOUNDARIES CONTINUOUSLY - PREVENT ALL CLIPPING
      this.enforceBoundaries(fighter);
      if (opponent) {
        this.enforceBoundaries(opponent);
      }
      
      // Only decrement ultimate timer when not in attack sequences
      // Don't decrement during any attack phases (2, 4, 6, 8, 10) or approach phases
      if (fighter.ultimatePhase === 0 || fighter.ultimatePhase === 1 || 
          (fighter.ultimatePhase >= 3 && fighter.ultimatePhase % 2 === 1)) {
        fighter.ultimateTimer -= dt;
      }
      
      console.log('[ULTIMATE DEBUG] Update called - phase:', fighter.ultimatePhase, 'timer:', fighter.ultimateTimer.toFixed(3));
      
      switch (fighter.ultimatePhase) {
        case 0: // Initial pose (1 second)
          if (fighter.ultimateTimer <= 0) {
            fighter.ultimatePhase = 1;
            fighter.ultimateTimer = 0.1; // Timing before first attack
            fighter.currentSprite = 'dist1'; // Keep dist1 sprite instead of switching to idle
          }
          break;
          
        case 1: // Attack 1: Random enemy positioning, Valencina faces correct side
          if (fighter.ultimateTimer <= 0) {
            // Keep Valencina in center of battleground
            const valencinaPos = this.clampToArena(width / 2, height - 100);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Randomly position enemy on left or right side within attack range
            const randomSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
            const enemyTargetX = fighter.pos.x + (randomSide * 80); // 80px away from center
            const enemyPos = this.clampToArena(enemyTargetX, fighter.pos.y);
            opponent.pos.x = enemyPos.x;
            opponent.pos.y = enemyPos.y;
            
            // Make Valencina face the enemy
            fighter.facing = randomSide * -1; // Face towards enemy
            
            // Halt all momentum/velocity on teleport
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            opponent.vel.x = 0;
            opponent.vel.y = 0;
            
            // Start attack sequence immediately (no need to approach)
            fighter.ultimatePhase = 2;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.1;
            fighter.currentSprite = 's1f1';
            fighter.ultimateMovingToEnemy = false; // Enemy is already in position
          }
          break;
          
        case 2: // Attack 1 sequence: s1f1 > s1f2 > s1f3
          fighter.ultimateAttackTimer -= dt;
          
          // Valencina stays in center - no position adjustment needed
          
          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            console.log('[ULTIMATE DEBUG] Attack 1 frame:', fighter.ultimateAttackFrame, 'sprite:', fighter.currentSprite);
            
            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.currentSprite = 's1f2';
                fighter.ultimateAttackTimer = 0.1;
                // Deal damage with s1s2 and apply knockback
                console.log('[ULTIMATE DEBUG] About to deal damage for s1f2');
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 1);
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
          
        case 3: // Attack 2 setup - Random enemy positioning, Valencina faces correct side
          if (fighter.ultimateTimer <= 0) {
            // Keep Valencina in center of battleground
            const valencinaPos = this.clampToArena(width / 2, height - 100);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Randomly position enemy on left or right side within attack range
            const randomSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
            const enemyTargetX = fighter.pos.x + (randomSide * 80); // 80px away from center
            const enemyPos = this.clampToArena(enemyTargetX, fighter.pos.y);
            opponent.pos.x = enemyPos.x;
            opponent.pos.y = enemyPos.y;
            
            // Make Valencina face opposite way from enemy
            fighter.facing = randomSide; // Face opposite way from enemy
            
            // Halt all momentum/velocity on teleport
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            opponent.vel.x = 0;
            opponent.vel.y = 0;
            
            fighter.ultimatePhase = 4;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.1;
            fighter.currentSprite = 's4f2';
          }
          break;
          
        case 4: // Attack 2 sequence: s4f2 > s4f1
          fighter.ultimateAttackTimer -= dt;
          
          // Valencina stays in center - no position adjustment needed
          
          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            
            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.currentSprite = 's4f1';
                fighter.ultimateAttackTimer = 0.1;
                // Deal damage with s1s4 and apply knockback
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 2);
                fighter.spawnSlashEffect('s1s4', { x: 15, y: -5 });
                // Valencina stays in center - no repositioning needed
                break;
              case 2:
                // End attack sequence - hold s4f1 sprite
                fighter.ultimatePhase = 5;
                fighter.ultimateTimer = 0.1; // Timing before next attack
                fighter.currentSprite = 's4f1'; // Hold last attack sprite
                break;
            }
          }
          break;
          
        case 5: // Attack 3 setup - Random enemy positioning, Valencina faces correct side
          if (fighter.ultimateTimer <= 0) {
            // Keep Valencina in center of battleground
            const valencinaPos = this.clampToArena(width / 2, height - 100);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Randomly position enemy on left or right side within attack range
            const randomSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
            const enemyTargetX = fighter.pos.x + (randomSide * 80); // 80px away from center
            const enemyPos = this.clampToArena(enemyTargetX, fighter.pos.y);
            opponent.pos.x = enemyPos.x;
            opponent.pos.y = enemyPos.y;
            
            // Make Valencina face opposite way from enemy
            fighter.facing = randomSide; // Face opposite way from enemy
            
            // Halt all momentum/velocity on teleport
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            opponent.vel.x = 0;
            opponent.vel.y = 0;
            
            fighter.ultimatePhase = 6;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.1;
            fighter.currentSprite = 's3f1';
            fighter.ultimateMovingThroughEnemy = false;
            fighter.ultimateMovementTimer = 0;
          }
          break;
          
        case 6: // Attack 3 sequence: s3f1 > s3f2 > s3f3 with teleport to other side
          fighter.ultimateAttackTimer -= dt;
          
          // Valencina stays in center - no position adjustment needed
          
          if (fighter.ultimateAttackTimer <= 0) {
            fighter.ultimateAttackFrame++;
            console.log('[ULTIMATE DEBUG] Attack 3 frame:', fighter.ultimateAttackFrame, 'sprite:', fighter.currentSprite);
            
            switch (fighter.ultimateAttackFrame) {
              case 1:
                fighter.currentSprite = 's3f2';
                fighter.ultimateAttackTimer = 0.1;
                // Deal damage with s1s4 and apply knockback
                console.log('[ULTIMATE DEBUG] About to deal damage for s3f2');
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 3);
                fighter.spawnSlashEffect('s1s4', { x: 15, y: -5 });
                // Valencina stays in center - no repositioning needed
                break;
              case 2:
                fighter.currentSprite = 's3f3';
                fighter.ultimateAttackTimer = 0.1;
                break;
              case 3:
                // After 1 second, teleport to 300 pixels on the right of enemy
                fighter.ultimateAttackTimer = 0.1; // Wait 1 second
                break;
              case 4:
                // Teleport to 300 pixels right of enemy with 300px barrier
                let targetX = opponent.pos.x + 300;
                const battlegroundWidth = 1200;
                const barrier = 300;
                
                // Ensure Valencina stays within barrier boundaries
                if (targetX > battlegroundWidth - barrier) {
                  targetX = battlegroundWidth - barrier;
                  // Adjust enemy position to maintain 300px distance
                  opponent.pos.x = targetX - 300;
                }
                
                fighter.pos.x = targetX;
                fighter.pos.y = opponent.pos.y;
                
                // Halt all momentum/velocity on teleport
                fighter.vel.x = 0;
                fighter.vel.y = 0;
                opponent.vel.x = 0;
                opponent.vel.y = 0;
                
                // Change sprite to d1 and face left
                fighter.currentSprite = 'd1';
                fighter.facing = -1; // Face left for rest of ultimate
                
                // End attack sequence
                fighter.ultimatePhase = 7;
                fighter.ultimateTimer = 0.1; // Timing before next attack
                break;
            }
          }
          break;
          
        case 7: // Attack 4 setup - teleport opponent to center
          if (fighter.ultimateTimer <= 0) {
            // Reset movement restriction for attacks 4-5
            if (opponent) {
              opponent.ultimateRestrictOrigin = null;
            }
            
            // Teleport opponent to center of battleground with boundary clamping
            const opponentPos = this.clampToArena(width / 2, height - 100);
            opponent.pos.x = opponentPos.x;
            opponent.pos.y = opponentPos.y;
            
            // Position Valencina for attack range with boundary clamping
            const valencinaTargetX = opponent.pos.x - (fighter.facing * 80);
            const valencinaPos = this.clampToArena(valencinaTargetX, opponent.pos.y);
            fighter.pos.x = valencinaPos.x;
            fighter.pos.y = valencinaPos.y;
            
            // Re-position opponent to maintain 80px distance if Valencina was clamped
            if (valencinaPos.x !== valencinaTargetX) {
              opponent.pos.x = valencinaPos.x + (fighter.facing * 80);
              const finalOpponentPos = this.clampToArena(opponent.pos.x, opponent.pos.y);
              opponent.pos.x = finalOpponentPos.x;
              opponent.pos.y = finalOpponentPos.y;
            }
            
            // Halt all momentum/velocity on teleport
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            opponent.vel.x = 0;
            opponent.vel.y = 0;
            
            fighter.ultimatePhase = 8;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.2;
            fighter.currentSprite = 'd2';
          }
          break;
          
        case 8: // Attack 4 sequence: d2 with diss1 (no damage), teleport, de1 with s1s3 (simultaneous)
          fighter.ultimateAttackTimer -= dt;
          
          // Lock enemy position in front of Valencina during de1 and de2 attacks
          if (fighter.currentSprite === 'de1' || fighter.currentSprite === 'de2') {
            opponent.pos.x = fighter.pos.x + (fighter.facing * 80);
            opponent.pos.y = fighter.pos.y;
            opponent.vel.x = 0; // Stop any movement
            opponent.vel.y = 0;
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
                // Teleport 50 pixels to the right of enemy with 300px barrier
                let targetX = opponent.pos.x + 50;
                const battlegroundWidth = 1200;
                const barrier = 300;
                
                // Ensure Valencina stays within barrier boundaries
                if (targetX > battlegroundWidth - barrier) {
                  targetX = battlegroundWidth - barrier;
                  // Adjust enemy position to maintain 50px distance
                  opponent.pos.x = targetX - 50;
                }
                
                fighter.pos.x = targetX;
                fighter.pos.y = opponent.pos.y;
                fighter.currentSprite = 'de1';
                fighter.ultimateAttackTimer = 0.2;
                break;
              case 3:
                // de1 with s1s3 (simultaneous) - deal damage at same time as showing de1
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 4);
                fighter.spawnSlashEffect('s1s3', { x: 15, y: -5 });
                
                // Increase zoom when switching to de1
                fighter.ultimateCameraZoom = 3.5; // Increased zoom for de1-de3 sequence
                fighter.ultimateBackgroundDim = 0.8; // Increase background dimming
                console.log('[ULTIMATE DEBUG] Increased zoom for de1-de3 sequence');
                // Reposition after knockback
                setTimeout(() => {
                  const valencinaTargetX = opponent.pos.x - (fighter.facing * 80);
                  const valencinaPos = this.clampToArena(valencinaTargetX, opponent.pos.y);
                  fighter.pos.x = valencinaPos.x;
                  fighter.pos.y = valencinaPos.y;
                  fighter.vel.x = 0;
                  fighter.vel.y = 0;
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
          
          // Lock enemy position in front of Valencina during de2 attacks
          if (fighter.currentSprite === 'de2') {
            opponent.pos.x = fighter.pos.x + (fighter.facing * 80);
            opponent.pos.y = fighter.pos.y;
            opponent.vel.x = 0; // Stop any movement
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
            this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 5);
            fighter.ultimateAttackFrame++;
            fighter.ultimateAttackTimer = 0.2; // 0.2 second intervals
          } else if (fighter.ultimateAttackFrame === 5) {
            // Final attack - de3 with 2x damage and zoom out
            fighter.currentSprite = 'de3';
            this.dealUltimateDamage(fighter, opponent, fighter.baseDamage * 2, true, 5); // Mark as final attack
            
            // Knockback opponent (only happens at de3)
            opponent.vel.x = fighter.facing * 20;
            
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
      // Create slash effect at specified position
      console.log(`Spawned slash effect: ${type} at offset: ${offset.x}, ${offset.y}`);
    },
    
    addCombo: function(fighter) {
      // Add combo to fighter
      fighter.combo = (fighter.combo || 0) + 1;
      console.log(`Combo increased to: ${fighter.combo}`);
    },
    
    calculateDamage: function(baseDamage) {
      // Calculate damage with combo bonus
      const comboMultiplier = 1 + (this.combo * 0.1);
      return Math.floor(baseDamage * comboMultiplier);
    },
    
    endUltimate: function(fighter) {
      // Reset ultimate states
      fighter.currentSprite = 'idle';
      fighter.ultimateCameraZoom = 1;
      fighter.ultimateBackgroundDim = 0;
      
      // Remove protection from opponent
      if (fighter.opponent) {
        fighter.opponent.ultimateProtected = false;
        fighter.opponent.setState('idle');
        // Unlock enemy stagger bar
        if (fighter.opponent.ultimateStaggerLocked) {
          fighter.opponent.ultimateStaggerLocked = false;
          fighter.opponent.staggerDecayRate = fighter.opponent.originalStaggerDecay || 1;
        }
      }
      
      // Restore Valencina's combo delay
      fighter.comboDelay = fighter.originalComboDelay || 0;
      
      // Restore collision for both players
      fighter.collisionEnabled = fighter.originalCollisionEnabled !== false;
      
      if (fighter.opponent) {
        fighter.opponent.collisionEnabled = fighter.opponent.originalCollisionEnabled !== false;
        // Reset movement restriction origin
        fighter.opponent.ultimateRestrictOrigin = null;
      }
    },
    
    dealUltimateDamage: function(fighter, opponent, baseDamage, isFinalAttack = false, attackPhase = 0) {
      console.log('[ULTIMATE DEBUG] Dealing damage - base:', baseDamage, 'protected:', opponent?.ultimateProtected, 'final:', isFinalAttack, 'phase:', attackPhase);
      if (!opponent) return;
      
      // Calculate damage using the proper damage calculation function (includes combo bonus)
      const damage = fighter.calculateDamage(baseDamage);
      console.log('[ULTIMATE DEBUG] Calculated damage with combo bonus:', damage, '(base:', baseDamage, ', combo:', fighter.combo, ')');
      
      // Bypass hit cooldown during ultimate to ensure all attacks land
      const previousState = opponent.state;
      const previousCooldown = opponent.hitCooldown;
      opponent.hitCooldown = 0;
      opponent.setState('idle'); // Reset state to allow hit
      
      // Store original stagger values
      const originalStagger = opponent.stagger;
      const originalStaggerDecay = opponent.staggerDecayRate;
      
      // Prevent stagger accumulation during ultimate
      opponent.staggerDecayRate = 0;
      
      // Determine knockback based on attack phase
      let knockbackAmount = 0;
      if (attackPhase === 1 || attackPhase === 2 || attackPhase === 3) {
        // Attacks 1-3: massively lower knockback
        knockbackAmount = 0.5; // Very minimal knockback
      } else if (attackPhase === 4) {
        // Attack 4: moderate knockback
        knockbackAmount = 2;
      } else if (attackPhase === 5) {
        // Attack 5: strong knockback (final attack)
        knockbackAmount = isFinalAttack ? 8 : 3;
      }
      
      // Apply damage with custom knockback
      opponent.receiveHit(damage, fighter, knockbackAmount);
      
      // ENFORCE BOUNDARIES AFTER KNOCKBACK - PREVENT CLIPPING
      this.enforceBoundaries(opponent);
      this.enforceBoundaries(fighter);
      
      // Reset stagger to original value (prevent any stagger gain)
      opponent.stagger = originalStagger;
      
      // Add friction to knockback unless it's the final attack
      if (!isFinalAttack && opponent.vel.x !== 0) {
        opponent.vel.x *= 0.8; // Apply friction (20% reduction)
      }
      
      // For attacks 1-3, restrict enemy movement to max 100px from current position
      if (attackPhase === 1 || attackPhase === 2 || attackPhase === 3) {
        // Store original position if not already stored
        if (!opponent.ultimateRestrictOrigin) {
          opponent.ultimateRestrictOrigin = { x: opponent.pos.x, y: opponent.pos.y };
        }
        
        // Define valid movement boundaries (100px max from origin, 100px from arena boundaries)
        const maxDistance = 100;
        const boundaryMargin = 100;
        const arenaLeft = boundaryMargin;
        const arenaRight = width - boundaryMargin;
        
        // Calculate allowed movement range
        const minX = Math.max(opponent.ultimateRestrictOrigin.x - maxDistance, arenaLeft);
        const maxX = Math.min(opponent.ultimateRestrictOrigin.x + maxDistance, arenaRight);
        
        // Clamp opponent position to allowed range
        opponent.pos.x = constrain(opponent.pos.x, minX, maxX);
        
        // Stop velocity if outside allowed range
        if (opponent.pos.x <= minX || opponent.pos.x >= maxX) {
          opponent.vel.x = 0;
        }
      }
      
      // Stop Valencina from pushing enemy - zero out her velocity
      fighter.vel.x = 0;
      fighter.vel.y = 0;
      
      // Build combo for Valencina during ultimate - 1 combo per hit like regular attacks
      console.log('[ULTIMATE DEBUG] Before addCombo - fighter combo:', fighter.combo);
      fighter.addCombo(fighter);
      console.log('[ULTIMATE DEBUG] After addCombo - fighter combo:', fighter.combo);
      
      fighter.ultimateTotalDamage += damage;
      fighter.ultimateDamageDealt += damage;
      console.log('[ULTIMATE DEBUG] Damage applied - total:', fighter.ultimateTotalDamage);
    }
  },
  KIT: {
    name: 'Kit',
    title: 'The Blade Master',
    hp: 3200,
    speed: 3,
    attackInterval: 1,
    baseDamage: 21,
    staggerThreshold: 1300,
    staggerLength: 5,
    color: '#c0392b',
    weapon: 'La Spada di Palermo',
    spriteType: 'atlas',
    
    // 🎯 KIT'S UNIQUE ABILITIES
    accelerationRounds: 0,        // Current acceleration round stacks
    maxAccelerationRounds: 10,    // Maximum acceleration round stacks
    poiseCount: 0,               // Poise count
    poisePotency: 0,             // Poise potency
    burnPotency: 0,              // Burn potency
    burnCount: 0,                // Burn count
    tremorPotency: 0,            // Tremor potency
    tremorCount: 0,              // Tremor count
    combo: 0,                    // Current combo counter
    gameTimeTarget: false,       // Game target status
    accelerationActive: false,   // Acceleration round active
    timeToHuntCooldown: 0,       // Time to Hunt cooldown
    disposialActive: false,      // Disposial ultimate active
    disposialPhase: 0,           // Disposial phase (1-5)
    lastEvadeTime: 0,            // Last evade time
    lastHitTime: 0,              // Last hit time
    lastHitOpponent: null,       // Last opponent hit
    
    // Character-specific methods
    onSuccessfulHit: function(damage, opponent, fighter) {
      if (!opponent) return;
      
      // Track last hit opponent for Time to Hunt ability
      fighter.lastHitOpponent = opponent;
      
      // ON HIT: Inflict 2 burn potency and count
      opponent.addStatus('Burn', 2, 2);
      // ON HIT: Inflict 2 tremor potency and count
      opponent.addStatus('Tremor', 2, 2);
      
      // Gain combo
      fighter.combo++;
    },
    
    onReceiveHit: function(amount, attacker, fighter) {
      // Default implementation
    },
    
    onUpdate: function(dt, opponent, fighter) {
      // Update cooldowns
      this.updateTimeToHuntCooldown(fighter, dt);
    },
    
    processKeyPressed: function(key, fighter) {
      // ⚡ Time to Hunt ability (Q key)
      if (key === 'q' && fighter.timeToHuntCooldown <= 0) {
        this.useTimeToHunt(fighter);
      }
      
      // 🚀 Acceleration Round activation (E key)
      if (key === 'e' && fighter.accelerationRounds > 0) {
        this.useAccelerationRound(fighter);
      }
    },
    
    initializeCharacter: function(fighter) {
      // 🎯 Initialize Kit's unique properties
      fighter.weapon = this.weapon;
      fighter.accelerationRounds = 0;
      fighter.combo = 0;
      fighter.poiseCount = 0;
      fighter.poisePotency = 0;
      fighter.burnPotency = 0;
      fighter.burnCount = 0;
      fighter.tremorPotency = 0;
      fighter.tremorCount = 0;
      fighter.gameTimeTarget = false;
      fighter.accelerationActive = false;
      fighter.timeToHuntCooldown = 0;
      fighter.disposialActive = false;
      fighter.disposialPhase = 0;
      fighter.lastEvadeTime = Date.now();
      fighter.lastHitTime = Date.now();
      fighter.lastHitOpponent = null;
    },
    
    // ⚡ Time to Hunt - Q key ability
    useTimeToHunt: function(fighter) {
      if (!fighter.lastHitOpponent) return;
      
      // Apply Game Target status to opponent
      fighter.lastHitOpponent.addStatus('Game Target', 10, 1);
      fighter.lastHitOpponent.speed = 1; // Set speed to 1
      console.log('⚡ Time to Hunt activated! Target speed set to 1 for 10 seconds');
      
      fighter.timeToHuntCooldown = 15; // 15 second cooldown
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
      
      if (fighter.addStatus) {
        fighter.addStatus('Acceleration Rounds', fighter.accelerationRounds, 1);
        console.log(`🚀 Acceleration Rounds status: ${fighter.accelerationRounds} stacks`);
      }
      
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
    
    // 🔄 Update cooldowns
    updateTimeToHuntCooldown: function(fighter, dt) {
      if (fighter.timeToHuntCooldown > 0) {
        fighter.timeToHuntCooldown -= dt;
      }
    },
    
    // ⚡ Disposial Ultimate
    activateUltimate: function(fighter, opponent) {
      fighter.ultimateActive = true;
      fighter.ultimatePhase = 0;
      fighter.ultimateTimer = 1; // 1 second initial pose
      fighter.ultimateTotalDamage = 0;
      fighter.ultimateDamageDealt = 0;
      
      // Gain 3 poise count and 5 poise potency
      fighter.poiseCount += 3;
      fighter.poisePotency += 5;
      
      // Set ultimate properties
      fighter.ultimateName = "DISPOSIAL";
      fighter.ultimateDialogue = "It's time to dispose of you!";
      
      // Set opponent as protected during ultimate
      if (opponent) {
        opponent.ultimateProtected = true;
        opponent.setState('idle');
      }
      
      console.log('⚡ DISPOSIAL ULTIMATE ACTIVATED!');
    },
    
    updateUltimate: function(fighter, opponent, dt) {
      if (!fighter.ultimateActive) return;
      
      // Disposial Attack Sequence:
      // Attack 1: inflict 3 burn and tremor potency
      // Attack 2: inflict 3 burn and tremor potency
      // Attack 3: inflict 6 burn and tremor count
      // Attack 4: trigger tremor burst
      // Attack 5: trigger tremor burst and deal [(burn potency + tremor potency)/2] damage 3 times
      
      fighter.ultimateTimer -= dt;
      
      if (fighter.ultimatePhase === 0 && fighter.ultimateTimer <= 0) {
        // Start attack sequence
        fighter.ultimatePhase = 1;
        fighter.ultimateTimer = 0.3;
        fighter.ultimateAttackFrame = 0;
      }
      
      if (fighter.ultimatePhase === 1) {
        // Attack 1: inflict 3 burn and 3 tremor potency
        if (fighter.ultimateAttackFrame === 0) {
          if (opponent) {
            opponent.addStatus('Burn', 0, 3); // potency only
            opponent.addStatus('Tremor', 0, 3);
          }
          fighter.ultimateAttackFrame++;
          fighter.ultimateTimer = 0.2;
        } else if (fighter.ultimateTimer <= 0) {
          fighter.ultimatePhase = 2;
          fighter.ultimateTimer = 0.2;
          fighter.ultimateAttackFrame = 0;
        }
      }
      
      if (fighter.ultimatePhase === 2) {
        // Attack 2: inflict 3 burn and 3 tremor potency
        if (fighter.ultimateAttackFrame === 0) {
          if (opponent) {
            opponent.addStatus('Burn', 0, 3);
            opponent.addStatus('Tremor', 0, 3);
          }
          fighter.ultimateAttackFrame++;
          fighter.ultimateTimer = 0.2;
        } else if (fighter.ultimateTimer <= 0) {
          fighter.ultimatePhase = 3;
          fighter.ultimateTimer = 0.2;
          fighter.ultimateAttackFrame = 0;
        }
      }
      
      if (fighter.ultimatePhase === 3) {
        // Attack 3: inflict 6 burn and tremor count
        if (fighter.ultimateAttackFrame === 0) {
          if (opponent) {
            opponent.addStatus('Burn', 6, 0); // count only
            opponent.addStatus('Tremor', 6, 0);
          }
          fighter.ultimateAttackFrame++;
          fighter.ultimateTimer = 0.2;
        } else if (fighter.ultimateTimer <= 0) {
          fighter.ultimatePhase = 4;
          fighter.ultimateTimer = 0.2;
          fighter.ultimateAttackFrame = 0;
        }
      }
      
      if (fighter.ultimatePhase === 4) {
        // Attack 4: trigger tremor burst
        if (fighter.ultimateAttackFrame === 0) {
          this.triggerTremorBurst(fighter);
          fighter.ultimateAttackFrame++;
          fighter.ultimateTimer = 0.2;
        } else if (fighter.ultimateTimer <= 0) {
          fighter.ultimatePhase = 5;
          fighter.ultimateTimer = 0.2;
          fighter.ultimateAttackFrame = 0;
        }
      }
      
      if (fighter.ultimatePhase === 5) {
        // Attack 5: trigger tremor burst 3 times and deal damage
        if (fighter.ultimateAttackFrame < 3) {
          if (fighter.ultimateTimer <= 0) {
            this.triggerTremorBurst(fighter);
            const damage = Math.floor((fighter.burnPotency + fighter.tremorPotency) / 2);
            if (opponent) {
              opponent.takeDamage(damage);
            }
            fighter.ultimateAttackFrame++;
            fighter.ultimateTimer = 0.2;
          }
        } else if (fighter.ultimateTimer <= 0) {
          // End ultimate
          fighter.ultimateActive = false;
          fighter.disposialActive = false;
          if (opponent) {
            opponent.ultimateProtected = false;
          }
        }
      }
    },
    
    calculateDamage: function(baseDamage) {
      // Calculate damage with combo bonus
      const comboMultiplier = 1 + (this.combo * 0.1);
      return Math.floor(baseDamage * comboMultiplier);
    },
    
    addCombo: function(fighter) {
      // Add combo to fighter
      fighter.combo = (fighter.combo || 0) + 1;
    }
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
    'Overheat': '#ff6b6b'
  };
  return colors[type] || '#ffffff';
}
