export default class WaveMath {

    static sine(t, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
        return amplitude * Math.sin(2 * Math.PI * frequency * t + phase) + offset;
    }

    static cosine(t, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
        return amplitude * Math.cos(2 * Math.PI * frequency * t + phase) + offset;
    }

    static square(t, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
        const sineValue = Math.sin(2 * Math.PI * frequency * t + phase);
        return amplitude * Math.sign(sineValue) + offset;
    }

    static triangle(t, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
        const period = 1 / frequency;
        const adjustedT = (t + phase / (2 * Math.PI * frequency)) % period;
        const normalizedT = adjustedT / period;
        
        let value;
        if (normalizedT < 0.5) {
            value = 4 * normalizedT - 1;
        } else {
            value = 3 - 4 * normalizedT;
        }
        
        return amplitude * value + offset;
    }

    static sawtooth(t, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
        const period = 1 / frequency;
        const adjustedT = (t + phase / (2 * Math.PI * frequency)) % period;
        const normalizedT = adjustedT / period;
        return amplitude * (2 * normalizedT - 1) + offset;
    }

    static noise(t, seed = 0) {
        const x = Math.sin(t * 12.9898 + seed) * 43758.5453;
        return x - Math.floor(x);
    }

    static smoothNoise(t, seed = 0) {
        const integer = Math.floor(t);
        const fractional = t - integer;
        
        const a = this.noise(integer, seed);
        const b = this.noise(integer + 1, seed);
        
        const smoothT = fractional * fractional * (3 - 2 * fractional);
        return a * (1 - smoothT) + b * smoothT;
    }

    static dampen(value, t, dampingFactor = 0.1) {
        return value * Math.exp(-dampingFactor * t);
    }

    static amplify(value, t, growthFactor = 0.1) {
        return value * Math.exp(growthFactor * t);
    }

    static fade(value, t, duration = 1) {
        if (t >= duration) return 0;
        return value * (1 - t / duration);
    }

    static fadeIn(value, t, duration = 1) {
        if (t >= duration) return value;
        return value * (t / duration);
    }

    static pulse(t, frequency = 1, dutyCycle = 0.5) {
        const period = 1 / frequency;
        const position = (t % period) / period;
        return position < dutyCycle ? 1 : 0;
    }

    static add(...waves) {
        return (t) => waves.reduce((sum, wave) => sum + wave(t), 0);
    }

    static multiply(...waves) {
        return (t) => waves.reduce((product, wave) => product * wave(t), 1);
    }

    static modulate(carrier, modulator) {
        return (t) => carrier(t) * modulator(t);
    }

    static chirp(t, startFreq = 1, endFreq = 2, duration = 1) {
        if (t > duration) t = duration;
        const freq = startFreq + (endFreq - startFreq) * (t / duration);
        return Math.sin(2 * Math.PI * freq * t);
    }

    static envelope(t, attack = 0.1, decay = 0.1, sustain = 0.7, release = 0.2, sustainLevel = 0.7) {
        if (t < attack) {
            return t / attack;
        } else if (t < attack + decay) {
            const decayT = (t - attack) / decay;
            return 1 - decayT * (1 - sustainLevel);
        } else if (t < attack + decay + sustain) {
            return sustainLevel;
        } else if (t < attack + decay + sustain + release) {
            const releaseT = (t - attack - decay - sustain) / release;
            return sustainLevel * (1 - releaseT);
        } else {
            return 0;
        }
    }

    static harmonics(t, fundamental = 1, harmonicWeights = [1, 0.5, 0.3, 0.2]) {
        return harmonicWeights.reduce((sum, weight, index) => {
            const harmonic = (index + 1) * fundamental;
            return sum + weight * Math.sin(2 * Math.PI * harmonic * t);
        }, 0);
    }

    static normalize(value, min, max) {
        return (value - min) / (max - min);
    }

    static clampWave(value, min = -1, max = 1) {
        return Math.max(min, Math.min(max, value));
    }

    static quantize(value, steps = 8) {
        const stepSize = 2 / steps;
        return Math.round(value / stepSize) * stepSize;
    }

    static frequency(waveFunction, sampleRate = 1000, duration = 1) {
        let crossings = 0;
        let lastValue = waveFunction(0);
        
        for (let i = 1; i < sampleRate * duration; i++) {
            const t = i / sampleRate;
            const currentValue = waveFunction(t);
            
            if ((lastValue >= 0 && currentValue < 0) || (lastValue < 0 && currentValue >= 0)) {
                crossings++;
            }
            lastValue = currentValue;
        }

        return crossings / (2 * duration);
    }

    static amplitude(waveFunction, sampleRate = 1000, duration = 1) {
        let max = -Infinity;
        let min = Infinity;
        
        for (let i = 0; i < sampleRate * duration; i++) {
            const t = i / sampleRate;
            const value = waveFunction(t);
            max = Math.max(max, value);
            min = Math.min(min, value);
        }
        
        return (max - min) / 2;
    }
};