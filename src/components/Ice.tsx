import React, { useRef, useEffect, useMemo } from "react";
import CustomShaderMaterial from "three-custom-shader-material";
import CustomShaderMaterialType from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import * as iceShader from "./iceShaders";
// @ts-ignore
import { patchShaders } from "gl-noise/build/glNoise.m";

interface IceProps {
  base: any;
  iceColor?: string;
  frostColor?: string;
  crackColor?: string;
  frostIntensity?: number;
  crackIntensity?: number;
  thickness?: number;
  brightness?: number;
  displacementScale?: number;
  flatShading?: boolean;
  size?: number;
  segments?: number;
}

export default function Ice({
  base,
  iceColor = "#a8d8f0",
  frostColor = "#e8f4f8",
  crackColor = "#6b9dc4",
  frostIntensity = 0.3,
  crackIntensity = 0.5,
  thickness = 0.2,
  brightness = 1.0,
  displacementScale = 0.02,
  flatShading = false,
  size = 5,
  segments = 64,
}: IceProps) {
  const material = useRef<CustomShaderMaterialType | null>(null);

  // Determine which properties are supported by the base material
  const materialProps = useMemo(() => {
    const props: any = {
      // @ts-ignore - side prop works at runtime but not in types
      side: THREE.DoubleSide,
    };

    // Check if base material supports these properties
    const baseMaterialName = base?.name || "";

    // Materials that support roughness and metalness
    const supportsPBR = [
      "MeshStandardMaterial",
      "MeshPhysicalMaterial",
    ].includes(baseMaterialName);

    // Materials that support color (most do, except MeshDepthMaterial and MeshNormalMaterial)
    const supportsColor = !["MeshDepthMaterial", "MeshNormalMaterial"].includes(
      baseMaterialName
    );

    // Materials that support flatShading (most do, except MeshBasicMaterial, MeshDepthMaterial, and MeshToonMaterial)
    const supportsFlatShading = ![
      "MeshBasicMaterial",
      "MeshDepthMaterial",
      "MeshToonMaterial",
    ].includes(baseMaterialName);

    // For ice, we want transmission/refraction (only MeshPhysicalMaterial supports this well)
    if (baseMaterialName === "MeshPhysicalMaterial") {
      props.transmission = 0.9;
      props.ior = 1.31; // Ice index of refraction
      props.roughness = 0.1;
      props.metalness = 0.0;
    }

    if (supportsColor) {
      props.color = iceColor;
    }

    if (supportsPBR && baseMaterialName !== "MeshPhysicalMaterial") {
      props.roughness = 0.1;
      props.metalness = 0.0;
    }

    if (supportsFlatShading) {
      props.flatShading = flatShading;
    }

    return props;
  }, [base, flatShading, iceColor]);

  useFrame((state) => {
    if (material?.current) {
      // Very slow time animation for ice
      const time = state.clock.elapsedTime * 0.1;
      material.current.uniforms.uTime.value = time;
    }
  });

  // Update uniforms when props change
  useEffect(() => {
    if (material?.current) {
      material.current.uniforms.iceColor.value = new THREE.Color(
        iceColor
      ).convertLinearToSRGB();
      material.current.uniforms.frostColor.value = new THREE.Color(
        frostColor
      ).convertLinearToSRGB();
      material.current.uniforms.crackColor.value = new THREE.Color(
        crackColor
      ).convertLinearToSRGB();
      material.current.uniforms.frostIntensity.value = frostIntensity;
      material.current.uniforms.crackIntensity.value = crackIntensity;
      material.current.uniforms.brightness.value = brightness;
      material.current.uniforms.displacementScale.value = displacementScale;
      material.current.uniforms.iceThickness.value = thickness;
    }
  }, [
    iceColor,
    frostColor,
    crackColor,
    frostIntensity,
    crackIntensity,
    brightness,
    displacementScale,
    thickness,
  ]);

  // Update material properties when base material changes
  useEffect(() => {
    if (material?.current && base?.name === "MeshPhysicalMaterial") {
      // Ensure transmission and IOR are set for ice
      const mat = material.current as any;
      if (mat.transmission !== undefined) {
        mat.transmission = 0.9;
      }
      if (mat.ior !== undefined) {
        mat.ior = 1.31;
      }
      if (mat.roughness !== undefined) {
        mat.roughness = 0.1;
      }
      if (mat.metalness !== undefined) {
        mat.metalness = 0.0;
      }
    }
  }, [base]);

  return (
    <group>
      <mesh castShadow receiveShadow rotation-x={-Math.PI / 2}>
        <boxGeometry args={[size, size, thickness, segments, segments, 1]} />
        <CustomShaderMaterial
          ref={material}
          baseMaterial={base}
          vertexShader={patchShaders(iceShader.vert)}
          fragmentShader={iceShader.frag}
          {...materialProps}
          uniforms={{
            uTime: { value: 0 },
            iceColor: {
              value: new THREE.Color(iceColor).convertLinearToSRGB(),
            },
            frostColor: {
              value: new THREE.Color(frostColor).convertLinearToSRGB(),
            },
            crackColor: {
              value: new THREE.Color(crackColor).convertLinearToSRGB(),
            },
            frostIntensity: { value: frostIntensity },
            crackIntensity: { value: crackIntensity },
            brightness: { value: brightness },
            displacementScale: { value: displacementScale },
            iceThickness: { value: thickness },
            uHeight: { value: thickness },
          }}
        />
      </mesh>
    </group>
  );
}
