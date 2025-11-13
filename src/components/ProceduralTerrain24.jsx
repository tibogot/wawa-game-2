import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import alea from "alea";

const inverseLerpGLSL = `
float inverseLerp(float v, float minValue, float maxValue) {
    return (v - minValue) / (maxValue - minValue);
}
`;

const remapGLSL = `
float remap(float v, float inMin, float inMax, float outMin, float outMax) {
    float t = inverseLerp(v, inMin, inMax);
    return mix(outMin, outMax, t);
}
`;

const getSunShadeGLSL = `
float getSunShade(vec3 normal) {
    float sunShade = dot(normal, -uSunPosition);
    sunShade = sunShade * 0.5 + 0.5;
    return sunShade;
}
`;

const getSunShadeColorGLSL = `
vec3 getSunShadeColor(vec3 baseColor, float sunShade) {
    vec3 shadeColor = baseColor * vec3(0.3, 0.6, 0.8);
    return mix(baseColor, shadeColor, sunShade * 0.6);
}
`;

const getSunReflectionGLSL = `
float getSunReflection(vec3 viewDirection, vec3 worldNormal, vec3 viewNormal) {
    vec3 sunViewReflection = reflect(uSunPosition, viewNormal);
    float sunViewStrength = max(0.2, dot(sunViewReflection, viewDirection));
    float fresnel = uFresnelOffset + uFresnelScale * (1.0 + dot(viewDirection, worldNormal));
    float sunReflection = fresnel * sunViewStrength;
    sunReflection = pow(sunReflection, uFresnelPower);
    return sunReflection;
}
`;

