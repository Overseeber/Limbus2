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
  s1f3: { atlas:"val2", x:0,y:0,w:3,h:3, offsetX: -30 },
  halt2:{ atlas:"val2", x:0,y:3,w:3,h:2 },
  s2f1: { atlas:"val2", x:3,y:0,w:5,h:2 },
  joust:{ atlas:"val2", x:3,y:2,w:5,h:2 },
  s3f1: { atlas:"val2", x:0,y:5,w:3,h:2 },
  s3f2: { atlas:"val2", x:3,y:4,w:3,h:2 },
  s3f3: { atlas:"val2", x:3,y:6,w:3,h:2 },
  dist1:{ atlas:"val2", x:6,y:4,w:2,h:2 },

  // ===== val3 =====
  s2f1_v3:{ atlas:"val3", x:0,y:0,w:4,h:2 },
  s2f2:   { atlas:"val3", x:0,y:2,w:3,h:3 },
  s2f3:   { atlas:"val3", x:0,y:5,w:3,h:2 },
  s2f4:   { atlas:"val3", x:4,y:0,w:4,h:3, offsetY:+256 }, // custom anchor
  d1:     { atlas:"val3", x:3,y:3,w:3,h:2 },
  d2:     { atlas:"val3", x:3,y:5,w:3,h:2 },

  // ===== valdisposal =====
  de1:{ atlas:"valdisposal", x:2,y:0,w:4,h:2 },
  de2:{ atlas:"valdisposal", x:1,y:2,w:5,h:2 },
  de3:{ atlas:"valdisposal", x:4,y:0,w:8,h:2 },

  // ===== slash1 =====
  s1s1:{ atlas:"vslash1", x:0,y:0,w:4,h:3 },
  s1s2:{ atlas:"vslash1", x:4,y:0,w:4,h:3 },
  s1s3:{ atlas:"vslash1", x:3,y:3,w:5,h:2 },
  js1: { atlas:"vslash1", x:3,y:5,w:5,h:2 },

  // ===== slash2 =====
  s1s4:{ atlas:"vslash2", x:0,y:2,w:4,h:3, offsetY:+256 },
  s2s1:{ atlas:"vslash2", x:0,y:0,w:4,h:2 },
  s2s2:{ atlas:"vslash2", x:4,y:0,w:4,h:3, offsetY:+256 },
  diss1:{atlas:"vslash2", x:4,y:3,w:4,h:2 }
};

// ==========================
// 🔥 SPRITE LOADING FUNCTION
// ==========================
function loadSpriteAtlases() {
  atlases.val1 = loadImage("data/valencina/val1.png");
  atlases.val2 = loadImage("data/valencina/val2.png");
  atlases.val3 = loadImage("data/valencina/val3.png");
  atlases.valdisposal = loadImage("data/valencina/valdisposal.png");
  atlases.vslash1 = loadImage("data/valencina/vslash1.png");
  atlases.vslash2 = loadImage("data/valencina/vslash2.png");
}

// ==========================
// 🧩 SPRITE DRAWING FUNCTION
// ==========================
function drawSprite(name, x, y) {
  let s = SPRITES[name];
  if (!s) {
    console.error("Missing sprite definition:", name);
    return null;
  }
  
  let img = atlases[s.atlas];
  if (!img) {
    console.error("Missing atlas:", s.atlas);
    return null;
  }

  let sx = s.x * CELL;
  let sy = s.y * CELL;
  let sw = s.w * CELL;
  let sh = s.h * CELL;

  let offsetX = s.offsetX || 0;
  let offsetY = s.offsetY || 0;

  push();
  translate(x, y);

  image(
    img,
    -sw/2 + offsetX,
    -sh + offsetY,
    sw, sh,
    sx, sy,
    sw, sh
  );

  pop();
  
  return { width: sw, height: sh };
}

