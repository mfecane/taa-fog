uniform sampler2D tColor;
uniform sampler2D tFog;
uniform vec3 backgroundColor;  // Background color for areas without geometry
uniform vec2 texelSize;
uniform float fogBlurRadius;

// Vignette
uniform float vignetteIntensity;
uniform float vignetteRadius;

// Color correction
uniform float exposure;
uniform float contrast;
uniform float saturation;
uniform float brightness;

varying vec2 vUv;

vec4 blurFog(sampler2D tex, vec2 uv, float radius) {
	if (radius <= 0.0) {
		return texture2D(tex, uv);
	}

	vec4 color = vec4(0.0);
	float totalWeight = 0.0;

	// Gaussian blur with fixed maximum radius (9x9 kernel)
	float r = min(radius, 4.0);
	int iRadius = int(r);

	for (int x = -4; x <= 4; x++) {
		for (int y = -4; y <= 4; y++) {
			if (abs(x) > iRadius || abs(y) > iRadius) continue;

			vec2 offset = vec2(float(x), float(y)) * texelSize;
			float dist = length(vec2(float(x), float(y)));
			float weight = exp(-dist * dist / (2.0 * r * r + 0.1));

			color += texture2D(tex, uv + offset) * weight;
			totalWeight += weight;
		}
	}

	color /= max(totalWeight, 0.0001);
	return color;
}

vec3 applyColorCorrection(vec3 color) {
	// Exposure
	color *= exposure;

	// Brightness
	color += brightness - 1.0;

	// Contrast (centered around 0.5)
	color = (color - 0.5) * contrast + 0.5;

	// Saturation
	float gray = dot(color, vec3(0.299, 0.587, 0.114));
	color = mix(vec3(gray), color, saturation);

	return color;
}

float calculateVignette(vec2 uv) {
	vec2 center = vec2(0.5, 0.5);
	float dist = distance(uv, center);
	// Create vignette: 1.0 at center, 0.0 at edges
	float vignette = 1.0 - smoothstep(vignetteRadius * 0.5, vignetteRadius, dist);
	// Apply intensity: 1.0 when intensity is 0, darker when intensity increases
	return 1.0 - vignetteIntensity * (1.0 - vignette);
}

void main() {
	vec4 color = texture2D(tColor, vUv);

	// Blur fog buffer if blur radius > 0
	vec4 fog = blurFog(tFog, vUv, fogBlurRadius);

	// Use background color where there's no geometry (alpha = 0)
	vec3 sceneColor = color.a > 0.001 ? color.rgb : backgroundColor;

	// Compose fog over scene using additive blending for volumetric fog
	// fog.rgb contains scattered light, fog.a is fog opacity
	vec3 finalColor = sceneColor + fog.rgb;

	// Apply color correction
	finalColor = applyColorCorrection(finalColor);

	// Apply vignette
	float vignette = calculateVignette(vUv);
	finalColor *= vignette;

	// Alpha: use scene alpha if present, otherwise fog alpha for background areas
	float finalAlpha = max(color.a, fog.a);

	gl_FragColor = vec4(finalColor, finalAlpha);
}

