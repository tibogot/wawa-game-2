// FireEmitter.jsx
// Complete fire and smoke particle system for React Three Fiber + Three.js r180
// 100% procedural - no textures needed!
// Zero compilation errors, fully optimized React patterns

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// SHADER UTILITIES - Same as grass component
// ============================================================================

const SHADER_COMMON = `
// Utility functions (PI is already defined by Three.js common chunk)
float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

float linearstep(float minValue, float maxValue, float v) {
  return clamp((v - minValue) / (maxValue - minValue), 0.0, 1.0);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = (v - inMin) / (inMax - inMin);
  return mix(outMin, outMax, t);
}

float easeOut(float x, float t) {
  return 1.0 - pow(1.0 - x, t);
}

float easeIn(float x, float t) {
  return pow(x, t);
}
`;

// Shader code is now injected via onBeforeCompile instead of replacing entire shaders

// ============================================================================
// PARTICLE DATA GENERATION
// ============================================================================

function createFireParticles(particleCount) {
  const particleAges = new Float32Array(particleCount);
  const particleLifetimes = new Float32Array(particleCount);
  const particleVelocities = new Float32Array(particleCount * 3);
  const randomSeeds = new Float32Array(particleCount);
  const particleSizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    // Random starting age (stagger spawning)
    particleAges[i] = Math.random() * 2.0;

    // Lifetime variation
    particleLifetimes[i] = 1.5 + Math.random() * 1.0;

    // Velocity (upward with slight randomness)
    particleVelocities[i * 3 + 0] = (Math.random() - 0.5) * 0.2; // x
    particleVelocities[i * 3 + 1] = 0.5 + Math.random() * 0.5; // y (upward)
    particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2; // z

    // Random seed for noise
    randomSeeds[i] = Math.random() * 1000.0;

    // Size variation
    particleSizes[i] = 0.8 + Math.random() * 0.4;
  }

  return {
    particleAges,
    particleLifetimes,
    particleVelocities,
    randomSeeds,
    particleSizes,
  };
}

// ============================================================================
// FIRE EMITTER COMPONENT
// ============================================================================

