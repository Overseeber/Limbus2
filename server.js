var express = require('express');
var app = express();
var server = app.listen(3000);
app.use(express.static('public'));

var socket = require('socket.io');
var io = socket(server);

console.log("Server is Running");

class Client {
    constructor(id)
    {
        this.id = id;
        this.fighter = null;
    }
}
//get client side match with server side, then resolve any conflicts
class Fighter {
    constructor(name)
    {
        this.class = name.class;
        this.hp = name.hp;
        this.maxHp = name.maxHp;
        this.speed = name.speed;
        this.jumpHeight = name.jumpHeight;
        this.baseDamage = name.baseDamage;
        this.staggerThreshold = name.staggerThreshold;
        this.staggerLength = name.staggerLength;
        this.weapon = name.weapon;
        this.knockbackMultiplier = name.knockbackMultiplier;
        this.combo = 0;
        this.hitbox = { width: 50, height: 50 }; // Example hitbox size
        this.state= 'idle'; // idle, attacking, moving, staggered
        this.pos= new Vector2(0,0);
        this.statuses = [];
        
    }

    takeDamage(amount,source)
    {
      this.hp = Math.max(0, this.hp - amount);
      console.log(`${this.class} took ${amount} damage from ${source.class}. Remaining HP: ${this.hp}`);

    }

    heal(amount,source)
    {
      this.hp += Math.min(this.maxHp, this.hp + amount);
      console.log(`${this.class} healed ${amount} HP from ${source.class}. Current HP: ${this.hp}`);
    }


    

}

//functions for stuff
function validMove(fighter, moveRequest) {
    const { dx, dy, direction } = moveRequest;
  
     // Check speed limits
    if (Math.abs(dx) > fighter.maxSpeed * deltaTime) {
        return { valid: false, reason: 'SPEED_EXCEEDED' };
    }
  
     // Check boundaries
    if (fighter.x + dx < 0 || fighter.x + dx > ARENA_WIDTH) {
        return { valid: false, reason: 'BOUNDARY_EXCEEDED' };
  }
  
  return { valid: true, position: { x: fighter.x + dx, y: fighter.y + dy } };
    }

function detectcollision(fighterA, fighterB) {
    return !(
      fighterA.pos.x + fighterA.hitbox.width < fighterB.pos.x ||    
        fighterA.pos.x > fighterB.pos.x + fighterB.hitbox.width ||
        fighterA.pos.y + fighterA.hitbox.height < fighterB.pos.y ||
        fighterA.pos.y > fighterB.pos.y + fighterB.hitbox.height
    );
    //do collision stuff here
  }

  function detecthit(){
    //check if hitbox of attack overlaps with opponent hitbox, if so, apply damage and knockback
  }

  function applyKnockback(fighter, knockbackAmount, direction){
    //move fighter in direction of knockback by knockbackAmount, while checking for collisions and boundaries
  }

  function applyStatusEffect(fighter, statusType, potency, count){
    //add status effect to fighter's statuses array, and apply any immediate effects (e.g. damage over time)
  }

  class Cooldownmanager {
    constructor() {
      this.cooldowns = {};
    }
}

function updateStagger(fighter) { // run every time is hit, only run constantly once fighter is staggered
     if (fighter.stagger >= fighter.staggerThreshold) {
    if (!fighter.isStaggered) {
      fighter.isStaggered = true;
      fighter.staggerTimer = fighter.staggerDuration;
      
      // Emit stagger event for clients
      broadcastEvent({
        type: 'STAGGER_START',
        fighterId: fighter.id,
        duration: fighter.staggerDuration
      });
    }
  }
  
  // Stagger recovery
  if (fighter.isStaggered) {
    fighter.staggerTimer -= deltaTime;
    if (fighter.staggerTimer <= 0) {
      fighter.isStaggered = false;
      broadcastEvent({
        type: 'STAGGER_END',
        fighterId: fighter.id
      });
    }
  }
}

function processDeath(fighter) { if (fighter.hp <= 0 && !fighter.isDefeated) {
    fighter.isDefeated = true;
    fighter.defeatedAt = getCurrentTick();
    fighter.vel.x = 0;
    fighter.vel.y = 0;
    
    // Emit death event
    broadcastEvent({
      type: 'FIGHTER_DEFEATED',
      fighterId: fighter.id,
      defeatedBy: fighter.lastAttackedBy || null
    });
    
    // Check for battle end (only 1 fighter remaining)
    const activeFighters = match.fighters.filter(f => !f.isDefeated);
    if (activeFighters.length <= 1) {
      endBattle(match, activeFighters[0]);
    }
  }
}





io.sockets.on('connection', (socket) => {
  
    console.log(socket.id + ' ' + 'is connected');

  

});



setInterval(() => {

    
}, 50 );

