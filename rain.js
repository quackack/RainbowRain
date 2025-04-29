// Vertex shader program
const dropSource = {
    displayShader: {
    vsSource: `
    uniform mat4 world_to_view_matrix;
    uniform sampler2D center_texture;
    
    attribute float a_drop_coordinate;
    attribute vec4 a_position_offset;

    varying vec4 position;
    void main() {
      vec4 object_center = texture2D(center_texture, vec2(a_drop_coordinate, 0));
      gl_Position = (world_to_view_matrix * object_center) + vec4(a_position_offset.xyz, 0.0);
      position = object_center;
    }
  `,
    fsSource: `
    precision lowp float;
    
    varying vec4 position;
    void main() {
      gl_FragColor = vec4(0.5+position.x*0.5, 0.0, 0.5+position.z*0.5, 1.0);
    }
  `},
    positionUpdateShader: {
        vsSource: `#version 300 es
        uniform float gravity;
        uniform float drag;
        uniform float bounciness;
        uniform float terrain_coordinate_gap;
        
        uniform sampler2D position_texture;
        uniform sampler2D velocity_texture;
        uniform sampler2D terrain_texture;
        
        in float a_drop_coordinate;
    
        out vec4 v_new_position;
        out vec4 v_new_velocity;
        ` + shadeMac.heightNormGLES3 + `
        
        void main() {
          //Set the render coordinates
          gl_PointSize = 1.0;
          gl_Position = vec4(a_drop_coordinate*2.0-1.0, 0, 0, 1.0);
          
          //Do the basic position update.
          vec4 start_position = texture(position_texture, vec2(a_drop_coordinate, 0));
          vec4 start_velocity = texture(velocity_texture, vec2(a_drop_coordinate, 0));
          vec4 new_position = start_position+start_velocity;
          //If we went below the map, then reset.
          if (new_position.y < 0.0) {
              new_position.y = 1.5;
              new_position.xz = -0.5*new_position.xz;
              v_new_position = new_position;
              v_new_velocity = start_velocity + 0.0002 * sin(20.0*start_position);
              return;
          }
          //Check if we hit the terrain and bounce if we did
          vec3 new_velocity = start_velocity.xyz;
          if (abs(new_position.x) <= 1.0 && abs(new_position.z) <= 1.0) {
            float terrain_height = texture(terrain_texture, 0.5 + 0.5*new_position.xz).x;
            if (terrain_height > new_position.y) {
                float speed = dot(new_velocity, new_velocity);
                if (speed < 0.000000001) {
                    new_position.y = 1.0;
                    v_new_velocity = start_velocity + 0.0002 * sin(20.0*start_position);
                } else {
                    vec3 norm = getNorm(new_position.xz, terrain_coordinate_gap, terrain_texture);
                    new_velocity = new_velocity - (2.0*dot(new_velocity.xyz, norm)) * norm;
                    new_velocity = new_velocity * bounciness;
                    new_position = new_position + vec4(norm * 0.001, 0.0)  ;
                }
            }
          }
          
          v_new_position = new_position;
          //Update the velocity.
          
          new_velocity.y -= gravity;
          float vsqr = dot(new_velocity, new_velocity);
          new_velocity = max(0.1, 1.0 - vsqr*drag) * new_velocity;
          
          v_new_velocity.xyz = new_velocity;
        }
        `,
        fsSource: `#version 300 es
        precision highp float;
    
        in vec4 v_new_position;
        in vec4 v_new_velocity;
        
        layout(location=0) out vec4 o_new_position;
        layout(location=1) out vec4 o_new_velocity;
        void main() {
          o_new_position = v_new_position;
          o_new_velocity = v_new_velocity;
        }`
    },
    terrainUpdateShader: {
        vsSource: `#version 300 es
        uniform float terrain_damage_rate;
        uniform float terrain_coordinate_gap;
        
        uniform sampler2D position_texture;
        uniform sampler2D velocity_texture;
        uniform sampler2D terrain_texture;
        
        in float a_drop_coordinate;
    
        out float delta_height;
        ` + shadeMac.heightNormGLES3 + `
        
        void main() {
          //Set the render coordinates
          gl_PointSize = 1.0;
          
          //Do the basic position update.
          vec4 start_position = texture(position_texture, vec2(a_drop_coordinate, 0));
          vec4 start_velocity = texture(velocity_texture, vec2(a_drop_coordinate, 0));
          vec4 new_position = start_position+start_velocity;
          
          //Check if we hit the terrain and bounce if we did damage the terrain
          delta_height = 0.0;
          
          if (abs(new_position.x) <= 1.0 && abs(new_position.z) <= 1.0) {
            float terrain_height = texture(terrain_texture, 0.5 + 0.5*new_position.xz).x;
            if (terrain_height > new_position.y) {
                vec3 norm = getNorm(new_position.xz, terrain_coordinate_gap, terrain_texture);
                float impact_speed = abs(dot(norm, start_velocity.xyz));
                delta_height = -impact_speed * terrain_damage_rate;
            }
          }
          gl_Position = vec4(new_position.xz, 0.0, 1.0);
        }
        `,
        fsSource: `#version 300 es
        precision highp float;
    
        in float delta_height;
        
        layout(location=0) out vec4 o_new_terrain;
        void main() {
          o_new_terrain = vec4(delta_height, 0.0, 0.0, 0.0);
        }`
    },

    moveShader: {},
    dropCount: 10000,
    dropSize: 0.002};

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
    var dropPositionsSwap = getInitialDropLocationTexture(gl, -0.01);
    var dropVelocities = getInitialDropVelocityTexture(gl);
    var dropVelocitiesSwap = getInitialDropVelocityTexture(gl);

    return {dropCoordinate: centerBuffer, offsetBuffer: offsetBuffer,
        dropPositions: dropPositions, dropPositionsSwap: dropPositionsSwap,
        dropVelocities: dropVelocities, dropVelocitiesSwap: dropVelocitiesSwap,
        count: dropSource.dropCount*6*3};
}

