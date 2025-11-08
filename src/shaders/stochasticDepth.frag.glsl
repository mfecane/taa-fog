uniform float opacity;
uniform int jitterIndex;
uniform sampler2D opacityMap;
uniform bool hasOpacityMap;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec4 vScreenPosition;
varying vec2 vUv;

const int  BAYER_SIZE = 4;
const int  BAYER_LEN  = 16;

const float BAYER_4X4[BAYER_LEN] = float[BAYER_LEN](
    0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
   12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
    3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
   15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
);

float ditherPattern(vec2 pixelCoord, int jitterIndex) {
    int j = jitterIndex & 15;

    // 0..3, 0..3
    int ox = j % BAYER_SIZE;
    int oy = j / BAYER_SIZE;

    // integer-safe wrap
    int px = int(mod(pixelCoord.x + float(ox), float(BAYER_SIZE)));
    int py = int(mod(pixelCoord.y + float(oy), float(BAYER_SIZE)));

    int idx = py * BAYER_SIZE + px;
    return BAYER_4X4[idx]; // 0..1
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

