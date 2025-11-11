import React, { useRef, useMemo, useState } from "react";
import * as THREE from "three";

// Import all the optimized modular components
import { useOptimizedGrassGeometry } from "./OptimizedGrassGeometry";
import { useOptimizedGrassMaterial } from "./OptimizedGrassMaterial";
import { useGrassEffects } from "./GrassEffects";
import { useOptimizedGrassInstances } from "./OptimizedGrassInstances";

export const SimonDevGrass21 = ({
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

  // Load normal map texture
  const normalMapTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load("/textures/grass.png");
  }, []);

  // Create grass geometry using the optimized geometry component
  const {
    highLOD,
    lowLOD,
    ultraLowLOD,
    GRASS_LOD_DISTANCE,
    GRASS_ULTRA_LOW_DISTANCE,
  } = useOptimizedGrassGeometry({
    grassHeight,
    useFloat16: true,
  });

  // Create grass material using the optimized material component
  const { material: grassMaterial } = useOptimizedGrassMaterial({
    enableDebugShader: false,
    enableDebugVertex: false,
    enableNormalMap: true,
    normalMapTexture,
    enableBaseToTipGradient: true,
    baseColor: "#0d3303",
    tipColor: "#80801a",
    gradientShaping: 4.0,
    enableNormalBlending: false,
    terrainBlendStart: 10.0,
    terrainBlendEnd: 30.0,
    enableAmbientOcclusion: true,
    grassDensity: 1.0,
    aoStrength: 0.1,
    aoHeightPower: 1.0,
    aoDebugMode: false,
    enableWindMovement: true,
    windStrength: 1.0,
    windSpeed: 1.0,
    grassHeight,
    // Wind Noise Controls
    windNoiseScale: 1.0,
    windNoiseSpeed: 1.0,
    windNoiseAmplitude: 1.0,
    // Player Interaction
    enablePlayerInteraction: true,
    playerInteractionRadius: 3.0,
    playerInteractionStrength: 0.5,
    playerInteractionRepel: true,
    characterPosition,
  });

  // Create instances using the optimized instances component
  const { instancedMeshRef } = useOptimizedGrassInstances({
    highLOD,
    lowLOD,
    ultraLowLOD,
    grassMaterial,
    grassScale,
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
    enableWindMovement: true,
    enablePlayerInteraction: true,
    characterPosition,
    windNoiseScale: 1.0,
    windNoiseSpeed: 1.0,
    windNoiseAmplitude: 1.0,
  });

  return meshReady && instancedMeshRef.current ? (
    <primitive object={instancedMeshRef.current} />
  ) : null;
};

export default SimonDevGrass21;
