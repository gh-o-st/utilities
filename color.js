class Color {

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

    static rgbToHwb(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const h = Color.rgbToHsl(r * 255, g * 255, b * 255)[0];
        const w = min * 100;
        const bk = (1 - max) * 100;
        return [Math.round(h), Math.round(w), Math.round(bk)];
    }

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

    static rgbToLch(r, g, b) {
        // Convert to Lab first
        const lab = Color.rgbToLab(r, g, b);
        const l = lab.l;
        const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
        let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
        if (h < 0) h += 360;
        return [l, c, h];
    }

    static lchToRgb(l, c, h) {
        // Convert LCH to Lab
        const hr = h * Math.PI / 180;
        const a = c * Math.cos(hr);
        const b = c * Math.sin(hr);
        return Color.labToRgb(l, a, b);
    }

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

    static _srgbToLinear(c) {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    static _linearToSrgb(c) {
        return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }

    getOklch() {
        return Color.rgbToOklch(this.r, this.g, this.b);
    }

    setOklch(l, c, h, a = this.a) {
        const [r, g, b] = Color.oklchToRgb(l, c, h);
        return this.setRgb(r, g, b, a);
    }

    equals(otherColor) {
        if (!(otherColor instanceof Color)) {
            return false;
        }
        return this.r === otherColor.r &&
            this.g === otherColor.g &&
            this.b === otherColor.b &&
            this.a === otherColor.a;
    }

    getColor(format = 'rgba') {
        if (!this._compiled[format]) {
            this._compileTo(format);
        }
        return this._compiled[format];
    }


    getLuminance() {
        const rgb = [this.r, this.g, this.b].map(v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

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

    isContrastSufficient(against, level = 'AA', textSize = 'normal') {
        const ratio = this.getContrast(against);
        if (level === 'AAA') {
            return textSize === 'large' ? ratio >= 4.5 : ratio >= 7;
        } else {
            return textSize === 'large' ? ratio >= 3 : ratio >= 4.5;
        }
    }

    setRgb(r, g, b, a = this.a) {
        this.r = Color._clampInt(r, 0, 255);
        this.g = Color._clampInt(g, 0, 255);
        this.b = Color._clampInt(b, 0, 255);
        this.a = Color._clampFloat(a, 0, 1);
        this._clearCache();
        return this;
    }

    setHsl(h, s, l, a = this.a) {
        const [r, g, b] = Color.hslToRgb(h, s, l);
        return this.setRgb(r, g, b, a);
    }

    setHsv(h, s, v, a = this.a) {
        const [r, g, b] = Color.hsvToRgb(h, s, v);
        return this.setRgb(r, g, b, a);
    }

    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }

    mix(otherColor, blendRatio = 0.5) {
        blendRatio = Color._clampFloat(blendRatio, 0, 1);
        const lerp = (start, end) => start + (end - start) * blendRatio;

        return new Color(
            lerp(this.r, otherColor.r),
            lerp(this.g, otherColor.g),
            lerp(this.b, otherColor.b),
            lerp(this.a, otherColor.a)
        );
    }

    mixSelf(otherColor, blendRatio = 0.5) {
        blendRatio = Color._clampFloat(blendRatio, 0, 1);
        const lerp = (start, end) => start + (end - start) * blendRatio;

        const newR = lerp(this.r, otherColor.r);
        const newG = lerp(this.g, otherColor.g);
        const newB = lerp(this.b, otherColor.b);
        const newA = lerp(this.a, otherColor.a);

        return this.setRgb(newR, newG, newB, newA);
    }

    lighten(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newL = Math.min(100, l + percent);
            return { h, s, l: newL };
        }, false);
    }

    lightenSelf(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newL = Math.min(100, l + percent);
            return { h, s, l: newL };
        }, true);
    }

    darken(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newL = Math.max(0, l - percent);
            return { h, s, l: newL };
        }, false);
    }

    darkenSelf(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newL = Math.max(0, l - percent);
            return { h, s, l: newL };
        }, true);
    }

    saturate(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newS = Math.min(100, s + percent);
            return { h, s, l: newS };
        }, false);
    }

    saturateSelf(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newS = Math.min(100, s + percent);
            return { h, s, l: newS };
        }, true);
    }

    desaturate(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newS = Math.max(0, s - percent);
            return { h, s, l: newS };
        }, false);
    }

    desaturateSelf(percent) {
        percent = Color._clampFloat(percent, 0, 100);
        return this.transform(({ h, s, l }) => {
            const newS = Math.max(0, s - percent);
            return { h, s, l: newS };
        }, true);
    }

    shift(degrees) {
        degrees = degrees % 360;
        if (degrees < 0) degrees += 360;

        return this.transform(({ h, s, l }) => {
            const newH = (h + degrees) % 360;
            return { h: newH, s, l };
        }, false);
    }

    shiftSelf(degrees) {
        degrees = degrees % 360;
        if (degrees < 0) degrees += 360;

        return this.transform(({ h, s, l }) => {
            const newH = (h + degrees) % 360;
            return { h: newH, s, l };
        }, true);
    }

    invert() {
        return new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a);
    }

    invertSelf() {
        return this.setRgb(255 - this.r, 255 - this.g, 255 - this.b, this.a);
    }

    complement() {
        return this.transform(({ h, s, l }) => {
            const newH = (h + 180) % 360;
            return { h: newH, s, l };
        }, false);
    }

    complementSelf() {
        return this.transform(({ h, s, l }) => {
            const newH = (h + 180) % 360;
            return { h: newH, s, l };
        }, true);
    }

    getComplementary() {

    }

    getAnalagous() {

    }

    getAdjacent() {

    }

    getTriad() {

    }

    getTetrad() {

    }

    distance(to) {
        if (!(to instanceof Color)) {
            throw new TypeError('distance expects a Color instance');
        }

        const dr = this.r - to.r;
        const dg = this.g - to.g;
        const db = this.b - to.b;

        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    warm(amount = 10) {
        amount = Color._clampFloat(amount, 0, 100);
        return this.transform(({ h, s, l }) => {
            let newH = h;
            if (h > 60 && h < 180) {
                newH = h - (amount * 1.2);
            } else if (h >= 180 && h < 300) {
                newH = h - (amount * 2);
            }
            newH = (newH + 360) % 360;
            return { h: newH, s, l };
        }, false);
    }

    warmSelf(amount = 10) {
        amount = Color._clampFloat(amount, 0, 100);
        return this.transform(({ h, s, l }) => {
            let newH = h;
            if (h > 60 && h < 180) {
                newH = h - (amount * 1.2);
            } else if (h >= 180 && h < 300) {
                newH = h - (amount * 2);
            }
            newH = (newH + 360) % 360;
            return { h: newH, s, l };
        }, true);
    }

    cool(amount = 10) {
        amount = Color._clampFloat(amount, 0, 100);
        return this.transform(({ h, s, l }) => {
            let newH = h;
            if (h >= 0 && h < 120) {
                newH = h + (amount * 1.5);
            } else if (h >= 120 && h < 180) {
                newH = h + (amount * 1.2);
            }
            newH = newH % 360;
            return { h: newH, s, l };
        }, false);
    }

    coolSelf(amount = 10) {
        amount = Color._clampFloat(amount, 0, 100);
        return this.transform(({ h, s, l }) => {
            let newH = h;
            if (h >= 0 && h < 120) {
                newH = h + (amount * 1.5);
            } else if (h >= 120 && h < 180) {
                newH = h + (amount * 1.2);
            }
            newH = newH % 360;
            return { h: newH, s, l };
        }, true);
    }

    _toLab() {

        let [r, g, b] = [this.r / 255, this.g / 255, this.b / 255];

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
        const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
        const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

        const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
        const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
        const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

        return {
            l: 116 * fy - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz)
        };
    }

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

    _getHsl() {
        if (this._h === null || this._s === null || this._l === null) {
            [this._h, this._s, this._l] = Color.rgbToHsl(this.r, this.g, this.b);
        }
        return [this._h, this._s, this._l];
    }

    _getHsv() {
        if (this._h === null || this._s === null || this._v === null) {
            [this._h, this._s, this._v] = Color.rgbToHsv(this.r, this.g, this.b);
        }
        return [this._h, this._s, this._v];
    }

    toString() {
        return this.getColor('rgba');
    }

    static fromString(colorString) {
        // hwb() and hwb(a)
        const hwbMatch = colorString.match(/^hwb\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%(?:,\s*(\d*\.?\d+))?\)$/);
        if (hwbMatch) {
            const h = parseInt(hwbMatch[1], 10);
            const w = parseInt(hwbMatch[2], 10);
            const b = parseInt(hwbMatch[3], 10);
            const a = hwbMatch[4] !== undefined ? parseFloat(hwbMatch[4]) : 1;
            const [r, g, bl] = Color.hwbToRgb(h, w, b);
            return new Color(r, g, bl, a);
        }
        // lch() and lch(a)
        const lchMatch = colorString.match(/^lch\((\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?\)$/);
        if (lchMatch) {
            const l = parseFloat(lchMatch[1]);
            const c = parseFloat(lchMatch[2]);
            const h = parseFloat(lchMatch[3]);
            const a = lchMatch[4] !== undefined ? parseFloat(lchMatch[4]) : 1;
            const [r, g, b] = Color.lchToRgb(l, c, h);
            return new Color(r, g, b, a);
        }
        // oklch() and oklcha()
        const oklchMatch = colorString.match(/^oklch\((\d*\.?\d+)%?\s+(\d*\.?\d+)\s+(\d*\.?\d+)(?:deg)?(?:\s*\/\s*(\d*\.?\d+))?\)$/);
        if (oklchMatch) {
            // L in [0,1] or [0,100], C and H as floats, alpha optional
            let l = parseFloat(oklchMatch[1]);
            if (l > 1) l = l / 100;
            const c = parseFloat(oklchMatch[2]);
            const h = parseFloat(oklchMatch[3]);
            const a = oklchMatch[4] !== undefined ? parseFloat(oklchMatch[4]) : 1;
            const [r, g, b] = Color.oklchToRgb(l, c, h);
            return new Color(r, g, b, a);
        }
        if (typeof colorString !== 'string') {
            throw new TypeError('Color.fromString expects a string');
        }

        colorString = colorString.trim().toLowerCase();

        const hexMatch = colorString.match(/^#([0-9a-f]{3,8})$/i);
        if (hexMatch) {
            let hex = hexMatch[1];
            if (hex.length === 3) {

                hex = hex.split('').map((x) => x + x).join('');
            } else if (hex.length === 4) {

                hex = hex
                .split('')
                .map((x) => x + x)
                .join('');
            } else if (hex.length === 6) {

            } else if (hex.length === 8) {

            } else {
                throw new Error('Invalid hex color format');
            }

            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            let a = 1;

            if (hex.length === 8) {
                a = parseInt(hex.slice(6, 8), 16) / 255;
            }
            return new Color(r, g, b, a);
        }

        const rgbaMatch = colorString.match(/^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(\d*\.?\d+))?\)$/);
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1], 10);
            const g = parseInt(rgbaMatch[2], 10);
            const b = parseInt(rgbaMatch[3], 10);
            const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
            return new Color(r, g, b, a);
        }

        const hslaMatch = colorString.match(/^hsla?\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%(?:,\s*(\d*\.?\d+))?\)$/);
        if (hslaMatch) {
            const h = parseInt(hslaMatch[1], 10);
            const s = parseInt(hslaMatch[2], 10);
            const l = parseInt(hslaMatch[3], 10);
            const a = hslaMatch[4] !== undefined ? parseFloat(hslaMatch[4]) : 1;
            const [r, g, b] = Color.hslToRgb(h, s, l);
            return new Color(r, g, b, a);
        }

        const hsvaMatch = colorString.match(/^hsva?\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%(?:,\s*(\d*\.?\d+))?\)$/);
        if (hsvaMatch) {
            const h = parseInt(hsvaMatch[1], 10);
            const s = parseInt(hsvaMatch[2], 10);
            const v = parseInt(hsvaMatch[3], 10);
            const a = hsvaMatch[4] !== undefined ? parseFloat(hsvaMatch[4]) : 1;
            const [r, g, b] = Color.hsvToRgb(h, s, v);
            return new Color(r, g, b, a);
        }

        throw new Error('Unsupported color string format: ' + colorString);
    }

    toObject() {
        return { r: this.r, g: this.g, b: this.b, a: this.a };
    }

    static fromObject(obj) {
        return new Color(obj.r, obj.g, obj.b, obj.a ?? 1);
    }

    toJSON() {
        return this.toObject();
    }

    static fromJSON(json) {
        return Color.fromObject(json);
    }

    static _clampInt(value, min, max) {
        const v = Math.round(Number(value) || 0);
        return Math.min(max, Math.max(min, v));
    }

    static _clampFloat(value, min, max) {
        let v = Number(value);
        if (isNaN(v)) return min;
        return Math.min(max, Math.max(min, v));
    }

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

    _clearCache() {
        this._compiled = {};
        this._h = this._s = this._l = this._v = null;
    }
}

export default Color;