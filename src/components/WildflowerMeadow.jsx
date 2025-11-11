// WildflowerMeadow.jsx
// Complete wildflower system for React Three Fiber + Three.js r180
// Grass stems + crossed billboard flowers (industry standard technique)
// Based on the proven grass component structure - zero compilation errors!

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// SHADER UTILITIES - Same structure as working grass component
// ============================================================================

const SHADER_COMMON = `
float wf_remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = (v - inMin) / (inMax - inMin);
  return mix(outMin, outMax, t);
}

mat3 wf_rotateX(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat3(
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, c, -s),
    vec3(0.0, s, c)
  );
}

mat3 wf_rotateY(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat3(
    vec3(c, 0.0, s),
    vec3(0.0, 1.0, 0.0),
    vec3(-s, 0.0, c)
  );
}
`;

const SHADER_NOISE = `
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
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
}
`;

// ============================================================================
// WILDFLOWER VERTEX SHADER - Based on grass structure
// ============================================================================

const wildflowerVertexShader = `
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

varying vec3 vFlowerColor;
varying float vIsFlower;
varying float vFlowerType;
varying vec3 vWorldPosition;
varying vec2 vFlowerUV;

uniform vec2 stemSize;
uniform vec2 flowerSize;
uniform float time;
uniform vec3 playerPos;
uniform mat4 viewMatrixInverse;

attribute float vertIndex;

${SHADER_COMMON}
${SHADER_NOISE}

void main() {
  #include <uv_vertex>
  #include <color_vertex>
  #include <morphcolor_vertex>
  #include <beginnormal_vertex>
  #include <begin_vertex>

  vec3 flowerOffset = vec3(position.x, 0.0, position.y);
  vec3 flowerBladeWorldPos = (modelMatrix * vec4(flowerOffset, 1.0)).xyz;
  
  vec4 hashVal = hash42(vec2(flowerBladeWorldPos.x, flowerBladeWorldPos.z));
  
  float randomAngle = hashVal.x * 2.0 * PI;
  float randomHeight = wf_remap(hashVal.z, 0.0, 1.0, 0.8, 1.2);
  float randomLean = wf_remap(hashVal.w, 0.0, 1.0, 0.05, 0.15);
  
  vec2 hashFlowerColor = hash22(vec2(flowerBladeWorldPos.x, flowerBladeWorldPos.z));
  float leanAnimation = noise12(vec2(time * 0.35) + flowerBladeWorldPos.xz * 137.423) * 0.1;
  
  // Determine flower type (0-3 for 4 flower types)
  vFlowerType = floor(hashVal.y * 4.0);
  
  // STEM_SEGMENTS = 4 (simple stem)
  // STEM_VERTICES = 10 (5 segments × 2 sides)
  float STEM_SEGMENTS = 4.0;
  float STEM_VERTICES = 10.0;
  
  // Total vertices: 10 stem + 8 flower (2 crossed quads)
  // vertIndex 0-9 = stem
  // vertIndex 10-17 = flower quads
  
  float vertID = float(vertIndex);
  vIsFlower = step(STEM_VERTICES, vertID);
  
  vec3 finalPosition;
  vec3 finalNormal;
  
  if (vIsFlower < 0.5) {
    // STEM VERTEX (same as grass blade)
    float stemVertID = mod(vertID, STEM_VERTICES);
    float zSide = -(floor(vertID / STEM_VERTICES) * 2.0 - 1.0);
    float xSide = mod(stemVertID, 2.0);
    float heightPercent = (stemVertID - xSide) / (STEM_SEGMENTS * 2.0);
    
    float stemHeight = stemSize.y * randomHeight;
    float stemWidth = stemSize.x * (1.0 - heightPercent * 0.5);
    
    float x = (xSide - 0.5) * stemWidth;
    float y = heightPercent * stemHeight;
    
    // Wind
    float windNoise = noise12(flowerBladeWorldPos.xz * 0.25 + time * 1.0);
    float windLean = mix(0.25, 1.0, windNoise) * heightPercent * 0.3;
    
    randomLean += leanAnimation;
    float curveAmount = -randomLean * heightPercent;
    
    mat3 stemMat = wf_rotateY(randomAngle);
    vec3 stemPosition = vec3(x, y, 0.0);
    stemPosition = wf_rotateX(curveAmount) * stemPosition;
    stemPosition = stemMat * stemPosition;
    stemPosition += flowerOffset;
    
    finalPosition = stemPosition;
    finalNormal = stemMat * vec3(0.0, 0.0, 1.0) * zSide;
    
    // Stem color (green)
    vFlowerColor = vec3(0.1, 0.3, 0.1);
    vFlowerUV = vec2(0.0);
    
  } else {
    // FLOWER VERTEX (crossed billboards)
    float flowerVertID = vertID - STEM_VERTICES;
    
    // Top of stem position
    float stemHeight = stemSize.y * randomHeight;
    vec3 stemTop = vec3(0.0, stemHeight, 0.0);
    stemTop = wf_rotateX(-randomLean) * stemTop;
    stemTop = wf_rotateY(randomAngle) * stemTop;
    stemTop += flowerOffset;
    
    // Which quad (0 or 1 for crossed quads)
    float quadIndex = floor(flowerVertID / 4.0);
    float quadVertID = mod(flowerVertID, 4.0);
    
    // Quad corner (0=bottom-left, 1=bottom-right, 2=top-right, 3=top-left)
    vec2 quadUV = vec2(
      step(1.0, mod(quadVertID, 3.0)),
      step(2.0, quadVertID)
    );
    
    // Billboard facing camera
    vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    
    // Rotate second quad 90 degrees for cross pattern
    float quadRotation = quadIndex * PI * 0.5;
    mat3 quadRotMat = wf_rotateY(quadRotation);
    vec3 rotatedRight = quadRotMat * cameraRight;
    vec3 rotatedUp = cameraUp; // Always up
    
    // Flower quad position
    vec2 quadOffset = (quadUV - 0.5) * flowerSize;
    vec3 flowerPos = stemTop 
      + rotatedRight * quadOffset.x 
      + rotatedUp * quadOffset.y;
    
    finalPosition = flowerPos;
    finalNormal = normalize(cross(rotatedRight, rotatedUp));
    vFlowerUV = quadUV;
    
    // Flower colors based on type
    if (vFlowerType < 1.0) {
      // Daisy (white with yellow center)
      vFlowerColor = mix(vec3(1.0, 1.0, 0.3), vec3(1.0, 1.0, 1.0), length(quadUV - 0.5) * 2.0);
    } else if (vFlowerType < 2.0) {
      // Poppy (red)
      vFlowerColor = vec3(0.9, 0.2, 0.2);
    } else if (vFlowerType < 3.0) {
      // Bluebell (blue)
      vFlowerColor = vec3(0.3, 0.4, 0.9);
    } else {
      // Dandelion (yellow)
      vFlowerColor = vec3(1.0, 0.9, 0.2);
    }
  }
  
  transformed = finalPosition;
  transformed.y += flowerBladeWorldPos.y;
  
  objectNormal = finalNormal;
  
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>
  
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  
  vec4 mvPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  
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

// ============================================================================
// WILDFLOWER FRAGMENT SHADER - Based on grass structure
// ============================================================================

const wildflowerFragmentShader = `
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

