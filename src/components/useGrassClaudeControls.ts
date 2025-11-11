import { useControls, folder } from "leva";

export const useGrassClaudeControls = () => {
  return useControls("🌿 FOLIAGE", {
    grassClaude: folder(
      {
        // Master toggle
        grassClaudeEnabled: {
          value: false,
          label: "🌾 Enable GrassPatch",
        },
      },
      { collapsed: true }
    ),
  });
};

