/**
 * ============================================================================
 * FIGHTER CLASS - Core combat entity for the fighting game
 * ============================================================================
 * 
 * The Fighter class represents a combat character in the game. Each fighter can
 * be controlled by AI or a human player, has unique stats based on their character
 * type, and handles all combat mechanics including movement, attacks, damage,
 * status effects, and defeat conditions.
 * 
 * Key Features:
 * - Multi-player support (2-4 fighters in battle)
 * - AI and human player control
 * - Character-specific stats and abilities
 * - Comprehensive combat system (attacks, guards, evades, ultimates)
 * - Status effects and damage system
 * - Defeat and respawn mechanics
 * 
 * @param {boolean} isAI - Whether this fighter is AI-controlled (default: false)
 * @param {string} name - Display name for this fighter (default: 'Enemy')
 * @param {string} characterKey - Character type from CHARACTERS roster (default: null)
 * @param {boolean} isPlayerControlled - Whether this fighter is human-controlled (default: false)
 */
const SLAM_ATTACK_RADIUS = 80;

class Fighter {
  constructor(isAI = false, name = 'Enemy', characterKey = null, isPlayerControlled = false) {
    // CORE IDENTITY PROPERTIES
    this.isAI = isAI;                    // AI vs Human control flag
    this.name = name;                     // Display name for UI
    this.isPlayerControlled = isPlayerControlled; // Human control flag
    this.clientId = null;                 // Network client id for room-player mapping
    this.isLocalPlayer = false;           // Whether this fighter belongs to this client
    this.remoteInput = {                  // Remote input state for non-local player control
      left: false,
      right: false,
      up: false,
      down: false
    };
    
    // CHARACTER SELECTION WITH FALLBACK
    // Safely select character with fallback to prevent errors
    const fallbackCharacter = (typeof currentCharacter !== 'undefined' ? currentCharacter : 'VALENCINA');
    this.characterKey = characterKey || (isAI ? 'VALENCINA' : fallbackCharacter);
    
    // CHARACTER DATA RETRIEVAL
    // Get character stats from the global CHARACTERS roster
    let character = CHARACTERS[this.characterKey];
    
    // SAFETY CHECK: Ensure character exists
    // Prevents crashes if invalid characterKey is provided
    if (!character) {
      console.error("Invalid characterKey:", this.characterKey);
      this.characterKey = 'VALENCINA'; // Fallback to default character
      character = CHARACTERS[this.characterKey];
    }
    
    // POSITION AND MOVEMENT PROPERTIES
    this.pos = createVector(width / 2 + (isAI ? 200 : -200), height - 100); // Initial spawn position
    this.vel = createVector(0, 0);      // Velocity vector for physics
    this.facing = isAI ? -1 : 1;       // Facing direction: 1 = right, -1 = left
    this.spawnY = height - 100;        // Y-coordinate for spawning/resetting

    // COMBAT STATS (from character roster)
    this.hp = character.hp;                    // Current health points
    this.maxHp = character.hp;                 // Maximum health points
    this.speed = character.speed;              // Movement speed multiplier
    this.baseDamage = character.baseDamage;    // Base attack damage
    this.attackInterval = character.attackInterval; // Attack cooldown time
    this.staggerThreshold = character.staggerThreshold; // Stagger resistance
    this.staggerLength = character.staggerLength;     // Stagger duration
    
    // STAGGER SYSTEM PROPERTIES
    this.staggerRecoveryTimer = 0;       // Timer for stagger recovery
    this.stagger = 0;                    // Current stagger amount
    this.staggerTimer = 0;                // Timer for active stagger
    this.staggeredDisplay = 0;            // Visual stagger display value
    this.staggeredDisplayTimer = 0;       // Timer for visual stagger effects
    
    // VISUAL PROPERTIES
    this.color = isAI ? '#e74c3c' : (character.color || '#3498db'); // Fighter color (AI gets red, fallback to blue)
    
    // DASH ATTACK PROPERTIES
    this.dashTimer = 0;                  // Cooldown timer for dash attacks
    this.isDashing = false;              // Flag for active dash state
    this.dashDuration = 0.16;            // Duration of dash attack in seconds
    this.dashCooldown = 3;               // Cooldown time between dash attacks
    
    // SPRITE EFFECTS PROPERTIES
    this.spriteShakeX = 0;               // Horizontal sprite shake amount
    this.spriteShakeY = 0;               // Vertical sprite shake amount
    this.spriteShakeIntensity = 0;       // Intensity of sprite shake effect
    this.isUltimateSpriteShake = false;  // Flag for ultimate attack shake effect
    
    // DEFEAT STATE PROPERTIES
    this.isDefeated = false;             // Flag for defeated state
    
    // INTRO ANIMATION PROPERTIES
    this.isPlayingIntro = false;         // Flag for intro animation playing
    this.introAnimationIndex = 0;        // Current intro animation frame index
    this.introAnimationTimer = 0;        // Timer for intro animation frame transitions
    this.introAnimationData = null;      // Intro animation data for this character
    // INPUT CONTROLS SYSTEM
    this.controls = {};                 // Object to store input mappings
    this.reset();                        // Initialize all combat systems
  }

  // Start intro animation
  startIntroAnimation() {
    // Use defined intro animation when available, otherwise fall back to a
    // single-frame idle animation so every character has an intro.
    if (typeof INTRO_ANIMATIONS !== 'undefined' && INTRO_ANIMATIONS[this.characterKey]) {
      this.introAnimationData = INTRO_ANIMATIONS[this.characterKey];
    } else {
      const defaultSprite = (typeof CHARACTERS !== 'undefined' && CHARACTERS[this.characterKey] && CHARACTERS[this.characterKey].defaultSprite) || 'idle';
      this.introAnimationData = { sprites: [defaultSprite], duration: 0.3 };
    }
    this.isPlayingIntro = true;
    this.introAnimationIndex = 0;
    this.introAnimationTimer = 0;
  }

  // Update intro animation
  updateIntroAnimation(dt) {
    if (!this.isPlayingIntro || !this.introAnimationData) return;

    this.introAnimationTimer += dt;

    if (this.introAnimationTimer >= this.introAnimationData.duration) {
      this.introAnimationTimer = 0;
      this.introAnimationIndex++;

      // Check if intro animation is complete
      if (this.introAnimationIndex >= this.introAnimationData.sprites.length) {
        // Hold on the last sprite instead of resetting
        this.introAnimationIndex = this.introAnimationData.sprites.length - 1;
        // Keep isPlayingIntro true to continue displaying the last sprite
        // Animation will be stopped when combat actually starts
      }
    }
  }

  // Get current intro sprite
  getIntroSprite() {
    if (!this.isPlayingIntro || !this.introAnimationData) return null;
    return this.introAnimationData.sprites[this.introAnimationIndex];
  }

  /**
   * Apply state from server (authoritative update)
   * Called when server broadcasts game state or ability results
   */
  applyServerState(stateUpdate) {
    // Update authoritative gameplay state from server
    if (stateUpdate.hp !== undefined) this.hp = stateUpdate.hp;
    if (stateUpdate.position) {
      // If Deathedge has teleported the fighter, preserve the teleport position
      // (server doesn't teleport the fighter, so it would broadcast the old position)
      if (this.deathedgeActive && this.deathedgeTeleported && this.deathedgeTeleportPosition) {
        // Keep client-side teleport position — server position is stale for this ability
      } else {
        this.pos.x = stateUpdate.position.x;
        this.pos.y = stateUpdate.position.y;
      }
    }
    if (stateUpdate.velocity) {
      this.vel.x = stateUpdate.velocity.x;
      this.vel.y = stateUpdate.velocity.y;
    }
    if (stateUpdate.facing !== undefined) this.facing = stateUpdate.facing;
    if (stateUpdate.state) this.state = stateUpdate.state;
    if (stateUpdate.stagger !== undefined) this.stagger = stateUpdate.stagger;
    if (stateUpdate.isDefeated !== undefined) {
      this.isDefeated = stateUpdate.isDefeated;
      if (stateUpdate.isDefeated && this.hp <= 0) this.defeat();
    }
    if (stateUpdate.slamHold !== undefined) this.slamHoldPosition = !!stateUpdate.slamHold;
    if (stateUpdate.statuses) {
      this.statuses = stateUpdate.statuses;
    }
    if (stateUpdate.attackCounter !== undefined) this.attackCounter = stateUpdate.attackCounter;
  }

  /**
   * Called by server or local simulator to apply authoritative damage with visual effects
   */
  applyAuthoritativeDamage(amount, attacker, knockback = 0, ev = {}) {
    // Apply damage - this is AUTHORITATIVE from the server
    this.hp = Math.max(0, (this.hp || 0) - amount);
    
    // Clear slam state when hit — ensures sprite updates to hurt/knockback correctly
    if (this.state === 'slam' || this.isSlamAttacking || this.slamHoldPosition) {
      this.isSlamAttacking = false;
      this.slamHoldPosition = false;
      this.slamLandingHitbox = null;
    }
    
    // Visual effects only (no gameplay impact)
    if (typeof spawnDamageNumber === 'function') {
      spawnDamageNumber(amount, { x: this.pos.x, y: this.pos.y }, attacker ? attacker.facing : 1, false, 'normal', false, 'normal');
    }
    if (typeof addScreenShake === 'function') addScreenShake(amount);
    this.addSpriteShake && this.addSpriteShake(amount, false);
    
    if (this.hp <= 0 && !this.isDefeated) {
      this.defeat();
    }
  }

  // Networking / event helpers (client-side only)
  requestDamageTo(target, amount, knockback = 0, meta = {}) {
    // Client sends intent to server - server decides outcome
    if (typeof Network !== 'undefined' && Network.requestAbility) {
      Network.requestAbility('basicAttack', target ? target.id || target.playerId : null);
    } else if (window.LocalSimulator) {
      window.LocalSimulator.enqueue({
        type: 'REQUEST_HIT',
        attackerId: this.playerId || this.characterKey,
        targetId: target.playerId || target.characterKey,
        damage: amount,
        knockback: knockback,
        meta
      });
    }
  }

  requestSelfDamage(amount, meta = {}) {
    const ev = {
      type: 'REQUEST_HIT',
      attackerId: this.playerId || this.characterKey,
      targetId: this.playerId || this.characterKey,
      damage: amount,
      knockback: 0,
      meta
    };
    if (typeof Network !== 'undefined' && Network.sendEvent) {
      Network.sendEvent(ev);
    } else if (window.LocalSimulator) {
      window.LocalSimulator.enqueue(ev);
    }
  }

  requestApplyStatus(target, status) {
    const ev = {
      type: 'STATUS_APPLY',
      targetId: target.playerId || target.characterKey,
      status
    };
    if (typeof Network !== 'undefined' && Network.sendEvent) {
      Network.sendEvent(ev);
    } else if (window.LocalSimulator) {
      window.LocalSimulator.enqueue(ev);
    }
  }

  /**
   * RESET METHOD: Initialize or reset all fighter properties to default state
   * Called during construction and when respawning after defeat
   * Ensures fighter starts with clean state for combat
   */
  reset() {
    // STATE MANAGEMENT
    this.setState('idle');               // Set to idle state for combat readiness
    
    // ATTACK SYSTEM RESET
    this.attackTimer = 0;                // Reset attack cooldown timer
    this.attackDamage = 0;               // Clear current attack damage
    this.attackKnockback = 0;            // Clear current knockback value
    this.attackRange = 0;                // Reset attack range to default
    this.attackHitResolved = false;      // Reset damage resolution flag
    this.statusEffectsApplied = false;   // Reset status effect application flag
    this.slashEffectsSpawned = false;    // Reset visual effect spawning flag
    this.lastSlashSpawnFrame = null;     // Track last visual frame that spawned slashes
    this.lastAttackPhase = 'none';       // Track last attack phase for phase-change detection
    this.lastHitOpponent = null;         // Clear last hit opponent tracker
    this.isOnGround = true;              // Keep server-grounded state separate from the onGround() method
    
    // ULTIMATE ATTACK SYSTEM RESET
    this.ultimateActive = false;         // Clear ultimate activation state
    this.ultimatePhase = 0;              // Reset ultimate phase counter
    this.ultimateTimer = 0;              // Reset ultimate duration timer
    this.ultimateDamageDealt = 0;       // Clear damage dealt this ultimate
    this.ultimateTotalDamage = 0;       // Clear total ultimate damage
    this.ultimateCameraZoom = 1;         // Reset camera zoom effect
    this.ultimateBackgroundDim = 0;     // Reset background dimming effect
    this.ultimateName = "";              // Clear ultimate name display
    this.ultimateDialogue = "";         // Clear ultimate dialogue text
    this.ultimateCanActivate = true;     // Allow ultimate activation (testing flag)
    
    // VISUAL EFFECTS RESET
    this.spriteShakeX = 0;               // Clear horizontal sprite shake
    this.spriteShakeY = 0;               // Clear vertical sprite shake
    this.spriteShakeIntensity = 0;       // Clear shake intensity
    this.isUltimateSpriteShake = false;  // Clear ultimate shake flag
    this.ultimateActivationRequested = false; // Clear ultimate request flag
    
    // STEP 1: STATE MACHINE ISOLATION
    // Create dedicated stateMachine object for cleaner state management
    this.stateMachine = {
      state: 'idle',                     // Current animation state
      attackTimer: 0,                   // Attack sequence timer
      attackSequence: 0,                // Current attack combo sequence
      attackFrame: 0,                   // Current attack animation frame
      attackFrameTimer: 0,               // Timer for attack frame progression
      staggerTimer: 0,                  // Stagger duration timer
      staggerRecoveryTimer: 0,          // Stagger recovery cooldown
      evadeTimer: 0                     // Evade action duration timer
    };
    
    // COMPATIBILITY PROPERTIES
    // Maintain these properties for backward compatibility with existing code
    this.attackSequence = 0;             // Attack combo counter (legacy)
    this.attackFrame = 0;                // Animation frame counter (legacy)
    this.attackFrameTimer = 0;           // Frame timing counter (legacy)
    this.attackPhase = 'none';          // Attack phase for startup/active/recovery

    // COMBAT MECHANICS PROPERTIES
    this.kbResist = 0.08;                // Knockback resistance multiplier
    this.dashCharges = 3;               // Number of available dash charges
    
    // STAGGER SYSTEM PROPERTIES (continued)
    this.staggerRecovery = 0;            // Stagger recovery rate (disabled)
    this.staggerRecoveryTimer = 0;       // Stagger recovery cooldown timer
    this.staggerTimer = 0;               // Current stagger duration timer
    this.staggerLength = 5;              // Maximum stagger duration
    
    // COMBO SYSTEM PROPERTIES (continued)
    this.combo = 0;                     // Current combo counter
    this.comboTimer = 0;                // Combo timeout timer
    this.comboTimeout = 1.4;             // Time before combo resets
    this.attackCounter = 0;              // Total attacks landed counter
    this.attackCounterDisplay = 0;       // Visual display counter for attacks
    this.attackCounterTimer = 0;         // Timer for attack counter display
    
    // VISUAL AND STATUS PROPERTIES
    this.staggeredDisplay = 0;           // Visual stagger display value
    this.staggeredDisplayTimer = 0;      // Timer for visual stagger effects
    this.statuses = [];                  // Array of active status effects
    this.remainingSlide = 0;             // Remaining slide distance from knockback
    
    // ACTION STATE FLAGS (continued)
    this.isDucking = false;             // Duck/crouch state flag
    this.isGuarding = false;             // Guard/block state flag
    this.isCountering = false;           // Counter-attack state flag
    this.isEvading = false;              // Evade/dodge state flag
    
    // COMBAT TIMERS AND REQUESTS
    this.evadeTimer = 0;                 // Evade action duration timer
    this.chargeMeter = 0;                // Charge attack meter (0-100)
    this.attackRequest = false;          // Flag for pending attack request
    this.attackRelease = false;           // Flag for attack release timing
    this.guardRequest = false;           // Flag for guard request
    
    // COMBAT STATE FLAGS (continued)
    this.strikeActive = false;           // Flag for active damage-dealing state
    this.pendingCounter = false;         // Flag for pending counter-attack
    this.lastAttackHit = false;          // Flag indicating if last attack connected
    this.hitCooldown = 0;                // Cooldown timer between taking hits
    this.dashAttacked = false;           // Flag for dash attack execution in current dash
    
    // EVADE SYSTEM PROPERTIES
    this.evadeRequested = false;         // Flag for evade action request
    this.evadeCooldown = 0;              // Cooldown timer between evades (0 = ready)
    
    // SPECIAL ATTACK REQUEST FLAGS
    this.slamAttackRequested = false;    // Flag for slam attack request
    
    // SLAM ATTACK SYSTEM
    this.isSlamAttacking = false;        // Flag for active slam attack state
    this.slamLandingHitbox = null;       // Hitbox for slam landing damage
    this.pendingSlamDamage = null;       // Pending damage to apply on slam landing
    
    // AI CONTROL SYSTEM (continued)
    // Object to store AI action flags and decision-making state
    this.ai = {
      moveLeft: false,                   // AI movement request: left
      moveRight: false,                  // AI movement request: right
      moveUp: false,                     // AI movement request: up (jump)
      moveDown: false,                   // AI movement request: down (duck)
      attack: false,                     // AI combat request: attack
      defend: false,                     // AI combat request: defend/guard
      evade: false,                      // AI combat request: evade/dodge
    };
    
    // STEP 3: ATTACK SYSTEM SUBSYSTEM (continued)
    // Encapsulates all attack-related functionality for cleaner code organization
    this.attackSystem = {
      executeAttack: (opponent, ignoreParry = false) => this.executeAttack(opponent, ignoreParry),
      resolveAttack: (opponent) => this.resolveAttack(opponent),
      updateAttackSequence: () => this.updateAttackSequence(),
      resetAttack: () => this.resetAttack()
    };
    
    // STEP 4: STATUS SYSTEM SUBSYSTEM (continued)
    // Manages all status effects, buffs, and debuffs on the fighter
    this.statusSystem = {
      addStatus: (type, count, potency) => this.addStatus(type, count, potency),
      removeStatus: (type) => this.removeStatus(type),
      consumeOnHit: () => this.consumeStatusOnHit(),
      consumeOnAttack: () => this.consumeStatusOnAttack(),
      consumeOnAbility: () => this.consumeStatusOnAbility(),
      applyStatuses: (dt) => this.applyStatuses(dt)
    };
    
    // STEP 5: EVENT EMISSION LAYER (SERVER PREPARATION) (continued)
    // Provides event-driven communication for game systems and UI updates
    this.events = {
      emit: (eventName, data) => {
        // Local logging for now - future server sync capability
        console.log(`[EVENT] ${eventName}:`, data);
      }
    };
    
    // STEP 6: MOVEMENT SYSTEM SUBSYSTEM (SEPARATE PHYSICS) (continued)
    // Handles all movement physics and collision detection separately from combat
    this.movementSystem = {
      applyMovement: (dt, opponent) => this.applyMovement(dt, opponent),
      applyGravity: (dt, opponent) => this.applyGravity(dt, opponent),
      cleanupPosition: (opponent) => this.cleanupPosition(opponent)
    };
    
    // FINAL INITIALIZATION
    // Call syncState to initialize stateMachine values with current properties
    this.syncState();
    
    // Initialize character-specific properties including controls
    // This loads character-specific abilities, stats, and control mappings
    this.initializeCharacter();
  }

