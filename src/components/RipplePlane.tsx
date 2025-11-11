import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RipplePlaneProps {
  position?: [number, number, number];
  size?: number;
  segments?: number;
  characterPosition?: THREE.Vector3 | null;
  rippleRadius?: number;
  rippleStrength?: number;
  rippleSpeed?: number;
  rippleFrequency?: number;
  color?: string;
  opacity?: number;
}

export const RipplePlane: React.FC<RipplePlaneProps> = ({
  position = [0, 0, 0],
  size = 50,
  segments = 64,
  characterPosition = null,
  rippleRadius = 5.0,
  rippleStrength = 0.5,
  rippleSpeed = 2.0,
  rippleFrequency = 2.0,
  color = "#4a90e2",
  opacity = 0.8,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Create plane geometry with good segments for smooth ripples
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size, segments, segments);
  }, [size, segments]);

  // Create material with custom shader for ripple effect
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      transparent: opacity < 1.0,
      opacity: opacity,
      side: THREE.DoubleSide,
    });

    mat.onBeforeCompile = (shader) => {
      // Add uniforms - initialize with default values
      shader.uniforms.u_time = { value: 0.0 };
      shader.uniforms.u_playerPosition = { value: new THREE.Vector3(0, 0, 0) };
      shader.uniforms.u_rippleRadius = { value: rippleRadius };
      shader.uniforms.u_rippleStrength = { value: rippleStrength };
      shader.uniforms.u_rippleSpeed = { value: rippleSpeed };
      shader.uniforms.u_rippleFrequency = { value: rippleFrequency };

      // Add uniforms and varyings to vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
        #include <common>
        
        uniform float u_time;
        uniform vec3 u_playerPosition;
        uniform float u_rippleRadius;
        uniform float u_rippleStrength;
        uniform float u_rippleSpeed;
        uniform float u_rippleFrequency;
        
        varying vec2 vUv;
        varying float vDistToPlayer;
        varying vec3 vWorldPosition;
        `
      );

      // Modify vertex shader to add ripple displacement
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        
        // Store UV for fragment shader
        vUv = uv;
        
        // Calculate world position of this vertex BEFORE displacement
        vec3 worldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldPosition = worldPos; // Pass to fragment shader
        
        // Calculate horizontal distance to player (ignore Y-axis for ground plane)
        vec2 playerPosXZ = vec2(u_playerPosition.x, u_playerPosition.z);
        vec2 vertexPosXZ = vec2(worldPos.x, worldPos.z);
        float distToPlayer = distance(vertexPosXZ, playerPosXZ);
        
        // Store distance for fragment shader
        vDistToPlayer = distToPlayer;
        
        // Create ripple effect with expanding wave
        float ripple = 0.0;
        if (distToPlayer < u_rippleRadius && u_rippleStrength > 0.01) {
          // Create expanding wave using time and distance
          // Wave travels outward: wavePhase = distToPlayer - (time * speed)
          float wavePhase = distToPlayer * u_rippleFrequency - u_time * u_rippleSpeed;
          
          // Sine wave for ripple shape (multiple waves for nice effect)
          float wave1 = sin(wavePhase); // -1 to 1
          float wave2 = sin(wavePhase * 2.0) * 0.5; // Higher frequency wave
          
          // Combine waves
          float wave = wave1 + wave2;
          
          // Distance-based falloff (stronger near center, fades at edges)
          float normalizedDist = distToPlayer / u_rippleRadius;
          float distanceFalloff = 1.0 - normalizedDist;
          distanceFalloff = pow(distanceFalloff, 1.5); // Smooth falloff
          
          // Calculate ripple displacement - make it more visible
          ripple = wave * distanceFalloff * u_rippleStrength * 0.5;
        }
        
        // Apply ripple displacement along Y-axis (upward)
        transformed.y += ripple;
        `
      );

      // Add fragment shader effects - Simplex noise/distortion that follows player
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
        #include <common>
        
        uniform float u_time;
        uniform vec3 u_playerPosition;
        uniform float u_rippleRadius;
        uniform float u_rippleStrength;
        
        varying vec2 vUv;
        varying float vDistToPlayer;
        varying vec3 vWorldPosition;
        
        // Simplex noise function (GLSL implementation)
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec2 mod289(vec2 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec3 permute(vec3 x) {
          return mod289(((x*34.0)+1.0)*x);
        }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        // Fractional Brownian Motion (fBm) for smoother, larger-scale noise
        float fbm(vec2 p, int octaves) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          for (int i = 0; i < 4; i++) {
            if (i >= octaves) break;
            value += amplitude * snoise(p * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        
        // Player interaction visual effect - Simplex noise/distortion that follows player
        float interactionEffect = 0.0;
        vec3 playerGlow = vec3(0.0);
        
        if (vDistToPlayer < u_rippleRadius) {
          // Normalize distance
          float normalizedDist = vDistToPlayer / u_rippleRadius;
          
          // Distance falloff (smooth fade)
          float distanceFalloff = 1.0 - normalizedDist;
          distanceFalloff = pow(distanceFalloff, 1.5);
          
          // Use world position relative to player for noise sampling
          // This makes the noise pattern follow the player's actual position
          vec2 worldPos = vec2(vWorldPosition.x, vWorldPosition.z);
          vec2 playerWorldPos = vec2(u_playerPosition.x, u_playerPosition.z);
          vec2 playerRelative = worldPos - playerWorldPos;
          
          // Use larger scale for smoother, more visible distortion
          float noiseScale = 0.5; // Smaller scale value = larger pattern size
          
          // Animated noise coordinates (follows player, animates over time)
          vec2 noiseCoord = playerRelative * noiseScale + vec2(u_time * 0.3, u_time * 0.2);
          
          // Multi-octave Simplex noise for smooth, organic distortion
          float n = fbm(noiseCoord, 3); // 3 octaves for smoothness
          n = n * 0.5 + 0.5; // Normalize to 0-1
          n = n * 2.0 - 1.0; // Convert to -1 to 1
          
          // Larger scale distortion - multiply noise by falloff
          interactionEffect = n * distanceFalloff * 0.8; // Increased for more visibility
          
          // Add color tint around player (subtle blue/cyan glow)
          playerGlow = vec3(0.3, 0.6, 1.0) * distanceFalloff * 0.6;
        }
        
        // Apply noise-based distortion and glow to color
        diffuseColor.rgb += interactionEffect;
        diffuseColor.rgb += playerGlow;
        `
      );

      // Store shader reference for uniform updates
      mat.userData.shader = shader;
    };

    return mat;
  }, [
    color,
    opacity,
    characterPosition,
    rippleRadius,
    rippleStrength,
    rippleSpeed,
    rippleFrequency,
  ]);

  // Update time and player position uniforms every frame
  useFrame((state, delta) => {
    if (!meshRef.current || !meshRef.current.material) return;

    timeRef.current += delta;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (mat.userData.shader) {
      const shader = mat.userData.shader;

      // Update time
      if (shader.uniforms.u_time) {
        shader.uniforms.u_time.value = timeRef.current;
      }

      // Update player position - ALWAYS update, even if null (use zero)
      if (shader.uniforms.u_playerPosition) {
        if (characterPosition) {
          shader.uniforms.u_playerPosition.value.copy(characterPosition);
        } else {
          shader.uniforms.u_playerPosition.value.set(0, 0, 0);
        }
      }

      // Update ripple parameters in case they changed
      if (shader.uniforms.u_rippleRadius) {
        shader.uniforms.u_rippleRadius.value = rippleRadius;
      }
      if (shader.uniforms.u_rippleStrength) {
        shader.uniforms.u_rippleStrength.value = rippleStrength;
      }
      if (shader.uniforms.u_rippleSpeed) {
        shader.uniforms.u_rippleSpeed.value = rippleSpeed;
      }
      if (shader.uniforms.u_rippleFrequency) {
        shader.uniforms.u_rippleFrequency.value = rippleFrequency;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat (XZ plane)
      receiveShadow
    />
  );
};
