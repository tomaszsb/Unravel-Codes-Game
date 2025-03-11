/**
 * DiceOutcomeProcessor - Processes dice roll outcomes and applies effects
 * to the game state based on rolled values and space information.
 * 
 * Handles dice outcome parsing, validation, and application to:
 * - Player resources (funds, time, etc.)
 * - Movement determination
 * - Player state changes
 */
class DiceOutcomeProcessor {
    constructor() {
        this.outcomePatterns = {
            // Pattern: Pay $X
            payment: /pay\s+\$?(\d+[,\d]*)/i,
            
            // Pattern: Lose X days
            timeLoss: /lose\s+(\d+)\s+days?/i,
            
            // Pattern: Gain $X
            moneyGain: /gain\s+\$?(\d+[,\d]*)/i,
            
            // Pattern: Save X days
            timeSave: /save\s+(\d+)\s+days?/i,
            
            // Pattern: Move to SPACE
            moveTo: /move\s+to\s+([A-Z0-9-]+)/i,
            
            // Pattern: Draw X card
            drawCard: /draw\s+([BIWLE])\s+card/i,
            
            // Pattern: Scope change X%
            scopeChange: /scope\s+(increase|decrease)\s+(\d+)%/i,
            
            // Pattern: Quality change X%
            qualityChange: /quality\s+(increase|decrease)\s+(\d+)%/i
        };
    }
    
