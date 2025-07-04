/**
 * Canvas manager for handling canvas setup, resizing, and context management
 * @returns {Object} Canvas manager instance
 */
const canvasManager = () => {
    /**
     * Validates dimension input
     * @param {string|number} dim - Dimension value or 'full'
     * @param {string} name - Parameter name for error messages
     * @returns {number} Validated dimension
     */
    const validate = (dim, name) => {
        if (dim === 'full') {
            return name === 'width' ? window.innerWidth : window.innerHeight;
        }
        const parsed = parseInt(dim);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
        throw new TypeError(`${name} must be a positive number or 'full'`);
    };

    /**
     * Attaches canvas manager to a canvas element
     * @param {HTMLCanvasElement|string} elementOrId - Canvas element or ID
     * @returns {Object} Canvas controller instance
     */
    const attach = (elementOrId) => {
        if (!elementOrId) {
            throw new TypeError('attach requires a canvas element or string ID');
        }

        const el = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;

        if (!(el instanceof HTMLCanvasElement)) {
            throw new TypeError('attach expects a canvas element or string ID');
        }

        let ctx = null;
        let width = 0;
        let height = 0;
        let dpr = window.devicePixelRatio || 1;
        let resizeTimeout = null;
        let resizeHandler = null;
        let dprInterval = null;
        let isDestroyed = false;

        const checkDestroyed = () => {
            if (isDestroyed) {
                throw new Error('Canvas manager has been destroyed');
            }
        };

        const resize = (w = 'full', h = 'full') => {
            checkDestroyed();
            try {
                width = validate(w, 'width');
                height = validate(h, 'height');

                dpr = window.devicePixelRatio || 1;

                el.width = width * dpr;
                el.height = height * dpr;

                el.style.width = `${width}px`;
                el.style.height = `${height}px`;

                if (ctx) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, el.width, el.height);
                }
            } catch (error) {
                console.error('Canvas resize failed:', error);
                throw error;
            }
        };

        const context = (type = '2d', options = {}) => {
            checkDestroyed();
            try {
                ctx = el.getContext(type, options);
                if (!ctx) {
                    throw new Error(`Failed to get '${type}' context`);
                }
                return ctx;
            } catch (error) {
                console.error('Context creation failed:', error);
                throw error;
            }
        };

        const listen = (signal = 'resize', time = 250) => {
            checkDestroyed();
            if (typeof time !== 'number' || time < 0) {
                throw new TypeError('time must be a non-negative number');
            }

            if (signal === 'resize') {
                // Clean up existing listener
                if (resizeHandler) {
                    window.removeEventListener('resize', resizeHandler);
                }
                
                resizeHandler = () => {
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {
                        if (!isDestroyed) {
                            resize(width === 0 ? 'full' : width, height === 0 ? 'full' : height);
                        }
                    }, time);
                };
                window.addEventListener('resize', resizeHandler);
            }

            if (signal === 'dpr') {
                // Clean up existing interval
                if (dprInterval) {
                    clearInterval(dprInterval);
                }
                
                dprInterval = setInterval(() => {
                    if (isDestroyed) {
                        clearInterval(dprInterval);
                        return;
                    }
                    const current = window.devicePixelRatio || 1;
                    if (current !== dpr) {
                        dpr = current;
                        resize(width === 0 ? 'full' : width, height === 0 ? 'full' : height);
                    }
                }, time);
            }
        };

        /**
         * Clean up resources and event listeners
         */
        const destroy = () => {
            isDestroyed = true;
            
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
                resizeTimeout = null;
            }
            
            if (resizeHandler) {
                window.removeEventListener('resize', resizeHandler);
                resizeHandler = null;
            }
            
            if (dprInterval) {
                clearInterval(dprInterval);
                dprInterval = null;
            }
            
            ctx = null;
        };

        return {
            resize,
            context,
            listen,
            destroy,
            validate,
            get el() { checkDestroyed(); return el; },
            get ctx() { checkDestroyed(); return ctx; },
            get width() { return width; },
            get height() { return height; },
            get dpr() { return dpr; },
            get isDestroyed() { return isDestroyed; }
        };
    };

    return {
        attach,
        validate
    };
};

export default canvasManager;