  /**
   * ============================================================================
   * STATE MANAGEMENT SYSTEM
   * ============================================================================
   * 
   * Centralized state management for the Fighter class. All state changes should
   * go through these methods to ensure consistency and proper synchronization
   * between the main properties and the stateMachine subsystem.
   */
  
  /**
   * SET STATE METHOD: Centralized state change management
   * Updates both the main state property and the stateMachine subsystem
   * Ensures consistency across all state tracking systems
   * @param {string} newState - The new state to set (e.g., 'idle', 'attack', 'guard')
   */
  setState(newState) {
    this.state = newState;                 // Update main state property
    if (this.stateMachine) {               // Sync with stateMachine subsystem
      this.stateMachine.state = newState;
    }
  }

  /**
   * SET ATTACK STATE METHOD: Initialize attack-specific state properties
   * Called when starting an attack to set up proper attack state tracking
   * @param {number} sequence - Attack sequence number (for combo tracking)
   * @param {number} frame - Attack animation frame number
   */
  setAttackState(sequence, frame) {
    this.state = 'attack';                // Set to attack state
    this.attackSequence = sequence;         // Set attack combo sequence
    this.attackFrame = frame;              // Set current animation frame
    this.attackFrameTimer = 0;             // Reset frame progression timer
    
    // Update stateMachine
    if (this.stateMachine) {
      this.stateMachine.state = 'attack';
      this.stateMachine.attackSequence = sequence;
      this.stateMachine.attackFrame = frame;
      this.stateMachine.attackFrameTimer = 0;
    }
  }

  setStaggerState(duration) {
    this.state = 'staggered';
    this.staggerTimer = duration;
    this.staggerRecoveryTimer = 0;
    this.stagger = this.staggerThreshold;
    this.staggeredDisplay = 1;
    this.staggeredDisplayTimer = 2.0;
    
    // Emit staggerStarted event
    this.events.emit('staggerStarted', {
      target: this.characterKey,
      duration: duration,
      threshold: this.staggerThreshold
    });
    
    // Update stateMachine
    if (this.stateMachine) {
      this.stateMachine.state = 'staggered';
      this.stateMachine.staggerTimer = duration;
      this.stateMachine.staggerRecoveryTimer = 0;
    }
  }

  setEvadeState(duration) {
    this.state = 'evade';
    this.evadeTimer = duration;
    this.isEvading = true;
    
    // Update stateMachine
    if (this.stateMachine) {
      this.stateMachine.state = 'evade';
      this.stateMachine.evadeTimer = duration;
    }
  }

  // STEP 3: Attack system helper methods
  resetAttack() {
    this.attackTimer = 0;
    this.attackDamage = 0;
    this.attackKnockback = 0;
    this.attackRange = 0;
    this.attackHitResolved = false;
    this.statusEffectsApplied = false;
    this.slashEffectsSpawned = false;
    this.lastHitOpponent = null;  // Clear last hit opponent on attack reset
    this.lastSlashSpawnFrame = null;
    this.attackSequence = 0;
    this.attackFrame = 0;
    this.attackFrameTimer = 0;
    this.attackDamageDealt = false;
    this.strikeActive = false;
    this.lastAttackHit = false;
  }

  // STEP 1: Sync state between original variables and stateMachine (two-way binding)
  syncState() {
    // Sync from original to stateMachine
    this.stateMachine.state = this.state;
    this.stateMachine.attackTimer = this.attackTimer;
    this.stateMachine.attackSequence = this.attackSequence;
    this.stateMachine.attackFrame = this.attackFrame;
    this.stateMachine.attackFrameTimer = this.attackFrameTimer;
    this.stateMachine.staggerTimer = this.staggerTimer;
    this.stateMachine.staggerRecoveryTimer = this.staggerRecoveryTimer;
    this.stateMachine.evadeTimer = this.evadeTimer;
    
    // Sync from stateMachine to original (for safety)
    this.state = this.stateMachine.state;
    this.attackTimer = this.stateMachine.attackTimer;
    this.attackSequence = this.stateMachine.attackSequence;
    this.attackFrame = this.stateMachine.attackFrame;
    this.attackFrameTimer = this.stateMachine.attackFrameTimer;
    this.staggerTimer = this.stateMachine.staggerTimer;
    this.staggerRecoveryTimer = this.stateMachine.staggerRecoveryTimer;
    this.evadeTimer = this.stateMachine.evadeTimer;
  }

  // Character-specific properties initialization
  initializeCharacter() {
    // Character-specific properties will be initialized by character profile
    this.dialogueTimer = 0;
    this.currentDialogue = '';
    this.damageResistance = 1.0;
    
    // Set character-specific properties
    const character = CHARACTERS[this.characterKey];
    this.name = character.name;
    this.title = character.title;
    this.baseDamage = character.baseDamage;
    
    // Set knockback multiplier from character (if available)
    this.knockbackMultiplier = character.knockbackMultiplier || 1.0;
    
    // Set controls for player-controlled fighter
    if (this.isPlayerControlled) {
      this.controls = {
        left: 'a',
        right: 'd',
        up: 'w',
        down: 's',
        attack: 'f',
        evade: 'e',
      };
    } else {
      this.controls = null;
    }
    
    // Set jump strength
    this.jumpStrength = -20;
    
    // Initialize character-specific properties
    if (character.initializeCharacter) {
      character.initializeCharacter(this);
    }
    
    // Load character sprite if available
    this.sprite = null;
    this.spriteType = character.spriteType || null;
    
    // Safe default for currentSprite
    if (!this.currentSprite) {
      if (this.spriteType === 'atlas') {
        const defaultAtlasIdle = this.characterKey === 'CALLISTO' ? 'cidle' : 'idle';
        this.currentSprite = character.defaultSprite || defaultAtlasIdle;
      } else {
        this.currentSprite = character.defaultSprite || 'idle';
      }
    }
    
    // Initialize dash sprite properties
    this.usePostDashSprite = false;
    
    // Initialize slam costure sprite properties (cuf6/cus4 at max Corpus consumption)
    this.slamCostumeSprite = null;
    this.slamCostumeSlash = null;
    this.slamHoldPosition = false;
    
    // Initialize slash effects management
    this.slashEffects = [];
    
    // Initialize attack sequence properties
    this.attackSequence = 0; // 0=none, 1=attack1, 2=attack2, 3=attack3
    this.attackFrame = 0; // Current frame in attack sequence
    this.attackFrameTimer = 0; // Timer for frame transitions
    this.attackFrameDuration = 0.2; // 0.2s between frames
    this.attackDamageDealt = false; // Track if damage was dealt for current frame
    
    // Initialize halt sequence properties
    this.haltSequence = false; // Track if in halt sequence
    this.haltFrame = 0; // Current frame in halt sequence
    this.haltFrameTimer = 0; // Timer for halt frame transitions
    this.haltFrameDuration = 0.1; // Rapid succession timing
    
    if (character.sprite && this.spriteType !== 'atlas') {
      // Regular sprite loading
      this.sprite = loadImage(character.sprite);
    }
  }

