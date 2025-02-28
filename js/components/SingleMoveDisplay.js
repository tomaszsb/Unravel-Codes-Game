// Component to display a single move when no choice is available
const SingleMoveDisplay = ({ move }) => {
    if (!move) {
        console.log('SingleMoveDisplay: No move provided');
        return React.createElement('div', null, 'No move available');
    }
    
    console.log('SingleMoveDisplay rendering for move:', move);
    
    // Get move details
    const spaceData = window.GameDataManager?.getSpaceData?.(move);
    const moveData = spaceData ? spaceData[0] : null;
    
    return React.createElement('div', {
        className: 'single-move-display'
    }, [
        React.createElement('h3', {
            key: 'title',
            className: 'text-lg font-bold'
        }, '🎯 Next Move'),
        React.createElement('div', {
            key: 'move-info',
            className: 'move-info-box'
        }, [
            React.createElement('div', {
                key: 'name',
                className: 'text-xl font-semibold'
            }, move),
            moveData && [
                React.createElement('div', {
                    key: 'phase',
                    className: 'text-sm text-gray-600'
                }, `Phase: ${moveData.Phase || 'N/A'}`),
                moveData.Description && React.createElement('p', {
                    key: 'description',
                    className: 'mt-2 text-base'
                }, moveData.Description)
            ]
        ])
    ]);
};

// Use the enhanced registration method if available
if (typeof window.registerComponent === 'function') {
    window.registerComponent('SingleMoveDisplay', SingleMoveDisplay);
} else {
    // Fall back to traditional method
    window.SingleMoveDisplay = SingleMoveDisplay;
}

// Set flag for easy verification
window.SINGLEMOVE_DISPLAY_LOADED = true;
console.log('SingleMoveDisplay component registered in window object');
