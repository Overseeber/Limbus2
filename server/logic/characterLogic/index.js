/**
 * CHARACTER LOGIC INDEX - Server-side
 * Exports character-specific ability handlers for all characters
 */

const callisto = require('./callisto.js');
const valencina = require('./valencina.js');

module.exports = {
  callisto: callisto,
  valencina: valencina,
  // Character lookup helper
  getCharacterLogic: function(characterKey) {
    const key = characterKey.toLowerCase();
    if (this[key]) return this[key];
    return null;
  }
};