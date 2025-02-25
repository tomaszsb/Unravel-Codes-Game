// player-manager.js
class PlayerManager {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.skipConditions = new Map();
        this.subscribers = new Set();
        this.isInitialized = false;
        this.readyState = {
            initialized: false,
            dataLoaded: false
        };
        this.persistedState = {};
        // Restore state on construction
        this.restoreState().catch(err => {
            console.error('Failed to restore PlayerManager state:', err);
        });
    }

    isReady() {
        return this.isInitialized && 
               this.readyState.initialized &&
               this.readyState.dataLoaded;
    }

    validatePlayerPositions(progressState) {
        if (!progressState?.playerPositions) return false;
        if (!window.GameSaveManager?.START_POSITION) return false;
        
        for (const position of Object.values(progressState.playerPositions)) {
            if (!window.GameSaveManager.mainGamePath.includes(position)) {
                return false;
            }
        }
        return true;
    }

    validatePlayers(players) {
        if (!Array.isArray(players)) {
            throw new Error('Players must be an array');
        }

        if (players.length === 0) {
            throw new Error('No players provided');
        }

        const validPlayers = players.every(player => 
            player && 
            typeof player === 'object' && 
            typeof player.name === 'string' &&
            player.name.trim() !== '' &&
            typeof player.palette === 'string'
        );

        if (!validPlayers) {
            throw new Error('Invalid player data structure');
        }

        // Check for duplicate names
        const names = new Set(players.map(p => p.name));
        if (names.size !== players.length) {
            throw new Error('Duplicate player names are not allowed');
        }

        // Check for duplicate palettes
        const palettes = new Set(players.map(p => p.palette));
        if (palettes.size !== players.length) {
            throw new Error('Each player must have a unique palette');
        }
    }

    async loadState() {
        let needsUpdate = false;  
        try {
            // Step 1: Loading player data
            console.log('Step 1: Loading player data...');
            const playerData = await window.GameSaveManager.load('players');
            if (!playerData || !Array.isArray(playerData) || playerData.length === 0) {
                console.log('No saved players found');
                return false;
            }
                       
            // Step 2: Validating players
            console.log('Step 2: Validating players...');
            this.validatePlayers(playerData);
            
            // Set players array IMMEDIATELY after validation
            this.players = [...playerData];
            console.log('Player array set:', this.players);
    
            // Step 3: Load progress state
            console.log('Step 3: Loading progress state...');
            let progressState = await window.GameSaveManager.load('progressState');
            
            // Step 4: Create initial state if none exists
            if (!progressState) {
                console.log('No progress state found, creating initial state...');
                progressState = {
                    spaces: window.GameSaveManager.mainGamePath,
                    mainPath: window.GameSaveManager.mainGamePath,
                    playerPositions: Object.fromEntries(
                        this.players.map(p => [p.name, window.GameSaveManager.START_POSITION])
                    ),
                    currentPlayerIndex: 0,
                    timestamp: Date.now(),
                    rollState: {
                        hasRolled: false,
                        rolls: [],
                        rollsRequired: 0,
                        rollsCompleted: 0
                    }
                };
                
                // Save initial state
                console.log('Saving initial progress state...');
                if (!await window.GameSaveManager.save('progressState', progressState)) {
                    throw new Error('Failed to save initial progress state');
                }
                needsUpdate = true;
            }
    
            // Step 5: Verify state properties
            console.log('Step 5: Verifying state properties...');
            const requiredProps = ['spaces', 'mainPath', 'playerPositions', 'timestamp'];
            const missingProps = requiredProps.filter(prop => !(prop in progressState));
            
            if (missingProps.length > 0) {
                missingProps.forEach(prop => {
                    switch(prop) {
                        case 'spaces':
                        case 'mainPath':
                            progressState[prop] = window.GameSaveManager.mainGamePath;
                            break;
                        case 'playerPositions':
                            progressState[prop] = {};
                            break;
                        case 'timestamp':
                            progressState[prop] = Date.now();
                            break;
                    }
                });
                needsUpdate = true;
            }
    
            // Step 6: Validate player positions
            console.log('Step 6: Validating player positions...');
            if (!progressState.playerPositions || typeof progressState.playerPositions !== 'object') {
                progressState.playerPositions = {};
                needsUpdate = true;
            }
    
            // Step 7: Update player positions
            console.log('Step 7: Updating player positions...');
            const validPlayerNames = new Set(this.players.map(p => p.name));
            Object.keys(progressState.playerPositions).forEach(playerName => {
                if (!validPlayerNames.has(playerName)) {
                    delete progressState.playerPositions[playerName];
                    needsUpdate = true;
                }
            });
    
            // Step 8: Add missing players
            console.log('Step 8: Adding missing players...');
            this.players.forEach(player => {
                if (!progressState.playerPositions[player.name]) {
                    progressState.playerPositions[player.name] = window.GameSaveManager.START_POSITION;
                    needsUpdate = true;
                }
                // Validate position
                const position = progressState.playerPositions[player.name];
                if (!window.GameSaveManager.mainGamePath.includes(position)) {
                    progressState.playerPositions[player.name] = window.GameSaveManager.START_POSITION;
                    needsUpdate = true;
                }
            });
    
            // Step 9: Validate roll state
            console.log('Step 9: Validating roll state...');
            if (!progressState.rollState || typeof progressState.rollState !== 'object') {
                progressState.rollState = {
                    hasRolled: false,
                    rolls: [],
                    rollsRequired: 0,
                    rollsCompleted: 0
                };
                needsUpdate = true;
            }
    
            // Step 10: Set current player index
            console.log('Step 10: Setting player index...');
            this.currentPlayerIndex = Math.min(
                progressState.currentPlayerIndex || 0,
                Math.max(0, this.players.length - 1)
            );
    
            if (progressState.currentPlayerIndex !== this.currentPlayerIndex) {
                progressState.currentPlayerIndex = this.currentPlayerIndex;
                needsUpdate = true;
            }
    
            // Step 11: Save updates if needed
            if (needsUpdate) {
                progressState.timestamp = Date.now();
                const saveSuccess = await window.GameSaveManager.save('progressState', progressState);
                if (!saveSuccess) {
                    throw new Error('Failed to save updated progress state');
                }
            }
    
            // Step 12: Final validation
            const currentPlayer = this.getCurrentPlayer();
            if (!currentPlayer) {
                throw new Error('Invalid player state after initialization');
            }
    
            // Step 13: Set initialization flag and save manager state
            this.isInitialized = true;
            this.readyState = {
                initialized: true,
                dataLoaded: true
            };
    
            // Save manager state
            const managerState = {
                isInitialized: this.isInitialized,
                readyState: this.readyState,
                players: this.players  // IMPORTANT: Also persist players in manager state
            };
    
            await window.GameSaveManager.save('playerManagerState', managerState);
    
            return true;
    
        } catch (error) {
            console.error('PlayerManager loadState failed:', error);
            return false;
        }
    }
    
    // Helper method for player validation
    validatePlayers(players) {
        if (!Array.isArray(players)) {
            throw new Error('Players must be an array');
        }
    
        if (players.length === 0) {
            throw new Error('No players provided');
        }
    
        const validPlayers = players.every(player => 
            player && 
            typeof player === 'object' && 
            typeof player.name === 'string' &&
            player.name.trim() !== '' &&
            typeof player.palette === 'string'
        );
    
        if (!validPlayers) {
            throw new Error('Invalid player data structure');
        }
    
        // Check for duplicate names
        const names = new Set(players.map(p => p.name));
        if (names.size !== players.length) {
            throw new Error('Duplicate player names are not allowed');
        }
    
        // Check for duplicate palettes
        const palettes = new Set(players.map(p => p.palette));
        if (palettes.size !== players.length) {
            throw new Error('Each player must have a unique palette');
        }
    }

    initialize(players) {
        try {
            console.log('Initializing PlayerManager with players:', players);
    
            // Validate players
            this.validatePlayers(players);
            
            // Set players and initialized flag
            this.players = players;
            this.currentPlayerIndex = 0;
            this.isInitialized = true;

            // Save player state
            if (!window.GameSaveManager.save('players', this.players)) {
                throw new Error('Failed to save player state');
            }

            // Create initial progress state
            const progressState = {
                spaces: window.GameSaveManager.mainGamePath,
                mainPath: window.GameSaveManager.mainGamePath,
                playerPositions: {},
                currentPlayerIndex: 0,
                timestamp: Date.now()
            };

            // Initialize positions for all players at START_POSITION
            players.forEach(player => {
                progressState.playerPositions[player.name] = window.GameSaveManager.START_POSITION;
            });

            if (!window.GameSaveManager.save('progressState', progressState)) {
                throw new Error('Failed to save progress state');
            }

            console.log('Successfully initialized PlayerManager:', {
                players: this.players,
                currentIndex: this.currentPlayerIndex,
                playerPositions: progressState.playerPositions
            });

            this.notifySubscribers();
            return this.getCurrentPlayer();

        } catch (error) {
            console.error('PlayerManager initialization failed:', error);
            this.isInitialized = false;
            throw error;
        }
    }
    
    getCurrentPlayer() {
        if (!this.players || this.players.length === 0) {
          return null;
        }
        return this.players[this.currentPlayerIndex];
      }

    getPlayerCount() {
        return this.players.length;
    }

    moveToNextPlayer() {
        const finishedPlayers = window.GameSaveManager.getFinishedPlayers();
        
        // Check if all players are finished first
        if (finishedPlayers.length === this.players.length) {
          return null;
        }
        
        // Track number of attempts to prevent infinite recursion
        if (!this._moveAttempts) {
          this._moveAttempts = 0;
        }
        this._moveAttempts++;
        
        // Safety check - only try moving players.length times
        if (this._moveAttempts > this.players.length) {
          this._moveAttempts = 0;
          return null;
        }
        
        // Simply increment the index with wraparound
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        // Get the player at this new index
        const currentPlayer = this.getCurrentPlayer();
        
        // If this player is finished, move to next
        if (finishedPlayers.includes(currentPlayer.name)) {
          return this.moveToNextPlayer();
        }
        
        // Reset attempt counter when we successfully find a player
        this._moveAttempts = 0;
        return currentPlayer;
      }

    addSkipCondition(playerName, condition) {
        this.skipConditions.set(playerName, condition);
    }

    removeSkipCondition(playerName) {
        this.skipConditions.delete(playerName);
    }

    shouldSkipTurn(playerName) {
        return this.skipConditions.has(playerName);
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        // Immediately call with current state
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer) {
            callback(currentPlayer);
        }
        return () => this.unsubscribe(callback);
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers() {
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer) {
            this.subscribers.forEach(callback => {
                try {
                    callback(currentPlayer);
                } catch (error) {
                    console.error('Error in subscriber callback:', error);
                }
            });
        }
    }

    async waitUntilReady() {
        if (this.isReady()) {
            return true;
        }

        try {
            // First try to restore saved state 
            await this.loadState();
            
            // Add explicit ready state check after load
            if (this.isReady()) {
                return true;
            }

            // Set timeouts
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PlayerManager ready timeout')), 10000)
            );

            const readyCheck = new Promise((resolve) => {
                let attempts = 0;
                const check = () => {
                    if (this.isReady()) {
                        resolve(true);
                        return;
                    }
                    if (attempts++ < 50) {
                        setTimeout(check, 100); 
                    } else {
                        resolve(false);
                    }
                };
                check();
            });

            return Promise.race([readyCheck, timeout]);

        } catch (error) {
            console.error('PlayerManager ready check failed:', error);
            throw error;
        }
    }

    async restoreState() {
        try {
            const managerState = window.GameSaveManager.load('playerManagerState');
            if (managerState) {
                this.isInitialized = managerState.isInitialized;
                this.readyState = managerState.readyState;
                
                // Validate players array before setting
                if (Array.isArray(managerState.players) && managerState.players.length > 0) {
                    this.players = managerState.players;
                }
            }
            return true;
        } catch (error) {
            console.error('PlayerManager restore state failed:', error);
            return false;
        }
    }

    async handlePlayerFinish(playerName) {
        const player = this.players.find(p => p.name === playerName);
        if (!player) {
            throw new Error('Player not found');
        }

        // Simply delegate to SaveManager and handle turn progression
        const result = await window.GameSaveManager.handlePlayerFinish(playerName);
        
        if (result.success && !result.gameEnded) {
            this.moveToNextPlayer();
        }

        this.notifySubscribers();
        return result;
    }
}
// Create global instance
window.GamePlayerManager = new PlayerManager();