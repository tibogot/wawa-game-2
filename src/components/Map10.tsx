import React, { forwardRef, useMemo, useState, useCallback } from "react";
import * as THREE from "three";
import ZeldaTerrainSmooth from "./ZeldaTerrainSmooth";
import { SimonDevGrass21 } from "./SimonDevGrass21/SimonDevGrass21";
import { useSimonDevGrass21Controls } from "./useSimonDevGrass21Controls";
import { HeightFog } from "./HeightFog";
import { useHeightFogControls } from "./useHeightFogControls";
import { CloudSystem } from "./CloudSystem";

export const Map10 = forwardRef<any, any>(
  (
    {
      scale = 1,
      position = [0, 0, 0] as [number, number, number],
      characterPosition,
      characterVelocity,
      onTerrainReady,
      ...props
    },
    ref
  ) => {
    const [heightmapLookup, setHeightmapLookup] = useState<
      ((x: number, z: number) => number) | null
    >(null);

    const { simonDevGrass21Enabled } = useSimonDevGrass21Controls();
    const { heightFogEnabled, fogColor, fogHeight, fogNear, fogFar } =
      useHeightFogControls();

    const fallbackPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    const getTerrainHeight = useMemo(() => {
      return (x: number, z: number): number => {
        if (heightmapLookup) {
          return heightmapLookup(x, z);
        }
        return 0;
      };
    }, [heightmapLookup]);

    const handleHeightmapReady = useCallback(
      (fn: (x: number, z: number) => number) => {
        setHeightmapLookup(() => fn);
        if (onTerrainReady) {
          setTimeout(() => {
            onTerrainReady();
          }, 500);
        }
      },
      [onTerrainReady]
    );

    return (
      <group>
        <HeightFog
          enabled={heightFogEnabled}
          fogColor={fogColor}
          fogHeight={fogHeight}
          fogNear={fogNear}
          fogFar={fogFar}
        />
        <ZeldaTerrainSmooth onHeightmapReady={handleHeightmapReady} />
        <CloudSystem />
        {simonDevGrass21Enabled && heightmapLookup && (
          <SimonDevGrass21
            areaSize={200}
            mapSize={2048}
            grassHeight={1.0}
            grassScale={1.0}
            getGroundHeight={getTerrainHeight}
            characterPosition={characterPosition || fallbackPosition}
          />
        )}
      </group>
    );
  }
);


