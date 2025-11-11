import { useRef, useState, useCallback, useMemo, forwardRef } from "react";
import { useControls, folder } from "leva";
import * as THREE from "three";
import { ProceduralTerrain5 } from "./ProceduralTerrain5";
import { ProceduralTerrain6 } from "./ProceduralTerrain6";
import { ProceduralTerrain7 } from "./ProceduralTerrain7";
import { ProceduralTerrain8 } from "./ProceduralTerrain8";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import { SimonDevGrass22 } from "./SimonDevGrass22/SimonDevGrass22";
import { SimonDevGrass23 } from "./SimonDevGrass23/SimonDevGrass23";
import { GrassField as GrassField4 } from "./GrassClaude4";
import { GrassField as GrassField5 } from "./GrassClaude5";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";
import { useSimonDevGrass22Controls } from "./useSimonDevGrass22Controls";
import { useSimonDevGrass23Controls } from "./useSimonDevGrass23Controls";
import { useGrassClaude4Controls } from "./useGrassClaude4Controls";
import { useGrassClaude5Controls } from "./useGrassClaude5Controls";
import { HeightFog } from "./HeightFog";
import { useHeightFogControls } from "./useHeightFogControls";
import { CloudSystem } from "./CloudSystem";
import { useLensFlareControls } from "./useLensFlareControls";
import LensFlare from "./LensFlare";
import { FlowingLinesSimple } from "./FlowingLinesSimple";
import { useFlowingLinesControls } from "./useFlowingLinesControls";
import { MovingShadowPlanes } from "./MovingShadowPlanes";
import { useMovingShadowPlanesControls } from "./useMovingShadowPlanesControls";
import { FloorDebugSpheres } from "./FloorDebugSpheres";
import { useFloorDebugSpheresControls } from "./useFloorDebugSpheresControls";
import { FloatingLeaves } from "./FloatingLeaves";
import { TornadoLeaves } from "./TornadoLeaves";
import FallingLeaves from "./FallingLeaves";
import { ButterflyParticles } from "./ButterflyParticles";
import { useButterflyParticlesControls } from "./useButterflyParticlesControls";
import { Mountain } from "./Mountain";
import { useMountainControls } from "./useMountainControls";
import { QuarryRocks } from "./Quarry_rocks";
import { useQuarryRocksControls } from "./useQuarryRocksControls";
import { Rock1 } from "./Rock1";
import { useRock1Controls } from "./useRock1Controls";
import { WindFlag } from "./WindFlag";
import { useWindFlagControls } from "./useWindFlagControls";
import { AdBillboard } from "./AdBillboard";
import { useAdBillboardControls } from "./useAdBillboardControls";
import { DustParticles } from "./DustParticles";
import { useDustParticlesControls } from "./useDustParticlesControls";
import { DynamicLeaves as DynamicLeaves3 } from "./DynamicLeaves3";
import { useDynamicLeaves3Controls } from "./useDynamicLeaves3Controls";
import { RainParticles3D } from "./RainParticles3D";
import { useRainParticles3DControls } from "./useRainParticles3DControls";
import { ParticlesFog } from "./ParticlesFog";
import { ShorelineEffect } from "./ShorelineEffect";
import { useShorelineEffectControls } from "./useShorelineEffectControls";
import { ImpostorForest } from "./ImpostorForest";
import { useImpostorForestControls } from "./useImpostorForestControls";
import { DeerController } from "./DeerController";
import { DeerHerd } from "./DeerHerd";
import { InstancedTrees } from "./InstancedTrees";
import { useInstancedTreesControls } from "./useInstancedTreesControls";
import { InstancedBillboardTrees } from "./InstancedBillboardTrees";
import { useInstancedBillboardTreesControls } from "./useInstancedBillboardTreesControls";
import { InstancedPines } from "./InstancedPines";
import { useInstancedPinesControls } from "./useInstancedPinesControls";
import { AnimatedTree2 } from "./AnimatedTree2";
import { useAnimatedTree2Controls } from "./useAnimatedTree2Controls";
import { PhysicsDebugCubes } from "./PhysicsDebugCubes";
import Forest from "./ManciniForest";
import Water from "./Water";
import { useWaterControls } from "./useWaterControls";
// import { Lake } from "./Lake";

