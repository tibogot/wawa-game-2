import { RigidBody } from "@react-three/rapier";
import { useRef, useMemo, useEffect } from "react";
import { useControls, folder } from "leva";
import { DynamicLeaves as DynamicLeaves3 } from "./DynamicLeaves3";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import { SimonDevGrass22 } from "./SimonDevGrass22/SimonDevGrass22";
import { SimonDevGrass23 } from "./SimonDevGrass23/SimonDevGrass23";
import { GrassField } from "./GrassClaude2";
import { GrassField as GrassField3 } from "./GrassClaude3";
import { GrassField as GrassField4 } from "./GrassClaude4";
import { GrassField as GrassField6 } from "./GrassClaude6";
import { GrassField as GrassField7 } from "./GrassClaude7";
import ClaudeGrassQuick from "./ClaudeGrassQuick";
import ClaudeGrassQuick2 from "./ClaudeGrassQuick2";
import ClaudeGrassQuick3 from "./ClaudeGrassQuick3";
import { ImpostorForest } from "./ImpostorForest";
import { LeafPileMountain } from "./LeafPileMountain";
import { useDynamicLeaves3Controls } from "./useDynamicLeaves3Controls";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";
import { useSimonDevGrass22Controls } from "./useSimonDevGrass22Controls";
import { useSimonDevGrass23Controls } from "./useSimonDevGrass23Controls";
import { useGrassClaudeControls } from "./useGrassClaudeControls";
import { useGrassClaude3Controls } from "./useGrassClaude3Controls";
import { useGrassClaude4Controls } from "./useGrassClaude4Controls";
import { useGrassClaude6Controls } from "./useGrassClaude6Controls";
import { useGrassClaude7Controls } from "./useGrassClaude7Controls";
import useClaudeGrassQuickControls from "./useClaudeGrassQuickControls";
import useClaudeGrassQuick2Controls from "./useClaudeGrassQuick2Controls";
import useClaudeGrassQuick3Controls from "./useClaudeGrassQuick3Controls";
import { useImpostorForestControls } from "./useImpostorForestControls";
import { useLeafPileMountainControls } from "./useLeafPileMountainControls";
import { useInstancedTreesControls } from "./useInstancedTreesControls";
import { useInstancedBillboardTreesControls } from "./useInstancedBillboardTreesControls";
import { useInstancedPinesControls } from "./useInstancedPinesControls";
import { useInstancedGrassSpriteControls } from "./useInstancedGrassSpriteControls";
import { useYellowFlowerControls } from "./useYellowFlowerControls";
import { useLensFlareControls } from "./useLensFlareControls";
import LensFlare from "./LensFlare";
import { FlowingLinesSimple } from "./FlowingLinesSimple";
import { WindFlag } from "./WindFlag";
import { useWindFlagControls } from "./useWindFlagControls";
import { AdBillboard } from "./AdBillboard";
import { useAdBillboardControls } from "./useAdBillboardControls";
import { RipplePlane } from "./RipplePlane";
import { DeerController } from "./DeerController";
import { DeerHerd } from "./DeerHerd";
import { TornadoLeaves } from "./TornadoLeaves";
import { FloatingLeaves } from "./FloatingLeaves";
import FallingLeaves from "./FallingLeaves";
import { Skybox } from "./Skybox";
import HorizonSky from "./HorizonSky";
import { Tree } from "./Tree";
import { InstancedTrees } from "./InstancedTrees";
import { InstancedBillboardTrees } from "./InstancedBillboardTrees";
import { InstancedPines } from "./InstancedPines";
import { InstancedGrassSprite } from "./InstancedGrassSprite";
import { YellowFlower } from "./YellowFlower";
import { WildflowerField } from "./WildflowerMeadow";
import { TyphaReedField } from "./TyphaReedComponent";
import Roseau from "./Roseau";
import { AnimatedTree } from "./AnimatedTree";
import { AnimatedTree2 } from "./AnimatedTree2";
import { AnimatedTree3 } from "./AnimatedTree3";
import { useAnimatedTree2Controls } from "./useAnimatedTree2Controls";
import { useAnimatedTree3Controls } from "./useAnimatedTree3Controls";
import { useInstancedAnimatedTreesControls } from "./useInstancedAnimatedTreesControls";
import { InstancedAnimatedTrees } from "./InstancedAnimatedTrees";
import Water from "./Water";
import Ice from "./Ice";
import Forest from "./ManciniForest";
import { useWaterControls } from "./useWaterControls";
import * as THREE from "three";
import {
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshNormalMaterial,
  MeshToonMaterial,
  MeshStandardMaterial,
  MeshPhongMaterial,
  MeshLambertMaterial,
  MeshMatcapMaterial,
  MeshDepthMaterial,
} from "three";
import { TileMaterial } from "./TileMaterial";
import { TILE_REFERENCE_SCALE, TILE_DENSITY } from "./tileMaterialConfig";

