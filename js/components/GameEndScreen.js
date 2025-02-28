// GameEndScreen.js
const GameEndScreen = ({ finalRankings }) => {
    if (!finalRankings || finalRankings.length === 0) {
        return React.createElement('div', { className: 'game-end-screen' }, [
            React.createElement('h2', { key: 'title' }, 'Game Complete'),
            React.createElement('p', { key: 'message' }, 'No ranking data available.'),
            React.createElement('button', {
                key: 'new-game',
                className: 'new-game-button',
                onClick: () => window.location.href = 'player-setup.html'
            }, 'Start New Game')
        ]);
    }
    
    return React.createElement('div', { className: 'game-end-screen' }, [
        React.createElement('h2', { key: 'title' }, 'Game Complete!'),
        
        // Final Rankings
        React.createElement('div', {
            key: 'rankings',
            className: 'final-rankings'
        }, [
            React.createElement('h3', { key: 'title' }, 'Final Rankings'),
            React.createElement('table', {
                key: 'table',
                className: 'rankings-table'
            }, [
                React.createElement('thead', { key: 'thead' },
                    React.createElement('tr', null, [
                        React.createElement('th', { key: 'rank' }, 'Rank'),
                        React.createElement('th', { key: 'player' }, 'Player')
                    ])
                ),
                React.createElement('tbody', { key: 'tbody' },
                    finalRankings.map(player =>
                        React.createElement('tr', { key: player.name }, [
                            React.createElement('td', { key: 'rank' }, player.rank),
                            React.createElement('td', {
                                key: 'name',
                                style: { color: player.color }
                            }, player.name)
                        ])
                    )
                )
            ])
        ]),
        
        // Game Summary
        React.createElement('div', {
            key: 'summary',
            className: 'game-summary'
        }, [
            React.createElement('h3', { key: 'title' }, 'Game Summary'),
            React.createElement('div', {
                key: 'stats',
                className: 'summary-stats'
            }, [
                React.createElement('p', { key: 'players' }, [
                    React.createElement('strong', null, 'Players:'),
                    ` ${finalRankings.length}`
                ]),
                React.createElement('p', { key: 'winner' }, [
                    React.createElement('strong', null, 'Winner:'),
                    React.createElement('span', {
                        style: { color: finalRankings[0]?.color }
                    }, ` ${finalRankings[0]?.name}`)
                ])
            ])
        ]),
        
        // End Game Controls
        React.createElement('div', {
            key: 'controls',
            className: 'end-game-controls'
        }, [
            React.createElement('button', {
                key: 'new-game',
                className: 'new-game-button',
                onClick: () => window.location.href = 'player-setup.html'
            }, 'Start New Game'),
            
            React.createElement('button', {
                key: 'view-log',
                className: 'view-log-button',
                onClick: () => {
                    // Display game log
                }
            }, 'View Full Game Log')
        ])
    ]);
};

// Make GameEndScreen available globally
window.GameEndScreen = GameEndScreen;