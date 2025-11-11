import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useControls, folder } from "leva";
import * as THREE from "three";
import { useGlobalWind } from "./GlobalWindProvider";

interface FloatingLeavesProps {
  count?: number;
  areaSize?: number;
  spawnHeight?: number;
  leafSize?: number;
  windInfluence?: number;
  gravity?: number;
  enableLeaves?: boolean;
  useTexture?: boolean;
  getTerrainHeight?: (x: number, z: number) => number;
}

export const FloatingLeaves: React.FC<FloatingLeavesProps> = ({
  count: defaultCount = 100,
  areaSize: defaultAreaSize = 50,
  spawnHeight: defaultSpawnHeight = 20,
  leafSize: defaultLeafSize = 0.2,
  windInfluence: defaultWindInfluence = 1.0,
  gravity: defaultGravity = 0.002,
  enableLeaves: defaultEnableLeaves = false,
  useTexture: defaultUseTexture = true,
  getTerrainHeight,
}) => {
  // Internal controls
  const {
    floatingLeavesEnabled: enabled,
    floatingLeavesCount: count,
    floatingLeavesAreaSize: areaSize,
    floatingLeavesSpawnHeight: spawnHeight,
    floatingLeavesLeafSize: leafSize,
    floatingLeavesWindInfluence: windInfluence,
    floatingLeavesGravity: gravity,
    floatingLeavesUseTexture: useTexture,
    floatingLeavesEnableViewThickening: enableViewThickening,
    floatingLeavesViewThickenStrength: viewThickenStrength,
  } = useControls("🌿 FOLIAGE", {
    "🍂 Floating Leaves": folder(
      {
        floatingLeavesEnabled: {
          value: defaultEnableLeaves,
          label: "Enable Leaves",
        },
        floatingLeavesCount: {
          value: defaultCount,
          label: "Count",
          min: 10,
          max: 500,
          step: 10,
        },
        floatingLeavesAreaSize: {
          value: defaultAreaSize,
          label: "Area Size",
          min: 10,
          max: 200,
          step: 10,
        },
        floatingLeavesSpawnHeight: {
          value: defaultSpawnHeight,
          label: "Spawn Height",
          min: 5,
          max: 100,
          step: 5,
        },
        floatingLeavesLeafSize: {
          value: defaultLeafSize,
          label: "Leaf Size",
          min: 0.05,
          max: 1.0,
          step: 0.05,
        },
        floatingLeavesWindInfluence: {
          value: defaultWindInfluence,
          label: "Wind Influence",
          min: 0,
          max: 3,
          step: 0.1,
        },
        floatingLeavesGravity: {
          value: defaultGravity,
          label: "Gravity",
          min: 0,
          max: 0.01,
          step: 0.0005,
        },
        floatingLeavesUseTexture: {
          value: defaultUseTexture,
          label: "Use Texture",
        },
        floatingLeavesEnableViewThickening: {
          value: true,
          label: "Enable View Thickening",
        },
        floatingLeavesViewThickenStrength: {
          value: 0.3,
          label: "Thickening Strength",
          min: 0.0,
          max: 1.0,
          step: 0.05,
        },
      },
      { collapsed: true }
    ),
  });
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const { windUniforms } = useGlobalWind();

  // Load leaf texture manually
  const [leafTexture, setLeafTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const texturePath = useTexture
      ? "/textures/leaf1-tiny.png"
      : "/textures/whitesquare.png";

    textureLoader.load(
      texturePath,
      (texture) => {
        // High quality texture settings
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 16;
        texture.flipY = false;
        setLeafTexture(texture);
      },
      undefined,
      (error) => {
        console.warn("Failed to load leaf texture:", error);
        // Create a fallback white texture
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 256, 256);
          const fallbackTexture = new THREE.CanvasTexture(canvas);
          fallbackTexture.minFilter = THREE.LinearMipmapLinearFilter;
          fallbackTexture.magFilter = THREE.LinearFilter;
          fallbackTexture.generateMipmaps = true;
          fallbackTexture.anisotropy = 16;
          setLeafTexture(fallbackTexture);
        }
      }
    );
  }, [useTexture]);

  // Create leaf geometry (simple plane)
  const leafGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(leafSize, leafSize);
    return geometry;
  }, [leafSize]);

  // Create leaf material
  const leafMaterial = useMemo(() => {
    // Create a fallback white texture if none loaded
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    let fallbackTexture;
    if (ctx) {
      ctx.fillStyle = "#ff6b35"; // Orange fallback color
      ctx.fillRect(0, 0, 256, 256);
      fallbackTexture = new THREE.CanvasTexture(canvas);
      fallbackTexture.minFilter = THREE.LinearMipmapLinearFilter;
      fallbackTexture.magFilter = THREE.LinearFilter;
      fallbackTexture.generateMipmaps = true;
      fallbackTexture.anisotropy = 16;
    } else {
      fallbackTexture = new THREE.TextureLoader().load(
        "/textures/whitesquare.png"
      );
    }

    const material = new THREE.MeshStandardMaterial({
      map: leafTexture || fallbackTexture,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    });

    // Add view-space thickening shader effect
    if (enableViewThickening) {
      material.onBeforeCompile = (shader) => {
        // Inject view-space thickening code
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `
          #include <begin_vertex>
          
          // View-space thickening: Prevents leaves from disappearing when viewed edge-on
          // Calculate instance world position (for instanced meshes)
          vec3 instanceLocalPos = vec3(instanceMatrix[3].xyz);
          vec4 instancePosWorld = modelMatrix * vec4(instanceLocalPos, 1.0);
          vec3 instanceWorldPos = instancePosWorld.xyz;
          
          // Get camera position in world space
          vec3 camPos = (inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          
          // Get view direction from camera to leaf
          vec3 viewDir = normalize(camPos - instanceWorldPos);
          
          // Leaf face normal in world space (transform from instance matrix)
          // For a plane, the normal is along the Z axis in local space
          vec3 leafNormalLocal = vec3(0.0, 0.0, 1.0);
          vec3 leafNormal = normalize((modelMatrix * instanceMatrix * vec4(leafNormalLocal, 0.0)).xyz);
          
          // Calculate how edge-on we're viewing the leaf
          float viewDotNormal = abs(dot(viewDir, leafNormal));
          
          // Thickening factor: high when edge-on (low dot), low when facing camera
          float thickenFactor = pow(1.0 - viewDotNormal, 2.0);
          
          // Apply smoothing to avoid visual artifacts
          thickenFactor *= smoothstep(0.0, 0.3, viewDotNormal);
          
          // Apply thickening by pushing vertices outward along the normal
          vec3 offset = leafNormal * thickenFactor * ${viewThickenStrength.toFixed(
            2
          )} * ${leafSize.toFixed(2)} * 0.5;
          transformed += offset;
          `
        );
      };
    }

    return material;
  }, [
    leafTexture,
    useTexture,
    enableViewThickening,
    viewThickenStrength,
    leafSize,
  ]);

  // Update material when texture loads
  useEffect(() => {
    if (leafMaterial && leafTexture) {
      leafMaterial.map = leafTexture;
      leafMaterial.needsUpdate = true;
    }
  }, [leafMaterial, leafTexture]);

  // Initialize leaf positions and properties
  interface LeafData {
    positions: Float32Array;
    rotations: Float32Array;
    velocities: Float32Array;
    ages: Float32Array;
    maxAge: number;
  }

  const leafData = useMemo(() => {
    const data: LeafData = {
      positions: new Float32Array(count * 3),
      rotations: new Float32Array(count * 3),
      velocities: new Float32Array(count * 3),
      ages: new Float32Array(count),
      maxAge: 1000, // frames
    };

    // Initialize random positions
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Random position in area
      const x = (Math.random() - 0.5) * areaSize;
      const z = (Math.random() - 0.5) * areaSize;

      data.positions[i3] = x;
      // Use terrain height if available, otherwise use fixed height
      data.positions[i3 + 1] = getTerrainHeight
        ? getTerrainHeight(x, z) + Math.random() * spawnHeight + 5
        : Math.random() * spawnHeight + 5;
      data.positions[i3 + 2] = z;

      // Random rotation
      data.rotations[i3] = Math.random() * Math.PI * 2;
      data.rotations[i3 + 1] = Math.random() * Math.PI * 2;
      data.rotations[i3 + 2] = Math.random() * Math.PI * 2;

      // Random velocity
      data.velocities[i3] = (Math.random() - 0.5) * 0.01;
      data.velocities[i3 + 1] = -Math.random() * 0.005;
      data.velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

      // Random age
      data.ages[i] = Math.random() * data.maxAge;
    }

    return data;
  }, [count, areaSize, spawnHeight, getTerrainHeight]);

  // Update leaf positions and rotations
  useFrame(() => {
    if (!instancedMeshRef.current || !enabled) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update age
      leafData.ages[i]++;

      // Respawn if too old
      if (leafData.ages[i] > leafData.maxAge) {
        leafData.ages[i] = 0;
        const respawnX = (Math.random() - 0.5) * areaSize;
        const respawnZ = (Math.random() - 0.5) * areaSize;
        leafData.positions[i3] = respawnX;
        // Use terrain height if available
        leafData.positions[i3 + 1] = getTerrainHeight
          ? getTerrainHeight(respawnX, respawnZ) +
            spawnHeight +
            Math.random() * 5
          : spawnHeight;
        leafData.positions[i3 + 2] = respawnZ;
        leafData.velocities[i3] = (Math.random() - 0.5) * 0.01;
        leafData.velocities[i3 + 1] = -Math.random() * 0.005;
        leafData.velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
      }

      // Apply gravity
      leafData.velocities[i3 + 1] -= gravity;

      // Apply air resistance (terminal velocity)
      const terminalVelocity = 0.02;
      if (Math.abs(leafData.velocities[i3 + 1]) > terminalVelocity) {
        leafData.velocities[i3 + 1] =
          Math.sign(leafData.velocities[i3 + 1]) * terminalVelocity;
      }

      // Apply horizontal air resistance
      leafData.velocities[i3] *= 0.99;
      leafData.velocities[i3 + 2] *= 0.99;

      // Apply wind (from global wind system)
      if (windUniforms) {
        const windStrength =
          windUniforms.u_windNoiseAmplitude.value * windInfluence;
        const windSpeed = windUniforms.u_windNoiseSpeed.value;
        const time = windUniforms.u_time.value;

        // Simple wind effect
        const windX =
          Math.sin(time * windSpeed + leafData.positions[i3] * 0.1) *
          windStrength *
          0.01;
        const windZ =
          Math.cos(time * windSpeed + leafData.positions[i3 + 2] * 0.1) *
          windStrength *
          0.01;

        leafData.velocities[i3] += windX;
        leafData.velocities[i3 + 2] += windZ;
      }

      // Update position
      leafData.positions[i3] += leafData.velocities[i3];
      leafData.positions[i3 + 1] += leafData.velocities[i3 + 1];
      leafData.positions[i3 + 2] += leafData.velocities[i3 + 2];

      // Prevent leaves from falling below terrain
      if (getTerrainHeight) {
        const terrainHeight = getTerrainHeight(
          leafData.positions[i3],
          leafData.positions[i3 + 2]
        );
        if (leafData.positions[i3 + 1] < terrainHeight + 2) {
          leafData.positions[i3 + 1] = terrainHeight + 2 + Math.random() * 2;
          // Give it a small upward velocity
          leafData.velocities[i3 + 1] =
            Math.abs(leafData.velocities[i3 + 1]) * 0.5;
        }
      }

      // Update rotation - smoother, slower rotation
      // Use a small constant rotation speed with subtle velocity influence
      const rotationSpeed = 0.001; // Base rotation speed
      leafData.rotations[i3] += rotationSpeed + leafData.velocities[i3] * 0.5;
      leafData.rotations[i3 + 1] +=
        rotationSpeed * 0.5 + leafData.velocities[i3 + 1] * 0.2;
      leafData.rotations[i3 + 2] +=
        rotationSpeed + leafData.velocities[i3 + 2] * 0.5;

      // Set instance matrix
      position.set(
        leafData.positions[i3],
        leafData.positions[i3 + 1],
        leafData.positions[i3 + 2]
      );
      rotation.set(
        leafData.rotations[i3],
        leafData.rotations[i3 + 1],
        leafData.rotations[i3 + 2]
      );

      matrix.compose(
        position,
        new THREE.Quaternion().setFromEuler(rotation),
        new THREE.Vector3(1, 1, 1)
      );
      instancedMeshRef.current.setMatrixAt(i, matrix);
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[leafGeometry, leafMaterial, count]}
      frustumCulled={false}
      castShadow
    />
  );
};

export default FloatingLeaves;
