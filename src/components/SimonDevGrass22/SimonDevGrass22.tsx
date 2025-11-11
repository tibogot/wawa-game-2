import React, { useRef, useMemo, useState } from "react";
import * as THREE from "three";

// Import all the optimized modular components
import { useOptimizedGrassGeometry } from "./OptimizedGrassGeometry";
import { useOptimizedGrassMaterial } from "./OptimizedGrassMaterial";
import { useGrassEffects } from "./GrassEffects";
import { useOptimizedGrassInstances } from "./OptimizedGrassInstances";
import { useSimonDevGrass22Controls } from "../useSimonDevGrass22Controls";

export const SimonDevGrass22 = ({
  areaSize = 200,
  getGroundHeight,
  grassHeight = 2.0,
  grassScale = 2.0,
  characterPosition,
  map = "map1(intro)",
  disableChunkRemoval = false,
  enableFrustumCulling = true,
  frustumCullingUpdateInterval = 100,
  debugFrustumCulling = false,
  mapSize = 200, // Add map size parameter
}) => {
  const [meshReady, setMeshReady] = useState<boolean>(false);
  // Read all Leva controls for v22
  const {
    simonDevGrass22Enabled,
    // geometry
    grassHeight: ctrlGrassHeight,
    grassScale: ctrlGrassScale,
    // wind
    enableWindMovement,
    windStrength,
    windSpeed,
    windNoiseScale,
    windNoiseSpeed,
    windNoiseAmplitude,
    // colors
    enableBaseToTipGradient,
    baseColor,
    tipColor,
    gradientShaping,
    // normals/ao
    enableNormalMap,
    enableAmbientOcclusion,
    grassDensity,
    aoStrength,
    aoHeightPower,
    aoDebugMode,
    // player
    enablePlayerInteraction,
    playerInteractionRadius,
    playerInteractionStrength,
    playerInteractionRepel,
    // moon
    enableMoonReflection,
    moonIntensity,
    moonColor,
    moonDirectionX,
    moonDirectionY,
    moonDirectionZ,
    // contact shadows
    contactShadowIntensity,
    contactShadowRadius,
    contactShadowBias,
    // sss
    enableSSS,
    sssIntensity,
    sssPower,
    sssScale,
    sssColor,
    // env map
    enableEnvMap,
    envMapIntensity,
    roughnessBase,
    roughnessTip,
    fresnelPower,
    roughnessIntensity,
    // view thickening
    enableViewThickenDebug,
    viewThickenPower,
    viewThickenStrength,
  } = useSimonDevGrass22Controls();

  if (!simonDevGrass22Enabled) return null;

  // Load normal map texture
  const normalMapTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load("/textures/grass.png");
  }, []);

  // Create simple environment map for IBL (v22)
  const envMapTexture = useMemo(() => {
    const envMap = new THREE.CubeTexture();
    const size = 1;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#87CEEB"; // Sky blue
    context.fillRect(0, 0, size, size);
    envMap.images = [canvas, canvas, canvas, canvas, canvas, canvas];
    envMap.needsUpdate = true;
    envMap.mapping = THREE.CubeReflectionMapping;
    return envMap;
  }, []);

  // Create grass geometry using the optimized geometry component
  const {
    highLOD,
    lowLOD,
    ultraLowLOD,
    GRASS_LOD_DISTANCE,
    GRASS_ULTRA_LOW_DISTANCE,
  } = useOptimizedGrassGeometry({
    grassHeight: ctrlGrassHeight ?? grassHeight,
    useFloat16: true,
  });

  // Create grass material using the optimized material component
  const { material: grassMaterial } = useOptimizedGrassMaterial({
    enableDebugShader: false,
    enableDebugVertex: false,
    enableNormalMap: enableNormalMap,
    normalMapTexture,
    enableBaseToTipGradient: enableBaseToTipGradient,
    baseColor: baseColor,
    tipColor: tipColor,
    gradientShaping: gradientShaping,
    enableNormalBlending: false,
    terrainBlendStart: 10.0,
    terrainBlendEnd: 30.0,
    enableAmbientOcclusion: enableAmbientOcclusion,
    grassDensity: grassDensity,
    aoStrength: aoStrength,
    aoHeightPower: aoHeightPower,
    aoDebugMode: aoDebugMode,
    enableWindMovement: enableWindMovement,
    windStrength: windStrength,
    windSpeed: windSpeed,
    grassHeight: ctrlGrassHeight ?? grassHeight,
    // Wind Noise Controls (driven by GlobalWindProvider at runtime)
    windNoiseScale: windNoiseScale,
    windNoiseSpeed: windNoiseSpeed,
    windNoiseAmplitude: windNoiseAmplitude,
    // Player Interaction
    enablePlayerInteraction: enablePlayerInteraction,
    playerInteractionRadius: playerInteractionRadius,
    playerInteractionStrength: playerInteractionStrength,
    playerInteractionRepel: playerInteractionRepel,
    characterPosition,
    // Moonlight controls (v22 addition)
    enableMoonReflection: enableMoonReflection,
    moonIntensity: moonIntensity,
    // Moon direction from controls
    moonDirection: new THREE.Vector3(
      moonDirectionX,
      moonDirectionY,
      moonDirectionZ
    ).normalize(),
    moonColor: moonColor,
    // Contact Shadow controls (v22 addition)
    contactShadowIntensity: contactShadowIntensity,
    contactShadowRadius: contactShadowRadius,
    contactShadowBias: contactShadowBias,
    // Subsurface Scattering controls (v22 addition)
    enableSSS: enableSSS,
    sssIntensity: sssIntensity,
    sssPower: sssPower,
    sssScale: sssScale,
    sssColor: sssColor,
    // Environment Map controls (v22 addition)
    enableEnvMap: enableEnvMap,
    envMap: envMapTexture,
    envMapIntensity: envMapIntensity,
    roughnessBase: roughnessBase,
    roughnessTip: roughnessTip,
    fresnelPower: fresnelPower,
    roughnessIntensity: roughnessIntensity,
    // View Thickening controls (v22 addition)
    enableViewThickenDebug: enableViewThickenDebug,
    viewThickenPower: viewThickenPower,
    viewThickenStrength: viewThickenStrength,
  });

  // Create instances using the optimized instances component
  const { instancedMeshRef } = useOptimizedGrassInstances({
    highLOD,
    lowLOD,
    ultraLowLOD,
    grassMaterial,
    grassScale: ctrlGrassScale ?? grassScale,
    useFloat16: true,
    getGroundHeight,
    setMeshReady,
    GRASS_LOD_DISTANCE,
    GRASS_ULTRA_LOW_DISTANCE,
    disableChunkRemoval,
    enableFrustumCulling,
    frustumCullingUpdateInterval,
    debugFrustumCulling,
    mapSize, // Pass map size for adaptive culling
  });

  // Set up effects using the effects component
  useGrassEffects({
    instancedMeshRef,
    enableDebugVertex: false,
    enableWindMovement: enableWindMovement,
    enablePlayerInteraction: enablePlayerInteraction,
    characterPosition,
    windNoiseScale: windNoiseScale,
    windNoiseSpeed: windNoiseSpeed,
    windNoiseAmplitude: windNoiseAmplitude,
  });

  return meshReady && instancedMeshRef.current ? (
    <primitive object={instancedMeshRef.current} />
  ) : null;
};

export default SimonDevGrass22;
