import React, { useRef, useEffect, useMemo } from "react";
import CustomShaderMaterial from "three-custom-shader-material";
import CustomShaderMaterialType from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import * as oceanShader from "./shaders";
// @ts-ignore
import { patchShaders } from "gl-noise/build/glNoise.m";

interface WaterProps {
  base: any;
  waterColor?: string;
  waterHighlightColor?: string;
  waterBrightness?: number;
  flatShading?: boolean;
  size?: number;
  segments?: number;
  waterOffset?: number;
  waterContrast?: number;
  waterTimeSpeed?: number;
  waterHeight?: number;
  waterWaveAmplitude?: number;
  waterWaveFrequency?: number;
  position?: [number, number, number];
}

export default function Water({
  base,
  waterColor = "#52a7f7",
  waterHighlightColor = "#b3ffff",
  waterBrightness = 0.5,
  flatShading = false,
  size = 5,
  segments = 64,
  waterOffset = 0.4,
  waterContrast = 3.1,
  waterTimeSpeed = 5,
  waterHeight = 0.2,
  waterWaveAmplitude = 1.0,
  waterWaveFrequency = 1.0,
  position = [0, 0, 0],
}: WaterProps) {
  const thickness = waterHeight;
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

    if (supportsColor) {
      props.color = "blue";
    }

    if (supportsPBR) {
      props.roughness = 0.2;
      props.metalness = 0.1;
    }

    if (supportsFlatShading) {
      props.flatShading = flatShading;
    }

    return props;
  }, [base, flatShading]);

  useFrame((state) => {
    if (material?.current) {
      material.current.uniforms.uTime.value =
        -state.clock.elapsedTime / waterTimeSpeed;
    }
  });

  // Update uniforms when props change
  useEffect(() => {
    if (material?.current) {
      material.current.uniforms.waterColor.value = new THREE.Color(
        waterColor
      ).convertLinearToSRGB();
      material.current.uniforms.waterHighlight.value = new THREE.Color(
        waterHighlightColor
      ).convertLinearToSRGB();
      material.current.uniforms.brightness.value = waterBrightness * 2;
      material.current.uniforms.offset.value = waterOffset;
      material.current.uniforms.contrast.value = waterContrast;
      material.current.uniforms.uHeight.value = waterHeight;
      material.current.uniforms.waveAmplitude.value = waterWaveAmplitude;
      material.current.uniforms.waveFrequency.value = waterWaveFrequency;
    }
  }, [
    waterColor,
    waterHighlightColor,
    waterBrightness,
    waterOffset,
    waterContrast,
    waterHeight,
    waterWaveAmplitude,
    waterWaveFrequency,
  ]);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow rotation-x={-Math.PI / 2}>
        <boxGeometry args={[size, size, thickness, segments, segments, 1]} />
        <CustomShaderMaterial
          ref={material}
          baseMaterial={base}
          vertexShader={patchShaders(oceanShader.vert)}
          fragmentShader={oceanShader.frag}
          {...materialProps}
          uniforms={{
            uTime: { value: 0 },
            waterColor: {
              value: new THREE.Color(waterColor).convertLinearToSRGB(),
            },
            waterHighlight: {
              value: new THREE.Color(waterHighlightColor).convertLinearToSRGB(),
            },
            offset: {
              value: waterOffset,
            },
            contrast: {
              value: waterContrast,
            },
            brightness: {
              value: waterBrightness * 2,
            },
            uHeight: {
              value: waterHeight,
            },
            waveAmplitude: {
              value: waterWaveAmplitude,
            },
            waveFrequency: {
              value: waterWaveFrequency,
            },
          }}
        />
      </mesh>
    </group>
  );
}
