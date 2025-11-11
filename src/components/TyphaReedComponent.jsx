// TyphaReedComponent.jsx
// Production-ready typha reed (cattail) component for React Three Fiber + Three.js r180
// Based on the original grass component but modified for typha reeds
// Each instance has: 3 thin blades + 1 tall stem with capsule head

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// COMPLETE TYPHA REED VERTEX SHADER
// ============================================================================

const typhaVertexShader = `
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
varying vec3 vTyphaColour;
varying vec4 vTyphaParams;
varying vec3 vNormal2;
varying vec3 vWorldPosition;
varying float vFogDepth;

uniform vec2 typhaSize;
uniform vec4 typhaParams;
uniform vec4 typhaDraw;
uniform float time;
uniform sampler2D heightmap;
uniform vec4 heightParams;
uniform vec3 playerPos;
uniform mat4 viewMatrixInverse;

attribute float vertIndex;
attribute float partID; // 0-2 = blades, 3 = stem, 4 = capsule
attribute float capsuleAngle;
attribute float capsuleHeight;

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

  vec3 typhaOffset = vec3(position.x, 0.0, position.y);

  // Reed world position
  vec3 typhaWorldPos = (modelMatrix * vec4(typhaOffset, 1.0)).xyz;
  vec2 heightmapUV = vec2(
    remap(typhaWorldPos.x, -heightParams.x * 0.5, heightParams.x * 0.5, 0.0, 1.0),
    remap(typhaWorldPos.z, -heightParams.x * 0.5, heightParams.x * 0.5, 1.0, 0.0)
  );
  vec4 heightmapSample = texture2D(heightmap, heightmapUV);
  typhaWorldPos.y += heightmapSample.x * typhaParams.z - typhaParams.w;

  float heightmapSampleHeight = 1.0;

  vec4 hashVal1 = hash42(vec2(typhaWorldPos.x, typhaWorldPos.z));

  float highLODOut = smoothstep(typhaDraw.x * 0.5, typhaDraw.x, distance(cameraPosition, typhaWorldPos));
  float lodFadeIn = smoothstep(typhaDraw.x, typhaDraw.y, distance(cameraPosition, typhaWorldPos));

  // Check terrain type - typha likes wet areas
  float isSandy = linearstep(-11.0, -14.0, typhaWorldPos.y);
  float typhaAllowedHash = hashVal1.w - isSandy;
  float isTyphaAllowed = step(0.0, typhaAllowedHash);

  float randomAngle = hashVal1.x * 2.0 * 3.14159;
  float randomShade = remap(hashVal1.y, -1.0, 1.0, 0.5, 1.0);
  float randomHeight = remap(hashVal1.z, 0.0, 1.0, 0.85, 1.25) * mix(1.0, 0.0, lodFadeIn) * isTyphaAllowed * heightmapSampleHeight;
  float randomWidth = (1.0 - isSandy) * heightmapSampleHeight;
  float randomLean = remap(hashVal1.w, 0.0, 1.0, 0.02, 0.08); // Much less lean for typha

  vec2 hashTyphaColour = hash22(vec2(typhaWorldPos.x, typhaWorldPos.z));
  float leanAnimation = noise12(vec2(time * 0.25) + typhaWorldPos.xz * 137.423) * 0.05; // Less movement

  float TYPHA_SEGMENTS = typhaParams.x;
  float TYPHA_VERTICES = typhaParams.y;

  // Determine which part we're rendering: blade (0-2), stem (3), or capsule (4)
  float part = partID;
  bool isBlade = part < 3.0;
  bool isStem = part == 3.0;
  bool isCapsule = part == 4.0;

  // Figure out vertex id
  float vertID = mod(float(vertIndex), TYPHA_VERTICES);
  float zSide = -(floor(float(vertIndex) / TYPHA_VERTICES) * 2.0 - 1.0);
  float xSide = mod(vertID, 2.0);
  float heightPercent = (vertID - xSide) / (TYPHA_SEGMENTS * 2.0);
  float capsuleHeightPercent = capsuleHeight;
  if (isCapsule) {
    heightPercent = capsuleHeightPercent;
  }

  // Different heights for different parts
  float totalHeight;
  float totalWidth;
  float curveAmount;
  
  if (isBlade) {
    // Blades are shorter, thinner, more curved like grass
    totalHeight = typhaSize.y * 0.7 * randomHeight; // Slightly taller within the patch
    float grassTotalWidthHigh = easeOut(1.0 - heightPercent, 2.0);
    float grassTotalWidthLow = 1.0 - heightPercent;
    totalWidth = typhaSize.x * 0.75 * mix(grassTotalWidthHigh, grassTotalWidthLow, highLODOut) * randomWidth;
    
    float easedHeight = mix(easeIn(heightPercent, 2.0), 1.0, highLODOut);
    curveAmount = -(randomLean * 2.0) * easedHeight; // More curve for blades
  } else if (isStem) {
    // Stem is tall, straight, cylindrical
    totalHeight = typhaSize.y * randomHeight;
    totalWidth = typhaSize.x * 0.4 * randomWidth; // Thinner than blades
    
    float easedHeight = mix(easeIn(heightPercent, 1.2), 1.0, highLODOut);
    curveAmount = -randomLean * 0.5 * easedHeight; // Very straight
  } else { // isCapsule
    totalHeight = typhaSize.y * randomHeight;
    totalWidth = typhaSize.x * 0.7 * randomWidth;
    curveAmount = -randomLean * 0.2;
  }

  // Shift verts
  float x = (xSide - 0.5) * totalWidth;
  float y = heightPercent * totalHeight;
  float z = 0.0;

  // Wind - less effect on typha stem and capsule
  float windDir = noise12(typhaWorldPos.xz * 0.05 + 0.05 * time);
  float windNoiseSample = noise12(typhaWorldPos.xz * 0.25 + time * 0.8);
  float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.15, 0.8);
  
  if (isBlade) {
    windLeanAngle = easeIn(windLeanAngle, 2.0) * 0.8; // Blades move more
  } else if (isStem) {
    windLeanAngle = easeIn(windLeanAngle, 3.0) * 0.3; // Stem is stiffer
  } else { // Capsule
    windLeanAngle = easeIn(windLeanAngle, 3.0) * 0.25; // Capsule barely moves
  }
  
  vec3 windAxis = vec3(cos(windDir), 0.0, sin(windDir));
  windLeanAngle *= heightPercent;

  // Player interaction - less effect on typha
  float distToPlayer = distance(typhaWorldPos.xz, playerPos.xz);
  float playerFalloff = smoothstep(2.5, 1.0, distToPlayer);
  float playerLeanAngle = mix(0.0, 0.1, playerFalloff * linearstep(0.5, 0.0, windLeanAngle));
  vec3 typhaToPlayer = normalize(vec3(playerPos.x, 0.0, playerPos.z) - vec3(typhaWorldPos.x, 0.0, typhaWorldPos.z));
  vec3 playerLeanAxis = vec3(typhaToPlayer.z, 0, -typhaToPlayer.x);

  randomLean += leanAnimation;

  // Normal calculations
  float ncurve1 = curveAmount;
  vec3 n1 = vec3(0.0, (heightPercent + 0.01), 0.0);
  n1 = rotateX(ncurve1) * n1;

  float ncurve2 = curveAmount * 0.9;
  vec3 n2 = vec3(0.0, (heightPercent + 0.01) * 0.9, 0.0);
  n2 = rotateX(ncurve2) * n2;

  vec3 ncurve = normalize(n1 - n2);

  // Position blades around the stem
  float bladeAngleOffset = 0.0;
  if (isBlade) {
    bladeAngleOffset = part * 2.094395; // 120 degrees apart (2π/3)
  }

  mat3 typhaBaseMat =
    rotateAxis(playerLeanAxis, playerLeanAngle) *
    rotateAxis(windAxis, windLeanAngle) *
    rotateY(randomAngle);

  vec3 typhaVertexPosition;
  vec3 typhaFaceNormal = vec3(0.0, 0.0, 1.0);

  if (isCapsule) {
    float capsuleLength = totalHeight * 0.22;
    float theta = (1.0 - clamp(capsuleHeightPercent, 0.0, 1.0)) * 3.14159265;
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);
    float radialAngle = capsuleAngle;

    mat3 capsuleMat = typhaBaseMat * rotateX(curveAmount);

    vec3 upDir = normalize(capsuleMat * vec3(0.0, 1.0, 0.0));
    vec3 rightDir = normalize(capsuleMat * vec3(1.0, 0.0, 0.0));
    vec3 forwardDir = normalize(capsuleMat * vec3(0.0, 0.0, 1.0));
    vec3 radialDir = normalize(rightDir * cos(radialAngle) + forwardDir * sin(radialAngle));

    float capsuleRadius = max(totalWidth * 0.55, capsuleLength * 0.45);
    float radialRadius = capsuleRadius * sinTheta;
    float radiusY = capsuleLength * 0.5;

    vec3 stemTipLocal = rotateX(curveAmount) * vec3(0.0, totalHeight, 0.0);
    vec3 stemTipWorld = typhaBaseMat * stemTipLocal + typhaOffset;
    vec3 capsuleCenter = stemTipWorld + upDir * radiusY;

    typhaVertexPosition = capsuleCenter + radialDir * radialRadius + upDir * (radiusY * cosTheta);
    typhaFaceNormal = normalize(radialDir * sinTheta + upDir * cosTheta);
  } else {
    // Offset blades slightly from center and add curvature
    vec3 localPosition = vec3(x, y, z);
    mat3 bladeNormalMat = typhaBaseMat;
    vec3 localNormal = vec3(0.0, 0.0, 1.0);
    vec3 bladeOffsetWorld = vec3(0.0);

    if (isBlade) {
      float bladeSag = sin(heightPercent * 3.14159) * totalWidth * 0.35;
      float bladeThickness = totalWidth * 0.18;
      localPosition.z += bladeSag;
      localPosition.x += (xSide - 0.5) * bladeThickness;

      float bladeTwist = (part - 1.0) * 0.35 * heightPercent;
      mat3 twistMat = rotateY(bladeTwist);
      mat3 bendMat = rotateX(curveAmount);
      mat3 spreadMat = rotateY(bladeAngleOffset);

      localPosition = twistMat * localPosition;
      localPosition = bendMat * localPosition;
      localPosition = spreadMat * localPosition;

      bladeNormalMat = typhaBaseMat * spreadMat * bendMat * twistMat;
      localNormal = normalize(vec3(-(xSide - 0.5) * 0.4, 0.65, -1.0));

       vec3 offsetLocal = vec3(totalWidth * 0.28, 0.0, 0.0);
       bladeOffsetWorld = typhaBaseMat * (spreadMat * bendMat * twistMat * offsetLocal);
    } else {
      localPosition = rotateX(curveAmount) * localPosition;
    }

    typhaVertexPosition = typhaBaseMat * localPosition + typhaOffset + bladeOffsetWorld;
    typhaFaceNormal = normalize(bladeNormalMat * localNormal);
  }

  if (!isCapsule) {
    typhaFaceNormal *= zSide;
  }

  vec3 typhaVertexNormal = vec3(0.0, -ncurve.z, ncurve.y);
  vec3 typhaVertexNormal1 = rotateY(3.14159 * 0.3 * zSide) * typhaVertexNormal;
  vec3 typhaVertexNormal2 = rotateY(3.14159 * -0.3 * zSide) * typhaVertexNormal;

  typhaVertexNormal1 = typhaBaseMat * typhaVertexNormal1;
  if (!isCapsule) {
    typhaVertexNormal1 *= zSide;
  }

  typhaVertexNormal2 = typhaBaseMat * typhaVertexNormal2;
  if (!isCapsule) {
    typhaVertexNormal2 *= zSide;
  }

  if (isCapsule) {
    typhaVertexNormal1 = typhaFaceNormal;
    typhaVertexNormal2 = typhaFaceNormal;
  } else if (isBlade) {
    typhaVertexNormal1 = typhaFaceNormal;
    typhaVertexNormal2 = typhaFaceNormal;
  }

  // Color variation
  vec3 bladeBase = vec3(0.02, 0.075, 0.01);
  vec3 bladeTip = vec3(0.45, 0.6, 0.2);
  vec3 stemBase = vec3(0.05, 0.15, 0.05);
  vec3 stemTop = vec3(0.25, 0.45, 0.15);
  vec3 capsuleColor = vec3(0.95, 0.45, 0.75); // Pink capsule

  vec3 baseColor;
  if (isBlade) {
    baseColor = mix(bladeBase, bladeTip, easeIn(heightPercent, 3.0)) * randomShade;
  } else if (isStem) {
    baseColor = mix(stemBase, stemTop, heightPercent) * randomShade;
  } else { // Capsule
    baseColor = capsuleColor * randomShade;
  }

  vTyphaColour = baseColor;
  vTyphaParams = vec4(heightPercent, typhaWorldPos.y, highLODOut, part);
  
  const float SKY_RATIO = 0.25;
  vec3 UP = vec3(0.0, 1.0, 0.0);
  float skyFadeIn = (1.0 - highLODOut) * SKY_RATIO;
  vec3 normal1 = normalize(mix(UP, typhaVertexNormal1, skyFadeIn));
  vec3 normal2 = normalize(mix(UP, typhaVertexNormal2, skyFadeIn));

  transformed = typhaVertexPosition;
  transformed.y += typhaWorldPos.y;

  vec3 cameraWorldLeft = (viewMatrixInverse * vec4(-1.0, 0.0, 0.0, 0.0)).xyz;
  vec3 viewDir = normalize(cameraPosition - typhaWorldPos);
  vec3 viewDirXZ = normalize(vec3(viewDir.x, 0.0, viewDir.z));
  vec3 typhaFaceNormalXZ = normalize(vec3(typhaFaceNormal.x, 0.0, typhaFaceNormal.z));

  float viewDotNormal = clamp(dot(typhaFaceNormal, viewDirXZ), 0.0, 1.0);
  float viewSpaceThickenFactor = easeOut(1.0 - viewDotNormal, 4.0) * smoothstep(0.0, 0.2, viewDotNormal);
  if (isCapsule) {
    viewSpaceThickenFactor = 0.0;
  }

  objectNormal = typhaVertexNormal1;

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

  // View-space thickening (less for stem and capsule)
  float thickenAmount = isBlade ? 1.0 : 0.5;
  mvPosition.x += viewSpaceThickenFactor * (xSide - 0.5) * totalWidth * 0.5 * zSide * thickenAmount;

  gl_Position = projectionMatrix * mvPosition;

  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = -mvPosition.xyz;
  
  vFogDepth = length(vViewPosition);
  
  #include <worldpos_vertex>
  #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

  vWorldPosition = worldPosition.xyz;
}
`;

