// ==========================
// 🎭 MODULAR FIGHTER CLASS
// ==========================

import { ICharacter, IState, IAttackSystem, IMovementSystem, IRenderSystem } from './character-interface.js';
import { IdleState, AttackState, HurtState, GuardState, EvadeState, StaggeredState } from './state-machine.js';
import { BasicAttackSystem, ComboAttackSystem } from './attack-system.js';
import { BasicMovementSystem, PhysicsMovementSystem } from './movement-system.js';
import { BasicRenderSystem, EffectsRenderSystem, SpriteRenderSystem } from './render-system.js';

/**
 * Modular Fighter class with component-based architecture
 * Makes it easy to add new characters and modify existing ones
 */
export class Fighter {
  // Core properties
  isAI = false;
  name = '';
  characterKey = '';
  character = null;
  
  // Position and physics
  pos = null;
  vel = null;
  facing = 1;
  spawnY = 0;
  
  // Combat properties
  hp = 100;
  maxHp = 100;
  speed = 5;
  baseDamage = 10;
  attackInterval = 0.5;
  staggerThreshold = 20;
  staggerLength = 5;
  color = '#ffffff';
  
  // State management
  state = 'idle';
  attackTimer = 0;
  attackDamage = 0;
  attackKnockback = 0;
  attackRange = 0;
  attackIgnoreParry = false;
  attackHitResolved = false;
  kbResist = 0.08;
  dashCharges = 3;
  staggerRecovery = 0;
  staggerRecoveryTimer = 0;
  staggerTimer = 0;
  staggerLength = 5;
  combo = 0;
  comboTimer = 0;
  comboTimeout = 1.4;
  attackCounter = 0;
  attackCounterDisplay = 0;
  attackCounterTimer = 0;
  statuses = [];
  remainingSlide = 0;
  
  // Movement states
  isDucking = false;
  isGuarding = false;
  isCountering = false;
  isEvading = false;
  evadeTimer = 0;
  chargeMeter = 0;
  
  // Input handling
  attackRequest = false;
  attackRelease = false;
  guardRequest = false;
  parryWindow = 0;
  strikeActive = false;
  pendingCounter = false;
  lastAttackHit = false;
  hitCooldown = 0;
  parryIndicator = 0;
  dashAttacked = false;
  evadeRequested = false;
  parryCount = 3;
  parryTimer = 0;
  parryStunTimer = 0;
  
  // Special states
  slamAttackRequested = false;
  isSlamAttacking = false;
  slamLandingHitbox = null;
  pendingSlamDamage = null;
  
  // Sprite and animation properties
  spriteType = '';
  currentSprite = 'idle';
  sprite = null;
  slashEffects = [];
  
  // Attack sequence properties
  attackSequence = 0;
  attackFrame = 0;
  attackFrameTimer = 0;
  attackFrameDuration = 0.2;
  attackDamageDealt = false;
  chargeAttack = false;
  
  // Movement properties
  isDashing = false;
  usePostDashSprite = false;
  jumpRequest = false;
  jumpStrength = -20;
  
  // Special properties
  slamHoldPosition = false;
  
  // AI and controls
  ai = null;
  controls = {};
  
  // Component systems
  stateMachine = null;
  attackSystem = null;
  movementSystem = null;
  renderSystem = null;
  
