const FPSCounter = class {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsInterval = 1000; 
        this.lastFpsUpdate = this.lastTime;
        this.framesSinceLastUpdate = 0;

        this.frameCountElement = document.getElementById('frame-count');
        this.fpsElement = document.getElementById('fps-value');
        this.memElement = document.getElementById('memory-usage');

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

        this.frameCountElement.textContent = this.frameCount;

        this.lastTime = currentTime;
        requestAnimationFrame(() => this.animate());
    }
};
export { FPSCounter };