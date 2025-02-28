const DiceSystem = () => {
    const [isRolling, setIsRolling] = React.useState(false);
    const [rollState, setRollState] = React.useState(null);
    const [currentSpace, setCurrentSpace] = React.useState(null);
    const [visitType, setVisitType] = React.useState(null);
    const [availableRolls, setAvailableRolls] = React.useState([]);
    const [error, setError] = React.useState(null);
    const [canRoll, setCanRoll] = React.useState(false);

    React.useEffect(() => {
        let mounted = true;
        let debounceTimer;

        const loadGameState = async () => {
            try {
                if (!window.GameSaveManager || !window.GameDataManager || !window.GamePlayerManager) {
                    throw new Error('Game systems not initialized');
                }

                // Wait for GameDataManager to be ready
                if (!window.GameDataManager.isReady()) {
                    await window.GameDataManager.waitUntilReady();
                }

                // Wait for PlayerManager to be ready
                if (!window.GamePlayerManager.isReady()) {
                    let attempts = 0;
                    const maxAttempts = 50;
                    while (!window.GamePlayerManager.isReady() && attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                    if (!window.GamePlayerManager.isReady()) {
                        throw new Error('Player manager failed to initialize');
                    }
                }

                const progressState = window.GameSaveManager.load('progressState');
                const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
      
                if (!progressState || !currentPlayer) {
                    throw new Error('Game state not found');
                }

                const position = progressState.playerPositions[currentPlayer.name];
                if (!position) {
                    throw new Error('Player position not found');
                }

                if (mounted) {
                    setCurrentSpace(position);
                    setRollState(progressState.rollState);
                
                    // Get visit type once
                    const visitHistory = window.GameSaveManager.load('visitHistory') || {};
                    const visitKey = `${currentPlayer.name}-${position}`;
                    const visitCount = visitHistory[visitKey] || 0;
                    const visitType = visitCount === 0 ? 'First' : 'Subsequent';
                    setVisitType(visitType);
                
                    // Use centralized dice roll check
                    const canRollDice = window.GameDataManager.isDiceRollRequired(position, visitType) && 
                                        !progressState?.rollState?.hasRolled;
                    setCanRoll(canRollDice);
                    console.log('Dice roll state:', { 
                        position,
                        visitType,
                        canRoll: canRollDice,
                        hasRolled: progressState?.rollState?.hasRolled 
                    });
                
                    // Load available roll types
                    const diceRollData = window.GameDataManager?.csvData?.diceRoll;
                    if (diceRollData) {
                        const spaceRolls = diceRollData
                            .filter(row => 
                                row['Space Name'] === position && 
                                row['Visit Type'] === visitType  // Use the same visitType here
                            )
                            .map(row => ({
                                type: row['Die Roll'],
                                description: row['Visit Type'],
                                outcomes: Object.fromEntries(
                                    Object.entries(row)
                                        .filter(([key]) => /^[1-6]$/.test(key))
                                        .map(([key, value]) => [parseInt(key), value])
                                )
                            }));
                        setAvailableRolls(spaceRolls);
                    }
                
                    setError(null);
                }
            } catch (err) {
                console.error('Error loading game state:', err);
                if (mounted) {
                    setError(err.message || 'Failed to load game state');
                }
            }
        };

        // Subscribe to state updates
        const handleStateUpdate = (type) => {
            if (type === 'progressState' || type === 'players') {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(loadGameState, 100);
            }
        };

        window.GameSaveManager?.subscribe(handleStateUpdate);
        
        // Initial load
        loadGameState();

        return () => {
            mounted = false;
            window.GameSaveManager?.unsubscribe(handleStateUpdate);
            clearTimeout(debounceTimer);
        };
    }, []);

    const handleRoll = async () => {
        if (isRolling || !rollState || !canRoll) return;
      
        try {
            setIsRolling(true);
            setError(null);
      
            // Generate roll result
            const result = Math.floor(Math.random() * 6) + 1;
      
            // Update temporary state with roll result
            const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
            if (!currentPlayer) {
                throw new Error('No current player found');
            }
      
            const success = await window.PlayerProgressManager.updateTemporaryState(
                currentPlayer.name,
                'diceRolls',
                { rolls: [result] }
            );
      
            if (!success) {
                throw new Error('Failed to update roll state');
            }
      
            // Update game state
            const updated = window.GameSaveManager.updateRollState(result);
            if (updated) {
                const newState = window.GameSaveManager.load('progressState');
                setRollState(newState.rollState);
                
                window.gameState = window.gameState || {};
                window.gameState.requiredActions = {
                    ...window.gameState.requiredActions,
                    diceRoll: false,
                    isComplete: () => true
                };
                
                setCanRoll(false);
            }
      
        } catch (err) {
            console.error('Roll failed:', err);
            setError('Failed to roll dice');
        } finally {
            setIsRolling(false);
        }
    };

    // Error state
    if (error) {
        return React.createElement('div', {
            className: 'p-4 bg-red-50 text-red-700 rounded-lg'
        }, error);
    }

    return React.createElement('div', {
        className: 'space-y-4'
    }, [
        // Roll result display (if rolled)
        rollState?.hasRolled && React.createElement('div', {
            key: 'roll-result',
            className: 'p-4 bg-gray-50 rounded-lg mb-4'
        }, [
            React.createElement('h3', {
                key: 'result-title',
                className: 'font-medium mb-2'
            }, 'Roll Result:'),
            React.createElement('p', {
                key: 'result-value',
                className: 'text-lg font-bold'
            }, `You rolled: ${rollState.rolls[0]}`)
        ]),

        // Roll button
        React.createElement('button', {
            key: 'roll-button',
            onClick: handleRoll,
            disabled: isRolling || !canRoll,
            className: `game-button w-full ${isRolling || !canRoll 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-green-600'}`
        }, isRolling ? 'Rolling...' : 'Roll Dice'),

        // Available roll types
        availableRolls.length > 0 && React.createElement('div', {
            key: 'available-rolls',
            className: 'mt-4 p-4 bg-gray-50 rounded'
        }, [
            React.createElement('h3', {
                key: 'rolls-title',
                className: 'font-medium text-gray-700 mb-2'
            }, 'Available Roll Types:'),
            React.createElement('div', {
                key: 'rolls-list',
                className: 'space-y-2'
            }, availableRolls.map((roll, index) => 
                React.createElement('div', {
                    key: `roll-${index}`,
                    className: 'text-sm'
                }, [
                    React.createElement('div', {
                        key: 'roll-type',
                        className: 'font-medium'
                    }, `Type: ${roll.type}`),
                    React.createElement('div', {
                        key: 'roll-outcomes',
                        className: 'text-gray-600 ml-4'
                    }, 'Possible outcomes: ' + Object.entries(roll.outcomes)
                        .map(([value, outcome]) => `${value}: ${outcome}`)
                        .join(', '))
                ])
            ))
        ])
    ]);
};

window.DiceSystem = DiceSystem;