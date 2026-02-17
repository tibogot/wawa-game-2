import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface HeightFogV2Props {
  enabled?: boolean;
  fogColor?: string;
  fogHeight?: number;
  fogNear?: number;
  fogFar?: number;
  fogDensity?: number;
  fogHeightFalloff?: number;
}

export const HeightFogV2: React.FC<HeightFogV2Props> = ({
  enabled = true,
  fogColor = "#b8c4d4",
  fogHeight = 80.0,
  fogNear = 1,
  fogFar = 1500,
  fogDensity = 0.5,
  fogHeightFalloff = 1.0,
}) => {
  const { scene } = useThree();
  const shadersModified = useRef(false);
  const originalShaders = useRef<{
    fog_pars_vertex?: string;
    fog_vertex?: string;
    fog_pars_fragment?: string;
    fog_fragment?: string;
  }>({});

  // Modify shader chunks once on mount
  useEffect(() => {
    if (!enabled || shadersModified.current) return;

    // Store originals
    originalShaders.current = {
      fog_pars_vertex: THREE.ShaderChunk.fog_pars_vertex,
      fog_vertex: THREE.ShaderChunk.fog_vertex,
      fog_pars_fragment: THREE.ShaderChunk.fog_pars_fragment,
      fog_fragment: THREE.ShaderChunk.fog_fragment,
    };

    // Modify vertex shader to pass world position
    THREE.ShaderChunk.fog_pars_vertex += `
#ifdef USE_FOG
  varying vec3 vWorldPositionV2;
#endif
`;

    THREE.ShaderChunk.fog_vertex += `
#ifdef USE_FOG
  vWorldPositionV2 = worldPosition.xyz;
#endif
`;

    // Modify fragment shader to include height + density uniforms
    THREE.ShaderChunk.fog_pars_fragment += `
#ifdef USE_FOG
  varying vec3 vWorldPositionV2;
  uniform float fogHeightV2;
  uniform float fogDensityV2;
  uniform float fogHeightFalloffV2;
#endif
`;

    // Replace fog calculation with height-aware version
    const FOG_APPLIED_LINE =
      "gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );";
    THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
      FOG_APPLIED_LINE,
      `
  // Height-based fog with density and falloff controls
  float heightFactorV2 = 1.0 - smoothstep(0.0, fogHeightV2, pow(max(vWorldPositionV2.y, 0.0), 1.0 / fogHeightFalloffV2));
  float cameraHeightFactorV2 = 1.0 - smoothstep(0.0, fogHeightV2, pow(max(cameraPosition.y, 0.0), 1.0 / fogHeightFalloffV2));

  // Combine distance fog with height fog and density
  fogFactor = fogFactor * max(heightFactorV2, cameraHeightFactorV2) * fogDensityV2;

  ${FOG_APPLIED_LINE}
`
    );

    shadersModified.current = true;

    return () => {
      // Restore original shaders on unmount
      if (originalShaders.current.fog_pars_vertex) {
        THREE.ShaderChunk.fog_pars_vertex =
          originalShaders.current.fog_pars_vertex;
      }
      if (originalShaders.current.fog_vertex) {
        THREE.ShaderChunk.fog_vertex = originalShaders.current.fog_vertex;
      }
      if (originalShaders.current.fog_pars_fragment) {
        THREE.ShaderChunk.fog_pars_fragment =
          originalShaders.current.fog_pars_fragment;
      }
      if (originalShaders.current.fog_fragment) {
        THREE.ShaderChunk.fog_fragment = originalShaders.current.fog_fragment;
      }
      shadersModified.current = false;
    };
  }, [enabled]);

  // Set up scene fog
  useEffect(() => {
    if (enabled) {
      scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    } else {
      scene.fog = null;
    }

    return () => {
      scene.fog = null;
    };
  }, [enabled, fogColor, fogNear, fogFar, scene]);

  // Update materials with fog uniforms — skip grass materials
  useEffect(() => {
    if (!enabled || !shadersModified.current) return;

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          // Skip grass materials — they have their own built-in fog system
          if ((material as any).userData?.isGrassShader) return;

          if (
            material instanceof THREE.MeshStandardMaterial ||
            material instanceof THREE.MeshBasicMaterial ||
            material instanceof THREE.MeshLambertMaterial ||
            material instanceof THREE.MeshPhongMaterial ||
            material instanceof THREE.MeshToonMaterial
          ) {
            material.fog = true;

            const originalOnBeforeCompile = material.onBeforeCompile;

            // Use a separate key to avoid conflicting with HeightFog V1
            if (!(material as any).userData.heightFogV2Applied) {
              material.onBeforeCompile = (shader, renderer) => {
                if (originalOnBeforeCompile) {
                  originalOnBeforeCompile(shader, renderer);
                }

                shader.uniforms.fogHeightV2 = { value: fogHeight };
                shader.uniforms.fogDensityV2 = { value: fogDensity };
                shader.uniforms.fogHeightFalloffV2 = { value: fogHeightFalloff };

                // Store under separate key so we don't overwrite grass shader refs
                (material as any).userData.heightFogV2Shader = shader;
              };

              (material as any).userData.heightFogV2Applied = true;
            }

            material.needsUpdate = true;
          }
        });
      }
    });
  }, [enabled, scene, fogHeight, fogDensity, fogHeightFalloff]);

  // Update uniforms when controls change
  useEffect(() => {
    if (!enabled) return;

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          const shader = (material as any).userData?.heightFogV2Shader;
          if (shader) {
            if (shader.uniforms.fogHeightV2) {
              shader.uniforms.fogHeightV2.value = fogHeight;
            }
            if (shader.uniforms.fogDensityV2) {
              shader.uniforms.fogDensityV2.value = fogDensity;
            }
            if (shader.uniforms.fogHeightFalloffV2) {
              shader.uniforms.fogHeightFalloffV2.value = fogHeightFalloff;
            }
          }
        });
      }
    });
  }, [enabled, fogHeight, fogDensity, fogHeightFalloff, scene]);

  return null;
};
