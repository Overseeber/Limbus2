/**
 * CHARACTER CONFIG INDEX
 * Exports all character configuration objects.
 * Loaded by both server and client.
 */

// Load individual character configs
if (typeof require !== 'undefined') {
  // Server-side (Node.js)
  var CALLISTO_CONFIG = require('./callisto.js');
  var VALENCINA_CONFIG = require('./valencina.js');
  var JOHN_CONFIG = require('./john.js');
}
// Client-side (p5.js) - configs loaded via <script> tags in HTML

const CHARACTER_CONFIGS = {
  CALLISTO: CALLISTO_CONFIG || {},
  VALENCINA: VALENCINA_CONFIG || {},
  JOHN: JOHN_CONFIG || {}
};

/**
 * Get character config by ID
 */
function getCharacterConfig(characterId) {
  return CHARACTER_CONFIGS[characterId] || CHARACTER_CONFIGS.JOHN;
}

// Export for server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHARACTER_CONFIGS,
    getCharacterConfig,
    CALLISTO_CONFIG,
    VALENCINA_CONFIG,
    JOHN_CONFIG
  };
}