  /**
   * RESTORED: Update sprite based on state and attack phase
   * Driven by server snapshot values for synchronization
   * @param {number} dt - Delta time in seconds for frame animation
   */
  updateSprite(dt) {
    // Skip sprite updates during ultimate - ultimate controls its own sprites
    if (this.ultimateActive) {
      return;
    }
    
    // Track flag transitions for visual effect spawning (server-driven, attackFrame is always 0)
    const prevDashAttackActive = this._prevDashAttackActive;
    this._prevDashAttackActive = !!this.dashAttackActive;
    const prevSlamActive = this._prevSlamActive;
    this._prevSlamActive = !!(this.state === 'slam' || this.isSlamAttacking || this.slamHoldPosition);
    const dashAttackJustActivated = this.dashAttackActive && !prevDashAttackActive;
    const slamJustActivated = (this.state === 'slam' || this.isSlamAttacking || this.slamHoldPosition) && !prevSlamActive;
    
    // Use intro sprite if intro animation is playing
    if (this.isPlayingIntro) {
      const introSprite = this.getIntroSprite();
      if (introSprite) {
        this.currentSprite = introSprite;
        return;
      }
    }
    
    // State to sprite mapping for Dihui Star
    if (this.characterKey === 'DIHUI') {
      const dihuiStateMap = {
        idle: 'didle',
        run: 'dmove',
        jump: 'dmove',
        attack: 'ds2f1',
        slam: 'ds3f1',
        guard: 'dguard',
        dash: 'dmove',
        evade: 'devade',
        hit: 'dhurt',
        staggered: 'dhurt',
        duck: 'didle',
        ultimate: 'du1'
      };

      // Deathedge ability animation — driven by server phase/frameIndex, same as other abilities
      if (this.deathedgeActive) {
        // Reset one-shot flags when ability newly activates (for subsequent uses)
        if (!this._deathedgeWasActive) {
          this.deathedgeTeleported = false;
          this.deathedgeDlinesSpawned = false;
          this.deathedgeTeleportPosition = null;
          this.deathedgeTargetEnemy = null;
          this._prevDeathedgePhase = undefined;
          this._prevDeathedgeFrameIndex = undefined;
        }
        this._deathedgeWasActive = true;

        const deathedgeConfig = CHARACTERS['DIHUI'].abilities.deathedge;
        if (deathedgeConfig) {
          // Track phase/frame transitions for one-shot triggers (teleport, dlines)
          const prevPhase = this._prevDeathedgePhase;
          const prevFrameIndex = this._prevDeathedgeFrameIndex;
          this._prevDeathedgePhase = this.deathedgePhase;
          this._prevDeathedgeFrameIndex = this.deathedgeFrameIndex;

          const phaseJustEntered = this.deathedgePhase !== prevPhase;
          const frameAdvanced = this.deathedgeFrameIndex !== prevFrameIndex && this.deathedgeFrameIndex > (prevFrameIndex || 0);

          switch (this.deathedgePhase) {
            case 0: // Windup phase
              {
                const windupFrames = deathedgeConfig.windupFrames;
                if (this.deathedgeFrameIndex < windupFrames.length) {
                  this.currentSprite = windupFrames[this.deathedgeFrameIndex];
                } else {
                  this.currentSprite = deathedgeConfig.windupFinalSprite;
                }
              }
              break;
            case 1: // Post-teleport phase — teleport on first entry
              {
                // Teleport on phase entry (server-authoritative, but client needs visual teleport too)
                if (phaseJustEntered && !this.deathedgeTeleported) {
                  const allFighters = window.allFighters || [];
                  const enemies = allFighters.filter(f => f !== this && !f.isDefeated);
                  let furthestEnemy = null;
                  let maxDistance = 0;
                  enemies.forEach(enemy => {
                    const dist = Math.abs(enemy.pos.x - this.pos.x);
                    if (dist > maxDistance) { maxDistance = dist; furthestEnemy = enemy; }
                  });
                  if (furthestEnemy) {
                    const arenaMargin = 100;
                    const teleportOffset = 150;
                    let teleportX;
                    // Teleport behind the enemy; if at edge, teleport in front
                    if (furthestEnemy.facing === 1) {
                      teleportX = furthestEnemy.pos.x - teleportOffset;
                      if (teleportX < arenaMargin) teleportX = furthestEnemy.pos.x + teleportOffset;
                    } else {
                      teleportX = furthestEnemy.pos.x + teleportOffset;
                      if (teleportX > width - arenaMargin) teleportX = furthestEnemy.pos.x - teleportOffset;
                    }
                    teleportX = Math.max(arenaMargin, Math.min(width - arenaMargin, teleportX));
                    this.pos.x = teleportX;
                    this.pos.y = furthestEnemy.pos.y;
                    this.vel.x = 0;
                    this.vel.y = 0;
                    this.deathedgeTeleported = true;
                    this.deathedgeTeleportPosition = { x: teleportX, y: furthestEnemy.pos.y };
                    this.deathedgeTargetEnemy = furthestEnemy;
                    console.log(`⚔️ Deathedge teleported behind ${furthestEnemy.name} to ${teleportX}`);
                  }
                }
                const postTeleportFrames = deathedgeConfig.postTeleportFrames;
                if (this.deathedgeFrameIndex < postTeleportFrames.length) {
                  this.currentSprite = postTeleportFrames[this.deathedgeFrameIndex];
                } else {
                  this.currentSprite = postTeleportFrames[postTeleportFrames.length - 1];
                }
              }
              break;
            case 2: // Attack phase — spawn dlines on first entry
              {
                if (phaseJustEntered && !this.deathedgeDlinesSpawned) {
                  const dihuiChar = CHARACTERS['DIHUI'];
                  if (dihuiChar && dihuiChar.spawnDeathedgeDlines) {
                    dihuiChar.spawnDeathedgeDlines(this);
                  }
                  this.deathedgeDlinesSpawned = true;
                  console.log(`⚔️ Deathedge spawned dlines`);
                }
                const attackFrames = deathedgeConfig.attackFrames;
                if (this.deathedgeFrameIndex < attackFrames.length) {
                  this.currentSprite = attackFrames[this.deathedgeFrameIndex];
                } else {
                  this.currentSprite = attackFrames[attackFrames.length - 1];
                }
              }
              break;
          }
        }
        return; // Deathedge handles its own sprites above
      }

      // Deathedge just ended — reset tracking flag for next use
      if (this._deathedgeWasActive) {
        this._deathedgeWasActive = false;
        this._prevDeathedgePhase = undefined;
        this._prevDeathedgeFrameIndex = undefined;
      }

      // Handle special states for Dihui
      if (this.state === 'hit' || this.state === 'hurt') {
        this.currentSprite = 'dhurt';
      } else if (this.state === 'slam' || this.isSlamAttacking || this.slamHoldPosition) {
        this.currentSprite = 'ds3f1';
        if (slamJustActivated) {
          this.spawnSlashEffect('ds3s1', { x: 0, y: -10 });
        }
      } else if (this.dashAttackActive) {
        this.currentSprite = 'djoust2';
        if (dashAttackJustActivated) {
          this.spawnSlashEffect('ds1s1', { x: 0, y: -10 });
        }
      } else if (this.isDashing) {
        if (this.usePostDashSprite) {
          this.currentSprite = 'dhalt1';
        } else {
          this.currentSprite = 'dmove';
        }
      } else if (this.haltSequence) {
        this.updateDihuiHaltSequence();
      } else if (this.state === 'attack' || this.state === 'attacking') {
        const frameDt = dt !== undefined ? dt : (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60);
        this.updateAttackSprite(frameDt);
      } else {
        this.currentSprite = dihuiStateMap[this.state] || 'didle';
      }
      return;
    }
    
    // State to sprite mapping for Callisto
    if (this.characterKey === 'CALLISTO') {
      const callistoStateMap = {
        idle: 'cidle',
        run: 'cmove',
        jump: 'cs1f1',
        attack: 'cs1f2',
        slam: 'cs1f2',
        guard: 'cguard',
        dash: 'cmove',
        evade: 'cevade',
        hit: 'churt',
        staggered: 'churt',
        duck: 'cidle',
        ultimate: 'cuend'
      };

      // Installation Art ability animation - respect server phase timing
      if (this.installationArtActive) {
        if (this.installationArtExecutePhase) {
          this.currentSprite = 'cevade';
        } else if (this.installationArtWindupPhase) {
          this.currentSprite = 'cguard';
        } else if (typeof this.installationArtTimer === 'number') {
          const total = typeof this.installationArtTotal === 'number' ? this.installationArtTotal : 1.3;
          const windup = typeof this.installationArtWindup === 'number' ? this.installationArtWindup : 0.5;
          const windupEnd = total - windup;
          if (this.installationArtTimer > windupEnd) {
            this.currentSprite = 'cguard';
          } else if (this.installationArtTimer > 0) {
            this.currentSprite = 'cevade';
          } else {
            this.currentSprite = 'cidle';
          }
        } else {
          // Fallback: while active but timer unknown, show guard
          this.currentSprite = 'cguard';
        }
        return;
      }

      // Handle special states for Callisto
      // Hurt/hit states take priority over slam to ensure correct hurt sprite when hit during slam
      if (this.state === 'hit' || this.state === 'hurt') {
        this.currentSprite = 'churt';
      } else if (this.state === 'slam' || this.isSlamAttacking || this.slamHoldPosition) {
        // Check for empowered slam costume sprites (cuf6/cus4 when consuming 20 Corpus)
        if (this.slamCostumeSprite) {
          this.currentSprite = this.slamCostumeSprite;
        } else {
          this.currentSprite = 'cs1f2';
        }
        if (slamJustActivated) {
          const slashName = this.slamCostumeSlash || 'cs1s1';
          this.spawnSlashEffect(slashName, { x: 0, y: -10 });
        }
      } else if (this.dashAttackActive) {
        // Dash attack deceleration - show cjoust sprite while slowing down
        this.currentSprite = 'cjoust';
        if (dashAttackJustActivated) {
          this.spawnSlashEffect('cjs1', { x: 0, y: -10 });
        }
      } else if (this.isDashing) {
        if (this.state === 'attack' || this.state === 'attacking') {
          this.currentSprite = 'cjoust';
          if (dashAttackJustActivated) {
            this.spawnSlashEffect('cjs1', { x: 0, y: -10 });
          }
        } else if (this.usePostDashSprite) {
          this.currentSprite = 'chalt';
        } else {
          this.currentSprite = 'cmove';
        }
      } else if (this.haltSequence) {
        this.updateCallistoHaltSequence();
      } else if (this.usePostDashSprite && !this.isDashing) {
        this.usePostDashSprite = false;
        this.currentSprite = callistoStateMap[this.state] || 'cidle';
      } else if (this.state === 'attack' || this.state === 'attacking') {
        const frameDt = dt !== undefined ? dt : (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60);
        this.updateAttackSprite(frameDt);
      } else {
        this.currentSprite = callistoStateMap[this.state] || 'cidle';
      }
      return;
    }
    
    // State to sprite mapping for Valencina
    const stateMap = {
      idle: 'idle',
      run: 'moving',
      jump: 's4f3',
      attack: 'prepat',
      slam: 's4f4',
      guard: 'guard',
      dash: 'joust',
      evade: 'evade',
      hit: 'hurt',
      staggered: 'hurt',
      duck: 'idle',
      ultimate: 'dist1'
    };

    // Time to Hunt ability animation - show dist1 sprite during casting
    if (this.timeToHuntCasting) {
      this.currentSprite = 'de1';
      return;
    }

    // Handle special states
    // Hurt/hit states take priority over slam to ensure correct hurt sprite when hit during slam
    if (this.state === 'hit' || this.state === 'hurt') {
      this.currentSprite = 'hurt';
    } else if (this.state === 'slam' || this.isSlamAttacking || this.slamHoldPosition) {
      if (this.characterKey === 'CALLISTO') {
        this.currentSprite = 'cs1f2';
      } else {
        this.currentSprite = 's4f4';
        if (slamJustActivated) {
          this.spawnSlashEffect('s2s2', { x: 0, y: -10 });
        }
      }
    } else if (this.dashAttackActive) {
      // Dash attack deceleration - show joust sprite while slowing down
      this.currentSprite = 'joust';
      if (dashAttackJustActivated) {
        this.spawnSlashEffect('js1', { x: 0, y: -10 });
      }
    } else if (this.isDashing) {
      if (this.state === 'attack' || this.state === 'attacking' || this.dashAttackActive) {
        this.currentSprite = 'joust';
        if (dashAttackJustActivated) {
          this.spawnSlashEffect('js1', { x: 0, y: -10 });
        }
      } else if (this.usePostDashSprite) {
        this.currentSprite = 's2f1';
      } else {
        this.currentSprite = 'moving';
      }
    } else if (this.haltSequence) {
      this.updateHaltSequence();
    } else if (this.usePostDashSprite && !this.isDashing) {
      this.usePostDashSprite = false;
      this.currentSprite = stateMap[this.state] || 'idle';
    } else if (this.state === 'attack' || this.state === 'attacking') {
      const frameDt = dt !== undefined ? dt : (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60);
      this.updateAttackSprite(frameDt);
    } else {
      // Default case: Use stateMap for normal state transitions (idle, run, jump, guard, evade, etc.)
      this.currentSprite = stateMap[this.state] || 'idle';
    }
  }

  /**
   * RESTORED: Update attack sprite based on frame timing (client-side animation)
   * Animates attack frames independently using frame duration timing.
   */
  updateAttackSprite(dt) {
    if (this.attackSequence <= 0) return;

    // Callisto uses its own attack sequence mapping and frame progression.
    if (this.characterKey === 'CALLISTO') {
      this.updateCallistoAttackSequence();
      return;
    }

    // Dihui Star uses its own attack sequence mapping
    if (this.characterKey === 'DIHUI') {
      this.updateDihuiAttackSequence();
      return;
    }

    this.updateAttackSequence();
  }

  /**
   * RESTORED: Update attack sequence sprite for Valencina
   * Frame timing driven by attackPhase from server
   */
  updateAttackSequence() {
    const attackKey = this.attackSequence === 1 ? 'light' : this.attackSequence === 2 ? 'medium' : 'heavy';
    const attackDef = CHARACTERS[this.characterKey] && CHARACTERS[this.characterKey].attacks ? CHARACTERS[this.characterKey].attacks[attackKey] : null;

    // Detect phase transition for slash spawning (attackFrame from server is always 0)
    const phaseTransitioned = this.lastAttackPhase !== this.attackPhase && this.attackPhase !== 'none';

    if (this.attackSequence === 1) {
      const sequence = ['prepat', 's1f1', 's1f2', 's1f3'];
      let visualFrame = 0;
      if (this.attackPhase === 'startup') {
        visualFrame = 0;
      } else if (this.attackPhase === 'active') {
        visualFrame = 1;
      } else if (this.attackPhase === 'recovery' || this.attackPhase === 'comboHold') {
        const recoveryFrames = sequence.slice(2);
        const recoveryDuration = attackDef ? attackDef.recovery : 0.32;
        const perFrame = recoveryFrames.length > 0 ? recoveryDuration / recoveryFrames.length : recoveryDuration;
        const index = Math.min(recoveryFrames.length - 1, Math.floor(this.attackFrameTimer / perFrame));
        visualFrame = 2 + Math.max(0, index);
      }
      this.currentSprite = sequence[Math.min(visualFrame, sequence.length - 1)];

      // Spawn slashes when entering active phase (hitspark frame)
      if (phaseTransitioned && this.attackPhase === 'active') {
        this.spawnSlashEffect('s1s1', { x: 0, y: -10 });
        this.spawnSlashEffect('s1s2', { x: 15, y: -5 });
      }
    } else if (this.attackSequence === 2) {
      const sequence = ['s2f1', 'halt1', 'halt2', 's3f1'];
      let visualFrame = 0;
      if (this.attackPhase === 'startup' || this.attackPhase === 'active') {
        visualFrame = 0;
      } else if (this.attackPhase === 'recovery' || this.attackPhase === 'comboHold') {
        const recoveryFrames = sequence.slice(1);
        const recoveryDuration = attackDef ? attackDef.recovery : 0.40;
        const perFrame = recoveryFrames.length > 0 ? recoveryDuration / recoveryFrames.length : recoveryDuration;
        const index = Math.min(recoveryFrames.length - 1, Math.floor(this.attackFrameTimer / perFrame));
        visualFrame = 1 + Math.max(0, index);
      }
      this.currentSprite = sequence[Math.min(visualFrame, sequence.length - 1)];

      // Spawn slash at attack start (s2f1 is both startup and active in reference)
      if (phaseTransitioned && (this.attackPhase === 'startup' || this.attackPhase === 'active')) {
        this.spawnSlashEffect('s1s3', { x: 0, y: -10 });
      }
    } else if (this.attackSequence === 3) {
      const sequence = ['s3f1', 's3f2', 's3f3'];
      let visualFrame = 0;
      if (this.attackPhase === 'startup') {
        visualFrame = 0;
      } else if (this.attackPhase === 'active') {
        visualFrame = 1;
      } else if (this.attackPhase === 'recovery' || this.attackPhase === 'comboHold') {
        visualFrame = 2;
      }
      this.currentSprite = sequence[Math.min(visualFrame, sequence.length - 1)];

      // Spawn slash when entering active phase (s3f2 hitspark frame)
      if (phaseTransitioned && this.attackPhase === 'active') {
        this.spawnSlashEffect('s1s4', { x: 0, y: -10 });
      }
    }

    // Track attack phase for next frame's transition detection
    this.lastAttackPhase = this.attackPhase;
  }

  updateDihuiHaltSequence() {
    // Halt sequence: dhalt1 > dhalt2 > didle
    const sequence = ['dhalt1', 'dhalt2', 'didle'];
    
    if (this.haltFrame < sequence.length) {
      this.currentSprite = sequence[this.haltFrame];
    }
  }

  updateHaltSequence() {
    // Halt sequence: halt1 > halt2 > idle
    const sequence = ['halt1', 'halt2', 'idle'];
    
    if (this.haltFrame < sequence.length) {
      this.currentSprite = sequence[this.haltFrame];
    }
  }

  updateDihuiAttackSequence() {
    if (this.attackSequence <= 0) return;

    // Skip sprite setting if deathedge ability is active (ability overrides attack sprites)
    if (this.deathedgeActive) return;

    const attackPhase = this.attackPhase || 'startup';
    const attackKey = this.attackSequence === 1 ? 'light' : this.attackSequence === 2 ? 'medium' : 'heavy';
    const attackDef = CHARACTERS[this.characterKey] && CHARACTERS[this.characterKey].attacks ? CHARACTERS[this.characterKey].attacks[attackKey] : null;

    // Detect phase transition for slash spawning
    const phaseTransitioned = this.lastAttackPhase !== attackPhase && attackPhase !== 'none';

    if (this.attackSequence === 1) {
      // Attack 1: draw1 (windup) > ds1f1 with ds1s1 (hit)
      if (attackPhase === 'startup') {
        this.currentSprite = 'draw1';
      } else if (attackPhase === 'active') {
        this.currentSprite = 'ds1f1';
        // Spawn ds1s1 slash when entering active phase
        if (phaseTransitioned) {
          this.spawnSlashEffect('ds1s1', { x: 0, y: -10 });
        }
      } else if (attackPhase === 'recovery' || attackPhase === 'comboHold') {
        this.currentSprite = 'ds1f1';
      }
    } else if (this.attackSequence === 2) {
      // Attack 2: ds1f1 (windup) > ds2f1 with ds2s1 (hit) > ds2f2
      if (attackPhase === 'startup') {
        this.currentSprite = 'ds1f1';
      } else if (attackPhase === 'active') {
        this.currentSprite = 'ds2f1';
        // Spawn ds2s1 slash when entering active phase
        if (phaseTransitioned) {
          this.spawnSlashEffect('ds2s1', { x: 0, y: -10 });
        }
      } else if (attackPhase === 'recovery' || attackPhase === 'comboHold') {
        this.currentSprite = 'ds2f2';
      }
    } else if (this.attackSequence === 3) {
      // Attack 3: ds2f2 > ds3f1 with ds3s1 (hit) > ds3f2
      if (attackPhase === 'startup') {
        this.currentSprite = 'ds2f2';
      } else if (attackPhase === 'active') {
        this.currentSprite = 'ds3f1';
        // Spawn ds3s1 slash when entering active phase
        if (phaseTransitioned) {
          this.spawnSlashEffect('ds3s1', { x: 0, y: -10 });
        }
      } else if (attackPhase === 'recovery' || attackPhase === 'comboHold') {
        this.currentSprite = 'ds3f2';
      }
    }

    // Track attack phase for next frame's transition detection
    this.lastAttackPhase = attackPhase;
  }

