// Vertex shader program
const pyramidSource = {
    vsSource: `
  uniform mat4 view_matrix;
  uniform mat4 model_matrix;
  uniform vec4 light_position;
  uniform vec4 light_color;
  
  attribute vec4 a_position;
  attribute vec4 a_color;
  attribute vec2 a_texcoord;
  
  varying vec3 light_rel_pos;
  varying vec3 light_col;
  varying vec3 v_color;
  varying vec2 v_texcoord;
    void main() {
      vec4 worldPos = model_matrix * a_position;
      //Set the light position
      light_col = light_color.rgb*2.0;
      light_rel_pos = light_position.xyz - worldPos.xyz;
      gl_Position = view_matrix * worldPos;
      // Pass the color to the fragment shader.
      v_color = a_color.rgb;
      v_texcoord = a_texcoord;
    }
  `,
    fsSource: `
    precision lowp float;
    
    uniform sampler2D u_texture;
    
    // Passed in from the vertex shader.
    varying vec3 light_rel_pos;
    varying vec3 light_col;
    varying vec3 v_color;
    varying vec2 v_texcoord;
    
    void main() {
      vec3 light_contribution = light_col / length(light_rel_pos);
      vec3 rawColor = v_color * (0.1 + light_contribution);
      gl_FragColor = texture2D(u_texture, v_texcoord) * vec4(rawColor, 1.0);
      //gl_FragColor = vec4(rawColor, 1.0);
    }
  `};

function setViewMatrix(gl, programInfo, camData) {
    // Set the matrix.
    gl.uniformMatrix4fv(programInfo.uniformLocations.view_matrix, false, camData.world_to_view_matrix);
}

var rot = 0;
function setModelMatrix(gl, programInfo) {
    var matrix = m4.translation(0, 0.2, -0.55);
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

    // create the texcoord buffer, make it the current ARRAY_BUFFER
    // and copy in the texcoord values
    // Turn on the attribute
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexTexcoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.texcords);

    // Tell the attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floating point values
    var normalize = false; // convert from 0-255 to 0.0-1.0
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next texcoord
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexTexcoord, size, type, normalize, stride, offset);

    gl.bindTexture(gl.TEXTURE_2D, programInfo.modelData.texture);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    gl.drawArrays(primitiveType, offset, programInfo.modelData.count);
}

function getObjectData(gl) {
    let vertexPositions = [
        //Tri1
        0, 0, 0,
        0, 0, 0.1,
        0, 0.1, 0,

        //Tri2
        0, 0, 0,
        0, 0.1, 0,
        0.1, 0, 0,

        //Tri3
        0, 0, 0,
        0.1, 0, 0,
        0, 0, 0.1,

        //Tri4
        0.1, 0, 0,
        0, 0.1, 0,
        0, 0, 0.1
    ];
    let posBuf = getFloatBufferForData(gl, vertexPositions);

    let vertexColors = [
        //tri1
        200, 100, 100,
        100, 200, 100,
        100, 100, 200,
        //tri2
        255, 100, 100,
        250, 200, 100,
        250, 100, 200,
        //tri3
        100, 250, 100,
        100, 255, 100,
        100, 250, 200,
        //tri4
        200, 100, 250,
        100, 200, 250,
        100, 100, 255,
    ];
    let colBuf = getByteBufferForData(gl, vertexColors);

    let texCoord = [
        //Tri1
        0, 0,
        0, 1,
        1, 0,

        //Tri2
        1, 1,
        0, 1,
        1, 0,

        //Tri3
        0, 0,
        1, 1,
        0, 1,

        //Tri4
        0, 0,
        1, 1,
        1, 0
    ];
    const uvBuff = getFloatBufferForData(gl, texCoord);

    const texture = fullFractalRender(gl, 512)

    return {positions: posBuf, colors: colBuf, texcords: uvBuff, count: 12, texture: texture};
}

function getPyramidData(gl) {
    const shaderProgram = initShaderProgram(gl, pyramidSource.vsSource, pyramidSource.fsSource);

    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
            vertexColor: gl.getAttribLocation(shaderProgram, "a_color"),
            vertexTexcoord: gl.getAttribLocation(shaderProgram, "a_texcoord"),
        },
        uniformLocations: {
            model_matrix: gl.getUniformLocation(shaderProgram, "model_matrix"),
            view_matrix: gl.getUniformLocation(shaderProgram, "view_matrix"),
            light_position: gl.getUniformLocation(shaderProgram, "light_position"),
            light_color: gl.getUniformLocation(shaderProgram, "light_color"),
            texture: gl.getUniformLocation(shaderProgram, "u_texture"),
        },
        modelData: getObjectData(gl)
    };
}