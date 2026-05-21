/**
 * VALENCINA - CLIENT-SIDE RENDERING
 * Pure client-side visual methods for Valencina
 * NO gameplay logic, NO damage calculations, NO hit detection
 */

const ValencinaRenderer = {
  /**
   * State to sprite mapping for Valencina
   */
  stateMap: {
    idle: 'idle',
    run: 'moving',
    attack: 'prepat',
    heavy: 'halt1',
    dash: 'evade',
    guard: 'guard',
    hit: 'hurt',
    staggered: 'hurt',
    duck: 'idle',
    ultimate: 'dist1'
  },
  
  /**
   * Get sprite for current state
   * @param {Object} fighter - Fighter instance
   * @returns {string} Sprite name
   */
  getSpriteForState(fighter) {
    // Respect currentSprite during Time to Hunt casting
    if (fighter.timeToHuntCasting) {
      return fighter.currentSprite;
    }
    
    // Handle special states
    if (fighter.isSlamAttacking) {
      return 's4f4'; // Valencina slam sprite
    }
    
    if (fighter.isDashing) {
      if (fighter.state === 'attack') {
        return 's1f3'; // Dash attack sprite
      }
      return 'evade'; // Dash movement sprite
    }
    
    // Use state mapping
    return this.stateMap[fighter.state] || 'idle';
  },
  
  /**
   * Draw Valencina-specific visual effects
   * @param {Object} fighter - Fighter instance
   */
  drawVisualEffects(fighter) {
    // Draw Time to Hunt range indicator
    if (fighter.gameTimeTarget) {
      this.drawTimeToHuntRange(fighter);
    }
    
    // Draw dialogue
    if (fighter.currentDialogue) {
      this.drawDialogue(fighter);
    }
  },
  
  /**
   * Draw Time to Hunt range indicator
   * @param {Object} fighter - Fighter instance
   */
  drawTimeToHuntRange(fighter) {
    const range = 250;
    const facing = fighter.facing;
    
    push();
    translate(fighter.pos.x, fighter.pos.y);
    
    // Draw range circle
    noFill();
    stroke(255, 100, 100, 100);
    strokeWeight(2);
    ellipse(0, 0, range, range);
    
    // Draw target indicator
    if (fighter.gameTimeTarget) {
      stroke(255, 50, 50, 150);
      strokeWeight(3);
      const targetX = (fighter.gameTimeTarget.pos.x - fighter.pos.x) * facing;
      const targetY = fighter.gameTimeTarget.pos.y - fighter.pos.y;
      
      // Draw line to target
      line(0, 0, targetX, targetY);
      
      // Draw target marker
      fill(255, 50, 50, 150);
      noStroke();
      ellipse(targetX, targetY, 20, 20);
    }
    
    pop();
  },
  
  /**
   * Draw dialogue text
   * @param {Object} fighter - Fighter instance
   */
  drawDialogue(fighter) {
    push();
    translate(fighter.pos.x, fighter.pos.y - 80);
    
    textAlign(CENTER, CENTER);
    textSize(12);
    fill(255);
    stroke(0);
    strokeWeight(2);
    
    text(fighter.currentDialogue, 0, 0);
    
    pop();
  },
  
  /**
   * Spawn slash effect for Valencina attacks
   * @param {Object} fighter - Fighter instance
   * @param {string} attackType - Type of attack
   */
  spawnSlashEffect(fighter, attackType) {
    const slashSprites = {
      light: 's1s1',
      heavy: 's1s2',
      slam: 's1s3',
      ultimate: 's1s4'
    };
    
    const spriteName = slashSprites[attackType] || 's1s1';
    
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
      name: 'Disposal',
      sprite: 'dist1',
      cameraZoom: 2.5,
      backgroundDim: 0.7,
      duration: 2.5,
      phases: 5
    };
  }
};

// Export for client use (browser-compatible)
window.ValencinaRenderer = ValencinaRenderer;
