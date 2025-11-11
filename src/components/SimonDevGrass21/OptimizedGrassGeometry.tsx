import { useMemo, useRef } from "react";
import * as THREE from "three";

// LOD Constants
const GRASS_VERTICES_HIGH = 15;
const GRASS_VERTICES_LOW = 7;
const GRASS_VERTICES_ULTRA_LOW = 4;
const GRASS_LOD_DISTANCE = 40.0;
const GRASS_ULTRA_LOW_DISTANCE = 60.0;

// Shared geometry cache to avoid recreating geometries
const geometryCache = new Map<string, THREE.BufferGeometry>();

const createGrassGeometry = (
  grassHeight: number,
  segments: number,
  useFloat16: boolean = false
): THREE.BufferGeometry => {
  const cacheKey = `${grassHeight}-${segments}-${useFloat16}`;

  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey)!.clone();
  }

  const geometry = new THREE.BufferGeometry();
  const baseWidth = 0.1;
  const tipWidth = 0.0;

  // Create height distribution
  const segmentHeights = Array.from(
    { length: segments + 1 },
    (_, i) => i / segments
  );

  // Create width distribution (taper from base to tip)
  const segmentWidths = segmentHeights.map(
    (t) => baseWidth * (1 - t) + tipWidth * t
  );

  // Create curve offsets (backward lean) - parabolic curve
  const curveOffsets = segmentHeights.map((t) => 0.25 * t * t);

  const vertices: number[] = [];
  const uvs: number[] = [];

  // Create vertices for each segment
  for (let i = 0; i <= segments; i++) {
    const height = segmentHeights[i] * grassHeight;
    const width = segmentWidths[i];
    const curveOffset = curveOffsets[i];

    // Left edge vertex
    vertices.push(-width, height, curveOffset);
    uvs.push(0, height / grassHeight);

    // Center spine vertex
    vertices.push(0, height, curveOffset);
    uvs.push(0.5, height / grassHeight);

    // Right edge vertex
    vertices.push(width, height, curveOffset);
    uvs.push(1, height / grassHeight);
  }

  // Use appropriate precision
  const positionArray = useFloat16
    ? new Float16Array(vertices)
    : new Float32Array(vertices);
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positionArray as any, 3)
  );

  // Create triangular faces
  const indices: number[] = [];
  for (let seg = 0; seg < segments; seg++) {
    const baseIndex = seg * 3;

    // Left triangle
    indices.push(baseIndex + 0, baseIndex + 3, baseIndex + 1);
    indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 4);

    // Right triangle
    indices.push(baseIndex + 1, baseIndex + 4, baseIndex + 2);
    indices.push(baseIndex + 2, baseIndex + 4, baseIndex + 5);
  }

  geometry.setIndex(indices);
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(uvs), 2)
  );
  geometry.computeVertexNormals();

  // Cache the geometry
  geometryCache.set(cacheKey, geometry.clone());

  return geometry;
};

export const useOptimizedGrassGeometry = ({
  grassHeight,
  useFloat16 = false,
}: {
  grassHeight: number;
  useFloat16?: boolean;
}) => {
  return useMemo(() => {
    // Create shared geometries
    const highLOD = createGrassGeometry(grassHeight, 5, useFloat16);
    const lowLOD = createGrassGeometry(grassHeight, 2, useFloat16);
    const ultraLowLOD = createGrassGeometry(grassHeight, 1, useFloat16);

    return {
      highLOD,
      lowLOD,
      ultraLowLOD,
      GRASS_LOD_DISTANCE,
      GRASS_ULTRA_LOW_DISTANCE,
    };
  }, [grassHeight, useFloat16]);
};

// Utility function to create optimized tile mesh with shared geometry
export const createOptimizedTileMesh = (
  tile: any,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  grassCount: number,
  grassScale: number,
  getGroundHeight: (x: number, z: number) => number,
  lodLevel: string
): THREE.InstancedMesh => {
  // Use shared geometry instead of cloning
  const tileMesh = new THREE.InstancedMesh(geometry, material, grassCount);

  tileMesh.position.set(tile.centerX, 0, tile.centerZ);
  tileMesh.castShadow = true;
  tileMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const matrixArray = new Float32Array(grassCount * 16);

  for (let i = 0; i < grassCount; i++) {
    const x = (Math.random() - 0.5) * tile.tileSize;
    const z = (Math.random() - 0.5) * tile.tileSize;
    const worldX = tile.centerX + x;
    const worldZ = tile.centerZ + z;
    const groundHeight = getGroundHeight ? getGroundHeight(worldX, worldZ) : 0;

    dummy.rotation.y = Math.random() * Math.PI * 2;
    const baseScale = grassScale * (0.5 + Math.random() * 0.5);
    const heightVariation = 0.8 + Math.random() * 0.4;
    const finalScale = baseScale * heightVariation;

    dummy.position.set(x, groundHeight, z);
    dummy.scale.set(baseScale, finalScale, baseScale);
    dummy.updateMatrix();

    // Store matrix in array for batch update
    dummy.matrix.toArray(matrixArray, i * 16);
  }

  // Batch update all matrices at once
  tileMesh.instanceMatrix.set(matrixArray);
  tileMesh.instanceMatrix.needsUpdate = true;

  // Set wind influence attribute (skip for ultra-low LOD)
  if (lodLevel !== "ULTRA_LOW") {
    const windInfluences = new Float32Array(grassCount);
    for (let i = 0; i < grassCount; i++) {
      windInfluences[i] = 0.5 + Math.random() * 1.0;
    }
    tileMesh.geometry.setAttribute(
      "windInfluence",
      new THREE.InstancedBufferAttribute(windInfluences, 1)
    );
  }

  return tileMesh;
};

// Cleanup function for geometry cache
export const cleanupGeometryCache = () => {
  geometryCache.forEach((geometry) => geometry.dispose());
  geometryCache.clear();
};

export {
  GRASS_VERTICES_HIGH,
  GRASS_VERTICES_LOW,
  GRASS_VERTICES_ULTRA_LOW,
  GRASS_LOD_DISTANCE,
  GRASS_ULTRA_LOW_DISTANCE,
};
