// LoadingScreen.js
const LoadingScreen = () => {
    return React.createElement('div', { className: 'loading-screen' }, [
        React.createElement('div', { 
            key: 'spinner',
            className: 'loading-spinner' 
        }),
        React.createElement('h2', { key: 'title' }, 'Loading Game...'),
        React.createElement('p', { key: 'message' }, 'Please wait while we set up the board.')
    ]);
};

// Make LoadingScreen available globally
window.LoadingScreen = LoadingScreen;