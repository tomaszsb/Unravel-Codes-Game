/**
 * GameBoard.js - Main controller component for the game board
 * Handles the overall game state and orchestrates other components
 */

class GameBoard extends React.Component {
    constructor(props) {
        super(props);
        
        this.state = {
            isLoading: true,
            error: null,
            currentPlayer: null,
            availableMoves: [],
            selectedMove: null,
            showInstructions: false,
            showLog: false,
            showEndGame: false,
            winnerData: null
        };
        
        // Refs
        this.containerRef = React.createRef();
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.handleMoveSelect = this.handleMoveSelect.bind(this);
        this.handleEndTurn = this.handleEndTurn.bind(this);
        this.handleNegotiate = this.handleNegotiate.bind(this);
        this.toggleInstructions = this.toggleInstructions.bind(this);
        this.toggleLog = this.toggleLog.bind(this);
        this.processMove = this.processMove.bind(this);
        this.getFinalRankings = this.getFinalRankings.bind(this);
        this.checkGameEndConditions = this.checkGameEndConditions.bind(this);
    }
    
    async componentDidMount() {
        try {
            console.log('GameBoard component mounting...');
            
            // Ensure systems are initialized before proceeding - FIXED: Check directly for isInitialized property
            if (!(window.GameSystemInitializer?.initialized) &&
                !(window.GameDataManager?.isReady() && 
                  window.GamePlayerManager?.isInitialized && 
                  window.PlayerProgressManager?.isInitialized)) {
                console.log('Game systems not initialized, attempting initialization...');
                try {
                    if (window.GameSystemInitializer?.initializeWithRetries) {
                        await window.GameSystemInitializer.initializeWithRetries(2);
                    } else if (window.GameSystemCheck?.repairSystems) {
                        await window.GameSystemCheck.repairSystems();
                    } else {
                        throw new Error("No initialization or repair system available");
                    }
                } catch (error) {
                    console.error('Failed to initialize game systems:', error);
                    throw new Error('Game systems initialization failed. Please refresh the page.');
                }
            }
            
            await this.initialize();
        } catch (error) {
            console.error('GameBoard initialization error:', error);
            this.setState({ 
                isLoading: false, 
                error: error.message || 'Failed to initialize game' 
            });
        }
    }
    
    async initialize() {
        // Double-check core systems are ready - FIXED: Check directly for isInitialized property
        if (!window.GameDataManager?.isReady()) {
            console.error('GameDataManager not ready');
            throw new Error('Game data not ready. Please refresh or restart setup.');
        }
        
        if (!window.GamePlayerManager?.isInitialized) {
            console.error('GamePlayerManager not initialized');
            throw new Error('Player manager not ready. Please refresh or restart setup.');
        }
        
        if (!window.PlayerProgressManager?.isInitialized) {
            console.error('PlayerProgressManager not initialized');
            throw new Error('Progress manager not ready. Please refresh or restart setup.');
        }
        
        console.log('All game systems verified, proceeding with GameBoard initialization');
        
        // Load current player
        const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
        console.log('Current player:', currentPlayer);
        
        // Get available moves
        const playerName = currentPlayer?.name;
        let availableMoves = [];
        
        if (playerName) {
            availableMoves = await window.PlayerProgressManager.getAvailableMoves(playerName);
            console.log('Available moves:', availableMoves);
        }
        
        // Check for game end
        const gameEnded = await this.checkGameEndConditions();
        console.log('Game ended status:', gameEnded);
        
        // Update state
        this.setState({
            isLoading: false,
            currentPlayer,
            availableMoves,
            showEndGame: gameEnded
        });
        
        console.log('GameBoard initialized with:', {
            player: currentPlayer?.name,
            moves: availableMoves,
            gameEnded
        });
    }
    
    async handleMoveSelect(move) {
        this.setState({ selectedMove: move });
        
        const { currentPlayer } = this.state;
        if (!currentPlayer || !move) return;
        
        try {
            await this.processMove(currentPlayer, move);
        } catch (error) {
            console.error('Move processing error:', error);
            // Handle error appropriately
        }
    }
    
    async processMove(player, move) {
        // Validate move
        if (!window.PlayerProgressManager.validateMove(player.name, move)) {
            throw new Error('Invalid move');
        }
        
        // Update position
        await window.PlayerProgressManager.updatePlayerPosition(player.name, move);
        
        // Check for game end
        await this.checkGameEndConditions();
        
        // Refresh available moves
        const availableMoves = await window.PlayerProgressManager.getAvailableMoves(player.name);
        this.setState({ availableMoves, selectedMove: null });
    }
    
