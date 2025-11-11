import React, { useRef, useMemo, useState, useCallback } from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { Zeldaterrain1 } from "./Zeldaterrain1";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";

export const Map6 = ({
  scale = 1,
  position = [0, 0, 0],
  characterPosition,
  characterVelocity,
  ...props
}) => {
  const group = useRef<THREE.Group>(null);

  // State to hold the heightmap lookup function from Zeldaterrain1
  const [heightmapLookup, setHeightmapLookup] = useState<
    ((x: number, z: number) => number) | null
  >(null);

  // Get SimonDevGrass21 controls
  const { simonDevGrass21Enabled } = useSimonDevGrass21Controls();

  // Create stable fallback vectors
  const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Callback when Zeldaterrain1 heightmap is ready
  const handleHeightmapReady = useCallback(
    (fn: (x: number, z: number) => number) => {
      console.log("✅ Map6 received heightmap lookup from Zeldaterrain1");
      setHeightmapLookup(() => fn);
    },
    []
  );

  // Function to get terrain height using Zeldaterrain1's lookup
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
      {/* Zelda Terrain 1 - using zeldaterrain1-transformed.glb */}
      <RigidBody type="fixed" colliders="trimesh">
        <Zeldaterrain1
          position={position}
          scale={scale}
          onHeightmapReady={handleHeightmapReady}
        />
      </RigidBody>

      {/* SimonDevGrass21 Grass System - Only render when heightmap is ready */}
      {simonDevGrass21Enabled && heightmapLookup && (
        <SimonDevGrass21
          areaSize={200}
          mapSize={1000}
          grassHeight={1.0}
          grassScale={1.0}
          getGroundHeight={getGroundHeight}
          characterPosition={characterPosition || fallbackPosition}
        />
      )}
    </group>
  );
};