function updateDrops(gl, dropInfo, terrainInfo) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // attach the texture as the first color attachment
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dropInfo.modelData.dropPositionsSwap, 0);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, dropInfo.modelData.dropVelocitiesSwap, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

    gl.viewport(0, 0, dropSource.dropCount, 1);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.useProgram(dropInfo.move.program);

    gl.uniform1fv(dropInfo.move.uniformLocations.gravity,  [0.0000015]);
    gl.uniform1fv(dropInfo.move.uniformLocations.drag,  [500]);
    gl.uniform1fv(dropInfo.move.uniformLocations.bounciness,  [0.93]);
    gl.uniform1fv(dropInfo.move.uniformLocations.terrain_coordinate_gap,  [1/(2.0*terrainSource.resolution)]);

    gl.enableVertexAttribArray(dropInfo.move.attribLocations.dropCoordinate);
    gl.bindBuffer(gl.ARRAY_BUFFER, dropInfo.modelData.dropCoordinate);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 1;          // 1 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        dropInfo.move.attribLocations.dropCoordinate, size, type, normalize, stride, offset);

    // set which texture units to render with.
    gl.uniform1i(dropInfo.move.uniformLocations.positionTexture, 0);  // texture unit 0
    gl.uniform1i(dropInfo.move.uniformLocations.velocityTexture, 1);  // texture unit 1
    gl.uniform1i(dropInfo.move.uniformLocations.terrainTexture, 2);  // texture unit 1

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dropInfo.modelData.dropPositions);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dropInfo.modelData.dropVelocities);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, terrainInfo.modelData.texture);

    gl.drawArrays(gl.POINTS, 0, dropInfo.modelData.count);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function updateTerrain(gl, dropInfo, terrainInfo) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, terrainInfo.modelData.heightMapSwap, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    gl.viewport(0, 0, terrainSource.resolution*2, terrainSource.resolution*2);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(dropInfo.updateTerrain.program);

    gl.uniform1fv(dropInfo.updateTerrain.uniformLocations.terrain_damage_rate,  [0.3]);
    gl.uniform1fv(dropInfo.updateTerrain.uniformLocations.terrain_coordinate_gap,  [1/(2.0*terrainSource.resolution)]);

    gl.enableVertexAttribArray(dropInfo.updateTerrain.attribLocations.dropCoordinate);
    gl.bindBuffer(gl.ARRAY_BUFFER, dropInfo.modelData.dropCoordinate);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 1;          // 1 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        dropInfo.updateTerrain.attribLocations.dropCoordinate, size, type, normalize, stride, offset);

    // set which texture units to render with.
    gl.uniform1i(dropInfo.updateTerrain.uniformLocations.positionTexture, 0);  // texture unit 0
    gl.uniform1i(dropInfo.updateTerrain.uniformLocations.velocityTexture, 1);  // texture unit 1
    gl.uniform1i(dropInfo.updateTerrain.uniformLocations.terrainTexture, 2);  // texture unit 1

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dropInfo.modelData.dropPositions);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dropInfo.modelData.dropVelocities);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, terrainInfo.modelData.texture);

    gl.drawArrays(gl.POINTS, 0, dropInfo.modelData.count);

    gl.blendFunc(gl.ONE, gl.ZERO);

    //Swap the terrain textures.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, terrainInfo.modelData.texture);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, terrainInfo.modelData.heightMapSwap, 0);

    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, terrainSource.resolution*2, terrainSource.resolution*2, 0);

    const newPosSwap = terrainInfo.modelData.heightMapSwap;
    terrainInfo.modelData.heightMapSwap = terrainInfo.modelData.texture;
    terrainInfo.modelData.texture = newPosSwap;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function swapPositions(dropProgram) {
    const newPosSwap = dropProgram.modelData.dropPositions;
    dropProgram.modelData.dropPositions = dropProgram.modelData.dropPositionsSwap;
    dropProgram.modelData.dropPositionsSwap = newPosSwap;
    const newVelSwap = dropProgram.modelData.dropVelocities;
    dropProgram.modelData.dropVelocities = dropProgram.modelData.dropVelocitiesSwap;
    dropProgram.modelData.dropVelocitiesSwap = newVelSwap;
}

