/**
 * ParticleSystem efficiently manages a pool of particles using typed arrays (Structure of Arrays).
 * This approach minimizes garbage collection and improves performance for large numbers of particles.
 *
 * @class ParticleSystem
 */
class ParticleSystem {
    /**
     * Creates a new ParticleSystem.
     * @param {number} maxParticles Maximum number of particles in the system.
     */
    constructor(maxParticles) {
        /**
         * Maximum number of particles allowed.
         * @type {number}
         */
        this.maxParticles = maxParticles;
        /**
         * Current number of active particles.
         * @type {number}
         */
        this.count = 0;
        /**
         * Particle positions (x, y, z for each particle).
         * @type {Float32Array}
         */
        this.pos = new Float32Array(maxParticles * 3);
        /**
         * Previous positions for Verlet integration (x, y, z for each particle).
         * @type {Float32Array}
         */
        this.prevPos = new Float32Array(maxParticles * 3);
        /**
         * Particle velocities (vx, vy, vz for each particle). Optional, for explicit velocity-based integration.
         * @type {Float32Array}
         */
        this.vel = new Float32Array(maxParticles * 3);
        /**
         * Previous velocities (for some integration schemes).
         * @type {Float32Array}
         */
        this.velPrev = new Float32Array(maxParticles * 3);
        /**
         * Particle accelerations (x, y, z for each particle).
         * @type {Float32Array}
         */
        this.acc = new Float32Array(maxParticles * 3);
        /**
         * Particle colors (r, g, b, a for each particle).
         * @type {Float32Array}
         */
        this.color = new Float32Array(maxParticles * 4);
        /**
         * Current life of each particle.
         * @type {Float32Array}
         */
        this.life = new Float32Array(maxParticles);
        /**
         * Lifespan (maximum life) of each particle.
         * @type {Float32Array}
         */
        this.lifespan = new Float32Array(maxParticles);
        /**
         * Size of each particle.
         * @type {Float32Array}
         */
        this.size = new Float32Array(maxParticles);
        /**
         * Active status (0 for inactive, 1 for active).
         * @type {Uint8Array}
         */
        this.active = new Uint8Array(maxParticles);
        /**
         * Density of each particle (for fluid simulation).
         * @type {Float32Array}
         */
        this.density = new Float32Array(maxParticles);
        /**
         * Pressure of each particle (for fluid simulation).
         * @type {Float32Array}
         */
        this.pressure = new Float32Array(maxParticles);
        /**
         * Rotation angle of each particle (radians).
         * @type {Float32Array}
         */
        this.rotation = new Float32Array(maxParticles);
        /**
         * Angular velocity of each particle.
         * @type {Float32Array}
         */
        this.angularVelocity = new Float32Array(maxParticles);
        /**
         * Angular acceleration of each particle.
         * @type {Float32Array}
         */
        this.angularAcceleration = new Float32Array(maxParticles);
        /**
         * Mass of each particle.
         * @type {Float32Array}
         */
        this.mass = new Float32Array(maxParticles);
        /**
         * Friction coefficient for each particle.
         * @type {Float32Array}
         */
        this.friction = new Float32Array(maxParticles);
        /**
         * Elasticity coefficient for each particle.
         * @type {Float32Array}
         */
        this.elasticity = new Float32Array(maxParticles);
        /**
         * Integrity value for each particle (e.g., health or breakage).
         * @type {Uint16Array}
         */
        this.integrity = new Uint16Array(maxParticles);
    }

