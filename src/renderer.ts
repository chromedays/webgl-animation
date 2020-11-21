import * as M from './math.js'

export let canvas = document.querySelector('canvas')!;
export let gl = canvas.getContext('webgl')!;
gl.getExtension('OES_element_index_uint');

export class UniformInfo {
    location: WebGLUniformLocation;
    type: number
    size: number

    constructor(location: WebGLUniformLocation, type: number, size: number) {
        this.location = location;
        this.type = type;
        this.size = size;
    }
};

export class ShaderProgram {
    handle: WebGLProgram
    uniformTable: Map<string, UniformInfo>

    constructor(programHandle: WebGLProgram) {
        this.handle = programHandle;
        this.uniformTable = new Map<string, UniformInfo>();

        let numUniforms: number = gl.getProgramParameter(this.handle, gl.ACTIVE_UNIFORMS);

        for (let i = 0; i < numUniforms; ++i) {
            let info = gl.getActiveUniform(this.handle, i)!;
            this.uniformTable.set(info.name, new UniformInfo(
                gl.getUniformLocation(this.handle, info.name)!,
                info.type,
                info.size,
            ));
        }
    }
}

export async function createShaderProgramFromFiles(vert: string, frag: string): Promise<ShaderProgram> {
    let vertSrc = await (await fetch(vert)).text();
    let fragSrc = await (await fetch(frag)).text();
    console.log('Compiling shaders:', vert, frag,);
    let program = createShaderProgram({
        vert: vertSrc,
        frag: fragSrc,
    });
    return program;
}

export function createShaderProgram(params: { vert: string; frag: string; }) {
    let vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, params.vert);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
        console.log('Failed to compile vertex shader');
        console.log(gl.getShaderInfoLog(vertShader));
    }

    let fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, params.frag);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        console.log('Failed to compile fragment shader');
        console.log(gl.getShaderInfoLog(fragShader));
    }

    let shaderProgram = gl.createProgram()!;
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Failed to link shaders');
        console.log(gl.getProgramInfoLog(shaderProgram));
    }

    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    let result = new ShaderProgram(shaderProgram);

    console.log('Shaders compiled successfully');

    return result;
}

export function setUniforms(shaderProgram: ShaderProgram, uniforms: any) {
    for (let key in uniforms) {
        if (shaderProgram.uniformTable.has(key)) {
            let value = uniforms[key]!;
            let info = shaderProgram.uniformTable.get(key)!;
            if (info.type === gl.FLOAT_MAT4) {
                gl.uniformMatrix4fv(info.location, false, value);
            } else if (info.type === gl.FLOAT_VEC3) {
                gl.uniform3f(info.location, value[0], value[1], value[2]);
            } else if (info.type === gl.FLOAT) {
                gl.uniform1f(info.location, value);
            }
        } else {
            console.error(shaderProgram, "doesn't have uniform", key);
        }
    }
};

export function setAttribute(shaderProgram: ShaderProgram, attribName: string, buffer: WebGLBuffer, numComponents: number, offset: number) {
    let location = gl.getAttribLocation(shaderProgram.handle, attribName);
    if (location >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, numComponents, gl.FLOAT, false, 0, offset);
    } else {
        console.error(shaderProgram, "doesn't have attribute", attribName);
    }
}
