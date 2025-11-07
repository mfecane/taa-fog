// Lighting calculations

vec3 calculateDiffuse(vec3 normal, vec3 lightDir, vec3 lightColor) {
    float diff = max(dot(normal, lightDir), 0.0);
    return diff * lightColor;
}

vec3 calculateSpecular(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 lightColor, float shininess) {
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    return spec * lightColor;
}

