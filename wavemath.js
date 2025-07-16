class WaveForm {
    constructor(components = [], immutable = false) {
        this.components = components.slice();
        this.immutable = immutable;
    }

    add(fn, params = {}) {
        if (this.immutable) throw new Error('WaveForm is immutable');
        const { freq = 1, amp = 1, phase = 0, ...rest } = params;
        this.components.push({ fn, freq, amp, phase, ...rest });
    }

    sample(x) {
        return this.components.reduce((sum, comp) => {
            return sum + comp.fn(x, comp);
        }, 0);
    }

    clear() {
        if (this.immutable) throw new Error('WaveForm is immutable');
        this.components = [];
    }

    remove(index) {
        if (this.immutable) throw new Error('WaveForm is immutable');
        if (index < 0 || index >= this.components.length) throw new Error('Index out of bounds');
        this.components.splice(index, 1);
    }

    filter(predicate) {
        if (this.immutable) throw new Error('WaveForm is immutable');
        this.components = this.components.filter(predicate);
    }

    clone(immutable = this.immutable) {
        return new WaveForm(this.components, immutable);
    }

    sine(params = {}) {
        this.add((x, { freq, amp, phase }) =>
            amp * Math.sin(freq * x + phase), params);
    }

    cosine(params = {}) {
        this.add((x, { freq, amp, phase }) =>
            amp * Math.cos(freq * x + phase), params);
    }

    square(params = {}) {
        this.add((x, { freq, amp, phase }) =>
            amp * (Math.sin(freq * x + phase) >= 0 ? 1 : -1), params);
    }

    sawtooth(params = {}) {
        this.add((x, { freq, amp, phase }) => {
            let t = (freq * x + phase) / (2 * Math.PI);
            t = t - Math.floor(t); // mod 1
            return amp * (2 * t - 1);
        }, params);
    }

    triangle(params = {}) {
        this.add((x, { freq, amp, phase }) => {
            let t = (freq * x + phase) / (2 * Math.PI);
            t = t - Math.floor(t); // mod 1
            return amp * (t < 0.5 ? 4 * t - 1 : 3 - 4 * t);
        }, params);
    }

    get componentCount() {
        return this.components.length;
    }

}