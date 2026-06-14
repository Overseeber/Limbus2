// Character roster system is globally available

const BATTLE_STATES = {
  MODE_SELECT: 'modeSelect',
  LOBBY: 'lobby',
  CHARACTER_SELECT_MENU: 'characterSelectMenu',
  CHARACTER_PREVIEW: 'characterPreview',
  CPU_OPPONENT_CONFIG: 'cpuOpponentConfig',
  READY: 'ready',
  OPENING: 'opening',
  BATTLE: 'battle',
  SUMMARY: 'summary',
  COMBAT_OVER: 'combatOver'
};

// Unified pre-match state system
const PRE_MATCH_STATES = {
  LOBBY: 'lobby',
  CHARACTER_SELECT: 'characterSelect',
  CHARACTER_INSPECT: 'characterInspect'
};

// Character cycling order
const CHARACTER_ORDER = ['VALENCINA', 'CALLISTO', 'DIHUI'];

// Character art asset mapping
const CHARACTER_ART_ASSETS = {
  'VALENCINA': 'vals',
  'CALLISTO': 'cals',
  'DIHUI': 'dstar'
};

// Character kit asset mapping
const CHARACTER_KIT_ASSETS = {
  'VALENCINA': 'valkit',
  'CALLISTO': 'calkit',
  'DIHUI': 'starkit'
};

// Character passive asset mapping
const CHARACTER_PASSIVE_ASSETS = {
  'VALENCINA': 'valpassive',
  'CALLISTO': 'calpassive',
  'DIHUI': 'starpassive'
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
  
  // Initialize unified pre-match system when entering lobby
  if (newState === BATTLE_STATES.LOBBY && battleState !== BATTLE_STATES.LOBBY) {
    preMatchState = PRE_MATCH_STATES.LOBBY;
    currentViewedCharacter = localSelectedCharacter;
    inspectPage = 'active';
    isFading = false;
    characterFadeAlpha = 0;
    targetCharacter = null;
  }
  
  battleState = newState;
}

// Opening sequence variables
let openingSequenceTimer = 0;
let openingFadeAlpha = 255;
let openingZoom = 5; // Start zoomed in
let openingTextAlpha = 0;
let introAnimationsStarted = false;

// Ending sequence variables
let endingSequenceActive = false;
let endingSequenceTimer = 0;
let endingStartZoom = 1;
let endingTargetZoom = 1;
let endingZoomDuration = 1.6; // seconds to zoom out
let endingHoldDuration = 2.0; // hold arena view
let endingTextAlpha = 0;
let endingWinnerId = null;
let endingWinnerCharacter = null;
let showCombatOverMenu = false;
let endingFading = false;
let endingFadeDuration = 0.6;
let endingFadeTimer = 0;
let endingFadeAlpha = 0;
let endingReturnToLobby = false;
let combatOverOutcome = '';
let combatOverLine = '';
// Client-side snapshot interpolation (ms)
const SNAPSHOT_INTERVAL_MS = 50; // server tick at 50ms

// Combat Impact Zoom System
// Client-side camera effects driven by server-authoritative state
// DO NOT calculate gameplay here - only visual zoom effects
const COMBAT_ZOOM = {
    // Unified zoom intensities - all attacks use same slam-level intensity
    // Magnification: target / divisor, e.g., 1.0 / 0.70 = 1.43x
    ZOOM_IN_UNIFIED: 0.70,    // All normal attacks (light, medium, heavy, dash, slam) = 1.43x magnification
    ZOOM_IN_COMBO3: 0.72,     // Combo finisher (sequence 3 attacks) = 1.39x magnification
    ZOOM_IN_ULTIMATE: 0.60,   // Cinematic ultimate zoom = 1.67x magnification
    
    // Timing
    WINDUP_TRACKING_SPEED: 25, // Fast tracking toward zoom target during windup (per-frame lerp factor)
    RECOVERY_ZOOM_SPEED: 50.0, // How fast zoom returns after hitstop ends (seconds^-1) - snappy
    HIT_HOLD_DURATION: 0.8,  // Brief hold at max zoom before hitstop (to show impact frame)
};

// Per-character damage phase arrays for ultimate sync
const ULTIMATE_DAMAGE_PHASES = {
    JOHN: [2, 3],                          // John: phases 2 and 3
    CALLISTO: [2, 4, 6, 8, 10],           // Callisto: phases 2, 4, 6, 8, 10
    VALENCINA: [3, 5, 7, 9],              // Valencina: phases 3, 5, 7, 9
    DIHUI: [6],                            // Dihui Star: phase 6
};

// Combat zoom state
let combatZoom = {
    targetZoom: 1.0,           // Desired zoom level
    currentZoom: 1.0,          // Current interpolated zoom
    zoomTarget: 1.0,           // What we're lerping toward
    active: false,             // Whether combat zoom is active
    windupActive: false,       // Whether windup phase is active
    hitHoldTimer: 0,           // Timer for pre-hitstop impact frame hold
    recoveryTimer: 0,          // Timer for zoom recovery after hit
    needMissReset: false,      // Flag to trigger miss zoom-out
    prevAttackPhase: {},       // Track per-fighter previous attack phase
    prevHitstopActive: false,  // Track hitstop state transitions
    lastHitTime: 0,            // Timestamp of last hit for cooldown
    maxSafeZoom: 1.0,          // Clamped zoom to maintain fighter visibility
};
let ultimateImpactZoom = 0;


// Character intro animation sequences
const INTRO_ANIMATIONS = {
  VALENCINA: {
    sprites: ['idle', 'prepat', 'd1', 's4f2', 's4f2', 's4f1'],
    duration: 0.2 // seconds per sprite
  },
  CALLISTO: {
    sprites: ['cidle', 'chalt', 'cuf2', 'cuf1'],
    duration: 0.3 // seconds per sprite
  },
  DIHUI: {
    sprites: ['didle', 'draw1', 'draw2', 'draw3', 'draw4', 'draw5', 'draw6'],
    duration: 0.1 // seconds per sprite
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
let pauseStartTime = 0; // Timestamp when pause was initiated
let unpauseCountdownActive = false; // Whether countdown is active
let unpauseCountdownValue = 3; // Countdown from 3
let unpauseCountdownTimer = 0; // Timer for countdown display
let battlePaused = false; // Whether battle simulation is paused

// Room-based character select state
let availableRooms = [];
let _lastRoomsJSON = null;
let myRoomState = null;
let _lastNetworkEvent = {};
// Perf/debugging toggles
const DEBUG_PERF = false; // set true temporarily when needed
let _lastPerfLog = 0;
let myRoomId = null;
let localSlotSelections = [];
let roomCharacterSelectSlot = -1;
let availableCharacterKeys = () => {
   const registry = (typeof CHARACTERS !== 'undefined') ? CHARACTERS : (window.CHARACTERS || {});
   const keys = Object.keys(registry || {});
   return keys.filter(key => key !== 'JOHN');
};
// Current previewed character for the new selection flow
let previewCharacterKey = null;

// Unified pre-match state variables
let preMatchState = PRE_MATCH_STATES.LOBBY;
let currentViewedCharacter = 'VALENCINA'; // Currently viewed character in select/inspect
let localSelectedCharacter = 'VALENCINA'; // Local player's selected character
let inspectPage = 'active'; // 'active' or 'passive' page in inspect mode
let characterFadeAlpha = 0; // For fade transitions (0 = fully visible, 255 = fully black)
let isFading = false;
let fadeDirection = 0; // -1 = fading out, 1 = fading in
let targetCharacter = null; // Target character during fade transition

// Buttons for character cards in the menu (rebuilt each frame)
let characterCardButtons = [];
// Buttons for the preview screen (rebuilt each frame)
let previewButtons = [];
// Mode select buttons
let modeSelectButtons = [];

// CPU mode variables
let cpuOpponentCharacter = null;
let cpuOpponentAIEnabled = true; // Whether AI opponent has behavior enabled
let cpuModeStep = 'playerSelect'; // 'playerSelect', 'opponentSelect', 'opponentConfig'
let cpuUsesServer = false; // If CPU mode is running on the server instead of local simulation

// Battle start fade-to-black variables
let battleStartFadeActive = false;
let battleStartFadeAlpha = 0;
let battleStartFadeTimer = 0;
let battleStartFadeCallback = null; // Callback to execute when fade completes
const BATTLE_START_FADE_DURATION = 0.5; // seconds to fade to black

/**
 * Start the battle fade-to-black sequence
 * @param {Function} onComplete - Called when fade is fully black
 */
function startBattleStartFade(onComplete) {
  battleStartFadeActive = true;
  battleStartFadeAlpha = 0;
  battleStartFadeTimer = 0;
  battleStartFadeCallback = onComplete || null;
}

// CPU opponent config screen buttons
let cpuConfigButtons = [];


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

    const hovered = this.enabled && this.contains(mouseX, mouseY);
    const active = hovered && mouseIsPressed;
    
    // Use original button colors for text
    const textColor = style.text || 255;
    const strokeColor = style.stroke ?? [100, 100, 100];
    
    push();
    
    // Always have dark glow for readability - increased visibility
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 1)';
    
    // Set additional glow effect on hover/click
    if (hovered) {
      if (active) {
        // Click glow color (different from hover) - more visible
        drawingContext.shadowBlur = 40;
        drawingContext.shadowColor = 'rgba(255, 100, 100, 1)';
        // Light up text when clicking
        fill(255, 255, 255);
      } else {
        // Hover glow color - use button stroke color, more visible
        const glowCol = Array.isArray(strokeColor) ? `rgba(${strokeColor[0]}, ${strokeColor[1]}, ${strokeColor[2]}, 1)` : 'rgba(100, 200, 255, 1)';
        drawingContext.shadowBlur = 35;
        drawingContext.shadowColor = glowCol;
        // Light up text with red tint when hovering
        if (Array.isArray(textColor)) {
          fill(Math.min(255, textColor[0] + 80), Math.min(255, textColor[1] + 30), Math.min(255, textColor[2] + 30));
        } else {
          fill(255, 200, 200);
        }
      }
    } else {
      // Normal state - just dark glow
      fill(textColor);
    }
    
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(style.textSize || 14);
    if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
      textFont(Subheadings);
    }
    text(label, this.x + this.w / 2, this.y + this.h / 2);
    
    // Reset shadow
    drawingContext.shadowBlur = 0;
    pop();
  }

  _brightenColor(base, amount) {
    let col;
    if (base instanceof p5.Color) {
      col = base;
    } else if (Array.isArray(base)) {
      col = color(...base);
    } else {
      col = color(base);
    }
    return color(
      constrain(red(col) + amount, 0, 255),
      constrain(green(col) + amount, 0, 255),
      constrain(blue(col) + amount, 0, 255),
      alpha(col)
    );
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
let combatOverButtons = [];

// Unified pre-match buttons (rebuilt each frame)
let preMatchButtons = [];

function preload() {
  // ============================================================
  // STAGE 1 (BOOT): Load only entry screen assets
  // Only load assets from data/main/ and data/fonts/ directories
  // ============================================================
  
  // Load main menu background images (Stage 1 - Boot)
  mainMenuImages.opnbkg = loadImage('data/main/opnbkg.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opnbkg');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opnbkg', err);
  });
  mainMenuImages.opnblight = loadImage('data/main/opnblight.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opnblight');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opnblight', err);
  });
  mainMenuImages.opncrk = loadImage('data/main/opncrk.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opncrk');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opncrk', err);
  });
  mainMenuImages.opnlight = loadImage('data/main/opnlight.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opnlight');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opnlight', err);
  });
  mainMenuImages.opnlogo = loadImage('data/main/opnlogo.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opnlogo');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opnlogo', err);
  });
  mainMenuImages.opnlstil = loadImage('data/main/opnlstil.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opnlstil');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opnlstil', err);
  });
  mainMenuImages.opnstl = loadImage('data/main/opnstl.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opnstl');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opnstl', err);
  });
  mainMenuImages.opnstr = loadImage('data/main/opnstr.png', () => {
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Main menu asset loaded: opnstr');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load main menu asset: opnstr', err);
  });
  // Load fonts (Stage 1 - Boot)
  // Available fonts:
  //   Excelsior: HP, status and damage numbers
  //   Mikodacs: titles
  //   BebasKai: subheadings
  //   LiberationSans: body text
  window.fonts = {};
  window.fonts.BebasKai = loadFont('data/fonts/BebasKai.ttf', () => {
    Subheadings = window.fonts.BebasKai;
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Font loaded: BebasKai');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load font: BebasKai', err);
  });
  window.fonts.Excelsior = loadFont('data/fonts/ExcelsiorSans.ttf', () => {
    NumberFont = window.fonts.Excelsior;
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Font loaded: Excelsior');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load font: Excelsior', err);
  });
  window.fonts.Mikodacs = loadFont('data/fonts/Mikodacs.otf', () => {
    Titles = window.fonts.Mikodacs;
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Font loaded: Mikodacs');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load font: Mikodacs', err);
  });
  window.fonts.LiberationSans = loadFont('data/fonts/LiberationSans.ttf', () => {
    Bodytext = window.fonts.LiberationSans;
    ASSET_LOADER.onBootAssetLoaded();
    console.log('Font loaded: LiberationSans');
  }, (err) => {
    ASSET_LOADER.onBootAssetLoaded();
    console.error('Failed to load font: LiberationSans', err);
  });
  // Gameplay assets (Stage 2) are NOT loaded here anymore.
  // They will be loaded in the background by ASSET_LOADER.startMenuAssetLoading()
  // after the main menu becomes visible.
  //
  // See asset-loader.js for Stage 2 loading.
  
  // Preload tutorial images (Stage 1 - Boot alongside main menu images)
  preloadTutorialImages();
  
  console.log('[preload] Stage 1 boot assets enqueued');
}

function setup() {//test
  // Set canvas size to original constraints
  createCanvas(ARENA_WIDTH, ARENA_HEIGHT);

  // Initialize main menu as the first screen
  initMainMenu();
  
  // Start Stage 2 (background) asset loading immediately once the main menu is visible.
  // The menu only uses Stage 1 assets, so we can start loading gameplay assets right away.
  if (ASSET_LOADER && ASSET_LOADER.isBootReady()) {
    ASSET_LOADER.startMenuAssetLoading();
  } else {
    // If boot assets aren't ready yet, set a callback
    ASSET_LOADER.onBootComplete = () => {
      ASSET_LOADER.startMenuAssetLoading();
    };
  }

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

  // Initialize performance optimizations
  if (typeof ShadowRenderer !== 'undefined') {
    ShadowRenderer.init(700); // Default spawn Y
  }
  if (typeof CameraCache !== 'undefined') {
    CameraCache.invalidate();
  }
  if (typeof AfterimageOptimizer !== 'undefined') {
    AfterimageOptimizer.reset();
  }
  
  // Network room handlers
  if (typeof Network !== 'undefined') {
    // Set a callback for when the network connects - main menu will update its prompt
    Network.on('connect', () => {
      console.log('[Network] Connected to server');
    });
    Network.on('roomsList', (rooms) => {
      // Avoid expensive per-message logging and redundant UI churn.
      // Only apply the update when the room list actually changes.
      try {
        const json = JSON.stringify(rooms || []);
        if (json !== _lastRoomsJSON) {
          _lastRoomsJSON = json;
          availableRooms = rooms || [];
          console.log('roomsList updated, count=', availableRooms.length);
        } else {
          // Keep reference stable when identical to avoid unnecessary work
          availableRooms = availableRooms || [];
        }
      } catch (e) {
        // Fallback: apply without diff if serialization fails
        availableRooms = rooms || [];
        console.log('roomsList (fallback) count=', availableRooms.length);
      }
    });
    Network.on('roomState', (state) => {
      myRoomState = state;
      myRoomId = state.id;
      localSlotSelections = (state.slots || []).map(s => s.character || null);
      
      // Sync local selected character with room state
      const myClientId = Network.myClientId;
      if (myClientId && state.slots) {
        const mySlot = state.slots.find(s => s.clientId === myClientId);
        if (mySlot && mySlot.character) {
          localSelectedCharacter = mySlot.character;
          currentViewedCharacter = localSelectedCharacter;
        }
      }
      
      // Minimal logging to avoid main-thread stalls on low-power servers
      if (DEBUG_UI) console.log('roomState', state);
      _lastNetworkEvent.roomState = Date.now();
    });
    Network.on('joinedRoom', (roomId) => {
      myRoomId = roomId;
      if (DEBUG_UI) console.log('joinedRoom', roomId);
      _lastNetworkEvent.joinedRoom = Date.now();
    });
    Network.on('battleStart', (data) => {
      console.log('battleStart received', data);
      if (data && data.slots) {
        initRoomBattle(data.slots);
      }
    });
    Network.on('abilityResult', (result) => {
      handleAbilityResult(result);
    });
    Network.on('event', (event) => {
      handleNetworkEvent(event);
    });
    Network.on('snapshot', snapshot => {
      applySnapshot(snapshot);
      _lastNetworkEvent.snapshot = Date.now();
    });
  }
}



// Snapshot buffer for handling race conditions during initialization
let snapshotBuffer = [];
let snapshotsEnabled = false;
let serverHitstopActive = false;
let serverHitstopTimer = 0;

