let atlas;

const CELL = 256;

const SPRITES = [
  { name: "idle",   x: 0, y: 0, w: 2, h: 2 },
  { name: "guard",  x: 2, y: 0, w: 2, h: 3 },
  { name: "hurt",   x: 4, y: 0, w: 2, h: 2 },
  { name: "evade",  x: 6, y: 0, w: 2, h: 2 },

  { name: "prepat", x: 0, y: 2, w: 2, h: 2 },
  { name: "halt1",  x: 2, y: 3, w: 3, h: 2 },
  { name: "moving", x: 5, y: 2, w: 3, h: 2 },

  { name: "s1f1",   x: 0, y: 5, w: 3, h: 3 },
  { name: "s1f2",   x: 4, y: 5, w: 4, h: 3 }
];

let current = 0;
let timer = 0;
let interval = 1.2;

function preload() {
  atlas = loadImage("/data/val1.png"); // ✅ updated
}

function setup() {
  createCanvas(900, 700);
  textFont('monospace');
}

function draw() {
  background(20);

  timer += deltaTime / 1000;
  if (timer > interval) {
    timer = 0;
    current = (current + 1) % SPRITES.length;
  }

  let s = SPRITES[current];

  // ground line
  stroke(80);
  line(0, height * 0.7, width, height * 0.7);

  drawSprite(s, width / 2, height * 0.7);

  // label
  noStroke();
  fill(255);
  textAlign(CENTER);
  textSize(20);
  text(s.name, width / 2, height * 0.7 + 40);
}

function drawSprite(s, x, y) {
  let sx = s.x * CELL;
  let sy = s.y * CELL;
  let sw = s.w * CELL;
  let sh = s.h * CELL;

  push();
  translate(x, y);

  // anchor marker
  stroke(0, 255, 0);
  strokeWeight(2);
  line(-12, 0, 12, 0);
  line(0, -12, 0, 12);

  // bounding box
  noFill();
  stroke(255, 50);
  rectMode(CENTER);
  rect(0, -sh / 2, sw, sh);

  image(
    atlas,
    -sw / 2,
    -sh,
    sw,
    sh,
    sx,
    sy,
    sw,
    sh
  );

  pop();
}