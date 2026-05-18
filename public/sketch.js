// Character roster system is globally available

function preload() {
  //stuff here
  // Load character roster data from JSON file
  loadJSON('characters.json', (data) => {
    window.CHARACTERS = data;
    console.log('Character roster loaded:', window.CHARACTERS);
  }, (err) => {
    console.error('Failed to load character roster:', err);
  });
}

let player;
let enemy;
let battleState = 'characterSelect';
let winner = null;
let summaryText = '';
let lastMouseDown = null;
let battleTimer = 0;

// Opening sequence variables
let openingSequenceTimer = 0;
let openingFadeAlpha = 255;
let openingZoom = 5; // Start zoomed in
let openingTextAlpha = 0;
let introAnimationsStarted = false;

// Character intro animation sequences
const INTRO_ANIMATIONS = {
  VALENCINA: {
    sprites: ['idle', 'prepat', 'd1', 's4f2', 's4f2', 's4f1', 'dist1'],
    duration: 0.2 // seconds per sprite
  },
  CALLISTO: {
    sprites: ['cidle', 'cevade', 'chalt', 'cuf2', 'cuf1'],
    duration: 0.3 // seconds per sprite
  }
};

// Character selection variables - Super Smash Bros style
let players = [
  { active: true, character: 'VALENCINA', ai: false, controlled: true, ready: false },
  { active: false, character: null, ai: false, controlled: false, ready: false },
  { active: false, character: null, ai: false, controlled: false, ready: false },
  { active: false, character: null, ai: false, controlled: false, ready: false }
];
const MAX_PLAYERS = 4;
let selectedPlayerSlot = 0; // Which player slot is currently selected
let characterSelectOption = 0; // 0: character, 1: AI, 2: ready, 3: remove player

// Pause menu variables
let pauseMenuOpen = false;
let pauseMenuOption = 0; // 0: settings, 1: forfeit match
let pauseSettingsOpen = false; // Settings placeholder open

// Room-based character select state
let availableRooms = [];
let myRoomState = null;
let myRoomId = null;
let localSlotSelections = [];
let availableCharacterKeys = () => Object.keys(window.CHARACTERS || {});

function preload() {
  // Load sprite atlases for character sprites
  if (typeof loadSpriteAtlases === 'function') {
    loadSpriteAtlases();
  } else {
    console.warn('loadSpriteAtlases not yet loaded');
  }

  // Load background layers
  window.bgSky = loadImage('data/batlbkg/bkgsy.png');
  window.bgTr = loadImage('data/batlbkg/bkgtr.png');
  window.bgFlr = loadImage('data/batlbkg/bkgflr.png');
  window.bgView = loadImage('data/batlbkg/bkgview.png');
}

function setup() {//test
  // Set canvas size to original constraints
  createCanvas(ARENA_WIDTH, ARENA_HEIGHT);

  // Calculate scale factor to fit background images within original width while maintaining aspect ratio
  if (window.bgSky && window.bgSky.width > 0) {
    const scale = ARENA_WIDTH / window.bgSky.width;
    window.bgScale = scale;
    window.bgScaledWidth = ARENA_WIDTH;
    window.bgScaledHeight = window.bgSky.height * scale;
    console.log(`Background scaled by ${scale.toFixed(3)} to fit ${ARENA_WIDTH}px width, maintaining aspect ratio`);
  } else {
    window.bgScale = 1;
    window.bgScaledWidth = ARENA_WIDTH;
    window.bgScaledHeight = ARENA_HEIGHT;
  }

  document.oncontextmenu = () => false;
  // Don't initialize fighters here - let character select handle it

  // Network room handlers
  if (typeof Network !== 'undefined') {
    Network.on('roomsList', (rooms) => { availableRooms = rooms || []; console.log('roomsList', availableRooms); });
    Network.on('roomState', (state) => { myRoomState = state; myRoomId = state.id; localSlotSelections = (state.slots || []).map(s => s.character || null); console.log('roomState', state); });
    Network.on('joinedRoom', (roomId) => { myRoomId = roomId; console.log('joinedRoom', roomId); });
  }
}

