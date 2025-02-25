// game-board-controller.js
class GameBoard extends React.Component {

    checkForAvailableMoves = () => {
        try {
            const currentPlayer = window.GamePlayerManager?.getCurrentPlayer();
            if (!currentPlayer) {
                console.log('No current player found');
                this.setState({ 
                    availableMoves: [],
                    showMoveSelection: false,
                    selectedMove: null,
                    error: null
                });
                return;
            }

            // Check if player is finished
            const finishedPlayers = window.GameSaveManager?.getFinishedPlayers() || [];
            if (finishedPlayers.includes(currentPlayer.name)) {
                console.log('Player has finished - no moves available');
                this.setState({
                    availableMoves: [],
                    showMoveSelection: false,
                    selectedMove: null,
                    error: null
                });
                return;
            }

            // Get current position
            const gameState = window.GameSaveManager?.load('progressState');
            const position = gameState?.playerPositions?.[currentPlayer.name];
            
            console.log('Checking moves for:', {
                player: currentPlayer.name,
                position: position,
                gameState: gameState?.gameEnded
            });

            // Get visit type for current position
            const visitHistory = window.GameSaveManager.load('visitHistory') || {};
            const visitKey = `${currentPlayer.name}-${position}`;
            const visits = visitHistory[visitKey] || 0;
            const visitType = visits === 0 ? 'FIRST' : 'SUBSEQUENT';

            // Get space data with visit type
            const spaceData = window.GameDataManager.getSpaceData(position);
            const visitTypeData = spaceData?.find(space => space['Visit Type'] === visitType);

            // Get available moves with validation
            const availableMoves = window.PlayerProgressManager?.getAvailableMoves(currentPlayer.name) || [];
            console.log("Available moves:", availableMoves);

            if (availableMoves && availableMoves.length > 0) {
                // Special handling for branch points vs linear paths
                const isBranchPoint = availableMoves.length > 1;
                
                this.setState({
                    availableMoves,
                    showMoveSelection: isBranchPoint,
                    selectedMove: isBranchPoint ? null : availableMoves[0],
                    error: null
                }, () => {
                    console.log('Updated move state:', {
                        availableMoves: this.state.availableMoves,
                        showMoveSelection: this.state.showMoveSelection,
                        selectedMove: this.state.selectedMove,
                        visitType
                    });
                });
            } else {
                console.log('No valid moves available');
                this.setState({
                    availableMoves: [],
                    selectedMove: null,
                    showMoveSelection: false,
                    error: null
                });
            }

        } catch (error) {
            console.error('Error checking available moves:', error);
            this.setState({
                availableMoves: [],
                selectedMove: null,
                showMoveSelection: false,
                error: 'Failed to get available moves'
            });
        }
    }

    checkGameEndConditions = async () => {
        console.log("Explicit game end condition check");
        const gameValidation = await window.GameSaveManager.verifyCompleteGameState();
        const gameState = window.GameSaveManager.load('progressState');
        const finishedPlayers = window.GameSaveManager.getFinishedPlayers();
        const allPlayers = window.GameSaveManager.load('players') || [];
        
        const shouldEndGame = 
            gameValidation.isValid && (
                gameValidation.gameEnded ||
                gameValidation.allPlayersFinished ||
                finishedPlayers.length === allPlayers.length ||
                gameState?.gameEnded
            );
        
        console.log('End game check results:', {
            validation: gameValidation,
            gameStateEnded: gameState?.gameEnded,
            finishedCount: finishedPlayers.length,
            totalPlayers: allPlayers.length,
            shouldEndGame,
            currentShowEndGame: this.state.showEndGame
        });
        
        return shouldEndGame;
    };
        
    checkVisitState = (playerName, spaceName) => {
        const visitHistory = window.GameSaveManager.load('visitHistory') || {};
        const visitKey = `${playerName}-${spaceName}`;
        const currentVisits = visitHistory[visitKey] || 0;
        
        console.log('Visit check:', {
            player: playerName,
            space: spaceName,
            currentVisits,
            isFirstVisit: currentVisits === 0
        });
        
        return {
            isFirstVisit: currentVisits === 0,
            visitCount: currentVisits,
            visitKey
        };
    };

    componentWillUnmount() {
        // Keep existing cleanup code
        window.removeEventListener('resize', this.handleResize);
        
        // Unmount all components
        this.requiredMountPoints.forEach(id => {
            const root = document.getElementById(id);
            if (root) {
                ReactDOM.unmountComponentAtNode(root);
            }
        });
    
        // Clean up any state subscriptions
        if (window.GameSaveManager) {
            window.GameSaveManager.unsubscribe(this.handleStateUpdate);
        }
    }
    
    constructor(props) {
        super(props);
        
        // Define component mapping for consistent reference
        this.components = [
            { name: 'LeaderBoard', component: window.LeaderBoard },
            { name: 'ProgressMap', component: window.ProgressMap },
            { name: 'PlayerStatus', component: window.PlayerStatus },
            { name: 'SpaceInfo', component: window.SpaceInfo },
            { name: 'ActionRequirements', component: window.ActionRequirements },
            { name: 'DicePrompt', component: window.DicePrompt },
            { name: 'DiceResult', component: window.DiceResult },
            { name: 'DiceSystem', component: window.DiceSystem },
            { name: 'PerformedActions', component: window.PerformedActions },
            { name: 'MoveSelection', component: window.MoveSelection }
        ];

        // Maintain the same state structure for compatibility
        this.state = {
            mountStatus: {},          // Track component mount status
            error: null,              // Error state
            loading: true,            // Loading state
            showInstructions: false,  // Instructions modal visibility
            showLog: false,           // Game log visibility
            initialized: false,        // Initialization status
            currentPlayer: window.GamePlayerManager.getCurrentPlayer(),
            gameState: null,          // Game state from SaveManager
            dimensions: {             // Container dimensions
                width: 0,
                height: 0
            },
            negotiating: false,       // Negotiation state
            gameValidation: null,     // Game validation status
            showMoveSelection: false, // Move selection visibility
            availableMoves: [],       // Available moves
            selectedMove: null,       // Selected move
            showEndGame: false,       // End game screen visibility
            finishedPlayers: []       // Finished players list
        };

        // Create refs for component measurement
        this.containerRef = React.createRef();
        
        // Bind methods that need 'this' context
        this.handleResize = this.handleResize.bind(this);
        this.handleMoveSelect = this.handleMoveSelect.bind(this);
        this.handleEndTurn = this.handleEndTurn.bind(this);
        this.handleNegotiate = this.handleNegotiate.bind(this);
        this.toggleInstructions = this.toggleInstructions.bind(this);
        this.toggleLog = this.toggleLog.bind(this);
    }
    
