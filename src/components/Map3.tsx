import React, { useMemo, useState, useCallback, useRef } from "react";
import { useControls } from "leva";
import { HeightMapUnreal } from "./HeightMapUnreal";
import { HeightFog } from "./HeightFog";
import { ButterflyParticles } from "./ButterflyParticles";
import { DustParticles } from "./DustParticles";
import { RainParticles3D } from "./RainParticles3D";
import { WindFlag } from "./WindFlag";
import { Mountain } from "./Mountain";
import { ParticlesFog } from "./ParticlesFog";
import { FloatingLeaves } from "./FloatingLeaves";
import { CloudSystem } from "./CloudSystem";
import { DynamicLeaves as DynamicLeaves3 } from "./DynamicLeaves3";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import ClaudeGrassQuick6 from "./ClaudeGrassQuick6.jsx";
import useClaudeGrassQuick6Controls from "./useClaudeGrassQuick6Controls.js";
import { useMountainControls } from "./useMountainControls";
import { useWindFlagControls } from "./useWindFlagControls";
import { useButterflyParticlesControls } from "./useButterflyParticlesControls";
import { useDustParticlesControls } from "./useDustParticlesControls";
import { useRainParticles3DControls } from "./useRainParticles3DControls";
import { useHeightFogControls } from "./useHeightFogControls";
import { useDynamicLeaves3Controls } from "./useDynamicLeaves3Controls";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";
import { TerrainHeightDebugSpheres } from "./TerrainHeightDebugSpheres";
import { useDebugSpheresControls } from "./useDebugSpheresControls";
import * as THREE from "three";

