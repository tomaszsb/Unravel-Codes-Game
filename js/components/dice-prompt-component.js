const DicePrompt = () => {
  const [currentSpace, setCurrentSpace] = React.useState(null);
  const [visitType, setVisitType] = React.useState(null);
  const [rollState, setRollState] = React.useState(null);
  const [prompt, setPrompt] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
      let mounted = true;
      let debounceTimer;

      const loadPromptState = async () => {
          try {
              const progressState = window.GameSaveManager.load('progressState');
              const currentPlayer = window.GamePlayerManager.getCurrentPlayer();
              
              if (!progressState || !currentPlayer) {
                  setPrompt(null);
                  return;
              }

              const position = progressState.playerPositions[currentPlayer.name];
              if (!position) {
                  setPrompt(null);
                  return;
              }

              // Get visit history
              const visitHistory = window.GameSaveManager.load('visitHistory') || {};
              const visitCount = visitHistory[`${currentPlayer.name}-${position}`] || 0;
              const currentVisitType = visitCount === 0 ? 'First' : 'Subsequent';

              // Get space data
              const spaceData = window.GameDataManager.getSpaceData(position);
              if (!spaceData?.length) {
                  setPrompt(null);
                  return;
              }

              const currentSpaceData = spaceData.find(data => 
                  data['Visit Type'] === currentVisitType
              );

              if (mounted) {
                  setCurrentSpace(position);
                  setVisitType(currentVisitType);
                  setRollState(progressState.rollState);

                  // Set appropriate prompt
                  if (progressState.rollState?.hasRolled) {
                      setPrompt('Roll completed - check results below');
                  } else if (progressState.rollState?.rollsRequired > 0) {
                      setPrompt(currentSpaceData?.Action || 'Roll the dice to continue');
                  } else {
                      setPrompt('No roll required at this space');
                  }
              }

          } catch (err) {
              console.error('Error loading prompt state:', err);
              if (mounted) {
                  setError(err.message);
              }
          }
      };

      // Handle state updates with debouncing
      const handleStateUpdate = (type) => {
          if (type === 'progressState' || type === 'players') {
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(loadPromptState, 100);
          }
      };

      window.GameSaveManager?.subscribe(handleStateUpdate);
      
      // Initial load
      loadPromptState();

      return () => {
          mounted = false;
          window.GameSaveManager?.unsubscribe(handleStateUpdate);
          clearTimeout(debounceTimer);
      };
  }, []);

  if (error) {
      return React.createElement('div', {
          className: 'p-4 bg-red-50 text-red-700 rounded-lg'
      }, error);
  }

  if (!prompt) {
      return null;
  }

  return React.createElement('div', {
      className: 'p-4 bg-gray-50 rounded'
  }, [
      React.createElement('h3', {
          key: 'prompt-title',
          className: 'font-medium mb-2'
      }, 'Action Required:'),
      React.createElement('p', {
          key: 'prompt-text',
          className: 'text-gray-700'
      }, prompt)
  ]);
};

window.DicePrompt = DicePrompt;