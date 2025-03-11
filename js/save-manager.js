class SaveManager {
    constructor() {
        this.VERSION = '1.2';
        this.PREFIX = 'game_';
        this.START_POSITION = 'OWNER-SCOPE-INITIATION';
        this.subscribers = new Set();
        this.cache = new Map();
        this.dataTypes = new Set([
            'players',
            'scores',
            'spaces',
            'diceRoll',
            'progressState',
            'visitHistory',
            'playerCards',
            'cardHistory'
        ]);
        // Define validation schemas for each data type
        this.validationSchemas = {
            players: (data) => {
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('Players must be a non-empty array');
                }
                data.forEach(player => {
                    if (!player.name || typeof player.name !== 'string') {
                        throw new Error('Each player must have a valid name');
                    }
                    if (!player.palette || typeof player.palette !== 'string') {
                        throw new Error('Each player must have a valid palette');
                    }
                });
                return true;
            },
            progressState: (data) => {
                return this.validateProgressState(data);
            },
            visitHistory: (data) => {
                if (!data || typeof data !== 'object') {
                    throw new Error('Visit history must be an object');
                }
                Object.entries(data).forEach(([key, value]) => {
                    if (typeof value !== 'number' || value < 0) {
                        throw new Error('Visit counts must be non-negative numbers');
                    }
                });
                return true;
            }
        };
        this.isLoading = {};
        this.loadRetries = {};
        this.MAX_RETRIES = 3;
        this.debounceTimers = {};
        this.setupStorageListener();

        // Define the main game path centrally
        this.mainGamePath = [
            'OWNER-SCOPE-INITIATION',
            'OWNER-FUND-INITIATION',
            'PM-DECISION-CHECK',
            'ARCH-INITIATION',
            'ARCH-FEE-REVIEW',
            'ARCH-SCOPE-CHECK',
            'ENG-INITIATION',
            'ENG-FEE-REVIEW',
            'ENG-SCOPE-CHECK',
            'REG-DOB-FEE-REVIEW',
            'REG-DOB-TYPE-SELECT',
            'REG-DOB-PLAN-EXAM',
            'REG-FDNY-FEE-REVIEW',
            'REG-FDNY-PLAN EXAM',
            'CON-INITIATION',
            'CON-ISSUES',
            'CON-INSPECT',
            'REG-DOB-FINAL-REVIEW',
            'FINISH'
        ];

        // Define validation schemas for each data type
        this.validationSchemas = {
            players: (data) => {
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('Players must be a non-empty array');
                }
                data.forEach(player => {
                    if (!player.name || typeof player.name !== 'string') {
                        throw new Error('Each player must have a valid name');
                    }
                    if (!player.palette || typeof player.palette !== 'string') {
                        throw new Error('Each player must have a valid palette');
                    }
                });
                return true;
            },
            progressState: (data) => {
                return this.validateProgressState(data);
            },
            visitHistory: (data) => {
                if (!data || typeof data !== 'object') {
                    throw new Error('Visit history must be an object');
                }
                Object.entries(data).forEach(([key, value]) => {
                    if (typeof value !== 'number' || value < 0) {
                        throw new Error('Visit counts must be non-negative numbers');
                    }
                    
                });
                return true;
            },

            finishedPlayers: (data) => {
                if (!Array.isArray(data)) {
                    throw new Error('Finished players must be an array');
                }
                data.forEach(player => {
                    if (typeof player !== 'string' || player.trim() === '') {
                        throw new Error('Invalid player name in finished players');
                    }
                });
                return true;
            }
        };

        // Initialize
        this.cleanupOldVersions();
        this.initializeCache();
        this.dataTypes.add('finishedPlayers');
        
        // Add card validation schema
        this.validationSchemas['playerCards'] = (data) => this.validatePlayerCards(data);
    }

    // Initialize cache with existing data
    initializeCache() {
        try {
            this.getAllKeys().forEach(key => {
                const savedItem = localStorage.getItem(key);
                if (savedItem) {
                    const parsed = JSON.parse(savedItem);
                    const type = parsed.type;
                    if (type) {
                        this.cache.set(type, parsed.data);
                    }
                }
            });
        } catch (error) {
            console.error('Cache initialization failed:', error);
        }
    }

    serializeForStorage(type, data) {
        try {
            // First ensure we're working with raw data
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    // If it's not valid JSON, use as is
                }
            }
    
            // Handle circular references and create clean object
            const cleanData = {
                timestamp: Date.now(),
                version: this.VERSION,
                type: type,
                data: this.cleanObjectForStorage(data)
            };
    
            return JSON.stringify(cleanData);
        } catch (error) {
            console.error('Serialization error:', error);
            throw new Error('Unable to serialize data for storage');
        }
    }
    
    // Add this helper method to clean objects for storage
    cleanObjectForStorage(obj) {
        if (!obj) return obj;
        
        try {
            // Handle Date objects
            if (obj instanceof Date) {
                return obj.toISOString();
            }
            
            // Handle arrays
            if (Array.isArray(obj)) {
                return obj.map(item => this.cleanObjectForStorage(item));
            }
            
            // Handle plain objects
            if (typeof obj === 'object') {
                const cleaned = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (value !== undefined && value !== null) {
                        cleaned[key] = this.cleanObjectForStorage(value);
                    }
                }
                return cleaned;
            }
            
            return obj;
        } catch (error) {
            console.error('Error cleaning object for storage:', error);
            return null;
        }
    }

    async save(type, data) {
        try {
            console.log(`SaveManager: Starting save for ${type}`, data);
    
            // Basic validation
            if (!type || data === undefined) {
                throw new Error('Invalid save parameters');
            }
    
            // Update caches first
            this.cache.set(type, data);
            console.log(`SaveManager: Updated caches for ${type}`);
    
            // Prepare save data
            const saveData = {
                timestamp: Date.now(),
                version: this.VERSION,
                type: type,
                data: data
            };
    
            // Log data being stored
            console.log(`SaveManager: Preparing to store data for ${type}:`, saveData);
    
            // Save to localStorage with detailed error handling
            const key = this.getKey(type);
            try {
                const serialized = JSON.stringify(saveData);
                localStorage.setItem(key, serialized);
                console.log(`SaveManager: Successfully stored ${type} in localStorage`);
            } catch (storageError) {
                console.error(`SaveManager: Storage error for ${type}:`, storageError);
                throw storageError;
            }
    
            // Verify save worked
            const verifyData = localStorage.getItem(key);
            if (!verifyData) {
                throw new Error('Save verification failed - data not found');
            }
            console.log(`SaveManager: Verified save for ${type}`);
    
            // Notify subscribers
            this.notifySubscribers(type);
            return true;
    
        } catch (error) {
            console.error(`SaveManager: Save failed for ${type}:`, error);
            
            // Clean up caches on error
            this.cache.delete(type);
            this.stateCache.delete(type);
            return false;
        }
    }

    // Enhanced storage event handler
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (!event.key || !event.key.startsWith(this.PREFIX)) return;
            
            try {
                if (!event.newValue) {
                    console.log(`SaveManager: Key removed from storage: ${event.key}`);
                    const type = this.getTypeFromKey(event.key);
                    this.cache.delete(type);
                    this.notifySubscribers(type);
                    return;
                }
    
                // Safely parse the storage event value
                let savedData;
                try {
                    // Only parse if it's a string
                    savedData = typeof event.newValue === 'string' ? 
                        JSON.parse(event.newValue) : 
                        event.newValue;
                } catch (parseError) {
                    console.warn(`SaveManager: Parse error for ${event.key}:`, parseError);
                    return;
                }
    
                // Validate the data structure
                if (!this.validateStorageData(savedData)) {
                    console.warn(`SaveManager: Invalid data structure for ${event.key}`);
                    return;
                }
    
                // Update caches
                if (savedData.type) {
                    this.cache.set(savedData.type, savedData.data);
                    this.notifySubscribers(savedData.type);
                }
    
            } catch (error) {
                console.error(`SaveManager: Storage event error for ${event.key}:`, error);
            }
        });
    }

    // Helper method for handling storage errors
    handleStorageError(key, error) {
        try {
            // Remove problematic data
            localStorage.removeItem(key);
            this.cache.delete(this.getTypeFromKey(key));
            console.log(`SaveManager: Cleaned up problematic storage for key ${key}`);
        } catch (cleanupError) {
            console.error(`SaveManager: Failed to cleanup after storage error:`, cleanupError);
        }
    }

    // Add helper to extract type from storage key
    getTypeFromKey(key) {
        // Extract type from storage key
        const match = key.match(new RegExp(`${this.PREFIX}(.+)_v${this.VERSION}`));
        return match ? match[1] : null;
    }

    transformForStorage(data) {
        if (!data) return data;
        
        // Handle Date objects
        if (data instanceof Date) {
            return data.toISOString();
        }
        
        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this.transformForStorage(item));
        }
        
        // Handle plain objects
        if (typeof data === 'object') {
            const transformed = {};
            for (const [key, value] of Object.entries(data)) {
                transformed[key] = this.transformForStorage(value);
            }
            return transformed;
        }
        
        return data;
    }

    // Add a verification method for saved data
    verifyStoredData(key) {
        try {
            const savedData = localStorage.getItem(key);
            if (!savedData) return false;
            
            // Verify data can be parsed
            const parsed = JSON.parse(savedData);
            return typeof parsed === 'object' && parsed !== null;
        } catch (error) {
            console.error(`Data verification failed for ${key}:`, error);
            return false;
        }
    }

    // Load data with validation and error recovery
    load(type) {
        try {
            console.log(`SaveManager: Starting load for ${type}`);
    
            // First check cache
            if (this.cache && this.cache.has(type)) {
                console.log(`SaveManager: Using cached data for ${type}`);
                return this.cache.get(type);
            }
    
            // Load from localStorage
            const key = this.getKey(type);
            const savedItem = localStorage.getItem(key);
                                
            if (!savedItem) {
                console.log(`SaveManager: No data found for ${type}`);
                return null;
            }
    
            // Parse saved data with error handling
            let saveData;
            try {
                saveData = JSON.parse(savedItem);
                console.log(`SaveManager: Validation passed/failed for ${type}`);
            } catch (parseError) {
                console.error(`SaveManager: Parse error for ${type}:`, parseError);
                return null;
            }
    
            // Validate structure
            if (!saveData || typeof saveData !== 'object') {
                console.error(`SaveManager: Invalid data structure for ${type}`);
                return null;
            }
    
            // Version check
            if (saveData.version !== this.VERSION) {
                console.warn(`SaveManager: Version mismatch for ${type} (saved: ${saveData.version}, current: ${this.VERSION})`);
            }
    
            // Type validation
            if (this.validationSchemas[type]) {
                try {
                    this.validationSchemas[type](saveData.data);
                    console.log(`SaveManager: Validation passed for ${type}`);
                } catch (validationError) {
                    console.error(`SaveManager: Validation failed for ${type}:`, validationError);
                    return null;
                }
            }
    
            // Update cache
            if (this.cache) {
                this.cache.set(type, saveData.data);
            }
    
            return saveData.data;
    
        } catch (error) {
            console.error(`SaveManager: Load failed for ${type}:`, error);
            return null;
        }
    }

    clearLoadState(type) {
        delete this.isLoading[type];
        delete this.loadRetries[type];
        if (this.debounceTimers[type]) {
            clearTimeout(this.debounceTimers[type]);
            delete this.debounceTimers[type];
        }
    }

    // Validate player cards structure
