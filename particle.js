/**
 * ParticleSystem - Manages a pool of particles using typed arrays (SoA).
 * This is more performant and has less GC overhead than creating class instances.
 */
class ParticleSystem {
    constructor(maxParticles) {
        this.maxParticles = maxParticles;
        this.count = 0;

        // Particle properties stored in typed arrays
        this.pos = new Float32Array(maxParticles * 2); // x, y
        this.prevPos = new Float32Array(maxParticles * 2); // For Verlet integration
        this.acc = new Float32Array(maxParticles * 2); // x, y
        this.color = new Float32Array(maxParticles * 4); // r, g, b, a
        this.life = new Float32Array(maxParticles); // Current life
        this.lifespan = new Float32Array(maxParticles); // Max life
        this.size = new Float32Array(maxParticles);
        this.active = new Uint8Array(maxParticles); // 0 for inactive, 1 for active
    }

    /**
     * Emits a new particle from the pool.
     * @param {object} props - Particle properties { x, y, vx, vy, r, g, b, a, lifespan, size }
     */
    emit({ x, y, vx = 0, vy = 0, r = 1, g = 1, b = 1, a = 1, lifespan = 100, size = 1 }) {
        if (this.count >= this.maxParticles) return;

        const i = this.count;
        const i2 = i * 2;
        const i4 = i * 4;

        this.pos[i2] = x;
        this.pos[i2 + 1] = y;
        this.prevPos[i2] = x - vx;
        this.prevPos[i2 + 1] = y - vy;
        this.acc[i2] = 0;
        this.acc[i2 + 1] = 0;

        this.color[i4] = r;
        this.color[i4 + 1] = g;
        this.color[i4 + 2] = b;
        this.color[i4 + 3] = a;

        this.life[i] = 0;
        this.lifespan[i] = lifespan;
        this.size[i] = size;
        this.active[i] = 1;

        this.count++;
    }

    /**
     * Updates the life of all active particles.
     * Inactive particles are swapped with the last active particle for compacting.
     */
    update() {
        for (let i = this.count - 1; i >= 0; i--) {
            this.life[i]++;
            if (this.life[i] >= this.lifespan[i]) {
                this.kill(i);
            }
        }
    }

    /**
     * Deactivates a particle by swapping it with the last active particle.
     * @param {number} index - The index of the particle to kill.
     */
    kill(index) {
        if (this.count === 0) return;
        this.count--;
        if (index === this.count) return; // It was the last one

        // Swap with the last active particle
        const lastI = this.count;
        const i2 = index * 2;
        const lastI2 = lastI * 2;
        const i4 = index * 4;
        const lastI4 = lastI * 4;

        // Swap properties
        [this.pos[i2], this.pos[lastI2]] = [this.pos[lastI2], this.pos[i2]];
        [this.pos[i2 + 1], this.pos[lastI2 + 1]] = [this.pos[lastI2 + 1], this.pos[i2 + 1]];
        [this.prevPos[i2], this.prevPos[lastI2]] = [this.prevPos[lastI2], this.prevPos[i2]];
        [this.prevPos[i2 + 1], this.prevPos[lastI2 + 1]] = [this.prevPos[lastI2 + 1], this.prevPos[i2 + 1]];
        [this.acc[i2], this.acc[lastI2]] = [this.acc[lastI2], this.acc[i2]];
        [this.acc[i2 + 1], this.acc[lastI2 + 1]] = [this.acc[lastI2 + 1], this.acc[i2 + 1]];
        [this.color[i4], this.color[lastI4]] = [this.color[lastI4], this.color[i4]];
        [this.color[i4 + 1], this.color[lastI4 + 1]] = [this.color[lastI4 + 1], this.color[i4 + 1]];
        [this.color[i4 + 2], this.color[lastI4 + 2]] = [this.color[lastI4 + 2], this.color[i4 + 2]];
        [this.color[i4 + 3], this.color[lastI4 + 3]] = [this.color[lastI4 + 3], this.color[i4 + 3]];
        [this.life[index], this.life[lastI]] = [this.life[lastI], this.life[index]];
        [this.lifespan[index], this.lifespan[lastI]] = [this.lifespan[lastI], this.lifespan[index]];
        [this.size[index], this.size[lastI]] = [this.size[lastI], this.size[index]];
    }
}
export default ParticleSystem;