function applySnapshot(snapshot) {
    // If fighters not initialized yet, buffer the snapshot
    if (!window.allFighters || window.allFighters.length === 0) {
        console.log('[Snapshot] Fighters not ready, buffering snapshot');
        snapshotBuffer.push(snapshot);
        return;
    }

    // Enable snapshot processing once fighters are ready
    snapshotsEnabled = true;

    // Process any buffered snapshots
    while (snapshotBuffer.length > 0) {
        const buffered = snapshotBuffer.shift();
        processSnapshot(buffered);
    }

    // Process current snapshot
    processSnapshot(snapshot);
}

function processSnapshot(snapshot) {
    if (snapshot.hitstop) {
        serverHitstopActive = !!snapshot.hitstop.active;
        serverHitstopTimer = snapshot.hitstop.timer || 0;
    } else {
        serverHitstopActive = false;
        serverHitstopTimer = 0;
    }
    for (const state of snapshot.players) {
        const fighter = allFighters.find(
            f => f.clientId === state.id
        );

        if (!fighter) continue;

        // Apply authoritative state targets from server (interpolate visually)
        if (typeof fighter.targetServerPos === 'undefined') {
          fighter.targetServerPos = { x: state.x, y: state.y };
          fighter.prevServerPos = { x: fighter.pos.x || state.x, y: fighter.pos.y || state.y };
          fighter.snapshotStart = (typeof millis !== 'undefined') ? millis() : Date.now();
          fighter.snapshotDuration = SNAPSHOT_INTERVAL_MS;
        } else {
          // shift previous to current displayed pos to avoid pops
          fighter.prevServerPos = { x: fighter.pos.x, y: fighter.pos.y };
          fighter.targetServerPos = { x: state.x, y: state.y };
          fighter.snapshotStart = (typeof millis !== 'undefined') ? millis() : Date.now();
          fighter.snapshotDuration = SNAPSHOT_INTERVAL_MS;
        }

        // Update authoritative velocity immediately (used for prediction/animations)
        fighter.vel.x = state.vx;
        fighter.vel.y = state.vy;

        fighter.hp = state.hp;
        fighter.maxHp = state.maxHp;
        fighter.facing = state.facing;

        // Apply movement states without overriding the onGround() method
        fighter.isOnGround = typeof state.onGround !== 'undefined' ? state.onGround : fighter.onGround();

        // Apply statuses (clone so client-side state stays isolated)
        fighter.statuses = (state.statuses || []).map(s => ({ ...s }));

        // Apply defeat state
        fighter.isDefeated = state.isDefeated || false;

        // Apply action states
        fighter.isAttacking = state.isAttacking || false;
        fighter.isGuarding = state.isGuarding || false;
        fighter.isDashing = state.isDashing || false;
        fighter.dashCharges = typeof state.dashCharges !== 'undefined' ? state.dashCharges : fighter.dashCharges || 0;
        fighter.guardWindowTimer = state.guardTimer || 0;
        // Apply authoritative evade state from server
        fighter.isEvading = state.isEvading || false;

        // Apply attack sequence state for animation control
        fighter.attackSequence = state.attackSequence || 0;
        fighter.attackPhase = state.attackPhase || 'none';
        fighter.attackFrameTimer = state.attackFrameTimer || 0;
        fighter.attackFrame = state.attackFrame || 0;
        fighter.strikeActive = state.strikeActive || false;
        fighter.chargeAttack = state.chargeAttack || false;
        fighter.attackCounter = state.attackCounter || 0;

        // Apply authoritative combo state from server
        fighter.combo = state.combo || 0;
        fighter.comboTimer = state.comboTimer || 0;
        
        // Apply authoritative stagger state from server (client renders only)
        fighter.stagger = typeof state.stagger !== 'undefined' ? state.stagger : (fighter.stagger || 0);
        fighter.staggerThreshold = typeof state.staggerThreshold !== 'undefined' ? state.staggerThreshold : (fighter.staggerThreshold || 1000);
        fighter.staggerTimer = typeof state.staggerTimer !== 'undefined' ? state.staggerTimer : (fighter.staggerTimer || 0);
        fighter.staggerRecoveryTimer = typeof state.staggerRecoveryTimer !== 'undefined' ? state.staggerRecoveryTimer : (fighter.staggerRecoveryTimer || 0);
        fighter.staggerDuration = typeof state.staggerDuration !== 'undefined' ? state.staggerDuration : (fighter.staggerDuration || 0);
        
        // Track stagger visual display for UI (smoothed for client)
        if (typeof fighter._staggerDisplay === 'undefined') {
            fighter._staggerDisplay = fighter.stagger;
        }
        // Lerp the display value for smooth UI updates
        fighter._staggerDisplay += (fighter.stagger - fighter._staggerDisplay) * 0.3;
        
        // Detect stagger state changes for visual effects
        const wasStaggered = fighter._wasStaggered || false;
        const isStaggered = state.state === 'staggered';
        if (isStaggered && !wasStaggered) {
            // Just entered stagger - trigger visual effects
            fighter._staggeredDisplay = 1;
            fighter._staggeredDisplayTimer = 2.0;
            // Set state for client sprite rendering
            fighter.state = 'staggered';
        }
        if (!isStaggered && wasStaggered) {
            // Exited stagger - clear visual effects
            fighter._staggeredDisplay = 0;
            fighter._staggeredDisplayTimer = 0;
        }
        fighter._wasStaggered = isStaggered;
        // Update stagger display timer
        if (fighter._staggeredDisplayTimer > 0) {
            fighter._staggeredDisplayTimer -= 1/60; // Approximate client dt
            if (fighter._staggeredDisplayTimer < 0) fighter._staggeredDisplayTimer = 0;
            fighter._staggeredDisplay = fighter._staggeredDisplayTimer / 2.0;
        }
        
        // Apply remote input state for non-local players
        fighter.remoteInput = {
            left: !!state.input?.left,
            right: !!state.input?.right,
            up: !!state.input?.up,
            down: !!state.input?.down,
            attack: !!state.input?.attack,
            guard: !!state.input?.guard,
            dash: !!state.input?.dash,
            slam: !!state.input?.slam,
            attackPressed: !!state.input?.attackPressed,
            attackReleased: !!state.input?.attackReleased,
            evade: !!state.input?.evade
        };
        
        // Apply slam state
        fighter.isSlamAttacking = state.isSlamAttacking || false;
        // Visual-only slam hold sent by server when landing; client uses this to
        // preserve slam sprite until the owner provides input.
        fighter.slamHoldPosition = state.slamHold || false;
        
        // Apply dash attack state
        fighter.dashAttackQueued = state.dashAttackQueued || false;
        fighter.dashAttackActive = state.dashAttackActive || false;
        
        // Clear dashAttackActive when fighter stops decelerating
        // (velocity drops below threshold, not dashing, or player provides input)
        const hasFighterInput = fighter.isLocalPlayer ? (
            keyState.left || keyState.right || keyState.up || keyState.down ||
            keyState.attack || keyState.guard || keyState.dash || keyState.slam
        ) : (
            fighter.remoteInput.left || fighter.remoteInput.right || fighter.remoteInput.up || fighter.remoteInput.down ||
            fighter.remoteInput.attack || fighter.remoteInput.guard || fighter.remoteInput.dash || fighter.remoteInput.slam ||
            fighter.remoteInput.attackPressed || fighter.remoteInput.attackReleased
        );
        if (!state.isDashing && fighter.dashAttackActive && (Math.abs(state.vx) < 100 || hasFighterInput)) {
            fighter.dashAttackActive = false;
        }

        // Track previous dash state to show halt end animation correctly
        if (typeof fighter.prevIsDashing === 'undefined') {
            fighter.prevIsDashing = fighter.isDashing;
        }
        const wasDashing = fighter.prevIsDashing;
        fighter.prevIsDashing = fighter.isDashing;

        // SERVER IS NOW AUTHORITATIVE for evade — track state only for transition detection
        const wasEvading = fighter.isEvading || fighter.state === 'evade';

        // Derive local visual movement state from server snapshot
        const serverState = state.state || 'idle';
        const combatState = serverState === 'attacking' ? 'attack' : serverState;
        const maxSpeed = (fighter.speed || 9) * 60;
        const isMovingFast = Math.abs(fighter.vel.x) >= maxSpeed * 0.9;
        const isLocalControlled = fighter.isLocalPlayer || fighter.isPlayerControlled;
        const hasLocalInput = isLocalControlled && (
            keyState.left || keyState.right || keyState.up || keyState.down ||
            keyState.attack || keyState.guard || keyState.dash || keyState.slam
        );
        // Remote input determination: for non-local fighters, check their input from the snapshot.
        // We use !fighter.isLocalPlayer instead of !isLocalControlled because in room mode,
        // ALL fighters have isPlayerControlled=true, making isLocalControlled true for everyone.
        // The isLocalControlled guard would incorrectly prevent remote input detection.
        const hasRemoteInput = !fighter.isLocalPlayer && (
            fighter.remoteInput.left || fighter.remoteInput.right || fighter.remoteInput.up || fighter.remoteInput.down ||
            fighter.remoteInput.attack || fighter.remoteInput.guard || fighter.remoteInput.dash || fighter.remoteInput.slam ||
            fighter.remoteInput.attackPressed || fighter.remoteInput.attackReleased
        );
        const hasPlayerInput = hasLocalInput || hasRemoteInput;

        // Determine whether the OWNER of this fighter is providing input.
        // For local fighters: check the local keyboard (keyState).
        // For remote fighters: check their remote input from the snapshot.
        const fighterHasInput = fighter.isLocalPlayer ? hasLocalInput : hasRemoteInput;

        // SERVER AUTHORITATIVE STATE: takes priority for gameplay states
        // For movement states (dash, jump, run, guard), derive from velocity/flags
        if (combatState === 'idle') {
            // Movement states are NOT sent by server - derive from velocity and flags
            if (wasDashing && !fighter.isDashing && Math.abs(fighter.vel.x) > 10 && fighter.isOnGround) {
                // Post-dash deceleration: keep idle state but show halt sprites
                fighter.state = 'idle';
                fighter.haltSequence = true;
                fighter.haltFrame = 0;
                fighter.haltFrameTimer = 0;
            } else if (fighter.isDashing) {
                fighter.state = 'dash';
                fighter.haltSequence = false;
            } else if (!fighter.isOnGround) {
                fighter.state = 'jump';
                fighter.haltSequence = false;
            } else if (fighter.isGuarding) {
                fighter.state = 'guard';
                fighter.haltSequence = false;
            } else if (isMovingFast) {
                fighter.state = 'run';
                fighter.haltSequence = false;
            } else if (Math.abs(fighter.vel.x) > 10 && fighter.isOnGround && !fighter.dashAttackActive) {
                fighter.state = 'idle';
                fighter.haltSequence = true;
                fighter.haltFrame = 0;
                fighter.haltFrameTimer = 0;
            } else {
                fighter.state = 'idle';
                fighter.haltSequence = false;
                fighter.haltFrame = 0;
                fighter.haltFrameTimer = 0;
            }
        } else {
            // Server explicitly set a non-idle state (attack, hit, evade, etc.)
            fighter.state = combatState;
            fighter.haltSequence = false;
            fighter.haltFrame = 0;
            fighter.haltFrameTimer = 0;
        }

        // The server is now authoritative for evade state.
        // The old 'RESTORE LOCAL EVADE STATE' hack is removed because it caused
        // the client to get stuck in evade after the server had already exited it.
        // The server controls all evade activation, duration, and deactivation.
        // The snapshot's state.isEvading field drives the client visual directly.

        // Reset slash effects on new attack
        if (state.attackSequence > 0 && fighter.attackSequence !== state.attackSequence) {
            fighter.slashEffectsSpawned = false;
        }

        // Apply parry sprite flag from server (parry on successful blockstun)
        fighter.parrySpriteActive = !!state.parrySpriteActive;

        // Apply ability cooldowns from server snapshot
        // These are used for UI countdown timers and ability state
        if (state.abilityCooldowns) {
            fighter.installationArtCooldown = state.abilityCooldowns.installationArt || 0;
            fighter.timeToHuntCooldown = state.abilityCooldowns.timeToHunt || 0;
            fighter.deathedgeCooldown = state.abilityCooldowns.deathedge || 0;
            fighter.allAbilityCooldowns = { ...state.abilityCooldowns };
        } else {
            fighter.installationArtCooldown = fighter.installationArtCooldown || 0;
            fighter.timeToHuntCooldown = fighter.timeToHuntCooldown || 0;
            fighter.deathedgeCooldown = fighter.deathedgeCooldown || 0;
        }

        // Apply character-specific resources from server snapshot
        // These drive resource-dependent mechanics (Corpus for Callisto, Precognition/Overheat for Valencina)
        if (state.resources) {
            if (fighter.characterKey === 'CALLISTO') {
                fighter.corpusIngredient = state.resources.corpusIngredient || 0;
                fighter.maxCorpusIngredient = state.resources.maxCorpusIngredient || 100;
            } else if (fighter.characterKey === 'VALENCINA') {
                fighter.precognition = state.resources.precognition || 0;
                fighter.maxPrecognition = state.resources.maxPrecognition || 100;
                fighter.overheat = state.resources.overheat || 0;
                fighter.maxOverheat = state.resources.maxOverheat || 30;
                fighter.shinActive = state.resources.shinActive || false;
            }
        }

        // Apply ability animation states (for synced ability visuals)
        // These states drive which sprites are shown during abilities
        fighter.installationArtActive = !!state.installationArtActive;
        // Authoritative timer from server snapshot
        fighter.installationArtTimer = state.installationArtTimer || 0;
        // Authoritative phase flags from server snapshot
        fighter.installationArtWindupPhase = !!state.installationArtWindupPhase;
        fighter.installationArtExecutePhase = !!state.installationArtExecutePhase;
        // Capture server total timer on activation so client can compute phase thresholds
        if (state.installationArtActive) {
          if (!fighter.installationArtTotal || state.installationArtTimer > fighter.installationArtTotal) {
            fighter.installationArtTotal = state.installationArtTimer;
          }
        } else {
          // Clear stored total when ability not active
          fighter.installationArtTotal = undefined;
          fighter.installationArtWindup = fighter.installationArtWindup || undefined;
        }
        fighter.timeToHuntCasting = !!state.timeToHuntCasting;
        fighter.timeToHuntCastTimer = state.timeToHuntCastTimer || 0;
        
        // Apply deathedge animation state from server (for synced ability visuals)
        const oldActive = fighter.deathedgeActive;
        fighter.deathedgeActive = !!state.deathedgeActive;
        fighter.deathedgePhase = state.deathedgePhase || 0;
        fighter.deathedgeTimer = state.deathedgeTimer || 0;
        fighter.deathedgeFrameIndex = state.deathedgeFrameIndex || 0;
        fighter.deathedgeTargetId = state.deathedgeTargetId || null;
        
        if (oldActive !== fighter.deathedgeActive) {
            console.log(`⚔️ Server synced deathedgeActive: ${fighter.deathedgeActive}, Phase: ${fighter.deathedgePhase}, FrameIndex: ${fighter.deathedgeFrameIndex}`);
        }
        
        // Apply ultimate availability from server (based on character conditions e.g. Artwork: Tibia >= 5, Blade >= 50, no Overheat)
        fighter.ultimateAvailable = !!state.ultimateAvailable;

        // Apply ultimate state from server (for synced ultimate sequences)
        if (typeof applyUltimateState === 'function') {
            applyUltimateState(fighter, state);
        }
    }
}


// ============================================================
// COMBAT IMPACT ZOOM SYSTEM
// Client-side camera zoom driven by server-authoritative state
// ============================================================

/**
 * COMBAT IMPACT ZOOM - Aggressive camera zoom for attack anticipation and impact.
 * 
 * Multiplicative zoom factor: 1.0 = no effect, < 1.0 = zoom IN (magnifies scene).
 * 
 * Flow:
 *   Windup starts → zoomTarget immediately set to desiredZoom
 *                    currentZoom snaps toward it aggressively (25 tracking speed)
 *   Attack misses  → zoomTarget back to 1.0, immediate recovery
 *   Attack hits    → hitstop starts (attack sprite + slash already visible)
 *                    zoom freezes at current level during hitstop
 *                    hitstop ends → zoomTarget back to 1.0, smooth recovery
 *   No attack      → currentZoom = 1.0 exactly (zero camera influence)
 * 
 * Visibility safety: zoom is clamped to never hide any fighter hitbox.
 * ALL reads from server-authoritative snapshot data only.
 */

// Calculate maximum safe zoom level to keep all fighters visible
// Visibility safety clamp: ensures all fighter hitboxes stay 100% on-screen
function calculateMaxSafeZoom() {
    if (!window.allFighters || window.allFighters.length === 0) return 1.0;
    
    // Fighter hitbox dimensions
    const HITBOX_W = 50;
    const HITBOX_H = 72;
    const SCREEN_MARGIN = 50; // pixels around scene to maintain visibility
    
    // Calculate bounding box of ALL active fighter hitboxes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    window.allFighters.forEach(f => {
        if (f.pos) {
            minX = Math.min(minX, f.pos.x - HITBOX_W / 2);
            maxX = Math.max(maxX, f.pos.x + HITBOX_W / 2);
            minY = Math.min(minY, f.pos.y - HITBOX_H / 2);
            maxY = Math.max(maxY, f.pos.y + HITBOX_H / 2);
        }
    });
    
    if (minX === Infinity) return 1.0;
    
    // Add 50px screen margin on all sides
    const requiredWidth = (maxX - minX) + (SCREEN_MARGIN * 2);
    const requiredHeight = (maxY - minY) + (SCREEN_MARGIN * 2);
    
    // Compute maximum safe zoom to keep all hitboxes visible
    // If zoom exceeds this, fighter edges go off-screen
    const maxSafeZoomX = ARENA_WIDTH / requiredWidth;
    const maxSafeZoomY = ARENA_HEIGHT / requiredHeight;
    
    // Return the most restrictive limit, ensuring all fighters stay on-screen
    const safeZoom = Math.min(maxSafeZoomX, maxSafeZoomY);
    return safeZoom;
}

