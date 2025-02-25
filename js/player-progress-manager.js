class PlayerProgressManager {
    constructor() {
        this.initialized = false;
        this.initializationPromise = null;
        this.subscribers = new Set();
        this.updateQueue = [];
        this.debounceTimeout = null;
        this.DEBOUNCE_TIME = 100; // ms
        
        // Temporary state management
        this.temporaryState = new Map();
        this.temporaryStateValidators = new Map();
        
        // Core validation rules
        this.setupDefaultValidators();
        
        // Safe initialization of SaveManager subscription
        if (window.GameSaveManager) {
            this.subscribeToSaveManager();
        }
    }

    setupDefaultValidators() {
        // Card validators
        this.temporaryStateValidators.set('cards', (changes) => {
            if (!Array.isArray(changes.added) || !Array.isArray(changes.removed)) {
                return { valid: false, error: 'Invalid card change format' };
            }
            return { valid: true };
        });

        // Resource validators
        this.temporaryStateValidators.set('resources', (changes) => {
            if (typeof changes.money !== 'number' || isNaN(changes.money)) {
                return { valid: false, error: 'Invalid money change' };
            }
            if (typeof changes.time !== 'number' || isNaN(changes.time)) {
                return { valid: false, error: 'Invalid time change' };
            }
            return { valid: true };
        });

        // Dice roll validators
        this.temporaryStateValidators.set('diceRolls', (changes) => {
            if (!Array.isArray(changes.rolls)) {
                return { valid: false, error: 'Invalid roll format' };
            }
            if (changes.rolls.some(roll => roll < 1 || roll > 6)) {
                return { valid: false, error: 'Invalid roll value' };
            }
            return { valid: true };
        });
    }

    subscribeToSaveManager() {
        let debounceTimer;
        window.GameSaveManager.subscribe((type) => {
            if (['players', 'progressState'].includes(type)) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.processAndSaveState().catch(error => {
                        console.error('Error processing state update:', error);
                    });
                }, this.DEBOUNCE_TIME);
            }
        });
    }

    async initialize() {
        if (this.initialized) return true;
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    async _initialize() {
        try {
            if (!window.GameSaveManager) {
                throw new Error('SaveManager not initialized');
            }

            // Verify main game path exists and is valid
            if (!Array.isArray(window.GameSaveManager.mainGamePath) || 
                window.GameSaveManager.mainGamePath.length === 0) {
                throw new Error('Main game path not properly initialized');
            }
            
            await this.processAndSaveState();
            this.initialized = true;
            this.initializationPromise = null;
            return true;

        } catch (error) {
            console.error('PlayerProgressManager: Initialization failed:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    validateProgressState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid progress state structure');
        }

        const requiredProps = ['spaces', 'mainPath', 'playerPositions', 'timestamp'];
        const missingProps = requiredProps.filter(prop => !(prop in state));
        if (missingProps.length > 0) {
            throw new Error(`Missing required properties: ${missingProps.join(', ')}`);
        }

        if (!Array.isArray(state.spaces) || state.spaces.length === 0) {
            throw new Error('Invalid or empty spaces array');
        }
        if (!Array.isArray(state.mainPath) || state.mainPath.length === 0) {
            throw new Error('Invalid or empty mainPath array');
        }
        if (typeof state.playerPositions !== 'object' || state.playerPositions === null) {
            throw new Error('Invalid playerPositions structure');
        }

        Object.entries(state.playerPositions).forEach(([player, position]) => {
            if (!state.spaces.includes(position)) {
                throw new Error(`Invalid position "${position}" found for player "${player}"`);
            }
        });

        if (typeof state.timestamp !== 'number' || isNaN(state.timestamp)) {
            throw new Error('Invalid timestamp');
        }

        return true;
    }

    async processAndSaveState() {
        try {
            // Step 1: Load and validate player data
            console.log("Step 1: Loading player data...");
            const players = await window.GameSaveManager.load('players');
            
            // Detailed player data validation
            if (!players) {
                console.log('No player data found');
                return false;
            }
    
            if (!Array.isArray(players)) {
                console.log('Player data is not an array');
                return false;
            }
    
            if (players.length === 0) {
                console.log('Player array is empty');
                return false;
            }
    
            // Validate each player object
            const validPlayers = players.every(player => 
                player && 
                typeof player === 'object' &&
                typeof player.name === 'string' &&
                typeof player.palette === 'string'
            );
    
            if (!validPlayers) {
                console.log('Invalid player data structure');
                return false;
            }
    
            // Step 2: Check for existing progress state
            console.log("Step 2: Loading progress state...");
            let progressState = window.GameSaveManager.load('progressState');
            let needsUpdate = false;
    
            // Step 3: Validate or create progress state
            console.log("Step 3: Validating progress state structure...");
            if (!progressState) {
                progressState = {
                    spaces: window.GameSaveManager.mainGamePath,
                    mainPath: window.GameSaveManager.mainGamePath,
                    playerPositions: Object.fromEntries(
                        players.map(p => [p.name, window.GameSaveManager.START_POSITION])
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
                needsUpdate = true;
                console.log("Created new progress state");
            }
    
            // Step 4: Check and fix missing properties
            const requiredProps = ['spaces', 'mainPath', 'playerPositions', 'timestamp'];
            const missingProps = requiredProps.filter(prop => !(prop in progressState));
            
            if (missingProps.length > 0) {
                console.log(`Missing required properties: ${missingProps.join(', ')}`);
                missingProps.forEach(prop => {
                    switch(prop) {
                        case 'spaces':
                        case 'mainPath':
                            progressState[prop] = window.GameSaveManager.mainGamePath;
                            break;
                        case 'playerPositions':
                            progressState[prop] = Object.fromEntries(
                                players.map(p => [p.name, window.GameSaveManager.START_POSITION])
                            );
                            break;
                        case 'timestamp':
                            progressState[prop] = Date.now();
                            break;
                    }
                });
                needsUpdate = true;
                console.log("Fixed missing properties in progress state");
            }
    
            // Step 5: Validate player positions
            console.log("Step 4: Validating player positions...");
            const currentPlayerNames = new Set(players.map(p => p.name));
            
            // Remove positions for non-existent players
            if (progressState.playerPositions) {
                Object.keys(progressState.playerPositions).forEach(playerName => {
                    if (!currentPlayerNames.has(playerName)) {
                        delete progressState.playerPositions[playerName];
                        needsUpdate = true;
                        console.log(`Removed position for non-existent player: ${playerName}`);
                    }
                });
            } else {
                progressState.playerPositions = {};
                needsUpdate = true;
            }
    
            // Add positions for new players
            players.forEach(player => {
                if (!progressState.playerPositions[player.name]) {
                    progressState.playerPositions[player.name] = window.GameSaveManager.START_POSITION;
                    needsUpdate = true;
                    console.log(`Added position for new player: ${player.name}`);
                }
            });
    
            // Step 6: Validate roll state
            console.log("Step 5: Validating roll state...");
            if (!progressState.rollState || typeof progressState.rollState !== 'object') {
                progressState.rollState = {
                    hasRolled: false,
                    rolls: [],
                    rollsRequired: 0,
                    rollsCompleted: 0
                };
                needsUpdate = true;
                console.log("Created new roll state");
            }
    
            // Step 7: Validate current player index
            console.log("Step 6: Validating current player index...");
            if (typeof progressState.currentPlayerIndex !== 'number' || 
                progressState.currentPlayerIndex >= players.length) {
                progressState.currentPlayerIndex = 0;
                needsUpdate = true;
                console.log("Reset current player index to 0");
            }
    
            // Step 8: Save if needed
            if (needsUpdate) {
                console.log("Step 7: Saving updated progress state...");
                progressState.timestamp = Date.now();
                const saveSuccess = await window.GameSaveManager.save('progressState', progressState);
                if (!saveSuccess) {
                    throw new Error('Failed to save progress state');
                }
                console.log("Successfully saved updated progress state");
            }
    
            // Step 9: Final verification
            const verifyState = window.GameSaveManager.load('progressState');
            if (!verifyState) {
                throw new Error('Failed to verify saved state');
            }
    
            console.log("State processing completed successfully");
            this.notifySubscribers(progressState);
            return true;
    
        } catch (error) {
            console.error('PlayerProgressManager: Error processing state:', error);
            this.notifyError(error);
            return false;
        }
    }
        
    validateAndUpdatePlayerPositions(progressState, players) {
        let needsUpdate = false;

        players.forEach(player => {
            if (!progressState.playerPositions[player.name]) {
                progressState.playerPositions[player.name] = progressState.mainPath[0];
                needsUpdate = true;
            }
        });

        Object.keys(progressState.playerPositions).forEach(playerName => {
            if (!players.find(p => p.name === playerName)) {
                delete progressState.playerPositions[playerName];
                needsUpdate = true;
            }
        });

        Object.entries(progressState.playerPositions).forEach(([name, position]) => {
            if (!progressState.spaces.includes(position)) {
                console.warn(`Invalid position for player ${name}, resetting to start`);
                progressState.playerPositions[name] = progressState.mainPath[0];
                needsUpdate = true;
            }
        });

        return needsUpdate;
    }

    createInitialState(players) {
        return {
            spaces: window.GameSaveManager.mainGamePath,
            mainPath: window.GameSaveManager.mainGamePath,
            playerPositions: Object.fromEntries(
                players.map(p => [p.name, window.GameSaveManager.mainGamePath[0]])
            ),
            currentPlayerIndex: 0,
            timestamp: Date.now()
        };
    }

    // Temporary State Management Methods
    createTemporaryState(playerName) {
        if (!playerName) {
            throw new Error('Player name required');
        }

        const baseState = {
            cards: { added: [], removed: [] },
            resources: { money: 0, time: 0 },
            diceRolls: { rolls: [], outcomes: [] },
            timestamp: Date.now()
        };

        this.temporaryState.set(playerName, baseState);
        return baseState;
    }

    getTemporaryState(playerName) {
        return this.temporaryState.get(playerName) || this.createTemporaryState(playerName);
    }

    async updateTemporaryState(playerName, stateType, changes) {
        try {
            const currentState = this.getTemporaryState(playerName);
            const validator = this.temporaryStateValidators.get(stateType);

            if (!validator) {
                throw new Error(`No validator found for state type: ${stateType}`);
            }

            const validation = validator(changes);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const updatedState = {
                ...currentState,
                [stateType]: this.mergeStateChanges(currentState[stateType], changes),
                timestamp: Date.now()
            };

            this.temporaryState.set(playerName, updatedState);
            
            this.notifySubscribers({
                type: 'temporaryStateUpdate',
                playerName,
                stateType,
                state: updatedState
            });

            return true;
        } catch (error) {
            console.error('Failed to update temporary state:', error);
            return false;
        }
    }

    mergeStateChanges(currentState, changes) {
        const merged = JSON.parse(JSON.stringify(currentState));
        
        Object.entries(changes).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                merged[key] = [...(merged[key] || []), ...value];
            } else if (typeof value === 'object') {
                merged[key] = this.mergeStateChanges(merged[key] || {}, value);
            } else {
                merged[key] = value;
            }
        });

        return merged;
    }

    async commitTemporaryState(playerName) {
        try {
            const tempState = this.getTemporaryState(playerName);
            if (!tempState) {
                throw new Error('No temporary state found to commit');
            }

            const progressState = window.GameSaveManager.load('progressState');
            if (!progressState) {
                throw new Error('No progress state found');
            }

            const updatedState = this.applyStateChanges(progressState, playerName, tempState);
            
            const saveSuccess = window.GameSaveManager.save('progressState', updatedState);
            if (!saveSuccess) {
                throw new Error('Failed to save committed state');
            }

            this.clearTemporaryState(playerName);
            
            return true;
        } catch (error) {
            console.error('Failed to commit temporary state:', error);
            return false;
        }
    }

    applyStateChanges(progressState, playerName, tempState) {
        const updated = JSON.parse(JSON.stringify(progressState));

        if (!updated.playerStates) {
            updated.playerStates = {};
        }
        if (!updated.playerStates[playerName]) {
            updated.playerStates[playerName] = {
                cards: [],
                resources: { money: 0, time: 0 }
            };
        }

        const playerState = updated.playerStates[playerName];
        playerState.cards = [
            ...playerState.cards.filter(card => !tempState.cards.removed.includes(card)),
            ...tempState.cards.added
        ];

        playerState.resources.money += tempState.resources.money;
        playerState.resources.time += tempState.resources.time;

        if (tempState.diceRolls.rolls.length > 0) {
            updated.rollState = {
                ...updated.rollState,
                rolls: [...(updated.rollState?.rolls || []), ...tempState.diceRolls.rolls],
                outcomes: [...(updated.rollState?.outcomes || []), ...tempState.diceRolls.outcomes]
            };
        }

        return updated;
    }

    clearTemporaryState(playerName) {
        this.temporaryState.delete(playerName);
        this.notifySubscribers({
            type: 'temporaryStateCleared',
            playerName
        });
    }

    getPlayerPosition(playerName) {
        try {
            if (!playerName || typeof playerName !== 'string') {
                throw new Error('Invalid player name');
            }

            const progressState = window.GameSaveManager?.load('progressState');
            if (!progressState?.playerPositions) {
                throw new Error('Invalid progress state');
            }

            const position = progressState.playerPositions[playerName];
            if (!position) {
                throw new Error(`Position not found for player: ${playerName}`);
            }

            return position;
        } catch (error) {
            console.error('Error getting player position:', error);
            return null;
        }
    }

    async updatePlayerPosition(playerName, newPosition) {
        try {
            if (!playerName || !newPosition) {
                throw new Error('Invalid parameters for position update');
            }

            // Load current state
            const progressState = window.GameSaveManager.load('progressState');
            if (!progressState) {
                throw new Error('No progress state found');
            }

            // Get current position
            const currentPosition = progressState.playerPositions[playerName];
            
            // Important: Get available moves for validation
            const validMoves = window.GameDataManager.getAvailableMovesForSpace(currentPosition);
            console.log('Valid moves for position update:', {
                from: currentPosition,
                to: newPosition,
                available: validMoves
            });

            // Validate through GameDataManager
            if (!validMoves.includes(newPosition)) {
                throw new Error(`Invalid move from ${currentPosition} to ${newPosition}`);
            }

            // Update position 
            progressState.playerPositions[playerName] = newPosition;
            progressState.timestamp = Date.now();

            // Save updated state
            const saveSuccess = window.GameSaveManager.save('progressState', progressState);
            if (!saveSuccess) {
                throw new Error('Failed to save updated position');
            }

            return true;

        } catch (error) {
            console.error('Error updating player position:', error);
            return false;
        }
    }

    getAvailableMoves(playerName) {
        try {
            // Step 1: Basic validation
            if (!playerName || window.GameSaveManager?.isPlayerFinished(playerName)) {
                return [];
            }
    
            // Step 2: Get current position
            const currentPosition = this.getPlayerPosition(playerName);
            if (!currentPosition || currentPosition === 'FINISH') {
                return [];
            }
    
            // Step 3: Handle dice roll states first
            const progressState = window.GameSaveManager?.load('progressState');
            if (progressState?.rollState?.hasRolled) {
                const diceData = window.GameDataManager.getDiceRollData(
                    currentPosition, 
                    progressState.rollState.rolls[0]
                );
                if (diceData) {
                    const rollNumber = progressState.rollState.rolls[0];
                    const nextSpace = diceData[rollNumber.toString()];
                    return nextSpace ? [nextSpace] : [];
                }
            }
    
            // Step 4: Get moves from GameDataManager
            const availableMoves = window.GameDataManager.getAvailableMovesForSpace(currentPosition);
            console.log(`Raw available moves for ${currentPosition}:`, availableMoves);
    
            // Step 5: Get all valid spaces (main path + branches)
            const validSpaces = window.GameDataManager.getAllValidSpaces();
    
            // Step 6: Filter and validate moves
            const validMoves = availableMoves.filter(move => {
                // Move must be in valid spaces set
                if (!validSpaces.has(move)) {
                    console.log(`Filtering out ${move} - not in valid spaces`);
                    return false;
                }
    
                // Must be a valid move sequence
                const isValid = window.GameDataManager.validateMoveSequence(currentPosition, move);
                if (!isValid) {
                    console.log(`Filtering out ${move} - invalid sequence`);
                }
                return isValid;
            });
    
            console.log(`Final valid moves for ${currentPosition}:`, validMoves);
            return validMoves;
    
        } catch (error) {
            console.error('Error getting available moves:', error);
            return [];
        }
    }

    isValidMove(playerName, targetSpace) {
        try {
            if (!playerName || !targetSpace) {
                console.log('Invalid move: Missing player or target space');
                return false;
            }
    
            // Check if player is finished
            if (window.GameSaveManager?.isPlayerFinished(playerName)) {
                console.log(`Invalid move: Player ${playerName} has finished`);
                return false;
            }
    
            // Get current position
            const currentPosition = this.getPlayerPosition(playerName);
            if (!currentPosition || currentPosition === 'FINISH') {
                console.log('Invalid move: No current position or at FINISH');
                return false;
            }
    
            // Check if target space is valid
            const validSpaces = window.GameDataManager.getAllValidSpaces();
            if (!validSpaces.has(targetSpace)) {
                console.log(`Invalid move: ${targetSpace} is not a valid space`);
                return false;
            }
    
            console.log(`Validating move from ${currentPosition} to ${targetSpace}`);
            const isValid = window.GameDataManager.validateMoveSequence(currentPosition, targetSpace);
            console.log(`Move validation result: ${isValid}`);
            
            return isValid;
    
        } catch (error) {
            console.error('Error checking move validity:', error);
            return false;
        }
    }

    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Subscriber callback must be a function');
        }
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers(state) {
        this.subscribers.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });
    }

    notifyError(error) {
        this.subscribers.forEach(callback => {
            try {
                callback(null, error);
            } catch (callbackError) {
                console.error('Error in error callback:', callbackError);
            }
        });
    }

    isInitialized() {
        return this.initialized;
    }

    async waitUntilReady() {
        if (this.initialized) return true;
        return this.initialize();
    }

    destroy() {
        this.subscribers.clear();
        clearTimeout(this.debounceTimeout);
        this.initialized = false;
        this.initializationPromise = null;
        this.temporaryState.clear();
    }
}

// Create global instance with error handling
try {
    window.PlayerProgressManager = new PlayerProgressManager();
} catch (error) {
    console.error('Failed to initialize PlayerProgressManager:', error);
    // Provide basic fallback
    window.PlayerProgressManager = {
        initialize: async () => false,
        getPlayerPosition: () => null,
        updatePlayerPosition: () => false,
        getAvailableMoves: () => [],
        isValidMove: () => false,
        subscribe: () => () => {},
        unsubscribe: () => {},
        isInitialized: () => false,
        waitUntilReady: async () => false
    };
}