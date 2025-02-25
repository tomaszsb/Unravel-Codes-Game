// game-state-display-component.js
const GameStateDisplay = () => {
    const [gameState, setGameState] = React.useState({
        currentSpace: null,
        currentPlayer: null,
        visitCount: 0,
        playerState: null,
        scores: null,
        diceRollInfo: null,
        loading: true,
        error: null,
        progressState: null
    });

    React.useEffect(() => {
        let isMounted = true;
        let debounceTimer;

        const loadGameState = async () => {
            try {
                const player = window.GamePlayerManager?.getCurrentPlayer();
                if (!player) throw new Error('No current player found');

                const progressState = window.GameSaveManager?.load('progressState');
                if (!progressState) throw new Error('No progress state found');

                const position = progressState.playerPositions[player.name];
                if (!position) throw new Error('No position found');

                const spaceData = window.GameDataManager?.getSpaceData(position);
                if (!spaceData?.[0]) throw new Error('No space data found');

                const visitHistory = window.GameSaveManager?.load('visitHistory') || {};
                const visitKey = `${player.name}-${position}`;
                
                const scores = window.GameSaveManager?.load('scores') || {};
                const playerState = progressState.playerStates?.[player.name] || {};
                
                const diceRollData = window.GameDataManager.data.get('diceRoll');
                const diceRollInfo = diceRollData?.filter(roll => 
                    roll['Space Name'] === position
                )?.[0]; // Take first matching entry

                if (isMounted) {
                    setGameState({
                        currentPlayer: player,
                        currentSpace: spaceData[0],
                        visitCount: visitHistory[visitKey] || 0,
                        playerState,
                        scores,
                        diceRollInfo,
                        progressState,
                        loading: false,
                        error: null
                    });
                }
            } catch (err) {
                console.error('Error loading game state:', err);
                if (isMounted) {
                    setGameState(prev => ({
                        ...prev,
                        loading: false,
                        error: err.message
                    }));
                }
            }
        };

        const handleStateUpdate = () => {
            if (!isMounted) return;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadGameState, 100);
        };

        window.GameSaveManager?.subscribe(handleStateUpdate);
        loadGameState();

        return () => {
            isMounted = false;
            window.GameSaveManager?.unsubscribe(handleStateUpdate);
            clearTimeout(debounceTimer);
        };
    }, []);

    if (gameState.loading) {
        return React.createElement('div', {
            className: "flex items-center justify-center h-full"
        }, React.createElement('p', {
            className: "text-gray-600"
        }, "Loading game state..."));
    }

    if (gameState.error) {
        return React.createElement('div', {
            className: "text-red-600 p-4"
        }, gameState.error);
    }

    const { currentSpace, currentPlayer, visitCount, playerState, scores, diceRollInfo, progressState } = gameState;

    if (!currentSpace || !currentPlayer) {
        return React.createElement('div', {
            className: "text-gray-600 p-4"
        }, "No game state available");
    }

    return React.createElement('div', {
        className: "h-full flex flex-col"
    }, [
        // Fixed Header
        React.createElement('div', {
            key: 'header',
            className: "bg-white p-4 border-b shadow-sm"
        }, [
            React.createElement('h2', {
                key: 'title',
                className: "text-xl font-bold"
            }, "Game State Display"),
            React.createElement('p', {
                key: 'subtitle',
                className: "text-sm text-gray-600"
            }, "Scroll to see all information")
        ]),

        // Scrollable Content
        React.createElement('div', {
            key: 'content',
            className: "flex-1 overflow-y-auto p-4 space-y-4 max-h-[600px] overflow-y-scroll border-t"
        }, [
            // Player Information
            React.createElement('div', {
                key: 'player-info',
                className: "bg-gray-50 p-4 rounded-lg"
            }, [
                React.createElement('h3', {
                    className: "text-lg font-bold mb-3"
                }, "Player Information"),
                React.createElement('table', {
                    className: "w-full"
                }, React.createElement('tbody', {}, [
                    createTableRow("Name", currentPlayer.name),
                    createTableRow("Color Palette", currentPlayer.palette),
                    createTableRow("Current Position", progressState.playerPositions[currentPlayer.name]),
                    createTableRow("Score", scores[currentPlayer.name] || 0),
                    createTableRow("Time Spent", `${playerState.time || 0} days`),
                    createTableRow("Budget", `$${playerState.budget || 0}`),
                    createTableRow("Cards", playerState.cards?.join(', ') || 'None'),
                    createTableRow("Turn Status", progressState.currentPlayerIndex === window.GamePlayerManager.players.indexOf(currentPlayer) ? 'Current Turn' : 'Waiting'),
                    createTableRow("Game Status", window.GameSaveManager.isPlayerFinished(currentPlayer.name) ? 'Finished' : 'In Progress')
                ]))
            ]),

            // Space Information
            React.createElement('div', {
                key: 'space-info',
                className: "bg-gray-50 p-4 rounded-lg"
            }, [
                React.createElement('h3', {
                    className: "text-lg font-bold mb-3"
                }, "Current Space"),
                React.createElement('table', {
                    className: "w-full"
                }, React.createElement('tbody', {}, [
                    createTableRow("Name", currentSpace['Space Name']),
                    createTableRow("Phase", currentSpace.Phase),
                    createTableRow("Visit Type", currentSpace['Visit Type']),
                    createTableRow("Visit Count", visitCount),
                    createTableRow("Fee", currentSpace.Fee || 'None'),
                    createTableRow("Time Required", currentSpace.Time || 'None')
                ]))
            ]),

            // Event & Action Information
            React.createElement('div', {
                key: 'event-action',
                className: "bg-gray-50 p-4 rounded-lg"
            }, [
                React.createElement('h3', {
                    className: "text-lg font-bold mb-3"
                }, "Events & Actions"),
                currentSpace.Event && createInfoSection("Event", currentSpace.Event),
                currentSpace.Action && createInfoSection("Action", currentSpace.Action),
                currentSpace.Outcome && createInfoSection("Outcome", currentSpace.Outcome)
            ]),

            // Game State
            React.createElement('div', {
                key: 'game-state',
                className: "bg-gray-50 p-4 rounded-lg"
            }, [
                React.createElement('h3', {
                    className: "text-lg font-bold mb-3"
                }, "Game State"),
                React.createElement('table', {
                    className: "w-full"
                }, React.createElement('tbody', {}, [
                    createTableRow("Game Version", window.GameSaveManager.VERSION),
                    createTableRow("Total Players", window.GamePlayerManager.players.length),
                    createTableRow("Players Finished", window.GameSaveManager.getFinishedPlayers().length),
                    createTableRow("Game Status", progressState.gameEnded ? 'Game Over' : 'In Progress'),
                    createTableRow("Roll State", formatRollState(progressState.rollState)),
                    createTableRow("Last Updated", new Date(progressState.timestamp).toLocaleString())
                ]))
            ]),

            
            React.createElement('div', {
            key: 'dice-info',
            className: "bg-gray-50 p-4 rounded-lg mt-4"
                }, [
            React.createElement('h3', {
            className: "text-lg font-bold mb-3"
            }, "Dice Roll Information"),
            React.createElement('table', {
            className: "w-full"
            }, React.createElement('tbody', {}, 
            // If we have dice roll info for this space
            diceRollInfo ? [
            createTableRow("Die Roll Type", diceRollInfo['Die Roll']),
            createTableRow("Visit Type", diceRollInfo['Visit Type']),
            // Add outcomes for rolls 1-6
            ...Array.from({length: 6}, (_, i) => i + 1).map(num => 
                createTableRow(`Roll ${num}`, diceRollInfo[num.toString()] || 'No outcome')
            )
            ] : [
            createTableRow("Dice Info", "No dice roll required for this space")
        ]
    ))
])

        ])
    ]);
};

// Helper function to create table rows
const createTableRow = (label, value) => {
    return React.createElement('tr', {
        key: label
    }, [
        React.createElement('td', {
            key: 'label',
            className: "py-1 font-medium"
        }, label + ":"),
        React.createElement('td', {
            key: 'value',
            className: "py-1"
        }, value)
    ]);
};

// Helper function to create info sections
const createInfoSection = (label, content) => {
    return React.createElement('div', {
        key: label,
        className: "mb-3"
    }, [
        React.createElement('div', {
            key: 'label',
            className: "font-medium"
        }, label + ":"),
        React.createElement('div', {
            key: 'content',
            className: "ml-4"
        }, content)
    ]);
};

// Helper function to format roll state
const formatRollState = (rollState) => {
    if (!rollState) return 'No rolls';
    return `Required: ${rollState.rollsRequired}, Completed: ${rollState.rollsCompleted}, Rolls: [${rollState.rolls.join(', ')}]`;
};

// Make component globally available
window.GameStateDisplay = GameStateDisplay;