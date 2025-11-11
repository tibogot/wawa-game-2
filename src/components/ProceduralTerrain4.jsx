import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { createNoise2D } from "simplex-noise";
import alea from "alea";

// Simplex noise generator using simplex-noise library
function createNoiseGenerator(seed = 0) {
  const prng = alea(seed);
  const noise2D = createNoise2D(prng);

  // Return wrapper function that matches the interface from ProceduralTerrain3
  return (x, y) => noise2D(x, y);
}

// SHARED height calculation - Optimized for BOTW-style open world
function getTerrainHeight(
  worldX,
  worldZ,
  noiseGenerators,
  heightScale,
  terrainControls = {}
) {
  const { noise, noise2, noise3, noise4 } = noiseGenerators;

  // Extract controls with defaults
  const {
    mountainIntensity = 1.0,
    flatnessThreshold = 0.35,
    flatnessSmooth = 0.25,
    ridgeSharpness = 2.5,
    valleyDepth = 0.4,
    detailAmount = 0.18,
    biomeVariation = 0.5,
  } = terrainControls;

  // === LARGE-SCALE REGIONS - Creates distinct biomes/areas ===
  const regionFreq = 0.0006; // Lower frequency for larger regions
  const regionNoise = noise(worldX * regionFreq, worldZ * regionFreq);
  const regionNoise2 = noise2(
    worldX * regionFreq * 1.5 + 1000,
    worldZ * regionFreq * 1.5 + 1000
  );
  const regionMask = (regionNoise * 0.65 + regionNoise2 * 0.35) * 0.5 + 0.5; // 0 to 1

  // === FLAT PLAINS - Large traversable areas like Hyrule Field ===
  let flatnessFactor = 1.0;
  if (regionMask < flatnessThreshold) {
    // Smooth transition to flat - creates wide plains
    flatnessFactor =
      Math.pow(regionMask / flatnessThreshold, 1.8) * flatnessSmooth +
      (1 - flatnessSmooth);
  }

  // === RIDGED MOUNTAINS - Sharp peaks and ridges ===
  const ridgeFreq = 0.0012; // Slightly lower for smoother transitions
  let ridge1 = Math.abs(noise3(worldX * ridgeFreq, worldZ * ridgeFreq));
  ridge1 = 1 - ridge1; // Invert to create ridges
  ridge1 = Math.pow(ridge1, ridgeSharpness);

  let ridge2 = Math.abs(
    noise4(worldX * ridgeFreq * 2.3 + 2000, worldZ * ridgeFreq * 2.3 + 2000)
  );
  ridge2 = 1 - ridge2;
  ridge2 = Math.pow(ridge2, ridgeSharpness * 0.9);

  const ridgeTerrain = (ridge1 * 0.75 + ridge2 * 0.25) * mountainIntensity;

  // === BASE TERRAIN - Gentle undulating landscape ===
  const baseFreq = 0.0005; // Even gentler for BOTW-style flow
  const base1 = noise(worldX * baseFreq + 3000, worldZ * baseFreq + 3000);
  const base2 = noise2(
    worldX * baseFreq * 0.6 + 4000,
    worldZ * baseFreq * 0.6 + 4000
  );
  const baseTerrain = (base1 * 0.65 + base2 * 0.35) * 0.6;

  // === VALLEYS AND DEPRESSIONS - Negative features ===
  const valleyFreq = 0.0009;
  const valleyNoise = noise3(
    worldX * valleyFreq + 5000,
    worldZ * valleyFreq + 5000
  );
  const valleys = Math.min(0, valleyNoise * valleyDepth);

  // === ROLLING HILLS - Medium frequency undulation ===
  const hillFreq = 0.002;
  const hills =
    noise4(worldX * hillFreq + 6000, worldZ * hillFreq + 6000) * 0.25;

  // === FINE DETAIL - Surface texture ===
  const detailFreq = 0.007;
  const detail =
    noise2(worldX * detailFreq + 7000, worldZ * detailFreq + 7000) *
    detailAmount;

  // === COMBINE LAYERS ===
  // Mountain regions get ridges, flat regions stay mostly flat
  const mountainMask = Math.pow(
    Math.max(0, regionMask - flatnessThreshold),
    1.3
  );
  const mountainHeight = ridgeTerrain * mountainMask;

  // Add biome variation for more interesting terrain
  const biomeVar =
    noise4(worldX * 0.0004 + 8000, worldZ * 0.0004 + 8000) *
    biomeVariation *
    0.3;

  let height =
    baseTerrain +
    mountainHeight +
    valleys +
    hills +
    detail * flatnessFactor +
    biomeVar;

  // Apply flatness factor to reduce all variation in flat areas
  height = height * flatnessFactor;

  const finalHeight = height * heightScale;

  // Safety check - clamp height to prevent rendering issues
  if (!isFinite(finalHeight) || Math.abs(finalHeight) > 10000) {
    return 0;
  }

  return finalHeight;
}