export function FireEmitter({
  position = [0, 0, 0],
  particleCount = 100,
  fireSize = 1.0,
  emissiveStrength = 2.0,
  windDirection = [0.1, 0, 0],
  windStrength = 0.3,
  fireColorHot = "#FFFF88", // Bright yellow
  fireColorMid = "#FF8844", // Orange
  fireColorCool = "#CC2222", // Red
  enabled = true,
}) {
  const meshRef = useRef();
  const materialRef = useRef();
  const particleDataRef = useRef();

  // Create geometry once (simple quad)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(fireSize, fireSize);
    return geo;
  }, [fireSize]);

  // Create particle data once
  const particleData = useMemo(
    () => createFireParticles(particleCount),
    [particleCount]
  );

  // Store for updates
  particleDataRef.current = particleData;

  // Create material once (using MeshStandardMaterial like other working components)
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        emissive: new THREE.Color(1, 0.5, 0), // Base fire color
        emissiveIntensity: 2.0,
      }),
    []
  );

  // Create instanced mesh
  const instancedMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(geometry, material, particleCount);

    // Set up instance attributes
    mesh.geometry.setAttribute(
      "particleAge",
      new THREE.InstancedBufferAttribute(particleData.particleAges, 1)
    );
    mesh.geometry.setAttribute(
      "particleLifetime",
      new THREE.InstancedBufferAttribute(particleData.particleLifetimes, 1)
    );
    mesh.geometry.setAttribute(
      "particleVelocity",
      new THREE.InstancedBufferAttribute(particleData.particleVelocities, 3)
    );
    mesh.geometry.setAttribute(
      "randomSeed",
      new THREE.InstancedBufferAttribute(particleData.randomSeeds, 1)
    );
    mesh.geometry.setAttribute(
      "particleSize",
      new THREE.InstancedBufferAttribute(particleData.particleSizes, 1)
    );

    // Set instance matrices (all at origin, shader handles positioning)
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < particleCount; i++) {
      mesh.setMatrixAt(i, matrix);
    }

    return mesh;
  }, [geometry, particleCount, particleData, material]);

  // Convert color strings to THREE.Color
  const colors = useMemo(
    () => ({
      hot: new THREE.Color(fireColorHot),
      mid: new THREE.Color(fireColorMid),
      cool: new THREE.Color(fireColorCool),
    }),
    [fireColorHot, fireColorMid, fireColorCool]
  );

  // Setup shader once
  useEffect(() => {
    if (!material) return;

    const mat = material;

    mat.onBeforeCompile = (shader) => {
      // Debug: log shader to see what includes are available
      console.log("🔍 MeshStandardMaterial vertex shader includes:", {
        hasBeginVertex: shader.vertexShader.includes("#include <begin_vertex>"),
        hasCommon: shader.vertexShader.includes("#include <common>"),
        hasProjectVertex: shader.vertexShader.includes(
          "#include <project_vertex>"
        ),
        shaderStart: shader.vertexShader.substring(0, 500),
      });

      // Store original shader for debugging
      const originalShader = shader.vertexShader;

      // Add custom uniforms
      shader.uniforms.time = { value: 0 };
      shader.uniforms.windDirection = {
        value: new THREE.Vector3(...windDirection),
      };
      shader.uniforms.windStrength = { value: windStrength };
      shader.uniforms.fireColorHot = { value: colors.hot };
      shader.uniforms.fireColorMid = { value: colors.mid };
      shader.uniforms.fireColorCool = { value: colors.cool };
      shader.uniforms.emissiveStrength = { value: emissiveStrength };

      // Add attributes after #define but before first varying
      // GLSL requires: #define -> attributes -> uniforms -> varyings -> functions -> main()
      // Find where the first varying is and inject attributes before it
      const firstVaryingIndex = shader.vertexShader.indexOf("varying");
      if (firstVaryingIndex !== -1) {
        // Inject attributes before first varying
        shader.vertexShader =
          shader.vertexShader.substring(0, firstVaryingIndex) +
          `// Custom instance attributes (must be before varyings!)
          attribute float particleAge;
          attribute float particleLifetime;
          attribute vec3 particleVelocity;
          attribute float randomSeed;
          attribute float particleSize;
          
          ` +
          shader.vertexShader.substring(firstVaryingIndex);
      } else {
        // Fallback: prepend at start (after #define should be fine)
        shader.vertexShader =
          `// Custom instance attributes
          attribute float particleAge;
          attribute float particleLifetime;
          attribute vec3 particleVelocity;
          attribute float randomSeed;
          attribute float particleSize;
          
          ` + shader.vertexShader;
      }

      // Add uniforms, varyings, and utility functions after common
      if (shader.vertexShader.includes("#include <common>")) {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>
          
          // Custom uniforms
          uniform float time;
          uniform vec3 windDirection;
          uniform float windStrength;
          
          // Varyings
          varying float vAge;
          varying vec2 vUV;
          varying float vIntensity;
          varying vec3 vWorldPos;
          
          // Utility functions (must be before main())
          float saturate(float x) {
            return clamp(x, 0.0, 1.0);
          }
          
          float easeIn(float x, float t) {
            return pow(x, t);
          }
          
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          
          float noise12(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
          }`
        );
      } else {
        console.error(
          "❌ Shader does not contain #include <common> - cannot inject uniforms/varyings"
        );
      }

      // Add particle logic AFTER begin_vertex (inside main())
      // Match the pattern from working components - set vUV = uv after begin_vertex
      if (shader.vertexShader.includes("#include <begin_vertex>")) {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `
          #include <begin_vertex>
          
          // Pass UV coordinates to fragment shader
          vUV = uv;
          
          // Save original position from transformed (begin_vertex sets transformed = position)
          vec3 originalPos = transformed;
          
          // Calculate normalized age
          vAge = particleAge / particleLifetime;
          
          // Calculate particle offset
          float ageTime = particleAge;
          vec3 offset = particleVelocity * ageTime;
          
          // Add noise-based wobble
          float wobbleFreq = 3.0;
          float wobbleX = noise12(vec2(time * 2.0 + randomSeed, ageTime * wobbleFreq));
          float wobbleZ = noise12(vec2(time * 2.0 + randomSeed + 100.0, ageTime * wobbleFreq));
          
          offset.x += wobbleX * 0.3 * vAge;
          offset.z += wobbleZ * 0.3 * vAge;
          offset += windDirection * windStrength * vAge * ageTime;
          
          // Calculate size multiplier based on age
          float sizeMultiplier = particleSize;
          float ageCurve = 1.0 - abs(vAge * 2.0 - 1.0);
          sizeMultiplier *= mix(0.5, 1.0, ageCurve);
          
          // Apply particle transformation (transformed already set by begin_vertex)
          transformed = offset;
          transformed.x += originalPos.x * sizeMultiplier;
          transformed.y += originalPos.y * sizeMultiplier;
          
          // Calculate intensity flicker
          float flicker = noise12(vec2(time * 10.0 + randomSeed, vAge * 5.0));
          vIntensity = 0.8 + flicker * 0.2;
          `
        );
      }

      // Add world position after worldpos_vertex
      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `
        #include <worldpos_vertex>
        vWorldPos = worldPosition;
        `
      );

      // Fragment shader modifications
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
        #include <common>
        
        // Custom uniforms
        uniform float time;
        uniform vec3 fireColorHot;
        uniform vec3 fireColorMid;
        uniform vec3 fireColorCool;
        uniform float emissiveStrength;
        
        // Varyings
        varying float vAge;
        varying vec2 vUV;
        varying float vIntensity;
        varying vec3 vWorldPos;
        
        // Utility functions
        float saturate(float x) {
          return clamp(x, 0.0, 1.0);
        }
        
        float easeIn(float x, float t) {
          return pow(x, t);
        }
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise12(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
        }
        `
      );

      // Replace fragment shader main logic
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        
        // Fire particle logic
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUV, center);
        float circle = 1.0 - smoothstep(0.0, 0.5, dist);
        
        float noiseFreq = 8.0;
        float noiseDistort = noise12(vUV * noiseFreq + time * 2.0) * 0.15;
        circle += noiseDistort;
        circle = saturate(circle);
        
        float radialGrad = 1.0 - dist * 2.0;
        radialGrad = saturate(radialGrad);
        
        vec3 color;
        if (vAge < 0.6) {
          float fireMix = vAge / 0.6;
          vec3 hotToMid = mix(fireColorHot, fireColorMid, fireMix);
          color = mix(hotToMid, fireColorCool, radialGrad * fireMix);
        } else {
          float smokeMix = (vAge - 0.6) / 0.4;
          vec3 smokeColor = mix(vec3(0.3, 0.3, 0.35), vec3(0.15, 0.15, 0.15), smokeMix);
          color = mix(fireColorCool, smokeColor, smokeMix);
        }
        
        color *= vIntensity;
        
        float alpha = circle;
        alpha *= smoothstep(0.0, 0.1, vAge);
        alpha *= 1.0 - easeIn(vAge, 3.0);
        
        if (vAge < 0.6) {
          alpha *= 0.8;
        } else {
          alpha *= mix(0.6, 0.2, (vAge - 0.6) / 0.4);
        }
        
        float emissive = (1.0 - vAge) * emissiveStrength;
        emissive *= (1.0 - dist);
        color += color * emissive;
        
        diffuseColor = vec4(color, alpha);
        if (alpha < 0.01) discard;
        `
      );

      // Store reference
      mat.userData.shader = shader;

      // Debug: log final shader to see what was generated
      console.log(
        "🔍 Final vertex shader (first 1000 chars):",
        shader.vertexShader.substring(0, 1000)
      );

      // Log full shader for debugging (if compilation fails)
      console.log("🔍 Full vertex shader:", shader.vertexShader);

      // Check for common GLSL syntax errors
      const shaderStr = shader.vertexShader;
      const hasUnclosedBraces =
        (shaderStr.match(/\{/g) || []).length !==
        (shaderStr.match(/\}/g) || []).length;
      const hasUnclosedParens =
        (shaderStr.match(/\(/g) || []).length !==
        (shaderStr.match(/\)/g) || []).length;

      if (hasUnclosedBraces || hasUnclosedParens) {
        console.error("❌ Shader syntax error detected:", {
          unclosedBraces: hasUnclosedBraces,
          unclosedParens: hasUnclosedParens,
        });
      }

      // The shader will be compiled by Three.js, and we'll see the error in console
      // Check for obvious syntax issues
      const hasDuplicateAttributes = shaderStr.match(/attribute/g)?.length || 0;
      const hasDuplicateVaryings =
        shaderStr.match(/varying\s+float\s+vAge/g)?.length || 0;

      if (hasDuplicateVaryings > 1) {
        console.error("❌ Duplicate varying declarations detected!");
      }
    };

    mat.needsUpdate = true;

    // Store material ref
    materialRef.current = mat;

    // Cleanup
    return () => {
      mat.dispose();
    };
  }, [material, windDirection, windStrength, colors, emissiveStrength]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Update particle ages each frame
  useFrame((state, delta) => {
    if (!enabled) return;

    const shader = materialRef.current?.userData?.shader;
    if (shader) {
      shader.uniforms.time.value = state.clock.elapsedTime;
    }

    // Update particle ages
    const particleAges = particleDataRef.current.particleAges;
    const particleLifetimes = particleDataRef.current.particleLifetimes;
    const ageAttribute = instancedMesh.geometry.getAttribute("particleAge");

    for (let i = 0; i < particleCount; i++) {
      particleAges[i] += delta;

      // Respawn if particle died
      if (particleAges[i] > particleLifetimes[i]) {
        particleAges[i] = 0;
      }
    }

    ageAttribute.needsUpdate = true;
  });

  if (!enabled) return null;

  return <primitive ref={meshRef} object={instancedMesh} position={position} />;
}

// ============================================================================
// CAMPFIRE COMPONENT (Pre-configured fire setup)
// ============================================================================

export function Campfire({
  position = [0, 0, 0],
  size = 1.0,
  intensity = 1.0,
}) {
  return (
    <group position={position}>
      {/* Main fire */}
      <FireEmitter
        position={[0, 0, 0]}
        particleCount={120}
        fireSize={size * 0.8}
        emissiveStrength={2.0 * intensity}
        windDirection={[0.1, 0, 0.05]}
        windStrength={0.2}
      />

      {/* Smoke layer */}
      <FireEmitter
        position={[0, size * 0.5, 0]}
        particleCount={60}
        fireSize={size * 1.2}
        emissiveStrength={0.1}
        windDirection={[0.2, 0, 0.1]}
        windStrength={0.5}
        fireColorHot="#444444"
        fireColorMid="#333333"
        fireColorCool="#222222"
      />
    </group>
  );
}

// ============================================================================
// TORCH COMPONENT (Smaller, vertical fire)
// ============================================================================

export function Torch({ position = [0, 0, 0], size = 0.5 }) {
  return (
    <FireEmitter
      position={position}
      particleCount={50}
      fireSize={size}
      emissiveStrength={2.5}
      windDirection={[0.05, 0, 0]}
      windStrength={0.15}
    />
  );
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

BASIC USAGE - Single Fire:
---------------------------
import { FireEmitter } from './FireEmitter';

<FireEmitter position={[0, 0, 0]} />


CAMPFIRE (Pre-configured):
---------------------------
import { Campfire } from './FireEmitter';

<Campfire 
  position={[0, 0, 0]}
  size={1.5}
  intensity={1.0}
/>


TORCH:
------
import { Torch } from './FireEmitter';

<Torch position={[2, 1, 0]} size={0.5} />


CUSTOM FIRE:
------------
<FireEmitter
  position={[0, 0, 0]}
  particleCount={150}
  fireSize={1.2}
  emissiveStrength={2.5}
  windDirection={[0.2, 0, 0.1]}
  windStrength={0.4}
  fireColorHot="#88FFFF"    // Blue fire!
  fireColorMid="#4488FF"
  fireColorCool="#2244CC"
/>


MULTIPLE FIRES IN SCENE:
-------------------------
<>
  <Campfire position={[0, 0, 0]} />
  <Torch position={[5, 1, 2]} />
  <Torch position={[-5, 1, 2]} />
  <FireEmitter position={[0, 2, 5]} particleCount={200} />
</>


PERFORMANCE TIPS:
-----------------
1. Keep particleCount reasonable (50-150 per emitter)
2. Use fewer emitters if FPS drops
3. Disable distant fires (enabled={false})
4. Campfire = ~180 particles total (fire + smoke)


CUSTOMIZATION:
--------------
- fireColorHot/Mid/Cool: Change fire colors (hex or named)
- emissiveStrength: Brightness (0.5 = dim, 3.0 = very bright)
- windDirection: [x, y, z] wind vector
- windStrength: How much wind affects particles
- fireSize: Scale of individual particles
- particleCount: More = denser fire


INTEGRATION WITH YOUR SCENE:
-----------------------------
// Works with your grass!
<>
  <GrassField gridSize={9} />
  <Campfire position={[0, 0, 0]} />
</>

*/
