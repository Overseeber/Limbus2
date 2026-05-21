/**
 * EFFECT RENDERER - Client-side visual effects
 * Handles particles, screen shake, damage numbers, and visual effects
 * Called by the game loop and ability results from server
 */

// Damage numbers array
let damageNumbers = [];
const MAX_DAMAGE_NUMBERS = 50;

/**
 * Spawn a damage number floating text
 */
function spawnDamageNumber(amount, position, facing = 1, isCharged = false, effectType = 'normal', isCounter = false, subType = 'normal', textOverride = null) {
  if (damageNumbers.length >= MAX_DAMAGE_NUMBERS) {
    damageNumbers.shift(); // Remove oldest
  }
  
  // Categorize damage types
  let category = 'normal';
  if (effectType === 'bleed' || effectType === 'burn' || effectType === 'rupture' || effectType === 'tremor') {
    category = 'status';
  }
  
  damageNumbers.push({
    amount: amount,
    x: position.x + random(-30, 30),
    y: position.y - 20 + random(-20, 0),
    vy: -3 - random(0, 2),
    vx: random(-20, 20),
    timer: 1.2,
    maxTimer: 1.2,
    effectType: effectType,
    category: category,
    isCharged: isCharged,
    isCounter: isCounter,
    subType: subType,
    textOverride: textOverride,
    facing: facing
  });
}

function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const dn = damageNumbers[i];
    dn.timer -= dt;
    if (dn.timer <= 0) {
      damageNumbers.splice(i, 1);
      continue;
    }
    dn.y += dn.vy;
    dn.vy *= 0.98;
    dn.x += dn.vx * dt;
    dn.vx *= 0.95;
  }
}

function drawDamageNumbers() {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const dn = damageNumbers[i];
    if (dn.timer <= 0) continue;
    
    push();
    const alpha = map(dn.timer, 0, dn.maxTimer, 0, 255);
    const yOffset = map(dn.timer, 0, dn.maxTimer, -30, 0);
    const scale = map(dn.timer, 0, dn.maxTimer, 0.5, 1);
    
    // Determine color based on effect type
    let textColor;
    if (dn.effectType === 'bleed') {
      textColor = color(200, 50, 50, alpha); // Red for bleed
    } else if (dn.effectType === 'burn') {
      textColor = color(255, 150, 50, alpha); // Orange for burn
    } else if (dn.effectType === 'rupture') {
      textColor = color(150, 50, 200, alpha); // Purple for rupture
    } else if (dn.effectType === 'tremor' || dn.subType === 'slam') {
      textColor = color(150, 100, 255, alpha); // Purple for tremor/slam
    } else if (dn.isCounter) {
      textColor = color(100, 200, 255, alpha); // Blue for counter
    } else if (dn.isCharged) {
      textColor = color(255, 220, 50, alpha); // Gold for charged
    } else {
      textColor = color(255, 255, 255, alpha); // White for normal
    }
    
    fill(textColor);
    stroke(0, 0, 0, alpha);
    strokeWeight(3);
    textAlign(CENTER, CENTER);
    
    // Size based on damage amount
    let textSize = 20;
    if (dn.amount >= 100) textSize = 32;
    else if (dn.amount >= 50) textSize = 26;
    else textSize = 20;
    
    textSize(textSize);
    
    const displayText = dn.textOverride || Math.round(dn.amount).toString();
    text(displayText, dn.x, dn.y + yOffset);
    
    // Draw element icon for status effects
    if (dn.category === 'status') {
      noStroke();
      fill(textColor);
      textSize(12);
      const iconText = dn.effectType === 'bleed' ? '💧' : 
                       dn.effectType === 'burn' ? '🔥' : 
                       dn.effectType === 'rupture' ? '💥' : '🌀';
      text(iconText, dn.x, dn.y + yOffset - 22);
    }
    
    pop();
  }
}

// ==========================
// SCREEN SHAKE SYSTEM
// ==========================
let screenShakeX = 0;
let screenShakeY = 0;
let screenShakeIntensity = 0;
let isUltimateShake = false;

