import React, { useEffect, useState } from "react";
import { useControls } from "leva";
import { useTerrainMeshLookup } from "../hooks/useTerrainMeshLookup";
import * as THREE from "three";

interface DebugSphere {
  position: [number, number, number];
  color: string;
  label: string;
}

interface TerrainHeightDebugSpheresProps {
  terrainMeshRef: React.RefObject<THREE.Mesh>;
}

export const TerrainHeightDebugSpheres = ({
  terrainMeshRef,
}: TerrainHeightDebugSpheresProps) => {
  const [spheres, setSpheres] = useState<DebugSphere[]>([]);

  // Read terrain size from Leva for grid spacing
  const { size: terrainSize } = useControls("🗻 Terrain Geometry", {
    size: { value: 4000 },
  });

  // NEW: Use mesh-based lookup - reads actual vertices (100% accurate!)
  // isReady is now state-based and triggers re-renders automatically!
  const { getHeightAt, isReady } = useTerrainMeshLookup(terrainMeshRef);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const debugSpheres: DebugSphere[] = [];
    const colors = [
      "#ff0000", // Red
      "#00ff00", // Green
      "#0000ff", // Blue
      "#ffff00", // Yellow
      "#ff00ff", // Magenta
      "#00ffff", // Cyan
      "#ff8800", // Orange
      "#8800ff", // Purple
      "#00ff88", // Teal
      "#ff0088", // Hot Pink
      "#88ff00", // Lime
      "#0088ff", // Sky Blue
    ];

    // Large grid across entire terrain
    const gridSize = 20; // 20x20 = 441 spheres
    const spacing = terrainSize / gridSize; // Dynamic spacing based on terrain size
    const halfGrid = Math.floor(gridSize / 2);

    let colorIndex = 0;

    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        const worldX = x * spacing;
        const worldZ = z * spacing;
        const terrainHeight = getHeightAt(worldX, worldZ);

        debugSpheres.push({
          position: [worldX, terrainHeight, worldZ],
          color: colors[colorIndex % colors.length],
          label: `(${worldX}, ${worldZ}) Y=${terrainHeight.toFixed(1)}`,
        });

        colorIndex++;
      }
    }

    setSpheres(debugSpheres);
  }, [isReady, getHeightAt, terrainSize]); // Re-run when mesh updates

  if (!isReady) return null;

  return (
    <group>
      {spheres.map((sphere, index) => (
        <mesh key={index} position={sphere.position}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshStandardMaterial
            color={sphere.color}
            emissive={sphere.color}
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
};
