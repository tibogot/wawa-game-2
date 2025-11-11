import { useRef, useMemo, useEffect, forwardRef } from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import alea from "alea";

// Create a seeded noise generator
function createNoiseGenerator(seed = 0) {
  const prng = alea(seed);
  const noise2D = createNoise2D(prng);
  return (x, y) => noise2D(x, y);
}

// Fractional Brownian Motion - the key to smooth, natural terrain
function fBm(noiseFunc, x, y, octaves, frequency, persistence, lacunarity) {
  let total = 0;
  let amplitude = 1;
  let maxValue = 0;
  let freq = frequency;

  for (let i = 0; i < octaves; i++) {
    total += noiseFunc(x * freq, y * freq) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    freq *= lacunarity;
  }

  return total / maxValue;
}

// HEIGHT CALCULATION WITH PROPER DRAMATIC SCALE
function getTerrainHeight(x, z, noise1, noise2, noise3) {
  // LARGE BASE TERRAIN - Creates the main landscape (80m hills)
  const baseHeight =
    fBm(
      noise1,
      x,
      z,
      4, // More octaves for detail
      0.00015, // LOWER frequency = BIGGER features
      0.5,
      2.0
    ) * 80; // 80m tall base hills

  // ROUNDED HILLS - Billow noise creates smooth bumps (60m)
  const billow = Math.abs(fBm(noise2, x, z, 4, 0.0003, 0.5, 2.0)) * 60;

  // MOUNTAIN RIDGES - Sharp peaks using inverted noise
  const ridgeNoise = fBm(noise3, x + 3000, z + 3000, 3, 0.00045, 0.5, 2.0);
  const ridges = Math.pow(1 - Math.abs(ridgeNoise), 2.0) * 70;

  // VALLEYS - Negative areas (40m deep)
  const valleyNoise = fBm(noise1, x + 5000, z + 5000, 2, 0.0002, 0.5, 2.0);
  const valleys = Math.min(0, valleyNoise) * 40;

  // FINE DETAIL - Small variations for realism
  const detail = fBm(noise2, x + 7000, z + 7000, 3, 0.0009, 0.4, 2.0) * 12;

  // COMBINE ALL LAYERS
  let height = baseHeight + billow + ridges + valleys + detail;

  // EDGE FADEOUT - Smooth boundaries
  const distanceFromCenter = Math.sqrt(x * x + z * z);
  const mapRadius = 1800; // Adjusted for 4000m map
  const fadeStart = mapRadius * 0.65;

  if (distanceFromCenter > fadeStart) {
    const fadeAmount = Math.min(
      1,
      (distanceFromCenter - fadeStart) / (mapRadius - fadeStart)
    );
    const easedFade = fadeAmount * fadeAmount * (3 - 2 * fadeAmount);
    height *= 1 - easedFade * 0.85;
  }

  return height;
}

