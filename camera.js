let cameraZoom = 1;
let cameraX = 0;
let cameraY = 0;

// Screen shake variables
let screenShakeX = 0;
let screenShakeY = 0;
let screenShakeIntensity = 0;

function beginCamera() {
  updateCamera();
  push();
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(-cameraX + screenShakeX, -cameraY + screenShakeY);
}
//test
function endCamera() {
  pop();
}

function updateCamera() {
  // Update screen shake
  updateScreenShake();
  
  // Check if any fighter is in ultimate
  const ultimateActive = (player && player.ultimateActive) || (enemy && enemy.ultimateActive);
  const ultimateFighter = (player && player.ultimateActive) ? player : (enemy && enemy.ultimateActive) ? enemy : null;
  
  if (ultimateActive && ultimateFighter) {
    // Ultimate camera mode - zoom in on ultimate user
    const targetZoom = ultimateFighter.ultimateCameraZoom || 2.5;
    const targetX = ultimateFighter.pos.x;
    const targetY = ultimateFighter.pos.y;
    
    // Smooth zoom to target
    const zoomSpeed = 0.1;
    cameraZoom = lerp(cameraZoom, targetZoom, zoomSpeed);
    cameraX = lerp(cameraX, targetX, 0.15);
    cameraY = lerp(cameraY, targetY, 0.15);
  } else {
    // Normal camera mode
    const left = min(player.pos.x, enemy.pos.x);
    const right = max(player.pos.x, enemy.pos.x);
    const top = min(player.pos.y - 80, enemy.pos.y - 80);
    const bottom = max(player.pos.y + 80, enemy.pos.y + 80);
    const marginX = width * CAMERA_MARGIN;
    const marginY = height * CAMERA_MARGIN;
    const targetWidth = max(200, right - left + marginX * 2);
    const targetHeight = max(160, bottom - top + marginY * 2);
    const desiredZoom = min(3.2, width / targetWidth, height / targetHeight);
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const zoomSpeed = desiredZoom < cameraZoom ? 0.28 : 0.08;
    cameraZoom = lerp(cameraZoom, desiredZoom, zoomSpeed);
    cameraX = lerp(cameraX, centerX, 0.12);
    cameraY = lerp(cameraY, centerY, 0.12);
  }
}

// Screen shake functions
function updateScreenShake() {
  if (screenShakeIntensity > 0) {
    // Higher intensity decreases faster
    const decayRate = screenShakeIntensity > 10 ? 0.15 : 0.08;
    screenShakeIntensity -= decayRate;
    
    if (screenShakeIntensity <= 0) {
      screenShakeIntensity = 0;
      screenShakeX = 0;
      screenShakeY = 0;
    } else {
      // Generate random shake offset based on intensity
      const maxShake = min(screenShakeIntensity, 15); // Cap at 15 pixels for clarity
      screenShakeX = random(-maxShake, maxShake);
      screenShakeY = random(-maxShake, maxShake);
    }
  }
}

function addScreenShake(damage) {
  // Scale shake with damage magnitude
  // 5 damage = very little shake, 100 damage = good amount of shake
  const shakeAmount = map(damage, 5, 100, 0.5, 12, true);
  screenShakeIntensity = min(screenShakeIntensity + shakeAmount, 20); // Cap at 20 for clarity
}