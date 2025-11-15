import { useControls, folder } from "leva";

export const useFlagClaudeControls = () => {
  return useControls("🏛️ OBJECTS", {
    flagClaude: folder(
      {
        flagClaudeEnabled: { value: false, label: "🏳️ Enable Flag Claude" },
        flagClaudePosition: {
          value: [0, 0],
          label: "📍 Position [X, Z]",
          step: 1,
        },
        flagClaudeYOffset: {
          value: 0.0,
          min: -5.0,
          max: 5.0,
          step: 0.1,
          label: "⬆️ Y Height Offset",
        },
        flagClaudeScale: {
          value: 4.0,
          min: 0.1,
          max: 5.0,
          step: 0.1,
          label: "📏 Scale",
        },
        flagClaudeTextureUrl: {
          value:
            "https://assets.codepen.io/6958575/internal/avatars/users/default.png",
          label: "🖼️ Texture URL",
        },
      },
      { collapsed: true }
    ),
  });
};
