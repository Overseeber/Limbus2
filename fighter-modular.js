// ==========================
// 🎭 MODULAR FIGHTER SYSTEM
// ==========================
// Self-contained modular fighter class for p5.js compatibility

// ==========================
// 🎭 CHARACTER INTERFACE
// ==========================

/**
 * Interface for character-specific behavior and properties
 * Makes it easier to add new characters without modifying core Fighter class
 */
class ICharacter {
  constructor() {
    // Core character properties
    this.name = '';
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 5;
    this.baseDamage = 10;
    this.attackInterval = 0.5;
    this.staggerThreshold = 20;
    this.staggerLength = 5;
    this.color = '#ffffff';
    this.spriteType = '';
    this.defaultSprite = '';
  }
  
  // Character-specific initialization
  initializeCharacter(fighter) {
    // Override in subclasses
  }
  
  // Character-specific input handling
  processKeyPressed(key, fighter) {
    // Override in subclasses
  }
}

// ==========================
// 🎯 STATE MACHINE
// ==========================

/**
 * Interface for state management
 * Handles state transitions and current state tracking
 */
class IState {
  constructor() {
    this.currentState = '';
    this.states = new Map();
  }
  
  transition(newState, context) {
    // Override in subclasses
  }
  
  update(dt, context) {
    // Override in subclasses
  }
}

// Base state class with common state behavior
class BaseState extends IState {
  constructor(name) {
    super();
    this.name = name;
  }
  
  enter(context) {
    // Override in subclasses
  }
  
  update(dt, context) {
    // Override in subclasses
  }
  
  exit(context) {
    // Override in subclasses
  }
  
  transition(newState, context) {
    // Default transition logic
    console.log(`State transition: ${this.currentState} -> ${newState}`);
  }
}

// State implementations
class IdleState extends BaseState {
  constructor() {
    super('idle');
  }
  
  enter(context) {
    // Idle setup
  }
  
  update(dt, context) {
    // Idle logic
  }
  
  exit(context) {
    // Idle cleanup
  }
}

class AttackState extends BaseState {
  constructor() {
    super('attack');
  }
  
  enter(context) {
    // Attack setup
  }
  
  update(dt, context) {
    // Attack logic
  }
  
  exit(context) {
    // Attack cleanup
  }
}

class HurtState extends BaseState {
  constructor() {
    super('hurt');
  }
  
  enter(context) {
    // Hurt setup
  }
  
  update(dt, context) {
    // Hurt logic
  }
  
  exit(context) {
    // Hurt cleanup
  }
}

class GuardState extends BaseState {
  constructor() {
    super('guard');
  }
  
  enter(context) {
    // Guard setup
  }
  
  update(dt, context) {
    // Guard logic
  }
  
  exit(context) {
    // Guard cleanup
  }
}

class EvadeState extends BaseState {
  constructor() {
    super('evade');
  }
  
  enter(context) {
    // Evade setup
  }
  
  update(dt, context) {
    // Evade logic
  }
  
  exit(context) {
    // Evade cleanup
  }
}

class StaggeredState extends BaseState {
  constructor() {
    super('staggered');
  }
  
  enter(context) {
    // Staggered setup
  }
  
  update(dt, context) {
    // Staggered logic
  }
  
  exit(context) {
    // Staggered cleanup
  }
}

// ==========================
// ⚔️ ATTACK SYSTEM
// ==========================

/**
 * Interface for attack management
 * Handles attack execution, timing, and damage calculations
 */
class IAttackSystem {
  constructor() {
    // Initialize attack system
  }
  
  executeAttack(attackType, context) {
    // Override in subclasses
  }
  
  update(dt, context) {
    // Override in subclasses
  }
  
  getAttackData(attackType) {
    // Override in subclasses
    return { damage: 10, range: 70, knockback: 5, hitTime: 0.2, duration: 0.4 };
  }
}

/**
 * Attack data structure
 */
class IAttackData {
  constructor() {
    this.damage = 0;
    this.range = 0;
    this.knockback = 0;
    this.hitTime = 0;
    this.duration = 0;
  }
}

