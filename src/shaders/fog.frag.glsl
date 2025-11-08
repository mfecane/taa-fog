#include <packing>
#include <shadowmap_pars_fragment>

// Volumetric fog (fullscreen pass)
// Assumes standard perspective depth (Three.js DepthTexture)

uniform sampler2D tDepth;

uniform mat4 cameraProjectionMatrixInverse;
uniform mat4 viewMatrixInverse;            // camera.matrixWorld
uniform mat4 directionalShadowMatrix;

uniform vec2 cameraNearFar;                // [near, far]
uniform vec2 resolution;

uniform float fogDensity;                  // base density
uniform float maxFogDistance;              // clamp for tiny scene, e.g. 2.0
uniform vec3 fogSphereCenter;              // Fog volume sphere center
uniform float fogSphereRadius;             // Fog volume sphere radius
uniform float time;
uniform float animSpeed;                   // Animation speed (warp speed)

uniform vec3 lightDirection;               // normalized dir FROM light TO scene (i.e. -DirectionalLight.worldDirection)
uniform vec3 lightColor;
uniform float lightIntensity;
uniform float lightMultiplier;             // Additional multiplier for fine-tuning light contribution

// Shadow mapping uniforms (Three.js style)
uniform sampler2D shadowMap;
uniform vec2 shadowMapSize;
uniform float shadowIntensity;
uniform float shadowBias;
uniform float shadowRadius;
uniform float fogSteps;
uniform float rayNoiseScale;

varying vec2 vUv;

// ------------- Noise utilities -------------

float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    vec3 u = f * f * (3.0 - 2.0 * f);

    float nx00 = mix(n000, n100, u.x);
    float nx10 = mix(n010, n110, u.x);
    float nx01 = mix(n001, n101, u.x);
    float nx11 = mix(n011, n111, u.x);

    float nxy0 = mix(nx00, nx10, u.y);
    float nxy1 = mix(nx01, nx11, u.y);

    return mix(nxy0, nxy1, u.z);
}

float domainWarpedNoise(vec3 p) {
    // Tuned for small (~2u) scene, adjust to taste
    float baseScale = 2.5;
    float warpScale = 4.0;
    float warpStrength = 0.4;

    vec3 q = p * warpScale + vec3(time * 0.3, time * 0.25, time * 0.2);
    vec3 warp = vec3(
        valueNoise(q + vec3(13.1, 7.7, 3.1)),
        valueNoise(q + vec3(5.2, 17.3, 9.2)),
        valueNoise(q + vec3(11.7, 3.4, 21.1))
    ) * warpStrength;

    vec3 finalP = p * baseScale + warp + vec3(0.0, time * animSpeed, 0.0);

    float n =
        0.6 * valueNoise(finalP) +
        0.3 * valueNoise(finalP * 2.1) +
        0.1 * valueNoise(finalP * 4.3);

    return clamp(n, 0.0, 1.0);
}

// ------------- Shadow mapping -------------

float getWorldShadow(vec3 worldPos) {
    vec4 vShadowCoord = directionalShadowMatrix * vec4(worldPos, 1.0);
    return getShadow(
        shadowMap,
        shadowMapSize,
        shadowIntensity,
        shadowBias,
        shadowRadius,
        vShadowCoord
    );
}

// ------------- Phase function -------------

float phaseHG(float cosTheta, float g) {
    float g2 = g * g;
    float denom = pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
    return (1.0 - g2) / (4.0 * 3.14159265 * max(denom, 1e-4));
}

// ------------- Depth -------------

float getDepth(const in vec2 uv) {
    #if DEPTH_PACKING == 1
        return unpackRGBAToDepth(texture2D(tDepth, uv));
    #else
        return texture2D(tDepth, uv).x;
    #endif
}

float getViewZ(const in float depth) {
    #if PERSPECTIVE_CAMERA == 1
        return perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);
    #else
        return orthographicDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);
    #endif
}

// ------------- Ray dithering -------------

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

vec3 rayNoise(vec3 n) {
    return rayNoiseScale * (vec3(rand(n.xy), rand(n.yz), rand(n.zx)) - vec3(0.5));
}

// Ray-sphere intersection to find entry and exit points
void intersectSphere(vec3 ro, vec3 rd, vec3 center, float radius, out float t0, out float t1) {
    vec3 oc = ro - center;
    float a = dot(rd, rd);
    float b = 2.0 * dot(oc, rd);
    float c = dot(oc, oc) - radius * radius;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
        t0 = -1.0;
        t1 = -1.0;
        return;
    }

    float sqrtDisc = sqrt(discriminant);
    t0 = (-b - sqrtDisc) / (2.0 * a);
    t1 = (-b + sqrtDisc) / (2.0 * a);

    // Ensure t0 < t1
    if (t0 > t1) {
        float temp = t0;
        t0 = t1;
        t1 = temp;
    }
}

