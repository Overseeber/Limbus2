/**
 * ABILITY HANDLER - Server-side
 * Handles ability requests from clients with server authority
 * Validates, executes, and broadcasts ability results
 */

const characterLogic = require('./characterLogic');

/**
 * Handle ability request from client
 * @param {Object} socket - Socket.io socket
 * @param {Object} client - Client object
 * @param {Object} data - Ability request data
 * @param {Object} ROOMS - Rooms registry
 * @param {Object} clientList - Client registry
 */
function handleAbilityRequest(socket, client, data, ROOMS, clientList) {
  if (!client.room) {
    socket.emit('error', { message: 'NOT_IN_ROOM' });
    return;
  }
  
  const room = ROOMS[client.room];
  if (!room) {
    socket.emit('error', { message: 'ROOM_NOT_FOUND' });
    return;
  }
  
  // Get fighter state for this client
  const fighterState = getFighterState(client, room);
  if (!fighterState) {
    socket.emit('error', { message: 'FIGHTER_NOT_FOUND' });
    return;
  }
  
  // Get character config from shared config
  const characterConfig = getCharacterConfig(fighterState.characterKey);
  if (!characterConfig) {
    socket.emit('error', { message: 'CHARACTER_CONFIG_NOT_FOUND' });
    return;
  }
  
  // Get character logic module
  const characterLogicModule = characterLogic[fighterState.characterKey.toLowerCase()];
  if (!characterLogicModule) {
    socket.emit('error', { message: 'CHARACTER_LOGIC_NOT_FOUND' });
    return;
  }
  
  // Validate cooldown
  if (!validateCooldown(fighterState, data.abilityId, characterConfig)) {
    socket.emit('abilityResult', {
      success: false,
      abilityId: data.abilityId,
      fighterId: fighterState.id,
      reason: 'ABILITY_ON_COOLDOWN'
    });
    return;
  }
  
  // Validate fighter state (not defeated, not in certain states)
  if (!validateFighterState(fighterState)) {
    socket.emit('abilityResult', {
      success: false,
      abilityId: data.abilityId,
      fighterId: fighterState.id,
      reason: 'INVALID_FIGHTER_STATE'
    });
    return;
  }
  
  // Get target state
  const targetState = data.targetId ? getTargetState(data.targetId, room, clientList) : null;
  
  // Execute ability based on type
  const result = executeAbility(data, fighterState, characterLogicModule, characterConfig, targetState, room, clientList);
  
  // Update fighter state with results (HP, resources, cooldowns)
  applyAbilityResults(fighterState, result, characterConfig);
  
  // Broadcast result to all clients in room
  broadcastAbilityResult(room, result, socket.server);
  
  // Emit room state update
  emitRoomState(room.id);
}

/**
 * Get fighter state for a client
 * @param {Object} client - Client object
 * @param {Object} room - Room object
 * @returns {Object} Fighter state
 */
function getFighterState(client, room) {
  // Find fighter associated with this client in the room
  // This would need to be implemented based on your fighter management system
  // For now, check if client has a fighter property
  if (client.fighter) {
    return {
      id: client.id,
      characterKey: client.fighter.class,
      hp: client.fighter.hp,
      maxHp: client.fighter.maxHp,
      baseDamage: client.fighter.baseDamage,
      facing: client.fighter.facing || 1,
      velocity: { x: 0, y: 0 },
      resources: {
        precognition: client.fighter.precognition || 10,
        accelerationRounds: client.fighter.accelerationRounds || 5,
        overheat: client.fighter.overheat || 0,
        shinActive: client.fighter.shinActive || false
      },
      statuses: client.fighter.statuses || [],
      isDefeated: client.fighter.hp <= 0
    };
  }
  
  return null;
}

/**
 * Get character config from shared config
 * @param {string} characterKey - Character key
 * @returns {Object} Character config
 */
function getCharacterConfig(characterKey) {
  try {
    const characterConfig = require(`../../shared/characters/${characterKey.toLowerCase()}`);
    return characterConfig;
  } catch (e) {
    console.error(`Failed to load character config for ${characterKey}:`, e);
    return null;
  }
}

/**
 * Validate ability cooldown
 * @param {Object} fighterState - Fighter state
 * @param {string} abilityId - Ability ID
 * @param {Object} characterConfig - Character config
 * @returns {boolean} True if ability can be used
 */
function validateCooldown(fighterState, abilityId, characterConfig) {
  // Check cooldown based on ability type
  // This would need to be implemented based on your cooldown tracking system
  // For now, return true (no cooldown check)
  return true;
}

/**
 * Validate fighter state
 * @param {Object} fighterState - Fighter state
 * @returns {boolean} True if fighter can use abilities
 */
function validateFighterState(fighterState) {
  // Check if fighter is defeated or in invalid state
  if (fighterState.isDefeated) {
    return false;
  }
  
  // Additional state checks can be added here
  return true;
}

