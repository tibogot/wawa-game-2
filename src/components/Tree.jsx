import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh } from "three";
import * as THREE from "three";

export const Tree = ({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  enabled = true,
  getTerrainHeight,
}) => {
  const groupRef = useRef(null);
  const { scene } = useGLTF("/models/tree_elm-transformed.glb");

  // Clone the scene to avoid modifying the original
  const clonedScene = scene.clone();

  // Apply shadows to all meshes in the scene
  useEffect(() => {
    if (clonedScene) {
      clonedScene.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Ensure materials are properly configured
          // This will handle both trunk and leaves textures
          // For leaves with transparency, set alphaTest for proper shadows (like ButterflyParticles/GroundScatterBatched)
          if (child.material) {
            const processMaterial = (material) => {
              material.needsUpdate = true;

              // Check if material is transparent or has a texture (which might have alpha)
              const hasTransparency =
                material.transparent || material.map !== undefined;

              // Handle transparency for shadows - alphaTest ensures shadow respects transparency
              // This prevents opaque shadows from transparent leaves
              if (hasTransparency) {
                material.alphaTest = 0.5; // Critical for shadow cutouts!
                if (!material.transparent && material.map) {
                  material.transparent = true;
                }
                console.log(
                  `🌿 Tree material configured for transparency - alphaTest enabled for shadows`
                );
              }
            };

            if (Array.isArray(child.material)) {
              child.material.forEach((material) => {
                if (material instanceof THREE.Material) {
                  processMaterial(material);
                }
              });
            } else if (child.material instanceof THREE.Material) {
              processMaterial(child.material);
            }
          }
        }
      });
    }
  }, [clonedScene]);

  // Calculate position with terrain height
  const finalPosition = [...position];
  const finalScale = Array.isArray(scale) ? scale : [scale, scale, scale];
  const finalRotation = rotation;

  // Calculate terrain height for Y position and adjust for model bottom
  useEffect(() => {
    if (getTerrainHeight && enabled && groupRef.current) {
      // Create a temporary group with scale applied to calculate bounds
      const tempScene = clonedScene.clone();
      const tempGroup = new THREE.Group();
      tempGroup.add(tempScene);
      tempGroup.scale.set(finalScale[0], finalScale[1], finalScale[2]);

      // Compute bounding box to find the bottom of the scaled model
      const bbox = new THREE.Box3();
      bbox.setFromObject(tempGroup);

      // Get the terrain height at this position
      const terrainY = getTerrainHeight(position[0], position[2]);

      // Offset by the model's bottom so it sits on terrain
      const bottomY = bbox.min.y;
      const adjustedY = terrainY - bottomY;

      groupRef.current.position.y = adjustedY;
      console.log(
        `Tree at [${position[0]}, ${
          position[2]
        }] -> terrain height: ${terrainY}, model bottom: ${bottomY.toFixed(
          2
        )}, adjusted Y: ${adjustedY.toFixed(2)}`
      );

      // Clean up temp group
      tempGroup.clear();
    }
  }, [position, getTerrainHeight, enabled, clonedScene, finalScale]);

  if (!enabled) {
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={finalPosition}
      scale={finalScale}
      rotation={finalRotation}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

// Preload the model
useGLTF.preload("/models/tree_elm.glb");