vec4 volumetricMarch(vec3 ro, vec3 rd, float maxDist) {
    float startDist = 0.02;
    if (maxDist <= startDist) {
        return vec4(0.0);
    }

    // Check if camera is inside the sphere
    float distToCenter = length(ro - fogSphereCenter);
    bool cameraInsideSphere = distToCenter < fogSphereRadius;

    // Find intersection with fog sphere
    float sphereT0, sphereT1;
    intersectSphere(ro, rd, fogSphereCenter, fogSphereRadius, sphereT0, sphereT1);

    float fogStart, fogEnd;

    if (cameraInsideSphere) {
        // Camera is inside sphere: start from camera, end at exit point or maxDist
        fogStart = startDist;
        if (sphereT1 > 0.0) {
            fogEnd = min(maxDist, sphereT1);
        } else {
            // No exit point found (shouldn't happen, but handle it)
            fogEnd = maxDist;
        }
    } else {
        // Camera is outside sphere: check if ray enters sphere
        if (sphereT0 < 0.0 || sphereT1 < 0.0) {
            // Ray doesn't intersect sphere
            return vec4(0.0);
        }

        // Ray enters at sphereT0, exits at sphereT1
        fogStart = max(startDist, max(0.0, sphereT0));
        fogEnd = min(maxDist, sphereT1);
    }

    if (fogEnd <= fogStart) {
        return vec4(0.0);
    }

    float tStep = (fogEnd - fogStart) / float(fogSteps);
    float opticalDepth = 0.0;
    vec3 scatteredLight = vec3(0.0);

    // Isotropic scattering to make fog brightness more view-angle uniform
    float g = 0.1;

    for (int i = 0; i < int(fogSteps); i++) {
        float t = fogStart + float(i) * tStep;
        float tNext = fogStart + (float(i) + 1.0) * tStep;

        // Clamp step to depth buffer boundary if it would exceed it
        float actualStepEnd = min(tNext, maxDist);
        float actualStepStart = max(t, fogStart);
        float actualStepSize = actualStepEnd - actualStepStart;

        if (actualStepSize <= 0.0 || actualStepStart >= maxDist) break;

        // Sample at the center of the actual step
        float tSample = actualStepStart + actualStepSize * 0.5;
        vec3 worldPos = ro + rd * tSample;

        // Double-check we're inside sphere (safety check)
        float distToCenter = length(worldPos - fogSphereCenter);
        if (distToCenter > fogSphereRadius) {
            continue;
        }

        float n = domainWarpedNoise(worldPos);
        float localDensity = fogDensity * pow(n, 0.7);

        // Contributions are automatically scaled by using actualStepSize instead of tStep
        opticalDepth += localDensity * actualStepSize;

        // Light scattering (directional)
        vec3 L = normalize(lightDirection);       // FROM light TO scene
        float shadow = getWorldShadow(worldPos);

        float cosTheta = dot(rd, L);
        float phase = phaseHG(cosTheta, g);

        vec3 Li = lightColor * lightIntensity * lightMultiplier * shadow;

        float Tr = exp(-opticalDepth);           // transmittance from camera to sample

        scatteredLight += Tr * localDensity * Li * phase * actualStepSize;
    }

    // Alpha from extinction, not brightness hack
    float fogAlpha = 1.0 - exp(-opticalDepth);
    fogAlpha = clamp(fogAlpha, 0.0, 1.0);

    return vec4(scatteredLight, fogAlpha);
}

// ------------- Main -------------

void main() {
    // Raw depth from buffer
    float depth = getDepth(vUv);
    bool hasGeom = depth < 1.0 - 1e-5;

    // View-space Z (negative in front of camera for perspective)
    float viewZ = getViewZ(depth);     // <= 0 in front
    float linearViewZ = -viewZ;        // positive distance along camera forward

    // Reconstruct view ray direction from NDC
    vec2 ndc = vUv * 2.0 - 1.0;        // use vUv for stability
    vec4 clipPos = vec4(ndc, 1.0, 1.0);
    vec4 viewPos = cameraProjectionMatrixInverse * clipPos;
    viewPos /= viewPos.w;

    vec3 viewDir = normalize(viewPos.xyz);
    vec3 rayDirWorld = normalize((viewMatrixInverse * vec4(viewDir, 0.0)).xyz);

    // Dither & renormalize
    rayDirWorld += rayNoise(rayDirWorld);
    rayDirWorld = normalize(rayDirWorld);

    // Convert linearViewZ (along camera forward) to distance along this ray
    float distToGeom;
    if (hasGeom) {
        // viewDir.z is negative for forward rays
        float vz = max(-viewDir.z, 1e-3);
        distToGeom = linearViewZ / vz;
    } else {
        distToGeom = maxFogDistance;
    }

    float maxDist = min(distToGeom, maxFogDistance);
    if (maxDist <= 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec3 rayOrigin = cameraPosition;

    gl_FragColor = volumetricMarch(rayOrigin, rayDirWorld, maxDist);
}
