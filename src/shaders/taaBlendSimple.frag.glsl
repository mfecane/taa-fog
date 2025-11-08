uniform sampler2D tCurrent;  // current frame
uniform sampler2D tHistory;   // previous accumulated frame
uniform float blendFactor;   // blend factor (0.0 = all current, 1.0 = all history)

varying vec2 vUv;

void main() {
	vec4 current = texture2D(tCurrent, vUv);
	vec4 history = texture2D(tHistory, vUv);
	
	// Simple linear blend between history and current frame
	vec4 blended = mix(current, history, blendFactor);
	
	gl_FragColor = blended;
}

