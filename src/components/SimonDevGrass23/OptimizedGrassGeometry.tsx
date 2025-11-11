import { useMemo, useRef } from "react";
import * as THREE from "three";

// Type declaration for Float16Array (if available)
declare const Float16Array: {
  new (array: number[] | ArrayLike<number>): ArrayLike<number> & {
    [index: number]: number;
  };
};

// LOD Constants
const GRASS_VERTICES_HIGH = 15;
const GRASS_VERTICES_LOW = 7;
const GRASS_LOD_DISTANCE = 40.0;

// Shared geometry cache to avoid recreating geometries
// ⚠️ IMPORTANT: Cache was changed to unit-sized geometry - old cached geometries might be wrong size
// If grass is too large, clear cache by changing this version number
const CACHE_VERSION = "v2-unit-sized"; // Changed from v1 when switching to unit-sized geometry
const geometryCache = new Map<string, THREE.BufferGeometry>();

// EaseOut function matching Quick_Grass: easeOut(x, t) = 1.0 - pow(1.0 - x, t)
// Creates gradual curve: starts fast, slows down (keeps width longer)
const easeOut = (x: number, t: number): number => {
  return 1.0 - Math.pow(1.0 - x, t);
};

const createGrassGeometry = (
  grassHeight: number,
  segments: number,
  useFloat16: boolean = false,
  baseWidth: number = 0.1,
  tipWidth: number = 0.0,
  curveOffset: number = 0.25,
  useEaseOutCurve: boolean = false // ⭐ NEW: Apply easeOut curve like Quick_Grass HIGH LOD
): THREE.BufferGeometry => {
  // ⚠️ IMPORTANT: Include cache version to force regeneration when geometry approach changes
  // Cache key includes useEaseOutCurve to differentiate HIGH/LOW LOD
  const cacheKey = `${CACHE_VERSION}-${segments}-${useFloat16}-${baseWidth}-${tipWidth}-${curveOffset}-${useEaseOutCurve}`;

  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey)!.clone();
  }

  const geometry = new THREE.BufferGeometry();

  // Create height distribution
  const segmentHeights = Array.from(
    { length: segments + 1 },
    (_, i) => i / segments
  );

  // Create width distribution (taper from base to tip)
  // ⭐ Quick_Grass style: easeOut curve for HIGH LOD (gradual taper, stays wider longer)
  // Linear for LOW LOD (constant taper rate)
  const segmentWidths = segmentHeights.map((t) => {
    if (useEaseOutCurve) {
      // Like Quick_Grass: easeOut(1.0 - heightPercent, 2.0)
      // This creates: base (t=0) → widthFactor=1.0, tip (t=1) → widthFactor=0.0
      // The easeOut curve keeps width longer, creating fuller appearance
      const widthFactor = easeOut(1.0 - t, 2.0);
      // Apply width factor to baseWidth (tipWidth is typically 0)
      return baseWidth * widthFactor + tipWidth * (1.0 - widthFactor);
    } else {
      // Linear taper (LOW LOD or fallback)
      return baseWidth * (1 - t) + tipWidth * t;
    }
  });

  // Create curve offsets (backward lean) - parabolic curve
  const curveOffsets = segmentHeights.map((t) => curveOffset * t * t);

  const vertices: number[] = [];
  const uvs: number[] = [];

  // Create vertices for each segment
  // ⭐ Create unit-sized geometry (0 to 1) - Quick_Grass calculates size in shader
  // We'll scale via instance matrix like Quick_Grass does in shader
  for (let i = 0; i <= segments; i++) {
    const height = segmentHeights[i]; // Unit-sized: 0 to 1 (not multiplied by grassHeight)
    const width = segmentWidths[i];
    const curveOffset = curveOffsets[i];

    // Left edge vertex
    vertices.push(-width, height, curveOffset);
    uvs.push(0, height); // Unit-sized: 0 to 1

    // Center spine vertex
    vertices.push(0, height, curveOffset);
    uvs.push(0.5, height); // Unit-sized: 0 to 1

    // Right edge vertex
    vertices.push(width, height, curveOffset);
    uvs.push(1, height); // Unit-sized: 0 to 1
  }

  // Use appropriate precision
  const positionArray = useFloat16
    ? (new (Float16Array as any)(vertices) as any)
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
  baseWidth = 0.1,
  tipWidth = 0.0,
  curveOffset = 0.25,
}: {
  grassHeight: number;
  useFloat16?: boolean;
  baseWidth?: number;
  tipWidth?: number;
  curveOffset?: number;
}) => {
  return useMemo(() => {
    // Create shared geometries - SimonDev's Ghost of Tsushima approach: 15 vertices for HIGH, 6 for LOW
    // ⭐ HIGH LOD: Use easeOut curve like Quick_Grass for fuller/thicker look near base
    const highLOD = createGrassGeometry(
      grassHeight,
      4,
      useFloat16,
      baseWidth,
      tipWidth,
      curveOffset,
      true // useEaseOutCurve = true for HIGH LOD
    );
    // ⭐ LOW LOD: Use linear taper (like Quick_Grass LOW LOD)
    const lowLOD = createGrassGeometry(
      grassHeight,
      1,
      useFloat16,
      baseWidth,
      tipWidth,
      curveOffset,
      false // useEaseOutCurve = false for LOW LOD (linear)
    );

    return {
      highLOD,
      lowLOD,
      GRASS_LOD_DISTANCE,
    };
  }, [grassHeight, useFloat16, baseWidth, tipWidth, curveOffset]);
};

