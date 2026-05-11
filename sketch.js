// Character roster system is globally available



let player;
let enemy;
let battleState = 'characterSelect';
let winner = null;
let summaryText = '';
let lastMouseDown = null;
let battleTimer = 0;

// Character selection variables
let selectedPlayerCharacter = 'VALENCINA';
let selectedEnemyCharacter = 'VALENCINA';
let playerControlled = 'player';
let playerAI = false;
let enemyAI = true;
let characterSelectOption = 0; // 0: player character, 1: enemy character, 2: player control, 3: player AI, 4: enemy AI

function preload() {
  // Load sprite atlases for character sprites
  loadSpriteAtlases();
}

function setup() {//test
  createCanvas(ARENA_WIDTH, ARENA_HEIGHT);
  document.oncontextmenu = () => false;
  // Don't initialize fighters here - let character select handle it
}

function initBattle() {
  // Initialize fighters with selected settings
  // AI and player control are mutually exclusive for each fighter
  
  // Player fighter setup
  let playerIsAI = playerAI;
  let playerIsPlayerControlled = playerControlled === 'player';
  
  // Enemy fighter setup  
  let enemyIsAI = enemyAI;
  let enemyIsPlayerControlled = playerControlled === 'enemy';
  
  // Apply mutual exclusivity: if player controls a fighter, disable AI for that fighter
  if (playerIsPlayerControlled) {
    playerIsAI = false;
  }
  if (enemyIsPlayerControlled) {
    enemyIsAI = false;
  }
  
  player = new Fighter(playerIsAI, 'Player', selectedPlayerCharacter, playerIsPlayerControlled);
  enemy = new Fighter(enemyIsAI, 'Enemy', selectedEnemyCharacter, enemyIsPlayerControlled);

  battleState = 'ready';
  winner = null;
  summaryText = '';
  battleTimer = 0;
  player.reset();
  enemy.reset();
  damageNumbers = [];
}

