// ==========================
// 🎭 STATE MACHINE
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
// 🎯 STATE IMPLEMENTATIONS
// ==========================

/**
 * Base state class with common state behavior
 */
export class BaseState extends IState {
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

// ==========================
// 🎭 IDLE STATE
// ==========================

export class IdleState extends BaseState {
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

// ==========================
// 🎭 ATTACK STATE
// ==========================

export class AttackState extends BaseState {
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

// ==========================
// 🎭 HURT STATE
// ==========================

export class HurtState extends BaseState {
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

// ==========================
// 🎭 GUARD STATE
// ==========================

export class GuardState extends BaseState {
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

// ==========================
// 🎭 EVAD ESTATE
// ==========================

export class EvadeState extends BaseState {
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

// ==========================
// 🎭 STAGGERED STATE
// ==========================

export class StaggeredState extends BaseState {
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
