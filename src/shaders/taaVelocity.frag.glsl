uniform mat4 currentViewMatrix;
uniform mat4 currentProjectionMatrix;
uniform mat4 previousViewMatrix;
uniform mat4 previousProjectionMatrix;
uniform vec2 currentJitter;
uniform vec2 previousJitter;
uniform vec2 resolution;
uniform sampler2D tDepth;
varying vec2 vUv;

// Convert screen UV to NDC
vec2 screenToNDC(vec2 uv) {
	return (uv * 2.0 - 1.0) * vec2(1.0, -1.0);
}

// Convert NDC to screen UV
vec2 ndcToScreen(vec2 ndc) {
	return (ndc * vec2(1.0, -1.0) + 1.0) * 0.5;
}

void main() {
	// Current screen position
	vec2 currentScreen = vUv;
	vec2 currentNDC = screenToNDC(currentScreen);

	// Sample depth from depth texture
	float depth = texture2D(tDepth, currentScreen).r;

	// Reconstruct view-space position from NDC and depth
	// Convert depth from [0,1] to NDC z range (typically [-1,1] or [near,far])
	// For perspective projection, we need to unproject properly
	vec4 currentViewPos = vec4(currentNDC.x, currentNDC.y, depth * 2.0 - 1.0, 1.0);
	currentViewPos = inverse(currentProjectionMatrix) * currentViewPos;
	currentViewPos /= currentViewPos.w;

	// Transform to world space
	vec4 worldPos = inverse(currentViewMatrix) * currentViewPos;

	// Transform to previous view space
	vec4 previousViewPos = previousViewMatrix * worldPos;

	// Project to previous NDC
	vec4 previousNDC = previousProjectionMatrix * previousViewPos;
	previousNDC /= previousNDC.w;

	// Account for jitter offset
	previousNDC.xy -= (previousJitter - currentJitter) * 2.0;

	// Convert to previous screen space
	vec2 previousScreen = ndcToScreen(previousNDC.xy);

	// Calculate velocity (motion from current to previous)
	vec2 velocity = previousScreen - currentScreen;

	// Output velocity in UV space
	gl_FragColor = vec4(velocity, 0.0, 1.0);
}