    async componentDidMount() {
        try {
            console.log("=== GameBoard Initialization Starting ===");
            
            // First verify managers - keeping this functionality
            await this.verifyManagers();
                
            // No longer need to verify mount points since we're using React components
            
            // Set up window resize handling using React ref
            window.addEventListener('resize', this.handleResize);
            if (this.containerRef.current) {
                const rect = this.containerRef.current.getBoundingClientRect();
                this.setState({
                    dimensions: {
                        width: rect.width,
                        height: Math.max(rect.height, 200)
                    }
                });
            }
    
            // Load and check initial game state - keeping this critical logic
            console.log("Loading and validating game state...");
            const gameState = window.GameSaveManager.load('progressState');
            const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
            const finishedPlayers = window.GameSaveManager.load('finishedPlayers') || [];
            const allPlayers = window.GameSaveManager.load('players') || [];
    
            // Log initial state for debugging
            console.log('Initial game state:', {
                gameEnded: gameState?.gameEnded,
                finishedPlayers,
                totalPlayers: allPlayers.length,
                allFinished: finishedPlayers.length === allPlayers.length,
                currentPlayer: currentPlayer?.name
            });
    
            if (!gameState || !currentPlayer) {
                throw new Error('Failed to load initial game state');
            }
    
            // Perform comprehensive game end check
            const gameValidation = await window.GameSaveManager.verifyCompleteGameState();
            const shouldShowEndGame = 
                gameValidation.isValid && (
                    gameValidation.gameEnded ||
                    gameValidation.allPlayersFinished ||
                    finishedPlayers.length === allPlayers.length ||
                    gameState?.gameEnded
                );
    
            console.log('Initial end game check:', {
                validation: gameValidation,
                shouldShowEndGame,
                finishedCount: finishedPlayers.length,
                totalPlayers: allPlayers.length
            });
    
            // Configure player-specific visual settings
            this.setupPlayerColors(currentPlayer);
    
            // Set initial state with all necessary data
            await this.setState({
                gameState,
                currentPlayer,
                gameValidation,
                showEndGame: shouldShowEndGame,
                finalRankings: shouldShowEndGame ? this.getFinalRankings() : null,
                loading: false,
                initialized: true
            });
    
            // Instead of mounting components, we'll check for available moves
            // since React will handle the component mounting
            setTimeout(() => {
                this.checkForAvailableMoves();
            }, 0);
    
            console.log("=== GameBoard Initialization Complete ===");
    
        } catch (error) {
            console.error('GameBoard initialization failed:', error);
            this.setState({
                loading: false,
                error: error.message,
                initialized: false
            });
        }
    }
    