function addScreenShake(intensity, isUltimate = false) {
  let shakeAmount;
  if (isUltimate) {
    const cappedDamage = Math.min(intensity, 60);
    shakeAmount = Math.min(cappedDamage * 0.5, 30);
    isUltimateShake = true;
  } else {
    const cappedDamage = Math.min(intensity, 40);
    shakeAmount = Math.min(cappedDamage * 0.3, 12);
    isUltimateShake = false;
  }
  
  if (shakeAmount > screenShakeIntensity) {
    screenShakeIntensity = shakeAmount;
    if (isUltimate) isUltimateShake = true;
  }
}

function updateScreenShake(dt) {
  if (screenShakeIntensity > 0) {
    const decayRate = isUltimateShake ? 0.04 : 0.06;
    screenShakeIntensity -= decayRate * dt * 60;
    
    if (screenShakeIntensity <= 0) {
      screenShakeIntensity = 0;
      screenShakeX = 0;
      screenShakeY = 0;
      isUltimateShake = false;
    } else {
      const maxShake = Math.min(screenShakeIntensity, 20);
      screenShakeX = (Math.random() * 2 - 1) * maxShake;
      screenShakeY = (Math.random() * 2 - 1) * maxShake;
    }
  }
}

function getScreenShakeOffset() {
  return { x: screenShakeX, y: screenShakeY };
}

// ==========================
// PARTICLE SYSTEM
// ==========================
let particles = [];
const MAX_PARTICLES = 200;

function spawnSlamDebris(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push({
      x: x + random(-20, 20),
      y: y,
      vx: random(-200, 200),
      vy: random(-300, -50),
      life: random(0.3, 0.8),
      maxLife: random(0.3, 0.8),
      size: random(3, 8),
      type: 'debris'
    });
  }
}

function spawnGuardSparks(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push({
      x: x,
      y: y,
      vx: random(-150, 150),
      vy: random(-150, 150),
      life: 0.3,
      maxLife: 0.3,
      size: random(2, 5),
      type: 'spark'
    });
  }
}

function spawnEvadeIndicator(position) {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift();
  }
  particles.push({
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    life: 0.3,
    maxLife: 0.3,
    size: 20,
    type: 'evade'
  });
}

function spawnTremorIndicator(position) {
  for (let i = 0; i < 5; i++) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push({
      x: position.x + random(-20, 20),
      y: position.y + random(-20, 20),
      vx: random(-50, 50),
      vy: random(-100, -50),
      life: 0.5,
      maxLife: 0.5,
      size: random(3, 6),
      type: 'tremor'
    });
  }
}

function spawnBurnParticle(x, y) {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift();
  }
  particles.push({
    x: x,
    y: y,
    vx: random(-30, 30),
    vy: random(-80, -40),
    life: random(0.5, 1.0),
    maxLife: random(0.5, 1.0),
    size: random(2, 5),
    type: 'burn'
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    if (p.type === 'debris') {
      p.vy += 500 * dt; // Gravity
    }
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const alpha = map(p.life, 0, p.maxLife, 0, 255);
    
    push();
    noStroke();
    
    switch (p.type) {
      case 'debris':
        fill(150, 100, 50, alpha);
        rect(p.x, p.y, p.size, p.size);
        break;
      case 'spark':
        fill(255, 255, 200, alpha);
        ellipse(p.x, p.y, p.size);
        break;
      case 'evade':
        fill(150, 150, 255, alpha * 0.3);
        ellipse(p.x, p.y, p.size);
        break;
      case 'tremor':
        fill(150, 100, 255, alpha);
        ellipse(p.x, p.y, p.size);
        break;
      case 'burn':
        fill(255, 150, 50, alpha);
        ellipse(p.x, p.y, p.size);
        break;
    }
    
    pop();
  }
}

// ==========================
// STATUS VISUALS
// ==========================
const STATUS_ICONS = {
  Burn: '🔥',
  Bleed: '💧',
  Tremor: '🌀',
  Rupture: '💥',
  Sinking: '⬇',
  Charge: '⚡',
  Poise: '🛡',
  Haste: '⏩',
  Bind: '⛓',
  Fragile: '💔',
  Protection: '🛡',
  Precognition: '👁',
  Overheat: '🌡',
  Stagger: '💫'
};

function getStatusIcon(type) {
  return STATUS_ICONS[type] || '❓';
}

// Cleanup function to reset all visual arrays
function resetVisualEffects() {
  damageNumbers = [];
  particles = [];
  screenShakeIntensity = 0;
  screenShakeX = 0;
  screenShakeY = 0;
}