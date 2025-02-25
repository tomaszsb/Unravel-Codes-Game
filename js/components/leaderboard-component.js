// leaderboard-component.js
const LeaderBoard = () => {
    const [players, setPlayers] = React.useState([]);
    const [scores, setScores] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [sortedPlayers, setSortedPlayers] = React.useState([]);
    const [gameStats, setGameStats] = React.useState(null);

    // Calculate game statistics function
    const calculateGameStats = (playerData, progressData, scoreData) => {
        try {
            if (!playerData || !progressData || !progressData.mainPath) {
                return;
            }

            const stats = {
                totalTurns: 0,
                leadingPlayer: null,
                averageScore: 0,
                gameProgress: 0
            };

            // Calculate progress safely
            if (progressData.mainPath && progressData.playerPositions) {
                const maxProgress = progressData.mainPath.length;
                let totalProgress = 0;

                Object.entries(progressData.playerPositions).forEach(([, position]) => {
                    const index = progressData.mainPath.indexOf(position);
                    if (index !== -1) {
                        totalProgress += index;
                    }
                });

                if (maxProgress > 0 && playerData.length > 0) {
                    stats.gameProgress = Math.round((totalProgress / (maxProgress * playerData.length)) * 100);
                }
            }

            // Calculate average score safely
            const validScores = Object.values(scoreData).filter(score => 
                typeof score === 'number' && !isNaN(score)
            );

            if (validScores.length > 0) {
                const totalScore = validScores.reduce((sum, score) => sum + score, 0);
                stats.averageScore = Math.round(totalScore / validScores.length);

                const highestScore = Math.max(...validScores);
                stats.leadingPlayer = Object.entries(scoreData)
                    .find(([, score]) => score === highestScore)?.[0];
            }

            return stats;

        } catch (error) {
            console.error('Error calculating game stats:', error);
            return null;
        }
    };

    React.useEffect(() => {
        let mounted = true;
        let debounceTimer;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check for SaveManager
                if (!window.GameSaveManager) {
                    throw new Error('Game save system not initialized');
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

                // Load player data with validation
                const playerData = window.GameSaveManager.load('players');
                if (!playerData || !Array.isArray(playerData)) {
                    throw new Error('Invalid player data format');
                }
                
                // Validate each player object
                const validPlayers = playerData.every(player => 
                    player && 
                    typeof player === 'object' &&
                    typeof player.name === 'string' &&
                    typeof player.palette === 'string'
                );
                
                if (!validPlayers) {
                    throw new Error('Invalid player data structure');
                }

                // Load score data safely
                const scoreData = window.GameSaveManager.load('scores') || {};

                // Load progress data safely
                const progressData = window.GameSaveManager.load('progressState');
                if (!progressData) {
                    throw new Error('No progress data found');
                }

                if (mounted) {
                    setPlayers(playerData);
                    setScores(scoreData);

                    // Calculate game statistics
                    const stats = calculateGameStats(playerData, progressData, scoreData);
                    if (stats) {
                        setGameStats(stats);
                    }
                    
                    // Sort players by score
                    const sortedByScore = [...playerData].sort((a, b) => 
                        (scoreData[b.name] || 0) - (scoreData[a.name] || 0)
                    );
                    setSortedPlayers(sortedByScore);
                }

            } catch (err) {
                console.error('Error in LeaderBoard:', err);
                if (mounted) {
                    setError(err.message || 'Failed to load leaderboard data');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Handle state updates with debouncing
        const handleStateUpdate = (type) => {
            if (!mounted) return;
            
            if (type === 'progressState' || type === 'players' || type === 'scores') {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(loadData, 100);
            }
        };

        // Subscribe to state updates
        window.GameSaveManager?.subscribe(handleStateUpdate);
        
        // Initial load
        loadData();

        // Cleanup
        return () => {
            mounted = false;
            window.GameSaveManager?.unsubscribe(handleStateUpdate);
            clearTimeout(debounceTimer);
        };
    }, []); // Empty dependency array since we handle updates via subscription

    // Loading state
    if (loading) {
        return React.createElement('div', { className: 'p-4' },
            React.createElement('p', { className: 'text-center text-gray-600' },
                'Loading leaderboard...'
            )
        );
    }

    // Error state
    if (error) {
        return React.createElement('div', { className: 'p-4 bg-red-50 text-red-700 rounded' },
            React.createElement('p', null, error)
        );
    }

    // Main render
    return React.createElement('div', { 
        className: 'space-y-4 p-4 rounded-lg shadow-sm',
        style: { backgroundColor: '#ffffff' } // This sets the overall background to white
    },
        // Header
        React.createElement('div', { className: 'flex justify-between items-center' },
            React.createElement('img', { 
                src: 'Graphics/UC1.png', 
                alt: 'Leaderboard',
                style: { width: '200px', height: 'auto', display: 'block', margin: '0 auto' } // Adjust size as needed
            }),
            gameStats && React.createElement('div', { className: 'text-sm text-gray-600' },
                `Game Progress: ${gameStats.gameProgress}%`
            )
        ),
        
        // Game Stats
        gameStats && React.createElement('div', { className: 'grid grid-cols-2 gap-4 mb-4' },
            React.createElement('div', { className: 'text-sm' },
                `Average Score: ${gameStats.averageScore}`
            ),
            gameStats.leadingPlayer && React.createElement('div', { className: 'text-sm' },
                `Leading: ${gameStats.leadingPlayer}`
            )
        ),
        
        // Player List
        React.createElement('div', { className: 'space-y-2' },
            sortedPlayers.map((player, index) => {
                const colors = window.PlayerPalettes?.getPlayerColorScheme(player.palette) || [];
                const backgroundColor = colors[0] || '#ffffff';
                const textColor = colors[7] || '#000000';
                const playerScore = scores[player.name] || 0;
                const position = index + 1;
                
                return React.createElement('div', {
                    key: `${player.name}-${index}`,
                    className: 'p-4 rounded shadow-sm',
                    style: {
                        backgroundColor,
                        color: textColor,
                        transition: 'all 0.3s ease'
                    }
                },
                React.createElement('div', { className: 'flex justify-between items-center' },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('span', { className: 'font-bold' }, `#${position}`),
                        React.createElement('span', { className: 'font-medium' }, player.name)
                    ),
                    React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('span', { className: 'font-medium' }, `${playerScore} points`)
                    )
                ));
            })
        )
    );
};

// Make component globally available
window.LeaderBoard = LeaderBoard;