const getSunReflectionColorGLSL = `
vec3 getSunReflectionColor(vec3 baseColor, float sunReflection) {
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
  canyonNoise2D,
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
  canyonIntensity = 0,
  canyonDepth = 25,
  canyonFrequency = 0.0012,
  canyonRidginess = 2.5,
  plateauEnabled = false,
  plateauLevels = 5,
  plateauStepHeight = 30,
  cliffSharpness = 0.95,
  plateauSmoothing = 0.1,
  plateauSizeFilter = 0.3,
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

  // Add plateau/cliff system for dramatic stepped terrain
  // IMPORTANT: Only raises terrain UP, never creates holes/depressions
  if (plateauEnabled) {
    // Store original elevation before plateau modification
    const originalElevation = elevation;

    // Calculate base elevation range
    const minElevation = elevationOffset - baseAmplitude;
    const maxElevation = elevationOffset + baseAmplitude;
    const elevationRange = maxElevation - minElevation;

    // Normalize current elevation to 0-1 range
    let normalizedElevation =
      elevationRange > 0 ? (elevation - minElevation) / elevationRange : 0.5;

    // Apply size filter to smooth out small variations and merge small plateaus
    // This removes tiny elevation changes and creates larger, smoother plateaus
    // Higher values (0.5-0.8) = more smoothing, fewer small details
    // Lower values (0.1-0.3) = less smoothing, more detail preserved
    if (plateauSizeFilter > 0) {
      // Quantize the normalized elevation to reduce small variations
      const quantizedSteps = Math.max(
        1,
        Math.floor(plateauLevels * (1.0 - plateauSizeFilter))
      );
      normalizedElevation =
        Math.floor(normalizedElevation * quantizedSteps) / quantizedSteps;
    }

    const clampedNormalized = Math.max(0, Math.min(1, normalizedElevation));

    // Quantize into discrete plateau levels (0 to plateauLevels-1)
    const levelFraction = clampedNormalized * plateauLevels;
    const currentLevel = Math.floor(levelFraction);
    const clampedLevel = Math.max(0, Math.min(plateauLevels - 1, currentLevel));

    // Calculate target plateau height for this level
    // Spread plateaus evenly across the elevation range, starting from minElevation
    const basePlateauHeight =
      minElevation +
      (clampedLevel / Math.max(1, plateauLevels - 1)) * elevationRange;

    // Add step height between plateaus for dramatic vertical separation
    // Each level adds more height, creating stepped plateaus
    const targetPlateauHeight =
      basePlateauHeight + clampedLevel * plateauStepHeight;

    // Calculate how far we are within the current plateau level (0 to 1)
    const levelProgress = levelFraction - currentLevel;
    const distanceToEdge = Math.min(levelProgress, 1.0 - levelProgress); // Distance from edge (0 = edge, 0.5 = center)

    // Create sharp cliff transition using exponential function
    // Higher cliffSharpness (0.90-0.99) = steeper cliffs (closer to 90 degrees)
    const sharpnessFactor = Math.max(0.001, 1.0 - cliffSharpness);

    // Calculate cliff transition: 1.0 = on plateau top (flat), 0.0 = at cliff edge (steep)
    // Use exponential function to create sharp transitions
    const normalizedDistance = distanceToEdge * 2.0; // Scale to 0-1 (edge to center)
    const cliffTransition = Math.pow(normalizedDistance, 1.0 / sharpnessFactor);
    const clampedTransition = Math.min(1.0, Math.max(0.0, cliffTransition));

    // Calculate plateau height with cliff transition
    // On plateau top (clampedTransition = 1.0): use flat plateau height
    // At cliff edge (clampedTransition = 0.0): blend toward lower level or original elevation
    let plateauElevation;

    if (levelProgress < 0.5) {
      // First half of level: transitioning from lower level or original elevation
      if (clampedLevel === 0) {
        // At lowest level, blend from original elevation to plateau
        plateauElevation =
          originalElevation * (1.0 - clampedTransition) +
          targetPlateauHeight * clampedTransition;
      } else {
        // Blend from previous plateau level to current plateau level
        const prevLevel = clampedLevel - 1;
        const prevPlateauHeight =
          minElevation +
          (prevLevel / Math.max(1, plateauLevels - 1)) * elevationRange +
          prevLevel * plateauStepHeight;
        plateauElevation =
          prevPlateauHeight * (1.0 - clampedTransition) +
          targetPlateauHeight * clampedTransition;
      }
    } else {
      // Second half of level: transitioning toward next plateau or staying on current
      if (clampedLevel === plateauLevels - 1) {
        // At highest level, just use plateau height (with transition for edge)
        plateauElevation = targetPlateauHeight;
      } else {
        // Blend from current plateau to next plateau
        const nextLevel = clampedLevel + 1;
        const nextPlateauHeight =
          minElevation +
          (nextLevel / Math.max(1, plateauLevels - 1)) * elevationRange +
          nextLevel * plateauStepHeight;
        plateauElevation =
          targetPlateauHeight * clampedTransition +
          nextPlateauHeight * (1.0 - clampedTransition);
      }
    }

    // CRITICAL: Never lower the elevation below the original - only raise up
    // This prevents holes/depressions
    plateauElevation = Math.max(originalElevation, plateauElevation);

    // Apply plateau smoothing (adds subtle variation to plateau tops, not edges)
    if (plateauSmoothing > 0 && distanceToEdge > 0.25) {
      // Add subtle noise only on plateau tops (away from edges)
      const plateauNoise = noise2D(
        x * baseFrequency * 0.4,
        z * baseFrequency * 0.4
      );
      const smoothingAmount = (distanceToEdge - 0.25) / 0.75; // 0 at edge, 1 at center
      const smoothedPlateau =
        plateauElevation +
        plateauNoise *
          plateauStepHeight *
          plateauSmoothing *
          smoothingAmount *
          0.15;
      // Still ensure we don't go below original elevation
      elevation = Math.max(originalElevation, smoothedPlateau);
    } else {
      elevation = plateauElevation;
    }
  }

  // Add canyon features (applied after plateaus for better integration)
  if (canyonIntensity > 0 && canyonNoise2D) {
    // Create canyon paths using multiple noise layers for natural winding
    const canyonNoise1 = canyonNoise2D(
      x * canyonFrequency,
      z * canyonFrequency
    );
    const canyonNoise2 = canyonNoise2D(
      x * canyonFrequency * 1.7 + 10000,
      z * canyonFrequency * 1.7 + 10000
    );

    // Use absolute value to create ridges, then invert for deep canyons
    // This creates linear features that wind naturally
    let canyonPattern1 = Math.abs(canyonNoise1);
    canyonPattern1 = 1.0 - canyonPattern1; // Invert: low values become deep canyons
    canyonPattern1 = Math.pow(canyonPattern1, canyonRidginess); // Sharpen edges

    // Second layer adds variation and branching
    let canyonPattern2 = Math.abs(canyonNoise2);
    canyonPattern2 = 1.0 - canyonPattern2;
    canyonPattern2 = Math.pow(canyonPattern2, canyonRidginess * 0.85);

    // Combine patterns - use multiplication to create narrower, deeper canyons
    // This ensures canyons only form where both patterns agree
    const combinedPattern = canyonPattern1 * (canyonPattern2 * 0.6 + 0.4);

    // Sharpen the canyon profile - steeper walls, deeper centers
    // Higher power = steeper walls, narrower canyons
    const sharpenedPattern = Math.pow(combinedPattern, 2.2);

    // Calculate canyon depth - deepest in center, gradual on edges
    const canyonDepthValue = sharpenedPattern * canyonDepth;

    // Apply canyon mask to avoid creating canyons in water/very low areas
    // But allow them in most terrain for small map verticality
    const baseHeight = elevation - elevationOffset;
    const canyonMask =
      baseHeight > -5 ? 1.0 : Math.max(0, (baseHeight + 5) / 5);

    // Apply canyon - subtract depth to create the valley
    elevation -= canyonDepthValue * canyonIntensity * canyonMask;
  }

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
  canyonIntensity = 0,
  canyonDepth = 25,
  canyonFrequency = 0.0012,
  canyonRidginess = 2.5,
  plateauEnabled = false,
  plateauLevels = 5,
  plateauStepHeight = 30,
  cliffSharpness = 0.95,
  plateauSmoothing = 0.1,
  plateauSizeFilter = 0.3,
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
  const canyonRng = alea(`${seed}-canyon`);
  const offsetsRng = alea(`${seed}-offsets`);
  const iterationsOffsets = buildIterationsOffsets(maxIterations, offsetsRng);
  const elevationNoise2D = createNoise2D(rng);
  const canyonNoise2D = canyonIntensity > 0 ? createNoise2D(canyonRng) : null;

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
        canyonNoise2D: canyonNoise2D,
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
        canyonIntensity,
        canyonDepth,
        canyonFrequency,
        canyonRidginess,
        plateauEnabled,
        plateauLevels,
        plateauStepHeight,
        cliffSharpness,
        plateauSmoothing,
        plateauSizeFilter,
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
      seed = "zelda-world",
      precision = 1,
      lacunarity = 2.2,
      persistence = 0.48,
      maxIterations = 4,
      baseFrequency = 0.0006,
      baseAmplitude = 85,
      power = 1.6,
      elevationOffset = 5,
      smoothingPasses = 3,
      smoothingStrength = 0.55,
      canyonPreservation = 45,
      canyonIntensity = 0.35,
      canyonDepth = 28,
      canyonFrequency = 0.0012,
      canyonRidginess = 2.5,
      plateauEnabled = false,
      plateauLevels = 5,
      plateauStepHeight = 30,
      cliffSharpness = 0.95,
      plateauSmoothing = 0.1,
      plateauSizeFilter = 0.3,
      playerPosition,
      sunPosition = new THREE.Vector3(-0.4, -0.6, -0.5),
      textureScale = 0.2,
      brightness = 0.7,
      enableShading = false,
      shadingIntensity = 0.1,
      onTerrainReady,
      onHeightmapReady,
      ...groupProps
    },
    ref
  ) => {
    const meshRef = useRef();
    const materialRef = useRef();

    const grassTexture = useLoader(THREE.TextureLoader, "/textures/grass.jpg");

    useEffect(() => {
      if (!grassTexture) {
        console.warn("Grass texture not loaded");
        return;
      }
      grassTexture.wrapS = THREE.RepeatWrapping;
      grassTexture.wrapT = THREE.RepeatWrapping;
      grassTexture.anisotropy = 8;
      grassTexture.colorSpace = THREE.SRGBColorSpace;
      grassTexture.needsUpdate = true;
      console.log("Grass texture loaded:", grassTexture);
    }, [grassTexture]);

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
          canyonIntensity,
          canyonDepth,
          canyonFrequency,
          canyonRidginess,
          plateauEnabled,
          plateauLevels,
          plateauStepHeight,
          cliffSharpness,
          plateauSmoothing,
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
        canyonIntensity,
        canyonDepth,
        canyonFrequency,
        canyonRidginess,
        plateauEnabled,
        plateauLevels,
        plateauStepHeight,
        cliffSharpness,
        plateauSmoothing,
        plateauSizeFilter,
      ]
    );

    useEffect(() => {
      return () => {
        terrainData.geometry.dispose();
        terrainData.texture.dispose();
      };
    }, [terrainData]);

    const material = useMemo(() => {
      // Use MeshStandardMaterial - we'll set the color in the shader
      const meshMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x000000, // No emissive - we control color directly in shader
        emissiveIntensity: 0.0,
        roughness: 1.0,
        metalness: 0.0,
      });

      meshMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uTexture = { value: terrainData.texture };
        shader.uniforms.uSunPosition = {
          value: new THREE.Vector3().copy(sunPosition),
        };
        shader.uniforms.uGrassTexture = { value: grassTexture };
        shader.uniforms.uTextureScale = { value: textureScale };
        shader.uniforms.uBrightness = { value: brightness };
        shader.uniforms.uEnableShading = { value: enableShading ? 1.0 : 0.0 };
        shader.uniforms.uShadingIntensity = { value: shadingIntensity };

        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>
uniform sampler2D uTexture;
uniform vec3 uSunPosition;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vBakedNormal;
varying vec2 vUv;
`
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_normal_vertex>",
          `#include <begin_normal_vertex>
vec4 terrainData = texture2D(uTexture, uv);
vec3 bakedNormalUnnormalized = terrainData.rgb * 2.0 - 1.0;
float normalLength = length(bakedNormalUnnormalized);
// Avoid division by zero - use default normal if length is too small
vec3 bakedNormal;
if (normalLength > 0.001) {
  bakedNormal = normalize(bakedNormalUnnormalized);
} else {
  bakedNormal = vec3(0.0, 1.0, 0.0);
}
vBakedNormal = bakedNormal;
vUv = uv;
`
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>
vWorldPos = worldPosition.xyz;
// Calculate world normal from baked normal - avoid division by zero
vec3 worldNormalUnnormalized = mat3(modelMatrix) * vBakedNormal;
float worldNormalLength = length(worldNormalUnnormalized);
if (worldNormalLength > 0.001) {
  vWorldNormal = normalize(worldNormalUnnormalized);
} else {
  vWorldNormal = vec3(0.0, 1.0, 0.0);
}
`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
uniform sampler2D uGrassTexture;
uniform float uTextureScale;
uniform float uBrightness;
uniform float uEnableShading;
uniform float uShadingIntensity;
uniform vec3 uSunPosition;
`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
// Sample grass texture based on world position for seamless tiling
vec2 grassUV = vWorldPos.xz * uTextureScale;

