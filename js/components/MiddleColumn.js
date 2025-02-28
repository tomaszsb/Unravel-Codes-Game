// MiddleColumn.js
const MiddleColumn = ({
    currentPlayer,
    availableMoves,
    selectedMove,
    onMoveSelect,
    gameState
}) => {
    if (!currentPlayer || !gameState) return null;
    
    const currentSpace = window.PlayerProgressManager.getPlayerPosition(currentPlayer.name);
    
    return React.createElement('div', { className: 'middle-column' }, [
        // Progress Map
        React.createElement('div', {
            key: 'progress-map',
            className: 'progress-map'
        }, [
            React.createElement('h3', { key: 'title' }, 'Game Progress'),
            React.createElement('div', {
                key: 'map-container',
                className: 'map-container'
            }, 
                gameState.mainPath && gameState.mainPath.map((space, index) => {
                    const isCurrentSpace = space === currentSpace;
                    const playerHere = [];
                    
                    // Find all players at this space
                    Object.entries(gameState.playerPositions || {}).forEach(([playerName, position]) => {
                        if (position === space) {
                            const player = window.GameSaveManager.load('players')
                                .find(p => p.name === playerName);
                            if (player) {
                                playerHere.push(player);
                            }
                        }
                    });
                    
                    return React.createElement('div', {
                        key: space,
                        className: `map-space ${isCurrentSpace ? 'current-space' : ''}`,
                        title: space
                    }, [
                        React.createElement('div', {
                            key: 'space-name',
                            className: 'space-name'
                        }, space),
                        React.createElement('div', {
                            key: 'player-markers',
                            className: 'player-markers'
                        }, 
                            playerHere.map(player => 
                                React.createElement('div', {
                                    key: player.name,
                                    className: 'player-marker',
                                    style: { backgroundColor: player.color },
                                    title: player.name
                                })
                            )
                        )
                    ]);
                })
            )
        ]),
        
        // Moves Section
        React.createElement('div', {
            key: 'moves-section',
            className: 'moves-section'
        }, [
            React.createElement('h3', { key: 'title' }, 'Available Moves'),
            availableMoves.length > 0 ? 
                React.createElement(MoveSelection, {
                    key: 'move-selection',
                    moves: availableMoves,
                    onSelect: onMoveSelect
                }) 
                : selectedMove ?
                    React.createElement(SingleMoveDisplay, {
                        key: 'single-move',
                        move: selectedMove
                    })
                    : React.createElement('p', { key: 'no-moves' }, 
                        'No moves available. Roll the dice or end your turn.'
                    )
        ])
    ]);
};

// Make MiddleColumn available globally
window.MiddleColumn = MiddleColumn;