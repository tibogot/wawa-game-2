import React, { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { extend } from "@react-three/fiber";

// Extend Three.js objects for JSX
extend({ InstancedMesh2 });

// Import all the modular components
import { useGrassControls } from "./GrassControls";
import { useGrassGeometry } from "./GrassGeometry";
import { useGrassMaterial } from "./GrassMaterial";
import { useGrassEffects } from "./GrassEffects";
import { useGrassInstances } from "./GrassInstances";

interface SimonDevGrass15Props {
  areaSize?: number;
  getGroundHeight?: (x: number, z: number) => number;
  grassHeight?: number;
  grassScale?: number;
  characterPosition?: THREE.Vector3;
  map?: string;
}

/**
 * SimonDevGrass15 - Refactored 15-Vertex Grass with View-Space Thickening
 *
 * Features:
 * - 15 vertices (5 segments × 3 vertices per segment)
 * - Natural taper from wide base to narrow tip
 * - Baked curve for natural backward lean
 * - Per-instance curve randomization
 * - VIEW-SPACE THICKENING: Blades appear thicker when viewed edge-on (using onBeforeCompile)
 * - Wind-ready geometry structure
 *
 * Architecture:
 * - Modular component structure for better maintainability
 * - Separated concerns: controls, geometry, material, effects, instances
 * - Easier debugging and testing of individual components
 */
export const SimonDevGrass15: React.FC<SimonDevGrass15Props> = ({
  areaSize = 200,
  getGroundHeight,
  grassHeight = 1.0,
  grassScale = 1.0,
  characterPosition,
  map = "map1(intro)",
}) => {
  const instancedMeshRef = useRef<InstancedMesh2 | null>(null);
  const [meshReady, setMeshReady] = useState<boolean>(false);

  // Get all controls from the controls component
  const controls = useGrassControls();

  // Load normal map texture
  const normalMapTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load("/textures/grass.png");
  }, []);

  // Create grass geometry using the geometry component
  const grassGeometry = useGrassGeometry({
    grassHeight,
    useFloat16: controls.useFloat16,
  });

  // Create grass material using the material component
  const grassMaterial = useGrassMaterial({
    enableThickening: controls.enableThickening,
    thicknessMultiplier: controls.thicknessMultiplier,
    enableDebugShader: controls.enableDebugShader,
    enableDebugVertex: controls.enableDebugVertex,
    enableNormalMap: controls.enableNormalMap,
    normalMapTexture,
    enableBaseToTipGradient: controls.enableBaseToTipGradient,
    baseColor: controls.baseColor,
    tipColor: controls.tipColor,
    gradientShaping: controls.gradientShaping,
    enableNormalBlending: controls.enableNormalBlending,
    terrainBlendStart: controls.terrainBlendStart,
    terrainBlendEnd: controls.terrainBlendEnd,
    enableAmbientOcclusion: controls.enableAmbientOcclusion,
    grassDensity: controls.grassDensity,
    aoStrength: controls.aoStrength,
    aoHeightPower: controls.aoHeightPower,
    aoDebugMode: controls.aoDebugMode,
    enableWindMovement: controls.enableWindMovement,
    windStrength: controls.windStrength,
    windSpeed: controls.windSpeed,
    enableAdvancedWind: controls.enableAdvancedWind,
    windDirectionScale: controls.windDirectionScale,
    windStrengthScale: controls.windStrengthScale,
    windStrengthMultiplier: controls.windStrengthMultiplier,
    windDirectionX: controls.windDirectionX,
    windDirectionZ: controls.windDirectionZ,
    windFrequency: controls.windFrequency,
    windAmplitude: controls.windAmplitude,
    windTurbulence: controls.windTurbulence,
    flappingIntensity: controls.flappingIntensity,
    grassHeight,
    // Wind Noise Controls
    windNoiseScale: controls.windNoiseScale,
    windNoiseSpeed: controls.windNoiseSpeed,
    windNoiseAmplitude: controls.windNoiseAmplitude,
    // Player Interaction
    enablePlayerInteraction: controls.enablePlayerInteraction,
    playerInteractionRadius: controls.playerInteractionRadius,
    playerInteractionStrength: controls.playerInteractionStrength,
    playerInteractionRepel: controls.playerInteractionRepel,
    characterPosition,
  });

  // Set up effects using the effects component
  useGrassEffects({
    instancedMeshRef,
    enableDebugVertex: controls.enableDebugVertex,
    enableWindMovement: controls.enableWindMovement,
    enableAdvancedWind: controls.enableAdvancedWind,
    enablePlayerInteraction: controls.enablePlayerInteraction,
    characterPosition,
    windNoiseScale: controls.windNoiseScale,
    windNoiseSpeed: controls.windNoiseSpeed,
    windNoiseAmplitude: controls.windNoiseAmplitude,
  });

  // Create instances using the instances component
  useGrassInstances({
    instancedMeshRef,
    grassGeometry,
    grassMaterial,
    grassScale,
    useFloat16: controls.useFloat16,
    getGroundHeight,
    setMeshReady,
  });

  return meshReady && instancedMeshRef.current ? (
    <primitive object={instancedMeshRef.current} />
  ) : null;
};

export default SimonDevGrass15;