    /**
     * Process a dice roll outcome
     * @param {Object} gameState - Current game state
     * @param {string} playerName - Name of the player who rolled
     * @param {string} spaceName - Current space name
     * @param {number} dieRoll - Dice roll value (1-6)
     * @param {string} visitType - Visit type (First/Subsequent)
     * @returns {Object} Updated game state after outcome application
     */
    processOutcome(gameState, playerName, spaceName, dieRoll, visitType) {
        try {
            console.log('DiceOutcomeProcessor: Processing outcome for:', {
                playerName,
                spaceName,
                dieRoll,
                visitType
            });
            
            if (!gameState || !playerName || !spaceName || !dieRoll) {
                console.error('DiceOutcomeProcessor: Missing required parameters');
                return gameState;
            }
            
            // Get dice roll outcome from GameDataManager
            const outcome = this.getDiceOutcome(spaceName, dieRoll, visitType);
            
            if (!outcome) {
                console.warn(`DiceOutcomeProcessor: No outcome found for ${spaceName}, roll ${dieRoll}, visit ${visitType}`);
                return gameState;
            }
            
            console.log(`DiceOutcomeProcessor: Found outcome: "${outcome}"`);
            
            // Create a deep copy of game state to avoid mutations
            const newState = this.deepClone(gameState);
            
            // Ensure player resources exist
            if (!newState.playerResources) {
                newState.playerResources = {};
            }
            
            if (!newState.playerResources[playerName]) {
                newState.playerResources[playerName] = {
                    funds: 0,
                    debt: 0,
                    scope: 100,
                    timeBonus: 0,
                    quality: 100,
                    stress: 0
                };
            }
            
            // Apply outcome effects
            const resources = newState.playerResources[playerName];
            let nextSpace = null;
            let outcomeDescription = outcome;
            
            // Check for payment requirement
            const paymentMatch = outcome.match(this.outcomePatterns.payment);
            if (paymentMatch) {
                const amount = parseInt(paymentMatch[1].replace(/,/g, ''), 10);
                resources.funds -= amount;
                console.log(`DiceOutcomeProcessor: Player ${playerName} pays $${amount}`);
            }
            
            // Check for time loss
            const timeLossMatch = outcome.match(this.outcomePatterns.timeLoss);
            if (timeLossMatch) {
                const days = parseInt(timeLossMatch[1], 10);
                resources.timeBonus -= days;
                console.log(`DiceOutcomeProcessor: Player ${playerName} loses ${days} days`);
            }
            
            // Check for money gain
            const moneyGainMatch = outcome.match(this.outcomePatterns.moneyGain);
            if (moneyGainMatch) {
                const amount = parseInt(moneyGainMatch[1].replace(/,/g, ''), 10);
                resources.funds += amount;
                console.log(`DiceOutcomeProcessor: Player ${playerName} gains $${amount}`);
            }
            
            // Check for time save
            const timeSaveMatch = outcome.match(this.outcomePatterns.timeSave);
            if (timeSaveMatch) {
                const days = parseInt(timeSaveMatch[1], 10);
                resources.timeBonus += days;
                console.log(`DiceOutcomeProcessor: Player ${playerName} saves ${days} days`);
            }
            
            // Check for move to space
            const moveToMatch = outcome.match(this.outcomePatterns.moveTo);
            if (moveToMatch) {
                nextSpace = moveToMatch[1];
                console.log(`DiceOutcomeProcessor: Player ${playerName} should move to ${nextSpace}`);
            }
            
            // Check for card draw
            const drawCardMatch = outcome.match(this.outcomePatterns.drawCard);
            if (drawCardMatch) {
                const cardType = drawCardMatch[1];
                this.queueCardDraw(newState, playerName, cardType);
                console.log(`DiceOutcomeProcessor: Player ${playerName} should draw a ${cardType} card`);
            }
            
            // Check for scope change
            const scopeChangeMatch = outcome.match(this.outcomePatterns.scopeChange);
            if (scopeChangeMatch) {
                const direction = scopeChangeMatch[1];
                const amount = parseInt(scopeChangeMatch[2], 10);
                const change = direction === 'increase' ? amount : -amount;
                resources.scope = Math.max(0, Math.min(150, resources.scope + change));
                console.log(`DiceOutcomeProcessor: Player ${playerName} scope ${direction}d by ${amount}%`);
            }
            
            // Check for quality change
            const qualityChangeMatch = outcome.match(this.outcomePatterns.qualityChange);
            if (qualityChangeMatch) {
                const direction = qualityChangeMatch[1];
                const amount = parseInt(qualityChangeMatch[2], 10);
                const change = direction === 'increase' ? amount : -amount;
                resources.quality = Math.max(0, Math.min(150, resources.quality + change));
                console.log(`DiceOutcomeProcessor: Player ${playerName} quality ${direction}d by ${amount}%`);
            }
            
            // Log the outcome to game log
            if (!newState.gameLog) {
                newState.gameLog = [];
            }
            
            newState.gameLog.push({
                action: 'dice_outcome',
                player: playerName,
                space: spaceName,
                roll: dieRoll,
                outcome: outcomeDescription,
                timestamp: Date.now()
            });
            
            // Store the next space for movement
            if (nextSpace) {
                if (!newState.pendingMoves) {
                    newState.pendingMoves = {};
                }
                
                newState.pendingMoves[playerName] = nextSpace;
            }
            
            return newState;
            
        } catch (error) {
            console.error('DiceOutcomeProcessor: Error processing outcome:', error);
            return gameState;
        }
    }
    
    /**
     * Get dice roll outcome from GameDataManager
     * @param {string} spaceName - Space name
     * @param {number} dieRoll - Dice roll value (1-6)
     * @param {string} visitType - Visit type (First/Subsequent)
     * @returns {string|null} Outcome text or null if not found
     */
    getDiceOutcome(spaceName, dieRoll, visitType) {
        try {
            if (!window.GameDataManager?.isReady()) {
                console.warn('DiceOutcomeProcessor: GameDataManager not ready');
                return null;
            }
            
            // Get dice roll data
            const diceRollData = window.GameDataManager.data.get('diceRoll');
            if (!diceRollData) {
                console.warn('DiceOutcomeProcessor: No dice roll data available');
                return null;
            }
            
            // Find matching roll entry
            const rollEntry = diceRollData.find(entry => 
                entry['Space Name'] === spaceName && 
                entry['Visit Type'] === visitType
            );
            
            if (!rollEntry) {
                console.warn(`DiceOutcomeProcessor: No roll entry found for ${spaceName}, ${visitType}`);
                return null;
            }
            
            // Get outcome for specific roll value
            const rollValue = dieRoll.toString();
            return rollEntry[rollValue] || null;
            
        } catch (error) {
            console.error('DiceOutcomeProcessor: Error getting dice outcome:', error);
            return null;
        }
    }
    
