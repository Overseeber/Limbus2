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
    speed: 9,                    // Updated from 9 to 3
    attackInterval: 1,          // Updated from 0.5 to 1 sec
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
      
      // 🎯 ON HIT: Inflict 2 burn potency and count
      opponent.addStatus('Burn', 2, 2);
      // 🎯 ON HIT: Inflict 2 tremor potency and count
      opponent.addStatus('Tremor', 2, 2);
      
      // 🔄 Accelerating Future: Gain combo and apply effects
      fighter.combo++;
      this.applyAcceleratingFuture(fighter);
      
      // 👁️ Eye of Precognition: Gain 1 precognition on hit
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
      
      // Apply Game Target status to opponent
      fighter.lastHitOpponent.gameTimeTarget = true;
      fighter.lastHitOpponent.speed = 1; // Set speed to 1
      fighter.lastHitOpponent.gameTargetDuration = 10; // 10 seconds
      
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
      // Check for passive evade chance
      if (fighter.precognition > 0 && !fighter.isEvading) {
        const evadeChance = Math.min(0.03 * 30, 0.9); // 3% x 30 = 90% max
        if (Math.random() < evadeChance) {
          // Trigger precognition evade
          fighter.triggerEvade();
          fighter.precognition--;
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
      // For every 1 combo: Gain 1 movement speed, Lower attack interval by 5%
      fighter.speed += fighter.combo * 1;
      fighter.attackInterval *= (1 - fighter.combo * 0.05);
    },
    
    // ❤️ Shin (心) - Valencina passive
    checkShinActivation: function(fighter) {
      if (fighter.hp < fighter.maxHp * 0.5 && !fighter.shinActive) {
        fighter.shinActive = true;
        fighter.protection = 1; // Gain 1 protection (10% damage reduction)
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
    
    updateDisposialUltimate: function(fighter, opponent, dt) {
      if (!fighter.disposialActive) return;
      
      // Handle different ultimate phases based on attack sequence
      // This would be integrated with the attack system
    },
    
    // 🔄 Update cooldowns
    updateTimeToHuntCooldown: function(fighter, dt) {
      if (fighter.timeToHuntCooldown > 0) {
        fighter.timeToHuntCooldown -= dt;
      }
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
