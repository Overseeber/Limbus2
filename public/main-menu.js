// ==========================
// 🏠 MAIN MENU SCREEN
// ==========================
// The first screen players see when the application opens.
//
// Features:
// - Displays title screen with background from data/main
// - "Click to Continue" prompt that fades in/out
// - If not connected to server: shows "connecting..."
// - If gameplay assets not loaded: shows "loading..."
// - Click transitions to Mode Select (BATTLE_STATES.MODE_SELECT)
// ==========================

// Main menu state
let mainMenuActive = true;
let mainMenuImages = {};
let mainMenuClickPromptAlpha = 0;
let mainMenuClickPromptFadeDir = 1;
let mainMenuPromptText = 'Click to Continue';
let mainMenuReadyForTransition = false;
let mainMenuFont = null;
let mainMenuLogoScale = 1.0;
let mainMenuClickRegistered = false;

/**
 * Initialize the main menu
 * Loads only boot-stage assets (data/main and data/fonts)
 */
function initMainMenu() {
  mainMenuActive = true;
  mainMenuClickPromptAlpha = 0;
  mainMenuClickPromptFadeDir = 1;
  mainMenuPromptText = 'Click to Continue';
  mainMenuReadyForTransition = false;
  mainMenuLogoScale = 1.0;
  mainMenuClickRegistered = false;
  
  console.log('[MainMenu] Initialized');
}

/**
 * Draw the main menu screen
 * Called from draw() when mainMenuActive is true
 * 
 * Layer order: mainbkg -> mainlight -> maintitle
 * All images are centered, scaled to fill screen width while maintaining aspect ratio.
 */
function drawMainMenu() {
  // Draw background
  background(0);
  
  // === Helper: draw an image centered, scaled to fill screen width ===
  function drawFullWidthImage(img) {
    if (!img) return;
    const scale = width / img.width;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    image(img, drawX, drawY, drawW, drawH);
  }
  //global lighting opacity, randomly fluctuate to give a "breathing" effect, use noise
   const pulseAlpha = 150 + 50 * Math.sin(frameCount * 0.02);
   
  // Layer 1: Background image (full-screen, fills width)
  if (mainMenuImages.mainbkg) {
    drawFullWidthImage(mainMenuImages.opnbkg);
  }
  //layeer 2: back stilotes// have these sway back and forth slowly
    if (mainMenuImages.opnlstil) {
      const swayOffset = Math.sin(frameCount * 0.01) * 10;
      const scale = width / mainMenuImages.opnlstil.width;
      const drawW = mainMenuImages.opnlstil.width * scale;
      const drawH = mainMenuImages.opnlstil.height * scale;
      const drawX = (width - drawW) / 2 + swayOffset;
      const drawY = (height - drawH) / 2;
      image(mainMenuImages.opnlstil, drawX, drawY, drawW, drawH);
       // Layer 2: Light overlay for bkg stiloetes (same xy location)
      if (mainMenuImages.opnblight) {
        push();
        tint(255, 255, 255, pulseAlpha);
        image(mainMenuImages.opnblight, drawX, drawY, drawW, drawH);
        pop();
      }
    }
 //layer 3: foreground stillotes (stay still)
    if (mainMenuImages.opnstl) {
      const scale = width / mainMenuImages.opnstl.width;
      const drawW = mainMenuImages.opnstl.width * scale;
      const drawH = mainMenuImages.opnstl.height * scale;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;
      image(mainMenuImages.opnstl, drawX, drawY, drawW, drawH);
       // Layer 2: Light overlay for foreground stiloetes (same xy location)
      if (mainMenuImages.opnlight) {
        push();
        tint(255, 255, 255, pulseAlpha);
        image(mainMenuImages.opnlight, drawX, drawY, drawW, drawH);
        pop();
      } 
    }
    //layer 4: crack overlay, sudble random shifting both x and y to give a "shaking" effect, slight flickering
    if (mainMenuImages.opncrk) {
      const shakeOffsetX = Math.sin(frameCount * 0.02) * 5;
      const shakeOffsetY = Math.cos(frameCount * 0.02) * 5;
      const scale = width / mainMenuImages.opncrk.width;
      const drawW = mainMenuImages.opncrk.width * scale;
      const drawH = mainMenuImages.opncrk.height * scale;
      const drawX = (width - drawW) / 2 + shakeOffsetX;
      const drawY = (height - drawH) / 2 + shakeOffsetY;
      push();
      tint(255, 255, 255, pulseAlpha * 0.8);
      image(mainMenuImages.opncrk, drawX, drawY, drawW, drawH);
      pop();
    }
  
  
  // Layer 5: Title image (scaled to fill screen width, maintaining aspect ratio)
  if (mainMenuImages.opnlogo) {
    const scale = width / mainMenuImages.opnlogo.width;
    const drawW = mainMenuImages.opnlogo.width * scale;
    const drawH = mainMenuImages.opnlogo.height * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    image(mainMenuImages.opnlogo, drawX, drawY, drawW, drawH);
  }
  
  // Determine which prompt text to show
  updateMainMenuPromptText();
  
  // Draw the click prompt (fading in/out)
  drawMainMenuClickPrompt();
}

