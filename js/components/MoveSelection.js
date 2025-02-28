// MoveOption component
const MoveOption = ({ move, category, onSelect, isSelected }) => {
    // Get move details from GameDataManager if available
    const spaceData = window.GameDataManager?.getSpaceData?.(move) || [];
    const moveData = spaceData.length > 0 ? spaceData[0] : null;
    const categoryClass = category ? category.toLowerCase() : 'other';
    
    return React.createElement('div', {
        className: `move-option ${categoryClass} ${isSelected ? 'selected' : ''}`,
        onClick: () => onSelect(move)
    }, [
        React.createElement('div', {
            key: 'move-name',
            className: 'move-name'
        }, move),
        moveData && React.createElement('div', {
            key: 'move-info',
            className: 'move-info'
        }, [
            React.createElement('div', {
                key: 'move-type',
                className: 'move-type'
            }, moveData['Visit Type'] || 'Move'),
            moveData.Description && React.createElement('div', {
                key: 'move-description',
                className: 'move-description'
            }, moveData.Description)
        ])
    ]);
};

// MoveSelection component
const MoveSelection = ({ moves, onSelect, selectedMove }) => {
    console.log('MoveSelection rendering with moves:', moves);
    
    if (!moves || moves.length === 0) {
        return React.createElement('p', null, 'No moves available.');
    }
    
    // Move categorization
    const categories = {
        FINANCIAL: ['FUND', 'SCOPE'],
        ARCHITECTURE: ['ARCH'],
        REGULATORY: ['REG', 'DOB'],
        PLANNING: ['PLAN'],
        EXECUTION: ['EXEC', 'BUILD'],
        CLOSING: ['CLOSE', 'FINISH']
    };
    
    // Helper function to determine category for a move
    const getCategory = (move) => {
        for (const [category, prefixes] of Object.entries(categories)) {
            if (prefixes.some(prefix => move.startsWith(prefix))) {
                return category;
            }
        }
        return 'OTHER';
    };
    
    // Group moves by category
    const movesByCategory = {};
    
    moves.forEach(move => {
        const category = getCategory(move);
        if (!movesByCategory[category]) {
            movesByCategory[category] = [];
        }
        movesByCategory[category].push(move);
    });
    
    return React.createElement('div', {
        className: 'move-selection'
    },
        Object.entries(movesByCategory).map(([category, categoryMoves]) =>
            React.createElement('div', {
                key: category,
                className: 'move-category'
            }, [
                React.createElement('h4', { key: 'title' }, category),
                React.createElement('div', {
                    key: 'move-options',
                    className: 'move-options'
                },
                    categoryMoves.map(move =>
                        React.createElement(MoveOption, {
                            key: move,
                            move: move,
                            category: category,
                            onSelect: onSelect,
                            isSelected: selectedMove === move
                        })
                    )
                )
            ])
        )
    );
};

// Make components available globally using enhanced registration if available
if (typeof window.registerComponent === 'function') {
    window.registerComponent('MoveOption', MoveOption);
    window.registerComponent('MoveSelection', MoveSelection);
} else {
    // Fall back to traditional method
    window.MoveOption = MoveOption;
    window.MoveSelection = MoveSelection;
}

// Set flags for easy verification
window.MOVEOPTION_LOADED = true;
window.MOVESELECTION_LOADED = true;
console.log('MoveSelection and MoveOption components registered in window object');

// Add a more robust registration with Object.defineProperty
try {
    Object.defineProperty(window, 'MoveSelectionComponent', {
        value: MoveSelection,
        writable: false,
        configurable: false
    });
} catch (e) {
    console.warn('Could not use defineProperty for MoveSelection, using direct assignment');
}
