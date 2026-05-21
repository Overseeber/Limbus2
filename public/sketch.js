// Character roster system is globally available

const BATTLE_STATES = {
  MODE_SELECT: 'modeSelect',
  LOBBY: 'lobby',
  CHARACTER_SELECT_MENU: 'characterSelectMenu',
  CHARACTER_PREVIEW: 'characterPreview',
  READY: 'ready',
  OPENING: 'opening',
  BATTLE: 'battle',
  SUMMARY: 'summary'
};

let gameMode = null; // 'multiplayer' or 'cpu'
let player;
let enemy;
let battleState = BATTLE_STATES.MODE_SELECT;
let winner = null;
let summaryText = '';
let lastMouseDown = null;
let battleTimer = 0;

function setBattleState(newState) {
  console.log('[STATE] ->', newState);
  battleState = newState;
}

// Opening sequence variables
let openingSequenceTimer = 0;
let openingFadeAlpha = 255;
let openingZoom = 5; // Start zoomed in
let openingTextAlpha = 0;
let introAnimationsStarted = false;

// Character intro animation sequences
const INTRO_ANIMATIONS = {
  VALENCINA: {
    sprites: ['idle', 'prepat', 'd1', 's4f2', 's4f2', 's4f1'],
    duration: 0.2 // seconds per sprite
  },
  CALLISTO: {
    sprites: ['cidle', 'chalt', 'cuf2', 'cuf1'],
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
let roomCharacterSelectSlot = -1;
let availableCharacterKeys = () => {
  const registry = (typeof CHARACTERS !== 'undefined') ? CHARACTERS : (window.CHARACTERS || {});
  return Object.keys(registry || {});
};
// Current previewed character for the new selection flow
let previewCharacterKey = null;

// Buttons for character cards in the menu (rebuilt each frame)
let characterCardButtons = [];
// Buttons for the preview screen (rebuilt each frame)
let previewButtons = [];
// Mode select buttons
let modeSelectButtons = [];

// CPU mode variables
let cpuOpponentCharacter = null;


// Reusable UI button class
const DEBUG_UI = false;
class UIButton {
  constructor(x, y, w, h, onClick) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.onClick = onClick;
    this.enabled = true;
    this.label = "";
    this.data = null; // optional per-button payload
  }

  draw(label, style = {}) {
    this.label = label;
    push();
    stroke(style.stroke || 0);
    strokeWeight(style.strokeWeight || 2);
    fill(style.fill || 80);
    rect(this.x, this.y, this.w, this.h, 6);
    fill(style.text || 255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(style.textSize || 14);
    text(label, this.x + this.w / 2, this.y + this.h / 2);
    pop();
  }

  contains(mx, my) {
    return this.enabled && mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
  }

  click(mx, my) {
    if (this.contains(mx, my)) {
      if (DEBUG_UI) console.log("UIButton clicked:", this.label);
      this.onClick?.();
      return true;
    }
    return false;
  }
}

// Room layout constants (must match drawLobby exactly)
const SLOT_COLUMN_W = 220;
const SLOT_CONTENT_W = SLOT_COLUMN_W - 20; // 200
const SLOT_Y = 130;
const SLOT_H = 260;
const BTN_X_OFFSET = 10;
const BTN_W = SLOT_COLUMN_W - 40; // 180
const BTN_CHANGE_OFFSET_Y = 170; // from slot top
const BTN_CHANGE_H = 28;
const BTN_READY_OFFSET_Y = 210; // from slot top
const BTN_READY_H = 30;

// Room slot buttons (rebuilt each frame)
let roomSlotButtons = [];

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
    Network.on('battleStart', (data) => {
      // This room's battle has started. Initialize battle from the player data.
      console.log('battleStart received', data);
      if (data && data.slots) {
        initRoomBattle(data.slots);
      }
    });
    Network.on('peerInput', (payload) => {
      handleRoomPeerInput(payload);
    });
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

  setBattleState(BATTLE_STATES.OPENING);
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

function initRoomBattle(slots) {
  // Initialize battle from room slot data
  // slots: [{clientId, character, ready}]
  const activePlayers = slots.filter(s => s && s.clientId);
  
  if (activePlayers.length < 2) {
    console.log('Need at least 2 players for battle!');
    return;
  }
  
  const fighters = [];
  const mySocketId = Network && Network.socket ? Network.socket.id : null;
  
  for (let i = 0; i < activePlayers.length; i++) {
    const slot = activePlayers[i];
    const characterKey = slot.character || 'JOHN';
    const isLocalPlayer = slot.clientId === mySocketId;
    
    const fighter = new Fighter(false, `P${i + 1}`, characterKey, true);
    fighter.playerId = i + 1;
    fighter.clientId = slot.clientId;
    fighter.isLocalPlayer = isLocalPlayer;
    fighter.isAI = false;
    fighter.isPlayerControlled = true;
    
    const spacing = 300;
    const centerX = width / 2;
    const totalWidth = (activePlayers.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;
    
    fighter.pos.x = startX + (i * spacing);
    fighter.pos.y = height - 100;
    fighter.facing = isLocalPlayer ? 1 : -1;
    
    fighters.push(fighter);
  }
  
  window.allFighters = fighters;
  player = fighters.find(f => f.isLocalPlayer);
  enemy = fighters.find(f => !f.isLocalPlayer) || fighters.find(f => f !== player);
  
  setBattleState(BATTLE_STATES.OPENING);
  winner = null;
  summaryText = '';
  battleTimer = 0;
  
  openingSequenceTimer = 0;
  openingFadeAlpha = 255;
  openingZoom = 5;
  openingTextAlpha = 0;
  introAnimationsStarted = false;
  
  fighters.forEach(f => f.reset());
  damageNumbers = [];
  
  // Clear room state since we're now in battle
  myRoomState = null;
}

function initCPUBattle() {
  // Initialize local offline battle against AI
  // Player uses players[0] with selected character
  // AI opponent uses cpuOpponentCharacter
  
  const playerCharacter = players[0].character || 'VALENCINA';
  const aiCharacter = cpuOpponentCharacter || 'CALLISTO';
  
  const fighters = [];
  
  // Player fighter (player-controlled)
  const playerFighter = new Fighter(false, 'P1', playerCharacter, true);
  playerFighter.playerId = 1;
  playerFighter.isAI = false;
  playerFighter.isPlayerControlled = true;
  playerFighter.pos.x = width / 2 - 150;
  playerFighter.pos.y = height - 100;
  playerFighter.facing = 1;
  fighters.push(playerFighter);
  
  // AI opponent
  const aiFighter = new Fighter(true, 'P2', aiCharacter, false);
  aiFighter.playerId = 2;
  aiFighter.isAI = true;
  aiFighter.isPlayerControlled = false;
  aiFighter.pos.x = width / 2 + 150;
  aiFighter.pos.y = height - 100;
  aiFighter.facing = -1;
  fighters.push(aiFighter);
  
  window.allFighters = fighters;
  player = playerFighter;
  enemy = aiFighter;
  
  setBattleState(BATTLE_STATES.OPENING);
  winner = null;
  summaryText = '';
  battleTimer = 0;
  
  openingSequenceTimer = 0;
  openingFadeAlpha = 255;
  openingZoom = 5;
  openingTextAlpha = 0;
  introAnimationsStarted = false;
  
  fighters.forEach(f => f.reset());
  damageNumbers = [];
}

function handleRoomPeerInput(payload) {
  // Only handle in multiplayer mode
  if (gameMode !== 'multiplayer') return;
  
  if (!payload || !payload.from || !payload.data || !window.allFighters) return;
  const remoteFighter = window.allFighters.find(f => f.clientId === payload.from);
  if (!remoteFighter) return;

  const input = payload.data;
  if (input.type === 'keyPressed' && input.key) {
    remoteFighter.processKeyPressed(input.key);
  } else if (input.type === 'keyReleased' && input.key) {
    remoteFighter.processKeyReleased(input.key);
  } else if (input.type === 'mouse') {
    if (input.action === 'attackPress') {
      remoteFighter.requestAttack();
    } else if (input.action === 'attackRelease') {
      remoteFighter.releaseAttack(false);
    } else if (input.action === 'guardPress') {
      remoteFighter.requestGuard();
    } else if (input.action === 'guardRelease') {
      remoteFighter.releaseGuard();
    } else if (input.action === 'evadePress') {
      remoteFighter.requestEvade();
    } else if (input.action === 'dash') {
      if (typeof remoteFighter.startDash === 'function') {
        remoteFighter.startDash();
      }
    }
  }
}

function draw() {
  // Process pending scene transitions (safely delayed to next frame)
  // This prevents same-frame UI destruction from breaking button click context

  if (frameCount % 60 === 0) {
    console.log('[DEBUG] battleState =', battleState, 'gameMode =', gameMode);
  }

  if (battleState === BATTLE_STATES.MODE_SELECT) {
    drawModeSelectScreen();
  } else if (battleState === BATTLE_STATES.CHARACTER_SELECT_MENU) {
    drawCharacterSelectMenu();
  } else if (battleState === BATTLE_STATES.CHARACTER_PREVIEW) {
    drawCharacterPreview();
  } else if (battleState === BATTLE_STATES.LOBBY) {
    drawLobby();
  } else if (battleState === BATTLE_STATES.READY) {
    drawReadyScreen();
  } else if (battleState === BATTLE_STATES.OPENING) {
    drawOpeningSequence();
  } else if (battleState === BATTLE_STATES.BATTLE) {
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
    
    // Draw black edge covers to mask areas where the background doesn't reach
    //drawEdgeCovers();
    
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
  } else if (battleState === BATTLE_STATES.SUMMARY) {
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

  if (battleState !== BATTLE_STATES.LOBBY && battleState !== BATTLE_STATES.OPENING) {
    drawHud();
  }
}

function drawModeSelectScreen() {
  background(20);
  
  push();
  textAlign(CENTER, CENTER);
  textSize(52);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text('GAME MODE', width / 2, 80);
  pop();
  
  push();
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(200);
  text('Choose your preferred game mode', width / 2, 150);
  pop();
  
  // Multiplayer button
  const multiplayerBtnX = width / 2 - 220;
  const multiplayerBtnY = height / 2 + 60;
  const btnW = 200;
  const btnH = 60;
  
  push();
  stroke(80, 150, 200);
  strokeWeight(3);
  fill(50, 100, 150);
  rect(multiplayerBtnX, multiplayerBtnY, btnW, btnH, 12);
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  text('Multiplayer', multiplayerBtnX + btnW / 2, multiplayerBtnY + btnH / 2);
  pop();
  
  // CPU button
  const cpuBtnX = width / 2 + 20;
  const cpuBtnY = multiplayerBtnY;
  
  push();
  stroke(150, 80, 200);
  strokeWeight(3);
  fill(100, 50, 150);
  rect(cpuBtnX, cpuBtnY, btnW, btnH, 12);
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  text('Against CPU', cpuBtnX + btnW / 2, cpuBtnY + btnH / 2);
  pop();
  
  push();
  textAlign(CENTER, CENTER);
  textSize(14);
  fill(150);
  text('Play online with other players', multiplayerBtnX + btnW / 2, multiplayerBtnY + btnH + 30);
  text('Practice against AI opponent', cpuBtnX + btnW / 2, cpuBtnY + btnH + 30);
  pop();
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
    setBattleState(BATTLE_STATES.BATTLE);
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

// function drawEdgeCovers() {
//   // Draw black rectangles covering areas where the background image doesn't reach
//   // (left and right edges if the scaled background width is less than the arena width)
//   const bgWidth = window.bgScaledWidth || ARENA_WIDTH;
  
//   if (bgWidth >= ARENA_WIDTH) return; // No gaps to cover
  
//   const arenaCenterX = ARENA_WIDTH / 2;
//   const bgLeftX = arenaCenterX - (bgWidth / 2);
//   const bgRightX = arenaCenterX + (bgWidth / 2);
  
//   noStroke();
//   fill(255);
  
//   // Left edge cover
//   rect(0, 0, bgLeftX, ARENA_HEIGHT);
  
//   // Right edge cover
//   rect(bgRightX, 0, ARENA_WIDTH - bgRightX, ARENA_HEIGHT);
// }

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
  fill(0);
  rect(-500,0,500,height);
  rect(width,0,500,height);
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
      setBattleState(BATTLE_STATES.SUMMARY);
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
  if ((pauseMenuOpen || pauseSettingsOpen) && battleState === BATTLE_STATES.BATTLE) {
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
  if (battleState === BATTLE_STATES.BATTLE && keyCode === ESCAPE) {
    pauseMenuOpen = true;
    pauseMenuOption = 0;
    return;
  }
  
  if (battleState === BATTLE_STATES.LOBBY) {
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
          console.log('Changing character to:', keys[next]);
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
  
  if (battleState === BATTLE_STATES.READY && keyCode === ENTER) {
    if (gameMode === 'cpu') {
      initCPUBattle();
    } else {
      setBattleState(BATTLE_STATES.BATTLE);
    }
    return;
  }
  if (battleState === BATTLE_STATES.SUMMARY && keyCode === ENTER) {
    // Return to mode select to allow changing game mode
    gameMode = null;
    setBattleState(BATTLE_STATES.MODE_SELECT);
    return;
  }
  if (battleState === BATTLE_STATES.BATTLE) {
    const controlledFighter = getPlayerControlledFighter();
    if (controlledFighter) {
      // Send input intent to server/local simulator (only for multiplayer)
      if (gameMode === 'multiplayer' && typeof Network !== 'undefined' && Network.sendInput) {
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
  // Immediately return to lobby and clear fighters
  pauseMenuOpen = false;
  pauseSettingsOpen = false;
  window.allFighters = null;
  player = null;
  enemy = null;
  setBattleState(BATTLE_STATES.LOBBY);
  console.log('Match forfeited - returning to lobby');
}

function keyReleased() {
  if (battleState === BATTLE_STATES.BATTLE) {
    const controlledFighter = getPlayerControlledFighter();
    if (controlledFighter) {
      if (gameMode === 'multiplayer' && typeof Network !== 'undefined' && Network.sendInput) {
        Network.sendInput({ type: 'keyReleased', key, playerId: controlledFighter.playerId });
      }
      controlledFighter.processKeyReleased(key);
    }
  }
}

function mousePressed() {
  console.log('MOUSE PRESSED FIRED');
  console.log('battleState', battleState);
console.log('myRoomState', myRoomState);
  if (battleState === BATTLE_STATES.MODE_SELECT) {
    const mx = mouseX;
    const my = mouseY;
    
    // Multiplayer button
    const multiplayerBtnX = width / 2 - 220;
    const multiplayerBtnY = height / 2 + 60;
    const btnW = 200;
    const btnH = 60;
    
    if (mx > multiplayerBtnX && mx < multiplayerBtnX + btnW && my > multiplayerBtnY && my < multiplayerBtnY + btnH) {
      gameMode = 'multiplayer';
      setBattleState(BATTLE_STATES.LOBBY);
      return;
    }
    
    // CPU button
    const cpuBtnX = width / 2 + 20;
    const cpuBtnY = height / 2 + 60;
    
    if (mx > cpuBtnX && mx < cpuBtnX + btnW && my > cpuBtnY && my < cpuBtnY + btnH) {
      gameMode = 'cpu';
      // For CPU mode, go straight to character select for the player
      const cpuCharacters = availableCharacterKeys();
      cpuOpponentCharacter = cpuCharacters[Math.floor(Math.random() * cpuCharacters.length)];
      // Reset player slot for local play
      players[0].character = 'VALENCINA';
      players[0].ai = false;
      players[0].controlled = true;
      players[0].ready = false;
      setBattleState(BATTLE_STATES.CHARACTER_SELECT_MENU);
      return;
    }
  }
  
  if (battleState === BATTLE_STATES.LOBBY && myRoomState) {
    const mx = mouseX;
    const my = mouseY;
    
    // Check Leave Room button click
    if (mx > width - 140 && mx < width - 20 && my > 40 && my < 68) {
      Network.leaveRoom();
      myRoomState = null;
      myRoomId = null;
      localSlotSelections = [];
      return;
    }
    
    const slots = myRoomState.slots || [];

    // Check Start Battle button click
    if (myRoomState.allReady) {
      const btnX = width / 2 - 100;
      const btnY = 430;
      if (mx > btnX && mx < btnX + 200 && my > btnY && my < btnY + 50) {
        console.log('Sending startBattle');
        Network.startBattle();
        return;
      }
    }

    // Check button clicks first (UIButton system)
    for (const btn of roomSlotButtons) {
      if (btn.click(mx, my)) return;
    }

    // Clicking anywhere on an owned slot opens character select
    const columnWidth = SLOT_COLUMN_W;
    const count = Math.max(2, slots.length);
    const startX = (width - (count * columnWidth)) / 2;

    for (let i = 0; i < count; i++) {
      const x = startX + i * columnWidth;

const slotWidth = columnWidth - 20;

if (
  mx >= x &&
  mx <= x + slotWidth &&
  my >= SLOT_Y &&
  my <= SLOT_Y + SLOT_H
) {
  console.log('chgaeck', i);
        const slot = slots[i];
        if (!slot || !slot.clientId) return; // empty slot

        const isOwnedSlot = (Network && Network.socket && slot.clientId === Network.socket.id) || (Network && Network.isLocalAuthority && slot.clientId === 'local');
        if (!isOwnedSlot) return;

    
      roomCharacterSelectSlot = i;
      previewCharacterKey = localSlotSelections[i] || keys[0];

      console.log('OPEN CHARACTER SELECT MENU');
      setBattleState(BATTLE_STATES.CHARACTER_SELECT_MENU);
        return;
      }
    }

    return;
  }
  // Character Select menu / preview handlers
  if (battleState === BATTLE_STATES.CHARACTER_SELECT_MENU) {
    handleCharacterMenuClick(mouseX, mouseY);
    return;
  }
  if (battleState === BATTLE_STATES.CHARACTER_PREVIEW) {
    handleCharacterPreviewClick(mouseX, mouseY);
    return;
  }

  if (battleState === BATTLE_STATES.LOBBY && !myRoomState) {
    const mx = mouseX;
    const my = mouseY;
    
    const availRooms = availableRooms || [];
    const roomButtonWidth = 260;
    const roomButtonHeight = 60;
    const roomStartX = (width - roomButtonWidth) / 2;
    let roomY = 150;
    
    // Check clicks on available room buttons
    if (availRooms.length > 0) {
      for (let i = 0; i < availRooms.length; i++) {
        const roomData = availRooms[i];
        const roomId = typeof roomData === 'string' ? roomData : roomData.id;
        if (mx > roomStartX && mx < roomStartX + roomButtonWidth && my > roomY && my < roomY + roomButtonHeight) {
          Network.joinRoom(roomId);
          return;
        }
        roomY += roomButtonHeight + 12;
      }
    } else {
      roomY += 40;
    }
    
    // Check click on Create New Room button
    const createButtonX = (width - roomButtonWidth) / 2;
    const createButtonY = roomY + 50;
    if (mx > createButtonX && mx < createButtonX + roomButtonWidth && my > createButtonY && my < createButtonY + roomButtonHeight) {
      const newRoomId = `room-${Date.now()}`;
      Network.createRoom(newRoomId);
      return;
    }
  }

  if (battleState === BATTLE_STATES.LOBBY) {
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
  
  if (battleState !== BATTLE_STATES.BATTLE) {
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
    if (gameMode === 'multiplayer' && typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'attackPress', playerId: controlledFighter.playerId });
    }
    controlledFighter.requestAttack();
    lastMouseDown = millis();
  } else if (mouseButton === RIGHT) {
    if (gameMode === 'multiplayer' && typeof Network !== 'undefined' && Network.sendInput) {
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
  if (battleState !== BATTLE_STATES.BATTLE) {
    return;
  }

  const controlledFighter = getPlayerControlledFighter();
  if (mouseButton === LEFT) {
    const held = millis() - (lastMouseDown || 0);
    if (gameMode === 'multiplayer' && typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'attackRelease', held, playerId: controlledFighter.playerId });
    }
    controlledFighter.releaseAttack(held > 300);
    lastMouseDown = null;
  } else if (mouseButton === RIGHT) {
    if (gameMode === 'multiplayer' && typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'guardRelease', playerId: controlledFighter.playerId });
    }
    controlledFighter.releaseGuard();
  }
}

// New Character Select: menu + preview

function drawCharacterSelectMenu() {
  background(24);
  push();
  textAlign(CENTER, CENTER);
  textSize(34);
  fill(240);
  stroke(0);
  strokeWeight(3);
  text('CHARACTER SELECT', width / 2, 48);
  pop();

  const keys = availableCharacterKeys();
  // Responsive card sizing
  const cardW = 180;
  const cardH = 96;
  const spacing = 20;
  const cols = Math.max(1, Math.floor((width - 120) / (cardW + spacing)));
  const rows = Math.ceil(keys.length / cols);
  const totalW = cols * cardW + (cols - 1) * spacing;
  const startX = (width - totalW) / 2;
  const startY = 120;

  characterCardButtons = [];

  for (let i = 0; i < keys.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + spacing);
    const y = startY + row * (cardH + spacing);
    const key = keys[i];
    const data = window.CHARACTERS && window.CHARACTERS[key] ? window.CHARACTERS[key] : { name: key, title: '' };

    // Base card (drawn by UIButton to ensure exact clickable bounds)
    const btn = new UIButton(x, y, cardW, cardH, () => {
      previewCharacterKey = key;
      console.log('SELECT CHARACTER', key);
      setBattleState(BATTLE_STATES.CHARACTER_PREVIEW);
    });
    btn.draw('', { stroke: previewCharacterKey === key ? [120, 200, 255] : [60, 60, 80], fill: previewCharacterKey === key ? [30, 40, 60] : [20, 24, 30], text: 255 });
    characterCardButtons.push(btn);

    // Portrait box
    push();
    noStroke();
    fill(40);
    rect(x + 8, y + 8, 80, cardH - 16, 8);
    fill(200);
    textAlign(LEFT, TOP);
    textSize(14);
    text(data.name || key, x + 100, y + 12);
    textSize(12);
    fill(170);
    text(data.title || 'Fighter', x + 100, y + 34);
    pop();
  }

  push();
  textAlign(CENTER, CENTER);
  textSize(12);
  fill(180);
  text('Click a card to inspect the character. Confirm in the preview to lock selection.', width / 2, height - 30);
  pop();
}

function drawCharacterPreview() {
  background(18);
  push();
  textAlign(CENTER, CENTER);
  textSize(34);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text('CHARACTER PREVIEW', width / 2, 48);
  pop();

  const key = previewCharacterKey || (availableCharacterKeys()[0] || null);
  const data = key && window.CHARACTERS && window.CHARACTERS[key] ? window.CHARACTERS[key] : { name: key || '-', title: '' };

  const previewX = width * 0.12;
  const previewY = 120;
  const previewW = width * 0.48;
  const previewH = height - 240;

  push();
  fill(30);
  stroke(80);
  strokeWeight(2);
  rect(previewX, previewY, previewW, previewH, 12);
  pop();

  // Name + subtitle
  push();
  textAlign(LEFT, TOP);
  textSize(28);
  fill(255);
  text(data.name || key, previewX + 18, previewY + 18);
  textSize(14);
  fill(180);
  text(data.title || 'Combat specialist', previewX + 18, previewY + 52);
  pop();

  // Placeholder lore/kit/moves
  push();
  textAlign(LEFT, TOP);
  textSize(13);
  fill(200);
  text('Lore: Placeholder lore text describing the character and flavour.', previewX + 18, previewY + 90, previewW - 36, 160);
  text('Kit: Aggressive close-range fighter. Placeholder passive. Placeholder ultimate.', previewX + 18, previewY + 160, previewW - 36, 120);
  text('Moves:\n- Jab: Quick close-range attack\n- Dash: Fast approach\n- Ultimate: Placeholder ultimate', previewX + 18, previewY + 260, previewW - 36, 200);
  pop();

  // Large portrait area on right
  const portX = previewX + previewW + 30;
  const portY = previewY + 20;
  const portW = width - portX - 40;
  const portH = 420;
  push();
  fill(36);
  stroke(90);
  rect(portX, portY, portW, portH, 12);
  pop();

  // Buttons: Cancel / Confirm / Back
  previewButtons = [];
  const buttonW = 220;
  const buttonH = 52;
  const buttonY = height - 100;
  const cancelX = width / 2 - buttonW - 24;
  const confirmX = width / 2 + 24;

  const cancelBtn = new UIButton(cancelX, buttonY, buttonW, buttonH, () => {
    console.log('CANCEL PREVIEW');
    setBattleState(BATTLE_STATES.CHARACTER_SELECT_MENU);
  });
  cancelBtn.draw('CANCEL', { stroke: [120, 120, 120], fill: [50, 50, 50], text: 255 });
  previewButtons.push(cancelBtn);

  const confirmBtn = new UIButton(confirmX, buttonY, buttonW, buttonH, () => {
    const sel = previewCharacterKey;
    console.log('CONFIRM CHARACTER', sel);
    if (roomCharacterSelectSlot >= 0) {
      localSlotSelections[roomCharacterSelectSlot] = sel;
    }
    if (gameMode === 'multiplayer' && sel && typeof Network !== 'undefined' && Network.changeCharacter) {
      Network.changeCharacter(sel);
    }
    // Clear preview
    previewCharacterKey = null;
    roomCharacterSelectSlot = -1;
    
    if (gameMode === 'cpu') {
      // For CPU mode, go straight to ready screen
      setBattleState(BATTLE_STATES.READY);
    } else {
      // For multiplayer, return to lobby
      setBattleState(BATTLE_STATES.LOBBY);
    }
    console.log('TRANSITION TO', gameMode === 'cpu' ? 'READY' : 'LOBBY');
  });
  confirmBtn.draw('CONFIRM', { stroke: [80, 180, 80], fill: [40, 90, 40], text: 255 });
  previewButtons.push(confirmBtn);

  // Back button (top-left)
  const backBtn = new UIButton(18, 18, 100, 34, () => {
    console.log('BACK TO MENU');
    setBattleState(BATTLE_STATES.CHARACTER_SELECT_MENU);
  });
  backBtn.draw('BACK', { stroke: [100, 100, 100], fill: [30, 30, 30], text: 255, textSize: 12 });
  previewButtons.push(backBtn);
}

function handleCharacterMenuClick(mx, my) {
  for (const btn of characterCardButtons) {
    if (btn.click(mx, my)) return;
  }
}

function handleCharacterPreviewClick(mx, my) {
  for (const btn of previewButtons) {
    if (btn.click(mx, my)) return;
  }
}

function drawLobby() {
  background(20);

  // Title and Room Info
  push();
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text('LOBBY', width / 2, 40);
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

    // Rebuild room slot buttons
    roomSlotButtons = [];

    // Draw slots horizontally
    const slots = myRoomState.slots || [];
    const columnWidth = SLOT_COLUMN_W;
    const startX = (width - (Math.max(2, slots.length) * columnWidth)) / 2;

    for (let i = 0; i < Math.max(2, slots.length); i++) {
      const x = startX + i * columnWidth;
      const y = SLOT_Y;

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

      if (!slot || !slot.clientId) {
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

      const isOwnedSlot = (Network && Network.socket && slot.clientId === Network.socket.id) || (Network && Network.isLocalAuthority && slot.clientId === 'local');
      const isHoveredSlot = isOwnedSlot && mouseX > x && mouseX < x + columnWidth && mouseY > y && mouseY < y + SLOT_H;
      let charKey = slot.character || '—';
      if (localSlotSelections[i]) {
        charKey = localSlotSelections[i];
      }
      const charName = (window.CHARACTERS && window.CHARACTERS[charKey]) ? window.CHARACTERS[charKey].name : charKey;

      if (!slot.character) {
        push();
        textAlign(CENTER, CENTER);
        textSize(14);
        fill(180);
        text('No character selected', x + (columnWidth - 20) / 2, y + 70);
        pop();
      }

      // Slot highlight for owned hover state
      if (isHoveredSlot) {
        push();
        noFill();
        stroke(100, 180, 255);
        strokeWeight(4);
        rect(x + 2, y + 2, columnWidth - 24, SLOT_H - 4, 8);
        pop();
      }

      push();
      textAlign(CENTER, CENTER);
      textSize(16);
      if (isOwnedSlot) {
        fill(100, 255, 100);
        text('(YOU)', x + (columnWidth - 20) / 2, y + 52);
      } else {
        fill(200);
      }
      text(charName, x + (columnWidth - 20) / 2, y + 80);
      pop();
push();
noFill();
stroke(255,0,0);
strokeWeight(3);
rect(x, SLOT_Y, columnWidth - 20, SLOT_H);
pop();
      // Show ready state
      push();
      textAlign(CENTER, CENTER);
      textSize(14);
      if (slot.ready) {
        fill(100, 255, 100);
        text('✓ READY', x + (columnWidth - 20) / 2, y + 140);
      } else {
        fill(255, 255, 100);
        text('NOT READY', x + (columnWidth - 20) / 2, y + 140);
      }
      pop();

      // Show instructions for the current player's slot
      if (isOwnedSlot) {
        push();
        textAlign(CENTER, CENTER);
        textSize(12);
        fill(150);
        text('Open the character browser to change', x + (columnWidth - 20) / 2, y + 160);
        text('your selection, then confirm in the preview screen.', x + (columnWidth - 20) / 2, y + 176);
        pop();

        const btnX = x + BTN_X_OFFSET;
        const changeBtnY = y + BTN_CHANGE_OFFSET_Y;
        const readyBtnY = y + BTN_READY_OFFSET_Y;

        // Create and draw Change Character button
     const changeBtn = new UIButton(btnX, changeBtnY, BTN_W, BTN_CHANGE_H, () => {
  const keys = availableCharacterKeys();
  if (keys.length === 0) return;

      roomCharacterSelectSlot = i;
      previewCharacterKey = localSlotSelections[i] || keys[0];
      console.log('OPEN CHARACTER SELECT MENU');
      setBattleState(BATTLE_STATES.CHARACTER_SELECT_MENU);
});
        changeBtn.draw('CHANGE CHARACTER', { stroke: [100, 160, 255], fill: [40, 70, 120], text: 255, textSize: 12 });
        roomSlotButtons.push(changeBtn);

        // Create and draw ready/unready button
        const readyStyle = slot.ready
          ? { stroke: [255, 100, 100], fill: [100, 80, 80], text: 255, textSize: 14 }
          : { stroke: [100, 255, 100], fill: [60, 100, 60], text: 255, textSize: 14 };
        const readyBtn = new UIButton(btnX, readyBtnY, BTN_W, BTN_READY_H, () => {
          Network.toggleReady();
        });
        readyBtn.draw(slot.ready ? 'UNREADY' : 'TOGGLE READY', readyStyle);
        roomSlotButtons.push(readyBtn);

        // Reset stroke for p5
        stroke(0);
        strokeWeight(1);
      } else {
        // Show other player info
        push();
        textAlign(CENTER, CENTER);
        textSize(12);
        fill(180);
        text(`Player ${i + 1}`, x + (columnWidth - 20) / 2, y + 220);
        pop();
      }
    }

    // Show Start Battle button if all players are ready
    if (myRoomState.allReady) {
      push();
      const btnX = width / 2 - 100;
      const btnY = 430;
      fill(60, 180, 60);
      stroke(100, 255, 100);
      strokeWeight(3);
      rect(btnX, btnY, 200, 50, 10);
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(20);
      text('START BATTLE!', width / 2, btnY + 25);
      stroke(0);
      strokeWeight(1);
      pop();
    } else {
      // Show waiting text
      push();
      textAlign(CENTER, CENTER);
      textSize(16);
      fill(255, 255, 100);
      const notReady = (myRoomState.slots || []).filter(s => s && s.clientId && !s.ready).length;
      text(`Waiting for ${notReady} player(s) to ready up...`, width / 2, 450);
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
  text('FIND MATCH', width / 2, 80);
  
  // Available rooms
  textSize(16);
  fill(150);
  text('Available Rooms:', width / 2, 120);
  
  const availRooms = availableRooms || [];
  const roomButtonWidth = 260;
  const roomButtonHeight = 60; // Taller to fit name + player squares
  const roomStartX = (width - roomButtonWidth) / 2;
  let roomY = 150;
  
  if (availRooms.length === 0) {
    fill(100);
    textSize(14);
    text('No rooms available — create one!', width / 2, roomY);
    roomY += 40;
  } else {
    for (let i = 0; i < availRooms.length; i++) {
      const roomData = availRooms[i];
      const roomId = typeof roomData === 'string' ? roomData : roomData.id;
      const players = typeof roomData === 'string' ? 0 : (roomData.players || 0);
      const maxPlayers = typeof roomData === 'string' ? 2 : (roomData.maxPlayers || 2);
      
      // Draw room button
      fill(60, 100, 60);
      stroke(100, 200, 100);
      strokeWeight(2);
      rect(roomStartX, roomY, roomButtonWidth, roomButtonHeight, 8);
      
      // Room label
      fill(100, 255, 100);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(14);
      text(`${roomId}`, width / 2, roomY + 20);
      
      // Draw player count squares
      const squareSize = 16;
      const squareGap = 6;
      const totalWidth = maxPlayers * (squareSize + squareGap) - squareGap;
      const squaresStartX = (width - totalWidth) / 2;
      const squaresY = roomY + 42;
      
      for (let j = 0; j < maxPlayers; j++) {
        const sx = squaresStartX + j * (squareSize + squareGap);
        if (j < players) {
          fill(100, 255, 100); // Green = occupied
        } else {
          fill(40, 60, 40); // Dark = empty
        }
        noStroke();
        rect(sx, squaresY, squareSize, squareSize, 3);
      }
      
      roomY += roomButtonHeight + 12;
    }
  }
  
  // Create new room section
  textSize(16);
  fill(150);
  text('Create New Room:', width / 2, roomY + 20);
  
  // Create room button (centered)
  fill(100, 100, 150);
  stroke(150, 150, 255);
  strokeWeight(2);
  const createButtonX = (width - roomButtonWidth) / 2;
  const createButtonY = roomY + 50;
  rect(createButtonX, createButtonY, roomButtonWidth, roomButtonHeight, 8);
  
  fill(150, 150, 255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  text('Create New Room', width / 2, createButtonY + roomButtonHeight / 2);
  
  pop();
}

function getCharacterIdleSpriteName(characterKey) {
  if (characterKey === 'CALLISTO') return 'cidle';
  if (characterKey === 'VALENCINA') return 'idle';
  return 'idle';
}

// (old fullscreen character select removed)

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}
