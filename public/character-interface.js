// ==========================
// 🎭 CHARACTER INTERFACE
// ==========================

/**
 * Interface for character-specific behavior and properties
 * Makes it easier to add new characters without modifying core Fighter class
 */
export class ICharacter {
  // Core character properties
  name = '';
  hp = 100;
  maxHp = 100;
  speed = 5;
  baseDamage = 10;
  attackInterval = 0.5;
  staggerThreshold = 20;
  staggerLength = 5;
  color = '#ffffff';
  spriteType = '';
  defaultSprite = '';
  
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
// 🎯 STATE MACHINE INTERFACE
// ==========================

/**
 * Interface for state management
 * Handles state transitions and current state tracking
 */
export class IState {
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

// ==========================
// ⚔️ ATTACK SYSTEM INTERFACE
// ==========================

/**
 * Interface for attack management
 * Handles attack execution, timing, and damage calculations
 */
export class IAttackSystem {
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
export class IAttackData {
  constructor() {
    this.damage = 0;
    this.range = 0;
    this.knockback = 0;
    this.hitTime = 0;
    this.duration = 0;
  }
}

// ==========================
// 🏃 MOVEMENT SYSTEM INTERFACE
// ==========================

/**
 * Interface for movement and physics
 * Handles position, velocity, and collision
 */
export class IMovementSystem {
  constructor() {
    // Initialize movement system
  }
  
  update(dt, context) {
    // Override in subclasses
  }
}

// ==========================
// 🎨 RENDER SYSTEM INTERFACE
// ==========================

/**
 * Interface for rendering and visual effects
 * Handles drawing, effects, and visual feedback
 */
export class IRenderSystem {
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
