import { useEffect } from "react";
import * as THREE from "three";
import { useGlobalWind } from "../GlobalWindProvider";

export const useGrassEffects = ({
  instancedMeshRef,
  enableDebugVertex,
  enableWindMovement,
  enablePlayerInteraction,
  characterPosition,
  windNoiseScale,
  windNoiseSpeed,
  windNoiseAmplitude,
  enableNormalMap,
}) => {
  // Get global wind context
  const { windUniforms } = useGlobalWind();
  // Update resolution uniform when window resizes
  useEffect(() => {
    const updateResolution = () => {
      if (instancedMeshRef.current) {
        // Update resolution for all child meshes in the group
        instancedMeshRef.current.traverse((child) => {
          if (child.isInstancedMesh && child.material) {
            const material = child.material as THREE.MeshStandardMaterial;

            // Skip resolution updates for ultra-low LOD tiles (no windInfluence attribute)
            const hasWindInfluence =
              child.geometry.getAttribute("windInfluence");
            if (!hasWindInfluence) {
              return; // Skip this tile - it's ultra-low LOD
            }

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
        });
      }
    };

    window.addEventListener("resize", updateResolution);
    updateResolution(); // Set initial resolution

    return () => window.removeEventListener("resize", updateResolution);
  }, [instancedMeshRef]);

  // Update time uniform for animation (debug vertex and wind movement)
  // Also update enableNormalMap uniform which can be toggled independently
  useEffect(() => {
    // Always run the update loop - enableNormalMap needs to update even if other features are off
    // if (!enableDebugVertex && !enableWindMovement && !enablePlayerInteraction && enableNormalMap === undefined)
    //   return;

    let animationId;
    const updateTime = () => {
      if (instancedMeshRef.current) {
        // Update uniforms for all child meshes in the group
        instancedMeshRef.current.traverse((child) => {
          if (child.isInstancedMesh && child.material) {
            const material = child.material as THREE.MeshStandardMaterial;

            // Skip wind updates for ultra-low LOD tiles (no windInfluence attribute)
            const hasWindInfluence =
              child.geometry.getAttribute("windInfluence");
            if (!hasWindInfluence) {
              return; // Skip this tile - it's ultra-low LOD
            }

            // Update time uniform from global wind system
            if (
              material.userData.shader &&
              material.userData.shader.uniforms.u_time
            ) {
              material.userData.shader.uniforms.u_time.value =
                windUniforms.u_time.value;
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

            // Update wind uniforms from global wind system
            if (material.userData.shader && material.userData.shader.uniforms) {
              if (material.userData.shader.uniforms.u_windNoiseScale) {
                material.userData.shader.uniforms.u_windNoiseScale.value =
                  windUniforms.u_windNoiseScale.value;
              }
              if (material.userData.shader.uniforms.u_windNoiseSpeed) {
                material.userData.shader.uniforms.u_windNoiseSpeed.value =
                  windUniforms.u_windNoiseSpeed.value;
              }
              if (material.userData.shader.uniforms.u_windNoiseAmplitude) {
                material.userData.shader.uniforms.u_windNoiseAmplitude.value =
                  windUniforms.u_windNoiseAmplitude.value;
              }
            }
            
            // Update normal map uniform (runtime toggle) - ALWAYS update if uniform exists
            if (material.userData.shader && material.userData.shader.uniforms && material.userData.shader.uniforms.u_enableNormalMap !== undefined) {
              material.userData.shader.uniforms.u_enableNormalMap.value = enableNormalMap ?? false;
            }
          }
        });
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
    enablePlayerInteraction,
    characterPosition,
    windUniforms,
    enableNormalMap,
  ]);
};

export default useGrassEffects;