function drawSpriteScaled(name, x, y, spriteScale = 1) {
  let s = SPRITES[name];
  if (!s) return null;
  
  let img = atlases[s.atlas];
  if (!img) return null;

  let sx = s.x * CELL;
  let sy = s.y * CELL;
  let sw = s.w * CELL;
  let sh = s.h * CELL;

  let offsetX = s.offsetX || 0;
  let offsetY = s.offsetY || 0;

  push();
  translate(x, y);
  
  // Apply scale
  if (spriteScale !== 1) {
    scale(spriteScale, spriteScale);
  }

  image(
    img,
    -sw/2 + offsetX,
    -sh + offsetY,
    sw, sh,
    sx, sy,
    sw, sh
  );

  pop();
  
  return { width: sw * spriteScale, height: sh * spriteScale };
}

// Character roster system
const CHARACTERS = {
  JOHN: {
    name: 'John Limbus Company',
    title: 'Default Fighter',
    hp: 2500,
    speed: 7.5,
    attackInterval: 1,
    baseDamage: 15,
    staggerThreshold: 100,
    staggerLength: 5,
    color: '#4a90e2',
    weapon: 'bus',
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
    speed: 9,
    attackInterval: 0.5,
    baseDamage: 21,
    staggerThreshold: 1300,
    staggerLength: 5,
    color: '#ff6b9d',
    weapon: 'La Spada di Palermo',
    accelerationRounds: 5,
    maxPrecognition: 30,
    spriteType: 'atlas', // Use sprite atlas system
    // Character-specific methods
    onSuccessfulHit: function(damage, opponent, fighter) {
      if (!opponent) return;
      
      // Track last hit opponent for Time to Hunt ability
      fighter.lastHitOpponent = opponent;
      
      // Inflict 2 burn potency and count
      opponent.addStatus('Burn', 2, 2);
      // Inflict 2 tremor potency and count
      opponent.addStatus('Tremor', 2, 2);
      
      // Dialogue triggers
      if (!fighter.currentDialogue) {
        fighter.currentDialogue = "I'll be damned before I let you ruin this! Not after toiling like a goddamn dog for decades, climbing up the ranks...!";
        fighter.dialogueTimer = 10;
      }
      
      // On 5x combo counter
      if (fighter.attackCounter >= 5) {
        fighter.currentDialogue = "Feeling confident today? Then parry this, asshole.\nMatch my hatred.";
        fighter.dialogueTimer = 10;
      }
      
      // On manual evade
      if (fighter.isEvading) {
        fighter.currentDialogue = "What, having a hard time landing a hit?\nYou won't even manage to brush my coattails at this rate.\nI'm reading you like an open book.\nBack in my day, you wouldn't even have dared to look me in the eye.\nWhat'd I say? I can handle you as long as I've got this eye.";
        fighter.dialogueTimer = 10;
        fighter.consumeStatus('Precognition');
      }
      
      // Reduced to 60% hp
      if (fighter.hp < fighter.maxHp * 0.6) {
        fighter.currentDialogue = "Fuck you! I am Valencina della Famiglia Bognatelli...! I refuse to rot in this fucking dump!";
        fighter.dialogueTimer = 10;
      }
      
      // On kill
      if (opponent.hp <= 0) {
        fighter.currentDialogue = "Hahahahaha!\n And the hunt comes to a close!\n I'll make mincemeat of you all!";
        fighter.dialogueTimer = 10;
      }
      
      // On hit
      if (fighter.state === 'hit') {
        fighter.currentDialogue = "Shit!\nWhat the hell—";
        fighter.dialogueTimer = 10;
      }
      
      // Overheat
      if (fighter.isOverheated) {
        fighter.currentDialogue = "... Tsk. Overheated already?";
        fighter.dialogueTimer = 10;
      }
      
      // Disposal
      if (fighter.isOverheated && fighter.overheat > 20) {
        fighter.currentDialogue = "I'm sick and tired of Ticket and her meddling fools—to hell with you all!\nYeah, I hate you all! The damn Famiglia, you, and Ticket, too!";
        fighter.dialogueTimer = 10;
      }
    },
    onReceiveHit: function(amount, attacker, fighter) {
      // Eye of Precognition passive
      // When attacked, 3% x cognition chance to evade (max 90%)
      const evadeChance = min(0.9, fighter.precognition * 0.03);
      if (random() < evadeChance) {
        fighter.startEvade(attacker);
        fighter.consumeStatus('Precognition');
        return;
      }
      
      // When hit: gain 1 precognition
      fighter.precognition = min(fighter.maxPrecognition, fighter.precognition + 1);
      fighter.precognitionTimer = 0;
    },
    onUpdate: function(dt, opponent, fighter) {
      // Debug: Check if onUpdate is being called
      if (fighter.characterKey === 'VALENCINA') {
        console.log("Valencina onUpdate called - state:", fighter.state, "currentSprite:", fighter.currentSprite);
      }
      
      // Sprite state changes
      let newSprite = 'idle'; // default sprite
      
      // Priority order for sprite states
      if (fighter.state === 'hit') {
        newSprite = 'hurt';
      } else if (fighter.isGuarding) {
        newSprite = 'guard';
      } else if (fighter.isEvading) {
        newSprite = 'evade';
      } else if (fighter.state === 'attack') {
        // Use prepat for first attack in combo
        if (fighter.attackCounter === 0) {
          newSprite = 'prepat';
        } else {
          newSprite = 'idle'; // Use idle for other attacks for now
        }
      } else if (fighter.state === 'run' || (abs(fighter.vel.x) > 0.1 && fighter.onGround())) {
        newSprite = 'moving';
      }
      
      // Only update if sprite actually changed
      if (fighter.currentSprite !== newSprite) {
        console.log("Changing sprite from", fighter.currentSprite, "to", newSprite);
        fighter.currentSprite = newSprite;
      }
      
      // Eye of Precognition passive - precognition regeneration
      if (fighter.isOverheated) {
        // In overheat: lose 1 precognition per second, regenerate 1 per 2 seconds
        fighter.precognitionTimer += dt;
        if (fighter.precognitionTimer >= 2) {
          fighter.precognitionTimer = 0;
          fighter.precognition = min(fighter.maxPrecognition, fighter.precognition + 1);
          
          // Exit overheat when precognition reaches max
          if (fighter.precognition >= fighter.maxPrecognition) {
            fighter.isOverheated = false;
            fighter.overheat = 0;
            fighter.damageResistance = 1.0;
          }
        }
      } else if (fighter.precognition < fighter.maxPrecognition) {
        // Normal: regenerate 1 precognition per 3 seconds
        fighter.precognitionTimer += dt;
        if (fighter.precognitionTimer >= 3) {
          fighter.precognitionTimer = 0;
          fighter.precognition = min(fighter.maxPrecognition, fighter.precognition + 1);
        }
      }
      
      // Check for overheat (0 precognition)
      if (fighter.precognition <= 0 && !fighter.isOverheated) {
        fighter.isOverheated = true;
        fighter.overheat = 30;
        fighter.damageResistance = 0.8;
      }
      
      // Accelerating Future passive - gain speed and reduce attack interval per combo
      if (fighter.combo > 0) {
        fighter.speed = this.speed + (fighter.combo * 0.2);
        fighter.attackInterval = this.attackInterval - (fighter.combo * 0.02);
      }
      
      // Shin passive - activate below 50% HP
      if (fighter.hp < fighter.maxHp * 0.5) {
        const enemyCombo = opponent ? opponent.combo : 0;
        const damageResistance = min(0.5, 0.1 + (enemyCombo * 0.05));
        fighter.damageResistance = max(fighter.damageResistance, damageResistance);
      }
    },
    processKeyPressed: function(key, fighter) {
      const keyLower = key.toLowerCase();
      
      // Time to Hunt ability (Q key)
      if (keyLower === 'q') {
        fighter.useTimeToHunt();
      }
      
      // Disposial ultimate ability (E key) 
      if (keyLower === 'e') {
        fighter.useDisposial();
      }
    },
    initializeCharacter: function(fighter) {
      // Initialize Valencina-specific properties
      fighter.accelerationRounds = 0;
      fighter.maxAccelerationRounds = 10;
      fighter.isCharged = false;
      fighter.precognition = this.maxPrecognition;
      fighter.precognitionTimer = 0;
      fighter.isOverheated = false;
      fighter.overheat = 0;
      fighter.lastHitOpponent = null;
      
      // Valencina-specific cooldowns
      fighter.timeToHuntCooldown = 0;
      fighter.disposialCooldown = 0;
      
      // Set default sprite
      fighter.currentSprite = 'idle';
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
    'Overheat': '#dc2626'
  };
  return colors[type] || '#888';
}
