/**
 * Utility class for generating and caching procedural noise textures.
 * Supports monochrome, RGB, and RGBA noise generation with optional caching and localStorage persistence.
 */
export default class Noise {
    /**
     * Internal cache for generated noise textures.
     * @type {Map<string, Uint8Array>}
     * @private
     */
    static #cache = new Map();
    static #dbName = 'NoiseTextureCacheDB';
    static #storeName = 'textures';

    /**
     * Optional callback for cache status updates. Set this to a function to receive notifications.
     * @type {function|null}
     */
    static onCacheStatusUpdate = null;

    /**
     * Generates a noise texture as a Uint8Array.
     * @param {number} width - Width of the texture.
     * @param {number} height - Height of the texture.
     * @param {object} [options={}] - Configuration options for noise generation.
     * @param {number} [options.seed] - Seed for random generation. Defaults to a random number.
     * @param {number} [options.channels=4] - Number of color channels (1: monochrome, 3: RGB, 4: RGBA).
     * @param {boolean} [options.useCache=true] - Whether to use cached results.
     * @param {'random'|'perlin'|'simplex'|'worley'|'voronoi'} [options.type='random'] - Type of noise to generate.
     * @param {number} [options.scale=0.01] - Frequency/scale for Perlin/Simplex noise. Lower values zoom in.
     * @param {number} [options.octaves=1] - Number of noise layers for fractal Perlin/Simplex noise.
     * @param {number} [options.persistence=0.5] - Amplitude multiplier for each octave.
     * @param {number} [options.lacunarity=2.0] - Frequency multiplier for each octave.
     * @param {number} [options.numPoints=10] - Number of feature points for Worley/Voronoi noise.
     * @param {'euclidean'|'manhattan'|'chebyshev'} [options.distanceMetric='euclidean'] - Distance metric for Worley/Voronoi.
     * @returns {Promise<Uint8Array>} The generated noise data.
     */
    static async generate(width, height, options = {}) {
        const defaultOptions = {
            seed: Math.floor(Math.random() * 1e9),
            channels: 4,
            useCache: true,
            type: 'random',
            scale: 0.01,
            octaves: 1,
            persistence: 0.5,
            lacunarity: 2.0,
            numPoints: 10,
            distanceMetric: 'euclidean'
        };
        const opts = { ...defaultOptions, ...options };

        const key = await NoiseUtils.hashParamsToKey({ width, height, ...opts });
        if (opts.useCache && this.#cache.has(key)) {
            return this.#cache.get(key);
        }

        let data;
        switch (opts.type) {
            case 'random':
                data = RandomNoise.generate(width, height, opts);
                break;
            case 'perlin':
                data = PerlinNoise.generate(width, height, opts);
                break;
            case 'simplex':
                data = SimplexNoise.generate(width, height, opts);
                break;
            case 'worley':
                data = WorleyNoise.generate(width, height, opts);
                break;
            case 'voronoi':
                data = VoronoiNoise.generate(width, height, opts);
                break;
            default:
                throw new Error(`Unsupported noise type: ${opts.type}`);
        }

        if (opts.useCache) {
            this.#cache.set(key, data);
            await this._updateTextureInIndexedDB(key, data);
        }
        return data;
    }

