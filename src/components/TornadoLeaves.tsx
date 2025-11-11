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
  characterPosition?: THREE.Vector3;
}

export const TornadoLeaves: React.FC<FloatingLeavesProps> = ({
  count: defaultCount = 100,
  areaSize: defaultAreaSize = 50,
  spawnHeight: defaultSpawnHeight = 20,
  leafSize: defaultLeafSize = 0.2,
  windInfluence: defaultWindInfluence = 1.0,
  gravity: defaultGravity = 0.002,
  enableLeaves: defaultEnableLeaves = false,
  useTexture: defaultUseTexture = true,
  getTerrainHeight,
  characterPosition,
}) => {
  // Internal controls
  const {
    tornadoLeavesEnabled: enabled,
    tornadoLeavesCount: count,
    tornadoLeavesRadius: tornadoRadius,
    tornadoLeavesHeight: tornadoHeight,
    tornadoLeavesRotationSpeed: tornadoRotationSpeed,
    tornadoLeavesSpiralSpeed: spiralSpeed,
    tornadoLeavesSpiralSpread: spiralSpread,
    tornadoLeavesEnableViewThickening: enableViewThickening,
    tornadoLeavesViewThickenStrength: viewThickenStrength,
    tornadoLeavesLeafSize: leafSize,
    tornadoLeavesGravity: gravity,
    tornadoLeavesUseTexture: useTexture,
    tornadoLeavesTexturePath: texturePath,
  } = useControls("🌿 FOLIAGE", {
    "🌪️ Tornado Leaves": folder(
      {
        tornadoLeavesEnabled: {
          value: defaultEnableLeaves,
          label: "Enable Tornado",
        },
        tornadoLeavesCount: {
          value: defaultCount,
          label: "Leaf Count",
          min: 10,
          max: 1000,
          step: 10,
        },
        tornadoLeavesRadius: {
          value: 3.0,
          label: "Tornado Radius",
          min: 0.5,
          max: 8.0,
          step: 0.1,
        },
        tornadoLeavesHeight: {
          value: 10,
          label: "Tornado Height",
          min: 5,
          max: 30,
          step: 1,
        },
        tornadoLeavesRotationSpeed: {
          value: 0.005,
          label: "Rotation Speed",
          min: 0.001,
          max: 0.05,
          step: 0.001,
        },
        tornadoLeavesSpiralSpeed: {
          value: 0.0001,
          label: "Spiral Movement Speed",
          min: 0.00001,
          max: 0.01,
          step: 0.00001,
        },
        tornadoLeavesSpiralSpread: {
          value: 0.15,
          label: "Spiral Spread",
          min: 0.0,
          max: 0.5,
          step: 0.01,
        },
        tornadoLeavesEnableViewThickening: {
          value: true,
          label: "Enable View Thickening",
        },
        tornadoLeavesViewThickenStrength: {
          value: 0.3,
          label: "Thickening Strength",
          min: 0.0,
          max: 1.0,
          step: 0.05,
        },
        tornadoLeavesLeafSize: {
          value: defaultLeafSize,
          label: "Leaf Size",
          min: 0.05,
          max: 1.0,
          step: 0.05,
        },
        tornadoLeavesGravity: {
          value: defaultGravity,
          label: "Gravity",
          min: 0,
          max: 0.01,
          step: 0.0005,
        },
        tornadoLeavesUseTexture: {
          value: defaultUseTexture,
          label: "Use Texture",
        },
        tornadoLeavesTexturePath: {
          value: "/textures/leaf1-tiny.png",
          label: "🌿 Leaf Texture",
          options: {
            "Leaf 1 (Default)": "/textures/leaf1-tiny.png",
            "Leaf 2": "/textures/leaf 2.jpg",
            Pngwingo: "/textures/pngwingo.png",
          },
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
    const textureToLoad = useTexture
      ? texturePath
      : "/textures/whitesquare.png";

    textureLoader.load(
      textureToLoad,
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
  }, [useTexture, texturePath]);

  // Create leaf geometry (simple plane)
  const leafGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(leafSize, leafSize);
    return geometry;
  }, [leafSize]);

  // Create leaf material with view-space thickening
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
    positions: Float32Array; // Relative to character (if characterPosition provided)
    rotations: Float32Array;
    spiralProgress: Float32Array; // Progress along spiral path (0 to 1)
    spreadOffsets: Float32Array; // Stored random spread offsets (x, y, z per leaf)
    maxAge: number;
  }

  // Store previous character position to calculate offset
  const prevCharacterPosRef = useRef<THREE.Vector3 | null>(null);
  const tornadoCenterZ = 0.0; // Centered on character
  const spiralTurns = 3; // Number of full rotations from bottom to top

  // Function to get position on spiral curve given progress (0 to 1)
  // This function is used in both initialization and update loop
  const getSpiralPosition = useMemo(() => {
    return (
      progress: number,
      radius: number,
      height: number
    ): [number, number, number] => {
      // Progress from 0 (bottom) to 1 (top)
      const clampedProgress = Math.max(0, Math.min(1, progress));

      // Height increases with progress
      const y = clampedProgress * height;

      // Angle increases with progress, creating spiral
      const angle = clampedProgress * Math.PI * 2 * spiralTurns;

      // Radius increases from bottom to top (wider at top)
      const radiusPercent = 0.3 + clampedProgress * 0.7;
      const r = radius * radiusPercent;

      // Position around tornado center (centered on character)
      const x = Math.cos(angle) * r;
      const z = tornadoCenterZ + Math.sin(angle) * r;

      return [x, y, z];
    };
  }, []);

  const leafData = useMemo(() => {
    const data: LeafData = {
      positions: new Float32Array(count * 3),
      rotations: new Float32Array(count * 3),
      spiralProgress: new Float32Array(count),
      spreadOffsets: new Float32Array(count * 3), // Store spread offsets (x, y, z)
      maxAge: 1000, // frames
    };

    // Distribute leaves evenly along the spiral path with random spread
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Each leaf starts at a different point along the spiral
      // Add random spread to progress so leaves aren't in a tight line
      const baseProgress = i / count; // 0 to 1
      const progressSpread = (Math.random() - 0.5) * spiralSpread;
      const progress = Math.max(0, Math.min(1, baseProgress + progressSpread));
      data.spiralProgress[i] = progress;

      // Calculate and store random spread offsets (done once, not every frame)
      const angle = progress * Math.PI * 2 * spiralTurns;
      const radialOffset = (Math.random() - 0.5) * spiralSpread * tornadoRadius;
      const perpendicularAngle = angle + Math.PI / 2; // 90 degrees from spiral direction

      // Store spread offsets (calculated once)
      data.spreadOffsets[i3] = Math.cos(perpendicularAngle) * radialOffset;
      data.spreadOffsets[i3 + 2] = Math.sin(perpendicularAngle) * radialOffset;
      data.spreadOffsets[i3 + 1] =
        (Math.random() - 0.5) * spiralSpread * tornadoHeight * 0.5;

      // Get base position on spiral curve
      const [baseX, baseY, baseZ] = getSpiralPosition(
        progress,
        tornadoRadius,
        tornadoHeight
      );

      // Store initial position with spread
      data.positions[i3] = baseX + data.spreadOffsets[i3];
      data.positions[i3 + 1] = baseY + data.spreadOffsets[i3 + 1];
      data.positions[i3 + 2] = baseZ + data.spreadOffsets[i3 + 2];

      // Random rotation
      data.rotations[i3] = Math.random() * Math.PI * 2;
      data.rotations[i3 + 1] = Math.random() * Math.PI * 2;
      data.rotations[i3 + 2] = Math.random() * Math.PI * 2;
    }

    // Store initial character position
    if (characterPosition) {
      prevCharacterPosRef.current = characterPosition.clone();
    }

    return data;
  }, [
    count,
    tornadoRadius,
    tornadoHeight,
    spiralSpread,
    getTerrainHeight,
    characterPosition,
  ]);

  // Update leaf positions and rotations
  useFrame(() => {
    if (!instancedMeshRef.current || !enabled) return;

    const matrix = new THREE.Matrix4();
    const worldPosition = new THREE.Vector3();
    const rotation = new THREE.Euler();

    // Get current character position (default to [0,0,0] if not provided)
    const charPos = characterPosition || new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update progress along spiral path
      // Each leaf moves slowly up the spiral
      leafData.spiralProgress[i] += spiralSpeed;

      // Wrap around when reaching top (continuous loop)
      if (leafData.spiralProgress[i] > 1) {
        leafData.spiralProgress[i] -= 1; // Loop back to bottom
      }

      // Get base position on spiral curve based on progress
      const [baseX, baseY, baseZ] = getSpiralPosition(
        leafData.spiralProgress[i],
        tornadoRadius,
        tornadoHeight
      );

      // Use stored spread offsets (calculated once, not recalculated every frame)
      // This prevents jittery/fast-looking movement
      leafData.positions[i3] = baseX + leafData.spreadOffsets[i3];
      leafData.positions[i3 + 1] = baseY + leafData.spreadOffsets[i3 + 1];
      leafData.positions[i3 + 2] = baseZ + leafData.spreadOffsets[i3 + 2];

      // Smooth rotation animation (gentle spinning - much slower)
      leafData.rotations[i3] += tornadoRotationSpeed * 0.1;
      leafData.rotations[i3 + 1] += tornadoRotationSpeed * 0.05;
      leafData.rotations[i3 + 2] += tornadoRotationSpeed * 0.1;

      // Wind effect - adds subtle variation to rotation
      if (windUniforms) {
        const windStrength = windUniforms.u_windNoiseAmplitude.value;
        const windSpeed = windUniforms.u_windNoiseSpeed.value;
        const time = windUniforms.u_time.value;

        // Very subtle wind effect
        const windRotation =
          Math.sin(time * windSpeed + i * 0.1) * windStrength * 0.0002;
        leafData.rotations[i3] += windRotation;
        leafData.rotations[i3 + 1] += windRotation * 0.5;
        leafData.rotations[i3 + 2] += windRotation;
      }

      // Calculate world position for rendering
      const worldX = charPos.x + leafData.positions[i3];
      const worldY = charPos.y + leafData.positions[i3 + 1];
      const worldZ = charPos.z + leafData.positions[i3 + 2];

      // Set instance matrix using world position
      worldPosition.set(worldX, worldY, worldZ);
      rotation.set(
        leafData.rotations[i3],
        leafData.rotations[i3 + 1],
        leafData.rotations[i3 + 2]
      );

      matrix.compose(
        worldPosition,
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

export default TornadoLeaves;
