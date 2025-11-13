import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from "react";
import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import { GrassField as GrassField5 } from "./GrassClaude5";
import { useGrassClaude5Controls } from "./useGrassClaude5Controls";
import { FloorDebugSpheres } from "./FloorDebugSpheres";
import { useFloorDebugSpheresControls } from "./useFloorDebugSpheresControls";

export const Map22 = forwardRef(
  (
    {
      scale = 1,
      position = [0, 0, 0],
      onTerrainReady,
      characterPosition,
      ...props
    },
    ref
  ) => {
    const { nodes, materials } = useGLTF(
      "/models/myblenderterrain-transformed.glb"
    );
    const meshRef = useRef(null);
    const [isTerrainMeshReady, setIsTerrainMeshReady] = useState(false);

    // Get GrassClaude5 controls
    const {
      grassClaude5Enabled,
      grassHeight: grassHeight5,
      gridSize: grassGridSize5,
      patchSpacing: patchSpacing5,
      segments: grassSegments5,
      numGrass: numGrass5,
      patchSize: patchSize5,
      grassWidth: grassWidth5,
      lodDistance: lodDistance5,
      maxDistance: maxDistance5,
      baseColor1: baseColor1_5,
      baseColor2: baseColor2_5,
      tipColor1: tipColor1_5,
      tipColor2: tipColor2_5,
      gradientBlend: gradientBlend5,
      gradientCurve: gradientCurve5,
      backscatterEnabled: backscatterEnabled5,
      backscatterIntensity: backscatterIntensity5,
      backscatterColor: backscatterColor5,
      backscatterPower: backscatterPower5,
      frontScatterStrength: frontScatterStrength5,
      rimSSSStrength: rimSSSStrength5,
      specularEnabled: specularEnabled5,
      specularIntensity: specularIntensity5,
      specularColor: specularColor5,
      specularPower: specularPower5,
      specularScale: specularScale5,
      lightDirectionX: lightDirectionX5,
      lightDirectionY: lightDirectionY5,
      lightDirectionZ: lightDirectionZ5,
      windEnabled: windEnabled5,
      windStrength: windStrength5,
      windDirectionScale: windDirectionScale5,
      windDirectionSpeed: windDirectionSpeed5,
      windStrengthScale: windStrengthScale5,
      windStrengthSpeed: windStrengthSpeed5,
      playerInteractionEnabled: playerInteractionEnabled5,
      playerInteractionRange: playerInteractionRange5,
      playerInteractionStrength: playerInteractionStrength5,
      normalMixEnabled: normalMixEnabled5,
      normalMixFactor: normalMixFactor5,
      aoEnabled: aoEnabled5,
      aoIntensity: aoIntensity5,
      fogEnabled: grassFogEnabled5,
      fogNear: grassFogNear5,
      fogFar: grassFogFar5,
      fogColor: grassFogColor5,
      fogIntensity: grassFogIntensity5,
    } = useGrassClaude5Controls();

    // Get FloorDebugSpheres controls
    const {
      enabled: floorDebugSpheresEnabled,
      gridSize: floorDebugGridSize,
      areaSize: floorDebugAreaSize,
      sphereSize: floorDebugSphereSize,
      sphereColor: floorDebugSphereColor,
      emissiveIntensity: floorDebugEmissiveIntensity,
    } = useFloorDebugSpheresControls();

    // Create stable fallback vectors
    const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    // Calculate terrain bounds to determine proper positioning
    const terrainBounds = useMemo(() => {
      if (!nodes.Plane?.geometry) return null;

      const geometry = nodes.Plane.geometry;
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      const bbox = geometry.boundingBox;

      const width = bbox.max.x - bbox.min.x;
      const depth = bbox.max.z - bbox.min.z;
      const height = bbox.max.y - bbox.min.y;
      const size = Math.max(width, depth);

      console.log(
        `🗺️ Map22 terrain bounds: X[${bbox.min.x.toFixed(
          2
        )}, ${bbox.max.x.toFixed(2)}], Z[${bbox.min.z.toFixed(
          2
        )}, ${bbox.max.z.toFixed(2)}], Y[${bbox.min.y.toFixed(
          2
        )}, ${bbox.max.y.toFixed(2)}]`
      );
      console.log(
        `📏 Map22 terrain size: Width=${width.toFixed(
          2
        )}, Depth=${depth.toFixed(2)}, Height=${height.toFixed(
          2
        )}, Size=${size.toFixed(2)}`
      );

      return {
        minX: bbox.min.x,
        maxX: bbox.max.x,
        minY: bbox.min.y,
        maxY: bbox.max.y,
        minZ: bbox.min.z,
        maxZ: bbox.max.z,
      };
    }, [nodes]);

    // Calculate terrain size and center from bounds
    const { terrainSize, terrainCenterX, terrainCenterZ } = useMemo(() => {
      if (!terrainBounds)
        return { terrainSize: 1000, terrainCenterX: 0, terrainCenterZ: 0 };
      const width = terrainBounds.maxX - terrainBounds.minX;
      const height = terrainBounds.maxZ - terrainBounds.minZ;
      const size = Math.max(width, height);
      const centerX = (terrainBounds.minX + terrainBounds.maxX) / 2;
      const centerZ = (terrainBounds.minZ + terrainBounds.maxZ) / 2;
      return {
        terrainSize: size,
        terrainCenterX: centerX,
        terrainCenterZ: centerZ,
      };
    }, [terrainBounds]);

    // Build BVH for fast raycasting - one-time setup
    const bvhReadyRef = useRef(false);
    useEffect(() => {
      if (!meshRef.current || !nodes.Plane?.geometry || bvhReadyRef.current) {
        return;
      }

      const geometry = nodes.Plane.geometry;
      if (!geometry.boundsTree) {
        console.log("🔍 Building BVH for terrain mesh...");
        geometry.boundsTree = new MeshBVH(geometry);
        // Replace raycast method with accelerated version
        meshRef.current.raycast = acceleratedRaycast;
        bvhReadyRef.current = true;
        console.log("✅ BVH built - accelerated raycasting enabled!");
      }
    }, [nodes]);

    // Use BVH-accelerated raycasting for accurate height lookup
    const getGroundHeight = useCallback(
      (x, z) => {
        if (!meshRef.current || !terrainBounds) return 0;

        // Use BVH-accelerated raycasting for fast, accurate height sampling
        const raycaster = new THREE.Raycaster();
        raycaster.firstHitOnly = true; // Stop at first hit for better performance
        const origin = new THREE.Vector3(x, terrainBounds.maxY + 100, z);
        const direction = new THREE.Vector3(0, -1, 0);
        raycaster.set(origin, direction);

        const intersects = raycaster.intersectObject(meshRef.current, false);
        if (intersects.length > 0) {
          return intersects[0].point.y;
        }

        return 0;
      },
      [terrainBounds]
    );

    // Track if terrain mesh is ready
    const isTerrainLookupReady =
      !!meshRef.current && !!terrainBounds && bvhReadyRef.current;

    // Create heightmapLookup function for FloorDebugSpheres
    // This wraps getGroundHeight to match the interface expected by FloorDebugSpheres
    const heightmapLookup = useMemo(() => {
      if (!isTerrainLookupReady) return null;
      return (x, z) => {
        return getGroundHeight(x, z);
      };
    }, [isTerrainLookupReady, getGroundHeight]);

    // Create green terrain material
    const terrainMaterial = useMemo(() => {
      return new THREE.MeshStandardMaterial({
        color: "#4a7c59", // Green color similar to Map5
        roughness: 0.9,
        metalness: 0.0,
      });
    }, []);

    // Generate heightmap texture using BVH-accelerated raycasting
    // Use useState + useEffect to generate async and prevent blocking
    const [heightmapData, setHeightmapData] = useState({
      heightmapTexture: null,
      terrainHeight: 0,
      terrainOffset: 0,
    });

    useEffect(() => {
      if (!isTerrainLookupReady || !terrainBounds || !isTerrainMeshReady) {
        setHeightmapData({
          heightmapTexture: null,
          terrainHeight: 0,
          terrainOffset: 0,
        });
        return;
      }

      const textureSize = 1024;

      console.log(
        "🌱 Map22: Generating heightmap texture using BVH-accelerated raycasting (async)..."
      );

      // Generate heightmap asynchronously using BVH-accelerated raycasting
      const generateHeightmap = () => {
        const data = new Float32Array(textureSize * textureSize);
        let minHeight = Infinity;
        let maxHeight = -Infinity;

        // First pass: sample heights using BVH-accelerated raycasting
        let y = 0;
        const raycaster = new THREE.Raycaster();
        raycaster.firstHitOnly = true; // Stop at first hit for better performance

        const processChunk = () => {
          const chunkSize = 8; // Process fewer rows per frame since raycasting is more expensive
          const endY = Math.min(y + chunkSize, textureSize);

          for (; y < endY; y++) {
            for (let x = 0; x < textureSize; x++) {
              // Convert texture coordinates to world coordinates
              // The grass shader expects terrain centered at (0,0) with size terrainSize
              // Map from texture space [0, textureSize] to world space relative to terrain center
              // Texture coordinate (0,0) = relative position (-terrainSize/2, -terrainSize/2)
              // Texture coordinate (textureSize, textureSize) = relative position (+terrainSize/2, +terrainSize/2)
              const normalizedX = (x / textureSize) * 2 - 1; // [-1, 1]
              const normalizedZ = ((textureSize - 1 - y) / textureSize) * 2 - 1; // [-1, 1] (inverted for Z)

              // Calculate relative position from terrain center (as if terrain is at 0,0)
              const relativeX = normalizedX * (terrainSize / 2);
              const relativeZ = normalizedZ * (terrainSize / 2);

              // Map to actual terrain mesh position (terrain is offset by terrainCenterX, terrainCenterZ)
              const worldX = terrainCenterX + relativeX;
              const worldZ = terrainCenterZ + relativeZ;

              // Use BVH-accelerated raycasting for accurate height sampling
              const origin = new THREE.Vector3(
                worldX,
                terrainBounds.maxY + 100,
                worldZ
              );
              const direction = new THREE.Vector3(0, -1, 0);
              raycaster.set(origin, direction);

              const intersects = raycaster.intersectObject(
                meshRef.current,
                false
              );
              const height = intersects.length > 0 ? intersects[0].point.y : 0;

              // Store in data array
              const index = y * textureSize + x;
              data[index] = height;
              minHeight = Math.min(minHeight, height);
              maxHeight = Math.max(maxHeight, height);
            }
          }

          if (y < textureSize) {
            // Continue processing in next frame
            requestAnimationFrame(processChunk);
          } else {
            // Second pass: normalize heights to 0-1 range
            const heightRange = maxHeight - minHeight;
            for (let i = 0; i < data.length; i++) {
              const normalizedHeight =
                heightRange > 0 ? (data[i] - minHeight) / heightRange : 0.5;
              data[i] = normalizedHeight;
            }

            // Create DataTexture
            const texture = new THREE.DataTexture(
              data,
              textureSize,
              textureSize,
              THREE.RedFormat,
              THREE.FloatType
            );
            texture.needsUpdate = true;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;

            // Calculate terrainOffset to ensure grass sits exactly on terrain
            // The shader does: height = heightmapSample.x * terrainHeight - terrainOffset
            // When heightmapSample.x = 0 (min height), we want: height = minHeight
            // So: minHeight = 0 * terrainHeight - terrainOffset => terrainOffset = -minHeight
            // If grass is floating slightly, we add to the offset (make it less negative)
            // to lower the grass: -(-minHeight + adj) = minHeight - adj (lowers grass)
            const offsetAdjustment = 0.5; // Small adjustment to lower grass onto terrain
            const calculatedOffset =
              minHeight !== Infinity ? -minHeight + offsetAdjustment : 0;

            setHeightmapData({
              heightmapTexture: texture,
              terrainHeight: heightRange > 0 ? heightRange : 100,
              terrainOffset: calculatedOffset,
            });

            console.log(
              `✅ Map22: Heightmap texture generated (height range: ${minHeight.toFixed(
                2
              )} to ${maxHeight.toFixed(2)})`
            );
          }
        };

        // Start processing
        requestAnimationFrame(processChunk);
      };

      // Small delay to ensure BVH is fully ready
      const timeoutId = setTimeout(generateHeightmap, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [
      isTerrainLookupReady,
      isTerrainMeshReady,
      terrainSize,
      terrainCenterX,
      terrainCenterZ,
      terrainBounds,
      getGroundHeight,
    ]);

    const { heightmapTexture, terrainHeight, terrainOffset } = heightmapData;

    // Calculate height at center (0, 0) using raycasting after mesh is mounted
    useEffect(() => {
      if (!meshRef.current || !terrainBounds) return;

      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3(0, terrainBounds.maxY + 100, 0);
      const direction = new THREE.Vector3(0, -1, 0);
      raycaster.set(origin, direction);

      const intersects = raycaster.intersectObject(meshRef.current, false);
      if (intersects.length > 0) {
        const height = intersects[0].point.y;
        console.log(
          `📍 Map22 center (0,0) terrain height: ${height.toFixed(2)}`
        );
        console.log(
          `💡 Suggested spawn Y position: ${(height + 5).toFixed(
            2
          )} (terrain height + 5)`
        );
      } else {
        // Fallback: use average of min/max Y
        const avgHeight = (terrainBounds.minY + terrainBounds.maxY) / 2;
        console.log(
          `⚠️ Map22 raycast failed, terrain average height: ${avgHeight.toFixed(
            2
          )}`
        );
        console.log(
          `💡 Suggested spawn Y position: ${(avgHeight + 5).toFixed(
            2
          )} (average height + 5)`
        );
      }
    }, [terrainBounds]);

    // Mark terrain mesh as ready when lookup is ready
    useEffect(() => {
      if (isTerrainLookupReady && meshRef.current) {
        setIsTerrainMeshReady(true);
      }
    }, [isTerrainLookupReady]);

    // Notify parent when terrain is ready
    useEffect(() => {
      if (
        onTerrainReady &&
        nodes.Plane &&
        meshRef.current &&
        isTerrainMeshReady
      ) {
        // Small delay to ensure mesh is fully mounted
        setTimeout(() => {
          onTerrainReady();
        }, 100);
      }
    }, [onTerrainReady, nodes, isTerrainMeshReady]);

    return (
      <group ref={ref} {...props} dispose={null}>
        <RigidBody type="fixed" colliders="trimesh" friction={1}>
          <mesh
            ref={meshRef}
            geometry={nodes.Plane.geometry}
            material={terrainMaterial}
            receiveShadow
            castShadow
          />
        </RigidBody>

        {/* GrassClaude5 Grass System - Only render when terrain is fully ready */}
        {grassClaude5Enabled &&
          isTerrainMeshReady &&
          meshRef.current &&
          terrainBounds &&
          heightmapTexture && (
            <GrassField5
              gridSize={grassGridSize5}
              patchSpacing={patchSpacing5}
              centerPosition={[terrainCenterX, 0, terrainCenterZ]}
              playerPosition={characterPosition || fallbackPosition}
              getGroundHeight={getGroundHeight}
              segments={grassSegments5}
              numGrass={numGrass5}
              patchSize={patchSize5}
              grassWidth={grassWidth5}
              grassHeight={grassHeight5}
              lodDistance={lodDistance5}
              maxDistance={maxDistance5}
              heightmap={heightmapTexture}
              terrainSize={terrainSize}
              terrainHeight={terrainHeight}
              terrainOffset={terrainOffset}
              baseColor1={baseColor1_5}
              baseColor2={baseColor2_5}
              tipColor1={tipColor1_5}
              tipColor2={tipColor2_5}
              gradientBlend={gradientBlend5}
              gradientCurve={gradientCurve5}
              backscatterEnabled={backscatterEnabled5}
              backscatterIntensity={backscatterIntensity5}
              backscatterColor={backscatterColor5}
              backscatterPower={backscatterPower5}
              frontScatterStrength={frontScatterStrength5}
              rimSSSStrength={rimSSSStrength5}
              specularEnabled={specularEnabled5}
              specularIntensity={specularIntensity5}
              specularColor={specularColor5}
              specularPower={specularPower5}
              specularScale={specularScale5}
              lightDirectionX={lightDirectionX5}
              lightDirectionY={lightDirectionY5}
              lightDirectionZ={lightDirectionZ5}
              windEnabled={windEnabled5}
              windStrength={windStrength5}
              windDirectionScale={windDirectionScale5}
              windDirectionSpeed={windDirectionSpeed5}
              windStrengthScale={windStrengthScale5}
              windStrengthSpeed={windStrengthSpeed5}
              playerInteractionEnabled={playerInteractionEnabled5}
              playerInteractionRange={playerInteractionRange5}
              playerInteractionStrength={playerInteractionStrength5}
              normalMixEnabled={normalMixEnabled5}
              normalMixFactor={normalMixFactor5}
              aoEnabled={aoEnabled5}
              aoIntensity={aoIntensity5}
              fogEnabled={grassFogEnabled5}
              fogNear={grassFogNear5}
              fogFar={grassFogFar5}
              fogColor={grassFogColor5}
              fogIntensity={grassFogIntensity5}
            />
          )}

        {/* FloorDebugSpheres - Visualize terrain height with debug spheres */}
        {floorDebugSpheresEnabled && heightmapLookup && (
          <FloorDebugSpheres
            heightmapLookup={heightmapLookup}
            enabled={floorDebugSpheresEnabled}
            gridSize={floorDebugGridSize}
            areaSize={floorDebugAreaSize}
            sphereSize={floorDebugSphereSize}
            sphereColor={floorDebugSphereColor}
            emissiveIntensity={floorDebugEmissiveIntensity}
          />
        )}
      </group>
    );
  }
);

Map22.displayName = "Map22";

// Preload the model
useGLTF.preload("/models/myblenderterrain-transformed.glb");
