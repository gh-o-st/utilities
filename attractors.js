/**
 * Base class for 3D attractors.
 * @class
 */
export const Attractor = class {
    /**
     * @param {Object} [options={}]
     * @param {string} [options.name='Attractor'] - Name of the attractor.
     * @param {number} [options.dt=0.01] - Time step for integration.
     * @param {number} [options.count=1000] - Number of states.
     * @param {{x: number, y: number, z: number}} [options.seeds={x:1, y:0, z:0}] - Initial seed values.
     */
    constructor({ name = 'Attractor', dt = 0.01, count = 1000, seeds = { x: 1, y: 0, z: 0 } } = {}) {
        this.name = name;
        this.dt = dt;
        this.states = {
            x: new Float32Array(count),
            y: new Float32Array(count),
            z: new Float32Array(count)
        }

        for (let i = 0; i < count; i++) {
            this.states.x[i] = this.randomize(seeds).x;
            this.states.y[i] = this.randomize(seeds).y;
            this.states.z[i] = this.randomize(seeds).z;
        }
    }

    /**
     * Compute derivatives for the attractor.
     * Override in subclasses.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {{x: number, y: number, z: number}}
     * @throws {Error} If not implemented in subclass.
     */
    derivatives(x, y, z) {
        throw new Error('derivatives() must be implemented by subclass');
    }

    /**
     * Update the attractor states using the specified integration method.
     * @param {'euler'|'rk2'|'rk4'} [integration='euler'] - Integration method.
     * @param {number} [dt=this.dt] - Time step.
     * @returns {{x: number, y: number, z: number}} - First state after update.
     */
    update(integration = 'euler', dt = this.dt) {
        const s = this.states;
        const n = s.x.length;

        for (let i = 0; i < n; i++) {
            switch (integration) {
                case 'euler': {
                    const d = this.derivatives(s.x[i], s.y[i], s.z[i]);
                    s.x[i] += d.x * dt;
                    s.y[i] += d.y * dt;
                    s.z[i] += d.z * dt;
                    break;
                }
                case 'rk2': {
                    const k1 = this.derivatives(s.x[i], s.y[i], s.z[i]);
                    const k2 = this.derivatives(
                        s.x[i] + 0.5 * dt * k1.x,
                        s.y[i] + 0.5 * dt * k1.y,
                        s.z[i] + 0.5 * dt * k1.z
                    );
                    s.x[i] += dt * k2.x;
                    s.y[i] += dt * k2.y;
                    s.z[i] += dt * k2.z;
                    break;
                }
                case 'rk4': {
                    const x0 = s.x[i], y0 = s.y[i], z0 = s.z[i];
                    const k1 = this.derivatives(x0, y0, z0);
                    const k2 = this.derivatives(
                        x0 + 0.5 * dt * k1.x,
                        y0 + 0.5 * dt * k1.y,
                        z0 + 0.5 * dt * k1.z
                    );
                    const k3 = this.derivatives(
                        x0 + 0.5 * dt * k2.x,
                        y0 + 0.5 * dt * k2.y,
                        z0 + 0.5 * dt * k2.z
                    );
                    const k4 = this.derivatives(
                        x0 + dt * k3.x,
                        y0 + dt * k3.y,
                        z0 + dt * k3.z
                    );
                    s.x[i] += (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x);
                    s.y[i] += (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y);
                    s.z[i] += (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z);
                    break;
                }
                default: {
                    throw new Error(`Unsupported integration method: ${integration}`);
                }
            }
        }
        return { x: s.x[0], y: s.y[0], z: s.z[0] };
    }

    /**
     * Randomize seed values slightly.
     * @param {{x: number, y: number, z: number}} [seeds={x:1, y:0, z:0}]
     * @returns {{x: number, y: number, z: number}}
     */
    randomize(seeds = { x: 1, y: 0, z: 0 }) {
        const newSeeds = {
            x: seeds.x + (Math.random() - 0.5) * 0.01,
            y: seeds.y + (Math.random() - 0.5) * 0.02,
            z: seeds.z + (Math.random() - 0.5) * 0.04
        };
        return newSeeds;
    }

    /**
     * Reset all states to randomized values near the given state.
     * @param {{x: number, y: number, z: number}} [state={x:1, y:0, z:0}]
     */
    reset(state = { x: 1, y: 0, z: 0 }) {
        for (let i = 0; i < this.states.x.length; i++) {
            this.states.x[i] = this.randomize(state).x;
            this.states.y[i] = this.randomize(state).y;
            this.states.z[i] = this.randomize(state).z;
        }
    }
};

/**
 * Thomas Attractor
 * @class
 * @extends Attractor
 */
export const ThomasAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.b=0.208186]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ b = 0.208186, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Thomas Attractor', dt, seeds, count });
        this.b = b;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: Math.sin(y) - this.b * x,
            y: Math.sin(z) - this.b * y,
            z: Math.sin(x) - this.b * z
        };
    }
};

/**
 * Langford Attractor (Aizawa)
 * @class
 * @extends Attractor
 */
export const LangfordAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=0.95]
     * @param {number} [options.b=0.7]
     * @param {number} [options.c=0.6]
     * @param {number} [options.d=3.5]
     * @param {number} [options.e=0.25]
     * @param {number} [options.f=0.1]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Langford Attractor (Aizawa)', dt, seeds, count });
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: (z - this.b) * x - this.d * y,
            y: this.d * x + (z - this.b) * y,
            z: this.c + this.a * z - (z ** 3) / 3 - (x ** 2 + y ** 2) * (1 + this.e * z) + this.f * z * x ** 3
        };
    }
};