    /**
     * Generates and downloads a noise texture image file.
     * @param {string} filename - Name of the file to download.
     * @param {number} width - Width of the texture.
     * @param {number} height - Height of the texture.
     * @param {object} [options={}] - Configuration options for noise generation. See `generate` for details.
     * @returns {Promise<void>} Promise resolving when download is triggered.
     */
    static async download(filename, width, height, options = {}) {
        const channels = options.channels || 4;
        const format = options.format || (channels === 4 ? 'webp' : (channels === 3 || channels === 1 ? 'bmp' : 'webp'));
        let blob;
        blob = await this.#toBlob(width, height, options, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Gets the current size of the cache.
     * @returns {number} The number of items stored in the cache.
     */
    static get cacheSize() {
        return this.#cache.size;
    }

    /**
     * Clears the internal cache and updates localStorage.
     */
    static async clearCache() {
        this.#cache.clear();
        await this._clearIndexedDBStore();
    }

    /**
     * Loads the cache from localStorage on class initialization.
     */
    static {
        this._loadCacheFromIndexedDB();
    }

    /**
     * Generates a noise texture and returns it as an image Blob.
     * @param {number} width - Width of the texture.
     * @param {number} height - Height of the texture.
     * @param {object} [options={}] - Configuration options for noise generation. See `generate` for details.
     * @returns {Promise<Blob>} Promise resolving to the image Blob.
     * @private
     */
    static async #toBlob(width, height, options = {}, format = 'webp') {
        const noiseData = await this.generate(width, height, options);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        let imageData;

        // Create ImageData from noiseData based on channels
        const channels = options.channels || 4;
        // Ensure format is set
        if (!format) {
            if (channels === 4) {
                format = 'webp';
            } else if (channels === 3 || channels === 1) {
                format = 'bmp';
            } else {
                format = 'webp';
            }
        }

        if (channels === 1) {
            imageData = ctx.createImageData(width, height);
            for (let i = 0; i < noiseData.length; i++) {
                const pixelIndex = i * 4;
                const grayValue = noiseData[i];
                imageData.data[pixelIndex] = grayValue;
                imageData.data[pixelIndex + 1] = grayValue;
                imageData.data[pixelIndex + 2] = grayValue;
                imageData.data[pixelIndex + 3] = 255;
            }
        } else if (channels === 3) {
            imageData = ctx.createImageData(width, height);
            for (let i = 0; i < width * height; i++) {
                const srcIndex = i * 3;
                const dstIndex = i * 4;
                imageData.data[dstIndex] = noiseData[srcIndex];
                imageData.data[dstIndex + 1] = noiseData[srcIndex + 1];
                imageData.data[dstIndex + 2] = noiseData[srcIndex + 2];
                imageData.data[dstIndex + 3] = 255;
            }
        } else if (channels === 4) {
            imageData = new ImageData(new Uint8ClampedArray(noiseData), width, height);
        }
        ctx.putImageData(imageData, 0, 0);

        // WebP output for 4 channels
        if (format === 'webp') {
            return new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/webp');
            });
        }

        // BMP output for 3 channels
        if (format === 'bmp') {
            // BMP encoding (24-bit, no alpha)
            // BMP header sizes
            const fileHeaderSize = 14;
            const dibHeaderSize = 40;
            const rowSize = Math.floor((24 * width + 31) / 32) * 4;
            const pixelArraySize = rowSize * height;
            const fileSize = fileHeaderSize + dibHeaderSize + pixelArraySize;
            const buffer = new ArrayBuffer(fileSize);
            const view = new DataView(buffer);
            let offset = 0;
            // BITMAPFILEHEADER
            view.setUint8(offset, 0x42); offset++; // 'B'
            view.setUint8(offset, 0x4D); offset++; // 'M'
            view.setUint32(offset, fileSize, true); offset += 4; // file size
            view.setUint16(offset, 0, true); offset += 2; // reserved1
            view.setUint16(offset, 0, true); offset += 2; // reserved2
            view.setUint32(offset, fileHeaderSize + dibHeaderSize, true); offset += 4; // pixel data offset
            // BITMAPINFOHEADER
            view.setUint32(offset, dibHeaderSize, true); offset += 4; // header size
            view.setInt32(offset, width, true); offset += 4; // width
            view.setInt32(offset, height, true); offset += 4; // height
            view.setUint16(offset, 1, true); offset += 2; // planes
            view.setUint16(offset, 24, true); offset += 2; // bits per pixel
            view.setUint32(offset, 0, true); offset += 4; // compression (none)
            view.setUint32(offset, pixelArraySize, true); offset += 4; // image size
            view.setInt32(offset, 2835, true); offset += 4; // x pixels per meter
            view.setInt32(offset, 2835, true); offset += 4; // y pixels per meter
            view.setUint32(offset, 0, true); offset += 4; // colors used
            view.setUint32(offset, 0, true); offset += 4; // important colors
            // Pixel array (bottom-up)
            const padding = rowSize - width * 3;
            for (let y = height - 1; y >= 0; y--) {
                for (let x = 0; x < width; x++) {
                    const srcIdx = (y * width + x) * 3;
                    // BMP uses BGR order
                    view.setUint8(offset++, imageData.data[srcIdx + 2]); // B
                    view.setUint8(offset++, imageData.data[srcIdx + 1]); // G
                    view.setUint8(offset++, imageData.data[srcIdx]);     // R
                }
                // Padding
                for (let p = 0; p < padding; p++) {
                    view.setUint8(offset++, 0);
                }
            }
            return new Blob([buffer], { type: 'image/bmp' });
        }

        // fallback: PNG
        return new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png');
        });
    }

    /**
     * Opens the IndexedDB database and returns a db instance.
     * @private
     */
    static _openDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(this.#dbName, 1);
            request.onupgradeneeded = function (event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(Noise.#storeName)) {
                    db.createObjectStore(Noise.#storeName);
                }
            };
            request.onsuccess = function (event) {
                resolve(event.target.result);
            };
            request.onerror = function (event) {
                reject(event.target.error);
            };
        });
    }

    /**
     * Updates or adds a single texture in IndexedDB.
     * @private
     */
    static async _updateTextureInIndexedDB(key, value) {
        try {
            const db = await this._openDB();
            const tx = db.transaction(this.#storeName, 'readwrite');
            const store = tx.objectStore(this.#storeName);
            store.put(Array.from(value), key);
            tx.oncomplete = () => {
                if (typeof this.onCacheStatusUpdate === 'function') {
                    this.onCacheStatusUpdate();
                }
                db.close();
            };
        } catch (e) {
            console.warn('Failed to update texture in IndexedDB:', e);
        }
    }

    /**
     * Clears the entire IndexedDB store.
     * @private
     */
    static async _clearIndexedDBStore() {
        try {
            const db = await this._openDB();
            const tx = db.transaction(this.#storeName, 'readwrite');
            const store = tx.objectStore(this.#storeName);
            store.clear();
            tx.oncomplete = () => {
                if (typeof this.onCacheStatusUpdate === 'function') {
                    this.onCacheStatusUpdate();
                }
                db.close();
            };
        } catch (e) {
            console.warn('Failed to clear IndexedDB store:', e);
        }
    }

    /**
     * Loads the cache from IndexedDB.
     * @private
     */
    static _loadCacheFromIndexedDB() {
        this._openDB().then(db => {
            const tx = db.transaction(this.#storeName, 'readonly');
            const store = tx.objectStore(this.#storeName);
            const request = store.getAllKeys();
            request.onsuccess = (event) => {
                const keys = event.target.result;
                if (keys.length === 0) return;
                const valuesReq = store.getAll();
                valuesReq.onsuccess = (ev) => {
                    this.#cache.clear();
                    const values = ev.target.result;
                    for (let i = 0; i < keys.length; i++) {
                        this.#cache.set(keys[i], new Uint8Array(values[i]));
                    }
                    if (typeof this.onCacheStatusUpdate === 'function') {
                        this.onCacheStatusUpdate();
                    }
                    db.close();
                };
            };
            request.onerror = () => db.close();
        }).catch(e => {
            console.warn('Failed to load cache from IndexedDB:', e);
        });
    }
}

/**
 * Utility class containing shared helper functions for noise generation.
 * @private
 */
class NoiseUtils {
    /**
     * Helper to hash parameters into a cache key using SubtleCrypto.digest (SHA-1).
     * @param {object} params - Parameters to hash (will be JSON stringified).
     * @returns {Promise<string>} - Hex string of the SHA-1 hash.
     */
    static async hashParamsToKey(params) {
        const str = JSON.stringify(params);
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Creates a seeded random number generator function.
     * Uses a simple MWC algorithm.
     * @param {number} seed - Seed value.
     * @returns {function(): number} RNG function returning [0, 1).
     */
    static makeRNG(seed) {
        let t = seed;
        return () => {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ t >>> 15, 1 | t);
            r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
            return ((r ^ r >>> 14) >>> 0) / 4294967296;
        };
    }

    /**
     * Creates a permutation table for Perlin/Simplex noise based on a seed.
     * @param {number} seed - The seed for randomization.
     * @returns {Uint8Array} The permutation table.
     */
    static makePermutationTable(seed) {
        const p = new Uint8Array(512);
        const perm = new Uint8Array(256);
        const rand = this.makeRNG(seed);

        for (let i = 0; i < 256; i++) {
            perm[i] = i;
        }

        for (let i = 255; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }

        for (let i = 0; i < 256; i++) {
            p[i] = p[i + 256] = perm[i];
        }
        return p;
    }

    /**
     * Linear interpolation (lerp) function.
     * @param {number} a - Start value.
     * @param {number} b - End value.
     * @param {number} t - Interpolation factor (0 to 1).
     * @returns {number} Interpolated value.
     */
    static lerp(a, b, t) {
        return a + t * (b - a);
    }

    /**
     * Ken Perlin's fade function for smooth interpolation.
     * @param {number} t - Input value (0 to 1).
     * @returns {number} Faded value.
     */
    static fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Calculates the dot product of two 2D vectors.
     * @param {Array<number>} grad - Gradient vector [x, y].
     * @param {number} x - X component of the second vector.
     * @param {number} y - Y component of the second vector.
     * @returns {number} Dot product.
     */
    static dot(grad, x, y) {
        return grad[0] * x + grad[1] * y;
    }

    /**
     * Distance calculation functions for Worley/Voronoi noise.
     */
    static distance = {
        euclidean: (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2),
        manhattan: (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2),
        chebyshev: (x1, y1, x2, y2) => Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2))
    };
}
export { NoiseUtils };

/**
 * Random noise generator class.
 * @private
 */
class RandomNoise {
    static generate(width, height, options) {
        const rand = NoiseUtils.makeRNG(options.seed);
        const size = width * height * options.channels;
        const data = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            data[i] = Math.floor(rand() * 256);
        }
        return data;
    }
}


/**
 * PerlinNoise provides static methods for generating 2D Perlin noise textures.
 * Supports monochrome, RGB, and RGBA output formats, with configurable fractal noise parameters.
 *
 * Main features:
 * - Generates seamless 2D Perlin noise textures for procedural graphics.
 * - Supports multiple channels (grayscale, RGB, RGBA).
 * - Allows control over seed, scale, octaves, persistence, and lacunarity for fractal noise.
 * - Returns Uint8Array data suitable for use in image buffers or WebGL textures.
 *
 * Usage example:
 * ```js
 * const options = {
 *   channels: 3,        // RGB
 *   seed: 42,           // Random seed
 *   scale: 0.05,        // Frequency scale
 *   octaves: 4,         // Fractal layers
 *   persistence: 0.5,   // Amplitude falloff
 *   lacunarity: 2.0     // Frequency multiplier
 * };
 * const texture = PerlinNoise.generate(256, 256, options);
 * // texture is a Uint8Array of length 256*256*3
 * ```
 *
 * Note: While this class's methods are technically not private, they are intended to be used internally.
 * The only public entry points for noise generation should be Noise.generate() or Noise.download().
 */
class PerlinNoise {
    /**
     * Array of gradient vectors used for 2D noise generation.
     * Each gradient is represented as a two-element array [x, y].
     * The gradients are chosen to cover the main directions and diagonals.
     * @private
     * @type {number[][]}
     */
    static #gradients = [
        [1, 1], [-1, 1], [1, -1], [-1, -1],
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    /**
     * Generates a Perlin noise texture with the specified dimensions and options.
     *
     * @param {number} width - The width of the generated texture.
     * @param {number} height - The height of the generated texture.
     * @param {Object} options - Configuration options for noise generation.
     * @param {number} options.channels - Number of channels (1 for monochrome, 3 for RGB, 4 for RGBA).
     * @param {number} options.seed - Seed value for permutation tables.
     * @param {number} options.scale - Scale factor for noise frequency.
     * @param {number} options.octaves - Number of noise octaves for fractal noise.
     * @param {number} options.persistence - Persistence value for fractal noise.
     * @param {number} options.lacunarity - Lacunarity value for fractal noise.
     * @returns {Uint8Array|Array} The generated noise texture data in the appropriate format for the channel count.
     * @throws {Error} If the channel count is not supported (must be 1, 3, or 4).
     */
    static generate(width, height, options) {
        const { channels, seed, scale, octaves, persistence, lacunarity } = options;

        if (channels === 1) {
            const perm = NoiseUtils.makePermutationTable(seed);
            const noiseFunction = (x, y) => this._fractalNoise2D(x, y, perm, octaves, persistence, lacunarity);
            return this._generateMonochrome(width, height, noiseFunction, scale);
        } 
        
        // For multi-channel, create a different permutation table for each channel based on the seed
        const permR = NoiseUtils.makePermutationTable(seed + 1);
        const noiseR = (x, y) => this._fractalNoise2D(x, y, permR, octaves, persistence, lacunarity);

        const permG = NoiseUtils.makePermutationTable(seed + 2);
        const noiseG = (x, y) => this._fractalNoise2D(x, y, permG, octaves, persistence, lacunarity);

        const permB = NoiseUtils.makePermutationTable(seed + 3);
        const noiseB = (x, y) => this._fractalNoise2D(x, y, permB, octaves, persistence, lacunarity);

        if (channels === 3) {
            return this._generateRGB(width, height, noiseR, noiseG, noiseB, scale);
        } 

        if (channels === 4) {
            const permA = NoiseUtils.makePermutationTable(seed + 4);
            const noiseA = (x, y) => this._fractalNoise2D(x, y, permA, octaves, persistence, lacunarity);
            return this._generateRGBA(width, height, noiseR, noiseG, noiseB, noiseA, scale);
        }

        throw new Error("Unsupported channel count. Must be 1, 3, or 4.");
    }

    /**
     * Generates 2D Perlin noise value for given coordinates.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @param {number[]} p - Permutation array used for hashing coordinates.
     * @returns {number} The noise value at the given (x, y) coordinates.
     */
    static _noise2D(x, y, p) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = NoiseUtils.fade(x);
        const v = NoiseUtils.fade(y);
        const A = p[X] + Y, AA = p[A], AB = p[A + 1];
        const B = p[X + 1] + Y, BA = p[B], BB = p[B + 1];
        const grad00 = this.#gradients[AA & 7];
        const grad10 = this.#gradients[BA & 7];
        const grad01 = this.#gradients[AB & 7];
        const grad11 = this.#gradients[BB & 7];
        const n00 = NoiseUtils.dot(grad00, x, y);
        const n10 = NoiseUtils.dot(grad10, x - 1, y);
        const n01 = NoiseUtils.dot(grad01, x, y - 1);
        const n11 = NoiseUtils.dot(grad11, x - 1, y - 1);
        const x1 = NoiseUtils.lerp(n00, n10, u);
        const x2 = NoiseUtils.lerp(n01, n11, u);
        return NoiseUtils.lerp(x1, x2, v);
    }

    /**
     * Generates 2D fractal Perlin noise using multiple octaves of 2D Perlin noise.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @param {any} p - The permutation or seed parameter for the noise function.
     * @param {number} octaves - Number of noise layers to sum.
     * @param {number} persistence - Controls amplitude reduction per octave.
     * @param {number} lacunarity - Controls frequency increase per octave.
     * @returns {number} The normalized fractal noise value at (x, y).
     */
    static _fractalNoise2D(x, y, p, octaves, persistence, lacunarity) {
        let total = 0, amplitude = 1, frequency = 1, maxVal = 0;
        for (let i = 0; i < octaves; i++) {
            total += this._noise2D(x * frequency, y * frequency, p) * amplitude;
            maxVal += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return total / maxVal;
    }

    /**
     * Generates a monochrome Perlin noise texture as a Uint8Array.
     *
     * @param {number} width - The width of the texture in pixels.
     * @param {number} height - The height of the texture in pixels.
     * @param {(x: number, y: number) => number} noiseFunction - A function that returns a noise value in the range [-1, 1] for given coordinates.
     * @param {number} scale - The scale factor applied to the coordinates before passing to the noise function.
     * @returns {Uint8Array} A flat array of grayscale pixel values (0-255) representing the noise texture.
     */
    static _generateMonochrome(width, height, noiseFunction, scale) {
        const data = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const noiseValue = (noiseFunction(x * scale, y * scale) + 1) * 0.5;
                data[y * width + x] = Math.floor(noiseValue * 255);
            }
        }
        return data;
    }

    /**
     * Generates an RGB Perlin noise texture as a flat Uint8Array.
     *
     * @param {number} width - The width of the texture in pixels.
     * @param {number} height - The height of the texture in pixels.
     * @param {(x: number, y: number) => number} noiseR - Function to generate noise for the red channel, returns value in [-1, 1].
     * @param {(x: number, y: number) => number} noiseG - Function to generate noise for the green channel, returns value in [-1, 1].
     * @param {(x: number, y: number) => number} noiseB - Function to generate noise for the blue channel, returns value in [-1, 1].
     * @param {number} scale - Scale factor applied to coordinates before passing to noise functions.
     * @returns {Uint8Array} Flat array of RGB values (length = width * height * 3).
     */
    static _generateRGB(width, height, noiseR, noiseG, noiseB, scale) {
        const data = new Uint8Array(width * height * 3);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = (noiseR(x * scale, y * scale) + 1) * 0.5;
                const g = (noiseG(x * scale, y * scale) + 1) * 0.5;
                const b = (noiseB(x * scale, y * scale) + 1) * 0.5;
                const baseIndex = (y * width + x) * 3;
                data[baseIndex] = Math.floor(r * 255);
                data[baseIndex + 1] = Math.floor(g * 255);
                data[baseIndex + 2] = Math.floor(b * 255);
            }
        }
        return data;
    }

    /**
     * Generates an RGBA Perlin noise texture as a Uint8Array.
     *
     * @param {number} width - The width of the texture in pixels.
     * @param {number} height - The height of the texture in pixels.
     * @param {(x: number, y: number) => number} noiseR - Function to generate noise for the red channel, returns value in [-1, 1].
     * @param {(x: number, y: number) => number} noiseG - Function to generate noise for the green channel, returns value in [-1, 1].
     * @param {(x: number, y: number) => number} noiseB - Function to generate noise for the blue channel, returns value in [-1, 1].
     * @param {(x: number, y: number) => number} noiseA - Function to generate noise for the alpha channel, returns value in [-1, 1].
     * @param {number} scale - Scale factor applied to the coordinates for noise generation.
     * @returns {Uint8Array} The generated RGBA texture data, with each pixel represented by 4 consecutive bytes.
     */
    static _generateRGBA(width, height, noiseR, noiseG, noiseB, noiseA, scale) {
        const data = new Uint8Array(width * height * 4);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = (noiseR(x * scale, y * scale) + 1) * 0.5;
                const g = (noiseG(x * scale, y * scale) + 1) * 0.5;
                const b = (noiseB(x * scale, y * scale) + 1) * 0.5;
                const a = (noiseA(x * scale, y * scale) + 1) * 0.5;
                const baseIndex = (y * width + x) * 4;
                data[baseIndex] = Math.floor(r * 255);
                data[baseIndex + 1] = Math.floor(g * 255);
                data[baseIndex + 2] = Math.floor(b * 255);
                data[baseIndex + 3] = Math.floor(a * 255);
            }
        }
        return data;
    }
}