validatePlayerCards(playerCards) {
    if (!playerCards || typeof playerCards !== 'object') {
        throw new Error('Invalid player cards structure');
    }
    
    // Check each player's card collection
    Object.entries(playerCards).forEach(([playerName, cards]) => {
        if (!cards || typeof cards !== 'object') {
            throw new Error(`Invalid card collection for player ${playerName}`);
        }
        
        // Check each card type
        ['B', 'I', 'W', 'L', 'E'].forEach(cardType => {
            if (!Array.isArray(cards[cardType])) {
                throw new Error(`Invalid ${cardType} cards for player ${playerName}`);
            }
        });
    });
    
    return true;
}

// Validate progress state structure
validateProgressState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid progress state structure');
        }
    
        // First check if gameEnded exists
        if (typeof state.gameEnded !== 'boolean') {
            state.gameEnded = false;
        }
    
        // Check required properties
        const requiredProps = ['spaces', 'mainPath', 'playerPositions', 'timestamp'];
        const missingProps = requiredProps.filter(prop => !(prop in state));
        if (missingProps.length > 0) {
            throw new Error(`Missing required properties: ${missingProps.join(', ')}`);
        }
    
        // Get all valid spaces including branches
        let validSpaces = new Set(this.mainGamePath);
        if (window.GameDataManager?.isReady()) {
            const allSpaces = window.GameDataManager.getAllValidSpaces();
            allSpaces.forEach(space => validSpaces.add(space));
        }
    
        // Validate arrays
        if (!Array.isArray(state.spaces) || !Array.isArray(state.mainPath)) {
            throw new Error('Invalid spaces or mainPath format');
        }
        
        if (state.spaces.length === 0 || state.mainPath.length === 0) {
            throw new Error('Empty spaces or mainPath');
        }
    
        // Enhanced position validation using both spaces and validSpaces
        Object.entries(state.playerPositions).forEach(([player, position]) => {
            // First check if position is in state spaces (backward compatibility)
            if (!state.spaces.includes(position)) {
                throw new Error(`Invalid position "${position}" for player "${player}"`);
            }
            
            // Then check against our expanded validSpaces set
            if (!validSpaces.has(position)) {
                throw new Error(`Invalid game position "${position}" for player "${player}"`);
            }
    
            // Keep existing validation for main path and special cases
            if (!this.isValidGamePosition(position)) {
                throw new Error(`Invalid game position: ${position}`);
            }
        });
    
        return true;
    }

    // Validate game position
    // In SaveManager class

