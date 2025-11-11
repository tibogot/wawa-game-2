import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { ThreeElements, ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type RoseauProps = ThreeElements["group"] & {
  stemHeight?: number;
  stemRadiusTop?: number;
  stemRadiusBottom?: number;
  stemRadialSegments?: number;
  stemHeightSegments?: number;
  capsuleRadius?: number;
  capsuleLength?: number;
  capsuleRadialSegments?: number;
  capsuleCapSegments?: number;
  colorStem?: THREE.ColorRepresentation;
  colorCapsule?: THREE.ColorRepresentation;
  verticalSpacing?: number;
  windEnabled?: boolean;
  windStrength?: number;
  windSpeed?: number;
  windStiffness?: number;
  windGustStrength?: number;
  windGustFrequency?: number;
  windDirection?: [number, number];
  staticLean?: number;
  onPointerOverStem?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOutStem?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOverCapsule?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOutCapsule?: (event: ThreeEvent<PointerEvent>) => void;
};

type ShaderUniforms = {
  uTime: { value: number };
  uWindStrength: { value: number };
  uWindSpeed: { value: number };
  uWindStiffness: { value: number };
  uWindGustStrength: { value: number };
  uWindGustFrequency: { value: number };
  uWindDirection: { value: THREE.Vector2 };
  uStaticLean: { value: number };
};

const defaultWindDirection = new THREE.Vector2(1, 0);

/**
 * Reed-like mesh combining a capsule and cylinder into a single geometry that
 * can be animated with a lightweight wind shader.
 */
const Roseau = forwardRef<THREE.Group, RoseauProps>(function Roseau(
  {
    stemHeight = 0.75,
    stemRadiusTop = 0.025,
    stemRadiusBottom = 0.035,
    stemRadialSegments = 12,
    stemHeightSegments = 1,
    capsuleRadius = 0.07,
    capsuleLength = 0.1,
    capsuleRadialSegments = 16,
    capsuleCapSegments = 8,
    colorStem = "#4c7a2e",
    colorCapsule = "#7d4f2c",
    verticalSpacing = 0.0,
    windEnabled = true,
    windStrength = 0.12,
    windSpeed = 1.4,
    windStiffness = 1.5,
    windGustStrength = 0.04,
    windGustFrequency = 0.6,
    windDirection = [1, 0.2],
    staticLean = 0.0,
    onPointerOverStem,
    onPointerOutStem,
    onPointerOverCapsule,
    onPointerOutCapsule,
    ...groupProps
  },
  ref
) {
  const capsuleHeight = capsuleLength + capsuleRadius * 2;
  const totalHeight = stemHeight + verticalSpacing + capsuleHeight;

  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const uniformsRef = useRef<ShaderUniforms | null>(null);

  const normalizedWindDirection = useMemo(() => {
    const vec = new THREE.Vector2(windDirection[0], windDirection[1]);
    if (vec.lengthSq() === 0) {
      return defaultWindDirection.clone();
    }
    return vec.normalize();
  }, [windDirection]);

  const geometry = useMemo(() => {
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadiusTop,
      stemRadiusBottom,
      stemHeight,
      Math.max(3, stemRadialSegments),
      Math.max(1, stemHeightSegments),
      false
    );
    stemGeometry.translate(0, stemHeight / 2, 0);

    const capsuleGeometry = new THREE.CapsuleGeometry(
      capsuleRadius,
      capsuleLength,
      Math.max(2, capsuleCapSegments),
      Math.max(4, capsuleRadialSegments)
    );
    capsuleGeometry.translate(
      0,
      stemHeight + verticalSpacing + capsuleHeight / 2,
      0
    );

    const stemVertexCount = stemGeometry.getAttribute("position").count;

    const merged = mergeGeometries([stemGeometry, capsuleGeometry], false);

    stemGeometry.dispose();
    capsuleGeometry.dispose();

    if (!merged) {
      return null;
    }

    merged.computeVertexNormals();

    const positionAttr = merged.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const count = positionAttr.count;
    const bendFactors = new Float32Array(count);
    const phaseOffsets = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      const y = positionAttr.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const rangeY = Math.max(0.0001, maxY - minY);

    const stemColor = new THREE.Color(colorStem);
    const capsuleColor = new THREE.Color(colorCapsule);
    const capsuleStartIndex = stemVertexCount;

    for (let i = 0; i < count; i++) {
      const y = positionAttr.getY(i);
      const normalized = (y - minY) / rangeY;
      bendFactors[i] = Math.pow(normalized, 1.2);

      const seed = Math.sin(
        positionAttr.getX(i) * 12.9898 +
          positionAttr.getZ(i) * 78.233 +
          positionAttr.getY(i) * 35.425
      );
      phaseOffsets[i] = (seed - Math.floor(seed)) * Math.PI * 2;

      const baseIndex = i * 3;
      const color = i < capsuleStartIndex ? stemColor : capsuleColor;
      colors[baseIndex] = color.r;
      colors[baseIndex + 1] = color.g;
      colors[baseIndex + 2] = color.b;
    }

    merged.setAttribute(
      "aBendFactor",
      new THREE.Float32BufferAttribute(bendFactors, 1)
    );
    merged.setAttribute(
      "aPhase",
      new THREE.Float32BufferAttribute(phaseOffsets, 1)
    );
    merged.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    return merged;
  }, [
    stemRadiusTop,
    stemRadiusBottom,
    stemHeight,
    stemRadialSegments,
    stemHeightSegments,
    capsuleRadius,
    capsuleLength,
    capsuleRadialSegments,
    capsuleCapSegments,
    capsuleHeight,
    verticalSpacing,
    colorStem,
    colorCapsule,
  ]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) {
      return;
    }

    material.vertexColors = true;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWindStrength = { value: windEnabled ? windStrength : 0 };
      shader.uniforms.uWindSpeed = { value: windSpeed };
      shader.uniforms.uWindStiffness = { value: windStiffness };
      shader.uniforms.uWindGustStrength = {
        value: windEnabled ? windGustStrength : 0,
      };
      shader.uniforms.uWindGustFrequency = { value: windGustFrequency };
      shader.uniforms.uWindDirection = {
        value: normalizedWindDirection.clone(),
      };
      shader.uniforms.uStaticLean = { value: staticLean };

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uWindStrength;
         uniform float uWindSpeed;
         uniform float uWindStiffness;
         uniform float uWindGustStrength;
         uniform float uWindGustFrequency;
         uniform vec2 uWindDirection;
         uniform float uStaticLean;
         attribute float aBendFactor;
         attribute float aPhase;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vec2 windDir = normalize(uWindDirection);
         if (windDir.x == 0.0 && windDir.y == 0.0) {
           windDir = vec2(1.0, 0.0);
         }
         float influence = pow(aBendFactor, max(0.0001, uWindStiffness));
         float primarySway = sin(uTime * uWindSpeed + aPhase) * uWindStrength;
         float gust = sin(uTime * uWindGustFrequency + aPhase * 1.618) * uWindGustStrength;
         float bend = (primarySway + gust) * influence;
         float lean = uStaticLean * influence;
         transformed.x += windDir.x * (bend + lean);
         transformed.z += windDir.y * (bend + lean);
         transformed.y -= abs(bend) * 0.18 * influence;
        `
      );

      uniformsRef.current = shader.uniforms as ShaderUniforms;
    };

    material.needsUpdate = true;

    return () => {
      uniformsRef.current = null;
      material.onBeforeCompile = () => {};
    };
  }, [
    windEnabled,
    windStrength,
    windSpeed,
    windStiffness,
    windGustStrength,
    windGustFrequency,
    normalizedWindDirection,
    staticLean,
  ]);

  useEffect(() => {
    const uniforms = uniformsRef.current;
    if (!uniforms) {
      return;
    }

    uniforms.uWindStrength.value = windEnabled ? windStrength : 0;
    uniforms.uWindSpeed.value = windSpeed;
    uniforms.uWindStiffness.value = windStiffness;
    uniforms.uWindGustStrength.value = windEnabled ? windGustStrength : 0;
    uniforms.uWindGustFrequency.value = windGustFrequency;
    uniforms.uWindDirection.value.copy(normalizedWindDirection);
    uniforms.uStaticLean.value = staticLean;
  }, [
    windEnabled,
    windStrength,
    windSpeed,
    windStiffness,
    windGustStrength,
    windGustFrequency,
    normalizedWindDirection,
    staticLean,
  ]);

  useFrame((_, delta) => {
    const uniforms = uniformsRef.current;
    if (!uniforms) {
      return;
    }
    uniforms.uTime.value += delta;
  });

  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      onPointerOverStem?.(event);
      onPointerOverCapsule?.(event);
    },
    [onPointerOverStem, onPointerOverCapsule]
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      onPointerOutStem?.(event);
      onPointerOutCapsule?.(event);
    },
    [onPointerOutStem, onPointerOutCapsule]
  );

  const info = useMemo(
    () => ({
      stemHeight,
      capsuleHeight,
      totalHeight,
    }),
    [stemHeight, capsuleHeight, totalHeight]
  );

  if (!geometry) {
    return null;
  }

  return (
    <group
      ref={ref}
      {...groupProps}
      userData={{ ...groupProps.userData, roseau: info }}
    >
      <mesh
        geometry={geometry}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          ref={materialRef}
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
});

export default Roseau;