function updateCombatZoom(dt) {
    if (!window.allFighters || window.allFighters.length === 0) return;
    
    const snapDt = dt || (1/60);
    
    // === STEP 1: Recalculate visibility limits ===
    combatZoom.maxSafeZoom = calculateMaxSafeZoom();
    const minSafeZoom = 1.0 / combatZoom.maxSafeZoom; // Minimum zoom factor allowed
    
    // === STEP 2: Read server-authoritative state ===
    let anyAttacking = false;
    let desiredZoom = 1.0;
    let zoomPriority = 0;
    
    window.allFighters.forEach(fighter => {
        if (fighter.isDefeated) return;
        const isAttacking = fighter.isAttacking || false;
        const seq = fighter.attackSequence || 0;
        const isDash = fighter.dashAttackActive || false;
        const isSlam = fighter.isSlamAttacking || false;
        const isUlt = fighter.ultimateActive || false;
        const hasAttackState = (seq > 0 || isDash || isSlam) && isAttacking;
        const hasValid = isUlt || hasAttackState;
        if (!hasValid) return;
        
        let target = 1.0, pri = 0;
        
        if (isUlt) {
            const charKey = fighter.characterKey;
            const damagePhases = ULTIMATE_DAMAGE_PHASES[charKey] || [];
            const isInDamagePhase = damagePhases.includes(fighter.ultimatePhase);
            target = isInDamagePhase ? COMBAT_ZOOM.ZOOM_IN_ULTIMATE : COMBAT_ZOOM.ZOOM_IN_UNIFIED;
            pri = 5;
        } else if (isSlam) {
            target = COMBAT_ZOOM.ZOOM_IN_UNIFIED;
            pri = 4;
        } else if (isDash) {
            target = COMBAT_ZOOM.ZOOM_IN_UNIFIED;
            pri = 3;
        } else if (seq === 3 || fighter.chargeAttack) {
            target = COMBAT_ZOOM.ZOOM_IN_COMBO3;
            pri = 3;
        } else if (seq === 2) {
            target = COMBAT_ZOOM.ZOOM_IN_UNIFIED;
            pri = 2;
        } else if (seq === 1) {
            target = COMBAT_ZOOM.ZOOM_IN_UNIFIED;
            pri = 1;
        }
        
        if (pri > zoomPriority) { zoomPriority = pri; desiredZoom = target; anyAttacking = true; }
    });
    
    // === STEP 3: Apply distance-based scaling ===
    // Farther camera = weaker impact zoom (zoom out already happened, don't emphasize further)
    // Closer camera = stronger impact zoom (make impact feel more dramatic)
    // Scale desired zoom toward 1.0 based on current camera distance
    let scaledZoom = desiredZoom;
    if (typeof cameraZoom !== 'undefined' && cameraZoom > 1.0) {
        // Camera is zoomed out (cameraZoom > 1.0 = farther)
        // Reduce impact zoom strength: scale toward 1.0
        const zoomDistance = cameraZoom;
        const scaleFactor = 1.0 / zoomDistance; // e.g., if cameraZoom=2.0, scale by 0.5
        scaledZoom = 1.0 - (1.0 - desiredZoom) * scaleFactor;
    }
    
    // === STEP 4: Hitstop state ===
    const hitstopNow = serverHitstopActive && serverHitstopTimer > 0;
    const hitstopEdge = hitstopNow && !combatZoom.prevHitstopActive;
    if (hitstopEdge) {
        combatZoom.recoveryTimer = 0.1;
    }
    if (combatZoom.recoveryTimer > 0 && !hitstopNow) {
        combatZoom.recoveryTimer -= snapDt;
        if (combatZoom.recoveryTimer < 0) combatZoom.recoveryTimer = 0;
    }
    
    // === STEP 5: Set zoomTarget ===
    if (anyAttacking && !hitstopNow) {
        // WINDUP: aggressively zoom toward desired zoom at 50 speed
        combatZoom.zoomTarget = lerp(combatZoom.zoomTarget, scaledZoom, Math.min(1, 50 * snapDt));
    } else if (hitstopNow) {
        // HIT: freeze zoom during hitstop (maintain impact frame)
        combatZoom.zoomTarget = combatZoom.currentZoom;
    } else if (combatZoom.recoveryTimer > 0) {
        // POST-HIT PAUSE: hold current level briefly
        combatZoom.zoomTarget = combatZoom.currentZoom;
    } else {
        // MISS / RECOVERY / IDLE: return to 1.0
        combatZoom.zoomTarget = 1.0;
    }
    
    // === STEP 6: Track toward zoomTarget ===
    if (hitstopNow) {
        // Freeze during hitstop - no zoom change
    } else if (anyAttacking) {
        // During windup: aggressive tracking toward target (50 speed)
        const trackingSpeed = Math.min(1, 50 * snapDt);
        combatZoom.currentZoom = combatZoom.zoomTarget * trackingSpeed + combatZoom.currentZoom * (1 - trackingSpeed);
    } else {
        // Recovery/idle: snappy return to 1.0
        combatZoom.currentZoom += (1.0 - combatZoom.currentZoom) * Math.min(1, 15 * snapDt);
    }
    
    // === STEP 7: Visibility safety clamp ===
    // Prevent zoom from exceeding the limit where fighters would go off-screen
    // minSafeZoom = 1.0 / maxSafeZoom (e.g., if maxSafeZoom=1.5, then minSafeZoom=0.67)
    // Clamp: ensure currentZoom never goes below minSafeZoom (never magnifies more than allowed)
    combatZoom.currentZoom = Math.max(minSafeZoom, combatZoom.currentZoom);
    
    // Clamp to valid range [0.55, 1.0]
    combatZoom.currentZoom = Math.max(0.55, Math.min(1.0, combatZoom.currentZoom));
    
    // === STEP 8: Zero camera influence when idle ===
    if (!anyAttacking && Math.abs(combatZoom.currentZoom - 1.0) < 0.01) {
        combatZoom.currentZoom = 1.0;
    }
    
    // Track active state
    combatZoom.active = combatZoom.currentZoom < 0.995;
    
    // State persistence
    combatZoom.prevHitstopActive = hitstopNow;
    combatZoom.wasAttacking = anyAttacking;
}

// ============================================================
// INPUT SYSTEM - RESTORED for reliable edge detection at 20tps
// ============================================================
// At 20tps (50ms ticks), quick key presses can be missed entirely
// because the press and release happen between two server ticks.
// Solution: Track input edges on the client and hold edge flags
// for at least 100ms (2 ticks) so the server always catches them.
// ============================================================

// Input hold timestamps - keeps edge flags alive long enough for server
let inputHoldTimers = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    dash: 0,
    attackPressed: 0,
    attackReleased: 0,
    slam: 0,
    evade: 0
};

// Track actual key states
let keyState = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    attack: false,
    guard: false,
    evade: false
};

// Previous frame key states for client-side edge detection
let prevKeyState = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    evade: false
};

// The minimum duration (ms) to hold an edge flag
const EDGE_HOLD_MS = 120; // >2 ticks at 50ms each

/**
 * RESTORED: Send input state with sticky edge detection
 * Each edge-triggered input (up, dash, attackPressed) is held active
 * for EDGE_HOLD_MS to ensure the 20tps server always detects it.
 */
function sendInputState() {
    // Don't send inputs when pause menu is open
    if (pauseMenuOpen || pauseSettingsOpen) {
        return;
    }
    
    const now = performance.now();
    
    // Read raw input states
    const rawUp = keyIsDown(87) || keyIsDown(UP_ARROW);
    const rawDown = keyIsDown(83) || keyIsDown(DOWN_ARROW);
    const rawLeft = keyIsDown(65) || keyIsDown(LEFT_ARROW);
    const rawRight = keyIsDown(68) || keyIsDown(RIGHT_ARROW);
    const rawDash = keyIsDown(32);
    const isLeftMouseDown = mouseIsPressed && mouseButton === LEFT;
    const isRightMouseDown = mouseIsPressed && mouseButton === RIGHT;
    const rawGuard = isRightMouseDown || keyIsDown(67); // Right mouse or C key
    
    // === JUMP (up) edge detection ===
    if (rawUp && !prevKeyState.up) {
        inputHoldTimers.up = now + EDGE_HOLD_MS;
    }
    prevKeyState.up = rawUp;
    const stickyUp = now < inputHoldTimers.up;
    
    // === DASH (space) edge detection ===
    if (rawDash && !prevKeyState.dash) {
        inputHoldTimers.dash = now + EDGE_HOLD_MS;
    }
    prevKeyState.dash = rawDash;
    const stickyDash = now < inputHoldTimers.dash;
    
    // === ATTACK press/release edge detection ===
    if (isLeftMouseDown && !keyState.attack) {
        inputHoldTimers.attackPressed = now + EDGE_HOLD_MS;
    }
    if (!isLeftMouseDown && keyState.attack) {
        inputHoldTimers.attackReleased = now + EDGE_HOLD_MS;
    }
    keyState.attack = isLeftMouseDown;
    const stickyAttackPressed = now < inputHoldTimers.attackPressed;
    const stickyAttackReleased = now < inputHoldTimers.attackReleased;
    
    // === EVADE (E key) edge detection ===
    const rawEvade = keyIsDown(69); // E key
    if (rawEvade && !prevKeyState.evade) {
        inputHoldTimers.evade = now + EDGE_HOLD_MS;
    }
    prevKeyState.evade = rawEvade;
    const stickyEvade = now < inputHoldTimers.evade;
    
    // === ABILITY KEY INPUT ===
    const rawAbilityQ = keyIsDown(81); // Q key
    const rawAbilityX = keyIsDown(88); // X key

    // === GUARD (right click or C key) ===
    keyState.guard = rawGuard;
    
    // === SLAM (S + attack in air) ===
    // Determine if airborne using onGround property from server
    const controlledFighter = getPlayerControlledFighter();
    const isOnGround = controlledFighter ? 
      (controlledFighter.isOnGround || 
       (controlledFighter.pos && controlledFighter.pos.y >= (controlledFighter.spawnY || 600) - 0.01)) : true;

    // Only set the slam sticky flag when the player is airborne AND
    // both down and attack are pressed (or attack edge is sticky).
    if (!isOnGround && rawDown && (isLeftMouseDown || stickyAttackPressed)) {
      inputHoldTimers.slam = now + EDGE_HOLD_MS;
    }
    const stickySlam = now < inputHoldTimers.slam;

    // Build input packet with sticky edge flags
    const input = {
        left: rawLeft,
        right: rawRight,
        up: rawUp || stickyUp,          // Keep up active for server
        down: rawDown,
        attack: isLeftMouseDown,
        attackPressed: stickyAttackPressed,  // Held for 2+ ticks
        attackReleased: stickyAttackReleased, // Held for 2+ ticks
        guard: rawGuard,
        dash: rawDash || stickyDash,     // Keep dash active for server
        slam: stickySlam,                // Held for 2+ ticks
        evade: stickyEvade,              // Held for 2+ ticks
        abilityQ: rawAbilityQ,
        abilityX: rawAbilityX
    };

    Network.sendInput(input);
}

