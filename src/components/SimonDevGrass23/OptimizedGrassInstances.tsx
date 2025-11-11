import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAdaptiveLODSystem } from "./AdaptiveLODSystem";
import {
  createOptimizedTileMesh,
  updateOptimizedTileMesh,
} from "./OptimizedGrassGeometry";
import { useFrustumCullingSystem } from "./FrustumCullingSystem";

interface OptimizedGrassInstancesProps {
  highLOD: THREE.BufferGeometry;
  lowLOD: THREE.BufferGeometry;
  grassMaterial: THREE.Material;
  grassScale: number;
  grassHeight: number;
  baseWidth: number;
  useFloat16: boolean;
  getGroundHeight: (x: number, z: number) => number;
  setMeshReady: (ready: boolean) => void;
  GRASS_LOD_DISTANCE: number;
  disableChunkRemoval?: boolean;
  enableFrustumCulling?: boolean;
  frustumCullingUpdateInterval?: number;
  debugFrustumCulling?: boolean;
  mapSize?: number; // Add map size parameter
}

export const useOptimizedGrassInstances = ({
  highLOD,
  lowLOD,
  grassMaterial,
  grassScale,
  grassHeight,
  baseWidth,
  useFloat16,
  getGroundHeight,
  setMeshReady,
  GRASS_LOD_DISTANCE,
  disableChunkRemoval = false,
  enableFrustumCulling = true,
  frustumCullingUpdateInterval = 100,
  debugFrustumCulling = false,
  mapSize = 200, // Default for small maps
}: OptimizedGrassInstancesProps) => {
  const { camera } = useThree();
  const isCreatingGrassRef = useRef(false);
  const tilesRef = useRef<any[]>([]);
  const lastUpdateTimeRef = useRef(0);
  const instancedMeshRef = useRef<THREE.Group | null>(null);
  const hasInitializedRef = useRef(false);

  // Mesh pools for reuse (like Quick_Grass)
  const meshPoolHigh = useRef<THREE.InstancedMesh[]>([]);
  const meshPoolLow = useRef<THREE.InstancedMesh[]>([]);
  const MAX_POOL_SIZE = 1000; // Prevent unbounded growth

  // Optimized distance calculation (like Quick_Grass) - reusable AABB
  const AABB_TMP = useRef(new THREE.Box3());
  const cameraPosXZ = useRef(new THREE.Vector3());

  // Initialize optimization systems
  const adaptiveLOD = useAdaptiveLODSystem();
  const frustumCulling = useFrustumCullingSystem({
    enabled: enableFrustumCulling,
    updateInterval: frustumCullingUpdateInterval,
    debugMode: debugFrustumCulling,
    mapSize: mapSize, // Pass map size for adaptive culling
    areaSize: 200, // Pass grass area size
  });

  // If the material reference changes, update existing tile meshes to use it
  useEffect(() => {
    if (!instancedMeshRef.current) return;
    const group = instancedMeshRef.current;
    group.traverse((obj) => {
      const mesh = obj as THREE.InstancedMesh;
      if ((mesh as any).isInstancedMesh) {
        (mesh as any).material = grassMaterial;
        if ((mesh as any).material) (mesh as any).material.needsUpdate = true;
      }
    });
  }, [grassMaterial]);

  // Configuration
  // Fixed instance count per mesh (like Quick_Grass: (32 * 32) * 3 = 3072)
  const NUM_GRASS = 3072;
  const config = {
    GRASS_LOD_DISTANCE,
    TILE_SIZE: 10,
    NUM_GRASS,
  };

  // Initialize grass on first frame when camera is ready
  // Use useFrame to ensure camera position is set (especially important for follow camera)
  useFrame(() => {
    if (
      instancedMeshRef.current ||
      isCreatingGrassRef.current ||
      hasInitializedRef.current
    ) {
      return;
    }

    hasInitializedRef.current = true;

    isCreatingGrassRef.current = true;

    const cleanup = () => {
      if (instancedMeshRef.current) {
        instancedMeshRef.current.clear();
        instancedMeshRef.current = null;
      }
      tilesRef.current = [];
      isCreatingGrassRef.current = false;
      setMeshReady(false);
    };

    try {
      const FIELD_SIZE = 200;
      const tilesPerSide = Math.ceil(FIELD_SIZE / config.TILE_SIZE);
      const totalTiles = tilesPerSide * tilesPerSide;

      // Create tile data
      const tiles: any[] = [];
      for (let x = 0; x < tilesPerSide; x++) {
        for (let z = 0; z < tilesPerSide; z++) {
          const tileX =
            (x - tilesPerSide / 2) * config.TILE_SIZE + config.TILE_SIZE / 2;
          const tileZ =
            (z - tilesPerSide / 2) * config.TILE_SIZE + config.TILE_SIZE / 2;

          tiles.push({
            x: tileX,
            z: tileZ,
            centerX: tileX,
            centerZ: tileZ,
            distanceToCamera: 0,
            currentLOD: null,
            mesh: null,
            tileSize: config.TILE_SIZE,
            lastUpdateTime: 0,
            priority: 0,
          });
        }
      }

      tilesRef.current = tiles;

      // Create group to hold all tile meshes
      const instancedMesh = new THREE.Group();
      instancedMeshRef.current = instancedMesh;

      // Ensure camera matrices are up to date
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();

      // Force frustum update to ensure correct culling state
      frustumCulling.forceUpdate();

      // Get initial camera position
      const initialCameraPos = camera.position.clone();

      // Maximum distance for initial creation
      const INITIAL_CREATION_DISTANCE = 150; // Create tiles within this distance
      // Close distance: always create tiles near character regardless of frustum (safety zone)
      const CLOSE_DISTANCE = 60; // Within this distance, ignore frustum to ensure grass around character

      let visibleTiles = 0;
      let culledTiles = 0;

      // Apply frustum culling to all tiles first (but we'll be lenient for close tiles)
      const tilesWithIds = tiles.map((tile, index) => ({
        ...tile,
        id: `tile_${index}`,
      }));

      const { visible: visibleTileIds } =
        frustumCulling.cullTiles(tilesWithIds);

      // Create initial meshes - hybrid approach: distance + conditional frustum
      tiles.forEach((tile, index) => {
        const tileId = `tile_${index}`;

        // Calculate distance from camera using optimized AABB method (like Quick_Grass)
        AABB_TMP.current.setFromCenterAndSize(
          new THREE.Vector3(tile.centerX, 0, tile.centerZ),
          new THREE.Vector3(config.TILE_SIZE, 1000, config.TILE_SIZE)
        );
        cameraPosXZ.current.set(initialCameraPos.x, 0, initialCameraPos.z);
        const distance = AABB_TMP.current.distanceToPoint(cameraPosXZ.current);
        tile.distanceToCamera = distance;

        // Check distance
        const isWithinDistance = distance <= INITIAL_CREATION_DISTANCE;
        const isCloseToCharacter = distance <= CLOSE_DISTANCE;

        // Frustum check: required for far tiles, optional for close tiles
        // Close tiles: always create (ensures grass around character even if frustum is wrong)
        // Far tiles: must pass frustum check (culls tiles behind camera)
        const isFrustumVisible = enableFrustumCulling
          ? isCloseToCharacter || visibleTileIds.includes(tileId) // Close tiles skip frustum
          : true; // If frustum culling disabled, allow all

        // Check LOD visibility (distance-based)
        const isLODVisible =
          disableChunkRemoval ||
          isWithinDistance ||
          adaptiveLOD.isTileVisible(tile, camera);

        // Tile is visible if: within distance AND (close OR in frustum) AND LOD check passes
        const isVisible = isWithinDistance && isFrustumVisible && isLODVisible;

        if (!isVisible) {
          culledTiles++;
          return;
        }

        visibleTiles++;

        // Determine initial LOD
        let lodLevel: "HIGH" | "LOW";
        let geometry: THREE.BufferGeometry;

        if (distance < config.GRASS_LOD_DISTANCE) {
          lodLevel = "HIGH";
          geometry = highLOD;
        } else {
          lodLevel = "LOW";
          geometry = lowLOD;
        }

        tile.currentLOD = lodLevel;

        // Try to reuse mesh from pool (like Quick_Grass)
        const selectedPool = lodLevel === "HIGH" ? meshPoolHigh : meshPoolLow;
        let tileMesh: THREE.InstancedMesh | null = null;

        if (selectedPool.current.length > 0) {
          // Reuse mesh from pool
          tileMesh = selectedPool.current.pop()!;
          updateOptimizedTileMesh(
            tileMesh,
            tile,
            geometry,
            grassMaterial,
            config.NUM_GRASS,
            grassScale,
            grassHeight,
            baseWidth,
            getGroundHeight
          );
          tileMesh.visible = true;
        } else {
          // Create new mesh if pool is empty
          tileMesh = createOptimizedTileMesh(
            tile,
            geometry,
            grassMaterial,
            config.NUM_GRASS,
            grassScale,
            grassHeight,
            baseWidth,
            getGroundHeight,
            lodLevel
          );
        }

        if (tileMesh) {
          tile.mesh = tileMesh;
          // Explicitly set visible for initial creation (before update frame hides everything)
          tileMesh.visible = true;
          instancedMesh.add(tileMesh);
        }
      });

      isCreatingGrassRef.current = false;

      // Trigger re-render after mesh is ready
      // Using requestAnimationFrame ensures React sees the state change properly
      requestAnimationFrame(() => {
        setMeshReady(true);
        console.log(
          `Grass system initialized: ${visibleTiles} visible tiles, ${culledTiles} culled tiles`
        );
      });
    } catch (error) {
      console.error("Error initializing grass system:", error);
      cleanup();
    }
  });

  // Optimized LOD updates with adaptive timing
  useFrame((state) => {
    if (!instancedMeshRef.current || tilesRef.current.length === 0) {
      return;
    }

    const cameraPos = camera.position;
    const updateInterval = adaptiveLOD.getUpdateInterval(cameraPos);
    const now = Date.now();

    if (now - lastUpdateTimeRef.current < updateInterval) {
      return;
    }
    lastUpdateTimeRef.current = now;

    // Simplified visibility management: Set all meshes invisible first (like Quick_Grass)
    // Only do this after initial creation is complete to avoid hiding newly created meshes
    if (hasInitializedRef.current) {
      instancedMeshRef.current.traverse((obj) => {
        const mesh = obj as THREE.InstancedMesh;
        if ((mesh as any).isInstancedMesh) {
          mesh.visible = false;
        }
      });
    }

    // Process LOD updates in batches
    const updateTile = (
      tile: any,
      newLOD: string,
      shouldBeVisible: boolean = true
    ) => {
      const oldMesh = tile.mesh;
      const oldLOD = tile.currentLOD;

      // Determine geometry for new LOD (fixed instance count for all LODs)
      let geometry: THREE.BufferGeometry;
      let targetPool: React.MutableRefObject<THREE.InstancedMesh[]>;

      if (newLOD === "HIGH") {
        geometry = highLOD;
        targetPool = meshPoolHigh;
      } else {
        geometry = lowLOD;
        targetPool = meshPoolLow;
      }

      // Simplified visibility management: Keep meshes in scene, just update them
      let newMesh: THREE.InstancedMesh;

      if (oldMesh && oldLOD === newLOD) {
        // Same LOD, just update the existing mesh (keep in scene)
        newMesh = oldMesh;
        updateOptimizedTileMesh(
          newMesh,
          tile,
          geometry,
          grassMaterial,
          config.NUM_GRASS,
          grassScale,
          grassHeight,
          baseWidth,
          getGroundHeight
        );
      } else if (oldMesh && oldLOD !== newLOD) {
        // LOD changed: Return old mesh to pool and get new one
        // Keep mesh in scene, just set invisible (simplified visibility management)
        oldMesh.visible = false;

        // Return to pool based on old LOD
        const oldPool = oldLOD === "HIGH" ? meshPoolHigh : meshPoolLow;
        if (oldPool.current.length < MAX_POOL_SIZE) {
          oldPool.current.push(oldMesh);
        } else {
          // Dispose if pool is full (but this should rarely happen)
          oldMesh.visible = false;
          if (instancedMeshRef.current!.children.includes(oldMesh)) {
            instancedMeshRef.current!.remove(oldMesh);
          }
          oldMesh.dispose();
        }

        // Get mesh from target pool or create new
        if (targetPool.current.length > 0) {
          newMesh = targetPool.current.pop()!;
          updateOptimizedTileMesh(
            newMesh,
            tile,
            geometry,
            grassMaterial,
            config.NUM_GRASS,
            grassScale,
            grassHeight,
            baseWidth,
            getGroundHeight
          );
          // Ensure it's in the scene (it should be from when it was created)
          if (!instancedMeshRef.current!.children.includes(newMesh)) {
            instancedMeshRef.current!.add(newMesh);
          }
        } else {
          // Create new mesh if pool is empty
          newMesh = createOptimizedTileMesh(
            tile,
            geometry,
            grassMaterial,
            config.NUM_GRASS,
            grassScale,
            grassHeight,
            baseWidth,
            getGroundHeight,
            newLOD as "HIGH" | "LOW"
          );
          instancedMeshRef.current!.add(newMesh);
        }
      } else if (!oldMesh) {
        // No existing mesh: create new one
        if (targetPool.current.length > 0) {
          newMesh = targetPool.current.pop()!;
          updateOptimizedTileMesh(
            newMesh,
            tile,
            geometry,
            grassMaterial,
            config.NUM_GRASS,
            grassScale,
            grassHeight,
            baseWidth,
            getGroundHeight
          );
          // Ensure it's in the scene (it should be from when it was created)
          if (!instancedMeshRef.current!.children.includes(newMesh)) {
            instancedMeshRef.current!.add(newMesh);
          }
        } else {
          newMesh = createOptimizedTileMesh(
            tile,
            geometry,
            grassMaterial,
            config.NUM_GRASS,
            grassScale,
            grassHeight,
            baseWidth,
            getGroundHeight,
            newLOD as "HIGH" | "LOW"
          );
          instancedMeshRef.current!.add(newMesh);
        }
      }

      tile.mesh = newMesh!;
      tile.currentLOD = newLOD;

      // Set visibility based on whether tile should be visible
      if (shouldBeVisible) {
        newMesh!.visible = true;
      }
    };

    // Apply frustum culling to tiles before LOD updates
    const INITIAL_CREATION_DISTANCE = 150; // Same as initial creation
    const CLOSE_DISTANCE = 60; // Same as initial creation

    if (enableFrustumCulling) {
      const tilesWithIds = tilesRef.current.map((tile, index) => ({
        ...tile,
        id: `tile_${index}`,
      }));

      const { visible: visibleTileIds } =
        frustumCulling.cullTiles(tilesWithIds);

      // Filter tiles by both frustum and distance (matching initial creation logic)
      cameraPosXZ.current.set(cameraPos.x, 0, cameraPos.z);
      const visibleTiles = tilesRef.current.filter((tile, index) => {
        const tileId = `tile_${index}`;
        // Use optimized AABB distance calculation (like Quick_Grass)
        AABB_TMP.current.setFromCenterAndSize(
          new THREE.Vector3(tile.centerX, 0, tile.centerZ),
          new THREE.Vector3(config.TILE_SIZE, 1000, config.TILE_SIZE)
        );
        const distance = AABB_TMP.current.distanceToPoint(cameraPosXZ.current);
        const isWithinDistance = distance <= INITIAL_CREATION_DISTANCE;
        const isCloseToCharacter = distance <= CLOSE_DISTANCE;

        // Same logic as initial creation: within distance AND (close OR in frustum)
        const isFrustumVisible =
          isCloseToCharacter || visibleTileIds.includes(tileId);

        return isWithinDistance && isFrustumVisible;
      });

      // Make visible all tiles that should be visible (including ones that don't need LOD updates)
      visibleTiles.forEach((tile) => {
        if (tile.mesh) {
          tile.mesh.visible = true;
        }
      });

      // Process LOD updates only for visible tiles (they should be visible)
      adaptiveLOD.processLODUpdates(
        visibleTiles,
        cameraPos,
        config,
        (tile: any, newLOD: string) => updateTile(tile, newLOD, true)
      );
    } else {
      // If frustum culling disabled, use distance-based visibility
      cameraPosXZ.current.set(cameraPos.x, 0, cameraPos.z);
      tilesRef.current.forEach((tile) => {
        if (tile.mesh) {
          // Use optimized AABB distance calculation (like Quick_Grass)
          AABB_TMP.current.setFromCenterAndSize(
            new THREE.Vector3(tile.centerX, 0, tile.centerZ),
            new THREE.Vector3(config.TILE_SIZE, 1000, config.TILE_SIZE)
          );
          const distance = AABB_TMP.current.distanceToPoint(
            cameraPosXZ.current
          );
          tile.mesh.visible = distance <= INITIAL_CREATION_DISTANCE;
        }
      });

      // Process LOD updates for all tiles within distance
      const tilesWithinDistance = tilesRef.current.filter((tile) => {
        // Use optimized AABB distance calculation (like Quick_Grass)
        AABB_TMP.current.setFromCenterAndSize(
          new THREE.Vector3(tile.centerX, 0, tile.centerZ),
          new THREE.Vector3(config.TILE_SIZE, 1000, config.TILE_SIZE)
        );
        const distance = AABB_TMP.current.distanceToPoint(cameraPosXZ.current);
        return distance <= INITIAL_CREATION_DISTANCE;
      });

      adaptiveLOD.processLODUpdates(
        tilesWithinDistance,
        cameraPos,
        config,
        (tile: any, newLOD: string) => updateTile(tile, newLOD, true)
      );
    }
  });

  return { instancedMeshRef };
};

export default useOptimizedGrassInstances;
