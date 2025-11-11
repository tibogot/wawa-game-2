import React, { useRef, useMemo } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Create the custom shader material
const LeafMaterial = shaderMaterial(
  // Uniforms
  {
    tMap: new THREE.Texture(),
    uColor: new THREE.Color("#ffc219"),
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec4 vMVPos;

    void main() {
      vUv = uv;
      vec3 pos = position;
      float dist = pow(length(vUv - 0.5), 2.0) - 0.25;
      pos.z += dist * 0.5;
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
  }
);

// Extend R3F with our custom material
extend({ LeafMaterial });

// Single Leaf Component
const Leaf = ({ position, rotation, scale, speed }) => {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.05;
      meshRef.current.rotation.z += 0.05;
      meshRef.current.position.y -= 0.02 * speed;

      // Reset position when leaf falls below threshold
      if (meshRef.current.position.y < -3) {
        meshRef.current.position.y += 6;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
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
}) => {
  const groupRef = useRef();

  // Load texture
  const texture = useTexture(leafTexture);

  // Generate leaf data only once
  const leaves = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
      ],
      rotation: [0, (Math.random() - 0.5) * 6.28, (Math.random() - 0.5) * 6.28],
      scale: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 1.5 + 0.2,
    }));
  }, [count]);

  // Update color uniform
  React.useEffect(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child) => {
        if (child.material && child.material.uniforms) {
          child.material.uniforms.uColor.value = new THREE.Color(leafColor);
          child.material.uniforms.tMap.value = texture;
        }
      });
    }
  }, [leafColor, texture]);

  // Rotate entire group
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {leaves.map((leaf, i) => (
        <Leaf
          key={i}
          position={leaf.position}
          rotation={leaf.rotation}
          scale={leaf.scale}
          speed={leaf.speed}
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
