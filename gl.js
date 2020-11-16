let canvas = document.querySelector('canvas')
let gl = canvas.getContext('webgl');
gl.getExtension('OES_element_index_uint');

async function createShaderProgramFromFiles(vert, frag) {
    let vertSrc = await (await fetch(vert)).text();
    let fragSrc = await (await fetch(frag)).text();    
    console.log('Compiling shaders:', vert, frag,);
    let program = createShaderProgram({
        vert: vertSrc,
        frag: fragSrc,
    });
    return program;
}

function createShaderProgram(params) {
    let vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, params.vert);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
        console.log('Failed to compile vertex shader');
        console.log(gl.getShaderInfoLog(vertShader));
    }

    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, params.frag);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        console.log('Failed to compile fragment shader');
        console.log(gl.getShaderInfoLog(fragShader));
    }

    let shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Failed to link shaders');
        console.log(gl.getProgramInfoLog(shaderProgram));
    }

    let numUniforms = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);

    gl.useProgram(shaderProgram);

    let meta = {};
    for (let i = 0; i < numUniforms; ++i) {
        let info = gl.getActiveUniform(shaderProgram, i);
        meta[info.name] = {
            location: gl.getUniformLocation(shaderProgram, info.name),
            type: info.type,
            size: info.size,
        };
    }

    gl.useProgram(null);

    console.log('Shaders compiled successfully');

    return {
        handle: shaderProgram,
        meta: meta,
    };
}

function setUniforms(shaderProgram, uniforms) {
    for (key in uniforms) {
        if (key in shaderProgram.meta) {
            let value = uniforms[key];
            let info = shaderProgram.meta[key];
            if (info.type === gl.FLOAT_MAT4) {
                gl.uniformMatrix4fv(info.location, false, value);
            }
        }
    }
};

function setAttribute(shaderProgram, attribName, buffer, numComponents) {
    let location = gl.getAttribLocation(shaderProgram.handle, attribName);
    if (location >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, numComponents, gl.FLOAT, false, 0, 0);
    }
}