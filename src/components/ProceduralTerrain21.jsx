import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import alea from "alea";

const inverseLerpGLSL = `
float inverseLerp(float v, float minValue, float maxValue)
{
    return (v - minValue) / (maxValue - minValue);
}
`;

const remapGLSL = `
float remap(float v, float inMin, float inMax, float outMin, float outMax)
{
    float t = inverseLerp(v, inMin, inMax);
    return mix(outMin, outMax, t);
}
`;

const getSunShadeGLSL = `
float getSunShade(vec3 normal)
{
    float sunShade = dot(normal, - uSunPosition);
    sunShade = sunShade * 0.5 + 0.5;

    return sunShade;
}
`;

const getSunShadeColorGLSL = `
vec3 getSunShadeColor(vec3 baseColor, float sunShade)
{
    vec3 shadeColor = baseColor * vec3(0.0, 0.5, 0.7);
    return mix(baseColor, shadeColor, sunShade);
}
`;

const getSunReflectionGLSL = `
float getSunReflection(vec3 viewDirection, vec3 worldNormal, vec3 viewNormal)
{
    vec3 sunViewReflection = reflect(uSunPosition, viewNormal);
    float sunViewStrength = max(0.2, dot(sunViewReflection, viewDirection));

    float fresnel = uFresnelOffset + uFresnelScale * (1.0 + dot(viewDirection, worldNormal));
    float sunReflection = fresnel * sunViewStrength;
    sunReflection = pow(sunReflection, uFresnelPower);

    return sunReflection;
}
`;

const getSunReflectionColorGLSL = `
vec3 getSunReflectionColor(vec3 baseColor, float sunReflection)
{
    return mix(baseColor, vec3(1.0, 1.0, 1.0), clamp(sunReflection, 0.0, 1.0));
}
`;

function buildIterationsOffsets(maxIterations, rng) {
  const offsets = [];
  for (let i = 0; i < maxIterations; i++) {
    offsets.push([(rng() - 0.5) * 200000, (rng() - 0.5) * 200000]);
  }
  return offsets;
}

