// Vertex shader program
const pyramidSource = {
    vsSource: `
  uniform mat4 view_matrix;
  uniform mat4 model_matrix;
  uniform vec4 light_position;
  uniform vec4 light_color;
  
  attribute vec4 a_position;
  attribute vec4 a_color;
  
  varying vec3 light_rel_pos;
  varying vec3 light_col;
  varying vec3 v_color;
    void main() {
      vec4 worldPos = model_matrix * a_position;
      //Set the light position
      light_col = light_color.rgb*2.0;
      light_rel_pos = light_position.xyz - worldPos.xyz;
      gl_Position = view_matrix * worldPos;
      // Pass the color to the fragment shader.
      v_color = a_color.rgb;
    }
  `,
    fsSource: `
    precision lowp float;
    // Passed in from the vertex shader.
    varying vec3 light_rel_pos;
    varying vec3 light_col;
    varying vec3 v_color;
    void main() {
      vec3 light_contribution = light_col / length(light_rel_pos);
      vec3 ourColor = v_color*(0.1 + light_contribution);
      gl_FragColor = vec4(ourColor, 1.0);
    }
  `};

function setViewMatrix(gl, programInfo, camData) {
    // Set the matrix.
    gl.uniformMatrix4fv(programInfo.uniformLocations.view_matrix, false, camData.world_to_view_matrix);
}

var rot = 0;
function setModelMatrix(gl, programInfo) {
    var matrix = m4.translation(0, 0, -20);
    matrix = m4.xRotate(matrix,rot*0.1);
    matrix = m4.yRotate(matrix, rot);
    gl.uniformMatrix4fv(programInfo.uniformLocations.model_matrix, false, matrix);

    rot+=0.01;
}

var lightColor = 0;

function setLight(gl, programInfo) {
    gl.uniform4fv(programInfo.uniformLocations.light_position,  [8, 2, 0, 1]);
    gl.uniform4fv(programInfo.uniformLocations.light_color, [1 + Math.cos(lightColor), 1 + Math.sin(lightColor), 1, 0]);
    lightColor += 0.003;
}

function renderPyramid(gl, programInfo, camData) {
    //Set the shader
    gl.useProgram(programInfo.program);

    setViewMatrix(gl, programInfo, camData);
    setModelMatrix(gl, programInfo);

    setLight(gl, programInfo);

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

    //Bind the vertex shapes
    // Turn on the color attribute
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    // Bind the color buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.colors);

    // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    var size = 3;                 // 3 components per iteration
    var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
    var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
    var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;               // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor, size, type, normalize, stride, offset);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    gl.drawArrays(primitiveType, offset, programInfo.modelData.count);

    //Now let us draw a big ol grid of these dumb things.
    for (var i = 0; i < 36; i++) {
        for (var j = 0; j < 10; j++) {
            for (var k = 0; k < 10; k++) {
                var x = Math.sin(i * Math.PI / 18);
                var y = Math.cos(i * Math.PI / 18);
                gl.uniformMatrix4fv(programInfo.uniformLocations.model_matrix, false,
                    m4.translation(x * (50 + j*10), 150 - 30 * k, y * (50 + j*10)));
                gl.drawArrays(primitiveType, offset, programInfo.modelData.count);
            }
        }
    }
}

function getObjectData(gl) {
    let vertexPositions = [
        //Tri1
        0, 0, 0,
        0, 0, 10,
        0, 10, 0,

        //Tri2
        0, 0, 0,
        0, 10, 0,
        10, 0, 0,

        //Tri3
        0, 0, 0,
        10, 0, 0,
        0, 0, 10,

        //Tri4
        10, 0, 0,
        0, 10, 0,
        0, 0, 10
    ];
    let posBuf = getFloatBufferForData(gl, vertexPositions);

    let vertexColors = [
        //tri1
        50, 0, 0,
        0, 50, 0,
        0, 0, 50,
        //tri2
        250, 0, 0,
        200, 50, 0,
        200, 0, 50,
        //tri3
        50, 200, 0,
        0, 250, 0,
        0, 200, 50,
        //tri4
        50, 0, 200,
        0, 50, 200,
        0, 0, 250,
    ];
    let colBuf = getByteBufferForData(gl, vertexColors);
    return {positions: posBuf, colors: colBuf, count: 12};
}

function getPyramidData(gl) {
    const shaderProgram = initShaderProgram(gl, pyramidSource.vsSource, pyramidSource.fsSource);

    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
            vertexColor: gl.getAttribLocation(shaderProgram, "a_color"),
        },
        uniformLocations: {
            model_matrix: gl.getUniformLocation(shaderProgram, "model_matrix"),
            view_matrix: gl.getUniformLocation(shaderProgram, "view_matrix"),
            light_position: gl.getUniformLocation(shaderProgram, "light_position"),
            light_color: gl.getUniformLocation(shaderProgram, "light_color"),
        },
        modelData: getObjectData(gl)
    };
}