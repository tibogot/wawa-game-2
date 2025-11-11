import React, { useMemo, useRef, useState } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { useControls } from "leva";
import { RigidBody } from "@react-three/rapier";
import { Detailed } from "@react-three/drei";

// Simple Terrain Chunk Component - Based on Map6 approach
interface TerrainChunkProps {
  chunkX: number;
  chunkZ: number;
  chunkSize: number;
  heightMap: THREE.Texture;
  displacementScale: number;
  segmentCount: number;
  worldSize: number;
  chunksPerSide: number;
  terrainHeight: number;
  showWireframe: boolean;
  useHeightmapAsTexture: boolean;
  terrainColor: string;
  roughness: number;
  metalness: number;
}

const TerrainChunk: React.FC<TerrainChunkProps> = ({
  chunkX,
  chunkZ,
  chunkSize,
  heightMap,
  displacementScale,
  segmentCount,
  worldSize,
  chunksPerSide,
  terrainHeight,
  showWireframe,
  useHeightmapAsTexture,
  terrainColor,
  roughness,
  metalness,
}) => {
  // Calculate world position
  const position = useMemo(() => {
    const offset = (worldSize - chunkSize) / 2;
    return [
      chunkX * chunkSize - offset,
      terrainHeight,
      chunkZ * chunkSize - offset,
    ] as [number, number, number];
  }, [chunkX, chunkZ, chunkSize, worldSize, terrainHeight]);

  // Create material
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: useHeightmapAsTexture ? heightMap : null,
      color: useHeightmapAsTexture ? "#ffffff" : terrainColor,
      roughness: roughness,
      metalness: metalness,
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

  // Create geometry with manual vertex displacement - EXACTLY like Map6
  const geometry = useMemo(() => {
    // Create plane geometry
    const geom = new THREE.PlaneGeometry(
      chunkSize,
      chunkSize,
      segmentCount,
      segmentCount
    );

    // Get the heightmap image data - EXACTLY like Map6
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = heightMap.image.width;
    canvas.height = heightMap.image.height;
    ctx.drawImage(heightMap.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Displace vertices based on heightmap - EXACTLY like Map6
    const vertices = geom.attributes.position.array as Float32Array;
    const width = segmentCount + 1;
    const height = segmentCount + 1;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const index = (i * width + j) * 3;

        // Map vertex position to heightmap pixel - EXACTLY like Map6
        const px = Math.floor((j / width) * canvas.width);
        const py = Math.floor((i / height) * canvas.height);
        const pixelIndex = (py * canvas.width + px) * 4;

        // Get heightmap value (using red channel, 0-255) - EXACTLY like Map6
        const heightValue = imageData.data[pixelIndex] / 255;

        // Apply height displacement (Z becomes Y after rotation) - EXACTLY like Map6
        vertices[index + 2] = heightValue * displacementScale;
      }
    }

    // Update normals and bounding box - EXACTLY like Map6
    geom.computeVertexNormals();
    geom.computeBoundingBox();

    console.log(
      `🗻 Terrain chunk [${chunkX},${chunkZ}] generated with ${segmentCount}x${segmentCount} segments`
    );
    return geom;
  }, [chunkSize, segmentCount, heightMap, displacementScale]);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={position}
        material={material}
        geometry={geometry}
        receiveShadow
        castShadow
      />
    </RigidBody>
  );
};

