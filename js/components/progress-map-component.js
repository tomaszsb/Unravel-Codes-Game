// progress-map-component.js
const ProgressMap = () => {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [gameState, setGameState] = React.useState(null);
    const [hoveredNode, setHoveredNode] = React.useState(null);
    const containerRef = React.useRef(null);
    const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

    // Constants for layout
    const nodeSize = 16;
    const nodeGap = 40;
    const minNodesPerRow = 3;
    const topPadding = 32;
    const sidePadding = 20;

    React.useEffect(() => {
        let mounted = true;
        let debounceTimer;

        const loadGameState = async () => {
            try {
                if (!window.GameSaveManager) {
                    throw new Error('SaveManager not initialized');
                }

                if (!window.PlayerProgressManager) {
                    throw new Error('PlayerProgressManager not initialized');
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

                // Wait for PlayerProgressManager to be ready
                await window.PlayerProgressManager.waitUntilReady();
                
                const state = window.GameSaveManager.load('progressState');
                if (!state) {
                    throw new Error('No progress state found');
                }

                if (mounted) {
                    setGameState(state);
                    setError(null);
                }
            } catch (err) {
                console.error('Error loading progress state:', err);
                if (mounted) {
                    setError(err.message);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Handle window resize with debounce
        const handleResize = () => {
            if (!mounted) return;
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (containerRef.current && mounted) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setDimensions({
                        width: rect.width,
                        height: Math.max(rect.height, 200)
                    });
                }
            }, 100);
        };

        // Handle SaveManager updates with debounce
        const handleStateUpdate = (type) => {
            if (!mounted) return;

            if (type === 'progressState' || type === 'players') {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(loadGameState, 100);
            }
        };

        window.GameSaveManager?.subscribe(handleStateUpdate);
        window.addEventListener('resize', handleResize);
        
        // Initial load and measurement
        loadGameState();
        handleResize();

        return () => {
            mounted = false;
            window.GameSaveManager?.unsubscribe(handleStateUpdate);
            window.removeEventListener('resize', handleResize);
            clearTimeout(debounceTimer);
        };
    }, []);

    // Calculate layout based on dimensions
    const calculateLayout = (width, mainPath) => {
        if (!width || !mainPath) return [];

        const maxNodesPerRow = Math.max(
            minNodesPerRow,
            Math.floor((width - (2 * sidePadding)) / (nodeSize + nodeGap))
        );
        
        const layout = [];
        let currentRow = 0;
        let currentCol = 0;
        let goingRight = true;

        mainPath.forEach((space) => {
            const x = sidePadding + (goingRight 
                ? currentCol * (nodeSize + nodeGap)
                : (maxNodesPerRow - 1 - currentCol) * (nodeSize + nodeGap));
            const y = topPadding + (currentRow * (nodeSize + nodeGap));

            layout.push({ space, x, y });

            currentCol++;
            if (currentCol >= maxNodesPerRow) {
                currentCol = 0;
                currentRow++;
                goingRight = !goingRight;
            }
        });

        return layout;
    };

    // Error state
    if (error) {
        return React.createElement('div', {
            className: 'w-full p-4 bg-red-50 text-red-700 rounded'
        }, error);
    }

    // Loading state
    if (loading) {
        return React.createElement('div', {
            className: 'w-full h-24 flex items-center justify-center'
        }, 'Loading game board...');
    }

    // No data state
    if (!gameState?.mainPath) {
        return React.createElement('div', {
            className: 'w-full p-4 bg-yellow-50 text-yellow-700 rounded'
        }, 'No game progress data available');
    }

    const layout = calculateLayout(dimensions.width, gameState.mainPath);
    const height = layout.length 
        ? Math.max(...layout.map(n => n.y)) + nodeSize + nodeGap + topPadding
        : 100;

    return React.createElement('div', {
        ref: containerRef,
        className: 'w-full min-h-[200px] relative'
    },
        React.createElement('svg', {
            width: '100%',
            height: height,
            className: 'overflow-visible'
        },
            React.createElement('g', { className: 'board-container' },
                // Draw connections between nodes
                ...layout.slice(0, -1).map((node, index) => {
                    const next = layout[index + 1];
                    return React.createElement('line', {
                        key: `line-${index}`,
                        x1: node.x + nodeSize/2,
                        y1: node.y + nodeSize/2,
                        x2: next.x + nodeSize/2,
                        y2: next.y + nodeSize/2,
                        stroke: '#999',
                        strokeWidth: '2'
                    });
                }),

                // Draw nodes and players
                ...layout.map((node, index) => {
                    const players = Object.entries(gameState.playerPositions)
                        .filter(([, pos]) => pos === node.space)
                        .map(([name]) => name);

                    return React.createElement('g', {
                        key: `node-${index}`,
                        onMouseEnter: () => setHoveredNode(node.space),
                        onMouseLeave: () => setHoveredNode(null)
                    },
                        // Node circle
                        React.createElement('circle', {
                            cx: node.x + nodeSize/2,
                            cy: node.y + nodeSize/2,
                            r: nodeSize/2,
                            fill: 'white',
                            stroke: '#666',
                            strokeWidth: '2'
                        }),

                        // Player markers
                        ...players.map((playerName, i) => {
                            // Get player data from SaveManager
                            const allPlayers = window.GameSaveManager.load('players');
                            const player = allPlayers?.find(p => p.name === playerName);
                            
                            // Get player's specific color palette
                            let color = '#000000'; // Default fallback color
                            if (player?.palette) {
                                const colors = window.PlayerPalettes?.getPlayerColorScheme(player.palette);
                                // Use a brighter color (index 5) for better visibility
                                color = colors?.[5] || '#000000';
                            }
                            
                            const angle = (2 * Math.PI * i) / players.length;
                            const radius = nodeSize/4;
                            const x = node.x + nodeSize/2 + radius * Math.cos(angle);
                            const y = node.y + nodeSize/2 + radius * Math.sin(angle);
                            
                            return React.createElement('circle', {
                                key: `player-${playerName}`,
                                cx: x,
                                cy: y,
                                r: 4,
                                fill: color
                            });
                        }),

                        // Hover tooltip
                        hoveredNode === node.space && React.createElement('text', {
                            x: node.x + nodeSize/2,
                            y: node.y - 8,
                            textAnchor: 'middle',
                            className: 'text-sm font-medium'
                        }, node.space)
                    );
                })
            )
        )
    );
};

// Make component globally available
window.ProgressMap = ProgressMap;