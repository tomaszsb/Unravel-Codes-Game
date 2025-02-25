// action-requirements-component.js
const ActionRequirements = () => {
  const [requirements, setRequirements] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [rollState, setRollState] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    let debounceTimer;

    const loadRequirements = async () => {
      try {
        if (!isMounted) return;

        // Get current player and position
        const currentPlayer = window.GamePlayerManager?.getCurrentPlayer();
        if (!currentPlayer) {
          console.log('No current player found');
          return;
        }

        const progressState = window.GameSaveManager?.load('progressState');
        const position = progressState?.playerPositions?.[currentPlayer.name];
        if (!position) {
          console.log('No position found for current player');
          return;
        }

        // Get visit type
        const visitHistory = window.GameSaveManager?.load('visitHistory') || {};
        const visitKey = `${currentPlayer.name}-${position}`;
        const visitCount = visitHistory[visitKey] || 0;
        const visitType = visitCount === 0 ? 'First' : 'Subsequent';

        // Check if space requires dice roll
        const requiresDice = window.GameDataManager.isDiceRollRequired(position, visitType);
        const hasRolled = progressState?.rollState?.hasRolled;
        setRollState(progressState?.rollState);

        // Get dice roll data if needed
        let cardRequirement = null;
        if (requiresDice && hasRolled) {
          const roll = progressState.rollState.rolls[0];
          const diceData = window.GameDataManager.data.get('diceRoll')
            ?.find(data => 
              data['Space Name'] === position && 
              data['Visit Type'] === visitType
            );
          if (diceData) {
            cardRequirement = diceData[roll.toString()];
          }
        }

        // Get space data
        const spaceData = window.GameDataManager?.getSpaceData(position);
        const spaceInfo = spaceData?.find(space => space['Visit Type'] === visitType) || spaceData?.[0];

        // Build requirements object
        const newRequirements = {
          position,
          visitType,
          requiresDice,
          hasRolled,
          cardRequirement,
          time: spaceInfo?.Time ? parseInt(spaceInfo.Time) : 0,
          action: spaceInfo?.Action
        };

        if (isMounted) {
          setRequirements(newRequirements);
          setError(null);
        }

      } catch (err) {
        console.error('Error loading requirements:', err);
        if (isMounted) {
          setError(err.message);
        }
      }
    };

    // Handle state updates with debouncing
    const handleStateUpdate = () => {
      if (!isMounted) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadRequirements, 100);
    };

    window.GameSaveManager?.subscribe(handleStateUpdate);
    loadRequirements();

    return () => {
      isMounted = false;
      window.GameSaveManager?.unsubscribe(handleStateUpdate);
      clearTimeout(debounceTimer);
    };
  }, []);

  if (error) {
    return React.createElement('div', {
      className: 'text-red-600 p-4'
    }, error);
  }

  if (!requirements) {
    return React.createElement('div', {
      className: 'p-4'
    }, 'Loading requirements...');
  }

  // Create table rows based on current state
  const tableRows = [];

  // Always show time requirement if present
  if (requirements.time > 0) {
    tableRows.push({
      label: 'Time Required:',
      value: `${requirements.time} days`
    });
  }

  // First show dice requirement if needed
  if (requirements.requiresDice && !requirements.hasRolled) {
    tableRows.push({
      label: 'Required Action:',
      value: 'Roll Dice'
    });
  }

  // Show card requirement only after roll
  if (requirements.requiresDice && requirements.hasRolled && requirements.cardRequirement) {
    tableRows.push({
      label: 'Card Requirement:',
      value: requirements.cardRequirement
    });
  }

  // Show action if present
  if (requirements.action) {
    tableRows.push({
      label: 'Action:',
      value: requirements.action
    });
  }

  return React.createElement('div', {
    className: 'p-4'
  }, [
    // Title
    React.createElement('h3', {
      key: 'title',
      className: 'text-lg font-bold mb-4'
    }, 'Required Actions'),
    
    // Requirements table
    React.createElement('table', {
      key: 'requirements-table',
      className: 'w-full'
    }, React.createElement('tbody', {
      key: 'tbody'
    }, tableRows.map((row, index) => 
      React.createElement('tr', {
        key: `row-${index}`,
        className: 'border-b border-gray-200 last:border-0'
      }, [
        React.createElement('td', {
          key: 'label',
          className: 'py-2 pr-4 font-medium w-1/2'
        }, row.label),
        React.createElement('td', {
          key: 'value',
          className: 'py-2 text-gray-600'
        }, row.value)
      ])
    )))
  ]);
};

// Make component globally available
window.ActionRequirements = ActionRequirements;