    /**
     * Emits a new particle from the pool, initializing all properties. If the pool is full, no particle is emitted.
     * @param {object} props Particle properties
     * @param {number} props.x Initial x position
     * @param {number} props.y Initial y position
     * @param {number} [props.z=0] Initial z position
     * @param {number} [props.vx=0] Initial x velocity
     * @param {number} [props.vy=0] Initial y velocity
     * @param {number} [props.vz=0] Initial z velocity
     * @param {number} [props.r=1] Red color component (0-1)
     * @param {number} [props.g=1] Green color component (0-1)
     * @param {number} [props.b=1] Blue color component (0-1)
     * @param {number} [props.a=1] Alpha color component (0-1)
     * @param {number} [props.lifespan=Infinity] Maximum life of the particle
     * @param {number} [props.size=1] Size of the particle
     * @param {number} [props.density=0] Density (for fluid simulation)
     * @param {number} [props.pressure=0] Pressure (for fluid simulation)
     * @param {number} [props.mass=1] Mass of the particle
     * @param {number} [props.friction=0.1] Friction coefficient
     * @param {number} [props.elasticity=0.3] Elasticity coefficient
     * @param {number} [props.integrity=100] Integrity value
     * @param {number} [props.rotation=0] Initial rotation angle (radians)
     * @param {number} [props.angularVelocity=0] Initial angular velocity
     * @param {number} [props.angularAcceleration=0] Initial angular acceleration
     */
    emit({ x, y, z = 0, vx = 0, vy = 0, vz = 0, r = 1, g = 1, b = 1, a = 1, lifespan = Infinity, size = 1, density = 0, pressure = 0, mass = 1, friction = 0.1, elasticity = 0.3, integrity = 100, rotation = 0, angularVelocity = 0, angularAcceleration = 0 }) {
        if (this.count >= this.maxParticles) return;
        
        const i = this.count;
        const i3 = i * 3;
        const i4 = i * 4;
        
        // Set position
        this.pos[i3] = x;
        this.pos[i3 + 1] = y;
        this.pos[i3 + 2] = z;
        
        // Set previous position for Verlet integration (assumes dt = 1)
        this.prevPos[i3] = x - vx;
        this.prevPos[i3 + 1] = y - vy;
        this.prevPos[i3 + 2] = z - vz;
        
        // Set velocity
        this.vel[i3] = vx;
        this.vel[i3 + 1] = vy;
        this.vel[i3 + 2] = vz;
        
        // Initialize previous velocity
        this.velPrev[i3] = vx;
        this.velPrev[i3 + 1] = vy;
        this.velPrev[i3 + 2] = vz;
        
        // Initialize acceleration to zero
        this.acc[i3] = 0;
        this.acc[i3 + 1] = 0;
        this.acc[i3 + 2] = 0;
        
        // Set color
        this.color[i4] = r;
        this.color[i4 + 1] = g;
        this.color[i4 + 2] = b;
        this.color[i4 + 3] = a;
        
        // Set lifecycle properties
        this.life[i] = 0;
        this.lifespan[i] = lifespan;
        this.size[i] = size;
        this.active[i] = 1;
        
        // Set physics properties
        this.density[i] = density;
        this.pressure[i] = pressure;
        this.mass[i] = mass;
        this.friction[i] = friction;
        this.elasticity[i] = elasticity;
        this.integrity[i] = integrity;
        
        // Set rotation properties
        this.rotation[i] = rotation;
        this.angularVelocity[i] = angularVelocity;
        this.angularAcceleration[i] = angularAcceleration;
        
        this.count++;
    }

