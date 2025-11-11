import React, { useRef, useMemo } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Create a placeholder texture with actual image data
const createPlaceholderTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// Create the custom shader material
const LeafMaterial = shaderMaterial(
  // Uniforms
  {
    tMap: createPlaceholderTexture(),
    uColor: new THREE.Color("#ffc219"),
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec4 vMVPos;
    varying vec4 vWorldPosition;

    void main() {
      vUv = uv;
      vec3 pos = position;
      float dist = pow(length(vUv - 0.5), 2.0) - 0.25;
      pos.z += dist * 0.5;
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos;
      vMVPos = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * vMVPos;
    }
  `,
  // Fragment Shader
  `
    precision highp float;

    uniform sampler2D tMap;
    uniform vec3 uColor;

    varying vec2 vUv;
    varying vec4 vMVPos;

    void main() {
      float alpha = texture2D(tMap, vUv).g;

      vec3 color = uColor + vMVPos.xzy * 0.05;

      float dist = length(vMVPos);
      float fog = smoothstep(5.0, 10.0, dist);
      color = mix(color, vec3(1.0), fog);

      gl_FragColor.rgb = color;
      gl_FragColor.a = alpha;
      if (alpha < 0.01) discard;
    }
  `,
  // Material configuration
  (material) => {
    material.transparent = true;
    material.side = THREE.DoubleSide;
    material.castShadow = true;
    material.receiveShadow = true;
  }
);

// Create custom shadow material that respects alpha
const LeafShadowMaterial = shaderMaterial(
  {
    tMap: createPlaceholderTexture(),
  },
  // Vertex Shader (same as main material)
  `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec3 pos = position;
      float dist = pow(length(vUv - 0.5), 2.0) - 0.25;
      pos.z += dist * 0.5;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader - only for shadow casting, discards based on alpha
  `
    precision highp float;
    uniform sampler2D tMap;
    varying vec2 vUv;

    void main() {
      float alpha = texture2D(tMap, vUv).g;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  `,
  (material) => {
    material.transparent = true;
    material.side = THREE.DoubleSide;
  }
);

// Store the class before extending (needed for instantiation)
const LeafShadowMaterialClass = LeafShadowMaterial;

// Extend R3F with our custom materials
extend({ LeafMaterial, LeafShadowMaterial });

// Single Leaf Component
const Leaf = ({
  position,
  rotation,
  scale,
  speed,
  texture,
  getTerrainHeight,
}) => {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.05;
      meshRef.current.rotation.z += 0.05;
      meshRef.current.position.y -= 0.02 * speed;

      // Reset position when leaf falls below threshold
      // If terrain height is available, reset relative to terrain
      if (getTerrainHeight) {
        const terrainHeight = getTerrainHeight(
          meshRef.current.position.x,
          meshRef.current.position.z
        );
        if (meshRef.current.position.y < terrainHeight - 3) {
          meshRef.current.position.y = terrainHeight + 3;
        }
      } else {
        // Fallback to original behavior
        if (meshRef.current.position.y < -3) {
          meshRef.current.position.y += 6;
        }
      }
    }
  });

  // Create custom depth material for shadows that respects alpha
  const customDepthMaterial = React.useMemo(() => {
    const material = new LeafShadowMaterialClass();
    return material;
  }, []);

  // Update texture when it's ready
  React.useEffect(() => {
    if (texture && customDepthMaterial) {
      // Check if texture is loaded and has image data before assigning
      const isTextureReady =
        texture instanceof THREE.Texture &&
        texture.image &&
        texture.image.width > 0 &&
        texture.image.height > 0;

      if (isTextureReady) {
        customDepthMaterial.uniforms.tMap.value = texture;
        customDepthMaterial.needsUpdate = true;
      }
    }
  }, [texture, customDepthMaterial]);

  // Update main material texture when it's ready
  React.useEffect(() => {
    if (meshRef.current && texture) {
      const isTextureReady =
        texture instanceof THREE.Texture &&
        texture.image &&
        texture.image.width > 0 &&
        texture.image.height > 0;

      if (
        isTextureReady &&
        meshRef.current.material &&
        meshRef.current.material.uniforms
      ) {
        meshRef.current.material.uniforms.tMap.value = texture;
        meshRef.current.material.needsUpdate = true;
      }
    }
  }, [texture]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
      customDepthMaterial={customDepthMaterial}
    >
      <planeGeometry args={[1, 1, 10, 10]} />
      <leafMaterial />
    </mesh>
  );
};

