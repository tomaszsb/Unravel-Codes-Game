// Game initialization utilities
class GameInitializer {
  constructor(config = {}) {
    this.config = {
      debugMode: false,
      maxPlayers: 4,
      startingPoints: 100,
      ...config
    };
    this.isInitialized = false;
  }
  
  initialize() {
    console.log('Initializing game with configuration:', this.config);
    this.isInitialized = true;
    return this;
  }
  
  createGameInstance() {
    if (!this.isInitialized) {
      throw new Error('Must initialize before creating game instance');
    }
    
    return {
      config: this.config,
      timestamp: Date.now(),
      id: `game-${Math.floor(Math.random() * 10000)}`
    };
  }
}

module.exports = GameInitializer;