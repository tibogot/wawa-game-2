import { useControls, folder } from "leva";

export function useGrassClaude6Controls() {
  return useControls("🌿 FOLIAGE", {
    grassClaude6: folder(
      {
        // Master toggle
        grassClaude6Enabled: {
          value: false,
          label: "🌿 Enable Grass Claude 6",
        },
        grassHeight: {
          value: 1,
          min: 0.5,
          max: 5.0,
          step: 0.1,
          label: "📏 Grass Height",
        },
        gridSize: {
          value: 9,
          min: 1,
          max: 25,
          step: 1,
          label: "📐 Grid Size",
        },
        patchSpacing: {
          value: 10,
          min: 1,
          max: 50,
          step: 0.5,
          label: "📏 Patch Spacing",
        },
        segments: {
          value: 6,
          min: 1,
          max: 6,
          step: 1,
          label: "🔲 Segments (Detail)",
        },
        numGrass: {
          value: 3072,
          min: 512,
          max: 10000,
          step: 256,
          label: "🌱 Grass Density",
        },
        patchSize: {
          value: 10,
          min: 1,
          max: 50,
          step: 0.5,
          label: "📦 Patch Size",
        },
        grassWidth: {
          value: 0.1,
          min: 0.05,
          max: 0.5,
          step: 0.01,
          label: "📐 Grass Width",
        },
        lodDistance: {
          value: 15,
          min: 5,
          max: 100,
          step: 1,
          label: "👁️ LOD Distance",
        },
        maxDistance: {
          value: 100,
          min: 10,
          max: 500,
          step: 5,
          label: "🚀 Max Distance",
        },

        // Grass Colors
        colors: folder(
          {
            baseColor1: {
              value: "#051303",
              label: "Base Color 1 (Dark)",
            },
            baseColor2: {
              value: "#061a03",
              label: "Base Color 2 (Light)",
            },
            tipColor1: {
              value: "#a6cc40",
              label: "Tip Color 1 (Dark)",
            },
            tipColor2: {
              value: "#cce666",
              label: "Tip Color 2 (Light)",
            },
            gradientBlend: {
              value: 1.0,
              min: 0.0,
              max: 1.0,
              step: 0.01,
              label: "🎨 Gradient Blend (0=Base, 1=Full)",
            },
            gradientCurve: {
              value: 4.0,
              min: 0.5,
              max: 10.0,
              step: 0.1,
              label: "📈 Gradient Curve (Steepness)",
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
              value: "#51cc66",
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
              value: false,
              label: "Enable Normal Mixing (false = per-side variation like GrassClaude2)",
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
            specularScale: {
              value: 1.0,
              min: 0.1,
              max: 5.0,
              step: 0.1,
              label: "Specular Scale (Radius)",
            },
            lightDirectionX: {
              value: 1.0,
              min: -5.0,
              max: 5.0,
              step: 0.1,
              label: "Light Direction X",
            },
            lightDirectionY: {
              value: 1.0,
              min: -5.0,
              max: 5.0,
              step: 0.1,
              label: "Light Direction Y",
            },
            lightDirectionZ: {
              value: 0.5,
              min: -5.0,
              max: 5.0,
              step: 0.1,
              label: "Light Direction Z",
            },
          },
          { collapsed: true }
        ),

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
            debugLOD: {
              value: false,
              label: "🐛 Debug LOD (Green=High, Red=Low)",
            },
            debugNormals: {
              value: false,
              label: "🎨 Debug Normals (RGB=Normal Direction)",
            },
          },
          { collapsed: true }
        ),

        // Fog Controls
        fog: folder(
          {
            fogEnabled: {
              value: false,
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
      },
      { collapsed: true }
    ),
  });
}
