import React from "react";
import { EnhancedProceduralTerrain } from "./EnhancedProceduralTerrain";

export const Map4 = ({ scale = 1, position = [0, 0, 0], ...props }) => {
  return (
    <EnhancedProceduralTerrain
      size={2000}
      segments={200}
      position={position}
      scale={scale}
      {...props}
    />
  );
};
