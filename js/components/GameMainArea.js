// GameMainArea.js
const GameMainArea = ({
    gameState,
    currentPlayer,
    availableMoves,
    selectedMove,
    onMoveSelect,
    diceResult,
    hasRolled,
    rollsRequired,
    rollsCompleted
}) => {
    if (!gameState || !currentPlayer) return null;

    return React.createElement('div', { className: 'game-main-area' }, [
        // Left Column
        React.createElement(LeftColumn, {
            key: 'left-column',
            currentPlayer,
            gameState
        }),
        
        // Middle Column
        React.createElement(MiddleColumn, {
            key: 'middle-column',
            currentPlayer,
            availableMoves,
            selectedMove,
            onMoveSelect,
            gameState
        }),
        
        // Right Column
        React.createElement(RightColumn, {
            key: 'right-column',
            diceResult,
            hasRolled,
            rollsRequired,
            rollsCompleted,
            gameState
        })
    ]);
};

// Make GameMainArea available globally
window.GameMainArea = GameMainArea;