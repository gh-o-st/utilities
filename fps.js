const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const positions = [
    { top: '20px', left: '20px', arrow: 0 },       // top-left, arrow right
    { top: '20px', right: '20px', arrow: 90 },     // top-right, arrow down
    { bottom: '20px', right: '20px', arrow: 180 }, // bottom-right, arrow left
    { bottom: '20px', left: '20px', arrow: 270 }   // bottom-left, arrow up
];

/**
 * FPSCounter displays frames per second and memory usage in widget format or overlay.
 */
export default class FPSCounter {
    /**
     * @typedef {Object} FPSCounterOptions
     * @property {boolean} [manual=false] - If true, disables internal animation loop; use update() manually.
     * @property {boolean} [bare=false] - If true, uses container directly for text updates.
     * @property {boolean} [widget=false] - If true, updates widget elements on the page.
     */
    /**
     * Creates an FPSCounter instance and attaches it to the given container.
     * @param {HTMLElement} [container=document.body] - The DOM element to attach the counter to.
     * @param {FPSCounterOptions} [options] - Optional settings.
     * @throws {Error} If container is not a valid DOM element.
     */
    constructor(container = document.body, options = {}) {
        if (!(container instanceof HTMLElement)) {
            throw new Error('Container must be a valid DOM element.');
        }

        this.fpsHistory = [];
        this.maxHistory = 20;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsInterval = 1000;
        this.lastFpsUpdate = this.lastTime;
        this.framesSinceLastUpdate = 0;
        this.targetFps = 60;
        this.previousFps = 60;
        this.container = container;
        this.manual = !!options.manual;
        this.bare = !!options.bare;
        this.widget = !this.bare && !!options.widget; // ignore widget if bare mode selected

        // Widget mode: estimate refresh rate before showing anything
        if (this.widget) {
            this.estimateRefreshRate(1500).then(rate => {
                this.targetFps = rate;
                this._initDisplay();
                if (!this.manual) this.animate();
            });
        } else {
            this._initDisplay();
            if (!this.manual) this.animate();
        }
    }

    /**
     * Estimates the monitor's refresh rate by sampling rAF for a duration (ms).
     * @param {number} durationMs - How long to sample (default 1500ms)
     * @returns {Promise<number>} Resolves to estimated refresh rate (Hz)
     */
    estimateRefreshRate(durationMs = 1500) {
        return new Promise(resolve => {
            const times = [];
            let start = null;
            function step(ts) {
                if (!start) start = ts;
                else times.push(ts);
                if (ts - start < durationMs) {
                    requestAnimationFrame(step);
                } else {
                    // Calculate average interval
                    const intervals = times.slice(1).map((t, i) => t - times[i]);
                    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                    const rate = avg ? Math.round(1000 / avg) : 60;
                    resolve(rate);
                }
            }
            requestAnimationFrame(step);
        });
    }

