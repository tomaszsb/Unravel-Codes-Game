/**
 * CardManagementComponent - Master container for card-related UI
 * 
 * This component integrates all card-related functionality:
 * - Card collection (viewing cards)
 * - Card drawing
 * - Card playing/discarding
 * - Card effects and requirements
 */
class CardManagementComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'collection', // 'collection' or 'draw'
            isExpanded: false,
            error: null
        };
    }

    componentDidMount() {
        // Subscribe to state changes from SaveManager or GamePlayerManager
        this.unsubscribe = window.GameSaveManager.subscribe((type) => {
            if (type === 'playerCards' || type === 'cardHistory') {
                this.forceUpdate();
            }
        });
    }

    componentWillUnmount() {
        // Unsubscribe from state changes
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    handleTabChange(tab) {
        this.setState({ activeTab: tab });
    }

    toggleExpanded() {
        this.setState(prevState => ({ isExpanded: !prevState.isExpanded }));
    }

    renderCardCount() {
        const { playerName } = this.props;
        if (!playerName) return null;

        try {
            const playerCards = window.GameSaveManager.getPlayerCards(playerName);
            if (!playerCards) return null;

            // Count total cards
            let totalCards = 0;
            Object.values(playerCards).forEach(cards => {
                totalCards += cards.length;
            });

            // Count by type
            const counts = {
                B: playerCards.B?.length || 0,
                I: playerCards.I?.length || 0,
                W: playerCards.W?.length || 0,
                L: playerCards.L?.length || 0,
                E: playerCards.E?.length || 0
            };

            return (
                <div className="card-counts">
                    <div className="total-count">
                        <span className="count">{totalCards}</span>
                        <span className="label">Total Cards</span>
                    </div>
                    <div className="type-counts">
                        <div className="type-count B">
                            <span className="count">{counts.B}</span>
                            <span className="label">B</span>
                        </div>
                        <div className="type-count I">
                            <span className="count">{counts.I}</span>
                            <span className="label">I</span>
                        </div>
                        <div className="type-count W">
                            <span className="count">{counts.W}</span>
                            <span className="label">W</span>
                        </div>
                        <div className="type-count L">
                            <span className="count">{counts.L}</span>
                            <span className="label">L</span>
                        </div>
                        <div className="type-count E">
                            <span className="count">{counts.E}</span>
                            <span className="label">E</span>
                        </div>
                    </div>
                </div>
            );
        } catch (error) {
            console.error('Error rendering card count:', error);
            return null;
        }
    }

    renderTabs() {
        const { activeTab } = this.state;

        return (
            <div className="card-tabs">
                <button 
                    className={`tab-button ${activeTab === 'collection' ? 'active' : ''}`}
                    onClick={() => this.handleTabChange('collection')}
                >
                    My Cards
                </button>
                <button 
                    className={`tab-button ${activeTab === 'draw' ? 'active' : ''}`}
                    onClick={() => this.handleTabChange('draw')}
                >
                    Draw Cards
                </button>
            </div>
        );
    }

    renderTabContent() {
        const { activeTab } = this.state;
        const { playerName } = this.props;

        if (activeTab === 'collection') {
            return <window.CardComponent playerName={playerName} />;
        } else if (activeTab === 'draw') {
            return <window.CardDrawerComponent playerName={playerName} />;
        }

        return null;
    }

    render() {
        const { isExpanded, error } = this.state;
        const { playerName } = this.props;

        return (
            <div className={`card-management-component ${isExpanded ? 'expanded' : 'collapsed'}`}>
                <div className="card-component-header">
                    <h2>Cards</h2>
                    <button 
                        className="toggle-button"
                        onClick={() => this.toggleExpanded()}
                    >
                        {isExpanded ? '▼' : '▲'}
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                {!playerName ? (
                    <div className="error-message">No player selected</div>
                ) : (
                    <>
                        {this.renderCardCount()}
                        {isExpanded && (
                            <>
                                {this.renderTabs()}
                                {this.renderTabContent()}
                            </>
                        )}
                    </>
                )}
            </div>
        );
    }
}

// Export component
window.CardManagementComponent = CardManagementComponent;