import { useMemo, forwardRef } from "react";
import * as THREE from "three";
import { ProceduralTerrain21 } from "./ProceduralTerrain21";
import { InfiniteWorldSky } from "./InfiniteWorldSky";

export const Map21 = forwardRef(
  (
    {
      scale = 1,
      position = [0, 0, 0],
      onTerrainReady,
      onHeightmapReady,
      characterPosition,
      sunDirection = [-0.35, 0.8, -0.2],
      dayCycleSpeed = 0.02,
      enableSky = true,
      ...props
    },
    ref
  ) => {
    const normalizedSunDirection = useMemo(() => {
      const dir = Array.isArray(sunDirection)
        ? new THREE.Vector3(sunDirection[0], sunDirection[1], sunDirection[2])
        : new THREE.Vector3(
            sunDirection?.x ?? 0,
            sunDirection?.y ?? 1,
            sunDirection?.z ?? 0
          );
      if (dir.lengthSq() === 0) {
        dir.set(-0.35, 0.8, -0.2);
      }
      dir.normalize();
      return [dir.x, dir.y, dir.z];
    }, [sunDirection]);

    const baseSunVector = useMemo(
      () =>
        new THREE.Vector3(
          normalizedSunDirection[0],
          normalizedSunDirection[1],
          normalizedSunDirection[2]
        ),
      [normalizedSunDirection]
    );

    return (
      <>
        {enableSky && (
          <InfiniteWorldSky
            baseSunDirection={baseSunVector}
            dayCycleSpeed={dayCycleSpeed}
          />
        )}
        <ProceduralTerrain21
          ref={ref}
          position={position}
          scale={scale}
          onTerrainReady={onTerrainReady}
          onHeightmapReady={onHeightmapReady}
          playerPosition={characterPosition}
          sunPosition={normalizedSunDirection}
          {...props}
        />
      </>
    );
  }
);

Map21.displayName = "Map21";

