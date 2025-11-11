import React, { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { InstancedMesh2, createRadixSort } from "@three.ez/instanced-mesh";

/**
 * 🌲 INSTANCED BILLBOARD TREES - Performance-optimized billboard tree forest using InstancedMesh2
 *
 * Features:
 * - Uses InstancedMesh2 for efficient rendering of many billboard trees
 * - Creates SEPARATE InstancedMesh2 for each mesh (trunk + leaves)
 * - Handles transparency for shadows (alphaTest on leaves)
 * - Supports terrain height positioning
 * - Randomization (position, rotation, scale)
 * - BVH for frustum culling
 * - Transparent sorting for leaves
 * - Optional LOD support
 */
export const InstancedBillboardTrees = ({
  count = 5,
  position = [0, 0, 0],
  radius = 50,
  minRadius = 0,
  scaleRange = [0.8, 1.2],
  enabled = true,
  getTerrainHeight,
  yOffset = 0,
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
  backscatterEnabled = false,
  backscatterIntensity = 0.5,
  backscatterColor = "#ccffb3",
  backscatterPower = 2.0,
  frontScatterStrength = 0.3,
  rimSSSStrength = 0.5,
  lightDirectionX = 1.0,
  lightDirectionY = 1.0,
  lightDirectionZ = 0.5,
  alphaTest = 0.1,
  premultiplyAlpha = true,
  edgeBleedCompensation = 1.0,
  enableDistanceAlphaTest = true,
  distanceAlphaStart = 50.0,
  distanceAlphaEnd = 200.0,
  enableRotation = true,
  rotationDampingDistance = 10.0,
  rotationStopDistance = 5.0,
  rotationThreshold = 0.05,
  rotationSmoothing = 0.15,
}) => {
  const { scene } = useGLTF("/models/treebillboard-transformed.glb");
  const { scene: threeScene, gl, camera } = useThree();
  const instancedMeshesRef = useRef([]);
  const materialsRef = useRef([]);
  const groupRef = useRef(null);

  // Store mesh extraction data separately
  const meshesDataRef = useRef(null);

  // Store instance positions for billboard rotation (need to update to face camera)
  const instancePositionsRef = useRef([]);

  // Store original scales for each instance (CRITICAL: prevents drift from matrix decomposition)
  const instanceScalesRef = useRef([]);

  // Store previous rotation angles for each instance (for smoothing and threshold)
  const previousRotationsRef = useRef([]);

  // ========== CORE SETUP: Only recreate when essential props change ==========
  useEffect(() => {
    if (!enabled || !scene) return;

    const setupInstancedTrees = () => {
      console.log("🌲 INSTANCED BILLBOARD TREES - Setting up...");
      console.log(`   Tree count: ${count.toLocaleString()}`);
      console.log(`   Radius: ${minRadius} - ${radius}`);
      console.log(`   Scale range: ${scaleRange[0]} - ${scaleRange[1]}`);

      // ========== STEP 1: Calculate bounding box for terrain positioning ==========
      // MUST be done BEFORE extracting meshes (needed for terrain height adjustment)
      // Use the same logic as InstancedTrees - calculate bottom offset without scale first
      let treeBottomOffset = 0;
      if (getTerrainHeight) {
        // Calculate bounding box for the unscaled tree (like InstancedTrees component)
        const tempGroup = new THREE.Group();
        const tempScene = scene.clone();
        tempGroup.add(tempScene);
        const bbox = new THREE.Box3();
        bbox.setFromObject(tempGroup);
        treeBottomOffset = bbox.min.y;
        tempGroup.clear();
        console.log(
          `   📐 Billboard tree bottom offset: ${treeBottomOffset.toFixed(2)}`
        );
      }

      // ========== STEP 2: Extract ALL meshes from tree model (trunk + leaves) ==========
      const meshes = [];

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Clone geometry to avoid modifying original
          const geometry = child.geometry.clone();

          // Apply the mesh's world matrix to the geometry to preserve GLB hierarchy transformations
          // This ensures the tree is oriented correctly (vertical trunk, leaves on branches)
          child.updateMatrixWorld(true); // Update world matrix
          geometry.applyMatrix4(child.matrixWorld);

          // Recalculate normals after applying transformation
          geometry.computeVertexNormals();

          // Update bounding box after transformation
          geometry.computeBoundingBox();

          // CRITICAL: Center geometry in X/Z plane so rotation happens around center
          // This prevents X-axis shifting when rotating billboards
          // Keep Y as-is (base should stay at bottom for terrain placement)
          const bbox = geometry.boundingBox;
          if (bbox) {
            const centerX = (bbox.min.x + bbox.max.x) / 2;
            const centerZ = (bbox.min.z + bbox.max.z) / 2;
            // Translate geometry so center is at (0, Y, 0) - center X/Z at origin
            if (Math.abs(centerX) > 0.001 || Math.abs(centerZ) > 0.001) {
              geometry.translate(-centerX, 0, -centerZ);
              geometry.computeBoundingBox(); // Recompute after translation
              console.log(
                `   📐 Centered ${
                  child.name || `mesh_${meshes.length}`
                } geometry: X=${centerX.toFixed(2)}, Z=${centerZ.toFixed(2)}`
              );
            }
          }

          meshes.push({
            geometry: geometry,
            material: child.material,
            name: child.name || `mesh_${meshes.length}`,
          });
        }
      });

      if (meshes.length === 0) {
        console.error("❌ No meshes found in treebillboard-transformed.glb!");
        return;
      }

      console.log(`📦 Found ${meshes.length} meshes (trunk + leaves)`);

      // Calculate total complexity
      let totalTrianglesPerTree = 0;
      meshes.forEach((meshData, idx) => {
        const vertexCount = meshData.geometry.attributes.position.count;
        const triangles = vertexCount / 3;
        totalTrianglesPerTree += triangles;
        console.log(
          `   Mesh ${idx + 1} (${meshData.name}): ${triangles.toFixed(
            0
          )} triangles`
        );
      });

      const totalTriangles = totalTrianglesPerTree * count;
      console.log(
        `✅ Total per tree: ${totalTrianglesPerTree.toFixed(0)} triangles`
      );
      console.log(
        `   Total for ${count} trees: ${totalTriangles.toFixed(0)} triangles`
      );

      // ========== STEP 3: Pre-generate ALL tree transformation data ==========
      // CRITICAL: Generate ALL random values ONCE and store them
      // This ensures trunk and leaves use EXACTLY the same transformations
      const treeTransforms = [];

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

        // Calculate terrain-adjusted Y position (using pre-calculated treeBottomOffset)
        // Origin is at the center of the billboard, bottom is at treeBottomOffset below origin
        // To place bottom at terrainY: finalY + (treeBottomOffset * scale) = terrainY
        // Since treeBottomOffset is negative, this becomes: finalY - abs(treeBottomOffset) * scale = terrainY
        // Therefore: finalY = terrainY - treeBottomOffset * scale
        // (Because treeBottomOffset is negative, this effectively adds the offset)
        let finalY = position[1];
        if (getTerrainHeight) {
          const terrainY = getTerrainHeight(x, z);
          // Since origin is at center, bottom is at: centerY + (bottomOffset * scale)
          // bottomOffset is negative (-6.81), so bottom = centerY - 6.81 * scale
          // To place bottom at terrainY: centerY - 6.81 * scale = terrainY
          // Therefore: centerY = terrainY + 6.81 * scale
          // Which is: centerY = terrainY - bottomOffset * scale (since bottomOffset is negative)
          const scaledBottomOffset = treeBottomOffset * randomScale;
          finalY = terrainY - scaledBottomOffset + yOffset;
          // Debug: log first few trees to verify calculation
          if (i < 3) {
            const calculatedBottomY = finalY + treeBottomOffset * randomScale;
            console.log(
              `   🌲 Tree ${i}: terrainY=${terrainY.toFixed(
                2
              )}, bottomOffset=${treeBottomOffset.toFixed(
                2
              )}, scale=${randomScale.toFixed(2)}, centerY=${finalY.toFixed(
                2
              )}, calculatedBottomY=${calculatedBottomY.toFixed(
                2
              )} (should be ≈ ${terrainY.toFixed(2)})`
            );
          }
        }

        // Store ALL transformation data for this tree
        const treePosition = new THREE.Vector3(x, finalY, z);
        treeTransforms.push({
          position: treePosition,
          scale: randomScale,
          rotation: randomRotation,
        });
      }

      console.log(
        `   ✅ Generated ${treeTransforms.length.toLocaleString()} tree transforms (positions, scales, rotations)`
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
          material.alphaTest = alphaTest; // Use configurable alpha test threshold
          material.side = THREE.DoubleSide; // Render both sides of leaves
          // Always disable depthWrite for transparent materials to prevent white halo
          // This ensures proper depth sorting and smooth blending
          material.depthWrite = false;
          // Use proper blending for smooth transparency
          material.blending = THREE.NormalBlending;

          // Enable premultiplied alpha if requested (fixes white edges)
          if (premultiplyAlpha) {
            material.premultipliedAlpha = true;
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
            let vertexCode = `
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
            `;

            // Apply view-space thickening for leaves (if enabled)
            if (isTransparent && enableViewThickening) {
              vertexCode += `
              
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
              `;
            }

            shader.vertexShader = shader.vertexShader.replace(
              "#include <begin_vertex>",
              vertexCode
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
              // Build distance-based alpha test code
              let distanceAlphaTestCode = "";
              if (enableDistanceAlphaTest) {
                distanceAlphaTestCode = `
            // Distance-based alpha test: lower threshold at distance to prevent transparency issues
            float distanceAlphaTest = ${alphaTest.toFixed(3)};
            if (vDistance > ${distanceAlphaStart.toFixed(1)}) {
              // Smoothly reduce alphaTest threshold from base to 0.0 as distance increases
              float distanceRange = ${distanceAlphaEnd.toFixed(
                1
              )} - ${distanceAlphaStart.toFixed(1)};
              float distanceFactor = clamp((vDistance - ${distanceAlphaStart.toFixed(
                1
              )}) / distanceRange, 0.0, 1.0);
              distanceAlphaTest = mix(${alphaTest.toFixed(
                3
              )}, 0.0, distanceFactor);
            }
            `;
              } else {
                distanceAlphaTestCode = `
            // Fixed alpha test threshold (no distance-based adjustment)
            float distanceAlphaTest = ${alphaTest.toFixed(3)};
            `;
              }

              fragmentCode = `
            #include <color_fragment>
            
            ${distanceAlphaTestCode}
            
            // Edge bleed compensation: adjust edge color to fix white edge artifacts
            // This compensates for transparency bleeding by darkening semi-transparent pixels
            // Only apply if compensation factor is greater than 1.0
            ${
              edgeBleedCompensation > 1.0
                ? `
            float edgeFactor = smoothstep(0.0, 1.0 / ${edgeBleedCompensation.toFixed(
              2
            )}, diffuseColor.a);
            diffuseColor.rgb *= mix(1.0, edgeFactor, 0.3);
            `
                : ""
            }
            
            ${
              premultiplyAlpha
                ? `
            // Premultiply alpha: fix white edges by premultiplying RGB with alpha
            // This is critical for fixing white edge artifacts in PNG transparency
            diffuseColor.rgb *= diffuseColor.a;
            `
                : ""
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

          console.log(
            `   🍃 Leaves material: transparent=true, alphaTest=${material.alphaTest}, premultiplyAlpha=${material.premultipliedAlpha}, depthWrite=${material.depthWrite}, side=DoubleSide, viewThickening=${enableViewThickening}`
          );
          console.log(
            `   🎨 Transparency controls: edgeBleedCompensation=${edgeBleedCompensation.toFixed(
              2
            )}, distanceAlphaTest=${
              enableDistanceAlphaTest ? "enabled" : "disabled"
            }`
          );
        }

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

        // Add all tree instances using PRE-GENERATED transformation data
        // CRITICAL: Both trunk and leaves use the SAME stored transformations
        // This ensures perfect synchronization - no desync issues!
        instancedMesh.addInstances(count, (obj, index) => {
          // Use the PRE-GENERATED transform data (same for trunk and leaves)
          const transform = treeTransforms[index];

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
      console.log(`\n✅ All ${meshes.length} billboard tree meshes ready!`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🌲 Trees: ${count.toLocaleString()}`);
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

      // Store instance positions for billboard rotation
      instancePositionsRef.current = treeTransforms.map((t) =>
        t.position.clone()
      );

      // Store original scales (CRITICAL: prevents drift - never extract from matrix!)
      instanceScalesRef.current = treeTransforms.map((t) => t.scale);

      // Initialize previous rotations (start with the random rotation from treeTransforms)
      previousRotationsRef.current = treeTransforms.map((t) => t.rotation);
    };

    setupInstancedTrees();

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
      instancePositionsRef.current = [];
      instanceScalesRef.current = [];
      previousRotationsRef.current = [];
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
    yOffset,
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
    alphaTest,
    premultiplyAlpha,
    edgeBleedCompensation,
    enableDistanceAlphaTest,
    distanceAlphaStart,
    distanceAlphaEnd,
    enableRotation,
    rotationDampingDistance,
    rotationStopDistance,
    rotationThreshold,
    rotationSmoothing,
    threeScene,
    gl,
    camera,
  ]);

  // ========== BILLBOARD ROTATION: Update instances to face camera with realistic damping ==========
  useFrame(() => {
    if (
      !instancedMeshesRef.current.length ||
      !camera ||
      instancePositionsRef.current.length === 0 ||
      !enableRotation
    )
      return;

    // Get camera position in world space
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    // Helper function to normalize angle differences (handle wrap-around)
    const normalizeAngle = (angle) => {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };

    // Update all instances to face camera with distance-based damping
    instancedMeshesRef.current.forEach((instancedMesh) => {
      if (!instancedMesh) return;

      const instanceCount = Math.min(
        instancedMesh.instancesCount || instancePositionsRef.current.length,
        instancePositionsRef.current.length
      );

      for (let i = 0; i < instanceCount; i++) {
        // Get stored position FIRST (before any matrix operations)
        const instancePosition = instancePositionsRef.current[i];
        if (!instancePosition) continue;

        // Calculate distance from stored position to camera
        // Use stored position to avoid any matrix decomposition errors
        const distance = cameraPosition.distanceTo(instancePosition);

        // Get current rotation angle FIRST (before stop distance check)
        let currentRotationAngle = previousRotationsRef.current[i];

        // CLOSE DISTANCE: Freeze rotation completely when very close
        if (distance < rotationStopDistance) {
          // If angle not initialized, extract it ONCE from matrix to freeze it
          if (currentRotationAngle === undefined) {
            const matrix = instancedMesh.getMatrixAt(i);
            const actualRotation = new THREE.Quaternion();
            matrix.decompose(
              new THREE.Vector3(),
              actualRotation,
              new THREE.Vector3()
            );
            const currentEuler = new THREE.Euler().setFromQuaternion(
              actualRotation,
              "YXZ"
            );
            currentRotationAngle = currentEuler.y;
            previousRotationsRef.current[i] = currentRotationAngle;
          }
          // FREEZE: Don't update matrix, rotation stays locked at current angle
          continue;
        }

        // Only NOW extract matrix when we're actually going to update rotation
        const matrix = instancedMesh.getMatrixAt(i);
        const actualPosition = new THREE.Vector3();
        const actualScale = new THREE.Vector3();
        const actualRotation = new THREE.Quaternion();
        matrix.decompose(actualPosition, actualRotation, actualScale);

        // Initialize rotation angle if not set
        if (currentRotationAngle === undefined) {
          const currentEuler = new THREE.Euler().setFromQuaternion(
            actualRotation,
            "YXZ"
          );
          currentRotationAngle = currentEuler.y;
          previousRotationsRef.current[i] = currentRotationAngle;
        }

        // Calculate target angle to face camera (use stored position for consistency)
        const direction = new THREE.Vector3()
          .subVectors(cameraPosition, instancePosition)
          .normalize();
        const targetAngle = Math.atan2(direction.x, direction.z);

        // Get previous rotation angle
        const previousAngle = previousRotationsRef.current[i];

        // Calculate angle difference (normalized to handle wrap-around)
        let angleDiff = normalizeAngle(targetAngle - previousAngle);

        // ROTATION THRESHOLD: Only rotate if angle change exceeds threshold (dead zone)
        if (Math.abs(angleDiff) < rotationThreshold) {
          // Angle change too small - don't update matrix at all
          // Leave it exactly as-is to prevent any shifting
          continue;
        }

        // DISTANCE-BASED ROTATION DAMPING: Reduce rotation sensitivity when close
        let rotationFactor = 1.0; // Full rotation at far distances
        if (distance < rotationDampingDistance) {
          // Linearly interpolate rotation factor from 1.0 (at dampingDistance) to 0.0 (at stopDistance)
          const dampingRange = rotationDampingDistance - rotationStopDistance;
          if (dampingRange > 0) {
            const distanceInRange = distance - rotationStopDistance;
            rotationFactor = Math.max(
              0.0,
              Math.min(1.0, distanceInRange / dampingRange)
            );
          }
        }

        // Apply damping to angle difference
        const dampedAngleDiff = angleDiff * rotationFactor;
        const targetAngleWithDamping = previousAngle + dampedAngleDiff;

        // ROTATION SMOOTHING: Proper lerp between previous and target angle
        // rotationSmoothing: 0 = instant (no smoothing), 1 = very slow
        // Lower values = faster rotation, higher values = slower/smoother
        // Calculate how much to move towards target this frame
        const angleToMove = normalizeAngle(
          targetAngleWithDamping - previousAngle
        );
        const smoothedAngle =
          previousAngle + angleToMove * (1.0 - rotationSmoothing);

        // Store smoothed angle for next frame
        previousRotationsRef.current[i] = smoothedAngle;

        // CRITICAL FIX: Use compose() which handles rotation around pivot correctly
        // compose() creates matrix as: T * R * S (translate, rotate, scale)
        // This ensures rotation happens around the geometry's origin (0,0,0) in local space
        // The position is applied AFTER rotation, so position never changes
        const instanceScale = instanceScalesRef.current[i];
        if (instanceScale === undefined) continue;

        // CRITICAL: Use Object3D.updateMatrix() - EXACT same method as initial setup
        // This guarantees the matrix is built identically, preventing any position shifting
        const tempObject = new THREE.Object3D();
        tempObject.position.copy(instancePosition);
        tempObject.rotation.y = smoothedAngle; // Same as obj.rotateY() in initial setup
        tempObject.scale.setScalar(instanceScale); // Same as obj.scale.setScalar()
        tempObject.updateMatrix(); // This builds matrix EXACTLY like initial setup

        // Clone the matrix - guaranteed to match Three.js format
        const newMatrix = tempObject.matrix.clone();

        // Set the updated matrix
        instancedMesh.setMatrixAt(i, newMatrix);
      }

      // Mark instance matrix as needing update
      instancedMesh.instanceMatrix.needsUpdate = true;
    });
  });

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
useGLTF.preload("/models/treebillboard-transformed.glb");
