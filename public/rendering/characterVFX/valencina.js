/**
 * VALENCINA VISUAL EFFECTS - Client-side only
 * Handles rendering of Valencina's ability visual effects
 * Called when server broadcasts ability results
 * Uses p5.js for graphics
 * 
 * Updated to display all restored character resources and effects.
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
    const slashType = 's1s1';
    if (fighter.spawnSlashEffect) fighter.spawnSlashEffect(slashType, { x: 0, y: -10 });
    if (fighter.spawnSlashEffect) fighter.spawnSlashEffect('s1s2', { x: 15, y: -5 });
    
    if (typeof addScreenShake === 'function') {
      addScreenShake(8);
    }
    
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
    if (fighter.spawnSlashEffect) fighter.spawnSlashEffect('diss1', { x: 0, y: -10 });
    
    if (typeof addScreenShake === 'function') {
      addScreenShake(15);
    }
    
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
    if (typeof addScreenShake === 'function') {
      addScreenShake(30, true);
    }
    
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
   * Displays all restored resources from oldclientgameplay reference:
   * - Acceleration Rounds
   * - Precognition
   * - Overheat
   * - Accelerating Future stacks
   * - Shin (心) activation
   */
  drawStatusIndicators: function(fighter) {
    if (!fighter) return;
    
    const res = fighter.resources || {};
    
    // Acceleration Rounds indicator (yellow circles)
    if (res.accelerationRounds !== undefined) {
      const ar = res.accelerationRounds || 0;
      if (ar > 0) {
        push();
        for (let i = 0; i < Math.min(ar, 10); i++) {
          const x = fighter.pos.x - 25 + i * 6;
          const y = fighter.pos.y + 65;
          fill(255, 220, 100, 200);
          noStroke();
          ellipse(x, y, 5, 5);
        }
        pop();
      }
    }
    
    // Precognition indicator (blue bar)
    const precog = res.precognition;
    const maxPrecog = res.maxPrecognition || 30;
    if (precog !== undefined && maxPrecog > 0) {
      push();
      const barWidth = 50;
      const barHeight = 4;
      const x = fighter.pos.x - barWidth / 2;
      const y = fighter.pos.y + 70;
      const fillPercent = Math.max(0, Math.min(1, precog / maxPrecog));
      
      // Background
      fill(0, 150, 255, 50);
      rect(x, y, barWidth, barHeight, 2);
      // Fill
      fill(100, 200, 255, 200);
      rect(x, y, barWidth * fillPercent, barHeight, 2);
      pop();
    }
    
    // Overheat indicator (red overlay when active)
    if (res.overheatActive && res.overheat > 0) {
      push();
      const barWidth = 50;
      const barHeight = 4;
      const x = fighter.pos.x - barWidth / 2;
      const y = fighter.pos.y + 75;
      const fillPercent = Math.max(0, Math.min(1, res.overheat / (res.maxOverheat || 30)));
      
      fill(255, 0, 0, 100);
      rect(x, y, barWidth, barHeight, 2);
      fill(255, 100, 0, 200);
      rect(x, y, barWidth * fillPercent, barHeight, 2);
      pop();
    }
    
    // Shin active indicator (pink glow)
    if (res.shinActive) {
      push();
      noFill();
      stroke(233, 30, 99, 100 + sin(millis() * 0.005) * 50);
      strokeWeight(3);
      ellipse(fighter.pos.x, fighter.pos.y, 100, 120);
      pop();
    }
    
    // Accelerating Future stacks text
    if (res.acceleratingFuture && res.acceleratingFuture > 0) {
      push();
      textAlign(CENTER, CENTER);
      textSize(10);
      fill(76, 175, 80, 200);
      stroke(0);
      strokeWeight(1);
      text('AF x' + res.acceleratingFuture, fighter.pos.x, fighter.pos.y + 85);
      pop();
    }
    
    // Game Target indicator on enemies
    const hasGameTarget = fighter.statuses && fighter.statuses.some(s => s.type === 'Game Target');
    if (hasGameTarget) {
      push();
      noFill();
      stroke(255, 23, 68, 150);
      strokeWeight(2);
      ellipse(fighter.pos.x, fighter.pos.y - 50, 20, 20);
      
      // X symbol
      stroke(255, 23, 68);
      strokeWeight(2);
      line(fighter.pos.x - 6, fighter.pos.y - 56, fighter.pos.x + 6, fighter.pos.y - 44);
      line(fighter.pos.x + 6, fighter.pos.y - 56, fighter.pos.x - 6, fighter.pos.y - 44);
      pop();
    }
  }
};

// Export for client use
if (typeof window !== 'undefined') {
  window.ValencinaRenderer = ValencinaRenderer;
}