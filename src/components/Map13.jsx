import { useRef, useState, useCallback, forwardRef } from "react";
import { ProceduralTerrain9 } from "./ProceduralTerrain9";

export const Map13 = forwardRef(
  (
    {
      scale = 1,
      position = [0, 0, 0],
      onTerrainReady,
      ...props
    },
    ref
  ) => {
    const group = useRef(null);
    const [heightmapLookup, setHeightmapLookup] = useState(null);

    // Callback when ProceduralTerrain9 heightmap is ready
    const handleHeightmapReady = useCallback((lookupFn) => {
      if (lookupFn) {
        setHeightmapLookup(() => lookupFn);
        console.log(
          "✅ Map13 received heightmap lookup from ProceduralTerrain9"
        );
      }
    }, []);

    // Expose heightmap lookup function via ref if needed
    if (ref) {
      if (typeof ref === "function") {
        ref({ heightmapLookup });
      } else if (ref.current) {
        ref.current.heightmapLookup = heightmapLookup;
      }
    }

    return (
      <group ref={group} position={position} scale={scale} {...props}>
        <ProceduralTerrain9
          onTerrainReady={onTerrainReady}
          onHeightmapReady={handleHeightmapReady}
        />
      </group>
    );
  }
);

Map13.displayName = "Map13";

