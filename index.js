// Vertex shader program
const vsSource = `
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
  `;
const fsSource = `
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
  `;

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(
            `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram,
            )}`,
        );
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
        );
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function setViewMatrix(gl, programInfo) {
    var perspective = m4.perspective(1, gl.canvas.clientWidth /gl.canvas.clientHeight, 0.1, 1000);
    var matrix = m4.multiply(perspective, getViewMatrix());

    // Set the matrix.
    gl.uniformMatrix4fv(programInfo.uniformLocations.view_matrix, false, matrix);
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

function render() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    //Set the shader
    gl.useProgram(programInfo.program);

    setViewMatrix(gl, programInfo);
    setModelMatrix(gl, programInfo);
    setLight(gl, programInfo);

    //Bind the vertex positions
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, object.positions);

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
    gl.bindBuffer(gl.ARRAY_BUFFER, object.colors);

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
    gl.drawArrays(primitiveType, offset, object.count);
    requestAnimationFrame(render);
}

function getFloatBufferForData(gl, data) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}
function getByteBufferForData(gl, data) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(data), gl.STATIC_DRAW);
    return buffer;
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

//
// start here
//

var gl;
var programInfo;
var object;
function main() {
    const canvas = document.getElementById("gl-canvas");
    // Initialize the GL context
    gl = canvas.getContext("webgl");

    // Only continue if WebGL is available and working
    if (gl === null) {
        alert(
            "Unable to initialize WebGL. Your browser or machine may not support it.",
        );
        return;
    }

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    programInfo = {
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
        }
    };

    object = getObjectData(gl);

    // Draw the scene
    render();
}

main();
