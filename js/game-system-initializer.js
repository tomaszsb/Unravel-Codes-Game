/**
 * game-system-initializer.js
 * A utility to properly initialize all game systems before rendering the main component
 */

// Global initialization state
window.GameSystemInitializer = {
    initialized: false,
    
    // Initialize all game systems in the correct order
    initializeGameSystems: async function() {
        console.log('Starting game systems initialization...');
        
        try {
            // Step 1: Check dependencies
            this.checkDependencies();
            
            // Step 2: Check if SaveManager is available
            console.log('Checking SaveManager...');
            if (typeof window.GameSaveManager !== 'object') {
                throw new Error('SaveManager not available');
            }
            
            // Step 3: Initialize GameDataManager
            console.log('Initializing GameDataManager...');
            if (typeof window.GameDataManager?.initialize === 'function') {
                const gdmResult = await window.GameDataManager.initialize();
                if (!gdmResult || !gdmResult.success) {
                    throw new Error(`Failed to initialize GameDataManager: ${gdmResult?.errors?.join(', ') || 'Unknown error'}`);
                }
            } else {
                throw new Error('GameDataManager not available or missing initialize method');
            }
            
            // Step 4: Load player data
            console.log('Loading player data...');
            const players = window.GameSaveManager.load('players');
            if (!players || !Array.isArray(players)) {
                throw new Error('Player data not found or invalid');
            }
            
            // Step 5: Initialize PlayerManager
            console.log('Initializing PlayerManager...');
            if (typeof window.GamePlayerManager?.initialize === 'function') {
                await window.GamePlayerManager.initialize(players);
            } else {
                throw new Error('PlayerManager not available or missing initialize method');
            }
            
            // Step 6: Initialize PlayerProgressManager
            console.log('Initializing PlayerProgressManager...');
            if (typeof window.PlayerProgressManager?.initialize === 'function') {
                await window.PlayerProgressManager.initialize();
            } else {
                throw new Error('PlayerProgressManager not available or missing initialize method');
            }
            
            // Verify all systems are ready
            this.verifySystemsReady();
            
            console.log('All game systems initialized successfully!');
            this.initialized = true;
            return true;
            
        } catch (error) {
            console.error('Failed to initialize game systems:', error);
            this.initialized = false;
            throw error;
        }
    },
    
    // Check if all required dependencies are loaded
    checkDependencies: function() {
        const requiredDependencies = [
            'GameSaveManager',
            'GameDataManager',
            'GamePlayerManager',
            'PlayerProgressManager'
        ];
        
        const missingDependencies = requiredDependencies.filter(
            dep => typeof window[dep] === 'undefined'
        );
        
        if (missingDependencies.length > 0) {
            throw new Error(`Missing dependencies: ${missingDependencies.join(', ')}`);
        }
        
        console.log('All dependencies verified');
    },
    
    // Verify all systems are ready
    verifySystemsReady: function() {
        // Check GameDataManager
        if (!window.GameDataManager.isReady()) {
            throw new Error('GameDataManager not ready after initialization');
        }
        
        // Check PlayerManager
        if (!window.GamePlayerManager.isInitialized()) {
            throw new Error('GamePlayerManager not initialized properly');
        }
        
        // Check PlayerProgressManager
        if (!window.PlayerProgressManager.isInitialized()) {
            throw new Error('PlayerProgressManager not initialized properly');
        }
        
        console.log('All systems verified as ready');
    },
    
    // Check if systems are initialized
    isInitialized: function() {
        return this.initialized;
    },
    
    // Initialize with retries
    initializeWithRetries: async function(maxRetries = 3, retryDelay = 500) {
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                attempts++;
                console.log(`Initialization attempt ${attempts}/${maxRetries}...`);
                
                await this.initializeGameSystems();
                console.log(`Initialization successful on attempt ${attempts}`);
                return true;
                
            } catch (error) {
                console.warn(`Initialization attempt ${attempts} failed:`, error);
                
                if (attempts >= maxRetries) {
                    console.error(`All ${maxRetries} initialization attempts failed`);
                    throw error;
                }
                
                // Wait before retrying
                console.log(`Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
                // Increase delay for next retry
                retryDelay = Math.min(retryDelay * 1.5, 3000);
            }
        }
    }
};

// Auto-initialize when the script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Game system initializer loaded');
});
