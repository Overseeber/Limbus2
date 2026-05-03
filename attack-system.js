// ==========================
// ⚔️ ATTACK SYSTEM
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
// BASIC ATTACK SYSTEM
// ==========================

export class BasicAttackSystem extends IAttackSystem {
  constructor() {
    super();
  }
  
  executeAttack(attackType, context) {
    // Default attack execution
    console.log(`Executing attack: ${attackType}`);
  }
  
  update(dt, context) {
    // Default attack update logic
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

// ==========================
// COMBO ATTACK SYSTEM
// ==========================

export class ComboAttackSystem extends IAttackSystem {
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
