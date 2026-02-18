import { forwardRef, useMemo, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import * as THREE from "three";

const fragmentShader = /* glsl */ `
uniform vec3 fogColor;
uniform float fogHeight;
uniform float fogNear;
uniform float fogFar;
uniform float fogDensity;
uniform float fogHeightFalloff;
uniform float cameraNear;
uniform float cameraFar;
uniform vec3 cameraPositionWorld;
uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // Skip sky (depth = 1.0)
  if (depth >= 1.0) {
    outputColor = inputColor;
    return;
  }

  // Reconstruct clip-space position
  vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);

  // To view space
  vec4 viewPos = inverseProjectionMatrix * clipPos;
  viewPos /= viewPos.w;

  // To world space
  vec4 worldPos = inverseViewMatrix * viewPos;

  // Distance fog (using view-space distance for stability)
  float dist = length(viewPos.xyz);
  float distFog = smoothstep(fogNear, fogFar, dist);

  // Height fog — objects below fogHeight get fogged
  float heightFactor = 1.0 - smoothstep(0.0, fogHeight, pow(max(worldPos.y, 0.0), 1.0 / fogHeightFalloff));

  // Camera height factor — if camera is above fog ceiling, reduce fog
  float cameraHeightFactor = 1.0 - smoothstep(0.0, fogHeight, pow(max(cameraPositionWorld.y, 0.0), 1.0 / fogHeightFalloff));

  // Combine: distance fog × height fog × density
  float finalFog = distFog * max(heightFactor, cameraHeightFactor) * fogDensity;
  finalFog = clamp(finalFog, 0.0, 1.0);

  // Blend scene toward fog color
  outputColor = vec4(mix(inputColor.rgb, fogColor, finalFog), inputColor.a);
}
`;

class HeightFogPostEffect extends Effect {
  constructor({
    fogColor = new THREE.Color("#b8c4d4"),
    fogHeight = 80.0,
    fogNear = 1.0,
    fogFar = 1500.0,
    fogDensity = 0.5,
    fogHeightFalloff = 1.0,
  } = {}) {
    super("HeightFogPostEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ["fogColor", new THREE.Uniform(fogColor)],
        ["fogHeight", new THREE.Uniform(fogHeight)],
        ["fogNear", new THREE.Uniform(fogNear)],
        ["fogFar", new THREE.Uniform(fogFar)],
        ["fogDensity", new THREE.Uniform(fogDensity)],
        ["fogHeightFalloff", new THREE.Uniform(fogHeightFalloff)],
        ["cameraNear", new THREE.Uniform(0.1)],
        ["cameraFar", new THREE.Uniform(1000)],
        ["cameraPositionWorld", new THREE.Uniform(new THREE.Vector3())],
        [
          "inverseProjectionMatrix",
          new THREE.Uniform(new THREE.Matrix4()),
        ],
        ["inverseViewMatrix", new THREE.Uniform(new THREE.Matrix4())],
      ]),
    });
  }
}

export const PostProcessingHeightFog = forwardRef(function PostProcessingHeightFog(
  {
    fogColor = "#b8c4d4",
    fogHeight = 80.0,
    fogNear = 1.0,
    fogFar = 1500.0,
    fogDensity = 0.5,
    fogHeightFalloff = 1.0,
  },
  ref
) {
  const { camera } = useThree();

  const effect = useMemo(
    () =>
      new HeightFogPostEffect({
        fogColor: new THREE.Color(fogColor),
        fogHeight,
        fogNear,
        fogFar,
        fogDensity,
        fogHeightFalloff,
      }),
    []
  );

  // Update fog uniforms when props change
  useEffect(() => {
    effect.uniforms.get("fogColor").value.set(fogColor);
  }, [effect, fogColor]);

  useEffect(() => {
    effect.uniforms.get("fogHeight").value = fogHeight;
  }, [effect, fogHeight]);

  useEffect(() => {
    effect.uniforms.get("fogNear").value = fogNear;
  }, [effect, fogNear]);

  useEffect(() => {
    effect.uniforms.get("fogFar").value = fogFar;
  }, [effect, fogFar]);

  useEffect(() => {
    effect.uniforms.get("fogDensity").value = fogDensity;
  }, [effect, fogDensity]);

  useEffect(() => {
    effect.uniforms.get("fogHeightFalloff").value = fogHeightFalloff;
  }, [effect, fogHeightFalloff]);

  // Update camera uniforms every frame
  useFrame(() => {
    effect.uniforms.get("cameraNear").value = camera.near;
    effect.uniforms.get("cameraFar").value = camera.far;
    effect.uniforms.get("cameraPositionWorld").value.copy(camera.position);
    effect.uniforms
      .get("inverseProjectionMatrix")
      .value.copy(camera.projectionMatrixInverse);
    effect.uniforms.get("inverseViewMatrix").value.copy(camera.matrixWorld);
  });

  return <primitive ref={ref} object={effect} />;
});

export default PostProcessingHeightFog;
