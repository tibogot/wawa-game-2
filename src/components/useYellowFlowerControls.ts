import { useControls, folder } from "leva";

export const useYellowFlowerControls = () => {
  return useControls("🌿 FOLIAGE", {
    yellowFlower: folder(
      {
        yellowFlowerEnabled: {
          value: false,
          label: "🌼 Enable Yellow Flower",
        },
        yellowFlowerCount: {
          value: 100,
          label: "Flower Count",
          min: 1,
          max: 5000,
          step: 10,
        },
        yellowFlowerPositionX: {
          value: 0,
          label: "Center X",
          min: -200,
          max: 200,
          step: 5,
        },
        yellowFlowerPositionY: {
          value: 0,
          label: "Center Y",
          min: -50,
          max: 50,
          step: 1,
        },
        yellowFlowerPositionZ: {
          value: 0,
          label: "Center Z",
          min: -200,
          max: 200,
          step: 5,
        },
        yellowFlowerRadius: {
          value: 50,
          label: "Field Radius",
          min: 10,
          max: 500,
          step: 5,
        },
        yellowFlowerMinRadius: {
          value: 0,
          label: "Min Radius (Inner Ring)",
          min: 0,
          max: 200,
          step: 5,
        },
        yellowFlowerScaleRangeMin: {
          value: 0.8,
          label: "Min Scale",
          min: 0.5,
          max: 1.5,
          step: 0.1,
        },
        yellowFlowerScaleRangeMax: {
          value: 1.2,
          label: "Max Scale",
          min: 0.5,
          max: 2.0,
          step: 0.1,
        },
        yellowFlowerScale: {
          value: 1.0,
          label: "📏 Global Scale",
          min: 0.1,
          max: 10.0,
          step: 0.1,
        },
        yellowFlowerCastShadow: {
          value: true,
          label: "☀️ Cast Shadows",
        },
        yellowFlowerReceiveShadow: {
          value: true,
          label: "☀️ Receive Shadows",
        },
        yellowFlowerEnableTransparentSorting: {
          value: true,
          label: "🌼 Enable Transparent Sorting",
        },
        yellowFlowerEnableBVH: {
          value: true,
          label: "🔍 Enable BVH Culling",
        },
        yellowFlowerBvhMargin: {
          value: 0.1,
          label: "BVH Margin",
          min: 0,
          max: 1,
          step: 0.1,
        },
        yellowFlowerEnableViewThickening: {
          value: true,
          label: "🌼 Enable View Thickening",
        },
        yellowFlowerViewThickenPower: {
          value: 2.0,
          label: "📊 Thicken Curve Power",
          min: 1.0,
          max: 5.0,
          step: 0.5,
        },
        yellowFlowerViewThickenStrength: {
          value: 0.3,
          label: "💪 Thicken Strength",
          min: 0.0,
          max: 1.5,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};

