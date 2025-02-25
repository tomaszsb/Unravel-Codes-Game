// playerPalettes.js
const colorPalettes = {
    spring: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#388E3C', '#2E7D32'],
    summer: ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#D32F2F', '#B71C1C'],
    autumn: ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#EF6C00'],
    winter: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1565C0']
};

// Make the palette accessible globally
window.PlayerPalettes = {
    getPlayerColorScheme: function(paletteName) {
        return colorPalettes[paletteName];
    },
    
    getAllColorPalettes: function() {
        return colorPalettes;
    }
};
