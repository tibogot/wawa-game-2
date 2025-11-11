import { useControls, folder } from "leva";

export const useWindFlagControls = () => {
  return useControls("🏛️ OBJECTS", {
    windFlag: folder(
      {
        windFlagEnabled: { value: false, label: "🏳️ Enable Wind Flag" },
        windFlagPosition: {
          value: [10, 0, 10],
          label: "📍 Position [X, Z]",
          step: 1,
        },
        windFlagYOffset: {
          value: 0.0,
          min: -5.0,
          max: 5.0,
          step: 0.1,
          label: "⬆️ Y Height Offset",
        },
        windFlagScale: {
          value: 1.0,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "📏 Scale",
        },
        windFlagColor: {
          value: "#ff0000",
          label: "🎨 Flag Color",
        },
        windFlagPoleHeight: {
          value: 8,
          min: 3,
          max: 20,
          step: 0.5,
          label: "📏 Pole Height",
        },
        windFlagWidth: {
          value: 3,
          min: 1,
          max: 8,
          step: 0.5,
          label: "📐 Flag Width",
        },
        windFlagHeight: {
          value: 2,
          min: 1,
          max: 6,
          step: 0.5,
          label: "📐 Flag Height",
        },
        windFlagSegments: {
          value: 20,
          min: 10,
          max: 50,
          step: 5,
          label: "🔢 Segments (Quality)",
        },
        windFlagUseTexture: {
          value: true,
          label: "🖼️ Use Texture",
        },
        windFlagTexturePath: {
          value: "/textures/flag.png",
          label: "📁 Texture Path",
        },
        windFlagTextureQuality: {
          value: 16,
          min: 1,
          max: 16,
          step: 1,
          label: "✨ Texture Quality",
        },
        windFlagWaveIntensity: {
          value: 0.8,
          min: 0.1,
          max: 2.0,
          step: 0.1,
          label: "🌊 Wave Intensity",
        },
      },
      { collapsed: true }
    ),
  });
};
