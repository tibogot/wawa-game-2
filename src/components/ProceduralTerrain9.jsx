import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { TextureLoader } from "three";

// Simplex noise generator using simplex-noise library
function createNoiseGenerator(seed = 0) {
  const prng = alea(seed);
  const noise2D = createNoise2D(prng);

  // Return wrapper function that matches the interface from ProceduralTerrain3
  return (x, y) => noise2D(x, y);
}

// Fractional Brownian Motion (fBm) - Multiple octaves of noise for natural terrain
// Creates fractal-like detail by layering noise at different frequencies and amplitudes
function fBm(
  noiseFunc,
  x,
  y,
  octaves = 6,
  frequency = 0.0005,
  persistence = 0.5,
  lacunarity = 2.0,
  amplitude = 1.0,
  offsetX = 0,
  offsetY = 0
) {
  let value = 0;
  let amp = amplitude;
  let freq = frequency;
  let maxValue = 0; // For normalization

  // Add multiple octaves (layers) of noise
  for (let i = 0; i < octaves; i++) {
    value += noiseFunc(x * freq + offsetX, y * freq + offsetY) * amp;
    maxValue += amp;

    // Each octave: frequency doubles, amplitude reduces by persistence
    freq *= lacunarity;
    amp *= persistence;
  }

  // Normalize to keep values in a reasonable range
  return maxValue > 0 ? value / maxValue : 0;
}

// Helper function for smoothstep
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Helper function for pingpong (triangle wave)
function pingpong(t, length) {
  const repeat = t % (2 * length);
  return length - Math.abs(repeat - length);
}