export const Map9 = forwardRef(
  (
    {
      scale = 1,
      position = [0, 0, 0],
      characterPosition,
      characterVelocity,
      onTerrainReady,
      ...props
    },
    ref
  ) => {
    const group = useRef(null);
    const [heightmapLookup, setHeightmapLookup] = useState(null);
    const [isTerrainMeshReady, setIsTerrainMeshReady] = useState(false);

    // Get SimonDevGrass21 controls
    const { simonDevGrass21Enabled } = useSimonDevGrass21Controls();
    // Get SimonDevGrass22 controls
    const { simonDevGrass22Enabled } = useSimonDevGrass22Controls();
    // Get SimonDevGrass23 controls
    const { simonDevGrass23Enabled } = useSimonDevGrass23Controls();
    // Get GrassClaude4 controls
    const {
      grassClaude4Enabled,
      grassHeight,
      gridSize: grassGridSize,
      patchSpacing,
      segments: grassSegments,
      numGrass,
      patchSize,
      grassWidth,
      lodDistance,
      maxDistance,
      baseColor1,
      baseColor2,
      tipColor1,
      tipColor2,
      backscatterEnabled,
      backscatterIntensity,
      backscatterColor,
      backscatterPower,
      frontScatterStrength,
      rimSSSStrength,
      specularEnabled,
      specularIntensity,
      specularColor,
      specularPower,
      specularScale,
      lightDirectionX,
      lightDirectionY,
      lightDirectionZ,
      windEnabled,
      windStrength,
      windDirectionScale,
      windDirectionSpeed,
      windStrengthScale,
      windStrengthSpeed,
      playerInteractionEnabled,
      playerInteractionRange,
      playerInteractionStrength,
      normalMixEnabled,
      normalMixFactor,
      aoEnabled,
      aoIntensity,
      fogEnabled: grassFogEnabled,
      fogNear: grassFogNear,
      fogFar: grassFogFar,
      fogColor: grassFogColor,
      fogIntensity: grassFogIntensity,
    } = useGrassClaude4Controls();

    // Get GrassClaude5 controls
    const {
      grassClaude5Enabled,
      grassHeight: grassHeight5,
      gridSize: grassGridSize5,
      patchSpacing: patchSpacing5,
      segments: grassSegments5,
      numGrass: numGrass5,
      patchSize: patchSize5,
      grassWidth: grassWidth5,
      lodDistance: lodDistance5,
      maxDistance: maxDistance5,
      baseColor1: baseColor1_5,
      baseColor2: baseColor2_5,
      tipColor1: tipColor1_5,
      tipColor2: tipColor2_5,
      gradientBlend: gradientBlend5,
      gradientCurve: gradientCurve5,
      backscatterEnabled: backscatterEnabled5,
      backscatterIntensity: backscatterIntensity5,
      backscatterColor: backscatterColor5,
      backscatterPower: backscatterPower5,
      frontScatterStrength: frontScatterStrength5,
      rimSSSStrength: rimSSSStrength5,
      specularEnabled: specularEnabled5,
      specularIntensity: specularIntensity5,
      specularColor: specularColor5,
      specularPower: specularPower5,
      specularScale: specularScale5,
      lightDirectionX: lightDirectionX5,
      lightDirectionY: lightDirectionY5,
      lightDirectionZ: lightDirectionZ5,
      windEnabled: windEnabled5,
      windStrength: windStrength5,
      windDirectionScale: windDirectionScale5,
      windDirectionSpeed: windDirectionSpeed5,
      windStrengthScale: windStrengthScale5,
      windStrengthSpeed: windStrengthSpeed5,
      playerInteractionEnabled: playerInteractionEnabled5,
      playerInteractionRange: playerInteractionRange5,
      playerInteractionStrength: playerInteractionStrength5,
      normalMixEnabled: normalMixEnabled5,
      normalMixFactor: normalMixFactor5,
      aoEnabled: aoEnabled5,
      aoIntensity: aoIntensity5,
      fogEnabled: grassFogEnabled5,
      fogNear: grassFogNear5,
      fogFar: grassFogFar5,
      fogColor: grassFogColor5,
      fogIntensity: grassFogIntensity5,
    } = useGrassClaude5Controls();

    // Get Height Fog controls from hook
    const { heightFogEnabled, fogColor, fogHeight, fogNear, fogFar } =
      useHeightFogControls();

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
    const {
      enabled: flowingLinesEnabled,
      lineCount,
      lineLength,
      lineWidth,
      heightOffset,
      verticalWave,
      animationSpeed,
      pathRadius,
      pathFrequency,
      lineColor,
      lineOpacity,
      segments,
      boundaryRadius,
    } = useFlowingLinesControls();

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

    // Get ButterflyParticles controls
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

    // Get Mountain controls
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

    // Get QuarryRocks controls
    const {
      quarryRocksEnabled,
      quarryRocksPosition,
      quarryRocksScale,
      quarryRocksRotation,
    } = useQuarryRocksControls();

    // Get Rock1 controls
    const { rock1Enabled, rock1Position, rock1Scale, rock1Rotation } =
      useRock1Controls();

    // Get WindFlag controls
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

    // Get AdBillboard controls
    const {
      adBillboardEnabled,
      adBillboardPosition,
      adBillboardYOffset,
      adBillboardScale,
      adBillboardColor,
      adBillboardPylonHeight,
      adBillboardWidth,
      adBillboardHeight,
      adBillboardPylonSpacing,
      adBillboardPylonRadius,
      adBillboardUseTexture,
      adBillboardTexturePath,
      adBillboardTextureQuality,
    } = useAdBillboardControls();

    // Get DustParticles controls
    const {
      dustEnabled,
      dustCount,
      dustSpawnRange,
      dustMaxDistance,
      dustSize,
    } = useDustParticlesControls();

    // Get DynamicLeaves3 controls
    const {
      dynamicLeaves3Enabled,
      dynamicLeaves3Count,
      dynamicLeaves3AreaSize,
      dynamicLeaves3InteractionRange,
      dynamicLeaves3PushStrength,
      dynamicLeaves3SwirlStrength,
    } = useDynamicLeaves3Controls();

    // Get RainParticles controls
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

    // Get ShorelineEffect controls
    const {
      enabled: shorelineEnabled,
      shorelineIntensity,
      shorelineWidth,
      shorelineColor1,
      shorelineColor2,
      waveSpeed,
      waveAmplitude,
      noiseScale,
      gradientSharpness,
      waterLevel,
      debugMode,
    } = useShorelineEffectControls();

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

    // Get InstancedTrees controls
    const {
      instancedTreesEnabled,
      instancedTreeCount,
      instancedPositionX,
      instancedPositionY,
      instancedPositionZ,
      instancedRadius,
      instancedMinRadius,
      scaleRangeMin,
      scaleRangeMax,
      castShadow,
      receiveShadow,
      enableTransparentSorting,
      enableBVH,
      bvhMargin,
      enableViewThickening,
      viewThickenPower,
      viewThickenStrength,
    } = useInstancedTreesControls();

    // Get InstancedPines controls
    const {
      instancedPinesEnabled,
      instancedPineCount,
      instancedPinePositionX,
      instancedPinePositionY,
      instancedPinePositionZ,
      instancedPineRadius,
      instancedPineMinRadius,
      pineScaleRangeMin,
      pineScaleRangeMax,
      pineCastShadow,
      pineReceiveShadow,
      pineEnableTransparentSorting,
      pineEnableBVH,
      pineBvhMargin,
      pineEnableViewThickening,
      pineViewThickenPower,
      pineViewThickenStrength,
      pineAoEnabled,
      pineAoIntensity,
      pineBackscatterEnabled,
      pineBackscatterIntensity,
      pineBackscatterColor,
      pineBackscatterPower,
      pineFrontScatterStrength,
      pineRimSSSStrength,
      pineLightDirectionX,
      pineLightDirectionY,
      pineLightDirectionZ,
    } = useInstancedPinesControls();

    // Get InstancedBillboardTrees controls
    const {
      instancedBillboardTreesEnabled,
      instancedBillboardTreeCount,
      instancedBillboardPositionX,
      instancedBillboardPositionY,
      instancedBillboardPositionZ,
      instancedBillboardRadius,
      instancedBillboardMinRadius,
      billboardScaleRangeMin,
      billboardScaleRangeMax,
      billboardYOffset,
      billboardCastShadow,
      billboardReceiveShadow,
      billboardEnableTransparentSorting,
      billboardEnableBVH,
      billboardBvhMargin,
      billboardEnableViewThickening,
      billboardViewThickenPower,
      billboardViewThickenStrength,
      billboardAoEnabled,
      billboardAoIntensity,
      billboardBackscatterEnabled,
      billboardBackscatterIntensity,
      billboardBackscatterColor,
      billboardBackscatterPower,
      billboardFrontScatterStrength,
      billboardRimSSSStrength,
      billboardLightDirectionX,
      billboardLightDirectionY,
      billboardLightDirectionZ,
      billboardEnableRotation,
      billboardRotationDampingDistance,
      billboardRotationStopDistance,
      billboardRotationThreshold,
      billboardRotationSmoothing,
      billboardAlphaTest,
      billboardPremultiplyAlpha,
      billboardEdgeBleedCompensation,
      billboardDistanceAlphaTest,
      billboardDistanceAlphaStart,
      billboardDistanceAlphaEnd,
    } = useInstancedBillboardTreesControls();

    // Get AnimatedTree2 controls
    const {
      animatedTree2Enabled,
      animatedTree2PositionX,
      animatedTree2PositionY,
      animatedTree2PositionZ,
      animatedTree2Scale,
      animatedTree2MouseInteraction,
      animatedTree2CastShadow,
      animatedTree2ReceiveShadow,
      animatedTree2ColorA,
      animatedTree2ColorB,
      animatedTree2ColorC,
      animatedTree2GradientThreshold,
      animatedTree2GradientPower,
      animatedTree2ModelPath,
      animatedTree2NoiseTexturePath,
      animatedTree2PoleTexturePath,
    } = useAnimatedTree2Controls();

    // Get Water controls
    const {
      waterEnabled,
      waterBaseMaterial,
      waterColor,
      waterHighlightColor,
      waterBrightness,
      waterFlatshading,
      waterSize,
      waterSegments,
      waterOffset,
      waterContrast,
      waterTimeSpeed,
      waterHeight,
      waterWaveAmplitude,
      waterWaveFrequency,
      waterPositionX,
      waterPositionY,
      waterPositionZ,
    } = useWaterControls();

    // Get foliage controls (falling leaves, manual forest)
    const {
      fallingLeavesEnabled,
      fallingLeavesTexture,
      fallingLeavesColor,
      fallingLeavesCount,
      fallingLeavesRotationSpeed,
      fallingLeavesSpawnAreaSize,
      fallingLeavesSpawnHeightMin,
      fallingLeavesSpawnHeightMax,
      fallingLeavesSpawnCenterX,
      fallingLeavesSpawnCenterY,
      fallingLeavesSpawnCenterZ,
      forestEnabled,
      forestNumTrees,
      forestInnerRadius,
      forestOuterRadius,
      forestPositionX,
      forestPositionY,
      forestPositionZ,
    } = useControls("🌿 FOLIAGE", {
      fallingLeaves: folder(
        {
          fallingLeavesEnabled: {
            value: false,
            label: "🍃 Enable Falling Leaves",
          },
          fallingLeavesTexture: {
            value: "/textures/leaf 2.jpg",
            label: "📄 Leaf Texture",
          },
          fallingLeavesColor: {
            value: "#ffc219",
            label: "🎨 Leaf Color",
          },
          fallingLeavesCount: {
            value: 50,
            min: 10,
            max: 200,
            step: 10,
            label: "🔢 Leaf Count",
          },
          fallingLeavesRotationSpeed: {
            value: 0.015,
            min: 0.001,
            max: 0.1,
            step: 0.001,
            label: "🌀 Rotation Speed",
          },
          fallingLeavesSpawnAreaSize: {
            value: 3,
            min: 1,
            max: 20,
            step: 0.5,
            label: "📐 Spawn Area Size",
          },
          fallingLeavesSpawnHeightMin: {
            value: -3,
            min: -20,
            max: 20,
            step: 0.5,
            label: "⬇️ Spawn Height Min",
          },
          fallingLeavesSpawnHeightMax: {
            value: 3,
            min: -20,
            max: 20,
            step: 0.5,
            label: "⬆️ Spawn Height Max",
          },
          fallingLeavesSpawnCenterX: {
            value: 0,
            min: -50,
            max: 50,
            step: 1,
            label: "📍 Center X",
          },
          fallingLeavesSpawnCenterY: {
            value: 0,
            min: -20,
            max: 20,
            step: 1,
            label: "📍 Center Y",
          },
          fallingLeavesSpawnCenterZ: {
            value: 0,
            min: -50,
            max: 50,
            step: 1,
            label: "📍 Center Z",
          },
        },
        { collapsed: true }
      ),
      forest: folder(
        {
          forestEnabled: {
            value: false,
            label: "🌲 Enable Forest",
          },
          forestNumTrees: {
            value: 100,
            min: 10,
            max: 500,
            step: 10,
            label: "🌳 Number of Trees",
          },
          forestInnerRadius: {
            value: 10,
            min: 0,
            max: 1000,
            step: 10,
            label: "📐 Inner Radius",
          },
          forestOuterRadius: {
            value: 50,
            min: 1,
            max: 1500,
            step: 10,
            label: "📐 Outer Radius",
          },
          forestPositionX: {
            value: 0,
            min: -1250,
            max: 1250,
            step: 10,
            label: "📍 Position X",
          },
          forestPositionY: {
            value: 0,
            min: -100,
            max: 100,
            step: 1,
            label: "📍 Position Y",
          },
          forestPositionZ: {
            value: 0,
            min: -1250,
            max: 1250,
            step: 10,
            label: "📍 Position Z",
          },
        },
        { collapsed: true }
      ),
    });

    // Get PhysicsDebugCubes controls
    const { physicsDebugCubesEnabled, physicsDebugCubesSpawnHeight } =
      useControls("🔧 DEBUG", {
        physicsDebugCubes: folder(
          {
            physicsDebugCubesEnabled: {
              value: false,
              label: "📦 Enable Physics Debug Cubes",
            },
            physicsDebugCubesSpawnHeight: {
              value: 20,
              min: 5,
              max: 50,
              step: 1,
              label: "⬆️ Spawn Height",
            },
          },
          { collapsed: true }
        ),
      });

    // Create stable fallback vectors
    const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
    const fallbackVelocity = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    // Callback when ProceduralTerrain4 heightmap is ready
    const handleHeightmapReady = useCallback((fn) => {
      console.log(
        "✅ Map9 received heightmap lookup from ProceduralTerrain4 (Simplex)"
      );
      setHeightmapLookup(() => fn);
      // Mark terrain mesh as ready after a short delay to ensure materials are compiled
      setTimeout(() => {
        setIsTerrainMeshReady(true);
        console.log("✅ Map9 terrain mesh ready, HeightFog can now apply");
      }, 100);
    }, []);

    // Ground height function for grass - only works after heightmap is ready
    const getGroundHeight = useCallback(
      (x, z) => {
        if (!heightmapLookup) {
          return 0;
        }
        return heightmapLookup(x, z);
      },
      [heightmapLookup]
    );

    const deerSpawnPosition = useMemo(() => {
      const x = 5;
      const z = 5;
      const baseHeight = getGroundHeight(x, z);
      const height = Number.isFinite(baseHeight) ? baseHeight + 1 : 50;
      return [x, height, z];
    }, [getGroundHeight]);

    // Generate heightmap texture from getGroundHeight for GrassClaude4
    // GrassClaude4 uses shader-based heightmap sampling, so we need a texture
    const { heightmapTexture, terrainHeight, terrainOffset } = useMemo(() => {
      if (!heightmapLookup || !isTerrainMeshReady) {
        return { heightmapTexture: null, terrainHeight: 0, terrainOffset: 0 };
      }

      // Terrain size - should match ProceduralTerrain8 size
      // Using 2500 as default based on other grass systems in Map9
      const terrainSize = 2500;
      const textureSize = 1024; // Resolution of heightmap texture (higher = more accurate but slower)
      // 1024x1024 gives ~2.4 units per pixel for 2500 unit terrain (good balance of quality and performance)

      // Sample terrain at regular intervals
      // IMPORTANT: The shader inverts Z coordinate (remaps to 1.0, 0.0 instead of 0.0, 1.0)
      // So we need to flip the texture Y coordinate to match
      // Texture UV: (0,0) maps to world (-terrainSize/2, terrainSize/2)
      // Texture UV: (1,1) maps to world (terrainSize/2, -terrainSize/2)
      const data = new Float32Array(textureSize * textureSize);
      let minHeight = Infinity;
      let maxHeight = -Infinity;

      // First pass: sample heights and find min/max
      for (let y = 0; y < textureSize; y++) {
        for (let x = 0; x < textureSize; x++) {
          // Convert texture coordinates to world coordinates
          // Note: texture Y is inverted to match shader's Z inversion
          const worldX = (x / textureSize) * terrainSize - terrainSize / 2;
          // Flip Y: texture Y=0 should map to world Z=+terrainSize/2 (top of texture = positive Z)
          const worldZ =
            ((textureSize - 1 - y) / textureSize) * terrainSize -
            terrainSize / 2;
          const height = heightmapLookup(worldX, worldZ);

          // Store in data array (row-major order: y * textureSize + x)
          const index = y * textureSize + x;
          data[index] = height;
          minHeight = Math.min(minHeight, height);
          maxHeight = Math.max(maxHeight, height);
        }
      }

      // Second pass: normalize heights to 0-1 range
      const heightRange = maxHeight - minHeight;
      for (let i = 0; i < data.length; i++) {
        const normalizedHeight =
          heightRange > 0 ? (data[i] - minHeight) / heightRange : 0.5;
        data[i] = normalizedHeight;
      }

      // Create DataTexture (single channel, red channel will be used)
      const texture = new THREE.DataTexture(
        data,
        textureSize,
        textureSize,
        THREE.RedFormat,
        THREE.FloatType
      );
      texture.needsUpdate = true;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // The shader calculates: grassBladeWorldPos.y += heightmapSample.x * terrainHeight - terrainOffset
      // Where heightmapSample.x is normalized (0-1), representing (originalHeight - minHeight) / heightRange
      // To recover: originalHeight = heightmapSample.x * heightRange + minHeight
      // We want the shader to add originalHeight, so:
      // terrainHeight = heightRange (to scale from 0-1 back to actual range)
      // terrainOffset = minHeight (to offset from 0 to actual minimum)
      // But wait, the shader does: Y += textureValue * terrainHeight - terrainOffset
      // So: Y += textureValue * heightRange - minHeight
      // Which gives: Y += (originalHeight - minHeight) / heightRange * heightRange - minHeight
      // = Y += originalHeight - minHeight - minHeight = Y += originalHeight - 2*minHeight (WRONG!)
      //
      // Actually, we want: Y += originalHeight
      // So: textureValue * terrainHeight - terrainOffset = originalHeight
      // = ((originalHeight - minHeight) / heightRange) * terrainHeight - terrainOffset = originalHeight
      // = ((originalHeight - minHeight) / heightRange) * terrainHeight = originalHeight + terrainOffset
      // = (originalHeight - minHeight) * terrainHeight / heightRange = originalHeight + terrainOffset
      //
      // If terrainHeight = heightRange and terrainOffset = -minHeight:
      // = (originalHeight - minHeight) * heightRange / heightRange = originalHeight - minHeight
      // = originalHeight - minHeight = originalHeight - minHeight ✓
      // Wait, that's still wrong...
      //
      // Let me think again. We want: Y += originalHeight
      // textureValue = (originalHeight - minHeight) / heightRange
      // Shader does: Y += textureValue * terrainHeight - terrainOffset
      // We want: textureValue * terrainHeight - terrainOffset = originalHeight
      // So: ((originalHeight - minHeight) / heightRange) * terrainHeight - terrainOffset = originalHeight
      // = (originalHeight - minHeight) * terrainHeight / heightRange - terrainOffset = originalHeight
      // = (originalHeight - minHeight) * terrainHeight / heightRange = originalHeight + terrainOffset
      //
      // If terrainHeight = heightRange and terrainOffset = -minHeight:
      // = (originalHeight - minHeight) * heightRange / heightRange = originalHeight - minHeight
      // = originalHeight - minHeight = originalHeight - minHeight ✓
      // But we want originalHeight, not originalHeight - minHeight!
      //
      // So we need: terrainOffset = 0 and terrainHeight = heightRange, then:
      // = (originalHeight - minHeight) * heightRange / heightRange = originalHeight - minHeight
      // But we want originalHeight, so we need to add minHeight back:
      // terrainOffset = minHeight (positive offset)
      // Wait, that's still not right...
      //
      // Actually, let me re-read the shader code:
      // grassBladeWorldPos.y += heightmapSample.x * grassParams.z - grassParams.w;
      // Where grassParams.z = terrainHeight, grassParams.w = terrainOffset
      // So: Y += textureValue * terrainHeight - terrainOffset
      //
      // We want: Y += originalHeight
      // textureValue = (originalHeight - minHeight) / heightRange
      // So: ((originalHeight - minHeight) / heightRange) * terrainHeight - terrainOffset = originalHeight
      // = (originalHeight - minHeight) * terrainHeight / heightRange - terrainOffset = originalHeight
      // = (originalHeight - minHeight) * terrainHeight / heightRange = originalHeight + terrainOffset
      //
      // If terrainHeight = heightRange:
      // = (originalHeight - minHeight) - terrainOffset = originalHeight
      // = originalHeight - minHeight - terrainOffset = originalHeight
      // = -minHeight - terrainOffset = 0
      // = terrainOffset = -minHeight
      //
      // So: Y += ((originalHeight - minHeight) / heightRange) * heightRange - (-minHeight)
      // = Y += (originalHeight - minHeight) + minHeight
      // = Y += originalHeight ✓ CORRECT!

      return {
        heightmapTexture: texture,
        terrainHeight: heightRange > 0 ? heightRange : 100,
        terrainOffset: minHeight !== Infinity ? -minHeight : 0,
      };
    }, [heightmapLookup, isTerrainMeshReady]);

    // Calculate terrain height for WindFlag position
    // WindFlag positions pole center at poleHeight/2 above group position
    // So we need to place group at terrainHeight - poleHeight/2 to get pole base at terrainHeight
    // Add user-adjustable Y offset
    const windFlagTerrainHeight =
      windFlagEnabled && heightmapLookup
        ? getGroundHeight(windFlagPosition[0], windFlagPosition[2]) -
          windFlagPoleHeight / 2 +
          windFlagYOffset
        : 0;

    // Debug: Log the calculated height
    if (windFlagEnabled && heightmapLookup) {
      console.log(
        `Map9 - WindFlag at [${windFlagPosition[0]}, ${windFlagPosition[2]}] -> terrain height: ${windFlagTerrainHeight}`
      );
    }

    // Calculate terrain height for AnimatedTree2 position
    const animatedTree2TerrainHeight =
      animatedTree2Enabled && heightmapLookup
        ? getGroundHeight(animatedTree2PositionX, animatedTree2PositionZ) +
          animatedTree2PositionY
        : animatedTree2PositionY;

    // Calculate terrain height for AdBillboard position
    // AdBillboard positions pylon center at pylonHeight/2 above group position
    // So we need to place group at terrainHeight - pylonHeight/2 to get pylon base at terrainHeight
    // Add user-adjustable Y offset
    const adBillboardTerrainHeight =
      adBillboardEnabled && heightmapLookup
        ? getGroundHeight(adBillboardPosition[0], adBillboardPosition[2]) -
          adBillboardPylonHeight / 2 +
          adBillboardYOffset
        : 0;

    // Debug: Log the calculated height
    if (adBillboardEnabled && heightmapLookup) {
      console.log(
        `Map9 - AdBillboard at [${adBillboardPosition[0]}, ${adBillboardPosition[2]}] -> terrain height: ${adBillboardTerrainHeight}`
      );
    }

    // Calculate terrain height for Water position
    const waterTerrainHeight =
      waterEnabled && heightmapLookup
        ? getGroundHeight(waterPositionX, waterPositionZ) + waterPositionY
        : waterPositionY;

    return (
      <group ref={group} {...props}>
        <CloudSystem />
        <ProceduralTerrain8
          onTerrainReady={onTerrainReady}
          onHeightmapReady={handleHeightmapReady}
        />

        {/* Only render HeightFog after terrain mesh is ready */}
        {isTerrainMeshReady && (
          <HeightFog
            enabled={heightFogEnabled}
            fogColor={fogColor}
            fogHeight={fogHeight}
            fogNear={fogNear}
            fogFar={fogFar}
          />
        )}

        {/* SimonDevGrass21 Grass System - Only render when heightmap is ready */}
        {simonDevGrass21Enabled && heightmapLookup && (
          <SimonDevGrass21
            areaSize={200}
            mapSize={2500}
            grassHeight={1.0}
            grassScale={1.0}
            getGroundHeight={getGroundHeight}
            characterPosition={characterPosition || fallbackPosition}
          />
        )}

        {/* SimonDevGrass22 Grass System - Only render when heightmap is ready */}
        {simonDevGrass22Enabled && heightmapLookup && (
          <SimonDevGrass22
            areaSize={200}
            mapSize={2500}
            grassHeight={1.0}
            grassScale={1.0}
            getGroundHeight={getGroundHeight}
            characterPosition={characterPosition || fallbackPosition}
          />
        )}

        {/* SimonDevGrass23 Grass System - Only render when heightmap is ready */}
        {simonDevGrass23Enabled && heightmapLookup && (
          <SimonDevGrass23
            areaSize={200}
            mapSize={2500}
            grassHeight={1.0}
            grassScale={1.0}
            getGroundHeight={getGroundHeight}
            characterPosition={characterPosition || fallbackPosition}
          />
        )}

        {/* GrassClaude4 Grass System - Only render when terrain is fully ready */}
        {grassClaude4Enabled &&
          isTerrainMeshReady &&
          heightmapLookup &&
          heightmapTexture && (
            <GrassField4
              gridSize={grassGridSize}
              patchSpacing={patchSpacing}
              centerPosition={[0, 0, 0]}
              playerPosition={characterPosition || fallbackPosition}
              segments={grassSegments}
              numGrass={numGrass}
              patchSize={patchSize}
              grassWidth={grassWidth}
              grassHeight={grassHeight}
              lodDistance={lodDistance}
              maxDistance={maxDistance}
              heightmap={heightmapTexture}
              terrainSize={2500}
              terrainHeight={terrainHeight}
              terrainOffset={terrainOffset}
              baseColor1={baseColor1}
              baseColor2={baseColor2}
              tipColor1={tipColor1}
              tipColor2={tipColor2}
              backscatterEnabled={backscatterEnabled}
              backscatterIntensity={backscatterIntensity}
              backscatterColor={backscatterColor}
              backscatterPower={backscatterPower}
              frontScatterStrength={frontScatterStrength}
              rimSSSStrength={rimSSSStrength}
              specularEnabled={specularEnabled}
              specularIntensity={specularIntensity}
              specularColor={specularColor}
              specularPower={specularPower}
              specularScale={specularScale}
              lightDirectionX={lightDirectionX}
              lightDirectionY={lightDirectionY}
              lightDirectionZ={lightDirectionZ}
              windEnabled={windEnabled}
              windStrength={windStrength}
              windDirectionScale={windDirectionScale}
              windDirectionSpeed={windDirectionSpeed}
              windStrengthScale={windStrengthScale}
              windStrengthSpeed={windStrengthSpeed}
              playerInteractionEnabled={playerInteractionEnabled}
              playerInteractionRange={playerInteractionRange}
              playerInteractionStrength={playerInteractionStrength}
              normalMixEnabled={normalMixEnabled}
              normalMixFactor={normalMixFactor}
              aoEnabled={aoEnabled}
              aoIntensity={aoIntensity}
              fogEnabled={grassFogEnabled}
              fogNear={grassFogNear}
              fogFar={grassFogFar}
              fogColor={grassFogColor}
              fogIntensity={grassFogIntensity}
            />
          )}

        {/* GrassClaude5 Grass System - Only render when terrain is fully ready */}
        {grassClaude5Enabled &&
          isTerrainMeshReady &&
          heightmapLookup &&
          heightmapTexture && (
            <GrassField5
              gridSize={grassGridSize5}
              patchSpacing={patchSpacing5}
              centerPosition={[0, 0, 0]}
              playerPosition={characterPosition || fallbackPosition}
              getGroundHeight={getGroundHeight}
              segments={grassSegments5}
              numGrass={numGrass5}
              patchSize={patchSize5}
              grassWidth={grassWidth5}
              grassHeight={grassHeight5}
              lodDistance={lodDistance5}
              maxDistance={maxDistance5}
              heightmap={heightmapTexture}
              terrainSize={2500}
              terrainHeight={terrainHeight}
              terrainOffset={terrainOffset}
              baseColor1={baseColor1_5}
              baseColor2={baseColor2_5}
              tipColor1={tipColor1_5}
              tipColor2={tipColor2_5}
              gradientBlend={gradientBlend5}
              gradientCurve={gradientCurve5}
              backscatterEnabled={backscatterEnabled5}
              backscatterIntensity={backscatterIntensity5}
              backscatterColor={backscatterColor5}
              backscatterPower={backscatterPower5}
              frontScatterStrength={frontScatterStrength5}
              rimSSSStrength={rimSSSStrength5}
              specularEnabled={specularEnabled5}
              specularIntensity={specularIntensity5}
              specularColor={specularColor5}
              specularPower={specularPower5}
              specularScale={specularScale5}
              lightDirectionX={lightDirectionX5}
              lightDirectionY={lightDirectionY5}
              lightDirectionZ={lightDirectionZ5}
              windEnabled={windEnabled5}
              windStrength={windStrength5}
              windDirectionScale={windDirectionScale5}
              windDirectionSpeed={windDirectionSpeed5}
              windStrengthScale={windStrengthScale5}
              windStrengthSpeed={windStrengthSpeed5}
              playerInteractionEnabled={playerInteractionEnabled5}
              playerInteractionRange={playerInteractionRange5}
              playerInteractionStrength={playerInteractionStrength5}
              normalMixEnabled={normalMixEnabled5}
              normalMixFactor={normalMixFactor5}
              aoEnabled={aoEnabled5}
              aoIntensity={aoIntensity5}
              fogEnabled={grassFogEnabled5}
              fogNear={grassFogNear5}
              fogFar={grassFogFar5}
              fogColor={grassFogColor5}
              fogIntensity={grassFogIntensity5}
            />
          )}
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
            lineCount={lineCount}
            lineLength={lineLength}
            lineWidth={lineWidth}
            heightOffset={heightOffset}
            verticalWave={verticalWave}
            animationSpeed={animationSpeed}
            pathRadius={pathRadius}
            pathFrequency={pathFrequency}
            lineColor={lineColor}
            lineOpacity={lineOpacity}
            segments={segments}
            boundaryRadius={boundaryRadius}
            getTerrainHeight={getGroundHeight}
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
        {/* Floating Leaves */}
        {heightmapLookup && (
          <FloatingLeaves getTerrainHeight={getGroundHeight} />
        )}
        {/* Tornado Leaves - Tornado animation around character */}
        {heightmapLookup && (
          <TornadoLeaves
            characterPosition={characterPosition || fallbackPosition}
            getTerrainHeight={getGroundHeight}
          />
        )}
        {/* Falling Leaves - Shader-based falling leaves */}
        {fallingLeavesEnabled && heightmapLookup && (
          <FallingLeaves
            leafTexture={fallingLeavesTexture}
            leafColor={fallingLeavesColor}
            count={fallingLeavesCount}
            rotationSpeed={fallingLeavesRotationSpeed}
            spawnAreaSize={fallingLeavesSpawnAreaSize}
            spawnHeightMin={fallingLeavesSpawnHeightMin}
            spawnHeightMax={fallingLeavesSpawnHeightMax}
            spawnCenter={[
              fallingLeavesSpawnCenterX,
              fallingLeavesSpawnCenterY,
              fallingLeavesSpawnCenterZ,
            ]}
            getTerrainHeight={getGroundHeight}
          />
        )}
        {/* Butterfly Particles */}
        {butterflyEnabled && butterflyTexture !== "both" && heightmapLookup && (
          <ButterflyParticles
            enabled={butterflyEnabled}
            count={butterflyCount}
            spawnRange={butterflySpawnRange}
            maxDistance={butterflyMaxDistance}
            butterflySize={butterflySize}
            texture={butterflyTexture}
            heightMin={butterflyHeightMin}
            heightMax={butterflyHeightMax}
            spreadRadius={butterflySpreadRadius}
            getTerrainHeight={getGroundHeight}
          />
        )}
        {/* Render both butterflies AND moths when "both" is selected */}
        {butterflyEnabled && butterflyTexture === "both" && heightmapLookup && (
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
              getTerrainHeight={getGroundHeight}
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
              getTerrainHeight={getGroundHeight}
            />
          </>
        )}
        {/* Dust Particles */}
        {dustEnabled && heightmapLookup && (
          <DustParticles
            enabled={dustEnabled}
            count={dustCount}
            spawnRange={dustSpawnRange}
            maxDistance={dustMaxDistance}
            dustSize={dustSize}
            getTerrainHeight={getGroundHeight}
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
        {heightmapLookup && <ParticlesFog getTerrainHeight={getGroundHeight} />}
        {/* Dynamic Leaves v3 */}
        {dynamicLeaves3Enabled && heightmapLookup && (
          <DynamicLeaves3
            count={dynamicLeaves3Count}
            areaSize={dynamicLeaves3AreaSize}
            ybotPosition={characterPosition || fallbackPosition}
            ybotVelocity={characterVelocity || fallbackVelocity}
            getGroundHeight={getGroundHeight}
            characterInteractionRange={dynamicLeaves3InteractionRange}
            characterPushStrength={dynamicLeaves3PushStrength}
            characterSwirlStrength={dynamicLeaves3SwirlStrength}
          />
        )}
        {/* Wildlife */}
        {isTerrainMeshReady && heightmapLookup && (
          <>
            <DeerController position={deerSpawnPosition} />
            <DeerHerd spawnHeight={deerSpawnPosition[1]} />
          </>
        )}
        {/* Wind Flag */}
        {windFlagEnabled && heightmapLookup && (
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
        {/* AdBillboard - Rigid billboard with two pylons */}
        {adBillboardEnabled && heightmapLookup && (
          <AdBillboard
            position={[
              adBillboardPosition[0],
              adBillboardTerrainHeight,
              adBillboardPosition[2],
            ]}
            scale={adBillboardScale}
            billboardColor={adBillboardColor}
            pylonHeight={adBillboardPylonHeight}
            billboardWidth={adBillboardWidth}
            billboardHeight={adBillboardHeight}
            pylonSpacing={adBillboardPylonSpacing}
            pylonRadius={adBillboardPylonRadius}
            useTexture={adBillboardUseTexture}
            texturePath={adBillboardTexturePath}
            textureQuality={adBillboardTextureQuality}
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
        {/* Quarry Rocks */}
        {heightmapLookup && (
          <QuarryRocks
            enabled={quarryRocksEnabled}
            position={quarryRocksPosition}
            scale={quarryRocksScale}
            rotation={quarryRocksRotation}
            getTerrainHeight={getGroundHeight}
          />
        )}
        {/* Rock1 */}
        {heightmapLookup && (
          <Rock1
            enabled={rock1Enabled}
            position={rock1Position}
            scale={rock1Scale}
            rotation={rock1Rotation}
            getTerrainHeight={getGroundHeight}
          />
        )}
        {/* Shoreline Effect */}
        {heightmapLookup && (
          <ShorelineEffect
            terrainSize={2500}
            waterLevel={waterLevel}
            enableShoreline={shorelineEnabled}
            shorelineIntensity={shorelineIntensity}
            shorelineWidth={shorelineWidth}
            shorelineColor1={shorelineColor1}
            shorelineColor2={shorelineColor2}
            waveSpeed={waveSpeed}
            waveAmplitude={waveAmplitude}
            noiseScale={noiseScale}
            gradientSharpness={gradientSharpness}
            debugMode={debugMode}
          />
        )}
        {/* Impostor Forest */}
        {impostorForestEnabled && heightmapLookup && (
          <ImpostorForest
            centerPosition={[centerX, centerY, centerZ]}
            radius={radius}
            minRadius={minRadius}
            treeCount={treeCount}
            getTerrainHeight={getGroundHeight}
            lodDistances={{ mid: lodMid, low: lodFar }}
            leavesAlphaTest={leavesAlphaTest}
            leavesOpacity={leavesOpacity}
            impostorAlphaClamp={impostorAlphaClamp}
          />
        )}

        {/* Instanced Trees - Using InstancedMesh2 */}
        {instancedTreesEnabled && heightmapLookup && (
          <InstancedTrees
            count={instancedTreeCount}
            position={[
              instancedPositionX,
              instancedPositionY,
              instancedPositionZ,
            ]}
            radius={instancedRadius}
            minRadius={instancedMinRadius}
            scaleRange={[scaleRangeMin, scaleRangeMax]}
            enabled={instancedTreesEnabled}
            getTerrainHeight={getGroundHeight}
            enableBVH={enableBVH}
            bvhMargin={bvhMargin}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
            enableTransparentSorting={enableTransparentSorting}
            enableViewThickening={enableViewThickening}
            viewThickenPower={viewThickenPower}
            viewThickenStrength={viewThickenStrength}
          />
        )}

        {/* Instanced Pines - Using InstancedMesh2 */}
        {instancedPinesEnabled && heightmapLookup && (
          <InstancedPines
            count={instancedPineCount}
            position={[
              instancedPinePositionX,
              instancedPinePositionY,
              instancedPinePositionZ,
            ]}
            radius={instancedPineRadius}
            minRadius={instancedPineMinRadius}
            scaleRange={[pineScaleRangeMin, pineScaleRangeMax]}
            enabled={instancedPinesEnabled}
            getTerrainHeight={getGroundHeight}
            enableBVH={pineEnableBVH}
            bvhMargin={pineBvhMargin}
            castShadow={pineCastShadow}
            receiveShadow={pineReceiveShadow}
            enableTransparentSorting={pineEnableTransparentSorting}
            enableViewThickening={pineEnableViewThickening}
            viewThickenPower={pineViewThickenPower}
            viewThickenStrength={pineViewThickenStrength}
            aoEnabled={pineAoEnabled}
            aoIntensity={pineAoIntensity}
            backscatterEnabled={pineBackscatterEnabled}
            backscatterIntensity={pineBackscatterIntensity}
            backscatterColor={pineBackscatterColor}
            backscatterPower={pineBackscatterPower}
            frontScatterStrength={pineFrontScatterStrength}
            rimSSSStrength={pineRimSSSStrength}
            lightDirectionX={pineLightDirectionX}
            lightDirectionY={pineLightDirectionY}
            lightDirectionZ={pineLightDirectionZ}
          />
        )}

        {/* Animated Tree 2 - Interactive tree with full controls */}
        {animatedTree2Enabled && heightmapLookup && (
          <AnimatedTree2
            position={[
              animatedTree2PositionX,
              animatedTree2TerrainHeight,
              animatedTree2PositionZ,
            ]}
            scale={animatedTree2Scale}
            enableMouseInteraction={animatedTree2MouseInteraction}
            castShadow={animatedTree2CastShadow}
            receiveShadow={animatedTree2ReceiveShadow}
            colorA={animatedTree2ColorA}
            colorB={animatedTree2ColorB}
            colorC={animatedTree2ColorC}
            gradientThreshold={animatedTree2GradientThreshold}
            gradientPower={animatedTree2GradientPower}
            treeModelPath={animatedTree2ModelPath}
            noiseTexturePath={animatedTree2NoiseTexturePath}
            poleTexturePath={animatedTree2PoleTexturePath}
          />
        )}

        {/* Instanced Billboard Trees - Using InstancedMesh2 */}
        {instancedBillboardTreesEnabled && heightmapLookup && (
          <InstancedBillboardTrees
            count={instancedBillboardTreeCount}
            position={[
              instancedBillboardPositionX,
              instancedBillboardPositionY,
              instancedBillboardPositionZ,
            ]}
            radius={instancedBillboardRadius}
            minRadius={instancedBillboardMinRadius}
            scaleRange={[billboardScaleRangeMin, billboardScaleRangeMax]}
            enabled={instancedBillboardTreesEnabled}
            getTerrainHeight={getGroundHeight}
            yOffset={billboardYOffset}
            enableBVH={billboardEnableBVH}
            bvhMargin={billboardBvhMargin}
            castShadow={billboardCastShadow}
            receiveShadow={billboardReceiveShadow}
            enableTransparentSorting={billboardEnableTransparentSorting}
            enableViewThickening={billboardEnableViewThickening}
            viewThickenPower={billboardViewThickenPower}
            viewThickenStrength={billboardViewThickenStrength}
            aoEnabled={billboardAoEnabled}
            aoIntensity={billboardAoIntensity}
            backscatterEnabled={billboardBackscatterEnabled}
            backscatterIntensity={billboardBackscatterIntensity}
            backscatterColor={billboardBackscatterColor}
            backscatterPower={billboardBackscatterPower}
            frontScatterStrength={billboardFrontScatterStrength}
            rimSSSStrength={billboardRimSSSStrength}
            lightDirectionX={billboardLightDirectionX}
            lightDirectionY={billboardLightDirectionY}
            lightDirectionZ={billboardLightDirectionZ}
            enableRotation={billboardEnableRotation}
            rotationDampingDistance={billboardRotationDampingDistance}
            rotationStopDistance={billboardRotationStopDistance}
            rotationThreshold={billboardRotationThreshold}
            rotationSmoothing={billboardRotationSmoothing}
            alphaTest={billboardAlphaTest}
            premultiplyAlpha={billboardPremultiplyAlpha}
            edgeBleedCompensation={billboardEdgeBleedCompensation}
            enableDistanceAlphaTest={billboardDistanceAlphaTest}
            distanceAlphaStart={billboardDistanceAlphaStart}
            distanceAlphaEnd={billboardDistanceAlphaEnd}
          />
        )}

        {/* Forest - ManciniForest billboard trees */}
        {forestEnabled && heightmapLookup && (
          <Forest
            numTrees={forestNumTrees}
            innerRadius={forestInnerRadius}
            outerRadius={forestOuterRadius}
            position={[forestPositionX, forestPositionY, forestPositionZ]}
            getTerrainHeight={getGroundHeight}
          />
        )}

        {/* Water - Shader-based water surface */}
        {waterEnabled && (
          <Water
            base={waterBaseMaterial}
            waterColor={waterColor}
            waterHighlightColor={waterHighlightColor}
            waterBrightness={waterBrightness}
            flatShading={waterFlatshading}
            size={waterSize}
            segments={waterSegments}
            waterOffset={waterOffset}
            waterContrast={waterContrast}
            waterTimeSpeed={waterTimeSpeed}
            waterHeight={waterHeight}
            waterWaveAmplitude={waterWaveAmplitude}
            waterWaveFrequency={waterWaveFrequency}
            position={[waterPositionX, waterTerrainHeight, waterPositionZ]}
          />
        )}

        {/* <Lake position={[0, -5, 0]} /> */}
        {/* Physics Debug Cubes - Only render when terrain is ready */}
        {isTerrainMeshReady && (
          <PhysicsDebugCubes
            enabled={physicsDebugCubesEnabled}
            spawnHeight={physicsDebugCubesSpawnHeight}
          />
        )}
      </group>
    );
  }
);
