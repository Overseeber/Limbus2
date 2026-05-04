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
      
      // Dialogue triggers - select random line from arrays
      if (!fighter.currentDialogue) {
        const attackDialogues = [
          "..."
        ];
        fighter.currentDialogue = random(attackDialogues);
        fighter.dialogueTimer = 10;
      }
      
      // On 5x combo counter
      if (fighter.attackCounter >= 5) {
        const comboDialogues = [
          "Feeling confident today? Then parry this, asshole!",
          "Match my hatred"
        ];
        fighter.currentDialogue = random(comboDialogues);
        fighter.dialogueTimer = 10;
      }
      
      // On manual evade
      if (fighter.isEvading) {
        const evadeDialogues = [
          "What, having a hard time landing a hit?",
          "You won't even manage to brush my coattails at this rate.",
          "I'm reading you like an open book.",
          "Back in my day, you wouldn't even dare to look me in the eye.",
          "What'd I say? I can handle you as long as I've got this eye."
        ];
        fighter.currentDialogue = random(evadeDialogues);
        fighter.dialogueTimer = 10;
        
        const precognitionStatus = fighter.statuses.find((s) => s.type === 'Precognition');
        if (precognitionStatus) {
          precognitionStatus.count = max(0, precognitionStatus.count - 1); // Consume 1 precognition
          fighter.precognition = precognitionStatus.count;
          fighter.precognitionTimer = 0;
        }
      }
      
      // Reduced to 60% hp
      if (fighter.hp < fighter.maxHp * 0.6) {
        const lowHpDialogues = [
          "Fuck you! I am Valencina della Famiglia Bognatelli...! I refuse to rot in this fucking dump!"
        ];
        fighter.currentDialogue = random(lowHpDialogues);
        fighter.dialogueTimer = 10;
      }
      
      // On kill
      if (opponent.hp <= 0) {
        const killDialogues = [
          "Hahahahaha! And the hunt comes to a close!",
          "I'll make mincemeat of you all!"
        ];
        fighter.currentDialogue = random(killDialogues);
        fighter.dialogueTimer = 10;
      }
      
      // On hit
      if (fighter.state === 'hit') {
        const hitDialogues = [
          "Shit!",
          "What the hell—"
        ];
        fighter.currentDialogue = random(hitDialogues);
        fighter.dialogueTimer = 10;
      }
      
      // Overheat
      if (fighter.isOverheated) {
        const overheatDialogues = [
          "... Tsk. Overheated already?"
        ];
        fighter.currentDialogue = random(overheatDialogues);
        fighter.dialogueTimer = 10;
      }
      
      // Disposal
      if (fighter.isOverheated && fighter.overheat > 20) {
        const disposalDialogues = [
          "I'm sick and tired of Ticket and her meddling fools—to hell with you all! Yeah, I hate you all! The damn Famiglia, you, and Ticket, too!"
        ];
        fighter.currentDialogue = random(disposalDialogues);
        fighter.dialogueTimer = 10;
      }
    },
    onReceiveHit: function(amount, attacker, fighter) {
      const precognitionStatus = fighter.statuses.find((s) => s.type === 'Precognition');
      const overheatStatus = fighter.statuses.find((s) => s.type === 'Overheat');
      
      if (precognitionStatus) {
        // Eye of Precognition passive
        // When attacked, 3% x cognition chance to evade (max 90%)
        const evadeChance = min(0.9, precognitionStatus.count * 0.03);
        if (random() < evadeChance) {
          fighter.startEvade(attacker);
          precognitionStatus.count = max(0, precognitionStatus.count - 1); // Lose 1 precognition
          fighter.precognition = precognitionStatus.count;
          fighter.precognitionTimer = 0; // Reset timer
          return;
        }
        
        // When hit: gain 1 precognition
        precognitionStatus.count = min(30, precognitionStatus.count + 1);
        fighter.precognition = precognitionStatus.count;
        fighter.precognitionTimer = 0;
      } else if (overheatStatus) {
        // Overheat state: lose 1 overheat when hit
        overheatStatus.count = max(0, overheatStatus.count - 1);
        fighter.overheat = overheatStatus.count;
      }
    },
    onUpdate: function(dt, opponent, fighter) {
      // Skip sprite updates during ultimate - ultimate controls its own sprites
      if (fighter.ultimateActive) {
        return;
      }
      
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
      
      // Eye of Precognition status system
      const precognitionStatus = fighter.statuses.find((s) => s.type === 'Precognition');
      const overheatStatus = fighter.statuses.find((s) => s.type === 'Overheat');
      
      if (overheatStatus) {
        // Overheat state: -20% damage
        fighter.damageResistance = 0.8;
        
        // Every 5 seconds: lose 1 overheat
        fighter.overheatTimer += dt;
        if (fighter.overheatTimer >= 5) {
          fighter.overheatTimer = 0;
          overheatStatus.count = max(0, overheatStatus.count - 1);
          
          // When at 0 overheat, transition back to precognition
          if (overheatStatus.count <= 0) {
            fighter.removeStatus('Overheat');
            fighter.addStatus('Precognition', 30, 1);
            fighter.precognition = 30;
            fighter.isOverheated = false;
          }
        }
      } else if (precognitionStatus) {
        // Precognition state
        fighter.damageResistance = 1.0;
        fighter.isOverheated = false;
        
        // Update precognition property to match status
        fighter.precognition = precognitionStatus.count;
        
        // After 5 seconds without evading or being hit, gain 1 precognition
        fighter.precognitionTimer += dt;
        if (fighter.precognitionTimer >= 5) {
          fighter.precognitionTimer = 0;
          if (precognitionStatus.count < 30) {
            precognitionStatus.count += 1;
            fighter.precognition = precognitionStatus.count;
          }
        }
        
        // Check for transition to overheat (0 precognition)
        if (precognitionStatus.count <= 0) {
          fighter.removeStatus('Precognition');
          fighter.addStatus('Overheat', 30, 1);
          fighter.isOverheated = true;
          fighter.overheat = 30;
          fighter.overheatTimer = 0;
        }
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
      
      // Reduce cooldowns
      fighter.timeToHuntCooldown = max(0, fighter.timeToHuntCooldown - dt);
      fighter.disposialCooldown = max(0, fighter.disposialCooldown - dt);
    },
    processKeyPressed: function(key, fighter) {
      const keyLower = key.toLowerCase();
      
      // Time to Hunt ability (Q key)
      if (keyLower === 'q') {
        // Implement Time to Hunt logic - inflict Game Target on last enemy hit
        if (fighter.timeToHuntCooldown <= 0) {
          // Check if we have a last hit opponent
          if (fighter.lastHitOpponent) {
            // Inflict Game Target status on the last enemy hit
            fighter.lastHitOpponent.addStatus('Game Target', 5, 1); // 5 hits, 1 potency
            
            // Set cooldown
            fighter.timeToHuntCooldown = 5; // 5 second cooldown
          }
        }
      }
      
      // Disposial ultimate ability (X key) - handled by ultimate system
      // This is now handled by the ultimate system in fighter-modular.js
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
      
      // Initialize cooldowns
      fighter.timeToHuntCooldown = 0;
      fighter.disposialCooldown = 0;
      
      // Initialize timers
      fighter.precognitionTimer = 0;
      fighter.overheatTimer = 0;
      
      // Add initial precognition status effect
      fighter.addStatus('Precognition', 30, 1);
      
      // Set default sprite
      fighter.currentSprite = 'idle';
    },
    
    // Helper function to clamp position within arena boundaries
    clampToArena: function(posX, posY) {
      const arenaLeft = 50; // Safe distance from left edge
      const arenaRight = width - 50; // Safe distance from right edge
      const arenaTop = 50; // Safe distance from top edge
      const arenaBottom = height - 50; // Safe distance from bottom edge
      
      return {
        x: constrain(posX, arenaLeft, arenaRight),
        y: constrain(posY, arenaTop, arenaBottom)
      };
    },
    
    // UNIVERSAL boundary enforcement - prevents ALL wall clipping
    enforceBoundaries: function(fighter) {
      if (!fighter) return;
      
      // Define strict boundaries - no clipping allowed
      const boundaryMargin = 50;
      const minX = boundaryMargin;
      const maxX = width - boundaryMargin;
      const minY = boundaryMargin;
      const maxY = height - boundaryMargin;
      
      // Force position within boundaries
      const originalX = fighter.pos.x;
      const originalY = fighter.pos.y;
      
      fighter.pos.x = constrain(fighter.pos.x, minX, maxX);
      fighter.pos.y = constrain(fighter.pos.y, minY, maxY);
      
      // Stop velocity if hitting boundary
      if (fighter.pos.x <= minX || fighter.pos.x >= maxX) {
        fighter.vel.x = 0;
      }
      if (fighter.pos.y <= minY || fighter.pos.y >= maxY) {
        fighter.vel.y = 0;
      }
      
      // Log if boundary was enforced (for debugging)
      if (originalX !== fighter.pos.x || originalY !== fighter.pos.y) {
        console.log('[BOUNDARY] Enforced boundaries for fighter - moved from', originalX, originalY, 'to', fighter.pos.x, fighter.pos.y);
      }
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
            fighter.ultimateTimer = 0.5; // Timing before first attack
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
            fighter.ultimateAttackTimer = 0.3;
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
                fighter.ultimateAttackTimer = 0.3;
                // Deal damage with s1s2 and apply knockback
                console.log('[ULTIMATE DEBUG] About to deal damage for s1f2');
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 1);
                fighter.spawnSlashEffect('s1s2', { x: 15, y: -5 });
                // Valencina stays in center - no repositioning needed
                break;
              case 2:
                fighter.currentSprite = 's1f3';
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 3:
                // End attack sequence - hold s1f3 sprite
                fighter.ultimatePhase = 3;
                fighter.ultimateTimer = 0.5; // Timing before next attack
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
            
            // Make Valencina face enemy
            fighter.facing = randomSide * -1; // Face towards enemy
            
            // Halt all momentum/velocity on teleport
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            opponent.vel.x = 0;
            opponent.vel.y = 0;
            
            fighter.ultimatePhase = 4;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.3;
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
                fighter.ultimateAttackTimer = 0.3;
                // Deal damage with s1s4 and apply knockback
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 2);
                fighter.spawnSlashEffect('s1s4', { x: 15, y: -5 });
                // Valencina stays in center - no repositioning needed
                break;
              case 2:
                // End attack sequence - hold s4f1 sprite
                fighter.ultimatePhase = 5;
                fighter.ultimateTimer = 0.5; // Timing before next attack
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
            
            // Make Valencina face enemy
            fighter.facing = randomSide * -1; // Face towards enemy
            
            // Halt all momentum/velocity on teleport
            fighter.vel.x = 0;
            fighter.vel.y = 0;
            opponent.vel.x = 0;
            opponent.vel.y = 0;
            
            fighter.ultimatePhase = 6;
            fighter.ultimateAttackFrame = 0;
            fighter.ultimateAttackTimer = 0.3;
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
                fighter.ultimateAttackTimer = 0.3;
                // Deal damage with s1s4 and apply knockback
                console.log('[ULTIMATE DEBUG] About to deal damage for s3f2');
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 3);
                fighter.spawnSlashEffect('s1s4', { x: 15, y: -5 });
                // Valencina stays in center - no repositioning needed
                break;
              case 2:
                fighter.currentSprite = 's3f3';
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 3:
                // After 1 second, teleport to 300 pixels on the right of enemy
                fighter.ultimateAttackTimer = 1.0; // Wait 1 second
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
                fighter.ultimateTimer = 0.5; // Timing before next attack
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
            fighter.ultimateAttackTimer = 0.3;
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
                fighter.ultimateAttackTimer = 0.3;
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
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 3:
                // de1 with s1s3 (simultaneous) - deal damage at same time as showing de1
                this.dealUltimateDamage(fighter, opponent, fighter.baseDamage, false, 4);
                fighter.spawnSlashEffect('s1s3', { x: 15, y: -5 });
                // Reposition after knockback
                setTimeout(() => {
                  const valencinaTargetX = opponent.pos.x - (fighter.facing * 80);
                  const valencinaPos = this.clampToArena(valencinaTargetX, opponent.pos.y);
                  fighter.pos.x = valencinaPos.x;
                  fighter.pos.y = valencinaPos.y;
                  fighter.vel.x = 0;
                  fighter.vel.y = 0;
                }, 100);
                fighter.ultimateAttackTimer = 0.3;
                break;
              case 4:
                // End attack sequence - hold de1 sprite
                fighter.ultimatePhase = 9;
                fighter.ultimateTimer = 0.5; // Timing before next attack
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
            fighter.ultimateAttackTimer = 0.3;
            fighter.ultimateAlternateCounter = 0;
          }
          break;
          
        case 10: // Attack 5 sequence: de2 with s1s3/js1 alternating 5 times, then de3 with 2x damage and knockback
          fighter.ultimateAttackTimer -= dt;
          
          // Lock enemy position in front of Valencina during de2 attacks
          if (fighter.currentSprite === 'de2') {
            opponent.pos.x = fighter.pos.x + (fighter.facing * 80);
            opponent.pos.y = fighter.pos.y;
            opponent.vel.x = 0; // Stop any movement
            opponent.vel.y = 0;
          }
          
          if (fighter.ultimateAttackTimer <= 0) {
            if (fighter.ultimateAttackFrame < 10) { // 5 alternating attacks
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
              fighter.ultimateAttackTimer = 0.3;
            } else if (fighter.ultimateAttackFrame === 10) {
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
    
    dealUltimateDamage: function(fighter, opponent, damage, isFinalAttack = false, attackPhase = 0) {
      console.log('[ULTIMATE DEBUG] Dealing damage:', damage, 'protected:', opponent?.ultimateProtected, 'final:', isFinalAttack, 'phase:', attackPhase);
      if (!opponent) return;
      
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
      fighter.addCombo(fighter);
      
      fighter.ultimateTotalDamage += damage;
      fighter.ultimateDamageDealt += damage;
      console.log('[ULTIMATE DEBUG] Damage applied - total:', fighter.ultimateTotalDamage);
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
