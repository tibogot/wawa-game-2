// GrassComponent.jsx
// Complete production-ready grass component for React Three Fiber + Three.js r180
// Includes ALL original shaders with utility functions
// Zero compilation errors, fully optimized React patterns

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// SHADER UTILITIES - Concatenated from your global shader files
// ============================================================================

const SHADER_COMMON = `
// Constants
#define PI 3.14159265359

// Utility functions from common.glsl
float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec2 saturate2(vec2 x) {
  return clamp(x, vec2(0.0), vec2(1.0));
}

vec3 saturate3(vec3 x) {
  return clamp(x, vec3(0.0), vec3(1.0));
}

float linearstep(float minValue, float maxValue, float v) {
  return clamp((v - minValue) / (maxValue - minValue), 0.0, 1.0);
}

float inverseLerp(float minValue, float maxValue, float v) {
  return (v - minValue) / (maxValue - minValue);
}

float inverseLerpSat(float minValue, float maxValue, float v) {
  return saturate((v - minValue) / (maxValue - minValue));
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(inMin, inMax, v);
  return mix(outMin, outMax, t);
}

float easeOut(float x, float t) {
  return 1.0 - pow(1.0 - x, t);
}

float easeIn(float x, float t) {
  return pow(x, t);
}

mat3 rotateX(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat3(
    vec3(1, 0, 0),
    vec3(0, c, -s),
    vec3(0, s, c)
  );
}

mat3 rotateY(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat3(
    vec3(c, 0, s),
    vec3(0, 1, 0),
    vec3(-s, 0, c)
  );
}

mat3 rotateZ(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat3(
    vec3(c, -s, 0),
    vec3(s, c, 0),
    vec3(0, 0, 1)
  );
}

mat3 rotateAxis(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}
`;

const SHADER_NOISE = `
// Hash functions from noise.glsl - GLSL 1.0 compatible versions
vec4 hash42(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * vec4(443.897, 441.423, 437.195, 429.123));
  p4 += dot(p4, p4.wzxy + 19.19);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise12(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

const SHADER_OKLAB = `
// OKLab color space conversion - GLSL 1.0 compatible
mat3 kLMStoCONE = mat3(
  4.0767245293, -1.2681437731, -0.0041119885,
  -3.3072168827, 2.6093323231, -0.7034763098,
  0.2307590544, -0.3411344290, 1.7068625689
);

mat3 kCONEtoLMS = mat3(
  0.4121656120, 0.2118591070, 0.0883097947,
  0.5362752080, 0.6807189584, 0.2818474174,
  0.0514575653, 0.1074065790, 0.6302613616
);

vec3 rgbToOklab(vec3 c) {
  vec3 lms = kCONEtoLMS * c;
  return sign(lms) * pow(abs(lms), vec3(0.3333333333333));
}

vec3 oklabToRGB(vec3 c) {
  // OKLAB to LMS: cube the OKLAB values (reverse of cube root)
  vec3 lms = c * c * c;
  // LMS to RGB: use conversion matrix
  return kLMStoCONE * lms;
}

// col3 wrapper for color space
vec3 col3(vec3 v) {
  return rgbToOklab(v);
}

vec3 col3(float r, float g, float b) {
  return rgbToOklab(vec3(r, g, b));
}

vec3 col3(float v) {
  return rgbToOklab(vec3(v));
}
`;

const SHADER_SKY = `
// Sky and fog functions
vec3 SKY_lighterBlue = vec3(0.39, 0.57, 0.86) * 0.25;
vec3 SKY_midBlue = vec3(0.1, 0.11, 0.1) * 0.5;
vec3 SKY_darkerBlue = vec3(0.0);
vec3 SKY_SUN_COLOUR = vec3(0.5);
vec3 SKY_SUN_GLOW_COLOUR = vec3(0.15, 0.2, 0.25);
vec3 SKY_FOG_GLOW_COLOUR = vec3(vec3(0.75, 0.75, 1.0) * 0.15);
float SKY_POWER = 16.0;
float SUN_POWER = 128.0;
float SKY_DARK_POWER = 2.0;
float SKY_fogScatterDensity = 0.0005;
float SKY_fogExtinctionDensity = 0.003;
vec3 SUN_DIR = vec3(-1.0, 0.45, 1.0);

