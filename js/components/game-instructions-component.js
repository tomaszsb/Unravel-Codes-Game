// game-instructions-component.js
const GameInstructions = () => {
    const [instructions, setInstructions] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        let mounted = true;
        let debounceTimer;

        const loadInstructions = async () => {
            try {
                if (!mounted) return;
                
                setLoading(true);
                setError(null);

                // Get guide data
                const guideData = window.GameDataManager.getSpaceData('START - Quick play guide');
                
                if (guideData.length === 0) {
                    throw new Error('No instruction data found');
                }

                if (mounted) {
                    setInstructions(guideData);
                    setError(null);
                }
            } catch (err) {
                console.error('Failed to load instructions:', err);
                if (mounted) {
                    setError(err.message || 'Failed to load game instructions. Please try again.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Handle state updates with debouncing
        const handleStateUpdate = (type) => {
            if (!mounted) return;
            
            if (type === 'progressState' || type === 'players') {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(loadInstructions, 100);
            }
        };

        // Subscribe to state updates
        window.GameSaveManager?.subscribe(handleStateUpdate);
        
        // Initial load
        loadInstructions();

        // Cleanup
        return () => {
            mounted = false;
            window.GameSaveManager?.unsubscribe(handleStateUpdate);
            clearTimeout(debounceTimer);
        };
    }, []); // Empty dependency array

    // Helper to get instruction rows that should be displayed
    const getInstructionRows = (guideData) => {
        const categories = [
            { key: 'Event', title: 'Story Overview' },
            { key: 'Action', title: 'Required Actions' },
            { key: 'Outcome', title: 'Expected Outcomes' },
            { key: 'W Card', title: 'Work Cards' },
            { key: 'B Card', title: 'Bank Details' },
            { key: 'I Card', title: 'Investor Information' },
            { key: 'L card', title: 'Life Events' },
            { key: 'E Card', title: 'Expert Assistance' },
            { key: 'Time', title: 'Time Management' },
            { key: 'Fee', title: 'Fees and Costs' },
            { key: 'Negotiate', title: 'Can Negotiate?' }
        ];

        return categories.filter(cat => {
            const firstVisit = guideData.find(row => row['Visit Type'] === 'First');
            const subsequentVisit = guideData.find(row => row['Visit Type'] === 'Subsequent');
            return firstVisit?.[cat.key]?.trim() || subsequentVisit?.[cat.key]?.trim();
        });
    };

    // Loading state
    if (loading) {
        return React.createElement('div', { 
            className: 'p-4 text-center' 
        }, React.createElement('div', { 
            className: 'text-lg' 
        }, 'Loading instructions...'));
    }

    // Error state
    if (error) {
        return React.createElement('div', { 
            className: 'p-4 bg-red-50 text-red-700 rounded' 
        }, React.createElement('p', null, error));
    }

    // No data state
    if (!instructions || instructions.length === 0) {
        return React.createElement('div', { 
            className: 'p-4 bg-yellow-50 text-yellow-700 rounded' 
        }, React.createElement('p', null, 'No instructions available'));
    }

    const firstVisit = instructions.find(row => row['Visit Type'] === 'First');
    const subsequentVisit = instructions.find(row => row['Visit Type'] === 'Subsequent');
    const rows = getInstructionRows(instructions);

    return React.createElement('div', { className: 'max-w-6xl mx-auto p-4' },
        React.createElement('div', { className: 'bg-white rounded-lg shadow-sm overflow-hidden' },
            React.createElement('div', { className: 'p-4 overflow-x-auto' },
                React.createElement('table', { className: 'w-full border-collapse' },
                    // Table Header
                    React.createElement('thead', { className: 'bg-gray-50' },
                        React.createElement('tr', null,
                            React.createElement('th', { className: 'p-3 text-left font-semibold border' }, 'Category'),
                            React.createElement('th', { className: 'p-3 text-left font-semibold border' }, 'First Visit'),
                            React.createElement('th', { className: 'p-3 text-left font-semibold border' }, 'Subsequent Visits')
                        )
                    ),
                    // Table Body
                    React.createElement('tbody', null,
                        rows.map((row, index) => 
                            React.createElement('tr', { 
                                key: index,
                                className: index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                            },
                                React.createElement('td', { className: 'p-3 border font-medium w-1/4' }, row.title),
                                React.createElement('td', { className: 'p-3 border w-2/5' }, firstVisit[row.key] || 'N/A'),
                                React.createElement('td', { className: 'p-3 border w-2/5' }, subsequentVisit[row.key] || 'N/A')
                            )
                        )
                    )
                )
            )
        )
    );
};

// Make the component globally available
window.GameInstructions = GameInstructions;