    // Mount a single component with error handling
    async mountComponent(id, componentName) {
        console.log(`Mounting ${componentName} in ${id}...`);
        try {
            // First verify the mount point exists
            const root = document.getElementById(id);
            if (!root) {
                throw new Error(`Root element ${id} not found`);
            }

            // Check component exists globally
            const Component = window[componentName];
            if (!Component) {
                throw new Error(`Component ${componentName} not found`);
            }

            // Mount with Promise to handle async rendering
            await new Promise((resolve, reject) => {
                try {
                    ReactDOM.render(
                        React.createElement(Component),
                        root,
                        () => {
                            console.log(`✓ ${componentName} mounted successfully`);
                            
                            // Update mount status in state
                            this.setState(prevState => ({
                                mountStatus: {
                                    ...prevState.mountStatus,
                                    [id]: true
                                }
                            }));
                            resolve();
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            });

            return true;
            
        } catch (error) {
            console.error(`Failed to mount ${componentName}:`, error);
            
            // Update state to reflect mount failure
            this.setState(prevState => ({
                mountStatus: {
                    ...prevState.mountStatus,
                    [id]: false
                }
            }));
            
            throw error;
        }
    }

    // Mount all components in sequence
    async mountComponents() {
        for (const {id, name} of this.components) {
            try {
                // Mount action requirements first
                const actionRoot = document.getElementById('action-requirements-root');
                if (actionRoot) {
                ReactDOM.render(
                    React.createElement(window.ActionRequirements),
                    actionRoot
                );
                }
                
                const root = document.getElementById(id);
                if (!root) {
                    throw new Error(`Root element ${id} not found`);
                }

                const Component = window[name];
                if (!Component) {
                    throw new Error(`Component ${name} not found`);
                }

                await new Promise((resolve, reject) => {
                    try {
                        ReactDOM.render(
                            React.createElement(Component),
                            root,
                            () => {
                                this.setState(prevState => ({
                                    mountStatus: {
                                        ...prevState.mountStatus,
                                        [id]: true
                                    }
                                }));
                                resolve();
                            }
                        );
                    } catch (error) {
                        reject(error);
                    }
                });
            } catch (error) {
                console.error(`Failed to mount ${name}:`, error);
                throw error;
            }
        }
        return true;
    }
    
    // Verify all required managers are ready
    async verifyManagers() {
        console.log("Starting manager verification...");
        try {
            // Add initialization check for GameDataManager first
            if (!window.GameDataManager.isReady()) {
                const initResult = await window.GameDataManager.initialize();
                if (!initResult.success) {
                    throw new Error(`GameDataManager initialization failed: ${initResult.errors.join(', ')}`);
                }
            }
    
            // Add PlayerManager initialization here
            if (!window.GamePlayerManager.isInitialized) {
                await window.GamePlayerManager.loadState();
            }
    
            const managers = [
                { name: 'GameDataManager', instance: window.GameDataManager },
                { name: 'GamePlayerManager', instance: window.GamePlayerManager },
                { name: 'PlayerProgressManager', instance: window.PlayerProgressManager },
                { name: 'GameSaveManager', instance: window.GameSaveManager }
            ];
      
            for (const { name, instance } of managers) {
                console.log(`Checking ${name}...`);
                
                if (!instance) {
                    throw new Error(`${name} not initialized`);
                }
    
                if (typeof instance.waitUntilReady === 'function') {
                    console.log(`${name} found, calling waitUntilReady()...`);
                    const timeout = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`${name} ready check timed out`)), 5000)
                    );
                    await Promise.race([instance.waitUntilReady(), timeout]);
                    console.log(`${name} ready ✓`);
                } else {
                    console.log(`${name} found, no ready check needed ✓`);
                }
            }
    
            console.log("All managers verified ✓");
            return true;
        } catch (error) {
            console.error("Manager verification failed:", error);
            throw error;
        }
    }
    
    // In game-data-manager.js
    getAvailableMovesForSpace(spaceName) {
    if (!this.isReady() || !spaceName) {
        console.log('GameDataManager not ready or invalid space name');
        return [];
    }

    try {
        console.log(`\n=== Getting moves for space: ${spaceName} ===`);
        
        // Get space data from CSV
        const spaceData = this.getSpaceData(spaceName);
        if (!spaceData?.[0]) {
            console.log(`No data found for space: ${spaceName}`);
            return [];
        }

        // Log the FULL space data for debugging
        console.log('Full space data:', {
            spaceName: spaceData[0]['Space Name'],
            phase: spaceData[0]['Phase'],
            space1: spaceData[0]['Space 1'],
            space2: spaceData[0]['Space 2'],
            space3: spaceData[0]['Space 3'],
            space4: spaceData[0]['Space 4'],
            space5: spaceData[0]['Space 5']
        });

        // Get moves from Space columns
        const moves = [];
        for (let i = 1; i <= 5; i++) {
            const columnName = `Space ${i}`;
            const moveText = spaceData[0][columnName];
            console.log(`Checking ${columnName}:`, {
                rawValue: moveText,
                type: typeof moveText
            });

            if (moveText && typeof moveText === 'string' && moveText.trim()) {
                const cleanMove = this.cleanMoveText(moveText.trim());
                console.log(`Cleaned move from ${columnName}:`, {
                    before: moveText,
                    after: cleanMove,
                    willAdd: cleanMove && cleanMove.toLowerCase() !== 'n/a'
                });
                
                if (cleanMove && cleanMove.toLowerCase() !== 'n/a') {
                    moves.push(cleanMove);
                }
            }
        }

        // Log found moves
        console.log(`Found ${moves.length} moves for ${spaceName}:`, moves);

        // Add next space in main path if it exists and not already included
        const mainPath = window.GameSaveManager.mainGamePath;
        const currentIndex = mainPath.indexOf(spaceName);
        console.log('Main path check:', {
            currentSpace: spaceName,
            indexInMainPath: currentIndex,
            hasNextSpace: currentIndex !== -1 && currentIndex < mainPath.length - 1,
            nextSpace: currentIndex !== -1 ? mainPath[currentIndex + 1] : null
        });

        if (currentIndex !== -1 && currentIndex < mainPath.length - 1) {
            const nextMainPathSpace = mainPath[currentIndex + 1];
            if (!moves.includes(nextMainPathSpace)) {
                moves.push(nextMainPathSpace);
                console.log('Added next main path space:', nextMainPathSpace);
            }
        }

        // Validate each move exists in data
        const validMoves = moves.filter(move => {
            const moveData = this.getSpaceData(move);
            const isValid = Boolean(moveData?.[0]);
            if (!isValid) {
                console.log(`Invalid move filtered out: ${move} - no data found`);
            }
            return isValid;
        });

        console.log(`Final moves for ${spaceName}:`, {
            initial: moves,
            validated: validMoves
        });

        return validMoves;

    } catch (error) {
        console.error('Error getting available moves:', error);
        console.error('Stack:', error.stack);
        return [];
    }
}
     
    getFinalRankings = () => {
        try {
            // Get all players and their scores
            const players = window.GameSaveManager.load('players') || [];
            const scores = window.GameSaveManager.load('scores') || {};
            const finishedPlayers = window.GameSaveManager.getFinishedPlayers();
            const finishOrder = {}; 
            
            // Create finish order mapping (earlier = better)
            finishedPlayers.forEach((name, index) => {
                finishOrder[name] = index;
            });
            
            // Sort players by:
            // 1. Finished status (finished players first)
            // 2. Score (higher score better)
            // 3. Finish order (earlier finish better)
            return players
                .map(player => ({
                    name: player.name,
                    score: scores[player.name] || 0,
                    palette: player.palette,
                    isFinished: finishedPlayers.includes(player.name),
                    finishOrder: finishOrder[player.name] ?? Number.MAX_VALUE
                }))
                .sort((a, b) => {
                    // First sort by finished status
                    if (a.isFinished !== b.isFinished) {
                        return b.isFinished ? 1 : -1;
                    }
                    // Then by score
                    if (a.score !== b.score) {
                        return b.score - a.score;
                    }
                    // Finally by finish order
                    return a.finishOrder - b.finishOrder;
                });
        } catch (error) {
            console.error('Error getting final rankings:', error);
            return [];
        }
    };

    handleDiceRoll = (rollData) => {
        this.logGameEvent(`Dice rolled: ${JSON.stringify(rollData)}`);
    };

    // In GameBoard class
    handleEndTurn = async () => {
        try {
            console.log("=== Starting End Turn Process ===");

            // 1. Get current player and validate state
            const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
            if (!currentPlayer) {
                throw new Error('No current player found');
            }

            // 2. Check if player is already finished
            if (window.GameSaveManager.isPlayerFinished(currentPlayer.name)) {
                throw new Error('Player has already finished the game');
            }

            // 3. Get current position and state data
            const currentPosition = window.PlayerProgressManager.getPlayerPosition(currentPlayer.name);
            const progressState = window.GameSaveManager.load('progressState');
            const spaceData = window.GameDataManager.getSpaceData(currentPosition);

            console.log('End turn check:', {
                player: currentPlayer.name,
                position: currentPosition,
                hasRollState: !!progressState?.rollState,
                spaceData: !!spaceData
            });

            // 4. Validate Required Actions
            const actionsState = window.gameState?.requiredActions;
            if (!actionsState?.isComplete()) {
                throw new Error('Please complete all required actions before ending turn');
            }

            // 5. Validate Move Selection
            const availableMoves = window.PlayerProgressManager.getAvailableMoves(currentPlayer.name);
            if (availableMoves.length > 1 && !this.state.selectedMove) {
                throw new Error('Please select your next move before ending turn');
            }

            // 6. Handle Time Requirements
            if (spaceData?.[0]?.Time) {
                const requiredTime = parseInt(spaceData[0].Time);
                if (!isNaN(requiredTime)) {
                    if (!progressState.playerStates) {
                        progressState.playerStates = {};
                    }
                    if (!progressState.playerStates[currentPlayer.name]) {
                        progressState.playerStates[currentPlayer.name] = { time: 0 };
                    }
                    progressState.playerStates[currentPlayer.name].time += requiredTime;
                    await window.GameSaveManager.save('progressState', progressState);
                }
            }

            // 7. Update Visit History
            const visitHistory = window.GameSaveManager.load('visitHistory') || {};
            const visitKey = `${currentPlayer.name}-${currentPosition}`;
            const currentVisits = visitHistory[visitKey] || 0;
            visitHistory[visitKey] = currentVisits + 1;
            await window.GameSaveManager.save('visitHistory', visitHistory);

            // 8. Process Move
            let moveProcessed = false;
            if (availableMoves.length > 0) {
                const nextPosition = availableMoves.length === 1 ? 
                    availableMoves[0] : 
                    this.state.selectedMove;

                await this.processMove(currentPlayer, nextPosition);
                moveProcessed = true;

                // Check if player reached FINISH
                if (nextPosition === 'FINISH') {
                    const result = await window.GameSaveManager.handlePlayerFinish(currentPlayer.name);
                    if (result.gameEnded) {
                        this.setState({ 
                            showEndGame: true,
                            finalRankings: this.getFinalRankings()
                        });
                        return; // Exit early if game ended
                    }
                }
            }

            // 9. Clear Temporary State
            await window.PlayerProgressManager.clearTemporaryState(currentPlayer.name);

            // 10. Move to Next Player
            const nextPlayer = window.GamePlayerManager.moveToNextPlayer();
            
            // 11. Reset States
            const newState = {
                selectedMove: null,
                currentPlayer: nextPlayer,
                error: null
            };

            // If we didn't process a move, we need to reset the roll state
            if (!moveProcessed) {
                const resetState = window.GameSaveManager.load('progressState');
                resetState.rollState = {
                    hasRolled: false,
                    rolls: [],
                    rollsRequired: window.GameSaveManager.getRollsRequired(resetState.playerPositions[nextPlayer.name]),
                    rollsCompleted: 0
                };
                await window.GameSaveManager.save('progressState', resetState);
            }

            // 12. Update UI State
            this.setState(newState, () => {
                this.checkForAvailableMoves();
            });

            // 13. Final Game End Check
            const gameEndCheck = await this.checkGameEndConditions();
            if (gameEndCheck) {
                this.setState({ 
                    showEndGame: true,
                    finalRankings: this.getFinalRankings()
                });
            }

            console.log('=== End Turn Complete ===');

        } catch (error) {
            console.error('Turn end error:', error);
            this.setState({ error: error.message });
        }
    };

    // Separate function to handle finish position logic
    handleFinishPosition = async (player) => {
        console.log(`Player ${player.name} reached FINISH - processing completion`);
        const result = await window.GamePlayerManager.handlePlayerFinish(player.name);
        
        if (result.success) {
            if (result.gameEnded) {
                console.log('All players finished - triggering end game');
                this.setState({ 
                    showEndGame: true,
                    finalRankings: this.getFinalRankings()
                });
                this.logGameEvent('Game Over! All players have finished!');
            } else {
                this.logGameEvent(
                    `${player.name} has finished! ` +
                    `(${result.finishedCount}/${result.totalPlayers} players complete)`
                );
            }
        }
    };
    
    handleGameEvent = (event) => {
        switch(event.type) {
            case 'TURN_END':
                this.handleEndTurn();
                break;
            case 'DICE_ROLL':
                this.handleDiceRoll(event.data);
                break;
            case 'NEGOTIATE':
                this.handleNegotiate();
                break;
            case 'ERROR':
                this.updateUI('ERROR', event.data);
                break;
            default:
                console.warn('Unhandled game event:', event.type);
        }
    };

    handleMoveSelect = (move, shouldProcess = false) => {
        console.log('Move selected:', move, 'Process:', shouldProcess);
        const currentPlayer = this.state.currentPlayer;
        
        if (currentPlayer && window.PlayerProgressManager.isValidMove(currentPlayer.name, move)) {
            if (shouldProcess) {
                // Only process the move if explicitly requested
                this.processMove(currentPlayer, move).catch(error => {
                    console.error('Error processing move:', error);
                    this.setState({ error: error.message });
                });
            } else {
                // Just update the selected move in state
                this.setState({ 
                    selectedMove: move,
                    error: null 
                });
            }
        } else {
            this.setState({ error: 'Invalid move selected' });
        }
    };

    handleNegotiate = async () => {
        try {
            const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
            if (!currentPlayer) return;
    
            // Clear temporary state but DO NOT update visit history
            await window.PlayerProgressManager.clearTemporaryState(currentPlayer.name);
            
            // Get current state for time update
            const progressState = window.GameSaveManager.load('progressState');
            if (!progressState?.playerStates) {
                progressState.playerStates = {};
            }
            if (!progressState.playerStates[currentPlayer.name]) {
                progressState.playerStates[currentPlayer.name] = {
                    time: 0
                };
            }
            
            // Apply time penalty
            const timePenalty = 1; // Standard negotiation time penalty
            progressState.playerStates[currentPlayer.name].time += timePenalty;
            
            progressState.rollState = {
                hasRolled: false,
                rolls: [],
                rollsRequired: window.GameSaveManager.getRollsRequired(progressState.playerPositions[currentPlayer.name]),
                rollsCompleted: 0
            };

            // Save updated state
            await window.GameSaveManager.save('progressState', progressState);
            
            // Move to next player but keep same space
            const nextPlayer = window.GamePlayerManager.moveToNextPlayer();
            
            this.setState({ 
                negotiating: true,
                currentPlayer: nextPlayer
            });
            
            this.logGameEvent(`${currentPlayer.name} negotiated and took a time penalty of ${timePenalty}`);
        } catch (error) {
            console.error('Negotiation error:', error);
            this.setState({ error: error.message });
        }
    };
    
    handleResize = () => {
        if (!this.containerRef.current) return;

        const rect = this.containerRef.current.getBoundingClientRect();
        this.setState({
            dimensions: {
                width: rect.width,
                height: Math.max(rect.height, 200)
            }
        });
    };
    
    handleStateUpdate = async (type) => {
        if (['progressState', 'players', 'finishedPlayers'].includes(type)) {
            try {
                const gameState = window.GameSaveManager.load('progressState');
                const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
                const finishedPlayers = window.GameSaveManager.load('finishedPlayers') || [];
                
                await this.setState({
                    gameState,
                    currentPlayer,
                    finishedPlayers,
                    gameValidation: await window.GameSaveManager.verifyCompleteGameState()
                });
    
                // Use separate update for move selection
                if (type === 'progressState' || type === 'players') {
                    await this.checkForAvailableMoves();
                    this.updateMoveSelection();
                }
            } catch (error) {
                console.error('State update error:', error);
            }
        }
    };

    logGameEvent = (event) => {
        const logContent = document.querySelector('.log-content');
        if (logContent) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${event}`;
            logContent.appendChild(entry);
            logContent.scrollTop = logContent.scrollHeight;
        }
    };

    // In GameBoard class
    async processMove(currentPlayer, nextPosition) {
        try {
            if (!currentPlayer || !nextPosition) {
                throw new Error('Invalid move parameters');
            }

            console.log(`Processing move for ${currentPlayer.name} to ${nextPosition}`);

            // 1. Pre-move Validations
            const finishedPlayers = window.GameSaveManager?.getFinishedPlayers() || [];
            if (finishedPlayers.includes(currentPlayer.name)) {
                throw new Error('Player has already finished');
            }

            // Get current position and validate move
            const currentPosition = window.PlayerProgressManager.getPlayerPosition(currentPlayer.name);
            if (!window.PlayerProgressManager.isValidMove(currentPlayer.name, nextPosition)) {
                throw new Error(`Invalid move from ${currentPosition} to ${nextPosition}`);
            }

            // 2. Visit Type Determination for current space
            const visitHistory = window.GameSaveManager.load('visitHistory') || {};
            const currentVisitKey = `${currentPlayer.name}-${currentPosition}`;
            const currentVisits = visitHistory[currentVisitKey] || 0;
            visitHistory[currentVisitKey] = currentVisits + 1;

            // Update visit history
            await window.GameSaveManager.save('visitHistory', visitHistory);

            // 3. Get Space Data for New Position with Visit Type
            const targetVisitKey = `${currentPlayer.name}-${nextPosition}`;
            const targetVisits = visitHistory[targetVisitKey] || 0;
            const visitType = targetVisits === 0 ? 'FIRST' : 'SUBSEQUENT';
            
            const spaceData = window.GameDataManager.getSpaceData(nextPosition);
            if (!spaceData?.[0]) {
                throw new Error(`No data found for space: ${nextPosition}`);
            }

            const visitTypeData = spaceData.find(space => space['Visit Type'] === visitType);
            if (!visitTypeData) {
                console.warn(`No matching visit type data found for: ${nextPosition}, type: ${visitType}`);
            }

            // 4. State Updates with Retries
            let moveSuccessful = false;
            let attempts = 0;
            while (attempts < 3 && !moveSuccessful) {
                try {
                    // Commit any temporary state first
                    await window.PlayerProgressManager.commitTemporaryState(currentPlayer.name);
                    
                    // Update position
                    const success = await window.PlayerProgressManager.updatePlayerPosition(
                        currentPlayer.name,
                        nextPosition
                    );

                    if (success) {
                        // Verify position update
                        const verifyPosition = window.PlayerProgressManager.getPlayerPosition(currentPlayer.name);
                        if (verifyPosition === nextPosition) {
                            moveSuccessful = true;
                            break;
                        }
                    }
                } catch (moveError) {
                    console.error('Move attempt failed:', moveError);
                }
                attempts++;
                if (!moveSuccessful) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            if (!moveSuccessful) {
                throw new Error('Failed to update player position after retries');
            }

            // 5. FINISH Processing Before State Reset
            if (nextPosition === 'FINISH') {
                await this.handleFinishPosition(currentPlayer);
                // Check if game has ended
                const gameState = window.GameSaveManager.load('progressState');
                if (gameState?.gameEnded) {
                    this.setState({ 
                        showEndGame: true,
                        finalRankings: this.getFinalRankings()
                    });
                    return;
                }
            }

            // 6. Reset Move State & Get New Moves
            this.setState({
                selectedMove: null,
                availableMoves: [],
                showMoveSelection: false,
                error: null  // Clear any previous errors
            }, () => {
                this.checkForAvailableMoves();
            });

            console.log("=== Move Processing Complete ===");

        } catch (error) {
            console.error('Move processing error:', error);
            // Set error state for user feedback
            this.setState({ 
                error: error.message,
                showMoveSelection: true  // Keep showing moves so user can try again
            });
            throw error;
        }
    }

    render() {
        // First, get ALL values from state that we need
        const { 
            gameState,
            gameValidation,
            currentPlayer,
            finishedPlayers = [],
            loading,
            error,
            showEndGame,
            showMoveSelection,
            availableMoves = [],
            selectedMove,
            showInstructions,
            showLog
        } = this.state;
    
        // If we're loading, show the loading overlay
        if (loading) {
            return React.createElement('div', {
                className: 'loading-overlay'
            }, [
                React.createElement('div', {
                    key: 'spinner',
                    className: 'loading-spinner'
                }),
                React.createElement('div', {
                    key: 'message',
                    className: 'loading-message'
                }, 'Loading game board...'),
                React.createElement('div', {
                    key: 'status',
                    className: 'loading-status'
                }, 'Initializing game components and loading saved state...')
            ]);
        }
    
        // If there's an error, show the error screen
        if (error) {
            return React.createElement('div', {
                className: 'error-container'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-bold mb-4'
                }, 'Game Initialization Failed'),
                React.createElement('p', {
                    key: 'message',
                    className: 'text-red-600 mb-4'
                }, error),
                React.createElement('button', {
                    key: 'button',
                    onClick: () => window.location.href = 'player-setup.html',
                    className: 'game-button mt-4'
                }, 'Return to Setup')
            ]);
        }
    
        // Check for game end conditions
        const allPlayers = window.GameSaveManager.load('players') || [];
        const shouldShowEndGame = 
            (gameValidation?.isValid && gameValidation.gameEnded) || 
            (gameState?.gameEnded) || 
            (finishedPlayers.length === allPlayers.length);
    
        // Show end game screen if needed
        if (shouldShowEndGame) {
            return React.createElement('div', {
                className: 'end-game-screen'
            }, [
                // Victory banner
                React.createElement('h1', {
                    key: 'title',
                    className: 'text-4xl font-bold mb-8 text-center'
                }, 'Game Complete!'),
    
                // LeaderBoard at end game
                React.createElement(window.LeaderBoard, {
                    key: 'leaderboard',
                    className: 'w-full max-w-2xl mx-auto mb-8'
                }),
                
                // Winner announcement
                this.renderWinnerSection(),
    
                // New Game Button
                React.createElement('button', {
                    key: 'new-game',
                    onClick: () => window.location.href = 'player-setup.html',
                    className: 'game-button text-xl px-8 py-4'
                }, 'Start New Game')
            ]);
        }
    
        // Main game board layout
        return React.createElement('div', {
            ref: this.containerRef,
            className: 'game-container'
        }, [
            // Leaderboard Row
            React.createElement('div', {
                key: 'leaderboard-row',
                className: 'game-row'
            }, React.createElement(window.LeaderBoard)),
    
            // Progress Map Row
            React.createElement('div', {
                key: 'progress-row',
                className: 'game-row'
            }, React.createElement(window.ProgressMap)),
    
            // Main Game Area - Three Columns
            React.createElement('div', {
                key: 'main-game-row',
                className: 'game-row grid grid-cols-3 gap-4'
            }, [
                // Left Column - Space Info
                React.createElement('div', {
                    key: 'left-column',
                    className: 'game-column'
                }, [
                    React.createElement(window.SpaceInfo),
                    React.createElement(window.PlayerStatus)
                ]),
    
                // Middle Column - Actions and Moves
                React.createElement('div', {
                    key: 'middle-column',
                    className: 'game-column'
                }, [
                    React.createElement(window.ActionRequirements),
                    // Only show moves section if we have moves
                    availableMoves.length > 0 && React.createElement('div', {
                        key: 'moves-container',
                        className: 'bg-white rounded-lg shadow-sm p-4'
                    }, 
                        availableMoves.length === 1 ? 
                        // Single move display
                        React.createElement('div', {
                            className: 'text-lg'
                        }, [
                            React.createElement('h3', {
                                key: 'title',
                                className: 'font-bold mb-2'
                            }, '🎯 Next Move'),
                            React.createElement('p', {
                                key: 'move',
                                className: 'text-base'
                            }, availableMoves[0])
                        ]) 
                        : 
                        // Multiple moves selection
                        React.createElement(window.MoveSelection, {
                            moves: availableMoves,
                            onSelect: this.handleMoveSelect,
                            selectedMove: selectedMove
                        })
                    ),
                    React.createElement(window.DiceSystem)
                ]),
    
                // Right Column - Game State
                React.createElement('div', {
                    key: 'right-column',
                    className: 'game-column'
                }, [
                    React.createElement(window.DiceResult),
                    React.createElement(window.GameStateDisplay)
                ])
            ]),
    
            // Controls Row
            React.createElement('div', {
                key: 'controls-row',
                className: 'game-row'
            }, React.createElement('div', {
                className: 'button-group'
            }, [
                React.createElement('button', {
                    key: 'end-turn',
                    className: 'game-button',
                    onClick: this.handleEndTurn,
                    disabled: !currentPlayer || this.state.buttonsDisabled
                }, 'End Turn'),
                React.createElement('button', {
                    key: 'negotiate',
                    className: 'game-button',
                    onClick: this.handleNegotiate,
                    disabled: !currentPlayer || this.state.buttonsDisabled
                }, 'Negotiate'),
                React.createElement('button', {
                    key: 'instructions',
                    className: 'game-button',
                    onClick: this.toggleInstructions
                }, 'Game Instructions'),
                React.createElement('button', {
                    key: 'log',
                    className: 'game-button',
                    onClick: this.toggleLog
                }, 'Game Log')
            ])),
    
            // Modals
            showInstructions && React.createElement('div', {
                key: 'instructions-modal',
                className: 'modal visible'
            }, React.createElement(window.GameInstructions)),
    
            showLog && React.createElement('div', {
                key: 'log-modal',
                className: 'modal visible'
            }, [
                React.createElement('h2', {
                    key: 'title'
                }, 'Game Log'),
                React.createElement('div', {
                    key: 'content',
                    className: 'log-content'
                })
            ])
        ]);
    }
        
    renderLeftColumn() {
        return React.createElement('div', {
          key: 'left-column',
          className: 'game-column bg-white rounded-lg shadow-sm p-4'
        }, [
          // Space info without actions
          React.createElement('div', {
            key: 'space-info',
            id: 'space-info-root'  // Let SpaceInfo component mount here directly
          })
        ]);
    };
    
    // In game-board-controller.js
    renderMiddleColumn() {
        const { availableMoves = [], selectedMove } = this.state;
        
        return React.createElement('div', {
            key: 'middle-column',
            className: 'game-column flex flex-col gap-4'
            }, [
            // Combined Actions and Time Container
            React.createElement('div', {
                key: 'requirements-container',
                className: 'bg-white rounded-lg shadow-sm p-4'
            }, 
                React.createElement('div', {
                id: 'action-requirements-root'  // Single mount point for actions component
                })
            ),
            
            // Moves section - only shown when we have moves
            availableMoves.length > 0 && React.createElement('div', {
                key: 'moves-container',
                className: 'bg-white rounded-lg shadow-sm p-4'
            }, 
                availableMoves.length === 1 ? 
                // Single move display
                React.createElement('div', {
                    className: 'text-lg'
                }, [
                    React.createElement('h3', {
                    key: 'title',
                    className: 'font-bold mb-2'
                    }, '🎯 Next Move'),
                    React.createElement('p', {
                    key: 'move',
                    className: 'text-base'
                    }, availableMoves[0])
                ]) 
                : 
                // Multiple moves selection
                React.createElement(window.MoveSelection, {
                    moves: availableMoves,
                    onSelect: this.handleMoveSelect,
                    selectedMove: selectedMove
                })
            ),
            
            // Dice system elements
            React.createElement('div', {
                key: 'dice-prompt',
                id: 'dice-prompt-root',
                className: 'bg-white rounded-lg shadow-sm p-4'
            }),
            React.createElement('div', {
                key: 'dice-system',
                id: 'dice-system-root',
                className: 'bg-white rounded-lg shadow-sm p-4'
            })
        ]);
    }
    
    renderRightColumn() {
        return React.createElement('div', {
            key: 'right-column',
            className: 'game-column bg-white rounded-lg shadow-sm p-4'
        }, [
            // Dice result section
            React.createElement('div', {
                key: 'dice-result',
                id: 'dice-result-root',
                className: 'mb-4'
            }),
            
            // Game state display section
            React.createElement('div', {
                key: 'game-state',
                className: 'flex-1'
            }, React.createElement(window.GameStateDisplay))
        ]);
    }
    
    renderModals() {
        return [
            
            // Instructions Modal
            this.state.showInstructions && React.createElement('div', {
                key: 'instructions-modal',
                id: 'game-instructions-root',
                className: 'modal visible'
            }, window.GameInstructions ? React.createElement(window.GameInstructions) : null),
    
            // Game Log Modal
            React.createElement('div', {
                key: 'log-modal',
                id: 'gameTrackingLog',
                className: `modal ${this.state.showLog ? 'visible' : ''}`
            }, this.state.showLog ? [
                React.createElement('h2', {
                    key: 'title'
                }, 'Game Log'),
                React.createElement('div', {
                    key: 'content',
                    className: 'log-content'
                })
            ] : null)
        ];
    };
    
    renderEndGameScreen = () => {
        const { finalRankings } = this.state;
        
        return React.createElement('div', {
            className: 'end-game-screen'
        }, [
            // Victory banner
            React.createElement('h1', {
                key: 'title',
                className: 'text-4xl font-bold mb-8 text-center'
            }, 'Game Complete!'),

            // Important: LeaderBoard mounting - This is the key change
            React.createElement('div', {
                key: 'leaderboard',
                id: 'leaderboard-root',
                className: 'w-full max-w-2xl mx-auto mb-8'
            }, React.createElement(window.LeaderBoard)), // Explicitly create LeaderBoard component
            
            // Winner announcement
            finalRankings?.[0] && React.createElement('div', {
                key: 'winner',
                className: 'mb-8 text-center'
            }, [
                React.createElement('h2', {
                    key: 'winner-title',
                    className: 'text-2xl font-semibold'
                }, 'Winner:'),
                React.createElement('p', {
                    key: 'winner-name',
                    className: 'text-3xl font-bold mt-2'
                }, finalRankings[0].name)
            ]),

            // New Game Button
            React.createElement('button', {
                key: 'new-game',
                onClick: () => window.location.href = 'player-setup.html',
                className: 'game-button text-xl px-8 py-4'
            }, 'Start New Game')
        ]);
    };

    // Add helper method for winner section
    renderWinnerSection = () => {
        const rankings = this.getFinalRankings();
        if (!rankings?.length) return null;

        return React.createElement('div', {
            key: 'winner',
            className: 'mb-8 text-center'
        }, [
            React.createElement('h2', {
                key: 'winner-title',
                className: 'text-2xl font-semibold'
            }, 'Winner:'),
            React.createElement('p', {
                key: 'winner-name',
                className: 'text-3xl font-bold mt-2'
            }, rankings[0].name)
        ]);
    };

    // Game State Management
    subscribeToStateUpdates = () => {
        const stateTypes = ['progressState', 'players', 'finishedPlayers'];
        
        // Create a single debounced update function
        const debouncedUpdate = _.debounce(async () => {
            console.log('State update triggered - checking game end conditions');
            
            // Get all required states
            const gameState = window.GameSaveManager.load('progressState');
            const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
            const finishedPlayers = window.GameSaveManager.load('finishedPlayers') || [];
            const allPlayers = window.GameSaveManager.load('players') || [];
            
            // Verify complete game state
            const gameValidation = await window.GameSaveManager.verifyCompleteGameState();
            console.log('Game validation result:', gameValidation);
            
            // Check all possible end game conditions
            const shouldShowEndGame = (
                gameValidation.isValid && (
                    gameValidation.gameEnded ||
                    gameValidation.allPlayersFinished ||
                    finishedPlayers.length === allPlayers.length ||
                    gameState?.gameEnded
                )
            );
            
            // Log detailed end game condition state
            console.log('End game conditions:', {
                validationValid: gameValidation.isValid,
                validationEnded: gameValidation.gameEnded,
                allFinished: gameValidation.allPlayersFinished,
                finishedCount: finishedPlayers.length,
                totalPlayers: allPlayers.length,
                stateEnded: gameState?.gameEnded,
                shouldShowEndGame: shouldShowEndGame,
                currentShowEndGame: this.state.showEndGame
            });
    
            // Update state if end game conditions are met
            if (shouldShowEndGame && !this.state.showEndGame) {
                console.log('Triggering end game screen display');
                this.setState({
                    gameState,
                    currentPlayer,
                    finishedPlayers,
                    showEndGame: true,
                    finalRankings: this.getFinalRankings()
                });
                this.logGameEvent('Game has ended! Displaying final results.');
            } else {
                // Normal state update
                this.setState({
                    gameState,
                    currentPlayer,
                    finishedPlayers
                });
            }
    
            // Update player colors if we have a current player
            if (currentPlayer) {
                this.setupPlayerColors(currentPlayer);
            }
        }, 50);
    
        // Subscribe to all relevant state changes
        window.GameSaveManager?.subscribe((type) => {
            if (stateTypes.includes(type)) {
                debouncedUpdate();
            }
        });
    };

    setupPlayerColors = (player) => {
        if (player?.palette && window.PlayerPalettes) {
            const colors = window.PlayerPalettes.getPlayerColorScheme(player.palette);
            if (colors && window.GameColorManager) {
                window.GameColorManager.updateThemeColors(colors);
            }
        }
    };

    toggleInstructions = () => {
        this.setState(prevState => {
            const showInstructions = !prevState.showInstructions;
            
            // Get modal and backdrop elements
            const instructionsModal = document.getElementById('game-instructions-root');
            const modalBackdrop = document.querySelector('.modal-backdrop');
            
            if (showInstructions) {
                // Show modal and backdrop
                instructionsModal?.classList.add('visible');
                modalBackdrop?.classList.add('visible');
            } else {
                // Hide modal and backdrop
                instructionsModal?.classList.remove('visible');
                modalBackdrop?.classList.remove('visible');
            }
            
            return {
                showInstructions,
                showLog: false
            };
        });
    };

    toggleLog = () => {
        this.setState(prevState => ({
            showLog: !prevState.showLog,
            showInstructions: false
        }));
    };

    updateMoveSelection() {
        const moveSelectionRoot = document.getElementById('move-selection-root');
        if (moveSelectionRoot && this.state.showMoveSelection) {
            ReactDOM.render(
                React.createElement(window.MoveSelection, {
                    moves: this.state.availableMoves,
                    onSelect: this.handleMoveSelect,
                    selectedMove: this.state.selectedMove
                }),
                moveSelectionRoot
            );
        }
    }
    
    // UI Management
    updateUI = (type, data) => {
        switch(type) {
            case 'ERROR':
                this.setState({ error: data });
                break;
            case 'LOADING':
                this.setState({ loading: data });
                break;
            case 'MODAL':
                if (data === 'instructions') {
                    this.toggleInstructions();
                } else if (data === 'log') {
                    this.toggleLog();
                }
                break;
            default:
                console.warn('Unhandled UI update:', type);
        }
    };

    // Verify all mount points exist
    verifyMountPoints() {
        console.log("Verifying mount points...");
        const missingPoints = this.requiredMountPoints.filter(id => !document.getElementById(id));
        
        if (missingPoints.length > 0) {
            throw new Error(`Missing mount points: ${missingPoints.join(', ')}`);
        }
        console.log("✓ All mount points verified");
        return true;
    }

}
// Make component globally available
window.GameBoard = GameBoard;