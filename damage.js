let damageNumbers = [];

function updateDamageNumbers(dt) {
  damageNumbers = damageNumbers.filter((num) => {
    num.update(dt);
    return !num.finished;
  });
}
//test
function drawDamageNumbers() {
  damageNumbers.forEach((num) => num.draw());
}

function spawnDamageNumber(amount, position, facing, isBlocked = false) {
  damageNumbers.push(new DamageNumber(amount, position.x, position.y - 50, facing, isBlocked));
}

function spawnEvadeIndicator(position) {
  damageNumbers.push(new EvadeIndicator(position.x, position.y - 50));
}

class DamageNumber {
  constructor(value, x, y, facing, isBlocked = false) {
    this.value = value;
    this.pos = createVector(x, y);
    this.vel = createVector(facing * 1.5 + random(-0.5, 0.5), random(-2.4, -1.4));
    this.alpha = 255;
    this.life = 1.0;
    this.size = this.computeSize(value);
    this.isBlocked = isBlocked;
  }

  computeSize(value) {
    if (value <= 70) {
      return 16 + value * 0.35;
    }
    if (value <= 500) {
      return 16 + 70 * 0.35 + (value - 70) * 0.1;
    }
    return 16 + 70 * 0.35 + 430 * 0.1 + log(value - 499) * 4;
  }

  update(dt) {
    this.life -= dt;
    this.alpha = map(this.life, 1, 0, 255, 0);
    this.pos.add(this.vel);
    this.vel.y -= 0.06;
    this.vel.mult(0.98);
    this.finished = this.life <= 0;
  }

  draw() {
    push();
    textAlign(CENTER, TOP);
    textSize(this.size);
    
    if (this.isBlocked) {
      // Light blue for blocked damage
      fill(100, 200, 255, this.alpha);
      stroke(70, 150, 220, this.alpha);
    } else {
      // Yellow for normal damage
      fill(255, 220, 40, this.alpha);
      stroke(0, this.alpha);
    }
    
    strokeWeight(2);
    text(`${floor(this.value)}`, this.pos.x, this.pos.y);
    
    // Draw "depowered" text below if blocked
    if (this.isBlocked) {
      fill(100, 200, 255, this.alpha);
      textSize(10);
      text('depowered', this.pos.x, this.pos.y + this.size * 0.8);
    }
    
    pop();
  }
}

class EvadeIndicator {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.5, 0.5), -2.8);
    this.alpha = 255;
    this.life = 1.0;
    this.size = 20;
  }

  update(dt) {
    this.life -= dt;
    this.alpha = map(this.life, 1, 0, 255, 0);
    this.pos.add(this.vel);
    this.vel.y -= 0.08;
    this.vel.mult(0.98);
    this.finished = this.life <= 0;
  }

  draw() {
    push();
    textAlign(CENTER, CENTER);
    textSize(this.size);
    fill(150, 255, 150, this.alpha);
    stroke(100, 200, 100, this.alpha);
    strokeWeight(2);
    text('evade', this.pos.x, this.pos.y);
    pop();
  }
}