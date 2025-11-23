// Vertex shader for organic curved edges
uniform float uTime;

attribute float aProgress; // 0-1 along the curve

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  vProgress = aProgress;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
