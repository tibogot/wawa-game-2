import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh } from "three";
import * as THREE from "three";

interface MountainProps {
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  enabled?: boolean;
  mountainEnabled?: boolean;
  mountainPosition?: [number, number, number];
  mountainScale?: [number, number, number];
  mountainRotation?: [number, number, number];
  mountainColor?: string;
  mountainOpacity?: number;
  mountainRoughness?: number;
  mountainMetalness?: number;
  mountainEmissive?: string;
  mountainEmissiveIntensity?: number;
}

export const Mountain: React.FC<MountainProps> = ({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  enabled = true,
  mountainEnabled,
  mountainPosition,
  mountainScale,
  mountainRotation,
  mountainColor,
  mountainOpacity,
  mountainRoughness,
  mountainMetalness,
  mountainEmissive,
  mountainEmissiveIntensity,
  ...props
}) => {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/models/mountain.glb");

  // Clone the scene to avoid modifying the original
  const clonedScene = scene.clone();

  // Apply materials and shadows to all meshes in the scene
  useEffect(() => {
    if (clonedScene) {
      clonedScene.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Ensure materials are properly configured
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => {
                if (material instanceof THREE.Material) {
                  material.needsUpdate = true;
                }
              });
            } else if (child.material instanceof THREE.Material) {
              child.material.needsUpdate = true;
            }
          }
        }
      });
    }
  }, [clonedScene]);

  // Use props or defaults
  const isEnabled = mountainEnabled !== undefined ? mountainEnabled : enabled;
  const finalPosition =
    mountainPosition || (position as [number, number, number]);
  const finalScale =
    mountainScale || (Array.isArray(scale) ? scale : [scale, scale, scale]);
  const finalRotation =
    mountainRotation || (rotation as [number, number, number]);
  const finalColor = mountainColor || "#8B7355";
  const finalOpacity = mountainOpacity !== undefined ? mountainOpacity : 1.0;
  const finalRoughness =
    mountainRoughness !== undefined ? mountainRoughness : 0.8;
  const finalMetalness =
    mountainMetalness !== undefined ? mountainMetalness : 0.0;
  const finalEmissive = mountainEmissive || "#000000";
  const finalEmissiveIntensity =
    mountainEmissiveIntensity !== undefined ? mountainEmissiveIntensity : 0.0;

  // Apply material properties to all meshes
  useEffect(() => {
    if (clonedScene && isEnabled) {
      clonedScene.traverse((child) => {
        if (child instanceof Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (material instanceof THREE.Material) {
                material.color.set(finalColor);
                material.opacity = finalOpacity;
                material.transparent = finalOpacity < 1.0;

                if (material instanceof THREE.MeshStandardMaterial) {
                  material.roughness = finalRoughness;
                  material.metalness = finalMetalness;
                  material.emissive.set(finalEmissive);
                  material.emissiveIntensity = finalEmissiveIntensity;
                }

                material.needsUpdate = true;
              }
            });
          } else if (child.material instanceof THREE.Material) {
            child.material.color.set(finalColor);
            child.material.opacity = finalOpacity;
            child.material.transparent = finalOpacity < 1.0;

            if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.roughness = finalRoughness;
              child.material.metalness = finalMetalness;
              child.material.emissive.set(finalEmissive);
              child.material.emissiveIntensity = finalEmissiveIntensity;
            }

            child.material.needsUpdate = true;
          }
        }
      });
    }
  }, [
    clonedScene,
    isEnabled,
    finalColor,
    finalOpacity,
    finalRoughness,
    finalMetalness,
    finalEmissive,
    finalEmissiveIntensity,
  ]);

  if (!isEnabled) {
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={finalPosition}
      scale={finalScale}
      rotation={finalRotation}
      {...props}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

// Preload the model
useGLTF.preload("/models/mountain.glb");
