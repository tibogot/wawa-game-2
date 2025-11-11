import { useRef, forwardRef, useEffect, useMemo, useCallback } from "react";
import { RigidBody } from "@react-three/rapier";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useTerrainMeshLookup } from "../hooks/useTerrainMeshLookup";
import { GrassField as GrassField4 } from "./GrassClaude4";
import { useGrassClaude4Controls } from "./useGrassClaude4Controls";

export const Map14 = forwardRef(
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
    const meshRef = useRef(null);
    const { nodes, materials } = useGLTF(
      "/models/simpleterrainblender-transformed.glb"
    );

    // Create heightmap lookup from terrain mesh
    const { getHeightAt, isReady: isTerrainMeshReady } =
      useTerrainMeshLookup(meshRef);

    // Create a stable height lookup function
    const getGroundHeight = useCallback(
      (x, z) => {
        if (!isTerrainMeshReady) return 0;
        return getHeightAt(x, z);
      },
      [getHeightAt, isTerrainMeshReady]
    );

    // Create stable fallback vectors
    const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    // Generate heightmap texture from getGroundHeight for GrassClaude4
    const { heightmapTexture, terrainHeight, terrainOffset } = useMemo(() => {
      if (!isTerrainMeshReady) {
        return { heightmapTexture: null, terrainHeight: 0, terrainOffset: 0 };
      }

      // Terrain size matches the Simpleterrainblender model (200x200)
      const terrainSize = 200;
      // Use smaller texture size for better performance (256x256 = 65k samples vs 1M+)
      const textureSize = 256;

      // Sample terrain at regular intervals
      const data = new Float32Array(textureSize * textureSize);
      let minHeight = Infinity;
      let maxHeight = -Infinity;

      // First pass: sample heights and find min/max
      for (let y = 0; y < textureSize; y++) {
        for (let x = 0; x < textureSize; x++) {
          const worldX = (x / textureSize) * terrainSize - terrainSize / 2;
          const worldZ =
            ((textureSize - 1 - y) / textureSize) * terrainSize -
            terrainSize / 2;
          const height = getGroundHeight(worldX, worldZ);

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

      // Create DataTexture
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

      return {
        heightmapTexture: texture,
        terrainHeight: heightRange > 0 ? heightRange : 100,
        terrainOffset: minHeight !== Infinity ? -minHeight : 0,
      };
    }, [getGroundHeight, isTerrainMeshReady]);

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

    // Notify when terrain mesh is ready
    useEffect(() => {
      if (meshRef.current && onTerrainReady) {
        onTerrainReady(meshRef.current);
      }
    }, [onTerrainReady]);

    return (
      <group ref={group} {...props}>
        <RigidBody type="fixed" colliders="trimesh" friction={1}>
          <mesh
            ref={meshRef}
            geometry={nodes.Plane.geometry}
            material={materials["Material.001"]}
            scale={scale}
            position={position}
            receiveShadow
            castShadow
          />
        </RigidBody>

        {/* GrassClaude4 Grass System - Only render when terrain is fully ready */}
        {grassClaude4Enabled &&
          isTerrainMeshReady &&
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
              terrainSize={200}
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
      </group>
    );
  }
);

// Preload the model
useGLTF.preload("/models/simpleterrainblender-transformed.glb");