/**
 * Initialize player card collections
 * @param {Array} players - Player array
 * @returns {Promise<boolean>} Success status
 */
async initializePlayerCards(players) {
    if (!Array.isArray(players) || players.length === 0) {
        throw new Error('Invalid player data for card initialization');
    }
    
    // Create empty card collections for each player
    const playerCards = {};
    
    players.forEach(player => {
        playerCards[player.name] = {
            B: [], // Bank/Funding cards
            I: [], // Investment cards
            W: [], // Work/scope cards
            L: [], // Life event cards
            E: []  // Expert help cards
        };
    });
    
    // Save card collections
    const saveSuccess = await this.save('playerCards', playerCards);
    
    // Initialize card history
    await this.save('cardHistory', {
        drawn: {},
        played: {},
        discarded: {}
    });
    
    return saveSuccess;
}

async createInitialProgressState(players) {
    if (!Array.isArray(players) || players.length === 0) {
        throw new Error('Invalid player data for initial state');
    }

    // Reset visit history for new game
    await this.save('visitHistory', {});
    
    // Initialize finished players set
    await this.save('finishedPlayers', []);

    await this.save('scores', Object.fromEntries(
        players.map(p => [p.name, 0])
    ));

    // Get ALL valid spaces including branch paths
    let allSpaces = [...this.mainGamePath];
    if (window.GameDataManager?.isReady()) {
        const validSpaces = window.GameDataManager.getAllValidSpaces();
        allSpaces = Array.from(new Set([...allSpaces, ...validSpaces]));
    }
    
    const state = {
        spaces: allSpaces,  // Now includes both main path and branch paths
        mainPath: this.mainGamePath,
        playerPositions: Object.fromEntries(
            players.map(p => [p.name, this.START_POSITION])
        ),
        currentPlayerIndex: 0,
        timestamp: Date.now(),
        gameEnded: false,
        rollState: {
            hasRolled: false,
            rolls: [],
            rollsRequired: this.getRollsRequired(this.START_POSITION),
            rollsCompleted: 0
        }
    };

    // Save immediately
    await this.save('progressState', state);

    return state;
}

