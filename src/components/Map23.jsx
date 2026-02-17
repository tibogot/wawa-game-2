import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import alea from "alea";
import ClaudeGrassQuick7 from "./ClaudeGrassQuick7";
import useClaudeGrassQuickControls7 from "./useClaudeGrassQuickControls7";
import useMap23Controls from "./useMap23Controls";

// ── Noise utilities ──────────────────────────────────────────────

function createNoiseGenerator(seed) {
  const prng = alea(seed);
  const noise2D = createNoise2D(prng);
  return (x, y) => noise2D(x, y);
}

function fBm(noiseFunc, x, y, octaves, frequency, persistence, lacunarity) {
  let total = 0;
  let amplitude = 1;
  let maxValue = 0;
  let freq = frequency;

  for (let i = 0; i < octaves; i++) {
    total += noiseFunc(x * freq, y * freq) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    freq *= lacunarity;
  }

  return total / maxValue;
}

// ── Terrain height function ──────────────────────────────────────

function getTerrainHeight(x, z, noise1, noise2, config) {
  const { heightAmplitude, noiseFrequency, octaves } = config;

  // Base rolling hills
  const baseHeight =
    fBm(noise1, x, z, octaves, noiseFrequency, 0.5, 2.0) * heightAmplitude;

  // Secondary softer bumps
  const secondaryHeight =
    fBm(noise2, x + 500, z + 500, Math.max(2, octaves - 1), noiseFrequency * 2.0, 0.4, 2.0) *
    heightAmplitude * 0.3;

  // Fine detail
  const detail =
    fBm(noise1, x + 2000, z + 2000, 2, noiseFrequency * 5.0, 0.3, 2.0) *
    heightAmplitude * 0.08;

  let height = baseHeight + secondaryHeight + detail;

  return height;
}

// ── Component ────────────────────────────────────────────────────