function initBattle() {
  // Initialize active fighters from Super Smash Bros style player system
  const activePlayers = players.filter(p => p.active);
  
  if (activePlayers.length === 0) {
    console.log('No active players!');
    return;
  }
  
  // Find the player-controlled fighter
  let playerControlledFighter = activePlayers.find(p => p.controlled);
  if (!playerControlledFighter) {
    // If no player is controlled, make the first active player controlled
    activePlayers[0].controlled = true;
    playerControlledFighter = activePlayers[0];
  }
  
  // Create fighters for all active players
  const fighters = [];
  for (let i = 0; i < activePlayers.length; i++) {
    const playerData = activePlayers[i];
    let isAI = playerData.ai;
    let isPlayerControlled = playerData.controlled;
    
    // Apply mutual exclusivity: if player controls a fighter, disable AI
    if (isPlayerControlled) {
      isAI = false;
    }
    
    // Validate selected character keys against the roster
    const characterKey = (CHARACTERS && CHARACTERS[playerData.character]) ? playerData.character : 'VALENCINA';
    const fighter = new Fighter(isAI, `P${i + 1}`, characterKey, isPlayerControlled);
    fighter.playerId = i + 1; // Store player ID for UI
    
    // Ensure AI settings are properly applied
    fighter.isAI = isAI;
    fighter.isPlayerControlled = isPlayerControlled;
    
    // Set proper positioning for multi-player battles
    const spacing = 300; // Horizontal spacing between players
    const centerX = width / 2;
    const totalWidth = (activePlayers.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;
    
    fighter.pos.x = startX + (i * spacing);
    fighter.pos.y = height - 100;
    fighter.facing = isPlayerControlled ? 1 : -1; // Player-controlled face right, AI face left
    
    fighters.push(fighter);
  }
  
  // Store all fighters for multi-player battles
  window.allFighters = fighters;
  
  // Assign player and enemy for backward compatibility with combat system
  player = fighters.find(f => f.isPlayerControlled);
  enemy = fighters.find(f => !f.isPlayerControlled) || fighters.find(f => f !== player);

  battleState = 'opening';
  winner = null;
  summaryText = '';
  battleTimer = 0;
  
  // Initialize opening sequence
  openingSequenceTimer = 0;
  openingFadeAlpha = 255;
  openingZoom = 5;
  openingTextAlpha = 0;
  introAnimationsStarted = false;
  
  // Reset all fighters
  fighters.forEach(f => f.reset());
  damageNumbers = [];
}

function draw() {
  if (battleState === 'characterSelect') {
    drawCharacterSelect();
  } else if (battleState === 'ready') {
    drawReadyScreen();
  } else if (battleState === 'opening') {
    drawOpeningSequence();
  } else if (battleState === 'battle') {
    // Check for ultimate background dimming across all fighters
    const ultimateFighters = window.allFighters ? window.allFighters.filter(f => f.ultimateActive) : [];
    const ultimateActive = ultimateFighters.length > 0;
    
    background(0);
    
    updateBattle();
    beginCamera();
    drawArena();
    
    // Draw ultimate name behind characters
    if (ultimateActive && ultimateFighters[0] && ultimateFighters[0].ultimateName) {
      drawUltimateName(ultimateFighters[0]);
    }
    
    // Draw all fighters
    if (window.allFighters) {
      window.allFighters.forEach(fighter => fighter.draw());
    }
    
    drawDamageNumbers();
    drawParticles();
    
    // Draw vignette effect on vertical edges
    drawVignette();
    
    // Draw overhead healthbars for non-player fighters
    drawOverheadHealthbars();
    
    // Draw ultimate damage counter
    if (ultimateActive && ultimateFighters[0]) {
      drawUltimateDamageCounter(ultimateFighters[0]);
    }
    
    endCamera();
    
    // Draw pause menu if open
    if (pauseSettingsOpen) {
      drawSettingsPanel();
    } else if (pauseMenuOpen) {
      drawPauseMenu();
    }
  } else if (battleState === 'summary') {
    beginCamera();
    drawArena();
    
    // Draw all fighters in summary
    if (window.allFighters) {
      window.allFighters.forEach(fighter => fighter.draw());
    } else if (player && enemy) {
      player.draw();
      enemy.draw();
    }
    
    drawDamageNumbers();
    endCamera();
    drawSummary();
  }

  if (battleState !== 'characterSelect' && battleState !== 'opening') {
    drawHud();
  }
}

function drawOpeningSequence() {
  const dt = deltaTime / 1000;
  openingSequenceTimer += dt;
  
  // Opening sequence phases:
  // 0-1s: Start zoomed in, black screen
  // 1-2s: Start intro animations, fade out black screen and zoom out from center (fast to slow)
  // 2-4s: Hold position with "combat start" text, continue intro animations
  // 4s+: Transition to battle
  
  const introDelay = 1;
  const fadeDuration = 1;
  const holdDuration = 2;
  const totalDuration = introDelay + fadeDuration + holdDuration;
  
  // Start intro animations after 1 second delay
  if (openingSequenceTimer >= introDelay && !introAnimationsStarted) {
    introAnimationsStarted = true;
    if (window.allFighters) {
      window.allFighters.forEach(fighter => fighter.startIntroAnimation());
    }
  }
  
  // Update intro animations
  if (introAnimationsStarted && window.allFighters) {
    window.allFighters.forEach(fighter => fighter.updateIntroAnimation(dt));
  }
  
  if (openingSequenceTimer >= totalDuration) {
    // Stop intro animations and reset fighters to idle
    if (window.allFighters) {
      window.allFighters.forEach(fighter => {
        fighter.isPlayingIntro = false;
        fighter.introAnimationIndex = 0;
      });
    }
    battleState = 'battle';
    return;
  }
  
  // Calculate zoom with easing (fast to slow)
  const zoomProgress = constrain((openingSequenceTimer - introDelay) / fadeDuration, 0, 1);
  // Easing function: easeOutCubic for fast-to-slow
  const easedProgress = 1 - Math.pow(1 - zoomProgress, 3);
  openingZoom = lerp(5, 1, easedProgress);
  
  // Calculate fade alpha
  openingFadeAlpha = lerp(255, 0, zoomProgress);
  
  // Calculate text alpha (fade in after zoom completes)
  if (openingSequenceTimer > introDelay + fadeDuration) {
    const textProgress = constrain((openingSequenceTimer - introDelay - fadeDuration) / 0.5, 0, 1);
    openingTextAlpha = lerp(0, 255, textProgress);
  }
  
  // Draw arena with opening zoom
  background(0);
  
  // Override camera for opening sequence
  const originalZoom = cameraZoom;
  const originalX = cameraX;
  const originalY = cameraY;
  
  cameraZoom = openingZoom;
  cameraX = ARENA_WIDTH / 2; // Center of arena
  cameraY = ARENA_HEIGHT / 2;
  
  beginCamera();
  drawArena();
  
  // Draw all fighters
  if (window.allFighters) {
    window.allFighters.forEach(fighter => fighter.draw());
  }
  
  endCamera();
  
  // Restore camera
  cameraZoom = originalZoom;
  cameraX = originalX;
  cameraY = originalY;
  
  // Draw black screen fade overlay
  if (openingFadeAlpha > 0) {
    push();
    resetMatrix();
    fill(0, 0, 0, openingFadeAlpha);
    noStroke();
    rect(0, 0, width, height);
    pop();
  }
  
  // Draw "combat start" text
  if (openingSequenceTimer > introDelay + fadeDuration && openingTextAlpha > 0) {
    push();
    resetMatrix();
    textAlign(CENTER, CENTER);
    textSize(80);
    fill(255, 255, 255, openingTextAlpha);
    stroke(0, 0, 0, openingTextAlpha);
    strokeWeight(4);
    text('COMBAT START', width / 2, height / 2);
    pop();
  }
}

function drawArena() {
  // Use scaled background dimensions to maintain aspect ratio
  const bgWidth = window.bgScaledWidth || ARENA_WIDTH;
  const bgHeight = window.bgScaledHeight || ARENA_HEIGHT;

  // Calculate vertical offset (1/4 of image height higher)
  const yOffset = +bgHeight * 0;

  // Get camera position for parallax effect
  const camX = typeof cameraX !== 'undefined' ? cameraX : 0;
  const camY = typeof cameraY !== 'undefined' ? cameraY : 0;

  // Calculate center of arena
  const arenaCenterX = ARENA_WIDTH / 2;
  const arenaCenterY = ARENA_HEIGHT / 2;

  // Parallax factors: lower values = less movement with camera
  const parallaxSky = 0.05;   // Sky moves very little
  const parallaxTr = 0.1;     // Terrain moves moderately
  const parallaxFlr = 0.0;    // Floor has no parallax
  const parallaxView = 0.0;   // Foreground has no parallax

  // Draw layered background from backmost to foremost: bkgsy > bkgtr > bkgflr > bkgview
  // Center background at arena center, then apply yOffset and parallax (x-axis only)
  const centerX = arenaCenterX - (bgWidth / 2);
  const centerY = arenaCenterY - (bgHeight / 2) + yOffset;

  if (window.bgSky) {
    const skyOffsetX = centerX - (camX - arenaCenterX) * parallaxSky;
    const skyOffsetY = centerY; // No parallax on y-axis
    image(window.bgSky, skyOffsetX, skyOffsetY, bgWidth, bgHeight);
  }
  if (window.bgTr) {
    const trOffsetX = centerX - (camX - arenaCenterX) * parallaxTr;
    const trOffsetY = centerY; // No parallax on y-axis
    image(window.bgTr, trOffsetX, trOffsetY, bgWidth, bgHeight);
  }
  if (window.bgFlr) {
    const flrOffsetX = centerX - (camX - arenaCenterX) * parallaxFlr;
    const flrOffsetY = centerY; // No parallax on y-axis
    image(window.bgFlr, flrOffsetX, flrOffsetY, bgWidth, bgHeight);
  }
  if (window.bgView) {
    const viewOffsetX = centerX - (camX - arenaCenterX) * parallaxView;
    const viewOffsetY = centerY; // No parallax on y-axis
    image(window.bgView, viewOffsetX, viewOffsetY, bgWidth, bgHeight);
  }

  if (DEBUG) {
    fill(255);
    textSize(12);
    text(`FPS: ${nf(frameRate(), 2, 1)}`, 12, 18);
  }
}

function drawVignette() {
  // Vignette width in pixels
  const vignetteWidth = 150;
  
  // Draw left vignette
  for (let x = 0; x < vignetteWidth; x++) {
    const alpha = map(x, 0, vignetteWidth, 255, 0);
    fill(0, 0, 0, alpha);
    noStroke();
    rect(x, 0, 1, height);
  }
  
  // Draw right vignette
  for (let x = 0; x < vignetteWidth; x++) {
    const alpha = map(x, 0, vignetteWidth, 0, 255);
    fill(0, 0, 0, alpha);
    noStroke();
    rect(width - vignetteWidth + x, 0, 1, height);
  }
}

function updateBattle() {
  const dt = deltaTime / 1000;
  battleTimer += dt;
  
  // Update all fighters
  if (window.allFighters) {
    for (let i = 0; i < window.allFighters.length; i++) {
      const fighter = window.allFighters[i];
      
      // Disable player movement when pause menu or settings are open
      if (!pauseMenuOpen && !pauseSettingsOpen && !fighter.ultimateActive && fighter.isPlayerControlled) {
        fighter.handleInput();
      }
      
      // Update AI for non-player-controlled fighters with AI enabled
      if (!fighter.isPlayerControlled && fighter.isAI && window.allFighters.length > 1) {
        // Find targets (other fighters)
        const targets = window.allFighters.filter(f => f !== fighter);
        if (targets.length > 0) {
          fighter.updateAI(targets[0]); // Simple AI - target first available
        }
      }
      
      // Update fighter physics and state
      const targets = window.allFighters.filter(f => f !== fighter);
      fighter.update(dt, targets); // Pass all available targets for multi-player combat
    }
    
    // Handle collisions between all non-defeated fighters
    for (let i = 0; i < window.allFighters.length; i++) {
      for (let j = i + 1; j < window.allFighters.length; j++) {
        const fighter1 = window.allFighters[i];
        const fighter2 = window.allFighters[j];
        
        // Skip collision if either fighter is defeated
        if (fighter1.isDefeated || fighter2.isDefeated) {
          continue;
        }
        
        fighter1.cleanupPosition(fighter2);
      }
    }
    
    // Check for battle end (only one fighter not defeated)
    const activeFighters = window.allFighters.filter(f => !f.isDefeated);
    if (activeFighters.length <= 1) {
      battleState = 'summary';
      winner = activeFighters[0] || null;
      summaryText = winner ? `${winner.name} wins!` : 'Draw!';
    }
  }

  updateDamageNumbers(dt);
  updateParticles(dt);
}

function getPlayerControlledFighter() {
  if (player && player.isPlayerControlled) {
    return player;
  }
  return null; // No player-controlled fighter found
}

function keyPressed() {
  // Handle pause menu navigation
  if ((pauseMenuOpen || pauseSettingsOpen) && battleState === 'battle') {
    if (keyCode === UP_ARROW) {
      pauseMenuOption = (pauseMenuOption - 1 + 2) % 2;
      return;
    }
    if (keyCode === DOWN_ARROW) {
      pauseMenuOption = (pauseMenuOption + 1) % 2;
      return;
    }
    if (keyCode === ENTER) {
      if (pauseMenuOption === 0) {
        // Open settings placeholder
        pauseSettingsOpen = true;
      } else if (pauseMenuOption === 1) {
        // Forfeit match
        forfeitMatch();
      }
      return;
    }
    if (keyCode === ESCAPE) {
      // Close settings first, otherwise close pause menu
      if (pauseSettingsOpen) {
        pauseSettingsOpen = false;
      } else {
        pauseMenuOpen = false;
      }
      return;
    }
    return;
  }
  
  // Open pause menu with ESC key during battle
  if (battleState === 'battle' && keyCode === ESCAPE) {
    pauseMenuOpen = true;
    pauseMenuOption = 0;
    return;
  }
  
  if (battleState === 'characterSelect') {
    // Room-based keyboard controls
    if (myRoomState) {
      const slots = myRoomState.slots || [];
      if (keyCode === UP_ARROW) {
        selectedPlayerSlot = Math.max(0, selectedPlayerSlot - 1);
        return;
      }
      if (keyCode === DOWN_ARROW) {
        selectedPlayerSlot = Math.min(Math.max(0, slots.length - 1), selectedPlayerSlot + 1);
        return;
      }
      if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
        const keys = availableCharacterKeys();
        if (keys.length === 0) return;
        const cur = localSlotSelections[selectedPlayerSlot] || keys[0];
        const idx = keys.indexOf(cur);
        const next = keyCode === LEFT_ARROW ? ((idx - 1 + keys.length) % keys.length) : ((idx + 1) % keys.length);
        localSlotSelections[selectedPlayerSlot] = keys[next];
        const slot = slots[selectedPlayerSlot];
        if (slot && Network && Network.socket && slot.clientId === Network.socket.id) {
          Network.changeCharacter(keys[next]);
        }
        return;
      }

      if (keyCode === ENTER) {
        // Do nothing for now; mouse is used to join/claim
        return;
      }

      return;
    }

    // Fallback: legacy ready behavior when not using rooms
    if (keyCode === ENTER) {
      // Check if all active players are ready
      const activePlayers = players.filter(p => p.active);
      const allReady = activePlayers.every(p => p.ready);

      if (!allReady) {
        console.log('Not all players are ready!');
        return;
      }

      // Start battle with ready players
      initBattle();
      return;
    }
  }
  
  if (battleState === 'ready' && keyCode === ENTER) {
    battleState = 'battle';
    return;
  }
  if (battleState === 'summary' && keyCode === ENTER) {
    battleState = 'characterSelect';
    return;
  }
  if (battleState === 'battle') {
    const controlledFighter = getPlayerControlledFighter();
    if (controlledFighter) {
      // Send input intent to server/local simulator
      if (typeof Network !== 'undefined' && Network.sendInput) {
        Network.sendInput({ type: 'keyPressed', key, playerId: controlledFighter.playerId });
      }
      // Local fallback for single-player responsiveness
      controlledFighter.processKeyPressed(key);
      if (key === ' ' || keyCode === 32) {
        controlledFighter.startDash();
      }
    }
  }
}