// Helper function for lerp
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Helper function for clamp
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// SHARED height calculation - Optimized for BOTW-style open world with erosion
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
    ridgeSharpness = 1.8,
    valleyDepth = 0.4,
    detailAmount = 0.18,
    biomeVariation = 0.5,
    // fBm controls
    fbmEnabled = true,
    fbmOctaves = 6,
    fbmPersistence = 0.5,
    fbmLacunarity = 2.0,
    fbmBaseFrequency = 0.0005,
    // New controls for improved terrain
    erosionAmount = 0.3,
    erosionSoftness = 0.4,
    smoothLowerPlanes = 0.6,
    altitudeVariation = 0.4,
    riverAmount = 0.2,
    riverWidth = 0.48,
    riverFalloff = 0.3,
  } = terrainControls;

  // === LARGE-SCALE REGIONS/BIOMES - Creates distinct biomes/areas ===
  const biomeFreq = 0.0006; // Lower frequency for larger regions
  const biomeNoise1 = noise(worldX * biomeFreq, worldZ * biomeFreq);
  const biomeNoise2 = noise2(
    worldX * biomeFreq * 1.5 + 1000,
    worldZ * biomeFreq * 1.5 + 1000
  );
  const regionMask = (biomeNoise1 * 0.65 + biomeNoise2 * 0.35) * 0.5 + 0.5; // 0 to 1

  // === BASE TERRAIN - Main height field using fBm ===
  let baseTerrain;
  if (fbmEnabled) {
    // fBm creates natural multi-scale detail
    const fbm1 = fBm(
      noise,
      worldX,
      worldZ,
      fbmOctaves,
      fbmBaseFrequency,
      fbmPersistence,
      fbmLacunarity,
      1.0,
      3000,
      3000
    );
    const fbm2 = fBm(
      noise2,
      worldX,
      worldZ,
      Math.floor(fbmOctaves * 0.8),
      fbmBaseFrequency * 0.6,
      fbmPersistence,
      fbmLacunarity,
      1.0,
      4000,
      4000
    );
    baseTerrain = fbm1 * 0.65 + fbm2 * 0.35;
  } else {
    // Fallback to original single-octave approach
    const baseFreq = 0.0005;
    const base1 = noise(worldX * baseFreq + 3000, worldZ * baseFreq + 3000);
    const base2 = noise2(
      worldX * baseFreq * 0.6 + 4000,
      worldZ * baseFreq * 0.6 + 4000
    );
    baseTerrain = base1 * 0.65 + base2 * 0.35;
  }

  // === EROSION EFFECT - Fake erosion using smoothstepped pingponged noise ===
  // Inspired by the example code - creates weathered, natural terrain
  let erosion = 0;
  if (erosionAmount > 0) {
    const erosionFbm = fbmEnabled
      ? fBm(
          noise3,
          worldX,
          worldZ,
          3,
          fbmBaseFrequency,
          fbmPersistence * 0.8,
          1.8,
          0.2,
          5000,
          5000
        )
      : noise3(
          worldX * fbmBaseFrequency + 5000,
          worldZ * fbmBaseFrequency + 5000
        ) * 0.2;

    // Smoothstep for gradual transitions
    erosion = smoothstep(0, 1, erosionFbm);

    // Apply softness (higher = more erosion)
    erosion = Math.pow(erosion, 1 + erosionSoftness);

    // Pingpong creates valleys/ridges pattern
    erosion = pingpong(erosion * 2, 1);
    erosion = clamp(erosion - 0.3, 0, 100);

    // Apply erosion to terrain (more erosion in higher areas)
    baseTerrain *= lerp(1, erosion, erosionAmount * baseTerrain);
  }

  // === ALTITUDE VARIATION - Adds regional height differences ===
  // Like the example code - creates highlands and lowlands
  const altitudeNoise = noise4(worldX * 0.0004 + 8000, worldZ * 0.0004 + 8000);
  const altitude = altitudeVariation * altitudeNoise * 1.4 - 0.75;
  baseTerrain = baseTerrain + altitude;

  // === RIDGED MOUNTAINS - Dramatic peaks and ridges with fBm ===
  let ridgeTerrain = 0;
  const mountainMask = Math.pow(
    Math.max(0, regionMask - flatnessThreshold),
    1.3
  );

  if (mountainMask > 0.01) {
    // Only generate mountains in mountain regions
    if (fbmEnabled) {
      const ridgeFreq = 0.0012;
      const ridgeFbm1 = fBm(
        noise3,
        worldX,
        worldZ,
        Math.floor(fbmOctaves * 0.7),
        ridgeFreq,
        fbmPersistence * 0.8,
        fbmLacunarity,
        1.0,
        0,
        0
      );
      let ridge1 = Math.abs(ridgeFbm1);
      ridge1 = 1 - ridge1; // Invert to create ridges

      const ridgeFbm2 = fBm(
        noise4,
        worldX,
        worldZ,
        Math.floor(fbmOctaves * 0.6),
        ridgeFreq * 2.3,
        fbmPersistence * 0.7,
        fbmLacunarity,
        1.0,
        2000,
        2000
      );
      let ridge2 = Math.abs(ridgeFbm2);
      ridge2 = 1 - ridge2;

      // Sharper peaks for dramatic mountains
      ridge1 = Math.pow(ridge1, Math.max(0.8, ridgeSharpness * 0.5));
      ridge1 = Math.pow(ridge1, 0.75); // Less smoothing = sharper peaks
      ridge2 = Math.pow(ridge2, Math.max(0.8, ridgeSharpness * 0.45));
      ridge2 = Math.pow(ridge2, 0.75);

      const ridgeBlend = ridge1 * 0.75 + ridge2 * 0.25;
      ridgeTerrain =
        Math.pow(ridgeBlend, 0.9) * mountainIntensity * mountainMask;
    } else {
      const ridgeFreq = 0.0012;
      let ridge1 = Math.abs(noise3(worldX * ridgeFreq, worldZ * ridgeFreq));
      ridge1 = 1 - ridge1;
      ridge1 = Math.pow(ridge1, Math.max(0.8, ridgeSharpness * 0.5));
      ridge1 = Math.pow(ridge1, 0.75);

      let ridge2 = Math.abs(
        noise4(worldX * ridgeFreq * 2.3 + 2000, worldZ * ridgeFreq * 2.3 + 2000)
      );
      ridge2 = 1 - ridge2;
      ridge2 = Math.pow(ridge2, Math.max(0.8, ridgeSharpness * 0.45));
      ridge2 = Math.pow(ridge2, 0.75);

      const ridgeBlend = ridge1 * 0.75 + ridge2 * 0.25;
      ridgeTerrain =
        Math.pow(ridgeBlend, 0.9) * mountainIntensity * mountainMask;
    }
  }

  // === RIVER VALLEYS - Optional river paths ===
  let rivers = 0;
  if (riverAmount > 0) {
    const riverFreq = fbmBaseFrequency * 0.8;
    const riverNoise = fbmEnabled
      ? fBm(noise2, worldX, worldZ, 4, riverFreq, 0.35, 2.0, 0.2, 9000, 9000)
      : noise2(worldX * riverFreq + 9000, worldZ * riverFreq + 9000) * 0.2;

    // Create river valleys using pingpong pattern
    rivers = (Math.abs(riverNoise) - 0.5) * 2;
    rivers = pingpong(rivers, 0.5);

    // Map to river width
    const mappedRiverWidth = lerp(riverWidth, 0.44, 0.5);
    const mappedRiverFalloff = riverFalloff * 0.3;
    rivers = clamp(
      lerp(1, 0, (rivers - mappedRiverWidth) / mappedRiverFalloff),
      0,
      1
    );
    rivers = (1 - smoothstep(0, 1, rivers)) * 0.5;
  }

  // === FLAT PLAINS - Smooth lower areas for fields ===
  // Like the example code - lerp with squared terms for smoother plains
  let flatnessFactor = 1.0;
  if (regionMask < flatnessThreshold) {
    // Smooth transition to flat - creates wide plains
    const flatnessT = regionMask / flatnessThreshold;
    flatnessFactor =
      Math.pow(flatnessT, 1.8) * flatnessSmooth + (1 - flatnessSmooth);
  }

  // Apply smooth lower planes effect (like example code)
  // This makes plains even flatter by squaring the terrain
  let height = baseTerrain + ridgeTerrain;

  // Smooth lower planes: lerp between squared and cubed terms
  // Higher smoothLowerPlanes = flatter plains
  height = lerp(height * height, height * height * height, smoothLowerPlanes);

  // === VALLEYS AND DEPRESSIONS - Negative features ===
  if (valleyDepth > 0) {
    const valleyFreq = 0.0009;
    const valleyNoise = noise3(
      worldX * valleyFreq + 5000,
      worldZ * valleyFreq + 5000
    );
    const valleys = Math.min(0, valleyNoise * valleyDepth * 0.3);
    height += valleys;
  }

  // === ROLLING HILLS - Medium frequency undulation ===
  const hillFreq = 0.002;
  let hills;
  if (fbmEnabled) {
    hills =
      fBm(
        noise4,
        worldX,
        worldZ,
        Math.floor(fbmOctaves * 0.5),
        hillFreq,
        fbmPersistence * 0.9,
        fbmLacunarity,
        1.0,
        6000,
        6000
      ) *
      0.15 *
      flatnessFactor; // Reduced and only in non-flat areas
  } else {
    hills =
      noise4(worldX * hillFreq + 6000, worldZ * hillFreq + 6000) *
      0.15 *
      flatnessFactor;
  }
  height += hills;

  // === FINE DETAIL - Surface texture ===
  const detailFreq = 0.007;
  let detail;
  if (fbmEnabled) {
    detail =
      fBm(
        noise2,
        worldX,
        worldZ,
        Math.floor(fbmOctaves * 0.4),
        detailFreq,
        fbmPersistence * 0.6,
        fbmLacunarity,
        1.0,
        7000,
        7000
      ) *
      detailAmount *
      0.4 * // Reduced further
      flatnessFactor;
  } else {
    detail =
      noise2(worldX * detailFreq + 7000, worldZ * detailFreq + 7000) *
      detailAmount *
      0.4 *
      flatnessFactor;
  }
  height += detail;

  // Apply flatness factor to reduce variation in flat areas
  height = height * flatnessFactor;

  // Subtract rivers (creates valleys)
  height = height - rivers * riverAmount;

  // Normalize and scale
  const finalHeight = height * heightScale;

  // Safety check
  if (!isFinite(finalHeight) || Math.abs(finalHeight) > 10000) {
    return 0;
  }

  return finalHeight;
}

