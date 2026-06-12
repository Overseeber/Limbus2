// Client networking abstraction and local simulator fallback
window.Network = {
  socket: null,
  myClientId: null, // Stable client ID set once on connection
  isConnected: false,
  isLocalAuthority: true, // fallback until server authoritative mode available
  eventHandlers: {},

  init() {
    // Try to connect if socket.io is available
    if (typeof io !== 'undefined') {
      // Try each server address in order until one connects
      const serverAddresses = [
        'http://10.21.69.212:3000',  // school Pi
        'http://192.168.50.60:3000',  // home Pi
        'http://localhost:3000'       // local testing
      ];

      // Attempt connection to the first address; if it fails after timeout, try the next
      const tryConnect = (index) => {
        if (index >= serverAddresses.length) {
          console.warn('[Network] all server addresses failed, using local simulator');
          this._startLocal();
          return;
        }

        const address = serverAddresses[index];
        console.log(`[Network] attempting connection to ${address}`);
        const sock = io.connect(address, { timeout: 3000 });

        let connected = false;

        sock.on('connect', () => {
          connected = true;
          this.socket = sock;
          this.myClientId = sock.id; // Set stable client ID once
          this.isConnected = true;
          this.isLocalAuthority = false;
          console.log('[Network] connected', sock.id, 'to', address);
          console.log('CLIENT SOCKET ID:', sock.id);
          console.log('[Network] myClientId set to:', this.myClientId);

          this.socket.on('stateUpdate', (state) => this._emit('stateUpdate', state));
          this.socket.on('event', (ev) => this._emit('event', ev));
          this._setupSocketHandlers(this.socket);

        });

        sock.on('connect_error', () => {
          if (!connected) {
            console.warn(`[Network] connection failed to ${address}, trying next...`);
            sock.close();
            tryConnect(index + 1);
          }
        });
      };

      tryConnect(0);
    } else {
      console.log('[Network] socket.io not found, using local simulator');
      this._startLocal();
    }
  },

  _startLocal() {
    this.isConnected = false;
    this.isLocalAuthority = true;
    if (!window.LocalSimulator) {
      window.LocalSimulator = new LocalSimulator();
    }
  },

  _setupSocketHandlers(socket) {
    if (!socket) return;
    socket.on('joinedRoom', (roomId) => {
      window.myRoomId = roomId;
      this._emit('joinedRoom', roomId);
    });
    socket.on('roomsList', (rooms) => {
      window.availableRooms = rooms;
      this._emit('roomsList', rooms);
    });
    socket.on('roomState', (state) => {
      // state: { id, slots: [{clientId, character}] }
      console.log('roomState received:', state);
      window.myRoomState = state;
      this._emit('roomState', state);
    });
    socket.on('battleStart', (data) => {
      this._emit('battleStart', data);
    });
    socket.on('abilityResult', (result) => {
      this._emit('abilityResult', result);
    });
    socket.on('gameState', (state) => {
      this._emit('gameState', state);
    });
    socket.on('attackResult', (result) => {
      this._emit('attackResult', result);
    });
    socket.on('snapshot', (snapshot) => {
      this._emit('snapshot', snapshot);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[Network] disconnected:', reason);
      this.isConnected = false;
    });
    socket.on('error', (error) => {
      console.warn('[Network] error:', error);
      // Show error feedback to the user
      window.lastNetworkError = error && error.message ? error.message : 'Unknown error';
      window.lastNetworkErrorTime = Date.now();
      this._emit('error', error);
    });
    socket.on('connect_error', (error) => {
      console.warn('[Network] connect_error:', error);
    });
  },

  // Room stuff
  createRoom(roomId) {
    if (this.socket) this.socket.emit('createRoom', roomId);
  },
  joinRoom(roomId) {
    if (this.socket) this.socket.emit('joinRoom', roomId);
  },
  leaveRoom() {
    if (this.socket) this.socket.emit('leaveRoom');
    // Clear local room state immediately so the UI transitions back to room selection
    window.myRoomState = null;
    window.myRoomId = null;
  },
  changeCharacter(characterKey) {
    if (this.socket) this.socket.emit('changeCharacter', characterKey);
  },
  toggleReady() {
    console.log('Network.toggleReady called, socket:', this.socket?.id, 'isConnected:', this.isConnected);
    if (this.socket) this.socket.emit('toggleReady');
  },
  startBattle() {
    if (this.socket) this.socket.emit('startBattle');
  },
  startCpuBattle(config) {//cpu bat is ai assisted
    if (this.socket) this.socket.emit('startCpuBattle', config);
  },
  claimSlot(slotIndex) {
    if (this.socket) this.socket.emit('claimSlot', slotIndex);
  },

  // Ability request with server authority
  requestAbility(abilityId, targetId = null) {
    if (this.isConnected && this.socket) {
      this.socket.emit('ability', {
        abilityId: abilityId,
        targetId: targetId,
        timestamp: Date.now()
      });
    } else if (this.isLocalAuthority && window.LocalSimulator) {
      // Fallback to local execution for development
      window.LocalSimulator.enqueue({
        type: 'ABILITY_REQUEST',
        data: { abilityId, targetId }
      });
    }
  },

  sendInput(input) {
    if (this.isConnected && this.socket) {
      this.socket.emit('input', input);
    } else if (this.isLocalAuthority && window.LocalSimulator) {//cpu battle stuff ai did
      window.LocalSimulator.enqueue({ type: 'INPUT', data: input });
    }
  },

  sendEvent(ev) {
    if (this.isConnected && this.socket) {
      this.socket.emit('event', ev);
    } else if (this.isLocalAuthority && window.LocalSimulator) {//ai fallback thing
      window.LocalSimulator.enqueue(ev);
    }
  },

  on(name, fn) {
    this.eventHandlers[name] = this.eventHandlers[name] || [];
    this.eventHandlers[name].push(fn);
    // spam working stuff
    if (this.eventHandlers[name].length > 5) {
      console.warn('[Network] dis guy is spamming', name, this.eventHandlers[name].length);
    }
  },

  _emit(name, payload) {
    const handlers = this.eventHandlers[name] || [];
    handlers.forEach(h => h(payload));
  }
};

