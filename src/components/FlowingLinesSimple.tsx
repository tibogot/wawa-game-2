/**
 * FlowingLinesSimple - Direct port of the CodePen example
 * https://discourse.threejs.org/t/creating-white-breezy-effect-seeking-guidance-and-insights/55552
 */
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FlowingLinesSimpleProps {
  enabled?: boolean;
  lineCount?: number;
  lineLength?: number;
  lineWidth?: number;
  heightOffset?: number;
  verticalWave?: number;
  animationSpeed?: number;
  pathRadius?: number;
  pathFrequency?: number;
  lineColor?: string;
  lineOpacity?: number;
  segments?: number;
  boundaryRadius?: number;
  getTerrainHeight?: (x: number, z: number) => number;
}

export const FlowingLinesSimple: React.FC<FlowingLinesSimpleProps> = ({
  enabled = true,
  lineCount = 10,
  lineLength = 10.0,
  lineWidth = 5.0,
  heightOffset = 5.0,
  verticalWave = 0.04,
  animationSpeed = 1.0,
  pathRadius = 20.0,
  pathFrequency = 5.0,
  lineColor = "#ffffff",
  lineOpacity = 1.0,
  segments = 20,
  boundaryRadius = 1000,
  getTerrainHeight,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<any[]>([]);

  // Create gradient texture with color support
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 8;
    const context = canvas.getContext("2d")!;

    // Convert hex color to RGB
    const hex = lineColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const gradient = context.createLinearGradient(0, 0, 64, 0);
    const alpha = Math.round(lineOpacity * 255);
    gradient.addColorStop(0.0, `rgba(${r},${g},${b},0)`);
    gradient.addColorStop(0.5, `rgba(${r},${g},${b},${alpha})`);
    gradient.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [lineColor, lineOpacity]);

  // Create lines (exactly like CodePen)
  useEffect(() => {
    if (!enabled || !groupRef.current) return;

    console.log("🌊 Creating lines...");

    // Clear old lines
    linesRef.current = [];
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    // Create lines
    const lines: THREE.Mesh[] = [];
    for (let i = 0; i < lineCount; i++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(lineLength, lineWidth, segments, 1),
        new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        })
      );

      line.frustumCulled = false; // Prevent culling

      // Store additional data on the mesh (like CodePen)
      (line as any).pos = line.geometry.getAttribute("position");
      (line as any).rnda = Math.random();
      (line as any).rndb = Math.random();
      (line as any).rndc = Math.random();
      (line as any).rndd = Math.random();
      // Store initial world position for terrain lookup
      (line as any).worldX = (Math.random() - 0.5) * boundaryRadius * 2;
      (line as any).worldZ = (Math.random() - 0.5) * boundaryRadius * 2;

      lines.push(line);
      groupRef.current.add(line);
    }

    linesRef.current = lines;
    console.log(`✅ Created ${lines.length} lines`);
  }, [
    enabled,
    lineCount,
    lineLength,
    lineWidth,
    segments,
    texture,
    boundaryRadius,
  ]);

  // Animation loop (exactly like CodePen flowLine function)
  useFrame(({ clock }) => {
    if (!enabled || linesRef.current.length === 0 || !getTerrainHeight) return;

    const t = clock.getElapsedTime() * 1000 * animationSpeed; // Convert to milliseconds and apply speed

    for (const line of linesRef.current) {
      const time = t / 3000;
      const pos = (line as any).pos;
      const rnda = (line as any).rnda;
      const rndb = (line as any).rndb;
      const rndc = (line as any).rndc;
      const rndd = (line as any).rndd;
      const baseX = (line as any).worldX;
      const baseZ = (line as any).worldZ;

      const vertexCount = (segments + 1) * 2; // (segments + 1) vertices per row, 2 rows
      const segmentsPerRow = segments + 1;

      // Loop through all vertices
      for (let i = 0; i < vertexCount; i++) {
        const vertTime = time + (i % segmentsPerRow) / 60;
        // Calculate position using pathRadius and pathFrequency
        const localX =
          pathRadius * Math.sin(pathFrequency * rnda * vertTime + 6 * rndb);
        const localZ =
          pathRadius * Math.cos(pathFrequency * rndc * vertTime + 6 * rndd);

        // Calculate world position for terrain lookup
        const worldX = baseX + localX;
        const worldZ = baseZ + localZ;

        // Get terrain height at this position
        const terrainHeight = getTerrainHeight(worldX, worldZ);

        // Calculate height with offset and vertical wave
        const verticalWaveOffset =
          verticalWave *
          (i > segments ? 1 : -1) *
          Math.cos(((i % segmentsPerRow) - segmentsPerRow / 2) / 8);
        const y = terrainHeight + heightOffset + verticalWaveOffset;
        const x = localX;
        const z = localZ;

        // Set vertex position (note: x, z, -y to match CodePen orientation, but we want y up)
        pos.setXYZ(i, x, y, -z);
      }

      pos.needsUpdate = true;
    }
  });

  if (!enabled) return null;

  return <group ref={groupRef} />;
};

export default FlowingLinesSimple;
