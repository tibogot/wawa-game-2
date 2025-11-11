import { useControls, folder } from "leva";

export const useRock1Controls = () => {
  return useControls("🏛️ OBJECTS", {
    rock1: folder(
      {
        rock1Enabled: { value: true, label: "🪨 Enable Rock1" },
        rock1Position: {
          value: [10, 0, 10],
          label: "📍 Position [X, Y, Z]",
          step: 1,
        },
        rock1Scale: {
          value: 1,
          label: "📏 Scale",
          min: 0.1,
          max: 5,
          step: 0.1,
        },
        rock1Rotation: {
          value: [0, 0, 0],
          label: "🔄 Rotation [X, Y, Z]",
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};

