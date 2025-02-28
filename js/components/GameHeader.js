// GameHeader.js
const GameHeader = ({ gameState, currentPlayer, finishedPlayers }) => {
    if (!gameState || !currentPlayer) return null;
    
    const players = window.GameSaveManager.load('players') || [];
    
    return React.createElement('div', { className: 'game-header' }, [
        // Current player section
        React.createElement('div', { 
            key: 'current-player',
            className: 'current-player' 
        }, [
            React.createElement('h2', { key: 'title' }, [
                'Current Player: ',
                React.createElement('span', { 
                    key: 'name',
                    style: { color: currentPlayer.color } 
                }, currentPlayer.name)
            ])
        ]),
        
        // Leaderboard section
        React.createElement('div', { 
            key: 'leaderboard',
            className: 'leaderboard' 
        }, [
            React.createElement('h3', { key: 'title' }, 'Player Rankings'),
            React.createElement('table', { 
                key: 'table',
                className: 'leaderboard-table' 
            }, [
                // Table header
                React.createElement('thead', { key: 'thead' }, 
                    React.createElement('tr', null, [
                        React.createElement('th', { key: 'player' }, 'Player'),
                        React.createElement('th', { key: 'position' }, 'Position'),
                        React.createElement('th', { key: 'status' }, 'Status')
                    ])
                ),
                // Table body
                React.createElement('tbody', { key: 'tbody' },
                    players.map(player => {
                        const position = window.PlayerProgressManager.getPlayerPosition(player.name);
                        const isFinished = finishedPlayers.includes(player.name);
                        const isCurrent = player.name === currentPlayer.name;
                        
                        return React.createElement('tr', { 
                            key: player.name,
                            className: isCurrent ? 'current-player-row' : ''
                        }, [
                            React.createElement('td', { 
                                key: 'name',
                                style: { color: player.color }
                            }, player.name),
                            React.createElement('td', { key: 'position' }, position),
                            React.createElement('td', { key: 'status' }, isFinished ? 'Finished' : 'Playing')
                        ]);
                    })
                )
            ])
        ])
    ]);
};

// Make GameHeader available globally
window.GameHeader = GameHeader;