import { useControls, folder } from "leva";

export const useSimonDevGrass21Controls = () => {
  return useControls("🌿 FOLIAGE", {
    simonDevGrass21: folder(
      {
        simonDevGrass21Enabled: {
          value: false,
          label: "🌾 Enable Grass System",
        },
      },
      { collapsed: true }
    ),
  });
};
