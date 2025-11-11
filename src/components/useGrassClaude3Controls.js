import { useControls, folder } from "leva";

export function useGrassClaude3Controls() {
  return useControls("🌿 FOLIAGE", {
    grassClaude3: folder(
      {
        // Master toggle
        grassClaude3Enabled: {
          value: false,
          label: "🌿 Enable Grass Claude 3",
        },

        // Fog Controls
        fog: folder(
          {
            fogEnabled: {
              value: true,
              label: "Enable Fog",
            },
            fogNear: {
              value: 5.0,
              min: 0,
              max: 100,
              step: 0.5,
              label: "Fog Start",
            },
            fogFar: {
              value: 50.0,
              min: 0,
              max: 200,
              step: 1,
              label: "Fog End",
            },
            fogColor: {
              value: "#4f74af",
              label: "Fog Color",
            },
            fogIntensity: {
              value: 1.0,
              min: 0,
              max: 2,
              step: 0.1,
              label: "Fog Intensity",
            },
          },
          { collapsed: true }
        ),

        // Backscatter/SSS Controls
        backscatter: folder(
          {
            backscatterEnabled: {
              value: true,
              label: "Enable Backscatter",
            },
            backscatterIntensity: {
              value: 0.5,
              min: 0,
              max: 2,
              step: 0.1,
              label: "Backscatter Intensity",
            },
            backscatterColor: {
              value: "#516647",
              label: "Backscatter Color",
            },
            backscatterPower: {
              value: 2.0,
              min: 0.5,
              max: 5,
              step: 0.1,
              label: "Backscatter Power",
            },
            frontScatterStrength: {
              value: 0.3,
              min: 0,
              max: 1,
              step: 0.1,
              label: "Front Scatter",
            },
            rimSSSStrength: {
              value: 0.5,
              min: 0,
              max: 1,
              step: 0.1,
              label: "Rim SSS Strength",
            },
          },
          { collapsed: true }
        ),

        // Normal Mixing Controls
        normalMixing: folder(
          {
            normalMixEnabled: {
              value: true,
              label: "Enable Normal Mixing",
            },
            normalMixFactor: {
              value: 0.5,
              min: 0,
              max: 1,
              step: 0.01,
              label: "Normal Mix Factor",
            },
          },
          { collapsed: true }
        ),

        // Specular Controls
        specular: folder(
          {
            specularEnabled: {
              value: true,
              label: "Enable Specular",
            },
            specularIntensity: {
              value: 0.3,
              min: 0,
              max: 2,
              step: 0.1,
              label: "Specular Intensity",
            },
            specularColor: {
              value: "#fffff2",
              label: "Specular Color",
            },
            specularPower: {
              value: 32.0,
              min: 1,
              max: 128,
              step: 1,
              label: "Specular Power",
            },
          },
          { collapsed: true }
        ),

        // Advanced Parameters
        advanced: folder(
          {
            aoEnabled: {
              value: true,
              label: "Enable AO",
            },
            aoIntensity: {
              value: 1.0,
              min: 0,
              max: 2,
              step: 0.1,
              label: "AO Intensity",
            },
            densityThreshold: {
              value: -11.0,
              min: -20,
              max: 0,
              step: 0.5,
              label: "Density Threshold",
            },
            densityRange: {
              value: 3.0,
              min: 0.5,
              max: 10,
              step: 0.5,
              label: "Density Range",
            },
            grassMiddleStrength: {
              value: 0.85,
              min: 0.5,
              max: 1.0,
              step: 0.01,
              label: "Grass Middle Strength",
            },
          },
          { collapsed: true }
        ),
      },
      { collapsed: true }
    ),
  });
}