function initBattle() {
  // Initialize active fighters from Super Smash Bros style player system
  const activePlayers = players.filter(p => p.active);
  
  if (activePlayers.length === 0) {
    console.log('No active players!');
    return;
  }
  
  // // Find the player-controlled fighter
  // let playerControlledFighter = activePlayers.find(p => p.controlled);
  // if (!playerControlledFighter) {
  //   // If no player is controlled, make the first active player controlled
  //   activePlayers[0].controlled = true;
  //   playerControlledFighter = activePlayers[0];
  // }
  
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
    fighter.isLocalPlayer = isPlayerControlled;
    
    // Ensure AI settings are properly applied
    fighter.isAI = isAI;
    fighter.isPlayerControlled = isPlayerControlled;
    
    // Set proper positioning for multi-player battles < move to server
    const spacing = 300; // Horizontal spacing between players
    const centerX = width / 2;
    const totalWidth = (activePlayers.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;
    
    // fighter.pos.x = startX + (i * spacing);
    // fighter.pos.y = height - 100;
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
  const mySocketId = Network && Network.myClientId ? Network.myClientId : null;

  for (let i = 0; i < activePlayers.length; i++) {
    const slot = activePlayers[i];
    const characterKey = slot.character || 'VALENCINA';
    const isLocalPlayer = slot.clientId === mySocketId;
    
    const fighter = new Fighter(false, `P${i + 1}`, characterKey, true);
    fighter.playerId = i + 1;
    fighter.clientId = slot.clientId;
    fighter.isLocalPlayer = isLocalPlayer;
    fighter.isAI = false;
    fighter.isPlayerControlled = true;
      //move to server
    // const spacing = 300;
    // const centerX = width / 2;
    // const totalWidth = (activePlayers.length - 1) * spacing;
    // const startX = centerX - totalWidth / 2;
  
    // fighter.pos.x = startX + (i * spacing);
    // fighter.pos.y = height - 100;
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
  
  // Save room info before clearing for post-battle return
  window._savedRoomId = myRoomId;
  window._savedRoomState = myRoomState;
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
  playerFighter.clientId = 'LOCAL_PLAYER';
  playerFighter.isLocalPlayer = true;
  playerFighter.isAI = false;
  playerFighter.isPlayerControlled = true;
  playerFighter.pos.x = width / 2 - 150;
  playerFighter.pos.y = height - 100;
  playerFighter.facing = 1;
  fighters.push(playerFighter);
  
  // AI opponent
  const aiFighter = new Fighter(cpuOpponentAIEnabled, 'P2', aiCharacter, false);
  aiFighter.playerId = 2;
  aiFighter.clientId = 'LOCAL_CPU';
  aiFighter.isAI = cpuOpponentAIEnabled;
  aiFighter.isPlayerControlled = false;
  aiFighter.pos.x = width / 2 + 150;
  aiFighter.pos.y = height - 100;
  aiFighter.facing = -1;
  fighters.push(aiFighter);
  
  window.allFighters = fighters;
  player = playerFighter;
  enemy = aiFighter;
  cpuUsesServer = false;
  
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

function handleAbilityResult(result) {
  if (!result || !window.allFighters) return;

  console.log('[Ability Result]', result);

  const fighter = window.allFighters.find(f => f.clientId === result.fighterId);
  if (!fighter) return;

  const applyStatusObjects = (target, statuses) => {
    if (!target || !target.addStatus || !Array.isArray(statuses)) return;
    statuses.forEach(status => {
      if (!status) return;
      const type = typeof status === 'string' ? status : status.type || status;
      const count = typeof status.count === 'number' ? status.count : 1;
      const potency = typeof status.potency === 'number' ? status.potency : 1;
      target.addStatus(type, count, potency);
    });
  };

  const applyTargetResult = (targetId, resultData) => {
    const target = window.allFighters.find(f => f.clientId === targetId);
    if (!target) return;

    if (typeof resultData.targetHp !== 'undefined') {
      target.hp = resultData.targetHp;
    }

    if (typeof resultData.damage === 'number' && typeof spawnDamageNumber === 'function') {
      spawnDamageNumber(
        resultData.damage,
        target.pos.copy(),
        fighter.facing,
        !!resultData.wasGuarded,
        resultData.damageType || 'normal',
        !!resultData.isCrit,
        resultData.attackType || 'normal'
      );
    }

    applyNetworkScreenShake(resultData);

    if (resultData.statuses) {
      applyStatusObjects(target, resultData.statuses);
    }

    if (resultData.defeated) {
      target.isDefeated = true;
      target.hp = 0;
    }
  };

  if (result.success) {
    if (Array.isArray(result.results)) {
      result.results.forEach(r => {
        if (r.targetId) {
          applyTargetResult(r.targetId, r);
        }
      });
    } else if (result.targetId) {
      applyTargetResult(result.targetId, result);
    }

    if (!result.targetId && Array.isArray(result.targetIds)) {
      result.targetIds.forEach((targetId) => {
        const target = window.allFighters.find(f => f.clientId === targetId);
        if (target && result.statuses) {
          applyStatusObjects(target, result.statuses);
        }
      });
    }

    if (result.statuses && result.targetId === undefined && !Array.isArray(result.results)) {
      applyStatusObjects(fighter, result.statuses);
    }

    if (typeof result.precognitionRemaining === 'number') {
      fighter.precognition = result.precognitionRemaining;
    }
    if (typeof result.corpusRemaining === 'number') {
      fighter.corpusIngredient = result.corpusRemaining;
    }

    if (result.abilityId === 'timeToHunt') {
      fighter.timeToHuntCasting = false;
      fighter.timeToHuntCastTimer = 0;
      fighter.timeToHuntTarget = null;
      fighter.timeToHuntPredictive = false;
      fighter.timeToHuntCooldown = result.success ? (result.cooldown || 15) : 0;
      // Reset sprite back to idle state after ability resolution
      fighter.currentSprite = 'idle';
      fighter.setState('idle');
    }

    if (result.abilityId === 'installationArt') {
      fighter.installationArtPredictive = false;
      if (result.success) {
        // Keep client visuals active and set timer based on server-provided windup
        const windup = typeof result.windupTime === 'number' ? result.windupTime : 0.5;
        const total = typeof result.totalTime === 'number' ? result.totalTime : (windup + 0.5);
        fighter.installationArtActive = true;
        fighter.installationArtExecuted = false;
        // Record windup and total for phase computation (server snapshot will set authoritative timer)
        fighter.installationArtWindup = windup;
        fighter.installationArtTotal = total;
        fighter.installationArtTimer = total;
        fighter.installationArtCooldown = result.cooldown || 10;
        // Do not immediately reset the sprite; let `updateInstallationArt` and `updateSprite`
        // manage the visual sequence (cguard -> cevade -> cidle). The snapshot code will
        // populate the authoritative `installationArtTimer` shortly after.
      } else {
        fighter.installationArtActive = false;
        fighter.installationArtExecuted = false;
        fighter.installationArtTimer = 0;
        // On failure, reset visuals
        fighter.currentSprite = 'cidle';
        fighter.setState('idle');
      }
    }

    if (result.abilityId === 'deathedge') {
      if (result.success) {
        // Initialize Deathedge animation on server approval
        fighter.deathedgeActive = true;
        fighter.deathedgePhase = 0;
        fighter.deathedgeTimer = 0;
        fighter.deathedgeFrameIndex = 0;
        fighter.deathedgeExecuted = false;
        fighter.deathedgeTargetId = result.targetId;
        fighter.deathedgeCooldown = result.cooldown || 14;
        
        const config = CHARACTERS['DIHUI'].abilities.deathedge;
        fighter.deathedgeWindupFrames = config.windupFrames || [];
        fighter.deathedgeWindupHoldDuration = config.windupHoldDuration || 1.0;
        fighter.deathedgePostTeleportFrames = config.postTeleportFrames || [];
        fighter.deathedgePostTeleportHoldDuration = config.postTeleportHoldDuration || 1.0;
        fighter.deathedgeAttackFrames = config.attackFrames || [];
        fighter.deathedgeAttackHoldDuration = config.attackHoldDuration || 1.0;
      } else {
        fighter.deathedgeActive = false;
        fighter.deathedgeTimer = 0;
        fighter.deathedgePhase = 0;
      }
    }

    if (result.abilityId) {
      triggerAbilityVisuals(fighter, result.abilityId, result);
    }
  } else {
    console.log('[Ability Failed]', result.reason);
  }
}

function applyNetworkScreenShake(event) {
  if (!event || typeof addScreenShake !== 'function') return;

  const intensity = typeof event.shakeIntensity === 'number'
    ? event.shakeIntensity
    : (typeof event.damage === 'number' ? event.damage : 0);
  const isUltimate = !!(
    event.isUltimate ||
    event.shakeType === 'ultimate' ||
    event.attackType === 'ultimate' ||
    event.type === 'ULTIMATE_SLASH'
  );

  if (intensity > 0) {
    addScreenShake(intensity, isUltimate);
  }

  // Impact zoom: increase additive zoom when attacks deal damage with knockback
  // Applies to all attacks (basic, abilities, dash, slam, ultimates)
  if (typeof event.damage === 'number' && typeof event.knockback === 'number') {
    if (event.knockback > 0 && event.damage > 0) {
      ultimateImpactZoom = Math.min(2.5, ultimateImpactZoom + (0.08 * event.damage));
    }
  }
}

function triggerAbilityVisuals(fighter, abilityId, result) {
  // Trigger character-specific visual effects
  const characterKey = fighter.characterKey;
  
  if (abilityId === 'installationArt') {
    // Installation Art visuals are driven by the execute-phase server event
    // to ensure the attack occurs only when the cevade sprite is shown.
    return;
  }

  if (characterKey === 'VALENCINA') {
    if (typeof ValencinaRenderer !== 'undefined') {
      ValencinaRenderer.spawnSlashEffect(fighter, abilityId);
    }
  } else if (characterKey === 'CALLISTO') {
    if (typeof CallistoRenderer !== 'undefined') {
      CallistoRenderer.spawnSlashEffect(fighter, abilityId);
    }
  }
}

function handleNetworkEvent(event) {
  if (!event || !window.allFighters) return;

  switch (event.type) {
    case 'HIT':
      handleHitNetworkEvent(event);
      break;
    case 'slamHit':
      handleSlamHitNetworkEvent(event);
      break;
    case 'STATUS_DAMAGE':
      handleStatusDamageNetworkEvent(event);
      break;
    case 'FIGHTER_DEFEATED':
      handleFighterDefeatedEvent(event);
      break;
    case 'slamLanding':
      handleSlamLandingEvent(event);
      break;
    case 'abilityResult':
      handleAbilityResult(event);
      break;
    case 'dashAttackResult':
      handleDashAttackNetworkEvent(event);
      break;
    case 'ULTIMATE_SLASH':
      handleUltimateSlashEvent(event);
      break;
    case 'INSTALLATION_ART_CBSK':
      handleInstallationArtCbskEvent(event);
      break;
    case 'DEATHEDGE_DLINE_SPAWN':
      handleDeathedgeDlineSpawnEvent(event);
      break;
    case 'AFTERIMAGE_HIT':
      handleAfterimageHitEvent(event);
      break;
    case 'MATCH_END':
      // Server signaled match end — start ending sequence
      startEndingSequence(event.winnerId, event.winnerCharacter, {
        returnToLobby: !!event.returnToLobby
      });
      break;
    default:
      // Ignore unhandled server event types here
      break;
  }
}

function handleUltimateSlashEvent(event) {
  // Spawn slash effect on the fighter that triggered it
  const fighter = window.allFighters.find(f => f.clientId === event.fighterId);
  if (!fighter) return;
  
  // Check if this is a dline effect with world position
  const isDline = event.slashType === 'dline';
  
  // Spawn the slash effect using the fighter's spawnSlashEffect method
  if (typeof fighter.spawnSlashEffect === 'function') {
    if (isDline && event.worldX !== undefined && event.worldY !== undefined) {
      // Dline with world position - use longer timer for fade
      fighter.spawnSlashEffect(event.slashType, {
        worldPos: { x: event.worldX, y: event.worldY },
        scale: event.scale || 1,
        rotation: event.rotation || 0,
        timer: 3.0 // Longer timer for dline to fade properly
      });
    } else {
      fighter.spawnSlashEffect(event.slashType, { x: event.offsetX || 0, y: event.offsetY || 0 });
    }
  } else {
    // Fallback: manually add slash effect
    if (!fighter.slashEffects) fighter.slashEffects = [];
    const effect = {
      type: event.slashType,
      pos: isDline && event.worldX !== undefined ? { x: event.worldX, y: event.worldY } : { x: fighter.pos.x, y: fighter.pos.y },
      facing: fighter.facing,
      timer: isDline ? 3.0 : 0.4, // Longer timer for dline
      targetOffset: { x: event.offsetX || 0, y: event.offsetY || 0 },
      owner: fighter,
      rotation: event.rotation || null
    };
    if (event.scale) effect.scale = event.scale;
    fighter.slashEffects.push(effect);
  }

  applyNetworkScreenShake(event);
}

function handleInstallationArtCbskEvent(event) {
  if (!event || !window.allFighters) return;

  const attacker = window.allFighters.find(f => f.clientId === event.fighterId);
  const target = window.allFighters.find(f => f.clientId === event.targetId);
  const source = attacker || target || window.allFighters[0];
  if (!source || typeof source.spawnSlashEffect !== 'function') return;

  const worldX = (typeof event.enemyX === 'number') ? event.enemyX : (target ? target.pos.x : source.pos.x);
  const worldY = (typeof event.enemyY === 'number') ? event.enemyY : (target ? target.pos.y : source.pos.y);
  const groundY = worldY + 144;

  source.spawnSlashEffect(event.cbskType || 'cbsk1', {
    worldPos: { x: worldX, y: worldY },
    groundY,
    rotation: random(-PI/4, PI/4)
  });
}

function handleDeathedgeDlineSpawnEvent(event) {
  if (!event || !window.allFighters) return;

  const attacker = window.allFighters.find(f => f.clientId === event.fighterId);
  const target = window.allFighters.find(f => f.clientId === event.targetId);
  const source = attacker || target || window.allFighters[0];
  if (!source || typeof source.spawnSlashEffect !== 'function') return;

  const worldX = (typeof event.targetX === 'number') ? event.targetX : (target ? target.pos.x : source.pos.x);
  const worldY = (typeof event.targetY === 'number') ? event.targetY : (target ? target.pos.y : source.pos.y);
  const dlineCount = event.dlineCount || 1;

  // Spawn dlines at the target's location with random rotation
  for (let i = 0; i < dlineCount; i++) {
    const offsetX = random(-50, 50);
    const offsetY = random(-50, 50);
    const rotation = random(-PI/4, PI/4);
    source.spawnSlashEffect('dline', {
      x: offsetX,
      y: offsetY,
      rotation: rotation,
      worldPos: { x: worldX, y: worldY }
    });
  }
}

function handleHitNetworkEvent(event) {
  const target = window.allFighters.find(f => f.clientId === event.targetId);
  const attacker = window.allFighters.find(f => f.clientId === event.attackerId);
  if (!target) return;

  if (event.hp !== undefined) {
    target.hp = event.hp;
  }

  // IMMEDIATELY set lastHitOpponent so abilities can target the right enemy
  if (attacker) {
    attacker.lastHitOpponent = target;
    attacker.lastHitOpponentId = target.clientId;
  }

  const facing = attacker ? attacker.facing : 1;
  if (event.damage && typeof spawnDamageNumber === 'function') {
    spawnDamageNumber(
      event.damage,
      target.pos.copy(),
      facing,
      !!event.wasGuarded,
      event.damageType || 'normal',
      !!event.isCrit,
      event.attackType || 'normal'
    );
  }
  applyNetworkScreenShake(event);

  // 💥 Spawn impact visuals on hit
  if (typeof spawnImpactVisuals === 'function') {
    const isSlamOrUltimateOrThirdHit = event.attackType === 'slam' || event.attackType === 'ultimate' || (attacker && attacker.attackCounter === 3);
    spawnImpactVisuals(
      target.pos.x,
      target.pos.y,
      attacker ? attacker.characterKey : 'DEFAULT',
      !!event.wasGuarded || !!event.wasParried,
      isSlamOrUltimateOrThirdHit
    );
  }

  // 💥 Spawn parry impact visuals on parry (defender's color at attacker's position)
  if (event.wasParried && typeof spawnParryImpactVisuals === 'function') {
    const defender = window.allFighters.find(f => f.clientId === event.targetId);
    // The parried fighter (attacker) is at the target position - draw defender's color on attacker
    spawnParryImpactVisuals(
      target.pos.x,
      target.pos.y,
      defender ? defender.characterKey : (attacker ? attacker.characterKey : 'DEFAULT')
    );
  }

  if (event.statuses && Array.isArray(event.statuses) && target.addStatus) {
    event.statuses.forEach(statusType => target.addStatus(statusType, 1, 1));
  }

  if (event.defeated && !target.isDefeated) {
    target.isDefeated = true;
    target.hp = target.hp || 0;
  }
}

function handleSlamHitNetworkEvent(event) {
  const target = window.allFighters.find(f => f.clientId === event.targetId);
  const attacker = window.allFighters.find(f => f.clientId === event.attackerId);
  if (!target) return;

  if (event.defenderHp !== undefined) {
    target.hp = event.defenderHp;
  }

  const facing = attacker ? attacker.facing : 1;
  if (event.damage && typeof spawnDamageNumber === 'function') {
    spawnDamageNumber(
      event.damage,
      target.pos.copy(),
      facing,
      !!event.wasGuarded,
      event.damageType || 'normal',
      !!event.isCrit,
      event.attackType || 'slam'
    );
  }
  applyNetworkScreenShake(event);

  // 💥 Spawn impact visuals on slam hit (heavy impact always)
  if (typeof spawnImpactVisuals === 'function') {
    spawnImpactVisuals(
      target.pos.x,
      target.pos.y,
      attacker ? attacker.characterKey : 'DEFAULT',
      !!event.wasGuarded,
      true // slam/ultimate/3rd hit = true for heavy impact
    );
  }

  if (event.defeated && !target.isDefeated) {
    target.isDefeated = true;
    target.hp = target.hp || 0;
  }
}

function handleAfterimageHitEvent(event) {
  const target = window.allFighters.find(f => f.clientId === event.targetId);
  const attacker = window.allFighters.find(f => f.clientId === event.attackerId);
  if (!target) return;

  if (event.hp !== undefined) {
    target.hp = event.hp;
  }

  const facing = attacker ? attacker.facing : 1;
  if (event.damage && typeof spawnDamageNumber === 'function') {
    spawnDamageNumber(
      event.damage,
      target.pos.copy(),
      facing,
      false,
      'normal',
      !!event.isCrit,
      'normal'
    );
  }

  if (event.defeated && !target.isDefeated) {
    target.isDefeated = true;
    target.hp = target.hp || 0;
  }
}

function handleDashAttackNetworkEvent(event) {
  if (!event || !window.allFighters || !Array.isArray(event.hits)) return;
  const attacker = window.allFighters.find(f => f.clientId === event.attackerId);

  event.hits.forEach(hit => {
    const target = window.allFighters.find(f => f.clientId === hit.targetId);
    if (!target) return;

    if (typeof hit.defenderHp !== 'undefined') {
      target.hp = hit.defenderHp;
    }

    // IMMEDIATELY set lastHitOpponent for dash attacks
    if (attacker) {
      attacker.lastHitOpponent = target;
      attacker.lastHitOpponentId = target.clientId;
    }

    const facing = attacker ? attacker.facing : 1;
    if (typeof hit.damage === 'number' && typeof spawnDamageNumber === 'function') {
      spawnDamageNumber(
        hit.damage,
        target.pos.copy(),
        facing,
        !!hit.wasGuarded,
        hit.damageType || 'normal',
        !!hit.isCrit,
        hit.attackType || 'normal'
      );
    }

    applyNetworkScreenShake(hit);

    if (hit.defeated && !target.isDefeated) {
      target.isDefeated = true;
      target.hp = target.hp || 0;
    }
  });
}

function handleStatusDamageNetworkEvent(event) {
  const target = window.allFighters.find(f => f.clientId === event.fighterId);
  if (!target) return;

  if (event.hp !== undefined) {
    target.hp = event.hp;
  }

  // Use damageType from server if provided, otherwise map from statusType
  let damageType = event.damageType || 'normal';
  if (!event.damageType) {
    if (event.statusType === 'Burn') damageType = 'burn';
    else if (event.statusType === 'Bleed') damageType = 'bleed';
    else if (event.statusType === 'Rupture') damageType = 'rupture';
    else if (event.statusType === 'Tremor') damageType = 'tremor';
    else if (event.statusType === 'Sinking') damageType = 'sinking';
  }

  console.log('[STATUS_DAMAGE]', event.statusType, '-> damageType:', damageType, 'damage:', event.damage);

  if (event.damage && typeof spawnDamageNumber === 'function') {
    spawnDamageNumber(
      event.damage,
      target.pos.copy(),
      target.facing || 1,
      !!event.wasGuarded,
      damageType,
      !!event.isCrit,
      event.attackType || 'normal'
    );
  }
}

function handleFighterDefeatedEvent(event) {
  const target = window.allFighters.find(f => f.clientId === event.fighterId);
  if (!target) return;
  target.isDefeated = true;
  target.hp = 0;
}

const slamLandingOverlays = [];
function handleSlamLandingEvent(event) {
  if (!event || !event.slamPos || event.radius === undefined) return;
  slamLandingOverlays.push({
    x: event.slamPos.x,
    y: event.slamPos.y,
    radius: event.radius,
    timer: 0.35,
    alpha: 255
  });

  // Trigger screen shake on slam landing (even if it did not damage anyone)
  // Shake = slam height + slam damage
  const slamHeight = event.slamHeight || 0;
  const slamDamage = event.slamDamage || 0;
  const shakeIntensity = (slamHeight * 8) + (slamDamage * 0.3);
  if (typeof addScreenShake === 'function') {
    addScreenShake(shakeIntensity, false);
  }

  // CALLISTO: Apply empowered slam costume sprites if present
  if (event.costumeSprite || event.useCostumeSprite) {
    const attacker = window.allFighters?.find(f => f.clientId === event.attackerId);
    if (attacker && attacker.characterKey === 'CALLISTO') {
      attacker.slamCostumeSprite = event.costumeSprite || null;
      attacker.slamCostumeSlash = event.costumeSlash || null;
      console.log(`🎨 Callisto empowered slam! Sprite: ${event.costumeSprite}, Slash: ${event.costumeSlash}`);
    }
  }
}

function updateSlamLandingOverlays(dt) {
  for (let i = slamLandingOverlays.length - 1; i >= 0; i--) {
    const overlay = slamLandingOverlays[i];
    overlay.timer -= dt;
    overlay.alpha = map(overlay.timer, 0, 0.35, 0, 255);
    if (overlay.timer <= 0) {
      slamLandingOverlays.splice(i, 1);
    }
  }
}

function drawSlamLandingOverlays() {
  if (slamLandingOverlays.length === 0) return;

  slamLandingOverlays.forEach(overlay => {
    push();
    stroke(255, 100, 255, overlay.alpha);
    strokeWeight(3);
    noFill();
    ellipse(overlay.x, overlay.y, overlay.radius * 2);
    fill(255, 180, 255, overlay.alpha);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(12);
    text('SLAM RANGE', overlay.x, overlay.y - overlay.radius - 10);
    pop();
  });
}


// Start unpause countdown that counts down from 3 before resuming gameplay
function startUnpauseCountdown() {
  pauseMenuOpen = false;
  pauseSettingsOpen = false;
  unpauseCountdownActive = true;
  unpauseCountdownValue = 3;
  unpauseCountdownTimer = 3.0;
}

// Update the unpause countdown each frame
function updateUnpauseCountdown(dt) {
  if (!unpauseCountdownActive) return;
  
  unpauseCountdownTimer -= dt;
  unpauseCountdownValue = Math.max(0, Math.ceil(unpauseCountdownTimer));
  
  if (unpauseCountdownTimer <= 0) {
    // Countdown finished - resume gameplay
    unpauseCountdownActive = false;
    battlePaused = false;
    pauseMenuOpen = false;
    pauseSettingsOpen = false;
    unpauseCountdownValue = 3;
    unpauseCountdownTimer = 0;
  }
}

function draw() {
  // Perf diagnostics: sample center pixel when enabled to detect gray-frame toggles
  if (DEBUG_PERF) {
    try {
      const cx = Math.floor(width / 2);
      const cy = Math.floor(height / 2);
      const col = get(cx, cy); // [r,g,b,a]
      const isGray = col && Math.abs(col[0] - col[1]) < 4 && Math.abs(col[1] - col[2]) < 4 && col[0] > 30 && col[0] < 220;
      if (typeof _prevCenterGray === 'undefined') _prevCenterGray = isGray;
      if (isGray !== _prevCenterGray) {
        _prevCenterGray = isGray;
        const now = Date.now();
        // Log a concise snapshot of runtime state to help pinpoint the toggler
        console.log(`[PERF] centerGray=${isGray} frame=${frameCount} t=${now}`,
                    'battleState=', battleState,
                    'gameMode=', gameMode,
                    'mainMenuActive=', mainMenuActive,
                    'availableRooms=', (availableRooms || []).length,
                    'myRoomState=', myRoomState ? true : false,
                    'lastNetEvents=', {
                      roomsList: _lastRoomsJSON ? (JSON.parse(_lastRoomsJSON).length || 0) : 0,
                      lastRoomState: _lastNetworkEvent.roomState || null,
                      lastSnapshot: _lastNetworkEvent.snapshot || null,
                      lastJoined: _lastNetworkEvent.joinedRoom || null
                    }
        );
      }
    } catch (e) {
      console.warn('PERF diagnostic failed', e);
    }
  }
  // If the main menu is active, render it (takes priority over everything)
  if (mainMenuActive) {
    drawMainMenu();
    return;
  }
  // If an ending sequence is active, render it instead of normal state flow
  if (endingSequenceActive) {
    drawEndingSequence();
    return;
  }
  // Process pending scene transitions (safely delayed to next frame)
  // This prevents same-frame UI destruction from breaking button click context

  if (frameCount % 60 === 0) {
    console.log('[DEBUG] battleState =', battleState, 'gameMode =', gameMode);
  }

  if (battleState === BATTLE_STATES.MODE_SELECT) {
    drawModeSelectScreen();
  } else if (battleState === BATTLE_STATES.LOBBY) {
    drawUnifiedPreMatch();
  } else if (battleState === BATTLE_STATES.CHARACTER_SELECT_MENU) {
    drawCharacterSelectMenu();
  } else if (battleState === BATTLE_STATES.CHARACTER_PREVIEW) {
    drawCharacterPreview();
  } else if (battleState === BATTLE_STATES.CPU_OPPONENT_CONFIG) {
    drawCPUOpponentConfig();
  } else if (battleState === BATTLE_STATES.READY) {
    drawReadyScreen();
  } else if (battleState === BATTLE_STATES.OPENING) {
    // Continue simulating the fight during the opening animation so AI and input
    // edge detection remain active before the match officially begins.
    const savedBattleTimer = battleTimer;
    updateBattle();
    battleTimer = savedBattleTimer;
    drawOpeningSequence();
  } else if (battleState === BATTLE_STATES.BATTLE) {
    // Check for ultimate background dimming across all fighters
    const ultimateFighters = window.allFighters ? window.allFighters.filter(f => f.ultimateActive) : [];
    const ultimateActive = ultimateFighters.length > 0;
    
    background(0);
    
    // Update unpause countdown
    updateUnpauseCountdown(deltaTime / 1000);
    
    // If countdown is active or paused, skip fight simulation (battle is frozen)
    if (!unpauseCountdownActive && !battlePaused) {
      updateBattle();
    }
    
    // Position camera to keep characters centered vertically
    // Calculate the vertical midpoint of all active fighters
    if (window.allFighters && window.allFighters.length > 0) {
      let totalY = 0;
      let activeCount = 0;
      
      window.allFighters.forEach(fighter => {
        if (!fighter.isDefeated) {
          totalY += (fighter.pos && typeof fighter.pos.y !== 'undefined') ? fighter.pos.y : (fighter.y || 0);
          activeCount++;
        }
      });
      
      const fighterMidpointY = activeCount > 0 ? totalY / activeCount : ARENA_HEIGHT / 2;
      
      // Initialize camera variables if not already set
      if (typeof cameraX === 'undefined') cameraX = ARENA_WIDTH / 2;
      if (typeof cameraZoom === 'undefined') cameraZoom = 1;
      
      // Lerp toward fighter midpoint for smooth vertical centering
      if (typeof cameraY === 'undefined') cameraY = ARENA_HEIGHT / 2;
      cameraY = lerp(cameraY, fighterMidpointY, 0.1); // Smooth transition
    }
    
    // Recompute base camera state first, then apply impact zoom as a visual overlay.
    updateCamera(deltaTime / 1000);
    updateCombatZoom(deltaTime / 1000);

    // Update screen shake state before camera transform
    if (typeof updateScreenShake === 'function') {
      updateScreenShake(deltaTime / 1000);
    }

    ultimateImpactZoom = Math.max(0, ultimateImpactZoom - 0.08);

    const displayCameraZoomBase = combatZoom.active ? cameraZoom / combatZoom.currentZoom : cameraZoom;
    const displayCameraZoom = displayCameraZoomBase + ultimateImpactZoom;

    if (typeof clampCameraToVisibility === 'function') {
      clampCameraToVisibility(displayCameraZoom);
    }

    if (window.ultraLowGraphics) {
      // === ULTRA LOW GRAPHICS MODE ===
      // Replace everything with simple colored shapes
      beginCamera(displayCameraZoom, true);
      drawArenaULG();
      
      // Draw ULG shadows
      if (window.allFighters) {
        window.allFighters.forEach(fighter => {
          drawShadowULG(fighter);
        });
      }
      
      // Update interpolation for positioning
      updateClientInterpolation();
      
      // Draw fighters as simple rectangles
      if (window.allFighters) {
        window.allFighters.forEach(fighter => {
          fighter.updateSprite();
          drawFighterULG(fighter);
          // Draw status effects over fighter (kept for gameplay readability)
          fighter.drawStatusEffects();
        });
      }
      
      // Draw damage numbers in world space (kept in ULG mode)
      drawDamageNumbers();
      
      endCamera();
    } else {
      // === NORMAL GRAPHICS MODE ===
      beginCamera(displayCameraZoom, true);
      drawArena();
      
      // Draw shadows (above floor, below characters) - optimized batch
      if (typeof ShadowRenderer !== 'undefined') {
        ShadowRenderer.batchDrawAll();
      } else if (window.shadowImg && window.allFighters) {
        // Fallback: original shadow rendering
        window.allFighters.forEach(fighter => {
          const groundY = fighter.spawnY - 34;
          push();
          imageMode(CENTER);
          tint(255, 200);
          const shadowScale = 0.5;
          image(window.shadowImg, fighter.pos.x, groundY, 
                window.shadowImg.width * shadowScale, 
                window.shadowImg.height * shadowScale);
          pop();
        });
      }
      
      // Darken the battle background during ultimate sequences.
      if (typeof drawUltimateBackgroundDim === 'function') {
        const targetDim = ultimateActive
          ? Math.max(0, ...ultimateFighters.map(f => f.ultimateBackgroundDim || 0))
          : 0;
        drawUltimateBackgroundDim(targetDim);
      }
      
      // Draw ultimate name images in screen space (behind characters, above background)
      if (typeof renderUltimateNameImages === 'function') {
        renderUltimateNameImages();
      }
      
      // Draw ultimate render behind characters (dialogue, effects)
      if (window.allFighters) {
        window.allFighters.forEach(fighter => {
          if (typeof renderUltimate === 'function') {
            renderUltimate(fighter);
          }
        });
      }
      
      // Update interpolation targets before rendering
      updateClientInterpolation();
      // Draw all fighters
      if (window.allFighters) {
        window.allFighters.forEach(fighter => {
          fighter.draw();
          fighter.drawOverlays && fighter.drawOverlays();
        });
      }
      
      drawSlamLandingOverlays();
      drawDamageNumbers();
      drawParticles();
      drawImpactVisuals();
      
      // Draw overhead healthbars for non-player fighters
      drawOverheadHealthbars();
      
      // Draw debug overlay — world-space elements (hitboxes, labels, stagger bars)
      drawDebugUI();
      endCamera();
    }
    
    // Draw debug FPS — screen-space overlay (after camera)
    drawDebugFPS();
    // Draw ultimate UI overlay (damage counter, etc.)
    if (typeof renderUltimateUI === 'function') {
      renderUltimateUI();
    }
    
    // Draw pause menu if open
    if (pauseSettingsOpen) {
      drawSettingsPanel();
    } else if (pauseMenuOpen) {
      drawPauseMenu();
    }
  } else if (battleState === BATTLE_STATES.SUMMARY) {
    beginCamera();
    drawArena();
    
    // Draw shadows (above floor, below characters)
    if (window.shadowImg && window.allFighters) {
      window.allFighters.forEach(fighter => {
        const groundY = fighter.spawnY - 34; // Ground level (moved up 100 pixels)
        push();
        imageMode(CENTER);
        tint(255, 200); // Slight transparency
        const shadowScale = 0.5; // Smaller scale
        image(window.shadowImg, fighter.pos.x, groundY, 
              window.shadowImg.width * shadowScale, 
              window.shadowImg.height * shadowScale);
        pop();
      });
    }
    
    // Update interpolation targets before rendering
    updateClientInterpolation();
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
  } else if (battleState === BATTLE_STATES.COMBAT_OVER) {
    // Dedicated combat over screen — do not draw arena
    drawCombatOver();
  }

  // Draw HUD (on top of vignette)
  if (battleState !== BATTLE_STATES.LOBBY && battleState !== BATTLE_STATES.OPENING && battleState !== BATTLE_STATES.COMBAT_OVER && (typeof shouldHideGameplayUI !== 'function' || !shouldHideGameplayUI())) {
    if (window.ultraLowGraphics) {
      drawHudULG();
    } else {
      drawHud();
    }
  }

  // Draw UI vignette overlay only during combat (including ultimates)
  if (battleState === BATTLE_STATES.BATTLE) {
    drawVignette();
  }

  // Draw ultimate UI overlay (damage counter, etc.) - above everything including vignette
  if (typeof renderUltimateUI === 'function') {
    renderUltimateUI();
  }

  // Draw pause menu button above vignette
  if (typeof drawPauseMenuButton === 'function') {
    drawPauseMenuButton();
  }
  
  // Draw tutorial overlay on top of everything if active
  if (tutorialState.active) {
    drawTutorial();
  }
}

function drawModeSelectScreen() {
  // Use menu.png as background
  if (window.menuBackground && window.menuBackground.width > 0) {
    push();
    imageMode(CENTER);
    const scale = Math.max(width / window.menuBackground.width, height / window.menuBackground.height);
    const drawW = window.menuBackground.width * scale;
    const drawH = window.menuBackground.height * scale;
    image(window.menuBackground, width / 2, height / 2, drawW, drawH);
    pop();
  } else {
    background(20);
  }
  
  push();
  textAlign(CENTER, CENTER);
  textSize(28);
  if (typeof Titles !== 'undefined' && Titles !== null) {
    textFont(Titles);
  }
  fill(255);
  stroke(0);
  strokeWeight(3);
  text('GAME MODE', width / 2, 290);
  pop();
  
  push();
  textAlign(CENTER, CENTER);
  textSize(18);
  if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
    textFont(Subheadings);
  }
  fill(200);
  text('Choose your preferred game mode', width / 2, 315);
  pop();
  
  // Multiplayer button
  const multiplayerBtnX = width / 2 - 220;
  const multiplayerBtnY = height / 2 + 210;
  const btnW = 200;
  const btnH = 60;
  
  const multiplayerBtn = new UIButton(multiplayerBtnX, multiplayerBtnY, btnW, btnH, () => {
    gameMode = 'multiplayer';
    setBattleState(BATTLE_STATES.LOBBY);
  });
  multiplayerBtn.draw('Multiplayer', { stroke: [80, 150, 200], text: [80, 150, 200], textSize: 24 });
  modeSelectButtons.push(multiplayerBtn);
  
  // CPU button
  const cpuBtnX = width / 2 + 20;
  const cpuBtnY = multiplayerBtnY;
  
  const cpuBtn = new UIButton(cpuBtnX, cpuBtnY, btnW, btnH, () => {
    gameMode = 'cpu';
    setBattleState(BATTLE_STATES.LOBBY);
  });
  cpuBtn.draw('Against CPU', { stroke: [150, 80, 200], text: [150, 80, 200], textSize: 24 });
  modeSelectButtons.push(cpuBtn);
  
  push();
  textAlign(CENTER, CENTER);
  textSize(14);
  if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
    textFont(Subheadings);
  }
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
  cameraY = ARENA_HEIGHT / 2+300;
  
  beginCamera();
  drawArena();
  
  // Draw shadows (above floor, below characters)
  if (window.shadowImg && window.allFighters) {
    window.allFighters.forEach(fighter => {
      const groundY = fighter.spawnY - 34; // Ground level (moved up 100 pixels)
      push();
      imageMode(CENTER);
      tint(255, 200); // Slight transparency
      const shadowScale = 0.5; // Smaller scale
      image(window.shadowImg, fighter.pos.x, groundY, 
            window.shadowImg.width * shadowScale, 
            window.shadowImg.height * shadowScale);
      pop();
    });
  }
  
  // Update interpolation targets before rendering
  updateClientInterpolation();
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
  
  // Draw "combat start" sprite
  if (openingSequenceTimer > introDelay + fadeDuration && openingTextAlpha > 0) {
    push();
    resetMatrix();
    // start sprite is 12x4 = 768x256 native, display at ~600x200
    drawBattleUISprite('start', width / 2, height / 2, 600, 200);
    pop();
  }
}

function startEndingSequence(winnerId, winnerCharacter, options = {}) {
  if (endingSequenceActive) return;
  endingSequenceActive = true;
  endingSequenceTimer = 0;
  endingStartZoom = typeof cameraZoom !== 'undefined' ? cameraZoom : 1;
  // targetZoom should fit entire arena horizontally — default to 1 (full view)
  endingTargetZoom = Math.min(1, width / (ARENA_WIDTH || width));
  endingWinnerId = winnerId || null;
  endingWinnerCharacter = winnerCharacter || null;
  endingReturnToLobby = !!options.returnToLobby;
  showCombatOverMenu = false;
  resetLobbyReadyState();
}

function resetLobbyReadyState() {
  if (!players) return;
  players.forEach(player => {
    if (player) player.ready = false;
  });
}

function drawEndingSequence() {
  const dt = deltaTime / 1000;
  endingSequenceTimer += dt;

  // Phases: zooming -> hold -> show 'combat end' -> transition to summary/menu
  const zoomDur = endingZoomDuration;
  const holdDur = endingHoldDuration;
  const textDur = 0.6;
  const total = zoomDur + holdDur + textDur;

  // Compute zoom (ease out: fast -> slow)
  const zp = constrain(endingSequenceTimer / zoomDur, 0, 1);
  const eased = 1 - Math.pow(1 - zp, 3);
  const currentZoom = lerp(endingStartZoom, endingTargetZoom, eased);

  // Save original camera
  const originalZoom = typeof cameraZoom !== 'undefined' ? cameraZoom : 1;
  const originalX = typeof cameraX !== 'undefined' ? cameraX : 0;
  const originalY = typeof cameraY !== 'undefined' ? cameraY : 0;

  // Override camera for ending sequence: keep zoom-out behavior but center on fighters
  cameraZoom = currentZoom;
  // Compute center from active fighters (match combat centering)
  if (window.allFighters && window.allFighters.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    window.allFighters.forEach(f => {
      if (f.isDefeated) return;
      const x = (f.pos && typeof f.pos.x !== 'undefined') ? f.pos.x : (f.x || 0);
      const y = (f.pos && typeof f.pos.y !== 'undefined') ? f.pos.y : (f.y || 0);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    if (!isFinite(minX)) {
      cameraX = ARENA_WIDTH / 2;
      cameraY = ARENA_HEIGHT / 2;
    } else {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      cameraX = centerX;
      // Keep vertical centering similar to combat: bias toward arena center to show ground
      cameraY = lerp(centerY, ARENA_HEIGHT / 2, 0.35);
    }
  } else {
    cameraX = ARENA_WIDTH / 2;
    cameraY = ARENA_HEIGHT / 2;
  }

  // Render arena and fighters under overridden camera
  background(0);
  beginCamera();
  drawArena();
  
  // Draw shadows (above floor, below characters)
  if (window.shadowImg && window.allFighters) {
    window.allFighters.forEach(fighter => {
      const groundY = fighter.spawnY - 34; // Ground level (moved up 100 pixels)
      push();
      imageMode(CENTER);
      tint(255, 200); // Slight transparency
      const shadowScale = 0.5; // Smaller scale
      image(window.shadowImg, fighter.pos.x, groundY, 
            window.shadowImg.width * shadowScale, 
            window.shadowImg.height * shadowScale);
      pop();
    });
  }
  
  if (window.allFighters) {
    window.allFighters.forEach(f => f.draw());
  }
  endCamera();

  // Draw vignette / overlays
  drawDamageNumbers();

  // Draw 'COMBAT END' sprite after zoom completes
  if (endingSequenceTimer >= zoomDur) {
    const tProgress = constrain((endingSequenceTimer - zoomDur) / textDur, 0, 1);
    endingTextAlpha = lerp(0, 255, tProgress);
    
    // Determine if local player won (use same logic as combatOverOutcome determination)
    const localFighter = player || (window.allFighters ? window.allFighters.find(f => f.isPlayerControlled) : null);
    const isWin = localFighter && endingWinnerId === localFighter.clientId;
    
    push();
    resetMatrix();
    tint(255, endingTextAlpha);
    drawBattleUISprite(isWin ? 'win' : 'lose', width / 2, height / 2, 300, 300);
    noTint();
    pop();
  }

  // Restore camera
  cameraZoom = originalZoom;
  cameraX = originalX;
  cameraY = originalY;

  // After full sequence duration, begin fade to black then transition to COMBAT_OVER
  if (endingSequenceTimer >= total && !endingFading) {
    endingFading = true;
    endingFadeTimer = 0;
    endingFadeAlpha = 0;
  }

  if (endingFading) {
    endingFadeTimer += dt;
    endingFadeAlpha = constrain((endingFadeTimer / endingFadeDuration) * 255, 0, 255);
    // Draw fullscreen fade overlay
    push();
    resetMatrix();
    fill(0, endingFadeAlpha);
    noStroke();
    rect(0, 0, width, height);
    pop();

    if (endingFadeTimer >= endingFadeDuration) {
      endingFading = false;
      endingSequenceActive = false;
      endingFadeTimer = 0;
      endingFadeAlpha = 0;

      if (endingReturnToLobby) {
        window.allFighters = null;
        player = null;
        enemy = null;
        showCombatOverMenu = false;
        endingReturnToLobby = false;
        // Restore room state so lobby shows the room (not room search)
        if (window._savedRoomId) {
          myRoomId = window._savedRoomId;
          myRoomState = window._savedRoomState;
          window._savedRoomId = null;
          window._savedRoomState = null;
        }
        setBattleState(BATTLE_STATES.LOBBY);
      } else {
        // Finalize transition to COMBAT_OVER
        setBattleState(BATTLE_STATES.COMBAT_OVER);
        if (endingWinnerId) {
          winner = window.allFighters ? window.allFighters.find(f => f.clientId === endingWinnerId) : null;
          summaryText = winner ? `${winner.name} wins!` : `${endingWinnerCharacter || 'Player'} wins!`;
          const localFighter = player || (window.allFighters ? window.allFighters.find(f => f.isPlayerControlled) : null);
          if (localFighter) {
            if (localFighter.clientId === endingWinnerId) {
              combatOverOutcome = 'VICTORY';
              combatOverLine = 'You won the combat!';
            } else {
              combatOverOutcome = 'DEFEAT';
              combatOverLine = 'You were defeated.';
            }
          } else {
            combatOverOutcome = 'COMBAT OVER';
            combatOverLine = summaryText;
          }
        } else {
          winner = null;
          summaryText = 'Draw!';
          combatOverOutcome = 'DRAW';
          combatOverLine = 'Neither fighter emerged victorious.';
        }
        showCombatOverMenu = true;
      }
    }
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

}

// Update client-side interpolation for smooth visuals between server snapshots
function updateClientInterpolation() {
  if (!window.allFighters) return;
  const now = (typeof millis !== 'undefined') ? millis() : Date.now();
  for (let i = 0; i < window.allFighters.length; i++) {
    const f = window.allFighters[i];
    if (!f || !f.targetServerPos || !f.prevServerPos) continue;
    const start = f.snapshotStart || now;
    const dur = Math.max(1, f.snapshotDuration || SNAPSHOT_INTERVAL_MS);
    let t = constrain((now - start) / dur, 0, 1);
    
    // OPTIMIZED INTERPOLATION: Use quadratic ease-out for smoother feel
    // Prevents the sudden snap feeling when a new snapshot arrives late
    const eased = t * (2 - t); // quadratic ease out (less CPU than cubic pow)
    
    // Apply initial velocity-based extrapolation for the first 30% of interpolation
    // This reduces perceived input delay by moving toward target faster initially
    if (t < 0.3 && (f.vel.x !== 0 || f.vel.y !== 0)) {
      // Blend between extrapolation (velocity * dt) and interpolation
      const extrapT = t / 0.3;
      const extrapX = f.prevServerPos.x + f.vel.x * (t * (dur / 1000));
      const extrapY = f.prevServerPos.y + f.vel.y * (t * (dur / 1000));
      const intX = lerp(f.prevServerPos.x, f.targetServerPos.x, eased);
      const intY = lerp(f.prevServerPos.y, f.targetServerPos.y, eased);
      f.pos.x = lerp(extrapX, intX, extrapT);
      f.pos.y = lerp(extrapY, intY, extrapT);
    } else {
      f.pos.x = lerp(f.prevServerPos.x, f.targetServerPos.x, eased);
      f.pos.y = lerp(f.prevServerPos.y, f.targetServerPos.y, eased);
    }
  }
}

function drawVignette() {
  // Draw UI vignette image as an underlying overlay
  if (window.uiVignette && window.uiVignette.width > 0) {
    push();
    imageMode(CORNER);
    // Draw at full canvas size - no scaling needed as per user request
    image(window.uiVignette, 0, 0, width, height);
    pop();
  }
}

function updateBattle() {
  const dt = deltaTime / 1000;
  battleTimer += dt;

  // Send input state to server in multiplayer mode
  if ((gameMode === 'multiplayer' || cpuUsesServer) && typeof Network !== 'undefined' && Network.sendInput) {
    sendInputState();
  }

  // Update all fighters
  if (window.allFighters) {
    for (let i = 0; i < window.allFighters.length; i++) {
      const fighter = window.allFighters[i];
      
      // Local simulation for CPU/offline mode
      if (gameMode !== 'multiplayer' && !cpuUsesServer) {
        const targets = window.allFighters.filter(f => f !== fighter);
        fighter.update(dt, targets);
        continue;
      }

      // In multiplayer mode, the server controls fighter simulation.
      // Client only sends inputs and renders incoming state.
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
    if (activeFighters.length <= 1 && !endingSequenceActive) {
      setBattleState(BATTLE_STATES.SUMMARY);
      winner = activeFighters[0] || null;
      summaryText = winner ? `${winner.name} wins!` : 'Draw!';
    }
  }

  updateDamageNumbers(dt);
  updateParticles(dt);
  updateSlamLandingOverlays(dt);
  updateImpactVisuals(dt);
}

function getPlayerControlledFighter() {
  if (player && player.isPlayerControlled) {
    return player;
  }
  return null; // No player-controlled fighter found
}

function keyPressed() {
  // Handle tutorial key press (takes top priority over everything except main menu)
  if (tutorialState.active) {
    handleTutorialKeyPress();
    return;
  }
  
  // Handle main menu key press (takes priority)
  if (mainMenuActive) {
    handleMainMenuKeyPress();
    return;
  }

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
        // Start unpause countdown when closing pause menu
        startUnpauseCountdown();
      }
      return;
    }
    return;
  }
  
  // Open pause menu with ESC key during battle
  if (battleState === BATTLE_STATES.BATTLE && keyCode === ESCAPE) {
    // Only open pause if not already in countdown
    if (unpauseCountdownActive) return;
    pauseMenuOpen = true;
    pauseMenuOption = 0;
    return;
  }
  
  if (battleState === BATTLE_STATES.LOBBY) {
    // No keyboard controls - all navigation is mouse-based in the unified pre-match system
    return;
  }
  
  if (battleState === BATTLE_STATES.READY && keyCode === ENTER) {
    if (gameMode === 'cpu') {
      if (typeof Network !== 'undefined' && Network.isConnected) {
        cpuUsesServer = true;
        Network.startCpuBattle({
          characterKey: players[0].character || 'VALENCINA',
          cpuCharacterKey: cpuOpponentCharacter || 'CALLISTO',
          cpuAIEnabled: cpuOpponentAIEnabled
        });
      } else {
        initCPUBattle();
      }
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
      // Always process ability keys (Q for special abilities) regardless of game mode
      // This allows players to use character abilities in both single-player and multiplayer
      controlledFighter.processKeyPressed(key);
      
      // Local fallback for single-player responsiveness only
      if (gameMode !== 'multiplayer') {
        if (key === ' ' || keyCode === 32) {
          controlledFighter.startDash();
        }
      }
    }
  }
}

function forfeitMatch() {
  pauseMenuOpen = false;
  pauseSettingsOpen = false;

  if (Network && Network.isConnected && Network.socket) {
    Network.sendEvent({ type: 'FORFEIT_MATCH' });
    return;
  }

  // Local fallback when not connected
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
      // Local fallback for single-player responsiveness only
      if (gameMode !== 'multiplayer') {
        controlledFighter.processKeyReleased(key);
      }
    }
  }
}

