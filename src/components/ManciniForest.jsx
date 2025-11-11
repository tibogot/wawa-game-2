import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Instance, Instances, useTexture } from "@react-three/drei";
import * as THREE from "three";

export default function Forest({
  numTrees,
  innerRadius,
  outerRadius,
  position,
  getTerrainHeight,
}) {
  const { camera } = useThree();
  const ref = useRef();

  const particles = useMemo(() => {
    return Array.from({ length: numTrees }, (_, index) => {
      const angle = (index / numTrees) * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const scale =
        2 + Math.random() * 3.5 * Math.random() * Math.random() * 2.5;

      // Calculate terrain height if getTerrainHeight is provided
      const worldX = x + position[0];
      const worldZ = z + position[2];
      const terrainHeight = getTerrainHeight
        ? getTerrainHeight(worldX, worldZ)
        : 0;

      // Calculate local Y position: terrainHeight - groupY + offset for tree bottom
      // Tree bottom should be at terrainHeight, so: position[1] + y - 2*scale = terrainHeight
      // Therefore: y = terrainHeight - position[1] + 2*scale
      const y = terrainHeight - position[1] + 2 * scale;
      return { x, y, z, scale };
    });
  }, [numTrees, innerRadius, outerRadius, position, getTerrainHeight]);

  // Load main texture
  const texture = useTexture("/textures/meye_acer-platanoides.png");

  // Improve texture quality
  texture.flipY = true;
  texture.anisotropy = 16; // Better texture quality at angles
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  useFrame(() => {
    if (ref.current) {
      const cameraPos = camera.position;
      const tempMatrix = new THREE.Matrix4();
      const tempPosition = new THREE.Vector3();
      const tempQuaternion = new THREE.Quaternion();
      const tempScale = new THREE.Vector3();

      particles.forEach((data, i) => {
        // Calculate world position of tree (accounting for group position)
        const worldX = data.x + position[0];
        const worldY = data.y + position[1];
        const worldZ = data.z + position[2];

        // Calculate direction from tree to camera (only X and Z, ignore Y)
        const dx = cameraPos.x - worldX;
        const dz = cameraPos.z - worldZ;

        // Calculate Y-axis rotation angle only (no pitch/tilt)
        const angle = Math.atan2(dx, dz);

        // Set position (local to group, Y stays fixed)
        tempPosition.set(data.x, data.y, data.z);

        // Set rotation (only Y axis)
        tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        // Set scale
        tempScale.set(data.scale, data.scale, 1);

        // Compose matrix
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

        // Update instance matrix
        ref.current.setMatrixAt(i, tempMatrix);
      });

      ref.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      <Instances
        castShadow
        receiveShadow
        ref={ref}
        limit={2000}
        frustumCulled={false}
        renderOrder={2}
      >
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial
          map={texture}
          color={0xffffff}
          transparent
          side={THREE.DoubleSide}
          depthWrite={true}
          depthTest={true}
          alphaTest={0.1}
          roughness={0.8}
          metalness={0.0}
          envMapIntensity={0.5}
          onBeforeCompile={(shader) => {
            // Inject normal map generation in fragment shader
            // Generate normals programmatically based on UV coordinates
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <normal_fragment>",
              `#include <normal_fragment>
              
              // Generate procedural normal map for 3D depth effect
              // Create a rounded/cylindrical normal effect based on UV
              vec2 uv = vUv;
              
              // Center UV coordinates (0-1 to -1 to 1)
              vec2 centeredUV = (uv - 0.5) * 2.0;
              
              // Create a radial gradient for depth (trees are thicker in center)
              float radialDist = length(centeredUV);
              float depthFactor = 1.0 - smoothstep(0.0, 0.8, radialDist);
              
              // Create vertical gradient (trees are thicker at base, thinner at top)
              float verticalGradient = 1.0 - uv.y;
              
              // Combine gradients for tree-like shape
              float normalStrength = depthFactor * verticalGradient * 0.5;
              
              // Create normal offset (pointing outward from center)
              // Handle edge case where centeredUV might be zero
              vec2 normalOffsetDir = length(centeredUV) > 0.001 ? normalize(centeredUV) : vec2(0.0, 0.0);
              vec2 normalOffset = normalOffsetDir * normalStrength;
              
              // Apply normal offset to create rounded/3D effect
              vec3 proceduralNormal = normalize(normal + vec3(normalOffset.x, 0.0, normalOffset.y));
              normal = proceduralNormal;`
            );
          }}
        />
        {particles.map((data, i) => (
          <Instance key={i} />
        ))}
      </Instances>
    </group>
  );
}
