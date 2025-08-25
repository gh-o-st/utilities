/**
 * Color manipulation and conversion utility class.
 * Supports multiple color spaces (RGB, HSL, HSV, HWB, LCH, Lab, Oklch).
 * Provides methods for color transformations, blending, contrast, and parsing/serialization.
 *
 * @class
 * @property {number} r - Red channel (0-255)
 * @property {number} g - Green channel (0-255)
 * @property {number} b - Blue channel (0-255)
 * @property {number} a - Alpha channel (0-1)
 * @example
 * const c = new Color(255, 0, 0); // Red
 * c.lighten(10); // Returns a lighter color
 * c.getColor('hex'); // Returns hex string
 */
const Color = class {

    // ================================
    // 1. Constructor & Core Properties
    // ================================
    /**
     * Create a new Color instance.
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @param {number} [a=1] Alpha channel (0-1)
     */
    constructor(r, g, b, a = 1) {
        this.r = Color._clampInt(r, 0, 255);
        this.g = Color._clampInt(g, 0, 255);
        this.b = Color._clampInt(b, 0, 255);
        this.a = Color._clampFloat(a, 0, 1);

        this._h = null;
        this._s = null;
        this._l = null;
        this._v = null;

        this._compiled = {};
    }

    // =========================
    // 2. Instance Utilities
    // =========================
    /**
     * Check if this color equals another Color instance.
     * @param {Color} otherColor
     * @returns {boolean}
     */
    equals(otherColor) {
        if (!(otherColor instanceof Color)) {
            return false;
        }
        return this.r === otherColor.r &&
            this.g === otherColor.g &&
            this.b === otherColor.b &&
            this.a === otherColor.a;
    }

    /**
     * Get color string in specified format.
     * @param {string} [format='rgba'] Output format
     * @returns {string}
     */
    getColor(format = 'rgba') {
        if (!this._compiled[format]) {
            this._compileTo(format);
        }
        return this._compiled[format];
    }

    /**
     * Get cached or computed HSL values for this color.
     * @private
     * @returns {number[]} [h, s, l]
     */
    _getHsl() {
        if (this._h === null || this._s === null || this._l === null) {
            [this._h, this._s, this._l] = Color.rgbToHsl(this.r, this.g, this.b);
        }
        return [this._h, this._s, this._l];
    }

    /**
     * Get cached or computed HSV values for this color.
     * @private
     * @returns {number[]} [h, s, v]
     */
    _getHsv() {
        if (this._h === null || this._s === null || this._v === null) {
            [this._h, this._s, this._v] = Color.rgbToHsv(this.r, this.g, this.b);
        }
        return [this._h, this._s, this._v];
    }

    /**
     * Returns the color as a string in RGBA format.
     * @returns {string} The color represented as an RGBA string.
     */
    toString() {
        return this.getColor('rgba');
    }

    /**
     * Calculates the Euclidean distance between this color and another Color instance.
     *
     * @param {Color} to - The Color instance to compare with.
     * @returns {number} The Euclidean distance between the two colors in RGB space.
     * @throws {TypeError} If the argument is not an instance of Color.
     */
    distance(to) {
        if (!(to instanceof Color)) {
            throw new TypeError('distance expects a Color instance');
        }

        const dr = this.r - to.r;
        const dg = this.g - to.g;
        const db = this.b - to.b;

        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // ==============================
    // 3. Color Space Getters/Setters
    // ==============================
    /**
     * Get Oklch representation of this color.
     * @returns {number[]} [L, C, H]
     */
    getOklch() {
        return Color.rgbToOklch(this.r, this.g, this.b);
    }

    /**
     * Set color from Oklch values.
     * @param {number} l Lightness
     * @param {number} c Chroma
     * @param {number} h Hue
     * @param {number} [a=this.a] Alpha
     * @returns {Color} This color instance
     */
    setOklch(l, c, h, a = this.a) {
        const [r, g, b] = Color.oklchToRgb(l, c, h);
        return this.setRgb(r, g, b, a);
    }

    /**
     * Set color from RGB values.
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @param {number} [a=this.a] Alpha
     * @returns {Color} This color instance
     */
    setRgb(r, g, b, a = this.a) {
        this.r = Color._clampInt(r, 0, 255);
        this.g = Color._clampInt(g, 0, 255);
        this.b = Color._clampInt(b, 0, 255);
        this.a = Color._clampFloat(a, 0, 1);
        this._clearCache();
        return this;
    }

    /**
     * Set color from HSL values.
     * @param {number} h Hue (0-360)
     * @param {number} s Saturation (0-100)
     * @param {number} l Lightness (0-100)
     * @param {number} [a=this.a] Alpha
     * @returns {Color} This color instance
     */
    setHsl(h, s, l, a = this.a) {
        const [r, g, b] = Color.hslToRgb(h, s, l);
        return this.setRgb(r, g, b, a);
    }

    /**
     * Set color from HSV values.
     * @param {number} h Hue (0-360)
     * @param {number} s Saturation (0-100)
     * @param {number} v Value (0-100)
     * @param {number} [a=this.a] Alpha
     * @returns {Color} This color instance
     */
    setHsv(h, s, v, a = this.a) {
        const [r, g, b] = Color.hsvToRgb(h, s, v);
        return this.setRgb(r, g, b, a);
    }

    // =========================
    // 4. Transformations
    // =========================
    /**
     * Lightens the color by increasing its lightness by the specified percentage.
     * If mutate is true, mutates this instance; otherwise returns a new Color.
     *
     * @param {number} percent - The percentage to lighten the color (0-100).
     * @param {Object} [options] - Options object.
     * @param {boolean} [options.mutate=false] - If true, mutates this instance.
     * @returns {Color} The lightened color.
     */
    lighten(percent, { mutate = false } = {}) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newL = Math.min(100, l + percent);
            return { h, s, l: newL };
        }, mutate);
    }

    /**
     * Darkens the color by reducing its lightness by the specified percentage.
     *
     * @param {number} percent - The percentage to darken the color (between 0 and 100).
     * @returns {Color} A new Color instance with reduced lightness.
     */
    darken(percent, {mutate = false} = {}) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newL = Math.max(0, l - percent);
            return { h, s, l: newL };
        }, mutate);
    }

    /**
     * Increases the saturation of the color by a given percentage.
     *
     * @param {number} percent - The percentage to increase the saturation (0-100).
     * @returns {Color} A new Color instance with increased saturation.
     */
    saturate(percent, {mutate = false} = {}) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newS = Math.min(100, s + percent);
            return { h, s: newS, l };
        }, mutate);
    }

    /**
     * Reduces the saturation of the color by a given percentage.
     *
     * @param {number} percent - The percentage by which to decrease the saturation (0-100).
     * @returns {Color} A new Color instance with reduced saturation.
     */
    desaturate(percent, {mutate = false} = {}) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newS = Math.max(0, s - percent);
            return { h, s: newS, l };
        }, mutate);
    }

    
    /**
     * Shifts the hue of the color by the specified number of degrees.
     * The hue value wraps around within the 0-359 range.
     *
     * @param {number} degrees - The number of degrees to shift the hue. Can be positive or negative.
     * @returns {Color} A new Color instance with the shifted hue.
     */
    shift(degrees, {mutate = false} = {}) {
        degrees = degrees % 360;
        if (degrees < 0) degrees += 360;

        return this.transform(({ h, s, l }) => {
            const newH = (h + degrees) % 360;
            return { h: newH, s, l };
        }, mutate);
    }

    /**
     * Returns a new Color instance with inverted RGB values.
     * The alpha value remains unchanged.
     * @returns {Color} A new Color object with inverted colors.
     */
    invert({mutate = false} = {}) {
        if (mutate) {
            this._clearCache();
            return this.setRgb(255 - this.r, 255 - this.g, 255 - this.b, this.a);
        } else {
            return new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a);
        }
    }

    /**
     * Applies a transformation function to the color object, allowing modification of its properties.
     *
     * @param {function(Object): Object} transformFn - A function that receives an object containing the color's RGBA, HSL, and HSV values, and returns an object with updated values.
     * @param {boolean} [mutable=false] - If true, mutates the current color object; otherwise, returns a new color instance.
     * @returns {Color} The mutated color object if `mutable` is true, or a new color instance with the transformed values.
     */
    transform(transformFn, mutable = false) {
        const [h, s, l] = this._getHsl();
        const [v] = this._getHsv(); 

        const result = transformFn({
            r: this.r, g: this.g, b: this.b, a: this.a,
            h, s, l, v
        });

        if (mutable) {
            if (result.h !== undefined || result.s !== undefined || result.l !== undefined) {
                return this.setHsl(
                    result.h !== undefined ? result.h : h,
                    result.s !== undefined ? result.s : s,
                    result.l !== undefined ? result.l : l,
                    result.a !== undefined ? result.a : this.a
                );
            } else if (result.r !== undefined || result.g !== undefined || result.b !== undefined) {
                return this.setRgb(
                    result.r !== undefined ? result.r : this.r,
                    result.g !== undefined ? result.g : this.g,
                    result.b !== undefined ? result.b : this.b,
                    result.a !== undefined ? result.a : this.a
                );
            }
            this._clearCache();
            return this; 
        } else {
            if (result.h !== undefined || result.s !== undefined || result.l !== undefined) {
                const [nr, ng, nb] = Color.hslToRgb(
                    result.h !== undefined ? result.h : h,
                    result.s !== undefined ? result.s : s,
                    result.l !== undefined ? result.l : l
                );
                return new Color(nr, ng, nb, result.a !== undefined ? result.a : this.a);
            } else if (result.r !== undefined || result.g !== undefined || result.b !== undefined) {
                return new Color(
                    result.r !== undefined ? result.r : this.r,
                    result.g !== undefined ? result.g : this.g,
                    result.b !== undefined ? result.b : this.b,
                    result.a !== undefined ? result.a : this.a
                );
            }
            return this.clone(); 
        }
    }

    // =========================
    // 5. Blending & Contrast
    // =========================
    /**
     * Blend this color with another color.
     * @param {Color} otherColor Color to blend with
     * @param {number} [blendRatio=0.5] Blend ratio (0-1)
     * @param {Object} [options] Options object
     * @param {boolean} [options.mutate=false] If true, mutates this instance
     * @returns {Color} New blended color or this color instance (mutated)
     */
    mix(otherColor, blendRatio = 0.5, { mutate = false } = {}) {
        blendRatio = Color._clampFloat(blendRatio, 0, 1);
        const lerp = (start, end) => start + (end - start) * blendRatio;

        const newR = lerp(this.r, otherColor.r);
        const newG = lerp(this.g, otherColor.g);
        const newB = lerp(this.b, otherColor.b);
        const newA = lerp(this.a, otherColor.a);

        if (mutate) {
            this._clearCache();
            return this.setRgb(newR, newG, newB, newA);
        } else {
            return new Color(newR, newG, newB, newA);
        }
    }
    
    /**
     * Get relative luminance of the color (WCAG).
     * @returns {number}
     */
    getLuminance() {
        const rgb = [this.r, this.g, this.b].map(v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    /**
     * Get contrast ratio against another color (WCAG).
     * @param {Color} against Color to compare against
     * @returns {number} Contrast ratio
     */
    getContrast(against) {
        if (!(against instanceof Color)) {
            throw new TypeError('getContrast expects a Color instance');
        }

        const lum1 = this.getLuminance();
        const lum2 = against.getLuminance();

        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);

        const contrastRatio = (brightest + 0.05) / (darkest + 0.05);
        return +contrastRatio.toFixed(2);
    }

    /**
     * Check if contrast ratio is sufficient for WCAG level.
     * @param {Color} against Color to compare against
     * @param {string} [level='AA'] WCAG level ('AA' or 'AAA')
     * @param {string} [textSize='normal'] Text size ('normal' or 'large')
     * @returns {boolean}
     */
    isContrastSufficient(against, level = 'AA', textSize = 'normal') {
        const ratio = this.getContrast(against);
        if (level === 'AAA') {
            return textSize === 'large' ? ratio >= 4.5 : ratio >= 7;
        } else {
            return textSize === 'large' ? ratio >= 3 : ratio >= 4.5;
        }
    }

    // ==============================
    // 6. Palette & Scheme Generation
    // ==============================
    /**
     * Returns the complementary color (hue shifted by 180 degrees).
     * @returns {Color} A new Color instance representing the complementary color.
     */
    /**
     * Generate a color palette based on a scheme.
     * @param {Object} options
     * @param {string} options.type - Palette type: 'analogous', 'triadic', 'tetradic', 'complementary', 'split-complementary', 'custom', etc.
     * @param {number} [options.count=5] - Number of colors in the palette.
     * @param {number} [options.hue] - Starting hue (defaults to this color's hue).
     * @param {number} [options.saturation] - Saturation (defaults to this color's saturation).
     * @param {number} [options.lightness] - Lightness (defaults to this color's lightness).
     * @returns {Color[]} Array of Color instances.
     */
    generatePalette({ type = 'analogous', count = 5, hue, saturation, lightness } = {}) {
        const [baseH, baseS, baseL] = this._getHsl();
        const h = hue !== undefined ? hue : baseH;
        const s = saturation !== undefined ? saturation : baseS;
        const l = lightness !== undefined ? lightness : baseL;

        let hues = [];
        switch (type) {
            case 'analogous': {
                // Spread colors around the base hue, ±angle
                const angle = 30;
                const start = h - angle * Math.floor(count / 2);
                for (let i = 0; i < count; i++) {
                    hues.push((start + i * angle + 360) % 360);
                }
                break;
            }
            case 'triadic': {
                // Evenly spaced around the wheel
                for (let i = 0; i < count; i++) {
                    hues.push((h + i * 120) % 360);
                }
                break;
            }
            case 'tetradic': {
                // Evenly spaced, classic is 4 colors at 90°
                for (let i = 0; i < count; i++) {
                    hues.push((h + i * (360 / count)) % 360);
                }
                break;
            }
            case 'complementary': {
                // Base and its complement
                hues = [(h) % 360, (h + 180) % 360];
                break;
            }
            case 'split-complementary': {
                // Base, and two colors ±150°
                hues = [(h) % 360, (h + 150) % 360, (h - 150 + 360) % 360];
                break;
            }
            case 'custom': {
                // Evenly spaced hues
                for (let i = 0; i < count; i++) {
                    hues.push((h + i * (360 / count)) % 360);
                }
                break;
            }
            default: {
                // Fallback: evenly spaced
                for (let i = 0; i < count; i++) {
                    hues.push((h + i * (360 / count)) % 360);
                }
            }
        }

        return hues.map(hueVal => {
            const [r, g, b] = Color.hslToRgb(hueVal, s, l);
            return new Color(r, g, b, this.a);
        });
    }

    getComplementary() {
        const [h, s, l] = this._getHsl();
        // Shift hue by 180 degrees, wrap around 360
        const compHue = (h + 180) % 360;
        const [r, g, b] = Color.hslToRgb(compHue, s, l);
        return new Color(r, g, b, this.a);
    }

    getAnalogous() {
        const [h, s, l] = this._getHsl();
        const angle = 30; // degrees
        const hues = [
            (h + angle) % 360,
            (h - angle + 360) % 360
        ];
        return hues.map(hue => {
            const [r, g, b] = Color.hslToRgb(hue, s, l);
            return new Color(r, g, b, this.a);
        });
    }

    getTriadic() {
        const [h, s, l] = this._getHsl();
        const hues = [
            (h + 120) % 360,
            (h + 240) % 360
        ];
        return hues.map(hue => {
            const [r, g, b] = Color.hslToRgb(hue, s, l);
            return new Color(r, g, b, this.a);
        });
    }

    getTetradic() {
        const [h, s, l] = this._getHsl();
        const hues = [
            (h + 90) % 360,
            (h + 180) % 360,
            (h + 270) % 360
        ];
        return hues.map(hue => {
            const [r, g, b] = Color.hslToRgb(hue, s, l);
            return new Color(r, g, b, this.a);
        });
    }


    // ==========================
    // 7. Parsing & Serialization
    // ==========================
    /**
     * Parses a color string and returns a Color object.
     * Supports multiple color formats: HWB, LCH, OKLCH, HEX, RGB, HSL, HSV.
     *
     * @param {string} colorString - The color string to parse.
     * @returns {Color} The parsed Color object.
     * @throws {TypeError} If the input is not a string.
     * @throws {Error} If the color string format is unsupported.
     */
    static fromString(colorString) {
        if (typeof colorString !== 'string') {
            throw new TypeError('Color.fromString expects a string');
        }

        // Each parser already trims and allows both cases, but we ensure consistency here by dammit.
        colorString = colorString.trim().toLowerCase();

        if (colorString.startsWith('hwb(')) return Color._parseHwb(colorString);
        if (colorString.startsWith('lch(')) return Color._parseLch(colorString);
        if (colorString.startsWith('oklch(')) return Color._parseOklch(colorString);
        if (colorString.startsWith('#')) return Color._parseHex(colorString);
        if (colorString.startsWith('rgb')) return Color._parseRgb(colorString);
        if (colorString.startsWith('hsl')) return Color._parseHsl(colorString);
        if (colorString.startsWith('hsv')) return Color._parseHsv(colorString);

        throw new Error('Unsupported color string format: ' + colorString);
    }

    /**
     * Parses a HWB color string and returns a Color instance.
     *
     * Supported format: `hwb(hue, whiteness%, blackness%[, alpha])`
     * - hue: integer (0-360)
     * - whiteness: percentage (0-100%)
     * - blackness: percentage (0-100%)
     * - alpha: optional float (0-1) or percentage (0-100%)
     * 
     * Example: `hwb(200, 30%, 20%, 0.5)`
     *
     * @private
     * @static
     * @param {string} str - The HWB color string to parse.
     * @returns {Color} A Color instance representing the parsed color.
     * @throws {Error} If the input string is not a valid HWB format.
     */
    static _parseHwb(str) {
        const m = str.match(/^hwb\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%(?:,\s*([0-9]*\.?[0-9]+))?\)$/);
        if (!m) throw new Error('Invalid HWB format');
        const h = Color._clampInt(parseInt(m[1], 10), 0, 360);
        const w = Color._clampInt(parseInt(m[2], 10), 0, 100);
        const b_ = Color._clampInt(parseInt(m[3], 10), 0, 100);
        let a = 1;
        if (m[4] !== undefined) {
            if (m[4].endsWith('%')) {
                a = Color._clampFloat(parseFloat(m[4]) / 100, 0, 1);
            } else {
                a = Color._clampFloat(parseFloat(m[4]), 0, 1);
            }
        }
        const [r, g, b] = Color.hwbToRgb(h, w, b_);
        return new Color(r, g, b, a);
    }

    /**
     * Parses an LCH color string and returns a Color instance.
     *
     * Supported format: `lch(lightness%, chroma, hue[, alpha])`
     * - lightness: percentage (0-100%)
     * - chroma: float (0-230) // capped at 230 to match CSS v4 specification
     * - hue: integer (0-360)
     * - alpha: optional float (0-1)
     * 
     * Example: `lch(70%, 40.5, 120, 0.8)`
     *
     * @private
     * @static
     * @param {string} str - The LCH color string to parse.
     * @returns {Color} A Color instance representing the parsed color.
     * @throws {Error} If the input string is not a valid LCH format.
     */
    static _parseLch(str) {
        const m = str.match(/^lch\((\d{1,3})%,\s*([0-9]*\.?[0-9]+),\s*(\d{1,3})(?:,\s*([0-9]*\.?[0-9]+))?\)$/);
        if (!m) throw new Error('Invalid LCH format');
        const l = Color._clampInt(parseInt(m[1], 10), 0, 100);
        const c = Color._clampFloat(parseFloat(m[2]), 0, 230);
        const h = Color._clampInt(parseInt(m[3], 10), 0, 360);
        const a = m[4] !== undefined ? Color._clampFloat(parseFloat(m[4]), 0, 1) : 1;
        const [r, g, b] = Color.lchToRgb(l, c, h);
        return new Color(r, g, b, a);
    }

    /**
     * Parses an OKLCH color string and returns a Color instance.
     *
     * Supported format: `oklch(<lightness>[%], <chroma>, <hue>[, <alpha>])`
     * - lightness: percentage (0-100%)
     * - chroma: float (0-230)
     * - hue: integer (0-360)
     * - alpha: optional float (0-1)
     * 
     * Example: `oklch(62.5%, 0.15, 120, 0.8)`
     *
     * @private
     * @static
     * @param {string} str - The OKLCH color string to parse.
     * @returns {Color} A Color instance representing the parsed color.
     * @throws {Error} If the input string is not a valid OKLCH format.
     */
    static _parseOklch(str) {
        const m = str.match(/^oklch\(\s*([0-9]*\.?[0-9]+)(%?)\s*,\s*([0-9]*\.?[0-9]+)\s*,\s*([0-9]*\.?[0-9]+)(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/);
        if (!m) throw new Error('Invalid OKLCH format');
        let l = Color._clampFloat(parseFloat(m[1]), 0, 1);
        if (m[2] === '%') l /= 100; // Convert percent to [0,1]
        const c = Color._clampFloat(parseFloat(m[3]), 0, 230);
        const h = Color._clampFloat(parseFloat(m[4]), 0, 360);
        const a = m[5] !== undefined ? Color._clampFloat(parseFloat(m[5]), 0, 1) : 1;
        const [r, g, b] = Color.oklchToRgb(l, c, h);
        return new Color(r, g, b, a);
    }

    /**
     * Parses a hex color string and returns a Color instance.
     * This method supports various hex formats including:
     * - 3-digit hex (e.g., `#f53`)
     * - 4-digit hex (e.g., `#f538`)
     * - 6-digit hex (e.g., `#ff5733`)
     * - 8-digit hex (e.g., `#ff573380`)
     * - The alpha channel is optional and defaults to 1 if not provided.
     * 
     * @private
     * @static
     * @param {string} str - The hex color string to parse.
     * @returns {Color} A Color instance representing the parsed color.
     * @throws {Error} If the input string is not a valid hex format.
     */
    static _parseHex(str) {
        const m = str.match(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/i);
        if (!m) throw new Error('Invalid hex format');
        let hex = m[1];
        let r, g, b, a = 1;

        if (hex.length === 3) {
            // #RGB (3-digit hex code: #RGB)
            r = Color._clampInt(parseInt(hex[0] + hex[0], 16), 0, 255);
            g = Color._clampInt(parseInt(hex[1] + hex[1], 16), 0, 255);
            b = Color._clampInt(parseInt(hex[2] + hex[2], 16), 0, 255);
        } else if (hex.length === 4) {
            // #RGBA (4-digit hex code: #RGBA)
            r = Color._clampInt(parseInt(hex[0] + hex[0], 16), 0, 255);
            g = Color._clampInt(parseInt(hex[1] + hex[1], 16), 0, 255);
            b = Color._clampInt(parseInt(hex[2] + hex[2], 16), 0, 255);
            a = Color._clampFloat(parseInt(hex[3] + hex[3], 16) / 255, 0, 1);
        } else if (hex.length === 6) {
            // #RRGGBB (6-digit hex code: #RRGGBB)
            r = Color._clampInt(parseInt(hex.slice(0, 2), 16), 0, 255);
            g = Color._clampInt(parseInt(hex.slice(2, 4), 16), 0, 255);
            b = Color._clampInt(parseInt(hex.slice(4, 6), 16), 0, 255);
        } else if (hex.length === 8) {
            // #RRGGBBAA (8-digit hex code: #RRGGBBAA)
            r = Color._clampInt(parseInt(hex.slice(0, 2), 16), 0, 255);
            g = Color._clampInt(parseInt(hex.slice(2, 4), 16), 0, 255);
            b = Color._clampInt(parseInt(hex.slice(4, 6), 16), 0, 255);
            a = Color._clampFloat(parseInt(hex.slice(6, 8), 16) / 255, 0, 1);
        } else {
            throw new Error('Invalid hex length');
        }
        if (
            typeof r !== 'number' || isNaN(r) ||
            typeof g !== 'number' || isNaN(g) ||
            typeof b !== 'number' || isNaN(b)
        ) {
            throw new Error('Failed to parse hex color channels');
        }
        return new Color(r, g, b, a);
    }

    /**
     * Parses an RGB or RGBA color string and returns a Color instance.
     *
     * Supported formats:
     * - rgb(r, g, b)
     * - rgba(r, g, b, a) (alpha as float)
     * - rgba(r, g, b, a%) (alpha as percentage)
     *
     * @private
     * @static
     * @param {string} str - The RGB(A) color string to parse.
     * @returns {Color} A Color instance representing the parsed color.
     * @throws {Error} If the input string is not a valid RGB(A) format.
     */
    static _parseRgb(str) {
        const m = str.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*(?:,\s*([0-9]*\.?[0-9]+%?)\s*)?\)$/);
        if (!m) throw new Error('Invalid RGB format');
        const r = Color._clampInt(parseInt(m[1], 10), 0, 255);
        const g = Color._clampInt(parseInt(m[2], 10), 0, 255);
        const b = Color._clampInt(parseInt(m[3], 10), 0, 255);
        let a = 1;
        if (m[4] !== undefined) {
            if (m[4].endsWith('%')) {
                a = Color._clampFloat(parseFloat(m[4]) / 100, 0, 1);
            } else {
                a = Color._clampFloat(parseFloat(m[4]), 0, 1);
            }
        }
        return new Color(r, g, b, a);
    }

    /**
     * Parses an HSL or HSLA color string and returns a Color instance.
     *
     * Supported formats:
     * - hsl(h, s%, l%)
     * - hsla(h, s%, l%, a) (alpha as float)
     * - hsla(h, s%, l%, a%) (alpha as percentage)
     *
     * @private
     * @param {string} str - The HSL(A) color string to parse.
     * @returns {Color} A new Color instance representing the parsed color.
     * @throws {Error} If the input string is not a valid HSL(A) format.
     */
    static _parseHsl(str) {
        const m = str.match(/^hsla?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%\s*(?:,\s*([0-9]*\.?[0-9]+%?)\s*)?\)$/);
        if (!m) throw new Error('Invalid HSL format');
        const h = Color._clampInt(parseInt(m[1], 10), 0, 360);
        const s = Color._clampInt(parseInt(m[2], 10), 0, 100);
        const l = Color._clampInt(parseInt(m[3], 10), 0, 100);
        const [r, g, b] = Color.hslToRgb(h, s, l);
        let a = 1;
        if (m[4] !== undefined) {
            if (m[4].endsWith('%')) {
                a = Color._clampFloat(parseFloat(m[4]) / 100, 0, 1);
            } else {
                a = Color._clampFloat(parseFloat(m[4]), 0, 1);
            }
        }
        return new Color(r, g, b, a);
    }

    /**
     * Parses an HSV(A) color string and returns a Color instance.
     *
     * Supported formats:
     *   - hsv(h, s%, v%)
     *   - hsva(h, s%, v%, a) (alpha as float)
     *   - hsva(h, s%, v%, a%) (alpha as percentage)
     *
     * @private
     * @param {string} str - The HSV(A) color string to parse.
     * @returns {Color} The parsed Color instance.
     * @throws {Error} If the input string is not a valid HSV(A) format.
     */
    static _parseHsv(str) {
        const m = str.match(/^hsva?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%\s*(?:,\s*([0-9]*\.?[0-9]+%?)\s*)?\)$/);
        if (!m) throw new Error('Invalid HSV format');
        const h = Color._clampInt(parseInt(m[1], 10), 0, 360);
        const s = Color._clampInt(parseInt(m[2], 10), 0, 100);
        const v = Color._clampInt(parseInt(m[3], 10), 0, 100);
        const [r, g, b] = Color.hsvToRgb(h, s, v);
        let a = 1;
        if (m[4] !== undefined) {
            if (m[4].endsWith('%')) {
                a = Color._clampFloat(parseFloat(m[4]) / 100, 0, 1);
            } else {
                a = Color._clampFloat(parseFloat(m[4]), 0, 1);
            }
        }
        return new Color(r, g, b, a);
    }

    /**
     * Converts the color instance to a plain object with RGBA properties.
     * @returns {{ r: number, g: number, b: number, a: number }} An object representing the color's red, green, blue, and alpha values.
     */
    toObject() {
        return { r: this.r, g: this.g, b: this.b, a: this.a };
    }

    /**
     * Creates a new Color instance from an object containing color properties.
     *
     * @param {Object} obj - The object containing color properties.
     * @param {number} obj.r - The red component (0-255).
     * @param {number} obj.g - The green component (0-255).
     * @param {number} obj.b - The blue component (0-255).
     * @param {number} [obj.a=1] - The alpha component (0-1). Defaults to 1 if not provided.
     * @returns {Color} A new Color instance.
     */
    static fromObject(obj) {
        return new Color(obj.r, obj.g, obj.b, obj.a ?? 1);
    }

    /**
     * Converts the current instance to a plain object suitable for JSON serialization.
     * @returns {Object} The object representation of the instance.
     */
    toJSON() {
        return this.toObject();
    }

    /**
     * Creates a Color instance from a JSON object.
     * @param {Object} json - The JSON object representing a color.
     * @returns {Color} The created Color instance.
     */
    static fromJSON(json) {
        return Color.fromObject(json);
    }

    // ==========================================
    // 8. Static Color Space Conversion Utilities
    // ==========================================

    /**
     * Convert RGB to HWB color space.
     * @static
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @returns {number[]} [hue, whiteness, blackness]
     */
    static rgbToHwb(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const h = Color.rgbToHsl(r * 255, g * 255, b * 255)[0];
        const w = min * 100;
        const bk = (1 - max) * 100;
        return [Math.round(h), Math.round(w), Math.round(bk)];
    }

    /**
     * Convert HWB to RGB color space.
     * @static
     * @param {number} h Hue (0-360)
     * @param {number} w Whiteness (0-100)
     * @param {number} b Blackness (0-100)
     * @returns {number[]} [r, g, b]
     */
    static hwbToRgb(h, w, b) {
        // h in [0,360], w/b in [0,100]
        h = ((h % 360) + 360) % 360;
        w = Math.min(100, Math.max(0, w)) / 100;
        b = Math.min(100, Math.max(0, b)) / 100;
        const ratio = w + b;
        if (ratio > 1) {
            w /= ratio;
            b /= ratio;
        }
        const [r, g, bl] = Color.hslToRgb(h, 100, 50);
        return [
            Math.round((r / 255 * (1 - w - b) + w) * 255),
            Math.round((g / 255 * (1 - w - b) + w) * 255),
            Math.round((bl / 255 * (1 - w - b) + w) * 255)
        ];
    }

    /**
     * Convert RGB to LCH color space.
     * @static
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @returns {number[]} [lightness, chroma, hue]
     */
    static rgbToLch(r, g, b) {
        // Convert to Lab first
        const lab = Color.rgbToLab(r, g, b);
        const l = lab.l;
        const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
        let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
        if (h < 0) h += 360;
        return [l, c, h];
    }

    /**
     * Convert LCH to RGB color space.
     * @static
     * @param {number} l Lightness
     * @param {number} c Chroma
     * @param {number} h Hue
     * @returns {number[]} [r, g, b]
     */
    static lchToRgb(l, c, h) {
        // Convert LCH to Lab
        const hr = h * Math.PI / 180;
        const a = c * Math.cos(hr);
        const b = c * Math.sin(hr);
        return Color.labToRgb(l, a, b);
    }

    /**
     * Convert RGB to Lab color space.
     * @static
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @returns {{l: number, a: number, b: number}} Lab color object
     */
    static rgbToLab(r, g, b) {
        // sRGB to XYZ
        r /= 255; g /= 255; b /= 255;
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
        x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + 16 / 116;
        y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + 16 / 116;
        z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + 16 / 116;
        return {
            l: (116 * y) - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    /**
     * Convert Lab to RGB color space.
     * @static
     * @param {number} l Lightness
     * @param {number} a Green-Red
     * @param {number} b Blue-Yellow
     * @returns {number[]} [r, g, b]
     */
    static labToRgb(l, a, b) {
        // Lab to XYZ
        let y = (l + 16) / 116;
        let x = a / 500 + y;
        let z = y - b / 200;
        const y3 = Math.pow(y, 3);
        const x3 = Math.pow(x, 3);
        const z3 = Math.pow(z, 3);
        y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
        x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
        z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;
        x *= 0.95047;
        z *= 1.08883;
        // XYZ to sRGB
        let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
        let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
        let bl = x * 0.0557 + y * -0.2040 + z * 1.0570;
        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
        bl = bl > 0.0031308 ? 1.055 * Math.pow(bl, 1 / 2.4) - 0.055 : 12.92 * bl;
        return [
            Color._clampInt(r * 255, 0, 255),
            Color._clampInt(g * 255, 0, 255),
            Color._clampInt(bl * 255, 0, 255)
        ];
    }

    // Based on https://bottosson.github.io/posts/oklab/
    /**
     * Convert RGB to Oklch color space.
     * @static
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @returns {number[]} [L, C, H]
     */
    static rgbToOklch(r, g, b) {
        // Convert sRGB [0,255] to linear RGB [0,1]
        r = Color._srgbToLinear(r / 255);
        g = Color._srgbToLinear(g / 255);
        b = Color._srgbToLinear(b / 255);

        // Linear RGB to LMS
        const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
        const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
        const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

        // LMS to Oklab
        const l_ = Math.cbrt(l);
        const m_ = Math.cbrt(m);
        const s_ = Math.cbrt(s);

        const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
        const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
        const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

        // Oklab to Oklch
        const C = Math.sqrt(a * a + b_ * b_);
        let H = Math.atan2(b_, a) * 180 / Math.PI;
        if (H < 0) H += 360;
        return [L, C, H];
    }

    /**
     * Convert Oklch to RGB color space.
     * @static
     * @param {number} L Lightness
     * @param {number} C Chroma
     * @param {number} H Hue
     * @returns {number[]} [r, g, b]
     */
    static oklchToRgb(L, C, H) {
        // Oklch to Oklab
        const hRad = H * Math.PI / 180;
        const a = C * Math.cos(hRad);
        const b_ = C * Math.sin(hRad);

        // Oklab to LMS
        const l_ = L + 0.3963377774 * a + 0.2158037573 * b_;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b_;
        const s_ = L - 0.0894841775 * a - 1.2914855480 * b_;

        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;

        // LMS to linear RGB
        let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        let b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        // Linear RGB to sRGB [0,255]
        r = Color._linearToSrgb(r);
        g = Color._linearToSrgb(g);
        b = Color._linearToSrgb(b);
        return [
            Color._clampInt(r * 255, 0, 255),
            Color._clampInt(g * 255, 0, 255),
            Color._clampInt(b * 255, 0, 255)
        ];
    }

    /**
     * Convert RGBA values to a hex color string.
     * @static
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @param {number} [a=1] Alpha channel (0-1)
     * @param {boolean} [includeAlpha=false] Whether to include alpha in hex string
     * @returns {string} Hex color string
     */
    static rgbToHex(r, g, b, a = 1, includeAlpha = false) {
        r = Color._clampInt(r, 0, 255);
        g = Color._clampInt(g, 0, 255);
        b = Color._clampInt(b, 0, 255);
        a = Color._clampFloat(a, 0, 1);

        const toHex = (x) => x.toString(16).padStart(2, '0');

        let hex = toHex(r) + toHex(g) + toHex(b);
        if (includeAlpha) {
            hex += toHex(Math.round(a * 255));
        }
        return '#' + hex;
    }

    /**
     * Convert RGB to HSL color space.
     * @static
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @returns {number[]} [hue, saturation, lightness]
     */
    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; 
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
                case g:
                h = (b - r) / d + 2;
                break;
                case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
        }
        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    /**
     * Convert RGB to HSV color space.
     * @static
     * @param {number} r Red channel (0-255)
     * @param {number} g Green channel (0-255)
     * @param {number} b Blue channel (0-255)
     * @returns {number[]} [hue, saturation, value]
     */
    static rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
        let h, s, v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
                case g:
                h = (b - r) / d + 2;
                break;
                case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
        }
        return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
    }

    /**
     * Convert HSV to RGB color space.
     * @static
     * @param {number} h Hue (0-360)
     * @param {number} s Saturation (0-100)
     * @param {number} v Value (0-100)
     * @returns {number[]} [r, g, b]
     */
    static hsvToRgb(h, s, v) {
        h /= 360;
        s /= 100;
        v /= 100;

        const c = v * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = v - c;

        let r, g, b;

        if (h < 1/6) {
            [r, g, b] = [c, x, 0];
        } else if (h < 2/6) {
            [r, g, b] = [x, c, 0];
        } else if (h < 3/6) {
            [r, g, b] = [0, c, x];
        } else if (h < 4/6) {
            [r, g, b] = [0, x, c];
        } else if (h < 5/6) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }

        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    /**
     * Convert HSL to RGB color space.
     * @static
     * @param {number} h Hue (0-360)
     * @param {number} s Saturation (0-100)
     * @param {number} l Lightness (0-100)
     * @returns {number[]} [r, g, b]
     */
    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;

        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        let r, g, b;

        if (s === 0) {
            r = g = b = l; 
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255),
        ];
    }

    // =========================
    // 9. Internal Helpers
    // =========================
    static _clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    /**
     * Clamp a value to an integer within a specified range.
     * @static
     * @param {number} value Value to clamp
     * @param {number} min Minimum value
     * @param {number} max Maximum value
     * @returns {number} Clamped integer
     */
    static _clampInt(value, min, max) {
        const v = Math.round(Number(value) || 0);
        return Color._clamp(v, min, max);
    }

    /**
     * Clamp a value to a float within a specified range.
     * @static
     * @param {number} value Value to clamp
     * @param {number} min Minimum value
     * @param {number} max Maximum value
     * @returns {number} Clamped float
     */
    static _clampFloat(value, min, max) {
        let v = Number(value);
        if (isNaN(v)) return min;
        return Color._clamp(v, min, max);
    }

    /**
     * Convert sRGB to linear RGB.
     * @static
     * @param {number} c sRGB value
     * @returns {number} Linear RGB value
     */
    static _srgbToLinear(c) {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    /**
     * Convert linear RGB to sRGB.
     * @static
     * @param {number} c Linear RGB value
     * @returns {number} sRGB value
     */
    static _linearToSrgb(c) {
        return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
    
    /**
     * Compile color representations to specified formats and cache them.
     * @private
     * @param {...string} formats List of formats to compile (e.g., 'hex', 'rgb', 'hsl').
     */
    _compileTo(...formats) {
        for (const fmt of formats) {
            switch (fmt) {
                case 'hex': // includes hex8 + shorthand
                    this._compiled.hex = Color.rgbToHex(this.r, this.g, this.b, this.a, false);
                break;
                case 'hexa':
                    this._compiled.hexa = Color.rgbToHex(this.r, this.g, this.b, this.a, true);
                break;
                case 'hwba': {
                    const [h, w, b] = Color.rgbToHwb(this.r, this.g, this.b);
                    this._compiled.hwba = `hwb(${h},${w}%,${b}%,${this.a})`;
                    break;
                }
                case 'hwb': {
                    const [h, w, b] = Color.rgbToHwb(this.r, this.g, this.b);
                    this._compiled.hwb = `hwb(${h},${w}%,${b}%)`;
                    break;
                }
                case 'lcha': {
                    const [l, c, h] = Color.rgbToLch(this.r, this.g, this.b);
                    this._compiled.lcha = `lch(${l.toFixed(2)} ${c.toFixed(2)} ${h.toFixed(2)} / ${this.a})`;
                    break;
                }
                case 'lch': {
                    const [l, c, h] = Color.rgbToLch(this.r, this.g, this.b);
                    this._compiled.lch = `lch(${l.toFixed(2)} ${c.toFixed(2)} ${h.toFixed(2)})`;
                    break;
                }
                case 'rgba':
                    this._compiled.rgba = `rgba(${this.r},${this.g},${this.b},${this.a})`;
                break;
                case 'rgb':
                    this._compiled.rgb = `rgb(${this.r},${this.g},${this.b})`;
                break;
                case 'hsla': {
                    const [h, s, l] = this._getHsl();
                    this._compiled.hsla = `hsla(${h},${s}%,${l}%,${this.a})`;
                    break;
                }
                case 'hsl': {
                    const [h, s, l] = this._getHsl();
                    this._compiled.hsl = `hsl(${h},${s}%,${l}%)`;
                    break;
                }
                case 'hsva': {
                    const [h, s, v] = this._getHsv();
                    this._compiled.hsva = `hsva(${h},${s}%,${v}%,${this.a})`;
                    break;
                }
                case 'hsv': {
                    const [h, s, v] = this._getHsv();
                    this._compiled.hsv = `hsv(${h},${s}%,${v}%)`;
                    break;
                }
                case 'oklcha': {
                    const [l, c, h] = this.getOklch();
                    this._compiled.oklcha = `oklch(${(l*100).toFixed(2)}% ${c.toFixed(4)} ${h.toFixed(2)} / ${this.a})`;
                    break;
                }
                case 'oklch': {
                    const [l, c, h] = this.getOklch();
                    this._compiled.oklch = `oklch(${(l*100).toFixed(2)}% ${c.toFixed(4)} ${h.toFixed(2)})`;
                    break;
                }
                default:
                    throw new Error(`Unsupported format: ${fmt}`);
            }
        }
    }

    /**
     * Clear cached color representations and HSL/HSV values.
     * @private
     */
    _clearCache() {
        this._compiled = {};
        this._h = this._s = this._l = this._v = null;
    }
};
export default Color;