    /**
     * Internal: sets up DOM elements for display
     */
    _initDisplay() {
        if (this.bare) {
            // In bare mode, use the container directly for text updates
            this.fpsElement = this.container;
            this.frameCountElement = null;
            this.memElement = null;
            this.graphCanvases = [];
        } else if (this.widget) {
            // Widget mode: find and connect to widget elements
            this.widgets = Array.from(document.querySelectorAll('[data-fps-widget]'));
            this.fpsElements = Array.from(document.querySelectorAll('[data-fps-value]'));
            this.memoryElements = Array.from(document.querySelectorAll('[data-fps-memory]'));
            this.graphCanvases = Array.from(document.querySelectorAll('[data-fps-graph]'));

            // Initialize graphs
            this.initializeGraphs();

            // Show memory heading only on Chromium-based browsers
            const isChromium = !!window.chrome || /Chrome|Chromium|Edg|Brave|Opera/.test(navigator.userAgent);
            if (isChromium) {
                this.memoryElements.forEach(el => {
                    if (el.classList.contains('hidden')) {
                        el.classList.remove('hidden');
                    }
                });
            }

            this.widgets.forEach(widget => {
                let posIdx = 0;
                const arrow = widget.querySelector('.fps-widget-arrow');
                if (!arrow) return;
                // Set initial position and arrow
                const setPosition = () => {
                    widget.style.position = 'fixed';
                    widget.style.top = '';
                    widget.style.right = '';
                    widget.style.bottom = '';
                    widget.style.left = '';
                    const pos = positions[posIdx];
                    Object.entries(pos).forEach(([k, v]) => {
                        if (k !== 'arrow') widget.style[k] = v;
                    });
                    arrow.style.transform = `rotate(${pos.arrow}deg)`;
                };
                setPosition();


                const animateMove = (from, to, duration = 600) => {
                    const start = performance.now();
                    const step = (now) => {
                        let t = Math.min(1, (now - start) / duration);
                        t = easeOutCubic(t);
                        ['top', 'right', 'bottom', 'left'].forEach(dir => {
                            if (to[dir] !== undefined) {
                                const fromVal = parseInt(from[dir] || 0);
                                const toVal = parseInt(to[dir] || 0);
                                widget.style[dir] = lerp(fromVal, toVal, t) + 'px';
                            } else {
                                widget.style[dir] = '';
                            }
                        });
                        arrow.style.transform = `rotate(${lerp(from.arrow, to.arrow, t)}deg)`;
                        if (t < 1) {
                            requestAnimationFrame(step);
                        } else {
                            setPosition();
                        }
                    };
                    requestAnimationFrame(step);
                };

                arrow.addEventListener('click', () => {
                    const from = { ...positions[posIdx] };
                    posIdx = (posIdx + 1) % positions.length;
                    const to = { ...positions[posIdx] };
                    animateMove(from, to);
                });
            });
        } else {
            const wrapper = document.createElement('div');
            wrapper.className = 'fps-counter';
            wrapper.style.cssText = `position: fixed;
                top: 0;
                left: 0;
                background: rgba(0,0,0,0.7);
                color: lime;
                font: 12px monospace;
                padding: 5px;
                z-index: 9999;`;

            this.frameCountElement = document.createElement('div');
            this.frameCountElement.className = 'fps-frame-count';
            wrapper.appendChild(this.frameCountElement);

            this.fpsElement = document.createElement('div');
            this.fpsElement.className = 'fps-value';
            wrapper.appendChild(this.fpsElement);

            this.memElement = document.createElement('div');
            this.memElement.className = 'fps-memory-usage';
            this.memElement.style.cssText = `cursor: help;`;
            this.memElement.title = 'Only works in Chrome-ish browsers';
            wrapper.appendChild(this.memElement);

            this.graphCanvases = [];
            this.container.appendChild(wrapper);
        }
    }

    initializeGraphs() {
        if (!this.widget) return;
        for (let i = 0; i < this.maxHistory; i++) {
            this.fpsHistory.push(Math.floor(Math.random() * 20) + 50);
        }
        this.drawGraphs();
    }

    animate() {
        const currentTime = performance.now();
        this.frameCount++;
        this.framesSinceLastUpdate++;

        // Update FPS history for graph (widget mode only)
        if (this.widget) {
            this.fpsHistory.push(this.fps);
            if (this.fpsHistory.length > this.maxHistory) this.fpsHistory.shift();
            this.drawGraphs();
        }

        if (currentTime - this.lastFpsUpdate >= this.fpsInterval) {
            this.previousFps = this.fps;
            this.fps = Math.round((this.framesSinceLastUpdate * 1000) / (currentTime - this.lastFpsUpdate));
            this.lastFpsUpdate = currentTime;
            this.framesSinceLastUpdate = 0;

            this.updateDisplay();
        }

        this.lastTime = currentTime;
        if (!this.manual) {
            requestAnimationFrame(() => this.animate());
        }
    }

    updateDisplay() {
        if (this.bare) {
            this.fpsElement.textContent = `${this.fps} FPS`;
        } else if (this.widget) {
            // Update FPS values in widgets
            this.fpsElements.forEach(el => {
                el.innerHTML = `${this.fps} <span>fps</span>`;
            });

            // Update memory info (only on Chromium-based browsers)
            if (performance.memory) {
                const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
                
                this.memoryElements.forEach(el => {
                    if (!el.classList.contains('hidden')) {
                        el.innerHTML = `${usedMB} <span>MB</span>`;
                    }
                });
            }
        } else {
            // Original overlay mode
            this.fpsElement.textContent = `${this.fps} FPS`;
            if (this.frameCountElement) {
                this.frameCountElement.textContent = `Frames: ${this.frameCount}`;
            }
            if (performance.memory && this.memElement) {
                const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
                const usedMB = (usedJSHeapSize / 1024 / 1024).toFixed(2);
                const totalMB = (totalJSHeapSize / 1024 / 1024).toFixed(2);
                this.memElement.textContent = `Heap: ${usedMB} / ${totalMB} MB`;
            }
        }
    }

