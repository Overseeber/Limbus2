// Character roster system is globally available



let player;
let enemy;
let battleState = 'ready';
let winner = null;
let summaryText = '';
let lastMouseDown = null;
let battleTimer = 0;

function preload() {
  // Load sprite atlases for character sprites
  loadSpriteAtlases();
}

function setup() {//test
  createCanvas(ARENA_WIDTH, ARENA_HEIGHT);
  document.oncontextmenu = () => false;
  // Initialize fighters
  player = new Fighter(true, 'Player', 'VALENCINA', false);
  enemy = new Fighter(true, 'Enemy', 'VALENCINA', false);
  initBattle();
}

function initBattle() {
  player = new Fighter(true, 'Player', 'VALENCINA', false);
  enemy = new Fighter(true, 'Enemy', 'VALENCINA', false);

  battleState = 'ready';
  winner = null;
  summaryText = '';
  battleTimer = 0;
  player.reset();
  enemy.reset();
  damageNumbers = [];
}

function draw() {
  // Check for ultimate background dimming
  const ultimateActive = (player && player.ultimateActive) || (enemy && enemy.ultimateActive);
  const ultimateFighter = (player && player.ultimateActive) ? player : (enemy && enemy.ultimateActive) ? enemy : null;
  
  if (ultimateActive && ultimateFighter) {
    // Apply background dimming during ultimate
    const dimAmount = ultimateFighter.ultimateBackgroundDim || 0.7;
    background(28 * (1 - dimAmount));
  } else {
    background(28);
  }

  if (battleState === 'ready') {
    drawReadyScreen();
  } else if (battleState === 'battle') {
    updateBattle();
    beginCamera();
    drawArena();
    
    // Draw ultimate name behind characters
    if (ultimateActive && ultimateFighter && ultimateFighter.ultimateName) {
      drawUltimateName(ultimateFighter);
    }
    
    player.draw();
    enemy.draw();
    drawDamageNumbers();
    drawParticles();
    
    // Draw overhead healthbar for non-player fighter
    drawOverheadHealthbar();
    
    // Draw ultimate damage counter
    if (ultimateActive && ultimateFighter) {
      drawUltimateDamageCounter(ultimateFighter);
    }
    
    endCamera();
  } else if (battleState === 'summary') {
    beginCamera();
    drawArena();
    player.draw();
    enemy.draw();
    drawDamageNumbers();
    endCamera();
    drawSummary();
  }

  drawHud();
}

function drawArena() {
  noStroke();
  fill('#1f1f1f');
  rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  fill('#333');
  rect(0, FLOOR_Y + 50, ARENA_WIDTH, ARENA_HEIGHT - FLOOR_Y - 50);
  fill('#555');
  rect(0, FLOOR_Y + 50, ARENA_WIDTH, 6);
  if (DEBUG) {
    fill(255);
    textSize(12);
    text(`FPS: ${nf(frameRate(), 2, 1)}`, 12, 18);
  }
}

function updateBattle() {
  const dt = deltaTime / 1000;
  battleTimer += dt;
  
  // Disable player movement during ultimate
  if (!player.ultimateActive) {
    player.handleInput();
  }
//  enemy.updateAI(player);

  player.update(dt, enemy);
  enemy.update(dt, player);

  // Collision is handled in Fighter.cleanupPosition() method

  updateDamageNumbers(dt);
  updateParticles(dt);

  if (player.isDead() || enemy.isDead()) {
    battleState = 'summary';
    winner = player.isDead() ? enemy : player;
    summaryText = `${winner.name} wins!`;
  }
}

function getPlayerControlledFighter() {
  if (player && player.isPlayerControlled) {
    return player;
  }
  if (enemy && enemy.isPlayerControlled) {
    return enemy;
  }
  return null; // No player-controlled fighter found
}

function keyPressed() {
  if (battleState === 'ready' && keyCode === ENTER) {
    battleState = 'battle';
    return;
  }
  if (battleState === 'summary' && keyCode === ENTER) {
    initBattle();
    return;
  }
  if (battleState === 'battle') {
    const controlledFighter = getPlayerControlledFighter();
    if (controlledFighter) {
      controlledFighter.processKeyPressed(key);
      if (key === ' ' || keyCode === 32) {
        controlledFighter.startDash();
      }
    }
  }
}

function keyReleased() {
  if (battleState === 'battle') {
    const controlledFighter = getPlayerControlledFighter();
    if (controlledFighter) {
      controlledFighter.processKeyReleased(key);
    }
  }
}

function mousePressed() {
  if (battleState !== 'battle') {
    return;
  }

  const controlledFighter = getPlayerControlledFighter();
  if (mouseButton === LEFT) {
    controlledFighter.requestAttack();
    lastMouseDown = millis();
  } else if (mouseButton === RIGHT) {
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
    controlledFighter.releaseAttack(held > 300);
    lastMouseDown = null;
  } else if (mouseButton === RIGHT) {
    controlledFighter.releaseGuard();
  }
}

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}