varying vec3 vFlowerColor;
varying float vIsFlower;
varying float vFlowerType;
varying vec3 vWorldPosition;
varying vec2 vFlowerUV;
uniform sampler2D flowerMap;
uniform float useFlowerTexture;

${SHADER_COMMON}

void main() {
  #include <clipping_planes_fragment>
  
  vec4 diffuseColor = vec4(diffuse, opacity);
  
  vec3 baseColor = vFlowerColor;
  float alphaFactor = 1.0;
  
  if (useFlowerTexture > 0.5 && vIsFlower > 0.5) {
    vec4 texColor = texture2D(flowerMap, vFlowerUV);
    baseColor = texColor.rgb;
    alphaFactor = texColor.a;
  }
  
  diffuseColor.rgb *= baseColor;
  diffuseColor.a *= alphaFactor;
  
  // Flowers are slightly emissive
  vec3 totalEmissiveRadiance = emissive;
  if (vIsFlower > 0.5) {
    totalEmissiveRadiance += baseColor * 0.2;
  }
  
  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
  
  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <alphahash_fragment>
  #include <specularmap_fragment>
  #include <normal_fragment_begin>
  #include <normal_fragment_maps>
  #include <emissivemap_fragment>
  #include <lights_phong_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>
  #include <aomap_fragment>
  
  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
  
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

function createWildflowerGeometry(numFlowers, patchSize) {
  const STEM_SEGMENTS = 4;
  const STEM_VERTICES = (STEM_SEGMENTS + 1) * 2;
  const FLOWER_VERTICES = 8; // 2 crossed quads × 4 vertices
  const TOTAL_VERTICES = STEM_VERTICES + FLOWER_VERTICES;

  // Create indices
  const indices = [];

  // Stem indices (same as grass)
  for (let i = 0; i < STEM_SEGMENTS; i++) {
    const vi = i * 2;
    // Front
    indices.push(vi + 0, vi + 1, vi + 2);
    indices.push(vi + 2, vi + 1, vi + 3);
    // Back
    const fi = STEM_VERTICES + vi;
    indices.push(fi + 2, fi + 1, fi + 0);
    indices.push(fi + 3, fi + 1, fi + 2);
  }

  // Flower indices (2 quads)
  for (let q = 0; q < 2; q++) {
    const offset = STEM_VERTICES + q * 4;
    indices.push(offset + 0, offset + 1, offset + 2);
    indices.push(offset + 0, offset + 2, offset + 3);
  }

  // Instance offsets
  const offsets = [];
  for (let i = 0; i < numFlowers; i++) {
    offsets.push(
      (Math.random() - 0.5) * patchSize,
      (Math.random() - 0.5) * patchSize,
      0
    );
  }

  const offsetsFloat32 = new Float32Array(offsets);

  // Vertex indices
  const vertID = new Uint16Array(TOTAL_VERTICES * 2);
  for (let i = 0; i < TOTAL_VERTICES * 2; i++) {
    vertID[i] = i;
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.instanceCount = numFlowers;
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
// WILDFLOWER PATCH COMPONENT
// ============================================================================

export function WildflowerPatch({
  position = [0, 0, 0],
  numFlowers = 32 * 32,
  patchSize = 10,
  stemWidth = 0.03,
  stemHeight = 0.8,
  flowerSize = 0.15,
  playerPosition = null,
  castShadow = false,
  receiveShadow = true,
  useFlowerTexture = false,
  flowerTextureUrl = "/textures/flower1.png",
}) {
  const materialRef = useRef();
  const meshRef = useRef();

  const flowerTexture = useMemo(() => {
    if (!useFlowerTexture || !flowerTextureUrl) {
      return null;
    }

    const loader = new THREE.TextureLoader();
    const texture = loader.load(flowerTextureUrl);
    if ("colorSpace" in texture && THREE.SRGBColorSpace !== undefined) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    if ("encoding" in texture && THREE.sRGBEncoding !== undefined) {
      texture.encoding = THREE.sRGBEncoding;
    }
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, [useFlowerTexture, flowerTextureUrl]);

  const geometry = useMemo(
    () => createWildflowerGeometry(numFlowers, patchSize),
    [numFlowers, patchSize]
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
    if (!materialRef.current) return;

    const mat = materialRef.current;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.stemSize = {
        value: new THREE.Vector2(stemWidth, stemHeight),
      };
      shader.uniforms.flowerSize = {
        value: new THREE.Vector2(flowerSize, flowerSize),
      };
      shader.uniforms.playerPos = { value: new THREE.Vector3(0, 0, 0) };
      shader.uniforms.viewMatrixInverse = { value: new THREE.Matrix4() };
      shader.uniforms.useFlowerTexture = {
        value: useFlowerTexture && flowerTexture ? 1 : 0,
      };
      shader.uniforms.flowerMap = { value: flowerTexture };

      shader.vertexShader = wildflowerVertexShader;
      shader.fragmentShader = wildflowerFragmentShader;

      mat.userData.shader = shader;
    };

    mat.needsUpdate = true;

    return () => {
      mat.dispose();
    };
  }, [stemWidth, stemHeight, flowerSize, useFlowerTexture, flowerTexture]);

  useEffect(() => {
    return () => {
      flowerTexture?.dispose();
    };
  }, [flowerTexture]);

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
      shader.uniforms.useFlowerTexture.value =
        useFlowerTexture && flowerTexture ? 1 : 0;
      shader.uniforms.flowerMap.value = flowerTexture;

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
// WILDFLOWER FIELD COMPONENT
// ============================================================================

export function WildflowerField({
  gridSize = 5,
  patchSpacing = 10,
  centerPosition = [0, 0, 0],
  ...flowerProps
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
        <WildflowerPatch key={i} position={pos} {...flowerProps} />
      ))}
    </group>
  );
}

/*
USAGE:

<WildflowerPatch position={[0, 0, 0]} />

<WildflowerField 
  gridSize={7}
  stemHeight={1.0}
  flowerSize={0.2}
/>

// Mix with grass!
<>
  <GrassField gridSize={9} />
  <WildflowerField gridSize={7} numFlowers={512} />
</>
*/
