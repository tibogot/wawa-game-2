import { useControls, folder } from "leva";

export const useKickelhahnTowerControls = () => {
  return useControls("🏛️ OBJECTS", {
    kickelhahnTower: folder(
      {
        kickelhahnTowerEnabled: {
          value: false,
          label: "🏰 Enable Kickelhahn Tower",
        },
        kickelhahnTowerPosition: {
          value: [500, 0, 0],
          label: "📍 Position [X, Y, Z]",
          step: 1,
        },
        kickelhahnTowerScale: {
          value: 1,
          label: "📏 Scale",
          min: 0.1,
          max: 5,
          step: 0.1,
        },
        kickelhahnTowerRotation: {
          value: [0, 0, 0],
          label: "🔄 Rotation [X, Y, Z]",
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};
