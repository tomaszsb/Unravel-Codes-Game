// game-component-loader.js
// A utility script to ensure components are properly loaded and available

// Global component registry
window.GameComponentRegistry = {
    components: {},
    register: function(name, component) {
        console.log(`Registering component: ${name}`);
        this.components[name] = component;
        // Also add to window object for backward compatibility
        window[name] = component;
        
        // Add a flag for easy verification
        const flagName = `${name}_LOADED`;
        window[flagName] = true;
        
        return component;
    },
    get: function(name) {
        return this.components[name] || window[name];
    },
    getAll: function() {
        return Object.keys(this.components);
    },
    isRegistered: function(name) {
        return this.components.hasOwnProperty(name) || 
               (typeof window[name] === 'function') || 
               window[`${name}_LOADED`] === true;
    }
};

// Robust component registration method
window.registerComponent = function(name, component) {
    // Register in registry
    window.GameComponentRegistry.register(name, component);
    
    // Add direct to window
    window[name] = component;
    
    // Use Object.defineProperty for more robust registration
    try {
        Object.defineProperty(window, name, {
            value: component,
            writable: false,
            configurable: true
        });
    } catch (e) {
        console.warn(`Couldn't use defineProperty for ${name}, using direct assignment`);
    }
    
    // Set verification flag
    window[`${name}_LOADED`] = true;
    
    console.log(`Component ${name} registered using enhanced method`);
    return component;
};

// Component loader utility
window.ComponentLoader = {
    // Load a script and register it
    loadComponent: function(src, componentName) {
        return new Promise((resolve, reject) => {
            console.log(`Loading component: ${componentName} from ${src}`);
            
            // Check if already loaded
            if (window.GameComponentRegistry.isRegistered(componentName)) {
                console.log(`Component already loaded: ${componentName}`);
                resolve(window.GameComponentRegistry.get(componentName));
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            
            script.onload = () => {
                console.log(`Script loaded for component: ${componentName}`);
                
                // Wait a short time to ensure script execution completes
                setTimeout(() => {
                    // Check if component is registered after script load
                    if (window.GameComponentRegistry.isRegistered(componentName)) {
                        console.log(`Component loaded successfully: ${componentName}`);
                        resolve(window.GameComponentRegistry.get(componentName));
                    } else {
                        // Try to find it in window
                        if (typeof window[componentName] === 'function') {
                            console.log(`Component found in window: ${componentName}`);
                            window.GameComponentRegistry.register(componentName, window[componentName]);
                            resolve(window[componentName]);
                        } else {
                            // Try one more time after a longer delay
                            setTimeout(() => {
                                if (typeof window[componentName] === 'function' || 
                                    window[`${componentName}_LOADED`] === true) {
                                    console.log(`Component found after delay: ${componentName}`);
                                    window.GameComponentRegistry.register(componentName, window[componentName]);
                                    resolve(window[componentName]);
                                } else {
                                    console.error(`Component not found after loading: ${componentName}`);
                                    reject(new Error(`Component not found: ${componentName}`));
                                }
                            }, 500);
                        }
                    }
                }, 100);
            };
            
            script.onerror = () => {
                console.error(`Failed to load component: ${componentName}`);
                reject(new Error(`Failed to load: ${componentName}`));
            };
            
            document.head.appendChild(script);
        });
    },
    
    // Verify that a component is loaded and ready to use
    verifyComponent: function(componentName) {
        return new Promise((resolve, reject) => {
            const maxAttempts = 20; // Increased attempts
            let attempts = 0;
            
            const checkComponent = () => {
                attempts++;
                console.log(`Verifying component (attempt ${attempts}): ${componentName}`);
                
                // Check registry first
                if (window.GameComponentRegistry.isRegistered(componentName)) {
                    console.log(`Component verified in registry: ${componentName}`);
                    resolve(window.GameComponentRegistry.get(componentName));
                    return;
                }
                
                // Check direct window assignment
                if (typeof window[componentName] === 'function') {
                    console.log(`Component found in window: ${componentName}`);
                    window.GameComponentRegistry.register(componentName, window[componentName]);
                    resolve(window[componentName]);
                    return;
                }
                
                // Check flag
                if (window[`${componentName}_LOADED`] === true) {
                    console.log(`Component found via flag: ${componentName}`);
                    window.GameComponentRegistry.register(componentName, window[componentName]);
                    resolve(window[componentName]);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.error(`Component verification failed after ${attempts} attempts: ${componentName}`);
                    reject(new Error(`Component not found after ${attempts} attempts: ${componentName}`));
                    return;
                }
                
                // Try again after a delay (increasing delay for later attempts)
                const delay = Math.min(100 + (attempts * 50), 500);
                setTimeout(checkComponent, delay);
            };
            
            checkComponent();
        });
    },
    
    // Load multiple components in sequence
    loadComponents: function(componentConfigs) {
        return componentConfigs.reduce((promise, config) => {
            return promise.then(() => this.loadComponent(config.src, config.name));
        }, Promise.resolve());
    }
};

// Register our main GameBoard component explicitly if it exists
if (typeof GameBoard === 'function' || window.GameBoard) {
    window.registerComponent('GameBoard', GameBoard || window.GameBoard);
    console.log('GameBoard registered during component loader initialization');
}

// Add event listener to check components once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Component loader initialized');
    
    // Check for our main game component
    window.ComponentLoader.verifyComponent('GameBoard')
        .then(() => {
            console.log('GameBoard component verified and ready');
        })
        .catch(error => {
            console.error('GameBoard verification failed:', error);
        });
});
