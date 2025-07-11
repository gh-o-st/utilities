/**
 * BitBoard is a compact, efficient grid structure for storing fixed-width integer values per cell,
 * using bit-packing into a Uint32Array. Supports grids up to large sizes, with configurable bits per cell.
 *
 * @class
 * @example
 * // Create a 8x8 board with 2 bits per cell
 * const board = new BitBoard(8, 8, 2);
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

        // Delegate cross-word case to helper
        return this._getCrossWordValue(startWord, bitOffset);
    }

    /**
     * @param {number} bitOffset
     * @returns {number}
     */
    _getCrossWordValue(startWord, bitOffset) {
        const firstBits = 32 - bitOffset;
        const secondBits = this.bitsPerCell - firstBits;

        // Bounds check for data array
        if (startWord + 1 >= this.data.length) {
            throw new Error("Internal error: bit index exceeds data array bounds");
        }

        const firstPart = this.data[startWord] >>> bitOffset;
        const secondMask = secondBits === 32 ? 0xFFFFFFFF : ((1 << secondBits) - 1);
        const secondPart = this.data[startWord + 1] & secondMask;

        return (firstPart | (secondPart << firstBits)) & this.cellMask;
    }


    /**
     * Sets the value of a cell at the specified row and column in the bitboard.
     * 
     * Validates that the value is a non-negative integer and does not exceed the maximum allowed
     * for the configured bits per cell. Handles both single-word and cross-word cases when setting
     * the value in the underlying data array.
     * 
     * @param {number} row - The row index of the cell to set.
     * @param {number} col - The column index of the cell to set.
     * @param {number} value - The non-negative integer value to set in the cell.
     * @throws {TypeError} If the value is not a non-negative integer.
     * @throws {RangeError} If the value exceeds the maximum allowed for the cell size.
     * @throws {Error} If the bit index exceeds the bounds of the data array.
     */
    set(row, col, value) {
        // Validate value
        if (!Number.isInteger(value) || value < 0) {
            throw new TypeError("Value must be a non-negative integer");
        }
        if (value > this.cellMask) {
            throw new RangeError(`Value (${value}) exceeds maximum allowed for bitsPerCell (${this.bitsPerCell}): ${this.cellMask}`);
        }
        
        const bitIndex = this.getBitIndex(row, col);
        const startWord = Math.floor(bitIndex / 32);
        const bitOffset = bitIndex % 32;

        // Mask value to cell size
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
        const firstMask = (firstBits === 32 ? 0xFFFFFFFF : ((1 << firstBits) - 1)) << bitOffset;
        this.data[startWord] = (this.data[startWord] & ~firstMask) | 
                               ((value & (firstBits === 32 ? 0xFFFFFFFF : ((1 << firstBits) - 1))) << bitOffset);
        
        // Clear and set second word
        // Note: The second word always starts at bit 0 for the overflow portion,
        // so no shifting is needed for the mask and value.
        // If secondBits === 32, the mask covers all bits and the assignment overwrites the entire word.
        // Otherwise, only the relevant bits are affected and bits outside the mask are preserved.
        const secondMask = secondBits === 32 ? 0xFFFFFFFF : ((1 << secondBits) - 1);
        this.data[startWord + 1] = (this.data[startWord + 1] & ~secondMask) | 
                                   ((value >>> firstBits) & secondMask);
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
     * Sets all cells to a given value.
     * 
     * Note: Filling with zero is fast (uses Array.fill), but filling with non-zero values is significantly slower,
     * as it sets each cell individually. On large boards, this may impact performance.
     * 
     * @param {number} value
     * @throws {TypeError} If value is not a non-negative integer
     * @todo Benchmark size threshold where parallel fill becomes faster than single-threaded
     * @note Could add support for filling with patterns in the future. (e.g., checkerboard, stripes)
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

        const cellsPerWord = Math.floor(32 / this.bitsPerCell);
        const fitsExactly = (this.bitsPerCell <= 32) && (32 % this.bitsPerCell === 0);

        if (clampedValue === this.cellMask && fitsExactly) {
            this.data.fill(0xFFFFFFFF);
            return;
        }

        // Fast path for non-zero
        let packedWord;
        if (cellsPerWord > 0) {
            // Lazy-load cache
            if (!this._fillWordCache) this._fillWordCache = new Map();

            const cacheKey = `${this.bitsPerCell}:${clampedValue}`;
            if (this._fillWordCache.has(cacheKey)) {
                packedWord = this._fillWordCache.get(cacheKey);
            } else {
                packedWord = 0;
                for (let i = 0; i < cellsPerWord; i++) {
                    packedWord |= (clampedValue << (i * this.bitsPerCell));
                }
                this._fillWordCache.set(cacheKey, packedWord);
            }

            this.data.fill(packedWord);

            // Handle trailing cells that don't fill a word
            const totalCells = this.rows * this.cols;
            const totalWords = this.data.length;
            const cellsFilled = cellsPerWord * totalWords;
            for (let i = cellsFilled; i < totalCells; i++) {
                const row = Math.floor(i / this.cols);
                const col = i % this.cols;
                this.set(row, col, clampedValue);
            }
            return;
        }

        // Fallback: cell by cell (slow path)
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
     * Returns true if any cell differs between the two boards.
     * @param {BitBoard} other 
     * @returns {boolean}
     */
    hasDifferences(other) {
        return !this.equals(other);
    }

    /**
     * Compares this board to another for equality.
     * @param {BitBoard} other 
     * @returns {boolean} True if both boards are identical in size, configuration, and data.
     */
    equals(other) {
        if (!(other instanceof BitBoard)) return false;
        if (this.rows !== other.rows || 
            this.cols !== other.cols || 
            this.bitsPerCell !== other.bitsPerCell || 
            this.safeMode !== other.safeMode) {
            return false;
        }
        if (this.data.length !== other.data.length) return false;
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i] !== other.data[i]) return false;
        }
        return true;
    }

    /**
     * Computes the differences between this bitboard and another bitboard.
     * Returns an array of objects representing the positions where the values differ.
     * Each object contains the row (`r`), column (`c`), value in this bitboard (`a`), and value in the other bitboard (`b`).
     *
     * @param {BitBoard} other - The bitboard to compare against.
     * @returns {Array<{r: number, c: number, a: number, b: number}>} Array of difference objects, or an empty array if the bitboards are equal.
     */
    diff(other) {
        if (this.equals(other)) return [];
        // no need to check instanceof here, as this.equals already does that
        const differences = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const thisValue = this.get(r, c);
                const otherValue = other.get(r, c);
                if (thisValue !== otherValue) {
                    differences.push({
                        r: r,
                        c: c,
                        a: thisValue,
                        b: otherValue
                    });
                }
            }
        }
        return differences;
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
            version: 1,
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