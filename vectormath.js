/**
 * Base class for vector mathematical operations.
 * All operations are immutable by default. Use 'methodSelf' variants for mutable operations for performance.
 */
export class Vector {
    constructor({perfCritical = false, epsilon = 1e-6} = {}) {
        this.epsilon = epsilon;
        this.perfCritical = perfCritical;
    }

    /**
     * Abstract getter for vector components.
     * Must be implemented by subclasses.
     * @returns {number[]} Array of vector components
     * @throws {Error} If not implemented by subclass
     */
    get components() { throw new Error("Subclasses must implement components getter"); }

    /**
     * Abstract factory method to create vector from components array.
     * Must be implemented by subclasses.
     * @param {number[]} components - Array of vector components
     * @returns {Vector} New vector instance
     * @throws {Error} If not implemented by subclass
     */
    static fromComponents(components) { throw new Error("Subclasses must implement fromComponents"); }

    /**
     * Calculates the squared magnitude of the vector.
     * Useful for performance when comparing distances.
     * @returns {number} The squared magnitude
     */
    magnitudeSquared() { throw new Error("Subclasses must implement magnitudeSquared"); }

    /**
     * Calculates the magnitude (length) of the vector.
     * @returns {number} The magnitude of the vector.
     */
    magnitude() {
        return Math.sqrt(this.magnitudeSquared());
    }

    /**
     * Linearly interpolates between this object and another.
     * Subclasses must implement this method.
     *
     * @param {Object} other - The other object to interpolate towards.
     * @param {number} t - The interpolation factor, typically between 0 and 1.
     * @throws {Error} If not implemented in a subclass.
     * @returns {Object} The interpolated result.
     */
    lerp(other, t) { throw new Error("Subclasses must implement lerp"); }

    /**
     * Projects the current vector onto another vector.
     * Subclasses must implement this method to define the projection logic.
     *
     * @param {Vector} other - The vector to project onto.
     * @throws {Error} If the method is not implemented in a subclass.
     * @returns {Vector} The projected vector.
     */
    project(other) { throw new Error("Subclasses must implement project"); }

    /**
     * Restricts a value to be within the specified minimum and maximum bounds.
     * Subclasses must implement this method.
     *
     * @param {number} min - The lower bound.
     * @param {number} max - The upper bound.
     * @returns {number} The clamped value.
     * @throws {Error} If not implemented in a subclass.
     */
    clamp(min, max) { throw new Error("Subclasses must implement clamp"); }

    /**
     * Abstract method to clone the vector.
     * @returns {Vector} New vector instance
     */
    clone() { throw new Error("Subclasses must implement clone"); }
}

/**
 * 2D Vector class with x and y components.
 * Operations are immutable by default. Use 'methodSelf' variants for mutable operations for performance.
 * @extends Vector
 */
export class Vec2 extends Vector {
    /**
     * Creates a new 2D vector.
     * @param {number} [x=0] - The x component
     * @param {number} [y=0] - The y component
     */
    constructor(x = 0, y = 0, {perfCritical = false, epsilon = 1e-6} = {}) {
        super({perfCritical, epsilon});
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
    }

    /**
     * Gets the components as an array [x, y].
     * @returns {number[]} Array containing [x, y]
     */
    get components() {
        return [this.x, this.y];
    }

    /**
     * Creates an exact copy of this vector.
     * @returns {Vec2} New Vec2 instance with same values
     */
    clone() {
        return new Vec2(this.x, this.y, { perfCritical: this.perfCritical, epsilon: this.epsilon });
    }

    /**
     * Creates a new vector that is the rotated version of this vector (immutable).
     * @param {number} angle - The angle to rotate by (in radians)
     * @returns {Vec2} New Vec2 with the result
     */
    rotate(angle, { preset = false } = {}) {
        return this.clone().rotateSelf(angle, { preset });
    }

    /**
     * Rotates this vector by an angle (mutable).
     * @param {number} angle - Angle in radians
     * @returns {Vec2} This vector for chaining
     */
    rotateSelf(angle = 0.0, { preset = false } = {}) {
        if (!this.perfCritical) {
            if (typeof angle !== "number") {
                throw new Error("Argument must be a number");
            }
        }

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let newX, newY;

        if (preset === false) {
            newX = this.x * cos - this.y * sin;
            newY = this.x * sin + this.y * cos;
        } else {
            switch (preset) {
                case 'right': {
                    newX = this.y;
                    newY = -this.x;
                    break;
                }
                case 'left': {
                    newX = -this.y;
                    newY = this.x;
                    break;
                }
                case 'flipped': {
                    newX = -this.x;
                    newY = -this.y;
                    break;
                }
                default: {
                    if (this.perfCritical) {
                        console.warn(`Unknown preset rotation: ${preset}`, 'skipping rotation');
                    } else {
                        throw new Error(`Unknown preset rotation: ${preset}`);
                    }
                }
            }
        }
        this.x = newX;
        this.y = newY;
        return this;
    }
    
    /**
     * Adds another vector and returns a new vector (immutable).
     * @param {Vec2} other - The vector to add
     * @returns {Vec2} New Vec2 with the result
     */
    add(other) {
        return this.clone().addSelf(other);
    }

