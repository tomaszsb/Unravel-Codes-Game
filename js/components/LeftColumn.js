// LeftColumn.js
const LeftColumn = ({ currentPlayer, gameState }) => {
    if (!currentPlayer || !gameState) return null;
    
    const currentSpace = window.PlayerProgressManager.getPlayerPosition(currentPlayer.name);
    const spaceData = window.GameDataManager.getSpaceData(currentSpace);
    
    return React.createElement('div', { className: 'left-column' }, [
        // Card Management Component
        React.createElement(window.CardManagementComponent, {
            key: 'card-management',
            playerName: currentPlayer.name
        }),
        // Space info section
        React.createElement('div', {
            key: 'space-info',
            className: 'space-info'
        }, [
            React.createElement('h3', { key: 'title' }, 'Current Space'),
            React.createElement('div', { 
                key: 'card',
                className: 'space-card'
            }, [
                React.createElement('h4', { key: 'name' }, spaceData?.['Space Name'] || currentSpace),
                React.createElement('div', {
                    key: 'details',
                    className: 'space-details'
                }, [
                    React.createElement('p', { key: 'phase' }, [
                        React.createElement('strong', null, 'Phase:'),
                        ` ${spaceData?.Phase || 'N/A'}`
                    ]),
                    React.createElement('p', { key: 'visit-type' }, [
                        React.createElement('strong', null, 'Visit Type:'),
                        ` ${spaceData?.['Visit Type'] || 'N/A'}`
                    ]),
                    spaceData?.Description && React.createElement('p', {
                        key: 'description',
                        className: 'space-description'
                    }, spaceData.Description)
                ])
            ])
        ]),
        
        // Player status section
        React.createElement('div', {
            key: 'player-status',
            className: 'player-status'
        }, [
            React.createElement('h3', { key: 'title' }, 'Player Status'),
            React.createElement('div', {
                key: 'card',
                className: 'player-card',
                style: { borderColor: currentPlayer.color }
            }, [
                React.createElement('h4', { 
                    key: 'name',
                    style: { color: currentPlayer.color }
                }, currentPlayer.name),
                React.createElement('div', {
                    key: 'stats',
                    className: 'player-stats'
                }, [
                    React.createElement('p', { key: 'position' }, [
                        React.createElement('strong', null, 'Position:'),
                        ` ${currentSpace}`
                    ]),
                    React.createElement('p', { key: 'turn' }, [
                        React.createElement('strong', null, 'Turn:'),
                        ` ${gameState.currentPlayerIndex + 1}`
                    ]),
                    // Player-specific stats
                    currentPlayer.stats && Object.entries(currentPlayer.stats).map(([key, value]) =>
                        React.createElement('p', { key }, [
                            React.createElement('strong', null, `${key}:`),
                            ` ${value}`
                        ])
                    )
                ])
            ])
        ])
    ]);
};

// Make LeftColumn available globally
window.LeftColumn = LeftColumn;