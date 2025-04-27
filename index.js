function resetBackground(gl) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
}

function render() {
    resetBackground(gl);
    const camData = getCameraData();
    renderSkybox(gl, skybox, camData);
    renderPyramid(gl, pyramidInfo, camData);
    renderTerrain(gl, terrainInfo, camData);
    gl.flush();
    requestAnimationFrame(render);
}



//
// start here
//
var gl;
var pyramidInfo;
var terrainInfo;
var skybox;
function main() {
    const canvas = document.getElementById("gl-canvas");
    // Initialize the GL context
    gl = canvas.getContext("webgl2");

    // Only continue if WebGL is available and working
    if (gl === null) {
        alert(
            "Unable to initialize WebGL. Your browser or machine may not support it.",
        );
        return;
    }

    pyramidInfo = getPyramidData(gl);
    skybox = getSkyboxData(gl);
    terrainInfo = getTerrainData(gl);

    // Draw the scene
    render();
}

main();
