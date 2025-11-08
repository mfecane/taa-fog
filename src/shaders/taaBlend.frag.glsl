uniform sampler2D tCurrent;        // current frame color (jittered, premultiplied-style: color if hit, otherwise nothing)
uniform sampler2D tHistory;        // previous accumulated color
uniform sampler2D tVelocity;       // motion vectors in UV space (current -> previous)
uniform sampler2D tDepth;          // current depth
uniform sampler2D tHistoryDepth;   // previous depth

uniform float baseBlend;           // e.g. 0.1..0.2
uniform float maxHistoryWeight;    // e.g. 0.9
uniform float depthThreshold;      // e.g. 0.001..0.01
uniform vec2  texelSize;           // 1.0 / renderResolution

varying vec2 vUv;

bool isValidUv(vec2 uv) {
    return uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
}

vec3 neighborhoodMin(sampler2D tex, vec2 uv) {
    vec3 mn = vec3( 1e9 );
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            vec2 o = vec2(float(x), float(y)) * texelSize;
            vec3 c = texture2D(tex, uv + o).rgb;
            mn = min(mn, c);
        }
    }
    return mn;
}

vec3 neighborhoodMax(sampler2D tex, vec2 uv) {
    vec3 mx = vec3(-1e9);
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            vec2 o = vec2(float(x), float(y)) * texelSize;
            vec3 c = texture2D(tex, uv + o).rgb;
            mx = max(mx, c);
        }
    }
    return mx;
}

void main() {
    vec4 current = texture2D(tCurrent, vUv);
    float currentDepth = texture2D(tDepth, vUv).r;

    vec2 velocity = texture2D(tVelocity, vUv).xy;   // current -> previous
    vec2 historyUv = vUv + velocity;

    vec4 history = vec4(0.0);
    bool useHistory = false;

    if (isValidUv(historyUv)) {
        history = texture2D(tHistory, historyUv);

        float historyDepth = texture2D(tHistoryDepth, historyUv).r;
        float depthDiff = abs(currentDepth - historyDepth);

        if (depthDiff < depthThreshold) {
            useHistory = true;
        }
    }

    // If history invalid -> just current (no ghosting, no weird alpha)
    if (!useHistory) {
        gl_FragColor = current;
        return;
    }

    // Neighborhood clamp on current frame to limit history influence
    vec3 nMin = neighborhoodMin(tCurrent, vUv);
    vec3 nMax = neighborhoodMax(tCurrent, vUv);

    vec3 historyClampedRgb = clamp(history.rgb, nMin, nMax);
    float historyA = history.a; // keep as is
    vec4 historyClamped = vec4(historyClampedRgb, historyA);

    // Motion-based adaptive weights
    float motionLen = length(velocity); // in UV
    float motionFactor = clamp(1.0 - motionLen * 200.0, 0.0, 1.0);

    float historyWeight = maxHistoryWeight * motionFactor;
    float currentWeight = 1.0 - historyWeight;

    // Enforce minimum current contribution
    currentWeight = max(currentWeight, baseBlend);
    historyWeight = 1.0 - currentWeight;

    // Blend RGB
    vec3 blendedRgb = historyClamped.rgb * historyWeight + current.rgb * currentWeight;

    // ✅ Blend alpha with the same weights (no max!)
    float blendedA = historyClamped.a * historyWeight + current.a * currentWeight;

    gl_FragColor = vec4(blendedRgb, blendedA);
}


