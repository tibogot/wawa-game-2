import { useEffect, RefObject } from "react";
import * as THREE from "three";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";

interface GrassEffectsProps {
  instancedMeshRef: RefObject<InstancedMesh2 | null>;
  enableDebugVertex: boolean;
  enableWindMovement: boolean;
  enableAdvancedWind: boolean;
  enablePlayerInteraction: boolean;
  characterPosition?: THREE.Vector3;
  windNoiseScale: number;
  windNoiseSpeed: number;
  windNoiseAmplitude: number;
}

/**
 * GrassEffects - Effect Hooks for Grass Animation and Resolution Updates
 *
 * Extracted from SimonDevGrass14Simple to separate concerns
 * Contains useEffect hooks for time/resolution updates and animation logic
 */
export const useGrassEffects = ({
  instancedMeshRef,
  enableDebugVertex,
  enableWindMovement,
  enableAdvancedWind,
  enablePlayerInteraction,
  characterPosition,
  windNoiseScale,
  windNoiseSpeed,
  windNoiseAmplitude,
}: GrassEffectsProps) => {
  // Update resolution uniform when window resizes
  useEffect(() => {
    const updateResolution = () => {
      if (instancedMeshRef.current && instancedMeshRef.current.material) {
        const material = instancedMeshRef.current
          .material as THREE.MeshStandardMaterial;
        if (
          material.userData.shader &&
          material.userData.shader.uniforms.u_resolution
        ) {
          material.userData.shader.uniforms.u_resolution.value.set(
            window.innerWidth,
            window.innerHeight
          );
        }
      }
    };

    window.addEventListener("resize", updateResolution);
    updateResolution(); // Set initial resolution

    return () => window.removeEventListener("resize", updateResolution);
  }, [instancedMeshRef]);

  // Update time uniform for animation (debug vertex and wind movement)
  useEffect(() => {
    if (
      !enableDebugVertex &&
      !enableWindMovement &&
      !enableAdvancedWind &&
      !enablePlayerInteraction
    )
      return;

    let animationId: number;
    const updateTime = () => {
      if (instancedMeshRef.current && instancedMeshRef.current.material) {
        const material = instancedMeshRef.current
          .material as THREE.MeshStandardMaterial;
        if (
          material.userData.shader &&
          material.userData.shader.uniforms.u_time
        ) {
          material.userData.shader.uniforms.u_time.value =
            performance.now() * 0.001;
        }

        // Update player position uniform if player interaction is enabled
        if (
          enablePlayerInteraction &&
          characterPosition &&
          material.userData.shader &&
          material.userData.shader.uniforms &&
          material.userData.shader.uniforms.u_playerPosition
        ) {
          material.userData.shader.uniforms.u_playerPosition.value.copy(
            characterPosition
          );
        }

        // Update wind noise uniforms for real-time control
        if (material.userData.shader && material.userData.shader.uniforms) {
          if (material.userData.shader.uniforms.u_windNoiseScale) {
            material.userData.shader.uniforms.u_windNoiseScale.value =
              windNoiseScale;
          }
          if (material.userData.shader.uniforms.u_windNoiseSpeed) {
            material.userData.shader.uniforms.u_windNoiseSpeed.value =
              windNoiseSpeed;
          }
          if (material.userData.shader.uniforms.u_windNoiseAmplitude) {
            material.userData.shader.uniforms.u_windNoiseAmplitude.value =
              windNoiseAmplitude;
          }
        }
      }
      animationId = requestAnimationFrame(updateTime);
    };

    updateTime();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [
    instancedMeshRef,
    enableDebugVertex,
    enableWindMovement,
    enableAdvancedWind,
    enablePlayerInteraction,
    characterPosition,
    windNoiseScale,
    windNoiseSpeed,
    windNoiseAmplitude,
  ]);
};

export default useGrassEffects;
