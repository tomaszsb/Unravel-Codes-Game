class GameDataManager {
 
    async checkDependencies() {
        console.log('Starting dependency check...');
        // Wait for window.fs
        let attempts = 0;
        while (!window.fs && attempts < 50) {
            console.log(`Attempt ${attempts + 1}: Waiting for file system...`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    
        if (!window.fs?.readFile) {
            console.error('File system missing or incomplete');
            throw new Error('File system not initialized');
        }
        console.log('File system verified ✓');
    
        if (!window.Papa) {
            console.error('CSV parser missing');
            throw new Error('CSV parser not initialized');
        }
        console.log('CSV parser verified ✓');
        console.log('CSV files to load:', this.csvFiles);
        console.log('File system API available:', !!window.fs?.readFile);
        return true;
    }

    async initialize() {
        if (this.isInitialized) {
            return {success: true};
        }
    
        try {
            // Always parse CSVs first - we need the full data structure
            await this.checkDependencies();
            
            // Load spaces data
            const spacesContent = await window.fs.readFile(this.csvFiles.spaces, { encoding: 'utf8' });
            const spacesData = await this.parseCSV(spacesContent, 'spaces');
            
            // Validate the parsed data
            if (!Array.isArray(spacesData)) {
                throw new Error('Invalid spaces data format after parsing');
            }
    
            // Store full space data objects in our Map
            this.data.set('spaces', spacesData);
            
            // Load and store dice roll data
            const diceContent = await window.fs.readFile(this.csvFiles.diceRoll, { encoding: 'utf8' });
            const diceData = await this.parseCSV(diceContent, 'diceRoll');
            this.data.set('diceRoll', diceData);
    
            // Process branch paths (but don't transform the main data)
            await this.processBranchPaths();
    
            // Save the FULL space data objects to SaveManager
            // This is the key change - we're saving the complete objects
            await window.GameSaveManager.save('spaces', this.data.get('spaces'));
            await window.GameSaveManager.save('diceRoll', this.data.get('diceRoll'));
    
            this.isInitialized = true;
            this.readyState = {
                initialized: true,
                dataLoaded: true
            };
            
            return {success: true};
    
        } catch (error) {
            console.error('GameDataManager initialization failed:', error);
            return {success: false, errors: [error.message]};
        }
    }

    async parseCSV(content, type) {
        console.log(`   > Parsing ${type} data`);
        console.log(`Parsing ${type} CSV:`);
        console.log('Raw content preview:', content.substring(0, 200));

        // Use full PapaParse options for robust parsing
        const parsed = window.Papa.parse(content, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            delimitersToGuess: [',', '\t', '|', ';'],
            transform: (value) => value?.trim() // Strip whitespace
        });
        
        console.log('Parsed result:', {
            rowCount: parsed.data?.length,
            columnNames: parsed.meta?.fields,
            firstRow: parsed.data?.[0]
        });
        
        // Validate structure
        if (!parsed.data || !parsed.meta || !Array.isArray(parsed.data)) {
            throw new Error('Invalid parse results structure');
        }
    
        // Handle errors
        if (parsed.errors?.length > 0) {
            throw new Error(`Parse errors: ${JSON.stringify(parsed.errors)}`);
        }
    
        // Clean headers
        const fields = parsed.meta.fields?.map(f => f.trim()) || [];
    
        // Validate required columns
        const schema = this.validationSchemas[type];
        if (schema) {
            const missingColumns = schema.requiredColumns.filter(col => !fields.includes(col));
            if (missingColumns.length > 0) {
                throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
            }
        }
    
        // Validate data completeness
        const validatedData = parsed.data.map(row => {
            // Handle potential undefined values
            const cleanRow = {};
            fields.forEach(field => {
                cleanRow[field] = row[field] ?? null;
            });
            return cleanRow;
        });
    
        console.log(`   > Found ${validatedData.length} valid rows`);
        console.log('   > Columns:', fields);
    
        return validatedData;
    }

    // Helper method to process branch paths
    async processBranchPaths() {
        try {
            const spacesData = this.data.get('spaces');
            
            // Validate spaces data
            if (!spacesData || !Array.isArray(spacesData)) {
                console.error('Invalid spaces data format:', spacesData);
                throw new Error('Invalid spaces data format');
            }
            
            // Reset branch paths
            this.branchPaths = new Set();
            
            // Process each space
            spacesData.forEach(space => {
                if (!space || typeof space !== 'object') return;
                
                // Get moves from Space 1-5 columns
                for (let i = 1; i <= 5; i++) {
                    const moveText = space[`Space ${i}`];
                    if (moveText && typeof moveText === 'string') {
                        const cleanMove = this.cleanMoveText(moveText);
                        if (cleanMove && !window.GameSaveManager.mainGamePath.includes(cleanMove)) {
                            this.branchPaths.add(cleanMove);
                            console.log(`Found branch path: ${cleanMove}`);
                        }
                    }
                }
            });
    
            return true;
        } catch (error) {
            console.error('Error processing branch paths:', error);
            return false;
        }
    }
    
    async waitUntilReady() {
        if (this.isReady()) {
            return true;
        }
    
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = () => {
                attempts++;
                console.log(`Ready check attempt ${attempts}/${maxAttempts}`);
                
                if (this.isReady()) {
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('GameDataManager ready check timed out'));
                    return;
                }
    
                setTimeout(check, 100);
            };
    
            check();
        });
    }
    
    // New helper method to clean up move text
    cleanMoveText(moveText) {
        if (!moveText || typeof moveText !== 'string') {
            return '';
        }
        
        // Split on space-dash-space (the description separator)
        const parts = moveText.split(' - ');
        return parts[0].trim();
    }

    constructor() {
        this.initializationPromise = null;
        this.data = new Map();
        this.subscribers = new Set();
        this.initialized = false;
        this.isInitialized = false; 
        this.isLoading = false;
        
        // CSV file paths
        this.csvFiles = {
            spaces: 'Data/Spaces Info.csv',
            diceRoll: 'Data/DiceRoll Info.csv'
        };
    
        // Validation schemas for different data types 
        this.validationSchemas = {
             spaces: {
                 requiredColumns: ['Space Name', 'Phase', 'Visit Type', 'Event', 'Action']
             },
             diceRoll: {
                 requiredColumns: ['Space Name', 'Die Roll', 'Visit Type']
             }
         };
    
         // Ready state tracking
         this.readyState = { 
             initialized: false,
             dataLoaded: false
         };
    }
 
    getAllValidSpaces() {
        const validSpaces = new Set(window.GameSaveManager.mainGamePath);
        
        try {
            // Add spaces from CSV data
            const spacesData = this.data.get('spaces');
            if (spacesData && Array.isArray(spacesData)) {
                spacesData.forEach(space => {
                    if (space['Space Name']) {
                        validSpaces.add(space['Space Name']);
                    }
                    // Add branch paths from Space 1-5 columns
                    for (let i = 1; i <= 5; i++) {
                        const branchPath = space[`Space ${i}`];
                        if (branchPath && typeof branchPath === 'string') {
                            const cleanPath = this.cleanMoveText(branchPath);
                            if (cleanPath && cleanPath.toLowerCase() !== 'n/a') {
                                validSpaces.add(cleanPath);
                            }
                        }
                    }
                });
            }
    
            // Also add any paths from branchPaths set for backward compatibility
            if (this.branchPaths) {
                this.branchPaths.forEach(space => validSpaces.add(space));
            }
        } catch (error) {
            console.error('Error getting valid spaces:', error);
        }
        
        return validSpaces;
    }
    
    getAvailableMovesForSpace(spaceName) {
        if (!this.isReady() || !spaceName) {
            console.log('GameDataManager not ready or invalid space name');
            return [];
        }
    
        try {
            console.log(`\n=== Getting moves for space: ${spaceName} ===`);
            
            // Get space data from CSV
            const spaceData = this.getSpaceData(spaceName);
            if (!spaceData?.[0]) {
                console.log(`No data found for space: ${spaceName}`);
                return [];
            }
    
            // Step 1: Check if this space has dice roll requirements
            const diceRollData = this.data.get('diceRoll');
            const hasMovementDice = diceRollData?.some(roll => {
                if (roll['Space Name'] !== spaceName) return false;
                return Object.keys(roll)
                    .filter(k => k.match(/^[1-6]$/))
                    .some(k => {
                        const outcome = roll[k];
                        return outcome?.includes('-') && !outcome?.includes('days');
                    });
            });
                
            if (hasMovementDice) {
                const progressState = window.GameSaveManager?.load('progressState');
                if (!progressState?.rollState?.hasRolled) {
                    console.log('Space requires dice roll before moves are available');
                    return [];
                }
                
                const roll = progressState.rollState.rolls[0];
                const diceMove = this.getDiceOutcome(spaceName, roll);
                if (diceMove) {
                    console.log(`Dice-based move found for roll ${roll}:`, diceMove);
                    return [diceMove];
                }
            }
    
            // Step 2: Get direct moves from Space columns
            const moves = [];
            for (let i = 1; i <= 5; i++) {
                const moveText = spaceData[0][`Space ${i}`];
                if (moveText && typeof moveText === 'string' && moveText.trim()) {
                    const cleanMove = this.cleanMoveText(moveText.trim());
                    if (cleanMove && cleanMove.toLowerCase() !== 'n/a') {
                        moves.push(cleanMove);
                    }
                }
            }
    
            // Step 3: If no moves found yet, check main path progression
            if (moves.length === 0 && !hasMovementDice) {
                const mainPath = window.GameSaveManager.mainGamePath;
                const currentIndex = mainPath.indexOf(spaceName);
                if (currentIndex !== -1 && currentIndex < mainPath.length - 1) {
                    const nextMainPathSpace = mainPath[currentIndex + 1];
                    moves.push(nextMainPathSpace);
                    console.log('Added next main path space:', nextMainPathSpace);
                }
            }
    
            return moves;
    
        } catch (error) {
            console.error('Error getting available moves:', error);
            return [];
        }
    }
    
    isDiceRollRequired(spaceName, visitType) {
        if (!this.isReady() || !spaceName) {
            return false;
        }
    
        try {
            // Get dice roll data
            const diceRollData = this.data.get('diceRoll');
            if (!diceRollData) {
                return false;
            }
    
            // Check if there are any dice roll entries for this space and visit type
            const hasRollEntry = diceRollData.some(roll => 
                roll['Space Name'] === spaceName && 
                roll['Visit Type'] === visitType
            );
    
            console.log('Dice roll check:', {
                space: spaceName,
                visitType: visitType,
                hasRoll: hasRollEntry,
                data: diceRollData.filter(r => r['Space Name'] === spaceName)
            });
    
            return hasRollEntry;
    
        } catch (error) {
            console.error('Error checking dice requirement:', error);
            return false;
        }
    }

    getSpaceData(spaceName) {
        console.log('getSpaceData called:');
        console.log('- Requested space:', spaceName);
        console.log('- Data Map has spaces:', this.data.has('spaces'));

        if (!spaceName) {
            console.error('getSpaceData: No space name provided');
            return [];
        }
    
        // Ensure data is loaded
        if (!this.data || !this.data.has('spaces')) {
            console.error('getSpaceData: No spaces data available');
            return [];
        }
    
        const spaces = this.data.get('spaces');
        console.log('- Total spaces in data:', spaces?.length);
        console.log('- Space names containing OWNER:', spaces?.filter(s => s['Space Name']?.includes('OWNER'))?.map(s => s['Space Name'])); 
        const spaceData = spaces.filter(space => space['Space Name'] === spaceName);
        console.log('- Found matching spaces:', spaceData.length);
    
        if (!spaceData || spaceData.length === 0) {
            console.error(`getSpaceData: No data found for space "${spaceName}"`);
            return [];
        }
    
        // Collect next spaces from the CSV columns
        spaceData[0].nextSpaces = [
            spaceData[0]['Space 1'],
            spaceData[0]['Space 2'], 
            spaceData[0]['Space 3'],
            spaceData[0]['Space 4'],
            spaceData[0]['Space 5']
        ].filter(space => space && space.trim() !== '');

        console.log('Space data debug:');
        console.log('- Raw spaces data:', this.data.get('spaces'));
        console.log('- Spaces count:', this.data.get('spaces')?.length);
        console.log('- Looking for space:', spaceName);
        return spaceData;
    }

    isDecisionPoint(spaceName) {
        // A space is a decision point if it has multiple valid next spaces
        const availableMoves = this.getAvailableMovesForSpace(spaceName);
        return availableMoves.length > 1;
    }

    isReady() {
        const state = {
            isInitialized: this.isInitialized,
            hasSpaces: this.data.has('spaces'), 
            hasDiceRoll: this.data.has('diceRoll')
        };
        
        console.log('GameDataManager ready check:', state);
        
        return this.isInitialized && 
               this.data.has('spaces') && 
               this.data.has('diceRoll');
    }

    validateMoveSequence(fromSpace, toSpace) {
        if (!this.isReady() || !fromSpace || !toSpace) {
            return false;
        }
    
        try {
            // First verify toSpace exists in our data
            const validSpaces = this.getAllValidSpaces();
            if (!validSpaces.has(toSpace)) {
                console.log(`${toSpace} is not a valid game space`);
                return false;
            }
    
            // Then check if it's a valid move from current space
            const availableMoves = this.getAvailableMovesForSpace(fromSpace);
            return availableMoves.includes(toSpace);
    
        } catch (error) {
            console.error('Error validating move sequence:', error);
            return false;
        }
    }
}
    try {
        window.GameDataManager = new GameDataManager();
    } catch (error) {
        console.error('Failed to initialize GameDataManager:', error);
        window.GameDataManager = {
            isReady: function() { return false; },
            waitUntilReady: async function() { return false; },
            getSpaceData: function() { return []; },
            getDiceRollData: function() { return null; },
            initialize: async function() { 
                return {success: false, errors: ['GameDataManager not initialized']}; 
            },
            getAllValidSpaces: function() { return new Set(); },
            getAvailableMovesForSpace: function() { return []; },
            validateMoveSequence: function() { return false; },
            isDecisionPoint: function() { return false; },
            data: new Map()
        };
    }