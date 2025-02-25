// game-initializer.js
class GameInitializer {
    constructor() {
        this.initialized = false;
        this.mountedComponents = new Set();
        this.initStatus = {
            coreSystems: false,
            gameData: false,
            playerData: false,
            progressState: false,
            components: false
        };
        this.subscribers = new Set();
        this.metrics = {};
        console.log('GameInitializer constructed');
    }

    startMetric(phase) {
        this.metrics[phase] = performance.now();
    }

    endMetric(phase) {
        if (this.metrics[phase]) {
            const duration = performance.now() - this.metrics[phase];
            console.log(`${phase} completed in ${duration}ms`);
            return duration;
        }
        return 0;
    }

    async initialize(options = {}) {
        console.log('Starting game initialization...');
        try {
            // Find container
            const containerSelectors = {
                game: '.game-container',  
                verification: '.verification-container',
                setup: '.setup-container'
            };
     
            let container = null;
            let containerType = null;
            for (const [type, selector] of Object.entries(containerSelectors)) {
                container = document.querySelector(selector);
                if (container) {
                    containerType = type;
                    break; 
                }
            }
     
            if (!container) {
                throw new Error('No valid container found');
            }
     
            console.log(`Found ${containerType} container`);
     
            // Get/create overlay
            let overlay = document.getElementById('loadingOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.className = 'loading-overlay';
                overlay.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div class="loading-message">Loading...</div>
                `;
                document.body.appendChild(overlay);
            }
     
            // Hide container, show loading
            container.style.display = 'none';
            overlay.style.display = 'flex';
            console.log('Set initial display states');
     
            // Start metrics
            this.startMetric('coreSystems');
            console.log('Starting core systems check...');
            await this.checkCoreSystems();
            this.initStatus.coreSystems = true;
            this.endMetric('coreSystems');
            console.log('Core systems verified ✓');
     
            // Load game data
            this.startMetric('gameData');
            console.log('Starting game data load...');
            await this.loadGameData();
            this.initStatus.gameData = true;
            this.endMetric('gameData');
            console.log('Game data loaded ✓');
     
            // Load player data
            this.startMetric('playerData'); 
            console.log('Starting player data load...');
            await this.loadPlayerData();
            this.initStatus.playerData = true;
            this.endMetric('playerData');
            console.log('Player data loaded ✓');
     
            // Container-specific initialization
            if (containerType === 'game') {
                await this.initializeGameBoard(container);
            } else if (containerType === 'verification') {
                await this.initializeVerification(container);
            }
     
            // Show container
            overlay.style.opacity = '0';
            container.style.display = containerType === 'game' ? 'grid' : 'block';
            container.style.opacity = '1';
            
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
     
            this.initialized = true;
            this.notifySubscribers('INITIALIZATION_COMPLETE');
            console.log('Initialization complete! ✓');
            return true;
     
        } catch (error) {
            console.error('Initialization failed:', error);
            this.handleInitError(error);
            return false;
        }
     }

     async checkCoreSystems() {
        const systems = [
            {name: 'GameSaveManager', instance: window.GameSaveManager},
            {name: 'GameDataManager', instance: window.GameDataManager},
            {name: 'GamePlayerManager', instance: window.GamePlayerManager}, 
            {name: 'PlayerProgressManager', instance: window.PlayerProgressManager}
        ];
    
        // Add initialization before checking ready state
        if (!window.GameDataManager.isReady()) {
            const initResult = await window.GameDataManager.initialize();
            if (!initResult.success) {
                throw new Error(`GameDataManager initialization failed: ${initResult.errors.join(', ')}`);
            }
        }
    
        for (const {name, instance} of systems) {
            if (!instance) {
                throw new Error(`Missing system: ${name}`);
            }
    
            if (typeof instance.waitUntilReady === 'function') {
                await Promise.race([
                    instance.waitUntilReady(),
                    new Promise((_, reject) => setTimeout(() => reject(`${name} ready check timed out`), 5000))
                ]);
            }
        }
    }

    async loadGameData() {
        console.log('Initializing GameDataManager...');
        if (!window.GameDataManager.isReady()) {
            const initResult = await window.GameDataManager.initialize();
            if (!initResult.success) {
                throw new Error(`GameDataManager initialization failed: ${initResult.errors.join(', ')}`);
            }
        }
        await window.GameDataManager.waitUntilReady();
        console.log('GameDataManager ready ✓');
    }

    async loadPlayerData() {
        console.log('Loading player data...');
        const playerData = await window.GameSaveManager.load('players');
        console.log('Player data loaded:', playerData);

        if (!playerData || !Array.isArray(playerData) || playerData.length === 0) {
            throw new Error('No valid player data found');
        }

        if (!window.GamePlayerManager.loadState()) {
            console.log('Initializing player manager...');
            const initResult = await window.GamePlayerManager.initialize(playerData);
            if (!initResult) {
                throw new Error('Failed to initialize player manager');
            }
        }
        await window.GamePlayerManager.waitUntilReady();
        console.log('Player manager initialized ✓');
    }

    async initializeVerification(container) {
        try {
            console.log('Starting verification process...');
            
            // First verify player state
            const playerData = await window.GameSaveManager.load('players');
            if (!playerData || !Array.isArray(playerData) || playerData.length === 0) {
                throw new Error('No valid player data found');
            }
    
            console.log('Player data verified, initializing player manager...');
            
            // Initialize player manager
            const loadResult = await window.GamePlayerManager.loadState();
            if (!loadResult) {
                throw new Error('Failed to initialize player manager');
            }
    
            console.log('Player manager initialized, checking progress state...');
            
            // Now load progress state
            const progressState = await window.GameSaveManager.load('progressState');
            console.log('Loaded progress state:', progressState);
    
            if (!progressState) {
                throw new Error('No progress state found after initialization');
            }
    
            // Now validate it
            if (!window.PlayerProgressManager.validateProgressState(progressState)) {
                console.error('Invalid progress state structure:', progressState);
                throw new Error('Invalid progress state structure');
            }
    
            console.log('Progress state validated, completing verification...');
    
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                const messageEl = overlay.querySelector('.loading-message');
                if (messageEl) {
                    messageEl.textContent = 'Verification complete, redirecting to game...';
                }
            }
    
            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.href = 'game-board.html';
    
            return true;
        } catch (error) {
            console.error('Verification initialization failed:', error);
            throw error;
        }
    }

    async initializeGameBoard(container) {
        console.log('Initializing game board...');
        try {
            // Mount Components in Order
            console.log('Starting component mounting...');
            await this.mountComponentsInOrder();
            console.log('Components mounted ✓');

            return true;
        } catch (error) {
            console.error('Game board initialization failed:', error);
            throw error;
        }
    }

    async mountComponentsInOrder() {
        console.log('Starting component mount sequence...');
        const components = [
            { id: 'leaderboard-root', component: 'LeaderBoard' },
            { id: 'progress-map-root', component: 'ProgressMap' },
            { id: 'player-status-root', component: 'PlayerStatus' },
            { id: 'space-info-root', component: 'SpaceInfo' },
            { id: 'action-requirements-root', component: 'ActionRequirements' },
            { id: 'dice-prompt-root', component: 'DicePrompt' },
            { id: 'dice-result-root', component: 'DiceResult' },
            { id: 'dice-system-root', component: 'DiceSystem' },
            { id: 'game-instructions-root', component: 'GameInstructions' },
            { id: 'performed-actions-root', component: 'PerformedActions' }
        ];

        for (const { id, component } of components) {
            console.log(`Mounting ${component} in ${id}...`);
            try {
                const root = document.getElementById(id);
                if (!root) {
                    throw new Error(`Root element not found: ${id}`);
                }
                const Component = window[component];
                if (!Component) {
                    throw new Error(`Component ${component} not found`);
                }
                ReactDOM.render(React.createElement(Component), root);
                this.mountedComponents.add(id);
                console.log(`${component} mounted successfully ✓`);
            } catch (error) {
                console.error(`Failed to mount ${component}:`, error);
                throw error;
            }
        }
    }

    handleInitError(error) {
        console.error('Game initialization failed:', error);
        
        // Show error UI
        const container = document.querySelector('.game-container');
        const overlay = document.getElementById('loadingOverlay');
        
        if (container && overlay) {
            overlay.style.display = 'none';
            container.innerHTML = `
                <div class="error-container">
                    <h2>Failed to Start Game</h2>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()">Retry</button>
                    <button onclick="window.location.href='player-setup.html'">Return to Setup</button>
                </div>
            `;
            container.style.display = 'block';
        }
        
        this.notifySubscribers('INITIALIZATION_ERROR', error);
        console.log('Error handler complete');
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers(event, data) {
        this.subscribers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });
    }

    cleanup() {
        console.log('Starting cleanup...');
        this.mountedComponents.forEach(id => {
            const root = document.getElementById(id);
            if (root) {
                console.log(`Unmounting component from ${id}...`);
                ReactDOM.unmountComponentAtNode(root);
            }
        });
        this.subscribers.clear();
        console.log('Cleanup complete ✓');
    }
}

// Create global instance with error handling
try {
    window.GameInitializer = new GameInitializer();
} catch (error) {
    console.error('Failed to initialize GameInitializer:', error);
    // Provide basic fallback
    window.GameInitializer = {
        initialize: async () => false,
        cleanup: () => {},
        subscribe: () => () => {}
    };
}