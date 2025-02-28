// space-info-component.js
const SpaceInfo = ({ hideAvailableMoves = false }) => {
  const [currentSpace, setCurrentSpace] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [visitCount, setVisitCount] = React.useState(0);
  const [player, setPlayer] = React.useState(null);
  const [phase, setPhase] = React.useState(null);
  const [projectStats, setProjectStats] = React.useState({
      budget: 0,
      timeSpent: 0
  });

  React.useEffect(() => {
      let isMounted = true;
      let debounceTimer;

      const loadSpaceData = async () => {
          try {
              if (!isMounted) return;

              setLoading(true);
              setError(null);

              // Check for required managers
              if (!window.GameSaveManager || !window.GameDataManager || !window.GamePlayerManager) {
                  throw new Error('Game systems not initialized');
              }

              // Wait for GameDataManager to be ready
              if (!window.GameDataManager.isReady()) {
                  await window.GameDataManager.waitUntilReady();
              }

              // Wait for PlayerManager to be ready
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

              // Get current player
              const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
              if (!currentPlayer) {
                  throw new Error('Current player not found');
              }

              // Get player position
              const position = progressState.playerPositions?.[currentPlayer.name];
              if (!position) {
                  throw new Error('Player position not found');
              }

              // Get space data
              const spaceData = window.GameDataManager.getSpaceData(position);
              if (!spaceData?.length) {
                  throw new Error('Space data not found');
              }

              // Load visit history and determine visit type
              const visitHistory = window.GameSaveManager.load('visitHistory') || {};
              const visitKey = `${currentPlayer.name}-${position}`;
              const count = visitHistory[visitKey] || 0;

              // Find correct visit type content
              const visitType = count === 0 ? 'FIRST' : 'SUBSEQUENT';
              const visitTypeData = spaceData.find(space => space['Visit Type'] === visitType);

              // Get project stats from player state
              const playerState = progressState.playerStates?.[currentPlayer.name] || {};
              const stats = {
                  budget: playerState.budget || 0,
                  timeSpent: playerState.time || 0
              };

              if (isMounted) {
                  setCurrentSpace(visitTypeData || spaceData[0]);
                  setVisitCount(count);
                  setPlayer(currentPlayer);
                  setPhase(visitTypeData?.Phase || spaceData[0].Phase);
                  setProjectStats(stats);
                  setError(null);
              }
          } catch (err) {
              console.error('Error in SpaceInfo:', err);
              if (isMounted) {
                  setError(err.message || 'Failed to load space information');
              }
          } finally {
              if (isMounted) {
                  setLoading(false);
              }
          }
      };

      // Handle state updates with debouncing
      const handleStateUpdate = (type) => {
          if (!isMounted) return;
          
          if (type === 'progressState' || type === 'players' || type === 'visitHistory') {
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(loadSpaceData, 100);
          }
      };

      window.GameSaveManager?.subscribe(handleStateUpdate);
      loadSpaceData();

      return () => {
          isMounted = false;
          window.GameSaveManager?.unsubscribe(handleStateUpdate);
          clearTimeout(debounceTimer);
      };
  }, []);

  if (loading) {
      return React.createElement('div', {
          className: "flex items-center justify-center h-64"
      }, "Loading space information...");
  }

  if (error) {
      return React.createElement('div', {
          className: "p-4 bg-red-50 text-red-700 rounded-lg"
      }, error);
  }

  if (!currentSpace || !player) {
      return React.createElement('div', {
          className: "p-4 bg-yellow-50 text-yellow-700 rounded-lg"
      }, "No space information available");
  }

  // Story Section
  const renderStorySection = () => {
      return React.createElement('div', {
          className: "mb-8"
      }, [
          // Header with space name and phase
          React.createElement('div', {
              key: 'header',
              className: "mb-4"
          }, [
              React.createElement('h3', {
                  key: 'title',
                  className: "text-xl font-bold"
              }, currentSpace['Space Name']),
              //React.createElement('p', {
              //    key: 'phase',
              //    className: "text-sm text-gray-600 mb-2"
              //}, `Phase: ${phase}`),
              React.createElement('p', {
                  key: 'player-context',
                  className: "text-sm text-gray-600 mb-4"
              }, `${player.name}, you are currently in the ${phase} phase of the project.`),
              React.createElement('p', {
                key: 'visit-info',
                className: "text-sm text-gray-600"
            }, visitCount === 0 ? "This is a first visit." : "This is a subsequent visit.")
            ]),

          // Event and Action descriptions
          React.createElement('div', {
              key: 'content',
              className: "space-y-4"
          }, [
              currentSpace.Event && React.createElement('div', {
                  key: 'event',
                  className: "mb-4"
              }, [
                  React.createElement('span', {
                      className: "font-semibold"
                  }, "Event: "),
                  currentSpace.Event
              ]),
              currentSpace.Action && React.createElement('div', {
                  key: 'action',
                  className: "mb-4"
              }, [
                  React.createElement('span', {
                      className: "font-semibold"
                  }, "Required Action: "),
                  currentSpace.Action
              ])
          ])
      ]);
  };

   //Project Stats Table
const renderStatsTable = () => {
    // Only render table once
    if (this.hasRenderedTable) return null;
    this.hasRenderedTable = true;
      return React.createElement('table', {
          className: "w-full border-collapse mt-4"
      }, [
          React.createElement('thead', {
              key: 'thead'
          }, React.createElement('tr', {}, [
              React.createElement('th', {
                  key: 'type-header',
                  className: "border p-2 text-left bg-gray-50"
              }, "Type"),
              React.createElement('th', {
                  key: 'value-header',
                  className: "border p-2 text-left bg-gray-50"
              }, "Value")
          ])),
          React.createElement('tbody', {
              key: 'tbody'
          }, [
              React.createElement('tr', {
                  key: 'budget-row'
              }, [
                  React.createElement('td', {
                      className: "border p-2"
                  }, "Total Project Budget:"),
                  React.createElement('td', {
                      className: "border p-2"
                  }, `${projectStats.budget} dollars`)
              ]),
              React.createElement('tr', {
                  key: 'time-row'
              }, [
                  React.createElement('td', {
                      className: "border p-2"
                  }, "Total Time Spent:"),
                  React.createElement('td', {
                      className: "border p-2"
                }, `${projectStats.timeSpent} days`)
             ])
          ])
      ]);
  };

  return React.createElement('div', {
      className: "w-full p-4"
  }, [
      renderStorySection(),
      renderStatsTable()
  ]);
};

// Make component globally available
window.SpaceInfo = SpaceInfo;