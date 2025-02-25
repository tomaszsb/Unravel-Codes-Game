// color-manager.js
class ColorManager {
    constructor() {
        // Initialize core properties
        this.subscribers = new Set();
        this.updateQueue = [];
        this.isProcessing = false;
        this.cache = new Map();
        this.debounceTimeout = null;
        this.DEFAULT_COLORS = {
            background: '#FFFFFF',
            text: '#000000',
            theme: '#006B3F',
            themeText: '#FFFFFF'
        };

        // Initialize forced-colors mode detection
        this.initializeForcedColors();
    }

    // Initialize forced-colors mode detection
    initializeForcedColors() {
        try {
            if (window.matchMedia) {
                this.forcedColorsQuery = window.matchMedia('(forced-colors: active)');
                this.forcedColorsQuery.addEventListener('change', (e) => this.handleForcedColorsChange(e));
                this.isForcedColors = this.forcedColorsQuery.matches;
            }
        } catch (error) {
            console.warn('Forced colors detection not supported:', error);
            this.isForcedColors = false;
        }
    }

    // Validate hex color
    isValidHexColor(color) {
        return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
    }

    // Validate color array
    validateColorArray(colors) {
        if (!Array.isArray(colors)) {
            throw new Error('Colors must be an array');
        }

        if (colors.length < 8) {
            throw new Error('Color array must contain at least 8 colors');
        }

        const invalidColors = colors.filter(color => !this.isValidHexColor(color));
        if (invalidColors.length > 0) {
            throw new Error(`Invalid hex colors found: ${invalidColors.join(', ')}`);
        }

        return true;
    }

    // Get safe color from array with fallback
    getSafeColor(colors, index, fallback) {
        try {
            if (!Array.isArray(colors) || !colors[index]) {
                return fallback;
            }
            return this.isValidHexColor(colors[index]) ? colors[index] : fallback;
        } catch (error) {
            console.error('Error accessing color:', error);
            return fallback;
        }
    }

    // Update theme colors with validation and queueing
    updateThemeColors(colors) {
        try {
            // Validate input
            if (!colors) {
                throw new Error('No colors provided');
            }

            // Queue update
            this.updateQueue.push(colors);

            // Debounce processing
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
            }

            this.debounceTimeout = setTimeout(() => this.processUpdateQueue(), 16); // ~ 1 frame

            return true;
        } catch (error) {
            console.error('Error updating theme colors:', error);
            return false;
        }
    }

    // Process queued updates
    async processUpdateQueue() {
        if (this.isProcessing || this.updateQueue.length === 0) return;

        try {
            this.isProcessing = true;
            const colors = this.updateQueue.pop();
            this.updateQueue = []; // Clear queue

            // Validate colors
            this.validateColorArray(colors);

            // Update CSS variables with safe color access
            const root = document.documentElement;
            const cssUpdates = {
                '--background-color': this.getSafeColor(colors, 0, this.DEFAULT_COLORS.background),
                '--theme-button': this.getSafeColor(colors, 7, this.DEFAULT_COLORS.theme),
                '--theme-button-text': this.getSafeColor(colors, 0, this.DEFAULT_COLORS.themeText),
                '--text-color': this.getContrastColor(this.getSafeColor(colors, 0, this.DEFAULT_COLORS.background))
            };

            // Batch CSS updates
            Object.entries(cssUpdates).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });

            // Cache the current theme
            this.cache.set('currentTheme', colors);

            // Notify subscribers
            this.notifySubscribers(colors);

        } catch (error) {
            console.error('Error processing color updates:', error);
            this.handleUpdateError(error);
        } finally {
            this.isProcessing = false;
            
            // Process any remaining updates
            if (this.updateQueue.length > 0) {
                this.processUpdateQueue();
            }
        }
    }

    // Calculate contrast color with improved accuracy
    getContrastColor(color) {
        try {
            if (!this.isValidHexColor(color)) {
                return this.DEFAULT_COLORS.text;
            }

            // Convert hex to RGB
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            // Calculate relative luminance using WCAG formula
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            // Use cache to avoid recalculation
            const cacheKey = `contrast_${color}`;
            if (!this.cache.has(cacheKey)) {
                this.cache.set(cacheKey, luminance > 0.5 ? '#000000' : '#FFFFFF');
            }
            
            return this.cache.get(cacheKey);
        } catch (error) {
            console.error('Error calculating contrast color:', error);
            return this.DEFAULT_COLORS.text;
        }
    }

    // Subscription management
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Subscriber callback must be a function');
        }
        this.subscribers.add(callback);

        // Initial callback with current theme
        const currentTheme = this.cache.get('currentTheme');
        if (currentTheme) {
            try {
                callback(currentTheme);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        }

        // Return unsubscribe function
        return () => this.unsubscribe(callback);
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    // Notify subscribers with error handling
    notifySubscribers(colors) {
        this.subscribers.forEach(callback => {
            try {
                callback(colors);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
                // Don't remove subscriber on error, let them handle cleanup
            }
        });
    }

    // Handle forced-colors mode changes
    handleForcedColorsChange(event) {
        this.isForcedColors = event.matches;
        if (this.isForcedColors) {
            const root = document.documentElement;
            root.style.setProperty('--primary-color', 'ButtonText');
            root.style.setProperty('--primary-dark', 'ButtonText');
            root.style.setProperty('--error-color', 'Mark');
            root.style.setProperty('--background-color', 'Canvas');
            root.style.setProperty('--text-color', 'CanvasText');
        } else {
            const currentTheme = this.cache.get('currentTheme');
            if (currentTheme) {
                this.updateThemeColors(currentTheme);
            }
        }
    }

    // Apply system colors for forced-colors mode
    applyForcedColors() {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', 'CanvasText');
        root.style.setProperty('--primary-dark', 'CanvasText');
        root.style.setProperty('--error-color', 'Mark');
        root.style.setProperty('--background-color', 'Canvas');
        root.style.setProperty('--text-color', 'CanvasText');
    }

    // Handle update errors
    handleUpdateError(error) {
        // Log error
        console.error('Color update failed:', error);

        // Reset to defaults if necessary
        const root = document.documentElement;
        Object.entries(this.DEFAULT_COLORS).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });

        // Clear cache
        this.cache.clear();

        // Notify subscribers of error
        this.notifySubscribers(Object.values(this.DEFAULT_COLORS));
    }

    // Reset to default colors
    reset() {
        this.updateQueue = [];
        this.cache.clear();
        this.updateThemeColors(Object.values(this.DEFAULT_COLORS));
    }

    // Cleanup resources
    destroy() {
        if (this.forcedColorsQuery) {
            this.forcedColorsQuery.removeEventListener('change', this.handleForcedColorsChange);
        }
        clearTimeout(this.debounceTimeout);
        this.subscribers.clear();
        this.cache.clear();
        this.updateQueue = [];
    }
}

// Create global instance with error handling
try {
    window.GameColorManager = new ColorManager();
} catch (error) {
    console.error('Failed to initialize ColorManager:', error);
    // Provide basic fallback
    window.GameColorManager = {
        updateThemeColors: () => false,
        getContrastColor: () => '#000000',
        subscribe: () => () => {},
        unsubscribe: () => {}
    };
}