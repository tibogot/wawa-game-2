import { useControls, folder } from "leva";

export const useDynamicLeaves3Controls = () => {
  return useControls("🌿 FOLIAGE", {
    dynamicLeaves3: folder(
      {
        dynamicLeaves3Enabled: {
          value: false,
          label: "🍂 Enable Dynamic Leaves v3",
        },
        dynamicLeaves3Count: {
          value: 200,
          label: "Leaves Count",
          min: 50,
          max: 500,
          step: 50,
        },
        dynamicLeaves3AreaSize: {
          value: 15,
          label: "Area Size",
          min: 10,
          max: 50,
          step: 5,
        },
        dynamicLeaves3InteractionRange: {
          value: 8,
          label: "Interaction Range",
          min: 2,
          max: 20,
          step: 1,
        },
        dynamicLeaves3PushStrength: {
          value: 0.8,
          label: "Push Strength",
          min: 0.1,
          max: 2.0,
          step: 0.1,
        },
        dynamicLeaves3SwirlStrength: {
          value: 0.5,
          label: "Swirl Strength",
          min: 0.1,
          max: 2.0,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};
