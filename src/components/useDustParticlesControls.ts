import { useControls, folder } from "leva";

export const useDustParticlesControls = () => {
  return useControls("🌤️ AMBIENCE", {
    dustParticles: folder(
      {
        dustEnabled: { value: false, label: "✨ Enable Dust Particles" },
        dustCount: {
          value: 8,
          label: "Count",
          min: 1,
          max: 50,
          step: 1,
        },
        dustSpawnRange: {
          value: 20.0,
          label: "Spawn Range",
          min: 5,
          max: 100,
          step: 5,
        },
        dustMaxDistance: {
          value: 50.0,
          label: "Max Distance",
          min: 20,
          max: 200,
          step: 10,
        },
        dustSize: {
          value: [0.4, 0.4] as [number, number],
          label: "Size [Width, Height]",
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};
