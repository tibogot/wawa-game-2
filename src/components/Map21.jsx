import { useMemo, forwardRef, useState, useCallback } from "react";
import * as THREE from "three";
import { ProceduralTerrain21 } from "./ProceduralTerrain23";
import { GrassField as GrassField5 } from "./GrassClaude5";
import { useGrassClaude5Controls } from "./useGrassClaude5Controls";
import { HeightFog } from "./HeightFog";
import { useHeightFogControls } from "./useHeightFogControls";

export const Map21 = forwardRef(
  (
    {
      scale = 1,
      position = [0, 0, 0],
      onTerrainReady,
      onHeightmapReady,
      characterPosition,
      sunDirection = [-0.35, 0.8, -0.2],
      ...props
    },
    ref
  ) => {
    const [heightmapLookup, setHeightmapLookup] = useState(null);
    const [isTerrainMeshReady, setIsTerrainMeshReady] = useState(false);

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

    const normalizedSunDirection = useMemo(() => {
      const dir = Array.isArray(sunDirection)
        ? new THREE.Vector3(sunDirection[0], sunDirection[1], sunDirection[2])
        : new THREE.Vector3(
            sunDirection?.x ?? 0,
            sunDirection?.y ?? 1,
            sunDirection?.z ?? 0
          );
      if (dir.lengthSq() === 0) {
        dir.set(-0.35, 0.8, -0.2);
      }
      dir.normalize();
      return [dir.x, dir.y, dir.z];
    }, [sunDirection]);

    // Create stable fallback position
    const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    // Callback when ProceduralTerrain21 heightmap is ready
    const handleHeightmapReady = useCallback((fn) => {
      console.log(
        "✅ Map21 received heightmap lookup from ProceduralTerrain21"
      );
      setHeightmapLookup(() => fn);
      // Mark terrain mesh as ready after a short delay
      setTimeout(() => {
        setIsTerrainMeshReady(true);
        console.log("✅ Map21 terrain mesh ready, HeightFog can now apply");
      }, 100);
    }, []);

    // Ground height function for grass
    const getGroundHeight = useCallback(
      (x, z) => {
        if (!heightmapLookup) {
          return 0;
        }
        return heightmapLookup(x, z);
      },
      [heightmapLookup]
    );

    // Generate heightmap texture from getGroundHeight for GrassClaude5
    // GrassClaude5 uses shader-based heightmap sampling, so we need a texture
    const { heightmapTexture, terrainHeight, terrainOffset } = useMemo(() => {
      if (!heightmapLookup || !isTerrainMeshReady) {
        return { heightmapTexture: null, terrainHeight: 0, terrainOffset: 0 };
      }

      // Terrain size - ProceduralTerrain24 default is 2000
      const terrainSize = 2000;
      const textureSize = 1024;

      // Sample terrain at regular intervals
      const data = new Float32Array(textureSize * textureSize);
      let minHeight = Infinity;
      let maxHeight = -Infinity;

      // First pass: sample heights and find min/max
      for (let y = 0; y < textureSize; y++) {
        for (let x = 0; x < textureSize; x++) {
          // Convert texture coordinates to world coordinates
          const worldX = (x / textureSize) * terrainSize - terrainSize / 2;
          // Flip Y: texture Y=0 should map to world Z=+terrainSize/2
          const worldZ =
            ((textureSize - 1 - y) / textureSize) * terrainSize -
            terrainSize / 2;
          const height = heightmapLookup(worldX, worldZ);

          // Store in data array
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
    }, [heightmapLookup, isTerrainMeshReady]);

    return (
      <>
        <ProceduralTerrain21
          ref={ref}
          position={position}
          scale={scale}
          onTerrainReady={onTerrainReady}
          onHeightmapReady={handleHeightmapReady}
          playerPosition={characterPosition}
          sunPosition={normalizedSunDirection}
          plateauEnabled={true}
          plateauLevels={4}
          plateauStepHeight={40}
          cliffSharpness={0.98}
          plateauSmoothing={0.05}
          plateauSizeFilter={0.5}
          {...props}
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
              terrainSize={2000}
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
      </>
    );
  }
);

Map21.displayName = "Map21";