export const ProceduralTerrain19 = forwardRef(
  (
    {
      size = 4000, // Total map size
      segments = 256, // Vertices per edge (256 is smooth!)
      seed = 12345,
      onTerrainReady,
      onHeightmapReady,
      ...groupProps
    },
    ref
  ) => {
    const meshRef = useRef();

    // Create noise generators once
    const noiseGenerators = useMemo(
      () => ({
        noise1: createNoiseGenerator(seed),
        noise2: createNoiseGenerator(seed + 1000),
        noise3: createNoiseGenerator(seed + 2000),
      }),
      [seed]
    );

    const geometry = useMemo(() => {
      console.log("Generating terrain geometry...");
      const geo = new THREE.PlaneGeometry(size, size, segments, segments);
      const positions = geo.attributes.position.array;

      // Apply height to every vertex
      for (let i = 0; i < positions.length; i += 3) {
        const worldX = positions[i];
        const worldZ = positions[i + 1];
        const height = getTerrainHeight(
          worldX,
          worldZ,
          noiseGenerators.noise1,
          noiseGenerators.noise2,
          noiseGenerators.noise3
        );
        positions[i + 2] = height;
      }

      geo.computeVertexNormals(); // CRITICAL for smooth shading
      console.log("Terrain geometry complete!");
      return geo;
    }, [size, segments, noiseGenerators]);

    useEffect(() => {
      return () => {
        geometry.dispose();
      };
    }, [geometry]);

    const material = useMemo(() => {
      const mat = new THREE.MeshStandardMaterial({
        flatShading: false, // Smooth shading
        roughness: 0.9,
        metalness: 0.0,
      });

      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>
        varying float vHeight;`
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
        vHeight = position.z;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
        varying float vHeight;
        
        vec3 getTerrainColor(float height) {
          vec3 deepWater = vec3(0.1, 0.2, 0.35);
          vec3 water = vec3(0.2, 0.4, 0.5);
          vec3 sand = vec3(0.8, 0.7, 0.5);
          vec3 grass = vec3(0.3, 0.5, 0.2);
          vec3 darkGrass = vec3(0.22, 0.38, 0.18);
          vec3 rock = vec3(0.4, 0.4, 0.35);
          vec3 darkRock = vec3(0.3, 0.3, 0.28);
          vec3 snow = vec3(0.9, 0.9, 0.95);
          
          if (height < -15.0) {
            return deepWater;
          } else if (height < -5.0) {
            float t = smoothstep(-15.0, -5.0, height);
            return mix(deepWater, water, t);
          } else if (height < 0.0) {
            float t = smoothstep(-5.0, 0.0, height);
            return mix(water, sand, t);
          } else if (height < 10.0) {
            float t = smoothstep(0.0, 10.0, height);
            return mix(sand, grass, t);
          } else if (height < 80.0) {
            float t = smoothstep(10.0, 80.0, height);
            return mix(grass, darkGrass, t);
          } else if (height < 130.0) {
            float t = smoothstep(80.0, 130.0, height);
            return mix(darkGrass, rock, t);
          } else if (height < 160.0) {
            float t = smoothstep(130.0, 160.0, height);
            return mix(rock, darkRock, t);
          } else {
            float t = smoothstep(160.0, 200.0, height);
            return mix(darkRock, snow, t);
          }
        }`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
        diffuseColor.rgb = getTerrainColor(vHeight);`
        );
      };

      return mat;
    }, []);

    useEffect(() => {
      return () => {
        material.dispose();
      };
    }, [material]);

    const heightmapLookup = useMemo(
      () => (x, z) =>
        getTerrainHeight(
          x,
          z,
          noiseGenerators.noise1,
          noiseGenerators.noise2,
          noiseGenerators.noise3
        ),
      [noiseGenerators]
    );

    // Provide heightmap lookup function
    useEffect(() => {
      if (onHeightmapReady) {
        onHeightmapReady(heightmapLookup);
      }
    }, [heightmapLookup, onHeightmapReady]);

    // Call ready callback
    useEffect(() => {
      if (!onTerrainReady) {
        return;
      }

      const timer = setTimeout(
        () => onTerrainReady(meshRef.current ?? null),
        100
      );
      return () => clearTimeout(timer);
    }, [onTerrainReady, geometry]);

    useEffect(() => {
      if (!ref) {
        return;
      }

      const current = meshRef.current ?? null;
      if (typeof ref === "function") {
        ref(current);
      } else {
        ref.current = current;
      }

      return () => {
        if (typeof ref === "function") {
          ref(null);
        } else if (ref) {
          ref.current = null;
        }
      };
    }, [ref, geometry]);

    return (
      <group {...groupProps}>
        <RigidBody type="fixed" colliders="trimesh">
          <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            castShadow
          />
        </RigidBody>
      </group>
    );
  }
);

ProceduralTerrain19.displayName = "ProceduralTerrain19";
