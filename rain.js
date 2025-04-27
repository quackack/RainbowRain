// Vertex shader program
const dropSource = {
    displayShader: {
    vsSource: `
    uniform mat4 world_to_view_matrix;
    uniform sampler2D center_texture;
    
    attribute float a_position_center_coordinate;
    attribute vec4 a_position_offset;

    void main() {
      vec4 object_center = texture2D(center_texture, vec2(a_position_center_coordinate, 0));
      gl_Position = (world_to_view_matrix * object_center) + vec4(a_position_offset.xyz, 0.0);
    }
  `,
    fsSource: `
    precision lowp float;
    
    void main() {
      gl_FragColor = vec4(1.0, 0.5, 1.0, 1.0);
    }
  `},
    moveShader: {},
    dropCount: 1024,
    dropSize: 0.01};

function getInitialDropLocationTexture(gl) {
    var dropLocations = [];
    for (var i = 0; i < 32; i++) {
        for (var j = 0; j < 32; j++) {
            var xPos = (i - 15.5)/16;
            var zPos = (j - 15.5)/16;
            var yPos = 0.9 + 0.1 * Math.sin(i) * Math.sin(j);
            dropLocations.push(xPos, yPos, zPos, 1.0);
        }
    }
    return create1DTexture(gl, dropLocations);
}

function getDropModelData(gl) {
    var a_position_center_coordinate = [];
    var a_position_offset = [];
    //For each drop
    for (var i = 0; i < dropSource.dropCount; i++) {
        //Each Triangle in the hexagon
        for (var triangle = 0; triangle < 6; triangle++) {
            //three vertices for each triangle
            a_position_center_coordinate.push( (i+0.5)/dropSource.dropCount);
            a_position_center_coordinate.push( (i+0.5)/dropSource.dropCount);
            a_position_center_coordinate.push( (i+0.5)/dropSource.dropCount);

            //Push the center vertex
            const size = dropSource.dropSize;
            a_position_offset.push(0, 0, -size);
            const theta2 = Math.PI*triangle/3;
            const theta1 = Math.PI*(triangle+1)/3;
            a_position_offset .push(Math.sin(theta1)*size, Math.cos(theta1)*size, 0);
            a_position_offset .push(Math.sin(theta2)*size, Math.cos(theta2)*size, 0);
        }
    }
    var centerBuffer = getFloatBufferForData(gl, a_position_center_coordinate);
    var offsetBuffer = getFloatBufferForData(gl, a_position_offset);
    var dropPositions = getInitialDropLocationTexture(gl);
    return {centerBuffer: centerBuffer, offsetBuffer: offsetBuffer, dropPositions: dropPositions, count: dropSource.dropCount*6*3};
}

function renderDrops(gl, programInfo, camData) {
    //Set the shader
    gl.useProgram(programInfo.display.program);

    gl.uniformMatrix4fv(programInfo.display.uniformLocations.world_to_view_matrix, false, camData.world_to_view_matrix);

    //Bind the drop centers
    gl.enableVertexAttribArray(programInfo.display.attribLocations.positionCenterCoordinate);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.centerBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 1;          // 1 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.display.attribLocations.positionCenterCoordinate, size, type, normalize, stride, offset);

    //Bind the vertex offsets
    gl.enableVertexAttribArray(programInfo.display.attribLocations.vertexPositionOffset);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.offsetBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.display.attribLocations.vertexPositionOffset , size, type, normalize, stride, offset);


    gl.bindTexture(gl.TEXTURE_2D, programInfo.modelData.dropPositions);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    gl.drawArrays(primitiveType, offset, programInfo.modelData.count);
}

function buildDropData(gl) {
    const displayShader = initShaderProgram(gl, dropSource.displayShader.vsSource, dropSource.displayShader.fsSource);

    return {
        display: {
            program: displayShader,
            attribLocations: {
                positionCenterCoordinate: gl.getAttribLocation(displayShader, "a_position_center_coordinate"),
                vertexPositionOffset: gl.getAttribLocation(displayShader, "a_position_offset"),
            },
            uniformLocations: {
                world_to_view_matrix: gl.getUniformLocation(displayShader, "world_to_view_matrix"),
            },
        },
        modelData: getDropModelData(gl)
    };
}