// Fragment shader for ethereal connection lines
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uEdgeStrength;

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  // Flowing energy effect along edge
  float flow = fract(vProgress * 3.0 - uTime * 0.5);
  float flowPulse = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);

  // Fade at endpoints
  float endFade = smoothstep(0.0, 0.1, vProgress) * smoothstep(1.0, 0.9, vProgress);

  // Color gradient
  vec3 color = mix(uColorPrimary, uColorSecondary, vProgress);

  // Add energy pulses
  float energy = flowPulse * 0.5 + 0.5;
  color *= energy;

  // Glow effect
  float glow = 0.3 + flowPulse * 0.7 * uEdgeStrength;

  // Final alpha with smooth endpoints
  float alpha = endFade * glow * 0.6;

  gl_FragColor = vec4(color * 1.5, alpha);
}