function forfeitMatch() {
  // Immediately return to character select and clear fighters
  pauseMenuOpen = false;
  pauseSettingsOpen = false;
  window.allFighters = null;
  player = null;
  enemy = null;
  battleState = 'characterSelect';
  console.log('Match forfeited - returning to character select');
}

function keyReleased() {
  if (battleState === 'battle') {
    const controlledFighter = getPlayerControlledFighter();
    if (controlledFighter) {
      if (typeof Network !== 'undefined' && Network.sendInput) {
        Network.sendInput({ type: 'keyReleased', key, playerId: controlledFighter.playerId });
      }
      controlledFighter.processKeyReleased(key);
    }
  }
}

function mousePressed() {
  if (battleState === 'characterSelect' && myRoomState) {
    const mx = mouseX;
    const my = mouseY;
    const slots = myRoomState.slots || [];
    const columnWidth = 200;
    const count = Math.max(2, slots.length);
    const startX = (width - (count * columnWidth)) / 2;

    for (let i = 0; i < count; i++) {
      const x = startX + i * columnWidth;
      const yTop = 120;
      const yBottom = yTop + 260;

      if (mx > x && mx < x + columnWidth && my > yTop && my < yBottom) {
        const slot = slots[i];
        if (!slot) {
          // Claim a slot by joining the room (if not already in it)
          if (!myRoomId) {
            Network.joinRoom(myRoomState.id);
          }
          return;
        } else {
          // If this slot is ours, cycle character
          if (Network && Network.socket && slot.clientId === Network.socket.id) {
            const keys = availableCharacterKeys();
            if (keys.length === 0) return;
            const cur = localSlotSelections[i] || keys[0];
            const idx = keys.indexOf(cur);
            const next = (idx + 1) % keys.length;
            const newKey = keys[next];
            localSlotSelections[i] = newKey;
            Network.changeCharacter(newKey);
            return;
          }
        }
      }
    }

    return;
  }

  if (battleState === 'characterSelect') {
    const mx = mouseX;
    const my = mouseY;
    
    // Calculate column layout
    const columnWidth = 200;
    const startX = (width - (players.length * columnWidth)) / 2;
    
    // Check clicks on player columns
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const x = startX + i * columnWidth;
      
      // Check if click is within this player's column
      if (mx > x && mx < x + columnWidth) {
        // Join game (for inactive players)
        if (!player.active && my > 120 && my < 140) {
          player.active = true;
          player.character = getAvailableFighters()[0];
          player.ready = player.ai; // AI players are auto-ready
          console.log(`Player ${i + 1} joined the game`);
          return;
        }
        
        // Add new player option (only show if below max and all slots are active)
        if (players.filter(p => p.active).length >= 3 && 
            players.filter(p => p.active).length < MAX_PLAYERS && 
            i === players.filter(p => p.active).length && 
            my > 120 && my < 140) {
          // Find first inactive slot
          for (let j = 0; j < players.length; j++) {
            if (!players[j].active) {
              players[j].active = true;
              players[j].character = getAvailableFighters()[0];
              players[j].ready = players[j].ai;
              console.log(`Added player ${j + 1}`);
              break;
            }
          }
          return;
        }
        
        // Only process clicks for active players
        if (!player.active) continue;
        
        // Character selection
        if (my > 170 && my < 190) {
          const availableFighters = getAvailableFighters();
          const currentIndex = availableFighters.indexOf(player.character);
          const nextIndex = currentIndex < availableFighters.length - 1 ? currentIndex + 1 : 0;
          player.character = availableFighters[nextIndex];
          selectedPlayerSlot = i;
          characterSelectOption = 0;
          return;
        }
        
        // AI toggle
        if (my > 230 && my < 250) {
          player.ai = !player.ai;
          // Auto-ready AI players
          if (player.ai) {
            player.ready = true;
          }
          selectedPlayerSlot = i;
          characterSelectOption = 1;
          return;
        }
        
        // Ready toggle (for non-AI players)
        if (!player.ai && my > 290 && my < 310) {
          player.ready = !player.ready;
          selectedPlayerSlot = i;
          characterSelectOption = 2;
          return;
        }
        
        // Remove player
        if (my > 330 && my < 350 && players.filter(p => p.active).length > 1) {
          player.active = false;
          player.ready = false;
          player.controlled = false;
          console.log(`Removed player ${i + 1}`);
          return;
        }
      }
    }
    
    return;
  }
  
  if (battleState !== 'battle') {
    return;
  }

    // Handle pause button click (top-right) and pause menu interactions
    const mx = mouseX;
    const my = mouseY;
    const buttonSize = 40;
    const buttonX = width - buttonSize - 16;
    const buttonY = 16;

    // Click on the pause/menu button
    if (mx > buttonX && mx < buttonX + buttonSize && my > buttonY && my < buttonY + buttonSize) {
      pauseMenuOpen = true;
      pauseMenuOption = 0;
      return;
    }

    // If settings panel is open, any click will close it (placeholder behavior)
    if (pauseSettingsOpen) {
      pauseSettingsOpen = false;
      return;
    }

    // If pause menu is open, detect clicks on menu options
    if (pauseMenuOpen) {
      const menuWidth = 300;
      const menuHeight = 200;
      const menuX = (width - menuWidth) / 2;
      const menuY = (height - menuHeight) / 2;
      const optionHeight = 50;
      const optionStartY = menuY + 60;

      for (let i = 0; i < 2; i++) {
        const optionY = optionStartY + (i * optionHeight);
        if (mx > menuX + 20 && mx < menuX + 20 + (menuWidth - 40) && my > optionY && my < optionY + 40) {
          pauseMenuOption = i;
          if (i === 0) {
            pauseSettingsOpen = true;
          } else if (i === 1) {
            forfeitMatch();
          }
          return;
        }
      }

      // Click outside menu closes it
      pauseMenuOpen = false;
      return;
    }

  const controlledFighter = getPlayerControlledFighter();
  if (mouseButton === LEFT) {
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'attackPress', playerId: controlledFighter.playerId });
    }
    controlledFighter.requestAttack();
    lastMouseDown = millis();
  } else if (mouseButton === RIGHT) {
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'guardPress', playerId: controlledFighter.playerId });
    }
    controlledFighter.requestGuard(enemy);
  }
}

