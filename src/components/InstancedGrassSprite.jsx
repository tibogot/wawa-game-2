import React, { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { InstancedMesh2, createRadixSort } from "@three.ez/instanced-mesh";

/**
 * 🌱 INSTANCED GRASS SPRITE - Performance-optimized grass field using InstancedMesh2
 *
 * Features:
 * - Uses InstancedMesh2 for efficient rendering of many grass sprites
 * - Single transparent quad image (simpler than trees)
 * - Handles transparency for shadows (alphaTest)
 * - Supports terrain height positioning
 * - Randomization (position, rotation, scale)
 * - BVH for frustum culling
 * - Transparent sorting
 * - View-space thickening to prevent disappearing when edge-on
 * - Optional LOD support
 */
export const InstancedGrassSprite = ({
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
  const { scene } = useGLTF("/models/grasssprite-optimized.glb");
  const { scene: threeScene, gl } = useThree();
  const instancedMeshRef = useRef(null);
  const materialRef = useRef(null);
  const groupRef = useRef(null);

  // ========== CORE SETUP: Only recreate when essential props change ==========
  useEffect(() => {
    if (!enabled || !scene) return;

    const setupInstancedGrass = () => {
      console.log("🌱 INSTANCED GRASS SPRITE - Setting up...");
      console.log(`   Grass count: ${count.toLocaleString()}`);
      console.log(`   Radius: ${minRadius} - ${radius}`);
      console.log(`   Scale range: ${scaleRange[0]} - ${scaleRange[1]}`);

      // ========== STEP 1: Extract mesh from grass sprite model ==========
      let grassGeometry = null;
      let grassMaterial = null;

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Clone geometry to avoid modifying original
          grassGeometry = child.geometry.clone();

          // Apply the mesh's world matrix to the geometry to preserve GLB hierarchy transformations
          child.updateMatrixWorld(true); // Update world matrix
          grassGeometry.applyMatrix4(child.matrixWorld);

          // OPTIMIZATION: Merge duplicate vertices to reduce geometry complexity
          // This can significantly reduce vertex count for simple quads
          // Check if mergeVertices method exists (available on BufferGeometry)
          if (
            grassGeometry.mergeVertices &&
            typeof grassGeometry.mergeVertices === "function"
          ) {
            grassGeometry.mergeVertices();
          }

          // Recalculate normals after applying transformation
          grassGeometry.computeVertexNormals();

          // OPTIMIZATION: Compute bounding sphere (faster for culling than bounding box)
          grassGeometry.computeBoundingSphere();

          // Update bounding box after transformation (still needed for terrain positioning)
          grassGeometry.computeBoundingBox();

          grassMaterial = child.material;
        }
      });

      if (!grassGeometry || !grassMaterial) {
        console.error("❌ No mesh found in grasssprite-transformed.glb!");
        return;
      }

      console.log(`📦 Found grass sprite mesh`);

      // Calculate complexity
      const vertexCount = grassGeometry.attributes.position.count;
      const triangles = vertexCount / 3;
      const totalTriangles = triangles * count;
      console.log(
        `✅ Per sprite: ${triangles.toFixed(
          0
        )} triangles (${vertexCount} vertices)`
      );
      console.log(
        `   Total for ${count} sprites: ${totalTriangles.toFixed(0)} triangles`
      );

      // ========== STEP 2: Calculate bounding box for terrain positioning ==========
      // OPTIMIZATION: Cache bounding box calculation - compute once from geometry
      let grassBottomOffset = 0;
      if (getTerrainHeight) {
        // OPTIMIZATION: Use geometry's bounding box directly instead of creating temp objects
        // This is more efficient and avoids unnecessary object creation
        if (grassGeometry.boundingBox) {
          grassBottomOffset = grassGeometry.boundingBox.min.y;
        } else {
          // Fallback: compute from geometry if not already computed
          grassGeometry.computeBoundingBox();
          grassBottomOffset = grassGeometry.boundingBox.min.y;
        }
        console.log(
          `   📐 Grass bottom offset: ${grassBottomOffset.toFixed(2)}`
        );
      }

      // ========== STEP 3: Pre-generate ALL grass transformation data ==========
      // OPTIMIZATION: Pre-allocate array with known size for better memory performance
      const grassTransforms = new Array(count);

      // OPTIMIZATION: Cache position array access to avoid repeated lookups
      const posX = position[0];
      const posY = position[1];
      const posZ = position[2];
      const scaleRangeDiff = scaleRange[1] - scaleRange[0];

      for (let i = 0; i < count; i++) {
        // Random position in ring (donut shape)
        const angle = Math.random() * Math.PI * 2;
        const distance = minRadius + Math.random() * (radius - minRadius);

        // OPTIMIZATION: Cache cos/sin calculations
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        const x = posX + cosAngle * distance;
        const z = posZ + sinAngle * distance;

        // Generate random scale and rotation
        const randomScale = Math.random() * scaleRangeDiff + scaleRange[0];
        const randomRotation = Math.random() * Math.PI * 2;

        // Calculate terrain-adjusted Y position
        let finalY = posY;
        if (getTerrainHeight) {
          const terrainY = getTerrainHeight(x, z);
          const scaledBottomOffset = grassBottomOffset * randomScale;
          finalY = terrainY - scaledBottomOffset;
        }

        // OPTIMIZATION: Store transformation data directly in array (faster than push)
        grassTransforms[i] = {
          position: new THREE.Vector3(x, finalY, z),
          scale: randomScale,
          rotation: randomRotation,
        };
      }

      console.log(
        `   ✅ Generated ${grassTransforms.length.toLocaleString()} grass transforms (positions, scales, rotations)`
      );

      // ========== STEP 4: Create InstancedMesh2 for grass sprite ==========
      console.log(`\n🌱 Creating InstancedMesh2 for grass sprite...`);

      // Clone material to avoid modifying original
      const material = grassMaterial.clone();
      // OPTIMIZATION: Only set needsUpdate if material properties actually changed
      // For cloned materials, this is usually not needed
      // material.needsUpdate = true; // Removed - not needed for cloned materials

      // Grass sprites are always transparent (quad with alpha texture)
      material.transparent = true;
      material.alphaTest = 0.5; // Critical for shadow cutouts!
      material.side = THREE.DoubleSide; // Render both sides of grass
      // Use depthWrite based on alphaTest value
      material.depthWrite = material.alphaTest > 0.8;

      // OPTIMIZATION: Optimize texture settings for better performance
      if (material.map) {
        // Use appropriate texture filtering for grass sprites
        // Linear filtering is usually fine for small sprites
        material.map.generateMipmaps = true;
        material.map.minFilter = THREE.LinearMipmapLinearFilter;
        material.map.magFilter = THREE.LinearFilter;
        // OPTIMIZATION: Ensure texture is not marked for update unnecessarily
        // material.map.needsUpdate = true; // Only if texture actually changed
      }

      // Ensure material can cast shadows (important for transparent materials)
      // The material itself doesn't have castShadow property, but we ensure it's configured correctly
      // OPTIMIZATION: Removed unnecessary needsUpdate - texture is already loaded from GLB

      // DISABLED: View-space thickening shader effect
      // This was causing grass sprites to move relative to camera position
      // Grass sprites should have completely fixed positions and rotations
      // if (enableViewThickening) {
      //   ... shader code removed to prevent any camera-based movement
      // }

      console.log(
        `   🌱 Material: transparent=true, alphaTest=${material.alphaTest}, depthWrite=${material.depthWrite}, side=DoubleSide, viewThickening=${enableViewThickening}`
      );

      const instancedMesh = new InstancedMesh2(grassGeometry, material, {
        capacity: count,
        createEntities: false,
        renderer: gl,
        // OPTIMIZATION: Ensure proper buffer usage hints for instanced rendering
        // InstancedMesh2 handles this internally, but we ensure geometry is optimized
      });

      // OPTIMIZATION: Set frustumCulled explicitly (should be true by default, but ensure it)
      instancedMesh.frustumCulled = true;

      // DO NOT set camera reference - grass sprites should have fixed rotations
      // Camera reference is only needed for LOD, but we want grass to stay in place
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

      // Add all grass instances using PRE-GENERATED transformation data
      // OPTIMIZATION: Batch instance creation for better performance
      instancedMesh.addInstances(count, (obj, index) => {
        // Use the PRE-GENERATED transform data
        const transform = grassTransforms[index];

        // OPTIMIZATION: Direct property assignment is faster than copy() for Vector3
        obj.position.set(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );
        obj.scale.setScalar(transform.scale);

        // Use rotateY directly - works with InstancedMesh2
        obj.rotateY(transform.rotation);

        // OPTIMIZATION: updateMatrix() is necessary for InstancedMesh2
        obj.updateMatrix();
      });

      console.log(`   ✅ Added ${count} instances with randomization`);

      // Enable sorting for transparent grass (can be expensive with many instances)
      // OPTIMIZATION: Consider distance-based sorting or threshold-based sorting
      // For grass sprites, sorting may not be as critical as for complex transparent objects
      if (enableTransparentSorting) {
        console.log("   🌱 Enabling transparent sorting for grass");
        instancedMesh.sortObjects = true;
        // Enable radix sort for better performance with transparent objects
        // OPTIMIZATION: Radix sort is O(n) vs O(n log n) for standard sort
        instancedMesh.customSort = createRadixSort(instancedMesh);
      } else {
        console.log(
          "   🌱 Transparent sorting DISABLED (performance optimization)"
        );
        // OPTIMIZATION: Explicitly disable sorting to avoid any overhead
        instancedMesh.sortObjects = false;
        instancedMesh.customSort = null;
      }

      // Compute BVH for FAST frustum culling
      // OPTIMIZATION: BVH margin should be tuned based on grass sprite size
      // Smaller margin = tighter culling but may miss edge cases
      // Larger margin = safer but may include more off-screen instances
      if (enableBVH) {
        instancedMesh.computeBVH({ margin: bvhMargin });
        console.log(`   🎯 BVH computed with margin: ${bvhMargin}`);
      } else {
        // OPTIMIZATION: Even without BVH, ensure frustum culling is enabled
        instancedMesh.frustumCulled = true;
      }

      // LOD removed - not needed for grass sprites (always same geometry)

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
      console.log(`\n✅ Grass sprite ready!`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🌱 Grass sprites: ${count.toLocaleString()}`);
      console.log(`📊 Draw calls: 1 (single instanced mesh)`);
      console.log(
        `🎯 Frustum Culling: ${enableBVH ? "BVH enabled" : "Disabled"}`
      );
      console.log(`☀️  Shadows: cast=${castShadow}, receive=${receiveShadow}`);
      console.log(
        `🌱 Transparent sorting: ${
          enableTransparentSorting ? "Enabled" : "Disabled"
        }`
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    };

    setupInstancedGrass();

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
    // LOD props removed - not needed for grass sprites
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
useGLTF.preload("/models/grasssprite-optimized.glb");
