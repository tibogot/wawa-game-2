import { useRef, useState, useCallback, useMemo, forwardRef } from "react";
import * as THREE from "three";
import { ProceduralTerrain3 } from "./ProceduralTerrain3";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";
import { HeightFog } from "./HeightFog";
import { useHeightFogControls } from "./useHeightFogControls";
import { CloudSystem } from "./CloudSystem";
import { useLensFlareControls } from "./useLensFlareControls";
import LensFlare from "./LensFlare";
import { FlowingLinesSimple } from "./FlowingLinesSimple";
import { useFlowingLinesControls } from "./useFlowingLinesControls";

export const Map8 = forwardRef(
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
    const { enabled: flowingLinesEnabled } = useFlowingLinesControls();

    // Create stable fallback vectors
    const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    // Callback when ProceduralTerrain3 heightmap is ready
    const handleHeightmapReady = useCallback((fn) => {
      console.log("✅ Map8 received heightmap lookup from ProceduralTerrain3");
      setHeightmapLookup(() => fn);
      // Mark terrain mesh as ready after a short delay to ensure materials are compiled
      setTimeout(() => {
        setIsTerrainMeshReady(true);
        console.log("✅ Map8 terrain mesh ready, HeightFog can now apply");
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

    return (
      <group ref={group} {...props}>
        <CloudSystem />
        <ProceduralTerrain3
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
            mapSize={2000}
            grassHeight={1.0}
            grassScale={1.0}
            getGroundHeight={getGroundHeight}
            characterPosition={characterPosition || fallbackPosition}
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
            lineCount={10}
            getTerrainHeight={getGroundHeight}
          />
        )}
      </group>
    );
  }
);