function drawUltimateName(fighter) {
  if (!fighter || !fighter.ultimateName) return;
  
  // Only show during starting pose (Phase 0)
  if (fighter.ultimatePhase !== 0) return;
  
  push();
  resetMatrix(); // Reset camera transforms for UI
  
  // Set text properties for full screen display
  textAlign(CENTER, CENTER);
  textSize(120); // Much larger text to take up whole screen
  fill(255, 255, 255, 220); // More opaque white
  stroke(0, 0, 0, 255); // Solid black stroke
  strokeWeight(8); // Thicker stroke for visibility
  
  // Draw ultimate name centered on screen
  const nameX = width / 2;
  const nameY = height / 2;
  
  text(fighter.ultimateName.toUpperCase(), nameX, nameY);
  pop();
}

function drawUltimateDamageCounter(fighter) {
  if (!fighter) return;
  
  push();
  resetMatrix(); // Reset camera transforms for UI
  
  // Set text properties
  textAlign(RIGHT, BOTTOM);
  textSize(24);
  fill(255, 255, 255, 220); // Semi-transparent white
  stroke(0, 0, 0, 200);
  strokeWeight(2);
  
  // Draw damage counter in bottom right corner
  const counterX = width - 20;
  const counterY = height - 20;
  
  text(`DAMAGE: ${Math.floor(fighter.ultimateTotalDamage)}`, counterX, counterY);
  pop();
}

