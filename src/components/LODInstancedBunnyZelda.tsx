import React, { useEffect, useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useGLTF } from "@react-three/drei";
import { useCustomPerformanceMetrics } from "../CustomPerformanceMonitor";

export default function LODInstancedBunnyZelda({
  gridSize = 10,
  spacing = 8,
  objectCount = 100,
  // LOD distance controls
  lodDistance1 = 10,
  lodDistance2 = 30,
  lodDistance3 = 60,
  // Shadow LOD controls
  enableShadowLOD = false,
  shadowLodDistance1 = 20,
  shadowLodDistance2 = 50,
  shadowLodDistance3 = 100,
  // Per-instance controls
  enablePerInstanceOpacity = false,
  opacityVariation = 0.3,
  enablePerInstanceVisibility = false,
  visibilityChance = 0.9,
  enablePerInstanceColors = false,
  colorVariation = 0.5,
  // Performance controls
  enableBVH = true,
  bvhMargin = 0.1,
  enableSorting = false,
  enableFrustumCulling = true,
  raycastOnlyFrustum = false,
  // Animation controls
  enableRotation = false,
  rotationSpeed = 0.5,
  // Advanced features
  enablePerInstanceUniforms = false,
  enableMorphing = false,
  enableSkeleton = false,
  enableLOD = true,
}) {
  const instancedMeshRef = useRef<InstancedMesh2 | null>(null);
  const [meshReady, setMeshReady] = useState(false);

  // Load all LOD levels of the bunny model (Zelda BotW approach)
  const { scene: bunnyLOD0 } = useGLTF("/models/bunnies/bunny_lod0.glb");
  const { scene: bunnyLOD1 } = useGLTF("/models/bunnies/bunny_lod1.glb");
  const { scene: bunnyLOD2 } = useGLTF("/models/bunnies/bunny_lod2.glb");
  const { scene: bunnyLOD3 } = useGLTF("/models/bunnies/bunny_lod3.glb");

  // Performance monitoring
  const performanceMetrics = useCustomPerformanceMetrics();
  const [lodStats, setLodStats] = useState({
    LOD0: 0,
    LOD1: 0,
    LOD2: 0,
    LOD3: 0,
  });

  // Create geometries from pre-made LOD models (Zelda BotW technique)
  const geometries = useMemo(() => {
    const createGeometryFromScene = (
      scene: THREE.Object3D,
      scale: number = 0.03
    ) => {
      const clonedScene = scene.clone();
      const geometries: THREE.BufferGeometry[] = [];

      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const geometry = child.geometry.clone();
          geometry.applyMatrix4(child.matrixWorld);
          geometries.push(geometry);
        }
      });

      if (geometries.length > 0) {
        // Merge all meshes into one geometry
        const merged = mergeGeometries(geometries);
        const finalGeometry = merged || geometries[0];

        // Scale the geometry to a reasonable size
        const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale);
        finalGeometry.applyMatrix4(scaleMatrix);

        // Center the geometry so the bottom is at Y=0
        finalGeometry.computeBoundingBox();
        const box = finalGeometry.boundingBox!;
        const center = box.getCenter(new THREE.Vector3());
        const offset = new THREE.Matrix4().makeTranslation(
          -center.x,
          -box.min.y,
          -center.z
        );
        finalGeometry.applyMatrix4(offset);

        return finalGeometry;
      }

      return new THREE.SphereGeometry(0.1, 32, 32); // Fallback geometry
    };

    return {
      LOD0: createGeometryFromScene(bunnyLOD0, 0.03), // 100% detail
      LOD1: createGeometryFromScene(bunnyLOD1, 0.03), // 50% detail
      LOD2: createGeometryFromScene(bunnyLOD2, 0.03), // 25% detail
      LOD3: createGeometryFromScene(bunnyLOD3, 0.03), // 10% detail
    };
  }, [bunnyLOD0, bunnyLOD1, bunnyLOD2, bunnyLOD3]);

  const materials = useMemo(
    () => ({
      LOD0: new THREE.MeshStandardMaterial({
        color: "#ff0000", // Red - Highest detail (100%)
        roughness: 0.3,
        metalness: 0.6,
      }),
      LOD1: new THREE.MeshStandardMaterial({
        color: "#00ff00", // Green - High detail (50%)
        roughness: 0.3,
        metalness: 0.6,
      }),
      LOD2: new THREE.MeshStandardMaterial({
        color: "#0000ff", // Blue - Medium detail (25%)
        roughness: 0.3,
        metalness: 0.6,
      }),
      LOD3: new THREE.MeshStandardMaterial({
        color: "#ffff00", // Yellow - Low detail (10%)
        roughness: 0.3,
        metalness: 0.6,
      }),
    }),
    []
  );

  // Note: receiveShadow is a mesh property, not material property
  // InstancedMesh2 handles this at the mesh level

  // Create instanced mesh once
  useEffect(() => {
    if (
      !geometries.LOD0 ||
      !geometries.LOD1 ||
      !geometries.LOD2 ||
      !geometries.LOD3
    )
      return;

    const instancedMesh = new InstancedMesh2(geometries.LOD0, materials.LOD0, {
      capacity: objectCount,
      createEntities: false, // We use dedicated API methods instead
    });

    // Enable shadows for the instanced mesh
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    // Debug: Log shadow configuration
    console.log("🐰 Bunny Zelda Shadow Config:", {
      castShadow: instancedMesh.castShadow,
      receiveShadow: instancedMesh.receiveShadow,
      materialType: materials.LOD0.type,
      materialTransparent: materials.LOD0.transparent,
      allLODsReceiveShadows: Object.values(materials).every(
        (mat) => mat.receiveShadow
      ),
    });

    // Add LOD levels only if enabled
    if (enableLOD) {
      instancedMesh.addLOD(geometries.LOD1, materials.LOD1, lodDistance1);
      instancedMesh.addLOD(geometries.LOD2, materials.LOD2, lodDistance2);
      instancedMesh.addLOD(geometries.LOD3, materials.LOD3, lodDistance3);

      // Add shadow LOD if enabled - use all LOD levels for shadows too
      if (enableShadowLOD) {
        instancedMesh.addShadowLOD(geometries.LOD1, shadowLodDistance1);
        instancedMesh.addShadowLOD(geometries.LOD2, shadowLodDistance2);
        instancedMesh.addShadowLOD(geometries.LOD3, shadowLodDistance3);
      }
    }

    instancedMeshRef.current = instancedMesh;
    setMeshReady(true); // Signal that mesh is ready for rendering

    return () => {
      // Clean up the instanced mesh
      if (instancedMeshRef.current) {
        instancedMeshRef.current.dispose();
        instancedMeshRef.current = null;
      }
      setMeshReady(false); // Signal that mesh is no longer ready
    };
  }, [
    geometries,
    materials,
    lodDistance1,
    lodDistance2,
    lodDistance3,
    enableShadowLOD,
    shadowLodDistance1,
    shadowLodDistance2,
    shadowLodDistance3,
    enableLOD,
  ]);

  // Update LOD levels when distances change
  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const instancedMesh = instancedMeshRef.current;

    // Validate and sort LOD distances to ensure they're strictly increasing
    // InstancedMesh2 requires: d[0] < d[1] < d[2] < ...
    const distances = [lodDistance1, lodDistance2, lodDistance3];
    const sortedDistances = [...distances].sort((a, b) => a - b);

    // Ensure minimum separation between LOD levels to prevent flickering
    const minSeparation = 1;
    const validatedDistances = [
      sortedDistances[0],
      Math.max(sortedDistances[1], sortedDistances[0] + minSeparation),
      Math.max(sortedDistances[2], sortedDistances[1] + minSeparation),
    ];

    // Use the proper InstancedMesh2 API to update LOD distances
    instancedMesh.updateAllLOD(validatedDistances);
  }, [lodDistance1, lodDistance2, lodDistance3]);

  // Force all LOD levels to receive shadows after mesh creation
  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const instancedMesh = instancedMeshRef.current;

    // Access the internal LOD meshes and enable shadow receiving
    if (instancedMesh.children && instancedMesh.children.length > 0) {
      instancedMesh.children.forEach((child: any) => {
        if (child.receiveShadow !== undefined) {
          child.receiveShadow = true;
        }
      });
    }

    // Also try to access LOD levels through the LODinfo if available
    if (instancedMesh.LODinfo && instancedMesh.LODinfo.levels) {
      instancedMesh.LODinfo.levels.forEach((level: any) => {
        if (level.object && level.object.receiveShadow !== undefined) {
          level.object.receiveShadow = true;
        }
      });
    }
  }, [meshReady]);

  // Update shadow LOD when settings change
  useEffect(() => {
    if (!instancedMeshRef.current || !geometries) return;

    const instancedMesh = instancedMeshRef.current;

    if (enableShadowLOD) {
      // Validate and sort shadow LOD distances to ensure they're strictly increasing
      const shadowDistances = [shadowLodDistance1, shadowLodDistance2];
      const sortedShadowDistances = [...shadowDistances].sort((a, b) => a - b);

      // Ensure minimum separation between shadow LOD levels
      const minSeparation = 1;
      const validatedShadowDistances = [
        sortedShadowDistances[0],
        Math.max(
          sortedShadowDistances[1],
          sortedShadowDistances[0] + minSeparation
        ),
      ];

      // Use individual updateShadowLOD calls instead of updateAllShadowLOD
      try {
        instancedMesh.updateShadowLOD(0, validatedShadowDistances[0]);
        instancedMesh.updateShadowLOD(1, validatedShadowDistances[1]);
      } catch (error) {
        console.warn(
          "Shadow LOD update failed, trying to add shadow LODs first:",
          error
        );
        // If update fails, try adding the shadow LODs first
        instancedMesh.addShadowLOD(
          geometries.LOD1,
          validatedShadowDistances[0]
        );
        instancedMesh.addShadowLOD(
          geometries.LOD2,
          validatedShadowDistances[1]
        );
      }
    }
  }, [enableShadowLOD, shadowLodDistance1, shadowLodDistance2, geometries]);

  // Update performance settings when they change
  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const instancedMesh = instancedMeshRef.current;

    // Update BVH setting
    if (enableBVH) {
      instancedMesh.computeBVH({ margin: bvhMargin });
    } else {
      // Clear BVH if disabled
      instancedMesh.disposeBVH();
    }

    // Update sorting setting
    instancedMesh.sortObjects = enableSorting;

    // Update frustum culling settings
    instancedMesh.perObjectFrustumCulled = enableFrustumCulling;
    instancedMesh.raycastOnlyFrustum = raycastOnlyFrustum;
  }, [
    enableBVH,
    bvhMargin,
    enableSorting,
    enableFrustumCulling,
    raycastOnlyFrustum,
  ]);

  // Initialize per-instance uniforms when enabled
  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const instancedMesh = instancedMeshRef.current;

    if (enablePerInstanceUniforms) {
      // Initialize per-instance uniforms
      instancedMesh.initUniformsPerInstance({
        fragment: {
          metalness: "float",
          roughness: "float",
          emissive: "vec3",
        },
      });
    }
  }, [enablePerInstanceUniforms]);

  // Update per-instance properties when controls change
  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const instancedMesh = instancedMeshRef.current;
    const instanceCount = instancedMesh.instancesCount;

    // Use the proper InstancedMesh2 API methods for better performance
    for (let i = 0; i < instanceCount; i++) {
      // Update opacity using the dedicated API method
      if (enablePerInstanceOpacity) {
        const opacity = 0.7 + Math.random() * opacityVariation;
        instancedMesh.setOpacityAt(i, opacity);
      } else {
        instancedMesh.setOpacityAt(i, 1.0);
      }

      // Update visibility using the dedicated API method
      if (enablePerInstanceVisibility) {
        const visible = Math.random() < visibilityChance;
        instancedMesh.setVisibilityAt(i, visible);
      } else {
        instancedMesh.setVisibilityAt(i, true);
      }

      // Update per-instance colors using the dedicated API method
      if (enablePerInstanceColors) {
        const color = new THREE.Color();
        color.setHSL(
          Math.random(), // Random hue
          colorVariation, // Saturation based on variation
          0.5 + Math.random() * 0.5 // Random lightness
        );
        instancedMesh.setColorAt(i, color);
      }

      // Update per-instance uniforms using the dedicated API method
      if (enablePerInstanceUniforms) {
        instancedMesh.setUniformAt(i, "metalness", Math.random());
        instancedMesh.setUniformAt(i, "roughness", Math.random());
        instancedMesh.setUniformAt(
          i,
          "emissive",
          new THREE.Color().setHSL(Math.random(), 1, 0.3)
        );
      }
    }
  }, [
    enablePerInstanceOpacity,
    opacityVariation,
    enablePerInstanceVisibility,
    visibilityChance,
    enablePerInstanceColors,
    colorVariation,
    enablePerInstanceUniforms,
  ]);

  // Update instances when objectCount, spacing, or gridSize changes
  useEffect(() => {
    if (!instancedMeshRef.current || !geometries) return;

    console.log("🔄 Updating LODInstancedBunnyZelda:", {
      objectCount,
      spacing,
      gridSize,
    });

    const instancedMesh = instancedMeshRef.current;
    const count = objectCount;

    // Clear existing instances (if method exists)
    if (typeof instancedMesh.clearInstances === "function") {
      instancedMesh.clearInstances();
    } else {
      console.warn(
        "InstancedMesh2 does not have clearInstances method, recreating mesh..."
      );
      // If clearInstances doesn't exist, we need to recreate the mesh
      const newMesh = new InstancedMesh2(geometries.LOD0, materials.LOD0, {
        capacity: objectCount,
        createEntities: false,
      });
      newMesh.addLOD(geometries.LOD1, materials.LOD1, 10);
      newMesh.addLOD(geometries.LOD2, materials.LOD2, 30);
      newMesh.addLOD(geometries.LOD3, materials.LOD3, 60);

      if (instancedMeshRef.current) {
        instancedMeshRef.current.dispose();
      }
      instancedMeshRef.current = newMesh;
      return;
    }

    // Position instances in a grid using the specified gridSize
    const gridWidth = gridSize;
    const maxInstances = gridWidth * gridWidth; // Maximum instances that fit in grid
    const actualCount = Math.min(count, maxInstances); // Don't exceed grid capacity
    const halfGrid = (gridWidth - 1) * spacing * 0.5;

    console.log(
      `🔄 Grid Layout: ${gridWidth}x${gridWidth} grid, ${actualCount}/${count} instances`
    );

    // Add instances using the proper InstancedMesh2 API
    instancedMesh.addInstances(actualCount, (obj, index) => {
      const x = (index % gridWidth) * spacing - halfGrid;
      const z = Math.floor(index / gridWidth) * spacing - halfGrid;

      // Set position, rotation, and scale - put them on the ground
      obj.position.set(x, 0, z); // Y = 0 to put them on the ground

      // No rotation - keep bunnies upright
      obj.quaternion.set(0, 0, 0, 1); // Identity quaternion (no rotation)
      obj.scale.setScalar(1);

      obj.updateMatrix();
    });

    // Apply per-instance properties using dedicated API methods
    for (let i = 0; i < actualCount; i++) {
      // Set opacity using the dedicated API
      if (enablePerInstanceOpacity) {
        const opacity = 0.7 + Math.random() * opacityVariation;
        instancedMesh.setOpacityAt(i, opacity);
      }

      // Set visibility using the dedicated API
      if (enablePerInstanceVisibility) {
        const visible = Math.random() < visibilityChance;
        instancedMesh.setVisibilityAt(i, visible);
      }

      // Set per-instance colors using the dedicated API
      if (enablePerInstanceColors) {
        const color = new THREE.Color();
        color.setHSL(
          Math.random(), // Random hue
          colorVariation, // Saturation based on variation
          0.5 + Math.random() * 0.5 // Random lightness
        );
        instancedMesh.setColorAt(i, color);
      }

      // Set per-instance uniforms using the dedicated API
      if (enablePerInstanceUniforms) {
        instancedMesh.setUniformAt(i, "metalness", Math.random());
        instancedMesh.setUniformAt(i, "roughness", Math.random());
        instancedMesh.setUniformAt(
          i,
          "emissive",
          new THREE.Color().setHSL(Math.random(), 1, 0.3)
        );
      }
    }

    // Recompute BVH for new instances
    if (enableBVH) {
      instancedMesh.computeBVH({ margin: bvhMargin });
    }
  }, [
    objectCount,
    spacing,
    gridSize,
    lodDistance1,
    lodDistance2,
    lodDistance3,
    enableShadowLOD,
    shadowLodDistance1,
    shadowLodDistance2,
    enablePerInstanceOpacity,
    opacityVariation,
    enablePerInstanceVisibility,
    visibilityChance,
    enableBVH,
    bvhMargin,
    enableSorting,
    geometries,
    materials,
  ]);

  // Animation loop
  useFrame((state, delta) => {
    if (!instancedMeshRef.current || !enableRotation) return;

    const instancedMesh = instancedMeshRef.current;
    const instanceCount = instancedMesh.instancesCount;

    // Rotate all instances using the proper InstancedMesh2 API
    for (let i = 0; i < instanceCount; i++) {
      // Get current matrix
      const matrix = instancedMesh.getMatrixAt(i);

      // Create rotation matrix
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationFromEuler(
        new THREE.Euler(
          delta * rotationSpeed * 0.1,
          delta * rotationSpeed,
          delta * rotationSpeed * 0.05
        )
      );

      // Apply rotation to current matrix
      matrix.multiply(rotationMatrix);

      // Set the updated matrix back
      instancedMesh.setMatrixAt(i, matrix);
    }
  });

  // Cleanup geometries and materials on unmount
  useEffect(() => {
    return () => {
      // Cleanup LOD geometries
      if (geometries) {
        Object.values(geometries).forEach((geo) => {
          if (geo) geo.dispose();
        });
      }
      // Cleanup materials
      Object.values(materials).forEach((mat) => mat.dispose());
    };
  }, [geometries, materials]);

  return meshReady && instancedMeshRef.current ? (
    <primitive object={instancedMeshRef.current} />
  ) : null;
}
