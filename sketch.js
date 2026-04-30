//nest promt issue where it seems like i cant attack when the enemy is, we should be able to attack at the same time. when that occurs within a window (have it be equal to the attack interval (also attacks should only land when attack interval is over)) [left click within parry window in range of enemy strike (parry window of the last attacker used, otherwise cancel attack and parry)]In parry window parry, cancel and knock back both attackers also there should be collision between players, show hit boxes of attack and for players as well, when right up against one another, attacks should still land address all of these issues
//make padges for better nav

let player;
let enemy;
let battleState = 'ready';
let winner = null;
let summaryText = '';
let lastMouseDown = null;
let battleTimer = 0;

function setup() {//test
  createCanvas(ARENA_WIDTH, ARENA_HEIGHT);
  document.oncontextmenu = () => false;
  initBattle();
}

function initBattle() {
  player = new Fighter('Player', 140, FLOOR_Y, false, {
    color: '#4dc9ff',
    controls: {
      left: 'a',
      right: 'd',
      up: 'w',
      down: 's',
      evade: 'e',
    },
  });

  enemy = new Fighter('Adversary', ARENA_WIDTH - 140, FLOOR_Y, true, {
    color: '#ff6e6e',
    controls: null,
  });

  battleState = 'ready';
  winner = null;
  summaryText = '';
  battleTimer = 0;
  player.reset();
  enemy.reset();
}

function draw() {
  background(28);

  if (battleState === 'ready') {
    drawReadyScreen();
  } else if (battleState === 'battle') {
    updateBattle();
    beginCamera();
    drawArena();
    player.draw();
    enemy.draw();
    drawDamageNumbers();
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
  player.handleInput();
  enemy.updateAI(player);

  player.update(dt, enemy);
  enemy.update(dt, player);

  // Collision between players
  const minDist = 50;
  const dist = abs(player.pos.x - enemy.pos.x);
  if (dist < minDist) {
    const push = (minDist - dist) / 2;
    const dir = player.pos.x > enemy.pos.x ? 1 : -1;
    player.pos.x += dir * push;
    enemy.pos.x -= dir * push;
  }

  updateDamageNumbers(dt);

  if (player.isDead() || enemy.isDead()) {
    battleState = 'summary';
    winner = player.isDead() ? enemy : player;
    summaryText = `${winner.name} wins!`;
  }
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
    player.processKeyPressed(key);
    if (key === ' ' || keyCode === 32) {
      player.startDash();
    }
  }
}

function keyReleased() {
  if (battleState === 'battle') {
    player.processKeyReleased(key);
  }
}

function mousePressed() {
  if (battleState !== 'battle') {
    return;
  }

  if (mouseButton === LEFT) {
    player.requestAttack();
    lastMouseDown = millis();
  } else if (mouseButton === RIGHT) {
    player.requestGuard();
  }
}

function mouseReleased() {
  if (battleState !== 'battle') {
    return;
  }

  if (mouseButton === LEFT) {
    const held = millis() - (lastMouseDown || 0);
    player.releaseAttack(held > 300);
    lastMouseDown = null;
  } else if (mouseButton === RIGHT) {
    player.releaseGuard();
  }
}

function windowResized() {
  resizeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
}
