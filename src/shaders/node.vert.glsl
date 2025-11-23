// Vertex shader for node spheres with glow effect
uniform float uTime;
uniform float uBiographyWeight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vBioWeight = uBiographyWeight;

  // Subtle organic pulsing based on biography weight
  float pulse = 1.0 + sin(uTime * 2.0 + uBiographyWeight * 6.28) * 0.05 * uBiographyWeight;
  vec3 pos = position * pulse;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
