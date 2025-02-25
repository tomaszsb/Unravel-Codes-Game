// move-selection-component.js
const MoveSelection = ({ moves = [], onSelect, selectedMove }) => {
    console.log('MoveSelection rendering with moves:', moves);

    if (!Array.isArray(moves) || moves.length === 0) {
        console.log('No moves available for selection');
        return null;
    }

    // Get move descriptions from CSV data
    const getMoveDescription = (move) => {
        try {
            const spaceData = window.GameDataManager?.getSpaceData(move);
            if (spaceData?.[0]?.['Event']) {
                return spaceData[0]['Event'];
            }
            if (spaceData?.[0]?.['Action']) {
                return spaceData[0]['Action'];
            }
            return move;
        } catch (error) {
            console.error('Error getting move description:', error);
            return move;
        }
    };

    // Create main container
    return React.createElement('div', {
        className: "w-full"
    }, [
        // Title matching game UI
        React.createElement('h3', {
            key: 'title',
            className: "text-lg font-bold mb-2"
        }, "🎯 Available Moves"),
        
        // Radio group
        React.createElement('div', {
            key: 'radio-group',
            role: 'radiogroup',
            className: "space-y-2"
        }, moves.map((move) => {
            const description = getMoveDescription(move);
            const isSelected = selectedMove === move;
            
            return React.createElement('label', {
                key: move,
                className: "flex items-center p-2 rounded cursor-pointer hover:bg-gray-50"
            }, [
                // Radio input
                React.createElement('input', {
                    type: 'radio',
                    name: "path-choice",
                    value: move,
                    checked: isSelected,
                    onChange: () => onSelect?.(move, false), // false indicates no immediate processing
                    className: "mr-3"
                }),
                
                // Move text and description
                React.createElement('div', {
                    className: "flex-grow"
                }, [
                    React.createElement('div', {
                        key: 'text',
                        className: "font-medium"
                    }, move),
                    React.createElement('div', {
                        key: 'description',
                        className: "text-sm text-gray-600"
                    }, description)
                ])
            ]);
        }))
    ]);
};

// Make component globally available
window.MoveSelection = MoveSelection;