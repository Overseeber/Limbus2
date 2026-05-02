let atlases = {};
const CELL = 256;

// ==========================
// 🔥 SPRITE DATABASE
// ==========================
const SPRITES = {
  // ===== val1 =====
  idle:   { atlas: "val1", x:0,y:0,w:2,h:2 },
  guard:  { atlas: "val1", x:2,y:0,w:2,h:3 },
  hurt:   { atlas: "val1", x:4,y:0,w:2,h:2 },
  evade:  { atlas: "val1", x:6,y:0,w:2,h:2 },
  prepat: { atlas: "val1", x:0,y:2,w:2,h:2 },
  halt1:  { atlas: "val1", x:2,y:3,w:3,h:2 },
  moving: { atlas: "val1", x:5,y:2,w:3,h:2 },
  s1f1:   { atlas: "val1", x:0,y:5,w:3,h:3 },
  s1f2:   { atlas: "val1", x:4,y:5,w:4,h:3 },

  // ===== val2 =====
  s1f3: { atlas:"val2", x:0,y:0,w:3,h:3 },
  halt2:{ atlas:"val2", x:0,y:3,w:3,h:2 },
  s2f1: { atlas:"val2", x:3,y:0,w:5,h:2 },
  joust:{ atlas:"val2", x:3,y:2,w:5,h:2 },
  s3f1: { atlas:"val2", x:0,y:5,w:3,h:2 },
  s3f2: { atlas:"val2", x:3,y:4,w:3,h:2 },
  s3f3: { atlas:"val2", x:3,y:6,w:3,h:2 },
  dist1:{ atlas:"val2", x:6,y:4,w:2,h:2 },

  // ===== val3 =====
  s2f1_v3:{ atlas:"val3", x:0,y:0,w:4,h:2 },
  s2f2:   { atlas:"val3", x:0,y:2,w:3,h:3 },
  s2f3:   { atlas:"val3", x:0,y:5,w:3,h:2 },
  s2f4:   { atlas:"val3", x:4,y:0,w:4,h:3, offsetY:+256 }, // custom anchor
  d1:     { atlas:"val3", x:3,y:3,w:3,h:2 },
  d2:     { atlas:"val3", x:3,y:5,w:3,h:2 },

  // ===== valdisposal =====
  de1:{ atlas:"valdisposal", x:2,y:0,w:4,h:2 },
  de2:{ atlas:"valdisposal", x:1,y:2,w:5,h:2 },
  de3:{ atlas:"valdisposal", x:4,y:0,w:8,h:2 },

  // ===== slash1 =====
  s1s1:{ atlas:"slash1", x:0,y:0,w:4,h:3 },
  s1s2:{ atlas:"slash1", x:4,y:0,w:4,h:3 },
  s1s3:{ atlas:"slash1", x:3,y:3,w:5,h:2 },
  js1: { atlas:"slash1", x:3,y:5,w:5,h:2 },

  // ===== slash2 =====
  s1s4:{ atlas:"slash2", x:0,y:2,w:4,h:3, offsetY:+256 },
  s2s1:{ atlas:"slash2", x:0,y:0,w:4,h:2 },
  s2s2:{ atlas:"slash2", x:4,y:0,w:4,h:3, offsetY:+256 },
  diss1:{atlas:"slash2", x:4,y:3,w:4,h:2 }
};


// ==========================
// 🔥 LOAD IMAGES
// ==========================
function preload() {
  atlases.val1 = loadImage("/data/val1.png");
  atlases.val2 = loadImage("/data/val2.png");
  atlases.val3 = loadImage("/data/val3.png");
  atlases.valdisposal = loadImage("/data/valdisposal.png");
  atlases.vslash1 = loadImage("/data/vslash1.png");
  atlases.vslash2 = loadImage("/data/vslash2.png");
}

// ==========================
// 🎮 DEMO SETUP
// ==========================
let keys;
let current = 0;
let timer = 0;

function setup() {
  createCanvas(1000, 800);
  keys = Object.keys(SPRITES);
  textFont('monospace');
}

// ==========================
// 🔁 DEMO LOOP
// ==========================
function draw() {
  background(20);

  // cycle
  timer += deltaTime / 1000;
  if (timer > 1.0) {
    timer = 0;
    current = (current + 1) % keys.length;
  }

  let name = keys[current];

  // ground
  stroke(80);
  line(0, height*0.7, width, height*0.7);

  drawSprite(name, width/2, height*0.7);

  // label
  noStroke();
  fill(255);
  textAlign(CENTER);
  textSize(20);
  text(name, width/2, height*0.7 + 40);
}

// ==========================
// 🧩 DRAW FUNCTION
// ==========================
function drawSprite(name, x, y) {
  let s = SPRITES[name];
  let img = atlases[s.atlas];

  let sx = s.x * CELL;
  let sy = s.y * CELL;
  let sw = s.w * CELL;
  let sh = s.h * CELL;

  let offsetX = s.offsetX || 0;
  let offsetY = s.offsetY || 0;

  push();
  translate(x, y);

  // anchor marker
  stroke(0,255,0);
  line(-10,0,10,0);
  line(0,-10,0,10);

  // bounding box
  noFill();
  stroke(255,50);
  rectMode(CENTER);
  rect(0, -sh/2, sw, sh);

  image(
    img,
    -sw/2 + offsetX,
    -sh + offsetY,
    sw, sh,
    sx, sy,
    sw, sh
  );

  pop();
}