import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { TileMaterial } from "./TileMaterial";
import {
  TILE_DENSITY,
  TILE_REFERENCE_SCALE,
  TILE_REFERENCE_SIZE,
} from "./tileMaterialConfig";
import { TeleportationRequest } from "../types/teleportation";

type Map18Props = {
  scale?: number;
  position?: [number, number, number];
  onTerrainReady?: (terrain: THREE.Mesh | null) => void;
  onTeleportRequest?: (request: TeleportationRequest) => void;
} & React.ComponentProps<"group">;

type TerrainData = {
  heights: Float32Array;
  widthSegments: number;
  heightSegments: number;
  minHeight: number;
  maxHeight: number;
};

type BuildingConfig = {
  size: [number, number, number];
  position: [number, number, number];
};

type TeleportDoorConfig = {
  id: string;
  position: [number, number, number];
  targetId: string;
  activationRadius?: number;
  activationHeight?: number;
  cameraOffset?: [number, number, number];
  lookAtOffset?: [number, number, number];
  spawnOffset?: [number, number, number];
  delayMs?: number;
  cooldownMs?: number;
  frameHeight?: number;
  frameWidth?: number;
  frameDepth?: number;
  frameColor?: string;
};

type TeleportationDoorProps = {
  door: TeleportDoorConfig;
  targetDoor: TeleportDoorConfig;
  mapScale: number;
  mapPosition: [number, number, number];
  onTeleportRequest?: (request: TeleportationRequest) => void;
};

const teleportDoorCooldownRegistry = new Map<string, Map<number, number>>();

const TERRAIN_SIZE = 2000;
const TERRAIN_SEGMENTS = 256;
const TERRAIN_ELEVATION = 90;
const TERRAIN_TEXTURE_SCALE =
  (TERRAIN_SIZE / TILE_REFERENCE_SIZE) * TILE_REFERENCE_SCALE;

type RawBuildingConfig = {
  size: [number, number, number];
  localPosition: [number, number];
};

type RawTeleportDoorConfig = Omit<
  TeleportDoorConfig,
  "position" | "targetId"
> & {
  localPosition: [number, number];
  targetKey: "a" | "b";
};

const RAW_BUILDINGS: RawBuildingConfig[] = [
  { size: [18, 60, 14], localPosition: [-30, -20] },
];

const RAW_TELEPORT_DOORS: Array<
  Omit<TeleportDoorConfig, "position" | "targetId"> & {
    localPosition: [number, number];
    targetId: string;
  }
> = [
  {
    id: "map18-door-a",
    localPosition: [380, 510],
    targetId: "map18-door-b",
    activationRadius: 1.8,
    activationHeight: 0.35,
    cameraOffset: [0, 5, 8],
    lookAtOffset: [0, 2.2, 0],
    spawnOffset: [0, 1.4, 0],
    delayMs: 200,
    cooldownMs: 1200,
    frameHeight: 4.2,
    frameWidth: 2.6,
    frameDepth: 0.35,
    frameColor: "#3bd2ff",
  },
  {
    id: "map18-door-b",
    localPosition: [-120, -90],
    targetId: "map18-door-a",
    activationRadius: 1.8,
    activationHeight: 0.35,
    cameraOffset: [0, 5, -8],
    lookAtOffset: [0, 2.2, 0],
    spawnOffset: [0, 1.4, 0],
    delayMs: 200,
    cooldownMs: 1200,
    frameHeight: 4.2,
    frameWidth: 2.6,
    frameDepth: 0.35,
    frameColor: "#ff8cf7",
  },
];

