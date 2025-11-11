import React, { useEffect, useRef, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";

// Modified vertex shader to use instanced attributes for per-tree bounding boxes
const leavesVS = /*glsl*/ `
      uniform sampler2D uNoiseMap;
      uniform float uTime;
      
      // Instanced attributes for per-tree bounding boxes
      attribute vec3 aBoxMin;
      attribute vec3 aBoxSize;
      
      varying vec3 vObjectPos, vNormal, vWorldNormal; 
      varying float vCloseToGround;
      
      vec4 getTriplanar(sampler2D tex){
          vec4 xPixel = texture(tex, (vObjectPos.xy + uTime) / 3.);
          vec4 yPixel = texture(tex, (vObjectPos.yz + uTime) / 3.);
          vec4 zPixel = texture(tex, (vObjectPos.zx + uTime) / 3.);
          vec4 combined = (xPixel + yPixel + zPixel) / 6.0;
          combined.xyz = combined.xyz * vObjectPos; 
          return combined;
      }
      
      void main(){
          // Get position in instance space (after instanceMatrix transform)
          // instanceMatrix transforms from leaf local space to tree instance space
          vec3 instancePos = vec3(instanceMatrix * vec4(position, 1.));
          
          // The bounding box (aBoxMin, aBoxSize) is in the same space as instancePos
          // (tree instance space, which includes the tree's scale but not world position)
          // Calculate object space position relative to bounding box
          vObjectPos = ((instancePos - aBoxMin) * 2.) / aBoxSize - vec3(1.0);
          
          // Calculate close to ground relative to tree's bounding box
          float leafHeightRelativeToTree = instancePos.y - aBoxMin.y;
          float treeHeight = aBoxSize.y;
          vCloseToGround = clamp(1.0 - (leafHeightRelativeToTree / max(treeHeight, 0.001)), 0.0, 1.0);
          
          // No mouse displacement (removed raycast interaction)
          mat4 mouseDisplace = mat4(1.);
          
          vNormal = normalMatrix * mat3(instanceMatrix) * mat3(mouseDisplace) * normalize(normal); 
          vWorldNormal = vec3(modelMatrix * instanceMatrix * mouseDisplace * vec4(normal, 0.)); 
          
          vec4 noiseOffset = getTriplanar(uNoiseMap) * vCloseToGround; 
          
          vec4 newPos = instanceMatrix * mouseDisplace * vec4(position, 1.); 
          newPos.xyz = newPos.xyz + noiseOffset.xyz; 
          
          gl_Position = projectionMatrix * modelViewMatrix * newPos;
      }
  `;

const leavesFS = /*glsl*/ `
      #include <common> 
      #include <lights_pars_begin>
      
      uniform vec3 uColorA, uColorB, uColorC;
      uniform float uTime;
      uniform float uGradientThreshold;
      uniform float uGradientPower;
      
      varying vec3 vObjectPos, vNormal, vWorldNormal; 
      varying float vCloseToGround;
      
      vec3 mix3 (vec3 v1, vec3 v2, vec3 v3, float fa){
          vec3 m; 
          float adjustedFa = pow(clamp(fa, 0.0, 1.0), uGradientPower);
          float threshold = clamp(uGradientThreshold, 0.01, 0.99);
          
          if (adjustedFa > threshold) {
              float t = (adjustedFa - threshold) / (1.0 - threshold);
              m = mix(v2, v3, t);
          } else {
              float t = adjustedFa / threshold;
              m = mix(v1, v2, t);
          }
          return m;
      }
      
      float getPosColors(){
          float p = 0.;
          p = smoothstep(0.2, 0.8, distance(vec3(0.), vObjectPos));
          p = p * (-(vWorldNormal.g / 2.) + 0.5) * (- vObjectPos.y / 9. + 0.5); 
          return p;
      }
      
      float getDiffuse(){
          float intensity;
          for (int i = 0; i < directionalLights.length(); i++){
              intensity = dot(directionalLights[i].direction, vNormal);
              intensity = smoothstep(0.55, 1., intensity) * 0.2 
                          + pow(smoothstep(0.55, 1., intensity), 0.5);
          }
          return intensity;
      }
      
      void main(){
          // TEMPORARY DEBUG: Output solid green to verify shader is working
          gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
          return;
          
          float gradMap = (getPosColors() + getDiffuse()) * vCloseToGround / 2.;
          gradMap = clamp(gradMap, 0.0, 1.0);
          
          vec4 c = vec4(mix3(uColorA, uColorB, uColorC, gradMap), 1.0);
          gl_FragColor = vec4(pow(c.xyz,vec3(0.454545)), 1.0);
      }
  `;

interface InstancedAnimatedTreesProps {
  treeModelPath?: string;
  noiseTexturePath?: string;
  poleTexturePath?: string;
  count?: number;
  position?: [number, number, number];
  radius?: number;
  minRadius?: number;
  scaleRange?: [number, number];
  enabled?: boolean;
  getTerrainHeight?: (x: number, z: number) => number;
  colorA?: string | THREE.Color;
  colorB?: string | THREE.Color;
  colorC?: string | THREE.Color;
  gradientThreshold?: number;
  gradientPower?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  enableBVH?: boolean;
  bvhMargin?: number;
}

export const InstancedAnimatedTrees: React.FC<InstancedAnimatedTreesProps> = ({
  treeModelPath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/tree.glb",
  noiseTexturePath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/noise.png",
  poleTexturePath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/texture.jpg",
  count = 50,
  position = [0, 0, 0],
  radius = 50,
  minRadius = 0,
  scaleRange = [0.8, 1.2],
  enabled = true,
  getTerrainHeight,
  colorA = "#b45252",
  colorB = "#d3a068",
  colorC = "#ede19e",
  gradientThreshold = 0.7,
  gradientPower = 1.0,
  castShadow = true,
  receiveShadow = true,
  enableBVH = true,
  bvhMargin = 0.1,
}) => {
  const { scene } = useGLTF(treeModelPath);
  const { scene: threeScene, gl, camera } = useThree();
  const instancedMeshesRef = useRef<{
    pole?: InstancedMesh2;
    leaves?: InstancedMesh2;
  }>({});
  const groupRef = useRef<THREE.Group | null>(null);
  const leavesMaterialRef = useRef<THREE.Material | null>(null);
  const timeRef = useRef(0);

  // Load textures
  const [noiseTexture, setNoiseTexture] = useState<THREE.Texture | null>(null);
  const [poleTexture, setPoleTexture] = useState<THREE.Texture | null>(null);

  // Convert color props to THREE.Color
  const colorAValue = useMemo(() => {
    if (typeof colorA === "string") {
      return new THREE.Color(colorA);
    }
    return colorA.clone();
  }, [colorA]);

  const colorBValue = useMemo(() => {
    if (typeof colorB === "string") {
      return new THREE.Color(colorB);
    }
    return colorB.clone();
  }, [colorB]);

  const colorCValue = useMemo(() => {
    if (typeof colorC === "string") {
      return new THREE.Color(colorC);
    }
    return colorC.clone();
  }, [colorC]);

  // Load textures
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      noiseTexturePath,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        setNoiseTexture(texture);
      },
      undefined,
      (error) => {
        console.warn("Failed to load noise texture:", error);
      }
    );

    textureLoader.load(
      poleTexturePath,
      (texture) => {
        texture.rotation = 100 * 0.01745329252;
        setPoleTexture(texture);
      },
      undefined,
      (error) => {
        console.warn("Failed to load pole texture:", error);
      }
    );
  }, [noiseTexturePath, poleTexturePath]);

  // Core setup
  useEffect(() => {
    if (!enabled || !scene || !noiseTexture || !poleTexture) return;

    const setupInstancedTrees = () => {
      console.log("🌲 INSTANCED ANIMATED TREES - Setting up...");
      console.log(`   Tree count: ${count.toLocaleString()}`);

      // Extract tree parts from GLTF
      const pole = scene.getObjectByName("Pole");
      const crown = scene.getObjectByName("Leaves");
      const leafObject = scene.getObjectByName("Leaf");
      const leafMesh = leafObject as THREE.Mesh | undefined;
      const leafGeometry = leafMesh?.geometry;

      if (!pole || !crown || !leafGeometry) {
        console.warn(
          "Tree model missing required parts: Pole, Leaves, or Leaf"
        );
        return;
      }

      // Extract pole geometry
      if (!(pole instanceof THREE.Mesh)) {
        console.warn("Pole is not a mesh");
        return;
      }

      const poleGeometry = pole.geometry.clone();
      pole.updateWorldMatrix(true, false);
      poleGeometry.applyMatrix4(pole.matrixWorld);
      poleGeometry.computeVertexNormals();
      poleGeometry.computeBoundingBox();

      // Calculate bounding box for base tree (unscaled)
      const crownMesh = crown as THREE.Mesh;
      if (crownMesh instanceof THREE.Mesh) {
        crownMesh.updateWorldMatrix(true, false);
      }
      const baseBbox = new THREE.Box3().setFromObject(crown);
      const baseBboxMin = baseBbox.min.clone();
      const baseBboxSize = baseBbox.getSize(new THREE.Vector3());
      const leavesPerTree = crownMesh.geometry.attributes.position.count;

      console.log(`   Leaves per tree: ${leavesPerTree}`);
      console.log(
        `   Base bounding box: min=${baseBboxMin.toArray()}, size=${baseBboxSize.toArray()}`
      );

      // Calculate tree bottom offset for terrain positioning
      let treeBottomOffset = 0;
      if (getTerrainHeight) {
        const tempGroup = new THREE.Group();
        const tempScene = scene.clone();
        tempGroup.add(tempScene);
        const bbox = new THREE.Box3();
        bbox.setFromObject(tempGroup);
        treeBottomOffset = bbox.min.y;
        tempGroup.clear();
      }

      // Pre-generate ALL tree transformation data
      const treeTransforms: Array<{
        position: THREE.Vector3;
        scale: number;
        rotation: number;
        bboxMin: THREE.Vector3;
        bboxSize: THREE.Vector3;
      }> = [];

      for (let i = 0; i < count; i++) {
        // Random position in ring
        const angle = Math.random() * Math.PI * 2;
        const distance = minRadius + Math.random() * (radius - minRadius);
        const x = position[0] + Math.cos(angle) * distance;
        const z = position[2] + Math.sin(angle) * distance;

        // Random scale and rotation
        const randomScale =
          Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0];
        const randomRotation = Math.random() * Math.PI * 2;

        // Calculate terrain-adjusted Y position
        let finalY = position[1];
        if (getTerrainHeight) {
          const terrainY = getTerrainHeight(x, z);
          const scaledBottomOffset = treeBottomOffset * randomScale;
          finalY = terrainY - scaledBottomOffset;
        }

        // Calculate scaled bounding box for this tree
        const scaledBboxMin = baseBboxMin.clone().multiplyScalar(randomScale);
        const scaledBboxSize = baseBboxSize.clone().multiplyScalar(randomScale);

        treeTransforms.push({
          position: new THREE.Vector3(x, finalY, z),
          scale: randomScale,
          rotation: randomRotation,
          bboxMin: scaledBboxMin,
          bboxSize: scaledBboxSize,
        });
      }

      console.log(
        `   ✅ Generated ${treeTransforms.length.toLocaleString()} tree transforms`
      );

      // ========== CREATE POLE INSTANCED MESH ==========
      const poleMaterial = new THREE.MeshToonMaterial({
        map: poleTexture,
      });

      const poleInstancedMesh = new InstancedMesh2(poleGeometry, poleMaterial, {
        capacity: count,
        createEntities: false,
        renderer: gl,
      });

      (poleInstancedMesh as any).camera = camera;
      poleInstancedMesh.castShadow = castShadow;
      poleInstancedMesh.receiveShadow = receiveShadow;

      // Add pole instances
      poleInstancedMesh.addInstances(count, (obj, index) => {
        const transform = treeTransforms[index];
        obj.position.copy(transform.position);
        obj.scale.setScalar(transform.scale);
        obj.rotateY(transform.rotation);
        obj.updateMatrix();
      });

      if (enableBVH) {
        poleInstancedMesh.computeBVH({ margin: bvhMargin });
      }

      console.log(`   ✅ Pole InstancedMesh2 created with ${count} instances`);

      // ========== CREATE LEAVES INSTANCED MESH ==========
      const totalLeaves = count * leavesPerTree;

      // TEMPORARY: Use simple material to test if geometry renders
      const leavesMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Bright green
        side: THREE.DoubleSide,
      });

      // Create shader material (commented out for testing)
      // const leavesMaterial = new THREE.ShaderMaterial({
      //   lights: true,
      //   side: THREE.DoubleSide,
      //   transparent: false,
      //   depthWrite: true,
      //   uniforms: {
      //     ...THREE.UniformsLib.lights,
      //     uTime: { value: 0.0 },
      //     uColorA: { value: colorAValue },
      //     uColorB: { value: colorBValue },
      //     uColorC: { value: colorCValue },
      //     uNoiseMap: { value: noiseTexture },
      //     uGradientThreshold: { value: gradientThreshold },
      //     uGradientPower: { value: gradientPower },
      //   },
      //   vertexShader: leavesVS,
      //   fragmentShader: leavesFS,
      // });

      leavesMaterialRef.current = leavesMaterial;

      // Clone leaf geometry
      const clonedLeafGeometry = leafGeometry.clone();

      // Prepare instanced attributes for bounding boxes
      const boxMinArray = new Float32Array(totalLeaves * 3);
      const boxSizeArray = new Float32Array(totalLeaves * 3);

      // Create InstancedMesh2 for leaves
      const leavesInstancedMesh = new InstancedMesh2(
        clonedLeafGeometry,
        leavesMaterial,
        {
          capacity: totalLeaves,
          createEntities: false,
          renderer: gl,
        }
      );

      (leavesInstancedMesh as any).camera = camera;
      leavesInstancedMesh.castShadow = castShadow;
      leavesInstancedMesh.receiveShadow = receiveShadow;

      // Pre-calculate all leaf positions and bounding box data
      const crownPositions = crownMesh.geometry.attributes.position
        .array as Float32Array;
      const crownNormals = crownMesh.geometry.attributes.normal
        .array as Float32Array;

      let globalLeafIndex = 0;

      // First pass: populate bounding box arrays
      for (let treeIndex = 0; treeIndex < count; treeIndex++) {
        const treeTransform = treeTransforms[treeIndex];

        // Set bounding box data for all leaves of this tree
        for (let leafIndex = 0; leafIndex < leavesPerTree; leafIndex++) {
          const arrayIndex = globalLeafIndex * 3;
          boxMinArray[arrayIndex] = treeTransform.bboxMin.x;
          boxMinArray[arrayIndex + 1] = treeTransform.bboxMin.y;
          boxMinArray[arrayIndex + 2] = treeTransform.bboxMin.z;

          boxSizeArray[arrayIndex] = treeTransform.bboxSize.x;
          boxSizeArray[arrayIndex + 1] = treeTransform.bboxSize.y;
          boxSizeArray[arrayIndex + 2] = treeTransform.bboxSize.z;

          globalLeafIndex++;
        }
      }

      // Set instanced attributes for bounding boxes BEFORE adding instances
      clonedLeafGeometry.setAttribute(
        "aBoxMin",
        new THREE.InstancedBufferAttribute(boxMinArray, 3)
      );
      clonedLeafGeometry.setAttribute(
        "aBoxSize",
        new THREE.InstancedBufferAttribute(boxSizeArray, 3)
      );

      // Second pass: add instances using InstancedMesh2 API
      // IMPORTANT: Position leaves in tree-local space (scaled but not world-positioned)
      // The bounding box is in tree-local space, so leaves must be too
      // The modelMatrix will apply the tree's world position
      globalLeafIndex = 0;
      leavesInstancedMesh.addInstances(totalLeaves, (obj, index) => {
        // Calculate which tree and leaf this is
        const treeIndex = Math.floor(index / leavesPerTree);
        const leafIndex = index % leavesPerTree;
        const treeTransform = treeTransforms[treeIndex];

        // Get leaf position from crown (in crown's local space)
        const crownPosIndex = leafIndex * 3;
        obj.position.set(
          crownPositions[crownPosIndex],
          crownPositions[crownPosIndex + 1],
          crownPositions[crownPosIndex + 2]
        );

        // Apply tree scale and world position
        obj.position.multiplyScalar(treeTransform.scale);
        obj.position.add(treeTransform.position);

        // Look at direction based on normal
        const normalX = crownNormals[crownPosIndex];
        const normalY = crownNormals[crownPosIndex + 1];
        const normalZ = crownNormals[crownPosIndex + 2];

        // Calculate rotation to face the normal direction
        const normal = new THREE.Vector3(normalX, normalY, normalZ).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(up, normal);
        obj.quaternion.copy(quaternion);

        // Apply tree rotation
        obj.rotateY(treeTransform.rotation);

        // Random leaf scale
        const leafScale = treeTransform.scale * (Math.random() * 0.2 + 0.8);
        obj.scale.set(leafScale, leafScale, leafScale);

        obj.updateMatrix();
      });

      // Update bounding box arrays to include world position offset
      // Since leaves are now positioned in world space, bounding boxes must be too
      for (let i = 0; i < totalLeaves; i++) {
        const treeIndex = Math.floor(i / leavesPerTree);
        const treeTransform = treeTransforms[treeIndex];
        const arrayIndex = i * 3;

        // Add tree's world position to bounding box min
        boxMinArray[arrayIndex] =
          treeTransform.bboxMin.x + treeTransform.position.x;
        boxMinArray[arrayIndex + 1] =
          treeTransform.bboxMin.y + treeTransform.position.y;
        boxMinArray[arrayIndex + 2] =
          treeTransform.bboxMin.z + treeTransform.position.z;
      }

      // Update the instanced attributes with world-space bounding boxes
      clonedLeafGeometry.setAttribute(
        "aBoxMin",
        new THREE.InstancedBufferAttribute(boxMinArray, 3)
      );

      if (enableBVH) {
        leavesInstancedMesh.computeBVH({ margin: bvhMargin });
      }

      console.log(
        `   ✅ Leaves InstancedMesh2 created with ${totalLeaves.toLocaleString()} instances`
      );

      // Add to scene
      if (!groupRef.current) {
        groupRef.current = new THREE.Group();
        threeScene.add(groupRef.current);
      }

      groupRef.current.add(poleInstancedMesh);
      groupRef.current.add(leavesInstancedMesh);

      instancedMeshesRef.current = {
        pole: poleInstancedMesh,
        leaves: leavesInstancedMesh,
      };

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🌲 Trees: ${count.toLocaleString()}`);
      console.log(`🍃 Total leaves: ${totalLeaves.toLocaleString()}`);
      console.log(`📊 Draw calls: 2 (pole + leaves)`);
      console.log(
        `🎯 Frustum Culling: ${enableBVH ? "BVH enabled" : "Disabled"}`
      );
      console.log(`☀️  Shadows: cast=${castShadow}, receive=${receiveShadow}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    };

    setupInstancedTrees();

    // Cleanup
    return () => {
      if (instancedMeshesRef.current.pole) {
        if (groupRef.current) {
          groupRef.current.remove(instancedMeshesRef.current.pole);
        } else {
          threeScene.remove(instancedMeshesRef.current.pole);
        }
        instancedMeshesRef.current.pole.dispose();
      }

      if (instancedMeshesRef.current.leaves) {
        if (groupRef.current) {
          groupRef.current.remove(instancedMeshesRef.current.leaves);
        } else {
          threeScene.remove(instancedMeshesRef.current.leaves);
        }
        instancedMeshesRef.current.leaves.dispose();
      }

      instancedMeshesRef.current = {};

      if (groupRef.current && groupRef.current.children.length === 0) {
        threeScene.remove(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [
    scene,
    enabled,
    count,
    position,
    radius,
    minRadius,
    scaleRange,
    getTerrainHeight,
    noiseTexture,
    poleTexture,
    colorAValue,
    colorBValue,
    colorCValue,
    gradientThreshold,
    gradientPower,
    castShadow,
    receiveShadow,
    enableBVH,
    bvhMargin,
    threeScene,
    gl,
    camera,
  ]);

  // Update color and gradient uniforms when they change (only for ShaderMaterial)
  useEffect(() => {
    if (!leavesMaterialRef.current) return;
    if (leavesMaterialRef.current instanceof THREE.ShaderMaterial) {
      leavesMaterialRef.current.uniforms.uColorA.value.copy(colorAValue);
      leavesMaterialRef.current.uniforms.uColorB.value.copy(colorBValue);
      leavesMaterialRef.current.uniforms.uColorC.value.copy(colorCValue);
      leavesMaterialRef.current.uniforms.uGradientThreshold.value =
        gradientThreshold;
      leavesMaterialRef.current.uniforms.uGradientPower.value = gradientPower;
    }
  }, [colorAValue, colorBValue, colorCValue, gradientThreshold, gradientPower]);

  // Animation loop - update time uniform (only for ShaderMaterial)
  useFrame(() => {
    if (!leavesMaterialRef.current) return;
    if (leavesMaterialRef.current instanceof THREE.ShaderMaterial) {
      timeRef.current += 0.01;
      leavesMaterialRef.current.uniforms.uTime.value = timeRef.current;
    }
  });

  return null;
};

// Preload the model
useGLTF.preload(
  "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/tree.glb"
);
