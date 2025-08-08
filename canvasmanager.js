/**
 * Manages an HTML Canvas element for rendering, handling resizing,
 * DPR changes, and context management with a performant render loop.
 * @class CanvasManager
 */
export default class CanvasManager {
    canvas; // The HTMLCanvasElement being managed
    context; // The rendering context (2D, WebGL, etc.)
    width = 0; // logical width, updated on resize
    height = 0; // logical height, updated on resize
    dpr = 1; // current DPR, updated on resize

    #rafId = null;
    #resizeObserver;
    #userRenderLoop;
    #isDestroyed = false;
    #isPaused = false;
    #eventListeners = new Map();

    // Debug performance monitoring
    #debugMode = false;
    #frameCount = 0;
    #lastDebugLog = 0;

    /**
     * @param {HTMLCanvasElement|string} elementOrSelector - The canvas element or a CSS selector for it.
     * @param {object} [config] - Optional initial configuration.
     * @param {'2d'|'webgl'|'webgl2'} [config.contextType='2d'] - The type of context to create.
     * @param {object} [config.contextOptions={}] - Options to pass when creating the context.
     * @param {boolean} [config.debug=false] - Enable debug logging for performance monitoring.
     */
    constructor(elementOrSelector, config = {}) {
        const el = typeof elementOrSelector === 'string'
            ? document.querySelector(elementOrSelector)
            : elementOrSelector;

        if (!(el instanceof HTMLCanvasElement)) {
            throw new TypeError('CanvasManager requires a valid canvas element or selector.');
        }

        this.canvas = el;
        const { contextType = '2d', contextOptions = {}, debug = false } = config;

        this.#debugMode = debug;
        this.setContext(contextType, contextOptions);
        
        // The `this` context is handled by arrow functions, so no .bind() is needed.
        this.#resizeObserver = new ResizeObserver(this.#handleResize);

        // Add context loss handlers for WebGL
        this.canvas.addEventListener('webglcontextlost', this.#handleContextLost);
        this.canvas.addEventListener('webglcontextrestored', this.#handleContextRestored);

        // Perform initial resize
        this.#handleResize([{ contentRect: this.canvas.getBoundingClientRect() }]);
    }

    /**
     * Sets the rendering context for the canvas.
     * @param {'2d'|'webgl'|'webgl2'} type - The type of context to create.
     * @param {object} [options] - Options for context creation.
     * @returns {this} The instance for chaining.
     */
    setContext(type, options = {}) {
        this.context = this.canvas.getContext(type, options);
        if (!this.context) {
            throw new Error(`Failed to get '${type}' context.`);
        }
        return this;
    }

    /**
     * Starts the render loop and begins listening for resize events.
     * @param {function(CanvasManager): void} [renderLoop] - The drawing function to execute on each frame.
     * It receives the CanvasManager instance as its only argument.
     * @returns {this} The instance for chaining.
     */
    start(renderLoop = () => {}) {
        if (this.#rafId) {
            console.warn('CanvasManager has already been started.');
            return this;
        }

        this.#userRenderLoop = renderLoop;
        this.#resizeObserver.observe(this.canvas);
        this.#rafId = requestAnimationFrame(this.#loop);
        
        return this;
    }

    /**
     * Pauses the render loop.
     * @returns {this} The instance for chaining.
     */
    pause() {
        this.#isPaused = true;
        return this;
    }

    /**
     * Resumes the render loop.
     * @returns {this} The instance for chaining.
     */
    resume() {
        this.#isPaused = false;
        if (this.#rafId === null) {
            this.#rafId = requestAnimationFrame(this.#loop);
        }
        return this;
    }

    /**
     * Add an event listener.
     * @param {string} event - The event name.
     * @param {function} callback - The callback function.
     * @returns {this} The instance for chaining.
     */
    on(event, callback) {
        if (!this.#eventListeners.has(event)) {
            this.#eventListeners.set(event, []);
        }
        this.#eventListeners.get(event).push(callback);
        return this;
    }

    /**
     * Remove an event listener.
     * @param {string} event - The event name.
     * @param {function} callback - The callback function to remove.
     * @returns {this} The instance for chaining.
     */
    off(event, callback) {
        const listeners = this.#eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }

    /**
     * Clear the canvas with an optional color.
     * @param {string} [color] - Optional fill color. If not provided, uses clearRect.
     * @returns {this} The instance for chaining.
     */
    clear(color) {
        if (this.context instanceof CanvasRenderingContext2D) {
            if (color) {
                this.context.fillStyle = color;
                this.context.fillRect(0, 0, this.width, this.height);
            } else {
                this.context.clearRect(0, 0, this.width, this.height);
            }
        }
        return this;
    }

    /**
     * Convert canvas to blob.
     * @param {string} [type='image/png'] - The image type.
     * @param {number} [quality=0.92] - The image quality (0-1).
     * @returns {Promise<Blob>} A promise that resolves to a Blob.
     */
    toBlob(type = 'image/png', quality = 0.92) {
        return new Promise(resolve => {
            this.canvas.toBlob(resolve, type, quality);
        });
    }

    /**
     * Get image data from the canvas.
     * @returns {ImageData|null} The image data or null if not a 2D context.
     */
    getImageData() {
        if (this.context instanceof CanvasRenderingContext2D) {
            return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
        return null;
    }

    /**
     * The main render loop, driven by requestAnimationFrame.
     * @private
     */
    #loop = () => {
        if (this.#isDestroyed || this.#isPaused) return;

        const now = performance.now();

        // Debug performance monitoring (log every 30 seconds)
        if (this.#debugMode) {
            this.#frameCount++;
            if (now - this.#lastDebugLog >= 30000) {
                const fps = Math.round((this.#frameCount * 1000) / (now - this.#lastDebugLog));
                console.log(`[CanvasManager Debug] FPS: ${fps}, Frames: ${this.#frameCount}`);
                this.#frameCount = 0;
                this.#lastDebugLog = now;
            }
        }

        try {
            // Clear and transform for the new frame
            if (this.context instanceof CanvasRenderingContext2D) {
                this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
                this.context.clearRect(0, 0, this.width, this.height);
            } else if (this.context instanceof WebGLRenderingContext || this.context instanceof WebGL2RenderingContext) {
                const gl = this.context;
                let clearBits = gl.COLOR_BUFFER_BIT;
                
                // Only clear depth buffer if it exists
                const hasDepthBuffer = gl.getParameter(gl.DEPTH_BITS) > 0;
                if (hasDepthBuffer) {
                    clearBits |= gl.DEPTH_BUFFER_BIT;
                }
                
                gl.clear(clearBits);
            }

            // Execute the user-provided drawing logic
            this.#userRenderLoop(this);
        } catch (error) {
            console.error('CanvasManager render loop error:', error);
            this.#emit('error', error);
        }
        
        this.#rafId = requestAnimationFrame(this.#loop);
    };

    /**
     * Stops the render loop and disconnects the resize observer.
     */
    stop() {
        if (this.#rafId) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = null;
        }
        this.#resizeObserver.disconnect();
    }

    /**
     * The callback for the ResizeObserver.
     * @private
     * @param {ResizeObserverEntry[]} entries
     */
    #handleResize = (entries) => {
        if (!entries || !entries.length) return;

        const { width, height } = entries[0].contentRect;
        const newDpr = window.devicePixelRatio || 1;

        if (this.width !== width || this.height !== height || this.dpr !== newDpr) {
            this.width = width;
            this.height = height;
            this.dpr = newDpr;
            this.#updateCanvasDimensions();
            this.#emit('resize', { width: this.width, height: this.height, dpr: this.dpr });
        }
    };

    /**
     * Handle WebGL context loss.
     * @private
     */
    #handleContextLost = (event) => {
        event.preventDefault();
        this.#emit('contextlost');
    };

    /**
     * Handle WebGL context restoration.
     * @private
     */
    #handleContextRestored = () => {
        this.#emit('contextrestored');
    };

    /**
     * Emit an event to all listeners.
     * @private
     * @param {string} event - The event name.
     * @param {*} data - The data to pass to listeners.
     */
    #emit(event, data) {
        const listeners = this.#eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Updates the canvas element's dimensions and context transforms.
     * @private
     */
    #updateCanvasDimensions() {
        if (this.#isDestroyed) return;

        const displayWidth = Math.round(this.width * this.dpr);
        const displayHeight = Math.round(this.height * this.dpr);

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;

            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;

            if (this.context instanceof WebGLRenderingContext || this.context instanceof WebGL2RenderingContext) {
                this.context.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }

    /**
     * Stops the loop and cleans up all resources.
     */
    destroy() {
        this.stop();
        this.#isDestroyed = true;
        this.#userRenderLoop = null;
        this.#eventListeners.clear();
        
        // Remove WebGL context loss listeners
        this.canvas.removeEventListener('webglcontextlost', this.#handleContextLost);
        this.canvas.removeEventListener('webglcontextrestored', this.#handleContextRestored);
        
        this.context = null;
        this.canvas = null;
    }
};