function getElevation({
  noise2D,
  x,
  z,
  lacunarity,
  persistence,
  iterations,
  baseFrequency,
  baseAmplitude,
  power,
  elevationOffset,
  iterationsOffsets,
}) {
  let elevation = 0;
  let frequency = baseFrequency;
  let amplitude = 1;
  let normalisation = 0;

  for (let i = 0; i < iterations; i++) {
    const offset = iterationsOffsets[i] ?? [0, 0];
    const noiseValue = noise2D(
      x * frequency + offset[0],
      z * frequency + offset[1]
    );
    elevation += noiseValue * amplitude;
    normalisation += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  elevation /= normalisation || 1;
  const sign = elevation < 0 ? -1 : 1;
  elevation = Math.pow(Math.abs(elevation), power) * sign;
  elevation *= baseAmplitude;
  elevation += elevationOffset;

  return elevation;
}

function createTerrainData({
  size,
  subdivisions,
  seed,
  precision,
  lacunarity,
  persistence,
  maxIterations,
  baseFrequency,
  baseAmplitude,
  power,
  elevationOffset,
  smoothingPasses,
  smoothingStrength,
  canyonPreservation,
}) {
  const precisionClamped = Math.max(0, Math.min(1, precision));
  const iterations = Math.min(
    maxIterations,
    Math.max(
      1,
      Math.round(
        (maxIterations * (1 - Math.pow(1 - precisionClamped, 2)) +
          maxIterations) /
          2
      )
    )
  );

  const segments = subdivisions + 1;
  const gridSize = segments + 1;
  const vertexCount = segments * segments;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uv = new Float32Array(vertexCount * 2);
  const indices = new (vertexCount > 65535 ? Uint32Array : Uint16Array)(
    subdivisions * subdivisions * 6
  );
  const textureData = new Float32Array(vertexCount * 4);

  const rng = alea(`${seed}-terrain`);
  const offsetsRng = alea(`${seed}-offsets`);
  const iterationsOffsets = buildIterationsOffsets(maxIterations, offsetsRng);
  const elevationNoise2D = createNoise2D(rng);

  const halfSize = size * 0.5;
  const overflowSize = gridSize * gridSize;
  const overflowElevations = new Float32Array(overflowSize);
  const elevations = new Float32Array(vertexCount);

  for (let ix = 0; ix < gridSize; ix++) {
    const worldX = (ix / subdivisions - 0.5) * size;

    for (let iz = 0; iz < gridSize; iz++) {
      const worldZ = (iz / subdivisions - 0.5) * size;
      const elevation = getElevation({
        noise2D: elevationNoise2D,
        x: worldX,
        z: worldZ,
        lacunarity,
        persistence,
        iterations,
        baseFrequency,
        baseAmplitude,
        power,
        elevationOffset,
        iterationsOffsets,
      });

      const overflowIndex = iz * gridSize + ix;
      overflowElevations[overflowIndex] = elevation;
    }
  }

  const applySmoothing = smoothingPasses > 0 && smoothingStrength > 0;
  if (applySmoothing) {
    const normalizedStrength = THREE.MathUtils.clamp(smoothingStrength, 0, 1);
    const preservationThreshold = Math.max(canyonPreservation, 0);
    const offsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    const scratch = new Float32Array(overflowElevations.length);

    for (let pass = 0; pass < smoothingPasses; pass++) {
      scratch.set(overflowElevations);

      for (let ix = 0; ix < gridSize; ix++) {
        for (let iz = 0; iz < gridSize; iz++) {
          const index = iz * gridSize + ix;
          const current = scratch[index];

          let sum = 0;
          let count = 0;

          for (let i = 0; i < offsets.length; i++) {
            const nx = ix + offsets[i][0];
            const nz = iz + offsets[i][1];
            if (nx < 0 || nx >= gridSize || nz < 0 || nz >= gridSize) {
              continue;
            }
            sum += scratch[nz * gridSize + nx];
            count++;
          }

          if (count === 0) {
            continue;
          }

          const average = sum / count;
          const difference = Math.abs(current - average);

          let preserveFactor = 1;
          if (preservationThreshold > 0) {
            preserveFactor = THREE.MathUtils.clamp(
              1 - difference / preservationThreshold,
              0,
              1
            );
          }

          if (preserveFactor <= 0) {
            continue;
          }

          const lerpFactor = normalizedStrength * preserveFactor;
          overflowElevations[index] =
            current + (average - current) * lerpFactor;
        }
      }
    }
  }

  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const targetIndex = iz * segments + ix;
      const sourceIndex = iz * gridSize + ix;
      elevations[targetIndex] = overflowElevations[sourceIndex];
    }
  }

  for (let iz = 0; iz < segments; iz++) {
    const worldZ = (iz / subdivisions - 0.5) * size;

    for (let ix = 0; ix < segments; ix++) {
      const worldX = (ix / subdivisions - 0.5) * size;
      const elevation = elevations[iz * segments + ix];
      const stride = (iz * segments + ix) * 3;

      positions[stride] = worldX;
      positions[stride + 1] = elevation;
      positions[stride + 2] = worldZ;

      const uvStride = (iz * segments + ix) * 2;
      uv[uvStride] = ix / (segments - 1);
      uv[uvStride + 1] = iz / (segments - 1);
    }
  }

  const stepX = -size / subdivisions;
  const stepZ = -size / subdivisions;

  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const overflowIndex = iz * gridSize + ix;
      const current = overflowElevations[overflowIndex];
      const neighbourX = overflowElevations[overflowIndex + 1];
      const neighbourZ = overflowElevations[overflowIndex + gridSize];

      const dxElevation = current - neighbourX;
      const dzElevation = current - neighbourZ;

      const normalX = -stepZ * dxElevation;
      const normalY = stepZ * stepX;
      const normalZ = -dzElevation * stepX;
      const length = Math.hypot(normalX, normalY, normalZ) || 1;

      const stride = (iz * segments + ix) * 3;
      normals[stride] = normalX / length;
      normals[stride + 1] = normalY / length;
      normals[stride + 2] = normalZ / length;
    }
  }

  let indexOffset = 0;
  for (let iz = 0; iz < subdivisions; iz++) {
    for (let ix = 0; ix < subdivisions; ix++) {
      const row = segments;
      const a = iz * row + ix;
      const b = iz * row + ix + 1;
      const c = (iz + 1) * row + ix;
      const d = (iz + 1) * row + ix + 1;

      indices[indexOffset] = a;
      indices[indexOffset + 1] = d;
      indices[indexOffset + 2] = b;
      indices[indexOffset + 3] = d;
      indices[indexOffset + 4] = a;
      indices[indexOffset + 5] = c;
      indexOffset += 6;
    }
  }

  for (let i = 0; i < vertexCount; i++) {
    const stride3 = i * 3;
    const stride4 = i * 4;
    textureData[stride4] = normals[stride3];
    textureData[stride4 + 1] = normals[stride3 + 1];
    textureData[stride4 + 2] = normals[stride3 + 2];
    textureData[stride4 + 3] = positions[stride3 + 1];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  const texture = new THREE.DataTexture(
    textureData,
    segments,
    segments,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;

  const subSize = size / subdivisions;

  const heightSampler = (x, z) => {
    const localX = x + halfSize;
    const localZ = z + halfSize;

    if (localX < 0 || localX > size || localZ < 0 || localZ > size) {
      return 0;
    }

    const xIndex = localX / subSize;
    const zIndex = localZ / subSize;

    const aIndexX = Math.min(Math.floor(xIndex), subdivisions - 1);
    const aIndexZ = Math.min(Math.floor(zIndex), subdivisions - 1);
    const cIndexX = Math.min(aIndexX + 1, subdivisions);
    const cIndexZ = Math.min(aIndexZ + 1, subdivisions);

    const xRatio = xIndex - Math.floor(xIndex);
    const zRatio = zIndex - Math.floor(zIndex);

    const bIndexX =
      xRatio < zRatio ? aIndexX : Math.min(aIndexX + 1, subdivisions);
    const bIndexZ =
      xRatio < zRatio ? Math.min(aIndexZ + 1, subdivisions) : aIndexZ;

    const stride = (row, col) => (row * segments + col) * 3;

    const aStride = stride(aIndexZ, aIndexX);
    const bStride = stride(bIndexZ, bIndexX);
    const cStride = stride(cIndexZ, cIndexX);

    const weight1 = xRatio < zRatio ? 1 - zRatio : 1 - xRatio;
    const weight2 = xRatio < zRatio ? -(xRatio - zRatio) : xRatio - zRatio;
    const weight3 = 1 - weight1 - weight2;

    const elevation =
      positions[aStride + 1] * weight1 +
      positions[bStride + 1] * weight2 +
      positions[cStride + 1] * weight3;

    return elevation;
  };

  return {
    geometry,
    texture,
    heightSampler,
  };
}

function assignVector(target, value) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    target.set(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
  } else if (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    "z" in value
  ) {
    target.set(value.x, value.y, value.z);
  }
}

