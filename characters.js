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
    attackInterval: 0.7,
    baseDamage: 21,
    staggerThreshold: 1300,
    staggerLength: 5,
    color: '#ff6b9d',
    weapon: 'La Spada di Palermo',
    accelerationRounds: 5,
    maxPrecognition: 30,
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
      fighter.weapon = this.weapon;
      fighter.accelerationRounds = this.accelerationRounds;
      fighter.maxPrecognition = this.maxPrecognition;
      fighter.precognition = this.maxPrecognition;
      fighter.precognitionTimer = 0;
      fighter.isOverheated = false;
      fighter.overheat = 0;
      fighter.lastHitOpponent = null;
      
      // Valencina-specific cooldowns
      fighter.timeToHuntCooldown = 0;
      fighter.disposialCooldown = 0;
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
