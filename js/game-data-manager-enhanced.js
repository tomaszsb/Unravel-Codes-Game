/**
 * Enhanced GameDataManager - Responsible for loading, processing, and validating game data from CSV files.
 * This implementation includes:
 * 1. Complete integration of all Spaces Info CSV columns
 * 2. Improved branch path handling with support for branch paths column
 * 3. Cross-validation between Spaces Info and DiceRoll Info files
 * 4. Proper handling of action requirements from CSV
 */
class GameDataManager {
    constructor() {
        this.initializationPromise = null;
        this.data = new Map();
        this.subscribers = new Set();
        this.initialized = false;
        this.isInitialized = false; 
        this.isLoading = false;
        this.branchPaths = new Set();
        
        // CSV file paths
        this.csvFiles = {
            spaces: 'Data/Spaces Info.csv',
            diceRoll: 'Data/DiceRoll Info.csv'
        };
    
        // Enhanced validation schemas for different data types 
        this.validationSchemas = {
            spaces: {
                requiredColumns: [
                    'Space Name', 'Phase', 'Visit Type', 'Event', 'Action', 
                    'Outcome', 'Time', 'Fee', 'Space 1', 'Negotiate'
                ]
            },
            diceRoll: {
                requiredColumns: ['Space Name', 'Die Roll', 'Visit Type']
            }
        };
    
        // Action requirement columns mapping
        this.actionRequirementColumns = [
            'W Card', 'B Card', 'I Card', 'L card', 'E Card', 'Fee', 'Time'
        ];
    
        // Ready state tracking
        this.readyState = { 
            initialized: false,
            dataLoaded: false
        };
        
        // Cache for frequently accessed data
        this.cache = {
            spacesByName: new Map(),
            availableMoves: new Map(),
            branchPaths: new Map(),
            mainPath: [],
            allValidSpaces: new Set()
        };
    }
    
    /**
     * Check for required dependencies before initialization
     */
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

    /**
     * Initialize the GameDataManager by loading and processing all CSV data
     * @returns {Promise<{success: boolean, errors: string[]}>} Result of initialization
     */
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
    
            // Process branch paths and build caches
            await this.processBranchPaths();
            this.buildCache();
            
            // Cross-validate data
            const validationResult = this.crossValidateData();
            if (!validationResult.success) {
                console.warn('Cross-validation warnings:', validationResult.errors);
            }
    
            // Save the FULL space data objects to SaveManager
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

    /**
     * Parse CSV data with enhanced validation and processing
     * @param {string} content - Raw CSV content
     * @param {string} type - Type of data being parsed ('spaces' or 'diceRoll')
     * @returns {Array} Processed data
     */
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
    
        // Process data based on type
        let processedData;
        
        if (type === 'spaces') {
            processedData = this.processSpaceData(parsed.data, fields);
        } else {
            // Validate data completeness for non-space data
            processedData = parsed.data.map(row => {
                // Handle potential undefined values
                const cleanRow = {};
                fields.forEach(field => {
                    cleanRow[field] = row[field] ?? null;
                });
                return cleanRow;
            });
        }
    
        console.log(`   > Found ${processedData.length} valid rows`);
        console.log('   > Columns:', fields);
    