export const ProceduralTerrain21 = forwardRef(
  (
    {
      size = 2000,
      subdivisions = 512,
      seed = "infinite-world",
      precision = 1,
      lacunarity = 1.8,
      persistence = 0.42,
      maxIterations = 6,
      baseFrequency = 0.0012,
      baseAmplitude = 180,
      power = 2,
      elevationOffset = 1,
      smoothingPasses = 2,
      smoothingStrength = 0.45,
      canyonPreservation = 65,
      playerPosition,
      sunPosition = new THREE.Vector3(-0.5, -0.5, -0.5),
      grassDistance = 64,
      fresnel = { offset: 0, scale: 0.5, power: 2 },
      lightnessSmoothness = 0.25,
      onTerrainReady,
      onHeightmapReady,
      ...groupProps
    },
    ref
  ) => {
    const meshRef = useRef();
    const materialRef = useRef();

    const terrainPalette = useMemo(
      () => ({
        water: new THREE.Color("#3c2a20"),
        valley: new THREE.Color("#2f4f1f"),
        grass: new THREE.Color("#3f6f2a"),
        cliff: new THREE.Color("#6b5234"),
        peak: new THREE.Color("#d9d9d6"),
      }),
      []
    );

    const elevationBands = useMemo(
      () => ({
        water: -20,
        valley: 12,
        mountain: 140,
        peak: 240,
      }),
      []
    );

    const detailTexture = useLoader(
      THREE.TextureLoader,
      "/textures/Grass005_1K-JPG_Color.jpg"
    );

    useEffect(() => {
      if (!detailTexture) {
        return;
      }
      detailTexture.wrapS = THREE.RepeatWrapping;
      detailTexture.wrapT = THREE.RepeatWrapping;
      detailTexture.anisotropy = 8;
      detailTexture.needsUpdate = true;
    }, [detailTexture]);

    const terrainData = useMemo(
      () =>
        createTerrainData({
          size,
          subdivisions,
          seed,
          precision,
          lacunarity,
          persistence,
          maxIterations,
          baseFrequency,
          baseAmplitude,
          power,
          elevationOffset,
          smoothingPasses,
          smoothingStrength,
          canyonPreservation,
        }),
      [
        size,
        subdivisions,
        seed,
        precision,
        lacunarity,
        persistence,
        maxIterations,
        baseFrequency,
        baseAmplitude,
        power,
        elevationOffset,
        smoothingPasses,
        smoothingStrength,
        canyonPreservation,
      ]
    );

    useEffect(() => {
      return () => {
        terrainData.geometry.dispose();
        terrainData.texture.dispose();
      };
    }, [terrainData]);

    const material = useMemo(() => {
      const meshMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.92,
        metalness: 0.0,
      });

      meshMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uTexture = { value: terrainData.texture };
        shader.uniforms.uSunPosition = {
          value: new THREE.Vector3().copy(sunPosition),
        };
        shader.uniforms.uLightnessSmoothness = {
          value: lightnessSmoothness,
        };
        shader.uniforms.uFresnelOffset = { value: fresnel.offset ?? 0 };
        shader.uniforms.uFresnelScale = { value: fresnel.scale ?? 0.5 };
        shader.uniforms.uFresnelPower = { value: fresnel.power ?? 2 };
        shader.uniforms.uColorWater = { value: terrainPalette.water.clone() };
        shader.uniforms.uColorValley = { value: terrainPalette.valley.clone() };
        shader.uniforms.uColorGrass = { value: terrainPalette.grass.clone() };
        shader.uniforms.uColorCliff = { value: terrainPalette.cliff.clone() };
        shader.uniforms.uColorPeak = { value: terrainPalette.peak.clone() };
        shader.uniforms.uWaterLevel = { value: elevationBands.water };
        shader.uniforms.uValleyLevel = { value: elevationBands.valley };
        shader.uniforms.uMountainLevel = { value: elevationBands.mountain };
        shader.uniforms.uPeakLevel = { value: elevationBands.peak };
        shader.uniforms.uDetailTexture = { value: detailTexture };
        shader.uniforms.uDetailScale = { value: 0.004 };
        shader.uniforms.uDetailStrength = { value: 0.35 };

        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>
uniform sampler2D uTexture;
uniform vec3 uSunPosition;
uniform float uLightnessSmoothness;
uniform float uFresnelOffset;
uniform float uFresnelScale;
uniform float uFresnelPower;
uniform vec3 uColorWater;
uniform vec3 uColorValley;
uniform vec3 uColorGrass;
uniform vec3 uColorCliff;
uniform vec3 uColorPeak;
uniform float uWaterLevel;
uniform float uValleyLevel;
uniform float uMountainLevel;
uniform float uPeakLevel;
uniform sampler2D uDetailTexture;
uniform float uDetailScale;
uniform float uDetailStrength;
varying vec3 vTerrainColor;
varying vec3 vWorldPos;
float hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p.x + p.y) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
${inverseLerpGLSL}
${remapGLSL}
${getSunShadeGLSL}
${getSunShadeColorGLSL}
${getSunReflectionGLSL}
${getSunReflectionColorGLSL}`
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_normal_vertex>",
          `#include <begin_normal_vertex>
vec3 bakedNormal = normalize(texture2D(uTexture, uv).rgb);
objectNormal = bakedNormal;
`
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
vec4 terrainData = texture2D(uTexture, uv);
vec3 normal = normalize(terrainData.rgb);
vec4 modelPositionCustom = modelMatrix * vec4(transformed, 1.0);
vec4 viewPositionCustom = viewMatrix * modelPositionCustom;
float height = modelPositionCustom.y;
vWorldPos = modelPositionCustom.xyz;
float slope = 1.0 - abs(dot(vec3(0.0, 1.0, 0.0), normal));
vec3 viewDirection = normalize(modelPositionCustom.xyz - cameraPosition);
vec3 worldNormal = normalize(
  mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal
);
vec3 viewNormal = normalize(normalMatrix * normal);

vec3 color = uColorWater;
float tValley = smoothstep(uWaterLevel - 15.0, uValleyLevel + 10.0, height);
color = mix(color, uColorValley, tValley);
float tGrass = smoothstep(uValleyLevel - 8.0, uValleyLevel + 35.0, height);
color = mix(color, uColorGrass, tGrass);
float tCliff = smoothstep(uMountainLevel - 45.0, uMountainLevel + 25.0, height);
color = mix(color, uColorCliff, tCliff);
float tPeak = smoothstep(uPeakLevel - 40.0, uPeakLevel + 10.0, height);
color = mix(color, uColorPeak, tPeak);

float slopeFactor = smoothstep(0.35, 0.92, slope);
color = mix(color, uColorCliff, slopeFactor * clamp(height - uWaterLevel, 0.0, 150.0) / 150.0);

float largeNoise = noise(modelPositionCustom.xz * 0.0015);
float detailNoise = noise(modelPositionCustom.xz * 0.006);
float variation = (largeNoise * 0.65 + detailNoise * 0.35) * 0.08 - 0.04;
color *= 1.0 + variation;
color = clamp(color, 0.0, 1.0);

float sunShade = getSunShade(normal);
color = getSunShadeColor(color, sunShade);
// float sunReflection = getSunReflection(viewDirection, worldNormal, viewNormal);
// color = getSunReflectionColor(color, sunReflection);
vTerrainColor = clamp(color, 0.0, 1.0);
`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
varying vec3 vTerrainColor;
varying vec3 vWorldPos;
uniform sampler2D uDetailTexture;
uniform float uDetailScale;
uniform float uDetailStrength;
`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
diffuseColor.rgb = vTerrainColor;
vec2 detailUV = vWorldPos.xz * uDetailScale;
vec3 detailSample = texture2D(uDetailTexture, detailUV).rgb;
float detailValue = (detailSample.r + detailSample.g + detailSample.b) / 3.0;
detailValue = mix(1.0, detailValue, uDetailStrength);
diffuseColor.rgb *= detailValue;
`
        );

        meshMaterial.userData.shader = shader;
      };

      meshMaterial.needsUpdate = true;
      return meshMaterial;
    }, [
      terrainData.texture,
      sunPosition,
      lightnessSmoothness,
      fresnel,
      terrainPalette,
      elevationBands,
      detailTexture,
    ]);

    useEffect(() => {
      materialRef.current = material;
      return () => {
        material.dispose();
      };
    }, [material]);

    useEffect(() => {
      if (onHeightmapReady) {
        onHeightmapReady(terrainData.heightSampler);
      }
    }, [terrainData.heightSampler, onHeightmapReady]);

    useEffect(() => {
      if (!onTerrainReady) {
        return;
      }

      const timer = setTimeout(
        () => onTerrainReady(meshRef.current ?? null),
        0
      );
      return () => clearTimeout(timer);
    }, [onTerrainReady]);

    useEffect(() => {
      if (!ref) {
        return;
      }

      const current = meshRef.current ?? null;
      if (typeof ref === "function") {
        ref(current);
      } else {
        ref.current = current;
      }

      return () => {
        if (typeof ref === "function") {
          ref(null);
        } else if (ref) {
          ref.current = null;
        }
      };
    }, [ref]);

    useFrame(() => {
      const mat = materialRef.current;
      const shader = mat?.userData?.shader;
      const uniforms = shader?.uniforms;
      if (!shader || !uniforms) {
        return;
      }

      if (uniforms.uSunPosition) {
        assignVector(uniforms.uSunPosition.value, sunPosition);
      }
      if (uniforms.uLightnessSmoothness) {
        uniforms.uLightnessSmoothness.value = lightnessSmoothness;
      }
      if (uniforms.uFresnelOffset) {
        uniforms.uFresnelOffset.value = fresnel.offset ?? 0;
      }
      if (uniforms.uFresnelScale) {
        uniforms.uFresnelScale.value = fresnel.scale ?? 0.5;
      }
      if (uniforms.uFresnelPower) {
        uniforms.uFresnelPower.value = fresnel.power ?? 2;
      }
      if (uniforms.uTexture) {
        uniforms.uTexture.value = terrainData.texture;
      }
      if (uniforms.uDetailTexture) {
        uniforms.uDetailTexture.value = detailTexture;
      }
      shader.uniformsNeedUpdate = true;
    });

    return (
      <group {...groupProps}>
        <RigidBody type="fixed" colliders="trimesh">
          <mesh
            ref={meshRef}
            geometry={terrainData.geometry}
            material={material}
            castShadow
            receiveShadow
          />
        </RigidBody>
        <mesh
          position={[0, elevationBands.water, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow={false}
        >
          <planeGeometry args={[size, size, 1, 1]} />
          <meshBasicMaterial color="#36271d" transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }
);

ProceduralTerrain21.displayName = "ProceduralTerrain21";
