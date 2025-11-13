import React, { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { InstancedMesh2, createRadixSort } from "@three.ez/instanced-mesh";

/**
 * 🌼 YELLOW FLOWER - Performance-optimized flower field using InstancedMesh2
 *
 * Features:
 * - Uses InstancedMesh2 for efficient rendering of many flowers
 * - Single transparent quad image (simpler than trees)
 * - Handles transparency for shadows (alphaTest)
 * - Supports terrain height positioning
 * - Randomization (position, rotation, scale)
 * - BVH for frustum culling
 * - Transparent sorting
 * - Fixed positions and rotations (no camera following)
 */
export const YellowFlower = ({
  count = 100,
  position = [0, 0, 0],
  radius = 50,
  minRadius = 0,
  scaleRange = [0.8, 1.2],
  enabled = true,
  getTerrainHeight,
  enableBVH = true,
  bvhMargin = 0.1,
  castShadow = true,
  receiveShadow = true,
  enableTransparentSorting = true,
  enableViewThickening = true,
  viewThickenPower = 2.0,
  viewThickenStrength = 0.3,
}) => {
  const { scene } = useGLTF("/models/low_poly_flower-transformed.glb");
  const { scene: threeScene, gl } = useThree();
  const instancedMeshRef = useRef(null);
  const materialRef = useRef(null);
  const groupRef = useRef(null);

  // ========== CORE SETUP: Only recreate when essential props change ==========
  useEffect(() => {
    if (!enabled || !scene) return;

    const setupInstancedFlowers = () => {
      console.log("🌼 YELLOW FLOWER - Setting up...");
      console.log(`   Flower count: ${count.toLocaleString()}`);
      console.log(`   Radius: ${minRadius} - ${radius}`);
      console.log(`   Scale range: ${scaleRange[0]} - ${scaleRange[1]}`);

      // ========== STEP 1: Extract mesh from flower model ==========
      let flowerGeometry = null;
      let flowerMaterial = null;

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Clone geometry to avoid modifying original
          flowerGeometry = child.geometry.clone();

          // Apply the mesh's world matrix to the geometry to preserve GLB hierarchy transformations
          child.updateMatrixWorld(true); // Update world matrix
          flowerGeometry.applyMatrix4(child.matrixWorld);

          // Recalculate normals after applying transformation
          flowerGeometry.computeVertexNormals();

          // Update bounding box after transformation
          flowerGeometry.computeBoundingBox();

          flowerMaterial = child.material;
        }
      });

      if (!flowerGeometry || !flowerMaterial) {
        console.error("❌ No mesh found in low_poly_flower-transformed.glb!");
        return;
      }

      console.log(`📦 Found flower mesh`);

      // Calculate complexity
      const vertexCount = flowerGeometry.attributes.position.count;
      const triangles = vertexCount / 3;
      const totalTriangles = triangles * count;
      console.log(
        `✅ Per flower: ${triangles.toFixed(
          0
        )} triangles (${vertexCount} vertices)`
      );
      console.log(
        `   Total for ${count} flowers: ${totalTriangles.toFixed(0)} triangles`
      );

      // ========== STEP 2: Calculate bounding box for terrain positioning ==========
      let flowerBottomOffset = 0;
      if (getTerrainHeight) {
        // Calculate bounding box for the unscaled flower
        const tempGroup = new THREE.Group();
        const tempScene = scene.clone();
        tempGroup.add(tempScene);
        const bbox = new THREE.Box3();
        bbox.setFromObject(tempGroup);
        flowerBottomOffset = bbox.min.y;
        tempGroup.clear();
        console.log(
          `   📐 Flower bottom offset: ${flowerBottomOffset.toFixed(2)}`
        );
      }

      // ========== STEP 3: Pre-generate ALL flower transformation data ==========
      const flowerTransforms = [];

      for (let i = 0; i < count; i++) {
        // Random position in ring (donut shape)
        const angle = Math.random() * Math.PI * 2;
        const distance = minRadius + Math.random() * (radius - minRadius);

        const x = position[0] + Math.cos(angle) * distance;
        const z = position[2] + Math.sin(angle) * distance;

        // Generate random scale and rotation
        const randomScale =
          Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0];
        const randomRotation = Math.random() * Math.PI * 2;

        // Calculate terrain-adjusted Y position
        let finalY = position[1];
        if (getTerrainHeight) {
          const terrainY = getTerrainHeight(x, z);
          const scaledBottomOffset = flowerBottomOffset * randomScale;
          finalY = terrainY - scaledBottomOffset;
        }

        // Store transformation data for this flower
        flowerTransforms.push({
          position: new THREE.Vector3(x, finalY, z),
          scale: randomScale,
          rotation: randomRotation,
        });
      }

      console.log(
        `   ✅ Generated ${flowerTransforms.length.toLocaleString()} flower transforms (positions, scales, rotations)`
      );

      // ========== STEP 4: Create InstancedMesh2 for flower ==========
      console.log(`\n🌼 Creating InstancedMesh2 for flower...`);

      // Clone material to avoid modifying original
      const material = flowerMaterial.clone();
      material.needsUpdate = true;

      // Flowers are always transparent (quad with alpha texture)
      material.transparent = true;
      material.alphaTest = 0.5; // Critical for shadow cutouts!
      material.side = THREE.DoubleSide; // Render both sides of flower
      // Use depthWrite based on alphaTest value
      material.depthWrite = material.alphaTest > 0.8;

      // Ensure material can cast shadows (important for transparent materials)
      // The material itself doesn't have castShadow property, but we ensure it's configured correctly
      if (material.map) {
        material.map.needsUpdate = true;
      }

      // DISABLED: View-space thickening shader effect
      // This was causing flowers to move relative to camera position
      // Flowers should have completely fixed positions and rotations
      // if (enableViewThickening) {
      //   ... shader code removed to prevent any camera-based movement
      // }

      console.log(
        `   🌼 Material: transparent=true, alphaTest=${material.alphaTest}, depthWrite=${material.depthWrite}, side=DoubleSide, viewThickening=${enableViewThickening}`
      );

      const instancedMesh = new InstancedMesh2(flowerGeometry, material, {
        capacity: count,
        createEntities: false,
        renderer: gl,
      });

      // DO NOT set camera reference - flowers should have fixed rotations
      // Camera reference is only needed for LOD, but we want flowers to stay in place
      // Setting camera might cause billboard behavior or rotation updates

      // Configure shadows - CRITICAL for transparent materials
      instancedMesh.castShadow = castShadow;
      instancedMesh.receiveShadow = receiveShadow;

      // Debug shadow configuration
      console.log(
        `   ☀️ Shadows: cast=${castShadow}, receive=${receiveShadow}`
      );
      console.log(
        `   ☀️ Material shadow config: transparent=${material.transparent}, alphaTest=${material.alphaTest}, type=${material.type}`
      );
      console.log(
        `   ☀️ InstancedMesh shadow: castShadow=${instancedMesh.castShadow}, receiveShadow=${instancedMesh.receiveShadow}`
      );

      // Add all flower instances using PRE-GENERATED transformation data
      instancedMesh.addInstances(count, (obj, index) => {
        // Use the PRE-GENERATED transform data
        const transform = flowerTransforms[index];

        // Apply the stored position, scale, and rotation
        obj.position.copy(transform.position);
        obj.scale.setScalar(transform.scale);

        // Use rotateY directly - works with InstancedMesh2
        obj.rotateY(transform.rotation);

        obj.updateMatrix();
      });

      console.log(`   ✅ Added ${count} instances with randomization`);

      // Enable sorting for transparent flowers (can be expensive with many instances)
      if (enableTransparentSorting) {
        console.log("   🌼 Enabling transparent sorting for flowers");
        instancedMesh.sortObjects = true;
        // Enable radix sort for better performance with transparent objects
        instancedMesh.customSort = createRadixSort(instancedMesh);
      } else {
        console.log(
          "   🌼 Transparent sorting DISABLED (performance optimization)"
        );
      }

      // Compute BVH for FAST frustum culling
      if (enableBVH) {
        instancedMesh.computeBVH({ margin: bvhMargin });
      }

      // LOD removed - not needed for flowers (always same geometry)

      // Add to scene
      if (!groupRef.current) {
        groupRef.current = new THREE.Group();
        threeScene.add(groupRef.current);
      }
      groupRef.current.add(instancedMesh);

      // Store references
      instancedMeshRef.current = instancedMesh;
      materialRef.current = material;

      // ========== FINAL STATS ==========
      console.log(`\n✅ Yellow flower ready!`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🌼 Flowers: ${count.toLocaleString()}`);
      console.log(`📊 Draw calls: 1 (single instanced mesh)`);
      console.log(
        `🎯 Frustum Culling: ${enableBVH ? "BVH enabled" : "Disabled"}`
      );
      console.log(`☀️  Shadows: cast=${castShadow}, receive=${receiveShadow}`);
      console.log(
        `🌼 Transparent sorting: ${
          enableTransparentSorting ? "Enabled" : "Disabled"
        }`
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    };

    setupInstancedFlowers();

    // Cleanup
    return () => {
      if (instancedMeshRef.current) {
        if (groupRef.current) {
          groupRef.current.remove(instancedMeshRef.current);
        } else {
          threeScene.remove(instancedMeshRef.current);
        }
        instancedMeshRef.current.dispose();
        instancedMeshRef.current = null;
      }
      materialRef.current = null;
      if (groupRef.current && groupRef.current.children.length === 0) {
        threeScene.remove(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [
    // Only recreate when these essential props change
    scene,
    count,
    position,
    radius,
    minRadius,
    scaleRange,
    enabled,
    getTerrainHeight,
    enableBVH,
    bvhMargin,
    // LOD props removed - not needed for flowers
    threeScene,
    gl,
    // Camera removed - not used to prevent any camera-based movement
    // enableViewThickening, viewThickenPower, viewThickenStrength - removed (thickening disabled)
  ]);

  // ========== MATERIAL UPDATES: Update existing materials without recreating meshes ==========
  useEffect(() => {
    if (!instancedMeshRef.current || !materialRef.current) return;

    // Update transparent sorting
    if (enableTransparentSorting) {
      instancedMeshRef.current.sortObjects = true;
      instancedMeshRef.current.customSort = createRadixSort(
        instancedMeshRef.current
      );
    } else {
      instancedMeshRef.current.sortObjects = false;
      instancedMeshRef.current.customSort = null;
    }

    // Update shadow settings
    instancedMeshRef.current.castShadow = castShadow;
    instancedMeshRef.current.receiveShadow = receiveShadow;

    // Note: View thickening shader code is baked into the material during creation
    // Changing viewThickenPower/Strength would require shader recompilation
    // For now, these changes will require a recreation (acceptable trade-off)
  }, [
    castShadow,
    receiveShadow,
    enableTransparentSorting,
    // Note: viewThickenPower/Strength changes require recreation (shader recompilation)
    // This is acceptable as these are rarely changed
  ]);

  return null;
};

// Preload the model
useGLTF.preload("/models/low_poly_flower-transformed.glb");

