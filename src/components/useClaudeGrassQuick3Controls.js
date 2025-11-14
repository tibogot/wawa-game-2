import { useControls, folder } from "leva";

export default function useClaudeGrassQuick3Controls() {
  const controls = useControls("🌿 FOLIAGE", {
    claudeGrassQuick3: folder(
      {
        // Master toggle
        enabled: {
          value: false,
          label: "🌿 Enable Claude Grass Quick 3",
        },

        // Basic grass parameters
        grassHeight: {
          value: 0.8,
          min: 0.1,
          max: 5,
          step: 0.1,
          label: "📏 Grass Height",
        },
        grassWidth: {
          value: 0.1,
          min: 0.01,
          max: 1,
          step: 0.01,
          label: "📐 Grass Width",
        },

        // Grid and spacing
        gridSize: {
          value: 16,
          min: 4,
          max: 32,
          step: 1,
          label: "📐 Grid Size (Render Distance)",
        },
        patchSpacing: {
          value: 10,
          min: 5,
          max: 30,
          step: 1,
          label: "📏 Patch Spacing",
        },
        patchSize: {
          value: 10,
          min: 5,
          max: 20,
          step: 1,
          label: "📦 Patch Size",
        },

        // LOD settings
        lodDistance: {
          value: 15,
          min: 5,
          max: 50,
          step: 1,
          label: "👁️ LOD Distance",
        },
        maxDistance: {
          value: 100,
          min: 50,
          max: 200,
          step: 10,
          label: "🚀 Max Distance",
        },

        // Terrain
        terrainSize: {
          value: 100,
          min: 50,
          max: 500,
          step: 10,
          label: "🗺️ Terrain Size",
        },
        heightScale: {
          value: 1,
          min: 0,
          max: 10,
          step: 0.1,
          label: "⬆️ Height Scale",
        },
        heightOffset: {
          value: 0,
          min: -10,
          max: 10,
          step: 0.1,
          label: "↕️ Height Offset",
        },

        // Wind Controls
        wind: folder(
          {
            windEnabled: {
              value: true,
              label: "Enable Wind",
            },
            windStrength: {
              value: 1.25,
              min: 0.0,
              max: 3.0,
              step: 0.05,
              label: "Wind Strength",
            },
            windDirectionScale: {
              value: 0.05,
              min: 0.01,
              max: 0.2,
              step: 0.01,
              label: "Wind Direction Scale",
            },
            windDirectionSpeed: {
              value: 0.05,
              min: 0.01,
              max: 0.5,
              step: 0.01,
              label: "Wind Direction Speed",
            },
            windStrengthScale: {
              value: 0.25,
              min: 0.1,
              max: 1.0,
              step: 0.05,
              label: "Wind Strength Scale",
            },
            windStrengthSpeed: {
              value: 1.0,
              min: 0.1,
              max: 5.0,
              step: 0.1,
              label: "Wind Strength Speed",
            },
          },
          { collapsed: true }
        ),

        // Player Interaction Controls
        playerInteraction: folder(
          {
            playerInteractionEnabled: {
              value: true,
              label: "Enable Player Interaction",
            },
            playerInteractionRepel: {
              value: true,
              label: "Repel (off = Attract)",
            },
            playerInteractionRange: {
              value: 2.5,
              min: 0.5,
              max: 10.0,
              step: 0.1,
              label: "Interaction Range",
            },
            playerInteractionStrength: {
              value: 0.2,
              min: 0.0,
              max: 1.0,
              step: 0.05,
              label: "Interaction Strength",
            },
          },
          { collapsed: true }
        ),
      },
      { collapsed: true }
    ),
  });

  return controls;
}