  updateCallistoAttackSequence() {
    if (this.attackSequence <= 0) return;

    const attackPhase = this.attackPhase || 'startup';
    const sequence1 = ['cs1f1', 'cs1f2', 'cs1f3'];
    const sequence2 = ['cs1f3', 'cs2f1'];
    const sequence3 = ['cs3f1', 'cs3f2', 'cs3f3', 'cs3f4'];
    let visualFrame = 0;

    // Detect phase transition for slash spawning (attackFrame from server is always 0)
    const phaseTransitioned = this.lastAttackPhase !== attackPhase && attackPhase !== 'none';

    if (this.attackSequence === 1) {
      const damageFrames = [false, true, false];
      if (attackPhase === 'startup') {
        visualFrame = 0;
      } else if (attackPhase === 'active') {
        visualFrame = 1;
      } else if (attackPhase === 'recovery' || attackPhase === 'comboHold') {
        visualFrame = 2;
      }
      this.currentSprite = sequence1[Math.min(visualFrame, sequence1.length - 1)];

      // Spawn cs1s1 slash when entering active phase (cs1f2 hitspark frame)
      if (phaseTransitioned && attackPhase === 'active') {
        this.spawnSlashEffect('cs1s1', { x: 0, y: -10 });
      }

      if (damageFrames[visualFrame] && !this.attackDamageDealt) {
        this.dealAttackDamage();
        this.attackDamageDealt = true;
        if (this.target) {
          this.requestApplyStatus(this.target, { type: 'Bind', count: 1, potency: 1 });
          console.log('🔗 Callisto inflicted Bind on enemy!');
        }
        this.requestApplyStatus(this, { type: 'Haste', count: 1, potency: 1 });
        console.log('⚡ Callisto gained Haste!');
      }
    } else if (this.attackSequence === 2) {
      const damageFrames = [false, true];
      if (attackPhase === 'startup' || attackPhase === 'active') {
        visualFrame = 0;
      } else if (attackPhase === 'recovery' || attackPhase === 'comboHold') {
        visualFrame = 1;
      }
      this.currentSprite = sequence2[Math.min(visualFrame, sequence2.length - 1)];

      // Spawn cs2s1 slash when entering the active/recovery transition (cs2f1 hitspark frame)
      if (phaseTransitioned && attackPhase === 'recovery') {
        this.spawnSlashEffect('cs2s1', { x: 0, y: -10 });
      }

      if (damageFrames[visualFrame] && !this.attackDamageDealt) {
        this.dealAttackDamage();
        this.attackDamageDealt = true;
        if (this.target) {
          const fragileStatus = this.target.statuses.find(s => s.type === 'Fragile');
          const currentFragileStacks = fragileStatus ? fragileStatus.potency : 0;
          if (currentFragileStacks < 5) {
            this.requestApplyStatus(this.target, { type: 'Fragile', count: 1, potency: 1 });
            console.log('💔 Callisto inflicted Fragile on enemy!');
          }
        }
        const protectionStatus = this.statuses.find(s => s.type === 'Protection');
        const currentProtectionStacks = protectionStatus ? protectionStatus.potency : 0;
        if (currentProtectionStacks < 5) {
          this.requestApplyStatus(this, { type: 'Protection', count: 1, potency: 1 });
          console.log('🛡️ Callisto gained Protection!');
        }
      }
    } else if (this.attackSequence === 3) {
      const damageFrames = [false, true, true, false];
      if (attackPhase === 'startup') {
        visualFrame = 0;
      } else if (attackPhase === 'active') {
        visualFrame = 1;
      } else if (attackPhase === 'recovery' || attackPhase === 'comboHold') {
        const recoveryTime = this.attackFrameTimer || 0;
        visualFrame = recoveryTime < 0.2 ? 2 : 3;
      }
      this.currentSprite = sequence3[Math.min(visualFrame, sequence3.length - 1)];

      // Spawn cs3s1 when entering active phase (cs3f2 hitspark)
      if (phaseTransitioned && attackPhase === 'active') {
        this.spawnSlashEffect('cs3s1', { x: 0, y: -10 });
      }
      // Spawn cs3s2 when entering recovery phase (cs3f3 hitspark)
      if (phaseTransitioned && attackPhase === 'recovery') {
        this.spawnSlashEffect('cs3s2', { x: 0, y: -10 });
      }

      if (damageFrames[visualFrame] && !this.attackDamageDealt) {
        let damageMultiplier = 1.0;
        if (visualFrame === 2 && this.target) {
          const negativeEffects = ['Bind', 'Fragile', 'Burn', 'Bleed', 'Tremor', 'Sinking'];
          const negativeCount = negativeEffects.filter(effect => this.target.hasStatus(effect)).length;
          const bonusDamage = Math.min(negativeCount * 0.05, 0.25);
          damageMultiplier = 1.0 + bonusDamage;
          if (bonusDamage > 0) {
            console.log(`⚡ Callisto gained ${Math.round(bonusDamage * 100)}% damage bonus from ${negativeCount} negative effects!`);
          }
        }
        this.dealAttackDamage(damageMultiplier);
        this.attackDamageDealt = true;
      }
    }

    // Track attack phase for next frame's transition detection
    this.lastAttackPhase = attackPhase;
  }

  updateCallistoHaltSequence() {
    // Halt sequence: chalt > cmove > cidle
    const sequence = ['chalt', 'cmove', 'cidle'];
    
    if (this.haltFrame < sequence.length) {
      this.currentSprite = sequence[this.haltFrame];
    }
  }

  spawnSlashEffect(slashType, targetOffset = null) {
    // Cap slash effects to prevent performance issues
    if (this.slashEffects.length >= 6) {
      return; // Don't spawn more than 6 effects
    }
    
    // Check if this is a cbsk effect (Installation Art slash entities)
    const isCbskEffect = ['cbsk1', 'cbsk2', 'cbsk3'].includes(slashType);
    
    // Spawn slash effect that shares character position and fades out
    const effect = {
      type: slashType,
      // If a world position is provided, draw the effect at that world position
      pos: (targetOffset && targetOffset.worldPos) ? { x: targetOffset.worldPos.x, y: targetOffset.worldPos.y } : { x: this.pos.x, y: this.pos.y },
      facing: this.facing,
      timer: isCbskEffect ? 5.0 : 0.4, // 5 seconds for cbsk effects, 0.4 for normal slashes
      targetOffset: targetOffset,
      owner: this,
      rotation: targetOffset && targetOffset.rotation ? targetOffset.rotation : null,
      groundY: (targetOffset && (targetOffset.groundY !== undefined)) ? targetOffset.groundY : null
    };
    
    this.slashEffects.push(effect);
  }

  dealAttackDamage() {
    // This method will be called to deal damage during attack sequences
    // The actual damage dealing will be handled in the update method
    this.strikeActive = true;
    this.attackHitResolved = false;
  }

  isDead() {
    return this.hp <= 0;
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

      const owner = effect.owner;
      const offsetX = effect.targetOffset?.x || 0;
      const offsetY = effect.targetOffset?.y || 0;
      
      // Pre-calculate positions to avoid push/pop
      const baseX = owner.pos.x;
      const baseY = owner.pos.y;
      
      // FIX 3: CBSK effects use their own facing, NOT the fighter's facing
      const isCbsk = ['cbsk1', 'cbsk2', 'cbsk3'].includes(effect.type) || effect.type.startsWith('cbsk');
      // Non-cbsk effects flip with fighter facing; cbsk effects use fixed orientation
      const facing = isCbsk ? 1 : (owner.facing === 1 ? -1 : 1);
      
      // Store the effect as cbsk for future reference
      if (isCbsk) {
        effect.isCbsk = true;
      }
      
      // Apply same scaling as character sprites
      if (owner.spriteType === 'atlas') {
        // Use same scale factor as character (144/512)
        const scaleFactor = 144 / 512;
        
        // Simplified alpha calculation (no map)
        const alpha = effect.timer * 637.5; // 0.4 * 637.5 = 255
        
        // Try to draw sprite with proper scaling and alpha fade
        const spriteInfo = SPRITES?.[effect.type];
        if (spriteInfo) {
          // FIX 3: CBSK effects use FIXED orientation, not fighter facing
          // They are drawn at ground level with random rotation, independent of
          // the character's facing direction
          if (['cbsk1', 'cbsk2', 'cbsk3'].includes(effect.type) || effect.type.startsWith('cbsk')) {
            // Draw ground-based slash entities with fixed orientation
            push();
            
            // Apply alpha fade (5 second duration - no fade until last second)
            let cbskAlpha = 255;
            if (effect.timer <= 1.0) {
              // Only fade in the last second
              cbskAlpha = effect.timer * 255;
            }
            tint(255, 255, 255, cbskAlpha);
            
            // Position at ground level: prefer effect.groundY, then effect.pos.y, then owner.spawnY
            const groundY = (typeof effect.groundY === 'number') ? effect.groundY : ((effect.pos && typeof effect.pos.y === 'number') ? effect.pos.y : effect.owner.spawnY);
            translate(effect.pos.x + offsetX, groundY - 70);
            
            // Random rotation between -45 to 45 degrees
            if (!effect.rotation) {
              effect.rotation = random(-PI/4, PI/4);
            }
            rotate(effect.rotation);
            
            // FIX 3: Do NOT apply facing flip - use fixed orientation
            //scale(scaleFactor, scaleFactor);
            scale(1,1);
            // Draw the sprite
            drawSpriteScaled(effect.type, 0, 0, scaleFactor);
            
            pop();
          } else {
            // Regular slash effects - flip with facing
            push();
            tint(255, 255, 255, alpha);
            translate(baseX + offsetX * facing, baseY + offsetY + 84);
            if (facing === -1) {
              scale(-1, 1); // Flip horizontally when facing right
            }
            // Apply rotation if set (used by dline effects)
            if (effect.rotation) {
              rotate(effect.rotation);
            }
            drawSpriteScaled(effect.type, 0, 0, scaleFactor);
            pop();
          }
        } else {
          // Fallback: draw scaled slash effect
          push();
          scale(scaleFactor * facing, 1);
          noStroke();
          ellipse(baseX + offsetX, baseY + offsetY + 84, 15, 15);
          pop();
        }
      } else {
        push();
        noStroke();
        scale(facing, 1);
        ellipse(baseX + offsetX, baseY + offsetY + 60, 15, 15);
        pop();
      }
    }

