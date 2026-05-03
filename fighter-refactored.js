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
    
    // Initialize other properties
    this.controls = {};
    this.reset();
    
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
    this.staggerTimer = max(0, this.staggerTimer - dt);
    this.staggerRecoveryTimer = max(0, this.staggerRecoveryTimer - dt);
    this.comboTimer = max(0, this.comboTimer - dt);
    this.attackCounterTimer = max(0, this.attackCounterTimer - dt);
    this.staggeredDisplayTimer = max(0, this.staggeredDisplayTimer - dt);
    this.hitCooldown = max(0, this.hitCooldown - dt);
    this.parryTimer = max(0, this.parryTimer - dt);
    this.parryStunTimer = max(0, this.parryStunTimer - dt);
    
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
    // Draw using render system
    this.renderSystem.draw(this);
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
  // 🎯 UTILITY METHODS
  // ==========================
  
  isDead() {
    return this.hp <= 0;
  }
}
