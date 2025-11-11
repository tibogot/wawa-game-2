import { useControls, folder } from "leva";

export const useRainParticles3DControls = () => {
  return useControls("🌤️ AMBIENCE", {
    rainParticles: folder(
      {
        rainEnabled: { value: false, label: "💧 Enable Rain" },
        rainDensity: {
          value: 500,
          label: "Density",
          min: 100,
          max: 2000,
          step: 50,
        },
        rainAreaSize: {
          value: 50.0,
          label: "Area Size",
          min: 20,
          max: 200,
          step: 10,
        },
        rainHeight: {
          value: 20.0,
          label: "Rain Height",
          min: 5,
          max: 100,
          step: 5,
        },
        rainSpeed: {
          value: 8.0,
          label: "Fall Speed",
          min: 2,
          max: 20,
          step: 1,
        },
        rainParticleSize: {
          value: 0.01,
          label: "Particle Size",
          min: 0.005,
          max: 0.05,
          step: 0.001,
        },
        rainColor: {
          value: "#d0e0ff",
          label: "Rain Color",
        },
        rainOpacity: {
          value: 0.4,
          label: "Opacity",
          min: 0.1,
          max: 1.0,
          step: 0.05,
        },
      },
      { collapsed: true }
    ),
  });
};
