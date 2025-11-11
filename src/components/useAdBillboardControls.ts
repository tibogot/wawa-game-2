import { useControls, folder } from "leva";

export const useAdBillboardControls = () => {
  return useControls("🏛️ OBJECTS", {
    adBillboard: folder(
      {
        adBillboardEnabled: { value: false, label: "📢 Enable Ad Billboard" },
        adBillboardPosition: {
          value: [15, 0, 15],
          label: "📍 Position [X, Z]",
          step: 1,
        },
        adBillboardYOffset: {
          value: 0.0,
          min: -5.0,
          max: 5.0,
          step: 0.1,
          label: "⬆️ Y Height Offset",
        },
        adBillboardScale: {
          value: 1.0,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "📏 Scale",
        },
        adBillboardColor: {
          value: "#ffffff",
          label: "🎨 Billboard Color",
        },
        adBillboardPylonHeight: {
          value: 8,
          min: 3,
          max: 20,
          step: 0.5,
          label: "📏 Pylon Height",
        },
        adBillboardWidth: {
          value: 4,
          min: 1,
          max: 10,
          step: 0.5,
          label: "📐 Billboard Width",
        },
        adBillboardHeight: {
          value: 3,
          min: 1,
          max: 8,
          step: 0.5,
          label: "📐 Billboard Height",
        },
        adBillboardPylonSpacing: {
          value: 4.5,
          min: 2,
          max: 12,
          step: 0.5,
          label: "📏 Pylon Spacing",
        },
        adBillboardPylonRadius: {
          value: 0.08,
          min: 0.05,
          max: 0.2,
          step: 0.01,
          label: "📏 Pylon Radius",
        },
        adBillboardUseTexture: {
          value: true,
          label: "🖼️ Use Texture",
        },
        adBillboardTexturePath: {
          value: "/textures/billboard.png",
          label: "📁 Texture Path",
        },
        adBillboardTextureQuality: {
          value: 16,
          min: 1,
          max: 16,
          step: 1,
          label: "✨ Texture Quality",
        },
      },
      { collapsed: true }
    ),
  });
};
