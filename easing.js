export default class Easing {

    static linear(t) {
        return t;
    }

    static easeInQuad(t) {
        return Math.pow(t, 2);
    }

    static easeOutQuad(t) {
        return t * (2 - t);
    }

    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * Math.pow(t, 2) : -1 + (4 - 2 * t) * t;
    }

    static easeInCubic(t) {
        return Math.pow(t, 3);
    }

    static easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * Math.pow(t, 3) : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    static easeInQuart(t) {
        return Math.pow(t, 4);
    }

    static easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    static easeInOutQuart(t) {
        return t < 0.5 ? 8 * Math.pow(t, 4) : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    static easeInQuint(t) {
        return Math.pow(t, 5);
    }

    static easeOutQuint(t) {
        return 1 - Math.pow(1 - t, 5);
    }

    static easeInOutQuint(t) {
        return t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2;
    }

    static easeInSine(t) {
        return 1 - Math.cos((t * Math.PI) / 2);
    }

    static easeOutSine(t) {
        return Math.sin((t * Math.PI) / 2);
    }

    static easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    static easeInExpo(t) {
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }

    static easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    static easeInOutExpo(t) {
        if (t === 0 || t === 1) return t;
        return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    }

    static easeInCirc(t) {
        return 1 - Math.sqrt(1 - Math.pow(t, 2));
    }

    static easeOutCirc(t) {
        return Math.sqrt(1 - Math.pow(t - 1, 2));
    }

    static easeInOutCirc(t) {
        return t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
    }

    static easeInBack(t, s = 1.70158) {
        return t * t * ((s + 1) * t - s);
    }

    static easeOutBack(t, s = 1.70158) {
        return 1 + (t - 1) * (t - 1) * ((s + 1) * (t - 1) + s);
    }

    static easeInOutBack(t, s = 1.70158) {
        if (t < 0.5) {
            return (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2;
        } else {
            return (1 + Math.pow(2 * t - 2, 2) * ((s + 1) * (2 * t - 2) + s)) / 2;
        }
    }

    static easeInElastic(t, a = 1, p = 0.3) {
        if (t === 0 || t === 1) return t;
        const s = p / (2 * Math.PI) * Math.asin(1 / a);
        return -(a * Math.pow(2, 10 * (t - 1))) * Math.sin((t - 1 - s) * (2 * Math.PI) / p);
    }

    static easeOutElastic(t, a = 1, p = 0.3) {
        if (t === 0 || t === 1) return t;
        const s = p / (2 * Math.PI) * Math.asin(1 / a);
        return a * Math.pow(2, -10 * t) * Math.sin((t - 1 - s) * (2 * Math.PI) / p);
    }

    static easeInOutElastic(t, a = 1, p = 0.3) {
        if (t === 0 || t === 1) return t;
        const s = p / (2 * Math.PI) * Math.asin(1 / a);
        if (t < 0.5) {
            return -(a * Math.pow(2, 20 * t - 10)) * Math.sin((20 * t - 11 - s) * (2 * Math.PI) / p) / 2;
        } else {
            return (a * Math.pow(2, -20 * t + 10)) * Math.sin((20 * t - 11 - s) * (2 * Math.PI) / p) / 2 + 1;
        }
    }

    static easeOutBounce(t) {
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    static easeInBounce(t) {
        return 1 - this.easeOutBounce(1 - t);
    }

    static easeInOutBounce(t) {
        return t < 0.5
            ? (1 - this.easeOutBounce(1 - 2 * t)) / 2
            : (1 + this.easeOutBounce(2 * t - 1)) / 2;
    }

    static swing(t) { return this.easeInOutSine(t); }
    static inQuad(t) { return this.easeInQuad(t); }
    static outQuad(t) { return this.easeOutQuad(t); }
    static inOutQuad(t) { return this.easeInOutQuad(t); }
    static inCubic(t) { return this.easeInCubic(t); }
    static outCubic(t) { return this.easeOutCubic(t); }
    static inOutCubic(t) { return this.easeInOutCubic(t); }
    static inQuart(t) { return this.easeInQuart(t); }
    static outQuart(t) { return this.easeOutQuart(t); }
    static inOutQuart(t) { return this.easeInOutQuart(t); }
    static inQuint(t) { return this.easeInQuint(t); }
    static outQuint(t) { return this.easeOutQuint(t); }
    static inOutQuint(t) { return this.easeInOutQuint(t); }
    static inSine(t) { return this.easeInSine(t); }
    static outSine(t) { return this.easeOutSine(t); }
    static inOutSine(t) { return this.easeInOutSine(t); }
    static inExpo(t) { return this.easeInExpo(t); }
    static outExpo(t) { return this.easeOutExpo(t); }
    static inOutExpo(t) { return this.easeInOutExpo(t); }
    static inCirc(t) { return this.easeInCirc(t); }
    static outCirc(t) { return this.easeOutCirc(t); }
    static inOutCirc(t) { return this.easeInOutCirc(t); }
    static inBack(t, s) { return this.easeInBack(t, s); }
    static outBack(t, s) { return this.easeOutBack(t, s); }
    static inOutBack(t, s) { return this.easeInOutBack(t, s); }
    static inElastic(t, a, p) { return this.easeInElastic(t, a, p); }
    static outElastic(t, a, p) { return this.easeOutElastic(t, a, p); }
    static inOutElastic(t, a, p) { return this.easeInOutElastic(t, a, p); }
    static inBounce(t) { return this.easeInBounce(t); }
    static outBounce(t) { return this.easeOutBounce(t); }
    static inOutBounce(t) { return this.easeInOutBounce(t); }

};