export const Map18 = forwardRef<THREE.Mesh | null, Map18Props>(
  (
    {
      scale = 1,
      position = [0, 0, 0],
      onTerrainReady,
      onTeleportRequest,
      ...props
    }: Map18Props,
    ref
  ) => {
    const terrainMeshRef = useRef<THREE.Mesh | null>(null);
    const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const hasAnnouncedReadyRef = useRef(false);

    const [terrainData, setTerrainData] = useState<TerrainData | null>(null);
    const [terrainReady, setTerrainReady] = useState(false);

    const [buildings, setBuildings] = useState<BuildingConfig[]>(() =>
      RAW_BUILDINGS.map((config) => ({
        size: config.size,
        position: [
          config.localPosition[0],
          config.size[1] * 0.5,
          config.localPosition[1],
        ],
      }))
    );

    const [teleportDoors, setTeleportDoors] = useState<TeleportDoorConfig[]>(
      () =>
        RAW_TELEPORT_DOORS.map((door) => ({
          ...door,
          position: [door.localPosition[0], 0, door.localPosition[1]],
        }))
    );

    const assignRefs = useCallback(
      (value: THREE.Mesh | null) => {
        terrainMeshRef.current = value;
        if (typeof ref === "function") {
          ref(value);
        } else if (ref) {
          ref.current = value;
        }
      },
      [ref]
    );

    const sampleHeight = useCallback(
      (localX: number, localZ: number) => {
        if (!terrainData) {
          return 0;
        }

        const { heights, widthSegments, heightSegments } = terrainData;
        const stride = widthSegments + 1;
        const halfSize = TERRAIN_SIZE / 2;

        const clampedX = Math.max(-halfSize, Math.min(halfSize, localX));
        const clampedZ = Math.max(-halfSize, Math.min(halfSize, localZ));

        const u = (clampedX + halfSize) / TERRAIN_SIZE;
        const v = (-clampedZ + halfSize) / TERRAIN_SIZE;

        const fx = u * widthSegments;
        const fz = v * heightSegments;

        const ix = Math.floor(fx);
        const iz = Math.floor(fz);
        const tx = fx - ix;
        const tz = fz - iz;

        const strideClampX = Math.max(0, Math.min(widthSegments, ix));
        const strideClampZ = Math.max(0, Math.min(heightSegments, iz));
        const strideClampX1 = Math.max(0, Math.min(widthSegments, ix + 1));
        const strideClampZ1 = Math.max(0, Math.min(heightSegments, iz + 1));

        const h = (xIndex: number, zIndex: number) =>
          heights[zIndex * stride + xIndex];

        const h00 = h(strideClampX, strideClampZ);
        const h10 = h(strideClampX1, strideClampZ);
        const h01 = h(strideClampX, strideClampZ1);
        const h11 = h(strideClampX1, strideClampZ1);

        const h0 = h00 * (1 - tx) + h10 * tx;
        const h1 = h01 * (1 - tx) + h11 * tx;

        return h0 * (1 - tz) + h1 * tz;
      },
      [terrainData]
    );

    useEffect(() => {
      const worker = new Worker(
        new URL("../workers/map18TerrainWorker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      const seed = 73421;
      worker.postMessage({
        size: TERRAIN_SIZE,
        segments: TERRAIN_SEGMENTS,
        verticalScale: TERRAIN_ELEVATION,
        seed,
      });

      const handleMessage = (event: MessageEvent<TerrainData>) => {
        const { heights, widthSegments, heightSegments, minHeight, maxHeight } =
          event.data;

        const data: TerrainData = {
          heights: new Float32Array(heights),
          widthSegments,
          heightSegments,
          minHeight,
          maxHeight,
        };

        setTerrainData(data);
      };

      worker.addEventListener("message", handleMessage);

      return () => {
        worker.removeEventListener("message", handleMessage);
        worker.terminate();
        workerRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (!terrainData || !geometryRef.current) {
        return;
      }

      const geometry = geometryRef.current;
      const positions = geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < positions.count; i++) {
        positions.setZ(i, terrainData.heights[i]);
      }

      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      setTerrainReady(true);
    }, [terrainData]);

    useEffect(() => {
      if (!terrainReady || !terrainData) {
        return;
      }

      const updatedBuildings = RAW_BUILDINGS.map((building) => {
        const localX = building.localPosition[0];
        const localZ = building.localPosition[1];
        const baseHeight = sampleHeight(localX, localZ);
        return {
          size: building.size,
          position: [localX, baseHeight + building.size[1] * 0.5, localZ] as [
            number,
            number,
            number,
          ],
        };
      });

      setBuildings(updatedBuildings);

      const updatedDoors = RAW_TELEPORT_DOORS.map((door) => {
        const localX = door.localPosition[0];
        const localZ = door.localPosition[1];
        const groundHeight = sampleHeight(localX, localZ);
        return {
          ...door,
          position: [localX, groundHeight, localZ] as [number, number, number],
        };
      });

      setTeleportDoors(updatedDoors);
    }, [terrainReady, sampleHeight, terrainData]);

    useEffect(() => {
      if (
        terrainReady &&
        !hasAnnouncedReadyRef.current &&
        onTerrainReady &&
        terrainMeshRef.current
      ) {
        hasAnnouncedReadyRef.current = true;
        onTerrainReady(terrainMeshRef.current);
      }
    }, [terrainReady, onTerrainReady]);

    const buildingGeometries = useMemo(() => {
      const tileSize = 1 / TILE_DENSITY;

      return buildings.map(({ size }) => {
        const width = size[0] * scale;
        const height = size[1] * scale;
        const depth = size[2] * scale;
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const positionAttr = geometry.attributes
          .position as THREE.BufferAttribute;
        const normalAttr = geometry.attributes.normal as THREE.BufferAttribute;
        const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;

        const positionVector = new THREE.Vector3();
        const normalVector = new THREE.Vector3();

        for (let i = 0; i < uvAttr.count; i++) {
          positionVector.fromBufferAttribute(positionAttr, i);
          normalVector.fromBufferAttribute(normalAttr, i);

          const absNormalX = Math.abs(normalVector.x);
          const absNormalY = Math.abs(normalVector.y);
          const absNormalZ = Math.abs(normalVector.z);

          if (absNormalX >= absNormalY && absNormalX >= absNormalZ) {
            const u = (positionVector.z + depth * 0.5) / tileSize;
            const v = (positionVector.y + height * 0.5) / tileSize;
            uvAttr.setXY(i, u, v);
          } else if (absNormalY >= absNormalX && absNormalY >= absNormalZ) {
            const u = (positionVector.x + width * 0.5) / tileSize;
            const v = (positionVector.z + depth * 0.5) / tileSize;
            uvAttr.setXY(i, u, v);
          } else {
            const u = (positionVector.x + width * 0.5) / tileSize;
            const v = (positionVector.y + height * 0.5) / tileSize;
            uvAttr.setXY(i, u, v);
          }
        }

        uvAttr.needsUpdate = true;
        return geometry;
      });
    }, [buildings, scale]);

    useEffect(() => {
      return () => {
        buildingGeometries.forEach((geometry) => geometry.dispose());
      };
    }, [buildingGeometries]);

    const teleportDoorLookup = useMemo(() => {
      const lookup = new Map<string, TeleportDoorConfig>();
      teleportDoors.forEach((door) => lookup.set(door.id, door));
      return lookup;
    }, [teleportDoors]);

    return (
      <group {...props}>
        <RigidBody
          type="fixed"
          colliders="trimesh"
          position={position}
          restitution={0}
          friction={1}
        >
          <mesh
            ref={assignRefs}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={scale}
            castShadow
            receiveShadow
          >
            <planeGeometry
              ref={geometryRef}
              args={[
                TERRAIN_SIZE,
                TERRAIN_SIZE,
                TERRAIN_SEGMENTS,
                TERRAIN_SEGMENTS,
              ]}
            />
            <TileMaterial textureScale={TERRAIN_TEXTURE_SCALE} />
          </mesh>
        </RigidBody>

        {buildings.map(({ position: buildingPosition }, index) => {
          const worldPosition: [number, number, number] = [
            position[0] + buildingPosition[0] * scale,
            position[1] + buildingPosition[1] * scale,
            position[2] + buildingPosition[2] * scale,
          ];

          return (
            <RigidBody
              key={`building-${buildingPosition[0]}-${buildingPosition[1]}-${buildingPosition[2]}`}
              type="fixed"
              colliders="cuboid"
              position={worldPosition}
              friction={1}
              restitution={0}
            >
              <mesh castShadow receiveShadow>
                <primitive object={buildingGeometries[index]} />
                <TileMaterial textureScale={TILE_DENSITY} />
              </mesh>
            </RigidBody>
          );
        })}

        {teleportDoors.map((door) => {
          const targetDoor = teleportDoorLookup.get(door.targetId);
          if (!targetDoor) {
            return null;
          }
          return (
            <TeleportationDoor
              key={`${door.id}-${door.position[0]}-${door.position[1]}-${door.position[2]}`}
              door={door}
              targetDoor={targetDoor}
              mapScale={scale}
              mapPosition={position}
              onTeleportRequest={onTeleportRequest}
            />
          );
        })}
      </group>
    );
  }
);

Map18.displayName = "Map18";

const TeleportationDoor = ({
  door,
  targetDoor,
  mapScale,
  mapPosition,
  onTeleportRequest,
}: TeleportationDoorProps) => {
  const cooldownMap = useMemo(() => {
    let existing = teleportDoorCooldownRegistry.get(door.id);
    if (!existing) {
      existing = new Map<number, number>();
      teleportDoorCooldownRegistry.set(door.id, existing);
    }
    return existing;
  }, [door.id]);

  const originWorld = useMemo(
    () =>
      new THREE.Vector3(
        mapPosition[0] + door.position[0] * mapScale,
        mapPosition[1] + door.position[1] * mapScale,
        mapPosition[2] + door.position[2] * mapScale
      ),
    [door.position, mapPosition, mapScale]
  );

  const targetWorld = useMemo(
    () =>
      new THREE.Vector3(
        mapPosition[0] + targetDoor.position[0] * mapScale,
        mapPosition[1] + targetDoor.position[1] * mapScale,
        mapPosition[2] + targetDoor.position[2] * mapScale
      ),
    [targetDoor.position, mapPosition, mapScale]
  );

  const activationRadius = (door.activationRadius ?? 1.5) * mapScale;
  const activationHeight = (door.activationHeight ?? 0.3) * mapScale;
  const halfHeight = Math.max(activationHeight * 0.5, 0.05);

  const frameHeight = (door.frameHeight ?? 4) * mapScale;
  const frameWidth = (door.frameWidth ?? 2) * mapScale;
  const frameDepth = (door.frameDepth ?? 0.25) * mapScale;
  const frameColor = door.frameColor ?? "#3bd2ff";
  const frameThickness = frameDepth * 0.6;

  const scaledSpawnOffset =
    door.spawnOffset !== undefined
      ? (door.spawnOffset.map((value) => value * mapScale) as [
          number,
          number,
          number,
        ])
      : [0, 1.2 * mapScale, 0];
  const scaledCameraOffset =
    door.cameraOffset !== undefined
      ? (door.cameraOffset.map((value) => value * mapScale) as [
          number,
          number,
          number,
        ])
      : [0, 5 * mapScale, 8 * mapScale];
  const scaledLookAtOffset =
    door.lookAtOffset !== undefined
      ? (door.lookAtOffset.map((value) => value * mapScale) as [
          number,
          number,
          number,
        ])
      : [0, 2 * mapScale, 0];

  const delayMs = door.delayMs ?? 200;
  const cooldownMs = door.cooldownMs ?? 1000;
  const originPosition: [number, number, number] = [
    originWorld.x,
    originWorld.y,
    originWorld.z,
  ];

  const targetPosition: [number, number, number] = [
    targetWorld.x,
    targetWorld.y,
    targetWorld.z,
  ];

  const spawnPosition: [number, number, number] = [
    targetWorld.x + scaledSpawnOffset[0],
    targetWorld.y + scaledSpawnOffset[1],
    targetWorld.z + scaledSpawnOffset[2],
  ];

  const cameraPosition: [number, number, number] = [
    targetWorld.x + scaledCameraOffset[0],
    targetWorld.y + scaledCameraOffset[1],
    targetWorld.z + scaledCameraOffset[2],
  ];

  const lookAtPosition: [number, number, number] = [
    targetWorld.x + scaledLookAtOffset[0],
    targetWorld.y + scaledLookAtOffset[1],
    targetWorld.z + scaledLookAtOffset[2],
  ];

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={originPosition}
      friction={0}
      restitution={0}
    >
      <CylinderCollider
        args={[halfHeight, activationRadius]}
        sensor
        onIntersectionEnter={({ other }) => {
          const body = other.rigidBody;
          if (!body || !onTeleportRequest) {
            return;
          }

          const handle = body.handle;
          const now = performance.now();
          const last = cooldownMap.get(handle);
          if (last !== undefined && now - last < cooldownMs) {
            return;
          }

          cooldownMap.set(handle, now);
          let targetCooldown = teleportDoorCooldownRegistry.get(targetDoor.id);
          if (!targetCooldown) {
            targetCooldown = new Map<number, number>();
            teleportDoorCooldownRegistry.set(targetDoor.id, targetCooldown);
          }
          targetCooldown.set(handle, now);

          const request: TeleportationRequest = {
            id: `${door.id}-${Date.now()}`,
            sourceId: door.id,
            targetId: targetDoor.id,
            targetPosition,
            spawnPosition,
            cameraPosition,
            lookAtPosition,
            delayMs,
          };

          onTeleportRequest(request);
        }}
      />
      <group>
        <mesh
          castShadow
          receiveShadow
          position={[0, -halfHeight - 0.05 * mapScale, 0]}
        >
          <cylinderGeometry
            args={[
              activationRadius * 1.05,
              activationRadius * 1.2,
              0.1 * mapScale,
              32,
            ]}
          />
          <meshStandardMaterial
            color="#1a1a1f"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>

        <group>
          <mesh
            castShadow
            receiveShadow
            position={[
              -frameWidth * 0.5 + frameThickness * 0.5,
              frameHeight * 0.5,
              0,
            ]}
          >
            <boxGeometry args={[frameThickness, frameHeight, frameDepth]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={frameColor}
              emissiveIntensity={0.35}
              roughness={0.25}
              metalness={0.6}
            />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[
              frameWidth * 0.5 - frameThickness * 0.5,
              frameHeight * 0.5,
              0,
            ]}
          >
            <boxGeometry args={[frameThickness, frameHeight, frameDepth]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={frameColor}
              emissiveIntensity={0.35}
              roughness={0.25}
              metalness={0.6}
            />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[0, frameHeight - frameThickness * 0.5, 0]}
          >
            <boxGeometry
              args={[frameWidth - frameThickness, frameThickness, frameDepth]}
            />
            <meshStandardMaterial
              color={frameColor}
              emissive={frameColor}
              emissiveIntensity={0.35}
              roughness={0.25}
              metalness={0.6}
            />
          </mesh>
          <mesh position={[0, frameHeight * 0.5, 0]} castShadow receiveShadow>
            <planeGeometry args={[frameWidth * 0.7, frameHeight * 0.9]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={frameColor}
              emissiveIntensity={0.6}
              transparent
              opacity={0.45}
              roughness={0.15}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        <mesh
          position={[0, frameHeight * 0.1, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry
            args={[activationRadius * 0.65, frameThickness * 0.35, 16, 48]}
          />
          <meshStandardMaterial
            color={frameColor}
            emissive={frameColor}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};