function mouseReleased() {
  if (battleState !== 'battle') {
    return;
  }

  const controlledFighter = getPlayerControlledFighter();
  if (mouseButton === LEFT) {
    const held = millis() - (lastMouseDown || 0);
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'attackRelease', held, playerId: controlledFighter.playerId });
    }
    controlledFighter.releaseAttack(held > 300);
    lastMouseDown = null;
  } else if (mouseButton === RIGHT) {
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'guardRelease', playerId: controlledFighter.playerId });
    }
    controlledFighter.releaseGuard();
  }
}

function drawCharacterSelect() {
  background(20);

  // Title and Room Info
  push();
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text('CHARACTER SELECT', width / 2, 40);
  pop();

  // If we have an active room state, render the room and its slots
  if (myRoomState) {
    push();
    textAlign(LEFT, CENTER);
    textSize(16);
    fill(200);
    text(`Room: ${myRoomState.id}`, 20, 70);

    // Show leave button
    fill(180, 80, 80);
    rect(width - 140, 40, 120, 28, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('Leave Room', width - 80, 54);

    // Draw slots horizontally
    const slots = myRoomState.slots || [];
    const columnWidth = 220;
    const startX = (width - (Math.max(2, slots.length) * columnWidth)) / 2;

    for (let i = 0; i < Math.max(2, slots.length); i++) {
      const x = startX + i * columnWidth;
      const y = 130;

      // Slot background
      push();
      stroke(0);
      fill(40);
      rect(x, y, columnWidth - 20, 260, 8);
      pop();

      // Header
      push();
      textAlign(CENTER, CENTER);
      textSize(18);
      fill(200);
      text(`Slot ${i + 1}`, x + (columnWidth - 20) / 2, y + 20);
      pop();

      const slot = slots[i];

      if (!slot || !slot.character) {
        push();
        textAlign(CENTER, CENTER);
        textSize(14);
        fill(120);
        text('Empty', x + (columnWidth - 20) / 2, y + 70);
        fill(100, 255, 100);
        textSize(12);
        text('Click to join', x + (columnWidth - 20) / 2, y + 100);
        pop();
        continue;
      }

      const charKey = slot.character || '—';
      const charName = (window.CHARACTERS && window.CHARACTERS[charKey]) ? window.CHARACTERS[charKey].name : charKey;

      push();
      textAlign(CENTER, CENTER);
      textSize(16);
      if (slot.clientId === (Network && Network.socket && Network.socket.id)) {
        fill(100, 255, 100);
        text('(YOU)', x + (columnWidth - 20) / 2, y + 52);
      } else {
        fill(200);
      }
      text(charName, x + (columnWidth - 20) / 2, y + 80);
      pop();

      // Show player info
      push();
      textAlign(CENTER, CENTER);
      textSize(12);
      fill(180);
      text(`Player ${i + 1}`, x + (columnWidth - 20) / 2, y + 220);
      pop();
    }

    pop();
    return;
  }

  // Room selection screen if not in a room
  push();
  textAlign(CENTER, CENTER);
  textSize(24);
  fill(200);
  text('Join or Create a Room', width / 2, 80);
  
  // Available rooms
  textSize(16);
  fill(150);
  text('Available Rooms:', 50, 120);
  
  const availRooms = availableRooms || [];
  const roomButtonWidth = 200;
  const roomButtonHeight = 40;
  let roomY = 150;
  
  if (availRooms.length === 0) {
    fill(100);
    textSize(14);
    text('No rooms available', 50, roomY);
    roomY += 40;
  } else {
    for (let i = 0; i < availRooms.length; i++) {
      const roomId = availRooms[i];
      
      // Draw room button
      fill(60, 100, 60);
      stroke(100, 200, 100);
      strokeWeight(2);
      rect(50, roomY, roomButtonWidth, roomButtonHeight, 6);
      
      // Room label
      fill(100, 255, 100);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(14);
      text(`${roomId}`, 150, roomY + roomButtonHeight / 2);
      
      roomY += roomButtonHeight + 10;
    }
  }
  
  // Create new room section
  textSize(16);
  fill(150);
  text('Create New Room:', 50, roomY + 20);
  
  // Create room button
  fill(100, 100, 150);
  stroke(150, 150, 255);
  strokeWeight(2);
  const createButtonX = 50;
  const createButtonY = roomY + 50;
  rect(createButtonX, createButtonY, roomButtonWidth, roomButtonHeight, 6);
  
  fill(150, 150, 255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  text('Create New Room', createButtonX + roomButtonWidth / 2, createButtonY + roomButtonHeight / 2);
  
  pop();

  // Legacy column style when not using rooms
  // Draw player columns - Super Smash Bros style
  const columnWidth = 200;
  const startX = (width - (players.length * columnWidth)) / 2;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const x = startX + i * columnWidth;

    // Highlight selected player slot
    if (i === selectedPlayerSlot) {
      push();
      fill(100, 150, 255, 30);
      rect(x - 10, 80, columnWidth - 20, 400);
      pop();
    }

    // Player header
    push();
    textAlign(CENTER, CENTER);
    textSize(20);

    if (!player.active) {
      fill(100);
    } else if (i === selectedPlayerSlot && characterSelectOption === 0) {
      fill(100, 150, 255);
    } else {
      fill(255);
    }

    text(`P${i + 1}`, x + columnWidth/2, 100);

    if (!player.active) {
      const activeCount = players.filter(p => p.active).length;

      if (activeCount >= 3 && activeCount < MAX_PLAYERS && i === activeCount) {
        // Show "Add Player" option for the next available slot
        textSize(14);
        fill(100, 255, 100);
        text('Click to add', x + columnWidth/2, 125);
        textSize(12);
        fill(150);
        text('new player', x + columnWidth/2, 145);
      } else {
        // Show normal join option
        textSize(14);
        fill(150);
        text('Press A to join', x + columnWidth/2, 125);
      }
      pop();
      continue;
    }

    // Character selection
    textSize(16);
    fill(200);
    text('Character:', x + columnWidth/2, 160);

    if (i === selectedPlayerSlot && characterSelectOption === 0) {
      fill(100, 150, 255);
    } else {
      fill(255);
    }

    const charData = CHARACTERS && CHARACTERS[player.character] ? CHARACTERS[player.character] : null;
    text(charData ? charData.name : player.character, x + columnWidth/2, 180);

    // AI toggle
    textSize(16);
    fill(200);
    text('AI:', x + columnWidth/2, 220);

    if (i === selectedPlayerSlot && characterSelectOption === 1) {
      fill(100, 150, 255);
    } else {
      fill(255);
    }

    text(player.ai ? 'ON' : 'OFF', x + columnWidth/2, 240);

    // Ready status (only for non-AI players)
    if (!player.ai) {
      textSize(16);
      fill(200);
      text('Ready:', x + columnWidth/2, 280);

      if (player.ready) {
        fill(100, 255, 100);
        text('✓ READY', x + columnWidth/2, 300);
      } else {
        fill(255, 255, 100);
        text('Click to ready', x + columnWidth/2, 300);
      }
    } else {
      // Show auto-ready status for AI players
      textSize(16);
      fill(100, 255, 100);
      text('✓ Auto-ready', x + columnWidth/2, 290);
    }

    // Remove player option
    textSize(14);
    fill(200);
    text('Remove:', x + columnWidth/2, 330);

    if (i === selectedPlayerSlot && characterSelectOption === 3) {
      fill(255, 100, 100);
    } else {
      fill(255);
    }

    text('Click here', x + columnWidth/2, 350);

    // Control indicator
    if (player.controlled) {
      textSize(16);
      fill(100, 255, 100);
      text('YOU CONTROL', x + columnWidth/2, 390);
    }

    pop();
  }

  // Instructions
  push();
  textAlign(CENTER, CENTER);
  textSize(16);
  fill(150);
  text('Click on options to change them | Click "Click to ready" when prepared', width / 2, 500);

  // Show ready status
  const activePlayers = players.filter(p => p.active);
  const allReady = activePlayers.every(p => p.ready);

  if (allReady && activePlayers.length > 0) {
    fill(100, 255, 100);
    text('All players ready! Press ENTER to start battle', width / 2, 520);
  } else {
    fill(255, 255, 100);
    const notReadyCount = activePlayers.filter(p => !p.ready).length;
    text(`Waiting for ${notReadyCount} player(s) to ready up...`, width / 2, 520);
  }
  pop();
}

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}
