// ==========================
// 📖 TUTORIAL SLIDESHOW
// ==========================
// Shows tutorial slides when the player first loads the game.
// Slides: tutmove -> tutattk -> tutdef -> tutchar
// Arrow buttons on left/right edges, skip button bottom center.
// ==========================

const TUTORIAL_ORDER = ['tutmov', 'tutattk', 'tutdef', 'tutchar'];
const TUTORIAL_FILES = {
  tutmov: 'data/main/tutmov.png',
  tutattk: 'data/main/tutattk.jpg',
  tutdef: 'data/main/tutdef.png',
  tutchar: 'data/main/tutchar.png'
};

let tutorialState = {
  active: false,
  currentSlide: 0,
  images: {},       // loaded p5.Image objects
  allLoaded: false,
  slideFadeAlpha: 0,
  slideFadeDir: 1,
  transitionTimer: 0,
  isTransitioning: false,
  transitionFromSlide: -1,
  transitionToSlide: -1,
  
  // Arrow hover states
  leftArrowHovered: false,
  rightArrowHovered: false,
  
  // Callback when tutorial is complete
  onComplete: null
};

/**
 * Preload all tutorial images
 * Called from preload() alongside other boot assets
 */
function preloadTutorialImages() {
  console.log('[Tutorial] Preloading tutorial images');
  
  for (const key of TUTORIAL_ORDER) {
    const file = TUTORIAL_FILES[key];
    tutorialState.images[key] = loadImage(file, () => {
      console.log(`[Tutorial] Loaded: ${key}`);
      checkAllTutorialImagesLoaded();
    }, (err) => {
      console.error(`[Tutorial] Failed to load: ${key}`, err);
      // Still mark as "loaded" (errored) so we don't hang
      checkAllTutorialImagesLoaded();
    });
  }
}

let _tutorialImageCheckCount = 0;

function checkAllTutorialImagesLoaded() {
  _tutorialImageCheckCount++;
  if (_tutorialImageCheckCount >= TUTORIAL_ORDER.length) {
    tutorialState.allLoaded = true;
    console.log('[Tutorial] All tutorial images loaded');
  }
}

/**
 * Start the tutorial slideshow
 * @param {Function} onComplete - Called when tutorial is finished/skipped
 */
function startTutorial(onComplete) {
  console.log('[Tutorial] Starting tutorial slideshow');
  tutorialState.active = true;
  tutorialState.currentSlide = 0;
  tutorialState.slideFadeAlpha = 0;
  tutorialState.slideFadeDir = 1;
  tutorialState.transitionTimer = 0;
  tutorialState.isTransitioning = false;
  tutorialState.onComplete = onComplete || null;
}

/**
 * End the tutorial and call the completion callback
 */
function completeTutorial() {
  if (!tutorialState.active) return;
  console.log('[Tutorial] Tutorial completed');
  tutorialState.active = false;
  tutorialState.currentSlide = 0;
  if (tutorialState.onComplete) {
    const cb = tutorialState.onComplete;
    tutorialState.onComplete = null;
    cb();
  }
}

/**
 * Go to the next slide
 */
function tutorialNextSlide() {
  if (tutorialState.isTransitioning) return;
  if (tutorialState.currentSlide < TUTORIAL_ORDER.length - 1) {
    tutorialState.currentSlide++;
    tutorialState.slideFadeAlpha = 0;
  } else {
    // Already on last slide - complete
    completeTutorial();
  }
}

/**
 * Go to the previous slide
 */
function tutorialPrevSlide() {
  if (tutorialState.isTransitioning) return;
  if (tutorialState.currentSlide > 0) {
    tutorialState.currentSlide--;
    tutorialState.slideFadeAlpha = 0;
  }
}

/**
 * Check if the mouse is over the left or right arrow area
 * Returns: 'left', 'right', or null
 */
function getTutorialArrowHover() {
  const arrowWidth = 80;
  const arrowHeight = 120;
  const centerY = height / 2;
  
  // Left arrow
  if (mouseX >= 0 && mouseX <= arrowWidth && 
      mouseY >= centerY - arrowHeight / 2 && mouseY <= centerY + arrowHeight / 2) {
    return 'left';
  }
  
  // Right arrow
  if (mouseX >= width - arrowWidth && mouseX <= width && 
      mouseY >= centerY - arrowHeight / 2 && mouseY <= centerY + arrowHeight / 2) {
    return 'right';
  }
  
  return null;
}

