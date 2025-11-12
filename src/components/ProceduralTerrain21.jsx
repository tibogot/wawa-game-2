import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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

const getFogColorGLSL = `
vec3 getFogColor(vec3 baseColor, float depth, vec2 screenUv)
{
    float uFogIntensity = 0.0025;
    vec3 fogColor = texture2D(uFogTexture, screenUv).rgb;
    
    float fogIntensity = 1.0 - exp(- uFogIntensity * uFogIntensity * depth * depth );
    return mix(baseColor, fogColor, fogIntensity);
}
`;

const getGrassAttenuationGLSL = `
float getGrassAttenuation(vec2 position)
{
    float distanceAttenuation = distance(uPlayerPosition.xz, position) / uGrassDistance * 2.0;
    return 1.0 - clamp(0.0, 1.0, smoothstep(0.3, 1.0, distanceAttenuation));
}
`;

const vertexShader = /* glsl */ `
uniform vec3 uPlayerPosition;
uniform float uLightnessSmoothness;
uniform float uFresnelOffset;
uniform float uFresnelScale;
uniform float uFresnelPower;
uniform vec3 uSunPosition;
uniform float uGrassDistance;
uniform sampler2D uTexture;
uniform sampler2D uFogTexture;

varying vec3 vColor;

${inverseLerpGLSL}
${remapGLSL}
${getSunShadeGLSL}
${getSunShadeColorGLSL}
${getSunReflectionGLSL}
${getSunReflectionColorGLSL}
${getFogColorGLSL}
${getGrassAttenuationGLSL}

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    float depth = - viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;

    vec4 terrainData = texture2D(uTexture, uv);
    vec3 normal = terrainData.rgb;

    float slope = 1.0 - abs(dot(vec3(0.0, 1.0, 0.0), normal));

    vec3 viewDirection = normalize(modelPosition.xyz - cameraPosition);
    vec3 worldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);
    vec3 viewNormal = normalize(normalMatrix * normal);

    vec3 uGrassDefaultColor = vec3(0.52, 0.65, 0.26);
    vec3 uGrassShadedColor = vec3(0.52 / 1.3, 0.65 / 1.3, 0.26 / 1.3);
    
    float grassDistanceAttenuation = getGrassAttenuation(modelPosition.xz);
    float grassSlopeAttenuation = smoothstep(remap(slope, 0.4, 0.5, 1.0, 0.0), 0.0, 1.0);
    float grassAttenuation = grassDistanceAttenuation * grassSlopeAttenuation;
    vec3 grassColor = mix(uGrassShadedColor, uGrassDefaultColor, 1.0 - grassAttenuation);

    vec3 color = grassColor;

    float sunShade = getSunShade(normal);
    color = getSunShadeColor(color, sunShade);

    float sunReflection = getSunReflection(viewDirection, worldNormal, viewNormal);
    color = getSunReflectionColor(color, sunReflection);

    vec2 screenUv = (gl_Position.xy / gl_Position.w * 0.5) + 0.5;
    color = getFogColor(color, depth, screenUv);

    vColor = color;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uGradientTexture;

varying vec3 vColor;

void main()
{
    vec3 color = vColor;
    
    gl_FragColor = vec4(color, 1.0);
}
`;

function createDefaultFogTexture() {
  const data = new Float32Array([0.6, 0.75, 0.9, 1]);
  const texture = new THREE.DataTexture(
    data,
    1,
    1,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  return texture;
}

function createDefaultGradientTexture() {
  const data = new Uint8Array([
    0xff, 0xff, 0xff, 0xff, 0xa6, 0xc3, 0x3c, 0xff, 0x2f, 0x3d, 0x36, 0xff,
    0x01, 0x10, 0x18, 0xff,
  ]);
  const texture = new THREE.DataTexture(data, 1, 4, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  return texture;
}

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
      lacunarity = 2.05,
      persistence = 0.45,
      maxIterations = 6,
      baseFrequency = 0.003,
      baseAmplitude = 180,
      power = 2,
      elevationOffset = 1,
      smoothingPasses = 2,
      smoothingStrength = 0.45,
      canyonPreservation = 65,
      playerPosition,
      sunPosition = new THREE.Vector3(-0.5, -0.5, -0.5),
      fogTexture,
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

    const gradientTexture = useMemo(() => createDefaultGradientTexture(), []);
    const fallbackFogTexture = useMemo(() => createDefaultFogTexture(), []);

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
      const uniforms = {
        uPlayerPosition: { value: new THREE.Vector3() },
        uGradientTexture: { value: gradientTexture },
        uLightnessSmoothness: { value: lightnessSmoothness },
        uFresnelOffset: { value: fresnel.offset ?? 0 },
        uFresnelScale: { value: fresnel.scale ?? 0.5 },
        uFresnelPower: { value: fresnel.power ?? 2 },
        uSunPosition: { value: new THREE.Vector3().copy(sunPosition) },
        uFogTexture: { value: fogTexture ?? fallbackFogTexture },
        uGrassDistance: { value: grassDistance },
        uTexture: { value: terrainData.texture },
      };

      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        lights: false,
        fog: false,
        transparent: false,
      });

      shaderMaterial.uniformsNeedUpdate = true;
      return shaderMaterial;
    }, [
      gradientTexture,
      lightnessSmoothness,
      fresnel,
      sunPosition,
      fogTexture,
      fallbackFogTexture,
      grassDistance,
      terrainData.texture,
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
      if (!mat) {
        return;
      }

      assignVector(mat.uniforms.uPlayerPosition.value, playerPosition);
      assignVector(mat.uniforms.uSunPosition.value, sunPosition);
      mat.uniforms.uGrassDistance.value = grassDistance;
      mat.uniforms.uLightnessSmoothness.value = lightnessSmoothness;
      mat.uniforms.uFresnelOffset.value = fresnel.offset ?? 0;
      mat.uniforms.uFresnelScale.value = fresnel.scale ?? 0.5;
      mat.uniforms.uFresnelPower.value = fresnel.power ?? 2;
      mat.uniforms.uTexture.value = terrainData.texture;
      mat.uniformsNeedUpdate = true;
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
      </group>
    );
  }
);

ProceduralTerrain21.displayName = "ProceduralTerrain21";
