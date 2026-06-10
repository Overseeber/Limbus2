/**
 * COMBAT CONFIGURATION CONSTANTS
 * 
 * Single source of truth for all recovery, stun, and timing values.
 * Used by both server (require) and client (script tag in index.html).
 * Adjust values here to tune gameplay.
 */

(function() {
  const root = typeof self !== 'undefined' ? self : this;
  
  root.COMBAT_CONFIG = {
    // === GUARD / BLOCK SYSTEM ===
    GUARD_DAMAGE_REDUCTION: 0.05,      // 95% damage reduction when guarding (damage multiplier)
    GUARD_PARRY_WINDOW: 1.0,           // Seconds that parry window lasts after guard activation
    GUARD_RELEASE_HOLD: 0.5,           // Seconds guard remains active after releasing input
    GUARD_BLOCKSTUN_DURATION: 3.0,     // Duration of blockstun on successful parry
    GUARD_PARRY_KNOCKBACK: 1200,        // Knockback force applied on parry
    
    // === HITSTUN ===
    HITSTUN_DURATION: 0.35,            // Base hitstun duration for normal hits
    HITSTUN_CANNOT_ACT: true,          // Whether player cannot act during hitstun
    
    // === HITSTOP ===
    PARRY_HITSTOP_DURATION: 0.5,       // Hitstop duration on successful parry
    
    // === ATTACK TIMINGS ===
    BASIC_ATTACK_COOLDOWN_SEQUENCE_3: 1.3,  // Recovery after third basic attack
    BASIC_ATTACK_WHIFF_COOLDOWN: 1.0,       // Recovery after whiffed attack
    SLAM_COOLDOWN: 3,                       // Recovery after slam
    COMBO_WINDOW_MS: 750,                   // Window for combo chaining (ms)
    CHARGE_THRESHOLD_MS: 300,               // How long to hold attack for charge (ms)
    
    // === DASH ===
    DASH_COOLDOWN: 3.0,                // Seconds to recharge one dash
    DASH_DURATION: 0.2,                // Duration of dash active movement
    DASH_MAX_CHARGES: 3,               // Maximum dash charges
    EVADE_DISTANCE: 230,               // Evade teleport distance
    EVADE_MAX_DURATION: 1.0,           // Max evade state duration
    
    // === COLLISION ===
    PLAYER_MIN_DISTANCE: 50,           // Minimum distance between players
    ARENA_MARGIN: 60,                  // Arena wall margin
  };
  
  // Export for Node.js if available
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.COMBAT_CONFIG;
  }
})();