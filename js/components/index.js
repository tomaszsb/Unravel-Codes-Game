import React from 'react';
import ReactDOM from 'react-dom';
import GameBoard from './GameBoard';
import GameHeader from './GameHeader';
import GameMainArea from './GameMainArea';
import LeftColumn from './LeftColumn';
import MiddleColumn from './MiddleColumn';
import RightColumn from './RightColumn';
import GameControls from './GameControls';
import MoveSelection from './MoveSelection';
import SingleMoveDisplay from './SingleMoveDisplay';
import GameEndScreen from './GameEndScreen';
import { GameInstructionsModal, GameLogModal } from './GameModals';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';

// Assign components to window for global access
window.GameBoard = GameBoard;
window.GameHeader = GameHeader;
window.GameMainArea = GameMainArea;
window.LeftColumn = LeftColumn;
window.MiddleColumn = MiddleColumn;
window.RightColumn = RightColumn;
window.GameControls = GameControls;
window.MoveSelection = MoveSelection;
window.SingleMoveDisplay = SingleMoveDisplay;
window.GameEndScreen = GameEndScreen;
window.GameInstructionsModal = GameInstructionsModal;
window.GameLogModal = GameLogModal;
window.LoadingScreen = LoadingScreen;
window.ErrorScreen = ErrorScreen;

// This file serves as the entry point for the game board application
document.addEventListener('DOMContentLoaded', () => {
    // Verify mount points exist
    const requiredMounts = [
        'game-board-root'
    ];
    
    const missingMounts = requiredMounts.filter(id => !document.getElementById(id));
    
    if (missingMounts.length > 0) {
        console.error(`Missing mount points: ${missingMounts.join(', ')}`);
        
        // Create an error message in the DOM
        const rootElement = document.body;
        const errorElement = document.createElement('div');
        errorElement.className = 'mount-error';
        errorElement.innerHTML = `
            <h2>Mount Point Error</h2>
            <p>The following required mount points are missing:</p>
            <ul>
                ${missingMounts.map(id => `<li>${id}</li>`).join('')}
            </ul>
            <p>Please ensure these elements exist in your HTML.</p>
        `;
        
        rootElement.appendChild(errorElement);
        return;
    }
    
    // Mount the GameBoard component
    ReactDOM.render(
        <GameBoard />,
        document.getElementById('game-board-root')
    );
});

// Export components for direct imports
export { default as GameBoard } from './GameBoard';
export { default as GameHeader } from './GameHeader';
export { default as GameMainArea } from './GameMainArea';
export { default as LeftColumn } from './LeftColumn';
export { default as MiddleColumn } from './MiddleColumn';
export { default as RightColumn } from './RightColumn';
export { default as GameControls } from './GameControls';
export { default as MoveSelection } from './MoveSelection';
export { default as SingleMoveDisplay } from './SingleMoveDisplay';
export { default as GameEndScreen } from './GameEndScreen';
export { GameInstructionsModal, GameLogModal } from './GameModals';