function updateDropsAndTerrain(gl, dropProgram, terrainProgram) {
    updateDrops(gl, dropProgram, terrainProgram);
    updateTerrain(gl, dropProgram, terrainProgram);
    swapPositions(dropProgram);
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
    const terrainUpdateShader = initShaderProgram(gl, dropSource.terrainUpdateShader.vsSource, dropSource.terrainUpdateShader.fsSource);

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
                terrainTexture: gl.getUniformLocation(positionUpdateShader, "terrain_texture"),
                gravity: gl.getUniformLocation(positionUpdateShader, "gravity"),
                bounciness: gl.getUniformLocation(positionUpdateShader, "bounciness"),
                drag: gl.getUniformLocation(positionUpdateShader, "drag"),
                terrain_coordinate_gap: gl.getUniformLocation(positionUpdateShader, "terrain_coordinate_gap"),
            }
        },
        updateTerrain: {
            program: terrainUpdateShader,
            attribLocations: {
                dropCoordinate: gl.getAttribLocation(terrainUpdateShader, "a_drop_coordinate"),
            },
            uniformLocations: {
                positionTexture: gl.getUniformLocation(terrainUpdateShader, "position_texture"),
                velocityTexture: gl.getUniformLocation(terrainUpdateShader, "velocity_texture"),
                terrainTexture: gl.getUniformLocation(terrainUpdateShader, "terrain_texture"),
                terrain_coordinate_gap: gl.getUniformLocation(terrainUpdateShader, "terrain_coordinate_gap"),
                terrain_damage_rate: gl.getUniformLocation(terrainUpdateShader, "terrain_damage_rate"),
            }
        },
        modelData: getDropModelData(gl)
    };
}