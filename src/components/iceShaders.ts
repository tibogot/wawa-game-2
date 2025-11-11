export const vert = /* glsl */ `  
uniform float uTime;
uniform float uHeight;
uniform float crackIntensity;
uniform float displacementScale;
varying float vHeight;
varying vec2 vUv;

vec3 displace(vec3 point) {
  vec3 p = point;
  
  // Very slow time animation (ice doesn't move much)
  float slowTime = uTime * 0.1;
  
  // Use gl-noise FBM for crack patterns
  gln_tFBMOpts fbmOpts = gln_tFBMOpts(1.0, 0.4, 2.3, 0.4, 1.0, 5, false, false);
  
  // Create crack pattern using FBM (similar to water but different parameters)
  float crackPattern = gln_normalize(gln_pfbm(p.xy * 8.0 + slowTime * 0.1, fbmOpts));
  crackPattern = pow(crackPattern, 2.0);
  
  // Add subtle surface variation
  float surfaceNoise = gln_normalize(gln_pfbm(p.xy * 4.0 + slowTime * 0.05, fbmOpts));
  surfaceNoise *= 0.3;
  
  // Combine crack pattern with noise
  float displacement = (crackPattern * crackIntensity + surfaceNoise) * displacementScale;
  
  // Much smaller displacement than water (0.01-0.05 vs 0.1+)
  vec3 n = vec3(0.0, displacement, 0.0);
  
  vHeight = displacement;
  
  return point + n;
}  

vec3 orthogonal(vec3 v) {
  return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0)
  : vec3(0.0, -v.z, v.y));
}

vec3 recalcNormals(vec3 newPos) {
  float offset = 0.001;
  vec3 tangent = orthogonal(normal);
  vec3 bitangent = normalize(cross(normal, tangent));
  vec3 neighbour1 = position + tangent * offset;
  vec3 neighbour2 = position + bitangent * offset;

  vec3 displacedNeighbour1 = displace(neighbour1);
  vec3 displacedNeighbour2 = displace(neighbour2);

  vec3 displacedTangent = displacedNeighbour1 - newPos;
  vec3 displacedBitangent = displacedNeighbour2 - newPos;

  return normalize(cross(displacedTangent, displacedBitangent));
}

void main() {
  vUv = uv;
  csm_Position = displace(position);
  csm_Normal = recalcNormals(csm_Position);
}
    `;

export const frag = /* glsl */ `
varying float vHeight;
varying vec2 vUv;

uniform vec3 iceColor;
uniform vec3 frostColor;
uniform vec3 crackColor;
uniform float frostIntensity;
uniform float crackIntensity;
uniform float iceThickness;
uniform float brightness;
uniform float uTime;

vec3 calcColor() {
  // Create frost pattern using simple noise-like pattern from UV
  float slowTime = uTime * 0.1;
  
  // Simple frost pattern using UV coordinates with sine/cosine waves
  float frostX = sin(vUv.x * 12.0 + slowTime * 0.05) * 0.5 + 0.5;
  float frostY = cos(vUv.y * 12.0 + slowTime * 0.05) * 0.5 + 0.5;
  float frostPattern = (frostX + frostY) * 0.5;
  frostPattern = pow(frostPattern, 1.5);
  
  // Add more variation with multiple frequencies
  float frostX2 = sin(vUv.x * 24.0 + slowTime * 0.1) * 0.5 + 0.5;
  float frostY2 = cos(vUv.y * 24.0 + slowTime * 0.1) * 0.5 + 0.5;
  float frostPattern2 = (frostX2 + frostY2) * 0.5;
  frostPattern = (frostPattern + frostPattern2 * 0.5) * 0.67;
  
  // Crack pattern based on height variation (amplified)
  float crackPattern = pow(abs(vHeight) * 20.0, 1.5);
  crackPattern = clamp(crackPattern, 0.0, 1.0);
  
  // Base ice color
  vec3 baseColor = iceColor;
  
  // Mix in frost color based on frost pattern
  vec3 frostOverlay = mix(baseColor, frostColor, frostPattern * frostIntensity);
  
  // Mix in crack color for darker areas
  vec3 crackOverlay = mix(frostOverlay, crackColor, crackPattern * crackIntensity * 0.5);
  
  // Apply brightness
  crackOverlay *= brightness;
  
  return crackOverlay;
}

void main() {
  csm_DiffuseColor = vec4(calcColor(), 1.0);   
}
    `;