function mouseWheel(event) {
  // Handle scrolling for room selection
  if (battleState === BATTLE_STATES.LOBBY && !myRoomState && gameMode === 'multiplayer') {
    const availRooms = availableRooms || [];
    const roomButtonHeight = 50;
    const maxListHeight = height - 200;
    const totalRoomHeight = availRooms.length * (roomButtonHeight + 20) + 70;
    
    // Only scroll if content exceeds visible area
    if (totalRoomHeight > maxListHeight) {
      const scrollSpeed = 30;
      window.roomScrollOffset += event.delta > 0 ? scrollSpeed : -scrollSpeed;
      
      // Clamp scroll offset
      const minOffset = Math.min(0, maxListHeight - totalRoomHeight);
      const maxOffset = 0;
      window.roomScrollOffset = Math.max(minOffset, Math.min(maxOffset, window.roomScrollOffset));
      
      // Prevent default browser scrolling
      return false;
    }
  }
}

function mousePressed() {
  console.log('MOUSE PRESSED FIRED');
  console.log('battleState', battleState);
console.log('myRoomState', myRoomState);
  
  // Handle tutorial click (takes priority over everything except main menu)
  if (tutorialState.active) {
    handleTutorialClick();
    return;
  }
  
  // Handle main menu click first (takes priority)
  if (mainMenuActive) {
    handleMainMenuClick();
    return;
  }
  
  if (battleState === BATTLE_STATES.MODE_SELECT) {
    // Check mode select buttons
    for (const btn of modeSelectButtons) {
      if (btn.click(mouseX, mouseY)) {
        return;
      }
    }
  }
  
  if (battleState === BATTLE_STATES.LOBBY) {
    // Handle unified pre-match clicks
    if (handleUnifiedPreMatchClick(mouseX, mouseY)) {
      return;
    }
    
    // Check pre-match buttons (room selection, create room, etc.)
    for (const btn of preMatchButtons) {
      if (btn.click(mouseX, mouseY)) {
        return;
      }
    }
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
  if (battleState === BATTLE_STATES.CPU_OPPONENT_CONFIG) {
    handleCPUConfigClick(mouseX, mouseY);
    return;
  }

  // Combat over screen button handling
  if (battleState === BATTLE_STATES.COMBAT_OVER && showCombatOverMenu) {
    const mx = mouseX;
    const my = mouseY;
    for (const btn of combatOverButtons) {
      if (btn.click(mx, my)) return;
    }
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

    // If settings panel is open, check debug button click, otherwise do NOT close
    // Only ESC can close settings (handled in keyPressed)
    if (pauseSettingsOpen) {
      // Check if the debug toggle button was clicked
      if (typeof settingsPanelDebugBtn !== 'undefined' && settingsPanelDebugBtn) {
        const btn = settingsPanelDebugBtn;
        if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) {
          if (typeof setDebugGraphics === 'function') {
            setDebugGraphics();
          }
          return;
        }
      }
      // Check if the impact visuals toggle button was clicked
      if (typeof toggleImpactVisuals === 'function') {
        // The impact button is at the same position as the ULG button but 36px above
        // We need to check its bounds: same x/w as debug button, y = debugBtn.y + 36
        const impBtnX = settingsPanelDebugBtn ? settingsPanelDebugBtn.x : 0;
        const impBtnY = settingsPanelDebugBtn ? settingsPanelDebugBtn.y + 36 : 0;
        const impBtnW = settingsPanelDebugBtn ? settingsPanelDebugBtn.w : 180;
        const impBtnH = settingsPanelDebugBtn ? settingsPanelDebugBtn.h : 28;
        if (mx > impBtnX && mx < impBtnX + impBtnW && my > impBtnY && my < impBtnY + impBtnH) {
          toggleImpactVisuals();
          return;
        }
      }

      // Check if the ultra low graphics toggle button was clicked
      if (typeof settingsPanelUlgBtn !== 'undefined' && settingsPanelUlgBtn) {
        const ulgBtn = settingsPanelUlgBtn;
        if (mx > ulgBtn.x && mx < ulgBtn.x + ulgBtn.w && my > ulgBtn.y && my < ulgBtn.y + ulgBtn.h) {
          window.ultraLowGraphics = !window.ultraLowGraphics;
          console.log('[ULG] Ultra Low Graphics:', window.ultraLowGraphics ? 'ON' : 'OFF');
          return;
        }
      }
      // Click does NOT close settings anymore - only ESC does
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
    // Local fallback for single-player responsiveness only
    if (gameMode !== 'multiplayer') {
      controlledFighter.requestAttack();
      lastMouseDown = millis();
    }
  } else if (mouseButton === RIGHT) {
    // Local fallback for single-player responsiveness only
    if (gameMode !== 'multiplayer') {
      controlledFighter.requestGuard(enemy);
    }
  }
}

function mouseReleased() {
  if (battleState !== BATTLE_STATES.BATTLE) {
    return;
  }

  const controlledFighter = getPlayerControlledFighter();
  if (mouseButton === LEFT) {
    // Local fallback for single-player responsiveness only
    if (gameMode !== 'multiplayer') {
      const held = millis() - (lastMouseDown || 0);
      controlledFighter.releaseAttack(held > 300);
      lastMouseDown = null;
    }
  } else if (mouseButton === RIGHT) {
    // Local fallback for single-player responsiveness only
    if (gameMode !== 'multiplayer') {
      controlledFighter.releaseGuard();
    }
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
  if (typeof Titles !== 'undefined' && Titles !== null) {
    textFont(Titles);
  }
  fill(255);
  text(data.name || key, previewX + 18, previewY + 18);
  textSize(14);
  if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
    textFont(Subheadings);
  }
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
    if (gameMode === 'cpu') {
      // Save the selected character for local CPU mode
      if (sel) {
        players[0].character = sel;
        players[0].active = true;
        players[0].controlled = true;
        players[0].ai = false;
        players[0].ready = false;
      }
    }
    if (roomCharacterSelectSlot >= 0) {
      localSlotSelections[roomCharacterSelectSlot] = sel;
    }
    if (gameMode === 'multiplayer' && sel && typeof Network !== 'undefined' && Network.changeCharacter) {
      Network.changeCharacter(sel);
    }
    // Clear preview state
    previewCharacterKey = null;
    roomCharacterSelectSlot = -1;
    
    if (gameMode === 'cpu') {
      // For CPU mode, go to opponent config screen
      setBattleState(BATTLE_STATES.CPU_OPPONENT_CONFIG);
    } else {
      setBattleState(BATTLE_STATES.LOBBY);
    }
    console.log('TRANSITION TO', battleState);
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

/**
 * CPU OPPONENT CONFIGURATION SCREEN
 * Allows choosing opponent character and AI behavior on/off
 */
function drawCPUOpponentConfig() {
  background(24);
  
  push();
  textAlign(CENTER, CENTER);
  textSize(34);
  fill(240);
  stroke(0);
  strokeWeight(3);
  text('CPU OPPONENT CONFIG', width / 2, 48);
  pop();
  
  cpuConfigButtons = [];
  const keys = availableCharacterKeys();
  const cardW = 220;
  const cardH = 80;
  const spacing = 20;
  const cols = Math.min(keys.length, 3);
  const startX = (width - (cols * cardW + (cols - 1) * spacing)) / 2;
  const startY = 130;
  
  // Title for opponent character selection
  push();
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(200);
  text('Select Opponent Character:', width / 2, 100);
  pop();
  
  // Character selection cards
  for (let i = 0; i < keys.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + spacing);
    const y = startY + row * (cardH + spacing);
    const key = keys[i];
    const data = window.CHARACTERS && window.CHARACTERS[key] ? window.CHARACTERS[key] : { name: key };
    const isSelected = key === cpuOpponentCharacter;
    
    const btn = new UIButton(x, y, cardW, cardH, () => {
      cpuOpponentCharacter = key;
    });
    btn.draw(data.name || key, { 
      stroke: isSelected ? [80, 200, 80] : [60, 60, 80], 
      fill: isSelected ? [30, 60, 30] : [20, 24, 30], 
      text: isSelected ? [100, 255, 100] : 255,
      textSize: 16 
    });
    cpuConfigButtons.push(btn);
    
    if (isSelected) {
      push();
      noFill();
      stroke(80, 200, 80);
      strokeWeight(3);
      rect(x, y, cardW, cardH, 6);
      pop();
    }
  }
  
  // AI toggle section
  const toggleY = startY + (Math.ceil(keys.length / cols)) * (cardH + spacing) + 40;
  
  push();
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(200);
  text('AI Behavior:', width / 2, toggleY - 10);
  pop();
  
  // AI On button
  const btnW = 200;
  const btnH = 50;
  const btnGap = 20;
  const aiOnX = width / 2 - btnW - btnGap / 2;
  
  const aiOnBtn = new UIButton(aiOnX, toggleY + 20, btnW, btnH, () => {
    cpuOpponentAIEnabled = true;
  });
  aiOnBtn.draw('AI ON (Reactive)', { 
    stroke: cpuOpponentAIEnabled ? [80, 200, 80] : [60, 60, 80], 
    fill: cpuOpponentAIEnabled ? [30, 60, 30] : [30, 30, 30], 
    text: cpuOpponentAIEnabled ? [100, 255, 100] : 200 
  });
  cpuConfigButtons.push(aiOnBtn);
  
  // AI Off button
  const aiOffX = width / 2 + btnGap / 2;
  
  const aiOffBtn = new UIButton(aiOffX, toggleY + 20, btnW, btnH, () => {
    cpuOpponentAIEnabled = false;
  });
  aiOffBtn.draw('AI OFF (Passive)', { 
    stroke: !cpuOpponentAIEnabled ? [200, 80, 80] : [60, 60, 80], 
    fill: !cpuOpponentAIEnabled ? [60, 30, 30] : [30, 30, 30], 
    text: !cpuOpponentAIEnabled ? [255, 100, 100] : 200 
  });
  cpuConfigButtons.push(aiOffBtn);
  
  // Start Battle button
  const startBtnY = toggleY + 100;
  const startBtn = new UIButton(width / 2 - 120, startBtnY, 240, 55, () => {
    // Apply AI setting to the opponent fighter
    players[0].ready = true;
    if (typeof Network !== 'undefined' && Network.isConnected) {
      cpuUsesServer = true;
      Network.startCpuBattle({
        characterKey: players[0].character || 'VALENCINA',
        cpuCharacterKey: cpuOpponentCharacter || 'CALLISTO',
        cpuAIEnabled: cpuOpponentAIEnabled
      });
    } else {
      initCPUBattle();
    }
    setBattleState(BATTLE_STATES.READY);
  });
  startBtn.draw('START BATTLE!', { stroke: [80, 200, 80], fill: [40, 90, 40], text: 255, textSize: 20 });
  cpuConfigButtons.push(startBtn);
  
  // Back button
  const backBtn = new UIButton(18, 18, 100, 34, () => {
    setBattleState(BATTLE_STATES.CHARACTER_PREVIEW);
  });
  backBtn.draw('BACK', { stroke: [100, 100, 100], fill: [30, 30, 30], text: 255, textSize: 12 });
  cpuConfigButtons.push(backBtn);
}

/** Handle CPU config click */
function handleCPUConfigClick(mx, my) {
  for (const btn of cpuConfigButtons) {
    if (btn.click(mx, my)) return;
  }
}

function drawLobby() {
  background(20);

  // Lobby connection status
  if (typeof Network !== 'undefined' && !Network.isConnected) {
    push();
    textAlign(CENTER, CENTER);
    textSize(18);
    fill(255, 220, 100);
    noStroke();
    text('connecting', width / 2, height - 24);
    pop();
  }

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

    // Leave button (uses preMatchButtons for click handling)
    const leaveBtn = new UIButton(20, 45, 100, 28, () => {
      if (typeof Network !== 'undefined' && Network.leaveRoom) {
        Network.leaveRoom();
      }
      // Also clear local state and return to room matchmaking
      myRoomState = null;
      myRoomId = null;
      // Clear room state but stay in LOBBY (room matchmaking)
      preMatchState = PRE_MATCH_STATES.LOBBY;
    });
    leaveBtn.draw('LEAVE', {
      stroke: [180, 80, 80],
      fill: [80, 40, 40],
      text: 255,
      textSize: 12
    });
    preMatchButtons.push(leaveBtn);

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
        // Check if this is a multiplayer room with one player and an empty slot
        const hasOnePlayer = slots.filter(s => s && s.clientId).length === 1;
        push();
        textAlign(CENTER, CENTER);
        textSize(14);
        fill(120);
        text('Empty', x + (columnWidth - 20) / 2, y + 70);
        if (hasOnePlayer) {
          fill(180, 180, 255);
          textSize(12);
          text('waiting for player...', x + (columnWidth - 20) / 2, y + 95);
        } else {
          fill(100, 255, 100);
          textSize(12);
          text('Click to join', x + (columnWidth - 20) / 2, y + 100);
        }
        pop();
        continue;
      }

      const isOwnedSlot = (Network && Network.myClientId && slot.clientId === Network.myClientId) || (Network && Network.isLocalAuthority && slot.clientId === 'local');
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
      if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
        textFont(Subheadings);
      }
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
          console.log('toggleready');
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
      
      const isFull = players >= maxPlayers;
      
      // Room button - using UIButton for consistent styling
      const roomBtn = new UIButton(roomStartX, roomY, roomButtonWidth, roomButtonHeight, () => {
        if (isFull) return;
        if (typeof Network !== 'undefined' && Network.joinRoom) {
          Network.joinRoom(roomId);
        }
      });
      roomBtn.enabled = !isFull;
      roomBtn.draw(`${roomId}`, { stroke: isFull ? [150, 50, 50] : [100, 200, 100], text: isFull ? [150, 100, 100] : [100, 255, 100], textSize: 14 });
      preMatchButtons.push(roomBtn);
      
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
  
  // Create room button (centered) - using UIButton for consistent styling
  const createButtonX = (width - roomButtonWidth) / 2;
  const createButtonY = roomY + 50;
  const createBtn = new UIButton(createButtonX, createButtonY, roomButtonWidth, roomButtonHeight, () => {
    if (typeof Network !== 'undefined' && Network.createRoom) {
      Network.createRoom();
    }
  });
  createBtn.draw('Create New Room', { stroke: [150, 150, 255], text: [150, 150, 255], textSize: 14 });
  preMatchButtons.push(createBtn);
  
  pop();
}

