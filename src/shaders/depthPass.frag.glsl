uniform sampler2D tDepth;

varying vec2 vUv;

void main() {
    // Sample depth from texture and display directly as grayscale
    float depth = texture2D(tDepth, vUv).r / 1.2;

    // Visualize depth as grayscale (0 = near, 1 = far)
    gl_FragColor = vec4(vec3(depth), 1.0);
}

