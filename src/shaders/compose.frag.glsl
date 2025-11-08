uniform sampler2D tColor;
uniform sampler2D tFog;
uniform vec3 backgroundColor;  // Background color for areas without geometry

varying vec2 vUv;

void main() {
	vec4 color = texture2D(tColor, vUv);
	vec4 fog = texture2D(tFog, vUv);

	// Use background color where there's no geometry (alpha = 0)
	vec3 sceneColor = color.a > 0.001 ? color.rgb : backgroundColor;
	
	// Compose fog over scene using additive blending for volumetric fog
	// fog.rgb contains scattered light, fog.a is fog opacity
	vec3 finalColor = sceneColor + fog.rgb;
	
	// Alpha: use scene alpha if present, otherwise fog alpha for background areas
	float finalAlpha = max(color.a, fog.a);

	gl_FragColor = vec4(finalColor, finalAlpha);
}