    /**
     * Queue a card draw in the game state
     * @param {Object} gameState - Game state to modify
     * @param {string} playerName - Player name
     * @param {string} cardType - Card type code (B, I, W, L, E)
     */
    queueCardDraw(gameState, playerName, cardType) {
        if (!gameState.pendingCardDraws) {
            gameState.pendingCardDraws = [];
        }
        
        gameState.pendingCardDraws.push({
            playerName,
            cardType,
            timestamp: Date.now()
        });
    }
    
    /**
     * Process pending card draws from dice outcomes
     * @param {Object} gameState - Current game state
     * @returns {Object} Updated game state
     */
    async processPendingCardDraws(gameState) {
        if (!gameState.pendingCardDraws || !gameState.pendingCardDraws.length) {
            return gameState;
        }
        
        // Make sure CardManager is ready
        if (!window.GameCardManager?.isReady()) {
            try {
                await window.GameCardManager?.waitUntilReady();
            } catch (error) {
                console.error('DiceOutcomeProcessor: CardManager not ready:', error);
                return gameState;
            }
        }
        
        // Create a deep copy of game state
        const newState = this.deepClone(gameState);
        
        // Process each pending card draw
        for (const drawInfo of newState.pendingCardDraws) {
            try {
                const { playerName, cardType } = drawInfo;
                
                // Draw the card
                const card = window.GameCardManager.drawCard(cardType);
                
                if (card) {
                    // Add the card to player's collection via SaveManager
                    await window.GameSaveManager.addPlayerCard(playerName, card);
                    
                    // Log the card draw
                    if (!newState.gameLog) {
                        newState.gameLog = [];
                    }
                    
                    newState.gameLog.push({
                        action: 'card_drawn',
                        player: playerName,
                        cardType: cardType,
                        cardName: card['Card Name'] || `${cardType} Card`,
                        timestamp: Date.now()
                    });
                    
                    console.log(`DiceOutcomeProcessor: Player ${playerName} drew ${cardType} card:`, card);
                }
                
            } catch (error) {
                console.error('DiceOutcomeProcessor: Error processing card draw:', error);
            }
        }
        
        // Clear pending card draws
        newState.pendingCardDraws = [];
        
        return newState;
    }
    
    /**
     * Process pending moves from dice outcomes
     * @param {Object} gameState - Current game state
     * @returns {Object} Updated game state
     */
    async processPendingMoves(gameState) {
        if (!gameState.pendingMoves || Object.keys(gameState.pendingMoves).length === 0) {
            return gameState;
        }
        
        // Create a deep copy of game state
        const newState = this.deepClone(gameState);
        
        // Process each pending move
        for (const [playerName, targetSpace] of Object.entries(newState.pendingMoves)) {
            try {
                // Update player position via PlayerProgressManager
                if (window.PlayerProgressManager) {
                    await window.PlayerProgressManager.updatePlayerPosition(playerName, targetSpace);
                    
                    // Log the move
                    if (!newState.gameLog) {
                        newState.gameLog = [];
                    }
                    
                    newState.gameLog.push({
                        action: 'dice_move',
                        player: playerName,
                        fromSpace: newState.playerPositions[playerName],
                        toSpace: targetSpace,
                        timestamp: Date.now()
                    });
                    
                    console.log(`DiceOutcomeProcessor: Player ${playerName} moved to ${targetSpace}`);
                } else {
                    // Direct update if PlayerProgressManager not available
                    if (!newState.playerPositions) {
                        newState.playerPositions = {};
                    }
                    
                    newState.playerPositions[playerName] = targetSpace;
                    console.log(`DiceOutcomeProcessor: Direct update for player ${playerName} to ${targetSpace}`);
                    
                    // Save updated state
                    await window.GameSaveManager.save('progressState', newState);
                }
                
            } catch (error) {
                console.error(`DiceOutcomeProcessor: Error moving player ${playerName} to ${targetSpace}:`, error);
            }
        }
        
        // Clear pending moves
        delete newState.pendingMoves;
        
        return newState;
    }
    