    /**
     * Updates the state of all particles.
     * Increments the life of each particle and kills particles that have exceeded their lifespan.
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
     * Returns the 3D position of a particle at the specified index.
     *
     * @param {number} index - The index of the particle.
     * @returns {number[]} An array containing the x, y, and z coordinates of the particle.
     */
    getPosition(index) {
        const i3 = index * 3;
        return [this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]];
    }

    /**
     * Sets the position of a particle at the specified index.
     *
     * @param {number} index - The index of the particle to update.
     * @param {number} x - The x-coordinate to set.
     * @param {number} y - The y-coordinate to set.
     * @param {number} z - The z-coordinate to set.
     */
    setPosition(index, x, y, z) {
        const i3 = index * 3;
        this.pos[i3] = x;
        this.pos[i3 + 1] = y;
        this.pos[i3 + 2] = z;
    }

    /**
     * Sets the acceleration of a particle at the specified index.
     *
     * @param {number} index - The index of the particle to update.
     * @param {number} ax - The x-acceleration to set.
     * @param {number} ay - The y-acceleration to set.
     * @param {number} az - The z-acceleration to set.
     */
    setAcceleration(index, ax, ay, az) {
        const i3 = index * 3;
        this.acc[i3] = ax;
        this.acc[i3 + 1] = ay;
        this.acc[i3 + 2] = az;
    }

    /**
     * Returns the rotation value at the specified index.
     *
     * @param {number} index - The index of the rotation to retrieve.
     * @returns {number} The rotation value at the given index.
     */
    getRotation(index) {
        return this.rotation[index];
    }

    /**
     * Sets the rotation value at the specified index.
     *
     * @param {number} index - The index of the rotation array to set.
     * @param {number} value - The rotation value to assign.
     */
    setRotation(index, value) {
        this.rotation[index] = value;
    }

    /**
     * Deactivates a particle by swapping it with the last active particle. This keeps the active pool contiguous for efficient iteration.
     * @param {number} index Index of the particle to deactivate.
     */
    kill(index) {
        if (this.count === 0) return;
        this.count--;
        if (index === this.count) return;
        
        const lastI = this.count;
        const i3 = index * 3;
        const lastI3 = lastI * 3;
        const i4 = index * 4;
        const lastI4 = lastI * 4;
        
        // Swap position arrays
        [this.pos[i3], this.pos[lastI3]] = [this.pos[lastI3], this.pos[i3]];
        [this.pos[i3 + 1], this.pos[lastI3 + 1]] = [this.pos[lastI3 + 1], this.pos[i3 + 1]];
        [this.pos[i3 + 2], this.pos[lastI3 + 2]] = [this.pos[lastI3 + 2], this.pos[i3 + 2]];
        
        [this.prevPos[i3], this.prevPos[lastI3]] = [this.prevPos[lastI3], this.prevPos[i3]];
        [this.prevPos[i3 + 1], this.prevPos[lastI3 + 1]] = [this.prevPos[lastI3 + 1], this.prevPos[i3 + 1]];
        [this.prevPos[i3 + 2], this.prevPos[lastI3 + 2]] = [this.prevPos[lastI3 + 2], this.prevPos[i3 + 2]];
        
        // Swap velocity arrays
        [this.vel[i3], this.vel[lastI3]] = [this.vel[lastI3], this.vel[i3]];
        [this.vel[i3 + 1], this.vel[lastI3 + 1]] = [this.vel[lastI3 + 1], this.vel[i3 + 1]];
        [this.vel[i3 + 2], this.vel[lastI3 + 2]] = [this.vel[lastI3 + 2], this.vel[i3 + 2]];
        
        [this.velPrev[i3], this.velPrev[lastI3]] = [this.velPrev[lastI3], this.velPrev[i3]];
        [this.velPrev[i3 + 1], this.velPrev[lastI3 + 1]] = [this.velPrev[lastI3 + 1], this.velPrev[i3 + 1]];
        [this.velPrev[i3 + 2], this.velPrev[lastI3 + 2]] = [this.velPrev[lastI3 + 2], this.velPrev[i3 + 2]];
        
        // Swap acceleration arrays
        [this.acc[i3], this.acc[lastI3]] = [this.acc[lastI3], this.acc[i3]];
        [this.acc[i3 + 1], this.acc[lastI3 + 1]] = [this.acc[lastI3 + 1], this.acc[i3 + 1]];
        [this.acc[i3 + 2], this.acc[lastI3 + 2]] = [this.acc[lastI3 + 2], this.acc[i3 + 2]];
        
        // Swap color arrays
        [this.color[i4], this.color[lastI4]] = [this.color[lastI4], this.color[i4]];
        [this.color[i4 + 1], this.color[lastI4 + 1]] = [this.color[lastI4 + 1], this.color[i4 + 1]];
        [this.color[i4 + 2], this.color[lastI4 + 2]] = [this.color[lastI4 + 2], this.color[i4 + 2]];
        [this.color[i4 + 3], this.color[lastI4 + 3]] = [this.color[lastI4 + 3], this.color[i4 + 3]];
        
        // Swap single-value properties
        [this.life[index], this.life[lastI]] = [this.life[lastI], this.life[index]];
        [this.lifespan[index], this.lifespan[lastI]] = [this.lifespan[lastI], this.lifespan[index]];
        [this.size[index], this.size[lastI]] = [this.size[lastI], this.size[index]];
        [this.density[index], this.density[lastI]] = [this.density[lastI], this.density[index]];
        [this.pressure[index], this.pressure[lastI]] = [this.pressure[lastI], this.pressure[index]];
        [this.mass[index], this.mass[lastI]] = [this.mass[lastI], this.mass[index]];
        [this.friction[index], this.friction[lastI]] = [this.friction[lastI], this.friction[index]];
        [this.elasticity[index], this.elasticity[lastI]] = [this.elasticity[lastI], this.elasticity[index]];
        [this.integrity[index], this.integrity[lastI]] = [this.integrity[lastI], this.integrity[index]];
        [this.rotation[index], this.rotation[lastI]] = [this.rotation[lastI], this.rotation[index]];
        [this.angularVelocity[index], this.angularVelocity[lastI]] = [this.angularVelocity[lastI], this.angularVelocity[index]];
        [this.angularAcceleration[index], this.angularAcceleration[lastI]] = [this.angularAcceleration[lastI], this.angularAcceleration[index]];
    }
}

export default ParticleSystem;
export { ParticleSystem as VectorParticle };