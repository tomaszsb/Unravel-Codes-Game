const DiceResult = () => {
  const [tempState, setTempState] = React.useState(null);
  const [currentSpace, setCurrentSpace] = React.useState(null);
  const [outcomes, setOutcomes] = React.useState([]);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
      let mounted = true;
      let debounceTimer;

      const loadResults = async () => {
          try {
              if (!window.GameSaveManager || !window.GameDataManager || !window.PlayerProgressManager) {
                  throw new Error('Game systems not initialized');
              }

              // Wait for GameDataManager to be ready
              if (!window.GameDataManager.isReady()) {
                  await window.GameDataManager.waitUntilReady();
              }

              const progressState = window.GameSaveManager.load('progressState');
              const currentPlayer = window.GamePlayerManager.getCurrentPlayer();

              if (!progressState || !currentPlayer) {
                  return;
              }

              const position = progressState.playerPositions[currentPlayer.name];
              if (!position) {
                  return;
              }

              // Get temporary state
              const state = window.PlayerProgressManager.getTemporaryState(currentPlayer.name);

              if (mounted) {
                  setCurrentSpace(position);
                  setTempState(state);

                  // Load available outcomes for the space
                  const visitHistory = window.GameSaveManager.load('visitHistory') || {};
                  const visitCount = visitHistory[`${currentPlayer.name}-${position}`] || 0;
                  const currentVisitType = visitCount === 0 ? 'First' : 'Subsequent';

                  const diceRollData = window.GameDataManager?.csvData?.diceRoll;
                  if (diceRollData) {
                      const spaceOutcomes = diceRollData
                          .filter(row => 
                              row['Space Name'] === position && 
                              row['Visit Type'] === currentVisitType
                          )
                          .map(row => ({
                              type: row['Die Roll'],
                              outcomes: Object.fromEntries(
                                  Object.entries(row)
                                      .filter(([key]) => /^[1-6]$/.test(key))
                                      .map(([key, value]) => [parseInt(key), value])
                              )
                          }));
                      setOutcomes(spaceOutcomes);
                  }
              }
          } catch (err) {
              console.error('Error loading results:', err);
              if (mounted) {
                  setError(err.message);
              }
          }
      };

      // Subscribe to both player changes and temporary state updates
      const handleUpdate = (state) => {
          if (!mounted) return;

          if (state?.type === 'temporaryStateUpdate') {
              const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
              if (currentPlayer) {
                  setTempState(window.PlayerProgressManager.getTemporaryState(currentPlayer.name));
              }
          } else if (state?.type === 'temporaryStateCleared') {
              setTempState(null);
          }
      };

      window.PlayerProgressManager?.subscribe(handleUpdate);
      
      // Initial load
      loadResults();

      return () => {
          mounted = false;
          window.PlayerProgressManager?.unsubscribe(handleUpdate);
          clearTimeout(debounceTimer);
      };
  }, []);

  const formatOutcome = (type, value) => {
      switch (type) {
          case 'W Cards':
          case 'I Cards':
          case 'E Cards':
              return value;
          case 'Fees Paid':
          case 'Fee Paid':
              return value.includes('%') ? value : `${value}%`;
          case 'Time outcomes':
              return value.toLowerCase().includes('day') ? value : `${value} days`;
          default:
              return value;
      }
  };

  // Error state
  if (error) {
      return React.createElement('div', {
          className: 'p-4 bg-red-50 text-red-700 rounded'
      }, error);
  }

  // If no rolls yet, show nothing
  if (!tempState?.diceRolls?.rolls?.length) {
      return null;
  }

  return React.createElement('div', {
      className: 'space-y-4 p-4 bg-white rounded-lg shadow-sm'
  }, [
      // Roll Results
      React.createElement('div', {
          key: 'rolls',
          className: 'space-y-2'
      }, [
          React.createElement('h3', {
              className: 'font-medium'
          }, 'Roll Results:'),
          ...tempState.diceRolls.rolls.map((roll, index) =>
              React.createElement('div', {
                  key: `roll-${index}`,
                  className: 'p-2 bg-blue-50 rounded flex justify-between items-center'
              }, [
                  React.createElement('span', {
                      className: 'font-medium'
                  }, `Roll ${index + 1}:`),
                  React.createElement('span', {
                      className: 'text-lg'
                  }, roll)
              ])
          )
      ]),

      // Outcomes
      outcomes.length > 0 && React.createElement('div', {
          key: 'outcomes',
          className: 'space-y-2'
      }, [
          React.createElement('h3', {
              className: 'font-medium'
          }, 'Outcomes:'),
          ...outcomes.map((outcomeGroup, groupIndex) =>
              React.createElement('div', {
                  key: `group-${groupIndex}`,
                  className: 'space-y-1'
              }, [
                  React.createElement('div', {
                      className: 'text-sm font-medium text-gray-600'
                  }, outcomeGroup.type),
                  ...tempState.diceRolls.rolls.map((roll, rollIndex) =>
                      outcomeGroup.outcomes[roll] && React.createElement('div', {
                          key: `outcome-${rollIndex}`,
                          className: 'p-2 bg-gray-50 rounded text-sm'
                      }, formatOutcome(outcomeGroup.type, outcomeGroup.outcomes[roll]))
                  )
              ])
          )
      ])
  ]);
};

window.DiceResult = DiceResult;