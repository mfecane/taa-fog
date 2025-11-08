uniform float opacity;
uniform int jitterIndex;
uniform sampler2D opacityMap;
uniform bool hasOpacityMap;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec4 vScreenPosition;
varying vec2 vUv;

const int  BAYER_SIZE = 8;
const int  BAYER_LEN  = 64;

const float BAYER_8X8[BAYER_LEN] = float[BAYER_LEN](
     0.0/64.0, 32.0/64.0,  8.0/64.0, 40.0/64.0,  2.0/64.0, 34.0/64.0, 10.0/64.0, 42.0/64.0,
    48.0/64.0, 16.0/64.0, 56.0/64.0, 24.0/64.0, 50.0/64.0, 18.0/64.0, 58.0/64.0, 26.0/64.0,
    12.0/64.0, 44.0/64.0,  4.0/64.0, 36.0/64.0, 14.0/64.0, 46.0/64.0,  6.0/64.0, 38.0/64.0,
    60.0/64.0, 28.0/64.0, 52.0/64.0, 20.0/64.0, 62.0/64.0, 30.0/64.0, 54.0/64.0, 22.0/64.0,
     3.0/64.0, 35.0/64.0, 11.0/64.0, 43.0/64.0,  1.0/64.0, 33.0/64.0,  9.0/64.0, 41.0/64.0,
    51.0/64.0, 19.0/64.0, 59.0/64.0, 27.0/64.0, 49.0/64.0, 17.0/64.0, 57.0/64.0, 25.0/64.0,
    15.0/64.0, 47.0/64.0,  7.0/64.0, 39.0/64.0, 13.0/64.0, 45.0/64.0,  5.0/64.0, 37.0/64.0,
    63.0/64.0, 31.0/64.0, 55.0/64.0, 23.0/64.0, 61.0/64.0, 29.0/64.0, 53.0/64.0, 21.0/64.0
);

float ditherPattern(vec2 pixelCoord, int jitterIndex) {
    int j = jitterIndex & 255;

    // 0..7, 0..7
    int ox = j % BAYER_SIZE;
    int oy = j / BAYER_SIZE;

    // integer-safe wrap
    int px = int(mod(pixelCoord.x + float(ox), float(BAYER_SIZE)));
    int py = int(mod(pixelCoord.y + float(oy), float(BAYER_SIZE)));

    int idx = py * BAYER_SIZE + px;
    return BAYER_8X8[idx]; // 0..1
}

void main() {
    // Sample alpha channel from RGBA texture if available
    float mapOpacity = hasOpacityMap ? texture2D(opacityMap, vUv).a : 1.0;

    // Combine base opacity with opacity map
    float finalOpacity = opacity * mapOpacity;

    float threshold = ditherPattern(gl_FragCoord.xy, jitterIndex);

    if (threshold > finalOpacity) {
        discard;
    }

    // Output depth value (will be written to depth buffer)
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}

