const perlin = {
    grad3: [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ],
    p: [],
    perm: new Uint8Array(512),

    init: function() {
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    },

    dot: function(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    },

    mix: function(a, b, t) {
        return (1.0 - t) * a + t * b;
    },

    fade: function(t) {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    },

    noise: function(x, y, z) {
        let X = Math.floor(x);
        let Y = Math.floor(y);
        let Z = Math.floor(z);

        x = x - X;
        y = y - Y;
        z = z - Z;

        X = X & 255;
        Y = Y & 255;
        Z = Z & 255;

        const gi000 = this.perm[X + this.perm[Y + this.perm[Z]]] % 12;
        const gi001 = this.perm[X + this.perm[Y + this.perm[Z + 1]]] % 12;
        const gi010 = this.perm[X + this.perm[Y + 1 + this.perm[Z]]] % 12;
        const gi011 = this.perm[X + this.perm[Y + 1 + this.perm[Z + 1]]] % 12;
        const gi100 = this.perm[X + 1 + this.perm[Y + this.perm[Z]]] % 12;
        const gi101 = this.perm[X + 1 + this.perm[Y + this.perm[Z + 1]]] % 12;
        const gi110 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z]]] % 12;
        const gi111 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z + 1]]] % 12;

        const n000 = this.dot(this.grad3[gi000], x, y, z);
        const n100 = this.dot(this.grad3[gi100], x - 1, y, z);
        const n010 = this.dot(this.grad3[gi010], x, y - 1, z);
        const n110 = this.dot(this.grad3[gi110], x - 1, y - 1, z);
        const n001 = this.dot(this.grad3[gi001], x, y, z - 1);
        const n101 = this.dot(this.grad3[gi101], x - 1, y, z - 1);
        const n011 = this.dot(this.grad3[gi011], x, y - 1, z - 1);
        const n111 = this.dot(this.grad3[gi111], x - 1, y - 1, z - 1);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const nx00 = this.mix(n000, n100, u);
        const nx10 = this.mix(n010, n110, u);
        const nx01 = this.mix(n001, n101, u);
        const nx11 = this.mix(n011, n111, u);

        const nxy0 = this.mix(nx00, nx10, v);
        const nxy1 = this.mix(nx01, nx11, v);

        const nxyz = this.mix(nxy0, nxy1, w);

        return nxyz;
    },

    /**
     * Generates a flow field vector at a specific position
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {number} time - Time for animation
     * @param {object} options - { scale: 0.01, strength: 50 }
     * @returns {object} Flow vector { x, y }
     */
    flowField: function(x, y, time = 0, options = {}) {
        const { scale = 0.01, strength = 50 } = options;
        
        // Use multiple octaves of noise for more natural patterns
        const octave1 = this.noise(x * scale, y * scale, time) * 0.5;
        const octave2 = this.noise(x * scale * 2, y * scale * 2, time * 1.1) * 0.25;
        const octave3 = this.noise(x * scale * 4, y * scale * 4, time * 1.3) * 0.125;
        
        // Combine octaves for angle
        const angle = (octave1 + octave2 + octave3) * Math.PI * 4;
        
        // Use different offset for magnitude to avoid correlation
        const mag1 = this.noise(x * scale + 100, y * scale + 100, time * 0.8);
        const mag2 = this.noise(x * scale * 3 + 200, y * scale * 3 + 200, time * 0.6);
        const magnitude = Math.abs(mag1 * 0.7 + mag2 * 0.3);
        
        return {
            x: Math.cos(angle) * magnitude * strength,
            y: Math.sin(angle) * magnitude * strength
        };
    },

    /**
     * Generates atmospheric flow with Lorenz attractors and vortices
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} time - Time for animation
     * @param {object} options - Flow parameters
     * @returns {object} Atmospheric flow vector { x, y }
     */
    atmosphericFlow: function(x, y, time = 0, options = {}) {
        const { 
            scale = 0.003, 
            strength = 40,
            vortexCount = 3,
            chaosStrength = 0.8,
            globalFlow = { x: 0.5, y: 0.1 }
        } = options;
        
        // Base Perlin flow for large-scale patterns
        const baseFlow = this.flowField(x, y, time, { scale, strength: strength * 0.6 });
        
        // Add Lorenz-like chaotic attractors
        let chaosX = 0, chaosY = 0;
        for (let i = 0; i < vortexCount; i++) {
            const centerX = (x * 0.001 + time * 0.3 + i * 200) % 1000;
            const centerY = (y * 0.001 + time * 0.2 + i * 150) % 1000;
            
            // Lorenz-inspired parameters
            const sigma = 10 + i * 2;
            const rho = 28 + i * 5;
            const beta = 8/3;
            
            // Distance from attractor center
            const dx = (x - centerX * (window.innerWidth || 800) / 1000) * 0.01;
            const dy = (y - centerY * (window.innerHeight || 600) / 1000) * 0.01;
            
            // Lorenz equations adapted for 2D flow
            const lorenzX = sigma * (dy - dx);
            const lorenzY = dx * (rho - Math.sqrt(dx*dx + dy*dy)) - dy;
            
            // Add vortex influence based on distance
            const dist = Math.sqrt(dx*dx + dy*dy) + 0.1;
            const influence = Math.exp(-dist * 0.1) * chaosStrength;
            
            chaosX += lorenzX * influence;
            chaosY += lorenzY * influence;
        }
        
        // Combine base flow with chaotic attractors and global wind
        return {
            x: baseFlow.x + chaosX * strength * 0.4 + globalFlow.x * strength,
            y: baseFlow.y + chaosY * strength * 0.4 + globalFlow.y * strength
        };
    },

    /**
     * Renders atmospheric flow field with vortices
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} time - Current time
     * @param {object} options - Render options
     */
    renderAtmosphericField: function(ctx, width, height, time = 0, options = {}) {
        const { resolution = 20, ...flowOptions } = options;
        
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
        ctx.lineWidth = 0.5;
        
        for (let y = 0; y < height; y += resolution) {
            for (let x = 0; x < width; x += resolution) {
                const flow = this.atmosphericFlow(x, y, time, flowOptions);
                const vx = flow.x * 0.05;
                const vy = flow.y * 0.05;
                
                // Color based on flow intensity
                const intensity = Math.sqrt(vx*vx + vy*vy);
                const alpha = Math.min(0.6, intensity * 0.1);
                
                ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + vx, y + vy);
                ctx.stroke();
                
                // Draw small circles at high-intensity areas
                if (intensity > 2) {
                    ctx.fillStyle = `rgba(150, 200, 255, ${alpha * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    },
};

perlin.init();
export default perlin;