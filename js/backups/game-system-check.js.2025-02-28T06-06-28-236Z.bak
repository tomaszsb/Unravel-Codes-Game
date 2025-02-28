/**
 * game-system-check.js
 * Utility to check if game systems are ready and attempt repair if needed
 */

window.GameSystemCheck = {
    // Check if all required game systems are ready
    areSystemsReady: function() {
        try {
            // Check SaveManager
            if (!window.GameSaveManager) return false;
            
            // Check GameDataManager
            if (!window.GameDataManager?.isReady()) return false;
            
            // Check PlayerManager
            if (!window.GamePlayerManager?.isInitialized()) return false;
            
            // Check PlayerProgressManager
            if (!window.PlayerProgressManager?.isInitialized()) return false;
            
            // If we got here, all systems are ready
            return true;
        } catch (error) {
            console.error('Error checking systems ready state:', error);
            return false;
        }
    },
    
    // Get detailed status of all systems
    getSystemsStatus: function() {
        return {
            saveManagerAvailable: !!window.GameSaveManager,
            gameDataManagerReady: window.GameDataManager?.isReady() || false,
            playerManagerInitialized: window.GamePlayerManager?.isInitialized() || false,
            progressManagerInitialized: window.PlayerProgressManager?.isInitialized() || false,
            allReady: this.areSystemsReady()
        };
    },
    
    // Wait for systems to be ready with timeout
    waitForSystems: function(timeout = 5000) {
        return new Promise((resolve, reject) => {
            // If already ready, resolve immediately
            if (this.areSystemsReady()) {
                resolve(true);
                return;
            }
            
            // Set timeout
            const timeoutId = setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error(`Systems not ready after ${timeout}ms`));
            }, timeout);
            
            // Check periodically
            const checkInterval = setInterval(() => {
                if (this.areSystemsReady()) {
                    clearTimeout(timeoutId);
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 200);
        });
    },
    
    // Attempt to repair core systems
    repairSystems: async function() {
        try {
            console.log('Starting system repair...');
            const status = this.getSystemsStatus();
            
            // 1. First check SaveManager - can't really repair this
            if (!status.saveManagerAvailable) {
                console.error('SaveManager not available, cannot repair');
                throw new Error('SaveManager not available');
            }
            
            // 2. Try to initialize GameDataManager if needed
            if (!status.gameDataManagerReady) {
                console.log('Attempting to initialize GameDataManager...');
                if (typeof window.GameDataManager?.initialize === 'function') {
                    const result = await window.GameDataManager.initialize();
                    if (!result.success) {
                        throw new Error(`GameDataManager initialization failed: ${result.errors?.join(', ')}`);
                    }
                } else {
                    throw new Error('GameDataManager not available or missing initialize method');
                }
            }
            
            // 3. Try to initialize PlayerManager if needed
            if (!status.playerManagerInitialized) {
                console.log('Attempting to initialize PlayerManager...');
                const players = window.GameSaveManager.load('players');
                if (!players || !Array.isArray(players)) {
                    throw new Error('Cannot initialize PlayerManager: Player data not found');
                }
                
                if (typeof window.GamePlayerManager?.initialize === 'function') {
                    await window.GamePlayerManager.initialize(players);
                } else {
                    throw new Error('PlayerManager not available or missing initialize method');
                }
            }
            
            // 4. Try to initialize PlayerProgressManager if needed
            if (!status.progressManagerInitialized) {
                console.log('Attempting to initialize PlayerProgressManager...');
                if (typeof window.PlayerProgressManager?.initialize === 'function') {
                    await window.PlayerProgressManager.initialize();
                } else {
                    throw new Error('PlayerProgressManager not available or missing initialize method');
                }
            }
            
            // 5. Check if repair was successful
            const newStatus = this.getSystemsStatus();
            if (!newStatus.allReady) {
                throw new Error('System repair failed, not all systems ready');
            }
            
            console.log('System repair successful, all systems ready');
            return true;
        } catch (error) {
            console.error('System repair failed:', error);
            throw error;
        }
    }
};

console.log('Game system check utility loaded');
console.log('Initial systems status:', window.GameSystemCheck.getSystemsStatus());