// Update validation to handle branch paths
validateProgressState(state) {
    if (!state || typeof state !== 'object') {
        throw new Error('Invalid progress state structure');
    }

    // First check if gameEnded exists
    if (typeof state.gameEnded !== 'boolean') {
        state.gameEnded = false;
    }

    // Check required properties
    const requiredProps = ['spaces', 'mainPath', 'playerPositions', 'timestamp'];
    const missingProps = requiredProps.filter(prop => !(prop in state));
    if (missingProps.length > 0) {
        throw new Error(`Missing required properties: ${missingProps.join(', ')}`);
    }

    // Get all valid spaces including branches
    let validSpaces = new Set(this.mainGamePath);
    if (window.GameDataManager?.isReady()) {
        const allSpaces = window.GameDataManager.getAllValidSpaces();
        allSpaces.forEach(space => validSpaces.add(space));
    }

    // Validate arrays
    if (!Array.isArray(state.spaces) || !Array.isArray(state.mainPath)) {
        throw new Error('Invalid spaces or mainPath format');
    }
    
    if (state.spaces.length === 0 || state.mainPath.length === 0) {
        throw new Error('Empty spaces or mainPath');
    }

    // Enhanced position validation using both spaces and validSpaces
    Object.entries(state.playerPositions).forEach(([player, position]) => {
        // First check if position is in state spaces (backward compatibility)
        if (!state.spaces.includes(position)) {
            throw new Error(`Invalid position "${position}" for player "${player}"`);
        }
        
        // Then check against our expanded validSpaces set
        if (!validSpaces.has(position)) {
            throw new Error(`Invalid game position "${position}" for player "${player}"`);
        }

        // Keep existing validation for main path and special cases
        if (!this.isValidGamePosition(position)) {
            throw new Error(`Invalid game position: ${position}`);
        }
    });

    return true;
}

