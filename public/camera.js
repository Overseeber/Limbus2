let cameraZoom = 1;
let cameraX = 0;
let cameraY = 0;
let cameraTargetZoom = 1;
let cameraTargetX = 0;
let cameraTargetY = 0;
let cameraVX = 0;
let cameraVY = 0;

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

function updateCamera(dt) {
  const snapDt = typeof dt === 'number' && dt > 0 ? dt : 1.0 / 60.0;

  // Get all fighters from the battle system
  const fighters = window.allFighters || [];
  if (fighters.length === 0) return;

  // Determine the next camera targets from battle state
  const ultimateFighter = fighters.find(f => f.ultimateActive);
  if (ultimateFighter) {
    cameraTargetZoom = ultimateFighter.ultimateCameraZoom || 2.5;
    cameraTargetX = ultimateFighter.pos.x;
    cameraTargetY = ultimateFighter.pos.y;
  } else {
    const positions = fighters.map(f => f.pos).filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
    if (positions.length === 0) return;

    const left = Math.min(...positions.map(p => p.x));
    const right = Math.max(...positions.map(p => p.x));
    const top = Math.min(...positions.map(p => p.y - 80));
    const bottom = Math.max(...positions.map(p => p.y + 80));

    const marginX = width * CAMERA_MARGIN;
    const marginY = height * CAMERA_MARGIN;
    const targetWidth = Math.max(200, right - left + marginX * 2);
    const targetHeight = Math.max(160, bottom - top + marginY * 2);
    cameraTargetZoom = Math.min(3.2, width / targetWidth, height / targetHeight);
    cameraTargetX = (left + right) / 2;
    cameraTargetY = (top + bottom) / 2 - 60;
  }

  // Scale XY motion intensity based on how far the camera is from the target.
  const deltaX = cameraTargetX - cameraX;
  const deltaY = cameraTargetY - cameraY;
  const deltaDist = Math.hypot(deltaX, deltaY);
  const positionStrength = constrain(deltaDist / 350, 0, 1);

  const positionStiffness = lerp(22, 58, positionStrength);
  const positionDamping = lerp(1.4, 0.65, positionStrength);

  const accelX = deltaX * positionStiffness - cameraVX * positionDamping;
  const accelY = deltaY * positionStiffness - cameraVY * positionDamping;

  cameraVX += accelX * snapDt * 1.05;
  cameraVY += accelY * snapDt * 1.05;

  cameraX += cameraVX * snapDt;
  cameraY += cameraVY * snapDt;

  if (Math.abs(deltaX) < 2 && Math.abs(cameraVX) < 10) cameraVX = 0;
  if (Math.abs(deltaY) < 2 && Math.abs(cameraVY) < 10) cameraVY = 0;

  // Zoom remains smooth without spring inertia.
  const zoomSpeed = 0.14;
  cameraZoom = lerp(cameraZoom, cameraTargetZoom, zoomSpeed);

  cameraZoom = clampCameraZoomToVisibility(cameraZoom);
}

function getCameraVisibilityBounds(displayZoom) {
  if (typeof displayZoom !== 'number' || displayZoom <= 0) return null;

  const fighters = window.allFighters || [];
  if (fighters.length === 0) return null;

  const HITBOX_W = 50;
  const HITBOX_H = 72;
  const SCREEN_MARGIN = 50;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  fighters.forEach(f => {
    if (!f.pos) return;
    minX = Math.min(minX, f.pos.x - HITBOX_W / 2);
    maxX = Math.max(maxX, f.pos.x + HITBOX_W / 2);
    minY = Math.min(minY, f.pos.y - HITBOX_H / 2);
    maxY = Math.max(maxY, f.pos.y + HITBOX_H / 2);
  });

  if (minX === Infinity) return null;

  minX -= SCREEN_MARGIN;
  maxX += SCREEN_MARGIN;
  minY -= SCREEN_MARGIN;
  maxY += SCREEN_MARGIN;

  const halfWidth = width / (2 * displayZoom);
  const halfHeight = height / (2 * displayZoom);

  return {
    minX: minX + halfWidth,
    maxX: maxX - halfWidth,
    minY: minY + halfHeight,
    maxY: maxY - halfHeight
  };
}

function clampCameraToVisibility(displayZoom) {
  const bounds = getCameraVisibilityBounds(displayZoom);
  if (!bounds) return;

  if (bounds.minX <= bounds.maxX) {
    cameraX = Math.max(bounds.minX, Math.min(bounds.maxX, cameraX));
  } else {
    cameraX = (bounds.minX + bounds.maxX) * 0.5;
  }

  if (bounds.minY <= bounds.maxY) {
    cameraY = Math.max(bounds.minY, Math.min(bounds.maxY, cameraY));
  } else {
    cameraY = (bounds.minY + bounds.maxY) * 0.5;
  }
}

function clampCameraZoomToVisibility(candidateZoom) {
  const fighters = window.allFighters || [];
  if (fighters.length === 0) return candidateZoom;

  const HITBOX_W = 50;
  const HITBOX_H = 72;
  const SCREEN_MARGIN = 50;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  fighters.forEach(f => {
    if (!f.pos) return;
    minX = Math.min(minX, f.pos.x - HITBOX_W / 2);
    maxX = Math.max(maxX, f.pos.x + HITBOX_W / 2);
    minY = Math.min(minY, f.pos.y - HITBOX_H / 2);
    maxY = Math.max(maxY, f.pos.y + HITBOX_H / 2);
  });

  if (minX === Infinity) return candidateZoom;

  minX -= SCREEN_MARGIN;
  maxX += SCREEN_MARGIN;
  minY -= SCREEN_MARGIN;
  maxY += SCREEN_MARGIN;

  const requiredWidth = maxX - minX;
  const requiredHeight = maxY - minY;
  const maxSafeZoomX = width / requiredWidth;
  const maxSafeZoomY = height / requiredHeight;
  const maxSafeZoom = Math.min(maxSafeZoomX, maxSafeZoomY);

  return Math.min(candidateZoom, maxSafeZoom);
}

// Screen shake functions are now in effectRenderer.js
// updateScreenShake() and addScreenShake() are provided by effectRenderer