function draw() {
  if (battleState === 'characterSelect') {
    drawCharacterSelect();
  } else if (battleState === 'ready') {
    drawReadyScreen();
  } else if (battleState === 'battle') {
    // Check for ultimate background dimming
    const ultimateActive = (player && player.ultimateActive) || (enemy && enemy.ultimateActive);
    const ultimateFighter = (player && player.ultimateActive) ? player : (enemy && enemy.ultimateActive) ? enemy : null;
    
    background(28);
    
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

  if (battleState !== 'characterSelect') {
    drawHud();
  }
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
  if (playerControlled === 'player' && player) {
    return player;
  }
  if (playerControlled === 'enemy' && enemy) {
    return enemy;
  }
  return null; // No player-controlled fighter found
}

function keyPressed() {
  if (battleState === 'characterSelect') {
    if (keyCode === TAB) {
      characterSelectOption = (characterSelectOption + 1) % 5;
      return;
    }
    
    if (keyCode === LEFT_ARROW) {
      switch (characterSelectOption) {
        case 0:
          selectedPlayerCharacter = selectedPlayerCharacter === 'JOHN' ? 'VALENCINA' : 'JOHN';
          break;
        case 1:
          selectedEnemyCharacter = selectedEnemyCharacter === 'JOHN' ? 'VALENCINA' : 'JOHN';
          break;
        case 2:
          playerControlled = playerControlled === 'player' ? 'enemy' : 'player';
          break;
        case 3:
          playerAI = !playerAI;
          break;
        case 4:
          enemyAI = !enemyAI;
          break;
      }
      return;
    }
    
    if (keyCode === RIGHT_ARROW) {
      switch (characterSelectOption) {
        case 0:
          selectedPlayerCharacter = selectedPlayerCharacter === 'JOHN' ? 'VALENCINA' : 'JOHN';
          break;
        case 1:
          selectedEnemyCharacter = selectedEnemyCharacter === 'JOHN' ? 'VALENCINA' : 'JOHN';
          break;
        case 2:
          playerControlled = playerControlled === 'player' ? 'enemy' : 'player';
          break;
        case 3:
          playerAI = !playerAI;
          break;
        case 4:
          enemyAI = !enemyAI;
          break;
      }
      return;
    }
    
    if (keyCode === ENTER) {
      // Initialize fighters with selected settings
      // AI and player control are mutually exclusive for each fighter
      
      // Player fighter setup
      let playerIsAI = playerAI;
      let playerIsPlayerControlled = playerControlled === 'player';
      
      // Enemy fighter setup  
      let enemyIsAI = enemyAI;
      let enemyIsPlayerControlled = playerControlled === 'enemy';
      
      // Apply mutual exclusivity: if player controls a fighter, disable AI for that fighter
      if (playerIsPlayerControlled) {
        playerIsAI = false;
      }
      if (enemyIsPlayerControlled) {
        enemyIsAI = false;
      }
      
      player = new Fighter(playerIsAI, 'Player', selectedPlayerCharacter, playerIsPlayerControlled);
      enemy = new Fighter(enemyIsAI, 'Enemy', selectedEnemyCharacter, enemyIsPlayerControlled);
      battleState = 'ready';
      return;
    }
  }
  
  if (battleState === 'ready' && keyCode === ENTER) {
    battleState = 'battle';
    return;
  }
  if (battleState === 'summary' && keyCode === ENTER) {
    battleState = 'characterSelect';
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
  if (battleState === 'characterSelect') {
    // Check clicks on character select options
    const mx = mouseX;
    const my = mouseY;
    
    // Player character selection area
    if (mx > width/2 - 200 && mx < width/2 + 50 && my > 140 && my < 200) {
      selectedPlayerCharacter = selectedPlayerCharacter === 'JOHN' ? 'VALENCINA' : 'JOHN';
      characterSelectOption = 0;
      return;
    }
    
    // Enemy character selection area  
    if (mx > width/2 + 50 && mx < width/2 + 300 && my > 140 && my < 200) {
      selectedEnemyCharacter = selectedEnemyCharacter === 'JOHN' ? 'VALENCINA' : 'JOHN';
      characterSelectOption = 1;
      return;
    }
    
    // Player control selection area
    if (mx > width/2 - 200 && mx < width/2 + 50 && my > 240 && my < 300) {
      playerControlled = playerControlled === 'player' ? 'enemy' : 'player';
      characterSelectOption = 2;
      return;
    }
    
    // Player AI selection area
    if (mx > width/2 - 200 && mx < width/2 + 50 && my > 340 && my < 400) {
      playerAI = !playerAI;
      characterSelectOption = 3;
      return;
    }
    
    // Enemy AI selection area
    if (mx > width/2 + 50 && mx < width/2 + 300 && my > 340 && my < 400) {
      enemyAI = !enemyAI;
      characterSelectOption = 4;
      return;
    }
    
    return;
  }
  
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

function drawCharacterSelect() {
  background(20);
  
  // Title
  push();
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text('CHARACTER SELECT', width / 2, 80);
  pop();
  
  // Player Character Selection
  push();
  textAlign(LEFT, CENTER);
  textSize(20);
  fill(255);
  text('Player Character:', width / 2 - 200, 150);
  
  // Highlight selected option
  if (characterSelectOption === 0) {
    fill(100, 150, 255);
  } else {
    fill(255);
  }
  text(`> ${selectedPlayerCharacter}`, width / 2 - 200, 180);
  
  // Available characters
  textSize(16);
  fill(200);
  text('Available: JOHN, VALENCINA', width / 2 - 200, 210);
  pop();
  
  // Enemy Character Selection
  push();
  textAlign(LEFT, CENTER);
  textSize(20);
  fill(255);
  text('Enemy Character:', width / 2 + 50, 150);
  
  if (characterSelectOption === 1) {
    fill(100, 150, 255);
  } else {
    fill(255);
  }
  text(`> ${selectedEnemyCharacter}`, width / 2 + 50, 180);
  
  textSize(16);
  fill(200);
  text('Available: JOHN, VALENCINA', width / 2 + 50, 210);
  pop();
  
  // Player Control Selection
  push();
  textAlign(LEFT, CENTER);
  textSize(20);
  fill(255);
  text('Player Controls:', width / 2 - 200, 250);
  
  if (characterSelectOption === 2) {
    fill(100, 150, 255);
  } else {
    fill(255);
  }
  text(`> ${playerControlled.toUpperCase()}`, width / 2 - 200, 280);
  
  textSize(16);
  fill(200);
  text('Options: player, enemy', width / 2 - 200, 310);
  pop();
  
  // Player AI Selection
  push();
  textAlign(LEFT, CENTER);
  textSize(20);
  fill(255);
  text('Player AI:', width / 2 - 200, 350);
  
  if (characterSelectOption === 3) {
    fill(100, 150, 255);
  } else {
    fill(255);
  }
  text(`> ${playerAI ? 'ON' : 'OFF'}`, width / 2 - 200, 380);
  
  textSize(16);
  fill(200);
  text('Options: ON, OFF', width / 2 - 200, 410);
  pop();
  
  // Enemy AI Selection
  push();
  textAlign(LEFT, CENTER);
  textSize(20);
  fill(255);
  text('Enemy AI:', width / 2 + 50, 350);
  
  if (characterSelectOption === 4) {
    fill(100, 150, 255);
  } else {
    fill(255);
  }
  text(`> ${enemyAI ? 'ON' : 'OFF'}`, width / 2 + 50, 380);
  
  textSize(16);
  fill(200);
  text('Options: ON, OFF', width / 2 + 50, 410);
  pop();
  
  // Instructions
  push();
  textAlign(CENTER, CENTER);
  textSize(16);
  fill(150);
  text('Use TAB to cycle options, ENTER to confirm', width / 2, 380);
  text('Arrow keys to change selections', width / 2, 400);
  pop();
}

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}
