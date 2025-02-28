// RightColumn.js
const RightColumn = ({
    diceResult,
    hasRolled,
    rollsRequired,
    rollsCompleted,
    gameState
}) => {
    if (!gameState) return null;
    
    // Get recent actions from game state or visit history
    const visitHistory = window.GameSaveManager.load('visitHistory') || [];
    const recentActions = Array.isArray(visitHistory) ? 
        visitHistory.slice(-5).reverse() : // Last 5 actions, most recent first
        [];
    
    return React.createElement('div', { className: 'right-column' }, [
        // Dice Results Section
        React.createElement('div', {
            key: 'dice-results',
            className: 'dice-results'
        }, [
            React.createElement('h3', { key: 'title' }, 'Dice Results'),
            React.createElement('div', {
                key: 'dice-display',
                className: 'dice-display'
            }, 
                diceResult ?
                    React.createElement('div', {
                        key: 'result',
                        className: 'dice-result'
                    }, [
                        React.createElement('div', {
                            key: 'face',
                            className: 'dice-face'
                        }, diceResult),
                        React.createElement('p', {
                            key: 'info',
                            className: 'dice-info'
                        }, `Roll ${rollsCompleted} of ${rollsRequired}`)
                    ])
                    : React.createElement('p', { key: 'no-roll' }, 'Roll the dice to continue.')
            )
        ]),
        
        // Recent Actions Section
        React.createElement('div', {
            key: 'recent-actions',
            className: 'recent-actions'
        }, [
            React.createElement('h3', { key: 'title' }, 'Recent Actions'),
            recentActions.length > 0 ?
                React.createElement('ul', {
                    key: 'action-list',
                    className: 'action-list'
                }, 
                    recentActions.map((action, index) =>
                        React.createElement('li', {
                            key: index,
                            className: 'action-item'
                        }, [
                            React.createElement('span', {
                                key: 'player',
                                className: 'action-player',
                                style: { color: action.playerColor }
                            }, action.player),
                            React.createElement('span', {
                                key: 'description',
                                className: 'action-description'
                            }, action.description),
                            React.createElement('span', {
                                key: 'space',
                                className: 'action-space'
                            }, action.space)
                        ])
                    )
                )
                : React.createElement('p', { key: 'no-actions' }, 'No actions recorded yet.')
        ]),
        
        // Game State Info Section
        React.createElement('div', {
            key: 'game-state-info',
            className: 'game-state-info'
        }, [
            React.createElement('h3', { key: 'title' }, 'Game Information'),
            React.createElement('div', {
                key: 'game-stats',
                className: 'game-stats'
            }, [
                React.createElement('p', { key: 'phase' }, [
                    React.createElement('strong', null, 'Current Phase:'),
                    ` ${getCurrentPhase(gameState)}`
                ]),
                React.createElement('p', { key: 'players' }, [
                    React.createElement('strong', null, 'Players:'),
                    ` ${window.GameSaveManager.load('players')?.length || 0}`
                ]),
                React.createElement('p', { key: 'turns' }, [
                    React.createElement('strong', null, 'Turns Completed:'),
                    ` ${gameState.turnsCompleted || 0}`
                ])
            ])
        ])
    ]);
};

// Helper function to determine current game phase
function getCurrentPhase(gameState) {
    // Example implementation
    const players = window.GameSaveManager.load('players') || [];
    const positions = gameState.playerPositions || {};
    
    // Count number of players in each phase
    const phaseCount = {};
    
    for (const player of players) {
        const position = positions[player.name];
        if (position) {
            const spaceData = window.GameDataManager.getSpaceData(position);
            const phase = spaceData?.Phase;
            if (phase) {
                phaseCount[phase] = (phaseCount[phase] || 0) + 1;
            }
        }
    }
    
    // Find the phase with most players
    let mostCommonPhase = 'N/A';
    let maxCount = 0;
    
    for (const [phase, count] of Object.entries(phaseCount)) {
        if (count > maxCount) {
            mostCommonPhase = phase;
            maxCount = count;
        }
    }
    
    return mostCommonPhase;
}

// Make RightColumn available globally
window.RightColumn = RightColumn;