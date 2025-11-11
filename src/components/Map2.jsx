import { ProceduralTerrain } from "./ProceduralTerrain";

export const Map2 = ({ scale = 1, position = [0, 0, 0], ...props }) => {
  return (
    <group {...props}>
      <ProceduralTerrain />
    </group>
  );
};