/**
 * Lorenz (1963) Attractor
 * @class
 * @extends Attractor
 */
export const LorenzAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.sigma=10]
     * @param {number} [options.rho=28]
     * @param {number} [options.beta=8/3]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ sigma = 10, rho = 28, beta = (8 / 3), dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Lorenz-63 Attractor', dt, seeds, count });
        this.sigma = sigma;
        this.rho = rho;
        this.beta = beta;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: this.sigma * (y - x),
            y: x * (this.rho - z) - y,
            z: x * y - this.beta * z
        };
    }
};

/**
 * Lorenz (1983) Attractor
 * @class
 * @extends Attractor
 */
export const Lorenz83Attractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=0.95]
     * @param {number} [options.b=7.91]
     * @param {number} [options.f=4.83]
     * @param {number} [options.g=4.66]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 0.95, b = 7.91, f = 4.83, g = 4.66, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Lorenz-83 Attractor', dt, seeds, count });
        this.a = a;
        this.b = b;
        this.f = f;
        this.g = g;
    }

    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: -this.a * x - y**2 - z**2 + this.a * this.f,
            y: -y + x * y - this.b * x * z + this.g,
            z: -z + this.b * x * y + x * z
        };
    }
};

/**
 * Dadras Attractor
 * @class
 * @extends Attractor
 */
export const DadrasAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=3]
     * @param {number} [options.b=2.7]
     * @param {number} [options.c=1.7]
     * @param {number} [options.d=2]
     * @param {number} [options.e=9]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 3, b = 2.7, c = 1.7, d = 2, e = 9, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Dadras Attractor', dt, seeds, count });
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: y - this.a * x + this.b * y * z,
            y: this.c * y - x * z + z,
            z: this.d * x * y - this.e * z
        };
    }
};

/**
 * Chen-Lee Attractor
 * @class
 * @extends Attractor
 */
export const ChenLeeAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=5]
     * @param {number} [options.b=-10]
     * @param {number} [options.c=-0.38]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 5, b = -10, c = -0.38, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Chen-Lee Attractor', dt, seeds, count });
        this.a = a;
        this.b = b;
        this.c = c;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: this.a * x - y * z,
            y: this.b * y + x * z,
            z: this.c * z + (x * y) / 3
        };
    }
};

/**
 * Rössler Attractor
 * @class
 * @extends Attractor
 */
export const RosslerAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=0.2]
     * @param {number} [options.b=0.2]
     * @param {number} [options.c=5.7]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 0.2, b = 0.2, c = 5.7, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Rössler Attractor', dt, seeds, count });
        this.a = a;
        this.b = b;
        this.c = c;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: -(y + z),
            y: x + this.a * y,
            z: this.b + z * (x - this.c)
        };
    }
};

/**
 * Halvorsen Attractor
 * @class
 * @extends Attractor
 */
export const HalvorsenAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=1.89]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 1.89, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Halvorsen Attractor', dt, seeds, count });
        this.a = a;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: -this.a * x - 4 * y - 4 * z - y**2,
            y: -this.a * y - 4 * z - 4 * x - z**2,
            z: -this.a * z - 4 * x - 4 * y - x**2
        };
    }
};

/**
 * Rabinovich-Fabrikant Attractor
 * @class
 * @extends Attractor
 */
export const RabinovichFabrikantAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=0.14]
     * @param {number} [options.g=0.10]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 0.14, g = 0.10, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Rabinovich-Fabrikant Attractor', dt, seeds, count });
        this.a = a;
        this.g = g;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: y * (z - 1 + x**2) + this.g * x,
            y: x * (3 * z + 1 - x**2) + this.g * y,
            z: -2 * z * (this.a + x * y)
        };
    }
};

/**
 * Three-Scroll Attractor (Chaotic Unified System)
 * @class
 * @extends Attractor
 */
export const ThreeScrollAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=32.48]
     * @param {number} [options.b=45.84]
     * @param {number} [options.c=1.18]
     * @param {number} [options.d=0.13]
     * @param {number} [options.e=0.57]
     * @param {number} [options.f=14.7]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 32.48, b = 45.84, c = 1.18, d = 0.13, e = 0.57, f = 14.7, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Three-Scroll Attractor', dt, seeds, count });
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: this.a * (y - x) + this.d * x * z,
            y: this.b * x - x * z + this.f * y,
            z: this.c * z + x * y - this.e * x**2
        };
    }
};

/**
 * Sprott Attractor
 * @class
 * @extends Attractor
 */
export const SprottAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=2.07]
     * @param {number} [options.b=1.79]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 2.07, b = 1.79, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Sprott Attractor', dt, seeds, count });
        this.a = a;
        this.b = b;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: y + this.a * x * y + x * z,
            y: 1 - this.b * x**2 + y * z,
            z: x - x**2 - y**2
        };
    }
};

/**
 * Four Wing Attractor
 * @class
 * @extends Attractor
 */
export const FourWingAttractor = class extends Attractor {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.a=0.2]
     * @param {number} [options.b=0.01]
     * @param {number} [options.c=-0.4]
     * @param {number} [options.dt=0.01]
     * @param {number} [options.count=1000]
     * @param {{x: number, y: number, z: number}} [options.seeds]
     */
    constructor({ a = 0.2, b = 0.01, c = -0.4, dt = 0.01, count = 1000, seeds } = {}) {
        super({ name: 'Four Wing Attractor', dt, seeds, count });
        this.a = a;
        this.b = b;
        this.c = c;
    }
    /**
     * @inheritdoc
     */
    derivatives(x, y, z) {
        return {
            x: this.a * x + y * z,
            y: this.b * x + this.c * y - x * z,
            z: -z - x * y
        };
    }
};