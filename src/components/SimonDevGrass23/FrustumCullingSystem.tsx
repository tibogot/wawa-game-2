import { useRef, useCallback, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface FrustumCullingSystemProps {
  enabled: boolean;
  updateInterval: number;
  debugMode?: boolean;
  mapSize?: number; // Add map size parameter
  areaSize?: number; // Add grass area size parameter
}

interface TileBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
}

export const useFrustumCullingSystem = ({
  enabled,
  updateInterval = 100, // Update every 100ms
  debugMode = false,
  mapSize = 200, // Default for small maps
  areaSize = 200, // Default grass area size
}: FrustumCullingSystemProps) => {
  const { camera } = useThree();

  // Refs for performance
  const frustumRef = useRef(new THREE.Frustum());
  const cameraMatrixRef = useRef(new THREE.Matrix4());
  const lastUpdateTimeRef = useRef(0);
  const visibleTilesRef = useRef<Set<string>>(new Set());
  const culledTilesRef = useRef<Set<string>>(new Set());

  // Optimized distance calculation (like Quick_Grass) - reusable AABB
  const AABB_TMP = useRef(new THREE.Box3());
  const cameraPosXZ = useRef(new THREE.Vector3());

  // Statistics
  const statsRef = useRef({
    totalTiles: 0,
    visibleTiles: 0,
    culledTiles: 0,
    lastUpdateTime: 0,
  });

  // Calculate adaptive culling parameters based on map size
  const cullingMargin = useMemo(() => {
    if (mapSize <= 300) return 5; // Small maps - aggressive culling
    if (mapSize <= 600) return 20; // Medium maps
    return 50; // Large maps - lenient culling
  }, [mapSize]);

  const maxCullingDistance = useMemo(() => {
    return Math.min(mapSize * 0.8, areaSize * 1.5); // Don't cull too far
  }, [mapSize, areaSize]);

  // Calculate tile bounding box
  const calculateTileBounds = useCallback(
    (
      centerX: number,
      centerZ: number,
      tileSize: number,
      maxHeight: number = 10
    ): TileBounds => {
      const halfSize = tileSize / 2;
      const min = new THREE.Vector3(
        centerX - halfSize,
        -1, // Ground level
        centerZ - halfSize
      );
      const max = new THREE.Vector3(
        centerX + halfSize,
        maxHeight,
        centerZ + halfSize
      );
      const center = new THREE.Vector3(centerX, maxHeight / 2, centerZ);
      const size = new THREE.Vector3(
        tileSize + cullingMargin, // Use adaptive margin
        maxHeight + 1,
        tileSize + cullingMargin
      );

      return { min, max, center, size };
    },
    [cullingMargin] // Add dependency
  );

  // Update camera frustum
  const updateFrustum = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastUpdateTimeRef.current < updateInterval) {
      return;
    }
    lastUpdateTimeRef.current = now;

    // Update camera matrix
    cameraMatrixRef.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    // Update frustum
    frustumRef.current.setFromProjectionMatrix(cameraMatrixRef.current);

    if (debugMode) {
      console.log("FrustumCulling: Updated camera frustum");
    }
  }, [camera, enabled, updateInterval, debugMode]);

  // Check if tile is visible
  const isTileVisible = useCallback(
    (
      centerX: number,
      centerZ: number,
      tileSize: number,
      maxHeight: number = 10
    ): boolean => {
      if (!enabled) return true;

      // First check: Distance-based pre-culling using optimized AABB method (like Quick_Grass)
      const cameraPos = camera.position;
      AABB_TMP.current.setFromCenterAndSize(
        new THREE.Vector3(centerX, 0, centerZ),
        new THREE.Vector3(tileSize, 1000, tileSize)
      );
      cameraPosXZ.current.set(cameraPos.x, 0, cameraPos.z);
      const distance = AABB_TMP.current.distanceToPoint(cameraPosXZ.current);

      if (distance > maxCullingDistance) {
        return false; // Too far away
      }

      // Second check: Frustum culling
      updateFrustum();
      const bounds = calculateTileBounds(centerX, centerZ, tileSize, maxHeight);
      const boundingBox = new THREE.Box3(bounds.min, bounds.max);

      return frustumRef.current.intersectsBox(boundingBox);
    },
    [enabled, updateFrustum, calculateTileBounds, maxCullingDistance, camera]
  );

  // Batch cull multiple tiles
  const cullTiles = useCallback(
    (
      tiles: Array<{
        id: string;
        centerX: number;
        centerZ: number;
        tileSize: number;
        maxHeight?: number;
      }>
    ): { visible: string[]; culled: string[] } => {
      if (!enabled) {
        return {
          visible: tiles.map((tile) => tile.id),
          culled: [],
        };
      }

      // Update frustum
      updateFrustum();

      const visible: string[] = [];
      const culled: string[] = [];

      tiles.forEach((tile) => {
        const isVisible = isTileVisible(
          tile.centerX,
          tile.centerZ,
          tile.tileSize,
          tile.maxHeight || 10
        );

        if (isVisible) {
          visible.push(tile.id);
          visibleTilesRef.current.add(tile.id);
          culledTilesRef.current.delete(tile.id);
        } else {
          culled.push(tile.id);
          culledTilesRef.current.add(tile.id);
          visibleTilesRef.current.delete(tile.id);
        }
      });

      // Update statistics
      statsRef.current = {
        totalTiles: tiles.length,
        visibleTiles: visible.length,
        culledTiles: culled.length,
        lastUpdateTime: Date.now(),
      };

      if (debugMode) {
        console.log(
          `FrustumCulling: ${visible.length} visible, ${culled.length} culled out of ${tiles.length} total tiles`
        );
      }

      return { visible, culled };
    },
    [enabled, updateFrustum, isTileVisible, debugMode]
  );

  // Get culling statistics
  const getStats = useCallback(() => {
    return { ...statsRef.current };
  }, []);

  // Check if specific tile is currently visible
  const isCurrentlyVisible = useCallback((tileId: string): boolean => {
    return visibleTilesRef.current.has(tileId);
  }, []);

  // Clear culling state
  const clearState = useCallback(() => {
    visibleTilesRef.current.clear();
    culledTilesRef.current.clear();
    statsRef.current = {
      totalTiles: 0,
      visibleTiles: 0,
      culledTiles: 0,
      lastUpdateTime: 0,
    };
  }, []);

  // Force update frustum (useful for camera changes)
  const forceUpdate = useCallback(() => {
    lastUpdateTimeRef.current = 0;
    updateFrustum();
  }, [updateFrustum]);

  return {
    isTileVisible,
    cullTiles,
    getStats,
    isCurrentlyVisible,
    clearState,
    forceUpdate,
    enabled,
  };
};