function getCharacterIdleSpriteName(characterKey) {
  if (characterKey === 'CALLISTO') return 'cidle';
  if (characterKey === 'VALENCINA') return 'idle';
  return 'idle';
}

// ============================================================
// UNIFIED PRE-MATCH SYSTEM
// ============================================================

/**
 * Main entry point for the unified pre-match system
 * Routes to the appropriate sub-state based on preMatchState
 */
function drawUnifiedPreMatch() {
  // Update fade transitions
  updateCharacterFade();
  
  // Draw character art background (always visible)
  drawCharacterArtBackground();
  
  // Route to appropriate sub-state
  if (preMatchState === PRE_MATCH_STATES.LOBBY) {
    drawPreMatchLobby();
  } else if (preMatchState === PRE_MATCH_STATES.CHARACTER_SELECT) {
    drawPreMatchCharacterSelect();
  } else if (preMatchState === PRE_MATCH_STATES.CHARACTER_INSPECT) {
    drawPreMatchCharacterInspect();
  }
  
  // Draw fade overlay if fading
  if (isFading) {
    push();
    noStroke();
    fill(0, characterFadeAlpha);
    rect(0, 0, width, height);
    pop();
  }
}

/**
 * Draw the character art background based on the currently viewed character
 */
function drawCharacterArtBackground() {
  const artAsset = CHARACTER_ART_ASSETS[currentViewedCharacter];
  const artImage = window.characterArt && window.characterArt[artAsset];
  
  if (artImage && artImage.width > 0) {
    push();
    imageMode(CENTER);
    // Scale image to cover the screen while maintaining aspect ratio
    const scale = Math.max(width / artImage.width, height / artImage.height);
    const drawW = artImage.width * scale;
    const drawH = artImage.height * scale;
    image(artImage, width / 2, height / 2, drawW, drawH);
    pop();
    
    // Draw bottomvin.png directly on top of character art
    if (window.bottomVignette && window.bottomVignette.width > 0) {
      push();
      imageMode(CENTER);
      const vScale = Math.max(width / window.bottomVignette.width, height / window.bottomVignette.height);
      const vDrawW = window.bottomVignette.width * vScale;
      const vDrawH = window.bottomVignette.height * vScale;
      image(window.bottomVignette, width / 2, height / 2, vDrawW, vDrawH);
      pop();
    }
  } else {
    // Fallback to solid color background
    push();
    background(20);
    pop();
  }
}