// Single terrain chunk with SHADER-BASED coloring
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
  enableColorNoise,
  colorNoiseScale,
  enableTextureNoise,
  textureNoiseScale,
  textureFrequency,
  normalDetailStrength,
  contactShadowIntensity,
  contactShadowRadius,
  enableEnhancedAO,
  aoIntensity,
  aoHeightPower,
  valleyColor,
  grassColor,
  mountainColor,
  peakColor,
  heightValley,
  heightGrass,
  heightSlope,
  heightPeak,
  terrainControls,
  groundTexture,
  normalMapTexture,
  roughnessMapTexture,
  textureRepeat,
  useTexture,
}) {
  const meshRef = useRef();
  const heightMapRef = useRef(null);

  // Step 1: Generate base geometry (positions, indices, uvs) - NO vertex colors
  const geometry = useMemo(() => {
    const verticesPerSide = segments + 1;
    const positions = [];
    const indices = [];
    const uvs = [];

    const worldStartX = chunkX * chunkSize;
    const worldStartZ = chunkZ * chunkSize;
    const stepSize = chunkSize / segments;

    // Generate heightmap and store in ref for later use (for heightmap lookup)
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

    // Generate positions and UVs (NO vertex colors - colors come from shader)
    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        const height = heightMap[z][x];
        const worldX = worldStartX + x * stepSize;
        const worldZ = worldStartZ + z * stepSize;
        positions.push(worldX, worldZ, height);
        uvs.push(x / segments, z / segments);
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
    // NO color attribute - colors come from shader
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

  // Step 2: Create material with onBeforeCompile for SHADER-BASED height coloring
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

    const material = new THREE.MeshStandardMaterial({
      color: color,
      flatShading: false,
      roughness: 1.0, // Lower = shinier, higher = rougher (0.0 to 1.0)
      metalness: 0.0,
      envMapIntensity: 0.3,
    });

    // Apply ground texture if provided and enabled
    if (useTexture && groundTexture) {
      // Clone the texture to avoid conflicts across chunks
      const texture = groundTexture.clone();
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(textureRepeat, textureRepeat);
      texture.anisotropy = 16;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      material.map = texture;
    }

    // Apply normal map if provided and enabled
    if (useTexture && normalMapTexture) {
      const normalMap = normalMapTexture.clone();
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.wrapT = THREE.RepeatWrapping;
      normalMap.repeat.set(textureRepeat, textureRepeat);
      normalMap.anisotropy = 16;
      normalMap.minFilter = THREE.LinearMipmapLinearFilter;
      normalMap.magFilter = THREE.LinearFilter;
      material.normalMap = normalMap;
      // Normal scale - increased for more visible surface detail (0.5-2.0 range is typical)
      material.normalScale = new THREE.Vector2(0.8, 0.8); // Increased from 0.1 for more visible bumps
      // Set normal map type - "NormalGL" suggests OpenGL format
      material.normalMapType = THREE.TangentSpaceNormalMap;
    } else {
      // Debug log if not applied
      if (useTexture) {
        console.warn(
          "⚠️ Normal map not applied - texture missing or useTexture disabled"
        );
      }
    }

    // Apply roughness map if provided and enabled
    if (useTexture && roughnessMapTexture) {
      const roughnessMap = roughnessMapTexture.clone();
      roughnessMap.wrapS = THREE.RepeatWrapping;
      roughnessMap.wrapT = THREE.RepeatWrapping;
      roughnessMap.repeat.set(textureRepeat, textureRepeat);
      roughnessMap.anisotropy = 16;
      roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
      roughnessMap.magFilter = THREE.LinearFilter;
      material.roughnessMap = roughnessMap;
      // When using roughness map, set base roughness (lower = shinier, higher = rougher)
      material.roughness = 10; // Changed from 1.0 - adjust this value as needed
    } else {
      // Debug log if not applied
      if (useTexture) {
        console.warn(
          "⚠️ Roughness map not applied - texture missing or useTexture disabled"
        );
      }
    }

    // Shader setup will be done in useEffect (like GrassClaude2)
    // This ensures proper recompilation when dependencies change

    return material;
  }, [
    lodLevel,
    showColorDebug,
    segmentsPerChunk,
    enableHeightGradient,
    enableColorNoise,
    colorNoiseScale,
    enableTextureNoise,
    textureNoiseScale,
    textureFrequency,
    normalDetailStrength,
    valleyColor,
    grassColor,
    mountainColor,
    peakColor,
    heightValley,
    heightGrass,
    heightSlope,
    heightPeak,
    groundTexture,
    normalMapTexture,
    roughnessMapTexture,
    textureRepeat,
    useTexture,
  ]);

  // Setup shader compilation in useEffect (like GrassClaude2)
  // This ensures shaders are recompiled when dependencies change
  useEffect(() => {
    if (!material || !enableHeightGradient || showColorDebug) return;

    material.onBeforeCompile = (shader) => {
      // Add custom uniforms for height-based coloring
      shader.uniforms.colorValley = { value: new THREE.Color(valleyColor) };
      shader.uniforms.colorGrass = { value: new THREE.Color(grassColor) };
      shader.uniforms.colorMountain = {
        value: new THREE.Color(mountainColor),
      };
      shader.uniforms.colorPeak = { value: new THREE.Color(peakColor) };
      shader.uniforms.heightValley = { value: heightValley };
      shader.uniforms.heightGrass = { value: heightGrass };
      shader.uniforms.heightSlope = { value: heightSlope };
      shader.uniforms.heightPeak = { value: heightPeak };
      // Noise uniforms
      shader.uniforms.enableColorNoise = {
        value: enableColorNoise ? 1.0 : 0.0,
      };
      shader.uniforms.colorNoiseScale = { value: colorNoiseScale };
      shader.uniforms.enableTextureNoise = {
        value: enableTextureNoise ? 1.0 : 0.0,
      };
      shader.uniforms.textureNoiseScale = { value: textureNoiseScale };
      shader.uniforms.textureFrequency = { value: textureFrequency };
      // Texture blending uniform
      shader.uniforms.useTextureMap = {
        value: useTexture && groundTexture ? 1.0 : 0.0,
      };
      // Normal detail uniform
      shader.uniforms.normalDetailStrength = {
        value: normalDetailStrength,
      };
      // Contact Shadow uniforms
      shader.uniforms.contactShadowIntensity = {
        value: contactShadowIntensity,
      };
      shader.uniforms.contactShadowRadius = {
        value: contactShadowRadius,
      };
      // Enhanced AO uniforms
      shader.uniforms.enableEnhancedAO = {
        value: enableEnhancedAO ? 1.0 : 0.0,
      };
      shader.uniforms.aoIntensity = {
        value: aoIntensity,
      };
      shader.uniforms.aoHeightPower = {
        value: aoHeightPower,
      };

      // Modify fragment shader to add height-based coloring with noise
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
          #include <common>
          varying vec3 vWorldPos;
          uniform vec3 colorValley;
          uniform vec3 colorGrass;
          uniform vec3 colorMountain;
          uniform vec3 colorPeak;
          uniform float heightValley;
          uniform float heightGrass;
          uniform float heightSlope;
          uniform float heightPeak;
          uniform float enableColorNoise;
          uniform float colorNoiseScale;
          uniform float enableTextureNoise;
          uniform float textureNoiseScale;
          uniform float textureFrequency;
          uniform float useTextureMap;
          uniform float normalDetailStrength;
          uniform float contactShadowIntensity;
          uniform float contactShadowRadius;
          uniform float enableEnhancedAO;
          uniform float aoIntensity;
          uniform float aoHeightPower;
          
          // === OKLAB COLOR SPACE CONVERSION (like GrassClaude2) ===
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
          
          // Simple hash-based noise function for GPU (similar to Simplex noise)
          float hash(vec2 p) {
            p = mod(p, 256.0);
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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
          
          // Contact Shadow function - simulates ground shadows (like GrassClaude2)
          float getContactShadow(vec3 worldPos, vec3 lightDir) {
            float shadow = 1.0;
            
            // Height-based shadow - lower areas get darker shadows
            float heightPercent = smoothstep(heightValley, heightPeak, worldPos.y);
            float heightShadow = 1.0 - (1.0 - heightPercent) * 0.4;
            
            // Distance-based shadow - closer to ground = more shadow
            float groundDistance = worldPos.y;
            float distanceShadow = 1.0 - smoothstep(0.0, contactShadowRadius, groundDistance) * 0.6;
            
            // Combine shadow factors
            shadow = min(heightShadow, distanceShadow);
            
            // Apply contact shadow intensity
            shadow = mix(1.0, shadow, contactShadowIntensity);
            
            return shadow;
          }
          
          // Enhanced Ambient Occlusion function (like GrassClaude2)
          float getEnhancedAO(float currentHeight) {
            // Height-based AO - valleys darker, peaks brighter
            float heightPercent = smoothstep(heightValley, heightPeak, currentHeight);
            
            // Base AO intensity - darker at base (valleys), brighter at peaks
            float aoForHeight = mix(1.0 - aoIntensity, 1.0, pow(heightPercent, aoHeightPower));
            
            return aoForHeight;
          }
          
          // Get height color with OKLAB color space for better blending
          vec3 getHeightColor(float height) {
            vec3 color;
            if (height < heightGrass) {
              float t = smoothstep(heightValley, heightGrass, height);
              // Convert to OKLAB for better blending
              vec3 valleyOklab = rgbToOklab(colorValley);
              vec3 grassOklab = rgbToOklab(colorGrass);
              // Mix in OKLAB space
              vec3 mixedOklab = mix(valleyOklab, grassOklab, t);
              // Convert back to RGB
              color = oklabToRGB(mixedOklab);
            }
            else if (height < heightSlope) {
              float t = smoothstep(heightGrass, heightSlope, height);
              // Convert to OKLAB for better blending
              vec3 grassOklab = rgbToOklab(colorGrass);
              vec3 mountainOklab = rgbToOklab(colorMountain);
              // Mix in OKLAB space
              vec3 mixedOklab = mix(grassOklab, mountainOklab, t);
              // Convert back to RGB
              color = oklabToRGB(mixedOklab);
            }
            else {
              float t = smoothstep(heightSlope, heightPeak, height);
              // Convert to OKLAB for better blending
              vec3 mountainOklab = rgbToOklab(colorMountain);
              vec3 peakOklab = rgbToOklab(colorPeak);
              // Mix in OKLAB space
              vec3 mixedOklab = mix(mountainOklab, peakOklab, t);
              // Convert back to RGB
              color = oklabToRGB(mixedOklab);
            }
            return color;
          }
          `
      );

      // Modify vertex shader to pass world position
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
          #include <common>
          varying vec3 vWorldPos;
          `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `
          #include <worldpos_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
          #include <color_fragment>
          vec3 heightColor = getHeightColor(vWorldPos.y);
          
          // Current height for biome detection
          float currentHeight = vWorldPos.y;
          
          // === SLOPE-BASED COLORING (simplified) ===
          // Calculate approximate slope from position differences (fallback if normal not available)
          float slopeFactor = 0.0; // Disabled for now - will enable once normal is working
          
          // === BIOME-SPECIFIC COLOR VARIATION WITH SUBTLE HUE SHIFTS ===
          // Small-scale noise for subtle color variations (like texture noise)
          if (enableColorNoise > 0.5) {
            vec2 noisePos = vWorldPos.xz;
            
            // Determine which biome we're in
            bool isGrass = currentHeight < heightSlope;
            bool isMountain = currentHeight >= heightSlope && currentHeight < heightPeak;
            bool isPeak = currentHeight >= heightPeak;
            
            // Use higher frequency noise for smaller, subtle patterns (like texture noise)
            // Higher frequencies = smaller patterns = more natural variation
            float noise1 = noise(noisePos * 0.08);   // Small-scale variation
            float noise2 = noise(noisePos * 0.15);   // Medium-scale variation
            float noise3 = noise(noisePos * 0.25);   // Fine-scale variation
            
            // Combine noise layers - subtle variation
            float combinedNoise = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
            
            // Normalize to -1 to 1 range for variation
            float variation = (combinedNoise - 0.5) * 2.0;
            
            if (isGrass) {
              // === GRASS BIOME - Subtle green to yellow-green hue shifts ===
              // Create smooth hue shift from green to yellow-green
              float hueShift = variation * colorNoiseScale * 0.3; // Subtle hue shift
              
              // Mix between green and yellow-green (hue shift)
              // Green base: more green, less yellow
              // Yellow-green: more yellow, less green
              vec3 greenBase = vec3(0.2, 0.6, 0.15);      // Base green
              vec3 yellowTint = vec3(0.4, 0.6, 0.1);      // Yellow-green tint
              
              // Convert to OKLAB for better blending
              vec3 greenBaseOklab = rgbToOklab(greenBase);
              vec3 yellowTintOklab = rgbToOklab(yellowTint);
              // Mix in OKLAB space
              vec3 hueVariationOklab = mix(greenBaseOklab, yellowTintOklab, smoothstep(-0.5, 0.5, variation));
              // Convert back to RGB
              vec3 hueVariation = oklabToRGB(hueVariationOklab);
              
              // Mix with base height color - use OKLAB for better blending
              vec3 heightColorOklab = rgbToOklab(heightColor);
              vec3 hueVariationOklab2 = rgbToOklab(hueVariation);
              vec3 mixedOklab = mix(heightColorOklab, hueVariationOklab2, colorNoiseScale * 0.4);
              heightColor = oklabToRGB(mixedOklab);
            }
            else if (isMountain) {
              // === MOUNTAIN BIOME - Subtle rock color variations ===
              // Create subtle brown to gray variations
              float hueShift = variation * colorNoiseScale * 0.25;
              
              // Base rock colors - subtle variations
              vec3 brownBase = vec3(0.45, 0.38, 0.28);    // Brown base
              vec3 grayTint = vec3(0.42, 0.42, 0.45);     // Gray tint
              vec3 tanTint = vec3(0.5, 0.45, 0.35);       // Tan tint
              
              // Convert to OKLAB for better blending
              vec3 brownBaseOklab = rgbToOklab(brownBase);
              vec3 grayTintOklab = rgbToOklab(grayTint);
              vec3 tanTintOklab = rgbToOklab(tanTint);
              
              // Mix between rock colors in OKLAB space
              vec3 rockVariationOklab;
              if (variation < 0.0) {
                rockVariationOklab = mix(brownBaseOklab, grayTintOklab, abs(variation));
              } else {
                rockVariationOklab = mix(brownBaseOklab, tanTintOklab, variation);
              }
              // Convert back to RGB
              vec3 rockVariation = oklabToRGB(rockVariationOklab);
              
              // Subtle blend with base color - use OKLAB for better blending
              vec3 heightColorOklab = rgbToOklab(heightColor);
              vec3 rockVariationOklab2 = rgbToOklab(rockVariation);
              vec3 mixedOklab = mix(heightColorOklab, rockVariationOklab2, colorNoiseScale * 0.35);
              heightColor = oklabToRGB(mixedOklab);
            }
            else if (isPeak) {
              // === PEAK BIOME - Subtle snow variations ===
              // Create subtle white to gray variations
              float hueShift = variation * colorNoiseScale * 0.2;
              
              // Snow colors - subtle variations
              vec3 snowBase = vec3(0.9, 0.9, 0.95);        // Base snow
              vec3 graySnow = vec3(0.85, 0.88, 0.9);      // Gray snow
              vec3 rockTint = vec3(0.75, 0.75, 0.8);      // Rock tint
              
              // Convert to OKLAB for better blending
              vec3 snowBaseOklab = rgbToOklab(snowBase);
              vec3 graySnowOklab = rgbToOklab(graySnow);
              vec3 rockTintOklab = rgbToOklab(rockTint);
              
              // Mix between snow colors in OKLAB space
              vec3 snowVariationOklab;
              if (variation < 0.0) {
                snowVariationOklab = mix(snowBaseOklab, graySnowOklab, abs(variation));
              } else {
                snowVariationOklab = mix(snowBaseOklab, rockTintOklab, variation);
              }
              // Convert back to RGB
              vec3 snowVariation = oklabToRGB(snowVariationOklab);
              
              // Subtle blend - use OKLAB for better blending
              vec3 heightColorOklab = rgbToOklab(heightColor);
              vec3 snowVariationOklab2 = rgbToOklab(snowVariation);
              vec3 mixedOklab = mix(heightColorOklab, snowVariationOklab2, colorNoiseScale * 0.3);
              heightColor = oklabToRGB(mixedOklab);
            }
            else {
              // === VALLEY BIOME - Subtle dark green variations ===
              // Create subtle dark green variations
              float hueShift = variation * colorNoiseScale * 0.2;
              
              // Valley colors - subtle variations
              vec3 darkGreenBase = vec3(0.15, 0.35, 0.12);  // Base dark green
              vec3 wetGreenTint = vec3(0.18, 0.4, 0.15);    // Wet green tint
              vec3 mossTint = vec3(0.12, 0.38, 0.18);       // Moss tint
              
              // Convert to OKLAB for better blending
              vec3 darkGreenBaseOklab = rgbToOklab(darkGreenBase);
              vec3 wetGreenTintOklab = rgbToOklab(wetGreenTint);
              vec3 mossTintOklab = rgbToOklab(mossTint);
              
              // Mix between valley colors in OKLAB space
              vec3 valleyVariationOklab;
              if (variation < 0.0) {
                valleyVariationOklab = mix(darkGreenBaseOklab, wetGreenTintOklab, abs(variation));
              } else {
                valleyVariationOklab = mix(darkGreenBaseOklab, mossTintOklab, variation);
              }
              // Convert back to RGB
              vec3 valleyVariation = oklabToRGB(valleyVariationOklab);
              
              // Subtle blend - use OKLAB for better blending
              vec3 heightColorOklab = rgbToOklab(heightColor);
              vec3 valleyVariationOklab2 = rgbToOklab(valleyVariation);
              vec3 mixedOklab = mix(heightColorOklab, valleyVariationOklab2, colorNoiseScale * 0.3);
              heightColor = oklabToRGB(mixedOklab);
            }
          }
          
          // === CONTACT SHADOWS (like GrassClaude2) ===
          // Ground shadows for depth and realism
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          float contactShadow = getContactShadow(vWorldPos, lightDir);
          heightColor *= contactShadow;
          
          // === ENHANCED AMBIENT OCCLUSION (like GrassClaude2) ===
          // Height-based AO - valleys darker, peaks brighter
          if (enableEnhancedAO > 0.5) {
            float ao = getEnhancedAO(currentHeight);
            heightColor *= ao;
          }
          
          // === GENERAL TEXTURE DETAIL NOISE ===
          // Apply texture detail noise for surface variation
          if (enableTextureNoise > 0.5) {
            vec2 texPos = vWorldPos.xz * textureFrequency;
            float n1 = noise(texPos);
            float n2 = noise(texPos * 2.2);
            float n3 = noise(texPos * 3.5);
            
            // Multi-octave noise for more natural detail
            float textureDetail = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * textureNoiseScale * 2.5;
            float texVariation = 1.0 + textureDetail * 0.4;
            heightColor *= texVariation;
          }
          
          // Blend texture with height colors if texture is enabled
          #ifdef USE_MAP
            if (useTextureMap > 0.5) {
              // Multiply texture (already applied to diffuseColor) with height color
              // Use softer blending for better results
              diffuseColor.rgb = mix(diffuseColor.rgb, heightColor * diffuseColor.rgb, 0.7);
            } else {
              // Use texture as-is without height blending
            }
          #else
            // No texture, use height colors directly
            diffuseColor.rgb = heightColor;
          #endif
          `
      );

      // Add procedural normal detail to make terrain less flat
      // Use normal_fragment_maps (like GrassClaude2) - applies normal map first
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `
          #include <normal_fragment_maps>
          
          // === PROCEDURAL NORMAL DETAIL ===
          // Add extra surface detail using noise to make terrain less flat
          // This adds small bumps and variations (works with normal map)
          // normal is already processed by normal_fragment_maps above
          if (normalDetailStrength > 0.01) {
            // Use high-frequency noise for small surface details
            vec2 normalPos = vWorldPos.xz * 0.15;
            
            // Multi-octave noise for more realistic detail
            float n1 = noise(normalPos);
            float n2 = noise(normalPos * 2.3);
            float n3 = noise(normalPos * 4.1);
            float n4 = noise(normalPos * 1.7);
            
            // Combine noise for surface detail - make it more visible
            float detailX = (n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1) * normalDetailStrength * 4.0;
            float detailY = noise(normalPos * 3.3) * normalDetailStrength * 2.0;
            float detailZ = noise(normalPos * 1.9) * normalDetailStrength * 4.0;
            
            // Perturb normal directly - simpler and more effective
            // normal is already in tangent space from normal_fragment_maps
            vec3 baseNormal = normalize(normal);
            vec3 detailNormal = baseNormal + vec3(detailX, detailY, detailZ);
            detailNormal = normalize(detailNormal);
            
            // Mix with original normal - use full strength for more visible effect
            normal = normalize(mix(baseNormal, detailNormal, normalDetailStrength));
          }
          `
      );

      material.userData.shader = shader;
    };

    // Force material recompilation (like GrassClaude2)
    material.needsUpdate = true;

    // Cleanup
    return () => {
      // Cleanup if needed
    };
  }, [
    material,
    enableHeightGradient,
    showColorDebug,
    enableColorNoise,
    colorNoiseScale,
    enableTextureNoise,
    textureNoiseScale,
    textureFrequency,
    normalDetailStrength,
    valleyColor,
    grassColor,
    mountainColor,
    peakColor,
    heightValley,
    heightGrass,
    heightSlope,
    heightPeak,
    useTexture,
    groundTexture,
  ]);

  // Update texture settings when they change
  useEffect(() => {
    if (groundTexture) {
      groundTexture.needsUpdate = true;
    }
  }, [groundTexture, textureRepeat, useTexture]);

  // Update shader uniforms when noise settings change
  useEffect(() => {
    if (material && material.userData && material.userData.shader) {
      const shader = material.userData.shader;
      if (shader.uniforms) {
        if (shader.uniforms.enableColorNoise !== undefined) {
          shader.uniforms.enableColorNoise.value = enableColorNoise ? 1.0 : 0.0;
        }
        if (shader.uniforms.colorNoiseScale) {
          shader.uniforms.colorNoiseScale.value = colorNoiseScale;
        }
        if (shader.uniforms.enableTextureNoise !== undefined) {
          shader.uniforms.enableTextureNoise.value = enableTextureNoise
            ? 1.0
            : 0.0;
        }
        if (shader.uniforms.textureNoiseScale) {
          shader.uniforms.textureNoiseScale.value = textureNoiseScale;
        }
        if (shader.uniforms.textureFrequency) {
          shader.uniforms.textureFrequency.value = textureFrequency;
        }
        if (shader.uniforms.useTextureMap !== undefined) {
          shader.uniforms.useTextureMap.value =
            useTexture && groundTexture ? 1.0 : 0.0;
        }
        if (shader.uniforms.normalDetailStrength) {
          shader.uniforms.normalDetailStrength.value = normalDetailStrength;
        }
        if (shader.uniforms.contactShadowIntensity) {
          shader.uniforms.contactShadowIntensity.value = contactShadowIntensity;
        }
        if (shader.uniforms.contactShadowRadius) {
          shader.uniforms.contactShadowRadius.value = contactShadowRadius;
        }
        if (shader.uniforms.enableEnhancedAO !== undefined) {
          shader.uniforms.enableEnhancedAO.value = enableEnhancedAO ? 1.0 : 0.0;
        }
        if (shader.uniforms.aoIntensity) {
          shader.uniforms.aoIntensity.value = aoIntensity;
        }
        if (shader.uniforms.aoHeightPower) {
          shader.uniforms.aoHeightPower.value = aoHeightPower;
        }
        // Also update color uniforms if they change
        if (shader.uniforms.colorValley) {
          shader.uniforms.colorValley.value.set(valleyColor);
        }
        if (shader.uniforms.colorGrass) {
          shader.uniforms.colorGrass.value.set(grassColor);
        }
        if (shader.uniforms.colorMountain) {
          shader.uniforms.colorMountain.value.set(mountainColor);
        }
        if (shader.uniforms.colorPeak) {
          shader.uniforms.colorPeak.value.set(peakColor);
        }
        if (shader.uniforms.heightValley) {
          shader.uniforms.heightValley.value = heightValley;
        }
        if (shader.uniforms.heightGrass) {
          shader.uniforms.heightGrass.value = heightGrass;
        }
        if (shader.uniforms.heightSlope) {
          shader.uniforms.heightSlope.value = heightSlope;
        }
        if (shader.uniforms.heightPeak) {
          shader.uniforms.heightPeak.value = heightPeak;
        }
      }
    }
  }, [
    material,
    enableColorNoise,
    colorNoiseScale,
    enableTextureNoise,
    textureNoiseScale,
    textureFrequency,
    normalDetailStrength,
    contactShadowIntensity,
    contactShadowRadius,
    enableEnhancedAO,
    aoIntensity,
    aoHeightPower,
    valleyColor,
    grassColor,
    mountainColor,
    peakColor,
    heightValley,
    heightGrass,
    heightSlope,
    heightPeak,
    useTexture,
    groundTexture,
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

// Main terrain system - Optimized for BOTW-style open world with SHADER-BASED coloring
export const ProceduralTerrain9 = ({
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
  // Load all terrain textures
  const groundTexture = useLoader(
    TextureLoader,
    "/textures/Grass005_1K-JPG_Color.jpg"
  );
  const normalMapTexture = useLoader(
    TextureLoader,
    "/textures/Ground036_1K-JPG_NormalGL.jpg"
  );
  const roughnessMapTexture = useLoader(
    TextureLoader,
    "/textures/Ground036_1K-JPG_Roughness.jpg"
  );

  // Initialize texture settings once and verify loading
  useEffect(() => {
    if (groundTexture) {
      console.log("✅ Color texture loaded:", groundTexture.image?.src);
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.minFilter = THREE.LinearMipmapLinearFilter;
      groundTexture.magFilter = THREE.LinearFilter;
      groundTexture.generateMipmaps = true;
      groundTexture.anisotropy = 16;
    } else {
      console.warn("⚠️ Color texture not loaded!");
    }
    if (normalMapTexture) {
      console.log("✅ Normal map texture loaded:", normalMapTexture.image?.src);
      normalMapTexture.wrapS = THREE.RepeatWrapping;
      normalMapTexture.wrapT = THREE.RepeatWrapping;
      normalMapTexture.minFilter = THREE.LinearMipmapLinearFilter;
      normalMapTexture.magFilter = THREE.LinearFilter;
      normalMapTexture.generateMipmaps = true;
      normalMapTexture.anisotropy = 16;
    } else {
      console.warn("⚠️ Normal map texture not loaded!");
    }
    if (roughnessMapTexture) {
      console.log(
        "✅ Roughness map texture loaded:",
        roughnessMapTexture.image?.src
      );
      roughnessMapTexture.wrapS = THREE.RepeatWrapping;
      roughnessMapTexture.wrapT = THREE.RepeatWrapping;
      roughnessMapTexture.minFilter = THREE.LinearMipmapLinearFilter;
      roughnessMapTexture.magFilter = THREE.LinearFilter;
      roughnessMapTexture.generateMipmaps = true;
      roughnessMapTexture.anisotropy = 16;
    } else {
      console.warn("⚠️ Roughness map texture not loaded!");
    }
  }, [groundTexture, normalMapTexture, roughnessMapTexture]);

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
    enableColorNoise,
    colorNoiseScale,
    enableTextureNoise,
    textureNoiseScale,
    textureFrequency,
    normalDetailStrength,
    contactShadowIntensity,
    contactShadowRadius,
    enableEnhancedAO,
    aoIntensity,
    aoHeightPower,
    valleyColor,
    grassColor,
    mountainColor,
    peakColor,
    heightValley,
    heightGrass,
    heightSlope,
    heightPeak,
    mountainIntensity,
    flatnessThreshold,
    flatnessSmooth,
    ridgeSharpness,
    valleyDepth,
    detailAmount,
    useTexture,
    textureRepeat,
    fbmEnabled,
    fbmOctaves,
    fbmPersistence,
    fbmLacunarity,
    fbmBaseFrequency,
    erosionAmount,
    erosionSoftness,
    smoothLowerPlanes,
    altitudeVariation,
    riverAmount,
    riverWidth,
    riverFalloff,
  } = useControls("🗻 BOTW Terrain v7 (Enhanced)", {
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
      label: "🎨 Enable Height Gradient (Shader)",
    },
    enableColorNoise: {
      value: true,
      label: "🎨 Enable Color Variation (Noise)",
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
      label: "🔬 Enable Texture Detail (Noise)",
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
    normalDetailStrength: {
      value: 0.3,
      min: 0,
      max: 1.0,
      step: 0.05,
      label: "🔍 Normal Detail Strength (surface bumps)",
    },
    contactShadowIntensity: {
      value: 0.5,
      min: 0,
      max: 1.0,
      step: 0.05,
      label: "🌑 Contact Shadow Intensity",
    },
    contactShadowRadius: {
      value: 10.0,
      min: 1.0,
      max: 50.0,
      step: 1.0,
      label: "🌑 Contact Shadow Radius",
    },
    enableEnhancedAO: {
      value: true,
      label: "🌓 Enable Enhanced Ambient Occlusion",
    },
    aoIntensity: {
      value: 0.3,
      min: 0,
      max: 0.8,
      step: 0.05,
      label: "🌓 AO Intensity (valleys darker)",
    },
    aoHeightPower: {
      value: 2.0,
      min: 0.5,
      max: 4.0,
      step: 0.1,
      label: "🌓 AO Height Power (fade curve)",
    },
    // BOTW-inspired color palette
    valleyColor: {
      value: "#133808", // Darker green for valleys
      label: "🌿 Valley Color (Low/Flat)",
    },
    grassColor: {
      value: "#1d4110", // Vibrant green for plains
      label: "🌾 Grass Color (Mid/Gentle)",
    },
    mountainColor: {
      value: "#2d5016", // Brown-gray for mountains
      label: "⛰️ Mountain Color (High)",
    },
    peakColor: {
      value: "#d4d4d4", // Light gray for peaks/snow
      label: "🏔️ Peak Color (Highest/Snow)",
    },
    heightValley: {
      value: -heightScale * 0.3,
      min: -100,
      max: 0,
      step: 1,
      label: "Valley Height (start gradient)",
    },
    heightGrass: {
      value: 0,
      min: -50,
      max: 50,
      step: 1,
      label: "Grass Height",
    },
    heightSlope: {
      value: heightScale * 0.4,
      min: 0,
      max: 200,
      step: 1,
      label: "Slope/Mountain Height",
    },
    heightPeak: {
      value: heightScale * 0.8,
      min: 140,
      max: 300,
      step: 1,
      label: "Peak Height (snow line)",
    },
    mountainIntensity: {
      value: 4.5,
      min: 0,
      max: 8,
      step: 0.1,
      label: "🏔️ Mountain Intensity (dramatic peaks)",
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
      value: 1.8,
      min: 0.5,
      max: 5,
      step: 0.1,
      label: "⛰️ Ridge Sharpness (softer to prevent spikes)",
    },
    valleyDepth: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
      label: "🏞️ Valley Depth",
    },
    detailAmount: {
      value: 0.04,
      min: 0,
      max: 0.5,
      step: 0.01,
      label: "✨ Detail Amount (reduced to prevent spikes)",
    },
    useTexture: {
      value: false,
      label: "🖼️ Use Ground Texture",
    },
    textureRepeat: {
      value: 60.0,
      min: 1,
      max: 100,
      step: 0.5,
      label: "🖼️ Texture Repeat (per chunk)",
    },
    // fBm (Fractional Brownian Motion) controls
    fbmEnabled: {
      value: true,
      label: "🌊 Enable fBm (Fractional Brownian Motion)",
    },
    fbmOctaves: {
      value: 6,
      min: 2,
      max: 10,
      step: 1,
      label: "🌊 fBm Octaves (more = more detail)",
    },
    fbmPersistence: {
      value: 0.5,
      min: 0.1,
      max: 1.0,
      step: 0.05,
      label: "🌊 fBm Persistence (how much each octave contributes)",
    },
    fbmLacunarity: {
      value: 2.0,
      min: 1.5,
      max: 3.0,
      step: 0.1,
      label: "🌊 fBm Lacunarity (frequency scaling between octaves)",
    },
    fbmBaseFrequency: {
      value: 0.0005,
      min: 0.0001,
      max: 0.002,
      step: 0.0001,
      label: "🌊 fBm Base Frequency (overall terrain scale)",
    },
    // New terrain generation controls
    erosionAmount: {
      value: 0.3,
      min: 0,
      max: 1.0,
      step: 0.05,
      label: "🌊 Erosion Amount (weathering effect)",
    },
    erosionSoftness: {
      value: 0.4,
      min: 0,
      max: 1.0,
      step: 0.05,
      label: "🌊 Erosion Softness (smoother erosion)",
    },
    smoothLowerPlanes: {
      value: 0.6,
      min: 0,
      max: 1.0,
      step: 0.05,
      label: "🌾 Smooth Lower Planes (flatter fields)",
    },
    altitudeVariation: {
      value: 0.4,
      min: 0,
      max: 1.0,
      step: 0.05,
      label: "⛰️ Altitude Variation (highlands/lowlands)",
    },
    riverAmount: {
      value: 0.2,
      min: 0,
      max: 1.0,
      step: 0.05,
      label: "🏞️ River Amount (river valleys)",
    },
    riverWidth: {
      value: 0.48,
      min: 0.3,
      max: 0.6,
      step: 0.01,
      label: "🏞️ River Width",
    },
    riverFalloff: {
      value: 0.3,
      min: 0.1,
      max: 0.5,
      step: 0.05,
      label: "🏞️ River Falloff (valley edges)",
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
          console.log(`✅ ProceduralTerrain5 (Shader) ready with ${mode}`);
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
      // fBm controls
      fbmEnabled,
      fbmOctaves,
      fbmPersistence,
      fbmLacunarity,
      fbmBaseFrequency,
      // New terrain generation controls
      erosionAmount,
      erosionSoftness,
      smoothLowerPlanes,
      altitudeVariation,
      riverAmount,
      riverWidth,
      riverFalloff,
    }),
    [
      mountainIntensity,
      flatnessThreshold,
      flatnessSmooth,
      ridgeSharpness,
      valleyDepth,
      detailAmount,
      fbmEnabled,
      fbmOctaves,
      fbmPersistence,
      fbmLacunarity,
      fbmBaseFrequency,
      erosionAmount,
      erosionSoftness,
      smoothLowerPlanes,
      altitudeVariation,
      riverAmount,
      riverWidth,
      riverFalloff,
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
      console.log("✅ ProceduralTerrain5 (Shader) heightmap ready");
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
          enableColorNoise={enableColorNoise}
          colorNoiseScale={colorNoiseScale}
          enableTextureNoise={enableTextureNoise}
          textureNoiseScale={textureNoiseScale}
          textureFrequency={textureFrequency}
          normalDetailStrength={normalDetailStrength}
          contactShadowIntensity={contactShadowIntensity}
          contactShadowRadius={contactShadowRadius}
          enableEnhancedAO={enableEnhancedAO}
          aoIntensity={aoIntensity}
          aoHeightPower={aoHeightPower}
          valleyColor={valleyColor}
          grassColor={grassColor}
          mountainColor={mountainColor}
          peakColor={peakColor}
          heightValley={heightValley}
          heightGrass={heightGrass}
          heightSlope={heightSlope}
          heightPeak={heightPeak}
          terrainControls={terrainControls}
          groundTexture={groundTexture}
          normalMapTexture={normalMapTexture}
          roughnessMapTexture={roughnessMapTexture}
          textureRepeat={textureRepeat}
          useTexture={useTexture}
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
            enableColorNoise={enableColorNoise}
            colorNoiseScale={colorNoiseScale}
            enableTextureNoise={enableTextureNoise}
            textureNoiseScale={textureNoiseScale}
            textureFrequency={textureFrequency}
            normalDetailStrength={normalDetailStrength}
            contactShadowIntensity={contactShadowIntensity}
            contactShadowRadius={contactShadowRadius}
            enableEnhancedAO={enableEnhancedAO}
            aoIntensity={aoIntensity}
            aoHeightPower={aoHeightPower}
            valleyColor={valleyColor}
            grassColor={grassColor}
            mountainColor={mountainColor}
            peakColor={peakColor}
            heightValley={heightValley}
            heightGrass={heightGrass}
            heightSlope={heightSlope}
            heightPeak={heightPeak}
            terrainControls={terrainControls}
            groundTexture={groundTexture}
            normalMapTexture={normalMapTexture}
            roughnessMapTexture={roughnessMapTexture}
            textureRepeat={textureRepeat}
            useTexture={useTexture}
          />
        );
      })}
    </group>
  );
};
