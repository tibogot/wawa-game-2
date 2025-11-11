import React, {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const leavesVS = /*glsl*/ `
      uniform sampler2D uNoiseMap;
  
      uniform vec3 uBoxMin, uBoxSize, uRaycast;
  
      uniform float uTime;
  
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
  
          mat4 mouseDisplace = mat4(1.);
  
          // Get position in instance space (before modelMatrix transform)
          // This is in the same coordinate space as uBoxMin
          vec3 instancePos = vec3(instanceMatrix * vec4(position, 1.));
          
          // Calculate object space position relative to bounding box
          // This should be in model/instance space, not world space
          vObjectPos = ((instancePos - uBoxMin) * 2.) / uBoxSize - vec3(1.0);
          
          // Now calculate world position for other calculations
          vec3 vWorldPos = vec3(modelMatrix * instanceMatrix * mouseDisplace * vec4(position, 1.));
  
          // Calculate close to ground relative to tree's bounding box (not absolute world Y)
          // This makes it work regardless of terrain height
          float leafHeightRelativeToTree = instancePos.y - uBoxMin.y;
          float treeHeight = uBoxSize.y;
          // Normalize to 0-1 range, where 0 is at tree base and 1 is at tree top
          // Then invert so lower leaves have higher value (closer to ground)
          vCloseToGround = clamp(1.0 - (leafHeightRelativeToTree / max(treeHeight, 0.001)), 0.0, 1.0);
  
          float offset = clamp(0.8 - distance(uRaycast, instanceMatrix[3].xyz), 0., 999.); 
  
          offset = (pow(offset, 0.8) / 2.0) * vCloseToGround;
  
          mouseDisplace[3].xyz = vec3(offset);
  
          vNormal = normalMatrix * mat3(instanceMatrix) * mat3(mouseDisplace) * normalize(normal); 
  
          vWorldNormal = vec3(modelMatrix * instanceMatrix * mouseDisplace * vec4(normal, 0.)); 
  
          vec4 noiseOffset = getTriplanar(uNoiseMap) * vCloseToGround; 
  
          vec4 newPos = instanceMatrix * mouseDisplace * vec4(position, 1.); 
  
          newPos.xyz = newPos.xyz + noiseOffset.xyz;
  
          gl_Position =  projectionMatrix * modelViewMatrix * newPos;
  
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
          
          // Apply gradient power to control transition sharpness
          float adjustedFa = pow(clamp(fa, 0.0, 1.0), uGradientPower);
          
          // Clamp threshold to avoid division by zero
          float threshold = clamp(uGradientThreshold, 0.01, 0.99);
  
          // Use threshold uniform for color transition point
          if (adjustedFa > threshold) {
              // Blend between colorB and colorC
              float t = (adjustedFa - threshold) / (1.0 - threshold);
              m = mix(v2, v3, t);
          } else {
              // Blend between colorA and colorB
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

          float intensity = 0.0;

          int numLights = directionalLights.length();
          
          if (numLights > 0) {
              // Handle first light
              intensity = dot(directionalLights[0].direction, vNormal);
              intensity = smoothstep(0.55, 1., intensity) * 0.2 
                          + pow(smoothstep(0.55, 1., intensity), 0.5);
              
              // Handle additional lights if there are 2 or more
              if (numLights > 1) {
                  for (int i = 1; i < numLights; i++){
                      float lightIntensity = dot(directionalLights[i].direction, vNormal);
                      lightIntensity = smoothstep(0.55, 1., lightIntensity) * 0.2 
                                      + pow(smoothstep(0.55, 1., lightIntensity), 0.5);
                      intensity = max(intensity, lightIntensity);
                  }
              }
          }

          return intensity;

      }
  
      void main(){
  
          float gradMap = (getPosColors() + getDiffuse()) * vCloseToGround / 2. ;
  
          vec4 c = vec4(mix3(uColorA, uColorB, uColorC, gradMap), 1.0);
  
          gl_FragColor = vec4(pow(c.xyz,vec3(0.454545)), c.w);
  
      }
  `;

interface AnimatedTree2Props {
  treeModelPath?: string;
  noiseTexturePath?: string;
  poleTexturePath?: string;
  position?: [number, number, number];
  scale?: number;
  enableMouseInteraction?: boolean;
  colorA?: string | THREE.Color;
  colorB?: string | THREE.Color;
  colorC?: string | THREE.Color;
  gradientThreshold?: number;
  gradientPower?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export const AnimatedTree2: React.FC<AnimatedTree2Props> = ({
  treeModelPath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/tree.glb",
  noiseTexturePath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/noise.png",
  poleTexturePath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/texture.jpg",
  position = [0, 0, 0],
  scale = 1,
  enableMouseInteraction = true,
  colorA = "#b45252",
  colorB = "#d3a068",
  colorC = "#ede19e",
  gradientThreshold = 0.7,
  gradientPower = 1.0,
  castShadow = true,
  receiveShadow = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const rayPlaneRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster, size } = useThree();

  // Memoize ray plane geometry
  const rayPlaneGeometry = useMemo(
    () => new THREE.PlaneGeometry(100, 100, 1, 1),
    []
  );

  // Load GLTF model
  const gltf = useGLTF(treeModelPath);

  // Load textures
  const [noiseTexture, setNoiseTexture] = useState<THREE.Texture | null>(null);
  const [poleTexture, setPoleTexture] = useState<THREE.Texture | null>(null);

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
        texture.rotation = 100 * 0.01745329252; // Original rotation
        setPoleTexture(texture);
      },
      undefined,
      (error) => {
        console.warn("Failed to load pole texture:", error);
      }
    );
  }, [noiseTexturePath, poleTexturePath]);

  // Extract tree parts from GLTF
  const treeData = useMemo(() => {
    if (!gltf.scene) return null;

    const pole = gltf.scene.getObjectByName("Pole");
    const crown = gltf.scene.getObjectByName("Leaves");
    const leafObject = gltf.scene.getObjectByName("Leaf");
    const leafMesh = leafObject as THREE.Mesh | undefined;
    const leafGeometry = leafMesh?.geometry;

    if (!pole || !crown || !leafGeometry) {
      console.warn("Tree model missing required parts: Pole, Leaves, or Leaf");
      return null;
    }

    // Clone geometries to avoid modifying originals
    const poleClone = pole.clone();
    if (poleClone instanceof THREE.Mesh) {
      // Set shadow properties
      poleClone.castShadow = castShadow;
      poleClone.receiveShadow = receiveShadow;

      if (poleTexture) {
        poleClone.material = new THREE.MeshToonMaterial({
          map: poleTexture,
        });
      }
    }

    // Calculate bounding box for shader
    // Need to ensure the crown's world matrix is updated
    if (crown instanceof THREE.Mesh) {
      crown.updateWorldMatrix(true, false);
    }

    const bbox = new THREE.Box3().setFromObject(crown);
    // Transform bounding box to world space if crown has world matrix
    // But since we're calculating from the object directly, setFromObject should handle transforms
    // However, we need to ensure the bbox is relative to where the tree will be placed
    // For now, keep it in local space but we'll update the shader to handle this correctly

    const bboxMin = bbox.min.clone();
    const bboxSize = bbox.getSize(new THREE.Vector3());

    const crownMesh = crown as THREE.Mesh;
    if (!crownMesh.geometry) {
      console.warn("Crown mesh missing geometry");
      return null;
    }
    const leavesCount = crownMesh.geometry.attributes.position.count;

    return {
      pole: poleClone,
      crown,
      leafGeometry,
      bboxMin,
      bboxSize,
      leavesCount,
    };
  }, [gltf.scene, poleTexture, castShadow, receiveShadow]);

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

  // Create shader material
  const leavesMaterial = useMemo(() => {
    if (!noiseTexture) return null;

    return new THREE.ShaderMaterial({
      lights: true,
      side: THREE.DoubleSide,
      uniforms: {
        ...THREE.UniformsLib.lights,
        uTime: { value: 0.0 },
        uColorA: { value: colorAValue },
        uColorB: { value: colorBValue },
        uColorC: { value: colorCValue },
        uBoxMin: { value: new THREE.Vector3(0, 0, 0) },
        uBoxSize: { value: new THREE.Vector3(10, 10, 10) },
        uRaycast: { value: new THREE.Vector3(0, 0, 0) },
        uNoiseMap: { value: noiseTexture },
        uGradientThreshold: { value: gradientThreshold },
        uGradientPower: { value: gradientPower },
      },
      vertexShader: leavesVS,
      fragmentShader: leavesFS,
    });
  }, [
    noiseTexture,
    colorAValue,
    colorBValue,
    colorCValue,
    gradientThreshold,
    gradientPower,
  ]);

  // Update color and gradient uniforms when they change
  useEffect(() => {
    if (!leavesMaterial) return;

    leavesMaterial.uniforms.uColorA.value.copy(colorAValue);
    leavesMaterial.uniforms.uColorB.value.copy(colorBValue);
    leavesMaterial.uniforms.uColorC.value.copy(colorCValue);
    leavesMaterial.uniforms.uGradientThreshold.value = gradientThreshold;
    leavesMaterial.uniforms.uGradientPower.value = gradientPower;
  }, [
    leavesMaterial,
    colorAValue,
    colorBValue,
    colorCValue,
    gradientThreshold,
    gradientPower,
  ]);

  // Initialize leaves instance mesh
  const leavesMesh = useMemo(() => {
    if (!treeData || !leavesMaterial) return null;

    const leaves = new THREE.InstancedMesh(
      treeData.leafGeometry,
      leavesMaterial,
      treeData.leavesCount
    );

    const dummy = new THREE.Object3D();
    const crown = treeData.crown as THREE.Mesh;
    const positions = crown.geometry.attributes.position.array as Float32Array;
    const normals = crown.geometry.attributes.normal.array as Float32Array;

    // Set up each leaf instance
    for (let i = 0; i < treeData.leavesCount; i++) {
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );

      // Look at direction based on normal
      const normalX = normals[i * 3];
      const normalY = normals[i * 3 + 1];
      const normalZ = normals[i * 3 + 2];

      dummy.lookAt(
        dummy.position.x + normalX,
        dummy.position.y + normalY,
        dummy.position.z + normalZ
      );

      dummy.scale.set(
        Math.random() * 0.2 + 0.8,
        Math.random() * 0.2 + 0.8,
        Math.random() * 0.2 + 0.8
      );

      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }

    // Update uniforms with bounding box
    leavesMaterial.uniforms.uBoxMin.value.copy(treeData.bboxMin);
    leavesMaterial.uniforms.uBoxSize.value.copy(treeData.bboxSize);

    // Set shadow properties
    leaves.castShadow = castShadow;
    leaves.receiveShadow = receiveShadow;

    return leaves;
  }, [treeData, leavesMaterial, castShadow, receiveShadow]);

  // Dead leaves state
  const [deadID, setDeadID] = useState<number[]>([]);
  const matrix = useRef(new THREE.Matrix4());
  const dummy = useRef(new THREE.Object3D());
  const quaternion = useRef(new THREE.Quaternion());
  const worldPosition = useRef(new THREE.Vector3());

  // Initialize dead leaves
  useEffect(() => {
    if (!treeData) return;

    const initialDead: number[] = [];
    for (let i = 0; i < 24; i++) {
      initialDead.push(Math.floor(Math.random() * treeData.leavesCount));
    }
    setDeadID(initialDead);
  }, [treeData]);

  // Random leaf killing
  useEffect(() => {
    if (!treeData || !enableMouseInteraction) return;

    const killRandom = () => {
      setDeadID((prev) => {
        const newDead = [...prev];
        newDead.push(Math.floor(Math.random() * treeData.leavesCount));
        return newDead;
      });
      setTimeout(killRandom, Math.random() * 1500);
    };

    const timeout = setTimeout(killRandom, Math.random() * 1500);
    return () => clearTimeout(timeout);
  }, [treeData, enableMouseInteraction]);

  // Pointer move handler
  const handlePointerMove = useCallback(
    (event: any) => {
      if (!leavesMesh || !rayPlaneRef.current || !enableMouseInteraction)
        return;

      // Update pointer from event
      const x = (event.clientX / size.width) * 2 - 1;
      const y = -(event.clientY / size.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const rayPlane = rayPlaneRef.current;
      const intersects = raycaster.intersectObjects([leavesMesh, rayPlane]);

      if (intersects[0]) {
        // For smooth transition between background and tree
        rayPlane.position.copy(intersects[0].point);
        rayPlane.position.multiplyScalar(0.9);
        rayPlane.lookAt(camera.position);

        if (leavesMaterial) {
          leavesMaterial.uniforms.uRaycast.value.copy(intersects[0].point);
        }

        if (Math.random() * 5 > 3 && intersects[0].instanceId !== undefined) {
          setDeadID((prev) => {
            const newDead = [...prev];
            if (!newDead.includes(intersects[0].instanceId!)) {
              newDead.push(intersects[0].instanceId!);
            }
            return newDead;
          });
        }
      }
    },
    [
      leavesMesh,
      leavesMaterial,
      camera,
      raycaster,
      size,
      enableMouseInteraction,
    ]
  );

  // Animation loop
  const timeRef = useRef(0);
  useFrame(() => {
    if (!leavesMesh || !leavesMaterial || !treeData || !groupRef.current)
      return;

    // Update time uniform (cumulative, matching original)
    timeRef.current += 0.01;
    leavesMaterial.uniforms.uTime.value = timeRef.current;

    // Update dead leaves (falling animation)
    if (deadID.length > 0 && leavesMesh) {
      const updatedDead: number[] = [];

      // Get the group's world matrix to transform local positions to world space
      groupRef.current.updateWorldMatrix(true, false);
      const groupWorldMatrix = groupRef.current.matrixWorld;

      deadID.forEach((i) => {
        if (i === undefined || i === null) return;

        leavesMesh.getMatrixAt(i, matrix.current);
        matrix.current.decompose(
          dummy.current.position,
          quaternion.current,
          dummy.current.scale
        );

        // Convert quaternion to euler for rotation manipulation
        dummy.current.rotation.setFromQuaternion(quaternion.current);

        // Transform local position to world space for ground check
        // Create a temporary matrix that represents the world transform
        const tempMatrix = groupWorldMatrix.clone().multiply(matrix.current);
        worldPosition.current.setFromMatrixPosition(tempMatrix);

        // Check against ground level in world space (ground is at y = 0)
        if (worldPosition.current.y > 0) {
          // Update the local position (this is in instanced mesh local space)
          dummy.current.position.y -= 0.04;
          dummy.current.position.x += Math.random() / 5 - 0.11;
          dummy.current.position.z += Math.random() / 5 - 0.11;
          dummy.current.rotation.x += 0.2;
          dummy.current.updateMatrix();
          leavesMesh.setMatrixAt(i, dummy.current.matrix);
          updatedDead.push(i);
        }
      });

      if (updatedDead.length !== deadID.length) {
        setDeadID(updatedDead);
      }

      leavesMesh.instanceMatrix.needsUpdate = true;
    }
  });

  // Set up pointer event
  useEffect(() => {
    if (!enableMouseInteraction) return;

    const handleMove = (e: MouseEvent) => handlePointerMove(e);
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [handlePointerMove, enableMouseInteraction]);

  if (!treeData || !leavesMesh || !leavesMaterial) {
    return null;
  }

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={treeData.pole} />
      <primitive object={leavesMesh} ref={leavesRef} />
      <mesh ref={rayPlaneRef} geometry={rayPlaneGeometry} visible={false} />
    </group>
  );
};

// Preload the model
useGLTF.preload(
  "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/tree.glb"
);