/**
 * Update character fade transitions
 */
function updateCharacterFade() {
  if (!isFading) return;
  
  const fadeSpeed = 15; // Alpha change per frame
  
  if (fadeDirection === -1) {
    // Fading out
    characterFadeAlpha += fadeSpeed;
    if (characterFadeAlpha >= 255) {
      characterFadeAlpha = 255;
      // Swap character
      if (targetCharacter) {
        currentViewedCharacter = targetCharacter;
        targetCharacter = null;
      }
      fadeDirection = 1; // Start fading in
    }
  } else if (fadeDirection === 1) {
    // Fading in
    characterFadeAlpha -= fadeSpeed;
    if (characterFadeAlpha <= 0) {
      characterFadeAlpha = 0;
      isFading = false;
      fadeDirection = 0;
    }
  }
}

/**
 * Start a character fade transition
 */
function startCharacterFade(newCharacter) {
  if (isFading) return; // Don't interrupt existing fade
  if (newCharacter === currentViewedCharacter) return;
  
  isFading = true;
  fadeDirection = -1; // Start fading out
  targetCharacter = newCharacter;
  characterFadeAlpha = 0;
}

/**
 * Get the next character in the cycling order
 */
function getNextCharacter(currentChar) {
  const index = CHARACTER_ORDER.indexOf(currentChar);
  if (index === -1) return CHARACTER_ORDER[0];
  const nextIndex = (index + 1) % CHARACTER_ORDER.length;
  return CHARACTER_ORDER[nextIndex];
}

/**
 * Get the previous character in the cycling order
 */
function getPrevCharacter(currentChar) {
  const index = CHARACTER_ORDER.indexOf(currentChar);
  if (index === -1) return CHARACTER_ORDER[0];
  const prevIndex = (index - 1 + CHARACTER_ORDER.length) % CHARACTER_ORDER.length;
  return CHARACTER_ORDER[prevIndex];
}

/**
 * LOBBY STATE
 * Shows local player controls and opponent information
 */
function drawPreMatchLobby() {
  preMatchButtons = [];
  
  // Sync current viewed character with local selection
  currentViewedCharacter = localSelectedCharacter;
  
  // If not in a room and in multiplayer mode, show room selection
  if (!myRoomState && gameMode === 'multiplayer') {
    drawRoomSelection();
    return;
  }
  
  // CPU mode (no room): show ready/switch controls directly
  if (gameMode === 'cpu') {
    drawCPULobby();
    return;
  }
  
  // Local Player Controls (lower-center)
  const buttonW = 200;
  const buttonH = 50;
  const buttonY = height - 100;
  const buttonGap = 20;
  const centerX = width / 2;
  
  // Ready button
  const readyBtn = new UIButton(centerX - buttonW - buttonGap / 2, buttonY, buttonW, buttonH, () => {
    if (typeof Network !== 'undefined' && Network.toggleReady) {
      Network.toggleReady();
    }
  });
  
  const isLocalReady = getLocalReadyState();
  readyBtn.draw(isLocalReady ? 'UNREADY' : 'READY', {
    stroke: isLocalReady ? [255, 100, 100] : [100, 255, 100],
    fill: isLocalReady ? [100, 80, 80] : [60, 100, 60],
    text: 255
  });
  preMatchButtons.push(readyBtn);
  
  // Switch Character button
  const switchBtn = new UIButton(centerX + buttonGap / 2, buttonY, buttonW, buttonH, () => {
    preMatchState = PRE_MATCH_STATES.CHARACTER_SELECT;
    currentViewedCharacter = localSelectedCharacter;
  });
  switchBtn.draw('SWITCH CHARACTER', {
    stroke: [100, 160, 255],
    fill: [40, 70, 120],
    text: 255
  });
  preMatchButtons.push(switchBtn);
  
  // Opponent Display (lower-right) - small square
  drawOpponentDisplay();
  
  // Room info (top-left) with leave button
  if (myRoomState) {
    push();
    textAlign(LEFT, TOP);
    textSize(16);
    fill(200);
    text(`Room: ${myRoomState.id}`, 20, 20);
    pop();
    
    // Leave button (top-left, next to room code)
    const leaveBtn = new UIButton(20, 45, 100, 28, () => {
      if (typeof Network !== 'undefined' && Network.leaveRoom) {
        Network.leaveRoom();
      }
      // Clear local room state and return to room matchmaking
      myRoomState = null;
      myRoomId = null;
      // Clear room state but stay in LOBBY (room matchmaking)
      preMatchState = PRE_MATCH_STATES.LOBBY;
    });
    leaveBtn.draw('LEAVE', {
      stroke: [180, 80, 80],
      fill: [80, 40, 40],
      text: 255,
      textSize: 12
    });
    preMatchButtons.push(leaveBtn);
  }
  
  // Start Battle button if all ready
  if (myRoomState && myRoomState.allReady) {
    const startBtn = new UIButton(centerX - 120, height - 180, 240, 50, () => {
      if (typeof Network !== 'undefined' && Network.startBattle) {
        Network.startBattle();
      }
    });
    startBtn.draw('START BATTLE!', {
      stroke: [100, 255, 100],
      fill: [60, 120, 60],
      text: 255,
      textSize: 18
    });
    preMatchButtons.push(startBtn);
  }
}

/**
 * Draw room selection when not in a room (multiplayer mode)
 */
function drawRoomSelection() {
  // Use menu.png as background
  if (window.menuBackground && window.menuBackground.width > 0) {
    push();
    imageMode(CENTER);
    const scale = Math.max(width / window.menuBackground.width, height / window.menuBackground.height);
    const drawW = window.menuBackground.width * scale;
    const drawH = window.menuBackground.height * scale;
    image(window.menuBackground, width / 2, height / 2, drawW, drawH);
    pop();
  } else {
    background(20);
  }
  
  push();
  
  // Connection status
  if (typeof Network !== 'undefined' && !Network.isConnected) {
    textAlign(CENTER, CENTER);
    textSize(18);
    if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
      textFont(Subheadings);
    }
    fill(255, 220, 100);
    noStroke();
    text('Connecting to server...', width / 2, 120);
    pop();
    return;
  }
  
  // Return to Mode Select button (top-left)
  const backToModeBtn = new UIButton(18, 18, 170, 34, () => {
    gameMode = null;
    myRoomState = null;
    myRoomId = null;
    setBattleState(BATTLE_STATES.MODE_SELECT);
  });
  backToModeBtn.draw('← RETURN TO MODE SELECT', {
    stroke: [200, 180, 120],
    fill: [80, 60, 30],
    text: 255,
    textSize: 11
  });
  preMatchButtons.push(backToModeBtn);
  
  textAlign(CENTER, CENTER);
  textSize(28);
  if (typeof Titles !== 'undefined' && Titles !== null) {
    textFont(Titles);
  }
  fill(255);
  stroke(0);
  strokeWeight(3);
  text('FIND MATCH', width / 2, 290);
  
  textSize(16);
  if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
    textFont(Subheadings);
  }
  fill(180);
  noStroke();
  text('Available Rooms:', width / 2, 315);
  
  const availRooms = availableRooms || [];
  const roomButtonWidth = 300;
  const roomButtonHeight = 50;
  const roomStartX = (width - roomButtonWidth) / 2;
  const listStartY = 340;
  const maxListHeight = height - 380;
  let roomY = listStartY;
  
  // Initialize scroll offset if not exists
  if (typeof window.roomScrollOffset === 'undefined') {
    window.roomScrollOffset = 0;
  }
  
  // Calculate total height needed for room list
  const totalRoomHeight = availRooms.length * (roomButtonHeight + 20) + 70;
  
  // Draw scrollable area background with rectangular outline
  push();
  stroke(150, 150, 150);
  strokeWeight(2);
  noFill();
  rect(roomStartX - 10, listStartY - 10, roomButtonWidth + 20, maxListHeight, 5);
  pop();
  
  // Apply clipping for scrollable area
  push();
  // Create clipping region
  clip(() => {
    rect(roomStartX - 10, listStartY - 10, roomButtonWidth + 20, maxListHeight);
  });
  
  // Apply scroll offset
  translate(0, window.roomScrollOffset);
  
  if (availRooms.length === 0) {
    fill(130);
    textSize(14);
    if (typeof Subheadings !== 'undefined' && Subheadings !== null) {
      textFont(Subheadings);
    }
    text('No rooms available — create one!', width / 2, roomY + 20);
    roomY += 50;
  } else {
    for (let i = 0; i < availRooms.length; i++) {
      const roomData = availRooms[i];
      const roomId = typeof roomData === 'string' ? roomData : roomData.id;
      const players = typeof roomData === 'string' ? 0 : (roomData.players || 0);
      const maxPlayers = typeof roomData === 'string' ? 2 : (roomData.maxPlayers || 2);
      
      const isFull = players >= maxPlayers;
      
      // Draw rectangular outline for room slot
      push();
      stroke(isFull ? [200, 100, 100] : [100, 200, 100]);
      strokeWeight(2);
      noFill();
      rect(roomStartX, roomY, roomButtonWidth, roomButtonHeight, 5);
      pop();
      
      // Room button - full rooms are red/disabled and won't join
      const roomBtn = new UIButton(roomStartX, roomY, roomButtonWidth, roomButtonHeight, () => {
        if (isFull) return; // Don't allow joining full rooms
        if (typeof Network !== 'undefined' && Network.joinRoom) {
          Network.joinRoom(roomId);
        }
      });
      roomBtn.enabled = !isFull;
      roomBtn.draw(isFull ? roomId + ' (FULL)' : roomId, {
        stroke: isFull ? [200, 100, 100] : [100, 200, 100],
        fill: isFull ? [80, 40, 40] : [40, 80, 40],
        text: isFull ? 200 : 255,
        textSize: 14
      });
      preMatchButtons.push(roomBtn);
      
      // Player count squares
      const squareSize = 12;
      const squareGap = 5;
      const totalWidth = maxPlayers * (squareSize + squareGap) - squareGap;
      const squaresStartX = (width - totalWidth) / 2;
      const squaresY = roomY + roomButtonHeight + 6;
      
      push();
      for (let j = 0; j < maxPlayers; j++) {
        const sx = squaresStartX + j * (squareSize + squareGap);
        fill(j < players ? color(isFull ? 255 : 100, isFull ? 100 : 255, isFull ? 100 : 100) : color(50, 60, 50));
        noStroke();
        rect(sx, squaresY, squareSize, squareSize, 2);
      }
      pop();
      
      roomY += roomButtonHeight + 20;
    }
  }
  
  pop(); // End clipping region
  
  // Create room button at bottom of screen (outside clipping region)
  const createY = height - 60;
  const createBtn = new UIButton(roomStartX, createY, roomButtonWidth, roomButtonHeight, () => {
    if (typeof Network !== 'undefined' && Network.createRoom) {
      Network.createRoom();
    }
  });
  createBtn.draw('CREATE NEW ROOM', {
    stroke: [150, 150, 255],
    fill: [50, 50, 100],
    text: 255,
    textSize: 14
  });
  preMatchButtons.push(createBtn);
  
  pop();
}

