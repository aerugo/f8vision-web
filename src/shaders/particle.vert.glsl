// Vertex shader for floating orbs/fireflies
uniform float uTime;
uniform float uSize;

attribute float aPhase;
attribute float aSpeed;
attribute vec3 aColor;

varying vec3 vColor;
varying float vPhase;

void main() {
  vColor = aColor;
  vPhase = aPhase;

  // Organic floating motion
  vec3 pos = position;
  float t = uTime * aSpeed;

  pos.x += sin(t + aPhase) * 2.0;
  pos.y += cos(t * 0.7 + aPhase * 1.3) * 1.5;
  pos.z += sin(t * 0.5 + aPhase * 0.7) * 2.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Size attenuation with distance
  float sizeAtten = 300.0 / -mvPosition.z;
  gl_PointSize = uSize * sizeAtten;

  gl_Position = projectionMatrix * mvPosition;
}
