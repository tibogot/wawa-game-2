import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ShorelineEffectProps {
  terrainSize?: number;
  waterLevel?: number;
  enableShoreline?: boolean;
  shorelineIntensity?: number;
  shorelineWidth?: number;
  shorelineColor1?: string;
  shorelineColor2?: string;
  waveSpeed?: number;
  waveAmplitude?: number;
  noiseScale?: number;
  gradientSharpness?: number;
  debugMode?: boolean;
}

export const ShorelineEffect: React.FC<ShorelineEffectProps> = ({
  terrainSize = 200,
  waterLevel = 10,
  enableShoreline = false,
  shorelineIntensity = 2.5,
  shorelineWidth = 15.0,
  shorelineColor1 = "#ffffff",
  shorelineColor2 = "#87ceeb",
  waveSpeed = 3.0,
  waveAmplitude = 1.5,
  noiseScale = 0.02,
  gradientSharpness = 2.0,
  debugMode = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  // Create shoreline geometry - large plane slightly above water level
  const shorelineGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      terrainSize * 1.2, // Slightly larger than terrain
      terrainSize * 1.2,
      64, // High resolution for smooth effects
      64
    );

    // Rotate to make it horizontal
    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }, [terrainSize]);

  // Create shoreline shader material
  const shorelineMaterial = useMemo(() => {
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      uniform float time;
      uniform float waveSpeed;
      uniform float waveAmplitude;
      
      // Noise functions
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      float fbm(vec2 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < octaves; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }
      
      void main() {
        vUv = uv;
        
        vec3 pos = position;
        
        // Add subtle wave displacement for shoreline animation
        float wave1 = fbm(uv * 8.0 + time * waveSpeed, 3) * waveAmplitude * 0.1;
        float wave2 = fbm(uv * 4.0 - time * waveSpeed * 0.7, 2) * waveAmplitude * 0.05;
        
        pos.y += wave1 + wave2;
        
        // Calculate world position
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;
        vViewPosition = -(modelViewMatrix * vec4(pos, 1.0)).xyz;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      uniform bool showShoreline;
      uniform float time;
      uniform float waterLevel;
      uniform float shorelineIntensity;
      uniform float shorelineWidth;
      uniform vec3 shorelineColor1;
      uniform vec3 shorelineColor2;
      uniform float waveSpeed;
      uniform float waveAmplitude;
      uniform float noiseScale;
      uniform float gradientSharpness;
      uniform float terrainSize;
      uniform bool debugMode;
      
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      // Same noise functions as vertex shader
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      float fbm(vec2 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < octaves; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }
      
      // Calculate terrain height (same as your terrain generation)
      float getTerrainHeight(vec2 pos) {
        float x = pos.x;
        float z = pos.y;
        float distanceFromCenter = length(pos);
        float maxDistance = terrainSize / 2.0;
        float normalizedDistance = min(distanceFromCenter / maxDistance, 1.0);
        
        float y = 0.0;
        
        // Large hills - only at edges
        if (normalizedDistance > 0.6) {
          float edgeFactor = (normalizedDistance - 0.6) / 0.4;
          y += sin(x * 0.02) * cos(z * 0.02) * 8.0 * edgeFactor;
          y += sin(x * 0.05) * cos(z * 0.05) * 4.0 * edgeFactor;
        }
        
        // Medium hills
        float mediumFactor = 0.3 + 0.7 * normalizedDistance;
        y += sin(x * 0.05) * cos(z * 0.05) * 3.0 * mediumFactor;
        y += sin(x * 0.1) * cos(z * 0.1) * 2.0 * mediumFactor;
        y += sin(x * 0.1) * cos(z * 0.1) * 1.5;
        y += sin(x * 0.2) * cos(z * 0.2) * 0.8;
        y += sin(x * 0.3) * cos(z * 0.3) * 0.4;
        
        // Random variation
        float seed = sin(x * 12.9898 + z * 78.233) * 43758.5453;
        y += (fract(seed) - 0.5) * 0.1;
        
        return y;
      }
      
      void main() {
        if (!showShoreline) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          return;
        }
        
        // Calculate distance from water level
        float terrainHeight = getTerrainHeight(vWorldPosition.xz);
        float distanceFromWater = waterLevel - terrainHeight;
        
        // Debug mode - show effect everywhere
        if (debugMode) {
          distanceFromWater = 5.0; // Force shoreline effect everywhere
        }
        
        // Create animated noise for wave-like shoreline - ENHANCED
        float noise1 = fbm(vWorldPosition.xz * noiseScale + time * waveSpeed, 3);
        float noise2 = fbm(vWorldPosition.xz * noiseScale * 2.0 - time * waveSpeed * 1.3, 2);
        float noise3 = fbm(vWorldPosition.xz * noiseScale * 4.0 + time * waveSpeed * 0.7, 2);
        float noise4 = fbm(vWorldPosition.xz * noiseScale * 8.0 + time * waveSpeed * 2.0, 2);
        
        // Combine noises for complex wave pattern - MORE DRAMATIC
        float combinedNoise = (noise1 + noise2 * 0.7 + noise3 * 0.5 + noise4 * 0.3) / 2.5;
        
        // Add directional wave patterns
        float waveX = sin(vWorldPosition.x * 0.1 + time * waveSpeed * 1.5) * 0.3;
        float waveZ = cos(vWorldPosition.z * 0.08 + time * waveSpeed * 1.2) * 0.3;
        float directionalWaves = (waveX + waveZ) * 0.5;
        
        // Create wave-like shoreline with noise - MORE VISIBLE
        float waveOffset = (combinedNoise + directionalWaves) * waveAmplitude * shorelineWidth * 2.0;
        float adjustedDistance = distanceFromWater + waveOffset;
        
        // Create gradient based on distance from water
        float gradient = 1.0 - smoothstep(0.0, shorelineWidth, adjustedDistance);
        gradient = pow(gradient, gradientSharpness);
        
        // Add additional wave patterns - MORE VISIBLE
        float wavePattern1 = sin(vWorldPosition.x * 0.1 + time * waveSpeed * 2.0) * 0.3;
        float wavePattern2 = cos(vWorldPosition.z * 0.08 + time * waveSpeed * 1.5) * 0.3;
        float wavePattern3 = sin(vWorldPosition.x * 0.05 + vWorldPosition.z * 0.05 + time * waveSpeed * 3.0) * 0.2;
        float wavePattern = (wavePattern1 + wavePattern2 + wavePattern3) / 3.0;
        
        gradient += wavePattern * 0.6; // Increased from 0.3
        gradient = clamp(gradient, 0.0, 1.0);
        
        // Mix colors based on gradient
        vec3 finalColor = mix(shorelineColor2, shorelineColor1, gradient);
        
        // Apply intensity
        finalColor *= shorelineIntensity;
        
        // Create alpha based on gradient and distance from camera
        float alpha = gradient * 0.8; // Slightly transparent
        
        // Fade out at edges
        float edgeFade = 1.0 - smoothstep(terrainSize * 0.4, terrainSize * 0.5, length(vWorldPosition.xz));
        alpha *= edgeFade;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        showShoreline: { value: enableShoreline },
        time: { value: 0.0 },
        waterLevel: { value: waterLevel },
        shorelineIntensity: { value: shorelineIntensity },
        shorelineWidth: { value: shorelineWidth },
        shorelineColor1: { value: new THREE.Color(shorelineColor1) },
        shorelineColor2: { value: new THREE.Color(shorelineColor2) },
        waveSpeed: { value: waveSpeed },
        waveAmplitude: { value: waveAmplitude },
        noiseScale: { value: noiseScale },
        gradientSharpness: { value: gradientSharpness },
        terrainSize: { value: terrainSize },
        debugMode: { value: debugMode },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return material;
  }, [
    enableShoreline,
    waterLevel,
    shorelineIntensity,
    shorelineWidth,
    shorelineColor1,
    shorelineColor2,
    waveSpeed,
    waveAmplitude,
    noiseScale,
    gradientSharpness,
    terrainSize,
    debugMode,
  ]);

  // Update uniforms when props change
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.showShoreline.value = enableShoreline;
        material.uniforms.waterLevel.value = waterLevel;
        material.uniforms.shorelineIntensity.value = shorelineIntensity;
        material.uniforms.shorelineWidth.value = shorelineWidth;
        material.uniforms.shorelineColor1.value.set(shorelineColor1);
        material.uniforms.shorelineColor2.value.set(shorelineColor2);
        material.uniforms.waveSpeed.value = waveSpeed;
        material.uniforms.waveAmplitude.value = waveAmplitude;
        material.uniforms.noiseScale.value = noiseScale;
        material.uniforms.gradientSharpness.value = gradientSharpness;
        material.uniforms.terrainSize.value = terrainSize;
        material.uniforms.debugMode.value = debugMode;
      }
    }
  }, [
    enableShoreline,
    waterLevel,
    shorelineIntensity,
    shorelineWidth,
    shorelineColor1,
    shorelineColor2,
    waveSpeed,
    waveAmplitude,
    noiseScale,
    gradientSharpness,
    terrainSize,
    debugMode,
  ]);

  // Animate the shoreline
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.time) {
        // Use the frame time for smoother animation
        const currentTime = state.clock.elapsedTime;
        material.uniforms.time.value = currentTime;

        // Debug: Log time every 2 seconds to verify animation
        if (
          Math.floor(currentTime) % 2 === 0 &&
          Math.floor(currentTime) !== Math.floor(currentTime - 0.016)
        ) {
          console.log("Shoreline time:", currentTime);
        }
      }
    }
  });

  return (
    <>
      {enableShoreline && (
        <mesh
          ref={meshRef}
          geometry={shorelineGeometry}
          material={shorelineMaterial}
          position={[0, waterLevel + 0.01, 0]} // Slightly above water level
        />
      )}
    </>
  );
};
