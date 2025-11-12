import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import CustomShaderMaterial from "three-custom-shader-material";
import type CustomShaderMaterialType from "three-custom-shader-material/vanilla";

const calmWaterVertex = /* glsl */ `
#include <common>
varying vec3 vWorldPosition;
varying vec3 vViewVector;

void main() {
  vec3 pos = position;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewVector = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  csm_Position = pos;
  csm_Normal = normal;
}
`;

const calmWaterFragment = /* glsl */ `
#include <common>
varying vec3 vWorldPosition;
varying vec3 vViewVector;

uniform float uTime;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uRippleStrength;
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
uniform vec3 uColorFoam;
uniform vec3 uFresnelColor;
uniform float uFresnelStrength;

float waveFn(vec2 p) {
  float wave = sin(p.x + uTime * uWaveSpeed);
  wave += cos(p.y * 1.2 - uTime * uWaveSpeed * 0.7);
  wave += sin((p.x + p.y) * 0.5 + uTime * uWaveSpeed * 0.45);
  return wave / 3.0;
}

void main() {
  vec2 uv = vWorldPosition.xz * uWaveFrequency;
  float wave = waveFn(uv);
  float mixFactor = smoothstep(-0.45, 0.55, wave);

  vec3 base = mix(uColorDeep, uColorShallow, mixFactor);

  float foam = smoothstep(0.55, 0.95, wave);
  base = mix(base, uColorFoam, foam * uRippleStrength);

  vec3 viewDir = normalize(vViewVector);
  float fresnel = pow(1.0 - max(dot(viewDir, normalize(csm_Normal)), 0.0), 3.0);
  base = mix(base, uFresnelColor, fresnel * uFresnelStrength);

  csm_Roughness = 0.28;
  csm_Metalness = 0.05;
  csm_DiffuseColor.rgb = base;
}
`;

type CalmWaterProps = {
  size?: number;
  segments?: number;
  position?: [number, number, number];
  colorDeep?: string;
  colorShallow?: string;
  colorFoam?: string;
  fresnelColor?: string;
  fresnelStrength?: number;
  rippleStrength?: number;
  waveFrequency?: number;
  waveSpeed?: number;
};

export const CalmWater = ({
  size = 2000,
  segments = 128,
  position = [0, 0, 0],
  colorDeep = "#1f2a2f",
  colorShallow = "#2e4a4e",
  colorFoam = "#9fb8c3",
  fresnelColor = "#d7e9f2",
  fresnelStrength = 0.25,
  rippleStrength = 0.35,
  waveFrequency = 0.003,
  waveSpeed = 0.6,
}: CalmWaterProps) => {
  const materialRef = useRef<CustomShaderMaterialType | null>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveFrequency: { value: waveFrequency },
      uWaveSpeed: { value: waveSpeed },
      uRippleStrength: { value: rippleStrength },
      uColorDeep: { value: new THREE.Color(colorDeep).convertSRGBToLinear() },
      uColorShallow: {
        value: new THREE.Color(colorShallow).convertSRGBToLinear(),
      },
      uColorFoam: { value: new THREE.Color(colorFoam).convertSRGBToLinear() },
      uFresnelColor: {
        value: new THREE.Color(fresnelColor).convertSRGBToLinear(),
      },
      uFresnelStrength: { value: fresnelStrength },
    }),
    [
      colorDeep,
      colorShallow,
      colorFoam,
      fresnelColor,
      fresnelStrength,
      rippleStrength,
      waveFrequency,
      waveSpeed,
    ]
  );

  const baseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.95,
        roughness: 0.28,
        metalness: 0.05,
        envMapIntensity: 0.8,
        color: 0xffffff,
      }),
    []
  );

  useEffect(() => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uWaveFrequency.value = waveFrequency;
    materialRef.current.uniforms.uWaveSpeed.value = waveSpeed;
    materialRef.current.uniforms.uRippleStrength.value = rippleStrength;
    materialRef.current.uniforms.uColorDeep.value
      .set(colorDeep)
      .convertSRGBToLinear();
    materialRef.current.uniforms.uColorShallow.value
      .set(colorShallow)
      .convertSRGBToLinear();
    materialRef.current.uniforms.uColorFoam.value
      .set(colorFoam)
      .convertSRGBToLinear();
    materialRef.current.uniforms.uFresnelColor.value
      .set(fresnelColor)
      .convertSRGBToLinear();
    materialRef.current.uniforms.uFresnelStrength.value = fresnelStrength;
  }, [
    waveFrequency,
    waveSpeed,
    rippleStrength,
    colorDeep,
    colorShallow,
    colorFoam,
    fresnelColor,
    fresnelStrength,
  ]);

  useFrame((state) => {
    if (!materialRef.current) {
      return;
    }
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, segments, segments]} />
      <CustomShaderMaterial
        ref={materialRef}
        baseMaterial={baseMaterial}
        vertexShader={calmWaterVertex}
        fragmentShader={calmWaterFragment}
        uniforms={uniforms}
      />
    </mesh>
  );
};
