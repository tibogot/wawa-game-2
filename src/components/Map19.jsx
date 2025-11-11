import { forwardRef } from "react";
import { ProceduralTerrain19 } from "./ProceduralTerrain19";

export const Map19 = forwardRef(
  (
    { scale = 1, position = [0, 0, 0], onTerrainReady, ...props },
    ref
  ) => {
    return (
      <ProceduralTerrain19
        ref={ref}
        onTerrainReady={onTerrainReady}
        {...props}
        position={position}
        scale={scale}
      />
    );
  }
);

Map19.displayName = "Map19";