/**
 * Worley (Cellular) noise generator class.
 * @private
 */
class WorleyNoise {
    static generate(width, height, options) {
        const { channels, numPoints, seed, distanceMetric } = options;
        const distanceFunc = NoiseUtils.distance[distanceMetric];

        if (channels === 1) {
            const points = this.#generateFeaturePoints(width, height, numPoints, seed);
            return this.#generateMonochrome(width, height, points, distanceFunc);
        }
        
        // Generate different point sets for each channel for deterministic output
        const pointsR = this.#generateFeaturePoints(width, height, numPoints, seed + 1);
        const pointsG = this.#generateFeaturePoints(width, height, numPoints, seed + 2);
        const pointsB = this.#generateFeaturePoints(width, height, numPoints, seed + 3);

        if (channels === 3) {
            return this.#generateRGB(width, height, pointsR, pointsG, pointsB, distanceFunc);
        }
        
        if (channels === 4) {
            const pointsA = this.#generateFeaturePoints(width, height, numPoints, seed + 4);
            return this.#generateRGBA(width, height, pointsR, pointsG, pointsB, pointsA, distanceFunc);
        }
        
        throw new Error("Unsupported channel count. Must be 1, 3, or 4.");
    }

    static #generateFeaturePoints(width, height, numPoints, seed) {
        const rand = NoiseUtils.makeRNG(seed);
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            points.push({ x: rand() * width, y: rand() * height });
        }
        return points;
    }

    static #getClosestDistance(x, y, points, distanceFunc) {
        let minDist = Infinity;
        for (const point of points) {
            const dist = distanceFunc(x, y, point.x, point.y);
            if (dist < minDist) minDist = dist;
        }
        return minDist;
    }

    static #generateMonochrome(width, height, points, distanceFunc) {
        const data = new Uint8Array(width * height);
        let maxDist = 0;
        const distances = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dist = this.#getClosestDistance(x, y, points, distanceFunc);
                distances[y * width + x] = dist;
                if (dist > maxDist) maxDist = dist;
            }
        }
        for (let i = 0; i < distances.length; i++) {
            data[i] = Math.floor((distances[i] / maxDist) * 255);
        }
        return data;
    }
    
    static #generateForChannel(width, height, points, distanceFunc) {
        const distances = new Float32Array(width * height);
        let maxDist = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dist = this.#getClosestDistance(x, y, points, distanceFunc);
                distances[y * width + x] = dist;
                if (dist > maxDist) maxDist = dist;
            }
        }
        return { distances, maxDist };
    }

    static #generateRGB(width, height, pointsR, pointsG, pointsB, distanceFunc) {
        const data = new Uint8Array(width * height * 3);
        const { distances: dR, maxDist: mR } = this.#generateForChannel(width, height, pointsR, distanceFunc);
        const { distances: dG, maxDist: mG } = this.#generateForChannel(width, height, pointsG, distanceFunc);
        const { distances: dB, maxDist: mB } = this.#generateForChannel(width, height, pointsB, distanceFunc);

        for (let i = 0; i < width * height; i++) {
            const baseIndex = i * 3;
            data[baseIndex] = Math.floor((dR[i] / mR) * 255);
            data[baseIndex + 1] = Math.floor((dG[i] / mG) * 255);
            data[baseIndex + 2] = Math.floor((dB[i] / mB) * 255);
        }
        return data;
    }

    static #generateRGBA(width, height, pointsR, pointsG, pointsB, pointsA, distanceFunc) {
        const data = new Uint8Array(width * height * 4);
        const { distances: dR, maxDist: mR } = this.#generateForChannel(width, height, pointsR, distanceFunc);
        const { distances: dG, maxDist: mG } = this.#generateForChannel(width, height, pointsG, distanceFunc);
        const { distances: dB, maxDist: mB } = this.#generateForChannel(width, height, pointsB, distanceFunc);
        const { distances: dA, maxDist: mA } = this.#generateForChannel(width, height, pointsA, distanceFunc);

        for (let i = 0; i < width * height; i++) {
            const baseIndex = i * 4;
            data[baseIndex] = Math.floor((dR[i] / mR) * 255);
            data[baseIndex + 1] = Math.floor((dG[i] / mG) * 255);
            data[baseIndex + 2] = Math.floor((dB[i] / mB) * 255);
            data[baseIndex + 3] = Math.floor((dA[i] / mA) * 255);
        }
        return data;
    }
}

