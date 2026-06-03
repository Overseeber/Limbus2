/**
 * CALLISTO - CLIENT-SIDE RENDERING
 * Pure client-side visual methods for Callisto
 * NO gameplay logic, NO damage calculations, NO hit detection
 */

const CallistoRenderer = {
  /**
   * State to sprite mapping for Callisto
   */
  stateMap: {
    idle: 'cidle',
    run: 'cmove',
    attack: 'cs1f1',
    heavy: 'cs2f1',
    dash: 'cevade',
    guard: 'cguard',
    hit: 'churt',
    staggered: 'churt',
    duck: 'cidle',
    ultimate: 'cuend'
  },
  
  /**
   * Get sprite for current state
   * @param {Object} fighter - Fighter instance
   * @returns {string} Sprite name
   */
  getSpriteForState(fighter) {
    // Handle special states for Callisto
    
    // Slam attack
    if (fighter.isSlamAttacking) {
      return 'cs1f2'; // Slam sprite
    }
    
    // Dash attack
    if (fighter.isDashing) {
      if (fighter.state === 'attack') {
        return 'cjoust'; // Dash attack sprite
      } else if (fighter.usePostDashSprite) {
        return 'chalt'; // Dash end sprite
      } else {
        return 'cmove'; // Regular dash movement sprite
      }
    }
    
    // Attack sequences
    if (fighter.state === 'attack' && fighter.attackSequence > 0) {
      // Handle attack sequences for Callisto
      if (fighter.attackSequence === 1) {
        return 'cs2f1';
      } else if (fighter.attackSequence === 2) {
        return 'cs3f1';
      } else if (fighter.attackSequence === 3) {
        return 'cs3f2';
      }
    }
    
    // Halt sequence
    if (fighter.haltSequence) {
      return this.getHaltSprite(fighter);
    }
    
    // Post-dash sprite reset
    if (fighter.usePostDashSprite && !fighter.isDashing) {
      fighter.usePostDashSprite = false;
      return this.stateMap[fighter.state] || 'cidle';
    }
    
    // Respect currentSprite during Installation Art
    if (fighter.installationArtActive) {
      return fighter.currentSprite;
    }
    
    // Use state mapping
    return this.stateMap[fighter.state] || 'cidle';
  },
  
  /**
   * Get sprite for halt sequence
   * @param {Object} fighter - Fighter instance
   * @returns {string} Sprite name
   */
  getHaltSprite(fighter) {
    if (!fighter.haltSequence) return 'cidle';
    
    switch (fighter.haltSequence) {
      case 1:
        return 'chalt';
      case 2:
        return 'cs3f3';
      case 3:
        return 'cs3f4';
      default:
        return 'cidle';
    }
  },
  
  /**
   * Draw Callisto-specific visual effects
   * @param {Object} fighter - Fighter instance
   */
  drawVisualEffects(fighter) {
    // Draw Installation Art range indicator
    if (fighter.installationArtActive) {
      this.drawInstallationArtRange(fighter);
    }
    
    // Draw corpus ingredient stacks
    if (fighter.corpusIngredient > 0) {
      this.drawCorpusStacks(fighter);
    }
    
    // Draw artwork stacks
    if (fighter.artworkTibiaStacks > 0) {
      this.drawArtworkStacks(fighter);
    }
  },
  
  /**
   * Draw Installation Art range indicator
   * @param {Object} fighter - Fighter instance
   */
  drawInstallationArtRange(fighter) {
    const range = 300;
    
    push();
    translate(fighter.pos.x, fighter.pos.y);
    
    // Draw range circle
    noFill();
    stroke(139, 69, 19, 100);
    strokeWeight(2);
    ellipse(0, 0, range, range);
    
    // Draw activation indicator
    if (fighter.installationArtTimer !== undefined) {
      const windup = 0.5; // seconds
      const progress = Math.max(0, Math.min(1, 1 - (fighter.installationArtTimer / windup)));
      stroke(139, 69, 19, 150);
      strokeWeight(4);
      ellipse(0, 0, range * progress, range * progress);
    }
    
    pop();
  },
  
  /**
   * Draw corpus ingredient stacks
   * @param {Object} fighter - Fighter instance
   */
  drawCorpusStacks(fighter) {
    const stacks = fighter.corpusIngredient;
    const maxStacks = fighter.maxCorpusIngredient || 20;
    
    push();
    translate(fighter.pos.x, fighter.pos.y - 60);
    
    // Draw stack bar
    const barWidth = 60;
    const barHeight = 8;
    const progress = stacks / maxStacks;
    
    // Background
    fill(50);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, barWidth, barHeight);
    
    // Fill
    fill(139, 69, 19);
    rect(0, 0, barWidth * progress, barHeight);
    
    // Label
    fill(255);
    textAlign(CENTER);
    textSize(8);
    text(`Corpus: ${stacks}/${maxStacks}`, 0, -12);
    
    pop();
  },
  
  /**
   * Draw artwork stacks
   * @param {Object} fighter - Fighter instance
   */
  drawArtworkStacks(fighter) {
    const stacks = fighter.artworkTibiaStacks;
    
    push();
    translate(fighter.pos.x, fighter.pos.y - 75);
    
    // Draw stack indicators
    for (let i = 0; i < stacks; i++) {
      fill(200, 150, 50);
      noStroke();
      ellipse((i - stacks / 2) * 12, 0, 8, 8);
    }
    
    // Label
    fill(255);
    textAlign(CENTER);
    textSize(8);
    text(`Artwork: ${stacks}`, 0, -12);
    
    pop();
  },
  
  /**
   * Spawn slash effect for Callisto attacks
   * @param {Object} fighter - Fighter instance
   * @param {string} attackType - Type of attack
   */
  spawnSlashEffect(fighter, attackType) {
    const slashSprites = {
      light: 'cs2s1',
      heavy: 'cs3s1',
      slam: 'cs1s1',
      ultimate: 'cus4'
    };
    
    const spriteName = slashSprites[attackType] || 'cs2s1';
    
    if (typeof VFX !== 'undefined' && VFX.spawnSlash) {
      VFX.spawnSlash(fighter.pos.x, fighter.pos.y, {
        spriteName: spriteName,
        life: 0.3,
        rotation: fighter.facing === 1 ? 0 : Math.PI,
        length: 100
      });
    }
  },
  
  /**
   * Get ultimate visual configuration
   * @returns {Object} Ultimate visual config
   */
  getUltimateVisualConfig() {
    return {
      name: 'Improvised Ribcage',
      sprite: 'cuend',
      cameraZoom: 2.5,
      backgroundDim: 0.7,
      duration: 3.0,
      phases: 5
    };
  }
};

// Export for client use (browser-compatible)
window.CallistoRenderer = CallistoRenderer;