export const Map1 = ({
  scale = 1,
  position = [0, 0, 0],
  characterPosition,
  characterVelocity,
  ...props
}) => {
  const group = useRef();

  const { buildingGeometry, buildingPosition } = useMemo(() => {
    const width = 18 * scale;
    const height = 60 * scale;
    const depth = 14 * scale;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const tileSize = 1 / TILE_DENSITY;

    const positionAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const uvAttr = geometry.attributes.uv;

    const positionVector = new THREE.Vector3();
    const normalVector = new THREE.Vector3();

    for (let i = 0; i < uvAttr.count; i++) {
      positionVector.fromBufferAttribute(positionAttr, i);
      normalVector.fromBufferAttribute(normalAttr, i);

      const absNormalX = Math.abs(normalVector.x);
      const absNormalY = Math.abs(normalVector.y);
      const absNormalZ = Math.abs(normalVector.z);

      if (absNormalX >= absNormalY && absNormalX >= absNormalZ) {
        const u = (positionVector.z + depth * 0.5) / tileSize;
        const v = (positionVector.y + height * 0.5) / tileSize;
        uvAttr.setXY(i, u, v);
      } else if (absNormalY >= absNormalX && absNormalY >= absNormalZ) {
        const u = (positionVector.x + width * 0.5) / tileSize;
        const v = (positionVector.z + depth * 0.5) / tileSize;
        uvAttr.setXY(i, u, v);
      } else {
        const u = (positionVector.x + width * 0.5) / tileSize;
        const v = (positionVector.y + height * 0.5) / tileSize;
        uvAttr.setXY(i, u, v);
      }
    }

    uvAttr.needsUpdate = true;

    return {
      buildingGeometry: geometry,
      buildingPosition: [
        position[0] - 30 * scale,
        position[1] + height / 2,
        position[2] - 20 * scale,
      ],
    };
  }, [scale, position]);

  useEffect(() => {
    return () => {
      buildingGeometry.dispose();
    };
  }, [buildingGeometry]);

  // Simple ground height function for flat plane
  const getGroundHeight = useMemo(
    () => (x, z) => 0, // Flat plane at y=0
    []
  );

  // Get dynamicLeaves3 controls
  const {
    dynamicLeaves3Enabled,
    dynamicLeaves3Count,
    dynamicLeaves3AreaSize,
    dynamicLeaves3InteractionRange,
    dynamicLeaves3PushStrength,
    dynamicLeaves3SwirlStrength,
  } = useDynamicLeaves3Controls();

  // Get SimonDevGrass21 controls
  const { simonDevGrass21Enabled } = useSimonDevGrass21Controls();
  // Get SimonDevGrass22 controls (separate folder under FOLIAGE)
  const { simonDevGrass22Enabled } = useSimonDevGrass22Controls();
  // Get SimonDevGrass23 controls (separate folder under FOLIAGE)
  const { simonDevGrass23Enabled } = useSimonDevGrass23Controls();
  // Get GrassClaude controls
  const { grassClaudeEnabled } = useGrassClaudeControls();
  // Get GrassClaude3 controls
  // Leva flattens all folders, so controls are at top level
  const { grassClaude3Enabled } = useGrassClaude3Controls();
  // Get GrassClaude4 controls
  const {
    grassClaude4Enabled,
    grassHeight,
    gridSize,
    patchSpacing,
    segments,
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
    fogEnabled,
    fogNear,
    fogFar,
    fogColor,
    fogIntensity,
  } = useGrassClaude4Controls();

  // Get GrassClaude6 controls
  const {
    grassClaude6Enabled,
    grassHeight: grassHeight6,
    gridSize: gridSize6,
    patchSpacing: patchSpacing6,
    segments: segments6,
    numGrass: numGrass6,
    patchSize: patchSize6,
    grassWidth: grassWidth6,
    lodEnabled: lodEnabled6,
    lodDistance: lodDistance6,
    maxDistance: maxDistance6,
    baseColor1: baseColor1_6,
    baseColor2: baseColor2_6,
    tipColor1: tipColor1_6,
    tipColor2: tipColor2_6,
    gradientBlend: gradientBlend6,
    gradientCurve: gradientCurve6,
    backscatterEnabled: backscatterEnabled6,
    backscatterIntensity: backscatterIntensity6,
    backscatterColor: backscatterColor6,
    backscatterPower: backscatterPower6,
    frontScatterStrength: frontScatterStrength6,
    rimSSSStrength: rimSSSStrength6,
    specularEnabled: specularEnabled6,
    specularIntensity: specularIntensity6,
    specularColor: specularColor6,
    specularPower: specularPower6,
    specularScale: specularScale6,
    lightDirectionX: lightDirectionX6,
    lightDirectionY: lightDirectionY6,
    lightDirectionZ: lightDirectionZ6,
    windEnabled: windEnabled6,
    windStrength: windStrength6,
    windDirectionScale: windDirectionScale6,
    windDirectionSpeed: windDirectionSpeed6,
    windStrengthScale: windStrengthScale6,
    windStrengthSpeed: windStrengthSpeed6,
    playerInteractionEnabled: playerInteractionEnabled6,
    playerInteractionRange: playerInteractionRange6,
    playerInteractionStrength: playerInteractionStrength6,
    normalMixEnabled: normalMixEnabled6,
    normalMixFactor: normalMixFactor6,
    aoEnabled: aoEnabled6,
    aoIntensity: aoIntensity6,
    debugLOD: debugLOD6,
    debugNormals: debugNormals6,
    fogEnabled: fogEnabled6,
    fogNear: fogNear6,
    fogFar: fogFar6,
    fogColor: fogColor6,
    fogIntensity: fogIntensity6,
  } = useGrassClaude6Controls();

  // Get GrassClaude7 controls
  const { grassClaude7Enabled } = useGrassClaude7Controls();

  // Get ClaudeGrassQuick controls
  const claudeGrassQuickControls = useClaudeGrassQuickControls();
  // Get ClaudeGrassQuick2 controls
  // Leva flattens folder structure - all properties are at top level
  const claudeGrassQuick2Controls = useClaudeGrassQuick2Controls();
  // Get ClaudeGrassQuick3 controls
  const claudeGrassQuick3Controls = useClaudeGrassQuick3Controls();

  // Debug: log controls to see if they're updating
  useEffect(() => {
    if (claudeGrassQuick2Controls) {
      console.log("🌿 Map1 - claudeGrassQuick2Controls:", {
        lightDirectionX: claudeGrassQuick2Controls.lightDirectionX,
        lightDirectionY: claudeGrassQuick2Controls.lightDirectionY,
        lightDirectionZ: claudeGrassQuick2Controls.lightDirectionZ,
      });
    }
  }, [
    claudeGrassQuick2Controls?.lightDirectionX,
    claudeGrassQuick2Controls?.lightDirectionY,
    claudeGrassQuick2Controls?.lightDirectionZ,
  ]);

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

  // Get LeafPileMountain controls
  const {
    leafPileMountainEnabled,
    leafPileMountainCount,
    leafPileMountainPileRadius,
    leafPileMountainPileHeight,
    leafPileMountainPositionX,
    leafPileMountainPositionZ,
    leafPileMountainInteractionRange,
    leafPileMountainPushStrength,
    leafPileMountainSwirlStrength,
    leafPileMountainExplosionStrength,
  } = useLeafPileMountainControls();

  // Get Tree control (single tree component)
  const {
    treeEnabled,
    animatedTreeEnabled,
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
    typhaEnabled,
    typhaGridSize,
    typhaPatchSpacing,
    typhaSegments,
    typhaNumReeds,
    typhaPatchSize,
    typhaReedWidth,
    typhaReedHeight,
    typhaLodDistance,
    typhaMaxDistance,
    typhaCastShadow,
    typhaReceiveShadow,
    typhaCenterX,
    typhaCenterY,
    typhaCenterZ,
    typhaTerrainHeight,
    typhaTerrainOffset,
    typhaTerrainSize,
    roseauEnabled,
    roseauPositionX,
    roseauPositionY,
    roseauPositionZ,
    roseauStemHeight,
    roseauStemRadiusTop,
    roseauStemRadiusBottom,
    roseauStemRadialSegments,
    roseauStemHeightSegments,
    roseauCapsuleRadius,
    roseauCapsuleLength,
    roseauCapsuleRadialSegments,
    roseauCapsuleCapSegments,
    roseauVerticalSpacing,
    roseauStemColor,
    roseauCapsuleColor,
    roseauWindEnabled,
    roseauWindStrength,
    roseauWindSpeed,
    roseauWindGustStrength,
    roseauWindGustFrequency,
    roseauWindStiffness,
    roseauWindLean,
    roseauWindDirectionX,
    roseauWindDirectionZ,
  } = useControls("🌿 FOLIAGE", {
    tree: folder(
      {
        treeEnabled: {
          value: false,
          label: "🌲 Enable Single Tree",
        },
      },
      { collapsed: true }
    ),
    animatedTree: folder(
      {
        animatedTreeEnabled: {
          value: false,
          label: "🌳 Enable Animated Tree",
        },
      },
      { collapsed: true }
    ),
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
    typhaReeds: folder(
      {
        typhaEnabled: {
          value: false,
          label: "🌾 Enable Typha Reeds",
        },
        typhaGridSize: {
          value: 3,
          min: 1,
          max: 11,
          step: 1,
          label: "Grid Size",
        },
        typhaPatchSpacing: {
          value: 8,
          min: 4,
          max: 20,
          step: 1,
          label: "Patch Spacing",
        },
        typhaSegments: {
          value: 6,
          min: 3,
          max: 12,
          step: 1,
          label: "Segments",
        },
        typhaNumReeds: {
          value: 512,
          min: 64,
          max: 2048,
          step: 64,
          label: "Reeds Per Patch",
        },
        typhaPatchSize: {
          value: 10,
          min: 4,
          max: 20,
          step: 1,
          label: "Patch Size",
        },
        typhaReedWidth: {
          value: 0.1,
          min: 0.03,
          max: 0.25,
          step: 0.005,
          label: "Reed Width",
        },
        typhaReedHeight: {
          value: 1.2,
          min: 0.6,
          max: 3,
          step: 0.05,
          label: "Reed Height",
        },
        typhaLodDistance: {
          value: 20,
          min: 5,
          max: 40,
          step: 1,
          label: "LOD Distance",
        },
        typhaMaxDistance: {
          value: 120,
          min: 30,
          max: 200,
          step: 5,
          label: "Max Distance",
        },
        typhaCastShadow: {
          value: false,
          label: "Cast Shadow",
        },
        typhaReceiveShadow: {
          value: true,
          label: "Receive Shadow",
        },
        typhaCenterX: {
          value: 0,
          min: -50,
          max: 50,
          step: 1,
          label: "Center X",
        },
        typhaCenterY: {
          value: 0,
          min: -10,
          max: 10,
          step: 0.5,
          label: "Center Y",
        },
        typhaCenterZ: {
          value: 0,
          min: -50,
          max: 50,
          step: 1,
          label: "Center Z",
        },
        typhaTerrainHeight: {
          value: 10,
          min: 0,
          max: 30,
          step: 0.5,
          label: "Terrain Height Scale",
        },
        typhaTerrainOffset: {
          value: 0,
          min: -10,
          max: 10,
          step: 0.5,
          label: "Terrain Offset",
        },
        typhaTerrainSize: {
          value: 100,
          min: 10,
          max: 400,
          step: 10,
          label: "Terrain Size",
        },
      },
      { collapsed: true }
    ),
    roseauTest: folder(
      {
        roseauEnabled: {
          value: false,
          label: "🌱 Enable Roseau Test",
        },
        roseauPositionX: {
          value: 0,
          min: -20,
          max: 20,
          step: 0.25,
          label: "Position X",
        },
        roseauPositionY: {
          value: 0,
          min: -1,
          max: 2,
          step: 0.05,
          label: "Position Y",
        },
        roseauPositionZ: {
          value: 0,
          min: -20,
          max: 20,
          step: 0.25,
          label: "Position Z",
        },
        roseauStemHeight: {
          value: 0.75,
          min: 0.2,
          max: 1,
          step: 0.01,
          label: "Stem Height",
        },
        roseauStemRadiusTop: {
          value: 0.025,
          min: 0.005,
          max: 0.1,
          step: 0.001,
          label: "Stem Radius Top",
        },
        roseauStemRadiusBottom: {
          value: 0.035,
          min: 0.01,
          max: 0.15,
          step: 0.001,
          label: "Stem Radius Bottom",
        },
        roseauStemRadialSegments: {
          value: 12,
          min: 3,
          max: 64,
          step: 1,
          label: "Stem Radial Segments",
        },
        roseauStemHeightSegments: {
          value: 1,
          min: 1,
          max: 8,
          step: 1,
          label: "Stem Height Segments",
        },
        roseauCapsuleRadius: {
          value: 0.07,
          min: 0.03,
          max: 0.2,
          step: 0.005,
          label: "Capsule Radius",
        },
        roseauCapsuleLength: {
          value: 0.1,
          min: 0,
          max: 0.3,
          step: 0.01,
          label: "Capsule Length",
        },
        roseauCapsuleRadialSegments: {
          value: 16,
          min: 4,
          max: 64,
          step: 1,
          label: "Capsule Radial Segments",
        },
        roseauCapsuleCapSegments: {
          value: 8,
          min: 2,
          max: 32,
          step: 1,
          label: "Capsule Cap Segments",
        },
        roseauVerticalSpacing: {
          value: 0.0,
          min: 0,
          max: 0.1,
          step: 0.005,
          label: "Stem to Capsule Gap",
        },
        roseauStemColor: {
          value: "#4c7a2e",
          label: "Stem Color",
        },
        roseauCapsuleColor: {
          value: "#7d4f2c",
          label: "Capsule Color",
        },
        roseauWindEnabled: {
          value: true,
          label: "Wind Enabled",
        },
        roseauWindStrength: {
          value: 0.12,
          min: 0,
          max: 0.5,
          step: 0.01,
          label: "Wind Strength",
        },
        roseauWindSpeed: {
          value: 1.4,
          min: 0,
          max: 5,
          step: 0.1,
          label: "Wind Speed",
        },
        roseauWindGustStrength: {
          value: 0.04,
          min: 0,
          max: 0.3,
          step: 0.005,
          label: "Gust Strength",
        },
        roseauWindGustFrequency: {
          value: 0.6,
          min: 0,
          max: 3,
          step: 0.05,
          label: "Gust Frequency",
        },
        roseauWindStiffness: {
          value: 1.5,
          min: 0.2,
          max: 4,
          step: 0.1,
          label: "Stiffness",
        },
        roseauWindLean: {
          value: 0,
          min: -0.3,
          max: 0.3,
          step: 0.01,
          label: "Static Lean",
        },
        roseauWindDirectionX: {
          value: 1,
          min: -1,
          max: 1,
          step: 0.05,
          label: "Wind Dir X",
        },
        roseauWindDirectionZ: {
          value: 0.2,
          min: -1,
          max: 1,
          step: 0.05,
          label: "Wind Dir Z",
        },
      },
      { collapsed: true }
    ),
  });

  const {
    wildflowerFieldEnabled,
    wildflowerFieldGridSize,
    wildflowerFieldPatchSpacing,
    wildflowerFieldNumFlowers,
    wildflowerFieldPatchSize,
    wildflowerFieldStemWidth,
    wildflowerFieldStemHeight,
    wildflowerFieldFlowerSize,
    wildflowerFieldCenterX,
    wildflowerFieldCenterY,
    wildflowerFieldCenterZ,
    wildflowerFieldCastShadow,
    wildflowerFieldReceiveShadow,
    wildflowerFieldUseTexture,
    wildflowerFieldTexturePath,
    forestEnabled,
    forestNumTrees,
    forestInnerRadius,
    forestOuterRadius,
    forestPositionX,
    forestPositionY,
    forestPositionZ,
  } = useControls("🌿 FOLIAGE", {
    "🌸 Wildflowers": folder(
      {
        wildflowerFieldEnabled: {
          value: false,
          label: "🌸 Enable Wildflower Field",
        },
        wildflowerFieldGridSize: {
          value: 5,
          min: 1,
          max: 15,
          step: 1,
          label: "Grid Size",
        },
        wildflowerFieldPatchSpacing: {
          value: 8,
          min: 4,
          max: 20,
          step: 1,
          label: "Patch Spacing",
        },
        wildflowerFieldNumFlowers: {
          value: 32 * 32,
          min: 256,
          max: 128 * 128,
          step: 256,
          label: "Flowers Per Patch",
        },
        wildflowerFieldPatchSize: {
          value: 10,
          min: 2,
          max: 20,
          step: 1,
          label: "Patch Size",
        },
        wildflowerFieldStemWidth: {
          value: 0.03,
          min: 0.005,
          max: 0.1,
          step: 0.005,
          label: "Stem Width",
        },
        wildflowerFieldStemHeight: {
          value: 0.8,
          min: 0.2,
          max: 2,
          step: 0.05,
          label: "Stem Height",
        },
        wildflowerFieldFlowerSize: {
          value: 0.15,
          min: 0.05,
          max: 0.5,
          step: 0.01,
          label: "Flower Size",
        },
        wildflowerFieldCenterX: {
          value: 0,
          min: -50,
          max: 50,
          step: 1,
          label: "Center X",
        },
        wildflowerFieldCenterY: {
          value: 0,
          min: -10,
          max: 10,
          step: 0.5,
          label: "Center Y",
        },
        wildflowerFieldCenterZ: {
          value: 0,
          min: -50,
          max: 50,
          step: 1,
          label: "Center Z",
        },
        wildflowerFieldCastShadow: {
          value: false,
          label: "Cast Shadow",
        },
        wildflowerFieldReceiveShadow: {
          value: true,
          label: "Receive Shadow",
        },
        wildflowerFieldUseTexture: {
          value: false,
          label: "Use Flower Texture",
        },
        wildflowerFieldTexturePath: {
          value: "/textures/flower1.png",
          label: "Texture Path",
        },
      },
      { collapsed: true }
    ),
    "🌲 Forest": folder(
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
          max: 100,
          step: 1,
          label: "📐 Inner Radius",
        },
        forestOuterRadius: {
          value: 50,
          min: 1,
          max: 200,
          step: 1,
          label: "📐 Outer Radius",
        },
        forestPositionX: {
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: "📍 Position X",
        },
        forestPositionY: {
          value: 0,
          min: -10,
          max: 10,
          step: 0.1,
          label: "📍 Position Y",
        },
        forestPositionZ: {
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: "📍 Position Z",
        },
      },
      { collapsed: true }
    ),
  });

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

  // Get AnimatedTree3 controls
  const {
    animatedTree3Enabled,
    animatedTree3PositionX,
    animatedTree3PositionY,
    animatedTree3PositionZ,
    animatedTree3Scale,
    animatedTree3CastShadow,
    animatedTree3ReceiveShadow,
    animatedTree3ColorA,
    animatedTree3ColorB,
    animatedTree3ColorC,
    animatedTree3GradientThreshold,
    animatedTree3GradientPower,
    animatedTree3ModelPath,
    animatedTree3NoiseTexturePath,
    animatedTree3PoleTexturePath,
  } = useAnimatedTree3Controls();

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

  // Get InstancedGrassSprite controls
  const {
    instancedGrassSpriteEnabled,
    instancedGrassSpriteCount,
    instancedGrassSpritePositionX,
    instancedGrassSpritePositionY,
    instancedGrassSpritePositionZ,
    instancedGrassSpriteRadius,
    instancedGrassSpriteMinRadius,
    instancedGrassSpriteScaleRangeMin,
    instancedGrassSpriteScaleRangeMax,
    instancedGrassSpriteScale,
    instancedGrassSpriteCastShadow,
    instancedGrassSpriteReceiveShadow,
    instancedGrassSpriteEnableTransparentSorting,
    instancedGrassSpriteEnableBVH,
    instancedGrassSpriteBvhMargin,
    instancedGrassSpriteEnableViewThickening,
    instancedGrassSpriteViewThickenPower,
    instancedGrassSpriteViewThickenStrength,
  } = useInstancedGrassSpriteControls();

  // Get YellowFlower controls
  const {
    yellowFlowerEnabled,
    yellowFlowerCount,
    yellowFlowerPositionX,
    yellowFlowerPositionY,
    yellowFlowerPositionZ,
    yellowFlowerRadius,
    yellowFlowerMinRadius,
    yellowFlowerScaleRangeMin,
    yellowFlowerScaleRangeMax,
    yellowFlowerScale,
    yellowFlowerCastShadow,
    yellowFlowerReceiveShadow,
    yellowFlowerEnableTransparentSorting,
    yellowFlowerEnableBVH,
    yellowFlowerBvhMargin,
    yellowFlowerEnableViewThickening,
    yellowFlowerViewThickenPower,
    yellowFlowerViewThickenStrength,
  } = useYellowFlowerControls();

  // Get InstancedAnimatedTrees controls
  const { instancedAnimatedTreesEnabled } = useInstancedAnimatedTreesControls();

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
  } = useWaterControls();

  // Get FlowingLines, RipplePlane, Ice, and Forest controls - Map1 specific
  const {
    skyboxEnabled,
    horizonSkyEnabled,
    horizonSkyTopColor,
    horizonSkyBottomColor,
    horizonSkyOffset,
    horizonSkyExponent,
    horizonSkyRadius,
    flowingLinesEnabled,
    ripplePlaneEnabled,
    ripplePlaneSize,
    ripplePlaneSegments,
    ripplePlaneRadius,
    ripplePlaneStrength,
    ripplePlaneSpeed,
    ripplePlaneFrequency,
    ripplePlaneColor,
    ripplePlaneOpacity,
    ripplePlanePositionX,
    ripplePlanePositionY,
    ripplePlanePositionZ,
    iceEnabled,
    iceBaseMaterial,
    iceColor,
    frostColor,
    crackColor,
    frostIntensity,
    crackIntensity,
    iceThickness,
    iceBrightness,
    iceDisplacementScale,
    iceFlatshading,
    iceSize,
    iceSegments,
  } = useControls("🗺️ MAP 1", {
    skybox: folder(
      {
        skyboxEnabled: {
          value: true,
          label: "🌌 Enable Skybox",
        },
      },
      { collapsed: true }
    ),
    horizonSky: folder(
      {
        horizonSkyEnabled: {
          value: true,
          label: "🌅 Enable Horizon Sky",
        },
        horizonSkyTopColor: {
          value: "#0077ff",
          label: "🎨 Top Color",
        },
        horizonSkyBottomColor: {
          value: "#ffffff",
          label: "🎨 Bottom Color",
        },
        horizonSkyOffset: {
          value: 33,
          min: 0,
          max: 100,
          step: 1,
          label: "⬆️ Offset",
        },
        horizonSkyExponent: {
          value: 0.6,
          min: 0.1,
          max: 5,
          step: 0.1,
          label: "📈 Exponent",
        },
        horizonSkyRadius: {
          value: 4000,
          min: 500,
          max: 8000,
          step: 100,
          label: "🪐 Radius",
        },
      },
      { collapsed: true }
    ),
    flowingLines: folder(
      {
        flowingLinesEnabled: {
          value: false,
          label: "🌊 Enable Flowing Lines",
        },
      },
      { collapsed: true }
    ),
    ripplePlane: folder(
      {
        ripplePlaneEnabled: {
          value: false,
          label: "🌊 Enable Ripple Plane",
        },
        ripplePlaneSize: {
          value: 50,
          min: 10,
          max: 200,
          step: 1,
          label: "📏 Size",
        },
        ripplePlaneSegments: {
          value: 64,
          min: 16,
          max: 128,
          step: 8,
          label: "🔲 Segments",
        },
        ripplePlaneRadius: {
          value: 5.0,
          min: 1.0,
          max: 20.0,
          step: 0.5,
          label: "📐 Ripple Radius",
        },
        ripplePlaneStrength: {
          value: 0.5,
          min: 0.0,
          max: 2.0,
          step: 0.1,
          label: "💪 Ripple Strength",
        },
        ripplePlaneSpeed: {
          value: 2.0,
          min: 0.5,
          max: 10.0,
          step: 0.1,
          label: "⚡ Ripple Speed",
        },
        ripplePlaneFrequency: {
          value: 2.0,
          min: 0.5,
          max: 10.0,
          step: 0.1,
          label: "🌊 Wave Frequency",
        },
        ripplePlaneColor: {
          value: "#4a90e2",
          label: "🎨 Color",
        },
        ripplePlaneOpacity: {
          value: 0.8,
          min: 0.0,
          max: 1.0,
          step: 0.05,
          label: "👻 Opacity",
        },
        ripplePlanePositionX: {
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: "📍 Pos X",
        },
        ripplePlanePositionY: {
          value: 0.1,
          min: -10,
          max: 10,
          step: 0.1,
          label: "📍 Pos Y",
        },
        ripplePlanePositionZ: {
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: "📍 Pos Z",
        },
      },
      { collapsed: true }
    ),
    ice: folder(
      {
        iceEnabled: {
          value: false,
          label: "🧊 Enable Ice",
        },
        iceBaseMaterial: {
          options: {
            MeshPhysicalMaterial,
            MeshBasicMaterial,
            MeshMatcapMaterial,
            MeshNormalMaterial,
            MeshStandardMaterial,
            MeshPhongMaterial,
            MeshToonMaterial,
            MeshLambertMaterial,
            MeshDepthMaterial,
          },
          value: MeshPhysicalMaterial,
          label: "📦 Base Material",
        },
        iceColor: {
          value: "#a8d8f0",
          label: "🧊 Ice Color",
        },
        frostColor: {
          value: "#e8f4f8",
          label: "❄️ Frost Color",
        },
        crackColor: {
          value: "#6b9dc4",
          label: "💎 Crack Color",
        },
        frostIntensity: {
          value: 0.3,
          min: 0,
          max: 1,
          step: 0.01,
          label: "❄️ Frost Intensity",
        },
        crackIntensity: {
          value: 0.5,
          min: 0,
          max: 1,
          step: 0.01,
          label: "💎 Crack Intensity",
        },
        iceThickness: {
          value: 0.2,
          min: 0.1,
          max: 1.0,
          step: 0.01,
          label: "📏 Thickness",
        },
        iceBrightness: {
          value: 1.0,
          min: 0,
          max: 2,
          step: 0.01,
          label: "💡 Brightness",
        },
        iceDisplacementScale: {
          value: 0.02,
          min: 0,
          max: 0.1,
          step: 0.001,
          label: "🌊 Displacement Scale",
        },
        iceFlatshading: {
          value: false,
          label: "🔲 Flat Shading",
        },
        iceSize: {
          value: 5,
          min: 1,
          max: 100,
          step: 1,
          label: "📐 Size",
        },
        iceSegments: {
          value: 64,
          min: 16,
          max: 256,
          step: 8,
          label: "🔲 Segments",
        },
      },
      { collapsed: true }
    ),
  });

  // Create stable fallback vectors
  const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const fallbackVelocity = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // WindFlag controls (reuse shared hook used by other maps)
  const {
    windFlagEnabled,
    windFlagPosition,
    windFlagYOffset,
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
  } = useWindFlagControls();

  // AdBillboard controls
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

  return (
    <group ref={group} {...props}>
      {skyboxEnabled && <Skybox />}
      {horizonSkyEnabled && (
        <HorizonSky
          topColor={horizonSkyTopColor}
          bottomColor={horizonSkyBottomColor}
          offset={horizonSkyOffset}
          exponent={horizonSkyExponent}
          radius={horizonSkyRadius}
        />
      )}

      <RigidBody type="fixed" colliders="trimesh">
        <mesh
          position={position}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={scale}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <TileMaterial textureScale={TILE_REFERENCE_SCALE} />
        </mesh>
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={buildingPosition}
        friction={1}
        restitution={0}
      >
        <mesh castShadow receiveShadow>
          <primitive object={buildingGeometry} />
          <TileMaterial textureScale={TILE_DENSITY} />
        </mesh>
      </RigidBody>
      {/* WindFlag to visualize global wind */}
      {windFlagEnabled && (
        <WindFlag
          position={[
            windFlagPosition[0],
            -windFlagPoleHeight / 2 + windFlagYOffset,
            windFlagPosition[1],
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
      {adBillboardEnabled && (
        <AdBillboard
          position={[
            adBillboardPosition[0],
            -adBillboardPylonHeight / 2 + adBillboardYOffset,
            adBillboardPosition[1],
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
      {/* Dynamic Leaves v3 */}
      {dynamicLeaves3Enabled && (
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
      {/* SimonDevGrass21 Grass System */}
      {simonDevGrass21Enabled && (
        <SimonDevGrass21
          areaSize={200}
          mapSize={200}
          grassHeight={1.0}
          grassScale={1.0}
          getGroundHeight={getGroundHeight}
          characterPosition={characterPosition || fallbackPosition}
        />
      )}

      {/* SimonDevGrass22 Grass System */}
      {simonDevGrass22Enabled && (
        <SimonDevGrass22
          areaSize={200}
          mapSize={200}
          grassHeight={1.0}
          grassScale={1.0}
          getGroundHeight={getGroundHeight}
          characterPosition={characterPosition || fallbackPosition}
        />
      )}

      {/* SimonDevGrass23 Grass System */}
      {simonDevGrass23Enabled && (
        <SimonDevGrass23
          areaSize={200}
          mapSize={200}
          grassHeight={1.0}
          grassScale={1.0}
          getGroundHeight={getGroundHeight}
          characterPosition={characterPosition || fallbackPosition}
        />
      )}

      {/* GrassField4 - Claude grass system v4 */}
      {grassClaude4Enabled && (
        <GrassField4
          gridSize={gridSize}
          patchSpacing={patchSpacing}
          centerPosition={[0, 0, 0]}
          playerPosition={characterPosition}
          segments={segments}
          numGrass={numGrass}
          patchSize={patchSize}
          grassWidth={grassWidth}
          grassHeight={grassHeight}
          lodDistance={lodDistance}
          maxDistance={maxDistance}
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
          fogEnabled={fogEnabled}
          fogNear={fogNear}
          fogFar={fogFar}
          fogColor={fogColor}
          fogIntensity={fogIntensity}
        />
      )}

      {/* GrassField7 - Claude grass system v7 */}
      {grassClaude7Enabled && (
        <GrassField7
          gridSize={5}
          patchSpacing={10}
          centerPosition={[0, 0, 0]}
          playerPosition={characterPosition}
          renderDistance={80}
          patchSize={10}
          numGrass={32 * 32 * 3}
          segments={6}
          grassWidth={0.1}
          grassHeight={0.65}
        />
      )}

      {/* ClaudeGrassQuick - Quick_Grass port with advanced shaders */}
      {claudeGrassQuickControls.enabled && (
        <ClaudeGrassQuick
          playerPosition={
            new THREE.Vector3(
              characterPosition[0],
              characterPosition[1],
              characterPosition[2]
            )
          }
          terrainSize={claudeGrassQuickControls.terrainSize}
          heightScale={claudeGrassQuickControls.heightScale}
          heightOffset={claudeGrassQuickControls.heightOffset}
          grassWidth={claudeGrassQuickControls.grassWidth}
          grassHeight={claudeGrassQuickControls.grassHeight}
          lodDistance={claudeGrassQuickControls.lodDistance}
          maxDistance={claudeGrassQuickControls.maxDistance}
          patchSize={claudeGrassQuickControls.patchSize}
        />
      )}

      {/* ClaudeGrassQuick2 - Quick_Grass port with advanced shaders (Working Version) */}
      {claudeGrassQuick2Controls &&
        claudeGrassQuick2Controls.enabled === true && (
          <ClaudeGrassQuick2
            playerPosition={
              new THREE.Vector3(
                characterPosition[0],
                characterPosition[1],
                characterPosition[2]
              )
            }
            terrainSize={claudeGrassQuick2Controls.terrainSize}
            heightScale={claudeGrassQuick2Controls.heightScale}
            heightOffset={claudeGrassQuick2Controls.heightOffset}
            grassWidth={claudeGrassQuick2Controls.grassWidth}
            grassHeight={claudeGrassQuick2Controls.grassHeight}
            lodDistance={claudeGrassQuick2Controls.lodDistance}
            maxDistance={claudeGrassQuick2Controls.maxDistance}
            patchSize={claudeGrassQuick2Controls.patchSize}
            specularEnabled={claudeGrassQuick2Controls.specularEnabled}
            lightDirectionX={claudeGrassQuick2Controls.lightDirectionX}
            lightDirectionY={claudeGrassQuick2Controls.lightDirectionY}
            lightDirectionZ={claudeGrassQuick2Controls.lightDirectionZ}
            specularColor={claudeGrassQuick2Controls.specularColor}
            specularIntensity={claudeGrassQuick2Controls.specularIntensity}
            shininess={claudeGrassQuick2Controls.shininess}
          />
        )}

      {/* ClaudeGrassQuick3 - Quick_Grass port (New working version) */}
      {claudeGrassQuick3Controls.enabled && (
        <ClaudeGrassQuick3
          playerPosition={characterPosition || [0, 0, 0]}
          terrainSize={claudeGrassQuick3Controls.terrainSize}
          heightScale={claudeGrassQuick3Controls.heightScale}
          heightOffset={claudeGrassQuick3Controls.heightOffset}
          grassWidth={claudeGrassQuick3Controls.grassWidth}
          grassHeight={claudeGrassQuick3Controls.grassHeight}
          lodDistance={claudeGrassQuick3Controls.lodDistance}
          maxDistance={claudeGrassQuick3Controls.maxDistance}
          patchSize={claudeGrassQuick3Controls.patchSize}
          gridSize={claudeGrassQuick3Controls.gridSize}
          patchSpacing={claudeGrassQuick3Controls.patchSpacing}
          windEnabled={claudeGrassQuick3Controls.windEnabled}
          windStrength={claudeGrassQuick3Controls.windStrength}
          windDirectionScale={claudeGrassQuick3Controls.windDirectionScale}
          windDirectionSpeed={claudeGrassQuick3Controls.windDirectionSpeed}
          windStrengthScale={claudeGrassQuick3Controls.windStrengthScale}
          windStrengthSpeed={claudeGrassQuick3Controls.windStrengthSpeed}
          playerInteractionEnabled={
            claudeGrassQuick3Controls.playerInteractionEnabled
          }
          playerInteractionRepel={
            claudeGrassQuick3Controls.playerInteractionRepel
          }
          playerInteractionRange={
            claudeGrassQuick3Controls.playerInteractionRange
          }
          playerInteractionStrength={
            claudeGrassQuick3Controls.playerInteractionStrength
          }
        />
      )}

      {/* GrassField6 - Claude grass system v6 (Optimized) */}
      {grassClaude6Enabled && (
        <GrassField6
          gridSize={gridSize6}
          patchSpacing={patchSpacing6}
          centerPosition={[0, 0, 0]}
          playerPosition={characterPosition}
          segments={segments6}
          numGrass={numGrass6}
          patchSize={patchSize6}
          grassWidth={grassWidth6}
          grassHeight={grassHeight6}
          lodEnabled={lodEnabled6}
          lodDistance={lodDistance6}
          maxDistance={maxDistance6}
          baseColor1={baseColor1_6}
          baseColor2={baseColor2_6}
          tipColor1={tipColor1_6}
          tipColor2={tipColor2_6}
          gradientBlend={gradientBlend6}
          gradientCurve={gradientCurve6}
          backscatterEnabled={backscatterEnabled6}
          backscatterIntensity={backscatterIntensity6}
          backscatterColor={backscatterColor6}
          backscatterPower={backscatterPower6}
          frontScatterStrength={frontScatterStrength6}
          rimSSSStrength={rimSSSStrength6}
          specularEnabled={specularEnabled6}
          specularIntensity={specularIntensity6}
          specularColor={specularColor6}
          specularPower={specularPower6}
          specularScale={specularScale6}
          lightDirectionX={lightDirectionX6}
          lightDirectionY={lightDirectionY6}
          lightDirectionZ={lightDirectionZ6}
          windEnabled={windEnabled6}
          windStrength={windStrength6}
          windDirectionScale={windDirectionScale6}
          windDirectionSpeed={windDirectionSpeed6}
          windStrengthScale={windStrengthScale6}
          windStrengthSpeed={windStrengthSpeed6}
          playerInteractionEnabled={playerInteractionEnabled6}
          playerInteractionRange={playerInteractionRange6}
          playerInteractionStrength={playerInteractionStrength6}
          normalMixEnabled={normalMixEnabled6}
          normalMixFactor={normalMixFactor6}
          aoEnabled={aoEnabled6}
          aoIntensity={aoIntensity6}
          debugLOD={debugLOD6}
          debugNormals={debugNormals6}
          fogEnabled={fogEnabled6}
          fogNear={fogNear6}
          fogFar={fogFar6}
          fogColor={fogColor6}
          fogIntensity={fogIntensity6}
        />
      )}

      {/* GrassField - Claude grass system with multiple patches */}
      {grassClaudeEnabled && (
        <GrassField
          gridSize={9}
          patchSpacing={10}
          centerPosition={[0, 0, 0]}
          playerPosition={characterPosition}
          segments={6}
          numGrass={32 * 32 * 3}
          patchSize={10}
          grassWidth={0.1}
          grassHeight={1.5}
          lodDistance={15}
          maxDistance={100}
        />
      )}

      {/* GrassField3 - Claude grass system v3 with advanced controls */}
      {grassClaude3Enabled && (
        <GrassField3
          gridSize={9}
          patchSpacing={10}
          centerPosition={[0, 0, 0]}
          playerPosition={characterPosition}
          segments={6}
          numGrass={32 * 32 * 3}
          patchSize={10}
          grassWidth={0.1}
          grassHeight={1.5}
          lodDistance={15}
          maxDistance={100}
        />
      )}

      {/* Typha Reed Field */}
      {typhaEnabled && (
        <TyphaReedField
          gridSize={typhaGridSize}
          patchSpacing={typhaPatchSpacing}
          centerPosition={[typhaCenterX, typhaCenterY, typhaCenterZ]}
          segments={typhaSegments}
          numReeds={typhaNumReeds}
          patchSize={typhaPatchSize}
          reedWidth={typhaReedWidth}
          reedHeight={typhaReedHeight}
          lodDistance={typhaLodDistance}
          maxDistance={typhaMaxDistance}
          playerPosition={characterPosition || fallbackPosition}
          castShadow={typhaCastShadow}
          receiveShadow={typhaReceiveShadow}
          terrainHeight={typhaTerrainHeight}
          terrainOffset={typhaTerrainOffset}
          terrainSize={typhaTerrainSize}
        />
      )}

      {roseauEnabled && (
        <Roseau
          position={[roseauPositionX, roseauPositionY, roseauPositionZ]}
          stemHeight={roseauStemHeight}
          stemRadiusTop={roseauStemRadiusTop}
          stemRadiusBottom={roseauStemRadiusBottom}
          stemRadialSegments={roseauStemRadialSegments}
          stemHeightSegments={roseauStemHeightSegments}
          capsuleRadius={roseauCapsuleRadius}
          capsuleLength={roseauCapsuleLength}
          capsuleRadialSegments={roseauCapsuleRadialSegments}
          capsuleCapSegments={roseauCapsuleCapSegments}
          verticalSpacing={roseauVerticalSpacing}
          colorStem={roseauStemColor}
          colorCapsule={roseauCapsuleColor}
          windEnabled={roseauWindEnabled}
          windStrength={roseauWindStrength}
          windSpeed={roseauWindSpeed}
          windGustStrength={roseauWindGustStrength}
          windGustFrequency={roseauWindGustFrequency}
          windStiffness={roseauWindStiffness}
          windDirection={[roseauWindDirectionX, roseauWindDirectionZ]}
          staticLean={roseauWindLean}
        />
      )}

      {/* Wildflower Field */}
      {wildflowerFieldEnabled && (
        <WildflowerField
          gridSize={wildflowerFieldGridSize}
          patchSpacing={wildflowerFieldPatchSpacing}
          centerPosition={[
            wildflowerFieldCenterX,
            wildflowerFieldCenterY,
            wildflowerFieldCenterZ,
          ]}
          numFlowers={wildflowerFieldNumFlowers}
          patchSize={wildflowerFieldPatchSize}
          stemWidth={wildflowerFieldStemWidth}
          stemHeight={wildflowerFieldStemHeight}
          flowerSize={wildflowerFieldFlowerSize}
          playerPosition={characterPosition || fallbackPosition}
          castShadow={wildflowerFieldCastShadow}
          receiveShadow={wildflowerFieldReceiveShadow}
          useFlowerTexture={wildflowerFieldUseTexture}
          flowerTextureUrl={wildflowerFieldTexturePath || null}
        />
      )}

      {/* ImpostorForest - Octahedral impostor-based trees */}
      {impostorForestEnabled && (
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

      {/* Leaf Pile Mountain - Pile of leaves on the floor */}
      {leafPileMountainEnabled && (
        <LeafPileMountain
          count={leafPileMountainCount}
          pileRadius={leafPileMountainPileRadius}
          pileHeight={leafPileMountainPileHeight}
          position={[leafPileMountainPositionX, 0, leafPileMountainPositionZ]}
          ybotPosition={characterPosition || fallbackPosition}
          ybotVelocity={characterVelocity || fallbackVelocity}
          getGroundHeight={getGroundHeight}
          characterInteractionRange={leafPileMountainInteractionRange}
          characterPushStrength={leafPileMountainPushStrength}
          characterSwirlStrength={leafPileMountainSwirlStrength}
          characterExplosionStrength={leafPileMountainExplosionStrength}
        />
      )}

      {/* Flowing Lines - Simple CodePen version on flat terrain */}
      {flowingLinesEnabled && (
        <FlowingLinesSimple
          enabled={flowingLinesEnabled}
          lineCount={10}
          getTerrainHeight={getGroundHeight}
        />
      )}

      {/* Ripple Plane - Interactive water-like surface */}
      {ripplePlaneEnabled && (
        <RipplePlane
          position={[
            ripplePlanePositionX,
            ripplePlanePositionY,
            ripplePlanePositionZ,
          ]}
          size={ripplePlaneSize}
          segments={ripplePlaneSegments}
          characterPosition={characterPosition || fallbackPosition}
          rippleRadius={ripplePlaneRadius}
          rippleStrength={ripplePlaneStrength}
          rippleSpeed={ripplePlaneSpeed}
          rippleFrequency={ripplePlaneFrequency}
          color={ripplePlaneColor}
          opacity={ripplePlaneOpacity}
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
        />
      )}

      {/* Ice - Shader-based ice/crystal surface */}
      {iceEnabled && (
        <Ice
          base={iceBaseMaterial}
          iceColor={iceColor}
          frostColor={frostColor}
          crackColor={crackColor}
          frostIntensity={frostIntensity}
          crackIntensity={crackIntensity}
          thickness={iceThickness}
          brightness={iceBrightness}
          displacementScale={iceDisplacementScale}
          flatShading={iceFlatshading}
          size={iceSize}
          segments={iceSegments}
        />
      )}

      {/* Forest - ManciniForest billboard trees */}
      {forestEnabled && (
        <Forest
          numTrees={forestNumTrees}
          innerRadius={forestInnerRadius}
          outerRadius={forestOuterRadius}
          position={[forestPositionX, forestPositionY, forestPositionZ]}
          getTerrainHeight={getGroundHeight}
        />
      )}

      {/* Tornado Leaves - Tornado animation around character */}
      <TornadoLeaves
        characterPosition={characterPosition || fallbackPosition}
        getTerrainHeight={getGroundHeight}
      />

      {/* Floating Leaves - Regular floating leaves */}
      <FloatingLeaves getTerrainHeight={getGroundHeight} />

      {/* Falling Leaves - Shader-based falling leaves */}
      {fallingLeavesEnabled && (
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
        />
      )}

      {/* Tree */}
      {treeEnabled && (
        <Tree
          position={[10, 0, 10]}
          scale={1}
          enabled={true}
          getTerrainHeight={getGroundHeight}
        />
      )}

      {/* Animated Tree - Interactive tree with falling leaves */}
      {animatedTreeEnabled && (
        <AnimatedTree
          position={[0, 0, 0]}
          scale={1}
          enableMouseInteraction={true}
        />
      )}

      {/* Animated Tree 2 - Interactive tree with full controls */}
      {animatedTree2Enabled && (
        <AnimatedTree2
          position={[
            animatedTree2PositionX,
            animatedTree2PositionY,
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

      {/* Animated Tree 3 - Interactive tree with full controls */}
      {animatedTree3Enabled && (
        <AnimatedTree3
          position={[
            animatedTree3PositionX,
            animatedTree3PositionY,
            animatedTree3PositionZ,
          ]}
          scale={animatedTree3Scale}
          castShadow={animatedTree3CastShadow}
          receiveShadow={animatedTree3ReceiveShadow}
          colorA={animatedTree3ColorA}
          colorB={animatedTree3ColorB}
          colorC={animatedTree3ColorC}
          gradientThreshold={animatedTree3GradientThreshold}
          gradientPower={animatedTree3GradientPower}
          treeModelPath={animatedTree3ModelPath}
          noiseTexturePath={animatedTree3NoiseTexturePath}
          poleTexturePath={animatedTree3PoleTexturePath}
        />
      )}

      {/* Instanced Trees - Using InstancedMesh2 */}
      {instancedTreesEnabled && (
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

      {/* Instanced Grass Sprite - Using InstancedMesh2 */}
      {instancedGrassSpriteEnabled && (
        <InstancedGrassSprite
          count={instancedGrassSpriteCount}
          position={[
            instancedGrassSpritePositionX,
            instancedGrassSpritePositionY,
            instancedGrassSpritePositionZ,
          ]}
          radius={instancedGrassSpriteRadius}
          minRadius={instancedGrassSpriteMinRadius}
          scaleRange={[
            instancedGrassSpriteScaleRangeMin * instancedGrassSpriteScale,
            instancedGrassSpriteScaleRangeMax * instancedGrassSpriteScale,
          ]}
          enabled={instancedGrassSpriteEnabled}
          getTerrainHeight={getGroundHeight}
          enableBVH={instancedGrassSpriteEnableBVH}
          bvhMargin={instancedGrassSpriteBvhMargin}
          castShadow={instancedGrassSpriteCastShadow}
          receiveShadow={instancedGrassSpriteReceiveShadow}
          enableTransparentSorting={
            instancedGrassSpriteEnableTransparentSorting
          }
          enableViewThickening={instancedGrassSpriteEnableViewThickening}
          viewThickenPower={instancedGrassSpriteViewThickenPower}
          viewThickenStrength={instancedGrassSpriteViewThickenStrength}
        />
      )}

      {/* Yellow Flower - Using InstancedMesh2 */}
      {yellowFlowerEnabled && (
        <YellowFlower
          count={yellowFlowerCount}
          position={[
            yellowFlowerPositionX,
            yellowFlowerPositionY,
            yellowFlowerPositionZ,
          ]}
          radius={yellowFlowerRadius}
          minRadius={yellowFlowerMinRadius}
          scaleRange={[
            yellowFlowerScaleRangeMin * yellowFlowerScale,
            yellowFlowerScaleRangeMax * yellowFlowerScale,
          ]}
          enabled={yellowFlowerEnabled}
          getTerrainHeight={getGroundHeight}
          enableBVH={yellowFlowerEnableBVH}
          bvhMargin={yellowFlowerBvhMargin}
          castShadow={yellowFlowerCastShadow}
          receiveShadow={yellowFlowerReceiveShadow}
          enableTransparentSorting={yellowFlowerEnableTransparentSorting}
          enableViewThickening={yellowFlowerEnableViewThickening}
          viewThickenPower={yellowFlowerViewThickenPower}
          viewThickenStrength={yellowFlowerViewThickenStrength}
        />
      )}

      {/* Instanced Billboard Trees - Using InstancedMesh2 */}
      {instancedBillboardTreesEnabled && (
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

      {/* Instanced Pines - Using InstancedMesh2 */}
      {instancedPinesEnabled && (
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

      {/* Instanced Animated Trees - Using InstancedMesh2 with custom shader */}
      {instancedAnimatedTreesEnabled && (
        <InstancedAnimatedTrees
          count={50}
          position={[0, 0, 0]}
          radius={50}
          minRadius={0}
          scaleRange={[0.8, 1.2]}
          enabled={instancedAnimatedTreesEnabled}
          getTerrainHeight={getGroundHeight}
          colorA="#b45252"
          colorB="#d3a068"
          colorC="#ede19e"
          gradientThreshold={0.7}
          gradientPower={1.0}
          castShadow={true}
          receiveShadow={true}
          enableBVH={true}
          bvhMargin={0.1}
        />
      )}
      {/* Wildlife */}
      <DeerController position={[5, 1, 5]} />
      <DeerHerd spawnHeight={1} />
    </group>
  );
};
