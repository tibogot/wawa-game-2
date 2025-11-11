import { useControls, folder } from "leva";

export const useInstancedAnimatedTreesControls = () => {
  return useControls("🌿 FOLIAGE", {
    instancedAnimatedTrees: folder(
      {
        instancedAnimatedTreesEnabled: {
          value: false,
          label: "🌲 Enable Instanced Animated Trees",
        },
      },
      { collapsed: true }
    ),
  });
};