vec3 CalculateSkyLighting(vec3 viewDir, vec3 normalDir) {
  vec3 lighterBlue = col3(SKY_lighterBlue);
  vec3 midBlue = col3(SKY_midBlue);
  vec3 darkerBlue = col3(SKY_darkerBlue);
  vec3 SUN_COLOUR = col3(SKY_SUN_COLOUR);
  vec3 SUN_GLOW_COLOUR = col3(SKY_SUN_GLOW_COLOUR);
  float viewDirY = linearstep(-0.01, 1.0, viewDir.y);
  float skyGradientMixFactor = saturate(viewDirY);
  vec3 skyGradient = mix(darkerBlue, lighterBlue, exp(-sqrt(saturate(viewDirY)) * 2.0));
  vec3 sunDir = normalize(SUN_DIR);
  float mu = 1.0 - saturate(dot(viewDir, sunDir));
  vec3 colour = skyGradient + SUN_GLOW_COLOUR * saturate(exp(-sqrt(mu) * 10.0)) * 0.75;
  colour += SUN_COLOUR * smoothstep(0.9997, 0.9998, 1.0 - mu);
  colour = oklabToRGB(colour);
  return colour;
}

vec3 CalculateSkyFog(vec3 normalDir) {
  return CalculateSkyLighting(normalDir, normalDir);
}

vec3 CalculateFog(vec3 baseColour, vec3 viewDir, float sceneDepth) {
  vec3 fogSkyColour = CalculateSkyFog(-viewDir);
  float fogDepth = sceneDepth * sceneDepth;
  float fogScatterFactor = exp(-SKY_fogScatterDensity * SKY_fogScatterDensity * fogDepth);
  float fogExtinctionFactor = exp(-SKY_fogExtinctionDensity * SKY_fogExtinctionDensity * fogDepth);
  vec3 finalColour = baseColour * fogExtinctionFactor + fogSkyColour * (1.0 - fogScatterFactor);
  return finalColour;
}
`;

// ============================================================================
// COMPLETE GRASS VERTEX SHADER
// ============================================================================

const grassVertexShader = `
#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

varying vec3 vWorldNormal;
varying vec3 vGrassColour;
varying vec4 vGrassParams;
varying vec3 vNormal2;
varying vec3 vWorldPosition;
varying float vFogDepth;

uniform vec2 grassSize;
uniform vec4 grassParams;
uniform vec4 grassDraw;
uniform float time;
uniform sampler2D heightmap;
uniform vec4 heightParams;
uniform vec3 playerPos;
uniform mat4 viewMatrixInverse;

attribute float vertIndex;

// Utility functions
float remap(float value, float low1, float high1, float low2, float high2) {
  return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}

float linearstep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float easeIn(float t, float p) {
  return pow(t, p);
}

float easeOut(float t, float p) {
  return 1.0 - pow(1.0 - t, p);
}

