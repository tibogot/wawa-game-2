import { useRef, useCallback } from "react";
import * as THREE from "three";

interface LODConfig {
  GRASS_LOD_DISTANCE: number;
  TILE_SIZE: number;
  NUM_GRASS: number;
}

interface Tile {
  x: number;
  z: number;
  centerX: number;
  centerZ: number;
  distanceToCamera: number;
  currentLOD: string | null;
  mesh: THREE.InstancedMesh | null;
  tileSize: number;
  lastUpdateTime: number;
  priority: number; // Higher priority = update sooner
}

export const useAdaptiveLODSystem = () => {
  const lastCameraPosition = useRef(new THREE.Vector3());
  const lastUpdateTime = useRef(0);
  const updateQueue = useRef<Tile[]>([]);
  const isUpdating = useRef(false);

  // Optimized distance calculation (like Quick_Grass) - reusable AABB
  const AABB_TMP = useRef(new THREE.Box3());
  const cameraPosXZ = useRef(new THREE.Vector3());

  // Calculate update priority based on distance and LOD change impact
  const calculatePriority = useCallback(
    (tile: Tile, cameraPos: THREE.Vector3, config: LODConfig): number => {
      // Use optimized AABB distance calculation (like Quick_Grass)
      AABB_TMP.current.setFromCenterAndSize(
        new THREE.Vector3(tile.centerX, 0, tile.centerZ),
        new THREE.Vector3(tile.tileSize, 1000, tile.tileSize)
      );
      cameraPosXZ.current.set(cameraPos.x, 0, cameraPos.z);
      const distance = AABB_TMP.current.distanceToPoint(cameraPosXZ.current);

      // Determine target LOD
      let targetLOD: string;
      if (distance < config.GRASS_LOD_DISTANCE) {
        targetLOD = "HIGH";
      } else {
        targetLOD = "LOW";
      }

      // Calculate priority based on:
      // 1. Distance to camera (closer = higher priority)
      // 2. LOD change impact (HIGH->LOW transition)
      // 3. Time since last update
      const distancePriority = 1 / (distance + 1); // Closer = higher priority

      let lodChangePriority = 0;
      if (tile.currentLOD !== targetLOD) {
        const lodLevels = { HIGH: 2, LOW: 1 };
        const currentLevel =
          lodLevels[tile.currentLOD as keyof typeof lodLevels] || 0;
        const targetLevel = lodLevels[targetLOD as keyof typeof lodLevels];
        lodChangePriority = Math.abs(targetLevel - currentLevel) * 0.5;
      }

      const timeSinceUpdate = Date.now() - tile.lastUpdateTime;
      const timePriority = Math.min(timeSinceUpdate / 1000, 2); // Cap at 2 seconds

      return distancePriority + lodChangePriority + timePriority;
    },
    []
  );

  // Adaptive update interval based on camera movement
  const getUpdateInterval = useCallback((cameraPos: THREE.Vector3): number => {
    const movement = cameraPos.distanceTo(lastCameraPosition.current);
    lastCameraPosition.current.copy(cameraPos);

    // Faster updates when camera is moving quickly
    if (movement > 5) return 100; // 100ms for fast movement
    if (movement > 2) return 200; // 200ms for medium movement
    if (movement > 0.5) return 500; // 500ms for slow movement
    return 1000; // 1000ms for stationary camera
  }, []);

  // Process LOD updates in batches to avoid frame drops
  const processLODUpdates = useCallback(
    (
      tiles: Tile[],
      cameraPos: THREE.Vector3,
      config: LODConfig,
      updateTile: (tile: Tile, newLOD: string) => void
    ) => {
      if (isUpdating.current) return;

      isUpdating.current = true;
      const startTime = performance.now();
      const maxUpdateTime = 8; // 8ms max per frame

      // Sort tiles by priority
      tiles.forEach((tile) => {
        tile.priority = calculatePriority(tile, cameraPos, config);
      });

      tiles.sort((a, b) => b.priority - a.priority);

      let processedCount = 0;
      for (const tile of tiles) {
        if (performance.now() - startTime > maxUpdateTime) {
          break; // Stop if we've used too much time this frame
        }

        // Use optimized AABB distance calculation (like Quick_Grass)
        AABB_TMP.current.setFromCenterAndSize(
          new THREE.Vector3(tile.centerX, 0, tile.centerZ),
          new THREE.Vector3(tile.tileSize, 1000, tile.tileSize)
        );
        cameraPosXZ.current.set(cameraPos.x, 0, cameraPos.z);
        const distance = AABB_TMP.current.distanceToPoint(cameraPosXZ.current);

        // Hysteresis: use different thresholds for switching up vs down to prevent flickering
        let newLOD: string;
        const currentLOD = tile.currentLOD || "HIGH";

        if (currentLOD === "HIGH") {
          // Switch down from HIGH to LOW at 50 (10 units farther than switching up)
          newLOD = distance < 50.0 ? "HIGH" : "LOW";
        } else {
          // Switch up from LOW to HIGH at 35 (10 units closer than switching down)
          newLOD = distance < 35.0 ? "HIGH" : "LOW";
        }

        if (newLOD !== tile.currentLOD) {
          updateTile(tile, newLOD);
          tile.lastUpdateTime = Date.now();
          processedCount++;
        }
      }

      isUpdating.current = false;
      return processedCount;
    },
    [calculatePriority]
  );

  // Frustum culling with margin for better performance
  const isTileVisible = useCallback(
    (tile: Tile, camera: THREE.Camera, margin: number = 5): boolean => {
      const frustum = new THREE.Frustum();
      const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(cameraMatrix);

      // Add margin to tile bounds for better culling
      const tileBounds = new THREE.Box3();
      tileBounds.setFromCenterAndSize(
        new THREE.Vector3(tile.centerX, 0, tile.centerZ),
        new THREE.Vector3(tile.tileSize + margin, 10, tile.tileSize + margin)
      );

      return frustum.intersectsBox(tileBounds);
    },
    []
  );

  // Distance-based culling for very far tiles
  const shouldCullTile = useCallback(
    (
      tile: Tile,
      cameraPos: THREE.Vector3,
      maxDistance: number = 150
    ): boolean => {
      // Use optimized AABB distance calculation (like Quick_Grass)
      AABB_TMP.current.setFromCenterAndSize(
        new THREE.Vector3(tile.centerX, 0, tile.centerZ),
        new THREE.Vector3(tile.tileSize, 1000, tile.tileSize)
      );
      cameraPosXZ.current.set(cameraPos.x, 0, cameraPos.z);
      const distance = AABB_TMP.current.distanceToPoint(cameraPosXZ.current);
      return distance > maxDistance;
    },
    []
  );

  return {
    processLODUpdates,
    isTileVisible,
    shouldCullTile,
    getUpdateInterval,
  };
};