export const Map23 = forwardRef(
  (
    {
      scale = 1,
      position = [0, 0, 0],
      onTerrainReady,
      characterPosition,
      ...props
    },
    ref
  ) => {
    const meshRef = useRef(null);
    const terrainControls = useMap23Controls();
    const grassControls = useClaudeGrassQuickControls7();

    const {
      terrainSize,
      segments,
      heightAmplitude,
      noiseFrequency,
      octaves,
      seed,
    } = terrainControls;

    // Noise generators (stable per seed)
    const noiseGenerators = useMemo(
      () => ({
        noise1: createNoiseGenerator(seed),
        noise2: createNoiseGenerator(seed + 1000),
      }),
      [seed]
    );

    const terrainConfig = useMemo(
      () => ({ heightAmplitude, noiseFrequency, octaves }),
      [heightAmplitude, noiseFrequency, octaves]
    );

    // ── Build geometry ────────────────────────────────────────────
    const geometry = useMemo(() => {
      const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
      const positions = geo.attributes.position.array;

      for (let i = 0; i < positions.length; i += 3) {
        const worldX = positions[i];
        const worldZ = positions[i + 1]; // PlaneGeometry is XY, rotated later
        positions[i + 2] = getTerrainHeight(
          worldX,
          worldZ,
          noiseGenerators.noise1,
          noiseGenerators.noise2,
          terrainConfig
        );
      }

      geo.computeVertexNormals();
      return geo;
    }, [terrainSize, segments, noiseGenerators, terrainConfig]);

    // Clean up geometry on change
    useEffect(() => {
      return () => geometry.dispose();
    }, [geometry]);

    // ── Build heightmap texture for grass ─────────────────────────
    const heightmapData = useMemo(() => {
      const texSize = 512;
      const data = new Float32Array(texSize * texSize);
      let minH = Infinity;
      let maxH = -Infinity;

      for (let y = 0; y < texSize; y++) {
        for (let x = 0; x < texSize; x++) {
          // Map texture coords to world coords matching the grass shader's UV mapping:
          // shader does: remap(worldX, -terrainSize*0.5, terrainSize*0.5, 0.0, 1.0)
          // so texel (x/texSize) corresponds to worldX = -terrainSize/2 + (x/texSize)*terrainSize
          const worldX = -terrainSize / 2 + (x / texSize) * terrainSize;
          // shader does: remap(worldZ, -terrainSize*0.5, terrainSize*0.5, 1.0, 0.0)
          // so texel row y corresponds to worldZ = terrainSize/2 - (y/texSize)*terrainSize
          const worldZ = terrainSize / 2 - (y / texSize) * terrainSize;

          // PlaneGeometry is rotated -PI/2 around X: local(x, y, z) → world(x, z, -y)
          // So terrain at world (wx, wz) was generated with noise(wx, -wz)
          // We must negate worldZ to match the rotated geometry
          const h = getTerrainHeight(
            worldX,
            -worldZ,
            noiseGenerators.noise1,
            noiseGenerators.noise2,
            terrainConfig
          );

          const idx = y * texSize + x;
          data[idx] = h;
          if (h < minH) minH = h;
          if (h > maxH) maxH = h;
        }
      }

      // Normalize to 0-1
      const heightRange = maxH - minH;
      if (heightRange > 0) {
        for (let i = 0; i < data.length; i++) {
          data[i] = (data[i] - minH) / heightRange;
        }
      }

      const texture = new THREE.DataTexture(
        data,
        texSize,
        texSize,
        THREE.RedFormat,
        THREE.FloatType
      );
      texture.needsUpdate = true;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // offset: shader does blade_y = sample * heightScale - heightOffset
      // When sample=0 (min), blade_y should = minH → heightOffset = -minH
      const offsetAdjustment = 0.3;
      const heightOffset = minH !== Infinity ? -minH + offsetAdjustment : 0;

      return {
        texture,
        heightScale: heightRange > 0 ? heightRange : 1,
        heightOffset,
      };
    }, [terrainSize, noiseGenerators, terrainConfig]);

    // ── Terrain material with height-based coloring ───────────────
    const material = useMemo(() => {
      const mat = new THREE.MeshStandardMaterial({
        flatShading: false,
        roughness: 0.95,
        metalness: 0.0,
      });

      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>
          varying float vHeight;
          varying vec3 vWorldNormalTerrain;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vHeight = position.z;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>
          vWorldNormalTerrain = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
          varying float vHeight;
          varying vec3 vWorldNormalTerrain;

          vec3 getTerrainColor(float height, float slope) {
            vec3 grassDark  = vec3(0.18, 0.32, 0.08);
            vec3 grassLight = vec3(0.30, 0.48, 0.15);
            vec3 dirt       = vec3(0.40, 0.30, 0.18);
            vec3 rock       = vec3(0.42, 0.40, 0.36);

            // Grass color varies with height
            float grassT = smoothstep(-2.0, 8.0, height);
            vec3 grassCol = mix(grassDark, grassLight, grassT);

            // Slope-based blend: steep = rock/dirt, flat = grass
            float slopeBlend = smoothstep(0.7, 0.4, slope);
            vec3 col = mix(grassCol, mix(dirt, rock, smoothstep(5.0, 15.0, height)), slopeBlend);

            return col;
          }`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float slope = dot(vWorldNormalTerrain, vec3(0.0, 1.0, 0.0));
          diffuseColor.rgb = getTerrainColor(vHeight, slope);`
        );
      };

      return mat;
    }, []);

    useEffect(() => {
      return () => material.dispose();
    }, [material]);

    // ── Forward ref ───────────────────────────────────────────────
    useEffect(() => {
      if (!ref) return;
      const current = meshRef.current ?? null;
      if (typeof ref === "function") ref(current);
      else ref.current = current;
      return () => {
        if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    }, [ref, geometry]);

    // ── Terrain ready callback ────────────────────────────────────
    useEffect(() => {
      if (!onTerrainReady) return;
      const timer = setTimeout(() => onTerrainReady(meshRef.current ?? null), 100);
      return () => clearTimeout(timer);
    }, [onTerrainReady, geometry]);

    return (
      <group {...props}>
        {/* Terrain */}
        <RigidBody type="fixed" colliders="trimesh" restitution={0} friction={1}>
          <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            castShadow
          />
        </RigidBody>

        {/* Grass */}
        {grassControls.enabled && (
          <ClaudeGrassQuick7
            playerPosition={characterPosition || [0, 0, 0]}
            externalHeightmap={heightmapData.texture}
            terrainSize={terrainSize}
            heightScale={heightmapData.heightScale}
            heightOffset={heightmapData.heightOffset}
            grassWidth={grassControls.grassWidth}
            grassHeight={grassControls.grassHeight}
            grassDensity={grassControls.grassDensity}
            lodDistance={grassControls.lodDistance}
            maxDistance={grassControls.maxDistance}
            patchSize={grassControls.patchSize}
            gridSize={grassControls.gridSize}
            patchSpacing={grassControls.patchSpacing}
            windEnabled={grassControls.windEnabled}
            windStrength={grassControls.windStrength}
            windDirectionScale={grassControls.windDirectionScale}
            windDirectionSpeed={grassControls.windDirectionSpeed}
            windStrengthScale={grassControls.windStrengthScale}
            windStrengthSpeed={grassControls.windStrengthSpeed}
            playerInteractionEnabled={grassControls.playerInteractionEnabled}
            playerInteractionRepel={grassControls.playerInteractionRepel}
            playerInteractionRange={grassControls.playerInteractionRange}
            playerInteractionStrength={grassControls.playerInteractionStrength}
            playerInteractionHeightThreshold={grassControls.playerInteractionHeightThreshold}
            baseColor1={grassControls.baseColor1}
            baseColor2={grassControls.baseColor2}
            tipColor1={grassControls.tipColor1}
            tipColor2={grassControls.tipColor2}
            gradientCurve={grassControls.gradientCurve}
            aoEnabled={grassControls.aoEnabled}
            aoIntensity={grassControls.aoIntensity}
            fogEnabled={grassControls.fogEnabled}
            fogNear={grassControls.fogNear}
            fogFar={grassControls.fogFar}
            fogIntensity={grassControls.fogIntensity}
            fogColor={grassControls.fogColor}
            specularEnabled={grassControls.specularEnabled}
            specularIntensity={grassControls.specularIntensity}
            specularColor={grassControls.specularColor}
            specularDirectionX={grassControls.specularDirectionX}
            specularDirectionY={grassControls.specularDirectionY}
            specularDirectionZ={grassControls.specularDirectionZ}
            grassMiddleBrightnessMin={grassControls.grassMiddleBrightnessMin}
            grassMiddleBrightnessMax={grassControls.grassMiddleBrightnessMax}
            backscatterEnabled={grassControls.backscatterEnabled}
            backscatterIntensity={grassControls.backscatterIntensity}
            backscatterColor={grassControls.backscatterColor}
            backscatterPower={grassControls.backscatterPower}
            frontScatterStrength={grassControls.frontScatterStrength}
            rimSSSStrength={grassControls.rimSSSStrength}
            minSkyBlend={grassControls.minSkyBlend}
            specularV2Enabled={grassControls.specularV2Enabled}
            specularV2Intensity={grassControls.specularV2Intensity}
            specularV2Color={grassControls.specularV2Color}
            specularV2DirectionX={grassControls.specularV2DirectionX}
            specularV2DirectionY={grassControls.specularV2DirectionY}
            specularV2DirectionZ={grassControls.specularV2DirectionZ}
            specularV2NoiseScale={grassControls.specularV2NoiseScale}
            specularV2NoiseStrength={grassControls.specularV2NoiseStrength}
            specularV2Power={grassControls.specularV2Power}
            specularV2TipBias={grassControls.specularV2TipBias}
          />
        )}
      </group>
    );
  }
);

Map23.displayName = "Map23";
