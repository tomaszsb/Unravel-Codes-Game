// GameControls.js
const GameControls = ({
    onEndTurn,
    onDiceRoll,
    onToggleInstructions,
    onToggleLog,
    hasRolled,
    canEndTurn,
    gameState
}) => {
    if (!gameState) return null;
    
    return React.createElement('div', { className: 'game-controls' }, [
        // Primary Controls
        React.createElement('div', {
            key: 'primary-controls',
            className: 'primary-controls'
        }, [
            React.createElement('button', {
                key: 'dice-roll',
                className: 'dice-roll-button',
                onClick: onDiceRoll,
                disabled: hasRolled
            }, 'Roll Dice'),
            
            React.createElement('button', {
                key: 'end-turn',
                className: 'end-turn-button',
                onClick: onEndTurn,
                disabled: !canEndTurn
            }, 'End Turn')
        ]),
        
        // Secondary Controls
        React.createElement('div', {
            key: 'secondary-controls',
            className: 'secondary-controls'
        }, [
            React.createElement('button', {
                key: 'instructions',
                className: 'instructions-button',
                onClick: onToggleInstructions
            }, 'Game Instructions'),
            
            React.createElement('button', {
                key: 'log',
                className: 'log-button',
                onClick: onToggleLog
            }, 'Action Log')
        ])
    ]);
};

// Make GameControls available globally
window.GameControls = GameControls;