    /**
     * Adds another vector to this vector (mutable).
     * @param {Vec2} other - The vector to add
     * @returns {Vec2} This vector for chaining
     * @throws {Error} If other is not a Vec2 instance
     */
    addSelf(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec2)) {
                throw new Error("Argument must be a Vec2 instance");
            }
        }
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    /**
     * Subtracts another vector and returns a new vector (immutable).
     * @param {Vec2} other - The vector to subtract
     * @returns {Vec2} New Vec2 with the result
     */
    subtract(other) {
        return this.clone().subtractSelf(other);
    }
    
    /**
     * Subtracts another vector from this vector (mutable).
     * @param {Vec2} other - The vector to subtract
     * @returns {Vec2} This vector for chaining
     * @throws {Error} If other is not a Vec2 instance
     */
    subtractSelf(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec2)) {
                throw new Error("Argument must be a Vec2 instance");
            }
        }
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    /**
     * Creates a new vector that is the result of multiplying this vector by a scalar (immutable).
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vec2} New Vec2 with the result
     * @throws {Error} If scalar is not a number
     */
    multiply(scalar) {
        return this.clone().multiplySelf(scalar);
    }

    /**
     * Multiplies this vector by a scalar (mutable).
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vec2} This vector for chaining
     * @throws {Error} If scalar is not a number
     */
    multiplySelf(scalar) {
        if (!this.perfCritical) {
            if (typeof scalar !== "number") {
                throw new Error("Argument must be a number");
            }
        }
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /**
     * Divides this vector by a scalar and returns a new vector (immutable).
     * @param {number} scalar - The scalar to divide by
     * @returns {Vec2} New Vec2 with the result
     * @throws {Error} If scalar is not a number or is zero
     */
    divide(scalar) {
        return this.clone().divideSelf(scalar);
    }

    /**
     * Divides this vector by a scalar (mutable).
     * @param {number} scalar - The scalar to divide by
     * @returns {Vec2} This vector for chaining
     * @throws {Error} If scalar is not a number or is zero
     */
    divideSelf(scalar) {
        if (!this.perfCritical) {
            if (typeof scalar !== "number") {
                throw new Error("Argument must be a number");
            }
        }
        if (Math.abs(scalar) < this.epsilon) {
            throw new Error("Division by zero or near-zero value");
        }
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }

    /**
     * Negates this vector and returns a new vector (immutable).
     * @returns {Vec2} New Vec2 with the negated result
     */
    negate() {
        return this.clone().negateSelf();
    }

    /**
     * Negates this vector (mutable).
     * @returns {Vec2} This vector for chaining
     */
    negateSelf() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * Normalizes this vector and returns a new vector (immutable).
     * @returns {Vec2} New Vec2 with the normalized result
     */
    normalize() {
        return this.clone().normalizeSelf();
    }

    /**
     * Normalizes this vector to unit length (mutable).
     * @returns {Vec2} This vector for chaining
     * @throws {Error} If vector has zero magnitude
     */
    normalizeSelf() {
        const magSq = this.x ** 2 + this.y ** 2;
        if (magSq < this.epsilon ** 2) {
            throw new Error("Cannot normalize zero vector");
        }
        
        const mag = Math.sqrt(magSq);
        this.x /= mag;
        this.y /= mag;
        return this;
    }

    /**
     * Returns a new vector reflected about a normal (immutable).
     * @param {Vec2} normal - The normal vector to reflect about (should be normalized)
     * @returns {Vec2} New Vec2 with the reflected result
     */
    reflect(normal) {
        return this.clone().reflectSelf(normal);
    }

    /**
     * Reflects this vector about a normal (mutable).
     * @param {Vec2} normal - The normal vector to reflect about (should be normalized)
     * @returns {Vec2} This vector for chaining
     */
    reflectSelf(normal) {
        if (!this.perfCritical) {
            if (!(normal instanceof Vec2)) {
                throw new Error("Argument must be a Vec2 instance");
            }
            if (Math.abs(normal.magnitude() - 1) > this.epsilon) {
                throw new Error("Normal must be normalized");
            }
        }
        const dot = this.dot(normal);
        this.x = this.x - 2 * dot * normal.x;
        this.y = this.y - 2 * dot * normal.y;
        return this;
    }

    /**
     * Calculates the dot product with another vector.
     * @param {Vec2} other - The other vector
     * @returns {number} The dot product
     * @throws {Error} If other is not a Vec2 instance
     */
    dot(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec2)) {
                throw new Error("Argument must be a Vec2 instance");
            }
        }
        return this.x * other.x + this.y * other.y;
    }

    /**
     * Calculates the cross product with another vector (2D cross product).
     * Returns the z-component of the 3D cross product.
     * @param {Vec2} other - The other vector
     * @returns {number} The cross product (z-component)
     * @throws {Error} If other is not a Vec2 instance
     */
    cross(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec2)) {
                throw new Error("Argument must be a Vec2 instance");
            }
        }
        return this.x * other.y - this.y * other.x;
    }

    /**
     * Calculates the squared distance to another vector.
     * More performant for comparing distances.
     * @param {Vec2} other - The other vector
     * @returns {number} The squared distance
     */
    distanceToSquared(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec2)) {
                throw new Error("Argument must be a Vec2 instance");
            }
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx ** 2 + dy ** 2;
    }

    /**
     * Calculates and returns the squared magnitude (length) of the vector.
     * This avoids the computational cost of a square root operation.
     * @returns {number} The squared magnitude of the vector.
     */
    magnitudeSquared() {
        return this.x ** 2 + this.y ** 2;
    }

    /**
     * Calculates distance to another vector.
     * @param {Vec2} other - The other vector
     * @returns {number} The distance
     */
    distanceTo(other) {
        return Math.sqrt(this.distanceToSquared(other));
    }

    /**
     * Calculates the angle between this vector and another.
     * @param {Vec2} other - The other vector
     * @returns {number} Angle in radians
     * @throws {Error} If other is not a Vec2 instance
     */
    angleTo(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec2)) {
                throw new Error("Argument must be a Vec2 instance");
            }
        }

        const thisMagSq = this.magnitudeSquared();
        const otherMagSq = other.magnitudeSquared();
        const denom = Math.sqrt(thisMagSq * otherMagSq);

        if (denom < this.epsilon ** 2) {
            if (this.perfCritical) {
                return 0;
            }
            throw new Error("Cannot compute angle with zero vector");
        }

        const dotProduct = this.dot(other);
        const cosTheta = dotProduct / denom;

        // Numerical stability clamp
        const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
        return Math.acos(clampedCosTheta);
    }

    /**
     * Linearly interpolates between this vector and another.
     * @param {Vec2} other - The target vector.
     * @param {number} t - The interpolation factor (0 = this, 1 = other).
     * @returns {Vec2} A new, interpolated Vec2.
     */
    lerp(other, t) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec2)) throw new Error("Argument must be a Vec2 instance.");
            if (typeof t !== "number" || t < 0 || t > 1) throw new Error("t must be a number between 0 and 1.");
        }
        const invT = 1 - t;
        return new Vec2(
            this.x * invT + other.x * t,
            this.y * invT + other.y * t
        );
    }

    /**
     * Projects this vector onto another vector.
     * @param {Vec2} onto - The vector to project onto.
     * @returns {Vec2} A new Vec2 representing the projection.
     */
    project(onto) {
        if (!this.perfCritical) {
            if (!(onto instanceof Vec2)) throw new Error("Argument must be a Vec2 instance.");
        }
        const ontoMagSq = onto.magnitudeSquared();
        if (ontoMagSq < this.epsilon ** 2) {
            throw new Error("Cannot project onto a zero vector.");
        }
        const dotProduct = this.dot(onto);
        const scale = dotProduct / ontoMagSq;
        return new Vec2(onto.x * scale, onto.y * scale);
    }

    /**
     * Clamps the components of this vector between the components of two other vectors.
     * @param {Vec2} min - The vector with minimum component values.
     * @param {Vec2} max - The vector with maximum component values.
     * @returns {Vec2} A new, clamped Vec2.
     */
    clamp(min, max) {
        if (!this.perfCritical) {
            if (!(min instanceof Vec2) || !(max instanceof Vec2)) {
                throw new Error("min and max must be Vec2 instances.");
            }
        }
        return new Vec2(
            Math.max(min.x, Math.min(this.x, max.x)),
            Math.max(min.y, Math.min(this.y, max.y))
        );
    }

    /**
     * Creates a zero vector (0, 0).
     * @returns {Vec2} New zero vector
     */
    static zero() {
        return new Vec2(0, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a unit vector (1, 1).
     * @returns {Vec2} New unit vector
     */
    static one() {
        return new Vec2(1, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing up (0, 1).
     * @returns {Vec2} New up vector
     */
    static up() {
        return new Vec2(0, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing right (1, 0).
     * @returns {Vec2} New right vector
     */
    static right() {
        return new Vec2(1, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing down (0, -1).
     * @returns {Vec2} New down vector
     */
    static down() {
        return new Vec2(0, -1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing left (-1, 0).
     * @returns {Vec2} New left vector
     */
    static left() {
        return new Vec2(-1, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a Vec2 from a components array.
     * @param {number[]} components - Array with [x, y] values
     * @returns {Vec2} New Vec2 instance
     */
    static fromComponents([x, y], options = {}) {
        return new Vec2(x, y, options);
    }
};

/**
 * 3D Vector class with x, y, and z components.
 * Operations are immutable by default. Use 'methodSelf' variants for mutable operations for performance.
 * @extends Vector
 */
export class Vec3 extends Vector {
    /**
     * Creates a new 3D vector.
     * @param {number} [x=0] - The x component
     * @param {number} [y=0] - The y component
     * @param {number} [z=0] - The z component
     */
    constructor(x = 0, y = 0, z = 0, {perfCritical = false, epsilon = 1e-6} = {}) {
        super({perfCritical, epsilon});
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.z = z;
    }

    /**
     * Gets the components as an array [x, y, z].
     * @returns {number[]} Array containing [x, y, z]
     */
    get components() {
        return [this.x, this.y, this.z];
    }

    /**
     * Creates an exact copy of this vector.
     * @returns {Vec3} New Vec3 instance with same values
     */
    clone() {
        return new Vec3(this.x, this.y, this.z, { perfCritical: this.perfCritical, epsilon: this.epsilon });
    }

    /**
     * Creates a new vector that is the result of rotating this vector around an axis by an angle (immutable).
     * @param {Vec3} axis - The axis to rotate around
     * @param {number} angle - Angle in radians
     * @returns {Vec3} New Vec3 with the rotated result
     * @throws {Error} If axis is not a Vec3 instance
     */
    rotate(axis, angle) {
        return this.clone().rotateSelf(axis, angle);
    }

    /**
     * Rotates this vector around an axis by an angle (mutable).
     * @param {Vec3} axis - The axis to rotate around
     * @param {number} angle - Angle in radians
     * @returns {Vec3} This vector for chaining
     */
    rotateSelf(axis, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dotProduct = this.dot(axis);
        
        if (!this.perfCritical) {
            if (!(axis instanceof Vec3)) {
                throw new Error("Axis must be a Vec3 instance");
            }
            if (Math.abs(axis.magnitude() - 1) > this.epsilon) {
                throw new Error("Axis must be normalized");
            }
            
            const crossProduct = axis.cross(this);
            
            this.x = this.x * cos + crossProduct.x * sin + axis.x * dotProduct * (1 - cos);
            this.y = this.y * cos + crossProduct.y * sin + axis.y * dotProduct * (1 - cos);
            this.z = this.z * cos + crossProduct.z * sin + axis.z * dotProduct * (1 - cos);
        } else {
            const rotatedX = this.x * cos + (axis.y * this.z - axis.z * this.y) * sin + axis.x * dotProduct * (1 - cos);
            const rotatedY = this.y * cos + (axis.z * this.x - axis.x * this.z) * sin + axis.y * dotProduct * (1 - cos);
            const rotatedZ = this.z * cos + (axis.x * this.y - axis.y * this.x) * sin + axis.z * dotProduct * (1 - cos);
            
            this.x = rotatedX;
            this.y = rotatedY;
            this.z = rotatedZ;
        }
        return this;
    }

    /**
     * Adds another vector and returns a new vector (immutable).
     * @param {Vec3} other - The vector to add
     * @returns {Vec3} New Vec3 with the result
     */
    add(other) {
        return this.clone().addSelf(other);
    }

    /**
     * Adds another vector to this vector (mutable).
     * @param {Vec3} other - The vector to add
     * @returns {Vec3} This vector for chaining
     * @throws {Error} If other is not a Vec3 instance
     */
    addSelf(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
        }
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
        return this;
    }

    /**
     * Subtracts another vector and returns a new vector (immutable).
     * @param {Vec3} other - The vector to subtract
     * @returns {Vec3} New Vec3 with the result
     */
    subtract(other) {
        return this.clone().subtractSelf(other);
    }
    
    /**
     * Subtracts another vector from this vector (mutable).
     * @param {Vec3} other - The vector to subtract
     * @returns {Vec3} This vector for chaining
     * @throws {Error} If other is not a Vec3 instance
     */
    subtractSelf(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
        }
        this.x -= other.x;
        this.y -= other.y;
        this.z -= other.z;
        return this;
    }

    /**
     * Multiplies this vector by a scalar and returns a new vector (immutable).
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vec3} New Vec3 with the result
     */
    multiply(scalar) {
        return this.clone().multiplySelf(scalar);
    }

    /**
     * Multiplies this vector by a scalar (mutable).
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vec3} This vector for chaining
     * @throws {Error} If scalar is not a number
     */
    multiplySelf(scalar) {
        if (!this.perfCritical) {
            if (typeof scalar !== "number") {
                throw new Error("Argument must be a number");
            }
        }
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    /**
     * Divides this vector by a scalar and returns a new vector (immutable).
     * @param {number} scalar - The scalar to divide by
     * @returns {Vec3} New Vec3 with the result
     */
    divide(scalar) {
        return this.clone().divideSelf(scalar);
    }

    /**
     * Divides this vector by a scalar (mutable).
     * @param {number} scalar - The scalar to divide by
     * @returns {Vec3} This vector for chaining
     * @throws {Error} If scalar is not a number or is zero
     */
    divideSelf(scalar) {
        if (!this.perfCritical) {
            if (typeof scalar !== "number") {
                throw new Error("Argument must be a number");
            }
        }
        if (Math.abs(scalar) < this.epsilon) {
            throw new Error("Division by zero or near-zero value");
        }
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        return this;
    }

    /**
     * Negates this vector and returns a new vector (immutable).
     * @returns {Vec3} New Vec3 with the negated result
     */
    negate() {
        return this.clone().negateSelf();
    }

    /**
     * Negates this vector (mutable).
     * @returns {Vec3} This vector for chaining
     */
    negateSelf() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Normalizes this vector and returns a new vector (immutable).
     * @returns {Vec3} New Vec3 with the normalized result
     */
    normalize() {
        return this.clone().normalizeSelf();
    }

    /**
     * Normalizes this vector to unit length (mutable).
     * @returns {Vec3} This vector for chaining
     * @throws {Error} If vector has zero magnitude
     */
    normalizeSelf() {
        const magSq = this.x ** 2 + this.y ** 2 + this.z ** 2;
        if (magSq < this.epsilon ** 2) {
            throw new Error("Cannot normalize zero vector");
        }
        
        const mag = Math.sqrt(magSq);
        this.x /= mag;
        this.y /= mag;
        this.z /= mag;
        return this;
    }

    /**
     * Returns a new vector reflected about a normal (immutable).
     * @param {Vec3} normal - The normal vector to reflect about (should be normalized)
     * @returns {Vec3} New Vec3 with the reflected result
     */
    reflect(normal) {
        return this.clone().reflectSelf(normal);
    }

    /**
     * Reflects this vector about a normal (mutable).
     * @param {Vec3} normal - The normal vector to reflect about (should be normalized)
     * @returns {Vec3} This vector for chaining
     */
    reflectSelf(normal) {
        if (!this.perfCritical) {
            if (!(normal instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
            if (Math.abs(normal.magnitude() - 1) > this.epsilon) {
                throw new Error("Normal must be normalized");
            }
        }
        const dot = this.dot(normal);
        this.x = this.x - 2 * dot * normal.x;
        this.y = this.y - 2 * dot * normal.y;
        this.z = this.z - 2 * dot * normal.z;
        return this;
    }

    /**
     * Calculates the squared distance to another vector.
     * @param {Vec3} other - The other vector
     * @returns {number} The squared distance
     */
    distanceToSquared(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - other.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Calculates the squared magnitude of this vector.
     * @returns {number} The squared magnitude
     */
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    
    /**
     * Calculates the Euclidean distance from this vector to another Vec3 instance.
     * Throws an error if the argument is not a Vec3, unless in performance-critical mode.
     *
     * @param {Vec3} other - The other vector to measure distance to.
     * @returns {number} The Euclidean distance between this vector and the other.
     * @throws {Error} If the argument is not a Vec3 instance (unless perfCritical is true).
     */
    distanceTo(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
        }
        return Math.sqrt(this.distanceToSquared(other));
    }

    /**
     * Calculates the angle in radians between this vector and another Vec3 instance.
     *
     * @param {Vec3} other - The other vector to calculate the angle to.
     * @returns {number} The angle in radians between the two vectors.
     * @throws {Error} If the argument is not a Vec3 instance (unless perfCritical is true).
     * @throws {Error} If either vector has zero magnitude.
     */
    angleTo(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
        }
        const dot = this.dot(other);
        const magA = Math.sqrt(this.magnitudeSquared());
        const magB = Math.sqrt(other.magnitudeSquared());
        if (magA === 0 || magB === 0) {
            if (this.perfCritical) {
                return 0;
            }
            throw new Error("Cannot calculate angle with zero vector");
        }

        const cosTheta = dot / (magA * magB);
        const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
        return Math.acos(clampedCosTheta);
    }

    /**
     * Calculates the dot product with another vector.
     * @param {Vec3} other - The other vector
     * @returns {number} The dot product
     * @throws {Error} If other is not a Vec3 instance
     */
    dot(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
        }
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    /**
     * Calculates the cross product with another vector.
     * @param {Vec3} other - The other vector
     * @returns {Vec3} New Vec3 representing the cross product
     * @throws {Error} If other is not a Vec3 instance
     */
    cross(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) {
                throw new Error("Argument must be a Vec3 instance");
            }
        }
        return new Vec3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }

    /**
     * Linearly interpolates between this vector and another.
     * @param {Vec2} other - The target vector.
     * @param {number} t - The interpolation factor (0 = this, 1 = other).
     * @returns {Vec2} A new, interpolated Vec2.
     */
    lerp(other, t) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec3)) throw new Error("Argument must be a Vec3 instance.");
            if (typeof t !== "number" || t < 0 || t > 1) throw new Error("t must be a number between 0 and 1.");
        }
        const invT = 1 - t;
        return new Vec3(
            this.x * invT + other.x * t,
            this.y * invT + other.y * t,
            this.z * invT + other.z * t
        );
    }

    /**
     * Projects this vector onto another vector.
     * @param {Vec3} onto - The vector to project onto.
     * @returns {Vec3} A new Vec3 representing the projection.
     */
    project(onto) {
        if (!this.perfCritical) {
            if (!(onto instanceof Vec3)) throw new Error("Argument must be a Vec3 instance.");
        }
        const ontoMagSq = onto.magnitudeSquared();
        if (ontoMagSq < this.epsilon ** 2) {
            throw new Error("Cannot project onto a zero vector.");
        }
        const dotProduct = this.dot(onto);
        const scale = dotProduct / ontoMagSq;
        return new Vec3(onto.x * scale, onto.y * scale, onto.z * scale);
    }

    /**
     * Clamps the components of this vector between the components of two other vectors.
     * @param {Vec3} min - The vector with minimum component values.
     * @param {Vec3} max - The vector with maximum component values.
     * @returns {Vec3} A new, clamped Vec3.
     */
    clamp(min, max) {
        if (!this.perfCritical) {
            if (!(min instanceof Vec3) || !(max instanceof Vec3)) {
                throw new Error("min and max must be Vec3 instances.");
            }
        }
        return new Vec3(
            Math.max(min.x, Math.min(this.x, max.x)),
            Math.max(min.y, Math.min(this.y, max.y)),
            Math.max(min.z, Math.min(this.z, max.z))
        );
    }

    /**
     * Creates a zero vector (0, 0, 0).
     * @returns {Vec3} New zero vector
     */
    static zero() {
        return new Vec3(0, 0, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a unit vector (1, 1, 1).
     * @returns {Vec3} New unit vector
     */
    static one() {
        return new Vec3(1, 1, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing up (0, 1, 0).
     * @returns {Vec3} New up vector
     */
    static up() {
        return new Vec3(0, 1, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing right (1, 0, 0).
     * @returns {Vec3} New right vector
     */
    static right() {
        return new Vec3(1, 0, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing down (0, -1, 0).
     * @returns {Vec3} New down vector
     */
    static down() {
        return new Vec3(0, -1, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing left (-1, 0, 0).
     * @returns {Vec3} New left vector
     */
    static left() {
        return new Vec3(-1, 0, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing forward (0, 0, 1).
     * @returns {Vec3} New forward vector
     */
    static forward() {
        return new Vec3(0, 0, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing backward (0, 0, -1).
     * @returns {Vec3} New backward vector
     */
    static backward() {
        return new Vec3(0, 0, -1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a Vec3 from a components array.
     * @param {number[]} components - Array with [x, y, z] values
     * @returns {Vec3} New Vec3 instance
     */
    static fromComponents([x, y, z], opts = {}) {
        return new Vec3(x, y, z, opts);
    }
};

/**
 * 4D Vector class with x, y, z, and w components.
 * Operations are immutable by default. Use 'methodSelf' variants for mutable operations for performance.
 * @extends Vector
 */
export class Vec4 extends Vector {
    /**
     * Creates a new 4D vector.
     * @param {number} [x=0] - The x component
     * @param {number} [y=0] - The y component
     * @param {number} [z=0] - The z component
     * @param {number} [w=1] - The w component (default is 1 for homogeneous coordinates)
     */
    constructor(x = 0, y = 0, z = 0, w = 1, {perfCritical = false, epsilon = 1e-6} = {}) {
        super({perfCritical, epsilon});
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.z = z;
        /** @type {number} */
        this.w = w;
    }

    /**
     * Gets the components as an array [x, y, z, w].
     * @returns {number[]} Array containing [x, y, z, w]
     */
    get components() {
        return [this.x, this.y, this.z, this.w];
    }

    /**
     * Clones this vector.
     * @returns {Vec4} A new Vec4 instance with the same components
     */
    clone() {
        return new Vec4(this.x, this.y, this.z, this.w, { perfCritical: this.perfCritical, epsilon: this.epsilon });
    }

    /**
     * Calculates the dot product with another vector.
     * @param {Vec4} other - The other vector
     * @returns {number} The dot product
     * @throws {Error} If other is not a Vec4 instance
     */
    dot(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec4)) {
                throw new Error("Argument must be a Vec4 instance");
            }
        }
        return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w;
    }
    
    /**
     * Adds another vector and returns a new vector (immutable).
     * @param {Vec4} other - The vector to add
     * @returns {Vec4} New Vec4 with the result
     */
    add(other) {
        return this.clone().addSelf(other);
    }

    /**
     * Adds another vector to this vector (mutable).
     * @param {Vec4} other - The vector to add
     * @returns {Vec4} This vector for chaining
     * @throws {Error} If other is not a Vec4 instance
     */
    addSelf(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec4)) {
                throw new Error("Argument must be a Vec4 instance");
            }
        }
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
        this.w += other.w;
        return this;
    }

    /**
     * Subtracts another vector and returns a new vector (immutable).
     * @param {Vec4} other - The vector to subtract
     * @returns {Vec4} New Vec4 with the result
     */
    subtract(other) {
        return this.clone().subtractSelf(other);
    }
    
    /**
     * Subtracts another vector from this vector (mutable).
     * @param {Vec4} other - The vector to subtract
     * @returns {Vec4} This vector for chaining
     * @throws {Error} If other is not a Vec4 instance
     */
    subtractSelf(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec4)) {
                throw new Error("Argument must be a Vec4 instance");
            }
        }
        this.x -= other.x;
        this.y -= other.y;
        this.z -= other.z;
        this.w -= other.w;
        return this;
    }

    /**
     * Multiplies this vector by a scalar and returns a new vector (immutable).
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vec4} New Vec4 with the result
     */
    multiply(scalar) {
        return this.clone().multiplySelf(scalar);
    }
    
    /**
     * Multiplies this vector by a scalar (mutable).
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vec4} This vector for chaining
     * @throws {Error} If scalar is not a number
     */
    multiplySelf(scalar) {
        if (!this.perfCritical) {
            if (typeof scalar !== "number") {
                throw new Error("Argument must be a number");
            }
        }
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        this.w *= scalar;
        return this;
    }

    /**
     * Divides this vector by a scalar and returns a new vector (immutable).
     * @param {number} scalar - The scalar to divide by
     * @returns {Vec4} New Vec4 with the result
     */
    divide(scalar) {
        return this.clone().divideSelf(scalar);
    }

    /**
     * Divides this vector by a scalar (mutable).
     * @param {number} scalar - The scalar to divide by
     * @returns {Vec4} This vector for chaining
     * @throws {Error} If scalar is not a number or is zero
     */
    divideSelf(scalar) {
        if (!this.perfCritical) {
            if (typeof scalar !== "number") {
                throw new Error("Argument must be a number");
            }
        }
        if (Math.abs(scalar) < this.epsilon) {
            throw new Error("Division by zero or near-zero value");
        }
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        this.w /= scalar;
        return this;
    }

    /**
     * Negates this vector and returns a new vector (immutable).
     * @returns {Vec4} New Vec4 with the negated result
     */
    negate() {
        return this.clone().negateSelf();
    }
    
    /**
     * Negates this vector (mutable).
     * @returns {Vec4} This vector for chaining
     */
    negateSelf() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
        return this;
    }

    /**
     * Normalizes this vector and returns a new vector (immutable).
     * @returns {Vec4} New Vec4 with the normalized result
     */
    normalize() {
        return this.clone().normalizeSelf();
    }

    /**
     * Normalizes this vector to unit length (mutable).
     * @returns {Vec4} This vector for chaining
     * @throws {Error} If vector has zero magnitude
     */
    normalizeSelf() {
        const magSq = this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2;
        if (magSq < this.epsilon ** 2) {
            throw new Error("Cannot normalize zero vector");
        }
        
        const mag = Math.sqrt(magSq);
        this.x /= mag;
        this.y /= mag;
        this.z /= mag;
        this.w /= mag;
        return this;
    }

    /**
     * Returns a new vector rotated by a quaternion (immutable).
     * @param {object} quat - Quaternion object with x, y, z, w properties (should be normalized)
     * @returns {Vec4} New Vec4 with the rotated result
     */
    rotateQuaternion(quat) {
        return this.clone().rotateQuaternionSelf(quat);
    }
    
    /**
     * Rotates this vector using a quaternion (mutable).
     * @param {object} quat - Quaternion object with x, y, z, w properties (should be normalized)
     * @returns {Vec4} This vector for chaining
     */
    rotateQuaternionSelf(quat) {
        // Only rotate x, y, z components; w is unchanged
        if (!this.perfCritical) {
            if (!quat || typeof quat !== 'object' || !('x' in quat && 'y' in quat && 'z' in quat && 'w' in quat)) {
                throw new Error("Argument must be a quaternion object with x, y, z, w");
            }
        }
        // v' = q * v * q^-1
        const qx = quat.x, qy = quat.y, qz = quat.z, qw = quat.w;
        const vx = this.x, vy = this.y, vz = this.z;

        const ix =  qw * vx + qy * vz - qz * vy;
        const iy =  qw * vy + qz * vx - qx * vz;
        const iz =  qw * vz + qx * vy - qy * vx;
        const iw = -qx * vx - qy * vy - qz * vz;

        this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

        return this;
    }

    /**
     * Returns a new vector reflected about a normal (immutable).
     * @param {Vec4} normal - The normal vector to reflect about (should be normalized)
     * @returns {Vec4} New Vec4 with the reflected result
     */
    reflect(normal) {
        return this.clone().reflectSelf(normal);
    }
    
    /**
     * Reflects this vector about a normal (mutable).
     * @param {Vec4} normal - The normal vector to reflect about (should be normalized)
     * @returns {Vec4} This vector for chaining
     */
    reflectSelf(normal) {
        if (!this.perfCritical) {
            if (!(normal instanceof Vec4)) {
                throw new Error("Argument must be a Vec4 instance");
            }
            if (Math.abs(normal.magnitude() - 1) > this.epsilon) {
                throw new Error("Normal must be normalized");
            }
        }
        const dot = this.dot(normal);
        this.x = this.x - 2 * dot * normal.x;
        this.y = this.y - 2 * dot * normal.y;
        this.z = this.z - 2 * dot * normal.z;
        this.w = this.w - 2 * dot * normal.w;
        return this;
    }

    /**
     * Calculates the squared distance between this Vec4 instance and another Vec4.
     * This avoids the computational cost of a square root, making it useful for comparisons.
     *
     * @param {Vec4} other - The other Vec4 instance to measure distance to.
     * @returns {number} The squared distance between the two Vec4 instances.
     * @throws {Error} If `other` is not a Vec4 instance (unless in perfCritical mode).
     */
    distanceToSquared(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec4)) {
                throw new Error("Argument must be a Vec4 instance");
            }
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - other.z;
        const dw = this.w - other.w;
        return dx * dx + dy * dy + dz * dz + dw * dw;
    }

    /**
     * Calculates the squared magnitude (length) of the vector.
     * This is equivalent to the sum of the squares of its components.
     * Useful for performance when comparing lengths without needing the square root.
     * @returns {number} The squared magnitude of the vector.
     */
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }

    /**
     * Calculates the Euclidean distance from this vector to another vector.
     * @param {Object} other - The other vector to measure the distance to.
     * @returns {number} The Euclidean distance between this vector and the other.
     */
    distanceTo(other) {
        return Math.sqrt(this.distanceToSquared(other));
    }

    /**
     * Calculates the angle in radians between this vector and another Vec4 instance.
     *
     * @param {Vec4} other - The other vector to calculate the angle to.
     * @returns {number} The angle in radians between the two vectors. Returns 0 if either vector has zero magnitude.
     * @throws {Error} If the argument is not an instance of Vec4 (unless in performance-critical mode).
     */
    angleTo(other) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec4)) {
                throw new Error("Argument must be a Vec4 instance");
            }
        }
        const dot = this.dot(other);
        const magA = Math.sqrt(this.magnitudeSquared());
        const magB = Math.sqrt(other.magnitudeSquared());
        if (magA === 0 || magB === 0) {
            if (this.perfCritical) {
                return 0;
            }
            throw new Error("Cannot calculate angle with zero vector");
        }

        const cosTheta = dot / (magA * magB);
        const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
        return Math.acos(clampedCosTheta);
    }

    /**
     * Linearly interpolates between this vector and another.
     * @param {Vec4} other - The target vector.
     * @param {number} t - The interpolation factor (0 = this, 1 = other).
     * @returns {Vec4} A new, interpolated Vec4.
     */
    lerp(other, t) {
        if (!this.perfCritical) {
            if (!(other instanceof Vec4)) throw new Error("Argument must be a Vec4 instance.");
            if (typeof t !== "number" || t < 0 || t > 1) throw new Error("t must be a number between 0 and 1.");
        }
        const invT = 1 - t;
        return new Vec4(
            this.x * invT + other.x * t,
            this.y * invT + other.y * t,
            this.z * invT + other.z * t,
            this.w * invT + other.w * t
        );
    }

    /**
     * Projects this vector onto another vector.
     * @param {Vec4} onto - The vector to project onto.
     * @returns {Vec4} A new Vec4 representing the projection.
     */
    project(onto) {
        if (!this.perfCritical) {
            if (!(onto instanceof Vec4)) throw new Error("Argument must be a Vec4 instance.");
        }
        const ontoMagSq = onto.magnitudeSquared();
        if (ontoMagSq < this.epsilon ** 2) {
            throw new Error("Cannot project onto a zero vector.");
        }
        const dotProduct = this.dot(onto);
        const scale = dotProduct / ontoMagSq;
        return new Vec4(onto.x * scale, onto.y * scale, onto.z * scale, onto.w * scale);
    }

    /**
     * Clamps the components of this vector between the components of two other vectors.
     * @param {Vec4} min - The vector with minimum component values.
     * @param {Vec4} max - The vector with maximum component values.
     * @returns {Vec4} A new, clamped Vec4.
     */
    clamp(min, max) {
        if (!this.perfCritical) {
            if (!(min instanceof Vec4) || !(max instanceof Vec4)) {
                throw new Error("min and max must be Vec4 instances.");
            }
        }
        return new Vec4(
            Math.max(min.x, Math.min(this.x, max.x)),
            Math.max(min.y, Math.min(this.y, max.y)),
            Math.max(min.z, Math.min(this.z, max.z)),
            Math.max(min.w, Math.min(this.w, max.w))
        );
    }

    /**
     * Creates a zero vector (0, 0, 0, 0).
     * @returns {Vec4} New zero vector
     */
    static zero() {
        return new Vec4(0, 0, 0, 0, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a unit vector (1, 1, 1, 1).
     * @returns {Vec4} New unit vector
     */
    static one() {
        return new Vec4(1, 1, 1, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing up (0, 1, 0, 1).
     * @returns {Vec4} New up vector
     */
    static up() {
        return new Vec4(0, 1, 0, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing right (1, 0, 0, 1).
     * @returns {Vec4} New right vector
     */
    static right() {
        return new Vec4(1, 0, 0, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing down (0, -1, 0, 1).
     * @returns {Vec4} New down vector
     */
    static down() {
        return new Vec4(0, -1, 0, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing left (-1, 0, 0, 1).
     * @returns {Vec4} New left vector
     */
    static left() {
        return new Vec4(-1, 0, 0, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing forward (0, 0, 1, 1).
     * @returns {Vec4} New forward vector
     */
    static forward() {
        return new Vec4(0, 0, 1, 1, {perfCritical: false, epsilon: 1e-6});
    }

    /**
     * Creates a vector pointing backward (0, 0, -1, 1).
     * @returns {Vec4} New backward vector
     */
    static backward() {
        return new Vec4(0, 0, -1, 1, {perfCritical: false, epsilon: 1e-6});
    }


    /**
     * Creates a Vec4 from a components array.
     * @param {number[]} components - Array with [x, y, z, w] values
     * @param {Object} [opts] - Optional configuration object
     * @param {boolean} [opts.perfCritical] - Whether performance-critical mode is enabled
     * @param {number} [opts.epsilon] - Epsilon value for floating point comparisons
     * @returns {Vec4} New Vec4 instance
     */
    static fromComponents([x, y, z, w = 1], opts = {}) {
        return new Vec4(x, y, z, w, opts);
    }

    /**
     * Creates a vector representing homogeneous coordinates (x, y, z, 1).
     * @param {number} x - The x component
     * @param {number} y - The y component
     * @param {number} z - The z component
     * @param {Object} [opts] - Optional configuration object
     * @param {boolean} [opts.perfCritical] - Whether performance-critical mode is enabled
     * @param {number} [opts.epsilon] - Epsilon value for floating point comparisons
     * @returns {Vec4} New homogeneous coordinate vector
     */
    static homogeneous(x, y, z, opts = {}) {
        return new Vec4(x, y, z, 1, opts);
    }
}