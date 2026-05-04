class Fighter {
  constructor(isAI = false, name = 'Enemy', characterKey = null) {
    this.isAI = isAI;
    this.name = name;
    // Safe character selection with fallback
    const fallbackCharacter = (typeof currentCharacter !== 'undefined' ? currentCharacter : 'JOHN');
    this.characterKey = characterKey || (isAI ? 'JOHN' : fallbackCharacter);
    
    // Get character stats from roster
    let character = CHARACTERS[this.characterKey];
    
    // Safety check in case character is not found
    if (!character) {
      console.error("Invalid characterKey:", this.characterKey);
      this.characterKey = 'JOHN';
      character = CHARACTERS[this.characterKey];
    }
    
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
    this.staggerRecoveryTimer = 0;
    this.stagger = 0;
    this.staggerTimer = 0;
    this.staggeredDisplay = 0;
    this.staggeredDisplayTimer = 0;
    this.color = isAI ? '#e74c3c' : character.color;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.16;
    this.dashCooldown = 3;
    this.stagger = 0;
    
    // Sprite shake properties
    this.spriteShakeX = 0;
    this.spriteShakeY = 0;
    this.spriteShakeIntensity = 0;
    this.isUltimateSpriteShake = false;

    this.controls = {};
    this.reset();
  }

  reset() {
    this.setState('idle');
    this.attackTimer = 0;
    this.attackDamage = 0;
    this.attackKnockback = 0;
    this.attackRange = 0;
    this.attackHitResolved = false;
    this.statusEffectsApplied = false;
    this.slashEffectsSpawned = false;
    
    // Ultimate system properties
    this.ultimateActive = false;
    this.ultimatePhase = 0;
    this.ultimateTimer = 0;
    this.ultimateDamageDealt = 0;
    this.ultimateTotalDamage = 0;
    this.ultimateCameraZoom = 1;
    this.ultimateBackgroundDim = 0;
    this.ultimateName = "";
    this.ultimateDialogue = "";
    this.ultimateCanActivate = true; // Always available for testing
    
    // Reset sprite shake
    this.spriteShakeX = 0;
    this.spriteShakeY = 0;
    this.spriteShakeIntensity = 0;
    this.isUltimateSpriteShake = false;
    this.ultimateActivationRequested = false;
    
    // STEP 1: Isolate state management - create stateMachine object
    this.stateMachine = {
      state: 'idle',
      attackTimer: 0,
      attackSequence: 0,
      attackFrame: 0,
      attackFrameTimer: 0,
      staggerTimer: 0,
      staggerRecoveryTimer: 0,
      evadeTimer: 0
    };
    
    // Initialize attackSequence and attackFrame variables for compatibility
    this.attackSequence = 0;
    this.attackFrame = 0;
    this.attackFrameTimer = 0;
    this.kbResist = 0.08;
    this.dashCharges = 3;
    this.staggerRecovery = 0; // Disabled stagger recovery
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
    this.attackRequest = false;
    this.attackRelease = false;
    this.guardRequest = false;
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
      attack: false,
      defend: false,
      evade: false,
    };
    
    // STEP 3: Create attack system subsystem
    this.attackSystem = {
      executeAttack: (opponent, ignoreParry = false) => this.executeAttack(opponent, ignoreParry),
      resolveAttack: (opponent) => this.resolveAttack(opponent),
      updateAttackSequence: () => this.updateAttackSequence(),
      resetAttack: () => this.resetAttack()
    };
    
    // STEP 4: Create status system subsystem
    this.statusSystem = {
      addStatus: (type, count, potency) => this.addStatus(type, count, potency),
      removeStatus: (type) => this.removeStatus(type),
      consumeOnHit: () => this.consumeStatusOnHit(),
      consumeOnAttack: () => this.consumeStatusOnAttack(),
      applyStatuses: (dt) => this.applyStatuses(dt)
    };
    
    // STEP 5: Create event emission layer (SERVER PREP)
    this.events = {
      emit: (eventName, data) => {
        // Local logging for now - future server sync
        console.log(`[EVENT] ${eventName}:`, data);
      }
    };
    
    // STEP 6: Create movement system subsystem (SEPARATE PHYSICS)
    this.movementSystem = {
      applyMovement: (dt, opponent) => this.applyMovement(dt, opponent),
      applyGravity: (dt, opponent) => this.applyGravity(dt, opponent),
      cleanupPosition: (opponent) => this.cleanupPosition(opponent)
    };
    
    // Call syncState to initialize stateMachine values
    this.syncState();
    
    // Initialize character-specific properties including controls
    this.initializeCharacter();
  }

  // STEP 2: Centralize state changes - helper methods (NO LOGIC CHANGE)
  setState(newState) {
    this.state = newState;
    if (this.stateMachine) {
      this.stateMachine.state = newState;
    }
  }

  setAttackState(sequence, frame) {
    this.state = 'attack';
    this.attackSequence = sequence;
    this.attackFrame = frame;
    this.attackFrameTimer = 0;
    
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
    
    // Set controls for player
    if (!this.isAI) {
      this.controls = {
        left: 'a',
        right: 'd',
        up: 'w',
        down: 's',
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
      this.currentSprite = character.defaultSprite || 'idle';
    }
    
    // Initialize dash sprite properties
    this.usePostDashSprite = false;
    
    // Initialize slam attack properties
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

  updateSprite() {
    // Skip sprite updates during ultimate - ultimate controls its own sprites
    if (this.ultimateActive) {
      return;
    }
    
    // State to sprite mapping
    const stateMap = {
      idle: 'idle',
      run: 'moving',
      jump: 's4f3',
      attack: 'prepat',
      guard: 'guard',
      dash: 'joust',
      evade: 'evade',
      hit: 'hurt',
      staggered: 'hurt',
      duck: 'idle',
      ultimate: 'dist1' // Use dist1 sprite for ultimate state
    };

    // Handle special states
    if (this.isSlamAttacking) {
      this.currentSprite = 's4f4'; // Keep s4f4 for character sprite
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
    } else if (this.haltSequence) {
      // Handle halt sequence
      this.updateHaltSequence();
    } else if (this.usePostDashSprite && !this.isDashing) {
      // Reset post-dash sprite when dash ends
      this.usePostDashSprite = false;
      this.currentSprite = stateMap[this.state] || 'idle';
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
        
        // Spawn slash effects on specific frames (only once per frame)
        if (this.attackFrame === 1 && !this.slashEffectsSpawned) {
          this.spawnSlashEffect('s1s1', { x: 0, y: -10 });
          this.spawnSlashEffect('s1s2', { x: 15, y: -5 });
          this.slashEffectsSpawned = true;
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
        
        // Spawn slash effects on specific frames (only once per frame)
        if (this.attackFrame === 0 && !this.slashEffectsSpawned) {
          this.spawnSlashEffect('s1s3', { x: 0, y: -10 });
          this.slashEffectsSpawned = true;
        }
        
        // Deal damage on damage frames
        if (damageFrames[this.attackFrame] && !this.attackDamageDealt) {
          this.dealAttackDamage();
          this.attackDamageDealt = true;
        }
      }
    }
    // Attack 3 sequence: s3f1 > s3f2 > s3f3 (0.5s hold)
    else if (this.attackSequence === 3) {
      const sequence = ['s3f1', 's3f2', 's3f3'];
      const damageFrames = [false, true, false]; // s3f2 deals damage
      const holdTimes = [0.2, 0.2, 0.5]; // s3f3 holds for 0.5s
      
      if (this.attackFrame < sequence.length) {
        this.currentSprite = sequence[this.attackFrame];
        
        // Spawn slash effects on specific frames (only once per frame)
        if (this.attackFrame === 1 && !this.slashEffectsSpawned) {
          this.spawnSlashEffect('s1s4', { x: 0, y: -10 });
          this.slashEffectsSpawned = true;
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

  updateHaltSequence() {
    // Halt sequence: halt1 > halt2 > idle
    const sequence = ['halt1', 'halt2', 'idle'];
    
    if (this.haltFrame < sequence.length) {
      this.currentSprite = sequence[this.haltFrame];
    }
  }

  spawnSlashEffect(slashType, targetOffset = null) {
    // Spawn slash effect that shares character position and fades out slowly
    const effect = {
      type: slashType,
      pos: this.pos.copy(),
      facing: this.facing,
      timer: 0.8, // Fade out over 0.8 seconds (slower, more visible fade)
      targetOffset: targetOffset,
      owner: this
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

      push();

      const owner = effect.owner;
      
      // Translate to character position first
      translate(owner.pos.x, owner.pos.y);
      
      // Apply same flipping as character sprites
      if (owner.spriteType === 'atlas') {
        scale(owner.facing === 1 ? -1 : 1, 1);
      } else {
        scale(owner.facing, 1);
      }
      
      // Apply target offset
      const offsetX = effect.targetOffset?.x || 0;
      const offsetY = effect.targetOffset?.y || 0;
      
      // Apply same scaling as character sprites
      if (owner.spriteType === 'atlas') {
        // Use same scale factor as character (144/512)
        const scaleFactor = 144 / 512;
        
        // Calculate alpha and color tint based on timer
        const alpha = map(effect.timer, 0, 0.8, 0, 255); // 0.8 second fade time
        const fadeProgress = map(effect.timer, 0.8, 0, 0, 1); // 0 = start, 1 = end
        
        // Interpolate color from original (255, 200, 100) to target (255, 82, 111)
        const startR = 255, startG = 200, startB = 100;
        const targetR = 255, targetG = 82, targetB = 111;
        
        const r = lerp(startR, targetR, fadeProgress);
        const g = lerp(startG, targetG, fadeProgress);
        const b = lerp(startB, targetB, fadeProgress);
        
        // Try to draw sprite with proper scaling and color tint
        const spriteInfo = SPRITES?.[effect.type];
        if (spriteInfo) {
          // Apply alpha and color tint globally for sprite rendering
          push();
          tint(r, g, b, alpha); // Apply color and alpha tint
          drawSpriteScaled(effect.type, offsetX, offsetY + 50, scaleFactor); 
          pop();
        } else {
          // Fallback: draw scaled slash effect with proper alpha and color tint
          push();
          scale(scaleFactor);
          stroke(r, g, b, alpha);
          strokeWeight(4);
          line(-30 + offsetX, -15 + offsetY + 50, 30 + offsetX, 15 + offsetY + 50);
          stroke(255, 255, 255, alpha * 0.8);
          strokeWeight(2);
          line(-25 + offsetX, -10 + offsetY + 50, 25 + offsetX, 10 + offsetY + 50);
          
          fill(r, g, b, alpha * 0.6);
          noStroke();
          ellipse(offsetX, offsetY + 50, 15, 15);
          pop();
        }
      } else {
        // Regular sprite scaling
        const targetHeight = 144;
        const scaleFactor = targetHeight / (owner.sprite?.height || 512);
        
        // Calculate alpha and color tint based on timer
        const alpha = map(effect.timer, 0, 0.8, 0, 255); // 0.8 second fade time
        const fadeProgress = map(effect.timer, 0.8, 0, 0, 1); // 0 = start, 1 = end
        
        // Interpolate color from original (255, 200, 100) to target (255, 82, 111)
        const startR = 255, startG = 200, startB = 100;
        const targetR = 255, targetG = 82, targetB = 111;
        
        const r = lerp(startR, targetR, fadeProgress);
        const g = lerp(startG, targetG, fadeProgress);
        const b = lerp(startB, targetB, fadeProgress);
        
        // Try to draw sprite with proper scaling and color tint
        const spriteInfo = SPRITES?.[effect.type];
        if (spriteInfo) {
          // Apply alpha and color tint globally for sprite rendering
          push();
          tint(r, g, b, alpha); // Apply color and alpha tint
          drawSpriteScaled(effect.type, offsetX, offsetY - 30, scaleFactor);
          pop();
        } else {
          // Fallback: draw scaled slash effect with proper alpha and color tint
          push();
          scale(scaleFactor);
          stroke(r, g, b, alpha);
          strokeWeight(4);
          line(-30 + offsetX, -15 + offsetY, 30 + offsetX, 15 + offsetY);
          stroke(255, 255, 255, alpha * 0.8);
          strokeWeight(2);
          line(-25 + offsetX, -10 + offsetY, 25 + offsetX, 10 + offsetY);
          
          fill(r, g, b, alpha * 0.6);
          noStroke();
          ellipse(offsetX, offsetY, 15, 15);
          pop();
        }
      }
      
      pop();
    }
  }

  handleInput() {
    if (this.isAI || !this.controls) {
      return;
    }
    
    // Disable player movement during ultimate
    if (this.ultimateActive) {
      this.ai.moveLeft = false;
      this.ai.moveRight = false;
      this.ai.moveUp = false;
      this.ai.moveDown = false;
      return;
    }
    
    this.ai.moveLeft = keyIsDown(this.controls.left.toUpperCase().charCodeAt(0));
    this.ai.moveRight = keyIsDown(this.controls.right.toUpperCase().charCodeAt(0));
    this.ai.moveUp = keyIsDown(this.controls.up.toUpperCase().charCodeAt(0));
    this.ai.moveDown = keyIsDown(this.controls.down.toUpperCase().charCodeAt(0));
  }

  processKeyPressed(keyValue) {
    const keyLower = keyValue.toLowerCase();
    
    // Release slam hold position on any input
    if (this.slamHoldPosition) {
      this.slamHoldPosition = false;
      this.isSlamAttacking = false;
      this.setState('idle');
    }
    
    if (keyLower === this.controls.up) {
      this.jumpRequest = true;
    }
    if (keyLower === this.controls.down) {
      this.duckRequest = true;
      // Check if also attacking for slam attack
      if (this.attackRequest && !this.onGround()) {
        this.slamAttackRequested = true;
      }
    }
    if (keyLower === this.controls.evade) {
      this.requestEvade();
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
    if (keyLower === this.controls.down) {
      this.duckRequest = false;
    }
    if (keyLower === this.controls.up) {
      this.jumpRequest = false;
    }
  }

  requestAttack() {
    // Release slam hold position on any input
    if (this.slamHoldPosition) {
      this.slamHoldPosition = false;
      this.isSlamAttacking = false;
      this.setState('idle');
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
      this.setState('idle');
    }
    
    this.guardRequest = true;
    this.isGuarding = true;
    
    // Auto-face towards opponent if they're attacking and within range
    if (opponent && opponent.strikeActive && abs(this.pos.x - opponent.pos.x) < opponent.attackRange + 100) {
      this.facing = opponent.pos.x > this.pos.x ? 1 : -1;
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
    if (this.evadeTimer > 0 || this.isEvading) {
      return;
    }
    this.setEvadeState(0.22);
    this.facing = opponent.pos.x > this.pos.x ? 1 : -1;
    this.vel.x = -this.facing * 18;
    this.vel.y = -3;
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

  update(dt, opponent) {
    // STEP 7: Unified update pipeline
    
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
    
    // 5. Attack system
    this.updateAttackSystem(dt, opponent);
    
    // 6. Ultimate system
    this.updateUltimateSystem(dt, opponent);
    
    // 7. Status system
    this.statusSystem.applyStatuses(dt);
    
    // 8. Sprite shake update
    this.updateSpriteShake(dt);
    
    // 9. Dash recharge
    this.applyDashRecharge(dt);
    
    // 8. State transitions
    this.updateStateTransitions();
    
    // 9. Visual updates
    this.updateVisuals(dt);
    
    // 10. AI controls
    if (this.isAI) {
      this.updateAIControls(opponent);
    }
    
    // 11. Process actions
    this.processActions(opponent, dt);
  }

  // Ultimate system methods
  updateUltimateSystem(dt, opponent) {
    // Handle ultimate activation request
    if (this.ultimateActivationRequested && !this.ultimateActive) {
      this.activateUltimate(opponent);
      this.ultimateActivationRequested = false;
    }
    
    // Update active ultimate
    if (this.ultimateActive) {
      // Execute character-specific ultimate logic
      const character = CHARACTERS[this.characterKey];
      if (character && character.updateUltimate) {
        character.updateUltimate(this, opponent, dt);
      }
      
      // End ultimate when timer reaches 0 and we're not in attack sequences
      if (this.ultimateTimer <= 0 && this.ultimatePhase !== 2 && this.ultimatePhase !== 4 && 
          this.ultimatePhase !== 6 && this.ultimatePhase !== 8 && this.ultimatePhase !== 10) {
        console.log('[ULTIMATE DEBUG] Ultimate ending, timer:', this.ultimateTimer, 'phase:', this.ultimatePhase);
        this.endUltimate();
      }
    }
  }

  activateUltimate(opponent) {
    if (!opponent || this.ultimateActive) return;
    
    // Initialize ultimate state
    this.ultimateActive = true;
    this.ultimatePhase = 0;
    this.ultimateTimer = 999; // Will be set by character-specific logic
    this.ultimateDamageDealt = 0;
    this.ultimateTotalDamage = 0;
    this.ultimateCameraZoom = 1;
    this.ultimateBackgroundDim = 0;
    
    // Store opponent reference for character-specific logic
    this.opponent = opponent;
    
    // Set ultimate to cutscene state
    this.setState('ultimate');
    opponent.setState('stagger'); // Enemy can't act during ultimate
    opponent.ultimateActive = false; // Ensure opponent isn't also in ultimate
    
    console.log('[ULTIMATE DEBUG] Ultimate activated, phase:', this.ultimatePhase, 'timer:', this.ultimateTimer);
    
    // Execute character-specific ultimate activation
    const character = CHARACTERS[this.characterKey];
    if (character && character.activateUltimate) {
      character.activateUltimate(this, opponent);
    }
    
    // Emit ultimate activation event
    this.events.emit('ultimateActivated', {
      character: this.characterKey,
      target: opponent.characterKey
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
    this.comboTimer = max(0, this.comboTimer - dt);
    this.hitCooldown = max(0, this.hitCooldown - dt);
    this.attackCounterTimer = max(0, this.attackCounterTimer - dt);
    this.staggeredDisplayTimer = max(0, this.staggeredDisplayTimer - dt);
    this.dialogueTimer = max(0, this.dialogueTimer - dt);
    
    // Reset dialogue when timer reaches 0
    if (this.dialogueTimer <= 0) {
      this.currentDialogue = '';
    }

    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.attackCounter = 0; // Reset attack counter when combo times out
    }

    // Reset attack counter after 3 hits or timeout
    if (this.attackCounter >= 3) {
      this.attackCounter = 0; // Reset after completing 3-hit combo
    }
  }

  updateAttackSystem(dt, opponent) {
    if (this.state === 'attack') {
      // Handle attack sequence frame timing
      if (this.attackSequence > 0) {
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
          } else if (this.attackSequence === 3 && this.attackFrame >= 3) { // Attack 3: 3 frames
            this.setState('idle');
            this.strikeActive = false;
            this.attackSequence = 0;
          }
        }
      }
      
      // Handle attack timer expiration for non-sequence attacks
      if (this.state === 'attack' && this.attackTimer <= 0) {
        if (!this.attackHitResolved) {
          this.attackSystem.resolveAttack(opponent);
        }
        // Add 1 second delay before allowing idle state transition
        this.attackTimer = 1.0; // Prevent immediate transition to idle
        this.setState('idle');
        this.strikeActive = false;
      }
    }

    // Deal damage during attack sequences when strike is active
    // Only resolve if not already resolved by timer expiration
    if (this.strikeActive && this.attackSequence > 0 && !this.attackHitResolved && this.attackTimer > 0) {
      this.attackSystem.resolveAttack(opponent);
    }
  }

  updateStateTransitions() {
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
    this.updateSprite();
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
    
    // Basic movement
    this.ai.moveLeft = distance < -80;
    this.ai.moveRight = distance > 80;
    this.ai.moveUp = random() < 0.003 && absDistance < 220;
    this.ai.moveDown = false;
    
    // Check if opponent is about to attack
    const opponentAttacking = opponent.strikeActive;
    const opponentInRange = absDistance < 150;
    
    // Block when opponent is in attack range
    if (opponentInRange) {
      this.ai.defend = random() < 0.03;
    } else {
      this.ai.defend = false;
    }
    
    // Dash attack when in close range
    if (absDistance < 100 && this.dashCharges > 0 && this.attackTimer <= 0 && random() < 0.03) {
      this.startDash();
    }
    
    // Regular attack when in range and not on cooldown and opponent is not staggered
    // Attack regardless of whether opponent is in front or behind
    this.ai.attack = absDistance < 120 && this.attackTimer <= 0 && !opponentAttacking && opponent.state !== 'staggered' && random() < 0.05;
    
    if (this.ai.attack && !this.attackRequest && !this.ultimateActive && this.state !== 'ultimate') {
      const distance = opponent.pos.x - this.pos.x;
      const inRange = abs(distance) < this.attackRange && abs(this.pos.y - opponent.pos.y) < 50;
      
      if (inRange) {
        // Turn to face opponent before attacking
        this.facing = distance > 0 ? 1 : -1;
        // Execute attack directly for AI (no need for request/release cycle)
        this.attackSystem.executeAttack(opponent);
      }
    }
    
    if (this.ai.defend) {
      this.requestGuard(opponent);
    } else {
      this.releaseGuard();
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
    if (this.ai.moveLeft) moveDir -= 1;
    if (this.ai.moveRight) moveDir += 1;

    if (moveDir !== 0) {
      this.facing = moveDir;
    }

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
      this.vel.y = this.jumpStrength;
      this.setState('jump');
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
      // Dash attack: move in and strike, then dash through enemy.
      if (!this.dashAttacked && abs(this.pos.x - opponent.pos.x) < 80) {
        this.executeDashAttack(opponent);
        this.dashAttacked = true;
        this.vel.x = this.facing * 60;
        this.dashDuration += 0.16;
      }
    }

    if (this.isEvading) {
      const desiredGap = 120;
      const distance = abs(this.pos.x - opponent.pos.x);
      if (distance < desiredGap) {
        this.vel.x = -this.facing * 18;
      }
    }

    if (this.state === 'idle' || this.state === 'run' || this.state === 'hit') {
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
      } else {
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
    const myBox = { x: this.pos.x - 25, y: this.pos.y - 36, w: 50, h: 72 };
    const oppBox = { x: opponent.pos.x - 25, y: opponent.pos.y - 36, w: 50, h: 72 };
    
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
      if (this.ai.defend && random() < 0.02) {
        this.isCountering = true;
      }
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
    if (this.dashCharges <= 0 || this.isDashing || !this.onGround()) {
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
    this.attackHitResolved = false;
    this.statusEffectsApplied = false;
    this.slashEffectsSpawned = false;
    this.lastAttackHit = false;
    this.strikeActive = true; // Set strikeActive for normal attacks

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
          opponent.hp -= damage;
          spawnDamageNumber(damage, opponent.pos.copy(), this.facing, false);
          
          // Tremor bursts are impactful - add screen shake
          if (typeof addScreenShake === 'function' && damage > 0) {
            addScreenShake(damage);
          }
        }
      }
    }

    // Auto-face towards opponent when attacking
    this.facing = opponent.pos.x > this.pos.x ? 1 : -1;
    
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

  executeDashAttack(opponent) {
    // Prevent attacks during ultimate
    if (this.ultimateActive || this.state === 'ultimate') {
      return;
    }
    
    // Dash attacks are unparrieable and do enhanced damage
    this.state = 'attack';
    this.strikeActive = true;
    this.attackTimer = this.attackInterval;
    this.attackHitResolved = false;
    this.statusEffectsApplied = false;
    this.slashEffectsSpawned = false;
    this.lastAttackHit = false;

    // Auto-face towards opponent when dash attacking
    this.facing = opponent.pos.x > this.pos.x ? 1 : -1;
    
    // Dash attacks do 1.5x damage and have increased range
    this.attackDamage = this.baseDamage * 1.5;
    this.attackRange = 168; // 40% increase: 120→168
    this.attackKnockback = 15;

    // Set flag for post-dash attack sprite
    this.usePostDashSprite = true;

    // Spawn joust slash effect for dash attack
    this.spawnSlashEffect('js1', { x: 0, y: -10 });

    // Immediately resolve the attack since dash attacks are instant
    this.attackSystem.resolveAttack(opponent);
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
      radius: 80, // AOE radius
      damage: this.baseDamage * 2, // Base damage
      staggerDamage: 0 // Will be calculated on landing
    };
  }

  onSlamLanding(opponent) {
    if (!this.slamLandingHitbox) return;
    
    // Calculate final damage with 50% bonus stagger damage
    const finalDamage = this.calculateDamage(this.slamLandingHitbox.damage, opponent);
    const staggerDamage = finalDamage * 0.5; // 50% of damage as stagger
    
    // Apply AOE damage to opponent if in range
    const distance = dist(opponent.pos.x, opponent.pos.y, this.slamLandingHitbox.x, this.slamLandingHitbox.y);
    if (distance <= this.slamLandingHitbox.radius) {
      opponent.receiveHit(finalDamage, this, 20);
      // Only add stagger damage if opponent is not already staggered
      if (opponent.state !== 'staggered') {
        opponent.stagger += staggerDamage;
      }
      spawnDamageNumber(finalDamage, opponent.pos.copy(), this.facing, false);
      
      // Ground slams build combo counter
      this.attackCounter = min(3, this.attackCounter + 1);
      this.attackCounterDisplay = this.attackCounter;
      this.attackCounterTimer = 1.0; // Show for 1 second
      this.comboTimer = this.comboTimeout; // Reset combo timer
      this.combo += 1;
    }
    
    // Hold slam position until input detected
    this.slamHoldPosition = true;
    this.state = 'slam';
    this.slamLandingHitbox = null;
    
    // Spawn s2s2 slash effect for slam attack
    this.spawnSlashEffect('s2s2', { x: 0, y: -10 });
  }

  resolveAttack(opponent) {
    this.attackHitResolved = true;
    if (!this.strikeActive) {
      return;
    }


    if (this.hitOpponent(opponent, this.calcAttackBox(this.attackRange))) {
      const finalDamage = this.calculateDamage(this.attackDamage, opponent);
      
      // Emit attackHit event
      this.events.emit('attackHit', {
        attacker: this.characterKey,
        target: opponent.characterKey,
        damage: finalDamage,
        knockback: this.attackKnockback
      });
      
      opponent.receiveHit(finalDamage, this, this.attackKnockback);
      
      // Trigger tremor burst on third basic attack for Valencina
      if (this.characterKey === 'VALENCINA' && this.attackCounter === 3) {
        opponent.triggerTremorBurst();
      }
      
      this.onSuccessfulHit(finalDamage, opponent);
    }
  }

  calcAttackBox(range) {
    const x = this.pos.x + this.facing * (range / 2);
    const y = this.pos.y - 28;
    return { x, y, w: range, h: 70 };
  }

  hitOpponent(opponent, box) {
    const playerBox = { x: opponent.pos.x - 25, y: opponent.pos.y - 36, w: 50, h: 72 };
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
    if (this.isGuarding) {
      amount *= 0.45;
      if (this.isCountering) {
        attacker.receiveHit(amount * 0.8, this, knockback * 0.8);
        this.isCountering = false;
      }
    }

    if (this.isEvading) {
      spawnEvadeIndicator(this.pos.copy());
      return;
    }

    if (this.state === 'hit' || this.hitCooldown > 0) {
      return;
    }

    // Ultimate protection - prevent HP reduction until final attack
    if (this.ultimateProtected) {
      // Still apply hit effects but don't reduce HP
      const wasGuarding = this.isGuarding;
      this.setState('hit');
      this.hitCooldown = 0.25;
      
      // Apply knockback but reduced
      const awayFromAttacker = this.pos.x < attacker.pos.x ? -1 : 1;
      this.vel.x = awayFromAttacker * knockback * 0.5;
      this.vel.y = -5;
      
      return;
    }

    this.hp -= amount;
    const wasGuarding = this.isGuarding;
    spawnDamageNumber(amount, this.pos.copy(), attacker.facing, wasGuarding);
    
    // Add screen shake based on damage
    if (typeof addScreenShake === 'function') {
      console.log('[NORMAL ATTACK DEBUG] Adding screen shake for damage:', amount);
      addScreenShake(amount);
    }
    
    // Add sprite shake to character taking damage
    this.addSpriteShake(amount, false);
    
    // Emit damageDealt event
    this.events.emit('damageDealt', {
      attacker: attacker.characterKey,
      target: this.characterKey,
      damage: amount,
      knockback: knockback
    });
    
    // Apply hitstun
    if (this.state !== 'staggered') {
      this.setState('hit');
      this.staggerTimer = 0.18;
      // Face towards attacker when hurt
      this.facing = attacker.pos.x > this.pos.x ? 1 : -1;
    }
    
    // Only add stagger if not already staggered (applies to both players and enemies)
    if (this.state !== 'staggered') {
      this.stagger += amount * 1.2;
      this.staggerRecoveryTimer = 0;
    }
    
    const strength = max(1, amount * 0.05);
    const awayFromAttacker = this.pos.x < attacker.pos.x ? -1 : 1;
    this.vel.x = awayFromAttacker * knockback * strength;
    this.vel.y = -5;
    this.hitCooldown = 0.25;

    if (this.stagger >= this.staggerThreshold) {
      this.setStaggerState(this.staggerLength);
    }

    // Consume status effects when hit
    this.statusSystem.consumeOnHit();
    
    // Call character-specific onReceiveHit method
    const character = CHARACTERS[this.characterKey];
    if (character && character.onReceiveHit) {
      character.onReceiveHit(amount, attacker, this);
    }

    this.addCombo(attacker);
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
    this.combo = max(0, this.combo - 1);
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
  return damage;
}

receiveHit(amount, attacker, knockback) {
  if (this.isGuarding) {
    amount *= 0.45;
    if (this.isCountering) {
      attacker.receiveHit(amount * 0.8, this, knockback * 0.8);
      this.isCountering = false;
    }
  }

  if (this.isEvading) {
    spawnEvadeIndicator(this.pos.copy());
    return;
  }

  if (this.state === 'hit' || this.hitCooldown > 0) {
    return;
  }

  this.hp -= amount;
  const wasGuarding = this.isGuarding;
  spawnDamageNumber(amount, this.pos.copy(), attacker.facing, wasGuarding);
  
  // Add screen shake based on damage
  if (typeof addScreenShake === 'function') {
    console.log('[NORMAL ATTACK DEBUG] Adding screen shake for damage:', amount);
    addScreenShake(amount);
  }
  
  // Add sprite shake to character taking damage
  this.addSpriteShake(amount, false);
  
  // Emit damageDealt event
  this.events.emit('damageDealt', {
    attacker: attacker.characterKey,
    target: this.characterKey,
    damage: amount,
    knockback: knockback
  });
  
  // Apply hitstun
  if (this.state !== 'staggered') {
    this.setState('hit');
    this.staggerTimer = 0.18;
    // Face towards attacker when hurt
    this.facing = attacker.pos.x > this.pos.x ? 1 : -1;
  }
  
  // Only add stagger if not already staggered (applies to both players and enemies)
  if (this.state !== 'staggered') {
    this.stagger += amount * 1.2;
    this.staggerRecoveryTimer = 0;
  }
  
  const strength = max(1, amount * 0.05);
  const awayFromAttacker = this.pos.x < attacker.pos.x ? -1 : 1;
  this.vel.x = awayFromAttacker * knockback * strength;
  this.vel.y = -5;
  this.hitCooldown = 0.25;

  if (this.stagger >= this.staggerThreshold) {
    this.setStaggerState(this.staggerLength);
  }

  // Consume status effects when hit
  this.statusSystem.consumeOnHit();
  
  // Call character-specific onReceiveHit method
  const character = CHARACTERS[this.characterKey];
  if (character && character.onReceiveHit) {
    character.onReceiveHit(amount, attacker, this);
  }

  this.addCombo(attacker);
}

onSuccessfulHit(damage, opponent) {
  this.lastAttackHit = true;
  this.comboTimer = this.comboTimeout;
  this.combo += 1;
  
  // Reset attack counter after 3 hits
  if (this.combo >= 3) {
    this.combo = 0;
    this.attackCounter = 0; // Reset after completing 3-hit combo
  }
  
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
  }
}

addCombo(attacker) {
  console.log('[COMBO DEBUG] addCombo called - attacker:', attacker, 'this:', this, 'comboTimer:', this.comboTimer, 'combo before:', this.combo);
  
  // During ultimate, always increase combo regardless of timer state
  if (this.ultimateActive) {
    console.log('[COMBO DEBUG] Ultimate active - forcing combo increase');
    this.combo += 1;
    this.comboTimer = this.comboTimeout;
    console.log('[COMBO DEBUG] addCombo completed - combo after:', this.combo);
    return;
  }
  
  // Normal combo logic for non-ultimate
  if (attacker === this && this.comboTimer > 0) {
    console.log('[COMBO DEBUG] addCombo early return - same attacker with active timer');
    return;
  }
  this.comboTimer = this.comboTimeout;
  this.combo += 1; // Actually increase the combo count
  console.log('[COMBO DEBUG] addCombo completed - combo after:', this.combo);
}

  hasStatus(type) {
    return this.statuses.some((status) => status.type === type);
  }

  addStatus(type, count, potency) {
    const existing = this.statuses.find((status) => status.type === type);
    if (existing) {
      existing.count += count;
      existing.potency += potency; // Accumulate potency instead of taking max
    } else {
      this.statuses.push({ type, count, potency, timer: 1.0 });
    }
    
    // Emit statusApplied event
    this.events.emit('statusApplied', {
      target: this.characterKey,
      statusType: type,
      count: count,
      potency: potency,
      wasExisting: !!existing
    });
  }

  consumeStatus(type) {
    const status = this.statuses.find((s) => s.type === type);
    if (!status) return;
    status.count -= 1;
    if (status.count <= 0) {
      this.statuses = this.statuses.filter((s) => s.type !== type);
    }
  }

  removeStatus(type) {
    this.statuses = this.statuses.filter((s) => s.type !== type);
  }

  consumeStatusOnHit() {
    // Handle Rupture and Sinking when hit
    ['Rupture', 'Sinking'].forEach((type) => {
      const status = this.statuses.find((s) => s.type === type);
      if (status) {
        status.count -= 1;
        if (type === 'Rupture') {
          this.hp -= status.potency;
          spawnDamageNumber(status.potency, this.pos.copy(), 1, false);
          
          // Status effects don't cause screen shake (only direct combat damage)
        }
      }
    });
  }

  consumeStatusOnAttack() {
    // Handle Bleed when attacking
    const bleedStatus = this.statuses.find((s) => s.type === 'Bleed');
    if (bleedStatus) {
      bleedStatus.count -= 1;
      if (bleedStatus.count <= 0) {
        this.statuses = this.statuses.filter((s) => s.type !== 'Bleed');
      }
    }
  }

  applyStatuses(dt) {
    this.statuses.forEach((status) => {
      status.timer += dt;
      
      // Burn: Every second, lose 1 count and take damage
      if (status.type === 'Burn') {
        if (status.timer >= 1) {
          status.timer = 0;
          status.count -= 1;
          this.hp -= status.potency;
          spawnDamageNumber(status.potency, this.pos.copy(), 1, false);
          
          // Status effects don't cause screen shake (only direct combat damage)
        }
      }
      
      // Tremor: Only lose count when bursted (handled elsewhere)
      else if (status.type === 'Tremor') {
        // No automatic count decrease - handled in burst logic
        // When count expires, raise stagger by potency
        if (status.count <= 0) {
          this.stagger += status.potency;
          this.staggerRecoveryTimer = 0;
          // Remove expired status
          this.statuses = this.statuses.filter((s) => s.type !== 'Tremor');
        }
      }
      
      // Rupture: When hit, lose 1 count (handled in receiveHit)
      else if (status.type === 'Rupture') {
        // No automatic count decrease - handled in receiveHit
      }
      
      // Bleed: Lose 1 potency per second
      else if (status.type === 'Bleed') {
        if (status.timer >= 1) {
          status.timer = 0;
          status.potency = max(0, status.potency - 1);
        }
      }
      
      // Sinking: When hit, lose 1 count (handled in receiveHit)
      else if (status.type === 'Sinking') {
        // No automatic count decrease - handled in receiveHit
        // Apply ongoing effects
        const resistancePenalty = 0.05 * Math.floor(status.potency / 5);
        this.damageResistance = min(0.5, 1 - resistancePenalty);
        const speedPenalty = 0.1 * Math.floor(status.potency / 10);
        this.speed = max(1, this.speed - speedPenalty);
      }
      
      // Charge: When used, lose 1 count (handled elsewhere)
      else if (status.type === 'Charge') {
        // No automatic count decrease - handled when used
      }
      
      // Poise: On crit, lose 1 count (handled in calculateDamage)
      else if (status.type === 'Poise') {
        // No automatic count decrease - handled on crit
        // Apply ongoing effects
        this.critChance = this.critChance || 0;
        this.critChance += 0.05 * status.potency;
      }
      
      // Game Target: 5 hits or 10 seconds duration
      else if (status.type === 'Game Target') {
        this.speed = 1;
        if (status.timer >= 10) {
          status.count = 0;
        }
      }
      
      // Precognition: Unique mechanics handled in character profile
      else if (status.type === 'Precognition') {
        // No automatic count decrease - handled in character profile
      }
      
      // Overheat: Unique mechanics handled in character profile
      else if (status.type === 'Overheat') {
        // No automatic count decrease - handled in character profile
      }
      
      // Remove status if count reaches 0
      if (status.count <= 0) {
        // Reset status-specific properties
        if (status.type === 'Sinking') {
          this.damageResistance = 1;
        }
        if (status.type === 'Poise') {
          this.critChance = 0;
        }
        if (status.type === 'Game Target') {
          this.speed = this.baseSpeed || 7.5;
        }
        
        this.statuses.splice(this.statuses.indexOf(status), 1);
      }
    });
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
        rectMode(CENTER);
        
        // Draw status background
        fill(statusColor(status.type));
        stroke(0);
        strokeWeight(1);
        rect(x, y, cellWidth - 4, 20, 4);
        
        // Draw status potency on left and count on right
        fill(255);
        textSize(10);
        textAlign(LEFT, CENTER);
        text(status.potency, x - 15, y);
        textAlign(RIGHT, CENTER);
        text(status.count, x + 15, y);
        pop();
      });
    }
  }

  onGround() {
    return this.pos.y >= this.spawnY - 0.01;
  }

  drawWorldHpBar() {
    if (!this.isAI) return;
    const barWidth = 120;
    const x = this.pos.x;
    const y = this.pos.y - 90;
    push();
    rectMode(CENTER);
    
    // HP Bar background
    fill(0, 180);
    rect(x, y, barWidth, 18, 8);
    
    // HP Bar fill
    fill('#42d492');
    rect(x - barWidth / 2 + (barWidth * (this.hp / this.maxHp)) / 2, y, barWidth * (this.hp / this.maxHp), 10, 5);
    
    // Stagger Bar background (below HP bar)
    fill(0, 180);
    rect(x, y + 16, barWidth, 10, 6);
    
    // Stagger Bar fill (red/orange gradient)
    const staggerPercent = constrain(this.stagger / this.staggerThreshold, 0, 1);
    if (staggerPercent > 0) {
      fill(255, 100 + staggerPercent * 50, 50);
      rect(x - barWidth / 2 + (barWidth * staggerPercent) / 2, y + 16, barWidth * staggerPercent, 6, 4);
    }
    
    fill(255);
    textSize(14);
    textAlign(CENTER, BOTTOM);
    text(this.name, x, y - 10);
    
    // Draw parry charges
    for (let i = 0; i < 3; i++) {
      fill(i < this.parryCount ? '#ffff00' : '#333');
      ellipse(x - 15 + i * 12, y + 15, 6, 6);
    }
    pop();
  }

  draw() {
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

      // Flip atlas sprites based on facing
      scale(this.facing === 1 ? -1 : 1, 1);

      // Debug missing sprite
      const spriteInfo = SPRITES?.[this.currentSprite];
      if (!spriteInfo) {
        console.warn("Missing sprite:", this.currentSprite);
      } else {
        // 512px reference height → 144px character height
        const scaleFactor = 144 / 512;

        // Align feet to hitbox bottom
        
        // Position Valencina's feet at the bottom of her hitbox
        // Hitbox bottom is at this.pos.y + 36, so feet should be at y = 36
        const hitboxBottomY = 36;
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
      
      image(this.sprite, 0, -30, scaledWidth, targetHeight);
      pop();
    } else {
      fill(this.color);
      noStroke();
      ellipse(0, -30, 52, 72);
      fill(30);
      rectMode(CENTER);
      rect(this.facing * 20, -42, 20, 6, 4);
    }
    if (this.isGuarding) {
      stroke('#90ee90');
      strokeWeight(3);
      noFill();
      ellipse(0, -30, 72, 88);
    }
    if (this.state === 'attack' && this.attackTimer > 0) {
      const progress = constrain(this.attackTimer / this.attackInterval, 0, 1);
      push();
      noFill();
      stroke(255, 220, 80, 180);
      strokeWeight(3);
      ellipse(0, -70, 46 + (1 - progress) * 26, 18 + (1 - progress) * 12);
      strokeWeight(2);
      arc(0, -70, 38, 14, PI, PI + progress * PI);
      pop();
    }
    if (this.state === 'attack') {
      stroke('#ffd24d');
      strokeWeight(4);
      line(this.facing * 22, -50, this.facing * 70, -60);
    }
    if (this.state === 'evade') {
      fill('#8a8a8a');
      ellipse(0, -40, 12, 12);
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

    if (this.strikeActive) {
      const range = this.chargeAttack ? 294 : 231; // Updated to match new attack ranges
      const box = this.calcAttackBox(range);
      stroke(255, 0, 0);
      noFill();
      rect(box.x - box.w / 2, box.y, box.w, box.h);
    }

    // Draw slam attack landing hitbox
    if (this.isSlamAttacking && this.slamLandingHitbox) {
      push();
      stroke(255, 100, 255, 150);
      strokeWeight(3);
      noFill();
      ellipse(this.slamLandingHitbox.x, this.slamLandingHitbox.y, this.slamLandingHitbox.radius * 2);
      stroke(255, 150, 255, 100);
      strokeWeight(2);
      ellipse(this.slamLandingHitbox.x, this.slamLandingHitbox.y, this.slamLandingHitbox.radius * 1.5);
      pop();
    }

    // Draw attack counter display
    if (this.attackCounterTimer > 0 && this.attackCounterDisplay > 0) {
      push();
      textAlign(CENTER, CENTER);
      textSize(24);
      fill(255, 255, 100, map(this.attackCounterTimer, 0, 1, 0, 255));
      stroke(0, map(this.attackCounterTimer, 0, 1, 0, 255));
      strokeWeight(2);
      text(`Attack ${this.attackCounterDisplay}`, this.pos.x, this.pos.y - 100);
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
    this.pos.x = snapshot.position.x;
    this.pos.y = snapshot.position.y;
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
      this.hp -= damage;
      spawnDamageNumber(damage, this.pos.copy(), 1, false);
      
      // Tremor bursts are impactful - add screen shake
      if (typeof addScreenShake === 'function') {
        addScreenShake(damage);
      }
      this.addSpriteShake(damage, false);
    }
  }
}
