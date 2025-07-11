/**
 * Fizzix - Simple physics engine for particle systems using Verlet integration.
 * Provides methods for SPH fluid simulation, force application, integration, and boundary constraints.
 * @namespace Fizzix
 */
const Fizzix = {
    /**
     * Computes density and pressure for each particle (SPH).
     * Optimized: Uses a spatial grid for neighbor search if provided.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} h - Smoothing radius.
     * @param {number} [restDensity=1] - Rest density of the fluid.
     * @param {number} [k=0.04] - Pressure constant.
     * @param {Array[]} [spatialGrid=null] - Array of arrays of particle indices (optional).
     * @param {number} [gridCols=0] - Number of columns in the grid.
     * @param {number} [gridRows=0] - Number of rows in the grid.
     * @param {number} [gridSize=0] - Size of each grid cell.
     */
    computeDensityPressure(particles, h, restDensity = 1, k = 0.04, spatialGrid = null, gridCols = 0, gridRows = 0, gridSize = 0) {
        const h2 = h * h;
        const poly6 = 315 / (64 * Math.PI * Math.pow(h, 9));
        for (let i = 0; i < particles.count; i++) {
            const i2 = i * 2;
            let density = 0;
            if (spatialGrid && gridCols && gridRows && gridSize) {
                // Use spatial grid for neighbor search
                const x = particles.pos[i2];
                const y = particles.pos[i2 + 1];
                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);
                for (let gx = -1; gx <= 1; gx++) {
                    for (let gy = -1; gy <= 1; gy++) {
                        const nx = gridX + gx;
                        const ny = gridY + gy;
                        if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                            const gridIndex = ny * gridCols + nx;
                            const cell = spatialGrid[gridIndex];
                            for (let c = 0; c < cell.length; c++) {
                                const j = cell[c];
                                const j2 = j * 2;
                                const dx = x - particles.pos[j2];
                                const dy = y - particles.pos[j2 + 1];
                                const r2 = dx * dx + dy * dy;
                                if (r2 < h2) {
                                    density += poly6 * Math.pow(h2 - r2, 3);
                                }
                            }
                        }
                    }
                }
            } else {
                // Fallback: brute-force all pairs
                for (let j = 0; j < particles.count; j++) {
                    const j2 = j * 2;
                    const dx = particles.pos[i2] - particles.pos[j2];
                    const dy = particles.pos[i2 + 1] - particles.pos[j2 + 1];
                    const r2 = dx * dx + dy * dy;
                    if (r2 < h2) {
                        density += poly6 * Math.pow(h2 - r2, 3);
                    }
                }
            }
            particles.density[i] = density;
            particles.pressure[i] = k * (density - restDensity);
        }
    },

    /**
     * Applies SPH pressure and viscosity forces.
     * Optimized: Uses a spatial grid for neighbor search if provided.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} h - Smoothing radius.
     * @param {number} [mu=0.1] - Viscosity constant.
     * @param {Array[]} [spatialGrid=null] - Array of arrays of particle indices (optional).
     * @param {number} [gridCols=0] - Number of columns in the grid.
     * @param {number} [gridRows=0] - Number of rows in the grid.
     * @param {number} [gridSize=0] - Size of each grid cell.
     */
    applySPHForces(particles, h, mu = 0.1, spatialGrid = null, gridCols = 0, gridRows = 0, gridSize = 0) {
        const h2 = h * h;
        const spikyGrad = -45 / (Math.PI * Math.pow(h, 6));
        const viscoLap = 45 / (Math.PI * Math.pow(h, 6));
        for (let i = 0; i < particles.count; i++) {
            const i2 = i * 2;
            let fx = 0, fy = 0;
            if (spatialGrid && gridCols && gridRows && gridSize) {
                const x = particles.pos[i2];
                const y = particles.pos[i2 + 1];
                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);
                for (let gx = -1; gx <= 1; gx++) {
                    for (let gy = -1; gy <= 1; gy++) {
                        const nx = gridX + gx;
                        const ny = gridY + gy;
                        if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                            const gridIndex = ny * gridCols + nx;
                            const cell = spatialGrid[gridIndex];
                            for (let c = 0; c < cell.length; c++) {
                                const j = cell[c];
                                if (i === j) continue;
                                const j2 = j * 2;
                                const dx = x - particles.pos[j2];
                                const dy = y - particles.pos[j2 + 1];
                                const r = Math.sqrt(dx * dx + dy * dy);
                                if (r < h && r > 1e-6) {
                                    // Pressure force
                                    const avgPressure = (particles.pressure[i] + particles.pressure[j]) / 2;
                                    const grad = spikyGrad * Math.pow(h - r, 2);
                                    fx += -dx / r * grad * avgPressure / (particles.density[j] + 1e-6);
                                    fy += -dy / r * grad * avgPressure / (particles.density[j] + 1e-6);
                                    // Viscosity force
                                    const vx = (particles.pos[j2] - particles.prevPos[j2]);
                                    const vy = (particles.pos[j2 + 1] - particles.prevPos[j2 + 1]);
                                    const lap = viscoLap * (h - r);
                                    fx += mu * vx * lap / (particles.density[j] + 1e-6);
                                    fy += mu * vy * lap / (particles.density[j] + 1e-6);
                                }
                            }
                        }
                    }
                }
            } else {
                for (let j = 0; j < particles.count; j++) {
                    if (i === j) continue;
                    const j2 = j * 2;
                    const dx = particles.pos[i2] - particles.pos[j2];
                    const dy = particles.pos[i2 + 1] - particles.pos[j2 + 1];
                    const r = Math.sqrt(dx * dx + dy * dy);
                    if (r < h && r > 1e-6) {
                        // Pressure force
                        const avgPressure = (particles.pressure[i] + particles.pressure[j]) / 2;
                        const grad = spikyGrad * Math.pow(h - r, 2);
                        fx += -dx / r * grad * avgPressure / (particles.density[j] + 1e-6);
                        fy += -dy / r * grad * avgPressure / (particles.density[j] + 1e-6);
                        // Viscosity force
                        const vx = (particles.pos[j2] - particles.prevPos[j2]);
                        const vy = (particles.pos[j2 + 1] - particles.prevPos[j2 + 1]);
                        const lap = viscoLap * (h - r);
                        fx += mu * vx * lap / (particles.density[j] + 1e-6);
                        fy += mu * vy * lap / (particles.density[j] + 1e-6);
                    }
                }
            }
            particles.acc[i2] += fx;
            particles.acc[i2 + 1] += fy;
        }
    },
    /**
     * Applies a force to a particle.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} index - Particle index.
     * @param {{x: number, y: number}} force - Force vector.
     */
    applyForce(particles, index, force) {
        const i2 = index * 2;
        particles.acc[i2] += force.x;
        particles.acc[i2 + 1] += force.y;
    },

    /**
     * Updates particle physics using Verlet integration.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} dt - Delta time.
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
     * Constrains particles to a boundary.
     * @param {ParticleSystem} particles - The particle system.
     * @param {{x: number, y: number, width: number, height: number}} bounds - Boundary box.
     */
    constrain(particles, bounds) {
        for (let i = 0; i < particles.count; i++) {
            const i2 = i * 2;
            const x = particles.pos[i2];
            const y = particles.pos[i2 + 1];
            const vx = x - particles.prevPos[i2];
            const vy = y - particles.prevPos[i2 + 1];

            const cf = particles.friction[i] || 0.1;
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
     * Updates particle positions using Verlet integration.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} dt - Delta time.
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