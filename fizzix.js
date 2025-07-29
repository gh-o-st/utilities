/**
 * Fizzix - Simple physics engine for particle systems using Verlet integration.
 * Provides methods for SPH fluid simulation, force application, integration, and boundary constraints.
 * @namespace Fizzix
 */
const Fizzix = {

    /**
     * Builds a spatial grid for fast neighbor search.
     * Returns { grid, cols, rows, cellSize }.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} cellSize - The size of each grid cell (should be >= smoothing radius h).
     * @param {object} [bounds] - Optional bounds { x, y, width, height }.
     */
    buildSpatialGrid(particles, cellSize, bounds) {
        // Determine bounds if not provided
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        if (!bounds) {
            for (let i = 0; i < particles.count; i++) {
                const i3 = i * 3;
                const x = particles.pos[i3];
                const y = particles.pos[i3 + 1];
                const z = particles.pos[i3 + 2];
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (z < minZ) minZ = z;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                if (z > maxZ) maxZ = z;
            }
            bounds = { x: minX, y: minY, z: minZ, width: maxX - minX, height: maxY - minY, depth: maxZ - minZ };
        }
        const cols = Math.ceil(bounds.width / cellSize) + 1;
        const rows = Math.ceil(bounds.height / cellSize) + 1;
        const depths = Math.ceil((bounds.depth || 0) / cellSize) + 1;
        const grid = new Array(cols * rows * depths);
        for (let i = 0; i < grid.length; i++) grid[i] = [];
        // Assign particles to grid cells
        for (let i = 0; i < particles.count; i++) {
            const i3 = i * 3;
            const x = particles.pos[i3];
            const y = particles.pos[i3 + 1];
            const z = particles.pos[i3 + 2];
            const col = Math.floor((x - bounds.x) / cellSize);
            const row = Math.floor((y - bounds.y) / cellSize);
            const dep = Math.floor((z - (bounds.z || 0)) / cellSize);
            const idx = dep * cols * rows + row * cols + col;
            if (grid[idx]) grid[idx].push(i);
        }
        return { grid, cols, rows, depths, cellSize, bounds };
    },

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
        // 3D poly6 kernel normalization
        const poly6 = 315 / (64 * Math.PI * Math.pow(h, 9));
        for (let i = 0; i < particles.count; i++) {
            const i3 = i * 3;
            let density = 0;
            if (spatialGrid && gridCols && gridRows && gridSize) {
                // Use spatial grid for neighbor search
                const x = particles.pos[i3];
                const y = particles.pos[i3 + 1];
                const z = particles.pos[i3 + 2];
                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);
                // For 3D, you would also want gridZ, but for now, keep 2D grid for compatibility
                for (let gx = -1; gx <= 1; gx++) {
                    for (let gy = -1; gy <= 1; gy++) {
                        const nx = gridX + gx;
                        const ny = gridY + gy;
                        if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                            const gridIndex = ny * gridCols + nx;
                            const cell = spatialGrid[gridIndex];
                            for (let c = 0; c < cell.length; c++) {
                                const j = cell[c];
                                const j3 = j * 3;
                                const dx = x - particles.pos[j3];
                                const dy = y - particles.pos[j3 + 1];
                                const dz = z - particles.pos[j3 + 2];
                                const r2 = dx * dx + dy * dy + dz * dz;
                                if (r2 < h2) {
                                    density += poly6 * Math.pow(h2 - r2, 3);
                                }
                            }
                        }
                    }
                }
            } else {
                // Fallback: brute-force all pairs 
                // ...and watch the fps stall.
                for (let j = 0; j < particles.count; j++) {
                    const j3 = j * 3;
                    const dx = particles.pos[i3] - particles.pos[j3];
                    const dy = particles.pos[i3 + 1] - particles.pos[j3 + 1];
                    const dz = particles.pos[i3 + 2] - particles.pos[j3 + 2];
                    const r2 = dx * dx + dy * dy + dz * dz;
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
        // 3D kernel normalization
        const spikyGrad = -45 / (Math.PI * Math.pow(h, 6));
        const viscoLap = 45 / (Math.PI * Math.pow(h, 6));
        for (let i = 0; i < particles.count; i++) {
            const i3 = i * 3;
            let fx = 0, fy = 0, fz = 0;
            if (spatialGrid && gridCols && gridRows && spatialGrid.depths && gridSize) {
                const x = particles.pos[i3];
                const y = particles.pos[i3 + 1];
                const z = particles.pos[i3 + 2];
                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);
                const gridZ = Math.floor(z / gridSize);
                for (let gx = -1; gx <= 1; gx++) {
                    for (let gy = -1; gy <= 1; gy++) {
                        for (let gz = -1; gz <= 1; gz++) {
                            const nx = gridX + gx;
                            const ny = gridY + gy;
                            const nz = gridZ + gz;
                            if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows && nz >= 0 && nz < spatialGrid.depths) {
                                const gridIndex = nz * gridCols * gridRows + ny * gridCols + nx;
                                const cell = spatialGrid.grid ? spatialGrid.grid[gridIndex] : spatialGrid[gridIndex];
                                for (let c = 0; c < cell.length; c++) {
                                    const j = cell[c];
                                    if (i === j) continue;
                                    const j3 = j * 3;
                                    const dx = x - particles.pos[j3];
                                    const dy = y - particles.pos[j3 + 1];
                                    const dz = z - particles.pos[j3 + 2];
                                    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
                                    if (r < h && r > 1e-6) {
                                        // Pressure force
                                        const avgPressure = (particles.pressure[i] + particles.pressure[j]) / 2;
                                        const grad = spikyGrad * Math.pow(h - r, 2);
                                        fx += -dx / r * grad * avgPressure / (particles.density[j] + 1e-6);
                                        fy += -dy / r * grad * avgPressure / (particles.density[j] + 1e-6);
                                        fz += -dz / r * grad * avgPressure / (particles.density[j] + 1e-6);
                                        // Viscosity force
                                        const vx = (particles.pos[j3] - particles.prevPos[j3]);
                                        const vy = (particles.pos[j3 + 1] - particles.prevPos[j3 + 1]);
                                        const vz = (particles.pos[j3 + 2] - particles.prevPos[j3 + 2]);
                                        const lap = viscoLap * (h - r);
                                        fx += mu * vx * lap / (particles.density[j] + 1e-6);
                                        fy += mu * vy * lap / (particles.density[j] + 1e-6);
                                        fz += mu * vz * lap / (particles.density[j] + 1e-6);
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                for (let j = 0; j < particles.count; j++) {
                    if (i === j) continue;
                    const j3 = j * 3;
                    const dx = particles.pos[i3] - particles.pos[j3];
                    const dy = particles.pos[i3 + 1] - particles.pos[j3 + 1];
                    const dz = particles.pos[i3 + 2] - particles.pos[j3 + 2];
                    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (r < h && r > 1e-6) {
                        // Pressure force
                        const avgPressure = (particles.pressure[i] + particles.pressure[j]) / 2;
                        const grad = spikyGrad * Math.pow(h - r, 2);
                        fx += -dx / r * grad * avgPressure / (particles.density[j] + 1e-6);
                        fy += -dy / r * grad * avgPressure / (particles.density[j] + 1e-6);
                        fz += -dz / r * grad * avgPressure / (particles.density[j] + 1e-6);
                        // Viscosity force
                        const vx = (particles.pos[j3] - particles.prevPos[j3]);
                        const vy = (particles.pos[j3 + 1] - particles.prevPos[j3 + 1]);
                        const vz = (particles.pos[j3 + 2] - particles.prevPos[j3 + 2]);
                        const lap = viscoLap * (h - r);
                        fx += mu * vx * lap / (particles.density[j] + 1e-6);
                        fy += mu * vy * lap / (particles.density[j] + 1e-6);
                        fz += mu * vz * lap / (particles.density[j] + 1e-6);
                    }
                }
            }
            particles.acc[i3] += fx;
            particles.acc[i3 + 1] += fy;
            particles.acc[i3 + 2] += fz;
        }
    },
    /**
     * Applies a force to a particle.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} index - Particle index.
     * @param {{x: number, y: number}} force - Force vector.
     */
    applyForce(particles, index, force) {
        const i3 = index * 3;
        particles.acc[i3] += force.x;
        particles.acc[i3 + 1] += force.y;
        particles.acc[i3 + 2] += (typeof force.z === 'number' ? force.z : 0);
    },

    /**
     * Applies an arbitrary force field to all particles.
     * The field function should take (x, y, z, i) and return {x, y, z}.
     * @param {ParticleSystem} particles - The particle system.
     * @param {function(x: number, y: number, z: number, i: number): {x: number, y: number, z?: number}} fieldFn - Force field function.
     */
    applyField(particles, fieldFn) {
        for (let i = 0; i < particles.count; i++) {
            const i3 = i * 3;
            const x = particles.pos[i3];
            const y = particles.pos[i3 + 1];
            const z = particles.pos[i3 + 2];
            const force = fieldFn(x, y, z, i);
            if (force && (typeof force.x === 'number' || typeof force.y === 'number' || typeof force.z === 'number')) {
                particles.acc[i3] += force.x || 0;
                particles.acc[i3 + 1] += force.y || 0;
                particles.acc[i3 + 2] += force.z || 0;
            }
        }
    },

    /**
     * Updates particle physics using Verlet integration.
     * @param {ParticleSystem} particles - The particle system.
     * @param {number} dt - Delta time.
     */
    update(particles, dt) {
        const dtSq = dt * dt;
        for (let i = 0; i < particles.count; i++) {
            const i3 = i * 3;
            // Current position
            const x = particles.pos[i3];
            const y = particles.pos[i3 + 1];
            const z = particles.pos[i3 + 2];
            // Previous position
            const prevX = particles.prevPos[i3];
            const prevY = particles.prevPos[i3 + 1];
            const prevZ = particles.prevPos[i3 + 2];
            // Verlet integration: newPos = pos + (pos - prevPos) + acc * dt²
            const newX = x + (x - prevX) + particles.acc[i3] * dtSq;
            const newY = y + (y - prevY) + particles.acc[i3 + 1] * dtSq;
            const newZ = z + (z - prevZ) + particles.acc[i3 + 2] * dtSq;
            // Update positions
            particles.prevPos[i3] = x;
            particles.prevPos[i3 + 1] = y;
            particles.prevPos[i3 + 2] = z;
            particles.pos[i3] = newX;
            particles.pos[i3 + 1] = newY;
            particles.pos[i3 + 2] = newZ;
            // Reset acceleration
            particles.acc[i3] = 0;
            particles.acc[i3 + 1] = 0;
            particles.acc[i3 + 2] = 0;
        }
    },

    /**
     * Constrains particles to a boundary.
     * @param {ParticleSystem} particles - The particle system.
     * @param {{x: number, y: number, width: number, height: number}} bounds - Boundary box.
     */
    constrain(particles, bounds) {
        for (let i = 0; i < particles.count; i++) {
            const i3 = i * 3;
            const x = particles.pos[i3];
            const y = particles.pos[i3 + 1];
            const z = particles.pos[i3 + 2];
            const vx = x - particles.prevPos[i3];
            const vy = y - particles.prevPos[i3 + 1];
            const vz = z - particles.prevPos[i3 + 2];

            const cf = particles.friction[i] || 0.1;
            const elasticity = particles.elasticity[i] || 0.3;

            if (typeof bounds.width === 'number' && x > bounds.x + bounds.width) {
                particles.pos[i3] = bounds.x + bounds.width;
                particles.prevPos[i3] = bounds.x + bounds.width + vx * elasticity;
            } else if (x < bounds.x) {
                particles.pos[i3] = bounds.x;
                particles.prevPos[i3] = bounds.x + vx * elasticity;
            }

            if (typeof bounds.height === 'number' && y > bounds.y + bounds.height) {
                particles.pos[i3 + 1] = bounds.y + bounds.height;
                particles.prevPos[i3 + 1] = bounds.y + bounds.height + vy * elasticity;
            } else if (y < bounds.y) {
                particles.pos[i3 + 1] = bounds.y;
                particles.prevPos[i3 + 1] = bounds.y + vy * elasticity;
            }

            if (typeof bounds.depth === 'number') {
                if (z > (bounds.z || 0) + bounds.depth) {
                    particles.pos[i3 + 2] = (bounds.z || 0) + bounds.depth;
                    particles.prevPos[i3 + 2] = ((bounds.z || 0) + bounds.depth) + vz * elasticity;
                } else if (z < (bounds.z || 0)) {
                    particles.pos[i3 + 2] = (bounds.z || 0);
                    particles.prevPos[i3 + 2] = (bounds.z || 0) + vz * elasticity;
                }
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
            const i3 = i * 3;
            // Current position
            const x = particles.pos[i3];
            const y = particles.pos[i3 + 1];
            const z = particles.pos[i3 + 2];
            // Previous position
            const prevX = particles.prevPos[i3];
            const prevY = particles.prevPos[i3 + 1];
            const prevZ = particles.prevPos[i3 + 2];
            // Verlet integration: newPos = pos + (pos - prevPos) + acc * dt²
            const newX = x + (x - prevX) + particles.acc[i3] * dtSq;
            const newY = y + (y - prevY) + particles.acc[i3 + 1] * dtSq;
            const newZ = z + (z - prevZ) + particles.acc[i3 + 2] * dtSq;
            // Update positions
            particles.prevPos[i3] = x;
            particles.prevPos[i3 + 1] = y;
            particles.prevPos[i3 + 2] = z;
            particles.pos[i3] = newX;
            particles.pos[i3 + 1] = newY;
            particles.pos[i3 + 2] = newZ;
            // Reset acceleration
            particles.acc[i3] = 0;
            particles.acc[i3 + 1] = 0;
            particles.acc[i3 + 2] = 0;
        }
    }
};

export default Fizzix;