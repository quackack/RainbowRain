// Vertex shader program
const terrainSource = {
    vsSource: `
    uniform mat4 world_to_view_matrix;
    uniform float vertDiff;
    uniform sampler2D u_texture;
    
    attribute vec2 position;
  
    varying vec3 normal;
    varying vec2 uv;
    ` + shadeMac.heightNorm + `
  
    void main() {
      float height = getHeight(position, u_texture);
      normal = getNorm(position, vertDiff, u_texture);
      
      vec4 worldPos = vec4(position.x, height, position.y, 1.0);
      gl_Position = world_to_view_matrix * worldPos;
      uv = position;
    }
  `,
    fsSource: `
    precision lowp float;
    
    uniform vec3 light_direction;
    uniform vec3 light_color;
    uniform vec3 ambient;
    uniform sampler2D u_texture;
    
    // Passed in from the vertex shader.
    varying vec3 normal;
    varying vec2 uv;
    
    vec3 getColor() {
        return texture2D(u_texture, 0.5+0.5*uv).rgb;
    }
    
    void main() {
      vec3 realNormal = normalize(normal);
      vec3 lightColor = light_color*max(0.0, dot(realNormal, light_direction));
      vec3 ourColor = getColor()*(lightColor + ambient);
      gl_FragColor = vec4(ourColor, 1.0);
    }
  `,
    resolution: 50};

function getTerrainModel(gl) {
    var vertices = [];

    var den = 1/ terrainSource.resolution;
    for (let i = -terrainSource.resolution; i < terrainSource.resolution; i++) {
        for (let j = -terrainSource.resolution; j < terrainSource.resolution; j++) {
            vertices.push(i*den, j * den,
                (i+1)*den, (j+1)*den, //First Triangle
                (i+1)*den, j*den,

                (i+1)*den, (j+1)*den,
                i*den, j*den, // Second Triangle
                i*den, (j+1)*den,
                );
        }
    }
    var vertBuff = getFloatBufferForData(gl, vertices);
    const texture = fullFractalRender(gl, terrainSource.resolution*2);
    const heightMapSwap = fullFractalRender(gl, terrainSource.resolution*2);

    return {positions: vertBuff, texture: texture, heightMapSwap: heightMapSwap,
        count: 2*terrainSource.resolution*2*terrainSource.resolution*3*2};
}


function renderTerrain(gl, programInfo, camData) {
    //Set the shader
    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.world_to_view_matrix, false, camData.world_to_view_matrix);
    gl.uniform3fv(programInfo.uniformLocations.light_color,  [1.0, 0.8, 0.9]);
    gl.uniform3fv(programInfo.uniformLocations.light_direction, [0.01, 0.95, 0.3]);
    gl.uniform3fv(programInfo.uniformLocations.ambient, [0.01, 0.015, 0.02]);
    gl.uniform1fv(programInfo.uniformLocations.vertDiff, [1/(2.0*terrainSource.resolution)]);

    //Bind the vertex positions
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.modelData.positions);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition, size, type, normalize, stride, offset);


    gl.bindTexture(gl.TEXTURE_2D, programInfo.modelData.texture);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    gl.drawArrays(primitiveType, offset, programInfo.modelData.count);
}

function getTerrainData(gl) {
    const shaderProgram = initShaderProgram(gl, terrainSource.vsSource, terrainSource.fsSource);

    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "position"),
        },
        uniformLocations: {
            world_to_view_matrix: gl.getUniformLocation(shaderProgram, "world_to_view_matrix"),
            vertDiff: gl.getUniformLocation(shaderProgram, "vertDiff"),
            light_direction: gl.getUniformLocation(shaderProgram, "light_direction"),
            light_color: gl.getUniformLocation(shaderProgram, "light_color"),
            ambient: gl.getUniformLocation(shaderProgram, "ambient"),
        },
        modelData: getTerrainModel(gl)
    };
}