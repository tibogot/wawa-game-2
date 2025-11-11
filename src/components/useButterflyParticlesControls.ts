import { useControls, folder } from "leva";

export const useButterflyParticlesControls = () => {
  return useControls("🌤️ AMBIENCE", {
    butterflyParticles: folder(
      {
        butterflyEnabled: { value: false, label: "🦋 Enable Butterflies" },
        butterflyCount: {
          value: 8,
          label: "Count",
          min: 1,
          max: 50,
          step: 1,
        },
        butterflySpawnRange: {
          value: 40.0,
          label: "Spawn Range",
          min: 10,
          max: 100,
          step: 5,
        },
        butterflyMaxDistance: {
          value: 100.0,
          label: "Max Distance",
          min: 50,
          max: 500,
          step: 10,
        },
        butterflySize: {
          value: [0.5, 1.25] as [number, number],
          label: "Size [Width, Height]",
          step: 0.1,
        },
        butterflyTexture: {
          value: "butterfly" as "butterfly" | "moth" | "both",
          label: "Texture",
          options: ["butterfly", "moth", "both"],
        },
        butterflyHeightMin: {
          value: 2.0,
          label: "Height Min",
          min: 0,
          max: 20,
          step: 0.5,
        },
        butterflyHeightMax: {
          value: 5.0,
          label: "Height Max",
          min: 1,
          max: 30,
          step: 0.5,
        },
        butterflySpreadRadius: {
          value: 1.0,
          label: "Spread Radius",
          min: 0.1,
          max: 3.0,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};
