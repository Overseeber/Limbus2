let cameraZoom = 1;
let cameraX = 0;
let cameraY = 0;

// Screen shake variables
let screenShakeX = 0;
let screenShakeY = 0;
let screenShakeIntensity = 0;
let isUltimateShake = false; // Track if current shake is from ultimate

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
    // Bias camera upward to reduce floor visibility from 50% to 25%
    const centerY = (top + bottom) / 2 - 60;
    const zoomSpeed = desiredZoom < cameraZoom ? 0.28 : 0.08;
    cameraZoom = lerp(cameraZoom, desiredZoom, zoomSpeed);
    cameraX = lerp(cameraX, centerX, 0.12);
    cameraY = lerp(cameraY, centerY, 0.12);
  }
}

// Screen shake functions
function updateScreenShake() {
  if (screenShakeIntensity > 0) {
    let decayRate;
    
    if (isUltimateShake) {
      // Ultimate attacks: slower decay rate (longer duration)
      decayRate = screenShakeIntensity > 10 ? 0.06 : 0.032;
    } else {
      // Regular attacks: 1.5x longer duration (slower decay rate)
      decayRate = screenShakeIntensity > 10 ? 0.08 : 0.043;
    }
    
    screenShakeIntensity -= decayRate;
    
    if (screenShakeIntensity <= 0) {
      screenShakeIntensity = 0;
      screenShakeX = 0;
      screenShakeY = 0;
      isUltimateShake = false;
    } else {
      // Generate random shake offset based on intensity
      const maxShake = min(screenShakeIntensity, 15); // Cap at 15 pixels for clarity
      screenShakeX = random(-maxShake, maxShake);
      screenShakeY = random(-maxShake, maxShake);
    }
  }
}

function addScreenShake(damage, isUltimate = false) {
  let shakeAmount;
  
  if (isUltimate) {
    // Ultimate attacks: capped at 30 damage
    // 5 damage = 0.5 shake, 30 damage = 6 shake (max)
    const cappedDamage = min(damage, 30);
    shakeAmount = map(cappedDamage, 5, 30, 0.5, 6, true);
    isUltimateShake = true;
  } else {
    // Regular attacks: capped at 30 damage
    // 5 damage = 0.2 shake, 30 damage = 2.4 shake (max)
    const cappedDamage = min(damage, 30);
    shakeAmount = map(cappedDamage, 5, 30, 0.2, 2.4, true);
    isUltimateShake = false;
  }
  
  // Replace current shake if new shake is stronger, otherwise keep current
  if (shakeAmount > screenShakeIntensity) {
    screenShakeIntensity = min(shakeAmount, 20); // Cap at 20 for clarity
    // Update shake type if this is a stronger shake
    if (isUltimate) {
      isUltimateShake = true;
    }
  }
  // If new shake is weaker, don't change current intensity
}