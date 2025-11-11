import React, { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { InstancedMesh2, createRadixSort } from "@three.ez/instanced-mesh";

/**
 * 🌲 INSTANCED PINES - Performance-optimized pine forest using InstancedMesh2
 *
 * Features:
 * - Uses InstancedMesh2 for efficient rendering of many pines
 * - Creates SEPARATE InstancedMesh2 for each mesh (trunk + leaves)
 * - Handles transparency for shadows (alphaTest on leaves)
 * - Supports terrain height positioning
 * - Randomization (position, rotation, scale)
 * - BVH for frustum culling
 * - Transparent sorting for leaves
 * - Optional LOD support
 */
export const InstancedPines = ({
  count = 5,
  position = [0, 0, 0],
  radius = 50,
  minRadius = 0,
  scaleRange = [0.8, 1.2],
  enabled = true,
  getTerrainHeight,
  enableBVH = true,
  bvhMargin = 0.1,
  enableLOD = false,
  lodDistances = [],
  lodGeometries = [],
  lodMaterials = [],
  enableShadowLOD = false,
  shadowLodDistances = [],
  castShadow = true,
  receiveShadow = true,
  enableTransparentSorting = true,
  enableViewThickening = true,
  viewThickenPower = 2.0,
  viewThickenStrength = 0.3,
  aoEnabled = true,
  aoIntensity = 1.0,
  backscatterEnabled = true,
  backscatterIntensity = 0.5,
  backscatterColor = "#ccffb3",
  backscatterPower = 2.0,
  frontScatterStrength = 0.3,
  rimSSSStrength = 0.5,
  lightDirectionX = 1.0,
  lightDirectionY = 1.0,
  lightDirectionZ = 0.5,
}) => {
  const { scene } = useGLTF("/models/pine-transformed.glb");
  const { scene: threeScene, gl, camera } = useThree();
  const instancedMeshesRef = useRef([]);
  const materialsRef = useRef([]);
  const groupRef = useRef(null);

  // Store mesh extraction data separately
  const meshesDataRef = useRef(null);

  // ========== CORE SETUP: Only recreate when essential props change ==========
  useEffect(() => {
    if (!enabled || !scene) return;

    const setupInstancedPines = () => {
      console.log("🌲 INSTANCED PINES - Setting up...");
      console.log(`   Pine count: ${count.toLocaleString()}`);
      console.log(`   Radius: ${minRadius} - ${radius}`);
      console.log(`   Scale range: ${scaleRange[0]} - ${scaleRange[1]}`);

      // ========== STEP 1: Extract ALL meshes from pine model (trunk + leaves) ==========
      const meshes = [];

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Clone geometry to avoid modifying original
          const geometry = child.geometry.clone();

          // Apply Pine.jsx transformations: rotation Math.PI/2 around X axis, then scale 2.0
          // This is 20x the scale of the single Pine component which uses scale={0.1}
          // In React Three Fiber, transformations are applied in order: scale, then rotation
          // But when applying to geometry directly, we need to apply them in reverse order
          // So: rotation first, then scale (which means: scale * rotation when multiplying)
          const rotationMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
          const scaleMatrix = new THREE.Matrix4().makeScale(2.0, 2.0, 2.0);
          // multiplyMatrices(scale, rotation) = scale * rotation = apply rotation first, then scale
          const pineTransform = new THREE.Matrix4().multiplyMatrices(
            scaleMatrix,
            rotationMatrix
          );
          geometry.applyMatrix4(pineTransform);

          // Note: We DON'T apply the world matrix here because the Pine.jsx component
          // applies its own transformations (rotation and scale) directly to the mesh,
          // not inheriting from the GLB hierarchy. The "transformed" GLB is already optimized.

          // Recalculate normals after applying transformation
          geometry.computeVertexNormals();

          // Update bounding box after transformation
          geometry.computeBoundingBox();

          meshes.push({
            geometry: geometry,
            material: child.material,
            name: child.name || `mesh_${meshes.length}`,
          });
        }
      });

      if (meshes.length === 0) {
        console.error("❌ No meshes found in pine-transformed.glb!");
        return;
      }

      console.log(`📦 Found ${meshes.length} meshes (trunk + leaves)`);

      // Calculate total complexity
      let totalTrianglesPerPine = 0;
      meshes.forEach((meshData, idx) => {
        const vertexCount = meshData.geometry.attributes.position.count;
        const triangles = vertexCount / 3;
        totalTrianglesPerPine += triangles;
        console.log(
          `   Mesh ${idx + 1} (${meshData.name}): ${triangles.toFixed(
            0
          )} triangles`
        );
      });

      const totalTriangles = totalTrianglesPerPine * count;
      console.log(
        `✅ Total per pine: ${totalTrianglesPerPine.toFixed(0)} triangles`
      );
      console.log(
        `   Total for ${count} pines: ${totalTriangles.toFixed(0)} triangles`
      );

      // ========== STEP 2: Calculate bounding box for terrain positioning ==========
      // MUST be done BEFORE generating transforms (needed for terrain height adjustment)
      // Calculate bounding box from the original scene (before applying Pine transformations)
      // We'll account for the 2.0 scale when calculating final Y position
      let pineBottomOffset = 0;
      if (getTerrainHeight) {
        // Calculate bounding box for the original pine scene (before 2.0 scale and rotation)
        const tempGroup = new THREE.Group();
        const tempScene = scene.clone();
        tempGroup.add(tempScene);
        const bbox = new THREE.Box3();
        bbox.setFromObject(tempGroup);
        pineBottomOffset = bbox.min.y;
        tempGroup.clear();
        console.log(
          `   📐 Pine bottom offset (original): ${pineBottomOffset.toFixed(2)}`
        );
        console.log(
          `   📐 Pine bottom offset (after 2.0 scale): ${(
            pineBottomOffset * 2.0
          ).toFixed(2)}`
        );
      }

      // ========== STEP 3: Pre-generate ALL pine transformation data ==========
      // CRITICAL: Generate ALL random values ONCE and store them
      // This ensures trunk and leaves use EXACTLY the same transformations
      const pineTransforms = [];

      for (let i = 0; i < count; i++) {
        // Random position in ring (donut shape)
        const angle = Math.random() * Math.PI * 2;
        const distance = minRadius + Math.random() * (radius - minRadius);

        const x = position[0] + Math.cos(angle) * distance;
        const z = position[2] + Math.sin(angle) * distance;

        // Generate random scale and rotation ONCE and store them
        const randomScale =
          Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0];
        const randomRotation = Math.random() * Math.PI * 2;

        // Calculate terrain-adjusted Y position (using pre-calculated pineBottomOffset)
        // Note: The geometry has 2.0 scale baked in, and then we apply randomScale to each instance
        // So the total scale is 2.0 * randomScale
        let finalY = position[1];
        if (getTerrainHeight) {
          const terrainY = getTerrainHeight(x, z);
          const scaledBottomOffset = pineBottomOffset * 2.0 * randomScale;
          finalY = terrainY - scaledBottomOffset;
        }

        // Store ALL transformation data for this pine
        pineTransforms.push({
          position: new THREE.Vector3(x, finalY, z),
          scale: randomScale,
          rotation: randomRotation,
        });
      }

      console.log(
        `   ✅ Generated ${pineTransforms.length.toLocaleString()} pine transforms (positions, scales, rotations)`
      );

      // ========== STEP 4: Create SEPARATE InstancedMesh2 for EACH mesh (trunk + leaves) ==========
      const instancedMeshes = [];

      meshes.forEach((meshData, meshIdx) => {
        console.log(`\n🌲 Creating InstancedMesh2 for ${meshData.name}...`);

        // Clone material to avoid modifying original
        const material = meshData.material.clone();
        material.needsUpdate = true;

        // Check if this is transparent (likely leaves)
        // Only mark as transparent if it's explicitly transparent or has low opacity
        // Don't check material.map - that would mark all textured materials as transparent!
        const isTransparent =
          material.transparent === true ||
          (material.opacity !== undefined && material.opacity < 0.99);

        // Apply custom transparency settings to leaves (like InstancedMesh2Trees)
        if (isTransparent) {
          material.transparent = true;
          material.alphaTest = 0.1; // Lower threshold for better distance visibility (was 0.5)
          material.side = THREE.DoubleSide; // Render both sides of leaves
          // Use depthWrite based on alphaTest value (like InstancedMesh2Trees)
          // If alphaTest is high (>0.8), we can use depthWrite for better performance
          material.depthWrite = material.alphaTest > 0.8;

          console.log(
            `   🍃 Leaves material: transparent=true, alphaTest=${material.alphaTest}, depthWrite=${material.depthWrite}, side=DoubleSide, viewThickening=${enableViewThickening}`
          );
        }

        // Calculate bounding box for AO height calculation
        meshData.geometry.computeBoundingBox();
        const bbox = meshData.geometry.boundingBox;
        const treeHeight = bbox.max.y - bbox.min.y;
        const treeMinY = bbox.min.y;

        // Apply shader effects to ALL materials (both trunk and leaves)
        material.onBeforeCompile = (shader) => {
          // Add AO uniforms
          shader.uniforms.uAoEnabled = { value: aoEnabled };
          shader.uniforms.uAoIntensity = { value: aoIntensity };

          // Add SSS uniforms
          const backscatterColorObj = new THREE.Color(backscatterColor);
          shader.uniforms.uBackscatterEnabled = { value: backscatterEnabled };
          shader.uniforms.uBackscatterIntensity = {
            value: backscatterIntensity,
          };
          shader.uniforms.uBackscatterColor = { value: backscatterColorObj };
          shader.uniforms.uBackscatterPower = { value: backscatterPower };
          shader.uniforms.uFrontScatterStrength = {
            value: frontScatterStrength,
          };
          shader.uniforms.uRimSSSStrength = { value: rimSSSStrength };
          shader.uniforms.uLightDirection = {
            value: new THREE.Vector3(
              lightDirectionX,
              lightDirectionY,
              lightDirectionZ
            ),
          };

          // Add varying for heightPercent and distance (for AO and distance-based alpha test)
          shader.vertexShader = shader.vertexShader.replace(
            "#include <common>",
            `
            #include <common>
            varying float vTreeHeightPercent;
            varying float vDistance;
            `
          );

          // Calculate heightPercent and distance in vertex shader (for AO and distance-based alpha test)
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
            #include <begin_vertex>
            
            // Calculate heightPercent for AO: 0 = base, 1 = top
            float heightPercent = clamp((position.y - ${treeMinY.toFixed(
              4
            )}) / ${treeHeight.toFixed(4)}, 0.0, 1.0);
            vTreeHeightPercent = heightPercent;
            
            // Calculate distance from camera for distance-based alpha test
            // Get instance world position (for instanced meshes)
            vec3 instanceLocalPos = vec3(instanceMatrix[3].xyz);
            vec4 instancePosWorld = modelMatrix * vec4(instanceLocalPos, 1.0);
            vec3 instanceWorldPos = instancePosWorld.xyz;
            
            // Get camera position in world space
            vec3 camPos = (inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            
            // Calculate distance from camera
            vDistance = length(camPos - instanceWorldPos);
            `
          );

          // Apply view-space thickening for leaves (if enabled)
          if (isTransparent && enableViewThickening) {
            shader.vertexShader = shader.vertexShader.replace(
              /#include <begin_vertex>[\s\S]*?vDistance = length\(camPos - instanceWorldPos\);/,
              `
              #include <begin_vertex>
              
              // Calculate heightPercent for AO: 0 = base, 1 = top
              float heightPercent = clamp((position.y - ${treeMinY.toFixed(
                4
              )}) / ${treeHeight.toFixed(4)}, 0.0, 1.0);
              vTreeHeightPercent = heightPercent;
              
              // Calculate distance from camera for distance-based alpha test
              // Get instance world position (for instanced meshes)
              vec3 instanceLocalPos = vec3(instanceMatrix[3].xyz);
              vec4 instancePosWorld = modelMatrix * vec4(instanceLocalPos, 1.0);
              vec3 instanceWorldPos = instancePosWorld.xyz;
              
              // Get camera position in world space
              vec3 camPos = (inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
              
              // Calculate distance from camera
              vDistance = length(camPos - instanceWorldPos);
              
              // View-space thickening: Prevents leaves from disappearing when viewed edge-on
              // Get view direction from camera to leaf
              vec3 viewDir = normalize(camPos - instanceWorldPos);
              
              // Calculate vertex normal in world space
              vec3 worldNormal = normalize(normalMatrix * objectNormal);
              
              // Calculate how edge-on we're viewing the leaf
              float viewDotNormal = abs(dot(viewDir, worldNormal));
              
              // Thickening factor: high when edge-on (low dot), low when facing camera
              float thickenFactor = pow(1.0 - viewDotNormal, ${viewThickenPower.toFixed(
                1
              )});
              
              // Apply smoothing to avoid visual artifacts
              thickenFactor *= smoothstep(0.0, 0.3, viewDotNormal);
              
              // Apply thickening by pushing vertices outward along the normal
              // Use a small offset based on the model's scale
              vec3 offset = worldNormal * thickenFactor * ${viewThickenStrength.toFixed(
                2
              )} * 0.5;
              transformed += offset;
              `
            );
          }

          // Apply AO and SSS in fragment shader
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <common>",
            `
            #include <common>
            varying float vTreeHeightPercent;
            varying float vDistance;
            uniform bool uAoEnabled;
            uniform float uAoIntensity;
            uniform bool uBackscatterEnabled;
            uniform float uBackscatterIntensity;
            uniform vec3 uBackscatterColor;
            uniform float uBackscatterPower;
            uniform float uFrontScatterStrength;
            uniform float uRimSSSStrength;
            uniform vec3 uLightDirection;
            `
          );

          // Apply AO calculation and distance-based alpha test before color fragment
          // Only apply distance-based alpha test for transparent materials
          let fragmentCode = `
            #include <color_fragment>
            
            // Ambient Occlusion: darker at base, brighter at top
            if (uAoEnabled) {
              // AO factor: 0.25 at base, 1.0 at top (smooth gradient)
              float ao = mix(0.25, 1.0, pow(vTreeHeightPercent, 2.0));
              diffuseColor.rgb *= ao * uAoIntensity;
            }
            `;

          // Add distance-based alpha test only for transparent materials (leaves)
          if (isTransparent) {
            fragmentCode = `
            #include <color_fragment>
            
            // Distance-based alpha test: lower threshold at distance to prevent transparency issues
            // Base alphaTest is 0.1, but we make it more permissive at distance
            // At distance > 50 units, gradually reduce threshold to 0.0
            float distanceAlphaTest = 0.1;
            if (vDistance > 50.0) {
              // Smoothly reduce alphaTest threshold from 0.1 to 0.0 as distance increases from 50 to 200
              float distanceFactor = clamp((vDistance - 50.0) / 150.0, 0.0, 1.0);
              distanceAlphaTest = mix(0.1, 0.0, distanceFactor);
            }
            
            // Apply distance-based alpha test (replace standard alphaTest)
            if (diffuseColor.a < distanceAlphaTest) {
              discard;
            }
            
            // Ambient Occlusion: darker at base, brighter at top
            if (uAoEnabled) {
              // AO factor: 0.25 at base, 1.0 at top (smooth gradient)
              float ao = mix(0.25, 1.0, pow(vTreeHeightPercent, 2.0));
              diffuseColor.rgb *= ao * uAoIntensity;
            }
            `;
          }

          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            fragmentCode
          );

          // Apply SSS after lights are calculated
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <lights_fragment_end>",
            `
            #include <lights_fragment_end>
            
            // Subsurface Scattering: translucency effect for leaves
            if (uBackscatterEnabled) {
              // Calculate view direction (from Three.js shader chunks)
              vec3 viewDir = normalize(-vViewPosition);
              
              // Normalize light direction
              vec3 lightDir = normalize(uLightDirection);
              
              // Calculate backscatter - light coming through from behind
              float backScatter = max(dot(-lightDir, normal), 0.0);
              float frontScatter = max(dot(lightDir, normal), 0.0);
              
              // Rim lighting for edges (translucency effect)
              float rim = 1.0 - max(dot(normal, viewDir), 0.0);
              rim = pow(rim, 1.5);
              
              // Tree thickness factor (thicker at base, thinner at top)
              float treeThickness = (1.0 - vTreeHeightPercent) * 0.8 + 0.2;
              
              // Enhanced SSS calculation with multiple scattering layers
              float sssBack = pow(backScatter, uBackscatterPower) * treeThickness;
              float sssFront = pow(frontScatter, 1.5) * treeThickness * uFrontScatterStrength;
              float rimSSS = pow(rim, 2.0) * treeThickness * uRimSSSStrength;
              
              // Combine all subsurface scattering contributions
              float totalSSS = sssBack + sssFront + rimSSS;
              totalSSS = clamp(totalSSS, 0.0, 1.0);
              
              // Backscatter color (warm, slightly green-tinted for tree translucency)
              vec3 backscatterColor = uBackscatterColor * 0.4;
              
              // Apply backscatter to diffuse lighting
              vec3 backscatterContribution = backscatterColor * totalSSS * uBackscatterIntensity;
              reflectedLight.directDiffuse += backscatterContribution;
            }
            `
          );

          // Store shader reference for uniform updates
          material.userData.shader = shader;
        };

        const instancedMesh = new InstancedMesh2(meshData.geometry, material, {
          capacity: count,
          createEntities: false,
          renderer: gl,
        });

        // Set camera reference for LOD updates
        instancedMesh.camera = camera;

        // Configure shadows (can be expensive - make optional)
        instancedMesh.castShadow = castShadow;
        instancedMesh.receiveShadow = receiveShadow;
        console.log(
          `   ☀️ Shadows: cast=${castShadow}, receive=${receiveShadow}`
        );

        // Add all pine instances using PRE-GENERATED transformation data
        // CRITICAL: Both trunk and leaves use the SAME stored transformations
        // This ensures perfect synchronization - no desync issues!
        instancedMesh.addInstances(count, (obj, index) => {
          // Use the PRE-GENERATED transform data (same for trunk and leaves)
          const transform = pineTransforms[index];

          // Apply the stored position, scale, and rotation
          obj.position.copy(transform.position);
          obj.scale.setScalar(transform.scale);

          // Use rotateY directly (like OctahedralForest) - works with InstancedMesh2
          obj.rotateY(transform.rotation);

          obj.updateMatrix();
        });

        console.log(`   ✅ Added ${count} instances with randomization`);

        // Enable sorting for transparent leaves (can be expensive with many instances)
        if (isTransparent && enableTransparentSorting) {
          console.log("   🍃 Enabling transparent sorting for leaves");
          instancedMesh.sortObjects = true;
          // Enable radix sort for better performance with transparent objects
          instancedMesh.customSort = createRadixSort(instancedMesh);
        } else if (isTransparent && !enableTransparentSorting) {
          console.log(
            "   🍃 Transparent sorting DISABLED (performance optimization)"
          );
        }

        // Compute BVH for FAST frustum culling
        if (enableBVH) {
          instancedMesh.computeBVH({ margin: bvhMargin });
        }

        // Add LOD levels if enabled (simplified geometry for each mesh)
        if (enableLOD && lodGeometries.length > 0) {
          console.log(`   🔧 Adding ${lodGeometries.length} LOD level(s)...`);
          lodGeometries.forEach((lodGeo, index) => {
            if (lodGeo && lodMaterials && lodMaterials[index]) {
              const lodDist = lodDistances[index] || 50 * (index + 1);
              instancedMesh.addLOD(lodGeo, lodMaterials[index], lodDist);
              console.log(`      ✅ LOD ${index + 1} added at ${lodDist}m`);
            }
          });
        }

        // Add SHADOW LOD for better shadow performance!
        if (enableShadowLOD && lodGeometries.length > 0) {
          console.log("   ☀️ Adding Shadow LOD levels...");
          lodGeometries.forEach((lodGeo, index) => {
            if (lodGeo) {
              const shadowDist = shadowLodDistances[index] || 50 * (index + 1);
              instancedMesh.addShadowLOD(lodGeo, shadowDist);
              console.log(
                `      ✅ Shadow LOD ${index + 1} added at ${shadowDist}m`
              );
            }
          });
        }

        // Add to scene
        if (!groupRef.current) {
          groupRef.current = new THREE.Group();
          threeScene.add(groupRef.current);
        }
        groupRef.current.add(instancedMesh);
        instancedMeshes.push(instancedMesh);
      });

      // ========== FINAL STATS ==========
      console.log(`\n✅ All ${meshes.length} pine meshes ready!`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🌲 Pines: ${count.toLocaleString()}`);
      console.log(`📊 Draw calls: ${meshes.length} (one per mesh type)`);
      console.log(
        `🎯 Frustum Culling: ${enableBVH ? "BVH enabled" : "Disabled"}`
      );
      console.log(`📊 LOD System: ${enableLOD ? "Enabled" : "Disabled"}`);
      console.log(`☀️  Shadows: cast=${castShadow}, receive=${receiveShadow}`);
      console.log(
        `☀️  Shadow LOD: ${enableShadowLOD ? "Enabled" : "Disabled"}`
      );
      console.log(
        `🍃 Transparent sorting: ${
          enableTransparentSorting ? "Enabled" : "Disabled"
        } for leaves`
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Store mesh data for later updates
      meshesDataRef.current = meshes;
      instancedMeshesRef.current = instancedMeshes;
      materialsRef.current = instancedMeshes.map((mesh) => mesh.material);
    };

    setupInstancedPines();

    // Cleanup
    return () => {
      instancedMeshesRef.current.forEach((mesh) => {
        if (groupRef.current) {
          groupRef.current.remove(mesh);
        } else {
          threeScene.remove(mesh);
        }
        mesh.dispose();
      });
      instancedMeshesRef.current = [];
      materialsRef.current = [];
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
    enableLOD,
    lodDistances,
    lodGeometries,
    lodMaterials,
    enableShadowLOD,
    shadowLodDistances,
    enableViewThickening,
    viewThickenPower,
    viewThickenStrength,
    aoEnabled,
    aoIntensity,
    backscatterEnabled,
    backscatterIntensity,
    backscatterColor,
    backscatterPower,
    frontScatterStrength,
    rimSSSStrength,
    lightDirectionX,
    lightDirectionY,
    lightDirectionZ,
    threeScene,
    gl,
    camera,
  ]);

  // ========== MATERIAL UPDATES: Update existing materials without recreating meshes ==========
  useEffect(() => {
    if (!instancedMeshesRef.current.length || !materialsRef.current.length)
      return;

    // Update material properties without recreating meshes
    materialsRef.current.forEach((material, index) => {
      if (!material) return;

      // Check if material is transparent (leaves)
      const isTransparent =
        material.transparent === true ||
        (material.opacity !== undefined && material.opacity < 0.99);

      if (isTransparent) {
        // Update transparent sorting
        const instancedMesh = instancedMeshesRef.current[index];
        if (instancedMesh) {
          if (enableTransparentSorting) {
            instancedMesh.sortObjects = true;
            instancedMesh.customSort = createRadixSort(instancedMesh);
          } else {
            instancedMesh.sortObjects = false;
            instancedMesh.customSort = null;
          }
        }

        // Note: View thickening shader code is baked into the material during creation
        // Changing viewThickenPower/Strength would require shader recompilation
        // For now, these changes will require a recreation (acceptable trade-off)
        // The shader is compiled once with the values at creation time
      }

      // Update shadow settings
      const instancedMesh = instancedMeshesRef.current[index];
      if (instancedMesh) {
        instancedMesh.castShadow = castShadow;
        instancedMesh.receiveShadow = receiveShadow;
      }

      // Update AO uniforms (if shader exists)
      if (material.userData?.shader) {
        const shader = material.userData.shader;
        if (shader.uniforms.uAoEnabled) {
          shader.uniforms.uAoEnabled.value = aoEnabled;
        }
        if (shader.uniforms.uAoIntensity) {
          shader.uniforms.uAoIntensity.value = aoIntensity;
        }

        // Update SSS uniforms
        if (shader.uniforms.uBackscatterEnabled) {
          shader.uniforms.uBackscatterEnabled.value = backscatterEnabled;
        }
        if (shader.uniforms.uBackscatterIntensity) {
          shader.uniforms.uBackscatterIntensity.value = backscatterIntensity;
        }
        if (shader.uniforms.uBackscatterColor) {
          shader.uniforms.uBackscatterColor.value.set(backscatterColor);
        }
        if (shader.uniforms.uBackscatterPower) {
          shader.uniforms.uBackscatterPower.value = backscatterPower;
        }
        if (shader.uniforms.uFrontScatterStrength) {
          shader.uniforms.uFrontScatterStrength.value = frontScatterStrength;
        }
        if (shader.uniforms.uRimSSSStrength) {
          shader.uniforms.uRimSSSStrength.value = rimSSSStrength;
        }
        if (shader.uniforms.uLightDirection) {
          shader.uniforms.uLightDirection.value.set(
            lightDirectionX,
            lightDirectionY,
            lightDirectionZ
          );
        }
      }
    });
  }, [
    castShadow,
    receiveShadow,
    enableTransparentSorting,
    aoEnabled,
    aoIntensity,
    backscatterEnabled,
    backscatterIntensity,
    backscatterColor,
    backscatterPower,
    frontScatterStrength,
    rimSSSStrength,
    lightDirectionX,
    lightDirectionY,
    lightDirectionZ,
    // Note: viewThickenPower/Strength changes require recreation (shader recompilation)
    // This is acceptable as these are rarely changed
  ]);

  return null;
};

// Preload the model
useGLTF.preload("/models/pine-transformed.glb");
