import { useControls, folder } from "leva";

export const useQuarryRocksControls = () => {
  return useControls("🏛️ OBJECTS", {
    quarryRocks: folder(
      {
        quarryRocksEnabled: { value: false, label: "🪨 Enable Quarry Rocks" },
        quarryRocksPosition: {
          value: [100, 0, 100],
          label: "📍 Position [X, Y, Z]",
          step: 1,
        },
        quarryRocksScale: {
          value: 1,
          label: "📏 Scale",
          min: 0.1,
          max: 5,
          step: 0.1,
        },
        quarryRocksRotation: {
          value: [0, 0, 0],
          label: "🔄 Rotation [X, Y, Z]",
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};