      // Draw ultimate-specific effects (Callisto red lines/skulls, Dihui blue line)
      if (this.ultimateActive) {
        if (this.characterKey === 'CALLISTO') {
          this.drawUltimateEffects(dt);
        } else if (this.characterKey === 'DIHUI') {
          this.drawDihuiUltimateEffects();
        }
      }
  }

  drawUltimateEffects(dt) {
    // Draw red lines from Attack 5
    if (this.ultimateRedLines && this.ultimateRedLines.length > 0) {
      push();
      stroke(255, 0, 0);
      strokeWeight(1);
      this.ultimateRedLines.forEach(redLine => {
        if (redLine.opacity < redLine.maxOpacity) {
          redLine.opacity += redLine.fadeSpeed * dt;
        }
        const alpha = constrain(redLine.opacity * 255, 0, 255);
        stroke(255, 0, 0, alpha);
        line(redLine.topX, redLine.topY, redLine.bottomX, redLine.bottomY);
      });
      pop();
    }

    // Draw skull instances from Attack 5
    if (this.ultimateSkulls && this.ultimateSkulls.length > 0) {
      this.ultimateSkulls.forEach(skull => {
        if (skull.timer > 0) {
          skull.timer -= dt;
          push();
          translate(skull.x, skull.y);
          rotate(skull.rotation);
          scale(skull.scale);
          drawSprite(skull.type, 0, 0);
          pop();
        }
      });
    }
  }

  drawDihuiUltimateEffects() {
    // Draw the blue line at 144px above floor during joust phase
    if (this.ultimateLineDrawn && this.ultimateLineThickness > 0) {
      push();
      const lineColor = this.ultimateLineColor || [46, 116, 255];
      const lineY = this.ultimateLineY || (height - 100 - 144);
      const thickness = Math.max(0, this.ultimateLineThickness);
      const alpha = constrain(thickness / 8 * 255, 0, 255);
      
      stroke(lineColor[0], lineColor[1], lineColor[2], alpha);
      strokeWeight(thickness);
      
      // Draw from left edge to right edge of arena
      const margin = 100;
      line(margin, lineY, width - margin, lineY);
      pop();
    }
  }

  handleInput() {
    // Completely disable input if defeated
    if (this.isDefeated) {
      return;
    }
    
    if (this.isAI || !this.controls || !this.isPlayerControlled) {
      return;
    }
    
    // Disable player movement during ultimate
    if (this.ultimateActive) {
      return;
    }
    
    // AI properties should only be set in AI functions
    // this.ai.moveLeft = keyIsDown(this.controls.left.toUpperCase().charCodeAt(0));
    // this.ai.moveRight = keyIsDown(this.controls.right.toUpperCase().charCodeAt(0));
    // this.ai.moveUp = keyIsDown(this.controls.up.toUpperCase().charCodeAt(0));
    // this.ai.moveDown = keyIsDown(this.controls.down.toUpperCase().charCodeAt(0));
  }

  processKeyPressed(keyValue) {
    const keyLower = keyValue.toLowerCase();
    
    // Release slam hold position on any input
    if (this.slamHoldPosition) {
      this.slamHoldPosition = false;
      this.isSlamAttacking = false;
    }
    
    if (keyLower === this.controls.left) {
      this.remoteInput.left = true;
    }
    if (keyLower === this.controls.right) {
      this.remoteInput.right = true;
    }
    if (keyLower === this.controls.up) {
      this.remoteInput.up = true;
      this.jumpRequest = true;
    }
    if (keyLower === this.controls.down) {
      this.remoteInput.down = true;
      this.duckRequest = true;
      // Check if also attacking for slam attack
      if (this.attackRequest && !this.onGround()) {
        this.slamAttackRequested = true;
      }
    }
    if (keyLower === this.controls.attack) {
      this.requestAttack();
    }
    if (keyLower === this.controls.evade) {
      // Immediately start evade instead of setting a flag that requires processActions
      // (processActions is part of fighter.update() which is disabled in server-authoritative mode)
      const closestOpponent = this.getClosestOpponent();
      if (closestOpponent) {
        this.startEvade(closestOpponent);
      } else {
        this.startEvade();
      }
    }
    
    // Ultimate activation with X key (always available for testing)
    if (keyLower === 'x' && this.ultimateCanActivate && !this.ultimateActive) {
      this.ultimateActivationRequested = true;
    }
    
    // Call character-specific processKeyPressed method
    const character = CHARACTERS[this.characterKey];
    if (character && character.processKeyPressed) {
      character.processKeyPressed(keyValue, this);
    }
  }

  processKeyReleased(keyValue) {
    const keyLower = keyValue.toLowerCase();
    if (keyLower === this.controls.left) {
      this.remoteInput.left = false;
    }
    if (keyLower === this.controls.right) {
      this.remoteInput.right = false;
    }
    if (keyLower === this.controls.down) {
      this.remoteInput.down = false;
      this.duckRequest = false;
    }
    if (keyLower === this.controls.up) {
      this.remoteInput.up = false;
      this.jumpRequest = false;
    }
    if (keyLower === this.controls.attack) {
      this.releaseAttack(this.chargeAttack);
    }
  }

  requestAttack() {
    // Release slam hold position on any input
    if (this.slamHoldPosition) {
      this.slamHoldPosition = false;
      this.isSlamAttacking = false;
    }
    this.attackRequest = true;
  }

  releaseAttack(isCharged) {
    if (this.attackRequest) {
      this.attackRelease = true;
      this.chargeAttack = isCharged;
    }
  }

  requestGuard(opponent = null) {
    // Release slam hold position on any input
    if (this.slamHoldPosition) {
      this.slamHoldPosition = false;
      this.isSlamAttacking = false;
    }
    
    this.guardRequest = true;
    this.isGuarding = true;
    
    // AUTO-FACE DIRECTION: Face towards closest opponent
    // This ensures the guard animation faces the nearest threat
    const closestOpponent = this.getClosestOpponent();
    if (closestOpponent) {
      this.faceTowards(closestOpponent);
    }
  }

  releaseGuard() {
    this.guardRequest = false;
    this.isGuarding = false;
    this.isCountering = false;
  }

  requestEvade() {
    this.evadeRequested = true;
  }

  startEvade(opponent) {
    if (this.isEvading || this.evadeCooldown > 0) {
      return;
    }
    this.setEvadeState(0.22);
    // FACE TOWARDS CLOSEST OPPONENT: Face the closest opponent when evading
    // This ensures the evade animation faces the correct direction
    const closestOpponent = this.getClosestOpponent();
    if (closestOpponent) {
      this.faceTowards(closestOpponent);
    }
    // Move fighter backward by ~1 attack range (230px) to avoid incoming strikes
    // Velocity-based movement won't work because fighter.update() is disabled
    // in server-authoritative mode, so we apply position directly.
    const evadeDistance = 230;
    this.pos.x += -this.facing * evadeDistance;
    // Clamp to arena bounds
    this.pos.x = constrain(this.pos.x, 60, width - 60);
  }

  useTimeToHunt() {
    // This method is now handled by character profiles
    // Keeping for backward compatibility - but no longer calling processKeyPressed to avoid recursion
    // The actual Time to Hunt logic is in the character profile's processKeyPressed method
    // This method is kept for compatibility but should not be called directly
  }

  
  useDisposial() {
    // This method is now handled by character profiles
    // Keeping for backward compatibility - but no longer calling processKeyPressed to avoid recursion
    // The actual Disposial logic is in the character profile's processKeyPressed method
    // This method is kept for compatibility but should not be called directly
  }

  update(dt, opponents = null) {
    // Handle both single opponent (backward compatibility) and array of opponents
    const opponent = Array.isArray(opponents) ? (opponents.length > 0 ? opponents[0] : null) : opponents;
    
    // If defeated, keep in hurt state and skip all other updates
    if (this.isDefeated) {
      this.setState('hurt'); // Force hurt state
      this.vel.x = 0; // Prevent movement
      this.vel.y = 0;
      return; // Skip all other updates
    }
    
    // STEP 7: Unified update pipeline
    
    // Debug log to check if update is being called
    if (this.characterKey === 'DIHUI') {
      console.log(`[Deathedge] Fighter update called for DIHUI, deathedgeActive: ${this.deathedgeActive}`);
    }
    
    // 1. State synchronization
    this.syncState();
    
    // 2. Timer updates
    this.updateTimers(dt);
    
    // 3. Input handling
    this.handleInput();
    
    // 4. Movement system
    this.movementSystem.applyMovement(dt, opponent);
    this.movementSystem.applyGravity(dt, opponent);
    this.movementSystem.cleanupPosition(opponent);
    
    // 5. Attack system - handle multiple opponents
    this.updateAttackSystem(dt, opponents);
    
    // 6. Ultimate system
    this.updateUltimateSystem(dt, opponent);
    
    // 7. Status system
    this.statusSystem.applyStatuses(dt);
    
    // 7. Character-specific onUpdate
    const character = CHARACTERS[this.characterKey];
    if (character && character.onUpdate) {
      // Always call onUpdate for abilities like Deathedge that need to run in network mode
      character.onUpdate(dt, opponent, this);
    }
    
    // Update Installation Art for Callisto
    if (this.characterKey === 'CALLISTO' && this.installationArtActive) {
      const callistoCharacter = CHARACTERS['CALLISTO'];
      if (callistoCharacter && callistoCharacter.updateInstallationArt) {
        callistoCharacter.updateInstallationArt(this, dt);
      }
    }
    
    // 9. Sprite shake update
    this.updateSpriteShake(dt);
    
    // 10. Dash recharge
    this.applyDashRecharge(dt);
    
    // 11. State transitions
    this.updateStateTransitions();
    
    // 12. Visual updates
    this.updateVisuals(dt);
    
    // 13. AI controls
    if (this.isAI) {
      this.updateAIControls(opponent);
    }

    // 14. Process actions
    this.processActions(opponent, dt);
  }

  shouldRunLocalCharacterUpdate() {
    return !(
      (typeof gameMode !== 'undefined' && gameMode === 'multiplayer') ||
      (typeof cpuUsesServer !== 'undefined' && cpuUsesServer) ||
      (typeof Network !== 'undefined' && Network.isConnected)
    );
  }

  /**
   * ULTIMATE SYSTEM UPDATE: Handle ultimate activation and execution
   * Modified to target all enemies instead of just one opponent
   * @param {number} dt - Delta time for frame-independent updates
   * @param {Fighter} opponent - Primary opponent (for backward compatibility)
   */
  updateUltimateSystem(dt, opponent) {
    // Handle ultimate activation request
    if (this.ultimateActivationRequested && !this.ultimateActive) {
      // Emit ability request to server instead of executing locally
      if (typeof Network !== 'undefined' && Network.requestAbility) {
        Network.requestAbility('ultimate', opponent ? opponent.id : null);
      } else {
        // Fallback to local execution for development
        this.activateUltimate(opponent);
      }
      this.ultimateActivationRequested = false;
    }
    
    // Update active ultimate
    if (this.ultimateActive) {
      // Get all enemies for multi-target ultimate attacks
      const allFighters = window.allFighters || [];
      const allEnemies = allFighters.filter(f => f !== this && !f.isDefeated);
      
      // Execute character-specific ultimate logic with all enemies
      const character = CHARACTERS[this.characterKey];
      if (character && character.updateUltimate) {
        // Pass all enemies instead of single opponent for multi-target support
        character.updateUltimate(this, allEnemies, dt);
      }
      
      // End ultimate when timer reaches 0 and we're not in attack sequences
      // Dihui uses phases 0-7, so we need to exclude phase 5 (attack sequence)
      if (this.ultimateTimer <= 0 && this.ultimatePhase !== 2 && this.ultimatePhase !== 4 && 
          this.ultimatePhase !== 5 && this.ultimatePhase !== 6 && this.ultimatePhase !== 8 && this.ultimatePhase !== 10) {
        console.log('[ULTIMATE DEBUG] Ultimate ending, timer:', this.ultimateTimer, 'phase:', this.ultimatePhase);
        this.endUltimate();
      }
    }
  }

  /**
   * ACTIVATE ULTIMATE: Start ultimate attack targeting all enemies
   * Modified to affect all enemies in battle instead of just one opponent
   * @param {Fighter} opponent - Primary opponent (for backward compatibility)
   */
  activateUltimate(opponent) {
    if (this.ultimateActive) return;
    
    // Get all enemies for multi-target ultimate effects
    const allFighters = window.allFighters || [];
    const allEnemies = allFighters.filter(f => f !== this && !f.isDefeated);
    
    // Initialize ultimate state
    this.ultimateActive = true;
    this.ultimatePhase = 0;
    this.ultimateTimer = 999; // Will be set by character-specific logic
    this.ultimateDamageDealt = 0;
    this.ultimateTotalDamage = 0;
    this.ultimateCameraZoom = 1;
    this.ultimateBackgroundDim = 0;
    
    // Store all enemies reference for character-specific logic
    this.allEnemies = allEnemies;
    this.opponent = opponent; // Keep for backward compatibility
    
    // Set ultimate to cutscene state
    this.setState('ultimate');
    
    // Stagger all enemies during ultimate activation
    allEnemies.forEach(enemy => {
      enemy.setState('stagger'); // Enemy can't act during ultimate
      enemy.ultimateActive = false; // Ensure enemy isn't also in ultimate
    });
    
    console.log('[ULTIMATE DEBUG] Ultimate activated against', allEnemies.length, 'enemies, phase:', this.ultimatePhase, 'timer:', this.ultimateTimer);
    
    // Execute character-specific ultimate activation with all enemies
    const character = CHARACTERS[this.characterKey];
    if (character && character.activateUltimate) {
      character.activateUltimate(this, allEnemies);
    }
    
    // Emit ultimate activation event
    this.events.emit('ultimateActivated', {
      character: this.characterKey,
      targets: allEnemies.map(e => e.characterKey),
      targetCount: allEnemies.length
    });
  }

  endUltimate() {
    this.ultimateActive = false;
    this.ultimatePhase = 0;
    this.ultimateTimer = 0;
    this.ultimateCameraZoom = 1;
    this.ultimateBackgroundDim = 0;
    
    // Resume normal combat
    this.setState('idle');
    
    // Execute character-specific ultimate cleanup
    const character = CHARACTERS[this.characterKey];
    if (character && character.endUltimate) {
      character.endUltimate(this);
    }
    
    // Emit ultimate end event
    this.events.emit('ultimateEnded', {
      character: this.characterKey,
      totalDamage: this.ultimateTotalDamage
    });
  }

  // STEP 7: Unified update pipeline helper methods
  updateTimers(dt) {
    this.attackTimer = max(0, this.attackTimer - dt);
    this.evadeTimer = max(0, this.evadeTimer - dt);
    this.staggerTimer = max(0, this.staggerTimer - dt);
    this.staggerRecoveryTimer = max(0, this.staggerRecoveryTimer - dt);
    // comboTimer is now server-authoritative (applied via snapshot)
    this.hitCooldown = max(0, this.hitCooldown - dt);
    this.attackCounterTimer = max(0, this.attackCounterTimer - dt);
    this.staggeredDisplayTimer = max(0, this.staggeredDisplayTimer - dt);
    this.dialogueTimer = max(0, this.dialogueTimer - dt);
    
    // Reset dialogue when timer reaches 0
    if (this.dialogueTimer <= 0) {
      this.currentDialogue = '';
    }

    // Combo system is now fully server-authoritative (applied via snapshot)

    // Attack sequence system - preserve the current cycle step until the display timer expires
    if (this.attackCounterTimer <= 0 && this.attackCounter > 0) {
      this.attackCounter = 0;
    }
    
    // 🎨 Callisto slam buff duration management
    if (this.characterKey === 'CALLISTO' && this.slamBuffActive) {
      this.slamBuffTimer -= dt;
      if (this.slamBuffTimer <= 0) {
        // Restore original values
        this.attackRange = this.originalAttackRange || this.attackRange;
        this.attackInterval = this.originalAttackInterval || this.attackInterval;
        this.slamBuffActive = false;
        console.log('🎨 Callisto slam buffs expired!');
      }
    }
  }

  updateAttackSystem(dt, opponents) {
    // Handle both single opponent (backward compatibility) and array of opponents
    const opponent = Array.isArray(opponents) ? (opponents.length > 0 ? opponents[0] : null) : opponents;
    
    if (this.state === 'attack') {
      if (this.attackSequence > 0) {
        if (this.attackPhase && this.attackPhase !== 'none') {
          const attackKey = this.attackSequence === 1 ? 'light' : this.attackSequence === 2 ? 'medium' : 'heavy';
          const attackDef = CHARACTERS[this.characterKey]?.attacks?.[attackKey];

          if (attackDef) {
            this.attackFrameTimer += dt;

            if (this.attackPhase === 'startup' && this.attackFrameTimer >= attackDef.startup) {
              this.attackPhase = 'active';
              this.attackFrameTimer = 0;
              this.strikeActive = true;
            } else if (this.attackPhase === 'active' && this.attackFrameTimer >= attackDef.active) {
              this.attackPhase = 'recovery';
              this.attackFrameTimer = 0;
              this.strikeActive = false;
            } else if (this.attackPhase === 'recovery' && this.attackFrameTimer >= attackDef.recovery) {
              this.setState('idle');
              this.attackSequence = 0;
              this.attackPhase = 'none';
              this.attackFrame = 0;
              this.attackFrameTimer = 0;
              this.strikeActive = false;
            }
          }
        } else {
          // Legacy attack frame progression when no phase data is available
          this.attackFrameTimer += dt;

          if (this.attackFrameTimer >= this.attackFrameDuration) {
            this.attackFrameTimer = 0;
            this.attackFrame++;
            this.attackDamageDealt = false; // Reset damage flag for next frame

            // Check if sequence is complete
            if (this.attackSequence === 1 && this.attackFrame >= 4) { // Attack 1: 4 frames
              this.setState('idle');
              this.strikeActive = false;
              this.attackSequence = 0;
            } else if (this.attackSequence === 2 && this.attackFrame >= 4) { // Attack 2: 4 frames
              this.setState('idle');
              this.strikeActive = false;
              this.attackSequence = 0;
            } else if (this.attackSequence === 3 && this.attackFrame >= 4) { // Attack 3: 4 frames
              this.setState('idle');
              this.strikeActive = false;
              this.attackSequence = 0;
            }
          }
        }
      }

      // Handle attack timer expiration for non-sequence attacks
      if (this.state === 'attack' && this.attackTimer <= 0 && this.attackSequence === 0) {
        if (!this.attackHitResolved) {
          this.resolveAttackForMultipleOpponents(opponents);
        }
        // Add 1 second delay before allowing idle state transition
        this.attackTimer = 1.0; // Prevent immediate transition to idle
        this.setState('idle');
        this.strikeActive = false;
      }
    }

    // Deal damage during attack sequences when strike is active
    if (this.strikeActive && this.attackSequence > 0 && !this.attackHitResolved && this.attackTimer > 0) {
      this.resolveAttackForMultipleOpponents(opponents);
      this.attackHitResolved = true; // Set immediately to prevent timer expiration from resolving
    }
  }
  
  /**
   * MULTI-TARGET ATTACK RESOLUTION: Handle attacks that hit multiple opponents
   * Used by dash attacks and slam attacks to damage all targets in range
   * @param {Fighter|Fighter[]} opponents - Single opponent or array of opponents to check
   */
  resolveAttackForMultipleOpponents(opponents) {
    // Exit if no opponents provided
    if (!opponents) return;
    
    // Normalize input: ensure we have an array of targets
    // Handle both single opponent and array of opponents
    const targets = Array.isArray(opponents) ? opponents : [opponents];
    
    // Check each opponent for hit detection and apply damage if valid
    targets.forEach(target => {
      if (target) {
        // Use enhanced dash hit detection if this is a dash attack
        // Dash attacks get 50% increased range for more forgiving hit detection
        const canHit = (this.state === 'attack' && this.isDashing) ? 
          this.canDashHitTarget(target) : this.canHitTarget(target);
          
        // If target can be hit, apply damage through the attack system
        if (canHit) {
          this.attackSystem.resolveAttack(target);
        }
      }
    });
  }
  
  /**
   * STANDARD HIT DETECTION: Check if a target is within normal attack range
   * Used by regular attacks, guard actions, and most combat mechanics
   * @param {Fighter} target - The opponent to check range against
   * @returns {boolean} - True if target is within attack range
   */
  canHitTarget(target) {
    // Validate target: must exist and not be self
    if (!target || target === this) return false;
    
    // Calculate distance between this fighter and target
    const distance = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    // Check if distance is within this fighter's attack range
    return distance <= this.attackRange;
  }

  /**
   * RANGE CHECK: Check if a target is within this fighter's attack range
   * Used by guard, evade, and attack auto-facing to determine when to face the opponent
   * @param {Fighter} target - The opponent to check range against
   * @returns {boolean} - True if target is within attack range
   */
  isInAttackRange(target) {
    if (!target || target === this) return false;
    const distance = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    const range = this.attackRange > 0 ? this.attackRange : 231; // Default light attack range
    return distance <= range;
  }
  
  /**
   * ENHANCED DASH HIT DETECTION: Check if target is within dash attack range
   * Dash attacks get 50% increased range for more forgiving hit detection
   * This compensates for the high-speed movement of dash attacks
   * @param {Fighter} target - The opponent to check dash range against
   * @returns {boolean} - True if target is within enhanced dash range
   */
  canDashHitTarget(target) {
    // Validate target: must exist, not be self, and not be defeated
    if (!target || target === this || target.isDefeated) return false;
    
    // Calculate distance between this fighter and target
    const distance = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    // Dash attacks get 50% increased range for more forgiving hit detection
    const dashRange = this.attackRange * 1.5; // 50% increased range
    return distance <= dashRange;
  }

  updateStateTransitions() {
    // Exit slam state when hold or attack flags are cleared (by input or being hit)
    if (this.state === 'slam' && !this.slamHoldPosition && !this.isSlamAttacking) {
      this.setState('idle');
    }

    // Make stagger bar lower as visual timer during stagger period
    if (this.state === 'staggered') {
      if (this.staggerTimer > 0) {
        // During stagger phase, bar lowers from max to 0 over stagger duration
        this.stagger = map(this.staggerTimer, 0, this.staggerLength, 0, this.staggerThreshold);
      } else if (this.staggerRecoveryTimer > 0) {
        // During recovery phase, bar stays at 0
        this.stagger = 0;
      } else {
        // Start recovery timer when stagger timer ends
        if (this.staggerTimer <= 0 && this.staggerRecoveryTimer <= 0) {
          this.staggerRecoveryTimer = this.staggerLength; // 5 seconds recovery
        } else {
          // Full recovery - automatically exit staggered state and clear buildup
          this.setState('idle');
          this.stagger = 0; // Clear any remaining stagger buildup
        }
      }
    }

    // Don't auto-exit hurt state - player must act to exit

    if (this.isEvading && this.evadeTimer <= 0) {
      this.isEvading = false;
      this.setState('idle');
    }
  }


  updateVisuals(dt) {
    // Handle halt sequence timing
    if (this.haltSequence) {
      this.haltFrameTimer += dt;
      
      if (this.haltFrameTimer >= this.haltFrameDuration) {
        this.haltFrameTimer = 0;
        this.haltFrame++;
        
        // Check if halt sequence is complete
        if (this.haltFrame >= 3) { // halt1, halt2, idle
          this.haltSequence = false;
          this.haltFrame = 0;
        }
      }
    }

    // Update slash effects
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      const effect = this.slashEffects[i];
      effect.timer -= dt;
      
      if (effect.timer <= 0) {
        this.slashEffects.splice(i, 1);
      }
    }

    // Update sprite based on current state
    this.updateSprite(dt);
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
    
    // Completely disable all actions if opponent is in ultimate
    if (opponent && opponent.ultimateActive) {
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
    
    // AI completely disabled - enemy is mindless and non-reactive
    // All AI properties set to false to ensure truly passive behavior
    this.ai.moveLeft = false;
    this.ai.moveRight = false;
    this.ai.moveUp = false;
    this.ai.moveDown = false;
    this.ai.attack = false;
    this.ai.defend = false;
    
    // All AI behavior disabled - enemy is mindless and non-reactive
    this.ai.defend = false;
    
    // Dash attack disabled
    // if (absDistance < 100 && this.dashCharges > 0 && this.attackTimer <= 0 && random() < 0.03 && !this.ultimateActive && !opponent.ultimateActive) {
    //   this.startDash();
    // }
    
    // Regular attack disabled
    // Attack regardless of whether opponent is in front or behind
    // this.ai.attack = absDistance < 120 && this.attackTimer <= 0 && !opponentAttacking && opponent.state !== 'staggered' && random() < 0.05;
    
    // AI attack execution completely disabled
    // if (this.ai.attack && !this.attackRequest && !this.ultimateActive && this.state !== 'ultimate') {
    //   const distance = opponent.pos.x - this.pos.x;
    //   const inRange = abs(distance) < this.attackRange && abs(this.pos.y - opponent.pos.y) < 50;
    //   
    //   if (inRange) {
    //     // Turn to face opponent before attacking
    //       this.facing = distance > 0 ? 1 : -1;
    //     // Execute attack directly for AI (no need for request/release cycle)
    //       this.attackSystem.executeAttack(opponent);
    //   }
    // }
    
    // AI as human player controller - basic input handling
    if (this.ai.defend) {
      this.requestGuard(opponent);
    } else {
      this.releaseGuard();
    }
    
    // Basic AI input simulation for testing
    if (random() < 0.02) { // 2% chance to attack
      this.attackRelease = true;
    }
    if (random() < 0.01) { // 1% chance to dash
      this.startDash();
    }
  }

  applyMovement(dt, opponent) {
    if (
      this.state === 'hit' ||
      (this.state === 'staggered' && this.staggerTimer > 0) || // Only block during actual stagger phase
      this.ultimateActive // Completely disable movement during ultimate
    ) {
      return;
    }

    let moveDir = 0;
    
    // Only process AI movement if AI is enabled
    if (this.isAI) {
      if (this.ai.moveLeft) moveDir -= 1;
      if (this.ai.moveRight) moveDir += 1;
    } else if (this.isPlayerControlled) {
      if (this.isLocalPlayer) {
        // Local controlled fighters use actual keyboard state
        if (keyIsDown(this.controls.left.toUpperCase().charCodeAt(0))) moveDir -= 1;
        if (keyIsDown(this.controls.right.toUpperCase().charCodeAt(0))) moveDir += 1;
      } else {
        // Remote player-controlled fighters use networked input state
        if (this.remoteInput.left) moveDir -= 1;
        if (this.remoteInput.right) moveDir += 1;
      }
    }
    // If not AI and not player-controlled, don't move (for second player control later)

    if (moveDir !== 0) {
      this.facing = moveDir;
    }

    // Movement should work for both player and AI
    if (!this.isDashing) {
      this.vel.x = moveDir * this.speed;
    }

    if (this.duckRequest && this.onGround()) {
      this.setState('duck');
      this.isDucking = true;
      this.vel.x *= 0.7;
    } else {
      this.isDucking = false;
    }

    if (this.jumpRequest && this.onGround() && !this.isDucking) {
      // Game Target prevents jumping
      if (!this.hasStatus('Game Target')) {
        this.vel.y = this.jumpStrength;
        this.setState('jump');
      }
      this.jumpRequest = false;
    }

    if (this.isDashing) {
      this.dashDuration -= dt;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
        this.setState('idle'); // Reset dash state when dash ends
        
        // Start halt sequence when dash ends
        this.haltSequence = true;
        this.haltFrame = 0;
        this.haltFrameTimer = 0;
      }
      // DASH ATTACK TRIGGER: Check for dash attack opportunity during dash movement
      // Dash attacks trigger when any opponent is within 80 pixels during a dash
      if (!this.dashAttacked) {
        // Get all fighters from the global battle array for multi-target checking
        const allFighters = window.allFighters || [];
        // Filter out self and defeated players to get valid targets
        const targets = allFighters.filter(f => f !== this && !f.isDefeated);
        
        // Check if ANY opponent is within dash trigger range (80 pixels)
        // This ensures dash attacks can trigger regardless of which opponent is closest
        const hasTargetInRange = targets.some(f => abs(this.pos.x - f.pos.x) < 80);
        
        // If any opponent is in range, execute the dash attack
        if (hasTargetInRange) {
          // Execute dash attack with all valid targets (multi-target damage)
          this.executeDashAttack(targets);
          
          // Mark dash as executed to prevent multiple dash attacks in same dash
          this.dashAttacked = true;
          
          // Apply dash velocity (60 pixels/frame in facing direction)
          // This creates the high-speed movement characteristic of dash attacks
          this.vel.x = this.facing * 60;
          
          // Extend dash duration to ensure full dash attack animation plays
          this.dashDuration += 0.16;
        }
      }
    }

    if (this.isEvading) {
      const desiredGap = 120;
      const distance = abs(this.pos.x - opponent.pos.x);
      if (distance < desiredGap) {
        this.vel.x = -this.facing * 18;
      }
    }

    if (this.state === 'idle' || this.state === 'run') {
      if (moveDir === 0) {
        this.setState('idle');
      } else {
        this.setState('run');
      }
    }
  }

  applyGravity(dt, opponent) {
    if (!this.onGround()) {
      if (this.isSlamAttacking) {
        // Override gravity for slam attack - maintain high speed descent
        this.vel.y = 30;
      } else if (!this.ultimateGravityDisabled) {
        this.vel.y += GRAVITY;
      }
    }
    this.pos.add(this.vel);
    
    // Reset jump state to idle when landing
    if (this.state === 'jump' && this.onGround()) {
      this.setState('idle');
    }
    
    // Check for slam attack landing
    if (this.isSlamAttacking && this.onGround()) {
      this.onSlamLanding(opponent);
    }
  }

  cleanupPosition(opponent) {
    this.pos.x = constrain(this.pos.x, 60, width - 60);
    if (this.pos.y >= this.spawnY) {
      this.pos.y = this.spawnY;
      this.vel.y = 0;
    }
    
    // Check hitbox collision with opponent and push back if overlapping
    const myBox = { x: this.pos.x - 25, y: this.pos.y - 72, w: 50, h: 144 };
    const oppBox = { x: opponent.pos.x - 25, y: opponent.pos.y - 72, w: 50, h: 144 };
    
    // Only check horizontal overlap to allow jumping over enemies
    const horizontalOverlap = !(myBox.x + myBox.w < oppBox.x || oppBox.x + oppBox.w < myBox.x);
    
    if (horizontalOverlap) {
      // Only apply collision if both fighters are on the ground or at similar heights
      const heightDifference = abs(this.pos.y - opponent.pos.y);
      if (heightDifference < 40) { // Allow jumping over when height difference is significant
        // Push back based on which side we're on
        if (this.pos.x < opponent.pos.x) {
          this.pos.x = opponent.pos.x - 25 - 25 - 5; // Left of opponent
        } else {
          this.pos.x = opponent.pos.x + 25 + 25 + 5; // Right of opponent
        }
      }
    }
  }

  processActions(opponent, dt) {
    // Completely disable all actions if defeated
    if (this.isDefeated) {
      return;
    }
    
    // Only block actions during actual stagger phase, not recovery phase
    if (this.state === 'staggered' && this.staggerTimer > 0) {
      return;
    }
    
    // Completely disable all actions if opponent is in ultimate
    if (opponent && opponent.ultimateActive) {
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
        this.attackSystem.executeAttack(opponent);
      }
      this.attackRequest = false;
      this.attackRelease = false;
    }

    if (this.isGuarding && this.state !== 'staggered') {
      this.setState('guard');
      // AI defend property should only be set in AI functions
    }
    
    // Cancel guard when attack is requested
    if (this.attackRequest && this.isGuarding) {
      this.releaseGuard();
    }

  }

  applyDashRecharge(dt) {
    if (this.dashCharges >= 3) {
      this.dashTimer = 0;
      return;
    }
    this.dashTimer += dt;
    while (this.dashTimer >= this.dashCooldown && this.dashCharges < 3) {
      this.dashCharges += 1;
      this.dashTimer -= this.dashCooldown;
    }
  }

  startDash() {
    if (this.dashCharges <= 0 || this.isDashing || !this.onGround() || this.ultimateActive) {
      return;
    }
    // Game Target prevents dashing
    if (this.hasStatus('Game Target')) {
      return;
    }
    this.dashCharges -= 1;
    this.isDashing = true;
    this.setState('dash');
    this.vel.x = this.facing * 60;
    this.dashDuration = 0.2;
    this.dashAttacked = false;
  }

  executeAttack(opponent) {
    // Prevent attacks during ultimate
    if (this.ultimateActive || this.state === 'ultimate') {
      return;
    }

    // Update attack sequence counter for 1-3 rotation. Charged attacks always use the heavy sequence.
    if (this.chargeAttack) {
      this.attackCounter = 3;
    } else {
      this.attackCounter = (this.attackCounter % 3) + 1;
    }
    this.attackSequence = this.attackCounter;
    this.attackPhase = 'startup';
    this.attackFrame = 0;
    this.attackFrameTimer = 0;
    
    // Combo is handled when the attack actually lands (in addCombo)
    this.attackDamageDealt = false;
    this.attackFrameDuration = 0.2;
    
    const attackType = this.chargeAttack ? 'heavy' : 'light';
    this.state = 'attack';
    this.attackTimer = this.attackInterval;
    this.attackHitResolved = false;
    this.statusEffectsApplied = false;
    this.slashEffectsSpawned = false;
    this.lastSlashSpawnFrame = null;
    this.lastAttackHit = false;
    this.strikeActive = false; // Activate strike during the active phase

    // Valencina's charged attack mechanics
    if (this.characterKey === 'VALENCINA' && this.chargeAttack) {
      // Use 1 acceleration round when charged
      if (this.accelerationRounds < this.maxAccelerationRounds) {
        this.accelerationRounds++;
        this.isCharged = true;
        
        // Gain 4 poise count and potency
        this.statusSystem.addStatus('Poise', 4, 4);
        
        // Trigger tremor burst
        const tremorStatus = this.statuses.find((s) => s.type === 'Tremor');
        if (tremorStatus && tremorStatus.count > 0) {
          // Deal damage based on burn + tremor potency / 2
          const burnStatus = this.statuses.find((s) => s.type === 'Burn');
          const damage = (burnStatus?.potency || 0 + tremorStatus.potency) / 2;
          this.requestDamageTo(opponent, damage, 0, { source: 'tremorBurst' });
          spawnDamageNumber(damage, opponent.pos.copy(), this.facing, false, 'tremor', false, 'slam');
          
          // Tremor bursts are impactful - add screen shake
          if (typeof addScreenShake === 'function' && damage > 0) {
            addScreenShake(damage);
          }
        }
      }
    }

    // AUTO-FACE DIRECTION: Face towards closest opponent when attacking
    // This ensures the attack animation faces the nearest target
    const closestOpponent = this.getClosestOpponent();
    if (closestOpponent) {
      this.faceTowards(closestOpponent);
    }
    
    // Emit attackStarted event
    this.events.emit('attackStarted', {
      attacker: this.characterKey,
      target: opponent.characterKey,
      attackType: this.chargeAttack ? 'heavy' : 'light',
      damage: this.attackDamage
    });
    
    // Consume Bleed status when attacking
    this.statusSystem.consumeOnAttack();
    
    // Base attack damage and range
    this.attackDamage = attackType === 'heavy' ? this.baseDamage * 2 : this.baseDamage;
    this.attackRange = attackType === 'heavy' ? 294 : 231; // 50% increase: 196→294, 154→231
    this.attackKnockback = attackType === 'heavy' ? 18 * 0.5 : 12 * 0.5; // 50% knockback
    
    // Valencina's acceleration round bonuses
    if (this.characterKey === 'VALENCINA') {
      // +30% damage (150% against shields)
      this.attackDamage *= 1.3;
      // Range +100%
      this.attackRange *= 2.0;
    }
  }

  /**
   * DASH ATTACK EXECUTION: Perform a high-speed dash attack that hits multiple opponents
   * Dash attacks are unparrieable, do enhanced damage, and hit all targets in extended range
   * @param {Fighter[]} targets - Array of all valid opponents to potentially hit
   */
  executeDashAttack(targets) {
    // Prevent attacks during ultimate (can't dash while ultimate is active)
    if (this.ultimateActive || this.state === 'ultimate') {
      return;
    }
    
    // Set up dash attack state and properties
    this.state = 'attack';           // Enter attack state for animation and damage
    this.strikeActive = true;         // Enable strike detection for damage application
    this.attackTimer = this.attackInterval; // Reset attack timer for sequence timing
    this.attackHitResolved = false;  // Track whether damage has been applied
    this.statusEffectsApplied = false; // Track status effect application
    this.slashEffectsSpawned = false;  // Track visual effect spawning
    this.lastSlashSpawnFrame = null;
    this.lastAttackHit = false;       // Track if this attack hit (for combo system)

    // Auto-face towards closest opponent when dash attacking
    // This ensures the dash attack animation faces the right direction
    const closestOpponent = this.getClosestOpponent();
    if (closestOpponent) {
      this.faceTowards(closestOpponent);
    }
    
    // Dash attacks deal 1.5x normal damage for high-impact strikes
    this.attackDamage = this.baseDamage * 1.5;
    // Dash attacks have 40% increased range (120→168 pixels) for better hit detection
    this.attackRange = 168;
    // Dash attacks apply moderate knockback to opponents
    this.attackKnockback = 15;

    // Set flag for post-dash attack sprite (special animation after dash completes)
    this.usePostDashSprite = true;

    // Spawn visual joust slash effect for dash attack
    // Positioned slightly above the fighter for visual impact
    if (this.characterKey === 'CALLISTO') {
      this.spawnSlashEffect('cjs1', { x: 0, y: -10 });
    } else {
      this.spawnSlashEffect('js1', { x: 0, y: -10 });
    }

    // Immediately resolve the attack since dash attacks are instant damage
    // Use multi-target system to hit all opponents within enhanced range
    this.resolveAttackForMultipleOpponents(targets);
  }

  executeSlamAttack(opponent) {
    // Only usable in mid-air
    if (this.onGround()) return;
    
    // Cancel guard state when starting slam attack
    this.releaseGuard();
    
    this.isSlamAttacking = true;
    this.state = 'slam';
    this.vel.y = 30; // High speed downward movement
    this.vel.x = 0;
    
    // Set up landing hitbox (AOE area)
    this.slamLandingHitbox = {
      x: this.pos.x,
      y: this.spawnY, // Ground level
      radius: SLAM_ATTACK_RADIUS, // AOE radius
      damage: this.baseDamage * 2, // Base damage
      staggerDamage: 0 // Will be calculated on landing
    };
  }

  onSlamLanding(opponent) {
    if (!this.slamLandingHitbox) return;
    
    // Spawn debris particles at slam landing point
    spawnSlamDebris(this.slamLandingHitbox.x, this.slamLandingHitbox.y, 12);
    
    // Get all fighters for multi-target AOE damage
    const allFighters = window.allFighters || [];
    const targets = allFighters.filter(f => f !== this && !f.isDefeated);
    
    let hitAnyTarget = false;
    
    // Apply AOE damage to all opponents within range
    targets.forEach(target => {
      const distance = dist(target.pos.x, target.pos.y, this.slamLandingHitbox.x, this.slamLandingHitbox.y);
      if (distance <= this.slamLandingHitbox.radius) {
        // Calculate final damage with 50% bonus stagger damage
        const finalDamage = this.calculateDamage(this.slamLandingHitbox.damage, target);
        const staggerDamage = finalDamage * 0.5; // 50% of damage as stagger
        // Request authoritative hit on target
        this.requestDamageTo(target, finalDamage, 20, { type: 'slam' });
        // Request authoritative stagger application (server-side should decide)
        this.requestApplyStatus(target, { type: 'Stagger', potency: staggerDamage, duration: 1 });
        spawnDamageNumber(finalDamage, target.pos.copy(), this.facing, false, 'normal', false, 'slam');
        
        hitAnyTarget = true;
      }
    });
    
    // Ground slams build attack sequence counter (1-3 rotation) if any target was hit
    if (hitAnyTarget) {
      this.attackCounter = (this.attackCounter % 3) + 1;
      this.attackCounterDisplay = this.attackCounter;
      this.attackCounterTimer = 1.0; // Show for 1 second
    }
    
    // Hold slam position until input detected
    this.slamHoldPosition = true;
    this.state = 'slam';
    this.slamLandingHitbox = null;
    
    // Spawn character-specific slash effect for slam attack
    if (this.characterKey === 'CALLISTO') {
      this.spawnSlashEffect('cs1s1', { x: 0, y: -10 });
    } else {
      this.spawnSlashEffect('s2s2', { x: 0, y: -10 });
    }
  }

  /**
   * ATTACK RESOLUTION: Apply damage to an opponent when attack connects
   * This is the core damage application function called by all attack types
   * @param {Fighter} opponent - The opponent to apply damage to
   */
  resolveAttack(opponent) {
    // Don't resolve if strike is not active (attack not in damage phase)
    if (!this.strikeActive) {
      return;
    }

    // Use enhanced range for dash attacks, standard range for other attacks
    // Dash attacks get 50% increased range for more forgiving hit detection
    const attackRange = (this.state === 'attack' && this.isDashing) ? 
      this.attackRange * 1.5 : this.attackRange;

    // Check if opponent is within attack range using collision detection
    // calcAttackBox creates the hitbox, hitOpponent checks collision
    if (this.hitOpponent(opponent, this.calcAttackBox(attackRange))) {
      // Calculate final damage after all modifiers (resistance, critical, etc.)
      const finalDamage = this.calculateDamage(this.attackDamage, opponent);
      
      // Emit attackHit event for game systems (combos, sound effects, etc.)
      this.events.emit('attackHit', {
        attacker: this.characterKey,
        target: opponent.characterKey,
        damage: finalDamage,
        knockback: this.attackKnockback
      });
      
      // Request authoritative damage application (client emits intent)
      this.requestDamageTo(opponent, finalDamage, this.attackKnockback, { attackSequence: this.attackSequence });
      
      // Special character interaction: Valencina's tremor burst on 3rd attack
      // This is character-specific logic that triggers on certain attack counts
      if (this.characterKey === 'VALENCINA' && this.attackCounter === 3) {
        opponent.triggerTremorBurst();
      }
      
      // Call character-specific onSuccessfulHit method for additional effects
      // This allows characters to have unique behaviors when they land hits
      this.onSuccessfulHit(finalDamage, opponent);
      
      // Mark attack as resolved to prevent duplicate damage
      // Only set when damage actually lands (not just when attack starts)
      this.attackHitResolved = true;
    }
  }

  calcAttackBox(range) {
    const x = this.pos.x + this.facing * (range / 2);
    const y = this.pos.y - 56;
    return { x, y, w: range, h: 140 };
  }

  hitOpponent(opponent, box) {
    // EVADE CHECK: If the opponent is in evade state, attacks miss them
    // Evade grants brief invulnerability by moving the fighter out of harm's way
    if (opponent.isEvading || opponent.state === 'evade') {
      return false;
    }
    const playerBox = { x: opponent.pos.x - 25, y: opponent.pos.y - 72, w: 50, h: 144 };
    const attackBox = { x: box.x - box.w / 2, y: box.y, w: box.w, h: box.h };
    return this.rectOverlap(playerBox, attackBox) && opponent.hitCooldown <= 0;
  }

  rectOverlap(r1, r2) {
    return !(r1.x + r1.w < r2.x || r2.x + r2.w < r1.x || r1.y + r1.h < r2.y || r2.y + r2.h < r1.y);
  }



  calculateDamage(base, opponent) {
    let damage = base;
    
    // Scale with combo counter
    damage += this.combo * 2;
    
    // 3-hit combo system: 100%, 100%, 200% damage
    if (this.attackCounter === 3) {
      damage *= 2.0; // 200% damage on third hit
    }
    
    if (this.chargeAttack) {
      damage *= 1.4;
    }
    if (this.hasStatus('Poise')) {
      damage *= 1.15;
    }
    if (opponent.state === 'staggered') {
      damage *= 2;
    }
    return damage;
  }

  receiveHit(amount, attacker, knockback) {
    // Convert immediate hit resolution into a networked request/event.
    if (this.isDefeated) return;

    // Clear slam state when hit by an outside influence
    if (this.state === 'slam' || this.isSlamAttacking || this.slamHoldPosition) {
      this.isSlamAttacking = false;
      this.slamHoldPosition = false;
      this.slamLandingHitbox = null;
      this.setState('hurt');
    }

    // Local guard/evade handling remains visual, but actual HP reduction is authoritative
    if (this.isGuarding) {
      amount *= 0.45;
      spawnGuardSparks(this.pos.x, this.pos.y - 30, 8);
      if (this.isCountering) {
        // Request counter damage on attacker
        if (attacker && attacker.requestSelfDamage) {
          attacker.requestSelfDamage(amount * 0.8, { source: 'counter', from: this.playerId || this.characterKey });
        }
        this.isCountering = false;
      }
    }

    if (this.isEvading) {
      spawnEvadeIndicator(this.pos.copy());
      return;
    }

    if (this.ultimateProtected) {
      this.setState('hit');
      this.hitCooldown = 0.25;
      const awayFromAttacker = attacker ? (this.pos.x < attacker.pos.x ? -1 : 1) : -1;
      this.vel.x = awayFromAttacker * (knockback || 0) * 0.5;
      this.vel.y = -5;
      return;
    }

    // Send a request to authoritative resolver (server or local simulator)
    const ev = {
      type: 'REQUEST_HIT',
      attackerId: attacker ? (attacker.playerId || attacker.characterKey) : null,
      targetId: this.playerId || this.characterKey,
      damage: amount,
      knockback: knockback || 0
    };
    if (typeof Network !== 'undefined' && Network.sendEvent) {
      Network.sendEvent(ev);
    } else if (window.LocalSimulator) {
      window.LocalSimulator.enqueue(ev);
    }
  }
  
  defeat() {
    this.isDefeated = true;
    this.vel.x = 0;
    this.vel.y = 0;
    
    // Force switch to hurt sprite if available
    const character = CHARACTERS[this.characterKey];
    if (character && character.sprites && character.sprites.hurt) {
      this.currentSprite = 'hurt';
    } else {
      this.setState('hurt'); // Fallback to hurt state
    }
    
    // Clear all action states
    this.isGuarding = false;
    this.isCountering = false;
    this.isEvading = false;
    this.attackRequest = false;
    this.attackRelease = false;
    this.guardRequest = false;
    this.evadeRequested = false;
    this.slamAttackRequested = false;
    this.isSlamAttacking = false;
    this.strikeActive = false;
    this.ultimateActive = false;
    
    // Disable collision for defeated players
    this.hasCollision = false;
    
    // Disable AI aggression
    this.isAI = false;
    
    // Emit defeat event
    this.events.emit('defeated', {
      character: this.characterKey,
      name: this.name
    });
  }
  
  isDead() {
    return this.isDefeated;
  }
  
  /**
   * HELPER FUNCTION: Find the closest opponent for facing direction
   * Used by attack and guard actions to face the nearest threat
   * @returns {Fighter|null} - Closest non-defeated opponent or null if none found
   */
  getClosestOpponent() {
    // Get all fighters from the global battle array
    const allFighters = window.allFighters || [];
    // Filter out self and defeated players to get valid opponents
    const opponents = allFighters.filter(f => f !== this && !f.isDefeated);
    
    // If no valid opponents, return null
    if (opponents.length === 0) return null;
    
    // Start with the first opponent as the closest
    let closest = opponents[0];
    // Calculate initial distance to this opponent
    let minDistance = dist(this.pos.x, this.pos.y, closest.pos.x, closest.pos.y);
    
    // Check all other opponents to find the closest one
    for (let i = 1; i < opponents.length; i++) {
      const distance = dist(this.pos.x, this.pos.y, opponents[i].pos.x, opponents[i].pos.y);
      // If this opponent is closer, update the closest
      if (distance < minDistance) {
        minDistance = distance;
        closest = opponents[i];
      }
    }
    
    return closest;
  }
  
  /**
   * HELPER FUNCTION: Set facing direction towards a specific target
   * Used by all actions that need to face a particular opponent
   * @param {Fighter} target - The opponent to face towards
   */
  faceTowards(target) {
    // Don't try to face if no target provided
    if (!target) return;
    
    // Set facing direction based on target's relative position
    // If target is to the right (x > this.x), face right (1), else face left (-1)
    this.facing = target.pos.x > this.pos.x ? 1 : -1;
  }

    onParry(attacker) {
    if (this.parryCount <= 0) return false; // Cannot parry if no parries left
    const attackerRight = attacker.pos.x > this.pos.x;
    this.state = 'parry';
    attacker.state = 'parried';
    attacker.vel.x = attackerRight ? 12 : -12;
    this.vel.x = attackerRight ? -10 : 10;
    attacker.strikeActive = false;
    this.strikeActive = false;
    attacker.parryWindow = 0;
    this.parryWindow = 0;
    attacker.hitCooldown = 0.15;
    this.hitCooldown = 0.15;
    this.parryIndicator = 0.35;
    attacker.parryIndicator = 0.35;
    this.attackTimer = this.attackInterval;
    attacker.attackTimer = attacker.attackInterval;
    // Combo is now server-authoritative; parry combo penalty handled server-side
    // Only the defender (parrier) loses parry count, not the attacker
    this.parryCount -= 1;
    attacker.parryStunTimer = 0.2;
    this.parryStunTimer = 0.2;
    
    // Emit parryOccurred event
    this.events.emit('parryOccurred', {
      defender: this.characterKey,
      attacker: attacker.characterKey,
      successful: true
    });
    
    return true;
}