/**
 * Draw CPU mode lobby (no room needed)
 */
function drawCPULobby() {
  preMatchButtons = [];
  
  // Character name display
  const charData = window.CHARACTERS && window.CHARACTERS[localSelectedCharacter];
  const charName = charData ? charData.name : localSelectedCharacter;
  
  push();
  textAlign(CENTER, TOP);
  textSize(32);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text(charName, width / 2, 30);
  pop();
  
  // CPU opponent display (clickable to cycle characters)
  const opponentChar = cpuOpponentCharacter || 'CALLISTO';
  const opponentData = window.CHARACTERS && window.CHARACTERS[opponentChar];
  const opponentName = opponentData ? opponentData.name : opponentChar;
  
  // Opponent info (bottom-right square) - clickable to swap CPU character
  push();
  const ox = width - 170;
  const oy = height - 170;
  fill(30, 30, 40, 230);
  stroke(100, 100, 120);
  strokeWeight(2);
  rect(ox, oy, 150, 150, 10);
  
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(16);
  text(opponentName, ox + 75, oy + 30);
  textSize(12);
  fill(200);
  text('CPU', ox + 75, oy + 55);
  
  // Hint text
  fill(150, 150, 200);
  textSize(9);
  text('click to change', ox + 75, oy + 80);
  pop();
  
  // Register CPU opponent box as clickable to cycle character
  const cpuOpponentBoxBtn = new UIButton(ox, oy, 150, 150, () => {
    const keys = availableCharacterKeys();
    const currentIndex = keys.indexOf(cpuOpponentCharacter);
    const nextIndex = (currentIndex + 1) % keys.length;
    cpuOpponentCharacter = keys[nextIndex];
  });
  preMatchButtons.push(cpuOpponentBoxBtn);
  
  // Lower-center controls
  const buttonW = 200;
  const buttonH = 50;
  const buttonY = height - 100;
  const buttonGap = 20;
  const centerX = width / 2;
  
  // Ready / Start Battle button
  const readyBtn = new UIButton(centerX - buttonW - buttonGap / 2, buttonY, buttonW, buttonH, () => {
    // Start CPU battle
    players[0].character = localSelectedCharacter;
    players[0].active = true;
    players[0].controlled = true;
    players[0].ai = false;
    players[0].ready = true;
    
    if (typeof Network !== 'undefined' && Network.isConnected) {
      cpuUsesServer = true;
      Network.startCpuBattle({
        characterKey: localSelectedCharacter,
        cpuCharacterKey: cpuOpponentCharacter || 'CALLISTO',
        cpuAIEnabled: cpuOpponentAIEnabled
      });
    } else {
      initCPUBattle();
    }
    setBattleState(BATTLE_STATES.READY);
  });
  readyBtn.draw('START BATTLE', {
    stroke: [100, 200, 100],
    fill: [50, 100, 50],
    text: 255
  });
  preMatchButtons.push(readyBtn);
  
  // Switch Character button
  const switchBtn = new UIButton(centerX + buttonGap / 2, buttonY, buttonW, buttonH, () => {
    preMatchState = PRE_MATCH_STATES.CHARACTER_SELECT;
    currentViewedCharacter = localSelectedCharacter;
  });
  switchBtn.draw('SWITCH CHARACTER', {
    stroke: [100, 160, 255],
    fill: [40, 70, 120],
    text: 255
  });
  preMatchButtons.push(switchBtn);
  
  // AI Toggle button
  const aiToggleBtn = new UIButton(centerX - 80, buttonY - 60, 160, 40, () => {
    cpuOpponentAIEnabled = !cpuOpponentAIEnabled;
  });
  aiToggleBtn.draw('AI: ' + (cpuOpponentAIEnabled ? 'ON' : 'OFF'), {
    stroke: cpuOpponentAIEnabled ? [80, 200, 80] : [200, 80, 80],
    fill: cpuOpponentAIEnabled ? [40, 80, 40] : [80, 40, 40],
    text: 255,
    textSize: 13
  });
  preMatchButtons.push(aiToggleBtn);
  
  // Return to Mode Select button (top-left)
  const backToModeBtn = new UIButton(18, 18, 170, 34, () => {
    gameMode = null;
    preMatchState = PRE_MATCH_STATES.LOBBY;
    setBattleState(BATTLE_STATES.MODE_SELECT);
  });
  backToModeBtn.draw('← RETURN TO MODE SELECT', {
    stroke: [200, 180, 120],
    fill: [80, 60, 30],
    text: 255,
    textSize: 11
  });
  preMatchButtons.push(backToModeBtn);
}

/**
 * Get the local player's ready state from room state
 */
function getLocalReadyState() {
  if (!myRoomState || !myRoomState.slots) return false;
  const myClientId = Network && Network.myClientId;
  if (!myClientId) return false;
  
  const mySlot = myRoomState.slots.find(s => s.clientId === myClientId);
  return mySlot ? mySlot.ready : false;
}

/**
 * Draw opponent information in the lower-right corner as a small square
 */
function drawOpponentDisplay() {
  if (!myRoomState || !myRoomState.slots) return;
  
  const myClientId = Network && Network.myClientId;
  if (!myClientId) return;
  
  const opponentSlot = myRoomState.slots.find(s => s.clientId !== myClientId && s.clientId);
  if (!opponentSlot) return;
  
  const boxSize = 100;
  const displayX = width - boxSize - 20;
  const displayY = height - boxSize - 20;
  
  push();
  // Background square
  fill(30, 30, 40, 230);
  stroke(opponentSlot.ready ? [100, 255, 100] : [100, 100, 120]);
  strokeWeight(2);
  rect(displayX, displayY, boxSize, boxSize, 8);
  
  // Character name (truncated)
  const charKey = opponentSlot.character || '—';
  const charName = (window.CHARACTERS && window.CHARACTERS[charKey]) ? window.CHARACTERS[charKey].name : charKey;
  
  textAlign(CENTER, CENTER);
  textSize(12);
  fill(255);
  text(charName, displayX + boxSize / 2, displayY + boxSize / 2 - 10);
  
  // Ready state indicator
  textSize(10);
  if (opponentSlot.ready) {
    fill(100, 255, 100);
    text('READY', displayX + boxSize / 2, displayY + boxSize / 2 + 12);
  } else {
    fill(255, 255, 100);
    text('WAITING', displayX + boxSize / 2, displayY + boxSize / 2 + 12);
  }
  
  pop();
}

/**
 * CHARACTER SELECT STATE
 * Allows cycling through characters with fade transitions
 */
function drawPreMatchCharacterSelect() {
  preMatchButtons = [];
  
  const buttonW = 120;
  const buttonH = 45;
  const buttonY = height - 100;
  const centerX = width / 2;
  const buttonGap = 15;
  
  // Left button (previous character)
  const leftBtn = new UIButton(centerX - buttonW * 2 - buttonGap * 2, buttonY, buttonW, buttonH, () => {
    const prevChar = getPrevCharacter(currentViewedCharacter);
    startCharacterFade(prevChar);
  });
  leftBtn.draw('<', {
    stroke: [150, 150, 180],
    fill: [50, 50, 70],
    text: 255,
    textSize: 24
  });
  preMatchButtons.push(leftBtn);
  
  // Right button (next character)
  const rightBtn = new UIButton(centerX + buttonW + buttonGap * 2, buttonY, buttonW, buttonH, () => {
    const nextChar = getNextCharacter(currentViewedCharacter);
    startCharacterFade(nextChar);
  });
  rightBtn.draw('>', {
    stroke: [150, 150, 180],
    fill: [50, 50, 70],
    text: 255,
    textSize: 24
  });
  preMatchButtons.push(rightBtn);
  
  // Inspect button
  const inspectBtn = new UIButton(centerX - buttonW - buttonGap / 2, buttonY, buttonW, buttonH, () => {
    preMatchState = PRE_MATCH_STATES.CHARACTER_INSPECT;
    inspectPage = 'active';
  });
  inspectBtn.draw('INSPECT', {
    stroke: [150, 150, 200],
    fill: [60, 60, 90],
    text: 255
  });
  preMatchButtons.push(inspectBtn);
  
  // Select button
  const selectBtn = new UIButton(centerX + buttonGap / 2, buttonY, buttonW, buttonH, () => {
    selectCharacter(currentViewedCharacter);
  });
  selectBtn.draw('SELECT', {
    stroke: [100, 200, 100],
    fill: [50, 100, 50],
    text: 255
  });
  preMatchButtons.push(selectBtn);
  
  // Back button (top-left)
  const backBtn = new UIButton(20, 20, 100, 35, () => {
    preMatchState = PRE_MATCH_STATES.LOBBY;
    currentViewedCharacter = localSelectedCharacter;
  });
  backBtn.draw('BACK', {
    stroke: [120, 120, 120],
    fill: [40, 40, 40],
    text: 255,
    textSize: 12
  });
  preMatchButtons.push(backBtn);
  
  // Character name display (top-center)
  const charData = window.CHARACTERS && window.CHARACTERS[currentViewedCharacter];
  const charName = charData ? charData.name : currentViewedCharacter;
  
  push();
  textAlign(CENTER, TOP);
  textSize(32);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text(charName, centerX, 30);
  pop();
}

/**
 * CHARACTER INSPECT STATE
 * Shows kit/passive information with page switching
 */
function drawPreMatchCharacterInspect() {
  preMatchButtons = [];
  
  // Draw vignette overlay
  drawInspectVignette();
  
  // Draw kit/passive information
  drawInspectInfo();
  
  const buttonW = 120;
  const buttonH = 45;
  const buttonY = height - 100;
  const centerX = width / 2;
  const buttonGap = 15;
  
  // Active Page button
  const activeBtn = new UIButton(centerX - buttonW - buttonGap / 2, buttonY, buttonW, buttonH, () => {
    inspectPage = 'active';
  });
  activeBtn.draw('ACTIVE PAGE', {
    stroke: inspectPage === 'active' ? [100, 200, 100] : [120, 120, 150],
    fill: inspectPage === 'active' ? [50, 100, 50] : [40, 40, 60],
    text: 255
  });
  preMatchButtons.push(activeBtn);
  
  // Passive Page button
  const passiveBtn = new UIButton(centerX + buttonGap / 2, buttonY, buttonW, buttonH, () => {
    inspectPage = 'passive';
  });
  passiveBtn.draw('PASSIVE PAGE', {
    stroke: inspectPage === 'passive' ? [100, 200, 100] : [120, 120, 150],
    fill: inspectPage === 'passive' ? [50, 100, 50] : [40, 40, 60],
    text: 255
  });
  preMatchButtons.push(passiveBtn);
  
  // Select button (bottom-center, above page buttons)
  const selectBtn = new UIButton(centerX - 80, buttonY - 60, 160, 45, () => {
    selectCharacter(currentViewedCharacter);
  });
  selectBtn.draw('SELECT', {
    stroke: [100, 200, 100],
    fill: [50, 100, 50],
    text: 255
  });
  preMatchButtons.push(selectBtn);
  
  // Back button (top-left)
  const backBtn = new UIButton(20, 20, 100, 35, () => {
    preMatchState = PRE_MATCH_STATES.CHARACTER_SELECT;
    // Preserve current viewed character
  });
  backBtn.draw('BACK', {
    stroke: [120, 120, 120],
    fill: [40, 40, 40],
    text: 255,
    textSize: 12
  });
  preMatchButtons.push(backBtn);
  
  // Character name display (top-center)
  const charData = window.CHARACTERS && window.CHARACTERS[currentViewedCharacter];
  const charName = charData ? charData.name : currentViewedCharacter;
  
  push();
  textAlign(CENTER, TOP);
  textSize(32);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text(charName, centerX, 30);
  pop();
}

/**
 * Draw the vignette overlay for inspect mode
 */
function drawInspectVignette() {
  if (window.kitVignette && window.kitVignette.width > 0) {
    push();
    imageMode(CENTER);
    image(window.kitVignette, width / 2, height / 2, width, height);
    pop();
  } else {
    // Fallback: draw a simple vignette
    push();
    noStroke();
    // Create a radial gradient effect
    for (let r = 0; r < 500; r += 20) {
      const alpha = map(r, 0, 500, 0, 200);
      fill(0, alpha);
      ellipse(width / 2, height / 2, width - r * 2, height - r * 2);
    }
    pop();
  }
}

/**
 * Draw the kit/passive information image
 */
function drawInspectInfo() {
  const infoX = width / 2;
  const infoY = height / 2;
  const infoW = 1400;
  const infoH = 700;
  
  let infoImage = null;
  
  if (inspectPage === 'active') {
    const kitAsset = CHARACTER_KIT_ASSETS[currentViewedCharacter];
    infoImage = window.characterKits && window.characterKits[kitAsset];
  } else {
    const passiveAsset = CHARACTER_PASSIVE_ASSETS[currentViewedCharacter];
    infoImage = window.characterPassives && window.characterPassives[passiveAsset];
  }
  
  if (infoImage && infoImage.width > 0) {
    push();
    imageMode(CENTER);
    // Scale image to fit while maintaining aspect ratio
    const scale = Math.min(infoW / infoImage.width, infoH / infoImage.height);
    const drawW = infoImage.width * scale;
    const drawH = infoImage.height * scale;
    image(infoImage, infoX, infoY, drawW, drawH);
    pop();
  } else {
    // Fallback: draw placeholder
    push();
    fill(40, 40, 50, 200);
    stroke(100, 100, 120);
    strokeWeight(2);
    rect(infoX - infoW / 2, infoY - infoH / 2, infoW, infoH, 10);
    
    textAlign(CENTER, CENTER);
    textSize(18);
    fill(180);
    noStroke();
    text(inspectPage === 'active' ? 'Kit Information' : 'Passive Information', infoX, infoY);
    pop();
  }
}

/**
 * Select a character and update room state
 */
function selectCharacter(characterKey) {
  localSelectedCharacter = characterKey;
  
  // Update room state if in multiplayer mode
  if (gameMode === 'multiplayer' && typeof Network !== 'undefined' && Network.changeCharacter) {
    Network.changeCharacter(characterKey);
  }
  
  // Return to lobby
  preMatchState = PRE_MATCH_STATES.LOBBY;
  currentViewedCharacter = localSelectedCharacter;
}

/**
 * Handle mouse clicks for the unified pre-match system
 */
function handleUnifiedPreMatchClick(mx, my) {
  for (const btn of preMatchButtons) {
    if (btn.click(mx, my)) {
      console.log('[handleUnifiedPreMatchClick] Button clicked:', btn.label);
      return true;
    }
  }
  return false;
}

// (old fullscreen character select removed)

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}

