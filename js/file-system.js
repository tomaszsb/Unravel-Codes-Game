// file-system.js
class FileSystem {
    constructor() {
        this.basePath = ''; 
    }

    async readFile(filename, options = {}) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`Failed to load file: ${filename}`);
            }

            if (options.encoding === 'utf8') {
                return await response.text();
            }
            
            return await response.arrayBuffer();
        } catch (error) {
            console.error(`Error reading file ${filename}:`, error);
            throw error;
        }
    }
}

// Create global instance
window.fs = new FileSystem();