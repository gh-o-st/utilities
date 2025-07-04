/**
 * BitBoard — a compact 2D grid of values packed into Uint32Array.
 * Supports up to 32 bits per cell (bigInt is too slow).
 */
const BitBoard = class {
    /**
     * @param {number} rows - Number of rows in the grid
     * @param {number} cols - Number of columns in the grid
     * @param {number} bitsPerCell - Bits per cell (max 32)
     * @param {boolean} safeMode - If true, bounds checking is enabled
     */
    constructor(rows, cols, bitsPerCell = 1, safeMode = true) {
        if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
            throw new Error("Rows and cols must be positive integers");
        }
        if (!Number.isInteger(bitsPerCell) || bitsPerCell < 1 || bitsPerCell > 32) {
            throw new Error("bitsPerCell must be an integer between 1 and 32");
        }
        
        // Check for potential overflow
        const totalCells = rows * cols;
        if (totalCells > Number.MAX_SAFE_INTEGER / bitsPerCell) {
            throw new Error("Grid too large - would cause integer overflow");
        }

        this.rows = rows;
        this.cols = cols;
        this.bitsPerCell = bitsPerCell;
        this.safeMode = Boolean(safeMode);
        this.requiredBits = totalCells * bitsPerCell;

        const uint32Count = Math.ceil(this.requiredBits / 32);
        this.data = new Uint32Array(uint32Count);
        
        // Pre-calculate mask for performance
        this.cellMask = bitsPerCell >= 32 ? 0xFFFFFFFF : (1 << bitsPerCell) - 1;
    }

    /**
     * Returns the bit index of a cell in the bitboard
     * @private
     * @param {number} row 
     * @param {number} col 
     * @returns {number} Bit index
     */
    getBitIndex(row, col) {
        if (this.safeMode) {
            if (!Number.isInteger(row) || !Number.isInteger(col) || 
                row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
                throw new RangeError(`Cell (${row}, ${col}) out of bounds [0-${this.rows-1}, 0-${this.cols-1}]`);
            }
        }
        return (row * this.cols + col) * this.bitsPerCell;
    }

    /**
     * Gets the value stored at the given cell
     * @param {number} row 
     * @param {number} col 
     * @returns {number}
     */
    get(row, col) {
        const bitIndex = this.getBitIndex(row, col);
        const startWord = Math.floor(bitIndex / 32);
        const bitOffset = bitIndex % 32;

        // Handle single word case (most common)
        if (bitOffset + this.bitsPerCell <= 32) {
            return (this.data[startWord] >>> bitOffset) & this.cellMask;
        }
        
        // Handle cross-word case
        const firstBits = 32 - bitOffset;
        const secondBits = this.bitsPerCell - firstBits;
        
        // Bounds check for data array
        if (startWord + 1 >= this.data.length) {
            throw new Error("Internal error: bit index exceeds data array bounds");
        }
        
        const firstPart = this.data[startWord] >>> bitOffset;
        const secondPart = this.data[startWord + 1] & ((1 << secondBits) - 1);
        
        return (firstPart | (secondPart << firstBits)) & this.cellMask;
    }

    /**
     * Sets the value at the given cell
     * @param {number} row 
     * @param {number} col 
     * @param {number} value 
     */
    set(row, col, value) {
        // Validate value
        if (!Number.isInteger(value) || value < 0) {
            throw new TypeError("Value must be a non-negative integer");
        }
        
        const bitIndex = this.getBitIndex(row, col);
        const startWord = Math.floor(bitIndex / 32);
        const bitOffset = bitIndex % 32;
        
        // Clamp value to cell size
        value &= this.cellMask;

        // Handle single word case (most common)
        if (bitOffset + this.bitsPerCell <= 32) {
            const mask = this.cellMask << bitOffset;
            this.data[startWord] = (this.data[startWord] & ~mask) | (value << bitOffset);
            return;
        }
        
        // Handle cross-word case
        const firstBits = 32 - bitOffset;
        const secondBits = this.bitsPerCell - firstBits;
        
        // Bounds check
        if (startWord + 1 >= this.data.length) {
            throw new Error("Internal error: bit index exceeds data array bounds");
        }
        
        // Clear and set first word
        const firstMask = ((1 << firstBits) - 1) << bitOffset;
        this.data[startWord] = (this.data[startWord] & ~firstMask) | 
                              ((value & ((1 << firstBits) - 1)) << bitOffset);
        
        // Clear and set second word
        const secondMask = (1 << secondBits) - 1;
        this.data[startWord + 1] = (this.data[startWord + 1] & ~secondMask) | 
                                  (value >>> firstBits);
    }

    /** Bitwise AND with value */
    and(row, col, value) {
        if (!Number.isInteger(value) || value < 0) {
            throw new TypeError("Value must be a non-negative integer");
        }
        this.set(row, col, this.get(row, col) & value);
    }

    /** Bitwise OR with value */
    or(row, col, value) {
        if (!Number.isInteger(value) || value < 0) {
            throw new TypeError("Value must be a non-negative integer");
        }
        this.set(row, col, this.get(row, col) | value);
    }

    /** Bitwise XOR with value */
    xor(row, col, value) {
        if (!Number.isInteger(value) || value < 0) {
            throw new TypeError("Value must be a non-negative integer");
        }
        this.set(row, col, this.get(row, col) ^ value);
    }

    /** Bitwise NOT (inverts cell value) */
    not(row, col) {
        this.set(row, col, (~this.get(row, col)) & this.cellMask);
    }

    /** Toggle all bits in a cell */
    toggle(row, col) {
        this.set(row, col, this.get(row, col) ^ this.cellMask);
    }

    /**
     * Sets all cells to a given value - optimized version
     * @param {number} value 
     */
    fill(value = 0) {
        if (!Number.isInteger(value) || value < 0) {
            throw new TypeError("Value must be a non-negative integer");
        }
        
        const clampedValue = value & this.cellMask;
        
        // Fast path for zero
        if (clampedValue === 0) {
            this.data.fill(0);
            return;
        }
        
        // For non-zero values, fall back to cell-by-cell (could be optimized further)
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.set(r, c, clampedValue);
            }
        }
    }

    /** Clears a single cell (sets to 0) */
    clear(row, col) {
        this.set(row, col, 0);
    }

    /**
     * Clears a rectangular region starting from (startRow, startCol)
     * @param {number} startRow 
     * @param {number} startCol 
     * @param {number} rows 
     * @param {number} cols 
     */
    clearRegion(startRow, startCol, rows, cols) {
        // Validate inputs
        if (!Number.isInteger(startRow) || !Number.isInteger(startCol) || 
            !Number.isInteger(rows) || !Number.isInteger(cols)) {
            throw new TypeError("All parameters must be integers");
        }
        
        // Clamp to valid bounds
        const endRow = Math.min(startRow + rows, this.rows);
        const endCol = Math.min(startCol + cols, this.cols);
        const actualStartRow = Math.max(startRow, 0);
        const actualStartCol = Math.max(startCol, 0);
        
        for (let r = actualStartRow; r < endRow; r++) {
            for (let c = actualStartCol; c < endCol; c++) {
                this.set(r, c, 0);
            }
        }
    }

    /**
     * Copies the entire region of this board to a target board offset by (startRow, startCol)
     * @param {BitBoard} targetBoard 
     * @param {number} startRow 
     * @param {number} startCol 
     */
    copyRegionTo(targetBoard, startRow, startCol) {
        if (!(targetBoard instanceof BitBoard)) {
            throw new TypeError("targetBoard must be a BitBoard instance");
        }
        if (!Number.isInteger(startRow) || !Number.isInteger(startCol)) {
            throw new TypeError("startRow and startCol must be integers");
        }
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const targetRow = startRow + r;
                const targetCol = startCol + c;
                
                // Skip if target is out of bounds
                if (targetBoard.safeMode && 
                    (targetRow < 0 || targetRow >= targetBoard.rows || 
                     targetCol < 0 || targetCol >= targetBoard.cols)) {
                    continue;
                }
                
                targetBoard.set(targetRow, targetCol, this.get(r, c));
            }
        }
    }

    /**
     * Creates a deep copy of the BitBoard
     * @returns {BitBoard}
     */
    clone() {
        const copy = new BitBoard(this.rows, this.cols, this.bitsPerCell, this.safeMode);
        copy.data.set(this.data);
        return copy;
    }

    /**
     * Prints the board to the console (binary format)
     */
    print() {
        for (let r = 0; r < this.rows; r++) {
            let rowStr = '';
            for (let c = 0; c < this.cols; c++) {
                rowStr += this.get(r, c).toString(2).padStart(this.bitsPerCell, '0') + ' ';
            }
            console.log(rowStr);
        }
    }

    /**
     * Serializes the board to a JSON-friendly object
     * @returns {object}
     */
    toJSON() {
        return {
            rows: this.rows,
            cols: this.cols,
            bitsPerCell: this.bitsPerCell,
            safeMode: this.safeMode,
            data: Array.from(this.data),
        };
    }

    /**
     * Returns the indices in the data array (Uint32Array) that this cell touches,
     * including any potential overflow into the next word.
     * @param {number} row 
     * @param {number} col 
     * @returns {Set<number>} Set of affected word indices
     */
    getAffectedWords(row, col) {
        const affected = new Set();
        const bitIndex = this.getBitIndex(row, col);
        const startWord = Math.floor(bitIndex / 32);
        affected.add(startWord);

        const bitOffset = bitIndex % 32;
        if (bitOffset + this.bitsPerCell > 32 && startWord + 1 < this.data.length) {
            affected.add(startWord + 1);
        }

        return affected;
    }

    /**
     * Returns the set of word indices that could be affected by this cell
     * and its immediate neighbors (for broad-phase collision zone)
     * @param {number} row 
     * @param {number} col 
     * @returns {Set<number>} Set of affected word indices
     */
    getNeighborhoodAffectedWords(row, col) {
        const affected = new Set();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = row + dr;
                const nc = col + dc;
                
                // Skip invalid coordinates
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) {
                    continue;
                }
                
                const wordIndices = this.getAffectedWords(nr, nc);
                for (const word of wordIndices) {
                    affected.add(word);
                }
            }
        }
        return affected;
    }

    /**
     * Reconstructs a BitBoard from a JSON object
     * @param {object} obj 
     * @returns {BitBoard}
     */
    static fromJSON(obj) {
        const bb = new BitBoard(obj.rows, obj.cols, obj.bitsPerCell, obj.safeMode);
        bb.data.set(obj.data);
        return bb;
    }
};

export default BitBoard;