// ai fall back thingy
class LocalSimulator {
  constructor() {
    this.eventQueue = [];
    this.tickRate = 60;
    this.last = performance.now();
    this.running = true;
    this.processLoop();
    console.log('[LocalSimulator] started');
  }

  enqueue(ev) {
    this.eventQueue.push(ev);
  }

  processLoop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    if (dt >= 1 / this.tickRate) {
      this.last = now;
      this.processEvents();
    }
    requestAnimationFrame(() => this.processLoop());
  }

  processEvents() {
    while (this.eventQueue.length > 0) {
      const ev = this.eventQueue.shift();
      this._processEvent(ev);
    }
  }

  _processEvent(ev) {
    if (!ev || !ev.type) return;
    switch (ev.type) {
      case 'REQUEST_HIT':
        this._resolveHit(ev);
        break;
      case 'HIT':
        this._resolveHit(ev);
        break;
      case 'STATUS_APPLY':
        this._applyStatus(ev);
        break;
      case 'INPUT':
        // for now, just pass input through to handlers
        Network._emit('input', ev.data);
        break;
      default:
        console.log('[LocalSimulator] unknown event', ev.type, ev);
    }
  }

  _resolveHit(ev) {
    // ev: { type:'REQUEST_HIT'|'HIT', attackerId, targetId, damage, knockback }
    const attacker = this._findById(ev.attackerId);
    const target = this._findById(ev.targetId);
    if (!target) return;
    // Apply damage authoritatively on local simulator
    const attackerRef = attacker || ev.attacker || null;
    target.applyAuthoritativeDamage && target.applyAuthoritativeDamage(ev.damage, attackerRef, ev.knockback || 0, ev);
    // Broadcast a pseudo state update for render
    Network._emit('stateUpdate', { type: 'damage', targetId: ev.targetId, hp: target.hp });
  }

  _applyStatus(ev) {
    const target = this._findById(ev.targetId);
    if (!target) return;
    if (ev.status) {
      target.addStatus && target.addStatus(ev.status.type, ev.status.count || 1, ev.status.potency || 0);
    }
  }

  _findById(id) {
    if (!id) return null;
    // Support numeric playerId or characterKey
    const fighters = window.allFighters || [];
    return fighters.find(f => f.playerId === id || f.characterKey === id || f.id === id) || null;
  }
}

// Auto-init
try { Network.init(); } catch (e) { console.warn('Network.init failed', e); }
