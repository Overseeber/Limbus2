// ====== CONFIG ======
let atlas;

const ATLAS_FRAMES = {
  idle:   { x: 1380, y: 180,  w: 240, h: 320 },
  atk1:   { x: 1080, y: 1150, w: 300, h: 300 },
  atk2:   { x: 880,  y: 780,  w: 360, h: 300 },
  atk3:   { x: 260,  y: 680,  w: 420, h: 350 }
};

// ====== GLOBALS ======
let fighter;

// ====== PRELOAD ======
function preload() {
  atlas = loadImage("/data/sactx-2-2048x2048-DXT5_BC3-1307_Thumb_Father_SDAtlas-3bd6df8f.png");
}

// ====== SETUP ======
function setup() {
  createCanvas(900, 600);
  fighter = new Fighter(width / 2, height - 80);
}

// ====== DRAW ======
function draw() {
  background(20);

  let dt = deltaTime / 1000;

  fighter.update(dt);
  fighter.draw();

  drawInstructions();
  drawAtlasDebug(); // comment this out if annoying
}

// ====== INPUT ======
function mousePressed() {
  fighter.attack();
}

// ====== FIGHTER CLASS ======
class Fighter {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.facing = 1;

    this.state = "idle";

    this.attackInterval = 0.5;
    this.attackTimer = 0;
  }

  attack() {
    if (this.attackTimer <= 0) {
      this.state = "attack";
      this.attackTimer = this.attackInterval;
    }
  }

  update(dt) {
    this.attackTimer = max(0, this.attackTimer - dt);

    if (this.state === "attack" && this.attackTimer <= 0) {
      this.state = "idle";
    }

    // flip with mouse
    this.facing = mouseX > this.pos.x ? 1 : -1;
  }

  getCurrentFrame() {
    if (this.state === "attack") {
      // 🔥 synced animation timing
      let t = 1 - (this.attackTimer / this.attackInterval);

      let frames = [
        ATLAS_FRAMES.atk1,
        ATLAS_FRAMES.atk2,
        ATLAS_FRAMES.atk3
      ];

      let index = floor(t * frames.length);
      index = constrain(index, 0, frames.length - 1);

      return frames[index];
    }

    return ATLAS_FRAMES.idle;
  }

  draw() {
    let f = this.getCurrentFrame();

    push();
    translate(this.pos.x, this.pos.y);
    scale(this.facing, 1);

    imageMode(CORNER);

    // anchor to feet (IMPORTANT)
    image(
      atlas,
      -f.w / 2,
      -f.h,
      f.w,
      f.h,
      f.x,
      f.y,
      f.w,
      f.h
    );

    pop();
  }
}

// ====== DEBUG ATLAS ======
function drawAtlasDebug() {
  push();
  scale(0.2);
  imageMode(CORNER);
  image(atlas, 0, 0);

  noFill();
  stroke(255, 0, 0);
  strokeWeight(4);

  for (let key in ATLAS_FRAMES) {
    let f = ATLAS_FRAMES[key];
    rect(f.x, f.y, f.w, f.h);
  }

  pop();
}

// ====== UI ======
function drawInstructions() {
  fill(255);
  textSize(16);
  textAlign(LEFT);
  text("Click to attack\nMove mouse to flip direction", 20, 30);
}