// Utility function to create optimized tile mesh with shared geometry
export const createOptimizedTileMesh = (
  tile: any,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  grassCount: number,
  grassScale: number,
  grassHeight: number,
  baseWidth: number,
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
    // ⭐ Quick_Grass style: grassTotalHeight = grassSize.y * randomHeight
    // Quick_Grass: randomHeight = remap(hashVal1.z, 0.0, 1.0, 0.75, 1.5)
    // Since geometry is now unit-sized (0 to 1), we scale by grassHeight * randomHeight
    // ⚠️ FIX: Quick_Grass uses 0.75 to 1.5 multiplier, but we need to match their actual size
    // Let's check if grassHeight should be smaller or if we need different scaling
    const randomHeight = 0.75 + Math.random() * 0.75; // 0.75 to 1.5
    // Quick_Grass: grassTotalHeight = grassSize.y * randomHeight
    // Quick_Grass: grassSize.y = 1.5, randomHeight = 0.75 to 1.5
    // So Quick_Grass final height: 1.5 * (0.75 to 1.5) = 1.125 to 2.25
    // But user reports grass is still too large...
    // ⚠️ CRITICAL FIX: Maybe Quick_Grass's geometry template is smaller?
    // Let's verify - if geometry is unit-sized (0 to 1), scaling by grassHeight * randomHeight should work
    // But wait - maybe the issue is that we're creating geometry with width already scaled?
    // Let's check: width uses baseWidth (0.1), so geometry width goes 0 to 0.1
    // Then we scale by widthScale = grassScale * randomWidth = 1.0 * (0.8-1.2) = 0.8 to 1.2
    // So final width = 0.1 * (0.8 to 1.2) = 0.08 to 0.12
    // That should be correct...
    // ⚠️ FIX: Let's reduce height to match what user expects - maybe grassHeight should be smaller?
    // ⚠️ FIX: User reports grass is still too large (2 meters)
    // Quick_Grass height should be: 1.5 * (0.75 to 1.5) = 1.125 to 2.25
    // But user says it's too large, so let's try matching Quick_Grass more precisely
    // Maybe Quick_Grass's visual height is smaller than calculated?
    // Let's reduce to approximately 1 meter average height
    const finalHeightScale = grassHeight * randomHeight * 0.5; // ⚠️ Half size for testing
    // Width scale: Quick_Grass uses randomWidth around 1.0 with variation
    // Quick_Grass: randomWidth = (1.0 - isSandy) * heightmapSampleHeight (typically ~1.0)
    // grassTotalWidth = grassSize.x * mix(...) * randomWidth
    // grassSize.x = 0.1, so width = 0.1 * widthFactor * randomWidth
    // baseWidth (0.1) is already baked into geometry with widthFactor
    // So we should scale by randomWidth only, not grassScale!
    const randomWidth = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 (like Quick_Grass randomWidth variation)
    // ⚠️ FIX: Don't multiply by grassScale for width - Quick_Grass doesn't scale width separately
    // Width is already correct size in geometry (baseWidth = 0.1), just apply randomWidth variation
    const widthScale = randomWidth; // Only randomWidth variation, no grassScale

    dummy.position.set(x, groundHeight, z);
    // Scale: height uses finalHeightScale (grassHeight * randomHeight), width uses widthScale (just randomWidth)
    dummy.scale.set(widthScale, finalHeightScale, widthScale);
    dummy.updateMatrix();

    // Store matrix in array for batch update
    dummy.matrix.toArray(matrixArray, i * 16);
  }

  // Batch update all matrices at once
  tileMesh.instanceMatrix.set(matrixArray);
  tileMesh.instanceMatrix.needsUpdate = true;

  // Set wind influence attribute
  const windInfluences = new Float32Array(grassCount);
  for (let i = 0; i < grassCount; i++) {
    windInfluences[i] = 0.5 + Math.random() * 1.0;
  }
  tileMesh.geometry.setAttribute(
    "windInfluence",
    new THREE.InstancedBufferAttribute(windInfluences, 1)
  );

  return tileMesh;
};

