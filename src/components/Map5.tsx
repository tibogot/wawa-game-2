import React, { useMemo, useState, useCallback } from "react";
import { useControls, folder } from "leva";
import { Clouds, Cloud } from "@react-three/drei";
import ZeldaTerrain2 from "./ZeldaTerrain2";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";
import { ImpostorForest } from "./ImpostorForest";
import { useImpostorForestControls } from "./useImpostorForestControls";
import { HeightFog } from "./HeightFog";
import { useHeightFogControls } from "./useHeightFogControls";
import { ButterflyParticles } from "./ButterflyParticles";
import { DustParticles } from "./DustParticles";
import { RainParticles3D } from "./RainParticles3D";
import { WindFlag } from "./WindFlag";
import { Mountain } from "./Mountain";
import { DynamicLeaves as DynamicLeaves3 } from "./DynamicLeaves3";
import { useDynamicLeaves3Controls } from "./useDynamicLeaves3Controls";
import { ParticlesFog } from "./ParticlesFog";
import { FloatingLeaves } from "./FloatingLeaves";
import { CloudSystem } from "./CloudSystem";
import { useLensFlareControls } from "./useLensFlareControls";
import LensFlare from "./LensFlare";
import { FlowingLinesSimple } from "./FlowingLinesSimple";
import { useFlowingLinesControls } from "./useFlowingLinesControls";
import { MovingShadowPlanes } from "./MovingShadowPlanes";
import { useMovingShadowPlanesControls } from "./useMovingShadowPlanesControls";
import { FloorDebugSpheres } from "./FloorDebugSpheres";
import { useFloorDebugSpheresControls } from "./useFloorDebugSpheresControls";
import { FloorDebugSpheresGlow } from "./FloorDebugSpheresGlow";
import { useFloorDebugSpheresGlowControls } from "./useFloorDebugSpheresGlowControls";
import * as THREE from "three";

