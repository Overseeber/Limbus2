/**
 * CHARACTER LOGIC INDEX - Server-side
 * Exports character-specific ability handlers for all characters
 */

const callisto = require('./callisto.js');
const valencina = require('./valencina.js');
const dihui = require('./dihui.js');

module.exports = {
  callisto: callisto,
  valencina: valencina,
  dihui: dihui,
  // Character lookup helper
  getCharacterLogic: function(characterKey) {
    const key = characterKey.toLowerCase();
    if (this[key]) return this[key];
    return null;
  }
};