  constructor(isAI = false, name = 'Enemy', characterKey = null) {
    this.isAI = isAI;
    this.name = name;
    
    // Safe character selection with fallback
    const fallbackCharacter = (typeof currentCharacter !== 'undefined' ? currentCharacter : 'VALENCINA');
    this.characterKey = characterKey || (isAI ? 'VALENCINA' : fallbackCharacter);
    
    // Get character from roster
    const characterData = CHARACTERS[this.characterKey];
    if (!characterData) {
      console.error("Invalid characterKey:", this.characterKey);
      this.characterKey = 'VALENCINA';
      character = CHARACTERS[this.characterKey];
    }
    
    this.character = characterData;
    
    // Initialize position and physics
    this.pos = createVector(width / 2 + (isAI ? 200 : -200), height - 100);
    this.vel = createVector(0, 0);
    this.facing = isAI ? -1 : 1;
    this.spawnY = height - 100;
    
    // Initialize position and physics
    this.pos = createVector(width / 2 + (isAI ? 200 : -200), height - 100);
    this.vel = createVector(0, 0);
    this.facing = isAI ? -1 : 1;
    this.spawnY = height - 100;
    
    // Initialize combat properties
    this.hp = this.character.hp;
    this.maxHp = this.character.hp;
    this.speed = this.character.speed;
    this.baseDamage = this.character.baseDamage;
    this.attackInterval = this.character.attackInterval;
    this.staggerThreshold = this.character.staggerThreshold;
    this.staggerLength = this.character.staggerLength;
    this.color = isAI ? '#e74c3c' : this.character.color;
    
    // Initialize component systems
    this.stateMachine = new IdleState();
    this.attackSystem = new BasicAttackSystem();
    this.movementSystem = new BasicMovementSystem();
    this.renderSystem = new BasicRenderSystem();
    
    // Initialize sprite and animation properties
    this.spriteType = this.character.spriteType || '';
    this.currentSprite = this.character.defaultSprite || 'idle';
    this.sprite = null;
    this.slashEffects = [];
    
    // Initialize attack sequence properties
    this.attackSequence = 0;
    this.attackFrame = 0;
    this.attackFrameTimer = 0;
    this.attackFrameDuration = 0.2;
    this.attackDamageDealt = false;
    this.chargeAttack = false;
    
    // Initialize movement properties
    this.isDashing = false;
    this.usePostDashSprite = false;
    this.jumpRequest = false;
    this.jumpStrength = -20;
    
    // Initialize special properties
    this.slamHoldPosition = false;
    
    // Initialize other properties
    this.controls = {};
    this.reset();
    
    // Set controls for player
    if (!this.isAI) {
      this.controls = {
        left: 'a',
        right: 'd',
        up: 'w',
        down: 's',
        attack: ' ',
        guard: 'f'
      };
    }
    
    // Load sprite if available
    if (this.character.sprite && this.spriteType !== 'atlas') {
      this.sprite = loadImage(this.character.sprite);
    }
    
    // Call character-specific initialization
    if (this.character.initializeCharacter) {
      this.character.initializeCharacter(this);
    }
  }
  
  reset() {
    this.state = 'idle';
    this.attackTimer = 0;
    this.attackDamage = 0;
    this.attackKnockback = 0;
    this.attackRange = 0;
    this.attackIgnoreParry = false;
    this.attackHitResolved = false;
    this.kbResist = 0.08;
    this.dashCharges = 3;
    this.staggerRecovery = 0;
    this.staggerRecoveryTimer = 0;
    this.staggerTimer = 0;
    this.staggerLength = 5;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboTimeout = 1.4;
    this.attackCounter = 0;
    this.attackCounterDisplay = 0;
    this.attackCounterTimer = 0;
    this.statuses = [];
    this.remainingSlide = 0;
    this.isDucking = false;
    this.isGuarding = false;
    this.isCountering = false;
    this.isEvading = false;
    this.evadeTimer = 0;
    this.chargeMeter = 0;
    this.strikeActive = false;
    this.pendingCounter = false;
    this.lastAttackHit = false;
    this.hitCooldown = 0;
    this.dashAttacked = false;
    this.evadeRequested = false;
    this.slamAttackRequested = false;
    this.isSlamAttacking = false;
    this.slamLandingHitbox = null;
    this.pendingSlamDamage = null;
    this.ai = {
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
    };
    
    // Reset state machine
    this.stateMachine = new IdleState();
  }
  
  update(dt, opponent) {
    // Update timers
    this.attackTimer = max(0, this.attackTimer - dt);
    this.evadeTimer = max(0, this.evadeTimer - dt);
    this.staggerTimer = max(0, this.staggerTimer - dt);
    this.staggerRecoveryTimer = max(0, this.staggerRecoveryTimer - dt);
    this.comboTimer = max(0, this.comboTimer - dt);
    this.attackCounterTimer = max(0, this.attackCounterTimer - dt);
    this.staggeredDisplayTimer = max(0, this.staggeredDisplayTimer - dt);
    this.hitCooldown = max(0, this.hitCooldown - dt);
    
    // Update combo system
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.attackCounter = 0;
    }
    
    // Update component systems
    this.stateMachine.update(dt, this);
    this.attackSystem.update(dt, this);
    this.movementSystem.update(dt, this);
    this.renderSystem.update(dt, this);
    
