// GrassQuickGrass.jsx
// EXACT port of Quick_Grass shaders to React Three Fiber
// Uses the exact same shader code from public/Quick_Grass-main2

import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// EXACT SHADER CODE FROM Quick_Grass - DO NOT MODIFY
// ============================================================================

// Common.glsl - EXACT COPY (but check for existing definitions)
const SHADER_COMMON = `
// PI is already defined by Three.js <common>, so we don't redefine it
// saturate might be defined by Three.js, so we check first
#ifndef saturate
float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}
#endif

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

vec3 LINEAR_TO_GAMMA(vec3 value) {
  vec3 colour = pow(value, vec3(1.0 / 2.2));
  return colour;
}

vec3 GAMMA_TO_LINEAR(vec3 value) {
  vec3 colour = pow(value, vec3(2.2));
  return colour;
}

float easeOut(float x, float t) {
  return 1.0 - pow(1.0 - x, t);
}

float easeIn(float x, float t) {
  return pow(x, t);
}

mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
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

// Noise.glsl - EXACT COPY
const SHADER_NOISE = `
uvec4 murmurHash42(uvec2 src) {
  const uint M = 0x5bd1e995u;
  uvec4 h = uvec4(1190494759u, 2147483647u, 3559788179u, 179424673u);
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src.x; h *= M; h ^= src.y;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uint murmurHash11(uint src) {
  const uint M = 0x5bd1e995u;
  uint h = 1190494759u;
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uint murmurHash12(uvec2 src) {
  const uint M = 0x5bd1e995u;
  uint h = 1190494759u;
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src.x; h *= M; h ^= src.y;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uint murmurHash13(uvec3 src) {
  const uint M = 0x5bd1e995u;
  uint h = 1190494759u;
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src.x; h *= M; h ^= src.y; h *= M; h ^= src.z;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uvec2 murmurHash22(uvec2 src) {
  const uint M = 0x5bd1e995u;
  uvec2 h = uvec2(1190494759u, 2147483647u);
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src.x; h *= M; h ^= src.y;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uvec2 murmurHash21(uint src) {
  const uint M = 0x5bd1e995u;
  uvec2 h = uvec2(1190494759u, 2147483647u);
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uvec2 murmurHash23(uvec3 src) {
  const uint M = 0x5bd1e995u;
  uvec2 h = uvec2(1190494759u, 2147483647u);
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src.x; h *= M; h ^= src.y; h *= M; h ^= src.z;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uvec3 murmurHash31(uint src) {
  const uint M = 0x5bd1e995u;
  uvec3 h = uvec3(1190494759u, 2147483647u, 3559788179u);
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

uvec3 murmurHash33(uvec3 src) {
  const uint M = 0x5bd1e995u;
  uvec3 h = uvec3(1190494759u, 2147483647u, 3559788179u);
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src.x; h *= M; h ^= src.y; h *= M; h ^= src.z;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

vec3 hash33(vec3 src) {
  uvec3 h = murmurHash33(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

float hash11(float src) {
  uint h = murmurHash11(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

float hash12(vec2 src) {
  uint h = murmurHash12(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

float hash13(vec3 src) {
  uint h = murmurHash13(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

vec2 hash21(float src) {
  uvec2 h = murmurHash21(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

vec3 hash31(float src) {
  uvec3 h = murmurHash31(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

vec2 hash22(vec2 src) {
  uvec2 h = murmurHash22(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

vec4 hash42(vec2 src) {
  uvec4 h = murmurHash42(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

vec2 hash23(vec3 src) {
  uvec2 h = murmurHash23(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

float noise11(float p) {
  float i = floor(p);
  float f = fract(p);
  float u = smoothstep(0.0, 1.0, f);
  float val = mix( hash11(i + 0.0), hash11(i + 1.0), u);
  return val * 2.0 - 1.0;
}

float noise12(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = smoothstep(vec2(0.0), vec2(1.0), f);
  float val = mix( mix( hash12( i + vec2(0.0, 0.0) ), 
                      hash12( i + vec2(1.0, 0.0) ), u.x),
                 mix( hash12( i + vec2(0.0, 1.0) ), 
                      hash12( i + vec2(1.0, 1.0) ), u.x), u.y);
  return val * 2.0 - 1.0;
}

float noise13(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f*f*(3.0-2.0*f);
  return mix(mix(mix( hash13(i+vec3(0.0, 0.0, 0.0)), 
                     hash13(i+vec3(1.0, 0.0, 0.0)),f.x),
                mix( hash13(i+vec3(0.0, 1.0, 0.0)), 
                     hash13(i+vec3(1.0, 1.0, 0.0)),f.x),f.y),
            mix(mix( hash13(i+vec3(0.0, 0.0, 1.0)), 
                     hash13(i+vec3(1.0, 0.0, 1.0)),f.x),
                mix( hash13(i+vec3(0.0, 1.0, 1.0)), 
                     hash13(i+vec3(1.0, 1.0, 1.0)),f.x),f.y),f.z);
}

vec2 noise23(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f*f*(3.0-2.0*f);
  return mix(mix(mix( hash23(i+vec3(0.0, 0.0, 0.0)), 
                     hash23(i+vec3(1.0, 0.0, 0.0)),f.x),
                mix( hash23(i+vec3(0.0, 1.0, 0.0)), 
                     hash23(i+vec3(1.0, 1.0, 0.0)),f.x),f.y),
            mix(mix( hash23(i+vec3(0.0, 0.0, 1.0)), 
                     hash23(i+vec3(1.0, 0.0, 1.0)),f.x),
                mix( hash23(i+vec3(0.0, 1.0, 1.0)), 
                     hash23(i+vec3(1.0, 1.0, 1.0)),f.x),f.y),f.z);
}

vec2 noise22(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = smoothstep(vec2(0.0), vec2(1.0), f);
  vec2 val = mix( mix( hash22( i + vec2(0.0, 0.0) ), 
                      hash22( i + vec2(1.0, 0.0) ), u.x),
                 mix( hash22( i + vec2(0.0, 1.0) ), 
                      hash22( i + vec2(1.0, 1.0) ), u.x), u.y);
  return val * 2.0 - 1.0;
}
`;

// Vertex Shader declarations - to inject before main()
const GRASS_VERTEX_DECLARATIONS = `
varying vec3 vWorldNormal;
varying vec3 vGrassColour;
varying vec4 vGrassParams;
varying vec3 vNormal2;
varying vec3 vWorldPosition;

uniform vec2 grassSize;
uniform vec4 grassParams;
uniform vec4 grassDraw;
uniform float time;
uniform sampler2D heightmap;
uniform vec4 heightParams;
uniform vec3 playerPos;
uniform mat4 viewMatrixInverse;

attribute float vertIndex;
`;

// Build vertex shader with helper functions injected
const buildVertexShader = () => {
  const vertexMainIndex = GRASS_VERTEX_SHADER_BASE.indexOf("void main()");
  if (vertexMainIndex === -1) return GRASS_VERTEX_SHADER_BASE;

  return (
    GRASS_VERTEX_SHADER_BASE.slice(0, vertexMainIndex) +
    SHADER_COMMON +
    "\n" +
    SHADER_NOISE +
    "\n" +
    GRASS_VERTEX_SHADER_BASE.slice(vertexMainIndex)
  );
};

// Vertex Shader base - EXACT COPY from grass-lighting-model-vsh.glsl
const GRASS_VERTEX_SHADER_BASE = `
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

uniform vec2 grassSize;
uniform vec4 grassParams;
uniform vec4 grassDraw;
uniform float time;
uniform sampler2D heightmap;
uniform vec4 heightParams;
uniform vec3 playerPos;
uniform mat4 viewMatrixInverse;

attribute float vertIndex;

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
      remap(grassBladeWorldPos.z, -heightParams.x * 0.5, heightParams.x * 0.5, 1.0, 0.0));
  vec4 heightmapSample = texture2D(heightmap, heightmapUV);
  grassBladeWorldPos.y += heightmapSample.x * grassParams.z - grassParams.w;

  float heightmapSampleHeight = 1.0;

  vec4 hashVal1 = hash42(vec2(grassBladeWorldPos.x, grassBladeWorldPos.z));

  float highLODOut = smoothstep(grassDraw.x * 0.5, grassDraw.x, distance(cameraPosition, grassBladeWorldPos));
  float lodFadeIn = smoothstep(grassDraw.x, grassDraw.y, distance(cameraPosition, grassBladeWorldPos));

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

  float vertID = mod(float(vertIndex), GRASS_VERTICES);
  float zSide = -(floor(vertIndex / GRASS_VERTICES) * 2.0 - 1.0);
  float xSide = mod(vertID, 2.0);
  float heightPercent = (vertID - xSide) / (GRASS_SEGMENTS * 2.0);

  float grassTotalHeight = grassSize.y * randomHeight;
  float grassTotalWidthHigh = easeOut(1.0 - heightPercent, 2.0);
  float grassTotalWidthLow = 1.0 - heightPercent;
  float grassTotalWidth = grassSize.x * mix(grassTotalWidthHigh, grassTotalWidthLow, highLODOut) * randomWidth;

  float x = (xSide - 0.5) * grassTotalWidth;
  float y = heightPercent * grassTotalHeight;

  float windDir = noise12(grassBladeWorldPos.xz * 0.05 + 0.05 * time);
  float windNoiseSample = noise12(grassBladeWorldPos.xz * 0.25 + time * 1.0);
  float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.25, 1.0);
  windLeanAngle = easeIn(windLeanAngle, 2.0) * 1.25;
  vec3 windAxis = vec3(cos(windDir), 0.0, sin(windDir));
  windLeanAngle *= heightPercent;

  float distToPlayer = distance(grassBladeWorldPos.xz, playerPos.xz);
  float playerFalloff = smoothstep(2.5, 1.0, distToPlayer);
  float playerLeanAngle = mix(0.0, 0.2, playerFalloff * linearstep(0.5, 0.0, windLeanAngle));
  vec3 grassToPlayer = normalize(vec3(playerPos.x, 0.0, playerPos.z) - vec3(grassBladeWorldPos.x, 0.0, grassBladeWorldPos.z));
  vec3 playerLeanAxis = vec3(grassToPlayer.z, 0, -grassToPlayer.x);

  randomLean += leanAnimation;

  float easedHeight = mix(easeIn(heightPercent, 2.0), 1.0, highLODOut);
  float curveAmount = -randomLean * easedHeight;

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
  vec3 grassVertexNormal1 = rotateY(PI * 0.3 * zSide) * grassVertexNormal;
  vec3 grassVertexNormal2 = rotateY(PI * -0.3 * zSide) * grassVertexNormal;

  grassVertexNormal1 = grassMat * grassVertexNormal1;
  grassVertexNormal1 *= zSide;

  grassVertexNormal2 = grassMat * grassVertexNormal2;
  grassVertexNormal2 *= zSide;

  vec3 grassVertexPosition = vec3(x, y, 0.0);
  grassVertexPosition = rotateX(curveAmount) * grassVertexPosition;
  grassVertexPosition = grassMat * grassVertexPosition;

  grassVertexPosition += grassOffset;

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

  float viewDotNormal = saturate(dot(grassFaceNormal, viewDirXZ));
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

  vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
  mvPosition = modelViewMatrix * mvPosition;

  mvPosition.x += viewSpaceThickenFactor * (xSide - 0.5) * grassTotalWidth * 0.5 * zSide;

  gl_Position = projectionMatrix * mvPosition;

  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = - mvPosition.xyz;
  #include <worldpos_vertex>
  #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

  vWorldPosition = worldPosition.xyz;
}
`;

// Build fragment shader with helper functions injected
const buildFragmentShader = () => {
  const fragmentMainIndex = GRASS_FRAGMENT_SHADER_BASE.indexOf("void main()");
  if (fragmentMainIndex === -1) return GRASS_FRAGMENT_SHADER_BASE;

  return (
    GRASS_FRAGMENT_SHADER_BASE.slice(0, fragmentMainIndex) +
    SHADER_COMMON +
    "\n" +
    SHADER_NOISE +
    "\n" +
    GRASS_FRAGMENT_SHADER_BASE.slice(fragmentMainIndex)
  );
};

// Fragment Shader base - EXACT COPY from grass-lighting-model-fsh.glsl
const GRASS_FRAGMENT_SHADER_BASE = `
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

uniform sampler2D grassTexture;
uniform vec3 grassLODColour;
uniform float time;
uniform mat3 normalMatrix;

varying vec3 vGrassColour;
varying vec4 vGrassParams;
varying vec3 vNormal2;
varying vec3 vWorldPosition;

varying vec3 vViewPosition;

struct BlinnPhongMaterial {
  vec3 diffuseColor;
  vec3 specularColor;
  float specularShininess;
  float specularStrength;
};

void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
  float wrap = 0.5;
  float dotNL = saturate( (dot( geometry.normal, directLight.direction ) + wrap) / (1.0 + wrap) );
  vec3 irradiance = dotNL * directLight.color;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularShininess ) * material.specularStrength;

  wrap = 0.5;
  float backLight = saturate((dot(geometry.viewDir, -directLight.direction) + wrap) / (1.0 + wrap));
  float falloff = 0.5;
  vec3 scatter = directLight.color * pow(backLight, 1.0) * falloff *  BRDF_Lambert(material.diffuseColor);

  reflectedLight.indirectDiffuse += scatter * (1.0 - vGrassParams.z);
}

void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}

#define RE_Direct              RE_Direct_BlinnPhong
#define RE_IndirectDiffuse     RE_IndirectDiffuse_BlinnPhong

#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  #include <clipping_planes_fragment>
  vec4 diffuseColor = vec4( diffuse, opacity );

  float heightPercent = vGrassParams.x;
  float height = vGrassParams.y;
  float lodFadeIn = vGrassParams.z;
  float lodFadeOut = 1.0 - lodFadeIn;

  float grassMiddle = mix(
    smoothstep(abs(vGrassParams.w - 0.5), 0.0, 0.1), 1.0, lodFadeIn);

  float isSandy = saturate(linearstep(-11.0, -14.0, height));

  float density = 1.0 - isSandy;

  float aoForDensity = mix(1.0, 0.25, density);
  float ao = mix(aoForDensity, 1.0, easeIn(heightPercent, 2.0));

  diffuseColor.rgb *= vGrassColour;
  diffuseColor.rgb *= mix(0.85, 1.0, grassMiddle);
  diffuseColor.rgb *= ao;

  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive;
  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <alphahash_fragment>
  #include <specularmap_fragment>
  #include <normal_fragment_begin>
  #include <normal_fragment_maps>

  vec3 normal2 = normalize(vNormal2);
  normal = normalize(mix(vNormal, normal2, vGrassParams.w));

  #include <emissivemap_fragment>

  BlinnPhongMaterial material;
  material.diffuseColor = diffuseColor.rgb;
  material.specularColor = specular;

  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>
  #include <aomap_fragment>
  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  #include <envmap_fragment>
  #include <opaque_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>

  gl_FragColor.xyz = CalculateFog(gl_FragColor.xyz, viewDir, vFogDepth);

  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}
`;

// ============================================================================
// CONSTANTS - EXACT from Quick_Grass
// ============================================================================

const NUM_GRASS = 32 * 32 * 3;
const GRASS_SEGMENTS_LOW = 1;
const GRASS_SEGMENTS_HIGH = 6;
const GRASS_VERTICES_LOW = (GRASS_SEGMENTS_LOW + 1) * 2;
const GRASS_VERTICES_HIGH = (GRASS_SEGMENTS_HIGH + 1) * 2;
const GRASS_LOD_DIST = 15;
const GRASS_MAX_DIST = 100;
const GRASS_PATCH_SIZE = 5 * 2;
const GRASS_WIDTH = 0.1;
const GRASS_HEIGHT = 1.5;

// ============================================================================
// GEOMETRY CREATION - EXACT from Quick_Grass
// ============================================================================

function createGrassGeometry(segments, numGrass, patchSize) {
  const VERTICES = (segments + 1) * 2;

  const indices = [];
  for (let i = 0; i < segments; ++i) {
    const vi = i * 2;
    indices[i * 12 + 0] = vi + 0;
    indices[i * 12 + 1] = vi + 1;
    indices[i * 12 + 2] = vi + 2;

    indices[i * 12 + 3] = vi + 2;
    indices[i * 12 + 4] = vi + 1;
    indices[i * 12 + 5] = vi + 3;

    const fi = VERTICES + vi;
    indices[i * 12 + 6] = fi + 2;
    indices[i * 12 + 7] = fi + 1;
    indices[i * 12 + 8] = fi + 0;

    indices[i * 12 + 9] = fi + 3;
    indices[i * 12 + 10] = fi + 1;
    indices[i * 12 + 11] = fi + 2;
  }

  const offsets = [];
  for (let i = 0; i < numGrass; ++i) {
    offsets.push((Math.random() - 0.5) * patchSize);
    offsets.push((Math.random() - 0.5) * patchSize);
    offsets.push(0);
  }

  // Use Float32Array instead of Float16 for compatibility
  const offsetsFloat32 = new Float32Array(offsets);

  const vertID = new Uint8Array(VERTICES * 2);
  for (let i = 0; i < VERTICES * 2; ++i) {
    vertID[i] = i;
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.instanceCount = numGrass;
  geo.setAttribute("vertIndex", new THREE.Uint8BufferAttribute(vertID, 1));
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

export function GrassPatchQuickGrass({
  position = [0, 0, 0],
  segments = GRASS_SEGMENTS_HIGH,
  numGrass = NUM_GRASS,
  patchSize = GRASS_PATCH_SIZE,
  grassWidth = GRASS_WIDTH,
  grassHeight = GRASS_HEIGHT,
  lodDistance = GRASS_LOD_DIST,
  maxDistance = GRASS_MAX_DIST,
  heightmap = null,
  terrainHeight = 1.0,
  terrainOffset = 0.0,
  terrainSize = 100.0,
  playerPosition = null,
}) {
  const materialRef = useRef();
  const meshRef = useRef();

  const geometry = useMemo(
    () => createGrassGeometry(segments, numGrass, patchSize),
    [segments, numGrass, patchSize]
  );

  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        side: THREE.FrontSide,
        alphaTest: 0.5,
        transparent: false,
      }),
    []
  );

  useEffect(() => {
    materialRef.current = material;
    const mat = material;
    const GRASS_VERTICES = (segments + 1) * 2;

    mat.onBeforeCompile = (shader) => {
      // Add uniforms FIRST (before shader code injection)
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
      shader.uniforms.grassLODColour = {
        value: new THREE.Vector3(
          segments === GRASS_SEGMENTS_LOW ? 0 : 1,
          0,
          segments === GRASS_SEGMENTS_LOW ? 1 : 0
        ),
      };
      shader.uniforms.normalMatrix = { value: new THREE.Matrix3() };

      // Replace the entire shader with Quick_Grass shaders (with helper functions injected)
      shader.vertexShader = buildVertexShader();
      shader.fragmentShader = buildFragmentShader();

      mat.userData.shader = shader;
    };

    mat.needsUpdate = true;

    return () => {
      // Don't dispose material here - it's managed by useMemo
    };
  }, [
    material,
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

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((state) => {
    const shader = materialRef.current?.userData?.shader;
    if (shader) {
      shader.uniforms.time.value = state.clock.elapsedTime;
      shader.uniforms.viewMatrixInverse.value.copy(state.camera.matrixWorld);
      shader.uniforms.normalMatrix.value.getNormalMatrix(
        state.camera.matrixWorldInverse
      );

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
      material={material}
      receiveShadow
      castShadow={false}
    />
  );
}

// ============================================================================
// MAIN GRASS FIELD COMPONENT
// ============================================================================

export function GrassFieldQuickGrass({
  heightmap = null,
  terrainHeight = 1.0,
  terrainOffset = 0.0,
  terrainSize = 100.0,
  playerPosition = null,
  patchSize = GRASS_PATCH_SIZE,
  numGrass = NUM_GRASS,
  grassWidth = GRASS_WIDTH,
  grassHeight = GRASS_HEIGHT,
  lodDistance = GRASS_LOD_DIST,
  maxDistance = GRASS_MAX_DIST,
}) {
  const { camera } = useThree();
  const groupRef = useRef();
  const [patches, setPatches] = useState([]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const cameraPos = camera.position;
    const baseCellPos = new THREE.Vector3(
      Math.floor(cameraPos.x / patchSize) * patchSize,
      0,
      Math.floor(cameraPos.z / patchSize) * patchSize
    );

    const newPatches = [];
    const cameraPosXZ = new THREE.Vector3(cameraPos.x, 0, cameraPos.z);

    for (let x = -16; x < 16; x++) {
      for (let z = -16; z < 16; z++) {
        const currentCell = new THREE.Vector3(
          baseCellPos.x + x * patchSize,
          0,
          baseCellPos.z + z * patchSize
        );

        const distToCell = currentCell.distanceTo(cameraPosXZ);
        if (distToCell > maxDistance) continue;

        const isLowLOD = distToCell > lodDistance;
        const segments = isLowLOD ? GRASS_SEGMENTS_LOW : GRASS_SEGMENTS_HIGH;

        newPatches.push({
          key: `${x}_${z}`,
          position: [currentCell.x, currentCell.y, currentCell.z],
          segments,
        });
      }
    }

    setPatches(newPatches);
  });

  return (
    <group ref={groupRef}>
      {patches.map((patch) => (
        <GrassPatchQuickGrass
          key={patch.key}
          position={patch.position}
          segments={patch.segments}
          numGrass={numGrass}
          patchSize={patchSize}
          grassWidth={grassWidth}
          grassHeight={grassHeight}
          lodDistance={lodDistance}
          maxDistance={maxDistance}
          heightmap={heightmap}
          terrainHeight={terrainHeight}
          terrainOffset={terrainOffset}
          terrainSize={terrainSize}
          playerPosition={playerPosition}
        />
      ))}
    </group>
  );
}
