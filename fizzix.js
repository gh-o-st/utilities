/**
 * Fizzix - Simple physics engine for particle systems using Verlet integration
 */
const Fizzix = {
    /**
     * Applies a force to a particle
     * @param {ParticleSystem} particles - The particle system
     * @param {number} index - Particle index
     * @param {object} force - Force vector { x, y }
     */
    applyForce(particles, index, force) {
        const i2 = index * 2;
        particles.acc[i2] += force.x;
        particles.acc[i2 + 1] += force.y;
    },

    /**
     * Updates particle physics using Verlet integration
     * @param {ParticleSystem} particles - The particle system
     * @param {number} dt - Delta time
     */
    update(particles, dt) {
        const dtSq = dt * dt;
        
        for (let i = 0; i < particles.count; i++) {
            const i2 = i * 2;
            
            // Current position
            const x = particles.pos[i2];
            const y = particles.pos[i2 + 1];
            
            // Previous position
            const prevX = particles.prevPos[i2];
            const prevY = particles.prevPos[i2 + 1];
            
            // Verlet integration: newPos = pos + (pos - prevPos) + acc * dt²
            const newX = x + (x - prevX) + particles.acc[i2] * dtSq;
            const newY = y + (y - prevY) + particles.acc[i2 + 1] * dtSq;
            
            // Update positions
            particles.prevPos[i2] = x;
            particles.prevPos[i2 + 1] = y;
            particles.pos[i2] = newX;
            particles.pos[i2 + 1] = newY;
            
            // Reset acceleration
            particles.acc[i2] = 0;
            particles.acc[i2 + 1] = 0;
        }
    },

    /**
     * Constrains particles to a boundary
     * @param {ParticleSystem} particles - The particle system
     * @param {object} bounds - Boundary { x, y, width, height }
     */
    constrain(particles, bounds) {
        for (let i = 0; i < particles.count; i++) {
            const i2 = i * 2;
            const x = particles.pos[i2];
            const y = particles.pos[i2 + 1];
            const vx = x - particles.prevPos[i2];
            const vy = y - particles.prevPos[i2 + 1];

            const friction = particles.friction[i] || 0.1;
            const elasticity = particles.elasticity[i] || 0.3;

            if (x > bounds.width) {
                particles.pos[i2] = bounds.width;
                particles.prevPos[i2] = bounds.width + vx * elasticity;
            } else if (x < bounds.x) {
                particles.pos[i2] = bounds.x;
                particles.prevPos[i2] = bounds.x + vx * elasticity;
            }

            if (y > bounds.height) {
                particles.pos[i2 + 1] = bounds.height;
                particles.prevPos[i2 + 1] = bounds.height + vy * elasticity;
            } else if (y < bounds.y) {
                particles.pos[i2 + 1] = bounds.y;
                particles.prevPos[i2 + 1] = bounds.y + vy * elasticity;
            }
        }
    },

    /**
     * Updates particle positions using Verlet integration
     * @param {ParticleSystem} particles - The particle system
     * @param {number} dt - Delta time
     */
    updatePositions(particles, dt) {
        const dtSq = dt * dt;
        
        for (let i = 0; i < particles.count; i++) {
            const i2 = i * 2;
            
            // Current position
            const x = particles.pos[i2];
            const y = particles.pos[i2 + 1];
            
            // Previous position
            const prevX = particles.prevPos[i2];
            const prevY = particles.prevPos[i2 + 1];
            
            // Verlet integration: newPos = pos + (pos - prevPos) + acc * dt²
            const newX = x + (x - prevX) + particles.acc[i2] * dtSq;
            const newY = y + (y - prevY) + particles.acc[i2 + 1] * dtSq;
            
            // Update positions
            particles.prevPos[i2] = x;
            particles.prevPos[i2 + 1] = y;
            particles.pos[i2] = newX;
            particles.pos[i2 + 1] = newY;
            
            // Reset acceleration
            particles.acc[i2] = 0;
            particles.acc[i2 + 1] = 0;
        }
    }
};

export default Fizzix;