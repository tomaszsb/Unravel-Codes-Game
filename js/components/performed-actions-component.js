// performed-actions-component.js
const PerformedActionsArea = () => {
  const [tempState, setTempState] = React.useState(null);
  const [currentPlayer, setCurrentPlayer] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const loadInitialState = async () => {
      try {
        // Get current player
        const player = window.GamePlayerManager.getCurrentPlayer();
        if (!player) {
          throw new Error('No current player found');
        }

        // Get temporary state
        const state = window.PlayerProgressManager.getTemporaryState(player.name);
        
        if (mounted) {
          setCurrentPlayer(player);
          setTempState(state);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading temporary state:', err);
        if (mounted) {
          setError(err.message);
        }
      }
    };

    // Subscribe to both player changes and temporary state updates
    const handleUpdate = (state, error) => {
      if (!mounted) return;

      if (error) {
        setError(error.message);
        return;
      }

      // Handle temporary state updates
      if (state?.type === 'temporaryStateUpdate') {
        setTempState(window.PlayerProgressManager.getTemporaryState(state.playerName));
      } else if (state?.type === 'temporaryStateCleared') {
        setTempState(null);
      }
    };

    const handlePlayerChange = (player) => {
      if (!mounted) return;
      setCurrentPlayer(player);
      // Load new player's temporary state
      if (player) {
        setTempState(window.PlayerProgressManager.getTemporaryState(player.name));
      }
    };

    // Initial load
    loadInitialState();

    // Subscribe to updates
    window.PlayerProgressManager.subscribe(handleUpdate);
    window.GamePlayerManager.subscribe(handlePlayerChange);

    return () => {
      mounted = false;
      window.PlayerProgressManager.unsubscribe(handleUpdate);
      window.GamePlayerManager.unsubscribe(handlePlayerChange);
    };
  }, []);

  const formatResourceChange = (value, type) => {
    if (type === 'money') {
      return `${value >= 0 ? '+' : ''}${value}$`;
    }
    if (type === 'time') {
      return `${value >= 0 ? '+' : ''}${value} days`;
    }
    return value;
  };

  // Error state
  if (error) {
    return React.createElement('div', {
      className: 'p-4 bg-red-50 text-red-700 rounded'
    }, React.createElement('p', { className: 'font-medium' }, error));
  }

  // No temporary state
  if (!tempState) {
    return React.createElement('div', {
      className: 'p-4 bg-gray-50 text-gray-600 rounded'
    }, React.createElement('p', null, 'No pending changes'));
  }

  return React.createElement('div', { className: 'space-y-4' },
    // Dice Rolls
    tempState.diceRolls?.rolls?.length > 0 && React.createElement('div', {
      className: 'p-3 bg-blue-50 rounded'
    }, [
      React.createElement('h4', {
        key: 'rolls-title',
        className: 'font-medium mb-2'
      }, 'Dice Rolls'),
      React.createElement('div', {
        key: 'rolls-list',
        className: 'space-y-1'
      }, tempState.diceRolls.rolls.map((roll, index) =>
        React.createElement('div', {
          key: `roll-${index}`,
          className: 'flex justify-between'
        }, [
          React.createElement('span', null, `Roll ${index + 1}:`),
          React.createElement('span', { className: 'font-medium' }, roll)
        ])
      ))
    ]),

    // Resource Changes
    (tempState.resources.money !== 0 || tempState.resources.time !== 0) && 
    React.createElement('div', {
      className: 'p-3 bg-green-50 rounded'
    }, [
      React.createElement('h4', {
        key: 'resources-title',
        className: 'font-medium mb-2'
      }, 'Resource Changes'),
      tempState.resources.money !== 0 && React.createElement('div', {
        key: 'money',
        className: 'flex justify-between'
      }, [
        React.createElement('span', null, 'Money:'),
        React.createElement('span', {
          className: tempState.resources.money >= 0 ? 'text-green-600' : 'text-red-600'
        }, formatResourceChange(tempState.resources.money, 'money'))
      ]),
      tempState.resources.time !== 0 && React.createElement('div', {
        key: 'time',
        className: 'flex justify-between'
      }, [
        React.createElement('span', null, 'Time:'),
        React.createElement('span', {
          className: tempState.resources.time >= 0 ? 'text-green-600' : 'text-red-600'
        }, formatResourceChange(tempState.resources.time, 'time'))
      ])
    ]),

    // Card Changes
    (tempState.cards.added.length > 0 || tempState.cards.removed.length > 0) &&
    React.createElement('div', {
      className: 'p-3 bg-yellow-50 rounded'
    }, [
      React.createElement('h4', {
        key: 'cards-title',
        className: 'font-medium mb-2'
      }, 'Card Changes'),
      tempState.cards.added.length > 0 && React.createElement('div', {
        key: 'added-cards',
        className: 'mb-2'
      }, [
        React.createElement('div', { className: 'text-sm text-gray-600' }, 'Added:'),
        React.createElement('div', { className: 'flex flex-wrap gap-1' },
          tempState.cards.added.map((card, index) =>
            React.createElement('span', {
              key: `added-${index}`,
              className: 'px-2 py-1 bg-green-100 text-green-800 rounded text-sm'
            }, card)
          )
        )
      ]),
      tempState.cards.removed.length > 0 && React.createElement('div', {
        key: 'removed-cards'
      }, [
        React.createElement('div', { className: 'text-sm text-gray-600' }, 'Removed:'),
        React.createElement('div', { className: 'flex flex-wrap gap-1' },
          tempState.cards.removed.map((card, index) =>
            React.createElement('span', {
              key: `removed-${index}`,
              className: 'px-2 py-1 bg-red-100 text-red-800 rounded text-sm'
            }, card)
          )
        )
      ])
    ])
  );
};

// Make component globally available
window.PerformedActions = PerformedActionsArea;