// Update isValidGamePosition to use GameDataManager for validation
isValidGamePosition(position, currentPosition = null) {
    // Always valid if in main path
    if (this.mainGamePath.includes(position)) return true;

    // If GameDataManager is ready, check branch paths
    if (window.GameDataManager?.isReady()) {
        const validSpaces = window.GameDataManager.getAllValidSpaces();
        if (validSpaces.has(position)) {
            // If we have a current position, validate the move sequence
            if (currentPosition) {
                return window.GameDataManager.validateMoveSequence(currentPosition, position);
            }
            return true;
        }
    }

    return false;
}

    // Data validation method with backwards compatibility
    validateData(type, data) {
        try {
            // If we have a validation schema, use it
            if (this.validationSchemas[type]) {
                return this.validationSchemas[type](data);
            }

            // Basic validation for types without schemas
            if (!data) {
                return false;
            }

            // Type-specific basic validation for backwards compatibility
            switch(type) {
                case 'spaces':
                case 'diceRoll':
                    return Array.isArray(data) && data.length > 0;
                case 'scores':
                    return typeof data === 'object' && data !== null;
                default:
                    return true;
            }
        } catch (error) {
            console.error(`Validation failed for ${type}:`, error);
            return false;
        }
    }

    validateStorageData(data) {
        return (
            data &&
            typeof data === 'object' &&
            typeof data.timestamp === 'number' &&
            typeof data.version === 'string' &&
            typeof data.type === 'string' &&
            data.data !== undefined
        );
    }
    
    async verify() {
        console.log('SaveManager: Starting verification process');
        const results = {
            success: true,
            errors: [],
            verified: [],
            isNewGame: this.isNewGame()
        };
    
        try {
            // Wait for GameManager to be ready
            if (window.GameDataManager && !window.GameDataManager.isReady()) {
                console.log('SaveManager: Waiting for GameDataManager to be ready');
                await window.GameDataManager.waitUntilReady();
            }
            console.log('SaveManager: GameDataManager ready');
    
            // Check player data
            const playerData = await this.load('players');
            console.log('SaveManager: Verifying player data:', playerData);
            
            if (!playerData || !Array.isArray(playerData) || playerData.length === 0) {
                throw new Error('No valid player data found');
            }
            
            results.verified.push('players');
            console.log('SaveManager: Player data verified');
    
            // Verify progress state
            const progressState = await this.load('progressState');
            console.log('SaveManager: Checking progress state');
            if (progressState) {
                try {
                    await this.validateProgressState(progressState);
                    results.verified.push('progressState');
                    console.log('SaveManager: Progress state verified');
                } catch (error) {
                    results.errors.push(`Invalid progress state: ${error.message}`);
                    results.success = false;
                }
            }
    
            // Verify game data
            console.log('SaveManager: Checking game data');
            if (window.GameDataManager?.csvData) {
                const { spaces, diceRoll } = window.GameDataManager.csvData;
                if (!spaces || !diceRoll) {
                    results.errors.push('Required game data not loaded');
                    results.success = false;
                } else {
                    results.verified.push('spaces', 'diceRoll');
                    console.log('SaveManager: Game data verified');
                }
            }
    
            console.log('SaveManager: Verification complete, results:', results);
            return results;
    
        } catch (error) {
            console.error('SaveManager: Verification error:', error);
            results.errors.push(error.message);
            results.success = false;
            return results;
        }
    }

    async verifyRequiredData() {
        const required = ['players', 'spaces', 'diceRoll', 'progressState'];
        const missing = [];
        const found = [];

        for (const type of required) {
            const data = this.load(type);
            if (!data || !this.validateData(type, data)) {
                missing.push(type);
            } else {
                found.push(type);
            }
        }

        return {
            success: missing.length === 0,
            missing,
            found
        };
    }

    // Handle storage quota exceeded
    handleStorageQuotaExceeded() {
        // Clear non-essential data
        const nonEssentialTypes = ['visitHistory', 'scores'];
        nonEssentialTypes.forEach(type => {
            const key = this.getKey(type);
            localStorage.removeItem(key);
            this.cache.delete(type);
        });
    }

    // Handle version mismatches
    handleVersionMismatch(saveData, type) {
        console.warn(`Version mismatch for ${type}: saved=${saveData.version}, current=${this.VERSION}`);
        return saveData.data;
    }

    // Create initial progress state
    async createInitialProgressState(players) {
        if (!Array.isArray(players) || players.length === 0) {
            throw new Error('Invalid player data for initial state');
        }
    
        // Reset visit history for new game
        await this.save('visitHistory', {});
        
        // Initialize player card collections
        await this.initializePlayerCards(players);
        
        // Initialize finished players set
        await this.save('finishedPlayers', []);
    
        await this.save('scores', Object.fromEntries(
            players.map(p => [p.name, 0])
        ));
    
        // Get ALL valid spaces including branch paths
        let allSpaces = [...this.mainGamePath];
        if (window.GameDataManager?.isReady()) {
            const validSpaces = window.GameDataManager.getAllValidSpaces();
            allSpaces = Array.from(new Set([...allSpaces, ...validSpaces]));
        }
        
        const state = {
            spaces: allSpaces,  // Now includes both main path and branch paths
            mainPath: this.mainGamePath,
            playerPositions: Object.fromEntries(
                players.map(p => [p.name, this.START_POSITION])
            ),
            currentPlayerIndex: 0,
            timestamp: Date.now(),
            gameEnded: false,
            rollState: {
                hasRolled: false,
                rolls: [],
                rollsRequired: this.getRollsRequired(this.START_POSITION),
                rollsCompleted: 0
            }
        };
    
        // Save immediately
        await this.save('progressState', state);
    
        return state;
    }

    // Attempt to recover corrupted data
    async attemptDataRecovery(type) {
        try {
            switch(type) {
                case 'progressState':
                    const playerData = this.load('players');
                    if (playerData) {
                        const initialProgress = this.createInitialProgressState(playerData);
                        return this.save('progressState', initialProgress);
                    }
                    return false;
    
                case 'spaces':
                case 'diceRoll':
                    // Use proper GameDataManager initialization
                    if (window.GameDataManager?.isReady()) {
                        // GameDataManager already has the data loaded
                        return true;
                    } else if (window.GameDataManager) {
                        // Initialize GameDataManager if not ready
                        const initResult = await window.GameDataManager.initialize();
                        return initResult.success;
                    }
                    return false;
    
                case 'visitHistory':
                    return this.save('visitHistory', {});
    
                default:
                    return false;
            }
        } catch (error) {
            console.error(`Recovery failed for ${type}:`, error);
            return false;
        }
    }

    // Roll state management
    getRollsRequired(spaceName) {
        // Special case for construction initialization which requires 2 rolls
        if (spaceName === 'CON-INITIATION') {
            return 2;
        }
        
        // Check if space has any dice rolls defined
        const diceRollData = window.GameDataManager?.csvData?.diceRoll;
        if (!diceRollData) return 0;

        const hasRolls = diceRollData.some(roll => roll['Space Name'] === spaceName);
        return hasRolls ? 1 : 0;
    }

    // Update roll state with validation
    updateRollState(roll) {
        try {
            // Validate roll value
            if (typeof roll !== 'number' || roll < 1 || roll > 6) {
                throw new Error('Invalid roll value');
            }

            const progressState = this.load('progressState');
            if (!progressState) {
                throw new Error('No progress state found');
            }

            if (!progressState.rollState) {
                progressState.rollState = {
                    hasRolled: false,
                    rolls: [],
                    rollsRequired: 0,
                    rollsCompleted: 0
                };
            }

            // Update roll state
            progressState.rollState.rolls.push(roll);
            progressState.rollState.rollsCompleted++;
            progressState.rollState.hasRolled = 
                progressState.rollState.rollsCompleted >= progressState.rollState.rollsRequired;

            // Save updated state
            return this.save('progressState', progressState);
        } catch (error) {
            console.error('Failed to update roll state:', error);
            return false;
        }
    }

    // Check if this is a new game
    isNewGame() {
        try {
            const savedKeys = this.getAllKeys();
            const requiredKeys = ['players', 'progressState'].map(type => this.getKey(type));
            return !requiredKeys.every(key => savedKeys.includes(key));
        } catch (error) {
            console.error('Error checking game state:', error);
            return true; // Safer to assume new game on error
        }
    }

    // Get storage key with prefix and version
    getKey(type) {
        return `${this.PREFIX}${type}_v${this.VERSION}`;
    }
    
    // Get all saved game keys
    getAllKeys() {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.PREFIX)) {
                    keys.push(key);
                }
            }
            return keys;
        } catch (error) {
            console.error('Error getting storage keys:', error);
            return [];
        }
    }

    // Clean up old version data
    cleanupOldVersions() {
        try {
            const oldKeys = this.getAllKeys().filter(key => {
                const version = key.split('_v').pop();
                return version !== this.VERSION;
            });
            oldKeys.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.error(`Failed to remove old key ${key}:`, error);
                }
            });
        } catch (error) {
            console.error('Error cleaning up old versions:', error);
        }
    }

    // Clear specific data type
    clear(type) {
        try {
            const key = this.getKey(type);
            localStorage.removeItem(key);
            this.cache.delete(type);
            this.clearLoadState(type);
            this.notifySubscribers(type);
            return true;
        } catch (error) {
            console.error(`Failed to clear ${type}:`, error);
            return false;
        }
    }

    // Clear all game data
    clearAll() {
        try {
            this.getAllKeys().forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.error(`Failed to remove key ${key}:`, error);
                }
            });
            this.cache.clear();
            this.notifySubscribers('all');
            return true;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            return false;
        }
    }

    // Subscribe to state changes
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Subscriber callback must be a function');
        }
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }
    
    // Unsubscribe from state changes
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }
    
    // Notify subscribers of state changes
    notifySubscribers(type) {
        // Clear existing timer
        if (this.debounceTimers[type]) {
            clearTimeout(this.debounceTimers[type]);
        }

        // Debounce notification
        this.debounceTimers[type] = setTimeout(() => {
            this.subscribers.forEach(callback => {
                try {
                    callback(type);
                } catch (error) {
                    console.error('Error in subscriber callback:', error);
                }
            });
        }, 100);
    }

    // Get visit count for player at space
    getVisitCount(playerName, spaceName) {
        try {
            const visitHistory = this.load('visitHistory') || {};
            return visitHistory[`${playerName}-${spaceName}`] || 0;
        } catch (error) {
            console.error('Error getting visit count:', error);
            return 0;
        }
    }

    // Update visit count for player at space
    updateVisitCount(playerName, spaceName) {
        try {
            const visitHistory = this.load('visitHistory') || {};
            const key = `${playerName}-${spaceName}`;
            visitHistory[key] = (visitHistory[key] || 0) + 1;
            return this.save('visitHistory', visitHistory);
        } catch (error) {
            console.error('Error updating visit count:', error);
            return false;
        }
    }

    // Export game state for debugging
    exportGameState() {
        try {
            const exportData = {};
            this.dataTypes.forEach(type => {
                const data = this.load(type);
                if (data) {
                    exportData[type] = data;
                }
            });
            return {
                version: this.VERSION,
                timestamp: Date.now(),
                data: exportData
            };
        } catch (error) {
            console.error('Error exporting game state:', error);
            return null;
        }
    }

    // Import game state with validation
    async importGameState(importData) {
        try {
            if (!importData || !importData.data) {
                throw new Error('Invalid import data');
            }

            // Validate version compatibility
            if (importData.version !== this.VERSION) {
                throw new Error('Version mismatch');
            }

            // Clear existing state
            this.clearAll();

            // Import each data type with validation
            for (const [type, data] of Object.entries(importData.data)) {
                if (!this.dataTypes.has(type)) {
                    console.warn(`Skipping import of unknown type: ${type}`);
                    continue;
                }

                const validator = this.validationSchemas[type];
                if (validator) {
                    await validator(data);
                }

                await this.save(type, data);
            }

            return true;
        } catch (error) {
            console.error('Error importing game state:', error);
            return false;
        }
    }

    // New methods for finished players management
    isPlayerFinished(playerName) {
        try {
            if (!playerName) {
                throw new Error('Player name is required');
            }
            const finishedPlayers = this.load('finishedPlayers') || [];
            return finishedPlayers.includes(playerName);
        } catch (error) {
            console.error('Error checking player finished status:', error);
            return false;
        }
    }

    async handlePlayerFinish(playerName) {
        try {
            if (!playerName) {
                throw new Error('Player name is required');
            }

            // Step 1: Update position to FINISH
            const progressState = this.load('progressState');
            if (!progressState) {
                throw new Error('No progress state found');
            }

            progressState.playerPositions[playerName] = 'FINISH';
            const positionSaveSuccess = await this.save('progressState', progressState);
            if (!positionSaveSuccess) {
                throw new Error('Failed to update player position');
            }

            // Step 2: Add to finished players
            const finishedPlayers = this.load('finishedPlayers') || [];
            if (!finishedPlayers.includes(playerName)) {
                finishedPlayers.push(playerName);
                const finishedSaveSuccess = await this.save('finishedPlayers', finishedPlayers);
                if (!finishedSaveSuccess) {
                    throw new Error('Failed to save finished status');
                }
            }

            // Step 3: Check for game end
            const allPlayers = this.load('players') || [];
            const allFinished = allPlayers.every(player => 
                finishedPlayers.includes(player.name)
            );

            if (allFinished) {
                progressState.gameEnded = true;
                await this.save('progressState', progressState);
                // Force a full state refresh
                this.notifySubscribers('progressState');
                this.notifySubscribers('finishedPlayers');
            }

            // Return result including whether the game has ended
            return {
                success: true,
                gameEnded: allFinished,
                finishedCount: finishedPlayers.length,
                totalPlayers: allPlayers.length
            };

        } catch (error) {
            console.error('Error handling player finish:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getFinishedPlayers() {
        try {
            return this.load('finishedPlayers') || [];
        } catch (error) {
            console.error('Error getting finished players:', error);
            return [];
        }
    }

    /**
 * Add a card to a player's collection
 * @param {string} playerName - Player name
 * @param {Object} card - Card object to add
 * @returns {Promise<boolean>} Success status
 */
async addPlayerCard(playerName, card) {
    if (!playerName || !card || !card.type) {
        console.error('SaveManager: Invalid parameters for addPlayerCard');
        return false;
    }
    
    try {
        // Load current player cards
        const playerCards = this.load('playerCards') || {};
        
        // Initialize player's collection if needed
        if (!playerCards[playerName]) {
            playerCards[playerName] = {
                B: [], I: [], W: [], L: [], E: []
            };
        }
        
        // Add card to the appropriate collection
        if (!Array.isArray(playerCards[playerName][card.type])) {
            playerCards[playerName][card.type] = [];
        }
        
        // Add the card if it doesn't already exist
        const exists = playerCards[playerName][card.type].some(c => c.id === card.id);
        if (!exists) {
            playerCards[playerName][card.type].push(card);
        }
        
        // Save updated player cards
        const saveSuccess = await this.save('playerCards', playerCards);
        
        // Update card history
        await this.updateCardHistory('drawn', playerName, card);
        
        return saveSuccess;
    } catch (error) {
        console.error('SaveManager: Error adding player card:', error);
        return false;
    }
}

/**
 * Remove a card from a player's collection
 * @param {string} playerName - Player name
 * @param {Object} card - Card object to remove
 * @param {string} reason - Reason for removal ('played' or 'discarded')
 * @returns {Promise<boolean>} Success status
 */
async removePlayerCard(playerName, card, reason = 'played') {
    if (!playerName || !card || !card.type) {
        console.error('SaveManager: Invalid parameters for removePlayerCard');
        return false;
    }
    
    try {
        // Load current player cards
        const playerCards = this.load('playerCards') || {};
        
        // Skip if player doesn't exist or has no cards
        if (!playerCards[playerName] || !playerCards[playerName][card.type]) {
            return false;
        }
        
        // Find the card in the player's collection
        const cardIndex = playerCards[playerName][card.type].findIndex(c => c.id === card.id);
        
        // Remove the card if found
        if (cardIndex !== -1) {
            playerCards[playerName][card.type].splice(cardIndex, 1);
            
            // Save updated player cards
            const saveSuccess = await this.save('playerCards', playerCards);
            
            // Update card history
            await this.updateCardHistory(reason, playerName, card);
            
            return saveSuccess;
        }
        
        return false;
    } catch (error) {
        console.error('SaveManager: Error removing player card:', error);
        return false;
    }
}

/**
 * Update card history with a new action
 * @param {string} action - Action type ('drawn', 'played', 'discarded')
 * @param {string} playerName - Player name
 * @param {Object} card - Card object
 * @returns {Promise<boolean>} Success status
 */
async updateCardHistory(action, playerName, card) {
    try {
        // Load current card history
        const cardHistory = this.load('cardHistory') || {
            drawn: {},
            played: {},
            discarded: {}
        };
        
        // Initialize history for this player if needed
        if (!cardHistory[action][playerName]) {
            cardHistory[action][playerName] = [];
        }
        
        // Add the card action to history with timestamp
        cardHistory[action][playerName].push({
            card: card,
            timestamp: Date.now()
        });
        
        // Save updated history
        return await this.save('cardHistory', cardHistory);
    } catch (error) {
        console.error(`SaveManager: Error updating card history for ${action}:`, error);
        return false;
    }
}

/**
 * Get all cards for a player
 * @param {string} playerName - Player name
 * @returns {Object|null} Player's cards or null if not found
 */
getPlayerCards(playerName) {
    if (!playerName) {
        return null;
    }
    
    const playerCards = this.load('playerCards');
    return playerCards?.[playerName] || null;
}

/**
 * Get cards of a specific type for a player
 * @param {string} playerName - Player name
 * @param {string} cardType - Card type code (B, I, W, L, E)
 * @returns {Array|null} Player's cards of the specified type
 */
getPlayerCardsByType(playerName, cardType) {
    if (!playerName || !cardType) {
        return null;
    }
    
    const playerCards = this.load('playerCards');
    return playerCards?.[playerName]?.[cardType] || null;
}

/**
 * Check if a player has a specific card
 * @param {string} playerName - Player name
 * @param {Object} card - Card to check for
 * @returns {boolean} Whether the player has the card
 */
playerHasCard(playerName, card) {
    if (!playerName || !card || !card.type || !card.id) {
        return false;
    }
    
    const playerCards = this.load('playerCards');
    return !!playerCards?.[playerName]?.[card.type]?.some(c => c.id === card.id);
}

/**
 * Get card history for a player
 * @param {string} playerName - Player name
 * @returns {Object|null} Player's card history
 */
getPlayerCardHistory(playerName) {
    if (!playerName) {
        return null;
    }
    
    const cardHistory = this.load('cardHistory') || {
        drawn: {},
        played: {},
        discarded: {}
    };
    
    return {
        drawn: cardHistory.drawn[playerName] || [],
        played: cardHistory.played[playerName] || [],
        discarded: cardHistory.discarded[playerName] || []
    };
}

async verifyCompleteGameState() {
        try {
            // Step 1: Load and verify all required data types
            const players = this.load('players');
            const progressState = this.load('progressState');
            const scores = this.load('scores');
            const visitHistory = this.load('visitHistory');
            const finishedPlayers = this.load('finishedPlayers');
    
            // Step 2: Verify players exist and have valid structure
            if (!Array.isArray(players) || players.length === 0) {
                throw new Error('Invalid or missing players data');
            }
    
            // Step 3: Cross-validate player positions with finished state
            if (progressState?.playerPositions) {
                // Verify all finished players are at FINISH space
                finishedPlayers?.forEach(playerName => {
                    if (progressState.playerPositions[playerName] !== 'FINISH') {
                        throw new Error(`Finished player ${playerName} not at FINISH space`);
                    }
                });
    
                // Verify all players at FINISH are marked as finished
                Object.entries(progressState.playerPositions).forEach(([playerName, position]) => {
                    if (position === 'FINISH' && !finishedPlayers?.includes(playerName)) {
                        throw new Error(`Player ${playerName} at FINISH but not marked as finished`);
                    }
                });
            }
    
            // Step 4: Verify game completion state
            const allPlayersFinished = finishedPlayers?.length === players.length;
            if (allPlayersFinished !== Boolean(progressState?.gameEnded)) {
                // Update game ended state to match reality
                progressState.gameEnded = allPlayersFinished;
                await this.save('progressState', progressState);
            }
    
            // Step 5: Verify scores exist for all players
            const hasAllScores = players.every(player => 
                typeof scores?.[player.name] === 'number'
            );
            if (!hasAllScores) {
                // Initialize missing scores
                const updatedScores = {...(scores || {})};
                players.forEach(player => {
                    if (typeof updatedScores[player.name] !== 'number') {
                        updatedScores[player.name] = 0;
                    }
                });
                await this.save('scores', updatedScores);
            }
    
            // Step 6: Validate turn state
            if (progressState) {
                const currentPlayerIndex = progressState.currentPlayerIndex;
                if (typeof currentPlayerIndex !== 'number' || 
                    currentPlayerIndex < 0 || 
                    currentPlayerIndex >= players.length) {
                    progressState.currentPlayerIndex = 0;
                    await this.save('progressState', progressState);
                }
            }
    
            // Step 7: Validate roll state
            if (progressState && !progressState.rollState) {
                progressState.rollState = {
                    hasRolled: false,
                    rolls: [],
                    rollsRequired: 0,
                    rollsCompleted: 0
                };
                await this.save('progressState', progressState);
            }
    
            // Step 8: Ensure required data structures exist
            if (!progressState) {
                await this.createInitialProgressState(players);
            } else {
                this.validateProgressState(progressState);
            }
    
            if (!visitHistory) {
                await this.save('visitHistory', {});
            }
    
            if (!Array.isArray(finishedPlayers)) {
                await this.save('finishedPlayers', []);
            }
    
            // Return detailed verification result
            return {
                isValid: true,
                gameEnded: progressState?.gameEnded || false,
                allPlayersFinished,
                playerCount: players.length,
                finishedCount: finishedPlayers?.length || 0,
                hasValidScores: hasAllScores
            };
    
        } catch (error) {
            console.error('Game state verification failed:', error);
            return {
                isValid: false,
                error: error.message,
                gameEnded: false
            };
        }
    }
}    

// Create global instance with error handling
try {
    window.GameSaveManager = new SaveManager();
} catch (error) {
    console.error('Failed to initialize SaveManager:', error);
    // Provide basic fallback
    window.GameSaveManager = {
        save: () => false,
        load: () => null,
        clear: () => false,
        clearAll: () => false,
        subscribe: () => () => {},
        unsubscribe: () => {},
        verify: async () => ({ success: false, errors: ['SaveManager not initialized'] })
    };
}