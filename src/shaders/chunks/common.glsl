// Common shader chunks
// This file contains reusable shader code snippets

vec3 getNormal() {
    return normalize(vNormal);
}

float getDepth() {
    return gl_FragCoord.z;
}