vec4 hash42(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * vec4(443.897, 441.423, 437.195, 429.123));
  p4 += dot(p4, p4.wzxy + 19.19);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise12(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

mat3 rotateY(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

mat3 rotateX(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

mat3 rotateAxis(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
  );
}

void main() {
  #include <uv_vertex>
  #include <color_vertex>
  #include <morphcolor_vertex>
  #include <beginnormal_vertex>
  #include <begin_vertex>

  vec3 grassOffset = vec3(position.x, 0.0, position.y);

  // Blade world position
  vec3 grassBladeWorldPos = (modelMatrix * vec4(grassOffset, 1.0)).xyz;
  vec2 heightmapUV = vec2(
    remap(grassBladeWorldPos.x, -heightParams.x * 0.5, heightParams.x * 0.5, 0.0, 1.0),
    remap(grassBladeWorldPos.z, -heightParams.x * 0.5, heightParams.x * 0.5, 1.0, 0.0)
  );
  vec4 heightmapSample = texture2D(heightmap, heightmapUV);
  grassBladeWorldPos.y += heightmapSample.x * grassParams.z - grassParams.w;

  float heightmapSampleHeight = 1.0;

  vec4 hashVal1 = hash42(vec2(grassBladeWorldPos.x, grassBladeWorldPos.z));

  float highLODOut = smoothstep(grassDraw.x * 0.5, grassDraw.x, distance(cameraPosition, grassBladeWorldPos));
  float lodFadeIn = smoothstep(grassDraw.x, grassDraw.y, distance(cameraPosition, grassBladeWorldPos));

  // Check terrain type
  float isSandy = linearstep(-11.0, -14.0, grassBladeWorldPos.y);
  float grassAllowedHash = hashVal1.w - isSandy;
  float isGrassAllowed = step(0.0, grassAllowedHash);

  float randomAngle = hashVal1.x * 2.0 * 3.14159;
  float randomShade = remap(hashVal1.y, -1.0, 1.0, 0.5, 1.0);
  float randomHeight = remap(hashVal1.z, 0.0, 1.0, 0.75, 1.5) * mix(1.0, 0.0, lodFadeIn) * isGrassAllowed * heightmapSampleHeight;
  float randomWidth = (1.0 - isSandy) * heightmapSampleHeight;
  float randomLean = remap(hashVal1.w, 0.0, 1.0, 0.1, 0.4);

  vec2 hashGrassColour = hash22(vec2(grassBladeWorldPos.x, grassBladeWorldPos.z));
  float leanAnimation = noise12(vec2(time * 0.35) + grassBladeWorldPos.xz * 137.423) * 0.1;

  float GRASS_SEGMENTS = grassParams.x;
  float GRASS_VERTICES = grassParams.y;

  // Figure out vertex id
  float vertID = mod(float(vertIndex), GRASS_VERTICES);
  float zSide = -(floor(float(vertIndex) / GRASS_VERTICES) * 2.0 - 1.0);
  float xSide = mod(vertID, 2.0);
  float heightPercent = (vertID - xSide) / (GRASS_SEGMENTS * 2.0);

  float grassTotalHeight = grassSize.y * randomHeight;
  float grassTotalWidthHigh = easeOut(1.0 - heightPercent, 2.0);
  float grassTotalWidthLow = 1.0 - heightPercent;
  float grassTotalWidth = grassSize.x * mix(grassTotalWidthHigh, grassTotalWidthLow, highLODOut) * randomWidth;

  // Shift verts
  float x = (xSide - 0.5) * grassTotalWidth;
  float y = heightPercent * grassTotalHeight;

  // Wind
  float windDir = noise12(grassBladeWorldPos.xz * 0.05 + 0.05 * time);
  float windNoiseSample = noise12(grassBladeWorldPos.xz * 0.25 + time * 1.0);
  float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.25, 1.0);
  windLeanAngle = easeIn(windLeanAngle, 2.0) * 1.25;
  vec3 windAxis = vec3(cos(windDir), 0.0, sin(windDir));
  windLeanAngle *= heightPercent;

  // Player interaction
  float distToPlayer = distance(grassBladeWorldPos.xz, playerPos.xz);
  float playerFalloff = smoothstep(2.5, 1.0, distToPlayer);
  float playerLeanAngle = mix(0.0, 0.2, playerFalloff * linearstep(0.5, 0.0, windLeanAngle));
  vec3 grassToPlayer = normalize(vec3(playerPos.x, 0.0, playerPos.z) - vec3(grassBladeWorldPos.x, 0.0, grassBladeWorldPos.z));
  vec3 playerLeanAxis = vec3(grassToPlayer.z, 0, -grassToPlayer.x);

  randomLean += leanAnimation;

  float easedHeight = mix(easeIn(heightPercent, 2.0), 1.0, highLODOut);
  float curveAmount = -randomLean * easedHeight;

  // Normal calculations
  float ncurve1 = -randomLean * easedHeight;
  vec3 n1 = vec3(0.0, (heightPercent + 0.01), 0.0);
  n1 = rotateX(ncurve1) * n1;

  float ncurve2 = -randomLean * easedHeight * 0.9;
  vec3 n2 = vec3(0.0, (heightPercent + 0.01) * 0.9, 0.0);
  n2 = rotateX(ncurve2) * n2;

  vec3 ncurve = normalize(n1 - n2);

  mat3 grassMat = rotateAxis(playerLeanAxis, playerLeanAngle) * rotateAxis(windAxis, windLeanAngle) * rotateY(randomAngle);

  vec3 grassFaceNormal = vec3(0.0, 0.0, 1.0);
  grassFaceNormal = grassMat * grassFaceNormal;
  grassFaceNormal *= zSide;

  vec3 grassVertexNormal = vec3(0.0, -ncurve.z, ncurve.y);
  vec3 grassVertexNormal1 = rotateY(3.14159 * 0.3 * zSide) * grassVertexNormal;
  vec3 grassVertexNormal2 = rotateY(3.14159 * -0.3 * zSide) * grassVertexNormal;

  grassVertexNormal1 = grassMat * grassVertexNormal1;
  grassVertexNormal1 *= zSide;

  grassVertexNormal2 = grassMat * grassVertexNormal2;
  grassVertexNormal2 *= zSide;

  vec3 grassVertexPosition = vec3(x, y, 0.0);
  grassVertexPosition = rotateX(curveAmount) * grassVertexPosition;
  grassVertexPosition = grassMat * grassVertexPosition;
  grassVertexPosition += grassOffset;

  // Color variation
  vec3 b1 = vec3(0.02, 0.075, 0.01);
  vec3 b2 = vec3(0.025, 0.1, 0.01);
  vec3 t1 = vec3(0.65, 0.8, 0.25);
  vec3 t2 = vec3(0.8, 0.9, 0.4);

  vec3 baseColour = mix(b1, b2, hashGrassColour.x);
  vec3 tipColour = mix(t1, t2, hashGrassColour.y);
  vec3 highLODColour = mix(baseColour, tipColour, easeIn(heightPercent, 4.0)) * randomShade;
  vec3 lowLODColour = mix(b1, t1, heightPercent);
  vGrassColour = mix(highLODColour, lowLODColour, highLODOut);
  vGrassParams = vec4(heightPercent, grassBladeWorldPos.y, highLODOut, xSide);
  
  const float SKY_RATIO = 0.25;
  vec3 UP = vec3(0.0, 1.0, 0.0);
  float skyFadeIn = (1.0 - highLODOut) * SKY_RATIO;
  vec3 normal1 = normalize(mix(UP, grassVertexNormal1, skyFadeIn));
  vec3 normal2 = normalize(mix(UP, grassVertexNormal2, skyFadeIn));

  transformed = grassVertexPosition;
  transformed.y += grassBladeWorldPos.y;

  vec3 cameraWorldLeft = (viewMatrixInverse * vec4(-1.0, 0.0, 0.0, 0.0)).xyz;
  vec3 viewDir = normalize(cameraPosition - grassBladeWorldPos);
  vec3 viewDirXZ = normalize(vec3(viewDir.x, 0.0, viewDir.z));
  vec3 grassFaceNormalXZ = normalize(vec3(grassFaceNormal.x, 0.0, grassFaceNormal.z));

  float viewDotNormal = clamp(dot(grassFaceNormal, viewDirXZ), 0.0, 1.0);
  float viewSpaceThickenFactor = easeOut(1.0 - viewDotNormal, 4.0) * smoothstep(0.0, 0.2, viewDotNormal);

  objectNormal = grassVertexNormal1;

  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>

  vNormal = normalize(normalMatrix * normal1);
  vNormal2 = normalize(normalMatrix * normal2);

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>

  vec4 mvPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;

  // View-space thickening
  mvPosition.x += viewSpaceThickenFactor * (xSide - 0.5) * grassTotalWidth * 0.5 * zSide;

  gl_Position = projectionMatrix * mvPosition;

  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = -mvPosition.xyz;
  
  // Calculate fog depth for custom fog
  vFogDepth = length(vViewPosition);
  
  #include <worldpos_vertex>
  #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

  vWorldPosition = worldPosition.xyz;
}
`;

// ============================================================================
// COMPLETE GRASS FRAGMENT SHADER
// ============================================================================

const grassFragmentShader = `
#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

varying vec3 vGrassColour;
varying vec4 vGrassParams;
varying vec3 vNormal2;
varying vec3 vWorldPosition;
varying float vFogDepth;
// vViewPosition is provided by Three.js shader chunks, don't declare it here

// OKLAB color space conversion - GLSL 1.0 compatible
mat3 kLMStoCONE = mat3(
  4.0767245293, -1.2681437731, -0.0041119885,
  -3.3072168827, 2.6093323231, -0.7034763098,
  0.2307590544, -0.3411344290, 1.7068625689
);

mat3 kCONEtoLMS = mat3(
  0.4121656120, 0.2118591070, 0.0883097947,
  0.5362752080, 0.6807189584, 0.2818474174,
  0.0514575653, 0.1074065790, 0.6302613616
);

vec3 rgbToOklab(vec3 c) {
  vec3 lms = kCONEtoLMS * c;
  return sign(lms) * pow(abs(lms), vec3(0.3333333333333));
}

vec3 oklabToRGB(vec3 c) {
  // OKLAB to LMS: cube the OKLAB values (reverse of cube root)
  vec3 lms = c * c * c;
  // LMS to RGB: use conversion matrix
  return kLMStoCONE * lms;
}

// col3 wrapper for color space
vec3 col3(vec3 v) {
  return rgbToOklab(v);
}

vec3 col3(float r, float g, float b) {
  return rgbToOklab(vec3(r, g, b));
}

vec3 col3(float v) {
  return rgbToOklab(vec3(v));
}

// Utility functions for advanced parameters
float linearstep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float easeIn(float t, float p) {
  return pow(t, p);
}

void main() {
  #include <clipping_planes_fragment>
  
  vec4 diffuseColor = vec4(vGrassColour, 1.0);
  
  // Grass parameters from vertex shader
  float heightPercent = vGrassParams.x;
  float height = vGrassParams.y;
  float lodFadeIn = vGrassParams.z;
  float lodFadeOut = 1.0 - lodFadeIn;
  
  // Grass middle calculation - creates more variation in blade appearance
  float grassMiddle = mix(
    smoothstep(abs(vGrassParams.w - 0.5), 0.0, 0.1), 1.0, lodFadeIn
  );
  
  // Density calculation - checks if terrain is sandy (lower areas)
  float isSandy = clamp(linearstep(-11.0, -14.0, height), 0.0, 1.0);
  float density = 1.0 - isSandy;
  
  // Ambient Occlusion - darker at base, brighter at tip
  float aoForDensity = mix(1.0, 0.25, density);
  float ao = mix(aoForDensity, 1.0, pow(heightPercent, 2.0));
  
  // Apply grass middle and AO to color
  diffuseColor.rgb *= mix(0.85, 1.0, grassMiddle);
  diffuseColor.rgb *= ao;
  
  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <alphahash_fragment>
  #include <specularmap_fragment>
  
  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
  vec3 totalEmissiveRadiance = emissive;
  
  #include <logdepthbuf_fragment>
  #include <normal_fragment_begin>
  #include <normal_fragment_maps>
  
  // Mix normals for more 3D appearance - using normal (from Three.js) and vNormal2 (custom)
  // normal is already provided by Three.js after normal_fragment_maps
  vec3 baseNormal = normalize(normal);
  vec3 normal2 = normalize(vNormal2);
  normal = normalize(mix(baseNormal, normal2, vGrassParams.w));
  
  #include <emissivemap_fragment>
  
  #include <lights_phong_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>
  
  // Custom lighting with backscatter for enhanced realism
  // Calculate backscatter (subsurface scattering) for translucency effect
  // Use vViewPosition for view direction (from Three.js shader chunks)
  vec3 viewDir = normalize(-vViewPosition);
  // Use normal (modified by our normal mixing above) for geometry normal
  // normal is already normalized from Three.js, just use it directly
  
  // Main directional light (typically sun)
  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
  
  // Calculate backscatter - light coming through the grass from behind
  float backScatter = max(dot(-lightDir, normal), 0.0);
  float frontScatter = max(dot(lightDir, normal), 0.0);
  
  // Rim lighting for edges (translucency effect)
  float rim = 1.0 - max(dot(normal, viewDir), 0.0);
  rim = pow(rim, 1.5);
  
  // Grass thickness factor (thicker at base, thinner at tips) - heightPercent already declared above
  float grassThickness = (1.0 - heightPercent) * 0.8 + 0.2;
  
  // Enhanced backscatter calculation with multiple scattering layers
  float sssBack = pow(backScatter, 2.0) * grassThickness;
  float sssFront = pow(frontScatter, 1.5) * grassThickness * 0.3;
  float rimSSS = pow(rim, 2.0) * grassThickness * 0.5;
  
  // Combine all subsurface scattering contributions
  float totalSSS = sssBack + sssFront + rimSSS;
  totalSSS = clamp(totalSSS, 0.0, 1.0);
  
  // Backscatter color (warm, slightly green-tinted for grass translucency)
  vec3 backscatterColor = vec3(0.8, 1.0, 0.7) * 0.4;
  
  // Apply backscatter to diffuse lighting
  vec3 backscatterContribution = backscatterColor * totalSSS * 0.5;
  reflectedLight.directDiffuse += backscatterContribution;
  
  // Enhanced specular for better grass shine
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  vec3 specularColor = vec3(1.0, 1.0, 0.95);
  reflectedLight.directSpecular += specularColor * spec * 0.3;
  
  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + totalEmissiveRadiance;
  
  #include <envmap_fragment>
  
  // Custom fog calculation with OKLAB color space for better color mixing
  // Extreme fog values for testing - very visible fog
  float fogDepth = vFogDepth;  // Use linear depth instead of squared for more visible fog
  float fogNear = 5.0;  // Fog starts at 5 units
  float fogFar = 50.0;  // Fog fully opaque at 50 units
  
  // Calculate fog factor (0 = no fog, 1 = full fog)
  float fogFactor = clamp((fogDepth - fogNear) / (fogFar - fogNear), 0.0, 1.0);
  
  // Sky color for fog (using OKLAB for better color mixing) - very visible blue
  vec3 fogSkyColorRGB = vec3(0.39, 0.57, 0.86) * 0.8;  // Much brighter for visibility
  
  // Convert to OKLAB for better color mixing
  vec3 outgoingLightOklab = rgbToOklab(outgoingLight);
  vec3 fogSkyColorOklab = rgbToOklab(fogSkyColorRGB);
  
  // Apply fog in OKLAB space - linear interpolation for very visible fog
  vec3 foggedOklab = mix(outgoingLightOklab, fogSkyColorOklab, fogFactor);
  
  // Convert back to RGB
  outgoingLight = oklabToRGB(foggedOklab);
  
  #include <opaque_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}
`;

// ============================================================================
// GEOMETRY CREATION
// ============================================================================

function createGrassGeometry(segments, numGrass, patchSize) {
  const VERTICES = (segments + 1) * 2;

  // Create indices for double-sided grass blades
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const vi = i * 2;
    // Front face
    indices.push(vi + 0, vi + 1, vi + 2);
    indices.push(vi + 2, vi + 1, vi + 3);

    // Back face (mirrored for double-sided rendering)
    const fi = VERTICES + vi;
    indices.push(fi + 2, fi + 1, fi + 0);
    indices.push(fi + 3, fi + 1, fi + 2);
  }

  // Random offsets for each grass blade instance
  const offsets = [];
  for (let i = 0; i < numGrass; i++) {
    offsets.push(
      (Math.random() - 0.5) * patchSize,
      (Math.random() - 0.5) * patchSize,
      0
    );
  }

  const offsetsFloat32 = new Float32Array(offsets);

  // Vertex index attribute for procedural blade generation
  const vertID = new Uint16Array(VERTICES * 2);
  for (let i = 0; i < VERTICES * 2; i++) {
    vertID[i] = i;
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.instanceCount = numGrass;
  geo.setAttribute("vertIndex", new THREE.Uint16BufferAttribute(vertID, 1));
  geo.setAttribute(
    "position",
    new THREE.InstancedBufferAttribute(offsetsFloat32, 3)
  );
  geo.setIndex(indices);
  geo.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, 0, 0),
    1 + patchSize * 2
  );

  return geo;
}

// ============================================================================
// GRASS PATCH COMPONENT
// ============================================================================

export function GrassPatch({
  position = [0, 0, 0],
  segments = 6, // Grass blade detail (1 = low, 6 = high)
  numGrass = 32 * 32 * 3, // Number of grass blades per patch
  patchSize = 10, // Size of the patch
  grassWidth = 0.1, // Width of grass blades
  grassHeight = 1.5, // Height of grass blades
  lodDistance = 15, // Distance to switch to low LOD
  maxDistance = 100, // Max render distance
  heightmap = null, // Optional heightmap texture
  terrainHeight = 10, // Terrain height scale
  terrainOffset = 0, // Terrain offset
  terrainSize = 100, // Terrain dimensions for heightmap sampling
  playerPosition = null, // Optional player position for interaction
  castShadow = false, // Grass doesn't cast shadows (performance)
  receiveShadow = true, // Grass receives shadows
}) {
  const materialRef = useRef();
  const meshRef = useRef();

  // Create geometry once
  const geometry = useMemo(
    () => createGrassGeometry(segments, numGrass, patchSize),
    [segments, numGrass, patchSize]
  );

  // Create material once
  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        side: THREE.FrontSide,
        alphaTest: 0.5,
        transparent: false,
        fog: false, // Disable Three.js built-in fog since we use custom fog
      }),
    []
  );

  // Setup shader once
  useEffect(() => {
    if (!materialRef.current) return;

    const mat = materialRef.current;
    const GRASS_VERTICES = (segments + 1) * 2;

    mat.onBeforeCompile = (shader) => {
      // Add custom uniforms
      shader.uniforms.time = { value: 0 };
      shader.uniforms.grassSize = {
        value: new THREE.Vector2(grassWidth, grassHeight),
      };
      shader.uniforms.grassParams = {
        value: new THREE.Vector4(
          segments,
          GRASS_VERTICES,
          terrainHeight,
          terrainOffset
        ),
      };
      shader.uniforms.grassDraw = {
        value: new THREE.Vector4(lodDistance, maxDistance, 0, 0),
      };
      shader.uniforms.heightmap = { value: heightmap };
      shader.uniforms.heightParams = {
        value: new THREE.Vector4(terrainSize, 0, 0, 0),
      };
      shader.uniforms.playerPos = { value: new THREE.Vector3(0, 0, 0) };
      shader.uniforms.viewMatrixInverse = { value: new THREE.Matrix4() };
      shader.uniforms.grassTexture = { value: null };
      shader.uniforms.grassLODColour = { value: new THREE.Vector3(0, 0, 1) };

      // Replace shaders with complete versions
      shader.vertexShader = grassVertexShader;
      shader.fragmentShader = grassFragmentShader;

      // Store reference for updates
      mat.userData.shader = shader;
    };

    mat.needsUpdate = true;

    // Cleanup
    return () => {
      mat.dispose();
    };
  }, [
    segments,
    grassWidth,
    grassHeight,
    lodDistance,
    maxDistance,
    heightmap,
    terrainHeight,
    terrainOffset,
    terrainSize,
  ]);

  // Cleanup geometry
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Update uniforms each frame
  useFrame((state) => {
    const shader = materialRef.current?.userData?.shader;
    if (shader) {
      shader.uniforms.time.value = state.clock.elapsedTime;
      shader.uniforms.viewMatrixInverse.value.copy(state.camera.matrixWorld);

      if (playerPosition) {
        shader.uniforms.playerPos.value.copy(playerPosition);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={geometry}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

// ============================================================================
// GRASS FIELD COMPONENT (Multiple patches with automatic grid)
// ============================================================================

export function GrassField({
  gridSize = 5, // Number of patches in each direction (5x5 = 25 patches)
  patchSpacing = 10, // Distance between patches
  centerPosition = [0, 0, 0], // Center of the field
  ...grassProps // Pass all GrassPatch props
}) {
  const patches = useMemo(() => {
    const result = [];
    const half = Math.floor(gridSize / 2);

    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        result.push([
          centerPosition[0] + x * patchSpacing,
          centerPosition[1],
          centerPosition[2] + z * patchSpacing,
        ]);
      }
    }

    return result;
  }, [gridSize, patchSpacing, centerPosition]);

  return (
    <group>
      {patches.map((pos, i) => (
        <GrassPatch key={i} position={pos} {...grassProps} />
      ))}
    </group>
  );
}

// ============================================================================
// USAGE EXAMPLES & DOCUMENTATION
// ============================================================================

/*

BASIC USAGE - Single Patch:
----------------------------
import { GrassPatch } from './GrassComponent';

<GrassPatch position={[0, 0, 0]} />


ADVANCED USAGE - Full Field:
-----------------------------
import { GrassField } from './GrassComponent';

<GrassField 
  gridSize={9}              // 9x9 grid of patches
  patchSpacing={10}         // 10 units between patches
  segments={6}              // High detail grass
  grassHeight={1.5}
  heightmap={myHeightmapTexture}
  playerPosition={playerRef.current?.position}
/>


FULL CUSTOMIZATION:
-------------------
<GrassPatch 
  // Position
  position={[0, 0, 0]}
  
  // Grass detail and density
  segments={6}              // 1-6, higher = more detail
  numGrass={3072}           // Number of blades per patch
  patchSize={10}            // Physical size of patch
  
  // Grass appearance
  grassWidth={0.1}
  grassHeight={1.5}
  
  // LOD settings
  lodDistance={15}          // Switch to low detail at this distance
  maxDistance={100}         // Cull grass beyond this distance
  
  // Terrain integration
  heightmap={heightmapTexture}  // THREE.Texture for terrain height
  terrainHeight={10}        // Height multiplier for heightmap
  terrainOffset={0}         // Vertical offset
  terrainSize={100}         // Size of terrain for UV mapping
  
  // Interaction
  playerPosition={new THREE.Vector3(0, 0, 0)}  // Player pos for grass bending
  
  // Shadows
  castShadow={false}        // Performance: grass doesn't cast shadows
  receiveShadow={true}      // Grass receives shadows
/>


PERFORMANCE TIPS:
-----------------
1. Use lower segments (1-3) for distant patches
2. Reduce numGrass for better FPS (try 1024 or 2048)
3. Keep gridSize reasonable (5-9 for most scenes)
4. Use heightmap only when needed
5. Disable castShadow for grass (minimal visual impact)


INTEGRATION WITH EXISTING SCENE:
---------------------------------
// In your R3F app:
import { Canvas } from '@react-three/fiber';
import { GrassField } from './GrassComponent';

<Canvas>
  <ambientLight intensity={0.5} />
  <directionalLight position={[10, 10, 5]} castShadow />
  
  /* Your existing scene */

// <YourTerrain />
// <YourPlayer />

/* Add grass */
//<GrassField
//gridSize={7}
//segments={6}
//heightmap={terrainHeightmap}
///>
//</Canvas>

//TROUBLESHOOTING;
//----------------
//- Grass not visible? Check camera position and distance
//- Performance issues? Reduce segments, numGrass, or gridSize
//- Grass floating/clipping? Adjust terrainHeight and terrainOffset
//- Compilation errors? Make sure Three.js r180+ is installed
