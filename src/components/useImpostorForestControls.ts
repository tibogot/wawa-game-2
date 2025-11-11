import { useControls, folder } from "leva";

export const useImpostorForestControls = () => {
  return useControls("🌿 FOLIAGE", {
    impostorForest: folder(
      {
        impostorForestEnabled: {
          value: false,
          label: "🌲 Enable Impostor Forest",
        },
        treeCount: {
          value: 1000,
          label: "Tree Count",
          min: 10,
          max: 5000,
          step: 50,
        },
        radius: {
          value: 400,
          label: "Forest Radius",
          min: 50,
          max: 800,
          step: 50,
        },
        minRadius: {
          value: 0,
          label: "Min Radius (Inner Ring)",
          min: 0,
          max: 400,
          step: 10,
        },
        centerX: {
          value: 800,
          label: "Center X",
          min: -1000,
          max: 1000,
          step: 50,
        },
        centerY: {
          value: 0,
          label: "Center Y",
          min: -100,
          max: 200,
          step: 5,
        },
        centerZ: {
          value: 0,
          label: "Center Z",
          min: -1000,
          max: 1000,
          step: 50,
        },
        lodMid: {
          value: 20,
          label: "LOD Mid Distance (m)",
          min: 10,
          max: 100,
          step: 5,
        },
        lodFar: {
          value: 100,
          label: "LOD Far Distance (m)",
          min: 50,
          max: 300,
          step: 10,
        },
        leavesAlphaTest: {
          value: 0.4,
          label: "Leaves Alpha Test",
          min: 0,
          max: 1,
          step: 0.01,
        },
        leavesOpacity: {
          value: 1,
          label: "Leaves Opacity",
          min: 0.2,
          max: 1,
          step: 0.01,
        },
        impostorAlphaClamp: {
          value: 0.4,
          label: "Impostor Alpha Clamp",
          min: 0,
          max: 1,
          step: 0.01,
        },
      },
      { collapsed: true }
    ),
  });
};
