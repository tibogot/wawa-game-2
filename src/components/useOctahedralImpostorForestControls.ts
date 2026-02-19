import { useControls, folder } from "leva";

export const useOctahedralImpostorForestControls = () => {
  return useControls("🌲 FOREST", {
    octahedralImpostorForest: folder(
      {
        enabled: { value: false, label: "Enabled" },

        treeCount: {
          value: 400,
          min: 1,
          max: 800,
          step: 1,
          label: "Tree Count",
        },
        radius: {
          value: 50,
          min: 5,
          max: 200,
          step: 1,
          label: "Radius",
        },
        minRadius: {
          value: 10,
          min: 0,
          max: 100,
          step: 1,
          label: "Min Radius",
        },

        lodMid: {
          value: 20,
          min: 1,
          max: 150,
          step: 1,
          label: "LOD1 Distance (mid)",
        },
        lodFar: {
          value: 100,
          min: 10,
          max: 500,
          step: 1,
          label: "Impostor Distance (far)",
        },

        leavesAlphaTest: {
          value: 0.4,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Leaves Alpha Test",
        },
        leavesOpacity: {
          value: 1,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Leaves Opacity",
        },

        impostorAlphaClamp: {
          value: 0.4,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Impostor Alpha Clamp",
        },
        impostorSpritesPerSide: {
          value: 12,
          min: 4,
          max: 24,
          step: 1,
          label: "Impostor Sprites/Side",
        },
        impostorTextureSize: {
          value: 1024,
          options: { "512": 512, "1024": 1024, "2048": 2048 },
          label: "Impostor Texture Size",
        },
      },
      { collapsed: true }
    ),
  });
};
