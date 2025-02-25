const PlayerStatus = () => {
    const [playerData, setPlayerData] = React.useState(null);
    const [currentPhase, setCurrentPhase] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [visitCount, setVisitCount] = React.useState(0);
    const [currentPosition, setCurrentPosition] = React.useState(null);
    const [resources, setResources] = React.useState({
      money: 0,
      time: 0,
      cards: []
    });
  
    React.useEffect(() => {
      let mounted = true;
      let debounceTimer;
  
      const loadPlayerData = async () => {
        try {
          setLoading(true);
          setError(null);
  
          if (!window.GameSaveManager || !window.GameDataManager || !window.GamePlayerManager) {
            throw new Error('Game systems not initialized');
          }
  
          if (!window.GameDataManager.isReady()) {
            await window.GameDataManager.waitUntilReady();
          }
  
          if (!window.GamePlayerManager.isReady()) {
            let attempts = 0;
            const maxAttempts = 50;
            while (!window.GamePlayerManager.isReady() && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
            }
            if (!window.GamePlayerManager.isReady()) {
              throw new Error('Player manager failed to initialize');
            }
          }
  
          const progressState = window.GameSaveManager.load('progressState');
          if (!progressState) {
            throw new Error('Unable to load game progress');
          }
  
          const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
          if (!currentPlayer) {
            throw new Error('Current player not found');
          }
  
          const position = progressState.playerPositions?.[currentPlayer.name];
          if (!position) {
            throw new Error('Player position not found');
          }
  
          const spaceData = window.GameDataManager.getSpaceData(position);
          if (!spaceData?.length) {
            throw new Error('Space data not found');
          }
  
          // Get visit history
          const visitHistory = window.GameSaveManager.load('visitHistory') || {};
          const count = visitHistory[`${currentPlayer.name}-${position}`] || 0;
  
          // Get player state
          const playerStates = progressState.playerStates || {};
          const playerState = playerStates[currentPlayer.name] || {
            resources: { money: 0, time: 0 },
            cards: []
          };
  
          if (mounted) {
            setPlayerData(currentPlayer);
            setCurrentPhase(spaceData[0].Phase);
            setVisitCount(count);
            setCurrentPosition(position);
            setResources(playerState.resources);
            setError(null);
          }
        } catch (err) {
          console.error('Error in PlayerStatus:', err);
          if (mounted) {
            setError(err.message);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };
  
      const handleStateUpdate = (type) => {
        if (type === 'progressState' || type === 'players') {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(loadPlayerData, 100);
        }
      };
  
      window.GameSaveManager?.subscribe(handleStateUpdate);
      loadPlayerData();
  
      return () => {
        mounted = false;
        window.GameSaveManager?.unsubscribe(handleStateUpdate);
        clearTimeout(debounceTimer);
      };
    }, []);
  
    if (loading) {
      return React.createElement('div', {
        className: "flex items-center justify-center h-32"
      }, "Loading player information...");
    }
  
    if (error) {
      return React.createElement('div', {
        className: "p-4 bg-red-50 text-red-700 rounded-lg"
      }, error);
    }
  
    const playerInfo = [
      { label: 'Total Project Budget:', value: `${resources?.money ?? 0} dollars` },
      { label: 'Total Time Spent:', value: `${resources?.time ?? 0} days` }
    ];
    
    return React.createElement('div', {
      className: "mt-6 w-full"
    },
      React.createElement('div', {
        className: "overflow-hidden rounded-lg border border-gray-200"
      },
        React.createElement('table', {
          className: "min-w-full divide-y divide-gray-200"
        },
          React.createElement('thead', {
            key: 'head',
            className: "bg-gray-50"
          },
            React.createElement('tr', null,
              React.createElement('th', {
                key: 'type',
                className: "px-4 py-2 text-left text-sm font-medium text-gray-500"
              }, "Type"),
              React.createElement('th', {
                key: 'value',
                className: "px-4 py-2 text-left text-sm font-medium text-gray-500"
              }, "Value")
            )
          ),
          React.createElement('tbody', {
            key: 'body',
            className: "divide-y divide-gray-200 bg-white"
          },
            ...playerInfo.map((info, index) =>
              React.createElement('tr', {
                key: `row-${index}`
              },
                React.createElement('td', {
                  key: 'label',
                  className: "px-4 py-2 text-sm font-medium text-gray-900"
                }, info.label),
                React.createElement('td', {
                  key: 'value',
                  className: "px-4 py-2 text-sm text-gray-500"
                }, info.value)
              )
            )
          )
        )
      )
    );
  };
  
// Make component globally available
window.PlayerStatus = PlayerStatus;