// Basic attack system implementation
class BasicAttackSystem extends IAttackSystem {
  constructor() {
    super();
  }
  
  executeAttack(attackType, context) {
    // Delegate to the fighter's executeAttack method for compatibility
    if (context.executeAttack) {
      context.executeAttack(context, false);
    }
  }
  
  update(dt, context) {
    // Update attack frame timers
    if (context.attackFrameTimer > 0) {
      context.attackFrameTimer -= dt;
      
      if (context.attackFrameTimer <= 0) {
        // Move to next frame
        context.attackFrame++;
        
        // Update attack sequence
        if (context.updateAttackSequence) {
          context.updateAttackSequence();
        }
        
        // Reset frame timer
        context.attackFrameTimer = context.attackFrameDuration;
        
        // Check if attack sequence is complete
        if (context.attackFrame >= 4) {
          context.state = 'idle';
          context.attackFrame = 0;
        }
      }
    }
    
    // Update sprite based on attack state
    if (context.updateSprite) {
      context.updateSprite();
    }
  }
  
  getAttackData(attackType) {
    // Default attack data
    return {
      damage: 10,
      range: 70,
      knockback: 5,
      hitTime: 0.2,
      duration: 0.4
    };
  }
}

// Combo attack system implementation
class ComboAttackSystem extends IAttackSystem {
  constructor() {
    super();
  }
  
  executeAttack(attackType, context) {
    // Combo attack execution
    console.log(`Executing combo attack: ${attackType}`);
  }
  
  update(dt, context) {
    // Combo attack update logic
  }
  
  getAttackData(attackType) {
    // Combo attack data based on attack type
    const comboData = {
      light: { damage: 8, range: 60, knockback: 3, hitTime: 0.15, duration: 0.3 },
      heavy: { damage: 15, range: 80, knockback: 8, hitTime: 0.25, duration: 0.5 },
      special: { damage: 20, range: 100, knockback: 12, hitTime: 0.3, duration: 0.6 }
    };
    
    return comboData[attackType] || comboData.light;
  }
}

// ==========================
// 🏃 MOVEMENT SYSTEM
// ==========================

/**
 * Interface for movement and physics
 * Handles position, velocity, and collision
 */
class IMovementSystem {
  constructor() {
    // Initialize movement system
  }
  
  update(dt, context) {
    // Override in subclasses
  }
}

// Basic movement system implementation
class BasicMovementSystem extends IMovementSystem {
  constructor() {
    super();
  }
  
  update(dt, context) {
    // Basic movement logic
    // Apply gravity, handle input, update position
    if (context.applyGravity) {
      context.applyGravity();
    }
    if (context.applyMovement) {
      context.applyMovement();
    }
  }
}

// Physics movement system implementation
class PhysicsMovementSystem extends IMovementSystem {
  constructor() {
    super();
  }
  
  update(dt, context) {
    // Physics-based movement with gravity, friction, etc.
  }
}

// ==========================
// 🎨 RENDER SYSTEM
// ==========================

/**
 * Interface for rendering and visual effects
 * Handles drawing, effects, and visual feedback
 */
class IRenderSystem {
  constructor() {
    // Initialize render system
  }
  
  update(dt, context) {
    // Override in subclasses
  }
  
  draw(context) {
    // Override in subclasses
  }
}

// Basic render system implementation
class BasicRenderSystem extends IRenderSystem {
  constructor() {
    super();
  }
  
  update(dt, context) {
    // Basic render update logic
  }
  
  draw(context) {
    // Basic drawing logic
    if (context.draw) {
      context.draw();
    }
  }
}

// Effects render system implementation
class EffectsRenderSystem extends IRenderSystem {
  constructor() {
    super();
  }
  
  update(dt, context) {
    // Effects update logic
  }
  
  draw(context) {
    // Effects drawing logic
  }
}

// Sprite render system implementation
class SpriteRenderSystem extends IRenderSystem {
  constructor() {
    super();
  }
  
  update(dt, context) {
    // Sprite update logic
  }
  
