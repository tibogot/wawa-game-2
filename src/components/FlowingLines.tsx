/**
 * FlowingLines Component
 *
 * Creates smooth, animated flowing ribbons that follow terrain contours.
 * Based on the original CodePen implementation with terrain integration.
 *
 * Key Implementation Details:
 * - PlaneGeometry(length, width, segments, 1) creates (segments+1) * 2 vertices
 * - Top and bottom vertex rows share same X/Z positions (synchronized movement)
 * - Vertex indexing uses modulo to ensure consistent path calculation
 * - Queries terrain height at each X/Z position like DynamicLeaves3
 * - Local geometry updates only (no world transform changes)
 */
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFlowingLinesControls } from "./useFlowingLinesControls";

interface FlowingLinesProps {
  getTerrainHeight: (x: number, z: number) => number;
}

interface LineData {
  mesh: THREE.Mesh;
  pos: THREE.BufferAttribute;
  rnda: number;
  rndb: number;
  rndc: number;
  rndd: number;
}

export const FlowingLines: React.FC<FlowingLinesProps> = ({
  getTerrainHeight,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const linesDataRef = useRef<LineData[]>([]);
  const [linesMeshes, setLinesMeshes] = React.useState<THREE.Mesh[]>([]);

  // Get controls
  const {
    enabled,
    lineCount,
    lineLength,
    lineWidth,
    heightOffset,
    verticalWave,
    animationSpeed,
    pathRadius,
    pathFrequency,
    lineColor,
    lineOpacity,
    segments,
    boundaryRadius,
  } = useFlowingLinesControls();

  // Create gradient texture for the lines
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 8;

    const context = canvas.getContext("2d");
    if (!context) return null;

    const gradient = context.createLinearGradient(0, 0, 64, 0);
    gradient.addColorStop(0.0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.6)");
    gradient.addColorStop(1.0, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 8);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Create material with color and opacity from controls
  const lineMaterial = useMemo(() => {
    if (!gradientTexture) return null;

    return new THREE.MeshBasicMaterial({
      map: gradientTexture,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      color: lineColor,
      opacity: lineOpacity,
    });
  }, [gradientTexture, lineColor, lineOpacity]);

  // Create lines when controls change
  useEffect(() => {
    if (!enabled) {
      console.log(
        "🌊 FlowingLines: Component is DISABLED. Enable in Leva controls."
      );
      return;
    }

    if (!groupRef.current || !lineMaterial) return;

    console.log(`🌊 Creating ${lineCount} flowing lines...`);

    // Clear existing lines
    linesDataRef.current = [];
    setLinesMeshes([]);

    // Create new lines with stable geometry
    const newLines: LineData[] = [];
    for (let i = 0; i < lineCount; i++) {
      // Create plane geometry - segments defines the subdivision along the line path
      // This creates (segments + 1) * 2 vertices total
      const geometry = new THREE.PlaneGeometry(
        lineLength,
        lineWidth,
        segments,
        1
      );
      const mesh = new THREE.Mesh(geometry, lineMaterial);

      // Disable frustum culling to ensure lines are always rendered
      mesh.frustumCulled = false;
      mesh.renderOrder = 999; // Render on top

      // Make mesh visible
      mesh.visible = true;

      const pos = geometry.getAttribute("position") as THREE.BufferAttribute;

      // Random values for unique motion per line
      const rnda = Math.random();
      const rndb = Math.random();
      const rndc = Math.random();
      const rndd = Math.random();

      const lineData: LineData = {
        mesh,
        pos,
        rnda,
        rndb,
        rndc,
        rndd,
      };

      // CRITICAL: Initialize vertex positions before adding to scene!
      const pointsPerRow = segments + 1;
      const initialTime = 0; // Start position

      for (let vertIdx = 0; vertIdx < pos.count; vertIdx++) {
        const segmentIndex = vertIdx % pointsPerRow;
        const t = initialTime + segmentIndex / 60;

        const x = pathRadius * Math.sin(pathFrequency * rnda * t + 6 * rndb);
        const z = pathRadius * Math.cos(pathFrequency * rndc * t + 6 * rndd);
        const terrainY = getTerrainHeight(x, z);
        const waveOffset =
          verticalWave *
          (vertIdx > segments ? 1 : -1) *
          Math.cos((segmentIndex - segments / 2) / 8);
        const y = terrainY + heightOffset + waveOffset;

        pos.setXYZ(vertIdx, x, y, -z);
      }

      pos.needsUpdate = true;
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();

      newLines.push(lineData);
    }

    linesDataRef.current = newLines;
    const meshArray = newLines.map((line) => line.mesh);
    setLinesMeshes(meshArray);

    console.log(
      `✅ FlowingLines: Created ${newLines.length} lines with ${
        newLines[0]?.pos.count || 0
      } vertices each`
    );
    console.log(
      `📊 Material: color=${lineColor}, opacity=${lineOpacity}, lineLength=${lineLength}, lineWidth=${lineWidth}`
    );
    console.log(`🎨 Meshes state updated with ${meshArray.length} meshes`);

    // Cleanup function
    return () => {
      linesDataRef.current = [];
      setLinesMeshes([]);
    };
  }, [enabled, lineCount, lineLength, lineWidth, segments, lineMaterial]);

  // Animate lines - stable version with debugging
  useFrame(({ clock }) => {
    if (!enabled || linesDataRef.current.length === 0) return;

    const time = clock.getElapsedTime();
    const pointsPerRow = segments + 1; // Number of vertices per row (e.g., 21 for segments=20)

    // Debug: Log first line's first vertex position every 2 seconds
    const shouldDebug = Math.floor(time) % 2 === 0 && time % 1 < 0.1;

    // Update each line
    for (let lineIdx = 0; lineIdx < linesDataRef.current.length; lineIdx++) {
      const line = linesDataRef.current[lineIdx];
      const vertexCount = line.pos.count;

      // Update all vertices for this line
      for (let i = 0; i < vertexCount; i++) {
        // Calculate segment index (same for top and bottom rows)
        const segmentIndex = i % pointsPerRow;

        // Time calculation matching original (time is in seconds, convert to match 3000ms divisor)
        const t = (time * 1000) / (3000 / animationSpeed) + segmentIndex / 60;

        // Parametric equations for smooth flowing paths
        const x =
          pathRadius * Math.sin(pathFrequency * line.rnda * t + 6 * line.rndb);
        const z =
          pathRadius * Math.cos(pathFrequency * line.rndc * t + 6 * line.rndd);

        // Get terrain height at this X/Z position
        const terrainY = getTerrainHeight(x, z);

        // Add height offset and subtle vertical wave for ribbon effect
        // i > segments means we're on the second row (bottom vertices)
        const waveOffset =
          verticalWave *
          (i > segments ? 1 : -1) *
          Math.cos((segmentIndex - segments / 2) / 8);

        const y = terrainY + heightOffset + waveOffset;

        // Validate vertex position
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          console.error(
            `❌ Invalid vertex at line ${lineIdx}, vertex ${i}: x=${x}, y=${y}, z=${z}`
          );
          continue;
        }

        // Set vertex position (XYZ in world space, Z is negated for proper orientation)
        line.pos.setXYZ(i, x, y, -z);

        // Debug first vertex of first line
        if (shouldDebug && lineIdx === 0 && i === 0) {
          console.log(
            `🌊 Line[0] vertex[0]: x=${x.toFixed(2)}, y=${y.toFixed(
              2
            )}, z=${z.toFixed(2)}, terrainY=${terrainY.toFixed(2)}`
          );
          console.log(
            `   Mesh visible: ${line.mesh.visible}, frustumCulled: ${line.mesh.frustumCulled}`
          );
        }
      }

      line.pos.needsUpdate = true;

      // Critical: Update bounding sphere so Three.js knows where the geometry is
      line.mesh.geometry.computeBoundingSphere();
      line.mesh.geometry.computeBoundingBox();
    }
  });

  if (!enabled || !lineMaterial) return null;

  return (
    <group ref={groupRef}>
      {/* Debug sphere to verify position is visible */}
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>

      {/* Debug box at line position to verify rendering */}
      <mesh position={[10, 5, -10]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>

      {/* Test static plane with same material setup */}
      <mesh position={[-10, 5, 10]} rotation={[0, 0, 0]}>
        <planeGeometry args={[10, 5, 20, 1]} />
        <meshBasicMaterial
          map={gradientTexture}
          side={THREE.DoubleSide}
          transparent={true}
          color={lineColor}
          opacity={lineOpacity}
        />
      </mesh>

      {/* Test: render ONLY first line mesh to isolate the issue */}
      {linesMeshes.length > 0 && (
        <>
          <primitive object={linesMeshes[0]} />
          <mesh position={[0, 8, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        </>
      )}

      {/* Render remaining line meshes */}
      {linesMeshes.slice(1).map((mesh, index) => (
        <primitive key={index + 1} object={mesh} />
      ))}
    </group>
  );
};

export default FlowingLines;
