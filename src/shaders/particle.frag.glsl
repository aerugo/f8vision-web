// Fragment shader for bioluminescent floating orbs
uniform float uTime;

varying vec3 vColor;
varying float vPhase;

void main() {
  // Circular point with soft edges
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Discard outside circle
  if (dist > 0.5) discard;

  // Soft glow falloff
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 1.5);

  // Firefly-like pulsing
  float pulse = sin(uTime * 3.0 + vPhase * 6.28) * 0.5 + 0.5;
  pulse = smoothstep(0.2, 0.8, pulse);

  // Occasional bright flash
  float flash = pow(sin(uTime * 0.5 + vPhase * 12.56) * 0.5 + 0.5, 8.0);

  // Combine intensity
  float intensity = glow * (0.3 + pulse * 0.5 + flash * 0.5);

  // Output with color
  vec3 finalColor = vColor * intensity * 2.0;
  float alpha = intensity * 0.8;

  gl_FragColor = vec4(finalColor, alpha);
}