// Main ZeldaTerrain Component - Based on Map6 approach
const ZeldaTerrain: React.FC = () => {
  // Load the heightmap texture
  const heightMap = useLoader(TextureLoader, "/textures/unreal-heightmap.png");

  // Leva controls for terrain configuration
  const {
    worldSize,
    chunksPerSide,
    displacementScale,
    segmentCount,
    useSeamlessTerrain,
    terrainHeight,
    roughness,
    metalness,
    showWireframe,
    useHeightmapAsTexture,
    terrainColor,
    enableLOD,
    lodDistance1,
    lodDistance2,
    lodDistance3,
    lodSegment1,
    lodSegment2,
    lodSegment3,
    showLODColors,
    showSingleChunk,
    showAllChunks,
    chunkX,
    chunkZ,
    chunksGridSize,
    chunkOverlap,
  } = useControls("🗻 Zelda Terrain", {
    useSeamlessTerrain: {
      value: true,
      label: "Use Seamless Terrain",
    },
    worldSize: {
      value: 1000,
      min: 500,
      max: 5000,
      step: 100,
      label: "World Size",
    },
    chunksPerSide: {
      value: 3,
      min: 2,
      max: 6,
      step: 1,
      label: "Chunks Per Side",
    },
    displacementScale: {
      value: 100,
      min: 50,
      max: 300,
      step: 10,
      label: "Displacement Scale",
    },
    segmentCount: {
      value: 256,
      min: 128,
      max: 512,
      step: 64,
      label: "Base Segment Count",
    },
    terrainHeight: {
      value: 0,
      min: -500,
      max: 50,
      step: 10,
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
    showWireframe: {
      value: false,
      label: "Show Wireframe",
    },
    useHeightmapAsTexture: {
      value: false,
      label: "Use Heightmap as Texture",
    },
    terrainColor: {
      value: "#4a7c59",
      label: "Terrain Color",
    },
    enableLOD: {
      value: true,
      label: "Enable LOD (Level of Detail)",
    },
    lodDistance1: {
      value: 200,
      min: 50,
      max: 500,
      step: 25,
      label: "LOD Distance 1 (High Detail)",
    },
    lodDistance2: {
      value: 400,
      min: 100,
      max: 800,
      step: 50,
      label: "LOD Distance 2 (Medium Detail)",
    },
    lodDistance3: {
      value: 600,
      min: 200,
      max: 1000,
      step: 50,
      label: "LOD Distance 3 (Low Detail)",
    },
    lodSegment1: {
      value: 128,
      min: 64,
      max: 256,
      step: 32,
      label: "LOD 1 Segments (High Detail)",
    },
    lodSegment2: {
      value: 64,
      min: 32,
      max: 128,
      step: 16,
      label: "LOD 2 Segments (Medium Detail)",
    },
    lodSegment3: {
      value: 32,
      min: 16,
      max: 64,
      step: 8,
      label: "LOD 3 Segments (Low Detail)",
    },
    showLODColors: {
      value: false,
      label: "🎨 Show LOD Debug Colors",
    },
    showSingleChunk: {
      value: false,
      label: "🧩 Show Single Chunk (200x200)",
    },
    showAllChunks: {
      value: false,
      label: "🧩🧩 Show All Chunks (Seam Test)",
    },
    chunkX: {
      value: 0,
      min: 0,
      max: 4,
      step: 1,
      label: "Chunk X Position",
    },
    chunkZ: {
      value: 0,
      min: 0,
      max: 4,
      step: 1,
      label: "Chunk Z Position",
    },
    chunksGridSize: {
      value: 5,
      min: 2,
      max: 5,
      step: 1,
      label: "Chunks Grid Size (NxN)",
    },
    chunkOverlap: {
      value: 1.7,
      min: 0,
      max: 10,
      step: 0.5,
      label: "Chunk Overlap (Seam Fix)",
    },
  });

  // Calculate derived values
  const chunkSize = worldSize / chunksPerSide;

  // Helper function to create a single 200x200 chunk from heightmap with overlap sampling
  const createSingleChunk = (
    chunkX: number,
    chunkZ: number,
    chunkSize: number = 200
  ) => {
    const segments = 64; // Fixed segments for chunk
    const overlap = chunkOverlap; // Overlap in world units for seamless edges
    const geom = new THREE.PlaneGeometry(
      chunkSize,
      chunkSize,
      segments,
      segments
    );

    // Get the heightmap image data
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = heightMap.image.width;
    canvas.height = heightMap.image.height;
    ctx.drawImage(heightMap.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Calculate chunk offset in world coordinates with overlap
    const chunkOffsetX = chunkX * chunkSize - worldSize / 2 - overlap;
    const chunkOffsetZ = chunkZ * chunkSize - worldSize / 2 - overlap;

    // Displace vertices based on heightmap for this specific chunk
    const vertices = geom.attributes.position.array as Float32Array;
    const width = segments + 1;
    const height = segments + 1;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const index = (i * width + j) * 3;

        // Calculate world position of this vertex with overlap compensation
        const worldX = chunkOffsetX + (j / width) * (chunkSize + 2 * overlap);
        const worldZ = chunkOffsetZ + (i / height) * (chunkSize + 2 * overlap);

        // Map world position to heightmap pixel
        const px = Math.floor(
          ((worldX + worldSize / 2) / worldSize) * canvas.width
        );
        const py = Math.floor(
          ((worldZ + worldSize / 2) / worldSize) * canvas.height
        );

        // Clamp to heightmap bounds
        const clampedPx = Math.max(0, Math.min(canvas.width - 1, px));
        const clampedPy = Math.max(0, Math.min(canvas.height - 1, py));

        const pixelIndex = (clampedPy * canvas.width + clampedPx) * 4;

        // Get heightmap value
        const heightValue = imageData.data[pixelIndex] / 255;

        // Apply height displacement
        vertices[index + 2] = heightValue * displacementScale;
      }
    }

    // Update normals and bounding box
    geom.computeVertexNormals();
    geom.computeBoundingBox();

    return geom;
  };

  // Helper function to create terrain geometry with LOD
  const createTerrainGeometry = (segments: number) => {
    const geom = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      segments,
      segments
    );

    // Get the heightmap image data - EXACTLY like Map6
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = heightMap.image.width;
    canvas.height = heightMap.image.height;
    ctx.drawImage(heightMap.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Displace vertices based on heightmap - EXACTLY like Map6
    const vertices = geom.attributes.position.array as Float32Array;
    const width = segments + 1;
    const height = segments + 1;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const index = (i * width + j) * 3;

        // Map vertex position to heightmap pixel - EXACTLY like Map6
        const px = Math.floor((j / width) * canvas.width);
        const py = Math.floor((i / height) * canvas.height);
        const pixelIndex = (py * canvas.width + px) * 4;

        // Get heightmap value (using red channel, 0-255) - EXACTLY like Map6
        const heightValue = imageData.data[pixelIndex] / 255;

        // Apply height displacement (Z becomes Y after rotation) - EXACTLY like Map6
        vertices[index + 2] = heightValue * displacementScale;
      }
    }

    // Update normals and bounding box - EXACTLY like Map6
    geom.computeVertexNormals();
    geom.computeBoundingBox();

    return geom;
  };

  // Create material
  const terrainMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: useHeightmapAsTexture ? heightMap : null,
      color: useHeightmapAsTexture ? "#ffffff" : terrainColor,
      roughness: roughness,
      metalness: metalness,
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

  // Create colored LOD materials for debugging
  const lodMaterials = useMemo(() => {
    const baseProps = {
      roughness: roughness,
      metalness: metalness,
      wireframe: showWireframe,
    };

    return {
      // LOD 0 - High Detail (Red)
      lod0: new THREE.MeshStandardMaterial({
        ...baseProps,
        color: "#ff0000", // Red
        map: useHeightmapAsTexture ? heightMap : null,
      }),
      // LOD 1 - Medium Detail (Yellow)
      lod1: new THREE.MeshStandardMaterial({
        ...baseProps,
        color: "#ffff00", // Yellow
        map: useHeightmapAsTexture ? heightMap : null,
      }),
      // LOD 2 - Low Detail (Green)
      lod2: new THREE.MeshStandardMaterial({
        ...baseProps,
        color: "#00ff00", // Green
        map: useHeightmapAsTexture ? heightMap : null,
      }),
      // LOD 3 - Lowest Detail (Blue)
      lod3: new THREE.MeshStandardMaterial({
        ...baseProps,
        color: "#0000ff", // Blue
        map: useHeightmapAsTexture ? heightMap : null,
      }),
    };
  }, [heightMap, useHeightmapAsTexture, roughness, metalness, showWireframe]);

  // Single large terrain mesh with LOD - Using drei Detail component
  const singleTerrain = useMemo(() => {
    if (!useSeamlessTerrain) return null;

    console.log(
      `🗻 Single Zelda Terrain with LOD: ${worldSize}x${worldSize} (${
        enableLOD ? "LOD enabled" : "LOD disabled"
      }) ${showLODColors ? "🎨 Debug colors ON" : "🎨 Debug colors OFF"}`
    );

    if (!enableLOD) {
      // No LOD - single geometry
      const geom = createTerrainGeometry(segmentCount);
      return (
        <RigidBody type="fixed" colliders="trimesh" friction={1}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, terrainHeight, 0]}
            material={terrainMaterial}
            geometry={geom}
            receiveShadow
            castShadow={false}
          />
        </RigidBody>
      );
    }

    // With LOD - using drei Detailed component
    return (
      <RigidBody type="fixed" colliders="trimesh" friction={1}>
        <Detailed
          distances={[lodDistance1, lodDistance2, lodDistance3]}
          position={[0, terrainHeight, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {/* LOD 0 - High Detail (Red when debug, normal when not) - Closest */}
          <mesh
            material={showLODColors ? lodMaterials.lod0 : terrainMaterial}
            receiveShadow
            castShadow
          >
            <primitive object={createTerrainGeometry(segmentCount)} />
          </mesh>

          {/* LOD 1 - Medium Detail (Yellow when debug, normal when not) */}
          <mesh
            material={showLODColors ? lodMaterials.lod1 : terrainMaterial}
            receiveShadow
            castShadow
          >
            <primitive object={createTerrainGeometry(lodSegment1)} />
          </mesh>

          {/* LOD 2 - Low Detail (Green when debug, normal when not) */}
          <mesh
            material={showLODColors ? lodMaterials.lod2 : terrainMaterial}
            receiveShadow
            castShadow
          >
            <primitive object={createTerrainGeometry(lodSegment2)} />
          </mesh>

          {/* LOD 3 - Lowest Detail (Blue when debug, normal when not) - Furthest */}
          <mesh
            material={showLODColors ? lodMaterials.lod3 : terrainMaterial}
            receiveShadow
            castShadow
          >
            <primitive object={createTerrainGeometry(lodSegment3)} />
          </mesh>
        </Detailed>
      </RigidBody>
    );
  }, [
    useSeamlessTerrain,
    worldSize,
    segmentCount,
    heightMap,
    displacementScale,
    terrainHeight,
    terrainMaterial,
    lodMaterials,
    showLODColors,
    enableLOD,
    lodDistance1,
    lodDistance2,
    lodDistance3,
    lodSegment1,
    lodSegment2,
    lodSegment3,
  ]);

  // Generate chunks
  const chunks = useMemo(() => {
    if (useSeamlessTerrain) return null;

    const chunkArray: React.ReactElement[] = [];
    for (let x = 0; x < chunksPerSide; x++) {
      for (let z = 0; z < chunksPerSide; z++) {
        chunkArray.push(
          <TerrainChunk
            key={`terrain-chunk-${x}-${z}`}
            chunkX={x}
            chunkZ={z}
            chunkSize={chunkSize}
            heightMap={heightMap}
            displacementScale={displacementScale}
            segmentCount={segmentCount}
            worldSize={worldSize}
            chunksPerSide={chunksPerSide}
            terrainHeight={terrainHeight}
            showWireframe={showWireframe}
            useHeightmapAsTexture={useHeightmapAsTexture}
            terrainColor={terrainColor}
            roughness={roughness}
            metalness={metalness}
          />
        );
      }
    }
    return chunkArray;
  }, [
    heightMap,
    chunkSize,
    displacementScale,
    segmentCount,
    worldSize,
    chunksPerSide,
    useSeamlessTerrain,
    terrainHeight,
    showWireframe,
    useHeightmapAsTexture,
    terrainColor,
    roughness,
    metalness,
  ]);

  // Single chunk for testing
  const singleChunk = useMemo(() => {
    if (!showSingleChunk) return null;

    const chunkGeometry = createSingleChunk(chunkX, chunkZ, 200);
    const chunkPosition = [
      chunkX * 200 - worldSize / 2 + 100, // Center the chunk
      terrainHeight,
      chunkZ * 200 - worldSize / 2 + 100,
    ] as [number, number, number];

    return (
      <RigidBody type="fixed" colliders="trimesh" friction={1}>
        <mesh
          geometry={chunkGeometry}
          material={terrainMaterial}
          position={chunkPosition}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          castShadow
        />
      </RigidBody>
    );
  }, [
    showSingleChunk,
    chunkX,
    chunkZ,
    terrainMaterial,
    terrainHeight,
    worldSize,
    heightMap,
    displacementScale,
    chunkOverlap,
  ]);

  // Helper function to create LOD chunk geometries
  const createLODChunkGeometries = (chunkX: number, chunkZ: number) => {
    const chunkSize = 200;
    const segments = 64;

    // Create different LOD geometries
    const lod0 = createSingleChunk(chunkX, chunkZ, chunkSize); // High detail
    const lod1 = createSingleChunk(chunkX, chunkZ, chunkSize); // Medium detail (same for now)
    const lod2 = createSingleChunk(chunkX, chunkZ, chunkSize); // Low detail (same for now)
    const lod3 = createSingleChunk(chunkX, chunkZ, chunkSize); // Lowest detail (same for now)

    return { lod0, lod1, lod2, lod3 };
  };

  // All chunks for seam testing with different colors
  const allChunks = useMemo(() => {
    if (!showAllChunks) return null;

    const chunkSize = 200;
    const chunks: React.ReactElement[] = [];

    // Color palette for different chunks
    const colors = [
      "#ff0000", // Red
      "#00ff00", // Green
      "#0000ff", // Blue
      "#ffff00", // Yellow
      "#ff00ff", // Magenta
      "#00ffff", // Cyan
      "#ff8000", // Orange
      "#8000ff", // Purple
      "#ff0080", // Pink
      "#80ff00", // Lime
      "#0080ff", // Light Blue
      "#ff8080", // Light Red
      "#80ff80", // Light Green
      "#8080ff", // Light Blue
      "#ffff80", // Light Yellow
      "#ff80ff", // Light Magenta
      "#80ffff", // Light Cyan
      "#ffa500", // Dark Orange
      "#a500ff", // Dark Purple
      "#ffa080", // Light Orange
      "#80a0ff", // Light Purple
      "#a0ff80", // Light Lime
      "#ffa0a0", // Light Pink
      "#a0a0ff", // Light Purple
      "#ffffa0", // Light Yellow
    ];

    // Create a grid of chunks
    for (let x = 0; x < chunksGridSize; x++) {
      for (let z = 0; z < chunksGridSize; z++) {
        const chunkGeometry = createSingleChunk(x, z, chunkSize);
        const chunkPosition = [
          x * chunkSize - (chunksGridSize * chunkSize) / 2 + chunkSize / 2,
          terrainHeight,
          z * chunkSize - (chunksGridSize * chunkSize) / 2 + chunkSize / 2,
        ] as [number, number, number];

        // Get unique color for this chunk
        const chunkIndex = x * chunksGridSize + z;
        const chunkColor = colors[chunkIndex % colors.length];

        // Create material for this chunk
        // If LOD debug colors are ON, use LOD materials instead of chunk colors
        const chunkMaterial = showLODColors
          ? terrainMaterial // Use the normal terrain material (will be overridden by LOD)
          : new THREE.MeshStandardMaterial({
              color: chunkColor,
              roughness: roughness,
              metalness: metalness,
              wireframe: showWireframe,
              map: useHeightmapAsTexture ? heightMap : null,
            });

        chunks.push(
          <RigidBody
            key={`chunk-${x}-${z}`}
            type="fixed"
            colliders="trimesh"
            friction={1}
          >
            {showLODColors ? (
              // LOD mode - use Detailed component with LOD materials and different geometries
              <Detailed
                distances={[lodDistance1, lodDistance2, lodDistance3]}
                position={chunkPosition}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                {/* LOD 0 - High Detail (Red) */}
                <mesh material={lodMaterials.lod0} receiveShadow castShadow>
                  <primitive object={createLODChunkGeometries(x, z).lod0} />
                </mesh>
                {/* LOD 1 - Medium Detail (Yellow) */}
                <mesh material={lodMaterials.lod1} receiveShadow castShadow>
                  <primitive object={createLODChunkGeometries(x, z).lod1} />
                </mesh>
                {/* LOD 2 - Low Detail (Green) */}
                <mesh material={lodMaterials.lod2} receiveShadow castShadow>
                  <primitive object={createLODChunkGeometries(x, z).lod2} />
                </mesh>
                {/* LOD 3 - Lowest Detail (Blue) */}
                <mesh material={lodMaterials.lod3} receiveShadow castShadow>
                  <primitive object={createLODChunkGeometries(x, z).lod3} />
                </mesh>
              </Detailed>
            ) : (
              // Normal mode - use chunk colors
              <mesh
                geometry={chunkGeometry}
                material={chunkMaterial}
                position={chunkPosition}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
                castShadow
              />
            )}
          </RigidBody>
        );
      }
    }

    return <group>{chunks}</group>;
  }, [
    showAllChunks,
    chunksGridSize,
    terrainMaterial,
    terrainHeight,
    heightMap,
    displacementScale,
    chunkOverlap,
    roughness,
    metalness,
    showWireframe,
    useHeightmapAsTexture,
    showLODColors,
    lodMaterials,
    lodDistance1,
    lodDistance2,
    lodDistance3,
  ]);

  return (
    <group>
      {showSingleChunk
        ? singleChunk
        : showAllChunks
        ? allChunks
        : useSeamlessTerrain
        ? singleTerrain
        : chunks}
    </group>
  );
};

export default ZeldaTerrain;