/**
 * Voronoi noise generator class.
 * @private
 */
/**
 * True Voronoi noise generator class.
 * This implementation focuses on distance-based patterns rather than flat cellular regions.
 * @private
 */
class VoronoiNoise {
    static generate(width, height, options) {
        const { channels, numPoints, seed, distanceMetric, scale } = options;
        const distanceFunc = NoiseUtils.distance[distanceMetric];
        
        // Use scale parameter to control feature density
        const scaledWidth = width * (scale || 0.01) * 50;
        const scaledHeight = height * (scale || 0.01) * 50;
        
        if (channels === 1) {
            const points = this.#generateFeaturePoints(scaledWidth, scaledHeight, numPoints, seed);
            return this.#generateDistanceBasedMonochrome(width, height, points, distanceFunc, scale || 0.01);
        }
        
        // Generate different point sets for each channel
        const pointsR = this.#generateFeaturePoints(scaledWidth, scaledHeight, numPoints, seed + 1);
        const pointsG = this.#generateFeaturePoints(scaledWidth, scaledHeight, numPoints, seed + 2);  
        const pointsB = this.#generateFeaturePoints(scaledWidth, scaledHeight, numPoints, seed + 3);

        if (channels === 3) {
            return this.#generateDistanceBasedRGB(width, height, pointsR, pointsG, pointsB, distanceFunc, scale || 0.01);
        }
        
        if (channels === 4) {
            const pointsA = this.#generateFeaturePoints(scaledWidth, scaledHeight, numPoints, seed + 4);
            return this.#generateDistanceBasedRGBA(width, height, pointsR, pointsG, pointsB, pointsA, distanceFunc, scale || 0.01);
        }
        
        throw new Error("Unsupported channel count. Must be 1, 3, or 4.");
    }

