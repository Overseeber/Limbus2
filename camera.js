let cameraZoom = 1;
let cameraX = 0;
let cameraY = 0;

function beginCamera() {
  updateCamera();
  push();
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(-cameraX, -cameraY);
}

function endCamera() {
  pop();
}

function updateCamera() {
  const left = min(player.pos.x, enemy.pos.x);
  const right = max(player.pos.x, enemy.pos.x);
  const top = min(player.pos.y - 80, enemy.pos.y - 80);
  const bottom = max(player.pos.y + 80, enemy.pos.y + 80);
  const marginX = width * CAMERA_MARGIN;
  const marginY = height * CAMERA_MARGIN;
  const targetWidth = max(200, right - left + marginX * 2);
  const targetHeight = max(160, bottom - top + marginY * 2);
  const desiredZoom = min(1.6, width / targetWidth, height / targetHeight);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const zoomSpeed = desiredZoom < cameraZoom ? 0.28 : 0.08;
  cameraZoom = lerp(cameraZoom, desiredZoom, zoomSpeed);
  cameraX = lerp(cameraX, centerX, 0.12);
  cameraY = lerp(cameraY, centerY, 0.12);
}