// Single terrain chunk (same structure as ProceduralTerrain3)
function TerrainChunk({
  chunkX,
  chunkZ,
  chunkSize,
  segments,
  heightScale,
  noiseGenerators,
  lodLevel,
  showColorDebug,
  maxSegments,
  segmentsPerChunk,
  enableHeightGradient,
  enableSlopeColoring,
  enableColorNoise,
  colorNoiseScale,
  enableTextureNoise,
  textureNoiseScale,
  textureFrequency,
  valleyColor,
  grassColor,
  mountainColor,
  peakColor,
  cliffColor,
  slopeThreshold,
  terrainControls,
  enableAO,
  aoIntensity,
  aoRadius,
  aoEdgeFade,
}) {
  const meshRef = useRef();
  const heightMapRef = useRef(null);

  // Step 1: Generate base geometry (positions, indices, uvs) - only when terrain shape changes
  const geometry = useMemo(() => {
    const verticesPerSide = segments + 1;
    const positions = [];
    const indices = [];
    const uvs = [];

    const worldStartX = chunkX * chunkSize;
    const worldStartZ = chunkZ * chunkSize;
    const stepSize = chunkSize / segments;

    // Generate heightmap and store in ref for later use
    const heightMap = [];
    for (let z = 0; z <= segments; z++) {
      heightMap[z] = [];
      for (let x = 0; x <= segments; x++) {
        const worldX = worldStartX + x * stepSize;
        const worldZ = worldStartZ + z * stepSize;
        const height = getTerrainHeight(
          worldX,
          worldZ,
          noiseGenerators,
          heightScale,
          terrainControls
        );
        heightMap[z][x] = height;
      }
    }

    heightMapRef.current = heightMap;

    const colors = [];
    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        const height = heightMap[z][x];
        const worldX = worldStartX + x * stepSize;
        const worldZ = worldStartZ + z * stepSize;
        positions.push(worldX, worldZ, height);
        uvs.push(x / segments, z / segments);
        colors.push(1, 1, 1);
      }
    }

    // Generate indices for triangles
    for (let z = 0; z < segments; z++) {
      for (let x = 0; x < segments; x++) {
        const a = x + z * verticesPerSide;
        const b = x + (z + 1) * verticesPerSide;
        const c = x + 1 + (z + 1) * verticesPerSide;
        const d = x + 1 + z * verticesPerSide;

        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [
    chunkX,
    chunkZ,
    chunkSize,
    segments,
    heightScale,
    noiseGenerators,
    lodLevel,
    terrainControls,
  ]);

  // Step 2: Update colors when color/AO settings change
  useEffect(() => {
    if (!geometry || !heightMapRef.current) return;

    const heightMap = heightMapRef.current;
    const colors = [];

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { r: 1, g: 1, b: 1 };

      const r_srgb = parseInt(result[1], 16) / 255;
      const g_srgb = parseInt(result[2], 16) / 255;
      const b_srgb = parseInt(result[3], 16) / 255;

      const srgbToLinear = (c) => {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };

      return {
        r: srgbToLinear(r_srgb),
        g: srgbToLinear(g_srgb),
        b: srgbToLinear(b_srgb),
      };
    };

    const valleyRgb = hexToRgb(valleyColor);
    const grassRgb = hexToRgb(grassColor);
    const mountainRgb = hexToRgb(mountainColor);
    const peakRgb = hexToRgb(peakColor);
    const cliffRgb = hexToRgb(cliffColor);

    const worldStartX = chunkX * chunkSize;
    const worldStartZ = chunkZ * chunkSize;
    const stepSize = chunkSize / segments;

    const calculateSlope = (x, z) => {
      if (!enableSlopeColoring) return 0;
      const h_center = heightMap[z][x];
      const h_left = x > 0 ? heightMap[z][x - 1] : h_center;
      const h_right = x < segments ? heightMap[z][x + 1] : h_center;
      const h_down = z > 0 ? heightMap[z - 1][x] : h_center;
      const h_up = z < segments ? heightMap[z + 1][x] : h_center;
      const dx = (h_right - h_left) / (2 * stepSize);
      const dz = (h_up - h_down) / (2 * stepSize);
      return Math.sqrt(dx * dx + dz * dz);
    };

    const calculateAO = (x, z) => {
      if (!enableAO) return 1.0;
      const edgeDistX = Math.min(x, segments - x) / segments;
      const edgeDistZ = Math.min(z, segments - z) / segments;
      const minEdgeDist = Math.min(edgeDistX, edgeDistZ);
      let edgeFadeFactor = 1.0;
      if (minEdgeDist < aoEdgeFade) {
        edgeFadeFactor = Math.pow(minEdgeDist / aoEdgeFade, 2);
      }
      const centerHeight = heightMap[z][x];
      let totalOcclusion = 0;
      let sampleCount = 0;
      for (let dz = -aoRadius; dz <= aoRadius; dz++) {
        for (let dx = -aoRadius; dx <= aoRadius; dx++) {
          if (dx === 0 && dz === 0) continue;
          const nx = x + dx;
          const nz = z + dz;
          if (nx >= 0 && nx <= segments && nz >= 0 && nz <= segments) {
            const neighborHeight = heightMap[nz][nx];
            const distance = Math.sqrt(dx * dx + dz * dz);
            const heightDiff = neighborHeight - centerHeight;
            if (heightDiff > 0) {
              const normalizedDiff = heightDiff / (heightScale * 0.3);
              const distanceFalloff = Math.max(0, 1.0 - distance / aoRadius);
              const occlusion = Math.pow(normalizedDiff * distanceFalloff, 0.7);
              totalOcclusion += Math.max(0, Math.min(1, occlusion));
            }
            sampleCount++;
          }
        }
      }
      const avgOcclusion = sampleCount > 0 ? totalOcclusion / sampleCount : 0;
      const ao =
        1.0 - Math.pow(avgOcclusion, 0.8) * aoIntensity * edgeFadeFactor;
      return Math.max(0.2, Math.min(1.0, ao));
    };

    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        const height = heightMap[z][x];
        const aoFactor = calculateAO(x, z);
        let r, g, b;

        if (enableHeightGradient || enableSlopeColoring) {
          const slope = calculateSlope(x, z);
          const minHeight = -heightScale * 0.3;
          const maxHeight = heightScale * 0.8;
          const heightNorm = Math.max(
            0,
            Math.min(1, (height - minHeight) / (maxHeight - minHeight))
          );

          let baseColor = { r: 0.5, g: 0.5, b: 0.5 };

          if (enableHeightGradient) {
            if (heightNorm < 0.35) {
              const t = heightNorm / 0.35;
              baseColor.r = valleyRgb.r + (grassRgb.r - valleyRgb.r) * t;
              baseColor.g = valleyRgb.g + (grassRgb.g - valleyRgb.g) * t;
              baseColor.b = valleyRgb.b + (grassRgb.b - valleyRgb.b) * t;
            } else if (heightNorm < 0.7) {
              const t = (heightNorm - 0.35) / 0.35;
              baseColor.r = grassRgb.r + (mountainRgb.r - grassRgb.r) * t;
              baseColor.g = grassRgb.g + (mountainRgb.g - grassRgb.g) * t;
              baseColor.b = grassRgb.b + (mountainRgb.b - grassRgb.b) * t;
            } else {
              const t = (heightNorm - 0.7) / 0.3;
              baseColor.r = mountainRgb.r + (peakRgb.r - mountainRgb.r) * t;
              baseColor.g = mountainRgb.g + (peakRgb.g - mountainRgb.g) * t;
              baseColor.b = mountainRgb.b + (peakRgb.b - mountainRgb.b) * t;
            }
          } else {
            baseColor = { r: 1, g: 1, b: 1 };
          }

          if (enableSlopeColoring && slope > slopeThreshold * 0.3) {
            const cliffBlend = Math.min(
              1,
              (slope - slopeThreshold * 0.3) / slopeThreshold
            );
            const smoothBlend = cliffBlend * cliffBlend;
            baseColor.r =
              baseColor.r * (1 - smoothBlend) + cliffRgb.r * smoothBlend;
            baseColor.g =
              baseColor.g * (1 - smoothBlend) + cliffRgb.g * smoothBlend;
            baseColor.b =
              baseColor.b * (1 - smoothBlend) + cliffRgb.b * smoothBlend;
          }

          if (enableColorNoise && noiseGenerators) {
            const worldX = worldStartX + x * stepSize;
            const worldZ = worldStartZ + z * stepSize;
            const noiseFreq = 0.008;
            const noise1 = noiseGenerators.noise(
              worldX * noiseFreq,
              worldZ * noiseFreq
            );
            const noise2 = noiseGenerators.noise2(
              worldX * noiseFreq * 2.7,
              worldZ * noiseFreq * 2.7
            );
            const colorVariation =
              (noise1 * 0.65 + noise2 * 0.35) * colorNoiseScale * 2.0 -
              colorNoiseScale;
            const variation = 1.0 + colorVariation * 0.5;
            baseColor.r *= variation;
            baseColor.g *= variation;
            baseColor.b *= variation;
          }

          if (enableTextureNoise && noiseGenerators) {
            const worldX = worldStartX + x * stepSize;
            const worldZ = worldStartZ + z * stepSize;
            const texFreq = textureFrequency;
            const texNoise1 = noiseGenerators.noise3(
              worldX * texFreq,
              worldZ * texFreq
            );
            const texNoise2 = noiseGenerators.noise4(
              worldX * texFreq * 2.2,
              worldZ * texFreq * 2.2
            );
            const textureDetail =
              (texNoise1 * 0.65 + texNoise2 * 0.35) * textureNoiseScale * 2.0 -
              textureNoiseScale;
            const texVariation = 1.0 + textureDetail * 0.3;
            baseColor.r *= texVariation;
            baseColor.g *= texVariation;
            baseColor.b *= texVariation;
          }

          r = Math.max(0, Math.min(1, baseColor.r));
          g = Math.max(0, Math.min(1, baseColor.g));
          b = Math.max(0, Math.min(1, baseColor.b));
          colors.push(r * aoFactor, g * aoFactor, b * aoFactor);
        } else {
          colors.push(aoFactor, aoFactor, aoFactor);
        }
      }
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;
  }, [
    geometry,
    enableHeightGradient,
    enableSlopeColoring,
    enableColorNoise,
    colorNoiseScale,
    enableTextureNoise,
    textureNoiseScale,
    textureFrequency,
    valleyColor,
    grassColor,
    mountainColor,
    peakColor,
    cliffColor,
    slopeThreshold,
    enableAO,
    aoIntensity,
    aoRadius,
    aoEdgeFade,
    segments,
    heightScale,
    chunkX,
    chunkZ,
    chunkSize,
    noiseGenerators,
  ]);

  const material = useMemo(() => {
    let color = 0xffffff;
    if (showColorDebug) {
      const highThreshold = Math.floor(segmentsPerChunk * 0.8);
      const mediumThreshold = Math.floor(segmentsPerChunk * 0.4);
      if (lodLevel >= highThreshold) {
        color = 0x00ff00;
      } else if (lodLevel >= mediumThreshold) {
        color = 0xffff00;
      } else {
        color = 0xff0000;
      }
    }
    const useVertexColors =
      (enableHeightGradient || enableAO) && !showColorDebug;
    return new THREE.MeshStandardMaterial({
      color: color,
      flatShading: false,
      vertexColors: useVertexColors,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.3,
    });
  }, [
    lodLevel,
    showColorDebug,
    segmentsPerChunk,
    enableHeightGradient,
    enableAO,
  ]);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
      />
    </RigidBody>
  );
}

