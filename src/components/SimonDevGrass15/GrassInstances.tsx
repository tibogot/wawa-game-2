import { useEffect, RefObject, useState, useRef } from "react";
import * as THREE from "three";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";

interface GrassInstancesProps {
  instancedMeshRef: RefObject<InstancedMesh2 | null>;
  grassGeometry: THREE.BufferGeometry;
  grassMaterial: THREE.Material;
  grassScale: number;
  useFloat16: boolean;
  getGroundHeight?: (x: number, z: number) => number;
  setMeshReady: (ready: boolean) => void;
}

/**
 * GrassInstances - Instance Creation and Management Logic
 *
 * Extracted from SimonDevGrass14Simple to separate concerns
 * Contains instance creation logic, Float16/Float32 handling, and performance calculations
 */
export const useGrassInstances = ({
  instancedMeshRef,
  grassGeometry,
  grassMaterial,
  grassScale,
  useFloat16,
  getGroundHeight,
  setMeshReady,
}: GrassInstancesProps) => {
  const isCreatingGrassRef = useRef<boolean>(false);

  // Main grass creation with per-instance randomization
  useEffect(() => {
    if (instancedMeshRef.current || isCreatingGrassRef.current) {
      return;
    }

    isCreatingGrassRef.current = true;
    console.log(
      "🌾 Creating 15-vertex Zelda-style grass with view-space thickening..."
    );

    setTimeout(() => {
      if (instancedMeshRef.current) {
        isCreatingGrassRef.current = false;
        return;
      }

      try {
        // Create InstancedMesh2
        const instancedMesh = new InstancedMesh2(
          grassGeometry.clone(),
          grassMaterial,
          {
            capacity: 2000,
            createEntities: false,
          }
        );

        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;

        console.log(
          "🌱 Creating 2000 grass instances with view-space thickening..."
        );

        const objectCount = 30000;
        const fieldSize = 20;

        // Prepare instance data arrays for Float16 conversion
        const instancePositions: number[] = [];
        const instanceRotations: number[] = [];
        const instanceScales: number[] = [];
        const instanceWindInfluences: number[] = []; // Add wind influence attribute

        // Generate all instance data first
        for (let i = 0; i < objectCount; i++) {
          // Random position in field
          const x = (Math.random() - 0.5) * fieldSize;
          const z = (Math.random() - 0.5) * fieldSize;
          const groundHeight = getGroundHeight ? getGroundHeight(x, z) : 0;

          // Random Y-axis rotation for variety
          const yRotation = Math.random() * Math.PI * 2;

          // Random curve variation: add slight X-axis rotation to vary the curve direction
          const curveVariation = (Math.random() - 0.5) * 0.3;

          // Random lean angle for more natural variation
          const leanAngle = (Math.random() - 0.5) * 0.2;

          // Combine rotations into quaternion
          const quaternion = new THREE.Quaternion();
          const euler = new THREE.Euler(curveVariation, yRotation, leanAngle);
          quaternion.setFromEuler(euler);

          // Random scale with curve amount variation - scaled down for realistic grass height
          const baseScale = grassScale * (0.3 + Math.random() * 0.4); // Reduced from 0.6-1.4 to 0.3-0.7
          const heightVariation = 0.7 + Math.random() * 0.6;
          const finalScale = baseScale * heightVariation;

          // Store instance data
          instancePositions.push(x, groundHeight, z);
          instanceRotations.push(
            quaternion.x,
            quaternion.y,
            quaternion.z,
            quaternion.w
          );
          instanceScales.push(baseScale, finalScale, baseScale);

          // Add wind influence (0.5 to 1.5 range for natural variation)
          const windInfluence = 0.5 + Math.random() * 1.0;
          instanceWindInfluences.push(windInfluence);
        }

        // Set up instanced attributes for wind influence
        if (useFloat16) {
          console.log("🔧 Converting instance data to Float16...");

          // Convert instance data to Float16
          const positionsFloat16 = new Float16Array(instancePositions);
          const rotationsFloat16 = new Float16Array(instanceRotations);
          const scalesFloat16 = new Float16Array(instanceScales);
          const windInfluencesFloat16 = new Float16Array(
            instanceWindInfluences
          );

          // Set windInfluence as an instanced attribute
          instancedMesh.geometry.setAttribute(
            "windInfluence",
            new THREE.InstancedBufferAttribute(windInfluencesFloat16 as any, 1)
          );

          // Apply Float16 instance data
          instancedMesh.addInstances(objectCount, (obj, index) => {
            const posIndex = index * 3;
            const rotIndex = index * 4;
            const scaleIndex = index * 3;

            // Set position from Float16 data
            obj.position.set(
              positionsFloat16[posIndex],
              positionsFloat16[posIndex + 1],
              positionsFloat16[posIndex + 2]
            );

            // Set rotation from Float16 data
            obj.quaternion.set(
              rotationsFloat16[rotIndex],
              rotationsFloat16[rotIndex + 1],
              rotationsFloat16[rotIndex + 2],
              rotationsFloat16[rotIndex + 3]
            );

            // Set scale from Float16 data
            obj.scale.set(
              scalesFloat16[scaleIndex],
              scalesFloat16[scaleIndex + 1],
              scalesFloat16[scaleIndex + 2]
            );

            obj.updateMatrix();
          });

          console.log(
            "✅ Instance data converted to Float16 with instanced windInfluence"
          );
        } else {
          // Set windInfluence as an instanced attribute
          instancedMesh.geometry.setAttribute(
            "windInfluence",
            new THREE.InstancedBufferAttribute(
              new Float32Array(instanceWindInfluences),
              1
            )
          );

          // Use Float32 (original method)
          instancedMesh.addInstances(objectCount, (obj, index) => {
            const posIndex = index * 3;
            const rotIndex = index * 4;
            const scaleIndex = index * 3;

            obj.position.set(
              instancePositions[posIndex],
              instancePositions[posIndex + 1],
              instancePositions[posIndex + 2]
            );

            obj.quaternion.set(
              instanceRotations[rotIndex],
              instanceRotations[rotIndex + 1],
              instanceRotations[rotIndex + 2],
              instanceRotations[rotIndex + 3]
            );

            obj.scale.set(
              instanceScales[scaleIndex],
              instanceScales[scaleIndex + 1],
              instanceScales[scaleIndex + 2]
            );

            obj.updateMatrix();
          });

          console.log("✅ Instance data set with instanced windInfluence");
        }

        instancedMeshRef.current = instancedMesh;
        isCreatingGrassRef.current = false;
        setMeshReady(true);

        // Performance info - calculate both base geometry and instance data memory
        const baseGeometryBytes = useFloat16 ? 15 * 3 * 2 : 15 * 3 * 4; // Base geometry (15 vertices)
        const instanceDataBytes = useFloat16
          ? objectCount * (3 + 4 + 3) * 2 // positions + rotations + scales
          : objectCount * (3 + 4 + 3) * 4; // positions + rotations + scales

        const totalMemoryBytes = baseGeometryBytes + instanceDataBytes;
        const memoryUsage = useFloat16
          ? `Float16: ~${totalMemoryBytes.toLocaleString()} bytes (Base: ${baseGeometryBytes}, Instances: ${instanceDataBytes.toLocaleString()})`
          : `Float32: ~${totalMemoryBytes.toLocaleString()} bytes (Base: ${baseGeometryBytes}, Instances: ${instanceDataBytes.toLocaleString()})`;

        console.log(
          `✅ Zelda-style grass with view-space thickening created: ${objectCount} instances`
        );
        console.log(`📊 Memory usage: ${memoryUsage}`);
        console.log(
          `🎯 Precision: ${useFloat16 ? "Half (Float16)" : "Full (Float32)"}`
        );
      } catch (error) {
        console.error("❌ Failed to create grass:", error);
        isCreatingGrassRef.current = false;
      }
    }, 10);

    return () => {
      console.log("🧹 Cleanup grass");
      if (instancedMeshRef.current) {
        instancedMeshRef.current.dispose();
        instancedMeshRef.current = null;
      }
      isCreatingGrassRef.current = false;
      setMeshReady(false);
    };
  }, [grassGeometry, grassMaterial, grassScale, getGroundHeight, useFloat16]);
};

export default useGrassInstances;
