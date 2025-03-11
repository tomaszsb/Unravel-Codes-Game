/**
 * Test script for the Enhanced GameDataManager
 * 
 * This file tests the new capabilities of the enhanced GameDataManager implementation.
 * Run this in your browser console to verify the enhanced functionality.
 */

// Helper function to format output
function formatOutput(label, data) {
    console.log(`\n--- ${label} ---`);
    console.log(data);
}

// Core testing function
async function testEnhancedGameDataManager() {
    console.log('=== Testing Enhanced GameDataManager ===');
    
    // Check if the original GameDataManager is already initialized
    const isInitialized = window.GameDataManager && window.GameDataManager.isInitialized;
    
    // If not initialized, initialize it
    if (!isInitialized) {
        console.log('Initializing GameDataManager...');
        await window.GameDataManager.initialize();
    } else {
        console.log('GameDataManager is already initialized');
    }
    
    // Test 1: Complete Integration of Spaces Info CSV Columns
    await testSpaceInfoColumns();
    
    // Test 2: Improved Branch Path Handling
    await testBranchPathHandling();
    
    // Test 3: Cross-Validation Between CSVs
    await testCrossValidation();
    
    // Test 4: Action Requirements Handling
    await testActionRequirements();
    
    console.log('\n=== All tests completed ===');
}

// Test 1: Complete Integration of Spaces Info CSV Columns
async function testSpaceInfoColumns() {
    formatOutput('Testing Complete Integration of Spaces Info CSV Columns', '');
    
    // Test a few key spaces to verify all columns are processed
    const testSpaces = ['OWNER-SCOPE-INITIATION', 'ARCH-INITIATION', 'CON-INITIATION', 'FINISH'];
    
    for (const spaceName of testSpaces) {
        const spaceData = window.GameDataManager.getSpaceData(spaceName);
        if (spaceData) {
            formatOutput(`Space Data for ${spaceName}`, {
                name: spaceData['Space Name'],
                phase: spaceData['Phase'],
                visitType: spaceData['Visit Type'],
                event: spaceData['Event']?.substring(0, 50) + '...',
                action: spaceData['Action']?.substring(0, 50) + '...',
                nextSpaces: spaceData.nextSpaces,
                canNegotiate: spaceData.canNegotiate
            });
        } else {
            console.error(`Space ${spaceName} not found`);
        }
    }
}

// Test 2: Improved Branch Path Handling
async function testBranchPathHandling() {
    formatOutput('Testing Improved Branch Path Handling', '');
    
    // Get some spaces with multiple paths
    const testSpaces = ['PM-DECISION-CHECK', 'LEND-SCOPE-CHECK', 'CHEAT-BYPASS'];
    
    for (const spaceName of testSpaces) {
        const availableMoves = window.GameDataManager.getAvailableMovesForSpace(spaceName);
        formatOutput(`Available Moves from ${spaceName}`, availableMoves);
    }
    
    // Test if a space is on main path
    const mainPathTest = 'OWNER-SCOPE-INITIATION';
    const isOnMainPath = window.GameDataManager.isOnMainPath(mainPathTest);
    formatOutput(`Is ${mainPathTest} on main path?`, isOnMainPath);
    
    // Get the main path
    const mainPath = window.GameDataManager.getMainPath();
    formatOutput('Main Path (first 5 spaces)', mainPath.slice(0, 5));
    
    // Test move validation
    const validMoveTests = [
        { from: 'PM-DECISION-CHECK', to: 'LEND-SCOPE-CHECK' },
        { from: 'PM-DECISION-CHECK', to: 'ARCH-INITIATION' },
        { from: 'PM-DECISION-CHECK', to: 'FINISH' } // Should be invalid
    ];
    
    for (const test of validMoveTests) {
        const isValid = window.GameDataManager.validateMoveSequence(test.from, test.to);
        formatOutput(`Is move from ${test.from} to ${test.to} valid?`, isValid);
    }
}

// Test 3: Cross-Validation Between CSVs
async function testCrossValidation() {
    formatOutput('Testing Cross-Validation Between CSVs', '');
    
    // Run cross-validation
    const validationResult = window.GameDataManager.crossValidateData();
    formatOutput('Cross-validation result', validationResult);
    
    // Test dice roll data retrieval
    const testSpaces = ['OWNER-SCOPE-INITIATION', 'CHEAT-BYPASS', 'CON-INITIATION'];
    
    for (const spaceName of testSpaces) {
        const diceRequired = window.GameDataManager.isDiceRollRequired(spaceName, 'First');
        formatOutput(`Is dice roll required for ${spaceName} (First visit)?`, diceRequired);
        
        // Test outcome for roll of 3
        const outcome = window.GameDataManager.getDiceOutcome(spaceName, 3);
        formatOutput(`Outcome for ${spaceName} with roll of 3`, outcome);
    }
}

// Test 4: Action Requirements Handling
async function testActionRequirements() {
    formatOutput('Testing Action Requirements Handling', '');
    
    // Test spaces with various requirements
    const testSpaces = ['OWNER-SCOPE-INITIATION', 'OWNER-FUND-INITIATION', 'ARCH-FEE-REVIEW'];
    
    for (const spaceName of testSpaces) {
        const requirements = window.GameDataManager.getActionRequirements(spaceName);
        formatOutput(`Requirements for ${spaceName}`, requirements);
    }
    
    // Test requirement checking with sample player states
    const samplePlayerStates = [
        { money: 1000, cards: ['W1', 'B1'] },
        { money: 5000, cards: ['W3', 'I2', 'E1'] },
        { money: 100, cards: [] }
    ];
    
    const testSpace = 'ARCH-FEE-REVIEW';
    for (const [index, state] of samplePlayerStates.entries()) {
        const satisfies = window.GameDataManager.checkActionRequirements(testSpace, state);
        formatOutput(`Does player state ${index + 1} satisfy requirements for ${testSpace}?`, {
            satisfies,
            state
        });
    }
    
    // Test negotiation
    const canNegotiate = window.GameDataManager.canNegotiate('OWNER-SCOPE-INITIATION');
    formatOutput('Can negotiate at OWNER-SCOPE-INITIATION?', canNegotiate);
}

// Run tests
console.log('Run testEnhancedGameDataManager() to start tests');
