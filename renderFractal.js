var fractalSource = {
    vertShader: `
        attribute vec4 a_position;
        
        varying vec2 zInit;
        varying vec2 c;
        void main() {
            gl_Position = a_position;
            zInit = 1.5 * a_position.xy;
            c = vec2(-abs(a_position.x), a_position.y)*0.1+ vec2(-0.3, -.65);
        }`,
    fragmentShader: `
        precision mediump float;
        
        // Passed in from the vertex shader.
        varying vec2 zInit;
        varying vec2 c;
        vec2 iterate(vec2 z) {
            return vec2(z.x*z.x - z.y*z.y + c.x, 2.0 * z.x*z.y + c.y);
        }
        
        void main() {
            vec2 z = zInit;
            float escapeTime = 0.0;
            for(float i=0.0;i<10.0;i++) {
                z = iterate(z);
                float magSqr = dot(z, z);
                if (magSqr < 16.0) {
                    escapeTime = i +1.0 - magSqr*0.08;
                }
            }
            float normedEscape = escapeTime*0.1;
            gl_FragColor = vec4(0.1 + normedEscape*0.4, 1.0-normedEscape, dot(c, c)*0.125, 1.0);
        }`,
    vertices: [
        -1, -1, 0.999999,
        1, 1, 0.999999,
        -1, 1, 0.999999,

        -1, -1, 0.999999,
        1, -1, 0.999999,
        1, 1, 0.999999,
    ]
}

function getFractalData(gl) {
    const shaderProgram = initShaderProgram(gl, fractalSource.vertShader, fractalSource.fragmentShader);
    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
        },
        modelData: {
            positions: getFloatBufferForData(gl, fractalSource.vertices),
            vertexCount: 6,
        }
    };
}

function renderFractal(gl, programInfo) {
    //Set the shader
    gl.useProgram(programInfo.program);
    //Bind the vertex positions
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.positions);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition, size, type, normalize, stride, offset);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    gl.drawArrays(primitiveType, offset, programInfo.modelData.vertexCount);
}

//Renders the fractal into a texture and returns that texture.
function fullFractalRender(gl, resolution) {
    const texture = createEmptyFullColorSquareTexture(gl, resolution);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture, 0);

    //Render to the frame buffer
    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, resolution, resolution);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(0, 0, 0, 1);   // clear to blue
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderFractal(gl, getFractalData(gl));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return texture;
}