// ============================================================================
// COMPLETE TYPHA REED FRAGMENT SHADER
// ============================================================================

const typhaFragmentShader = `
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

varying vec3 vTyphaColour;
varying vec4 vTyphaParams;
varying vec3 vNormal2;
varying vec3 vWorldPosition;
varying float vFogDepth;

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
  vec3 lms = c * c * c;
  return kLMStoCONE * lms;
}

float linearstep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float easeIn(float t, float p) {
  return pow(t, p);
}

void main() {
  #include <clipping_planes_fragment>
  
  vec4 diffuseColor = vec4(vTyphaColour, 1.0);
  
  float heightPercent = vTyphaParams.x;
  float height = vTyphaParams.y;
  float lodFadeIn = vTyphaParams.z;
  float partID = vTyphaParams.w;
  
  bool isBlade = partID < 3.0;
  bool isStem = partID == 3.0;
  bool isCapsule = partID == 4.0;
  
  float isSandy = clamp(linearstep(-11.0, -14.0, height), 0.0, 1.0);
  float density = 1.0 - isSandy;
  
  // AO varies by part
  float aoForDensity = mix(1.0, 0.3, density);
  float ao;
  if (isBlade) {
    ao = mix(aoForDensity, 1.0, pow(heightPercent, 2.0));
  } else if (isStem) {
    ao = mix(aoForDensity * 0.8, 1.0, heightPercent); // Darker stem base
  } else { // Capsule
    ao = 0.7; // Slightly darker capsule overall
  }
  
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
  
  vec3 baseNormal = normalize(normal);
  vec3 normal2 = normalize(vNormal2);
  
  // Mix normals differently for different parts
  if (isCapsule) {
    normal = baseNormal; // Capsule uses simpler normal
  } else {
    normal = normalize(mix(baseNormal, normal2, 0.5));
  }
  
  #include <emissivemap_fragment>
  
  #include <lights_phong_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>
  
  // Custom lighting
  vec3 viewDir = normalize(-vViewPosition);
  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
  
  float backScatter = max(dot(-lightDir, normal), 0.0);
  float frontScatter = max(dot(lightDir, normal), 0.0);
  float rim = 1.0 - max(dot(normal, viewDir), 0.0);
  rim = pow(rim, 1.5);
  
  // Different subsurface scattering for different parts
  float thickness;
  if (isBlade) {
    thickness = (1.0 - heightPercent) * 0.8 + 0.2;
  } else if (isStem) {
    thickness = 0.6; // Thicker, less translucent
  } else { // Capsule
    thickness = 0.3; // Dense capsule
  }
  
  float sssBack = pow(backScatter, 2.0) * thickness;
  float sssFront = pow(frontScatter, 1.5) * thickness * 0.3;
  float rimSSS = pow(rim, 2.0) * thickness * 0.5;
  
  float totalSSS = clamp(sssBack + sssFront + rimSSS, 0.0, 1.0);
  
  vec3 backscatterColor;
  if (isCapsule) {
    backscatterColor = vec3(0.6, 0.4, 0.2) * 0.3; // Warmer for brown capsule
  } else {
    backscatterColor = vec3(0.8, 1.0, 0.7) * 0.4;
  }
  
  vec3 backscatterContribution = backscatterColor * totalSSS * 0.5;
  reflectedLight.directDiffuse += backscatterContribution;
  
  // Less specular on capsule
  if (!isCapsule) {
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specularColor = vec3(1.0, 1.0, 0.95);
    reflectedLight.directSpecular += specularColor * spec * 0.3;
  }
  
  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + totalEmissiveRadiance;
  
  #include <envmap_fragment>
  
  // Custom fog
  float fogDepth = vFogDepth;
  float fogNear = 5.0;
  float fogFar = 50.0;
  float fogFactor = clamp((fogDepth - fogNear) / (fogFar - fogNear), 0.0, 1.0);
  
  vec3 fogSkyColorRGB = vec3(0.39, 0.57, 0.86) * 0.8;
  vec3 outgoingLightOklab = rgbToOklab(outgoingLight);
  vec3 fogSkyColorOklab = rgbToOklab(fogSkyColorRGB);
  vec3 foggedOklab = mix(outgoingLightOklab, fogSkyColorOklab, fogFactor);
  outgoingLight = oklabToRGB(foggedOklab);
  
  #include <opaque_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}
`;

