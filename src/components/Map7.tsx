import React, { useRef, useMemo, useState, useCallback } from "react";
import * as THREE from "three";
import { ProceduralTerrain2 } from "./ProceduralTerrain2";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";

export const Map7 = ({
  scale = 1,
  position = [0, 0, 0],
  characterPosition,
  characterVelocity,
  ...props
}) => {
  const group = useRef<THREE.Group>(null);

  // State to hold the heightmap lookup function from ProceduralTerrain2
  const [heightmapLookup, setHeightmapLookup] = useState<
    ((x: number, z: number) => number) | null
  >(null);

  // Get SimonDevGrass21 controls
  const { simonDevGrass21Enabled } = useSimonDevGrass21Controls();

  // Create stable fallback vectors
  const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Callback when ProceduralTerrain2 heightmap is ready
  const handleHeightmapReady = useCallback(
    (fn: (x: number, z: number) => number) => {
      console.log("✅ Map7 received heightmap lookup from ProceduralTerrain2");
      setHeightmapLookup(() => fn);
    },
    []
  );

  // Function to get terrain height using ProceduralTerrain2's lookup
  const getGroundHeight = useMemo(() => {
    return (x: number, z: number): number => {
      if (heightmapLookup) {
        return heightmapLookup(x, z);
      }
      return 0; // Fallback if lookup not ready
    };
  }, [heightmapLookup]);

  return (
    <group ref={group} {...props}>
      {/* Procedural Terrain 2 */}
      <ProceduralTerrain2 onHeightmapReady={handleHeightmapReady} />

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
    </group>
  );
};
