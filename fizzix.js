/**
 * Fizzix - A simple OL/POJO library for particle physics simulations.
 * Uses Verlet integration for stable simulations.
 */
const Fizzix = {
    /**
     * Applies a force to a single particle.
     * @param {ParticleSystem} ps - The particle system.
     * @param {number} index - The index of the particle.
     * @param {object} force - The force vector { x, y }.
     */
    applyForce: (ps, index, force) => {
        const i2 = index * 2;
        ps.acc[i2] += force.x;
        ps.acc[i2 + 1] += force.y;
    },

    /**
     * Updates all particles in the system using Verlet integration.
     * @param {ParticleSystem} ps - The particle system.
     * @param {number} dt - The delta time step.
     */
    update: (ps, dt = 1) => {
        const dtSq = dt * dt;
        for (let i = 0; i < ps.count; i++) {
            const i2 = i * 2;

            // From Verlet integration
            const tempX = ps.pos[i2];
            const tempY = ps.pos[i2 + 1];

            const nextX = ps.pos[i2] + (ps.pos[i2] - ps.prevPos[i2]) + ps.acc[i2] * dtSq;
            const nextY = ps.pos[i2 + 1] + (ps.pos[i2 + 1] - ps.prevPos[i2 + 1]) + ps.acc[i2 + 1] * dtSq;

            ps.pos[i2] = nextX;
            ps.pos[i2 + 1] = nextY;

            ps.prevPos[i2] = tempX;
            ps.prevPos[i2 + 1] = tempY;

            // Reset acceleration for the next frame
            ps.acc[i2] = 0;
            ps.acc[i2 + 1] = 0;
        }
    },

    /**
     * Applies world boundary constraints.
     * @param {ParticleSystem} ps - The particle system.
     * @param {object} bounds - The world bounds { x, y, width, height }.
     */
    constrain: (ps, bounds) => {
        for (let i = 0; i < ps.count; i++) {
            const i2 = i * 2;
            const x = ps.pos[i2];
            const y = ps.pos[i2 + 1];

            if (x > bounds.x + bounds.width) ps.pos[i2] = bounds.x;
            if (x < bounds.x) ps.pos[i2] = bounds.x + bounds.width;
            if (y > bounds.y + bounds.height) ps.pos[i2 + 1] = bounds.y;
            if (y < bounds.y) ps.pos[i2 + 1] = bounds.y + bounds.height;
        }
    },
};
export default Fizzix;