    /**
     * Manually update the FPS and frame count display. Useful for external simulation loops.
     * @param {number} fps - The current FPS value to display.
     * @param {number} frameCount - The current frame count to display.
     */
    update(fps, frameCount) {
        if (typeof fps === 'number') {
            this.fps = fps;
            if (this.bare) {
                this.fpsElement.textContent = `${fps} FPS`;
            } else if (this.widget) {
                this.fpsElements.forEach(el => {
                    el.innerHTML = `${fps} <span>fps</span>`;
                });
            } else {
                this.fpsElement.textContent = `${fps} FPS`;
            }
        }
        if (typeof frameCount === 'number' && this.frameCountElement) {
            this.frameCount = frameCount;
            this.frameCountElement.textContent = `Frames: ${frameCount}`;
        }
        if (performance.memory) {
            if (this.widget) {
                const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
                this.memoryElements.forEach(el => {
                    if (!el.classList.contains('hidden')) {
                        el.innerHTML = `${usedMB} <span>MB</span>`;
                    }
                });
            } else if (this.memElement) {
                const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
                const usedMB = (usedJSHeapSize / 1024 / 1024).toFixed(2);
                const totalMB = (totalJSHeapSize / 1024 / 1024).toFixed(2);
                this.memElement.textContent = `Heap: ${usedMB} / ${totalMB} MB`;
            }
        }
    }

    /**
     * Alias for update() since people seem to think it ought to exist
     * @param {number} fps - The current FPS value to display.
     * @param {number} frameCount - The current frame count to display.
     */
    tick(fps, frameCount) {
        this.update(fps, frameCount);
    }

    drawGraphs() {
        if (!this.widget) return;
        this.graphCanvases.forEach(canvas => {
            this.drawGraph(canvas);
        });
    }

    drawGraph(canvas) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        // Set canvas size to match display size
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        const W = rect.width;
        const H = rect.height;
        
        ctx.clearRect(0, 0, W, H);

        // Graph settings
        const barWidth = 4;
        const barGap = 2;
        const normalBarHeight = 16;
        const activeBarHeight = 24;
        const graphWidth = W * 0.95;
        const totalBarsWidth = this.maxHistory * barWidth + (this.maxHistory - 1) * barGap;
        const barScale = graphWidth / totalBarsWidth;
        const scaledBarWidth = barWidth * barScale;
        const scaledBarGap = barGap * barScale;
        // Center the graph
        const startX = (W - graphWidth) / 2;
        
        // Determine if widget is dark or light
        const widget = canvas.closest('.fps-widget');
        const isDark = widget && widget.classList.contains('dark');
        
        // Draw bars
        for (let i = 0; i < this.fpsHistory.length; i++) {
            const isActive = i === this.fpsHistory.length - 1;
            const barHeight = isActive ? activeBarHeight : normalBarHeight;
            const x = startX + i * (scaledBarWidth + scaledBarGap);
            const y = H - barHeight - 16; // less space for labels in compact mode
            
            // Color based on theme and activity
            let color;
            if (isActive) {
                color = '#00bcd4';
            } else {
                const opacity = 0.3 + (0.7 * i / this.fpsHistory.length);
                if (isDark) {
                    color = `rgba(0, 188, 212, ${opacity})`;
                } else {
                    color = `rgba(0, 188, 212, ${opacity})`;
                }
            }
            
            // Draw rounded rectangle
            ctx.fillStyle = color;
            ctx.beginPath();
            const radius = scaledBarWidth / 2;
            ctx.roundRect(x, y, scaledBarWidth, barHeight, radius);
            ctx.fill();
        }
        
        // Draw labels (0, midpoint, refresh rate)
        const midpoint = Math.round(this.targetFps / 2);
        ctx.fillStyle = isDark ? 'rgba(169, 195, 201, 0.4)' : 'rgba(100, 100, 100, 0.6)';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('0', startX, H - 10);
        ctx.textAlign = 'right';
        ctx.fillText(this.targetFps.toString(), startX + graphWidth, H - 10);
        ctx.textAlign = 'center';
        ctx.fillText(midpoint.toString(), startX + graphWidth / 2, H - 10);
    }
};

// Add roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.arcTo(x + width, y, x + width, y + radius, radius);
        this.lineTo(x + width, y + height - radius);
        this.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.lineTo(x + radius, y + height);
        this.arcTo(x, y + height, x, y + height - radius, radius);
        this.lineTo(x, y + radius);
        this.arcTo(x, y, x + radius, y, radius);
        this.closePath();
    };
}