/**
 * Check if mouse is over the skip button
 */
function isOverTutorialSkipButton() {
  const btnW = 180;
  const btnH = 44;
  const btnX = (width - btnW) / 2;
  const btnY = height - 70;
  
  return mouseX >= btnX && mouseX <= btnX + btnW && 
         mouseY >= btnY && mouseY <= btnY + btnH;
}

/**
 * Draw the tutorial slideshow overlay
 * Should be called from draw() when tutorialState.active is true
 */
function drawTutorial() {
  if (!tutorialState.active) return;
  if (!tutorialState.allLoaded) {
    // Draw a loading message while tutorial images are loading
    drawTutorialLoading();
    return;
  }
  
  const currentKey = TUTORIAL_ORDER[tutorialState.currentSlide];
  const img = tutorialState.images[currentKey];
  
  // Dark overlay behind slide
  push();
  noStroke();
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  pop();
  
  if (img) {
    // Draw the tutorial image centered, fitting the screen with padding
    const padX = 100; // horizontal padding (room for arrows)
    const padY = 80;  // vertical padding (room for skip button and top)
    const maxW = width - padX * 2;
    const maxH = height - padY * 2;
    
    // Calculate scale to fit within padded area while maintaining aspect ratio
    const scaleX = maxW / img.width;
    const scaleY = maxH / img.height;
    const scale = Math.min(scaleX, scaleY, 1.0); // Don't upscale beyond 1x
    
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    
    // Subtle fade-in for slide transitions
    const alpha = tutorialState.slideFadeAlpha;
    tint(255, 255 * alpha);
    image(img, drawX, drawY, drawW, drawH);
    noTint();
    
    // Fade in over ~0.3s
    if (tutorialState.slideFadeAlpha < 1) {
      tutorialState.slideFadeAlpha += 0.05;
      if (tutorialState.slideFadeAlpha > 1) tutorialState.slideFadeAlpha = 1;
    }
  } else {
    // Image not available - show slide number placeholder
    push();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(36);
    text(`Slide ${tutorialState.currentSlide + 1}: ${currentKey}`, width / 2, height / 2);
    pop();
  }
  
  // Slide indicator dots (bottom)
  drawTutorialDots();
  
  // Left arrow button
  drawTutorialArrow('left');
  
  // Right arrow button
  drawTutorialArrow('right');
  
  // Skip button
  drawTutorialSkipButton();
}

/**
 * Draw a loading state while tutorial images haven't loaded yet
 */
function drawTutorialLoading() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text('Loading tutorial...', width / 2, height / 2);
  pop();
}

/**
 * Draw an arrow button on the left or right edge
 */
function drawTutorialArrow(side) {
  const isLeft = side === 'left';
  const arrowWidth = 70;
  const arrowHeight = 110;
  const centerY = height / 2;
  
  const x = isLeft ? 0 : width - arrowWidth;
  const y = centerY - arrowHeight / 2;
  
  // Check if arrow should be hidden (left on first slide, right on last)
  const isDisabled = isLeft ? 
    (tutorialState.currentSlide === 0) : 
    (tutorialState.currentSlide === TUTORIAL_ORDER.length - 1);
  
  // Hover detection
  const hovered = !isDisabled && mouseX >= x && mouseX <= x + arrowWidth && 
                  mouseY >= y && mouseY <= y + arrowHeight;
  
  // Arrow background
  const isTransitioning = tutorialState.isTransitioning;
  const alpha = isDisabled ? 60 : (hovered ? 200 : 130);
  
  push();
  noStroke();
  
  // Draw arrow background (rounded rect on the edge)
  const bgColor = isDisabled ? color(40, 40, 40, alpha) : 
                  (hovered ? color(60, 80, 120, alpha) : color(30, 30, 40, alpha));
  fill(bgColor);
  
  // Draw a pill shape that extends from the edge
  const radius = 16;
  const drawX = isLeft ? x : x + 10;
  const drawW = arrowWidth - (isDisabled ? 10 : 0);
  
  if (isLeft) {
    rect(x, y, arrowWidth, arrowHeight, 0, radius, radius, 0);
  } else {
    rect(x, y, arrowWidth, arrowHeight, radius, 0, 0, radius);
  }
  
  // Draw arrow symbol
  if (!isDisabled) {
    fill(255, hovered ? 255 : 180);
    stroke(255, hovered ? 255 : 180);
    strokeWeight(4);
    noFill();
    
    const arrowCenterX = isLeft ? x + arrowWidth * 0.4 : x + arrowWidth * 0.6;
    
    if (isLeft) {
      // Left pointing triangle
      fill(255, hovered ? 255 : 180);
      noStroke();
      const tipX = x + 20;
      const midY = centerY;
      triangle(tipX, midY, tipX + 25, midY - 25, tipX + 25, midY + 25);
    } else {
      // Right pointing triangle
      fill(255, hovered ? 255 : 180);
      noStroke();
      const tipX = x + arrowWidth - 20;
      const midY = centerY;
      triangle(tipX, midY, tipX - 25, midY - 25, tipX - 25, midY + 25);
    }
  }
  
  pop();
}

