const skyboxsource = {
    vertShader: `
        uniform mat4 inverse_view_matrix;
        
        attribute vec4 a_position;
        
        varying vec3 direction;
        void main() {
            vec4 dirComponent = inverse_view_matrix * vec4(a_position.xy, 1.0, 1.0);
            direction = dirComponent.xyz/dirComponent.w;
            gl_Position = a_position;
        }`,
    fragmentShader: `
        precision mediump float;
        
        uniform vec4 top_color;
        uniform vec4 mid_color;
        uniform vec4 bottom_color;
        
        // Passed in from the vertex shader.
        varying vec3 direction;
        void main() {
            vec3 actualDirection = normalize(direction);
            vec4 topInterp = vec4(0.9, 0.9, 0.8, 1.0) * max(0.0, actualDirection.y);
            vec4 midInterp = (1.0-abs(actualDirection.y)) * vec4(0.1, 0.2, 0.3, 1.0);
            vec4 botInterp = vec4(0.1, 0.03, 0.01, 1.0) * max(0.0, -actualDirection.y);
            gl_FragColor = topInterp + midInterp + botInterp;
            //float angle1 = atan(actualDirection.x/actualDirection.y);
            //float angle2 = atan(actualDirection.z/actualDirection.y);
            //float angle3 = atan(actualDirection.x/actualDirection.z);
            //gl_FragColor = vec4(sin(12.0 * angle1), sin(12.0 * angle2), sin(12.0 * angle3), 1.0);
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

function getSkyboxData(gl) {
    const shaderProgram = initShaderProgram(gl, skyboxsource.vertShader, skyboxsource.fragmentShader);
    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
        },
        uniformLocations: {
            inverse_view_matrix: gl.getUniformLocation(shaderProgram, "inverse_view_matrix"),
            top_color: gl.getUniformLocation(shaderProgram, "top_color"),
            mid_color: gl.getUniformLocation(shaderProgram, "mid_color"),
            bot_color: gl.getUniformLocation(shaderProgram, "bot_color"),
        },
        modelData: {
            positions: getFloatBufferForData(gl, skyboxsource.vertices),
            vertexCount: 6,
            top_color: [0.9, 0.9, 0.8, 1.0],
            mid_color: [0.1, 0.2, 0.3, 1.0],
            bot_color: [0.1, 0.03, 0.01, 1.0],
        }
    };
}

function renderSkybox(gl, programInfo, camData) {
//Set the shader
    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.inverse_view_matrix, false, camData.view_to_world_direction_matrix);

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