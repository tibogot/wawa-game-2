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
          value: 8.0,
          min: 0.1,
          max: 10.0,
          step: 0.1,
          label: "📏 Scale",
        },
        flagClaudeTextureUrl: {
          value:
            "https://assets.codepen.io/6958575/internal/avatars/users/default.png",
          label: "🖼️ Texture URL (or /textures/filename.png for local)",
        },
        alley: folder(
          {
            flagClaudeAlleyEnabled: {
              value: false,
              label: "🛤️ Enable Flag Alley",
            },
            flagClaudeAlleyStartZ: {
              value: -20,
              min: -100,
              max: 100,
              step: 1,
              label: "📍 Alley Start Z",
            },
            flagClaudeAlleySpacing: {
              value: 8,
              min: 2,
              max: 20,
              step: 0.5,
              label: "📏 Flag Spacing",
            },
            flagClaudeAlleyLeftOffset: {
              value: -10,
              min: -50,
              max: 0,
              step: 1,
              label: "⬅️ Left Side X Offset",
            },
            flagClaudeAlleyRightOffset: {
              value: 10,
              min: 0,
              max: 50,
              step: 1,
              label: "➡️ Right Side X Offset",
            },
            flagClaudeAlleyCount: {
              value: 5,
              min: 1,
              max: 10,
              step: 1,
              label: "🏳️ Flags Per Side",
            },
          },
          { collapsed: true }
        ),
        wind: folder(
          {
            flagClaudeWindEnabled: {
              value: true,
              label: "💨 Enable Wind",
            },
            flagClaudeWindIntensity: {
              value: 300,
              min: 0,
              max: 1000,
              step: 10,
              label: "💨 Wind Intensity",
            },
            flagClaudeWindDirectionX: {
              value: 100,
              min: -200,
              max: 200,
              step: 10,
              label: "🌬️ Wind Direction X",
            },
            flagClaudeWindDirectionY: {
              value: 0,
              min: -200,
              max: 200,
              step: 10,
              label: "🌬️ Wind Direction Y",
            },
            flagClaudeWindDirectionZ: {
              value: 1,
              min: -200,
              max: 200,
              step: 10,
              label: "🌬️ Wind Direction Z Base",
            },
            flagClaudeWindSpeed: {
              value: 1000,
              min: 100,
              max: 5000,
              step: 100,
              label: "⚡ Wind Speed (Frequency)",
            },
            flagClaudeWindOscillation: {
              value: 1,
              min: 0,
              max: 5,
              step: 0.1,
              label: "🌊 Wind Oscillation Amplitude",
            },
          },
          { collapsed: true }
        ),
      },
      { collapsed: true }
    ),
  });
};
