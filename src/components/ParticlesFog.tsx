import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useControls, folder } from "leva";
import * as THREE from "three";
import { useGlobalWind } from "./GlobalWindProvider";

interface ParticlesFogProps {
  density?: number;
  areaSize?: number;
  height?: number;
  windInfluence?: number;
  opacity?: number;
  particleSize?: number;
  enableFog?: boolean;
  useTexture?: boolean;
  volumetricLayers?: number;
  getTerrainHeight?: (x: number, z: number) => number;
}

export const ParticlesFog: React.FC<ParticlesFogProps> = ({
  density: defaultDensity = 500,
  areaSize: defaultAreaSize = 100,
  height: defaultHeight = 30,
  windInfluence: defaultWindInfluence = 1.0,
  opacity: defaultOpacity = 0.3,
  particleSize: defaultParticleSize = 0.5,
  enableFog: defaultEnableFog = false,
  useTexture: defaultUseTexture = true,
  volumetricLayers: defaultVolumetricLayers = 3,
  getTerrainHeight,
}) => {
  // Internal controls
  const {
    particlesFogEnabled: enabled,
    particlesFogDensity: density,
    particlesFogAreaSize: areaSize,
    particlesFogHeight: height,
    particlesFogWindInfluence: windInfluence,
    particlesFogOpacity: opacity,
    particlesFogParticleSize: particleSize,
    particlesFogUseTexture: useTexture,
    particlesFogVolumetricLayers: volumetricLayers,
    particlesFogColor: color,
  } = useControls("🌤️ AMBIENCE", {
    "🌫️ Particles Fog": folder(
      {
        particlesFogEnabled: {
          value: defaultEnableFog,
          label: "Enable Fog",
        },
        particlesFogDensity: {
          value: defaultDensity,
          label: "Density",
          min: 100,
          max: 2000,
          step: 50,
        },
        particlesFogAreaSize: {
          value: defaultAreaSize,
          label: "Area Size",
          min: 20,
          max: 300,
          step: 10,
        },
        particlesFogHeight: {
          value: defaultHeight,
          label: "Height",
          min: 5,
          max: 100,
          step: 5,
        },
        particlesFogWindInfluence: {
          value: defaultWindInfluence,
          label: "Wind Influence",
          min: 0,
          max: 3,
          step: 0.1,
        },
        particlesFogOpacity: {
          value: defaultOpacity,
          label: "Opacity",
          min: 0.1,
          max: 1.0,
          step: 0.05,
        },
        particlesFogParticleSize: {
          value: defaultParticleSize,
          label: "Particle Size",
          min: 0.1,
          max: 2.0,
          step: 0.1,
        },
        particlesFogUseTexture: {
          value: defaultUseTexture,
          label: "Use Texture",
        },
        particlesFogVolumetricLayers: {
          value: defaultVolumetricLayers,
          label: "Volumetric Layers",
          min: 1,
          max: 10,
          step: 1,
        },
        particlesFogColor: { value: "#ffffff", label: "Color" },
      },
      { collapsed: true }
    ),
  });
  const instancedMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const { windUniforms } = useGlobalWind();

  // Initialize refs array
  useEffect(() => {
    instancedMeshRefs.current = new Array(volumetricLayers).fill(null);
  }, [volumetricLayers]);

  // Load fog texture manually
  const [fogTexture, setFogTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!useTexture) {
      setFogTexture(null);
      return;
    }

    // Create a simple white/transparent fog texture
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Create a radial gradient for fog-like appearance
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);

      const fogTexture = new THREE.CanvasTexture(canvas);
      fogTexture.wrapS = THREE.RepeatWrapping;
      fogTexture.wrapT = THREE.RepeatWrapping;
      fogTexture.minFilter = THREE.LinearMipmapLinearFilter;
      fogTexture.magFilter = THREE.LinearFilter;
      fogTexture.generateMipmaps = true;
      fogTexture.anisotropy = 16;
      fogTexture.flipY = false;
      setFogTexture(fogTexture);
    }
  }, [useTexture]);

  // Create fog particle geometries for different layers (different sizes)
  const fogGeometries = useMemo(() => {
    const geometries: THREE.SphereGeometry[] = [];
    for (let i = 0; i < volumetricLayers; i++) {
      const layerSize = particleSize * (0.3 + (i / volumetricLayers) * 0.7); // 0.3x to 1.0x size
      const geometry = new THREE.SphereGeometry(layerSize, 8, 6);
      geometries.push(geometry);
    }
    return geometries;
  }, [particleSize, volumetricLayers]);

  // Create fog materials for different layers (different opacities)
  const fogMaterials = useMemo(() => {
    const materials: THREE.MeshLambertMaterial[] = [];
    for (let i = 0; i < volumetricLayers; i++) {
      const layerOpacity = opacity * (0.2 + (i / volumetricLayers) * 0.8); // 0.2x to 1.0x opacity

      // Create a fallback white texture if none loaded
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      let fallbackTexture: THREE.Texture;
      if (ctx) {
        // Create a radial gradient for fog-like appearance
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        fallbackTexture = new THREE.CanvasTexture(canvas);
        fallbackTexture.minFilter = THREE.LinearMipmapLinearFilter;
        fallbackTexture.magFilter = THREE.LinearFilter;
        fallbackTexture.generateMipmaps = true;
        fallbackTexture.anisotropy = 16;
      } else {
        fallbackTexture = new THREE.TextureLoader().load(
          "/textures/whitesquare.png"
        );
      }

      const material = new THREE.MeshLambertMaterial({
        map: fogTexture || fallbackTexture,
        color: new THREE.Color(color),
        transparent: true,
        opacity: layerOpacity,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        blending: THREE.AdditiveBlending, // For fog effect
        depthWrite: false, // Prevent depth fighting
        depthTest: true,
      });

      materials.push(material);
    }
    return materials;
  }, [fogTexture, useTexture, opacity, volumetricLayers, color]);

  // Update materials when texture or color changes
  useEffect(() => {
    if (fogMaterials) {
      fogMaterials.forEach((material) => {
        if (fogTexture) {
          material.map = fogTexture;
        }
        material.color.set(color);
        material.needsUpdate = true;
      });
    }
  }, [fogMaterials, fogTexture, color]);

  // Initialize fog particle positions and properties for each layer
  interface FogData {
    positions: Float32Array;
    rotations: Float32Array;
    velocities: Float32Array;
    opacities: Float32Array;
    sizes: Float32Array;
    ages: Float32Array;
    maxAge: number;
  }

  const fogDataLayers = useMemo(() => {
    const layersData: FogData[] = [];
    const particlesPerLayer = Math.floor(density / volumetricLayers);

    for (let layer = 0; layer < volumetricLayers; layer++) {
      const data: FogData = {
        positions: new Float32Array(particlesPerLayer * 3),
        rotations: new Float32Array(particlesPerLayer * 3),
        velocities: new Float32Array(particlesPerLayer * 3),
        opacities: new Float32Array(particlesPerLayer),
        sizes: new Float32Array(particlesPerLayer),
        ages: new Float32Array(particlesPerLayer),
        maxAge: 2000, // frames
      };

      // Initialize random positions with height distribution
      for (let i = 0; i < particlesPerLayer; i++) {
        const i3 = i * 3;

        // Random position in area with height bias (more particles near ground)
        const heightFactor = Math.pow(Math.random(), 2); // Bias towards lower heights
        const x = (Math.random() - 0.5) * areaSize;
        const z = (Math.random() - 0.5) * areaSize;

        data.positions[i3] = x;
        // Use terrain height if available, otherwise use fixed height
        data.positions[i3 + 1] = getTerrainHeight
          ? getTerrainHeight(x, z) + heightFactor * height
          : heightFactor * height;
        data.positions[i3 + 2] = z;

        // Random rotation
        data.rotations[i3] = Math.random() * Math.PI * 2;
        data.rotations[i3 + 1] = Math.random() * Math.PI * 2;
        data.rotations[i3 + 2] = Math.random() * Math.PI * 2;

        // Random velocity (very slow for fog)
        data.velocities[i3] = (Math.random() - 0.5) * 0.005;
        data.velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
        data.velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;

        // Random opacity
        data.opacities[i] = Math.random() * opacity * 0.5 + opacity * 0.5;

        // Random size variation
        data.sizes[i] = Math.random() * 0.3 + 0.7; // 0.7 to 1.0

        // Random age
        data.ages[i] = Math.random() * data.maxAge;
      }

      layersData.push(data);
    }

    return layersData;
  }, [density, areaSize, height, opacity, volumetricLayers, getTerrainHeight]);

  // Update fog particle positions and properties for each layer
  useFrame(() => {
    if (!enabled) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    // Update each layer
    for (let layer = 0; layer < volumetricLayers; layer++) {
      const instancedMesh = instancedMeshRefs.current[layer];
      if (!instancedMesh) continue;

      const fogData = fogDataLayers[layer];
      const particlesPerLayer = Math.floor(density / volumetricLayers);

      for (let i = 0; i < particlesPerLayer; i++) {
        const i3 = i * 3;

        // Update age
        fogData.ages[i]++;

        // Respawn if too old
        if (fogData.ages[i] > fogData.maxAge) {
          fogData.ages[i] = 0;
          const heightFactor = Math.pow(Math.random(), 2);
          const respawnX = (Math.random() - 0.5) * areaSize;
          const respawnZ = (Math.random() - 0.5) * areaSize;

          fogData.positions[i3] = respawnX;
          // Use terrain height if available
          fogData.positions[i3 + 1] = getTerrainHeight
            ? getTerrainHeight(respawnX, respawnZ) + heightFactor * height
            : heightFactor * height;
          fogData.positions[i3 + 2] = respawnZ;
          fogData.velocities[i3] = (Math.random() - 0.5) * 0.005;
          fogData.velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
          fogData.velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;
          fogData.opacities[i] = Math.random() * opacity * 0.5 + opacity * 0.5;
        }

        // Apply wind (from global wind system)
        if (windUniforms) {
          const windStrength =
            windUniforms.u_windNoiseAmplitude.value * windInfluence;
          const windSpeed = windUniforms.u_windNoiseSpeed.value;
          const time = windUniforms.u_time.value;

          // Wind effect - more influence at higher altitudes
          const heightInfluence = fogData.positions[i3 + 1] / height;
          const windX =
            Math.sin(time * windSpeed + fogData.positions[i3] * 0.05) *
            windStrength *
            0.01 *
            heightInfluence;
          const windZ =
            Math.cos(time * windSpeed + fogData.positions[i3 + 2] * 0.05) *
            windStrength *
            0.01 *
            heightInfluence;
          const windY =
            Math.sin(time * windSpeed * 0.5 + fogData.positions[i3] * 0.1) *
            windStrength *
            0.005 *
            heightInfluence;

          fogData.velocities[i3] += windX;
          fogData.velocities[i3 + 1] += windY;
          fogData.velocities[i3 + 2] += windZ;
        }

        // Apply gentle upward drift (fog tends to rise)
        fogData.velocities[i3 + 1] += 0.0001;

        // Apply air resistance
        fogData.velocities[i3] *= 0.998;
        fogData.velocities[i3 + 1] *= 0.998;
        fogData.velocities[i3 + 2] *= 0.998;

        // Update position
        fogData.positions[i3] += fogData.velocities[i3];
        fogData.positions[i3 + 1] += fogData.velocities[i3 + 1];
        fogData.positions[i3 + 2] += fogData.velocities[i3 + 2];

        // Keep particles in bounds
        if (fogData.positions[i3] < -areaSize / 2)
          fogData.positions[i3] = areaSize / 2;
        if (fogData.positions[i3] > areaSize / 2)
          fogData.positions[i3] = -areaSize / 2;
        if (fogData.positions[i3 + 2] < -areaSize / 2)
          fogData.positions[i3 + 2] = areaSize / 2;
        if (fogData.positions[i3 + 2] > areaSize / 2)
          fogData.positions[i3 + 2] = -areaSize / 2;

        // Update rotation (slow tumbling)
        fogData.rotations[i3] += fogData.velocities[i3] * 2;
        fogData.rotations[i3 + 1] += fogData.velocities[i3 + 1] * 1;
        fogData.rotations[i3 + 2] += fogData.velocities[i3 + 2] * 2;

        // Set instance matrix
        position.set(
          fogData.positions[i3],
          fogData.positions[i3 + 1],
          fogData.positions[i3 + 2]
        );
        rotation.set(
          fogData.rotations[i3],
          fogData.rotations[i3 + 1],
          fogData.rotations[i3 + 2]
        );
        scale.setScalar(fogData.sizes[i]);

        matrix.compose(
          position,
          new THREE.Quaternion().setFromEuler(rotation),
          scale
        );
        instancedMesh.setMatrixAt(i, matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  });

  if (!enabled) return null;

  const particlesPerLayer = Math.floor(density / volumetricLayers);

  return (
    <>
      {fogGeometries.map((geometry, layer) => (
        <instancedMesh
          key={layer}
          ref={(ref) => {
            instancedMeshRefs.current[layer] = ref;
          }}
          args={[geometry, fogMaterials[layer], particlesPerLayer]}
          frustumCulled={false}
        />
      ))}
    </>
  );
};

export default ParticlesFog;
