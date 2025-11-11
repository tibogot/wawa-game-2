import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { useControls } from "leva";
import { RigidBody, MeshCollider } from "@react-three/rapier";

// Smooth Heightmap Terrain - based on ZeldaTerrain2 but uses /textures/terrain.png
const ZeldaTerrainSmooth: React.FC<{
  onHeightmapReady?: (fn: (x: number, z: number) => number) => void;
}> = ({ onHeightmapReady }) => {
  const heightMap = useLoader(TextureLoader, "/textures/terrain.png");
  // Configure heightmap as data texture (no color space conversion, linear filtering, clamp, no mips)
  useMemo(() => {
    if (!heightMap) return heightMap;
    heightMap.colorSpace = THREE.NoColorSpace as any; // treat as data
    heightMap.minFilter = THREE.LinearFilter;
    heightMap.magFilter = THREE.LinearFilter;
    heightMap.wrapS = THREE.ClampToEdgeWrapping;
    heightMap.wrapT = THREE.ClampToEdgeWrapping;
    heightMap.generateMipmaps = false;
    heightMap.needsUpdate = true;
    return heightMap;
  }, [heightMap]);
  const { camera } = useThree();
  const [cameraDistance, setCameraDistance] = useState(0);

  const {
    worldSize,
    displacementScale,
    segmentCount,
    terrainHeight,
    roughness,
    metalness,
    showWireframe,
    useHeightmapAsTexture,
    terrainColor,
    enableHeightGradient,
    lowHeightColor,
    midHeightColor,
    highHeightColor,
    lowHeightThreshold,
    highHeightThreshold,
  } = useControls("🗻 Zelda Terrain (Smooth)", {
    worldSize: {
      value: 2048,
      min: 512,
      max: 4096,
      step: 128,
      label: "World Size",
    },
    displacementScale: {
      value: 100,
      min: 10,
      max: 300,
      step: 5,
      label: "Displacement Scale",
    },
    segmentCount: {
      value: 1024,
      min: 256,
      max: 2048,
      step: 64,
      label: "Base Segment Count",
    },
    terrainHeight: {
      value: 0,
      min: -200,
      max: 200,
      step: 1,
      label: "Terrain Height (Y Position)",
    },
    roughness: {
      value: 0.9,
      min: 0.1,
      max: 1.0,
      step: 0.1,
      label: "Surface Roughness",
    },
    metalness: {
      value: 0.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: "Metalness",
    },
    showWireframe: { value: false, label: "Show Wireframe" },
    useHeightmapAsTexture: { value: false, label: "Use Heightmap as Texture" },
    terrainColor: { value: "#4a7c59", label: "Terrain Color" },
    enableHeightGradient: { value: true, label: "🌈 Enable Height Gradient" },
    lowHeightColor: { value: "#2d4e17", label: "🟢 Low Height Color" },
    midHeightColor: { value: "#152e04", label: "🟤 Mid Height Color" },
    highHeightColor: { value: "#152e04", label: "⚪ High Height Color" },
    lowHeightThreshold: {
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.1,
      label: "📏 Low Height Threshold",
    },
    highHeightThreshold: {
      value: 0.7,
      min: 0,
      max: 1,
      step: 0.1,
      label: "📏 High Height Threshold",
    },
  });

  const createTerrainGeometry = useCallback(
    (segments: number) => {
      const geom = new THREE.PlaneGeometry(
        worldSize,
        worldSize,
        segments,
        segments
      );
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = (heightMap.image as HTMLImageElement).width;
      canvas.height = (heightMap.image as HTMLImageElement).height;
      ctx.drawImage(heightMap.image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const vertices = geom.attributes.position.array as Float32Array;
      const width = segments + 1;
      const height = segments + 1;
      // For physics-only geometry, no colors needed

      // Bilinear sampler for imageData red channel
      const sampleHeightBilinear = (u: number, v: number) => {
        // u,v are in [0,1]
        const fx = u * (canvas.width - 1);
        const fz = v * (canvas.height - 1);
        const x0 = Math.floor(fx);
        const z0 = Math.floor(fz);
        const x1 = Math.min(x0 + 1, canvas.width - 1);
        const z1 = Math.min(z0 + 1, canvas.height - 1);
        const tx = fx - x0;
        const tz = fz - z0;

        const idx = (x: number, z: number) => (z * canvas.width + x) * 4;
        const h00 = imageData.data[idx(x0, z0)] / 255;
        const h10 = imageData.data[idx(x1, z0)] / 255;
        const h01 = imageData.data[idx(x0, z1)] / 255;
        const h11 = imageData.data[idx(x1, z1)] / 255;

        const h0 = h00 * (1 - tx) + h10 * tx;
        const h1 = h01 * (1 - tx) + h11 * tx;
        return h0 * (1 - tz) + h1 * tz;
      };

      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          const index = (i * width + j) * 3;
          // Map to [0,1] using segments-1 so edges align exactly with texture edge
          const u = j / (width - 1);
          const v = i / (height - 1);
          const heightValue = sampleHeightBilinear(u, v);
          vertices[index + 2] = heightValue * displacementScale;
        }
      }
      geom.computeVertexNormals();
      geom.computeBoundingBox();
      return geom;
    },
    [worldSize, heightMap, displacementScale]
  );

  // Visible terrain material (CPU-displaced, same mesh as collider like Map3)
  const cpuVisibleMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: useHeightmapAsTexture ? heightMap : null,
      color: useHeightmapAsTexture ? "#ffffff" : terrainColor,
      roughness,
      metalness,
      wireframe: showWireframe,
    });
  }, [
    heightMap,
    useHeightmapAsTexture,
    terrainColor,
    roughness,
    metalness,
    showWireframe,
  ]);

  const heightfieldData = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = (heightMap.image as HTMLImageElement).width;
    canvas.height = (heightMap.image as HTMLImageElement).height;
    ctx.drawImage(heightMap.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const heights: number[] = [];
    const width = canvas.width;
    const height = canvas.height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const h = imageData.data[pixelIndex] / 255;
        heights.push(h * displacementScale);
      }
    }
    return { heights, width, height };
  }, [heightMap, displacementScale]);

  const heightmapLookup = useMemo(() => {
    if (!heightfieldData) return null;
    const { heights, width, height } = heightfieldData;
    // Bilinear sampling on the cached heights grid
    return (x: number, z: number) => {
      const normalizedX = (x + worldSize / 2) / worldSize;
      const normalizedZ = (z + worldSize / 2) / worldSize;
      const clampedX = Math.max(0, Math.min(1, normalizedX));
      const clampedZ = Math.max(0, Math.min(1, normalizedZ));

      const fx = clampedX * (width - 1);
      const fz = clampedZ * (height - 1);
      const x0 = Math.floor(fx);
      const z0 = Math.floor(fz);
      const x1 = Math.min(x0 + 1, width - 1);
      const z1 = Math.min(z0 + 1, height - 1);
      const tx = fx - x0;
      const tz = fz - z0;

      const idx = (xi: number, zi: number) => zi * width + xi;
      const h00 = heights[idx(x0, z0)] || 0;
      const h10 = heights[idx(x1, z0)] || 0;
      const h01 = heights[idx(x0, z1)] || 0;
      const h11 = heights[idx(x1, z1)] || 0;

      const h0 = h00 * (1 - tx) + h10 * tx;
      const h1 = h01 * (1 - tx) + h11 * tx;
      return h0 * (1 - tz) + h1 * tz;
    };
  }, [heightfieldData, worldSize]);

  useEffect(() => {
    if (heightmapLookup && onHeightmapReady) {
      onHeightmapReady(heightmapLookup);
    }
  }, [heightmapLookup, onHeightmapReady]);

  const physicsGeometry = useMemo(() => {
    return createTerrainGeometry(segmentCount);
  }, [
    worldSize,
    segmentCount,
    heightMap,
    displacementScale,
    createTerrainGeometry,
  ]);

  useFrame(() => {
    const cameraPosition = camera.position;
    const distance2D = Math.sqrt(
      cameraPosition.x * cameraPosition.x + cameraPosition.z * cameraPosition.z
    );
    setCameraDistance(distance2D);
  });

  const finalTerrainY = terrainHeight;

  return (
    <group>
      {/* Single visible mesh also used for the collider (Map3-style) */}
      <RigidBody type="fixed" colliders={false} friction={1}>
        <MeshCollider type="trimesh">
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, finalTerrainY, 0]}
            geometry={physicsGeometry}
            material={cpuVisibleMaterial}
            receiveShadow
            castShadow={false}
          />
        </MeshCollider>
      </RigidBody>
    </group>
  );
};

export default ZeldaTerrainSmooth;