calculateDamage(base, opponent) {
  let damage = base;
  
  // Scale with combo counter
  damage += this.combo * 2;
  
  // 3-hit combo system: 100%, 100%, 200% damage
  if (this.attackCounter === 3) {
    damage *= 2.0; // 200% damage on third hit
  }
  
  if (this.chargeAttack) {
    damage *= 1.4;
  }
  if (this.hasStatus('Poise')) {
    damage *= 1.15;
  }
  if (opponent && opponent.state === 'staggered') {
    damage *= 2;
  }
  
  // 🎨 Callisto's Artwork: Tibia bonus (+10% damage per stack)
  if (this.characterKey === 'CALLISTO' && this.artworkTibiaStacks > 0) {
    const artworkBonus = 1 + (this.artworkTibiaStacks * 0.1);
    damage *= artworkBonus;
  }
  
  // Fragile: Take 10% more damage per stack
  if (opponent && opponent.hasStatus('Fragile')) {
    const fragileStatus = opponent.statuses.find(s => s.type === 'Fragile');
    if (fragileStatus) {
      const fragileMultiplier = 1 + (0.1 * fragileStatus.potency);
      damage *= fragileMultiplier;
    }
  }
  
  // Protection: Take 10% less damage per stack
  if (opponent && opponent.hasStatus('Protection')) {
    const protectionStatus = opponent.statuses.find(s => s.type === 'Protection');
    if (protectionStatus) {
      const protectionMultiplier = 1 - (0.1 * protectionStatus.potency);
      damage *= protectionMultiplier;
    }
  }
  
  return damage;
}


