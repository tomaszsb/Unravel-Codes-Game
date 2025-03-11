class CardManager {
    constructor() {
        // Initialize card data structures
        this.cardData = {
            B: [], // Bank/Funding cards
            I: [], // Investment cards 
            W: [], // Work/scope cards
            L: [], // Life event cards
            E: []  // Expert help cards
        };
        
        // Initialize card decks (what players draw from)
        this.cardDecks = {
            B: [],
            I: [],
            W: [],
            L: [],
            E: []
        };
        
        // Track discard piles
        this.discardPiles = {
            B: [],
            I: [],
            W: [],
            L: [],
            E: []
        };
        
        // Card CSV file paths
        this.csvFiles = {
            B: 'Data/B-cards.csv',
            I: 'Data/I-cards.csv',
            W: 'Data/W-cards.csv',
            L: 'Data/L-cards.csv',
            E: 'Data/E-cards.csv'
        };
        
        this.isInitialized = false;
        this.readyState = {
            initialized: false,
            dataLoaded: false
        };
        
        // Cache for frequently accessed card data
        this.cache = {
            cardsByType: new Map(),
            cardsByPhase: new Map()
        };
        
        // Subscribers for state changes
        this.subscribers = new Set();

        // Color mapping for space types
        this.spaceColorMap = {
            'OWNER': 'Green',
            'ARCH': 'Yellow',
            'ENG': 'Yellow',
            'REG': 'Red',
            'DOB': 'Red',
            'FDNY': 'Red',
            'CON': 'Purple',
            'PM': 'Blue'
        };

        // Default player resource structure for reference
        this.defaultPlayerResources = {
            funds: 0,           // Available money
            debt: 0,            // Total loan debt
            scope: 100,         // Project scope (100% = full scope)
            timeBonus: 0,       // Time reduction bonus
            expertise: 0,       // Expertise level
            quality: 100,       // Project quality (100% = top quality)
            stress: 0,          // Player stress level (0-100)
            skillPoints: {      // Skill points by category
                design: 0,
                finance: 0,
                regulatory: 0,
                construction: 0,
                management: 0
            }
        };
    }
    
    /* [All the previously implemented methods remain the same] */
    
    /**
     * Apply Expert Help card effects
     * @param {Object} card - The card to apply
     * @param {Object} gameState - Current game state
     * @param {string} playerName - Player name
     */
    applyExpertCardEffect(card, gameState, playerName) {
        const resources = gameState.playerResources[playerName];
        
        // Parse effect text to determine changes
        const effectText = card.Effect || '';
        
        // Time reduction effects
        if (effectText.includes('reduce') && effectText.includes('time')) {
            const matches = effectText.match(/reduce\s+(\d+)\s+time/i);
            if (matches && matches[1]) {
                const timeReduction = parseInt(matches[1], 10);
                resources.timeBonus += timeReduction;
            }
        }
        
        // Cost reduction effects
        if (effectText.includes('reduce') && effectText.includes('cost')) {
            const matches = effectText.match(/reduce\s+(\d+)[%]?\s+cost/i);
            if (matches && matches[1]) {
                const costReduction = parseInt(matches[1], 10);
                
                // Apply as a percentage to future costs
                if (!resources.costReduction) {
                    resources.costReduction = 0;
                }
                resources.costReduction += costReduction;
            }
        }
        
        // Quality improvement effects
        if (effectText.includes('increase') && effectText.includes('quality')) {
            const matches = effectText.match(/increase\s+(\d+)[%]?\s+quality/i);
            if (matches && matches[1]) {
                const qualityIncrease = parseInt(matches[1], 10);
                resources.quality = Math.min(150, resources.quality + qualityIncrease);
            }
        }
        
        // Expertise boost
        if (effectText.includes('expert') || effectText.includes('expertise')) {
            if (!resources.expertise) {
                resources.expertise = 0;
            }
            resources.expertise += 1;
        }
        
        // Skill points
        if (card['Skill Points']) {
            const skillPoints = parseInt(card['Skill Points'], 10) || 0;
            const skillType = (card['Skill Type'] || 'management').toLowerCase();
            
            if (skillPoints !== 0 && resources.skillPoints) {
                if (!resources.skillPoints[skillType]) {
                    resources.skillPoints[skillType] = 0;
                }
                resources.skillPoints[skillType] += skillPoints;
            }
        }
        
        // Add specific effects based on card color/phase
        if (card.Color && card.Color !== 'All Colors') {
            const spaceColor = this.getSpaceColor(gameState, playerName);
            
            // Apply stronger effects if color matches current space
            if (card.Color === spaceColor) {
                // Bonus for matching the space color
                resources.expertise += 1;
                
                // Additional effect based on color
                switch (card.Color) {
                    case 'Red': // Regulatory - reduce approval time
                        resources.timeBonus += 2;
                        break;
                    case 'Yellow': // Design - improve quality
                        resources.quality = Math.min(150, resources.quality + 5);
                        break;
                    case 'Green': // Owner - reduce costs
                        if (!resources.costReduction) resources.costReduction = 0;
                        resources.costReduction += 5;
                        break;
                    case 'Purple': // Construction - improve scope management
                        resources.scope = Math.min(150, resources.scope + 5);
                        break;
                    case 'Blue': // PM - general benefit
                        resources.timeBonus += 1;
                        if (!resources.costReduction) resources.costReduction = 0;
                        resources.costReduction += 2;
                        break;
                }
            }
        }
        
        // Add effect description to game log
        if (!gameState.gameLog) {
            gameState.gameLog = [];
        }
        
        gameState.gameLog.push({
            action: 'card_played',
            cardType: 'E',
            cardName: card['Card Name'] || 'Expert Help Card',
            player: playerName,
            effect: effectText || 'Expert assistance provided',
            timestamp: Date.now()
        });
        
        console.log(`CardManager: Applied Expert card effect for ${playerName}:`, {
            effectText,
            newTimeBonus: resources.timeBonus,
            newQuality: resources.quality,
            newExpertise: resources.expertise,
            costReduction: resources.costReduction
        });
    }
    
    /**
     * Get the color of the current space for a player
     * @param {Object} gameState - Current game state
     * @param {string} playerName - Player name
     * @returns {string} Space color or empty string if not found
     */
    getSpaceColor(gameState, playerName) {
        // Get player position
        const position = gameState?.playerPositions?.[playerName];
        if (!position) {
            return '';
        }
        
        // Extract space type from position (assuming format like "OWNER-SCOPE-NAME")
        const parts = position.split('-');
        if (parts.length > 0) {
            const spaceType = parts[0];
            return this.spaceColorMap[spaceType] || '';
        }
        
        return '';
    }
    
    /**
     * Get phase for a space
     * @param {string} spaceName - Space name
     * @returns {string} Phase name or empty string if not found
     */
    getPhaseForSpace(spaceName) {
        // Use GameDataManager if available to get precise phase information
        if (window.GameDataManager?.isReady()) {
            const spaceData = window.GameDataManager.getSpaceData(spaceName);
            if (spaceData && spaceData[0]?.Phase) {
                return spaceData[0].Phase;
            }
        }
        
        // Fallback based on space name prefix
        const parts = spaceName.split('-');
        if (parts.length > 0) {
            const spaceType = parts[0];
            
            // Map space types to phases
            const phaseMap = {
                'OWNER': 'Owner',
                'ARCH': 'Design',
                'ENG': 'Design',
                'REG': 'Regulatory Review',
                'DOB': 'Regulatory Review',
                'FDNY': 'Regulatory Review',
                'CON': 'Construction',
                'PM': 'Management'
            };
            
            return phaseMap[spaceType] || '';
        }
        
        return '';
    }
    
    /**
     * Check if a card can be played in the current game state
     * @param {Object} card - The card to check
     * @param {Object} gameState - Current game state
     * @param {string} playerName - Name of the player
     * @returns {boolean} Whether the card can be played
     */
    canPlayCard(card, gameState, playerName) {
        if (!card || !card.type) {
            return false;
        }
        
        // Get player position and phase
        const position = gameState?.playerPositions?.[playerName];
        if (!position) {
            return false;
        }
        
        const currentPhase = this.getPhaseForSpace(position);
        const spaceColor = this.getSpaceColor(gameState, playerName);
        
        // Check specific requirements based on card type
        switch (card.type) {
            case 'E': // Expert help cards
                // Check phase requirement
                if (card.Phase && card.Phase !== 'Any Phase' && card.Phase !== currentPhase) {
                    console.log(`Card phase ${card.Phase} doesn't match current phase ${currentPhase}`);
                    return false;
                }
                
                // Check color requirement
                if (card.Color && card.Color !== 'All Colors' && card.Color !== spaceColor) {
                    console.log(`Card color ${card.Color} doesn't match space color ${spaceColor}`);
                    return false;
                }
                break;
                
            case 'W': // Work/scope cards
                // Check phase for work cards
                if (card.Phase && card.Phase !== 'Any Phase' && card.Phase !== currentPhase) {
                    console.log(`Work card phase ${card.Phase} doesn't match current phase ${currentPhase}`);
                    return false;
                }
                break;
                
            case 'B': // Bank/Funding cards
                // Check if player has enough funds to service the loan
                const resources = gameState?.playerResources?.[playerName];
                if (resources) {
                    const amount = card.Amount || 0;
                    const interest = amount * ((card['Loan Percentage Cost'] || 10) / 100);
                    const totalDebt = resources.debt + amount + interest;
                    
                    // Simple debt capacity check - 30% of funds
                    if (totalDebt > resources.funds * 3) {
                        console.log(`Loan would exceed debt capacity: ${totalDebt} > ${resources.funds * 3}`);
                        return false;
                    }
                }
                break;
                
            case 'I': // Investment cards
                // Check phase for investment cards - typically early phases only
                if (currentPhase !== 'Owner' && currentPhase !== 'Design' && currentPhase !== 'Funding') {
                    console.log(`Investment card cannot be played in ${currentPhase} phase`);
                    return false;
                }
                break;
        }
        
        return true;
    }
    
    /**
     * Deep clone an object to avoid mutations
     * @param {Object} obj - Object to clone
     * @returns {Object} Deep cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        // Handle Date objects
        if (obj instanceof Date) {
            return new Date(obj);
        }
        
        // Handle Array objects
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        // Handle Object objects
        const clone = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clone[key] = this.deepClone(obj[key]);
            }
        }
        
        return clone;
    }
    
    /**
     * Check if CardManager is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized &&
               this.readyState.initialized &&
               this.readyState.dataLoaded;
    }
    
    /**
     * Wait until CardManager is ready
     * @returns {Promise<boolean>} Promise that resolves when ready
     */
    async waitUntilReady() {
        if (this.isReady()) {
            return true;
        }
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = () => {
                attempts++;
                
                if (this.isReady()) {
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('CardManager ready check timed out'));
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }
    
    /**
     * Subscribe to CardManager updates
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Subscriber callback must be a function');
        }
        
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }
    
    /**
     * Unsubscribe from CardManager updates
     * @param {Function} callback - Callback function to remove
     */
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }
    
    /**
     * Notify subscribers of state changes
     * @param {string} eventType - Type of event
     * @param {*} data - Event data
     */
    notifySubscribers(eventType, data) {
        this.subscribers.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });
    }
    
    /**
     * Process future returns for players
     * @param {Object} gameState - Current game state
     * @returns {Object} Updated game state with processed returns
     */
    processFutureReturns(gameState) {
        if (!gameState || !gameState.futureReturns || !Array.isArray(gameState.futureReturns)) {
            return gameState;
        }
        
        // Create a deep copy of game state
        const newState = this.deepClone(gameState);
        
        // Track returns to process
        const returnsToProcess = [];
        const remainingReturns = [];
        
        // Identify returns due this turn
        newState.futureReturns.forEach(returnItem => {
            if (returnItem.turnsRemaining <= 1) {
                returnsToProcess.push(returnItem);
            } else {
                // Decrement remaining turns
                returnItem.turnsRemaining--;
                remainingReturns.push(returnItem);
            }
        });
        
        // Update game state with remaining returns
        newState.futureReturns = remainingReturns;
        
        // Process due returns
        returnsToProcess.forEach(returnItem => {
            const { playerName, amount, description } = returnItem;
            
            // Ensure player resources exist
            if (!newState.playerResources) {
                newState.playerResources = {};
            }
            
            if (!newState.playerResources[playerName]) {
                newState.playerResources[playerName] = { ...this.defaultPlayerResources };
            }
            
            // Add return amount to player funds
            newState.playerResources[playerName].funds += amount;
            
            // Log the return
            if (!newState.gameLog) {
                newState.gameLog = [];
            }
            
            newState.gameLog.push({
                action: 'investment_return',
                player: playerName,
                amount: amount,
                description: description || 'Investment return',
                timestamp: Date.now()
            });
            
            console.log(`CardManager: Processed investment return for ${playerName}: $${amount}`);
        });
        
        return newState;
    }
}

// Create global instance
try {
    console.log('Creating CardManager instance...');
    window.GameCardManager = new CardManager();
    console.log('CardManager instance created successfully');
} catch (error) {
    console.error('Failed to initialize CardManager:', error);
    // Provide basic fallback
    window.GameCardManager = {
        initialize: async () => ({ success: false, errors: ['CardManager not initialized'] }),
        isReady: () => false,
        waitUntilReady: async () => false,
        drawCard: () => null,
        getAllCards: () => [],
        subscribe: () => () => {}
    };
}