/**
 * Draw the slide indicator dots at the bottom
 */
function drawTutorialDots() {
  const dotCount = TUTORIAL_ORDER.length;
  const dotSize = 10;
  const dotGap = 18;
  const totalWidth = dotCount * dotGap;
  const startX = (width - totalWidth) / 2 + dotSize / 2;
  const y = height - 110;
  
  push();
  noStroke();
  
  for (let i = 0; i < dotCount; i++) {
    const x = startX + i * dotGap;
    const isActive = i === tutorialState.currentSlide;
    const dotAlpha = isActive ? 255 : 120;
    
    if (isActive) {
      fill(200, 220, 255, dotAlpha);
      ellipse(x, y, dotSize + 4, dotSize + 4);
    } else {
      fill(150, 150, 170, dotAlpha);
      ellipse(x, y, dotSize, dotSize);
    }
  }
  
  pop();
}

/**
 * Draw the skip button at the bottom center
 */
function drawTutorialSkipButton() {
  const btnW = 180;
  const btnH = 44;
  const btnX = (width - btnW) / 2;
  const btnY = height - 70;
  const hovered = isOverTutorialSkipButton();
  
  push();
  noStroke();
  
  // Button background
  if (hovered) {
    fill(180, 60, 60, 220);
  } else {
    fill(120, 40, 40, 180);
  }
  rect(btnX, btnY, btnW, btnH, 10);
  
  // Button text
  fill(255, hovered ? 255 : 200);
  textAlign(CENTER, CENTER);
  textSize(18);
  const label = tutorialState.currentSlide === TUTORIAL_ORDER.length - 1 ? 'Finish' : 'Skip Tutorial';
  text(label, btnX + btnW / 2, btnY + btnH / 2);
  
  pop();
}

/**
 * Handle click on the tutorial overlay
 * Returns true if the click was consumed
 */
function handleTutorialClick() {
  if (!tutorialState.active) return false;
  
  // Check if click is on a navigation arrow
  const arrowHover = getTutorialArrowHover();
  
  if (arrowHover === 'left') {
    if (tutorialState.currentSlide > 0) {
      tutorialPrevSlide();
    }
    return true;
  }
  
  if (arrowHover === 'right') {
    tutorialNextSlide();
    return true;
  }
  
  // Check skip button
  if (isOverTutorialSkipButton()) {
    completeTutorial();
    return true;
  }
  
  // Click anywhere else on last slide also advances
  if (tutorialState.currentSlide === TUTORIAL_ORDER.length - 1) {
    completeTutorial();
    return true;
  }
  
  return false;
}

/**
 * Handle key press on tutorial
 * Returns true if the key was consumed
 */
function handleTutorialKeyPress() {
  if (!tutorialState.active) return false;
  
  if (keyCode === LEFT_ARROW) {
    if (tutorialState.currentSlide > 0) {
      tutorialPrevSlide();
    }
    return true;
  }
  
  if (keyCode === RIGHT_ARROW || keyCode === ENTER || keyCode === 32) {
    tutorialNextSlide();
    return true;
  }
  
  if (keyCode === ESCAPE) {
    completeTutorial();
    return true;
  }
  
  return false;
}

/**
 * Reset tutorial state (for when assets need to be reloaded)
 */
function resetTutorial() {
  tutorialState.active = false;
  tutorialState.currentSlide = 0;
  tutorialState.slideFadeAlpha = 0;
  tutorialState.allLoaded = false;
  _tutorialImageCheckCount = 0;
  tutorialState.images = {};
  tutorialState.onComplete = null;
}