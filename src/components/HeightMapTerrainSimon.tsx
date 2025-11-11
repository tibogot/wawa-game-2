import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import { useControls } from "leva";

interface HeightMapTerrainSimonProps {
  onTerrainReady?: (terrainMesh: THREE.Mesh) => void;
  onHeightmapReady?: (getHeightFn: (x: number, z: number) => number) => void;
}

export const HeightMapTerrainSimon: React.FC<HeightMapTerrainSimonProps> = ({
  onTerrainReady,
  onHeightmapReady,
}) => {
  // Load heightmap texture for terrain (same as Map6)
  const heightmapTexture = useTexture("/textures/terrain.png");

  // Terrain mesh reference
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);

  // Store heightmap lookup function to pass to parent via useEffect
  const heightmapLookupRef = useRef<((x: number, z: number) => number) | null>(
    null
  );

  // Terrain controls - EXACTLY as in Map6
  const { terrainSize, terrainHeight, terrainSegments, terrainYPosition } =
    useControls("🗺️ Heightmap Terrain (Map6)", {
      terrainSize: {
        value: 200,
        min: 100,
        max: 500,
        step: 50,
        label: "Terrain Size",
      },
      terrainHeight: {
        value: 20,
        min: 5,
        max: 50,
        step: 5,
        label: "Mountain Height",
      },
      terrainSegments: {
        value: 256,
        min: 64,
        max: 512,
        step: 32,
        label: "Terrain Detail (vertices)",
      },
      terrainYPosition: {
        value: -10,
        min: -30,
        max: 10,
        step: 1,
        label: "Terrain Y Position (adjust for character)",
      },
    });

  // Terrain gradient colors - EXACTLY as in Map6
  const {
    colorValley,
    colorGrass,
    colorSlope,
    colorPeak,
    heightValley,
    heightGrass,
    heightSlope,
    heightPeak,
  } = useControls("🎨 Terrain Gradient (Map6)", {
    colorValley: {
      value: "#2d4a2d",
      label: "🌲 Valley Color (low)",
    },
    colorGrass: {
      value: "#5a8f5a",
      label: "🌿 Grass Color (mid)",
    },
    colorSlope: {
      value: "#a89968",
      label: "🏔️ Slope Color (high)",
    },
    colorPeak: {
      value: "#e8e8f0",
      label: "❄️ Peak Color (snow)",
    },
    heightValley: {
      value: -10,
      min: -20,
      max: 0,
      step: 1,
      label: "Valley Height (start gradient)",
    },
    heightGrass: {
      value: -5,
      min: -10,
      max: 5,
      step: 1,
      label: "Grass Height",
    },
    heightSlope: {
      value: 5,
      min: 0,
      max: 15,
      step: 1,
      label: "Slope Height",
    },
    heightPeak: {
      value: 15,
      min: 10,
      max: 30,
      step: 1,
      label: "Peak Height (snow line)",
    },
  });

  // Generate heightmap terrain geometry - EXACT copy of Map6 logic
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      terrainSegments,
      terrainSegments
    );

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = (heightmapTexture.image as HTMLImageElement).width;
    canvas.height = (heightmapTexture.image as HTMLImageElement).height;
    ctx.drawImage(heightmapTexture.image as HTMLImageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const vertices = geometry.attributes.position.array as Float32Array;
    const width = terrainSegments + 1;
    const height = terrainSegments + 1;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const index = (i * width + j) * 3;
        const px = Math.floor((j / width) * canvas.width);
        const py = Math.floor((i / height) * canvas.height);
        const pixelIndex = (py * canvas.width + px) * 4;
        const heightValue = imageData.data[pixelIndex] / 255;
        vertices[index + 2] = heightValue * terrainHeight;
      }
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const hmWidth = canvas.width;
    const hmHeight = canvas.height;
    const hmData = imageData.data;

    const getHeightAt = (
      worldX: number,
      worldZ: number,
      useNearestVertex = false
    ): number => {
      if (worldX == null || worldZ == null || isNaN(worldX) || isNaN(worldZ)) {
        console.warn(
          `⚠️ Invalid heightmap lookup: worldX=${worldX}, worldZ=${worldZ}`
        );
        return terrainYPosition;
      }

      const u = (worldX + terrainSize / 2) / terrainSize;
      const v = (worldZ + terrainSize / 2) / terrainSize;

      if (useNearestVertex) {
        const x = Math.round(u * (hmWidth - 1));
        const y = Math.round(v * (hmHeight - 1));

        const getPixel = (px: number, py: number) => {
          const idx = (py * hmWidth + px) * 4;
          return hmData[idx] / 255;
        };

        const heightNormalized = getPixel(x, y);
        return heightNormalized * terrainHeight + terrainYPosition;
      } else {
        const x = u * (hmWidth - 1);
        const y = v * (hmHeight - 1);

        const x1 = Math.floor(x);
        const y1 = Math.floor(y);
        const x2 = Math.min(x1 + 1, hmWidth - 1);
        const y2 = Math.min(y1 + 1, hmHeight - 1);

        const xFrac = x - x1;
        const yFrac = y - y1;

        const getPixel = (px: number, py: number) => {
          const idx = (py * hmWidth + px) * 4;
          return hmData[idx] / 255;
        };

        const h11 = getPixel(x1, y1);
        const h21 = getPixel(x2, y1);
        const h12 = getPixel(x1, y2);
        const h22 = getPixel(x2, y2);

        const h1 = h11 * (1 - xFrac) + h21 * xFrac;
        const h2 = h12 * (1 - xFrac) + h22 * xFrac;
        const heightNormalized = h1 * (1 - yFrac) + h2 * yFrac;

        return heightNormalized * terrainHeight + terrainYPosition;
      }
    };

    heightmapLookupRef.current = getHeightAt;

    return geometry;
  }, [
    heightmapTexture,
    terrainSize,
    terrainHeight,
    terrainSegments,
    terrainYPosition,
  ]);

  // Notify parent consumer with heightmap lookup after render (same as Map6)
  useEffect(() => {
    if (heightmapLookupRef.current && onHeightmapReady) {
      onHeightmapReady(heightmapLookupRef.current);
    }
  }, [onHeightmapReady, terrainGeometry]);

  // Create gradient material with onBeforeCompile - EXACT as Map6
  const terrainMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.1,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.colorValley = { value: new THREE.Color(colorValley) };
      shader.uniforms.colorGrass = { value: new THREE.Color(colorGrass) };
      shader.uniforms.colorSlope = { value: new THREE.Color(colorSlope) };
      shader.uniforms.colorPeak = { value: new THREE.Color(colorPeak) };
      shader.uniforms.heightValley = { value: heightValley };
      shader.uniforms.heightGrass = { value: heightGrass };
      shader.uniforms.heightSlope = { value: heightSlope };
      shader.uniforms.heightPeak = { value: heightPeak };

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
        #include <common>
        varying vec3 vWorldPos;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `
        #include <worldpos_vertex>
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
        #include <common>
        varying vec3 vWorldPos;
        uniform vec3 colorValley;
        uniform vec3 colorGrass;
        uniform vec3 colorSlope;
        uniform vec3 colorPeak;
        uniform float heightValley;
        uniform float heightGrass;
        uniform float heightSlope;
        uniform float heightPeak;
        
        vec3 getHeightColor(float height) {
          vec3 color;
          if (height < heightGrass) {
            float t = smoothstep(heightValley, heightGrass, height);
            color = mix(colorValley, colorGrass, t);
          }
          else if (height < heightSlope) {
            float t = smoothstep(heightGrass, heightSlope, height);
            color = mix(colorGrass, colorSlope, t);
          }
          else {
            float t = smoothstep(heightSlope, heightPeak, height);
            color = mix(colorSlope, colorPeak, t);
          }
          return color;
        }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        vec3 heightColor = getHeightColor(vWorldPos.y);
        diffuseColor.rgb = heightColor;
        `
      );

      (material as any).userData.shader = shader;
    };

    return material;
  }, [
    colorValley,
    colorGrass,
    colorSlope,
    colorPeak,
    heightValley,
    heightGrass,
    heightSlope,
    heightPeak,
  ]);

  return (
    <group>
      <RigidBody type="fixed" colliders="trimesh" friction={1}>
        <mesh
          ref={(ref) => {
            if (ref && !terrainMeshRef.current) {
              ref.geometry.computeVertexNormals();
              ref.updateMatrixWorld(true);
              terrainMeshRef.current = ref;
              if (onTerrainReady) onTerrainReady(ref);
            }
          }}
          geometry={terrainGeometry}
          material={terrainMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, terrainYPosition, 0]}
          receiveShadow
          castShadow
        />
      </RigidBody>
    </group>
  );
};

export default HeightMapTerrainSimon;
