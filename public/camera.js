let cameraZoom = 1;
let cameraX = 0;
let cameraY = 0;

function beginCamera(overrideZoom, skipCameraUpdate = false) {
  if (!skipCameraUpdate) {
    updateCamera();
  }
  const shake = typeof getScreenShakeOffset === 'function' ? getScreenShakeOffset() : { x: 0, y: 0 };
  const zoomToApply = typeof overrideZoom === 'number' ? overrideZoom : cameraZoom;
  push();
  translate(width / 2, height / 2);
  scale(zoomToApply);
  translate(-cameraX + shake.x, -cameraY + shake.y);
}

function endCamera() {
  pop();
}

// Screen shake is managed by effectRenderer.js - use getScreenShakeOffset() in beginCamera()

function updateCamera() {
  // Get all fighters from the battle system
  const fighters = window.allFighters || [];
  
  if (fighters.length === 0) return;
  
  // Check if any fighter is in ultimate
  const ultimateFighter = fighters.find(f => f.ultimateActive);
  
  if (ultimateFighter) {
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
    // Normal camera mode - calculate bounds from all fighters
    const positions = fighters.map(f => f.pos);
    const left = Math.min(...positions.map(p => p.x));
    const right = Math.max(...positions.map(p => p.x));
    const top = Math.min(...positions.map(p => p.y - 80));
    const bottom = Math.max(...positions.map(p => p.y + 80));
    
    const marginX = width * CAMERA_MARGIN;
    const marginY = height * CAMERA_MARGIN;
    const targetWidth = Math.max(200, right - left + marginX * 2);
    const targetHeight = Math.max(160, bottom - top + marginY * 2);
    const desiredZoom = Math.min(3.2, width / targetWidth, height / targetHeight);
    const centerX = (left + right) / 2;
    // Bias camera upward to reduce floor visibility from 50% to 25%
    const centerY = (top + bottom) / 2 - 60;
    const zoomSpeed = desiredZoom < cameraZoom ? 0.28 : 0.08;
    cameraZoom = lerp(cameraZoom, desiredZoom, zoomSpeed);
    cameraX = lerp(cameraX, centerX, 0.12);
    cameraY = lerp(cameraY, centerY, 0.12);
  }
}

// Screen shake functions are now in effectRenderer.js
// updateScreenShake() and addScreenShake() are provided by effectRenderer
