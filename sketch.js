// Character roster system is globally available



let player;
let enemy;
let battleState = 'characterSelect';
let winner = null;
let summaryText = '';
let lastMouseDown = null;
let battleTimer = 0;

// Character selection variables - Super Smash Bros style
let players = [
  { active: true, character: 'VALENCINA', ai: false, controlled: true, ready: false },
  { active: true, character: 'CALLISTO', ai: true, controlled: false, ready: true },
  { active: false, character: 'JOHN', ai: true, controlled: false, ready: true },
  { active: false, character: 'VALENCINA', ai: true, controlled: false, ready: true },
  { active: false, character: 'VALENCINA', ai: true, controlled: false, ready: true }
];
const MAX_PLAYERS = 4;
let selectedPlayerSlot = 0; // Which player slot is currently selected
let characterSelectOption = 0; // 0: character, 1: AI, 2: ready, 3: remove player

function preload() {
  // Load sprite atlases for character sprites
  if (typeof loadSpriteAtlases === 'function') {
    loadSpriteAtlases();
  } else {
    console.warn('loadSpriteAtlases not yet loaded');
  }
}

function setup() {//test
  createCanvas(ARENA_WIDTH, ARENA_HEIGHT);
  document.oncontextmenu = () => false;
  // Don't initialize fighters here - let character select handle it
}

function initBattle() {
  // Initialize active fighters from Super Smash Bros style player system
  const activePlayers = players.filter(p => p.active);
  
  if (activePlayers.length === 0) {
    console.log('No active players!');
    return;
  }
  
  // Find the player-controlled fighter
  let playerControlledFighter = activePlayers.find(p => p.controlled);
  if (!playerControlledFighter) {
    // If no player is controlled, make the first active player controlled
    activePlayers[0].controlled = true;
    playerControlledFighter = activePlayers[0];
  }
  
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
    
    // Ensure AI settings are properly applied
    fighter.isAI = isAI;
    fighter.isPlayerControlled = isPlayerControlled;
    
    // Set proper positioning for multi-player battles
    const spacing = 300; // Horizontal spacing between players
    const centerX = width / 2;
    const totalWidth = (activePlayers.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;
    
    fighter.pos.x = startX + (i * spacing);
    fighter.pos.y = height - 100;
    fighter.facing = isPlayerControlled ? 1 : -1; // Player-controlled face right, AI face left
    
    fighters.push(fighter);
  }
  
  // Store all fighters for multi-player battles
  window.allFighters = fighters;
  
  // Assign player and enemy for backward compatibility with combat system
  player = fighters.find(f => f.isPlayerControlled);
  enemy = fighters.find(f => !f.isPlayerControlled) || fighters.find(f => f !== player);

  battleState = 'ready';
  winner = null;
  summaryText = '';
  battleTimer = 0;
  
  // Reset all fighters
  fighters.forEach(f => f.reset());
  damageNumbers = [];
}

