// Character roster system
const CHARACTERS = {
  JOHN: {
    name: 'John Limbus Company',
    title: 'Default Fighter',
    hp: 2500,
    speed: 7.5,
    attackInterval: 1,
    baseDamage: 15,
    staggerThreshold: 100,
    staggerLength: 5,
    color: '#4a90e2'
  },
  VALENCINA: {
    name: 'Valencina',
    title: 'The Accelerating Future',
    hp: 3204,
    speed: 9,
    attackInterval: 0.7,
    baseDamage: 21,
    staggerThreshold: 1300,
    staggerLength: 5,
    color: '#ff6b9d'
  }
};

let currentCharacter = 'JOHN';

function switchCharacter(characterKey) {
  if (CHARACTERS[characterKey]) {
    currentCharacter = characterKey;
    console.log(`Switched to ${CHARACTERS[characterKey].name}`);
  }
}

function getCurrentCharacter() {
  return CHARACTERS[currentCharacter];
}

// Add new status effects to statusColor function
function statusColor(type) {
  const colors = {
    'Burn': '#ff0000',      // red
    'Bleed': '#ff8800',     // orange  
    'Tremor': '#ffff00',    // yellow
    'Rupture': '#00ff00',   // green
    'Sinking': '#0088ff',   // blue
    'Charge': '#8800ff',    // purple
    'Poise': '#ffffff',     // white
    'Game Target': '#ff1744',
    'Precognition': '#e1f5fe',
    'Overheat': '#dc2626'
  };
  return colors[type] || '#888';
}
