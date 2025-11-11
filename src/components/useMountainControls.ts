import { useControls, folder } from "leva";

export const useMountainControls = () => {
  return useControls("🏛️ OBJECTS", {
    mountain: folder(
      {
        mountainEnabled: { value: false, label: "🏔️ Enable Mountain" },
        mountainPosition: {
          value: [0, 0, 0],
          label: "📍 Position [X, Y, Z]",
          step: 1,
        },
        mountainScale: {
          value: [1, 1, 1],
          label: "📏 Scale [X, Y, Z]",
          step: 0.1,
        },
        mountainRotation: {
          value: [0, 0, 0],
          label: "🔄 Rotation [X, Y, Z]",
          step: 0.1,
        },
        mountainColor: {
          value: "#8B7355",
          label: "🎨 Base Color",
        },
        mountainOpacity: {
          value: 1.0,
          min: 0.0,
          max: 1.0,
          step: 0.1,
          label: "👻 Opacity",
        },
        mountainRoughness: {
          value: 0.8,
          min: 0.0,
          max: 1.0,
          step: 0.1,
          label: "🔳 Roughness",
        },
        mountainMetalness: {
          value: 0.0,
          min: 0.0,
          max: 1.0,
          step: 0.1,
          label: "✨ Metalness",
        },
        mountainEmissive: {
          value: "#000000",
          label: "💡 Emissive Color",
        },
        mountainEmissiveIntensity: {
          value: 0.0,
          min: 0.0,
          max: 2.0,
          step: 0.1,
          label: "💡 Emissive Intensity",
        },
      },
      { collapsed: true }
    ),
  });
};