  draw(context) {
    // Sprite drawing logic
  }
}

// ==========================
// 🎭 MODULAR FIGHTER CLASS
// ==========================

/**
 * Modular Fighter class with component-based architecture
 * Makes it easy to add new characters and modify existing ones
 */
class Fighter {
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
    const fallbackCharacter = (typeof currentCharacter !== 'undefined' ? currentCharacter : 'JOHN');
    this.characterKey = characterKey || (isAI ? 'JOHN' : fallbackCharacter);
    
    // Get character from roster
    const characterData = CHARACTERS[this.characterKey];
    if (!characterData) {
      console.error("Invalid characterKey:", this.characterKey);
      this.characterKey = 'JOHN';
      characterData = CHARACTERS[this.characterKey];
    }
    
    this.character = characterData;
    
    // Initialize position and physics
    this.pos = createVector(width / 2 + (isAI ? 200 : -200), height - 150);
    this.vel = createVector(0, 0);
    this.facing = isAI ? -1 : 1;
    this.spawnY = height - 150;
    
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
    this.staggeredDisplay = 0;
    this.staggeredDisplayTimer = 0;
    this.statuses = [];
    this.remainingSlide = 0;
    this.isDucking = false;
    this.isGuarding = false;
    this.isCountering = false;
    this.isEvading = false;
    this.evadeTimer = 0;
    this.chargeMeter = 0;
    this.parryWindow = 0;
    this.strikeActive = false;
    this.pendingCounter = false;
    this.lastAttackHit = false;
    this.hitCooldown = 0;
    this.parryIndicator = 0;
    this.dashAttacked = false;
    this.evadeRequested = false;
    this.parryCount = 3;
    this.parryTimer = 0;
    this.parryStunTimer = 0;
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
    this.parryWindow = max(0, this.parryWindow - dt);
    this.parryIndicator = max(0, this.parryIndicator - dt);
    this.parryTimer = max(0, this.parryTimer - dt);
    this.parryStunTimer = max(0, this.parryStunTimer - dt);
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

    // Reset attack counter after 3 hits or timeout
    if (this.attackCounter >= 3) {
      this.attackCounter = 0; // Reset after completing 3-hit combo
    }

    if (this.parryTimer <= 0 && this.parryCount < 3) {
      this.parryCount += 1;
      this.parryTimer = 10;
    }

    // Handle attack state and sequences
    if (this.state === 'attack') {
      // Handle attack sequence frame timing
      if (this.attackSequence > 0) {
        this.attackFrameTimer += dt;
        
        if (this.attackFrameTimer >= this.attackFrameDuration) {
          this.attackFrameTimer = 0;
          this.attackFrame++;
          this.attackDamageDealt = false; // Reset damage flag for next frame
          
          // Update attack sequence
          this.updateAttackSequence();
          
          // Check if sequence is complete
          if (this.attackSequence === 1 && this.attackFrame >= 4) { // Attack 1: 4 frames
            this.state = 'idle';
            this.strikeActive = false;
            this.attackSequence = 0;
          } else if (this.attackSequence === 2 && this.attackFrame >= 4) { // Attack 2: 4 frames
            this.state = 'idle';
            this.strikeActive = false;
            this.attackSequence = 0;
          } else if (this.attackSequence === 3 && this.attackFrame >= 3) { // Attack 3: 3 frames
            this.state = 'idle';
            this.strikeActive = false;
            this.attackSequence = 0;
          }
        }
      }
      
      // Handle attack timer expiration for non-sequence attacks
      if (this.state === 'attack' && this.attackTimer <= 0) {
        if (!this.attackHitResolved) {
          this.resolveAttack(opponent);
        }
        // Add 1 second delay before allowing idle state transition
        this.attackTimer = 1.0; // Prevent immediate transition to idle
        this.state = 'idle';
        this.strikeActive = false;
      }
    }

