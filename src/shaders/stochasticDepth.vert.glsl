varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec4 vScreenPosition;
varying vec2 vUv;

void main() {
	vNormal = normalize(normalMatrix * normal);
	vec4 worldPos = modelMatrix * vec4(position, 1.0);
	vWorldPosition = worldPos.xyz;
	vScreenPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	vUv = uv;
	gl_Position = vScreenPosition;
}

