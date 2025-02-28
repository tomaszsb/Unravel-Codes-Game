// GameModals.js

// Instructions modal
const GameInstructionsModal = ({ onClose }) => {
    return React.createElement('div', { className: 'modal-overlay' },
        React.createElement('div', { className: 'modal-content instructions-modal' }, [
            React.createElement('div', { 
                key: 'header',
                className: 'modal-header' 
            }, [
                React.createElement('h2', { key: 'title' }, 'Game Instructions'),
                React.createElement('button', { 
                    key: 'close',
                    className: 'close-button',
                    onClick: onClose 
                }, '×')
            ]),
            
            React.createElement('div', { 
                key: 'body',
                className: 'modal-body'
            }, [
                React.createElement('h3', { key: 'overview-title' }, 'Game Overview'),
                React.createElement('p', { key: 'overview' }, 'This project management simulation game takes you through the key phases of project management from initiation to closure.'),
                
                React.createElement('h3', { key: 'objective-title' }, 'Objective'),
                React.createElement('p', { key: 'objective' }, 'Navigate through the project lifecycle, making decisions along the way to complete your project successfully and reach the finish position.'),
                
                React.createElement('h3', { key: 'flow-title' }, 'Game Flow'),
                React.createElement('ol', { key: 'flow' }, [
                    React.createElement('li', { key: 'flow1' }, 'Roll the dice on your turn'),
                    React.createElement('li', { key: 'flow2' }, 'Select an available move from the options presented'),
                    React.createElement('li', { key: 'flow3' }, 'Complete any actions required by the space you land on'),
                    React.createElement('li', { key: 'flow4' }, 'End your turn')
                ]),
                
                React.createElement('h3', { key: 'spaces-title' }, 'Spaces'),
                React.createElement('p', { key: 'spaces-intro' }, 'Different spaces represent different phases and challenges in project management:'),
                React.createElement('ul', { key: 'spaces-list' }, [
                    React.createElement('li', { key: 'space1' }, [
                        React.createElement('strong', null, 'PLAN spaces:'),
                        ' Planning phase activities'
                    ]),
                    React.createElement('li', { key: 'space2' }, [
                        React.createElement('strong', null, 'ARCH spaces:'),
                        ' Architecture and design'
                    ]),
                    React.createElement('li', { key: 'space3' }, [
                        React.createElement('strong', null, 'FUND spaces:'),
                        ' Financial considerations'
                    ]),
                    React.createElement('li', { key: 'space4' }, [
                        React.createElement('strong', null, 'EXEC spaces:'),
                        ' Execution phase'
                    ]),
                    React.createElement('li', { key: 'space5' }, [
                        React.createElement('strong', null, 'CLOSE spaces:'),
                        ' Project closure activities'
                    ])
                ]),
                
                React.createElement('h3', { key: 'winning-title' }, 'Winning'),
                React.createElement('p', { key: 'winning' }, 'The first player to reach the FINISH space completes the game. All players will have a chance to finish, and final rankings will be displayed.')
            ])
        ])
    );
};

// Game log modal
const GameLogModal = ({ onClose }) => {
    // Retrieve visit history from save manager
    const visitHistory = window.GameSaveManager.load('visitHistory') || [];
    const logEntries = Array.isArray(visitHistory) ? visitHistory : Object.entries(visitHistory).map(([key, count]) => ({
        player: key.split('-')[0],
        space: key.split('-')[1],
        visits: count,
        timestamp: Date.now()
    }));
    
    return React.createElement('div', { className: 'modal-overlay' },
        React.createElement('div', { className: 'modal-content log-modal' }, [
            React.createElement('div', { 
                key: 'header',
                className: 'modal-header' 
            }, [
                React.createElement('h2', { key: 'title' }, 'Game Log'),
                React.createElement('button', { 
                    key: 'close',
                    className: 'close-button',
                    onClick: onClose 
                }, '×')
            ]),
            
            React.createElement('div', { 
                key: 'body',
                className: 'modal-body' 
            }, 
                logEntries.length > 0 ?
                    React.createElement('div', { className: 'log-entries' },
                        logEntries.map((entry, index) =>
                            React.createElement('div', { 
                                key: index,
                                className: 'log-entry' 
                            }, [
                                React.createElement('div', { 
                                    key: 'turn',
                                    className: 'log-turn' 
                                }, `Turn ${entry.turn || '?'}`),
                                React.createElement('div', { 
                                    key: 'player',
                                    className: 'log-player',
                                    style: { color: entry.playerColor }
                                }, entry.player),
                                React.createElement('div', { 
                                    key: 'action',
                                    className: 'log-action' 
                                }, entry.description || `Visited ${entry.space} ${entry.visits} times`),
                                React.createElement('div', { 
                                    key: 'space',
                                    className: 'log-space' 
                                }, entry.space),
                                React.createElement('div', { 
                                    key: 'timestamp',
                                    className: 'log-timestamp' 
                                }, new Date(entry.timestamp).toLocaleString())
                            ])
                        )
                    ) :
                    React.createElement('p', null, 'No game actions recorded yet.')
            )
        ])
    );
};

// Export to window global scope
window.GameInstructionsModal = GameInstructionsModal;
window.GameLogModal = GameLogModal;