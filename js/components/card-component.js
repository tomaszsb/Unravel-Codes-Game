/**
 * Card Component - Displays and manages player cards
 * 
 * This component handles:
 * - Displaying card information
 * - Card interactions (playing, discarding)
 * - Card collection visualization
 */
class CardComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            playerCards: null,
            selectedCard: null,
            selectedType: 'B', // Default to B-cards
            isDetailModalOpen: false,
            isLoading: true,
            error: null
        };
    }

    componentDidMount() {
        this.loadCards();
        
        // Subscribe to SaveManager to update when cards change
        this.unsubscribe = window.GameSaveManager.subscribe((type) => {
            if (type === 'playerCards' || type === 'cardHistory') {
                this.loadCards();
            }
        });
    }

    componentDidUpdate(prevProps) {
        // Reload cards if player changes
        if (prevProps.playerName !== this.props.playerName) {
            this.loadCards();
        }
    }

    componentWillUnmount() {
        // Unsubscribe from SaveManager
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    loadCards() {
        try {
            const { playerName } = this.props;
            if (!playerName) {
                this.setState({ 
                    isLoading: false, 
                    error: 'No player selected' 
                });
                return;
            }

            // Load player cards
            const playerCards = window.GameSaveManager.getPlayerCards(playerName);
            this.setState({ 
                playerCards, 
                isLoading: false,
                error: null 
            });
        } catch (error) {
            console.error('Error loading cards:', error);
            this.setState({ 
                isLoading: false, 
                error: 'Failed to load cards' 
            });
        }
    }

    handleCardSelect(card) {
        this.setState({ selectedCard: card, isDetailModalOpen: true });
    }

    handleTypeSelect(type) {
        this.setState({ selectedType: type });
    }

    async handlePlayCard() {
        const { selectedCard } = this.state;
        const { playerName } = this.props;

        if (!selectedCard || !playerName) return;

        try {
            this.setState({ isLoading: true });
            const success = await window.GamePlayerManager.playCard(playerName, selectedCard);
            
            if (success) {
                this.setState({ 
                    selectedCard: null, 
                    isDetailModalOpen: false,
                    isLoading: false 
                });
            } else {
                this.setState({ 
                    error: 'Failed to play card',
                    isLoading: false 
                });
            }
        } catch (error) {
            console.error('Error playing card:', error);
            this.setState({ 
                error: 'Error playing card',
                isLoading: false 
            });
        }
    }

    async handleDiscardCard() {
        const { selectedCard } = this.state;
        const { playerName } = this.props;

        if (!selectedCard || !playerName) return;

        try {
            this.setState({ isLoading: true });
            const success = await window.GamePlayerManager.discardCard(playerName, selectedCard);
            
            if (success) {
                this.setState({ 
                    selectedCard: null, 
                    isDetailModalOpen: false,
                    isLoading: false 
                });
            } else {
                this.setState({ 
                    error: 'Failed to discard card',
                    isLoading: false 
                });
            }
        } catch (error) {
            console.error('Error discarding card:', error);
            this.setState({ 
                error: 'Error discarding card',
                isLoading: false 
            });
        }
    }

    closeDetailModal() {
        this.setState({ isDetailModalOpen: false, selectedCard: null });
    }

    renderCardTypeSelector() {
        const { selectedType } = this.state;
        const cardTypes = [
            { type: 'B', label: 'Bank' },
            { type: 'I', label: 'Investment' },
            { type: 'W', label: 'Work' },
            { type: 'L', label: 'Life' },
            { type: 'E', label: 'Expert' }
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

    renderCardList() {
        const { playerCards, selectedType, isLoading } = this.state;
        
        if (isLoading) {
            return <div className="loading">Loading cards...</div>;
        }

        if (!playerCards) {
            return <div className="no-cards">No cards available</div>;
        }

        const cards = playerCards[selectedType] || [];

        if (cards.length === 0) {
            return <div className="empty-collection">No {selectedType} cards in collection</div>;
        }

        return (
            <div className="card-list">
                {cards.map(card => this.renderCard(card))}
            </div>
        );
    }

    renderCard(card) {
        // Get card style based on type
        const cardStyle = this.getCardStyle(card.type);

        return (
            <div 
                key={card.id}
                className="game-card"
                style={cardStyle}
                onClick={() => this.handleCardSelect(card)}
            >
                <div className="card-header">
                    <div className="card-type">{card.type}</div>
                    {card.Amount && <div className="card-amount">${this.formatNumber(card.Amount)}</div>}
                </div>
                <div className="card-content">
                    {card.Color && <div className="card-color" style={{ backgroundColor: this.getColorCode(card.Color) }}></div>}
                    {card['Card Name'] && <div className="card-name">{card['Card Name']}</div>}
                    {card.Effect && <div className="card-effect">{this.truncateText(card.Effect, 30)}</div>}
                </div>
            </div>
        );
    }

    renderCardDetail() {
        const { selectedCard, isDetailModalOpen } = this.state;

        if (!selectedCard || !isDetailModalOpen) {
            return null;
        }

        const cardStyle = this.getCardStyle(selectedCard.type);

        return (
            <div className="card-detail-modal">
                <div className="modal-overlay" onClick={() => this.closeDetailModal()}></div>
                <div className="modal-content" style={cardStyle}>
                    <div className="modal-header">
                        <h3>{selectedCard['Card Name'] || `${selectedCard.type} Card`}</h3>
                        <button className="close-button" onClick={() => this.closeDetailModal()}>×</button>
                    </div>
                    <div className="card-details">
                        {selectedCard.type === 'B' && (
                            <div className="detail-item">
                                <span className="label">Amount:</span>
                                <span className="value">${this.formatNumber(selectedCard.Amount)}</span>
                            </div>
                        )}
                        {selectedCard['Loan Percentage Cost'] && (
                            <div className="detail-item">
                                <span className="label">Interest Rate:</span>
                                <span className="value">{selectedCard['Loan Percentage Cost']}%</span>
                            </div>
                        )}
                        {selectedCard.Phase && (
                            <div className="detail-item">
                                <span className="label">Phase:</span>
                                <span className="value">{selectedCard.Phase}</span>
                            </div>
                        )}
                        {selectedCard.Color && (
                            <div className="detail-item">
                                <span className="label">Color:</span>
                                <span className="value">{selectedCard.Color}</span>
                            </div>
                        )}
                        {selectedCard.Effect && (
                            <div className="detail-item">
                                <span className="label">Effect:</span>
                                <span className="value">{selectedCard.Effect}</span>
                            </div>
                        )}
                        {selectedCard['Flavor Text'] && (
                            <div className="detail-item flavor-text">
                                <em>{selectedCard['Flavor Text']}</em>
                            </div>
                        )}
                    </div>
                    <div className="card-actions">
                        <button 
                            className="play-button"
                            onClick={() => this.handlePlayCard()}
                        >
                            Play Card
                        </button>
                        <button 
                            className="discard-button"
                            onClick={() => this.handleDiscardCard()}
                        >
                            Discard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    render() {
        const { error } = this.state;

        return (
            <div className="card-component">
                <h2>Cards</h2>
                {error && <div className="error-message">{error}</div>}
                {this.renderCardTypeSelector()}
                {this.renderCardList()}
                {this.renderCardDetail()}
            </div>
        );
    }

    // Helper methods
    formatNumber(num) {
        return num ? num.toLocaleString() : '';
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
window.CardComponent = CardComponent;