// Shader sources - loaded as raw strings by Vite
export const nodeVertexShader = `
uniform float uTime;
uniform float uBiographyWeight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vBioWeight = uBiographyWeight;

  float pulse = 1.0 + sin(uTime * 2.0 + uBiographyWeight * 6.28) * 0.05 * uBiographyWeight;
  vec3 pos = position * pulse;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const nodeFragmentShader = `
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uGlowIntensity;
uniform float uBiographyWeight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

  float noise = snoise(vWorldPosition * 0.1 + uTime * 0.2) * 0.5 + 0.5;
  float noise2 = snoise(vWorldPosition * 0.3 - uTime * 0.15) * 0.5 + 0.5;

  vec3 baseColor = mix(uColorPrimary, uColorSecondary, noise * vBioWeight);

  float innerGlow = smoothstep(0.0, 0.8, 1.0 - fresnel);
  float glowPulse = 1.0 + sin(uTime * 3.0 + vBioWeight * 10.0) * 0.15 * vBioWeight;

  float rimGlow = fresnel * (1.0 + vBioWeight * 2.0) * uGlowIntensity * glowPulse;

  float sss = pow(max(dot(viewDir, -vNormal), 0.0), 2.0) * 0.3 * (1.0 + vBioWeight);

  vec3 finalColor = baseColor * innerGlow;
  finalColor += baseColor * rimGlow * 1.5;
  finalColor += uColorSecondary * sss;

  float spots = smoothstep(0.6, 0.8, noise2) * vBioWeight;
  finalColor += vec3(1.0, 0.9, 0.8) * spots * 0.5;

  float alpha = 0.7 + vBioWeight * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const edgeVertexShader = `
attribute float aProgress;

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  vProgress = aProgress;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const edgeFragmentShader = `
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uEdgeStrength;

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  float flow = fract(vProgress * 3.0 - uTime * 0.5);
  float flowPulse = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);

  float endFade = smoothstep(0.0, 0.1, vProgress) * smoothstep(1.0, 0.9, vProgress);

  vec3 color = mix(uColorPrimary, uColorSecondary, vProgress);

  float energy = flowPulse * 0.5 + 0.5;
  color *= energy;

  float glow = 0.3 + flowPulse * 0.7 * uEdgeStrength;

  float alpha = endFade * glow * 0.6;

  gl_FragColor = vec4(color * 1.5, alpha);
}
`;

export const particleVertexShader = `
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

  vec3 pos = position;
  float t = uTime * aSpeed;

  pos.x += sin(t + aPhase) * 2.0;
  pos.y += cos(t * 0.7 + aPhase * 1.3) * 1.5;
  pos.z += sin(t * 0.5 + aPhase * 0.7) * 2.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  float sizeAtten = 300.0 / -mvPosition.z;
  gl_PointSize = uSize * sizeAtten;

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = `
uniform float uTime;

varying vec3 vColor;
varying float vPhase;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  if (dist > 0.5) discard;

  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 1.5);

  float pulse = sin(uTime * 3.0 + vPhase * 6.28) * 0.5 + 0.5;
  pulse = smoothstep(0.2, 0.8, pulse);

  float flash = pow(sin(uTime * 0.5 + vPhase * 12.56) * 0.5 + 0.5, 8.0);

  float intensity = glow * (0.3 + pulse * 0.5 + flash * 0.5);

  vec3 finalColor = vColor * intensity * 2.0;
  float alpha = intensity * 0.8;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// Instanced version of node vertex shader
export const instancedNodeVertexShader = `
uniform float uTime;

attribute float aBiographyWeight;
attribute float aNodeIndex;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;
varying float vNodeIndex;

void main() {
  vBioWeight = aBiographyWeight;
  vNodeIndex = aNodeIndex;

  // Transform normal by instance matrix
  mat3 normalMat = mat3(instanceMatrix);
  vNormal = normalize(normalMat * normal);

  // Apply pulse based on biography weight
  float pulse = 1.0 + sin(uTime * 2.0 + aBiographyWeight * 6.28) * 0.05 * aBiographyWeight;
  vec3 pos = position * pulse;

  // Apply instance transform
  vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

// Instanced version of node fragment shader (same as regular but reads from varying)
export const instancedNodeFragmentShader = `
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uGlowIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;
varying float vNodeIndex;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

  float noise = snoise(vWorldPosition * 0.1 + uTime * 0.2) * 0.5 + 0.5;
  float noise2 = snoise(vWorldPosition * 0.3 - uTime * 0.15) * 0.5 + 0.5;

  vec3 baseColor = mix(uColorPrimary, uColorSecondary, noise * vBioWeight);

  float innerGlow = smoothstep(0.0, 0.8, 1.0 - fresnel);
  float glowPulse = 1.0 + sin(uTime * 3.0 + vBioWeight * 10.0) * 0.15 * vBioWeight;

  float rimGlow = fresnel * (1.0 + vBioWeight * 2.0) * uGlowIntensity * glowPulse;

  float sss = pow(max(dot(viewDir, -vNormal), 0.0), 2.0) * 0.3 * (1.0 + vBioWeight);

  vec3 finalColor = baseColor * innerGlow;
  finalColor += baseColor * rimGlow * 1.5;
  finalColor += uColorSecondary * sss;

  float spots = smoothstep(0.6, 0.8, noise2) * vBioWeight;
  finalColor += vec3(1.0, 0.9, 0.8) * spots * 0.5;

  float alpha = 0.7 + vBioWeight * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
`;
