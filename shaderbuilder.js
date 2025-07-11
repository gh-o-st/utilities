/**
 * ShaderBuilder: Utility for compiling, linking, and managing WebGL shaders. (think: ShaderToy-Lite)
 * Provides uniform/attribute setting, buffer binding, logging, validation, and resource cleanup.
 */
const ShaderBuilder = class {

    /**
     * Creates a new ShaderBuilder instance.
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl WebGL context
     * @param {string} vsource Vertex shader source code
     * @param {string} fsource Fragment shader source code
     */
    constructor(gl, vsource, fsource) {
        if (!gl || !(gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
            throw new Error("Invalid WebGL context provided.");
        }
        if (typeof vsource !== "string" || vsource.trim() === "") {
            throw new Error("Vertex shader source must be a non-empty string.");
        }
        if (typeof fsource !== "string" || fsource.trim() === "") {
            throw new Error("Fragment shader source must be a non-empty string.");
        }
        if (gl instanceof WebGL2RenderingContext) {
            if (!vsource.includes("#version 300 es")) {
                throw new Error("Vertex shader source must include '#version 300 es'.");
            }
            if (!fsource.includes("#version 300 es")) {
                throw new Error("Fragment shader source must include '#version 300 es'.");
            }
            if (!vsource.includes("precision highp float;")) {
                console.warn("Vertex shader source should include 'precision highp float;'.");
            }
            if (!fsource.includes("precision highp float;")) {
                console.warn("Fragment shader source should include 'precision highp float;'.");
            }
        }
        this.gl = gl;
        this.vsource = vsource;
        this.fsource = fsource;
        this.program = null;
        this._uniformCache = {};
        this._attributeCache = {};
    }

    /**
     * Sets the vertex shader source code.
     * @param {string} source Vertex shader source code
     * @throws {Error} If source is not a non-empty string
     */
    setVertexSource(source) {
        if (typeof source !== "string" || source.trim() === "") {
            throw new Error("Vertex shader source must be a non-empty string.");
        }
        this.vsource = source;
        if (typeof debug !== 'undefined' && debug) {
            console.debug('[ShaderBuilder] setVertexSource called.', source);
        }
    }

    /**
     * Sets the fragment shader source code.
     * @param {string} source Fragment shader source code
     * @throws {Error} If source is not a non-empty string
     */
    setFragmentSource(source) {
        if (typeof source !== "string" || source.trim() === "") {
            throw new Error("Fragment shader source must be a non-empty string.");
        }
        this.fsource = source;
        if (typeof debug !== 'undefined' && debug) {
            console.debug('[ShaderBuilder] setFragmentSource called.', source);
        }
    }

    /**
     * Sets a uniform value. Supports float, vec2, vec3, vec4, int, mat2, mat3, mat4, arrays.
     * @param {string} name Uniform name
     * @param {number|Array|Int32Array} value Value to set
     * @throws {Error} If uniform name or value is invalid
     */
    setUniform(name, value) {
        if (!this.program) throw new Error("Shader program not initialized.");

        if (typeof name !== "string" || name.trim() === "") {
            throw new Error("Uniform name must be a non-empty string.");
        }

        if (value === undefined || value === null) {
            throw new Error("Uniform value must not be undefined or null.");
        }

        if (!this.gl) throw new Error("WebGL context not initialized.");

        if (!this._uniformCache) this._uniformCache = {};
        if (!this._attributeCache) this._attributeCache = {};

        let location = this._uniformCache[name];

        if (!location) {
            location = this.gl.getUniformLocation(this.program, name);
            if (location === null) throw new Error(`Uniform ${name} not found in shader program.`);
            this._uniformCache[name] = location;
        }

        if (debug) console.debug(`[ShaderBuilder] setUniform: ${name}`, value);

        if (typeof value === "number") {
            this.gl.uniform1f(location, value);
        } else if (Array.isArray(value)) {
            switch (value.length) {
                case 1: this.gl.uniform1fv(location, value); break;
                case 2: this.gl.uniform2fv(location, value); break;
                case 3: this.gl.uniform3fv(location, value); break;
                case 4: this.gl.uniform4fv(location, value); break;
                case 9: this.gl.uniformMatrix3fv(location, false, value); break;
                case 16: this.gl.uniformMatrix4fv(location, false, value); break;
                default: this.gl.uniform1fv(location, value); break;
            }
        } else if (value instanceof Int32Array) {
            this.gl.uniform1iv(location, value);
        } else {
            throw new Error(`Unsupported uniform value type for ${name}`);
        }
    }

    /**
     * Sets an attribute pointer and enables it.
     * @param {string} name Attribute name
     * @param {number} size Number of components per vertex attribute
     * @param {number} type Data type of each component (WebGL constant)
     * @param {boolean} normalized Whether integer data values should be normalized
     * @param {number} stride Offset in bytes between consecutive vertex attributes
     * @param {number} offset Offset in bytes of the first component
     * @param {boolean} [debug=false] Enable debug logging
     * @throws {Error} If attribute parameters are invalid
     */
    setAttribute(name, size, type, normalized, stride, offset, debug = false) {
        if (!this.program) throw new Error("Shader program not initialized.");

        if (typeof name !== "string" || name.trim() === "") {
            throw new Error("Attribute name must be a non-empty string.");
        }

        if (typeof size !== "number" || size <= 0) {
            throw new Error("Attribute size must be a positive number.");
        }

        if (typeof type !== "number") {
            throw new Error("Attribute type must be a valid WebGL constant.");
        }

        if (typeof normalized !== "boolean") {
            throw new Error("Attribute normalized must be a boolean.");
        }

        if (typeof stride !== "number" || stride < 0) {
            throw new Error("Attribute stride must be a non-negative number.");
        }

        if (typeof offset !== "number" || offset < 0) {
            throw new Error("Attribute offset must be a non-negative number.");
        }

        if (!this.gl) throw new Error("WebGL context not initialized.");

        if (!this._attributeCache) this._attributeCache = {};
        if (!this._uniformCache) this._uniformCache = {};

        let location = this._attributeCache[name];

        if (location === undefined) {
            location = this.gl.getAttribLocation(this.program, name);
            if (location === -1) throw new Error(`Attribute ${name} not found in shader program.`);
            this._attributeCache[name] = location;
        }

        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribPointer(location, size, type, normalized, stride, offset);

        if (debug) {
            console.debug(`[ShaderBuilder] setAttribute: ${name} -> location ${location}`);
        }
    }

    /**
     * Binds a buffer to an attribute.
     * @param {string} name Attribute name
     * @param {WebGLBuffer} buffer Buffer to bind
     * @param {number} size Number of components per vertex attribute
     * @param {number} type Data type of each component (WebGL constant)
     * @param {boolean} normalized Whether integer data values should be normalized
     * @param {number} stride Offset in bytes between consecutive vertex attributes
     * @param {number} offset Offset in bytes of the first component
     */
    bindBufferToAttribute(name, buffer, size, type, normalized, stride, offset) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        if (typeof debug !== 'undefined' && debug) {
            console.debug(`[ShaderBuilder] bindBufferToAttribute: ${name} -> buffer`, buffer);
        }
        this.setAttribute(name, size, type, normalized, stride, offset);
    }

    /**
     * Compiles and links the shader program.
     * Validates sources, logs errors, and cleans up shader resources.
     * @param {boolean} [debug=false] Enable debug logging
     * @throws {Error} If shader sources are empty or linking fails
     */
    build(debug = false) {
        if (!this.vsource || !this.fsource) {
            throw new Error("Shader sources must not be empty.");
        }

        if (debug) console.debug("[ShaderBuilder] Compiling vertex shader:\n", this.vsource);
        const vertexShader = this._compileShader(this.gl.VERTEX_SHADER, this.vsource);

        if (debug) console.debug("[ShaderBuilder] Compiling fragment shader:\n", this.fsource);
        const fragmentShader = this._compileShader(this.gl.FRAGMENT_SHADER, this.fsource);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.program);
            console.error("[ShaderBuilder] Failed to link shader program:", info);
            throw new Error("Failed to link shader program: " + info);
        }

        this._uniformCache = {};
        this._attributeCache = {};
    }

    /**
     * Compiles a shader of the given type and source. Logs errors.
     * @private
     * @param {number} type Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
     * @param {string} source Shader source code
     * @returns {WebGLShader} Compiled shader
     * @throws {Error} If source is invalid or compilation fails
     */
    _compileShader(type, source) {
        if (!source || typeof source !== "string" || source.trim() === "") {
            throw new Error("Shader source is empty or invalid.");
        }
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            console.error(`[ShaderBuilder] Failed to compile shader:\n${source}\nError: ${info}`);
            throw new Error("Failed to compile shader: " + info);
        }
        return shader;
    }

    /**
     * Sets the current shader program as active.
     * @throws {Error} If shader program is not built
     */
    use() {
        if (!this.program) throw new Error("Shader program not built.");
        this.gl.useProgram(this.program);
    }

    /**
     * Returns the shader program.
     * @returns {WebGLProgram} The linked shader program
     * @throws {Error} If shader program is not built
     */
    getProgram() {
        if (!this.program) throw new Error("Shader program not built.");
        return this.program;
    }

    /**
     * Disposes the shader program and clears caches.
     */
    dispose() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
            if (typeof debug !== 'undefined' && debug) {
                console.debug('[ShaderBuilder] dispose: program deleted.');
            }
            this.program = null;
        }
        this._uniformCache = {};
        this._attributeCache = {};
    }

    /**
     * Checks if the shader program is built.
     * @returns {boolean} True if built, false otherwise
     */
    isBuilt() {
        return this.program !== null;
    }

    /**
     * Returns the vertex shader source code.
     * @returns {string} Vertex shader source
     */
    getVertexSource() {
        return this.vsource;
    }

    /**
     * Returns the fragment shader source code.
     * @returns {string} Fragment shader source
     */
    getFragmentSource() {
        return this.fsource;
    }

    /**
     * Returns the uniform location (cached).
     * @param {string} name Uniform name
     * @returns {WebGLUniformLocation} Uniform location
     * @throws {Error} If shader program is not initialized or uniform not found
     */
    getUniformLocation(name) {
        if (!this.program) throw new Error("Shader program not initialized.");
        if (this._uniformCache[name]) return this._uniformCache[name];
        const location = this.gl.getUniformLocation(this.program, name);
        if (location === null) throw new Error(`Uniform ${name} not found in shader program.`);
        this._uniformCache[name] = location;
        if (typeof debug !== 'undefined' && debug) {
            console.debug(`[ShaderBuilder] getUniformLocation: ${name} -> location`, location);
        }
        return location;
    }

    /**
     * Returns the attribute location (cached).
     * @param {string} name Attribute name
     * @returns {number} Attribute location
     * @throws {Error} If shader program is not initialized or attribute not found
     */
    getAttributeLocation(name) {
        if (!this.program) throw new Error("Shader program not initialized.");
        if (this._attributeCache[name] !== undefined) return this._attributeCache[name];
        const location = this.gl.getAttribLocation(this.program, name);
        if (location === -1) throw new Error(`Attribute ${name} not found in shader program.`);
        this._attributeCache[name] = location;
        if (typeof debug !== 'undefined' && debug) {
            console.debug(`[ShaderBuilder] getAttributeLocation: ${name} -> location`, location);
        }
        return location;
    }

    /**
     * Returns program info and sources.
     * @returns {{vertexSource: string, fragmentSource: string, program: WebGLProgram, isBuilt: boolean}} Program info object
     * @throws {Error} If shader program is not built
     */
    getProgramInfo() {
        if (!this.program) throw new Error("Shader program not built.");
        return {
            vertexSource: this.vsource,
            fragmentSource: this.fsource,
            program: this.program,
            isBuilt: this.isBuilt()
        };
    }

    /**
     * Returns the WebGL context.
     * @returns {WebGLRenderingContext|WebGL2RenderingContext} WebGL context
     */
    getGLContext() {
        return this.gl;
    }

    /**
     * Stub for preprocessor directives and hot-reloading.
     * @param {object} options Preprocessor options
     */
    preprocess(options) {
        // Implement shader includes, macro expansion, etc. as needed.
        console.warn("[ShaderBuilder] Preprocessor stub called.", options);
    }

    /**
     * Hot-reloads the shader program (rebuilds with current sources).
     */
    hotReload() {
        this.dispose();
        this.build();
        console.info("[ShaderBuilder] Shader hot-reloaded.");
    }
};
export { ShaderBuilder };