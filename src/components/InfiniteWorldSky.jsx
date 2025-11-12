import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const skyVertexShader = `
#define M_PI 3.1415926535897932384626433832795

uniform vec3 uSunPosition;

uniform float uAtmosphereElevation;
uniform float uAtmospherePower;
uniform vec3 uColorDayCycleLow;
uniform vec3 uColorDayCycleHigh;
uniform vec3 uColorNightLow;
uniform vec3 uColorNightHigh;

uniform float uDawnAngleAmplitude;
uniform float uDawnElevationAmplitude;
uniform vec3 uColorDawn;

uniform float uSunAmplitude;
uniform float uSunMultiplier;
uniform vec3 uColorSun;

uniform float uDayCycleProgress;

varying vec3 vColor;

vec3 blendAdd(vec3 base, vec3 blend)
{
	return min(base + blend, vec3(1.0));
}

vec3 blendAdd(vec3 base, vec3 blend, float opacity)
{
	return (blendAdd(base, blend) * opacity + base * (1.0 - opacity));
}

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    vec3 normalizedPosition = normalize(position);

    float horizonIntensity = (uv.y - 0.5) / uAtmosphereElevation;
    horizonIntensity = pow(1.0 - horizonIntensity, uAtmospherePower);

    vec3 colorDayCycle = mix(uColorDayCycleHigh, uColorDayCycleLow, horizonIntensity);
    vec3 colorNight = mix(uColorNightHigh, uColorNightLow, horizonIntensity);
    
    float dayIntensity = abs(uDayCycleProgress - 0.5) * 2.0;
    vec3 color = mix(colorNight, colorDayCycle, dayIntensity);

    float distanceToSun = distance(normalizedPosition, uSunPosition);

    float dawnAngleIntensity = dot(normalize(uSunPosition.xz), normalize(normalizedPosition.xz));
    dawnAngleIntensity = smoothstep(0.0, 1.0, (dawnAngleIntensity - (1.0 - uDawnAngleAmplitude)) / uDawnAngleAmplitude);

    float dawnElevationIntensity = 1.0 - min(1.0, (uv.y - 0.5) / uDawnElevationAmplitude);

    float dawnDayCycleIntensity = cos(uDayCycleProgress * 4.0 * M_PI + M_PI) * 0.5 + 0.5;

    float dawnIntensity = clamp(dawnAngleIntensity * dawnElevationIntensity * dawnDayCycleIntensity, 0.0, 1.0);
    color = blendAdd(color, uColorDawn, dawnIntensity);

    float sunIntensity = smoothstep(0.0, 1.0, clamp(1.0 - distanceToSun / uSunAmplitude, 0.0, 1.0)) * uSunMultiplier;
    color = blendAdd(color, uColorSun, sunIntensity);

    float sunGlowStrength = pow(max(0.0, 1.0 + 0.05 - distanceToSun * 2.5), 2.0);
    color = blendAdd(color, uColorSun, sunGlowStrength);

    vColor = vec3(color);
}
`;

const skyFragmentShader = `
varying vec3 vColor;

void main()
{
    gl_FragColor = vec4(vColor, 1.0);
}
`;

const defaultSunDirection = new THREE.Vector3(-0.35, 0.8, -0.2).normalize();

export const InfiniteWorldSky = ({
  radius = 1200,
  sunOrbitAxis = new THREE.Vector3(0, 0, 1),
  baseSunDirection = defaultSunDirection,
  dayCycleSpeed = 0.02,
  starCount = 1500,
  starDistance = 1400,
  starSize = 8,
}) => {
  const groupRef = useRef();
  const sunDirectionRef = useRef(baseSunDirection.clone());
  const { camera } = useThree();

  const skyGeometry = useMemo(
    () => new THREE.SphereGeometry(radius, 128, 64),
    [radius]
  );

  useEffect(() => {
    return () => {
      skyGeometry.dispose();
    };
  }, [skyGeometry]);

  const skyMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSunPosition: { value: sunDirectionRef.current.clone() },
        uAtmosphereElevation: { value: 0.5 },
        uAtmospherePower: { value: 8.0 },
        uColorDayCycleLow: { value: new THREE.Color("#f0fff9") },
        uColorDayCycleHigh: { value: new THREE.Color("#2e89ff") },
        uColorNightLow: { value: new THREE.Color("#001624") },
        uColorNightHigh: { value: new THREE.Color("#004794") },
        uDawnAngleAmplitude: { value: 0.45 },
        uDawnElevationAmplitude: { value: 0.3 },
        uColorDawn: { value: new THREE.Color("#ff2f00") },
        uSunAmplitude: { value: 0.65 },
        uSunMultiplier: { value: 0.8 },
        uColorSun: { value: new THREE.Color("#ff531a") },
        uDayCycleProgress: { value: 0.25 },
      },
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
    material.toneMapped = false;
    return material;
  }, []);

  useEffect(() => {
    return () => {
      skyMaterial.dispose();
    };
  }, [skyMaterial]);

  const starsGeometry = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const tempColor = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const distance = starDistance;
      positions[i3] = distance * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = distance * Math.cos(phi);
      positions[i3 + 2] = distance * Math.sin(phi) * Math.sin(theta);

      tempColor.setHSL(
        Math.random(),
        0.6 + Math.random() * 0.3,
        0.6 + Math.random() * 0.4
      );
      colors[i3] = tempColor.r;
      colors[i3 + 1] = tempColor.g;
      colors[i3 + 2] = tempColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [starCount, starDistance]);

  useEffect(() => {
    return () => {
      starsGeometry.dispose();
    };
  }, [starsGeometry]);

  const starsMaterial = useMemo(() => {
    const material = new THREE.PointsMaterial({
      size: starSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });
    material.toneMapped = false;
    return material;
  }, [starSize]);

  useEffect(() => {
    return () => {
      starsMaterial.dispose();
    };
  }, [starsMaterial]);

  const baseDirection = useMemo(() => {
    const dir = baseSunDirection.clone();
    if (dir.lengthSq() === 0) {
      dir.copy(defaultSunDirection);
    }
    dir.normalize();
    return dir;
  }, [baseSunDirection]);

  const orbitAxis = useMemo(() => {
    const axis = sunOrbitAxis.clone().normalize();
    if (axis.lengthSq() === 0) {
      axis.set(0, 1, 0);
    }
    return axis;
  }, [sunOrbitAxis]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.position.copy(camera.position);

    const progress = (clock.elapsedTime * dayCycleSpeed) % 1;
    skyMaterial.uniforms.uDayCycleProgress.value = progress;

    const angle = progress * Math.PI * 2.0;

    const quaternion = new THREE.Quaternion().setFromAxisAngle(
      orbitAxis,
      angle
    );
    sunDirectionRef.current
      .copy(baseDirection)
      .applyQuaternion(quaternion)
      .normalize();

    skyMaterial.uniforms.uSunPosition.value.copy(sunDirectionRef.current);

    const dayFactor = THREE.MathUtils.clamp(
      0.5 - Math.cos(progress * Math.PI * 2.0) * 0.5,
      0,
      1
    );
    const starOpacity = THREE.MathUtils.lerp(0.95, 0.05, dayFactor);
    starsMaterial.opacity = starOpacity;
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={skyGeometry}
        material={skyMaterial}
        renderOrder={-1}
        frustumCulled={false}
      />
      <points geometry={starsGeometry} material={starsMaterial} />
    </group>
  );
};