// Main Component
const FallingLeaves = ({
  leafTexture = "/textures/leaf 2.jpg",
  leafColor = "#ffc219",
  count = 50,
  rotationSpeed = 0.015,
  spawnAreaSize = 3,
  spawnHeightMin = -3,
  spawnHeightMax = 3,
  spawnCenter = [0, 0, 0],
  getTerrainHeight,
}) => {
  const groupRef = useRef();

  // Load texture
  const texture = useTexture(leafTexture);

  // Check if texture is ready
  const isTextureReady = React.useMemo(() => {
    if (!texture) return false;
    if (!(texture instanceof THREE.Texture)) return false;
    if (!texture.image) return false;
    // Check if texture has valid image data
    return texture.image.width > 0 && texture.image.height > 0;
  }, [texture]);

  // Generate leaf data only once
  const leaves = useMemo(() => {
    const heightRange = spawnHeightMax - spawnHeightMin;
    return Array.from({ length: count }, () => {
      const x = spawnCenter[0] + (Math.random() - 0.5) * spawnAreaSize * 2;
      const z = spawnCenter[2] + (Math.random() - 0.5) * spawnAreaSize * 2;
      // Get terrain height at this position if available
      const terrainHeight = getTerrainHeight ? getTerrainHeight(x, z) : 0;
      const y =
        spawnCenter[1] +
        terrainHeight +
        spawnHeightMin +
        Math.random() * heightRange;

      return {
        position: [x, y, z],
        rotation: [
          0,
          (Math.random() - 0.5) * 6.28,
          (Math.random() - 0.5) * 6.28,
        ],
        scale: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 1.5 + 0.2,
      };
    });
  }, [
    count,
    spawnAreaSize,
    spawnHeightMin,
    spawnHeightMax,
    spawnCenter,
    getTerrainHeight,
  ]);

  // Update color and texture uniforms
  React.useEffect(() => {
    if (groupRef.current && texture && isTextureReady) {
      // Use a small delay to ensure all new leaves are mounted
      const timeoutId = setTimeout(() => {
        if (groupRef.current) {
          groupRef.current.children.forEach((child) => {
            if (child.material && child.material.uniforms) {
              child.material.uniforms.uColor.value = new THREE.Color(leafColor);
              child.material.uniforms.tMap.value = texture;
              child.material.needsUpdate = true;
            }
            // Also update custom depth material if it exists
            if (
              child.customDepthMaterial &&
              child.customDepthMaterial.uniforms
            ) {
              child.customDepthMaterial.uniforms.tMap.value = texture;
              child.customDepthMaterial.needsUpdate = true;
            }
          });
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [
    leafColor,
    texture,
    isTextureReady,
    count,
    spawnAreaSize,
    spawnHeightMin,
    spawnHeightMax,
    spawnCenter,
  ]);

  // Rotate entire group
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  // Don't render until texture is ready
  if (!isTextureReady) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {leaves.map((leaf, i) => (
        <Leaf
          key={i}
          position={leaf.position}
          rotation={leaf.rotation}
          scale={leaf.scale}
          speed={leaf.speed}
          texture={texture}
          getTerrainHeight={getTerrainHeight}
        />
      ))}
    </group>
  );
};

export default FallingLeaves;

/* <FallingLeaves 
    leafTexture="/path/to/your/leaf.jpg"
    leafColor="#ff8c00"
    count={50}
  /> */
