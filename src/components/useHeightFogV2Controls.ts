import { useControls, folder } from "leva";

export const useHeightFogV2Controls = () => {
  return useControls("🌤️ AMBIENCE", {
    heightFogV2: folder(
      {
        heightFogV2Enabled: { value: false, label: "🌫️ Enable Height Fog V2" },
        fogV2Color: { value: "#b8c4d4", label: "Fog Color" },
        fogV2Height: {
          value: 80,
          label: "Fog Height",
          min: 0,
          max: 300,
          step: 5,
        },
        fogV2Near: {
          value: 1,
          label: "Fog Near",
          min: 0.1,
          max: 100,
          step: 1,
        },
        fogV2Far: {
          value: 1500,
          label: "Fog Far",
          min: 10,
          max: 5000,
          step: 10,
        },
        fogV2Density: {
          value: 0.5,
          label: "Fog Density",
          min: 0,
          max: 1,
          step: 0.01,
        },
        fogV2HeightFalloff: {
          value: 1.0,
          label: "Height Falloff",
          min: 0.1,
          max: 5,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};