    // Call character-specific update
    if (this.character.onUpdate) {
      this.character.onUpdate(dt, opponent, this);
    }
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);

    if (this.spriteType === 'atlas' && this.currentSprite) {
      // Use sprite atlas system
      push();
      scale(this.facing === 1 ? -1 : 1, 1);
      
      const targetHeight = 144;
      const spriteInfo = SPRITES[this.currentSprite];
      if (spriteInfo) {
        const originalHeight = spriteInfo.h * CELL;
        const scaleFactor = targetHeight / originalHeight;
        drawSpriteScaled(this.currentSprite, 0, 36, scaleFactor);
      }
      pop();
    } else if (this.sprite && this.sprite.width > 0) {
      // Regular sprite loading
      push();
      scale(this.facing === 1 ? -1 : 1, 1);
      image(this.sprite, 0, 0);
      pop();
    } else {
      // Fallback: draw colored rectangle
      fill(this.color);
      rect(-20, -40, 40, 80);
    }
    pop();
    
    // Draw slash effects
    this.drawSlashEffects(0.016); // Assuming 60 FPS
  }
  
  // ==========================
  // 🎯 INPUT HANDLING
  // ==========================
  
  handleInput() {
    if (this.isAI) {
      return;
    }
    
    this.ai.moveLeft = keyIsDown(this.controls.left);
    this.ai.moveRight = keyIsDown(this.controls.right);
    this.ai.moveUp = keyIsDown(this.controls.up);
    this.ai.moveDown = keyIsDown(this.controls.down);
  }
  
  processKeyPressed(keyValue) {
    const keyLower = keyValue.toLowerCase();
    
    // Call character-specific input handling
    if (this.character.processKeyPressed) {
      this.character.processKeyPressed(keyLower, this);
    }
  }
  
  processKeyReleased(keyValue) {
    const keyLower = keyValue.toLowerCase();
    
    // Call character-specific input handling
    if (this.character.processKeyReleased) {
      this.character.processKeyReleased(keyLower, this);
    }
  }
  
  // ==========================
  // 🎯 STATE MANAGEMENT
  // ==========================
  
  transitionToState(newState) {
    this.stateMachine.transition(newState, this);
  }
  
  // ==========================
  // 🎯 COMBAT METHODS
  // ==========================
  
  executeAttack(attackType, ignoreParry = false) {
    this.attackSystem.executeAttack(attackType, this);
  }
  
  receiveHit(amount, attacker, knockback) {
    // Handle hit logic
    if (this.state === 'hit' || this.hitCooldown > 0) {
      return;
    }
    
    this.hp -= amount;
    const wasGuarding = this.isGuarding;
    
    // Apply hit effects
    this.state = 'hit';
    this.staggerTimer = 0.18;
    this.isGuarding = false;
    this.isCountering = false;
    this.isEvading = false;
    this.hitCooldown = 0.5;
    
    // Spawn damage number
    spawnDamageNumber(amount, this.pos.copy(), attacker.facing, false);
    
    // Apply knockback
    this.vel.x += attacker.facing * knockback;
    this.vel.y = -3;
  }
  
  // ==========================
  // 🎯 MOVEMENT METHODS
  // ==========================
  
  applyGravity() {
    this.vel.y += 0.8;
  }
  
  applyMovement() {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
  }
  
  jump() {
    if (this.onGround()) {
      this.vel.y = -20;
    }
  }
  
  onGround() {
    return this.pos.y >= this.spawnY;
  }
  
  // ==========================
  // 🎯 SPRITE METHODS
  // ==========================
  
  updateSprite() {
    if (this.spriteType !== 'atlas') return;

    const stateMap = {
      idle: 'idle',
      attack: 'prepat',
      hit: 'hurt',
      guard: 'guard',
      evade: 'evade',
      staggered: 'hurt'
    };

    // Handle special states
    if (this.isSlamAttacking) {
      this.currentSprite = 's4f4'; // Slam attack sprite
    } else if (this.isDashing) {
      if (this.state === 'attack') {
        this.currentSprite = 'joust'; // Dash attack sprite
      } else if (this.usePostDashSprite) {
        this.currentSprite = 's2f1'; // Post-dash attack sprite
      } else {
        this.currentSprite = 's2f1'; // Dash sprite
      }
    } else {
      this.currentSprite = stateMap[this.state] || 'idle';
    }
  }
  
  updateAttackSequence() {
    // Attack 1 sequence: prepat > s1f1 > s1f2 > s1f3
    if (this.attackSequence === 1) {
      const sequence = ['prepat', 's1f1', 's1f2', 's1f3'];
      const damageFrames = [false, true, true, false]; // s1f1 and s1f2 deal damage
      
      if (this.attackFrame < sequence.length) {
        this.currentSprite = sequence[this.attackFrame];
        
        // Spawn slash effects on specific frames
        if (this.attackFrame === 1) {
          this.spawnSlashEffect('s1s1', { x: 0, y: -20 });
          this.spawnSlashEffect('s1s2', { x: 20, y: 0 });
        }
        
        // Deal damage on damage frames
        if (damageFrames[this.attackFrame] && !this.attackDamageDealt) {
          this.dealAttackDamage();
          this.attackDamageDealt = true;
        }
      }
    }
    // Attack 2 sequence: s2f1 > halt1 > halt2 > s3f1
    else if (this.attackSequence === 2) {
      const sequence = ['s2f1', 'halt1', 'halt2', 's3f1'];
      const damageFrames = [true, false, false, false]; // s2f1 deals damage
      
      if (this.attackFrame < sequence.length) {
        this.currentSprite = sequence[this.attackFrame];
        
        // Spawn slash effects on specific frames
        if (this.attackFrame === 0) {
          this.spawnSlashEffect('s1s3', { x: 0, y: -20 });
        }
        
        // Deal damage on damage frames
        if (damageFrames[this.attackFrame] && !this.attackDamageDealt) {
          this.dealAttackDamage();
          this.attackDamageDealt = true;
        }
      }
    }
    // Attack 3 sequence: s3f1 > s3f2 > s3f3
    else if (this.attackSequence === 3) {
      const sequence = ['s3f1', 's3f2', 's3f3'];
      const damageFrames = [false, true, false]; // s3f2 deals damage
      const holdTimes = [0.2, 0.2, 0.5]; // s3f3 holds for 0.5s
      
      if (this.attackFrame < sequence.length) {
        this.currentSprite = sequence[this.attackFrame];
        
        // Spawn slash effects on specific frames
        if (this.attackFrame === 1) {
          this.spawnSlashEffect('s1s4', { x: 0, y: -20 });
        }
        
        // Use custom frame duration for s3f3
        if (this.attackFrame === 2) {
          this.attackFrameDuration = 0.5;
        } else {
          this.attackFrameDuration = 0.2;
        }
        
        // Deal damage on damage frames
        if (damageFrames[this.attackFrame] && !this.attackDamageDealt) {
          this.dealAttackDamage();
          this.attackDamageDealt = true;
        }
      }
    }
  }
  
  spawnSlashEffect(slashType, targetOffset = null) {
    // Spawn slash effect that shares character position and fades out
    const effect = {
      type: slashType,
      pos: this.pos.copy(),
      facing: this.facing,
      timer: 0.3,
      owner: this,
      targetOffset: targetOffset
    };
    
    console.log(`Slash spawned: ${slashType} at (${effect.pos.x}, ${effect.pos.y}) facing: ${effect.facing}`);
    this.slashEffects.push(effect);
  }
  
  dealAttackDamage() {
    // This method will be called to deal damage during attack sequences
    // The actual damage dealing will be handled in the update method
    this.strikeActive = true;
    this.attackHitResolved = false;
  }
  
  drawSlashEffects(dt) {
    // Draw all active slash effects
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      const effect = this.slashEffects[i];

      // Safety removal of invalid effects
      if (!effect || !effect.owner) {
        this.slashEffects.splice(i, 1);
        continue;
      }

      effect.timer -= dt; // Use actual dt for consistent timing
      if (effect.timer <= 0) {
        this.slashEffects.splice(i, 1);
        continue;
      }

      const spriteInfo = SPRITES?.[effect.type];
      if (!spriteInfo) continue; // Prevent crash for missing sprites

      push();

      const owner = effect.owner;
      let x = owner.pos.x + (effect.targetOffset?.x || 0);
      let y = owner.pos.y + (effect.targetOffset?.y || 0);

      // Apply facing to slash effect
      if (owner.facing === -1) {
        scale(-1, 1);
        x = x - (effect.targetOffset?.x || 0);
      }

      translate(x, y);
      
      // Draw sprite centered at origin after transform
      drawSpriteScaled(effect.type, 0, 0, 1.0, effect.timer); // Fade with timer
      
      pop();
    }
  }
  
  // ==========================
  // 🎯 COMBAT METHODS
  // ==========================
  
  requestAttack() {
    this.attackRequest = true;
  }
  
  releaseAttack() {
    this.attackRequest = false;
    this.attackRelease = true;
  }
  
  requestGuard() {
    this.guardRequest = true;
  }
  
  releaseGuard() {
    this.guardRequest = false;
  }
  
  executeAttack(opponent) {

    // Update attack counter for 3-hit combo
    this.attackCounter = min(3, this.attackCounter + 1);
    this.attackCounterDisplay = this.attackCounter;
    this.attackCounterTimer = 1.0; // Show for 1 second

    // Start attack sequence based on attack counter
    this.attackSequence = this.attackCounter;
    this.attackFrame = 0;
    this.attackFrameTimer = 0;
    this.attackDamageDealt = false;
    this.attackFrameDuration = 0.2;
    
    const attackType = this.chargeAttack ? 'heavy' : 'light';

    this.state = 'attack';
    this.attackTimer = this.attackInterval;
    this.attackIgnoreParry = ignoreParry;
    this.attackHitResolved = false;
    this.parryWindow = this.attackInterval;
    this.lastAttackHit = false;
  }
  
  // ==========================
  // 🎯 UTILITY METHODS
  // ==========================
  
  isDead() {
    return this.hp <= 0;
  }
}