/**
 * Execute ability with server authority
 * @param {Object} data - Ability request data
 * @param {Object} fighterState - Fighter state
 * @param {Object} characterLogic - Character logic module
 * @param {Object} characterConfig - Character config
 * @param {Object} targetState - Target state
 * @param {Object} room - Room object
 * @param {Object} clientList - Client registry
 * @returns {Object} Ability result
 */
function executeAbility(data, fighterState, characterLogic, characterConfig, targetState, room, clientList) {
  const abilityId = data.abilityId;
  
  let result = {
    success: false,
    abilityId: abilityId,
    fighterId: fighterState.id,
    characterKey: fighterState.characterKey,
    timestamp: Date.now()
  };
  
  // Execute ability based on character logic
  switch (abilityId) {
    case 'timeToHunt':
      if (characterLogic.executeTimeToHunt) {
        result = characterLogic.executeTimeToHunt(fighterState, characterConfig.abilities.timeToHunt, targetState, characterConfig);
      }
      break;
      
    case 'disposial':
      if (characterLogic.executeDisposal) {
        const targets = targetState ? [targetState] : getAllTargets(fighterState, room, clientList);
        result = characterLogic.executeDisposal(fighterState, characterConfig.abilities.disposial, targets, characterConfig);
      }
      break;
      
    case 'slamAttack':
      if (characterLogic.useSlamAttack) {
        result = characterLogic.useSlamAttack(fighterState, targetState, characterConfig);
      }
      break;
      
    case 'installationArt':
      if (characterLogic.useInstallationArt) {
        result = characterLogic.useInstallationArt(fighterState, characterConfig);
      }
      break;
      
    case 'ultimate':
      if (characterLogic.activateUltimate) {
        const targets = getAllTargets(fighterState, room, clientList);
        result = characterLogic.activateUltimate(fighterState, targets, characterConfig);
      }
      break;
      
    default:
      result.reason = 'UNKNOWN_ABILITY';
  }
  
  return result;
}

/**
 * Get target state by ID
 * @param {string} targetId - Target fighter ID
 * @param {Object} room - Room object
 * @param {Object} clientList - Client registry
 * @returns {Object} Target state
 */
function getTargetState(targetId, room, clientList) {
  // Find target fighter in room
  // This would need to be implemented based on your fighter management system
  const targetClient = clientList[targetId];
  if (targetClient && targetClient.fighter) {
    return {
      id: targetId,
      characterKey: targetClient.fighter.class,
      hp: targetClient.fighter.hp,
      maxHp: targetClient.fighter.maxHp,
      statuses: targetClient.fighter.statuses || []
    };
  }
  
  return null;
}

/**
 * Get all enemy targets
 * @param {Object} fighterState - Fighter state
 * @param {Object} room - Room object
 * @param {Object} clientList - Client registry
 * @returns {Array} Array of target states
 */
function getAllTargets(fighterState, room, clientList) {
  const targets = [];
  
  // Get all fighters in room except the caster
  room.clients.forEach(clientId => {
    if (!clientId || clientId === fighterState.id) return;
    
    const targetClient = clientList[clientId];
    if (targetClient && targetClient.fighter) {
      targets.push({
        id: clientId,
        characterKey: targetClient.fighter.class,
        hp: targetClient.fighter.hp,
        maxHp: targetClient.fighter.maxHp,
        statuses: targetClient.fighter.statuses || []
      });
    }
  });
  
  return targets;
}

/**
 * Apply ability results to fighter state
 * @param {Object} fighterState - Fighter state
 * @param {Object} result - Ability result
 * @param {Object} characterConfig - Character config
 */
function applyAbilityResults(fighterState, result, characterConfig) {
  if (!result.success) return;
  
  // Update HP if damage was dealt
  if (result.targetHp !== undefined) {
    fighterState.hp = result.targetHp;
  }
  
  // Update resources
  if (result.precognitionRemaining !== undefined) {
    fighterState.resources.precognition = result.precognitionRemaining;
  }
  
  // Apply statuses
  if (result.statuses && Array.isArray(result.statuses)) {
    result.statuses.forEach(statusType => {
      fighterState.statuses.push({
        type: statusType,
        count: 1,
        potency: 1,
        duration: 0
      });
    });
  }
  
  // Set defeated state
  if (result.defeated) {
    fighterState.isDefeated = true;
  }
}

/**
 * Broadcast ability result to all clients in room
 * @param {Object} room - Room object
 * @param {Object} result - Ability result
 */
function broadcastAbilityResult(room, result, io) {
  if (!io || !room || !room.id) return;
  io.to(room.id).emit('abilityResult', result);
}

/**
 * Emit room state update
 * @param {string} roomId - Room ID
 */
function emitRoomState(roomId) {
  // This would need to be implemented based on your room state management
  // For now, this is a placeholder
}

module.exports = {
  handleAbilityRequest,
  executeAbility,
  broadcastAbilityResult
};