export const Map3 = ({
  scale = 1,
  position = [0, 0, 0] as [number, number, number],
  characterPosition,
  characterVelocity,
  ...props
}: any) => {
  // State to hold the heightmap lookup function from HeightMapUnreal (SAME pattern as Map5!)
  const [heightmapLookup, setHeightmapLookup] = useState<
    ((x: number, z: number) => number) | null
  >(null);

  // Callback when HeightMapUnreal is ready (SAME pattern as Map5!)
  const handleHeightmapReady = useCallback(
    (fn: (x: number, z: number) => number) => {
      console.log("✅ Map3: Received heightmap lookup from HeightMapUnreal");
      setHeightmapLookup(() => fn);
    },
    []
  );

  // Function to get terrain height using HeightMapUnreal's lookup (SAME pattern as Map5!)
  const getTerrainHeight = useMemo(() => {
    return (x: number, z: number): number => {
      if (heightmapLookup) {
        return heightmapLookup(x, z);
      }
      return 0; // Fallback if lookup not ready
    };
  }, [heightmapLookup]);

  // Create stable fallback vectors
  const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const fallbackVelocity = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Get butterflyParticles controls from separate hook
  const {
    butterflyEnabled,
    butterflyCount,
    butterflySpawnRange,
    butterflyMaxDistance,
    butterflySize,
    butterflyTexture,
    butterflyHeightMin,
    butterflyHeightMax,
    butterflySpreadRadius,
  } = useButterflyParticlesControls();

  // Get dustParticles controls from separate hook
  const { dustEnabled, dustCount, dustSpawnRange, dustMaxDistance, dustSize } =
    useDustParticlesControls();

  // Get rainParticles controls from separate hook
  const {
    rainEnabled,
    rainDensity,
    rainAreaSize,
    rainHeight,
    rainSpeed,
    rainParticleSize,
    rainColor,
    rainOpacity,
  } = useRainParticles3DControls();

  // Get heightFog controls from separate hook
  const { heightFogEnabled, fogColor, fogHeight, fogNear, fogFar } =
    useHeightFogControls();

  // Get mountain controls from separate hook
  const {
    mountainEnabled,
    mountainPosition,
    mountainScale,
    mountainRotation,
    mountainColor,
    mountainOpacity,
    mountainRoughness,
    mountainMetalness,
    mountainEmissive,
    mountainEmissiveIntensity,
  } = useMountainControls();

  // Get windFlag controls from separate hook
  const {
    windFlagEnabled,
    windFlagPosition,
    windFlagScale,
    windFlagColor,
    windFlagPoleHeight,
    windFlagWidth,
    windFlagHeight,
    windFlagSegments,
    windFlagUseTexture,
    windFlagTexturePath,
    windFlagTextureQuality,
    windFlagWaveIntensity,
    windFlagYOffset,
  } = useWindFlagControls();

  // Get dynamicLeaves3 controls from separate hook
  const {
    dynamicLeaves3Enabled,
    dynamicLeaves3Count,
    dynamicLeaves3AreaSize,
    dynamicLeaves3InteractionRange,
    dynamicLeaves3PushStrength,
    dynamicLeaves3SwirlStrength,
  } = useDynamicLeaves3Controls();

  // Get SimonDevGrass21 controls from separate hook
  const { simonDevGrass21Enabled } = useSimonDevGrass21Controls();

  // Get ClaudeGrassQuick6 controls from separate hook (adds to FOLIAGE menu)
  const claudeGrassQuick6Controls = useClaudeGrassQuick6Controls();
  const cg6 = claudeGrassQuick6Controls.claudeGrassQuick6 ?? claudeGrassQuick6Controls;

  // Get debug spheres controls
  const { showDebugSpheres } = useDebugSpheresControls();

  // Calculate terrain height for WindFlag position
  // WindFlag positions pole center at poleHeight/2 above group position
  // So we need to place group at terrainHeight - poleHeight/2 to get pole base at terrainHeight
  // Add user-adjustable Y offset
  const windFlagTerrainHeight = windFlagEnabled
    ? getTerrainHeight(windFlagPosition[0], windFlagPosition[2]) -
      windFlagPoleHeight / 2 +
      windFlagYOffset
    : 0;

  // Debug: Log the calculated height
  if (windFlagEnabled) {
    console.log(
      `WindFlag at [${windFlagPosition[0]}, ${windFlagPosition[2]}] -> terrain height: ${windFlagTerrainHeight}`
    );
  }

  const terrainMeshRef = useRef<THREE.Mesh>(null!);

  return (
    <group>
      <HeightFog
        enabled={heightFogEnabled}
        fogColor={fogColor}
        fogHeight={fogHeight}
        fogNear={fogNear}
        fogFar={fogFar}
      />
      <HeightMapUnreal
        ref={terrainMeshRef}
        size={4000}
        segments={200}
        heightScale={200}
        position={position}
        scale={scale}
        onHeightmapReady={handleHeightmapReady}
        {...props}
      />
      <CloudSystem />
      {/* DEBUG: Terrain Height Spheres - Shows if heightmap-based lookup is correct */}
      {showDebugSpheres && (
        <TerrainHeightDebugSpheres terrainMeshRef={terrainMeshRef} />
      )}
      {/* Render single texture when not "both" */}
      {butterflyEnabled && butterflyTexture !== "both" && (
        <ButterflyParticles
          enabled={butterflyEnabled}
          count={butterflyCount}
          spawnRange={butterflySpawnRange}
          maxDistance={butterflyMaxDistance}
          butterflySize={butterflySize}
          texture={butterflyTexture as "butterfly" | "moth" | "both"}
          heightMin={butterflyHeightMin}
          heightMax={butterflyHeightMax}
          spreadRadius={butterflySpreadRadius}
          getTerrainHeight={heightmapLookup ? getTerrainHeight : undefined}
        />
      )}
      {/* Render both butterflies AND moths when "both" is selected */}
      {butterflyEnabled && butterflyTexture === "both" && (
        <>
          <ButterflyParticles
            enabled={butterflyEnabled}
            count={Math.ceil(butterflyCount / 2)}
            spawnRange={butterflySpawnRange}
            maxDistance={butterflyMaxDistance}
            butterflySize={butterflySize}
            texture="butterfly"
            heightMin={butterflyHeightMin}
            heightMax={butterflyHeightMax}
            spreadRadius={butterflySpreadRadius}
            getTerrainHeight={heightmapLookup ? getTerrainHeight : undefined}
          />
          <ButterflyParticles
            enabled={butterflyEnabled}
            count={Math.floor(butterflyCount / 2)}
            spawnRange={butterflySpawnRange}
            maxDistance={butterflyMaxDistance}
            butterflySize={butterflySize}
            texture="moth"
            heightMin={butterflyHeightMin}
            heightMax={butterflyHeightMax}
            spreadRadius={butterflySpreadRadius}
            getTerrainHeight={heightmapLookup ? getTerrainHeight : undefined}
          />
        </>
      )}
      {/* Dust Particles */}
      {dustEnabled && (
        <DustParticles
          enabled={dustEnabled}
          count={dustCount}
          spawnRange={dustSpawnRange}
          maxDistance={dustMaxDistance}
          dustSize={dustSize}
        />
      )}
      {/* Rain Particles */}
      {rainEnabled && (
        <RainParticles3D
          enabled={rainEnabled}
          density={rainDensity}
          areaSize={rainAreaSize}
          rainHeight={rainHeight}
          rainSpeed={rainSpeed}
          particleSize={rainParticleSize}
          rainColor={rainColor}
          rainOpacity={rainOpacity}
        />
      )}
      {/* Particles Fog */}
      {heightmapLookup && <ParticlesFog getTerrainHeight={getTerrainHeight} />}
      {/* Floating Leaves */}
      {heightmapLookup && (
        <FloatingLeaves getTerrainHeight={getTerrainHeight} />
      )}
      {/* Wind Flag */}
      {windFlagEnabled && (
        <WindFlag
          position={[
            windFlagPosition[0],
            windFlagTerrainHeight,
            windFlagPosition[2],
          ]}
          scale={windFlagScale}
          flagColor={windFlagColor}
          poleHeight={windFlagPoleHeight}
          flagWidth={windFlagWidth}
          flagHeight={windFlagHeight}
          segments={windFlagSegments}
          useTexture={windFlagUseTexture}
          texturePath={windFlagTexturePath}
          textureQuality={windFlagTextureQuality}
          waveIntensity={windFlagWaveIntensity}
        />
      )}
      {/* Dynamic Leaves v3 */}
      {dynamicLeaves3Enabled && (
        <DynamicLeaves3
          count={dynamicLeaves3Count}
          areaSize={dynamicLeaves3AreaSize}
          ybotPosition={characterPosition || fallbackPosition}
          ybotVelocity={characterVelocity || fallbackVelocity}
          getGroundHeight={getTerrainHeight}
          characterInteractionRange={dynamicLeaves3InteractionRange}
          characterPushStrength={dynamicLeaves3PushStrength}
          characterSwirlStrength={dynamicLeaves3SwirlStrength}
        />
      )}
      {/* SimonDevGrass21 Grass System - Only render when heightmap is ready! (SAME as Map5!) */}
      {simonDevGrass21Enabled && heightmapLookup && (
        <SimonDevGrass21
          areaSize={200}
          mapSize={4000}
          grassHeight={1.0}
          grassScale={1.0}
          getGroundHeight={getTerrainHeight}
          characterPosition={characterPosition || fallbackPosition}
        />
      )}
      {/* ClaudeGrassQuick6 Grass System - in FOLIAGE menu */}
      {cg6?.enabled && (
        <ClaudeGrassQuick6
          playerPosition={characterPosition || fallbackPosition}
          terrainSize={cg6.terrainSize ?? 100}
          heightScale={cg6.heightScale ?? 1}
          heightOffset={cg6.heightOffset ?? 0}
          grassWidth={cg6.grassWidth ?? 0.1}
          grassHeight={cg6.grassHeight ?? 0.8}
          lodDistance={cg6.lodDistance ?? 15}
          maxDistance={cg6.maxDistance ?? 100}
          patchSize={cg6.patchSize ?? 10}
          gridSize={cg6.gridSize ?? 16}
          patchSpacing={cg6.patchSpacing ?? 10}
          windEnabled={cg6.wind?.windEnabled ?? true}
          windStrength={cg6.wind?.windStrength ?? 1.25}
          windDirectionScale={cg6.wind?.windDirectionScale ?? 0.05}
          windDirectionSpeed={cg6.wind?.windDirectionSpeed ?? 0.05}
          windStrengthScale={cg6.wind?.windStrengthScale ?? 0.25}
          windStrengthSpeed={cg6.wind?.windStrengthSpeed ?? 1.0}
          playerInteractionEnabled={cg6.playerInteraction?.playerInteractionEnabled ?? true}
          playerInteractionRepel={cg6.playerInteraction?.playerInteractionRepel ?? true}
          playerInteractionRange={cg6.playerInteraction?.playerInteractionRange ?? 2.5}
          playerInteractionStrength={cg6.playerInteraction?.playerInteractionStrength ?? 0.2}
          playerInteractionHeightThreshold={cg6.playerInteraction?.playerInteractionHeightThreshold ?? 3.0}
          baseColor1={cg6.colors?.baseColor1 ?? "#051303"}
          baseColor2={cg6.colors?.baseColor2 ?? "#061a03"}
          tipColor1={cg6.colors?.tipColor1 ?? "#a6cc40"}
          tipColor2={cg6.colors?.tipColor2 ?? "#cce666"}
          gradientCurve={cg6.colors?.gradientCurve ?? 4.0}
          aoEnabled={cg6.advanced?.aoEnabled ?? true}
          aoIntensity={cg6.advanced?.aoIntensity ?? 1.0}
          grassMiddleBrightnessMin={cg6.advanced?.grassMiddleBrightnessMin ?? 0.85}
          grassMiddleBrightnessMax={cg6.advanced?.grassMiddleBrightnessMax ?? 1.0}
          fogEnabled={cg6.fog?.fogEnabled ?? false}
          fogNear={cg6.fog?.fogNear ?? 5.0}
          fogFar={cg6.fog?.fogFar ?? 50.0}
          fogIntensity={cg6.fog?.fogIntensity ?? 1.0}
          fogColor={cg6.fog?.fogColor ?? "#4f74af"}
          specularEnabled={cg6.specular?.specularEnabled ?? false}
          specularIntensity={cg6.specular?.specularIntensity ?? 2.0}
          specularColor={cg6.specular?.specularColor ?? "#ffffff"}
          specularDirectionX={cg6.specular?.specularDirectionX ?? -1.0}
          specularDirectionY={cg6.specular?.specularDirectionY ?? 1.0}
          specularDirectionZ={cg6.specular?.specularDirectionZ ?? 0.5}
          backscatterEnabled={cg6.backscatter?.backscatterEnabled ?? true}
          backscatterIntensity={cg6.backscatter?.backscatterIntensity ?? 0.5}
          backscatterColor={cg6.backscatter?.backscatterColor ?? "#51cc66"}
          backscatterPower={cg6.backscatter?.backscatterPower ?? 2.0}
          frontScatterStrength={cg6.backscatter?.frontScatterStrength ?? 0.3}
          rimSSSStrength={cg6.backscatter?.rimSSSStrength ?? 0.5}
          grassDensity={cg6.grassDensity ?? 3072}
        />
      )}
      {/* Mountain */}
      <Mountain
        mountainEnabled={mountainEnabled}
        mountainPosition={mountainPosition}
        mountainScale={mountainScale}
        mountainRotation={mountainRotation}
        mountainColor={mountainColor}
        mountainOpacity={mountainOpacity}
        mountainRoughness={mountainRoughness}
        mountainMetalness={mountainMetalness}
        mountainEmissive={mountainEmissive}
        mountainEmissiveIntensity={mountainEmissiveIntensity}
      />
    </group>
  );
};