/**
 * Update the prompt text based on connection and loading state
 */
function updateMainMenuPromptText() {
  const networkReady = typeof Network !== 'undefined' && Network.isConnected;
  const assetsReady = ASSET_LOADER && ASSET_LOADER.areGameplayAssetsReady();
  
  if (mainMenuReadyForTransition) {
    mainMenuPromptText = 'Click to Continue';
    return;
  }
  
  if (!networkReady) {
    mainMenuPromptText = 'connecting...';
    mainMenuReadyForTransition = false;
  } else if (!assetsReady) {
    mainMenuPromptText = 'loading...';
    mainMenuReadyForTransition = false;
  } else {
    mainMenuPromptText = 'Click to Continue';
    mainMenuReadyForTransition = true;
  }
}

/**
 * Draw the fading click prompt at the bottom of the screen
 */
function drawMainMenuClickPrompt() {
  // Animate alpha fade
  mainMenuClickPromptAlpha += 0.02 * mainMenuClickPromptFadeDir;
  if (mainMenuClickPromptAlpha >= 1.0) {
    mainMenuClickPromptAlpha = 1.0;
    mainMenuClickPromptFadeDir = -1;
  } else if (mainMenuClickPromptAlpha <= 0.1) {
    mainMenuClickPromptAlpha = 0.1;
    mainMenuClickPromptFadeDir = 1;
  }
  
  push();
  textAlign(CENTER, CENTER);
    //textFont(BebasKai);<load font bebas kai from data/fonts and use it here for the main menu prompt>
    
  // Shadow
  fill(0, 0, 0, 150 * mainMenuClickPromptAlpha);
  textSize(18);
  text(mainMenuPromptText, width / 2 + 2, 100);
  
  // Main text
  if (mainMenuReadyForTransition) {
    // Ready for transition - bright white
    fill(255, 255, 255, 255 * mainMenuClickPromptAlpha);
  } else {
    // Loading/connecting - softer color
    if (mainMenuPromptText === 'connecting...') {
      fill(255, 220, 100, 255 * mainMenuClickPromptAlpha);
    } else {
      fill(180, 180, 255, 255 * mainMenuClickPromptAlpha);
    }
  }
  
  textSize(28);
  text(mainMenuPromptText, width / 2, height - 80);
  
  // Version number or subtle decoration
  fill(100, 100, 120, 100 * mainMenuClickPromptAlpha);
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  text('v0.1.0', width - 20, height - 20);
  
  pop();
}

/**
 * Handle mouse click on the main menu
 * Returns true if the click was consumed
 */
function handleMainMenuClick() {
  if (!mainMenuActive) return false;
  
  // Check if we're ready for transition
  if (mainMenuReadyForTransition) {
    console.log('[MainMenu] Click detected - transitioning to mode select');
    mainMenuActive = false;
    mainMenuClickRegistered = true;
    
    // Start loading Stage 2 assets now that we're leaving the menu
    if (ASSET_LOADER && !ASSET_LOADER.menuLoadingStarted) {
      ASSET_LOADER.startMenuAssetLoading();
    }
    
    // Transition to mode select
    setBattleState(BATTLE_STATES.MODE_SELECT);
    return true;
  }
  
  // If not ready, just consume the click (don't transition)
  return true;
}

/**
 * Handle key press on main menu
 * Returns true if the key was consumed
 */
function handleMainMenuKeyPress() {
  if (!mainMenuActive) return false;
  
  // ENTER or SPACE to advance
  if (keyCode === ENTER || keyCode === 32) {
    return handleMainMenuClick();
  }
  
  return false;
}