// Character System - Parent class and subclasses for easy character switching

class BaseFighter {
  constructor(isAI = false, name = 'Enemy', characterKey = null) {
    this.isAI = isAI;
    this.name = name;
    this.characterKey = characterKey || (isAI ? 'JOHN' : 'JOHN');
    
    // Get character stats from roster
    let character = CHARACTERS[this.characterKey];
    
    // Safety check in case character is not found
    if (!character) {
      console.error("Invalid characterKey:", this.characterKey);
      this.characterKey = 'JOHN';
      character = CHARACTERS[this.characterKey];
    }
    
    // Core properties
    this.pos = createVector(width / 2 + (isAI ? 200 : -200), height - 100);
    this.vel = createVector(0, 0);
    this.facing = isAI ? -1 : 1;
    this.spawnY = height - 100;
    
    // Combat stats from character roster
    this.hp = character.hp;
    this.maxHp = character.hp;
    this.speed = character.speed;
    this.baseDamage = character.baseDamage;
    this.attackInterval = character.attackInterval;
    this.staggerThreshold = character.staggerThreshold;
    this.staggerLength = character.staggerLength;
    this.color = character.color;
    this.weapon = character.weapon;
    this.sprite = character.sprite;
    
    // Combat state
    this.strikeActive = false;
    this.attackHitResolved = false;
    this.hitCooldown = 0;
    this.staggerTimer = 0;
    this.isStaggered = false;
    this.isGuarding = false;
    this.isCountering = false;
    this.isEvading = false;
    this.evadeTimer = 0;
    this.isDashing = false;
    this.dashCooldown = 0;
    this.isSlamAttacking = false;
    this.slamHoldPosition = false;
    this.slamAttackRequested = false;
    this.usePostDashSprite = false;
    this.attackRequest = false;
    this.attackRelease = false;
    this.chargeAttack = false;
    this.guardRequest = false;
    this.evadeRequested = false;
    this.jumpRequest = false;
    this.duckRequest = false;
    this.onGround = false;
    this.attackRange = 80;
    this.combo = 0;
    this.ultimateActive = false;
    this.ultimateTimer = 0;
    this.ultimateCanActivate = true;
    this.ultimateActivationRequested = false;
    this.ultimatePhase = 0;
    this.ultimateTotalDamage = 0;
    this.ultimateDamageDealt = 0;
    
    // Animation and sprite state
    this.currentSprite = 'idle';
    this.spriteFrame = 0;
    this.spriteTimer = 0;
    this.spriteType = character.spriteType || 'atlas';
    this.slashEffects = [];
    this.slashEffectsSpawned = false;
    
    // Attack system
    this.attackSequence = 0;
    this.attackFrame = 0;
    this.attackFrameTimer = 0;
    this.attackFrameDuration = 0.2;
    this.attackDamageDealt = false;
    this.haltSequence = false;
    this.haltFrame = 0;
    this.haltFrameTimer = 0;
    this.haltFrameDuration = 0.1;
    
    // Visual effects
    this.spriteShake = 0;
    this.state = 'idle';
    
    // Character-specific overrides
    this.applyCharacterTraits();
  }
  
  // Override this method in subclasses for character-specific traits
  applyCharacterTraits() {
    // Subclasses will override this method
  }
  
  // Character switching
  switchCharacter(characterKey) {
    this.characterKey = characterKey;
    const character = CHARACTERS[characterKey];
    
    if (character) {
      // Update core stats
      this.hp = character.hp;
      this.maxHp = character.hp;
      this.speed = character.speed;
      this.baseDamage = character.baseDamage;
      this.attackInterval = character.attackInterval;
      this.staggerThreshold = character.staggerThreshold;
      this.staggerLength = character.staggerLength;
      this.color = character.color;
      this.weapon = character.weapon;
      this.sprite = character.sprite;
      this.spriteType = character.spriteType || 'atlas';
      
      // Apply character-specific traits
      this.applyCharacterTraits();
      
      // Reset combat state
      this.resetCombatState();
      
      console.log(`Switched to ${character.name}`);
    }
  }
  
  resetCombatState() {
    this.strikeActive = false;
    this.attackHitResolved = false;
    this.hitCooldown = 0;
    this.staggerTimer = 0;
    this.isStaggered = false;
    this.isGuarding = false;
    this.isCountering = false;
    this.isEvading = false;
    this.evadeTimer = 0;
    this.isDashing = false;
    this.dashCooldown = 0;
    this.isSlamAttacking = false;
    this.slamHoldPosition = false;
    this.slamAttackRequested = false;
    this.usePostDashSprite = false;
    this.attackRequest = false;
    this.attackRelease = false;
    this.chargeAttack = false;
    this.guardRequest = false;
    this.evadeRequested = false;
    this.jumpRequest = false;
    this.duckRequest = false;
    this.combo = 0;
    this.ultimateActive = false;
    this.ultimateTimer = 0;
    this.ultimateCanActivate = true;
    this.ultimateActivationRequested = false;
    this.ultimatePhase = 0;
    this.ultimateTotalDamage = 0;
    this.ultimateDamageDealt = 0;
    this.attackSequence = 0;
    this.attackFrame = 0;
    this.attackFrameTimer = 0;
    this.attackDamageDealt = false;
    this.haltSequence = false;
    this.haltFrame = 0;
    this.haltFrameTimer = 0;
    this.slashEffects = [];
    this.slashEffectsSpawned = false;
    this.spriteShake = 0;
    this.state = 'idle';
  }
}

// Valencina character class
class Valencina extends BaseFighter {
  applyCharacterTraits() {
    // Valencina-specific traits
    this.color = '#4a90e2';
    this.weapon = 'bus';
    this.baseDamage = 18; // Slightly higher damage
    this.speed = 8.0; // Slightly faster
    this.ultimateCanActivate = true;
  }
}

// John character class  
class John extends BaseFighter {
  applyCharacterTraits() {
    // John-specific traits
    this.color = '#3498db';
    this.weapon = 'fist';
    this.baseDamage = 15; // Standard damage
    this.speed = 7.5; // Standard speed
    this.ultimateCanActivate = true;
  }
}

// Character switching manager
class CharacterManager {
  constructor() {
    this.currentCharacter = 'JOHN';
    this.availableCharacters = ['JOHN', 'VALENCINA'];
  }
  
  switchTo(characterKey) {
    if (this.availableCharacters.includes(characterKey)) {
      this.currentCharacter = characterKey;
      return true;
    }
    return false;
  }
  
  getCurrentCharacter() {
    return this.currentCharacter;
  }
  
  getNextCharacter() {
    const currentIndex = this.availableCharacters.indexOf(this.currentCharacter);
    const nextIndex = (currentIndex + 1) % this.availableCharacters.length;
    return this.availableCharacters[nextIndex];
  }
  
  getPreviousCharacter() {
    const currentIndex = this.availableCharacters.indexOf(this.currentCharacter);
    const prevIndex = (currentIndex - 1 + this.availableCharacters.length) % this.availableCharacters.length;
    return this.availableCharacters[prevIndex];
  }
}

// Quick character switching function
function switchCharacterQuick(direction = 'next') {
  const manager = new CharacterManager();
  
  if (direction === 'next') {
    const nextChar = manager.getNextCharacter();
    manager.switchTo(nextChar);
  } else if (direction === 'prev') {
    const prevChar = manager.getPreviousCharacter();
    manager.switchTo(prevChar);
  }
  
  return manager.getCurrentCharacter();
}