    static #generateFeaturePoints(width, height, numPoints, seed) {
        const rand = NoiseUtils.makeRNG(seed);
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            points.push({
                x: rand() * width,
                y: rand() * height,
                intensity: rand() // Random intensity for each point
            });
        }
        return points;
    }

    static #getDistanceBasedValue(x, y, points, distanceFunc, scale) {
        const scaledX = x * scale * 50;
        const scaledY = y * scale * 50;
        
        let minDist = Infinity;
        let secondMinDist = Infinity;
        let closestPoint = null;
        
        // Find closest and second closest points
        for (const point of points) {
            const dist = distanceFunc(scaledX, scaledY, point.x, point.y);
            if (dist < minDist) {
                secondMinDist = minDist;
                minDist = dist;
                closestPoint = point;
            } else if (dist < secondMinDist) {
                secondMinDist = dist;
            }
        }
        
        if (!closestPoint) return 128;
        
        // Create different types of Voronoi patterns:
        
        // Pattern 1: Edge-based (creates outlines of cells)
        const edgeDistance = secondMinDist - minDist;
        const edgeThreshold = 2.0; // Adjust for thicker/thinner edges
        if (edgeDistance < edgeThreshold) {
            return 255; // White edges
        }
        
        // Pattern 2: Distance-based gradient within cells
        const maxDistance = 20; // Adjust based on typical distances
        const normalizedDistance = Math.min(minDist / maxDistance, 1);
        const baseValue = closestPoint.intensity * 255;
        
        // Combine edge and gradient effects
        return Math.floor(baseValue * (0.3 + 0.7 * (1 - normalizedDistance)));
    }

    static #generateDistanceBasedMonochrome(width, height, points, distanceFunc, scale) {
        const data = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                data[y * width + x] = this.#getDistanceBasedValue(x, y, points, distanceFunc, scale);
            }
        }
        return data;
    }

    static #generateDistanceBasedRGB(width, height, pointsR, pointsG, pointsB, distanceFunc, scale) {
        const data = new Uint8Array(width * height * 3);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const baseIndex = (y * width + x) * 3;
                data[baseIndex] = this.#getDistanceBasedValue(x, y, pointsR, distanceFunc, scale);
                data[baseIndex + 1] = this.#getDistanceBasedValue(x, y, pointsG, distanceFunc, scale);
                data[baseIndex + 2] = this.#getDistanceBasedValue(x, y, pointsB, distanceFunc, scale);
            }
        }
        return data;
    }

    static #generateDistanceBasedRGBA(width, height, pointsR, pointsG, pointsB, pointsA, distanceFunc, scale) {
        const data = new Uint8Array(width * height * 4);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const baseIndex = (y * width + x) * 4;
                data[baseIndex] = this.#getDistanceBasedValue(x, y, pointsR, distanceFunc, scale);
                data[baseIndex + 1] = this.#getDistanceBasedValue(x, y, pointsG, distanceFunc, scale);
                data[baseIndex + 2] = this.#getDistanceBasedValue(x, y, pointsB, distanceFunc, scale);
                data[baseIndex + 3] = this.#getDistanceBasedValue(x, y, pointsA, distanceFunc, scale);
            }
        }
        return data;
    }
}

