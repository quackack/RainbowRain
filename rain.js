// Vertex shader program
const dropSource = {
    displayShader: {
    vsSource: `
    uniform mat4 world_to_view_matrix;
    uniform sampler2D center_texture;
    
    attribute float a_drop_coordinate;
    attribute vec4 a_position_offset;

    void main() {
      vec4 object_center = texture2D(center_texture, vec2(a_drop_coordinate, 0));
      gl_Position = (world_to_view_matrix * object_center) + vec4(a_position_offset.xyz, 0.0);
    }
  `,
    fsSource: `
    precision lowp float;
    
    void main() {
      gl_FragColor = vec4(1.0, 0.5, 1.0, 1.0);
    }
  `},
    positionUpdateShader: {
        vsSource: `
        uniform sampler2D position_texture;
        uniform sampler2D velocity_texture;
        
        attribute float a_drop_coordinate;
    
        varying vec4 v_new_position;
        void main() {
          gl_PointSize = 1.0;
          gl_Position = vec4(a_drop_coordinate*2.0-1.0, 0, 0, 1.0);
          
          vec4 start_position = texture2D(position_texture, vec2(a_drop_coordinate, 0));
          vec4 velocity = texture2D(velocity_texture, vec2(a_drop_coordinate, 0));
          v_new_position = start_position+velocity;
          if (v_new_position.y < 0.0) {
              v_new_position.y = 1.0;
              v_new_position.xz = -v_new_position.xz;
          }
        }
        `,
        fsSource: `
        precision highp float;
    
        varying vec4 v_new_position;
        void main() {
          gl_FragColor = v_new_position;
        }`
    },

    moveShader: {},
    dropCount: 10000,
    dropSize: 0.01};

function getInitialDropLocationTexture(gl, offset) {
    var dropLocations = [];
    for (var i = 0; i < 100; i++) {
        for (var j = 0; j < 100; j++) {
            var xPos = (i - 49.5)/50;
            var zPos = (j - 49.5)/50;
            var yPos = 1.5 + Math.sin(i) * Math.sin(j) + offset;
            dropLocations.push(xPos, yPos, zPos, 1.0);
        }
    }
    return create1DTexture(gl, dropLocations);
}

function getInitialDropVelocityTexture(gl) {
    var dropVelocity = [];
    const variance = 0.0002;
    const dropSpeed = 0.001;
    for (var i = 0; i < dropSource.dropCount; i++) {

        dropVelocity.push(variance*Math.sin(i), -dropSpeed + variance*Math.sin(2*i), variance*Math.cos(i), 0.0);
    }
    return create1DTexture(gl, dropVelocity);
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
            a_position_offset.push(0, 0, -size*0.01);
            const theta2 = Math.PI*triangle/3;
            const theta1 = Math.PI*(triangle+1)/3;
            a_position_offset .push(Math.sin(theta1)*size, Math.cos(theta1)*size, 0);
            a_position_offset .push(Math.sin(theta2)*size, Math.cos(theta2)*size, 0);
        }
    }
    var centerBuffer = getFloatBufferForData(gl, a_position_center_coordinate);
    var offsetBuffer = getFloatBufferForData(gl, a_position_offset);
    var dropPositions = getInitialDropLocationTexture(gl, 0.01);
    var dropVelocities = getInitialDropVelocityTexture(gl);
    var dropStateSwapTexture = getInitialDropLocationTexture(gl, -0.01);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, dropStateSwapTexture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return {dropCoordinate: centerBuffer, offsetBuffer: offsetBuffer, dropPositions: dropPositions,
        dropVelocities: dropVelocities, dropStateSwapTexture: dropStateSwapTexture,
        count: dropSource.dropCount*6*3};
}

function updateDrops(gl, programInfo) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, programInfo.modelData.dropStateSwapTexture, 0);

    gl.viewport(0, 0, dropSource.dropCount, 1);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.useProgram(programInfo.move.program);

    gl.enableVertexAttribArray(programInfo.move.attribLocations.dropCoordinate);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.dropCoordinate);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 1;          // 1 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.move.attribLocations.dropCoordinate, size, type, normalize, stride, offset);

    // set which texture units to render with.
    gl.uniform1i(programInfo.move.uniformLocations.positionTexture, 0);  // texture unit 0
    gl.uniform1i(programInfo.move.uniformLocations.velocityTexture, 1);  // texture unit 1

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, programInfo.modelData.dropPositions);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, programInfo.modelData.dropVelocities);

    gl.drawArrays(gl.POINTS, 0, programInfo.modelData.count);


    const newSwap = programInfo.modelData.dropPositions;
    programInfo.modelData.dropPositions = programInfo.modelData.dropStateSwapTexture;
    programInfo.modelData.dropStateSwapTexture = newSwap;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderDrops(gl, programInfo, camData) {
    //Set the shader
    gl.useProgram(programInfo.display.program);

    gl.uniformMatrix4fv(programInfo.display.uniformLocations.world_to_view_matrix, false, camData.world_to_view_matrix);

    //Bind the drop centers
    gl.enableVertexAttribArray(programInfo.display.attribLocations.dropCoordinate);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.dropCoordinate);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 1;          // 1 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.display.attribLocations.dropCoordinate, size, type, normalize, stride, offset);

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

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, programInfo.modelData.dropPositions);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    gl.drawArrays(primitiveType, offset, programInfo.modelData.count);
}

function buildDropData(gl) {
    const displayShader = initShaderProgram(gl, dropSource.displayShader.vsSource, dropSource.displayShader.fsSource);
    const positionUpdateShader = initShaderProgram(gl, dropSource.positionUpdateShader.vsSource, dropSource.positionUpdateShader.fsSource);

    return {
        display: {
            program: displayShader,
            attribLocations: {
                dropCoordinate: gl.getAttribLocation(displayShader, "a_drop_coordinate"),
                vertexPositionOffset: gl.getAttribLocation(displayShader, "a_position_offset"),
            },
            uniformLocations: {
                world_to_view_matrix: gl.getUniformLocation(displayShader, "world_to_view_matrix"),
            },
        },
        move: {
            program: positionUpdateShader,
            attribLocations: {
                dropCoordinate: gl.getAttribLocation(positionUpdateShader, "a_drop_coordinate"),
            },
            uniformLocations: {
                positionTexture: gl.getUniformLocation(positionUpdateShader, "position_texture"),
                velocityTexture: gl.getUniformLocation(positionUpdateShader, "velocity_texture"),
            }
        },
        modelData: getDropModelData(gl)
    };
}