export const Map5 = ({
  scale = 1,
  position = [0, 0, 0] as [number, number, number],
  characterPosition,
  characterVelocity,
  onTerrainReady,
  ...props
}: any) => {
  // State to hold the heightmap lookup function from ZeldaTerrain2
  const [heightmapLookup, setHeightmapLookup] = useState<
    ((x: number, z: number) => number) | null
  >(null);

  // Create stable fallback vectors (same as Map3)
  const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const fallbackVelocity = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Function to get terrain height using ZeldaTerrain2's lookup
  const getTerrainHeight = useMemo(() => {
    return (x: number, z: number): number => {
      if (heightmapLookup) {
        return heightmapLookup(x, z);
      }
      return 0; // Fallback if lookup not ready
    };
  }, [heightmapLookup]);

  // Callback when ZeldaTerrain2 is ready
  const handleHeightmapReady = useCallback(
    (fn: (x: number, z: number) => number) => {
      setHeightmapLookup(() => fn);
      if (onTerrainReady) {
        onTerrainReady();
      }
    },
    [onTerrainReady]
  );

  // Get Height Fog controls from hook
  const { heightFogEnabled, fogColor, fogHeight, fogNear, fogFar } =
    useHeightFogControls();

  const {
    enabled,
    cloudPosition,
    cloudScale,
    cloudSegments,
    bounds,
    concentrate,
    cloudVolume,
    smallestVolume,
    cloudFade,
    cloudOpacity,
    cloudColor,
    speed,
    growth,
    cloudSeed,
    cloudsLimit,
    cloudsRange,
    frustumCulled,
    butterflyEnabled,
    butterflyCount,
    butterflySpawnRange,
    butterflyMaxDistance,
    butterflySize,
    butterflyTexture,
    butterflyHeightMin,
    butterflyHeightMax,
    butterflySpreadRadius,
    dustEnabled,
    dustCount,
    dustSpawnRange,
    dustMaxDistance,
    dustSize,
    rainEnabled,
    rainDensity,
    rainAreaSize,
    rainHeight,
    rainSpeed,
    rainParticleSize,
    rainColor,
    rainOpacity,
  } = useControls("🌤️ AMBIENCE", {
    clouds: folder(
      {
        enabled: { value: false, label: "☁️ Enable Clouds" },
        cloudPosition: {
          value: [0, 800, 0],
          label: "Position",
          step: 50,
        },
        cloudScale: {
          value: [1, 1, 1],
          label: "Scale",
          step: 0.1,
        },
        bounds: {
          value: [10, 2, 2],
          label: "Bounds",
          step: 1,
        },
        cloudSegments: {
          value: 40,
          label: "Segments",
          min: 10,
          max: 100,
          step: 5,
        },
        concentrate: {
          value: "inside" as "random" | "inside" | "outside",
          label: "Concentrate",
          options: ["random", "inside", "outside"],
        },
        cloudVolume: {
          value: 8,
          label: "Volume",
          min: 1,
          max: 20,
          step: 1,
        },
        smallestVolume: {
          value: 0.25,
          label: "Smallest Volume",
          min: 0.1,
          max: 1,
          step: 0.05,
        },
        cloudFade: {
          value: 10,
          label: "Fade Distance",
          min: 0,
          max: 50,
          step: 1,
        },
        cloudOpacity: {
          value: 1,
          label: "Opacity",
          min: 0,
          max: 1,
          step: 0.1,
        },
        cloudColor: {
          value: "#ffffff",
          label: "Color",
        },
        speed: {
          value: 0,
          label: "Animation Speed",
          min: 0,
          max: 2,
          step: 0.1,
        },
        growth: {
          value: 4,
          label: "Growth Factor",
          min: 1,
          max: 10,
          step: 0.5,
        },
        cloudSeed: {
          value: 0,
          label: "Seed",
          min: 0,
          max: 1000,
          step: 1,
        },
        cloudsLimit: {
          value: 200,
          label: "Clouds Limit",
          min: 50,
          max: 500,
          step: 10,
        },
        cloudsRange: {
          value: 200,
          label: "Clouds Range (200 = all)",
          min: 0,
          max: 200,
          step: 10,
        },
        frustumCulled: {
          value: true,
          label: "Frustum Culled",
        },
      },
      { collapsed: true }
    ),
    butterflyParticles: folder(
      {
        butterflyEnabled: { value: false, label: "🦋 Enable Butterflies" },
        butterflyCount: {
          value: 8,
          label: "Count",
          min: 1,
          max: 50,
          step: 1,
        },
        butterflySpawnRange: {
          value: 40.0,
          label: "Spawn Range",
          min: 10,
          max: 100,
          step: 5,
        },
        butterflyMaxDistance: {
          value: 100.0,
          label: "Max Distance",
          min: 50,
          max: 500,
          step: 10,
        },
        butterflySize: {
          value: [0.5, 1.25] as [number, number],
          label: "Size [Width, Height]",
          step: 0.1,
        },
        butterflyTexture: {
          value: "butterfly" as "butterfly" | "moth" | "both",
          label: "Texture",
          options: ["butterfly", "moth", "both"],
        },
        butterflyHeightMin: {
          value: 2.0,
          label: "Height Min",
          min: 0,
          max: 20,
          step: 0.5,
        },
        butterflyHeightMax: {
          value: 5.0,
          label: "Height Max",
          min: 1,
          max: 30,
          step: 0.5,
        },
        butterflySpreadRadius: {
          value: 1.0,
          label: "Spread Radius",
          min: 0.1,
          max: 3.0,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
    dustParticles: folder(
      {
        dustEnabled: { value: false, label: "✨ Enable Dust Particles" },
        dustCount: {
          value: 8,
          label: "Count",
          min: 1,
          max: 50,
          step: 1,
        },
        dustSpawnRange: {
          value: 20.0,
          label: "Spawn Range",
          min: 5,
          max: 100,
          step: 5,
        },
        dustMaxDistance: {
          value: 50.0,
          label: "Max Distance",
          min: 20,
          max: 200,
          step: 10,
        },
        dustSize: {
          value: [0.4, 0.4] as [number, number],
          label: "Size [Width, Height]",
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
    rainParticles: folder(
      {
        rainEnabled: { value: false, label: "💧 Enable Rain" },
        rainDensity: {
          value: 500,
          label: "Density",
          min: 100,
          max: 2000,
          step: 50,
        },
        rainAreaSize: {
          value: 50.0,
          label: "Area Size",
          min: 20,
          max: 200,
          step: 10,
        },
        rainHeight: {
          value: 20.0,
          label: "Rain Height",
          min: 5,
          max: 100,
          step: 5,
        },
        rainSpeed: {
          value: 8.0,
          label: "Fall Speed",
          min: 2,
          max: 20,
          step: 1,
        },
        rainParticleSize: {
          value: 0.01,
          label: "Particle Size",
          min: 0.005,
          max: 0.05,
          step: 0.001,
        },
        rainColor: {
          value: "#d0e0ff",
          label: "Rain Color",
        },
        rainOpacity: {
          value: 0.4,
          label: "Opacity",
          min: 0.1,
          max: 1.0,
          step: 0.05,
        },
      },
      { collapsed: true }
    ),
  });

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
  } = useControls("🏛️ OBJECTS", {
    windFlag: folder(
      {
        windFlagEnabled: { value: false, label: "🏳️ Enable Wind Flag" },
        windFlagPosition: {
          value: [10, 0, 10],
          label: "📍 Position [X, Z]",
          step: 1,
        },
        windFlagYOffset: {
          value: 0.0,
          min: -5.0,
          max: 5.0,
          step: 0.1,
          label: "⬆️ Y Height Offset",
        },
        windFlagScale: {
          value: 1.0,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "📏 Scale",
        },
        windFlagColor: {
          value: "#ff0000",
          label: "🎨 Flag Color",
        },
        windFlagPoleHeight: {
          value: 8,
          min: 3,
          max: 20,
          step: 0.5,
          label: "📏 Pole Height",
        },
        windFlagWidth: {
          value: 3,
          min: 1,
          max: 8,
          step: 0.5,
          label: "📐 Flag Width",
        },
        windFlagHeight: {
          value: 2,
          min: 1,
          max: 6,
          step: 0.5,
          label: "📐 Flag Height",
        },
        windFlagSegments: {
          value: 20,
          min: 10,
          max: 50,
          step: 5,
          label: "🔢 Segments (Quality)",
        },
        windFlagUseTexture: {
          value: true,
          label: "🖼️ Use Texture",
        },
        windFlagTexturePath: {
          value: "/textures/flag.png",
          label: "📁 Texture Path",
        },
        windFlagTextureQuality: {
          value: 16,
          min: 1,
          max: 16,
          step: 1,
          label: "✨ Texture Quality",
        },
        windFlagWaveIntensity: {
          value: 0.8,
          min: 0.1,
          max: 2.0,
          step: 0.1,
          label: "🌊 Wave Intensity",
        },
      },
      { collapsed: true }
    ),
    mountain: folder(
      {
        mountainEnabled: { value: false, label: "🏔️ Enable Mountain" },
        mountainPosition: {
          value: [0, 0, 0],
          label: "📍 Position [X, Y, Z]",
          step: 1,
        },
        mountainScale: {
          value: [1, 1, 1],
          label: "📏 Scale [X, Y, Z]",
          step: 0.1,
        },
        mountainRotation: {
          value: [0, 0, 0],
          label: "🔄 Rotation [X, Y, Z]",
          step: 0.1,
        },
        mountainColor: {
          value: "#8B7355",
          label: "🎨 Base Color",
        },
        mountainOpacity: {
          value: 1.0,
          min: 0.0,
          max: 1.0,
          step: 0.1,
          label: "👻 Opacity",
        },
        mountainRoughness: {
          value: 0.8,
          min: 0.0,
          max: 1.0,
          step: 0.1,
          label: "🔳 Roughness",
        },
        mountainMetalness: {
          value: 0.0,
          min: 0.0,
          max: 1.0,
          step: 0.1,
          label: "✨ Metalness",
        },
        mountainEmissive: {
          value: "#000000",
          label: "💡 Emissive Color",
        },
        mountainEmissiveIntensity: {
          value: 0.0,
          min: 0.0,
          max: 2.0,
          step: 0.1,
          label: "💡 Emissive Intensity",
        },
      },
      { collapsed: true }
    ),
  });

  // Get SimonDevGrass21 controls
  const { simonDevGrass21Enabled } = useSimonDevGrass21Controls();

  // Get ImpostorForest controls
  const {
    impostorForestEnabled,
    treeCount,
    radius,
    minRadius,
    centerX,
    centerY,
    centerZ,
    lodMid,
    lodFar,
    leavesAlphaTest,
    leavesOpacity,
    impostorAlphaClamp,
  } = useImpostorForestControls();

  // Get dynamicLeaves3 controls from separate hook
  const {
    dynamicLeaves3Enabled,
    dynamicLeaves3Count,
    dynamicLeaves3AreaSize,
    dynamicLeaves3InteractionRange,
    dynamicLeaves3PushStrength,
    dynamicLeaves3SwirlStrength,
  } = useDynamicLeaves3Controls();

  // Get debug spheres controls
  // Get LensFlare controls
  const {
    lensFlareEnabled,
    lensFlare1Enabled,
    lensFlare1Position,
    lensFlare1H,
    lensFlare1S,
    lensFlare1L,
    lensFlare1Intensity,
    lensFlare2Enabled,
    lensFlare2Position,
    lensFlare2H,
    lensFlare2S,
    lensFlare2L,
    lensFlare2Intensity,
    lensFlare3Enabled,
    lensFlare3Position,
    lensFlare3H,
    lensFlare3S,
    lensFlare3L,
    lensFlare3Intensity,
    flareDistance,
  } = useLensFlareControls();

  // Get FlowingLines controls
  const { enabled: flowingLinesEnabled } = useFlowingLinesControls();

  // Get MovingShadowPlanes controls
  const {
    enabled: movingShadowPlanesEnabled,
    planeCount,
    planeSize,
    planeHeight,
    moveSpeed,
    moveRange,
    planeOpacity,
    planeColor,
    followPlayer,
  } = useMovingShadowPlanesControls();

  // Get FloorDebugSpheres controls
  const {
    enabled: floorDebugSpheresEnabled,
    gridSize,
    areaSize,
    sphereSize,
    sphereColor,
    emissiveIntensity,
  } = useFloorDebugSpheresControls();

  // Get FloorDebugSpheresGlow controls
  const {
    enabled: floorDebugSpheresGlowEnabled,
    gridSize: glowGridSize,
    areaSize: glowAreaSize,
    sphereSize: glowSphereSize,
    sphereColor: glowSphereColor,
    emissiveIntensity: glowEmissiveIntensity,
    useRandomColors: glowUseRandomColors,
  } = useFloorDebugSpheresGlowControls();

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
  if (windFlagEnabled && heightmapLookup) {
    console.log(
      `WindFlag at [${windFlagPosition[0]}, ${windFlagPosition[2]}] -> terrain height: ${windFlagTerrainHeight}`
    );
  }

  return (
    <group>
      <HeightFog
        enabled={heightFogEnabled}
        fogColor={fogColor}
        fogHeight={fogHeight}
        fogNear={fogNear}
        fogFar={fogFar}
      />
      <ZeldaTerrain2 onHeightmapReady={handleHeightmapReady} />
      <CloudSystem />
      {enabled && (
        <Clouds
          limit={cloudsLimit}
          range={cloudsRange === 200 ? undefined : cloudsRange}
          frustumCulled={frustumCulled}
        >
          <Cloud
            position={cloudPosition}
            scale={cloudScale}
            bounds={bounds}
            segments={cloudSegments}
            concentrate={concentrate as "random" | "inside" | "outside"}
            volume={cloudVolume}
            smallestVolume={smallestVolume}
            fade={cloudFade}
            color={cloudColor}
            opacity={cloudOpacity}
            speed={speed}
            growth={growth}
            seed={cloudSeed}
          />
        </Clouds>
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
      <ParticlesFog />
      {/* Floating Leaves */}
      <FloatingLeaves />
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
      {/* SimonDevGrass21 - SAME setup as working project with ZeldaTerrain2! */}
      {simonDevGrass21Enabled && heightmapLookup && (
        <SimonDevGrass21
          areaSize={200}
          mapSize={1000}
          grassHeight={1.0}
          grassScale={1.0}
          getGroundHeight={getTerrainHeight}
          characterPosition={characterPosition || fallbackPosition}
        />
      )}
      {/* ImpostorForest - Octahedral impostor-based trees that follow terrain! */}
      {impostorForestEnabled && heightmapLookup && (
        <ImpostorForest
          centerPosition={[centerX, centerY, centerZ]}
          radius={radius}
          minRadius={minRadius}
          treeCount={treeCount}
          modelPath="/models/tree.glb"
          lodDistances={{ mid: lodMid, low: lodFar }}
          leavesAlphaTest={leavesAlphaTest}
          leavesOpacity={leavesOpacity}
          impostorAlphaClamp={impostorAlphaClamp}
          getTerrainHeight={getTerrainHeight}
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
      {/* Lens Flares */}
      {lensFlareEnabled && (
        <>
          {lensFlare1Enabled && (
            <LensFlare
              position={[
                lensFlare1Position.x,
                lensFlare1Position.y,
                lensFlare1Position.z,
              ]}
              h={lensFlare1H}
              s={lensFlare1S}
              l={lensFlare1L}
              intensity={lensFlare1Intensity}
              distance={flareDistance}
            />
          )}
          {lensFlare2Enabled && (
            <LensFlare
              position={[
                lensFlare2Position.x,
                lensFlare2Position.y,
                lensFlare2Position.z,
              ]}
              h={lensFlare2H}
              s={lensFlare2S}
              l={lensFlare2L}
              intensity={lensFlare2Intensity}
              distance={flareDistance}
            />
          )}
          {lensFlare3Enabled && (
            <LensFlare
              position={[
                lensFlare3Position.x,
                lensFlare3Position.y,
                lensFlare3Position.z,
              ]}
              h={lensFlare3H}
              s={lensFlare3S}
              l={lensFlare3L}
              intensity={lensFlare3Intensity}
              distance={flareDistance}
            />
          )}
        </>
      )}
      {/* Flowing Lines */}
      {flowingLinesEnabled && heightmapLookup && (
        <FlowingLinesSimple
          enabled={flowingLinesEnabled}
          lineCount={10}
          getTerrainHeight={getTerrainHeight}
        />
      )}
      {/* Moving Shadow Planes */}
      {movingShadowPlanesEnabled && (
        <MovingShadowPlanes
          characterPosition={characterPosition || fallbackPosition}
          enabled={movingShadowPlanesEnabled}
          planeCount={planeCount}
          planeSize={planeSize}
          planeHeight={planeHeight}
          moveSpeed={moveSpeed}
          moveRange={moveRange}
          planeOpacity={planeOpacity}
          planeColor={planeColor}
          followPlayer={followPlayer}
        />
      )}
      {/* Floor Debug Spheres - Visualize terrain height calculations */}
      {floorDebugSpheresEnabled && heightmapLookup && (
        <FloorDebugSpheres
          heightmapLookup={heightmapLookup}
          enabled={floorDebugSpheresEnabled}
          gridSize={gridSize}
          areaSize={areaSize}
          sphereSize={sphereSize}
          sphereColor={sphereColor}
          emissiveIntensity={emissiveIntensity}
        />
      )}
      {/* Floor Debug Spheres Glow - Visualize terrain height with glow effect */}
      {floorDebugSpheresGlowEnabled && heightmapLookup && (
        <FloorDebugSpheresGlow
          heightmapLookup={heightmapLookup}
          enabled={floorDebugSpheresGlowEnabled}
          gridSize={glowGridSize}
          areaSize={glowAreaSize}
          sphereSize={glowSphereSize}
          sphereColor={glowSphereColor}
          emissiveIntensity={glowEmissiveIntensity}
          useRandomColors={glowUseRandomColors}
        />
      )}
    </group>
  );
};