// ============================================================================
// GEOMETRY CREATION - Now creates 3 blades + 1 stem + 1 capsule per instance
// ============================================================================

function createTyphaGeometry(segments, numTypha, patchSize) {
  const VERTICES = (segments + 1) * 2;

  // 5 parts per typha: 3 blades + 1 stem + 1 capsule
  const PARTS_PER_TYPHA = 5;
  const CAPSULE_RADIAL_SLICES = 10;
  const CAPSULE_HEIGHT_SEGMENTS = Math.max(segments, 4);

  const indices = [];
  const partIDs = [];
  const vertIDs = [];
  const capsuleAngles = [];
  const capsuleHeights = [];

  let vertexOffset = 0;

  for (let part = 0; part < PARTS_PER_TYPHA; part++) {
    if (part === 4) {
      const radialCount = CAPSULE_RADIAL_SLICES;
      const heightCount = CAPSULE_HEIGHT_SEGMENTS;
      const vertsPerRing = heightCount + 1;

      for (let r = 0; r <= radialCount; r++) {
        const angle = (r / radialCount) * Math.PI * 2.0;
        for (let h = 0; h <= heightCount; h++) {
          const height = h / heightCount;
          partIDs.push(part);
          capsuleAngles.push(angle);
          capsuleHeights.push(height);
          vertIDs.push((h * 2) % (VERTICES * 2));
        }
      }

      for (let r = 0; r < radialCount; r++) {
        for (let h = 0; h < heightCount; h++) {
          const a = vertexOffset + r * vertsPerRing + h;
          const b = vertexOffset + (r + 1) * vertsPerRing + h;
          const c = a + 1;
          const d = b + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }

      vertexOffset += (radialCount + 1) * (heightCount + 1);
    } else {
      const partVertexOffset = vertexOffset;
      const vertexCount = VERTICES * 2;

      for (let i = 0; i < vertexCount; i++) {
        partIDs.push(part);
        capsuleAngles.push(0);
        capsuleHeights.push(0);
        vertIDs.push(i % (VERTICES * 2));
      }

      for (let i = 0; i < segments; i++) {
        const vi = partVertexOffset + i * 2;
        indices.push(vi + 0, vi + 1, vi + 2);
        indices.push(vi + 2, vi + 1, vi + 3);

        const fi = partVertexOffset + VERTICES + i * 2;
        indices.push(fi + 2, fi + 1, fi + 0);
        indices.push(fi + 3, fi + 1, fi + 2);
      }

      vertexOffset += vertexCount;
    }
  }

  const offsets = [];
  for (let i = 0; i < numTypha; i++) {
    offsets.push(
      (Math.random() - 0.5) * patchSize,
      (Math.random() - 0.5) * patchSize,
      0
    );
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.instanceCount = numTypha;
  geo.setAttribute(
    "vertIndex",
    new THREE.Uint16BufferAttribute(new Uint16Array(vertIDs), 1)
  );
  geo.setAttribute(
    "partID",
    new THREE.Float32BufferAttribute(new Float32Array(partIDs), 1)
  );
  geo.setAttribute(
    "capsuleAngle",
    new THREE.Float32BufferAttribute(new Float32Array(capsuleAngles), 1)
  );
  geo.setAttribute(
    "capsuleHeight",
    new THREE.Float32BufferAttribute(new Float32Array(capsuleHeights), 1)
  );
  geo.setAttribute(
    "position",
    new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
  );
  geo.setIndex(indices);
  geo.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, 0, 0),
    1 + patchSize * 2
  );

  return geo;
}