// Main terrain system - Optimized for BOTW-style open world
export const ProceduralTerrain4 = ({
  size = 2500,
  chunkSize = 500,
  segments = 512,
  heightScale = 85,
  seed = 24601,
  viewDistance = 1200,
  lodNear = 400,
  lodMedium = 800,
  lodFar = 1200,
  onTerrainReady,
  onHeightmapReady,
}) => {
  const {
    terrainSize,
    terrainChunkSize,
    terrainSegments,
    terrainHeightScale,
    terrainSeed,
    terrainViewDistance,
    enableViewDistanceCulling,
    enableChunks,
    enableLOD,
    showColorDebug,
    terrainLodNear,
    terrainLodMedium,
    terrainLodFar,
    enableHeightGradient,
    enableSlopeColoring,
    enableColorNoise,
    colorNoiseScale,
    enableTextureNoise,
    textureNoiseScale,
    textureFrequency,
    valleyColor,
    grassColor,
    mountainColor,
    peakColor,
    cliffColor,
    slopeThreshold,
    mountainIntensity,
    flatnessThreshold,
    flatnessSmooth,
    ridgeSharpness,
    valleyDepth,
    detailAmount,
    enableAO,
    aoIntensity,
    aoRadius,
    aoEdgeFade,
  } = useControls("🗻 BOTW Terrain (Simplex)", {
    terrainSize: {
      value: size,
      min: 500,
      max: 5000,
      step: 100,
      label: "World Size",
    },
    terrainChunkSize: {
      value: chunkSize,
      min: 100,
      max: 1000,
      step: 50,
      label: "Chunk Size",
    },
    terrainSegments: {
      value: segments,
      min: 20,
      max: 1024,
      step: 10,
      label: "Detail Segments",
    },
    terrainHeightScale: {
      value: heightScale,
      min: 10,
      max: 200,
      step: 5,
      label: "Height Scale",
    },
    terrainSeed: {
      value: seed,
      min: 0,
      max: 99999,
      step: 1,
      label: "Seed",
    },
    terrainViewDistance: {
      value: viewDistance,
      min: 500,
      max: 3000,
      step: 100,
      label: "View Distance",
    },
    enableViewDistanceCulling: {
      value: true,
      label: "Enable View Distance Culling",
    },
    enableChunks: {
      value: true,
      label: "Enable Chunks",
    },
    enableLOD: {
      value: false,
      label: "Enable LOD",
    },
    showColorDebug: {
      value: false,
      label: "Show LOD Colors",
    },
    terrainLodNear: {
      value: lodNear,
      min: 200,
      max: 1500,
      step: 50,
      label: "LOD Near",
    },
    terrainLodMedium: {
      value: lodMedium,
      min: 500,
      max: 2000,
      step: 50,
      label: "LOD Medium",
    },
    terrainLodFar: {
      value: lodFar,
      min: 1000,
      max: 3000,
      step: 50,
      label: "LOD Far",
    },
    enableHeightGradient: {
      value: true,
      label: "🎨 Enable Height Gradient",
    },
    enableSlopeColoring: {
      value: true,
      label: "🎨 Enable Slope-Based Coloring",
    },
    enableColorNoise: {
      value: true,
      label: "🎨 Enable Color Variation",
    },
    colorNoiseScale: {
      value: 0.12,
      min: 0,
      max: 0.3,
      step: 0.05,
      label: "🎨 Color Variation Amount",
    },
    enableTextureNoise: {
      value: true,
      label: "🔬 Enable Texture Detail",
    },
    textureNoiseScale: {
      value: 0.18,
      min: 0,
      max: 0.5,
      step: 0.05,
      label: "🔬 Texture Detail Amount",
    },
    textureFrequency: {
      value: 0.35,
      min: 0.05,
      max: 1.0,
      step: 0.05,
      label: "🔬 Texture Detail Frequency",
    },
    // BOTW-inspired color palette
    valleyColor: {
      value: "#2d5016", // Darker green for valleys
      label: "🌿 Valley Color (Low/Flat)",
    },
    grassColor: {
      value: "#4a7c3a", // Vibrant green for plains
      label: "🌾 Grass Color (Mid/Gentle)",
    },
    mountainColor: {
      value: "#4a7c3a", // Brown-gray for mountains
      label: "⛰️ Mountain Color (High/Gentle)",
    },
    peakColor: {
      value: "#d4d4d4", // Light gray for peaks/snow
      label: "🏔️ Peak Color (Highest)",
    },
    cliffColor: {
      value: "#65523a", // Dark brown-gray for cliffs
      label: "🪨 Cliff Color (Steep)",
    },
    slopeThreshold: {
      value: 0.55,
      min: 0.1,
      max: 1.5,
      step: 0.05,
      label: "🪨 Slope Steepness for Cliffs",
    },
    mountainIntensity: {
      value: 3.5,
      min: 0,
      max: 5,
      step: 0.1,
      label: "🏔️ Mountain Intensity",
    },
    flatnessThreshold: {
      value: 0.35,
      min: 0,
      max: 1,
      step: 0.05,
      label: "🌾 Flatness Threshold",
    },
    flatnessSmooth: {
      value: 0.25,
      min: 0,
      max: 1,
      step: 0.05,
      label: "🌾 Flatness Smoothness",
    },
    ridgeSharpness: {
      value: 2.5,
      min: 0.5,
      max: 5,
      step: 0.1,
      label: "⛰️ Ridge Sharpness",
    },
    valleyDepth: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
      label: "🏞️ Valley Depth",
    },
    detailAmount: {
      value: 0.06,
      min: 0,
      max: 0.5,
      step: 0.01,
      label: "✨ Detail Amount",
    },
    enableAO: {
      value: true,
      label: "🌑 Enable Ambient Occlusion",
    },
    aoIntensity: {
      value: 0.65,
      min: 0,
      max: 2,
      step: 0.05,
      label: "🌑 AO Intensity",
    },
    aoRadius: {
      value: 6,
      min: 1,
      max: 15,
      step: 1,
      label: "🌑 AO Sample Radius",
    },
    aoEdgeFade: {
      value: 0.18,
      min: 0,
      max: 0.5,
      step: 0.05,
      label: "🌑 AO Edge Fade",
    },
  });

  const { camera } = useThree();
  const [visibleChunks, setVisibleChunks] = useState(new Map());
  const terrainReadyCalledRef = useRef(false);

  useEffect(() => {
    if (onTerrainReady && !terrainReadyCalledRef.current) {
      const shouldTrigger = enableChunks ? visibleChunks.size > 0 : true;
      if (shouldTrigger) {
        terrainReadyCalledRef.current = true;
        const timer = setTimeout(() => {
          const mode = enableChunks
            ? `${visibleChunks.size} chunks`
            : "single terrain";
          console.log(`✅ ProceduralTerrain4 (Simplex) ready with ${mode}`);
          onTerrainReady();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [onTerrainReady, visibleChunks.size, enableChunks]);

  const chunksPerSide = Math.ceil(terrainSize / terrainChunkSize);
  const halfSize = terrainSize / 2;

  // Create simplex noise generators ONCE - shared by all chunks
  const noiseGenerators = useMemo(() => {
    return {
      noise: createNoiseGenerator(terrainSeed),
      noise2: createNoiseGenerator(terrainSeed + 1000),
      noise3: createNoiseGenerator(terrainSeed + 2000),
      noise4: createNoiseGenerator(terrainSeed + 3000),
    };
  }, [terrainSeed]);

  const terrainControls = useMemo(
    () => ({
      mountainIntensity,
      flatnessThreshold,
      flatnessSmooth,
      ridgeSharpness,
      valleyDepth,
      detailAmount,
      biomeVariation: 0.5,
    }),
    [
      mountainIntensity,
      flatnessThreshold,
      flatnessSmooth,
      ridgeSharpness,
      valleyDepth,
      detailAmount,
    ]
  );

  useEffect(() => {
    if (onHeightmapReady && noiseGenerators) {
      const heightmapLookup = (x, z) => {
        const height = getTerrainHeight(
          x,
          -z,
          noiseGenerators,
          terrainHeightScale,
          terrainControls
        );
        return height;
      };
      console.log("✅ ProceduralTerrain4 (Simplex) heightmap ready");
      onHeightmapReady(heightmapLookup);
    }
  }, [noiseGenerators, terrainHeightScale, terrainControls, onHeightmapReady]);

  const segmentsPerChunk = Math.max(
    10,
    Math.floor((terrainSegments * terrainChunkSize) / terrainSize)
  );

  const getLODSegments = (distance) => {
    if (!enableLOD) return segmentsPerChunk;
    if (distance < terrainLodNear) return segmentsPerChunk;
    if (distance < terrainLodMedium) return Math.floor(segmentsPerChunk / 2);
    return Math.floor(segmentsPerChunk / 4);
  };

  useFrame(() => {
    if (!enableChunks) {
      if (visibleChunks.size > 0) {
        setVisibleChunks(new Map());
      }
      return;
    }

    const cameraPos = camera.position;
    const newVisibleChunks = new Map();

    for (let x = 0; x < chunksPerSide; x++) {
      for (let z = 0; z < chunksPerSide; z++) {
        const chunkMinX = x * terrainChunkSize - halfSize;
        const chunkMaxX = chunkMinX + terrainChunkSize;
        const chunkMinZ = z * terrainChunkSize - halfSize;
        const chunkMaxZ = chunkMinZ + terrainChunkSize;

        const nearestX = Math.max(chunkMinX, Math.min(cameraPos.x, chunkMaxX));
        const nearestZ = Math.max(chunkMinZ, Math.min(cameraPos.z, chunkMaxZ));

        const dx = cameraPos.x - nearestX;
        const dz = cameraPos.z - nearestZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (!enableViewDistanceCulling || distance < terrainViewDistance) {
          const lodLevel = getLODSegments(distance);
          const chunkKey = `${x},${z}`;
          newVisibleChunks.set(chunkKey, { x, z, lodLevel, distance });
        }
      }
    }

    let needsUpdate = newVisibleChunks.size !== visibleChunks.size;
    if (!needsUpdate) {
      for (const [key, value] of newVisibleChunks) {
        const old = visibleChunks.get(key);
        if (!old || old.lodLevel !== value.lodLevel) {
          needsUpdate = true;
          break;
        }
      }
    }

    if (needsUpdate) {
      setVisibleChunks(newVisibleChunks);
    }
  });

  if (!enableChunks) {
    return (
      <group>
        <TerrainChunk
          key="single-terrain"
          chunkX={-0.5}
          chunkZ={-0.5}
          chunkSize={terrainSize}
          segments={terrainSegments}
          heightScale={terrainHeightScale}
          noiseGenerators={noiseGenerators}
          lodLevel={terrainSegments}
          showColorDebug={showColorDebug}
          maxSegments={terrainSegments}
          segmentsPerChunk={terrainSegments}
          enableHeightGradient={enableHeightGradient}
          enableSlopeColoring={enableSlopeColoring}
          enableColorNoise={enableColorNoise}
          colorNoiseScale={colorNoiseScale}
          enableTextureNoise={enableTextureNoise}
          textureNoiseScale={textureNoiseScale}
          textureFrequency={textureFrequency}
          valleyColor={valleyColor}
          grassColor={grassColor}
          mountainColor={mountainColor}
          peakColor={peakColor}
          cliffColor={cliffColor}
          slopeThreshold={slopeThreshold}
          terrainControls={terrainControls}
          enableAO={enableAO}
          aoIntensity={aoIntensity}
          aoRadius={aoRadius}
          aoEdgeFade={aoEdgeFade}
        />
      </group>
    );
  }

  return (
    <group>
      {Array.from(visibleChunks.values()).map((chunkData) => {
        const { x, z, lodLevel } = chunkData;
        const chunkX = x - Math.floor(chunksPerSide / 2);
        const chunkZ = z - Math.floor(chunksPerSide / 2);
        const chunkKey = `${x},${z}`;

        return (
          <TerrainChunk
            key={`${chunkKey}`}
            chunkX={chunkX}
            chunkZ={chunkZ}
            chunkSize={terrainChunkSize}
            segments={lodLevel}
            heightScale={terrainHeightScale}
            noiseGenerators={noiseGenerators}
            lodLevel={lodLevel}
            showColorDebug={showColorDebug}
            maxSegments={terrainSegments}
            segmentsPerChunk={segmentsPerChunk}
            enableHeightGradient={enableHeightGradient}
            enableSlopeColoring={enableSlopeColoring}
            enableColorNoise={enableColorNoise}
            colorNoiseScale={colorNoiseScale}
            enableTextureNoise={enableTextureNoise}
            textureNoiseScale={textureNoiseScale}
            textureFrequency={textureFrequency}
            valleyColor={valleyColor}
            grassColor={grassColor}
            mountainColor={mountainColor}
            peakColor={peakColor}
            cliffColor={cliffColor}
            slopeThreshold={slopeThreshold}
            terrainControls={terrainControls}
            enableAO={enableAO}
            aoIntensity={aoIntensity}
            aoRadius={aoRadius}
            aoEdgeFade={aoEdgeFade}
          />
        );
      })}
    </group>
  );
};
