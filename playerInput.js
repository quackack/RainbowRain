var keySet = new Set();
document.addEventListener("keydown", (event) => {
	keySet.add(event.key.toLowerCase());
});
document.addEventListener("keyup", (event) => {
	keySet.delete(event.key.toLowerCase());
});

const FOV = 1;

var movementSpeed = 0.1;
var rotationSpeed = 0.01;

var pitch = 0;
var yaw = 0;

var position = [0, 0, 0];

function updateViewMatrix() {
	if (keySet.has('i')) {
		pitch-= rotationSpeed;
	}
	if (keySet.has('k')) {
		pitch+= rotationSpeed;
	}
	if (keySet.has('j')) {
		yaw-= rotationSpeed;
	}
	if (keySet.has('l')) {
		yaw+=rotationSpeed;
	}

	var translation = [0,0,0,1]
	if (keySet.has('w')) {
		translation[2] += movementSpeed;
	}
	if (keySet.has('a')) {
		translation[0] += movementSpeed;
	}
	if (keySet.has('s')) {
		translation[2] -= movementSpeed;
	}
	if (keySet.has('d')) {
		translation[0] -= movementSpeed;
	}
	if (keySet.has('q')) {
		translation[1] += movementSpeed;
	}
	if (keySet.has('e')) {
		translation[1] -= movementSpeed;
	}

	var transformedTranslation = m4.vec_mul(getAntiViewRotation(), translation);
	position = v4.add(position, transformedTranslation);
}

function getViewRotation() {
	var orientationMatrix = m4.translation(0, 0, 0);
	orientationMatrix = m4.xRotate(orientationMatrix, pitch);
	orientationMatrix = m4.yRotate(orientationMatrix, yaw);
	return orientationMatrix;
}

function getAntiViewRotation() {
	var orientationMatrix = m4.translation(0, 0, 0);
	orientationMatrix = m4.yRotate(orientationMatrix, -yaw);
	orientationMatrix = m4.xRotate(orientationMatrix, -pitch);
	return orientationMatrix;
}

function getViewPosition() {
	return m4.translation(position[0], position[1], position[2]);
}
function getAntiViewPosition() {
	return m4.translation(-position[0], -position[1], -position[2]);
}

function getCameraSpaceMatrix() {

	return m4.multiply(getViewRotation(), getViewPosition());
}

function getViewMatrix() {
	return m4.multiply(directionToViewMatrix(), getViewPosition());
}

function getCameraToWorldMatrix() {
	return m4.multiply(getAntiViewPosition(), getAntiViewRotation());
}

function directionToViewMatrix() {
	const perspectiveMatrix = m4.perspective(FOV, gl.canvas.clientWidth /gl.canvas.clientHeight, 0.1, 1000);
	return m4.multiply(perspectiveMatrix, getViewRotation());
}

function getViewDirectionMatrix() {
	//TODO: FIGURE OUT WHY THE OBVIOUS THING (INVVERTING THE DIRECTION TO VIEW MATRIX) DOES NOT WORK!
	//const perspectiveMatrix = m4.perspective(FOV, gl.canvas.clientWidth /gl.canvas.clientHeight, 0.1, 1000);
	//const antiPerspective = m4.inverse_perspective(FOV, gl.canvas.clientWidth /gl.canvas.clientHeight, 0.1, 1000);

	var orientationMatrix = m4.translation(0, 0, 0);
	orientationMatrix = m4.yRotate(orientationMatrix, yaw);
	orientationMatrix = m4.xRotate(orientationMatrix, pitch);

	return orientationMatrix;//m4.multiply(getAntiViewRotation(), antiPerspective);
}

function getCameraData() {
	updateViewMatrix();
	return {
		worldToCameraMatrix: getCameraSpaceMatrix(),
		cameraToWorldMatrix: getCameraToWorldMatrix(),
		world_to_view_matrix: getViewMatrix(),
		view_to_world_direction_matrix: getViewDirectionMatrix(),
	}
}