// ============================================================================
// TYPHA REED PATCH COMPONENT
// ============================================================================

export function TyphaReedPatch({
  position = [0, 0, 0],
  segments = 6,
  numReeds = 1024, // Fewer than grass since each has 5 parts
  patchSize = 10,
  reedWidth = 0.1,
  reedHeight = 1.2, // Slightly taller than the component's grass blades
  lodDistance = 20,
  maxDistance = 120,
  heightmap = null,
  terrainHeight = 10,
  terrainOffset = 0,
  terrainSize = 100,
  playerPosition = null,
  castShadow = false,
  receiveShadow = true,
}) {
  const materialRef = useRef();
  const meshRef = useRef();

  const geometry = useMemo(
    () => createTyphaGeometry(segments, numReeds, patchSize),
    [segments, numReeds, patchSize]
  );

  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        side: THREE.FrontSide,
        alphaTest: 0.5,
        transparent: false,
        fog: false,
      }),
    []
  );

  useEffect(() => {
    if (!materialRef.current) return;

    const mat = materialRef.current;
    const TYPHA_VERTICES = (segments + 1) * 2;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.typhaSize = {
        value: new THREE.Vector2(reedWidth, reedHeight),
      };
      shader.uniforms.typhaParams = {
        value: new THREE.Vector4(
          segments,
          TYPHA_VERTICES,
          terrainHeight,
          terrainOffset
        ),
      };
      shader.uniforms.typhaDraw = {
        value: new THREE.Vector4(lodDistance, maxDistance, 0, 0),
      };
      shader.uniforms.heightmap = { value: heightmap };
      shader.uniforms.heightParams = {
        value: new THREE.Vector4(terrainSize, 0, 0, 0),
      };
      shader.uniforms.playerPos = { value: new THREE.Vector3(0, 0, 0) };
      shader.uniforms.viewMatrixInverse = { value: new THREE.Matrix4() };

      shader.vertexShader = typhaVertexShader;
      shader.fragmentShader = typhaFragmentShader;

      mat.userData.shader = shader;
    };

    mat.needsUpdate = true;

    return () => {
      mat.dispose();
    };
  }, [
    segments,
    reedWidth,
    reedHeight,
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
// TYPHA REED FIELD COMPONENT
// ============================================================================

export function TyphaReedField({
  gridSize = 5,
  patchSpacing = 10,
  centerPosition = [0, 0, 0],
  ...typhaProps
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
        <TyphaReedPatch key={i} position={pos} {...typhaProps} />
      ))}
    </group>
  );
}

// ============================================================================
// DEMO SCENE
// ============================================================================

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function TyphaReedDemo() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [10, 5, 10], fov: 60 }} shadows>
        <color attach="background" args={["#87ceeb"]} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        {/* Ground plane */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.5, 0]}
          receiveShadow
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#2d5016" />
        </mesh>

        {/* Typha Reed Field */}
        <TyphaReedField
          gridSize={3}
          patchSpacing={8}
          segments={6}
          numReeds={512}
          reedHeight={1.2}
          reedWidth={0.1}
        />

        <OrbitControls />
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "white",
          background: "rgba(0,0,0,0.7)",
          padding: "15px",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "14px",
          maxWidth: "350px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0" }}>🌾 Typha Reed Component</h3>
        <p style={{ margin: "5px 0", fontSize: "12px" }}>
          Each instance has:
          <br />
          • 3 thin grass-like blades
          <br />
          • 1 tall cylindrical stem
          <br />• 1 brown capsule "cattail" head
        </p>
        <p style={{ margin: "5px 0", fontSize: "12px" }}>
          Typha reeds are straighter and stiffer than grass, with less wind
          movement and a heavier appearance.
        </p>
      </div>
    </div>
  );
}