// Sample texture
vec4 grassSample = texture2D(uGrassTexture, grassUV);

// Get texture color
vec3 grassColor = grassSample.rgb;

// Apply brightness adjustment (lower values = darker)
grassColor = grassColor * uBrightness;

// Reduce whiteness by slightly desaturating and darkening
// Calculate luminance (perceived brightness)
float luminance = dot(grassColor, vec3(0.299, 0.587, 0.114));

// Mix towards a slightly darker, less saturated version
// This reduces the "whitey" appearance
vec3 desaturatedColor = mix(grassColor, vec3(luminance * 0.9), 0.15);
grassColor = mix(grassColor, desaturatedColor, 0.5);

// Apply sun shading only if enabled
if (uEnableShading > 0.5) {
  // Avoid division by zero when normalizing sun position
  float sunPosLength = length(uSunPosition);
  if (sunPosLength > 0.001) {
    vec3 sunDir = normalize(-uSunPosition);
    float sunShade = dot(vWorldNormal, sunDir);
    sunShade = sunShade * 0.5 + 0.5;
    // Subtle shadow that preserves original colors
    vec3 shadeColor = grassColor * vec3(0.9, 0.95, 0.98);
    grassColor = mix(grassColor, shadeColor, (1.0 - sunShade) * uShadingIntensity);
  }
}

// Clamp to valid range
grassColor = clamp(grassColor, 0.0, 1.0);

// Set diffuse color - this is the main color
diffuseColor.rgb = grassColor;
`
        );

        meshMaterial.userData.shader = shader;
      };

      meshMaterial.needsUpdate = true;
      return meshMaterial;
    }, [terrainData.texture, sunPosition, grassTexture]);

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
      if (uniforms.uTexture) {
        uniforms.uTexture.value = terrainData.texture;
      }
      if (uniforms.uGrassTexture) {
        uniforms.uGrassTexture.value = grassTexture;
      }
      if (uniforms.uTextureScale) {
        uniforms.uTextureScale.value = textureScale;
      }
      if (uniforms.uBrightness) {
        uniforms.uBrightness.value = brightness;
      }
      if (uniforms.uEnableShading) {
        uniforms.uEnableShading.value = enableShading ? 1.0 : 0.0;
      }
      if (uniforms.uShadingIntensity) {
        uniforms.uShadingIntensity.value = shadingIntensity;
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
      </group>
    );
  }
);

ProceduralTerrain21.displayName = "ProceduralTerrain21";