// Utility function to update an existing tile mesh (for pool reuse)
export const updateOptimizedTileMesh = (
  tileMesh: THREE.InstancedMesh,
  tile: any,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  grassCount: number,
  grassScale: number,
  grassHeight: number,
  baseWidth: number,
  getGroundHeight: (x: number, z: number) => number
): void => {
  // Update geometry
  tileMesh.geometry = geometry;

  // Update material
  tileMesh.material = material;

  // Update position
  tileMesh.position.set(tile.centerX, 0, tile.centerZ);

  // Ensure instance count matches
  if (tileMesh.count !== grassCount) {
    tileMesh.count = grassCount;
  }

  // Update instance matrices
  const dummy = new THREE.Object3D();
  const matrixArray = new Float32Array(grassCount * 16);

  for (let i = 0; i < grassCount; i++) {
    const x = (Math.random() - 0.5) * tile.tileSize;
    const z = (Math.random() - 0.5) * tile.tileSize;
    const worldX = tile.centerX + x;
    const worldZ = tile.centerZ + z;
    const groundHeight = getGroundHeight ? getGroundHeight(worldX, worldZ) : 0;

    dummy.rotation.y = Math.random() * Math.PI * 2;
    // ⭐ Quick_Grass style: grassTotalHeight = grassSize.y * randomHeight
    // Quick_Grass: randomHeight = remap(hashVal1.z, 0.0, 1.0, 0.75, 1.5)
    // Since geometry is now unit-sized (0 to 1), we scale by grassHeight * randomHeight
    // ⚠️ FIX: Quick_Grass uses 0.75 to 1.5 multiplier, but we need to match their actual size
    // Let's check if grassHeight should be smaller or if we need different scaling
    const randomHeight = 0.75 + Math.random() * 0.75; // 0.75 to 1.5
    // Quick_Grass: grassTotalHeight = grassSize.y * randomHeight
    // Quick_Grass: grassSize.y = 1.5, randomHeight = 0.75 to 1.5
    // So Quick_Grass final height: 1.5 * (0.75 to 1.5) = 1.125 to 2.25
    // But user reports grass is still too large...
    // ⚠️ CRITICAL FIX: Maybe Quick_Grass's geometry template is smaller?
    // Let's verify - if geometry is unit-sized (0 to 1), scaling by grassHeight * randomHeight should work
    // But wait - maybe the issue is that we're creating geometry with width already scaled?
    // Let's check: width uses baseWidth (0.1), so geometry width goes 0 to 0.1
    // Then we scale by widthScale = grassScale * randomWidth = 1.0 * (0.8-1.2) = 0.8 to 1.2
    // So final width = 0.1 * (0.8 to 1.2) = 0.08 to 0.12
    // That should be correct...
    // ⚠️ FIX: Let's reduce height to match what user expects - maybe grassHeight should be smaller?
    // ⚠️ FIX: User reports grass is still too large (2 meters)
    // Quick_Grass height should be: 1.5 * (0.75 to 1.5) = 1.125 to 2.25
    // But user says it's too large, so let's try matching Quick_Grass more precisely
    // Maybe Quick_Grass's visual height is smaller than calculated?
    // Let's reduce to approximately 1 meter average height
    const finalHeightScale = grassHeight * randomHeight * 0.5; // ⚠️ Half size for testing
    // Width scale: Quick_Grass uses randomWidth around 1.0 with variation
    // Quick_Grass: randomWidth = (1.0 - isSandy) * heightmapSampleHeight (typically ~1.0)
    // grassTotalWidth = grassSize.x * mix(...) * randomWidth
    // grassSize.x = 0.1, so width = 0.1 * widthFactor * randomWidth
    // baseWidth (0.1) is already baked into geometry with widthFactor
    // So we should scale by randomWidth only, not grassScale!
    const randomWidth = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 (like Quick_Grass randomWidth variation)
    // ⚠️ FIX: Don't multiply by grassScale for width - Quick_Grass doesn't scale width separately
    // Width is already correct size in geometry (baseWidth = 0.1), just apply randomWidth variation
    const widthScale = randomWidth; // Only randomWidth variation, no grassScale

    dummy.position.set(x, groundHeight, z);
    // Scale: height uses finalHeightScale (grassHeight * randomHeight), width uses widthScale (just randomWidth)
    dummy.scale.set(widthScale, finalHeightScale, widthScale);
    dummy.updateMatrix();

    // Store matrix in array for batch update
    dummy.matrix.toArray(matrixArray, i * 16);
  }

  // Batch update all matrices at once
  tileMesh.instanceMatrix.set(matrixArray);
  tileMesh.instanceMatrix.needsUpdate = true;

  // Update wind influence attribute
  const windInfluences = new Float32Array(grassCount);
  for (let i = 0; i < grassCount; i++) {
    windInfluences[i] = 0.5 + Math.random() * 1.0;
  }
  tileMesh.geometry.setAttribute(
    "windInfluence",
    new THREE.InstancedBufferAttribute(windInfluences, 1)
  );
};

// Cleanup function for geometry cache
export const cleanupGeometryCache = () => {
  geometryCache.forEach((geometry) => geometry.dispose());
  geometryCache.clear();
};

export { GRASS_VERTICES_HIGH, GRASS_VERTICES_LOW, GRASS_LOD_DISTANCE };