        return processedData;
    }

    /**
     * Process space data with enhanced features
     * @param {Array} data - Raw parsed data
     * @param {Array} fields - Available field names
     * @returns {Array} Processed space data
     */
    processSpaceData(data, fields) {
        return data.map(space => {
            const processedSpace = { ...space };
            
            // Handle Branch Paths column if it exists
            if (processedSpace['Branch Paths'] && typeof processedSpace['Branch Paths'] === 'string') {
                processedSpace.branchPathsArray = processedSpace['Branch Paths']
                    .split(',')
                    .map(path => path.trim())
                    .filter(path => path.length > 0);
            } else {
                processedSpace.branchPathsArray = [];
            }
            
            // Extract action requirements
            processedSpace.actionRequirements = this.extractActionRequirements(space);
            
            // Process 'Next Space' field to ensure it's properly handled
            if (processedSpace['Next Space']) {
                processedSpace.nextSpace = processedSpace['Next Space'].trim();
            }
            
            // Collect available moves from Space 1-5 columns
            processedSpace.nextSpaces = [];
            for (let i = 1; i <= 5; i++) {
                const moveText = space[`Space ${i}`];
                if (moveText && typeof moveText === 'string' && moveText.trim()) {
                    const cleanMove = this.cleanMoveText(moveText);
                    if (cleanMove && cleanMove.toLowerCase() !== 'n/a') {
                        processedSpace.nextSpaces.push(cleanMove);
                    }
                }
            }
            
            // Handle negotiation options
            if (processedSpace['Negotiate'] && 
                (processedSpace['Negotiate'].toUpperCase() === 'YES' || 
                 processedSpace['Negotiate'].toUpperCase() === 'NO')) {
                processedSpace.canNegotiate = processedSpace['Negotiate'].toUpperCase() === 'YES';
            } else {
                processedSpace.canNegotiate = false;
            }
            
            return processedSpace;
        });
    }

    /**
     * Extract action requirements from space data
     * @param {Object} space - Space data
     * @returns {Array} Extracted action requirements
     */
    extractActionRequirements(space) {
        const requirements = [];
        
        // Check if any action requirement columns exist
        const hasRequirements = this.actionRequirementColumns.some(col => 
            space[col] !== undefined && space[col] !== null && 
            space[col] !== '' && space[col] !== 'N/A'
        );
        
        if (hasRequirements) {
            const requirement = {};
            
            // Process each requirement type
            this.actionRequirementColumns.forEach(col => {
                if (space[col] && space[col] !== '' && space[col] !== 'N/A') {
                    // Convert column name to camelCase for consistent access
                    const key = col.replace(/\s+./g, m => m.trim().toUpperCase())
                        .replace(/\s+/g, '')
                        .replace(/^(.)/, m => m.toLowerCase());
                    
                    requirement[key] = space[col];
                }
            });
            
            if (Object.keys(requirement).length > 0) {
                requirements.push(requirement);
            }
        }
        
        return requirements;
    }
    
    /**
     * Helper method to process branch paths
     */
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
                
                // First check Branch Paths column if available
                if (space.branchPathsArray && space.branchPathsArray.length > 0) {
                    space.branchPathsArray.forEach(path => {
                        this.branchPaths.add(path);
                    });
                }
                
                // Also get moves from Space 1-5 columns for backward compatibility
                for (let i = 1; i <= 5; i++) {
                    const moveText = space[`Space ${i}`];
                    if (moveText && typeof moveText === 'string') {
                        const cleanMove = this.cleanMoveText(moveText);
                        if (cleanMove && 
                            !window.GameSaveManager.mainGamePath.includes(cleanMove) && 
                            cleanMove.toLowerCase() !== 'n/a') {
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
    
    /**
     * Build cache for frequently accessed data
     */
    buildCache() {
        const spaces = this.data.get('spaces') || [];
        
        // Reset cache
        this.cache.spacesByName = new Map();
        this.cache.availableMoves = new Map();
        this.cache.branchPaths = new Map();
        this.cache.mainPath = [];
        this.cache.allValidSpaces = new Set();
        
        // Build space lookup by name
        spaces.forEach(space => {
            if (space['Space Name']) {
                this.cache.spacesByName.set(space['Space Name'], space);
                this.cache.allValidSpaces.add(space['Space Name']);
            }
        });
        
        // Build main path using SaveManager's mainGamePath
        if (window.GameSaveManager && window.GameSaveManager.mainGamePath) {
            this.cache.mainPath = [...window.GameSaveManager.mainGamePath];
        } else {
            // Fallback: build main path based on Next Space references
            this.buildMainPath();
        }
        
        // Build branch paths
        this.buildBranchPaths();
        
        // Build available moves for each space
        this.buildAvailableMoves();
    }
    
    /**
     * Build the main path sequence (as fallback if mainGamePath not available)
     */
    buildMainPath() {
        const spaces = this.data.get('spaces') || [];
        
        // Find the starting space (with Visit Type 'START' or 'First')
        const startSpace = spaces.find(space => 
            space['Visit Type'] === 'START' || 
            (space['Visit Type'] === 'First' && space['Space Name'] === 'START')
        );
        
        if (!startSpace) {
            console.error('Could not find starting space');
            return;
        }
        
        // Build the main path
        const mainPath = [startSpace['Space Name']];
        let currentSpace = startSpace;
        const visitedSpaces = new Set([startSpace['Space Name']]);
        
        // Follow Next Space references until we reach the end
        while (currentSpace.nextSpace && !visitedSpaces.has(currentSpace.nextSpace)) {
            const nextSpaceName = currentSpace.nextSpace;
            mainPath.push(nextSpaceName);
            visitedSpaces.add(nextSpaceName);
            
            // Get the next space
            currentSpace = spaces.find(space => space['Space Name'] === nextSpaceName);
            
            // Break if the next space doesn't exist
            if (!currentSpace) break;
        }
        
        this.cache.mainPath = mainPath;
    }
    
    /**
     * Build branch paths from space data
     */
    buildBranchPaths() {
        const spaces = this.data.get('spaces') || [];
        
        // Create a map of branch paths
        const branchPaths = new Map();
        
        spaces.forEach(space => {
            const sourceName = space['Space Name'];
            
            // Check if this space has branch paths
            if (space.branchPathsArray && space.branchPathsArray.length > 0) {
                branchPaths.set(sourceName, space.branchPathsArray);
            } 
            // Backward compatibility: check Space 1-5 columns
            else if (space.nextSpaces && space.nextSpaces.length > 0) {
                // Filter out main path next space if one exists
                const branches = space.nextSpaces.filter(nextSpace => 
                    nextSpace !== space.nextSpace && 
                    !this.cache.mainPath.includes(nextSpace)
                );
                
                if (branches.length > 0) {
                    branchPaths.set(sourceName, branches);
                }
            }
        });
        
        this.cache.branchPaths = branchPaths;
    }
    
    /**
     * Build available moves from each space
     */
    buildAvailableMoves() {
        const spaces = this.data.get('spaces') || [];
        const availableMoves = new Map();
        
        spaces.forEach(space => {
            const spaceName = space['Space Name'];
            const moves = [];
            
            // Add next space from main path if it exists
            if (space.nextSpace) {
                moves.push(space.nextSpace);
            }
            
            // Add moves from Space 1-5 columns
            if (space.nextSpaces && space.nextSpaces.length > 0) {
                space.nextSpaces.forEach(move => {
                    if (!moves.includes(move)) {
                        moves.push(move);
                    }
                });
            }
            
            // Add branch paths
            if (space.branchPathsArray && space.branchPathsArray.length > 0) {
                space.branchPathsArray.forEach(path => {
                    if (!moves.includes(path)) {
                        moves.push(path);
                    }
                });
            }
            
            // Store unique available moves
            availableMoves.set(spaceName, [...new Set(moves)]);
        });
        
        this.cache.availableMoves = availableMoves;
    }
    
    /**
     * Cross-validate Spaces Info and DiceRoll Info files
     * @returns {Object} Validation result
     */
    crossValidateData() {
        const spaces = this.data.get('spaces') || [];
        const diceRolls = this.data.get('diceRoll') || [];
        const errors = [];
        
        // Get all unique space names from spaces data
        const spaceNames = new Set(spaces.map(space => space['Space Name']));
        
        // Get all unique space names from dice rolls
        const diceRollSpaces = new Set(diceRolls.map(roll => roll['Space Name']));
        
        // Check if all dice roll spaces exist in spaces data
        diceRollSpaces.forEach(spaceName => {
            if (!spaceNames.has(spaceName)) {
                errors.push(`Space "${spaceName}" referenced in DiceRoll Info does not exist in Spaces Info`);
            }
        });
        
        // Check if spaces that require dice rolls have corresponding entries
        spaces.forEach(space => {
            const spaceName = space['Space Name'];
            
            // If the space has Visit Type "ROLL" but no entries in dice roll data
            if (space['Visit Type'] === 'ROLL' && !diceRollSpaces.has(spaceName)) {
                errors.push(`Space "${spaceName}" has Visit Type "ROLL" but no entries in DiceRoll Info`);
            }
        });
        
        return {
            success: errors.length === 0,
            errors
        };
    }
    
    /**
     * Wait until GameDataManager is fully initialized
     * @returns {Promise<boolean>} Initialization result
     */
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
    
    /**
     * Helper method to clean up move text by removing descriptions
     * @param {string} moveText - Raw move text
     * @returns {string} Cleaned move text
     */
    cleanMoveText(moveText) {
        if (!moveText || typeof moveText !== 'string') {
            return '';
        }
        
        // Split on space-dash-space (the description separator)
        const parts = moveText.split(' - ');
        return parts[0].trim();
    }
    
    /**
     * Get all valid spaces in the game
     * @returns {Set} Set of all valid space names
     */
    getAllValidSpaces() {
        if (this.cache.allValidSpaces.size > 0) {
            return this.cache.allValidSpaces;
        }
        
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
    
    /**
     * Enhanced method to get available moves from a space
     * @param {string} spaceName - Name of space to get moves from
     * @returns {Array} Available moves
     */
    getAvailableMovesForSpace(spaceName) {
        if (!this.isReady() || !spaceName) {
            console.log('GameDataManager not ready or invalid space name');
            return [];
        }
        
        // Check cache first for performance
        if (this.cache.availableMoves.has(spaceName)) {
            const cachedMoves = this.cache.availableMoves.get(spaceName);
            if (cachedMoves && cachedMoves.length > 0) {
                return [...cachedMoves];
            }
        }
    
        try {
            console.log(`\n=== Getting moves for space: ${spaceName} ===`);
            
            // Get space data
            const spaceData = this.getSpaceData(spaceName);
            if (!spaceData) {
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
    
            // Step 2: Get moves from the processed data
            const moves = [];
            
            // Add next space if it exists
            if (spaceData.nextSpace) {
                moves.push(spaceData.nextSpace);
            }
            
            // Add moves from nextSpaces array (from Space 1-5 columns)
            if (spaceData.nextSpaces && spaceData.nextSpaces.length > 0) {
                spaceData.nextSpaces.forEach(move => {
                    if (!moves.includes(move)) {
                        moves.push(move);
                    }
                });
            }
            
            // Add branch paths
            if (spaceData.branchPathsArray && spaceData.branchPathsArray.length > 0) {
                spaceData.branchPathsArray.forEach(path => {
                    if (!moves.includes(path)) {
                        moves.push(path);
                    }
                });
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
    
            return [...new Set(moves)];
    
        } catch (error) {
            console.error('Error getting available moves:', error);
            return [];
        }
    }
    
    /**
     * Check if dice roll is required for a space and visit type
     * @param {string} spaceName - Name of the space
     * @param {string} visitType - Visit type (First, Subsequent, etc.)
     * @returns {boolean} Whether dice roll is required
     */
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

    /**
     * Enhanced method to get space data
     * @param {string} spaceName - Name of the space to get data for
     * @returns {Object|null} Space data or null if not found
     */
    getSpaceData(spaceName) {
        console.log('getSpaceData called:');
        console.log('- Requested space:', spaceName);
        console.log('- Data Map has spaces:', this.data.has('spaces'));

        if (!spaceName) {
            console.error('getSpaceData: No space name provided');
            return null;
        }
    
        // Check cache first
        if (this.cache.spacesByName.has(spaceName)) {
            return this.cache.spacesByName.get(spaceName);
        }
    
        // Ensure data is loaded
        if (!this.data || !this.data.has('spaces')) {
            console.error('getSpaceData: No spaces data available');
            return null;
        }
    
        const spaces = this.data.get('spaces');
        console.log('- Total spaces in data:', spaces?.length);
        console.log('- Space names containing OWNER:', spaces?.filter(s => s['Space Name']?.includes('OWNER'))?.map(s => s['Space Name'])); 
        const spaceData = spaces.find(space => space['Space Name'] === spaceName);
        console.log('- Found matching space:', !!spaceData);
    
        if (!spaceData) {
            console.error(`getSpaceData: No data found for space "${spaceName}"`);
            return null;
        }
        
        // For backward compatibility, return an array-wrapped object
        console.log('Space data debug:');
        console.log('- Space data:', spaceData);
        return spaceData;
    }
    
    /**
     * Enhanced: Get dice roll outcome for a specific space and roll value
     * @param {string} spaceName - Name of the space
     * @param {number} dieRoll - Dice roll value (1-6)
     * @returns {string|null} Outcome or null if not found
     */
    getDiceOutcome(spaceName, dieRoll) {
        if (!this.isReady() || !spaceName || !dieRoll) {
            return null;
        }
        
        try {
            // Get dice roll data for this space
            const diceRollData = this.data.get('diceRoll');
            if (!diceRollData) {
                return null;
            }
            
            // Get the current game state to determine visit type
            const progressState = window.GameSaveManager?.load('progressState');
            const visitHistory = window.GameSaveManager?.load('visitHistory') || {};
            
            // Determine if this is first or subsequent visit
            const visitType = visitHistory[spaceName] ? 'Subsequent' : 'First';
            
            // Find matching dice roll entry
            const rollEntry = diceRollData.find(roll => 
                roll['Space Name'] === spaceName && 
                roll['Visit Type'] === visitType && 
                roll['Die Roll'] !== 'Time outcomes' && // Skip non-movement outcomes
                roll['Die Roll'] !== 'Quality' &&
                roll['Die Roll'] !== 'Multiplier' &&
                roll['Die Roll'] !== 'Fee Paid'
            );
            
            if (!rollEntry) {
                return null;
            }
            
            // Get outcome for this die roll
            const outcome = rollEntry[dieRoll];
            if (!outcome) {
                return null;
            }
            
            // Parse the outcome to extract the destination space
            if (outcome.includes('-')) {
                // Format is typically "DESTINATION - Description"
                const parts = outcome.split('-');
                if (parts.length >= 1) {
                    return this.cleanMoveText(parts[0]);
                }
            }
            
            return outcome;
            
        } catch (error) {
            console.error('Error getting dice outcome:', error);
            return null;
        }
    }

    /**
     * Check if a space is a decision point (multiple available moves)
     * @param {string} spaceName - Name of the space
     * @returns {boolean} Whether the space is a decision point
     */
    isDecisionPoint(spaceName) {
        // A space is a decision point if it has multiple valid next spaces
        const availableMoves = this.getAvailableMovesForSpace(spaceName);
        return availableMoves.length > 1;
    }

    /**
     * Check if manager is ready for use
     * @returns {boolean} Ready status
     */
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

    /**
     * Enhanced: Validate if a move from one space to another is valid
     * @param {string} fromSpace - Starting space name
     * @param {string} toSpace - Destination space name
     * @returns {boolean} Whether the move is valid
     */
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
    
    /**
     * Check if player satisfies the action requirements for a space
     * @param {string} spaceName - Name of the space
     * @param {Object} playerState - Current player state
     * @returns {boolean} Whether the player satisfies the requirements
     */
    checkActionRequirements(spaceName, playerState) {
        const spaceData = this.getSpaceData(spaceName);
        
        if (!spaceData || !spaceData.actionRequirements || spaceData.actionRequirements.length === 0) {
            return true;
        }
        
        // Check each requirement
        return spaceData.actionRequirements.every(req => {
            // Check card requirements
            if (req.wCard && (!playerState.cards || !playerState.cards.includes(req.wCard))) {
                return false;
            }
            if (req.bCard && (!playerState.cards || !playerState.cards.includes(req.bCard))) {
                return false;
            }
            if (req.iCard && (!playerState.cards || !playerState.cards.includes(req.iCard))) {
                return false;
            }
            if (req.lCard && (!playerState.cards || !playerState.cards.includes(req.lCard))) {
                return false;
            }
            if (req.eCard && (!playerState.cards || !playerState.cards.includes(req.eCard))) {
                return false;
            }
            
            // Check money requirement
            if (req.fee) {
                const requiredFee = parseFloat(req.fee);
                if (!isNaN(requiredFee) && playerState.money < requiredFee) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Get action requirements for a space
     * @param {string} spaceName - Name of the space
     * @returns {Array} Action requirements or empty array
     */
    getActionRequirements(spaceName) {
        const spaceData = this.getSpaceData(spaceName);
        return spaceData?.actionRequirements || [];
    }
    
    /**
     * Check if a space has negotiation option
     * @param {string} spaceName - Name of the space
     * @returns {boolean} Whether negotiation is possible
     */
    canNegotiate(spaceName) {
        const spaceData = this.getSpaceData(spaceName);
        return spaceData?.canNegotiate || false;
    }
    
    /**
     * Get the main path of the game
     * @returns {Array} Main path space names
     */
    getMainPath() {
        return this.cache.mainPath;
    }
    
    /**
     * Check if a space is on the main path
     * @param {string} spaceName - Name of the space
     * @returns {boolean} Whether the space is on the main path
     */
    isOnMainPath(spaceName) {
        return this.cache.mainPath.includes(spaceName);
    }
    
    /**
     * Find the phase for a space
     * @param {string} spaceName - Name of the space
     * @returns {string} Phase name
     */
    getPhaseForSpace(spaceName) {
        const spaceData = this.getSpaceData(spaceName);
        return spaceData?.['Phase'] || 'UNKNOWN';
    }
}

// Keep the global GameDataManager instance intact but replace its prototype
// This preserves any existing state but adds the enhanced functionality
try {
    const enhancedManager = new GameDataManager();
    
    // Only replace if the window instance exists
    if (window.GameDataManager) {
        // Copy properties from original instance to preserve state
        Object.keys(window.GameDataManager).forEach(key => {
            if (key !== 'prototype' && typeof window.GameDataManager[key] !== 'function') {
                enhancedManager[key] = window.GameDataManager[key];
            }
        });
        
        // Replace the global instance
        window.GameDataManager = enhancedManager;
        console.log('Enhanced GameDataManager installed successfully');
    } else {
        window.GameDataManager = enhancedManager;
        console.log('New GameDataManager created');
    }
} catch (error) {
    console.error('Failed to enhance GameDataManager:', error);
}