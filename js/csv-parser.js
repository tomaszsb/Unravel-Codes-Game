// csv-parser.js - Simplified version of PapaParse functionality
if (!window.Papa) {  // Only define if not already defined
    class CSVParser {
        constructor() {
            this.RECORD_SEP = '\r\n';
            this.FIELD_SEP = ',';
            this.QUOTE_CHAR = '"';
        }

        parse(csvText, options = {}) {
            const config = {
                header: options.header || false,
                dynamicTyping: options.dynamicTyping || false,
                skipEmptyLines: options.skipEmptyLines || false
            };

            try {
                // Split into lines, handling both \r\n and \n
                let lines = csvText.split(/\r?\n/);
                
                // Remove empty lines if configured
                if (config.skipEmptyLines) {
                    lines = lines.filter(line => line.trim());
                }

                // Parse header if configured
                let headers = [];
                let startIndex = 0;
                
                if (config.header) {
                    headers = this.parseLine(lines[0]);
                    startIndex = 1;
                }

                // Parse data lines
                const data = [];
                for (let i = startIndex; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    
                    const fields = this.parseLine(lines[i]);
                    
                    if (config.header) {
                        // Create object using headers
                        const row = {};
                        fields.forEach((field, index) => {
                            const header = headers[index];
                            row[header] = config.dynamicTyping ? this.typeConvert(field) : field;
                        });
                        data.push(row);
                    } else {
                        // Array of fields
                        if (config.dynamicTyping) {
                            data.push(fields.map(field => this.typeConvert(field)));
                        } else {
                            data.push(fields);
                        }
                    }
                }

                return {
                    data,
                    errors: [],
                    meta: {
                        delimiter: this.FIELD_SEP,
                        linebreak: this.RECORD_SEP,
                        truncated: false,
                        fields: headers
                    }
                };
            } catch (error) {
                return {
                    data: [],
                    errors: [{ message: error.message }],
                    meta: {
                        delimiter: this.FIELD_SEP,
                        linebreak: this.RECORD_SEP,
                        truncated: true,
                        fields: []
                    }
                };
            }
        }

        parseLine(line) {
            const fields = [];
            let field = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === this.QUOTE_CHAR) {
                    if (inQuotes && line[i + 1] === this.QUOTE_CHAR) {
                        field += char;
                        i++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === this.FIELD_SEP && !inQuotes) {
                    fields.push(field.trim());
                    field = '';
                } else {
                    field += char;
                }
            }
            
            fields.push(field.trim());
            return fields;
        }

        typeConvert(value) {
            // Don't convert empty values
            if (!value.trim()) return '';
            
            // Try converting to number
            if (/^-?\d*\.?\d+$/.test(value)) {
                const num = parseFloat(value);
                if (!isNaN(num)) return num;
            }
            
            // Handle booleans
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
            
            // Keep as string if no conversion applies
            return value;
        }
    }

    // Make globally available only if not already defined
    window.Papa = new CSVParser();
}