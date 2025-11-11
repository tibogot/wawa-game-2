// GrassComponent.jsx
// Complete grass rendering component for React Three Fiber + Three.js r180
// Drop this into any existing R3F scene

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// SHADERS - Your full GLSL code
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

uniform vec2 grassSize;
uniform vec4 grassParams;
uniform vec4 grassDraw;
uniform float time;
uniform sampler2D heightmap;
uniform vec4 heightParams;
uniform vec3 playerPos;
uniform mat4 viewMatrixInverse;

attribute float vertIndex;

// ============================================================================
// UTILITY FUNCTIONS (from your common.glsl/noise.glsl)
// ============================================================================

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

// ============================================================================
// MAIN VERTEX SHADER
// ============================================================================

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

  // Terrain type checks
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

  // Wind animation
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

  // View-space thickening trick
  mvPosition.x += viewSpaceThickenFactor * (xSide - 0.5) * grassTotalWidth * 0.5 * zSide;

  gl_Position = projectionMatrix * mvPosition;

  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = -mvPosition.xyz;
  #include <worldpos_vertex>
  #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

  vWorldPosition = worldPosition.xyz;
}
`;

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
varying vec3 vWorldPosition;

void main() {
  #include <clipping_planes_fragment>
  
  vec4 diffuseColor = vec4(vGrassColour, 1.0);
  
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
  #include <emissivemap_fragment>
  
  #include <lights_phong_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>
  
  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
  
  #include <envmap_fragment>
  #include <opaque_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
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

    // Back face (mirrored)
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

  // Vertex index attribute for procedural generation
  const vertID = new Uint16Array(VERTICES * 2); // Using Uint16 for safety
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
// GRASS COMPONENT
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
  playerPosition = null, // Optional player position for interaction
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
      }),
    []
  );

  // Setup shader once
  useEffect(() => {
    if (!materialRef.current) return;

    const mat = materialRef.current;

    mat.onBeforeCompile = (shader) => {
      const GRASS_VERTICES = (segments + 1) * 2;

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
      shader.uniforms.heightParams = { value: new THREE.Vector4(100, 0, 0, 0) };
      shader.uniforms.playerPos = { value: new THREE.Vector3(0, 0, 0) };
      shader.uniforms.viewMatrixInverse = { value: new THREE.Matrix4() };

      // Replace shaders
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
      castShadow={false}
      receiveShadow={true}
    >
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

// ============================================================================
// GRASS MANAGER (Optional - for multiple patches with LOD)
// ============================================================================

export function GrassField({
  gridSize = 5, // Number of patches in each direction
  patchSpacing = 10, // Distance between patches
  ...grassProps // Pass all GrassPatch props
}) {
  const patches = useMemo(() => {
    const result = [];
    const half = Math.floor(gridSize / 2);

    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        result.push([x * patchSpacing, 0, z * patchSpacing]);
      }
    }

    return result;
  }, [gridSize, patchSpacing]);

  return (
    <group>
      {patches.map((pos, i) => (
        <GrassPatch key={i} position={pos} {...grassProps} />
      ))}
    </group>
  );
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// Simple usage - single patch:
<GrassPatch position={[0, 0, 0]} />

// Advanced usage - full field:
<GrassField 
  gridSize={9}
  patchSpacing={10}
  segments={6}
  grassHeight={1.5}
  heightmap={myHeightmapTexture}
  playerPosition={playerPos}
/>

// With custom settings:
<GrassPatch 
  position={[0, 0, 0]}
  segments={6}
  numGrass={3072}
  patchSize={10}
  grassWidth={0.1}
  grassHeight={1.5}
  lodDistance={15}
  maxDistance={100}
  heightmap={heightmapTexture}
  terrainHeight={10}
  terrainOffset={0}
  playerPosition={new THREE.Vector3(0, 0, 0)}
/>

*/