    // Handle staggered state
    if (this.state === 'staggered') {
      if (this.staggerTimer > 0) {
        // During stagger phase, bar lowers from max to 0 over stagger duration
        // Note: this.stagger would be calculated here if needed
      } else if (this.staggerRecoveryTimer > 0) {
        // During recovery phase, bar stays at 0
      } else {
        // Start recovery timer when stagger timer ends
        if (this.staggerTimer <= 0 && this.staggerRecoveryTimer <= 0) {
          this.staggerRecoveryTimer = this.staggerLength; // 5 seconds recovery
        } else {
          // Full recovery - automatically exit staggered state
          this.state = 'idle';
        }
      }
    }

    // Handle parry states
    if ((this.state === 'parry' || this.state === 'parried') && this.parryStunTimer <= 0) {
      this.state = 'idle';
    }

    // Handle evade state
    if (this.isEvading && this.evadeTimer <= 0) {
      this.isEvading = false;
      this.state = 'idle';
    }

    // Deal damage during attack sequences when strike is active
    if (this.strikeActive && this.attackSequence > 0 && !this.attackHitResolved) {
      this.resolveAttack(opponent);
    }

    // Update slash effects
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      const effect = this.slashEffects[i];
      effect.timer -= dt;
      
      if (effect.timer <= 0) {
        this.slashEffects.splice(i, 1);
      }
    }

    // Handle AI
    if (this.isAI) {
      this.updateAIControls(opponent);
    }

    // Update sprite based on current state (after AI and input processing)
    this.updateSprite();

    // Handle parry checking
    if (this.isGuarding && this.parryCount > 0 && opponent.strikeActive && opponent.parryWindow > 0 && abs(this.pos.x - opponent.pos.x) < opponent.attackRange + 200) {
      this.checkParry(opponent, opponent.attackRange);
    }

    // Apply physics and movement
    this.applyMovement(dt, opponent);
    this.applyGravity(dt, opponent);
    
    // Keep fighter in bounds
    this.cleanupPosition(opponent);

    // Update component systems
    this.stateMachine.update(dt, this);
    this.attackSystem.update(dt, this);
    this.movementSystem.update(dt, this);
    this.renderSystem.update(dt, this);
    
    // Process input actions
    this.processActions(opponent, dt);
    
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
        // Ensure sprite is properly positioned and scaled
        drawSpriteScaled(this.currentSprite, 0, 36, scaleFactor);
      }
      pop();
    } else if (this.sprite && this.sprite.width > 0) {
      // Regular sprite loading with proper scaling
      push();
      scale(this.facing === 1 ? -1 : 1, 1);
      // Scale sprite to appropriate size
      const targetWidth = 80;
      const targetHeight = 144;
      const scaleFactor = min(targetWidth / this.sprite.width, targetHeight / this.sprite.height);
      image(this.sprite, 0, 0, this.sprite.width * scaleFactor, this.sprite.height * scaleFactor);
      pop();
    } else {
      // Fallback: draw colored rectangle with proper size
      fill(this.color);
      rect(-30, -72, 60, 144);
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
    
    // Update AI movement flags based on key states
    this.ai.moveLeft = keyIsDown(this.controls.left.toUpperCase().charCodeAt(0));
    this.ai.moveRight = keyIsDown(this.controls.right.toUpperCase().charCodeAt(0));
    this.ai.moveUp = keyIsDown(this.controls.up.toUpperCase().charCodeAt(0));
    this.ai.moveDown = keyIsDown(this.controls.down.toUpperCase().charCodeAt(0));
  }
  
  updateAI(opponent) {
    this.updateAIControls(opponent);
  }
  
  updateAIControls(opponent) {
    // Don't act if enemy is in actual stagger phase (but allow movement during recovery)
    if (this.state === 'staggered' && this.staggerTimer > 0) {
      this.ai.moveLeft = false;
      this.ai.moveRight = false;
      this.ai.moveUp = false;
      this.ai.moveDown = false;
      this.ai.attack = false;
      this.ai.defend = false;
      return;
    }
    
    const distance = opponent.pos.x - this.pos.x;
    const absDistance = abs(distance);
    
    // Basic movement
    this.ai.moveLeft = distance < -80;
    this.ai.moveRight = distance > 80;
    this.ai.moveUp = random() < 0.003 && absDistance < 220;
    this.ai.moveDown = false;
    
    // Check if opponent is about to attack (strikeActive with parryWindow)
    const opponentAttacking = opponent.strikeActive && opponent.parryWindow > 0;
    const opponentInRange = absDistance < 150;
    
    // Block when opponent is in attack range
    if (opponentInRange && this.parryCount > 0) {
      this.ai.defend = random() < 0.03;
    } else {
      this.ai.defend = false;
    }
    
    // Dash attack when in close range
    if (absDistance < 100 && this.dashCharges > 0 && this.attackTimer <= 0 && random() < 0.01) {
      // Note: startDash method would need to be implemented
      // this.startDash();
    }
    
    // Regular attack when in range and not on cooldown and opponent is not staggered
    // Attack regardless of whether opponent is in front or behind
    const shouldAttack = absDistance < 120 && this.attackTimer <= 0 && !opponentAttacking && opponent.state !== 'staggered';
    
    if (shouldAttack && random() < 0.02) { // Add some randomness to make it less aggressive
      // Turn to face opponent before attacking
      this.facing = distance > 0 ? 1 : -1;
      this.requestAttack();
      this.releaseAttack(false);
    }
    
    if (this.ai.defend) {
      this.requestGuard(opponent);
    } else {
      this.releaseGuard();
    }
  }
  
  processKeyPressed(keyValue) {
    const keyLower = keyValue.toLowerCase();
    
    // Release slam hold position on any input
    if (this.slamHoldPosition) {
      this.slamHoldPosition = false;
      this.isSlamAttacking = false;
      this.state = 'idle';
    }
    
    if (keyLower === this.controls.up) {
      this.jumpRequest = true;
    }
    if (keyLower === this.controls.down) {
      this.isDucking = true;
    }
    if (keyLower === this.controls.attack) {
      this.requestAttack();
    }
    if (keyLower === this.controls.guard) {
      this.requestGuard();
    }
    
    // Call character-specific input handling
    if (this.character.processKeyPressed) {
      this.character.processKeyPressed(keyLower, this);
    }
  }
  
  processKeyReleased(keyValue) {
    const keyLower = keyValue.toLowerCase();
    if (keyLower === this.controls.down) {
      this.isDucking = false;
    }
    if (keyLower === this.controls.attack) {
      this.releaseAttack();
    }
    if (keyLower === this.controls.guard) {
      this.releaseGuard();
    }
    
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
  // 🎯 SPRITE METHODS
  // ==========================
  
  updateSprite() {
    if (this.spriteType !== 'atlas') return;

    const stateMap = {
      idle: 'idle',
      run: 'moving',
      jump: 's4f3',
      attack: 'prepat',
      guard: 'guard',
      evade: 'evade',
      hit: 'hurt',
      staggered: 'hurt',
      duck: 'idle'
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
        this.currentSprite = 'moving'; // Regular dash movement sprite
      }
    } else if (this.state === 'attack' && this.attackSequence > 0) {
      // Handle attack sequences
      this.updateAttackSequence();
    } else if (this.state === 'jump' || !this.onGround()) {
      this.currentSprite = 's4f3'; // Jump sprite
    } else if (this.state === 'idle' && (this.ai.moveLeft || this.ai.moveRight)) {
      this.currentSprite = 'moving'; // Moving sprite when idle but moving
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
      timer: 0.15, // Shorter duration for smaller effects
      owner: this,
      targetOffset: targetOffset
    };
    
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
  
  executeAttack(opponent, ignoreParry = false) {
    // If attacker has no parry count, interrupt their attack
    if (!ignoreParry && this.parryCount <= 0) {
      this.state = 'idle';
      this.strikeActive = false;
      return;
    }

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
  
  applyGravity(dt, opponent) {
    this.vel.y += 0.8;
  }
  
  applyMovement(dt, opponent) {
    if (
      this.state === 'hit' ||
      this.state === 'parry' ||
      this.state === 'parried' ||
      (this.state === 'staggered' && this.staggerTimer > 0) ||
      this.parryStunTimer > 0
    ) {
      return;
    }
    
    // Apply horizontal movement
    if (this.ai.moveLeft) {
      this.vel.x = -this.speed;
    } else if (this.ai.moveRight) {
      this.vel.x = this.speed;
    } else {
      this.vel.x *= 0.8; // Friction
    }
    
    // Apply vertical movement
    if (this.ai.moveUp && this.onGround()) {
      this.vel.y = this.jumpStrength;
      this.state = 'jump'; // Set jump state for proper sprite
    }
    
    // Update position
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
  }
  
  cleanupPosition(opponent) {
    // Keep fighter in bounds
    this.pos.x = constrain(this.pos.x, 50, width - 50);
    
    // Ground collision
    if (this.pos.y > this.spawnY) {
      this.pos.y = this.spawnY;
      this.vel.y = 0;
      // Return to idle when landing from jump
      if (this.state === 'jump') {
        this.state = 'idle';
      }
    }
    
    // Prevent fighters from overlapping
    const minDistance = 60;
    const distance = this.pos.x - opponent.pos.x;
    if (abs(distance) < minDistance) {
      const pushDirection = distance > 0 ? 1 : -1;
      this.pos.x += pushDirection * (minDistance - abs(distance)) * 0.5;
    }
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
  // 🎯 COMBAT HELPER METHODS
  // ==========================
  
  processActions(opponent, dt) {
    // Only block actions during actual stagger phase, not recovery phase
    if (this.state === 'staggered' && this.staggerTimer > 0) {
      return;
    }

    if (this.evadeRequested) {
      this.startEvade(opponent);
      this.evadeRequested = false;
    }

    if (this.slamAttackRequested && !this.onGround() && !this.isSlamAttacking) {
      this.executeSlamAttack(opponent);
      this.slamAttackRequested = false;
    }

    if (this.attackRelease) {
      if (!this.isEvading && this.state !== 'attack' && !this.isSlamAttacking) {
        this.executeAttack(opponent);
      }
      this.attackRequest = false;
      this.attackRelease = false;
    }

    if (this.isGuarding && this.state !== 'staggered') {
      this.state = 'guard';
      if (this.ai.defend && random() < 0.02) {
        this.isCountering = true;
      }
    }
    
    // Cancel guard when attack is requested
    if (this.attackRequest && this.isGuarding) {
      this.releaseGuard();
    }

    if (this.strikeActive && this.parryWindow <= 0) {
      this.strikeActive = false;
    }
  }
  
  resolveAttack(opponent) {
    if (!this.attackHitResolved && this.strikeActive) {
      // Check if opponent is in range
      const distance = abs(this.pos.x - opponent.pos.x);
      if (distance < this.attackRange) {
        // Deal damage
        opponent.receiveHit(this.baseDamage, this, this.attackKnockback);
        this.attackHitResolved = true;
        this.lastAttackHit = true;
      }
    }
  }
  
  checkParry(opponent, attackRange) {
    if (this.isGuarding && this.parryCount > 0) {
      // Successful parry
      this.state = 'parry';
      this.parryCount--;
      this.parryStunTimer = 0.5;
      opponent.state = 'parried';
      opponent.parryStunTimer = 0.8;
      
      // Knockback both fighters
      opponent.vel.x = opponent.facing * -10;
      this.vel.x = this.facing * 5;
    }
  }
  
  startEvade(opponent) {
    if (this.evadeTimer <= 0 && this.state !== 'evade') {
      this.state = 'evade';
      this.isEvading = true;
      this.evadeTimer = 0.5;
      
      // Evade dash
      this.vel.x = this.facing * 15;
      this.vel.y = -5;
    }
  }
  
  executeSlamAttack(opponent) {
    this.isSlamAttacking = true;
    this.state = 'attack';
    this.attackTimer = 0.8;
    this.vel.y = 20; // Fall down fast
  }
  
  // ==========================
  // 🎯 UTILITY METHODS
  // ==========================
  
  isDead() {
    return this.hp <= 0;
  }
}