function draw() {
  if (battleState === 'characterSelect') {
    drawCharacterSelect();
  } else if (battleState === 'ready') {
    drawReadyScreen();
  } else if (battleState === 'battle') {
    // Check for ultimate background dimming across all fighters
    const ultimateFighters = window.allFighters ? window.allFighters.filter(f => f.ultimateActive) : [];
    const ultimateActive = ultimateFighters.length > 0;
    
    background(28);
    
    updateBattle();
    beginCamera();
    drawArena();
    
    // Draw ultimate name behind characters
    if (ultimateActive && ultimateFighters[0] && ultimateFighters[0].ultimateName) {
      drawUltimateName(ultimateFighters[0]);
    }
    
    // Draw all fighters
    if (window.allFighters) {
      window.allFighters.forEach(fighter => fighter.draw());
    }
    
    drawDamageNumbers();
    drawParticles();
    
    // Draw overhead healthbars for non-player fighters
    drawOverheadHealthbars();
    
    // Draw ultimate damage counter
    if (ultimateActive && ultimateFighters[0]) {
      drawUltimateDamageCounter(ultimateFighters[0]);
    }
    
    endCamera();
  } else if (battleState === 'summary') {
    beginCamera();
    drawArena();
    
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
  
  // Update all fighters
  if (window.allFighters) {
    for (let i = 0; i < window.allFighters.length; i++) {
      const fighter = window.allFighters[i];
      
      // Disable player movement during ultimate for player-controlled fighters
      if (!fighter.ultimateActive && fighter.isPlayerControlled) {
        fighter.handleInput();
      }
      
      // Update AI for non-player-controlled fighters with AI enabled
      if (!fighter.isPlayerControlled && fighter.isAI && window.allFighters.length > 1) {
        // Find targets (other fighters)
        const targets = window.allFighters.filter(f => f !== fighter);
        if (targets.length > 0) {
          fighter.updateAI(targets[0]); // Simple AI - target first available
        }
      }
      
      // Update fighter physics and state
      const targets = window.allFighters.filter(f => f !== fighter);
      fighter.update(dt, targets); // Pass all available targets for multi-player combat
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
    if (activeFighters.length <= 1) {
      battleState = 'summary';
      winner = activeFighters[0] || null;
      summaryText = winner ? `${winner.name} wins!` : 'Draw!';
    }
  }

  updateDamageNumbers(dt);
  updateParticles(dt);
}

function getPlayerControlledFighter() {
  if (player && player.isPlayerControlled) {
    return player;
  }
  return null; // No player-controlled fighter found
}

function keyPressed() {
  if (battleState === 'characterSelect') {
    // Remove keyboard controls - everything is mouse-controlled now
    
    if (keyCode === ENTER) {
      // Check if all active players are ready
      const activePlayers = players.filter(p => p.active);
      const allReady = activePlayers.every(p => p.ready);
      
      if (!allReady) {
        console.log('Not all players are ready!');
        return;
      }
      
      // Start battle with ready players
      initBattle();
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
      // Send input intent to server/local simulator
      if (typeof Network !== 'undefined' && Network.sendInput) {
        Network.sendInput({ type: 'keyPressed', key, playerId: controlledFighter.playerId });
      }
      // Local fallback for single-player responsiveness
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
      if (typeof Network !== 'undefined' && Network.sendInput) {
        Network.sendInput({ type: 'keyReleased', key, playerId: controlledFighter.playerId });
      }
      controlledFighter.processKeyReleased(key);
    }
  }
}

function mousePressed() {
  if (battleState === 'characterSelect') {
    const mx = mouseX;
    const my = mouseY;
    
    // Calculate column layout
    const columnWidth = 200;
    const startX = (width - (players.length * columnWidth)) / 2;
    
    // Check clicks on player columns
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const x = startX + i * columnWidth;
      
      // Check if click is within this player's column
      if (mx > x && mx < x + columnWidth) {
        // Join game (for inactive players)
        if (!player.active && my > 120 && my < 140) {
          player.active = true;
          player.character = getAvailableFighters()[0];
          player.ready = player.ai; // AI players are auto-ready
          console.log(`Player ${i + 1} joined the game`);
          return;
        }
        
        // Add new player option (only show if below max and all slots are active)
        if (players.filter(p => p.active).length >= 3 && 
            players.filter(p => p.active).length < MAX_PLAYERS && 
            i === players.filter(p => p.active).length && 
            my > 120 && my < 140) {
          // Find first inactive slot
          for (let j = 0; j < players.length; j++) {
            if (!players[j].active) {
              players[j].active = true;
              players[j].character = getAvailableFighters()[0];
              players[j].ready = players[j].ai;
              console.log(`Added player ${j + 1}`);
              break;
            }
          }
          return;
        }
        
        // Only process clicks for active players
        if (!player.active) continue;
        
        // Character selection
        if (my > 170 && my < 190) {
          const availableFighters = getAvailableFighters();
          const currentIndex = availableFighters.indexOf(player.character);
          const nextIndex = currentIndex < availableFighters.length - 1 ? currentIndex + 1 : 0;
          player.character = availableFighters[nextIndex];
          selectedPlayerSlot = i;
          characterSelectOption = 0;
          return;
        }
        
        // AI toggle
        if (my > 230 && my < 250) {
          player.ai = !player.ai;
          // Auto-ready AI players
          if (player.ai) {
            player.ready = true;
          }
          selectedPlayerSlot = i;
          characterSelectOption = 1;
          return;
        }
        
        // Ready toggle (for non-AI players)
        if (!player.ai && my > 290 && my < 310) {
          player.ready = !player.ready;
          selectedPlayerSlot = i;
          characterSelectOption = 2;
          return;
        }
        
        // Remove player
        if (my > 330 && my < 350 && players.filter(p => p.active).length > 1) {
          player.active = false;
          player.ready = false;
          player.controlled = false;
          console.log(`Removed player ${i + 1}`);
          return;
        }
      }
    }
    
    return;
  }
  
  if (battleState !== 'battle') {
    return;
  }

  const controlledFighter = getPlayerControlledFighter();
  if (mouseButton === LEFT) {
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'attackPress', playerId: controlledFighter.playerId });
    }
    controlledFighter.requestAttack();
    lastMouseDown = millis();
  } else if (mouseButton === RIGHT) {
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'guardPress', playerId: controlledFighter.playerId });
    }
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
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'attackRelease', held, playerId: controlledFighter.playerId });
    }
    controlledFighter.releaseAttack(held > 300);
    lastMouseDown = null;
  } else if (mouseButton === RIGHT) {
    if (typeof Network !== 'undefined' && Network.sendInput) {
      Network.sendInput({ type: 'mouse', action: 'guardRelease', playerId: controlledFighter.playerId });
    }
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
  text('CHARACTER SELECT', width / 2, 50);
  pop();
  
  // Draw player columns - Super Smash Bros style
  const columnWidth = 200;
  const startX = (width - (players.length * columnWidth)) / 2;
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const x = startX + i * columnWidth;
    
    // Highlight selected player slot
    if (i === selectedPlayerSlot) {
      push();
      fill(100, 150, 255, 30);
      rect(x - 10, 80, columnWidth - 20, 400);
      pop();
    }
    
    // Player header
    push();
    textAlign(CENTER, CENTER);
    textSize(20);
    
    if (!player.active) {
      fill(100);
    } else if (i === selectedPlayerSlot && characterSelectOption === 0) {
      fill(100, 150, 255);
    } else {
      fill(255);
    }
    
    text(`P${i + 1}`, x + columnWidth/2, 100);
    
    if (!player.active) {
      const activeCount = players.filter(p => p.active).length;
      
      if (activeCount >= 3 && activeCount < MAX_PLAYERS && i === activeCount) {
        // Show "Add Player" option for the next available slot
        textSize(14);
        fill(100, 255, 100);
        text('Click to add', x + columnWidth/2, 125);
        textSize(12);
        fill(150);
        text('new player', x + columnWidth/2, 145);
      } else {
        // Show normal join option
        textSize(14);
        fill(150);
        text('Press A to join', x + columnWidth/2, 125);
      }
      pop();
      continue;
    }
    
    // Character selection
    textSize(16);
    fill(200);
    text('Character:', x + columnWidth/2, 160);
    
    if (i === selectedPlayerSlot && characterSelectOption === 0) {
      fill(100, 150, 255);
    } else {
      fill(255);
    }
    
    const charData = CHARACTERS && CHARACTERS[player.character] ? CHARACTERS[player.character] : null;
    text(charData ? charData.name : player.character, x + columnWidth/2, 180);
    
    // AI toggle
    textSize(16);
    fill(200);
    text('AI:', x + columnWidth/2, 220);
    
    if (i === selectedPlayerSlot && characterSelectOption === 1) {
      fill(100, 150, 255);
    } else {
      fill(255);
    }
    
    text(player.ai ? 'ON' : 'OFF', x + columnWidth/2, 240);
    
    // Ready status (only for non-AI players)
    if (!player.ai) {
      textSize(16);
      fill(200);
      text('Ready:', x + columnWidth/2, 280);
      
      if (player.ready) {
        fill(100, 255, 100);
        text('✓ READY', x + columnWidth/2, 300);
      } else {
        fill(255, 255, 100);
        text('Click to ready', x + columnWidth/2, 300);
      }
    } else {
      // Show auto-ready status for AI players
      textSize(16);
      fill(100, 255, 100);
      text('✓ Auto-ready', x + columnWidth/2, 290);
    }
    
    // Remove player option
    textSize(14);
    fill(200);
    text('Remove:', x + columnWidth/2, 330);
    
    if (i === selectedPlayerSlot && characterSelectOption === 3) {
      fill(255, 100, 100);
    } else {
      fill(255);
    }
    
    text('Click here', x + columnWidth/2, 350);
    
    // Control indicator
    if (player.controlled) {
      textSize(16);
      fill(100, 255, 100);
      text('YOU CONTROL', x + columnWidth/2, 390);
    }
    
    pop();
  }
  
  // Instructions
  push();
  textAlign(CENTER, CENTER);
  textSize(16);
  fill(150);
  text('Click on options to change them | Click "Click to ready" when prepared', width / 2, 500);
  
  // Show ready status
  const activePlayers = players.filter(p => p.active);
  const allReady = activePlayers.every(p => p.ready);
  
  if (allReady && activePlayers.length > 0) {
    fill(100, 255, 100);
    text('All players ready! Press ENTER to start battle', width / 2, 520);
  } else {
    fill(255, 255, 100);
    const notReadyCount = activePlayers.filter(p => !p.ready).length;
    text(`Waiting for ${notReadyCount} player(s) to ready up...`, width / 2, 520);
  }
  pop();
}

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}
