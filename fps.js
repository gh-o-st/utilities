export default class FPSCounter {
    constructor(container = document.body) {
        if (!(container instanceof HTMLElement)) {
            throw new Error('Container must be a valid DOM element.');
        }

        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsInterval = 1000;
        this.lastFpsUpdate = this.lastTime;
        this.framesSinceLastUpdate = 0;

        this.container = container;

        const wrapper = document.createElement('div');
        wrapper.className = 'fps-counter';
        wrapper.style.cssText = `    position: fixed;
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
        this.memElement.style.cssText = `    cursor: help;`;
        this.memElement.title = 'Only works in Chrome-ish browsers';
        wrapper.appendChild(this.memElement);

        this.container.appendChild(wrapper);

        this.animate();
    }

    animate() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        this.frameCount++;
        this.framesSinceLastUpdate++;

        if (currentTime - this.lastFpsUpdate >= this.fpsInterval) {
            this.fps = Math.round((this.framesSinceLastUpdate * 1000) / (currentTime - this.lastFpsUpdate));
            this.lastFpsUpdate = currentTime;
            this.framesSinceLastUpdate = 0;

            this.fpsElement.textContent = `${this.fps} FPS`;

            if (performance.memory && this.memElement) {
                const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
                const usedMB = (usedJSHeapSize / 1024 / 1024).toFixed(2);
                const totalMB = (totalJSHeapSize / 1024 / 1024).toFixed(2);
                this.memElement.textContent = `Heap: ${usedMB} / ${totalMB} MB`;
            }
        }

        this.frameCountElement.textContent = `Frames: ${this.frameCount}`;

        this.lastTime = currentTime;
        requestAnimationFrame(() => this.animate());
    }
}