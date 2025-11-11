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

        vec3 vWorldPos = vec3(modelMatrix * instanceMatrix * mouseDisplace * vec4(position, 1.));

        vCloseToGround = clamp(vWorldPos.y, 0., 1.);

        float offset = clamp(0.8 - distance(uRaycast, instanceMatrix[3].xyz), 0., 999.); 

        offset = (pow(offset, 0.8) / 2.0) * vCloseToGround;

        mouseDisplace[3].xyz = vec3(offset);

        vNormal = normalMatrix * mat3(instanceMatrix) * mat3(mouseDisplace) * normalize(normal); 

        vWorldNormal = vec3(modelMatrix * instanceMatrix * mouseDisplace * vec4(normal, 0.));

        vObjectPos = ((vWorldPos - uBoxMin) * 2.) / uBoxSize - vec3(1.0); 

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

    varying vec3 vObjectPos, vNormal, vWorldNormal; 

    varying float vCloseToGround;

    

    vec3 mix3 (vec3 v1, vec3 v2, vec3 v3, float fa){

        vec3 m; 

        fa > 0.7 ? m = mix(v2, v3, (fa - .5) * 2.) : m = mix(v1, v2, fa * 2.);

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

interface AnimatedTreeProps {
  treeModelPath?: string;
  noiseTexturePath?: string;
  poleTexturePath?: string;
  position?: [number, number, number];
  scale?: number;
  enableMouseInteraction?: boolean;
}

export const AnimatedTree: React.FC<AnimatedTreeProps> = ({
  treeModelPath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/tree.glb",
  noiseTexturePath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/noise.png",
  poleTexturePath = "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/texture.jpg",
  position = [0, 0, 0],
  scale = 1,
  enableMouseInteraction = true,
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
    const leafGeometry = gltf.scene.getObjectByName("Leaf")?.geometry;

    if (!pole || !crown || !leafGeometry) {
      console.warn("Tree model missing required parts: Pole, Leaves, or Leaf");
      return null;
    }

    // Clone geometries to avoid modifying originals
    const poleClone = pole.clone();
    if (poleTexture && poleClone instanceof THREE.Mesh) {
      poleClone.material = new THREE.MeshToonMaterial({
        map: poleTexture,
      });
    }

    // Calculate bounding box for shader
    const bbox = new THREE.Box3().setFromObject(crown);
    const bboxMin = bbox.min.clone();
    const bboxSize = bbox.getSize(new THREE.Vector3());

    const leavesCount = (crown as THREE.Mesh).geometry.attributes.position
      .count;

    return {
      pole: poleClone,
      crown,
      leafGeometry,
      bboxMin,
      bboxSize,
      leavesCount,
    };
  }, [gltf.scene, poleTexture]);

  // Create shader material
  const leavesMaterial = useMemo(() => {
    if (!noiseTexture) return null;

    return new THREE.ShaderMaterial({
      lights: true,
      side: THREE.DoubleSide,
      uniforms: {
        ...THREE.UniformsLib.lights,
        uTime: { value: 0.0 },
        uColorA: { value: new THREE.Color(0xb45252) },
        uColorB: { value: new THREE.Color(0xd3a068) },
        uColorC: { value: new THREE.Color(0xede19e) },
        uBoxMin: { value: new THREE.Vector3(0, 0, 0) },
        uBoxSize: { value: new THREE.Vector3(10, 10, 10) },
        uRaycast: { value: new THREE.Vector3(0, 0, 0) },
        uNoiseMap: { value: noiseTexture },
      },
      vertexShader: leavesVS,
      fragmentShader: leavesFS,
    });
  }, [noiseTexture]);

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

    return leaves;
  }, [treeData, leavesMaterial]);

  // Dead leaves state
  const [deadID, setDeadID] = useState<number[]>([]);
  const matrix = useRef(new THREE.Matrix4());
  const dummy = useRef(new THREE.Object3D());

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
    if (!leavesMesh || !leavesMaterial || !treeData) return;

    // Update time uniform (cumulative, matching original)
    timeRef.current += 0.01;
    leavesMaterial.uniforms.uTime.value = timeRef.current;

    // Update dead leaves (falling animation)
    if (deadID.length > 0 && leavesMesh) {
      const updatedDead: number[] = [];

      deadID.forEach((i) => {
        if (i === undefined || i === null) return;

        leavesMesh.getMatrixAt(i, matrix.current);
        matrix.current.decompose(
          dummy.current.position,
          dummy.current.rotation,
          dummy.current.scale
        );

        if (dummy.current.position.y > 0) {
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
