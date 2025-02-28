// ErrorScreen.js
const ErrorScreen = ({ error }) => {
    return React.createElement('div', { className: 'error-screen' }, [
        React.createElement('h2', { key: 'title' }, 'Error'),
        React.createElement('p', { 
            key: 'message',
            className: 'error-message' 
        }, error),
        React.createElement('div', { 
            key: 'actions',
            className: 'error-actions' 
        }, [
            React.createElement('button', { 
                key: 'retry',
                onClick: () => window.location.reload(),
                className: 'retry-button'
            }, 'Retry'),
            React.createElement('button', { 
                key: 'setup',
                onClick: () => window.location.href = 'player-setup.html',
                className: 'setup-button'
            }, 'Return to Setup')
        ])
    ]);
};

// Make ErrorScreen available globally
window.ErrorScreen = ErrorScreen;