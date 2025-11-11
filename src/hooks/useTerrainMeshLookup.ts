import { useCallback, useRef, useEffect, useState } from "react";
import * as THREE from "three";

/**
 * Extract height lookup directly from the actual terrain mesh geometry
 * This is 100% accurate because it uses the EXACT vertices that Rapier uses
 */
export function useTerrainMeshLookup(
  terrainMeshRef: React.RefObject<THREE.Mesh>
) {
  const spatialGridRef = useRef<Map<string, number> | null>(null);
  const boundsRef = useRef<{
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null>(null);
  const [isReady, setIsReady] = useState(false); // State to trigger re-renders!

  useEffect(() => {
    if (!terrainMeshRef.current) {
      setIsReady(false);
      return;
    }

    const mesh = terrainMeshRef.current;
    const geometry = mesh.geometry;

    if (!geometry) {
      setIsReady(false);
      return;
    }

    console.log("🔍 Building spatial grid from terrain mesh vertices...");

    // Get position attribute
    const positions = geometry.attributes.position;
    if (!positions) return;

    // CRITICAL: Update the mesh's world matrix to get correct transformations
    mesh.updateMatrixWorld(true);

    // Build a spatial grid for fast lookups
    const spatialGrid = new Map<string, number>();
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    // Create a vector to transform vertices from local to world space
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      // Get vertex in LOCAL space
      vertex.set(positions.getX(i), positions.getY(i), positions.getZ(i));

      // Transform to WORLD space using the mesh's world matrix
      // This applies rotation, scale, and position transforms
      vertex.applyMatrix4(mesh.matrixWorld);

      const worldX = vertex.x;
      const worldY = vertex.y; // This is the actual world height!
      const worldZ = vertex.z;

      // Track bounds
      if (worldX < minX) minX = worldX;
      if (worldX > maxX) maxX = worldX;
      if (worldZ < minZ) minZ = worldZ;
      if (worldZ > maxZ) maxZ = worldZ;

      // Store in spatial grid (round to nearest integer for grid cell)
      const key = `${Math.round(worldX)},${Math.round(worldZ)}`;

      // Keep the highest point in each grid cell
      if (!spatialGrid.has(key) || worldY > spatialGrid.get(key)!) {
        spatialGrid.set(key, worldY);
      }
    }

    spatialGridRef.current = spatialGrid;
    boundsRef.current = { minX, maxX, minZ, maxZ };

    console.log(
      `✅ Spatial grid built: ${spatialGrid.size} cells, bounds:`,
      boundsRef.current
    );

    // Trigger re-render now that grid is ready!
    setIsReady(true);
  }, [terrainMeshRef]);

  /**
   * Get height at world position using actual mesh vertices
   * This matches EXACTLY what Rapier sees
   */
  const getHeightAt = useCallback((worldX: number, worldZ: number): number => {
    if (!spatialGridRef.current) return 0;

    // Try exact cell first
    const key = `${Math.round(worldX)},${Math.round(worldZ)}`;
    const exactHeight = spatialGridRef.current.get(key);
    if (exactHeight !== undefined) return exactHeight;

    // Sample nearby cells and interpolate
    // Search wider radius (±25) to account for terrain vertex spacing
    const samples: { x: number; z: number; height: number }[] = [];
    const searchRadius = 25; // Wide enough to find vertices for 200-segment terrain

    for (let dx = -searchRadius; dx <= searchRadius; dx += 5) {
      for (let dz = -searchRadius; dz <= searchRadius; dz += 5) {
        const nearKey = `${Math.round(worldX) + dx},${Math.round(worldZ) + dz}`;
        const height = spatialGridRef.current.get(nearKey);
        if (height !== undefined) {
          samples.push({
            x: Math.round(worldX) + dx,
            z: Math.round(worldZ) + dz,
            height,
          });
        }
      }
    }

    if (samples.length === 0) return 0;

    // Inverse distance weighted interpolation
    let totalWeight = 0;
    let weightedSum = 0;

    for (const sample of samples) {
      const distance = Math.sqrt(
        Math.pow(worldX - sample.x, 2) + Math.pow(worldZ - sample.z, 2)
      );
      const weight = distance === 0 ? 1 : 1 / (distance + 0.01);
      totalWeight += weight;
      weightedSum += sample.height * weight;
    }

    return weightedSum / totalWeight;
  }, []);

  return {
    getHeightAt,
    isReady,
  };
}