onSuccessfulHit(damage, opponent) {
  this.lastAttackHit = true;
  // Combo is now server-authoritative; comboTimer set via snapshot
  
  if (this.parryTimer <= 0 && this.parryCount < 3) {
    this.parryCount += 1;
    this.parryTimer = 10;
  }
  
  // Call character-specific onSuccessfulHit method only once per attack
  if (!this.statusEffectsApplied) {
    this.statusEffectsApplied = true;
    const character = CHARACTERS[this.characterKey];
    if (character && character.onSuccessfulHit) {
      character.onSuccessfulHit(damage, opponent, this);
    }
    
    // 🎨 Apply Callisto's Artwork: Tibia bleed bonus after onSuccessfulHit
    if (this.characterKey === 'CALLISTO' && character && character.applyArtworkBleedBonus) {
      character.applyArtworkBleedBonus(opponent, this);
    }
  }
}

addCombo(attacker) {
  // Combo is now fully server-authoritative.
  // This method is kept as a no-op for compatibility with existing call sites.
  // Server increments combo via engine.addCombo() on confirmed hits,
  // and the client receives the authoritative value through snapshots.
}

  hasStatus(type) {
    return this.statuses.some((status) => status.type === type);
  }

  addStatus(type, count, potency) {
    // No-op: server applies statuses authoritatively.
    // Client receives statuses through snapshot replication.
  }

  consumeStatus(type) {
    // No-op: server consumes statuses authoritatively.
  }

  removeStatus(type) {
    // No-op: server removes statuses authoritatively.
  }

  consumeStatusOnHit() {
    // No-op: server handles status consumption on hit authoritatively.
  }

  consumeStatusOnAttack() {
    // No-op: server handles bleed consumption on attack authoritatively.
  }

  consumeStatusOnAbility() {
    // No-op: server handles bleed consumption on ability use authoritatively.
  }

  applyStatuses(dt) {
    // No-op: server processes all status ticks, decay, and consumption authoritatively.
    // Client receives authoritative status state through snapshot replication.
  }

  drawStatusEffects() {
    if (this.statuses.length === 0) return;
    
    const baseY = this.pos.y + 10;
    const rowLimit = 7;
    const cellWidth = 48;
    
    // Calculate total rows needed
    const totalRows = Math.ceil(this.statuses.length / rowLimit);
    
    for (let row = 0; row < totalRows; row++) {
      const startIndex = row * rowLimit;
      const endIndex = Math.min(startIndex + rowLimit, this.statuses.length);
      const rowStatuses = this.statuses.slice(startIndex, endIndex);
      
      // Center the row
      const rowWidth = rowStatuses.length * cellWidth;
      const startX = this.pos.x - rowWidth * 0.5;
      
      rowStatuses.forEach((status, colIndex) => {
        const x = startX + colIndex * cellWidth;
        const y = baseY + row * 24;
        
        push();
        textAlign(CENTER, CENTER);
        
        // Draw status potency on left, closer to icon
        fill(255);
        textSize(8);
        textAlign(LEFT, CENTER);
        text(status.potency, x - 15, y+80);
        
        // Draw status icon from atlas (50% bigger = 21px)
        drawStatusIcon(status.type, x, y+80, 21);
        
        // Draw status count on right, closer to icon
        fill(255);
        textSize(8);
        textAlign(RIGHT, CENTER);
        text(status.count, x + 15, y+80);
        pop();
      });
    }
  }


  onGround() {
    return this.pos.y >= this.spawnY - 0.01;
  }

  drawWorldHpBar() {
    // if (!this.isAI) return;
    // const barWidth = 120;
    // const x = this.pos.x;
    // const y = this.pos.y - 90;
    // push();
    // rectMode(CENTER);
    
    // // HP Bar background
    // fill(0, 180);
    // rect(x, y, barWidth, 18, 8);
    
    // // HP Bar fill
    // fill('#42d492');
    // rect(x - barWidth / 2 + (barWidth * (this.hp / this.maxHp)) / 2, y, barWidth * (this.hp / this.maxHp), 10, 5);
    
    // // Stagger Bar background (below HP bar)
    // fill(0, 180);
    // rect(x, y + 16, barWidth, 10, 6);
    
    // // Stagger Bar fill (red/orange gradient)
    // const staggerPercent = constrain(this.stagger / this.staggerThreshold, 0, 1);
    // if (staggerPercent > 0) {
    //   fill(255, 100 + staggerPercent * 50, 50);
    //   rect(x - barWidth / 2 + (barWidth * staggerPercent) / 2, y + 16, barWidth * staggerPercent, 6, 4);
    // }
    
    // fill(255);
    // textSize(14);
    // textAlign(CENTER, BOTTOM);
    // text(this.name, x, y - 10);
    
    // // Draw parry charges
    // for (let i = 0; i < 3; i++) {
    //   fill(i < this.parryCount ? '#ffff00' : '#333');
    //   ellipse(x - 15 + i * 12, y + 15, 6, 6);
    // }
    // pop();
  }

  draw() {
    this.updateSprite();
    push();
    translate(this.pos.x + this.spriteShakeX, this.pos.y + this.spriteShakeY);
    
    // Debug: Show current sprite name
    if (this.characterKey === 'VALENCINA') {
      push();
      fill(255);
      textAlign(CENTER);
      text(this.currentSprite || 'null', 0, -100);
      pop();
    }
    
    // Draw sprite if available, otherwise draw default character
    if (this.spriteType === 'atlas' && this.currentSprite) {
      push();

      // Flip atlas sprites based on facing direction
      // (ultimateForceLeftFacing removed - use fighter.facing for dynamic direction)
      // For Dihui ultimate sprites, invert the flip to face opposite direction
      if (this.characterKey === 'DIHUI' && this.ultimateActive) {
        scale(this.facing === 1 ? 1 : -1, 1); // Invert flip for ultimate
      } else {
        scale(this.facing === 1 ? -1 : 1, 1);
      }

      // Debug missing sprite
      const spriteInfo = SPRITES?.[this.currentSprite];
      if (!spriteInfo) {
        console.warn("Missing sprite:", this.currentSprite);
      } else {
        // 512px reference height → 144px character height
        const scaleFactor = 144 / 512;

        // Align feet to hitbox bottom
        // Hitbox bottom is at this.pos.y + 72, so feet should be at y = 72
        const hitboxBottomY = 72;
        drawSpriteScaled(this.currentSprite, 0, hitboxBottomY, scaleFactor);
      }
      pop();
    } else if (this.sprite && this.sprite.width > 0) {
      // Regular sprite loading
      push();
      scale(this.facing, 1);
      imageMode(CENTER);
      
      // Calculate scale to make sprite 2x as big (144 pixels) while maintaining proportions
      const targetHeight = 144;
      const scaleFactor = targetHeight / this.sprite.height;
      const scaledWidth = this.sprite.width * scaleFactor;
      
      image(this.sprite, 0, 0, scaledWidth, targetHeight);
      pop();
    } else {
      fill(this.color);
      noStroke();
      ellipse(0, 0, 50, 144);
      fill(30);
      rectMode(CENTER);
      rect(this.facing * 20, -42, 20, 6, 4);
    }
    if (this.isGuarding) {
      stroke('#90ee90');
      strokeWeight(3);
      noFill();
      ellipse(0, 0, 72, 168);
    }
    if (this.state === 'attack' && this.attackTimer > 0) {
      const progress = constrain(this.attackTimer / this.attackInterval, 0, 1);
      push();
      noFill();
      stroke(255, 220, 80, 180);
      strokeWeight(3);
      ellipse(0, -40, 46 + (1 - progress) * 26, 18 + (1 - progress) * 12);
      strokeWeight(2);
      arc(0, -40, 38, 14, PI, PI + progress * PI);
      pop();
    }
    if (this.state === 'attack') {
      stroke('#ffd24d');
      strokeWeight(4);
      line(this.facing * 22, -20, this.facing * 70, -30);
    }
    if (this.state === 'evade') {
      fill('#8a8a8a');
      ellipse(0, -10, 12, 12);
    }
    pop();
    
    // Draw slash effects
    this.drawSlashEffects(0.016); // Assuming 60 FPS
    
    this.drawWorldHpBar();
    this.drawStatusEffects();

    // Draw player hitbox
    stroke(0, 255, 0);
noFill();
rect(this.pos.x - 25, this.pos.y - 36, 50, 72);

// Draw Installation Art range and hitbox for Callisto
    if (this.characterKey === 'CALLISTO' && this.installationArtActive) {
      this.drawInstallationArtRange();
    }
    
    // Draw Time to Hunt range and hitbox for Valencina
    if (this.characterKey === 'VALENCINA' && this.lastHitOpponent && this.lastHitOpponent.gameTimeTarget) {
      this.drawTimeToHuntRange();
    }
  }

  // Draw Time to Hunt range and hitbox
  drawTimeToHuntRange() {
    const targetRange = 200; // Time to Hunt target range
    
    push();
    
    // Draw target indicator on affected enemy
    if (this.lastHitOpponent && this.lastHitOpponent.gameTimeTarget) {
      const target = this.lastHitOpponent;
      
      // Draw targeting circle around affected enemy
      stroke(255, 100, 255, 150); // Purple with transparency
      strokeWeight(3);
      noFill();
      ellipse(target.pos.x, target.pos.y - 30, 80, 80);
      
      // Draw targeting lines
      stroke(255, 100, 255, 100);
      strokeWeight(2);
      const time = Date.now() / 1000;
      for (let i = 0; i < 4; i++) {
        const angle = (time * 2 + i * PI/2) % (PI * 2);
        const x1 = target.pos.x + cos(angle) * 40;
        const y1 = target.pos.y - 30 + sin(angle) * 40;
        const x2 = target.pos.x + cos(angle) * 50;
        const y2 = target.pos.y - 30 + sin(angle) * 50;
        line(x1, y1, x2, y2);
      }
      
      // Draw Game Target status text
      fill(255, 100, 255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(12);
      text("GAME TARGET", target.pos.x, target.pos.y - 70);
    }
    
    pop();
  }

  // Draw Installation Art range and hitbox
  drawInstallationArtRange() {
    const attackRange = 300; // Same range as hitbox check (2x radius)
    
    push();
    
    // Draw range circle (ground-based)
    stroke(255, 200, 100, 100); // Orange with transparency
    strokeWeight(2);
    noFill();
    ellipse(this.pos.x, this.spawnY, attackRange * 2);
    
    // Draw hitbox during execution phase
    if (this.installationArtTimer <= 0 && this.installationArtExecuted) {
      // Draw attack hitbox
      stroke(255, 100, 100, 150); // Red with transparency
      strokeWeight(3);
      fill(255, 100, 100, 50); // Light red fill
      ellipse(this.pos.x, this.spawnY, attackRange * 2);
      
      // Draw attack direction indicator
      stroke(255, 200, 100, 200);
      strokeWeight(4);
      const facing = this.facing || 1;
      line(this.pos.x, this.spawnY, this.pos.x + facing * attackRange, this.spawnY);
    }
    
    pop();
  }

  // Draw visual overlays and status indicators
  drawOverlays() {
    // Draw slam attack landing hitbox
    if (this.isSlamAttacking && this.slamLandingHitbox) {
      push();
      stroke(255, 100, 255, 150);
      strokeWeight(3);
      noFill();
      ellipse(this.slamLandingHitbox.x, this.slamLandingHitbox.y, this.slamLandingHitbox.radius * 2);
      pop();
    }

    // Draw attack cycle debug display
    if (this.attackCounterTimer > 0 && this.attackCounterDisplay > 0) {
      push();
      textAlign(CENTER, CENTER);
      textSize(24);
      fill(255, 255, 100, map(this.attackCounterTimer, 0, 1, 0, 255));
      stroke(0, map(this.attackCounterTimer, 0, 1, 0, 255));
      strokeWeight(2);
      text(`Attack Cycle ${this.attackCounterDisplay}/3`, this.pos.x, this.pos.y - 100);
      pop();
    }

    // Draw staggered display
    if (this.staggeredDisplayTimer > 0 && this.staggeredDisplay > 0) {
      push();
      textAlign(CENTER, CENTER);
      textSize(28);
      fill(255, 100, 100, map(this.staggeredDisplayTimer, 0, 2, 0, 255));
      stroke(0, map(this.staggeredDisplayTimer, 0, 2, 0, 255));
      strokeWeight(3);
      text('STAGGERED', this.pos.x, this.pos.y - 130);
      pop();
    }

    // Draw stagger phase timer
    if (this.state === 'staggered' && this.staggerTimer > 0) {
      push();
      textAlign(CENTER, CENTER);
      textSize(20);
      fill(255, 150, 150, 255);
      stroke(0, 255);
      strokeWeight(2);
      const timeLeft = this.staggerTimer.toFixed(1);
      text(`Stagger: ${timeLeft}s`, this.pos.x, this.pos.y - 100);
      pop();
    }

    // Draw recovery phase timer
    if (this.state === 'staggered' && this.staggerTimer <= 0 && this.staggerRecoveryTimer > 0) {
      push();
      textAlign(CENTER, CENTER);
      textSize(20);
      fill(150, 150, 255, 255);
      stroke(0, 255);
      strokeWeight(2);
      const timeLeft = this.staggerRecoveryTimer.toFixed(1);
      text(`Recovery: ${timeLeft}s`, this.pos.x, this.pos.y - 100);
      pop();
    }

    // Draw stagger buildup progress
    if (this.stagger > 0 && this.stagger < this.staggerThreshold && this.state !== 'staggered') {
      push();
      textAlign(CENTER, CENTER);
      textSize(16);
      const progress = (this.stagger / this.staggerThreshold * 100).toFixed(0);
      fill(255, 200, 100, 200);
      stroke(0, 200);
      strokeWeight(1);
      text(`Buildup: ${progress}%`, this.pos.x, this.pos.y - 70);
      pop();
    }

    // Draw stagger immunity indicator
    if (this.state === 'staggered') {
      push();
      textAlign(CENTER, CENTER);
      textSize(14);
      fill(255, 255, 100, 200);
      stroke(0, 200);
      strokeWeight(1);
      text('IMMUNE', this.pos.x, this.pos.y - 40);
      pop();
    }
    
    // Draw dialogue for Valencina
    if (this.characterKey === 'VALENCINA' && this.currentDialogue) {
      push();
      textAlign(CENTER, CENTER);
      textSize(8);
      fill(255, 255, 255, map(this.dialogueTimer, 0, 10, 0, 255));
      stroke(0, map(this.dialogueTimer, 0, 10, 0, 255));
      strokeWeight(1);
      text(this.currentDialogue, this.pos.x, this.pos.y - 160);
      pop();
    }
  }

  // STEP 8: Server readiness layer - deterministic state snapshot
  getStateSnapshot() {
    return {
      // Position and velocity
      position: {
        x: this.pos.x,
        y: this.pos.y
      },
      velocity: {
        x: this.vel.x,
        y: this.vel.y
      },
      
      // Health and combat state
      hp: this.hp,
      state: this.state,
      facing: this.facing,
      
      // Active statuses
      statuses: this.statuses.map(status => ({
        type: status.type,
        count: status.count,
        potency: status.potency,
        timer: status.timer
      })),
      
      // Attack state
      attackState: {
        attackTimer: this.attackTimer,
        attackSequence: this.attackSequence,
        attackPhase: this.attackPhase,
        attackFrame: this.attackFrame,
        strikeActive: this.strikeActive,
        attackDamage: this.attackDamage,
        attackRange: this.attackRange,
        attackKnockback: this.attackKnockback,
        chargeAttack: this.chargeAttack
      },
      
      // Movement state
      movementState: {
        isDashing: this.isDashing,
        isEvading: this.isEvading,
        isGuarding: this.isGuarding,
        isGrounded: this.isGrounded
      },
      
      // Timers and cooldowns
      timers: {
        evadeTimer: this.evadeTimer,
        staggerTimer: this.staggerTimer,
        staggerRecoveryTimer: this.staggerRecoveryTimer,
        comboTimer: this.comboTimer,
        hitCooldown: this.hitCooldown,
        attackCounterTimer: this.attackCounterTimer
      },
      
      // Combat stats
      combatStats: {
        combo: this.combo,
        attackCounter: this.attackCounter,
        stagger: this.stagger
      },
      
      // Character identification
      characterKey: this.characterKey,
      isAI: this.isAI
    };
  }

  applyStateSnapshot(snapshot) {
    // Position and velocity
    // If Deathedge has teleported the fighter, preserve the teleport position
    // (server doesn't teleport, so snapshot position is stale)
    if (!(this.deathedgeActive && this.deathedgeTeleported && this.deathedgeTeleportPosition)) {
      this.pos.x = snapshot.position.x;
      this.pos.y = snapshot.position.y;
    }
    this.vel.x = snapshot.velocity.x;
    this.vel.y = snapshot.velocity.y;
    
    // Health and combat state
    this.hp = snapshot.hp;
    this.state = snapshot.state;
    this.facing = snapshot.facing;
    
    // Active statuses
    this.statuses = snapshot.statuses.map(status => ({
      type: status.type,
      count: status.count,
      potency: status.potency,
      timer: status.timer
    }));
    
    // Attack state
    this.attackTimer = snapshot.attackState.attackTimer;
    this.attackSequence = snapshot.attackState.attackSequence;
    this.attackPhase = snapshot.attackState.attackPhase || 'none';
    this.attackFrame = snapshot.attackState.attackFrame;
    this.strikeActive = snapshot.attackState.strikeActive;
    this.attackDamage = snapshot.attackState.attackDamage;
    this.attackRange = snapshot.attackState.attackRange;
    this.attackKnockback = snapshot.attackState.attackKnockback;
    this.chargeAttack = snapshot.attackState.chargeAttack;
    
    // Movement state
    this.isDashing = snapshot.movementState.isDashing;
    this.isEvading = snapshot.movementState.isEvading;
    this.isGuarding = snapshot.movementState.isGuarding;
    this.isGrounded = snapshot.movementState.isGrounded;

    // Slam visual hold (server can request client to hold slam sprite after landing)
    this.slamHoldPosition = snapshot.slamHold || false;
    
    // Timers and cooldowns
    this.evadeTimer = snapshot.timers.evadeTimer;
    this.staggerTimer = snapshot.timers.staggerTimer;
    this.staggerRecoveryTimer = snapshot.timers.staggerRecoveryTimer;
    this.comboTimer = snapshot.timers.comboTimer;
    this.hitCooldown = snapshot.timers.hitCooldown;
    this.attackCounterTimer = snapshot.timers.attackCounterTimer;
    
    // Combat stats
    this.combo = snapshot.combatStats.combo;
    this.attackCounter = snapshot.combatStats.attackCounter;
    this.stagger = snapshot.combatStats.stagger;
    
    // Sync stateMachine to match restored state
    this.syncState();
  }

  // Sprite shake functions
  updateSpriteShake(dt) {
    if (this.spriteShakeIntensity > 0) {
      let decayRate;
      
      if (this.isUltimateSpriteShake) {
        // Ultimate attacks: slower decay rate (longer duration)
        decayRate = this.spriteShakeIntensity > 10 ? 0.06 : 0.032;
      } else {
        // Regular attacks: 1.5x longer duration (slower decay rate)
        decayRate = this.spriteShakeIntensity > 10 ? 0.08 : 0.043;
      }
      
      this.spriteShakeIntensity -= decayRate;
      
      if (this.spriteShakeIntensity <= 0) {
        this.spriteShakeIntensity = 0;
        this.spriteShakeX = 0;
        this.spriteShakeY = 0;
        this.isUltimateSpriteShake = false;
      } else {
        // Generate random shake offset based on intensity
        const maxShake = min(this.spriteShakeIntensity, 15); // Cap at 15 pixels for clarity
        this.spriteShakeX = random(-maxShake, maxShake);
        this.spriteShakeY = random(-maxShake, maxShake);
      }
    }
  }

  addSpriteShake(damage, isUltimate = false) {
    let shakeAmount;
    
    if (isUltimate) {
      // Ultimate attacks: capped at 30 damage
      // 5 damage = 0.5 shake, 30 damage = 6 shake (max)
      const cappedDamage = min(damage, 30);
      shakeAmount = map(cappedDamage, 5, 30, 0.5, 6, true);
      this.isUltimateSpriteShake = true;
    } else {
      // Regular attacks: capped at 30 damage
      // 5 damage = 0.2 shake, 30 damage = 2.4 shake (max)
      const cappedDamage = min(damage, 30);
      shakeAmount = map(cappedDamage, 5, 30, 0.2, 2.4, true);
      this.isUltimateSpriteShake = false;
    }
    
    // Replace current shake if new shake is stronger, otherwise keep current
    if (shakeAmount > this.spriteShakeIntensity) {
      this.spriteShakeIntensity = min(shakeAmount, 20); // Cap at 20 for clarity
      // Update shake type if this is a stronger shake
      if (isUltimate) {
        this.isUltimateSpriteShake = true;
      }
    }
    // If new shake is weaker, don't change current intensity
  }

  triggerTremorBurst() {
    const tremorStatus = this.statuses.find((s) => s.type === 'Tremor');
    if (!tremorStatus || tremorStatus.count <= 0) return;
    
    // Show tremor visual indicator
    if (typeof spawnTremorIndicator === 'function') {
      spawnTremorIndicator(this.pos.copy());
    }
    
    // Lose 1 count
    tremorStatus.count -= 1;
    if (tremorStatus.count <= 0) {
      this.statuses = this.statuses.filter((s) => s.type !== 'Tremor');
    }
    
    // Apply tremor burst damage (Burn + Tremor potency)
    const burnStatus = this.statuses.find((s) => s.type === 'Burn');
    const burnPotency = burnStatus ? burnStatus.potency : 0;
    const tremorPotency = tremorStatus.potency;
    const damage = burnPotency + tremorPotency;
    
    if (damage > 0) {
      this.requestSelfDamage(damage, { source: 'TremorBurst' });
      spawnDamageNumber(damage, this.pos.copy(), 1, false, 'tremor', false, 'status');
      
      // Tremor bursts are impactful - add screen shake
      if (typeof addScreenShake === 'function') {
        addScreenShake(damage);
      }
      this.addSpriteShake(damage, false);
    }
  }
}