/**
 * Alternative Voronoi implementation that creates more organic, noise-like patterns
 * @private
 */
class VoronoiNoiseOrganic {
    static generate(width, height, options) {
        const { channels, numPoints, seed, distanceMetric, scale } = options;
        const distanceFunc = NoiseUtils.distance[distanceMetric];
        
        if (channels === 1) {
            return this.#generateOrganicMonochrome(width, height, numPoints, seed, distanceFunc, scale || 0.01);
        }
        
        if (channels === 3) {
            return this.#generateOrganicRGB(width, height, numPoints, seed, distanceFunc, scale || 0.01);
        }
        
        if (channels === 4) {
            return this.#generateOrganicRGBA(width, height, numPoints, seed, distanceFunc, scale || 0.01);
        }
        
        throw new Error("Unsupported channel count. Must be 1, 3, or 4.");
    }

    static #generateOrganicMonochrome(width, height, numPoints, seed, distanceFunc, scale) {
        const data = new Uint8Array(width * height);
        const points = this.#generateFeaturePoints(width, height, numPoints, seed, scale);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const value = this.#computeOrganicValue(x, y, points, distanceFunc, scale);
                data[y * width + x] = Math.floor(Math.max(0, Math.min(255, value)));
            }
        }
        return data;
    }

    static #generateOrganicRGB(width, height, numPoints, seed, distanceFunc, scale) {
        const data = new Uint8Array(width * height * 3);
        const pointsR = this.#generateFeaturePoints(width, height, numPoints, seed + 1, scale);
        const pointsG = this.#generateFeaturePoints(width, height, numPoints, seed + 2, scale);
        const pointsB = this.#generateFeaturePoints(width, height, numPoints, seed + 3, scale);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const baseIndex = (y * width + x) * 3;
                data[baseIndex] = Math.floor(Math.max(0, Math.min(255, this.#computeOrganicValue(x, y, pointsR, distanceFunc, scale))));
                data[baseIndex + 1] = Math.floor(Math.max(0, Math.min(255, this.#computeOrganicValue(x, y, pointsG, distanceFunc, scale))));
                data[baseIndex + 2] = Math.floor(Math.max(0, Math.min(255, this.#computeOrganicValue(x, y, pointsB, distanceFunc, scale))));
            }
        }
        return data;
    }

    static #generateOrganicRGBA(width, height, numPoints, seed, distanceFunc, scale) {
        const data = new Uint8Array(width * height * 4);
        const pointsR = this.#generateFeaturePoints(width, height, numPoints, seed + 1, scale);
        const pointsG = this.#generateFeaturePoints(width, height, numPoints, seed + 2, scale);
        const pointsB = this.#generateFeaturePoints(width, height, numPoints, seed + 3, scale);
        const pointsA = this.#generateFeaturePoints(width, height, numPoints, seed + 4, scale);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const baseIndex = (y * width + x) * 4;
                data[baseIndex] = Math.floor(Math.max(0, Math.min(255, this.#computeOrganicValue(x, y, pointsR, distanceFunc, scale))));
                data[baseIndex + 1] = Math.floor(Math.max(0, Math.min(255, this.#computeOrganicValue(x, y, pointsG, distanceFunc, scale))));
                data[baseIndex + 2] = Math.floor(Math.max(0, Math.min(255, this.#computeOrganicValue(x, y, pointsB, distanceFunc, scale))));
                data[baseIndex + 3] = Math.floor(Math.max(0, Math.min(255, this.#computeOrganicValue(x, y, pointsA, distanceFunc, scale))));
            }
        }
        return data;
    }

    static #generateFeaturePoints(width, height, numPoints, seed, scale) {
        const rand = NoiseUtils.makeRNG(seed);
        const points = [];
        const scaleFactor = 50 * scale; // Convert scale to appropriate range
        
        for (let i = 0; i < numPoints; i++) {
            points.push({
                x: rand() * width * scaleFactor,
                y: rand() * height * scaleFactor,
                strength: rand() * 2 - 1, // Random strength between -1 and 1
                falloff: 20 + rand() * 30  // Random falloff distance
            });
        }
        return points;
    }

    static #computeOrganicValue(x, y, points, distanceFunc, scale) {
        const scaleFactor = 50 * scale;
        const scaledX = x * scaleFactor;
        const scaledY = y * scaleFactor;
        
        let totalInfluence = 0;
        
        // Instead of finding just the closest point, sum influences from multiple points
        for (const point of points) {
            const distance = distanceFunc(scaledX, scaledY, point.x, point.y);
            const influence = point.strength * Math.exp(-distance / point.falloff);
            totalInfluence += influence;
        }
        
        // Normalize and convert to 0-255 range
        return (Math.tanh(totalInfluence) + 1) * 127.5;
    }
}

/**
 * Simplex noise generator class.
 * @private
 */
class SimplexNoise {
    static #gradients = [
        [1, 1], [-1, 1], [1, -1], [-1, -1],
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
    static #F2 = (Math.sqrt(3) - 1) / 2;
    static #G2 = (3 - Math.sqrt(3)) / 6;

    static generate(width, height, options) {
        const { channels, seed, scale, octaves, persistence, lacunarity } = options;

        if (channels === 1) {
            const perm = NoiseUtils.makePermutationTable(seed);
            const noiseFunction = (x, y) => this._fractalNoise2D(x, y, perm, octaves, persistence, lacunarity);
            return this._generateMonochrome(width, height, noiseFunction, scale);
        }

        const permR = NoiseUtils.makePermutationTable(seed + 1);
        const noiseR = (x, y) => this._fractalNoise2D(x, y, permR, octaves, persistence, lacunarity);
        
        const permG = NoiseUtils.makePermutationTable(seed + 2);
        const noiseG = (x, y) => this._fractalNoise2D(x, y, permG, octaves, persistence, lacunarity);

        const permB = NoiseUtils.makePermutationTable(seed + 3);
        const noiseB = (x, y) => this._fractalNoise2D(x, y, permB, octaves, persistence, lacunarity);

        if (channels === 3) {
            return this._generateRGB(width, height, noiseR, noiseG, noiseB, scale);
        }
        
        if (channels === 4) {
            const permA = NoiseUtils.makePermutationTable(seed + 4);
            const noiseA = (x, y) => this._fractalNoise2D(x, y, permA, octaves, persistence, lacunarity);
            return this._generateRGBA(width, height, noiseR, noiseG, noiseB, noiseA, scale);
        }

        throw new Error("Unsupported channel count. Must be 1, 3, or 4.");
    }

    static _noise2D(x, y, p) {
        const s = (x + y) * this.#F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const t = (i + j) * this.#G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        let i1, j1;
        if (x0 > y0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }

        const x1 = x0 - i1 + this.#G2;
        const y1 = y0 - j1 + this.#G2;
        const x2 = x0 - 1 + 2 * this.#G2;
        const y2 = y0 - 1 + 2 * this.#G2;

        const ii = i & 255;
        const jj = j & 255;

        let n0, n1, n2;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0;
        else {
            t0 *= t0;
            const g = this.#gradients[p[ii + p[jj]] & 7];
            n0 = t0 * t0 * NoiseUtils.dot(g, x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0;
        else {
            t1 *= t1;
            const g = this.#gradients[p[ii + i1 + p[jj + j1]] & 7];
            n1 = t1 * t1 * NoiseUtils.dot(g, x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0;
        else {
            t2 *= t2;
            const g = this.#gradients[p[ii + 1 + p[jj + 1]] & 7];
            n2 = t2 * t2 * NoiseUtils.dot(g, x2, y2);
        }

        return 70 * (n0 + n1 + n2);
    }

    // The fractal and channel generation methods are identical to Perlin's,
    // so now we hijack and use the public _noise2D method for compatibility
    static _fractalNoise2D = PerlinNoise._fractalNoise2D;
    static _generateMonochrome = PerlinNoise._generateMonochrome;
    static _generateRGB = PerlinNoise._generateRGB;
    static _generateRGBA = PerlinNoise._generateRGBA;
}