    async handleEndTurn() {
        const { currentPlayer } = this.state;
        if (!currentPlayer) return;
        
        try {
            // Reset dice system
            if (window.DiceSystem && window.DiceSystem.resetDice) {
                window.DiceSystem.resetDice();
            }
            
            // Commit any temporary state
            await window.PlayerProgressManager.commitTemporaryState(currentPlayer.name);
            
            // Move to next player
            const nextPlayer = window.GamePlayerManager.moveToNextPlayer();
            
            // Update player colors when changing players
            if (window.ColorManager && nextPlayer) {
                window.ColorManager.updatePlayerColors(nextPlayer);
            }
            
            // Check for game end
            const gameEnded = await this.checkGameEndConditions();
            
            // Get available moves for next player
            let availableMoves = [];
            if (nextPlayer && !gameEnded) {
                availableMoves = await window.PlayerProgressManager.getAvailableMoves(nextPlayer.name);
            }
            
            // Update state
            this.setState({
                currentPlayer: nextPlayer,
                availableMoves,
                selectedMove: null,
                showEndGame: gameEnded
            });
        } catch (error) {
            console.error('End turn error:', error);
            // Handle error appropriately
        }
    }
    
    async handleNegotiate() {
        // Implementation for negotiation
        console.log('Negotiate action triggered');
        
        // Reset dice system when negotiating
        if (window.DiceSystem && window.DiceSystem.resetDice) {
            window.DiceSystem.resetDice();
        }
    }
    
    toggleInstructions() {
        this.setState(prevState => ({
            showInstructions: !prevState.showInstructions
        }));
    }
    
    toggleLog() {
        this.setState(prevState => ({
            showLog: !prevState.showLog
        }));
    }
    
    async checkGameEndConditions() {
        try {
            const progressState = window.GameSaveManager.load('progressState');
            if (!progressState) return false;
            
            const finishedPlayers = window.GameSaveManager.getFinishedPlayers() || [];
            const allPlayers = window.GameSaveManager.load('players') || [];
            
            // Game is ended if all players have finished
            const isEnded = finishedPlayers.length > 0 && finishedPlayers.length === allPlayers.length;
            
            // Update saved state if needed
            if (isEnded !== Boolean(progressState?.gameEnded)) {
                progressState.gameEnded = isEnded;
                await window.GameSaveManager.save('progressState', progressState);
            }
            
            return isEnded;
        } catch (error) {
            console.error('Game end check error:', error);
            return false;
        }
    }
    
    getFinalRankings() {
        try {
            const finishedPlayers = window.GameSaveManager.getFinishedPlayers() || [];
            const players = window.GameSaveManager.load('players') || [];
            
            if (!finishedPlayers.length || !players.length) return [];
            
            // Map player details with finish order
            return players.map(player => ({
                name: player.name,
                color: player.color,
                finishOrder: finishedPlayers.indexOf(player.name) + 1
            })).sort((a, b) => a.finishOrder - b.finishOrder);
        } catch (error) {
            console.error('Error getting final rankings:', error);
            return [];
        }
    }
    
    render() {
        const { 
            isLoading, error, currentPlayer, availableMoves, selectedMove,
            showInstructions, showLog, showEndGame 
        } = this.state;
    
        // Loading screen
        if (isLoading) {
            return React.createElement('div', {
                className: 'loading-container'
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
    
        // Error screen
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
    
        // End game screen
        if (showEndGame) {
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
                    key: 'leaderboard'
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
        
        // Main game layout
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
                    React.createElement(window.SpaceInfo, {
                        key: 'space-info'
                    })
                ]),
    
                // Middle Column - Actions and Moves
                React.createElement('div', {
                    key: 'middle-column',
                    className: 'game-column'
                }, [
                    React.createElement(window.ActionRequirements, {
                        key: 'action-requirements'
                    }),
                    // Only show moves section if we have moves
                    availableMoves.length > 0 && React.createElement('div', {
                        key: 'moves-container',
                        className: 'bg-white rounded-lg shadow-sm p-4'
                    }, 
                        availableMoves.length === 1 ? 
                        // Single move display
                        React.createElement(window.SingleMoveDisplay, {
                            key: 'single-move',
                            move: availableMoves[0]
                        }) 
                        : 
                        // Multiple moves selection
                        React.createElement(window.MoveSelection, {
                            key: 'move-selection',
                            moves: availableMoves,
                            onSelect: this.handleMoveSelect,
                            selectedMove: selectedMove
                        })
                    ),
                    React.createElement(window.DiceSystem, {
                        key: 'dice-system'
                    })
                ]),
    
                // Right Column - Game State
                React.createElement('div', {
                    key: 'right-column',
                    className: 'game-column'
                }, [
                    React.createElement(window.PlayerStatus, {
                        key: 'player-status'
                    }),
                    React.createElement(window.DiceResult, {
                        key: 'dice-result'
                    }),
                    React.createElement(window.GameStateDisplay, {
                        key: 'game-state-display'
                    })
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
                    disabled: !currentPlayer
                }, 'End Turn'),
                React.createElement('button', {
                    key: 'negotiate',
                    className: 'game-button',
                    onClick: this.handleNegotiate,
                    disabled: !currentPlayer
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
}

// Register with window object immediately
window.GameBoard = GameBoard;
console.log('GameBoard has been registered in window object, type is: ' + typeof window.GameBoard);

// For debugging - add a global variable that's easy to check
window.GAMEBOARD_LOADED = true;
console.log('GAMEBOARD_LOADED flag set to true');

// Add a more robust registration method
Object.defineProperty(window, 'GameBoardComponent', {
    value: GameBoard,
    writable: false,
    configurable: false
});