    /**
     * Execute the complete dice outcome processing pipeline
     * @param {Object} gameState - Current game state
     * @param {string} playerName - Player name
     * @param {string} spaceName - Current space name
     * @param {number} dieRoll - Dice roll value
     * @param {string} visitType - Visit type (First/Subsequent)
     * @returns {Promise<Object>} Updated game state
     */
    async executeOutcomeProcessing(gameState, playerName, spaceName, dieRoll, visitType) {
        try {
            // Step 1: Apply immediate outcome effects
            let updatedState = this.processOutcome(gameState, playerName, spaceName, dieRoll, visitType);
            
            // Step 2: Process any pending card draws
            updatedState = await this.processPendingCardDraws(updatedState);
            
            // Step 3: Process any pending moves
            updatedState = await this.processPendingMoves(updatedState);
            
            // Step 4: Save the updated state
            if (window.GameSaveManager) {
                await window.GameSaveManager.save('progressState', updatedState);
            }
            
            return updatedState;
            
        } catch (error) {
            console.error('DiceOutcomeProcessor: Error in outcome processing pipeline:', error);
            return gameState;
        }
    }
    
    /**
     * Connect dice system to player management components
     * @param {Object} options - Configuration options
     * @returns {Promise<boolean>} Success status
     */
    async connectToGameSystems(options = {}) {
        try {
            const { diceSystem, playerManager, progressManager } = options;
            
            // Connect to DiceSystem if available
            if (diceSystem && typeof diceSystem.onRoll === 'function') {
                diceSystem.onRoll = async (roll, playerName, spaceName, visitType) => {
                    // Get current game state
                    const gameState = window.GameSaveManager.load('progressState');
                    
                    // Process outcome and update state
                    return this.executeOutcomeProcessing(gameState, playerName, spaceName, roll, visitType);
                };
                
                console.log('DiceOutcomeProcessor: Connected to DiceSystem');
            }
            
            // Connect to PlayerManager if available
            if (playerManager && typeof playerManager.subscribe === 'function') {
                playerManager.subscribe((player) => {
                    // This subscription allows for tracking current player changes
                    console.log('DiceOutcomeProcessor: Player turn update:', player);
                });
                
                console.log('DiceOutcomeProcessor: Connected to PlayerManager');
            }
            
            // Connect to ProgressManager if available
            if (progressManager && typeof progressManager.subscribe === 'function') {
                progressManager.subscribe((updateInfo) => {
                    // This subscription allows for tracking player movement updates
                    console.log('DiceOutcomeProcessor: Progress update:', updateInfo);
                });
                
                console.log('DiceOutcomeProcessor: Connected to ProgressManager');
            }
            
            return true;
            
        } catch (error) {
            console.error('DiceOutcomeProcessor: Error connecting to game systems:', error);
            return false;
        }
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
}

// Create global instance
try {
    console.log('Creating DiceOutcomeProcessor instance...');
    window.DiceOutcomeProcessor = new DiceOutcomeProcessor();
    console.log('DiceOutcomeProcessor instance created successfully');
} catch (error) {
    console.error('Failed to initialize DiceOutcomeProcessor:', error);
    // Provide basic fallback
    window.DiceOutcomeProcessor = {
        processOutcome: (gameState) => gameState,
        executeOutcomeProcessing: async (gameState) => gameState,
        connectToGameSystems: async () => false
    };
}