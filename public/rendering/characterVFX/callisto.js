/**
 * CALLISTO VISUAL EFFECTS - Client-side only
 * Handles rendering of Callisto's ability visual effects
 * Called when server broadcasts ability results
 * Uses p5.js for graphics
 */

const CallistoRenderer = {
  /**
   * Spawn visual effects for Callisto's abilities
   */
  // `result` is optional; when provided for installationArt it contains per-target hit data
  spawnSlashEffect: function(fighter, abilityId, result) {
    if (!fighter) return;
    
    switch (abilityId) {
      case 'slamAttack':
        this._spawnSlamVisuals(fighter);
        break;
      case 'installationArt':
        this._spawnInstallationArtVisuals(fighter, result);
        break;
      case 'ultimate':
        this._spawnUltimateVisuals(fighter);
        break;
    }
  },
  
  _spawnSlamVisuals: function(fighter) {
    // Spawn slam slash effect
    fighter.spawnSlashEffect('cs1s1', { x: 0, y: -10 });
    
    // Spawn debris particles
    if (typeof spawnSlamDebris === 'function') {
      spawnSlamDebris(fighter.pos.x, fighter.pos.y, 12);
    }
    
    // Screen shake
    if (typeof addScreenShake === 'function') {
      addScreenShake(10);
    }
    
    // Corpus ingredient visual
    for (let i = 0; i < 3; i++) {
      if (typeof spawnBurnParticle === 'function') {
        spawnBurnParticle(
          fighter.pos.x + random(-20, 20),
          fighter.pos.y - 20 + random(-10, 10)
        );
      }
    }
  },
  
  _spawnInstallationArtVisuals: function(fighter, result) {
    // If the server provided per-target results, spawn one cbsk1 at each target's world position
    if (result && Array.isArray(result.results) && result.results.length > 0) {
      result.results.forEach(r => {
        const wp = r.worldPos || (r.pos ? r.pos : null);
        const groundY = r.groundY || (wp && wp.y) || fighter.spawnY || null;
        if (wp && typeof wp.x === 'number') {
          fighter.spawnSlashEffect('cbsk1', {
            worldPos: { x: wp.x, y: wp.y },
            groundY: groundY,
            rotation: random(-PI/4, PI/4)
          });
        } else {
          // Fallback: spawn around caster
          fighter.spawnSlashEffect('cbsk1', { x: random(-30,30), y: 0 });
        }
      });
      return;
    }

    // Fallback behavior: spawn a few cbsk effects around the caster
    fighter.spawnSlashEffect('cbsk1', { x: 0, y: 0 });
    fighter.spawnSlashEffect('cbsk2', { x: 30, y: 0 });
    fighter.spawnSlashEffect('cbsk3', { x: -30, y: 0 });
    
    // Heavy screen shake
    if (typeof addScreenShake === 'function') {
      addScreenShake(20);
    }
    
    // Massive debris
    if (typeof spawnSlamDebris === 'function') {
      spawnSlamDebris(fighter.pos.x, fighter.spawnY, 20);
    }
    
    // Status particles
    for (let i = 0; i < 5; i++) {
      if (typeof spawnBurnParticle === 'function') {
        spawnBurnParticle(
          fighter.pos.x + random(-60, 60),
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
    
    // Massive debris
    if (typeof spawnSlamDebris === 'function') {
      spawnSlamDebris(fighter.pos.x, fighter.spawnY, 30);
    }
    
    // Particles
    for (let i = 0; i < 15; i++) {
      if (typeof spawnBurnParticle === 'function') {
        spawnBurnParticle(
          fighter.pos.x + random(-100, 100),
          fighter.pos.y - 50 + random(-50, 50)
        );
      }
    }
  },
  
  /**
   * Draw Callisto-specific status indicators
   */
  drawStatusIndicators: function(fighter) {
    if (!fighter) return;
    
    // Corpus Ingredient indicator
    if (fighter.corpusIngredient !== undefined && fighter.maxCorpusIngredient) {
      push();
      const barWidth = 40;
      const barHeight = 4;
      const x = fighter.pos.x - barWidth / 2;
      const y = fighter.pos.y + 50;
      const fillPercent = Math.min(fighter.corpusIngredient / fighter.maxCorpusIngredient, 1);
      
      fill(0, 150);
      rect(x, y, barWidth, barHeight, 2);
      fill(139, 69, 19, 200); // Brown for corpus
      rect(x, y, barWidth * fillPercent, barHeight, 2);
      pop();
    }
    
    // Artwork: Tibia stacks indicator
    if (fighter.artworkTibiaStacks > 0) {
      push();
      for (let i = 0; i < Math.min(fighter.artworkTibiaStacks, 5); i++) {
        const x = fighter.pos.x - 15 + i * 10;
        const y = fighter.pos.y + 58;
        fill(255, 215, 0); // Gold
        ellipse(x, y, 4);
      }
      pop();
    }
  }
};