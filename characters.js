// Character roster system
const CHARACTERS = {
  JOHN: {
    name: 'John Limbus Company',
    title: 'Default Fighter',
    hp: 2500,
    speed: 2.5,
    attackInterval: 0.8,
    baseDamage: 15,
    staggerThreshold: 100,
    staggerLength: 5,
    color: '#4a90e2'
  },
  VALENCINA: {
    name: 'Valencina',
    title: 'The Accelerating Future',
    hp: 3204,
    speed: 3,
    attackInterval: 1.0,
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
    'Burn': '#ff6b6b',
    'Tremor': '#ff9f40',
    'Rupture': '#9b59b6',
    'Bleed': '#4caf50',
    'Sinking': '#2196f3',
    'Charge': '#ffeb3b',
    'Poise': '#00bcd4',
    'Game Target': '#ff1744',
    'Precognition': '#e1f5fe',
    'Overheat': '#dc2626'
  };
  return colors[type] || '#888';
}
