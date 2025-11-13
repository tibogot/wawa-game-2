import React, { useMemo, useRef } from "react";
import FakeGlowMaterial from "./FakeGlowMaterial";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FloorDebugSpheresGlowProps {
  heightmapLookup: ((x: number, z: number) => number) | null;
  enabled?: boolean;
  gridSize?: number;
  areaSize?: number;
  sphereSize?: number;
  sphereColor?: string;
  emissiveIntensity?: number;
  useRandomColors?: boolean;
}

export const FloorDebugSpheresGlow = ({
  heightmapLookup,
  enabled = true,
  gridSize = 15,
  areaSize = 500,
  sphereSize = 3,
  sphereColor = "#00ff00",
  emissiveIntensity = 0.8,
  useRandomColors = true,
}: FloorDebugSpheresGlowProps) => {
  // Generate sphere positions and random colors using heightmap lookup
  const spheres = useMemo(() => {
    if (!enabled || !heightmapLookup) {
      console.log(
        "🔴 FloorDebugSpheresGlow: Not enabled or no heightmapLookup",
        { enabled, hasHeightmap: !!heightmapLookup }
      );
      return [];
    }

    // Helper function to generate random hex color
    const getRandomColor = () => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    };

    const sphereData: Array<{
      position: [number, number, number];
      color: string;
    }> = [];
    const halfGrid = Math.floor(gridSize / 2);
    const spacing = areaSize / gridSize;

    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        const worldX = x * spacing;
        const worldZ = z * spacing;

        // Use heightmap lookup to get terrain height
        const terrainHeight = heightmapLookup(worldX, worldZ);

        // Position sphere center at terrain height (half on ground, half buried)
        // Use random color or single color based on toggle
        const color = useRandomColors ? getRandomColor() : sphereColor;
        sphereData.push({
          position: [worldX, terrainHeight, worldZ],
          color: color,
        });
      }
    }

    // Log first few colors for debugging
    const sampleColors = sphereData.slice(0, 5).map((s) => s.color);
    const colorMode = useRandomColors ? "random colors" : "single color";
    console.log(
      `✅ FloorDebugSpheresGlow: Generated ${sphereData.length} spheres with ${colorMode}`,
      useRandomColors
        ? `Sample colors: ${sampleColors.join(", ")}`
        : `Color: ${sphereColor}`
    );
    return sphereData;
  }, [
    enabled,
    heightmapLookup,
    gridSize,
    areaSize,
    useRandomColors,
    sphereColor,
  ]);

  if (!enabled || !heightmapLookup || spheres.length === 0) {
    return null;
  }

  return (
    <group>
      {spheres.map((sphere, index) => (
        <GlowSphere
          key={`sphere-${index}-${sphere.color}`}
          position={sphere.position}
          color={sphere.color}
          sphereSize={sphereSize}
          emissiveIntensity={emissiveIntensity}
        />
      ))}
    </group>
  );
};

// Individual sphere component that updates the material uniform
const GlowSphere = ({
  position,
  color,
  sphereSize,
  emissiveIntensity,
}: {
  position: [number, number, number];
  color: string;
  sphereSize: number;
  emissiveIntensity: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorRef = useRef(new THREE.Color(color));

  // Update color ref when color prop changes
  React.useEffect(() => {
    colorRef.current.set(color);
  }, [color]);

  // Update the glowColor uniform every frame to ensure it's set correctly
  useFrame(() => {
    if (meshRef.current?.material) {
      const material = meshRef.current.material as any;
      if (material.uniforms && material.uniforms.glowColor) {
        // Update the color uniform - it's a THREE.Color object
        material.uniforms.glowColor.value.copy(colorRef.current);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      castShadow={false}
      receiveShadow={false}
    >
      <sphereGeometry args={[sphereSize, 16, 16]} />
      <FakeGlowMaterial
        glowColor={color}
        opacity={emissiveIntensity}
        falloff={0.2}
        glowInternalRadius={0.7}
        glowSharpness={1.0}
        side="THREE.DoubleSide"
        depthTest={true}
      />
    </mesh>
  );
};
