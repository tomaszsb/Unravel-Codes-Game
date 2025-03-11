/**
 * CardDrawer Component - Allows players to draw cards
 * 
 * This component handles:
 * - Drawing cards of various types
 * - Displaying card draw animations
 * - Filtering cards by phase or other criteria
 */
class CardDrawerComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedType: 'B',
            isDrawing: false,
            drawnCard: null,
            showDrawnCard: false,
            error: null,
            filters: {
                phase: 'Any',
                distribution: 'Any'
            }
        };
    }

    componentDidMount() {
        // Initialize CardManager if needed
        if (window.GameCardManager && !window.GameCardManager.isReady()) {
            window.GameCardManager.initialize().catch(error => {
                console.error('Failed to initialize CardManager:', error);
                this.setState({ error: 'Card system initialization failed' });
            });
        }
    }

    handleTypeSelect(type) {
        this.setState({ selectedType: type });
    }

    async handleDrawCard() {
        const { selectedType, filters } = this.state;
        const { playerName } = this.props;

        if (!playerName) {
            this.setState({ error: 'No player selected' });
            return;
        }

        try {
            this.setState({ isDrawing: true, error: null });

            // Apply filters for draw options
            const options = {};
            
            if (filters.phase && filters.phase !== 'Any') {
                options.filters = { Phase: filters.phase };
            }
            
            if (selectedType === 'B' && filters.distribution && filters.distribution !== 'Any') {
                options.filters = { 
                    ...(options.filters || {}),
                    'Distribution Level': filters.distribution 
                };
            }

            // Draw card for player
            const card = await window.GamePlayerManager.drawCardForPlayer(playerName, selectedType, options);

            if (card) {
                // Show the drawn card with animation
                this.setState({ 
                    drawnCard: card,
                    showDrawnCard: true,
                    isDrawing: false 
                });

                // Hide the card after 3 seconds
                setTimeout(() => {
                    this.setState({ showDrawnCard: false });
                }, 3000);
            } else {
                this.setState({ 
                    error: `No ${selectedType} cards available`,
                    isDrawing: false 
                });
            }
        } catch (error) {
            console.error('Error drawing card:', error);
            this.setState({ 
                error: 'Error drawing card',
                isDrawing: false 
            });
        }
    }

    handleFilterChange(filterName, value) {
        this.setState(prevState => ({
            filters: {
                ...prevState.filters,
                [filterName]: value
            }
        }));
    }

    renderCardTypeSelector() {
        const { selectedType } = this.state;
        const cardTypes = [
            { type: 'B', label: 'Bank Loan' },
            { type: 'I', label: 'Investment' },
            { type: 'W', label: 'Work Scope' },
            { type: 'L', label: 'Life Event' },
            { type: 'E', label: 'Expert Help' }
        ];

        return (
            <div className="card-type-selector">
                {cardTypes.map(({ type, label }) => (
                    <button 
                        key={type}
                        className={`type-button ${selectedType === type ? 'active' : ''}`}
                        onClick={() => this.handleTypeSelect(type)}
                    >
                        {label}
                    </button>
                ))}
            </div>
        );
    }

    renderFilters() {
        const { selectedType, filters } = this.state;
        
        // Get current game phase
        let currentPhase = 'Unknown';
        try {
            const { playerName } = this.props;
            const progressState = window.GameSaveManager?.load('progressState');
            const position = progressState?.playerPositions?.[playerName];
            
            if (position && window.GameDataManager?.isReady()) {
                currentPhase = window.GameDataManager.getPhaseForSpace(position) || 'Unknown';
            }
        } catch (error) {
            console.error('Error getting current phase:', error);
        }

        return (
            <div className="card-filters">
                {/* Phase Filter - only applicable for certain card types */}
                {(selectedType === 'E' || selectedType === 'W') && (
                    <div className="filter-item">
                        <label>Phase:</label>
                        <select 
                            value={filters.phase || 'Any'}
                            onChange={(e) => this.handleFilterChange('phase', e.target.value)}
                        >
                            <option value="Any">Any Phase</option>
                            <option value="Owner">Owner</option>
                            <option value="Design">Design</option>
                            <option value="Funding">Funding</option>
                            <option value="Regulatory Review">Regulatory Review</option>
                            <option value="Construction">Construction</option>
                            {currentPhase !== 'Unknown' && (
                                <option value={currentPhase}>Current Phase ({currentPhase})</option>
                            )}
                        </select>
                    </div>
                )}

                {/* Distribution Level Filter - only for B cards */}
                {selectedType === 'B' && (
                    <div className="filter-item">
                        <label>Distribution:</label>
                        <select 
                            value={filters.distribution || 'Any'}
                            onChange={(e) => this.handleFilterChange('distribution', e.target.value)}
                        >
                            <option value="Any">Any Level</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                )}
            </div>
        );
    }

    renderDrawnCard() {
        const { drawnCard, showDrawnCard } = this.state;
        
        if (!drawnCard || !showDrawnCard) {
            return null;
        }

        const cardStyle = this.getCardStyle(drawnCard.type);

        return (
            <div className="drawn-card-container">
                <div className="drawn-card" style={cardStyle}>
                    <div className="card-header">
                        <div className="card-type">{drawnCard.type}</div>
                        {drawnCard.Amount && <div className="card-amount">${this.formatNumber(drawnCard.Amount)}</div>}
                    </div>
                    <div className="card-content">
                        {drawnCard.Color && <div className="card-color" style={{ backgroundColor: this.getColorCode(drawnCard.Color) }}></div>}
                        {drawnCard['Card Name'] && <div className="card-name">{drawnCard['Card Name']}</div>}
                        {drawnCard.Effect && <div className="card-effect">{drawnCard.Effect}</div>}
                    </div>
                </div>
                <div className="drawn-card-message">Card Added to Your Hand!</div>
            </div>
        );
    }

    render() {
        const { isDrawing, error } = this.state;
        const { playerName } = this.props;

        return (
            <div className="card-drawer-component">
                <h2>Draw Cards</h2>
                
                {!playerName && (
                    <div className="error-message">No player selected</div>
                )}
                
                {error && (
                    <div className="error-message">{error}</div>
                )}
                
                {this.renderCardTypeSelector()}
                {this.renderFilters()}
                
                <button 
                    className="draw-button"
                    onClick={() => this.handleDrawCard()}
                    disabled={isDrawing || !playerName}
                >
                    {isDrawing ? 'Drawing...' : 'Draw Card'}
                </button>
                
                {this.renderDrawnCard()}
            </div>
        );
    }

    // Helper methods
    formatNumber(num) {
        return num ? num.toLocaleString() : '';
    }

    getCardStyle(cardType) {
        // Define card styles based on type
        const styles = {
            'B': { backgroundColor: '#d4f0f0', borderColor: '#2a9d8f' }, // Green/Blue for Bank
            'I': { backgroundColor: '#fffceb', borderColor: '#e9c46a' }, // Yellow for Investment
            'W': { backgroundColor: '#e8f8e9', borderColor: '#1b9e3c' }, // Green for Work
            'L': { backgroundColor: '#ffede6', borderColor: '#e76f51' }, // Orange/Red for Life
            'E': { backgroundColor: '#e6e6ff', borderColor: '#4a4ae8' }  // Blue for Expert
        };

        return styles[cardType] || {};
    }

    getColorCode(color) {
        // Map color names to CSS color codes
        const colorMap = {
            'Red': '#e63946',
            'Green': '#2a9d8f',
            'Yellow': '#e9c46a',
            'Blue': '#457b9d',
            'Purple': '#9c6197',
            'All Colors': 'linear-gradient(to right, #e63946, #2a9d8f, #e9c46a, #457b9d, #9c6197)'
        };

        return colorMap[color] || '#cccccc';
    }
}

// Export component
window.CardDrawerComponent = CardDrawerComponent;