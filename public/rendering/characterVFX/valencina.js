/**
 * VALENCINA VISUAL EFFECTS - Client-side only
 * Handles rendering of Valencina's ability visual effects
 * Called when server broadcasts ability results
 * Uses p5.js for graphics
 */

const ValencinaRenderer = {
  /**
   * Spawn visual effects for Valencina's abilities
   */
  spawnSlashEffect: function(fighter, abilityId) {
    if (!fighter) return;
    
    switch (abilityId) {
      case 'timeToHunt':
        this._spawnTimeToHuntVisuals(fighter);
        break;
      case 'disposial':
        this._spawnDisposalVisuals(fighter);
        break;
      case 'ultimate':
        this._spawnUltimateVisuals(fighter);
        break;
    }
  },
  
  _spawnTimeToHuntVisuals: function(fighter) {
    // Spawn slash effects
    const slashType = 's1s1';
    fighter.spawnSlashEffect(slashType, { x: 0, y: -10 });
    fighter.spawnSlashEffect('s1s2', { x: 15, y: -5 });
    
    // Screen shake
    if (typeof addScreenShake === 'function') {
      addScreenShake(8);
    }
    
    // Status particles
    for (let i = 0; i < 3; i++) {
      if (typeof spawnBurnParticle === 'function') {
        spawnBurnParticle(
          fighter.pos.x + random(-30, 30),
          fighter.pos.y - 30 + random(-20, 20)
        );
      }
    }
  },
  
  _spawnDisposalVisuals: function(fighter) {
    // Spawn disposal slash effects
    fighter.spawnSlashEffect('diss1', { x: 0, y: -10 });
    
    // Screen shake
    if (typeof addScreenShake === 'function') {
      addScreenShake(15);
    }
    
    // Massive particle burst
    for (let i = 0; i < 8; i++) {
      if (typeof spawnBurnParticle === 'function') {
        spawnBurnParticle(
          fighter.pos.x + random(-50, 50),
          fighter.pos.y - 30 + random(-30, 30)
        );
      }
    }
  },
  
  _spawnUltimateVisuals: function(fighter) {
    // Heavy screen shake
    if (typeof addScreenShake === 'function') {
      addScreenShake(30, true);
    }
    
    // Massive particle burst
    for (let i = 0; i < 15; i++) {
      if (typeof spawnBurnParticle === 'function') {
        spawnBurnParticle(
          fighter.pos.x + random(-80, 80),
          fighter.pos.y - 50 + random(-50, 50)
        );
      }
    }
  },
  
  /**
   * Draw Valencina-specific status indicators
   */
  drawStatusIndicators: function(fighter) {
    if (!fighter) return;
    
    // Precognition indicator
    if (fighter.precognition !== undefined && fighter.maxPrecognition) {
      push();
      const barWidth = 40;
      const barHeight = 4;
      const x = fighter.pos.x - barWidth / 2;
      const y = fighter.pos.y + 50;
      const fillPercent = fighter.precognition / fighter.maxPrecognition;
      
      fill(0, 150);
      rect(x, y, barWidth, barHeight, 2);
      fill(100, 200, 255, 200);
      rect(x, y, barWidth * fillPercent, barHeight, 2);
      pop();
    }
    
    // Acceleration rounds indicator
    if (fighter.accelerationRounds !== undefined) {
      push();
      for (let i = 0; i < (fighter.accelerationRounds || 0); i++) {
        const x = fighter.pos.x - 15 + i * 10;
        const y = fighter.pos.y + 58;
        fill(255, 220, 100);
        ellipse(x, y, 4);
      }
      pop();
    }
  }
};