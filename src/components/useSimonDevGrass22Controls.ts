import { useControls, folder } from "leva";

export const useSimonDevGrass22Controls = () => {
  return useControls("🌿 FOLIAGE", {
    simonDevGrass22: folder(
      {
        // Master toggle
        simonDevGrass22Enabled: {
          value: false,
          label: "🌾 Enable Grass System v22",
        },

        // Geometry/scale
        grassHeight: {
          value: 1.0,
          min: 0.5,
          max: 5.0,
          step: 0.1,
          label: "📏 Grass Height",
        },
        grassScale: {
          value: 1.0,
          min: 0.5,
          max: 5.0,
          step: 0.1,
          label: "📐 Grass Scale",
        },

        // Wind
        wind: folder(
          {
            enableWindMovement: { value: false, label: "🍃 Enable Wind" },
            windStrength: {
              value: 1.0,
              min: 0.0,
              max: 3.0,
              step: 0.05,
              label: "💨 Strength",
            },
            windSpeed: {
              value: 1.0,
              min: 0.0,
              max: 3.0,
              step: 0.05,
              label: "⏩ Speed",
            },
            windNoiseScale: {
              value: 1.0,
              min: 0.1,
              max: 5.0,
              step: 0.05,
              label: "📈 Noise Scale",
            },
            windNoiseSpeed: {
              value: 1.0,
              min: 0.1,
              max: 5.0,
              step: 0.05,
              label: "📈 Noise Speed",
            },
            windNoiseAmplitude: {
              value: 1.0,
              min: 0.0,
              max: 3.0,
              step: 0.05,
              label: "📈 Noise Amplitude",
            },
          },
          { collapsed: true }
        ),

        // Colors/gradient
        colors: folder(
          {
            enableBaseToTipGradient: {
              value: true,
              label: "🎚️ Base→Tip Gradient",
            },
            baseColor: { value: "#0d3303", label: "🎨 Base Color" },
            tipColor: { value: "#80801a", label: "🎨 Tip Color" },
            gradientShaping: {
              value: 4.0,
              min: 1.0,
              max: 10.0,
              step: 0.1,
              label: "🧮 Gradient Power",
            },
          },
          { collapsed: true }
        ),

        // Normal/lighting helpers
        normalsAO: folder(
          {
            enableNormalMap: { value: false, label: "🟦 Enable Normal Map" },
            enableAmbientOcclusion: {
              value: true,
              label: "🕳️ Ambient Occlusion",
            },
            grassDensity: {
              value: 1.0,
              min: 0.0,
              max: 1.0,
              step: 0.05,
              label: "🌱 Density",
            },
            aoStrength: {
              value: 0.1,
              min: 0.0,
              max: 1.0,
              step: 0.01,
              label: "🌓 AO Strength",
            },
            aoHeightPower: {
              value: 1.0,
              min: 0.1,
              max: 4.0,
              step: 0.1,
              label: "📐 AO Height Power",
            },
            aoDebugMode: { value: false, label: "🐞 AO Debug" },
          },
          { collapsed: true }
        ),

        // Player interaction
        player: folder(
          {
            enablePlayerInteraction: { value: true, label: "🧍 Interaction" },
            playerInteractionRadius: {
              value: 3.0,
              min: 0.5,
              max: 8.0,
              step: 0.1,
              label: "📏 Radius",
            },
            playerInteractionStrength: {
              value: 0.5,
              min: 0.0,
              max: 2.0,
              step: 0.05,
              label: "💪 Strength",
            },
            playerInteractionRepel: {
              value: true,
              label: "↔️ Repel (off=Attract)",
            },
          },
          { collapsed: true }
        ),

        // Moonlight
        moon: folder(
          {
            enableMoonReflection: {
              value: false,
              label: "🌙 Enable Moon Specular",
            },
            moonIntensity: {
              value: 2.0,
              min: 0.0,
              max: 5.0,
              step: 0.1,
              label: "🌙 Intensity",
            },
            moonColor: { value: "#ff0000", label: "🌙 Color" },
            moonDirectionX: {
              value: -1.0,
              min: -1.0,
              max: 1.0,
              step: 0.1,
              label: "➡️ Dir X",
            },
            moonDirectionY: {
              value: 1.0,
              min: -1.0,
              max: 1.0,
              step: 0.1,
              label: "⬆️ Dir Y",
            },
            moonDirectionZ: {
              value: 0.5,
              min: -1.0,
              max: 1.0,
              step: 0.1,
              label: "↗️ Dir Z",
            },
          },
          { collapsed: true }
        ),

        // Contact shadows
        contactShadows: folder(
          {
            contactShadowIntensity: {
              value: 0.8,
              min: 0.0,
              max: 2.0,
              step: 0.05,
              label: "🕳️ Intensity",
            },
            contactShadowRadius: {
              value: 2.0,
              min: 0.1,
              max: 10.0,
              step: 0.1,
              label: "🟢 Radius",
            },
            contactShadowBias: {
              value: 0.1,
              min: 0.0,
              max: 0.5,
              step: 0.01,
              label: "⚖️ Bias",
            },
          },
          { collapsed: true }
        ),

        // Subsurface scattering
        sss: folder(
          {
            enableSSS: { value: false, label: "💡 Enable SSS" },
            sssIntensity: {
              value: 0.8,
              min: 0.0,
              max: 2.0,
              step: 0.05,
              label: "💡 Intensity",
            },
            sssPower: {
              value: 1.5,
              min: 0.5,
              max: 4.0,
              step: 0.1,
              label: "🔋 Power",
            },
            sssScale: {
              value: 2.0,
              min: 0.5,
              max: 4.0,
              step: 0.1,
              label: "📐 Scale",
            },
            sssColor: { value: "#8fbc8f", label: "🎨 Color" },
          },
          { collapsed: true }
        ),

        // Environment map / IBL
        envMap: folder(
          {
            enableEnvMap: { value: false, label: "🪞 Enable Env Map" },
            envMapIntensity: {
              value: 1.0,
              min: 0.0,
              max: 3.0,
              step: 0.05,
              label: "✨ Intensity",
            },
            roughnessBase: {
              value: 0.9,
              min: 0.0,
              max: 1.0,
              step: 0.01,
              label: "🧱 Roughness Base",
            },
            roughnessTip: {
              value: 0.1,
              min: 0.0,
              max: 1.0,
              step: 0.01,
              label: "🧱 Roughness Tip",
            },
            fresnelPower: {
              value: 3.0,
              min: 0.5,
              max: 6.0,
              step: 0.1,
              label: "📈 Fresnel Power",
            },
            roughnessIntensity: {
              value: 1.0,
              min: 0.0,
              max: 2.0,
              step: 0.05,
              label: "📈 Roughness Intensity",
            },
          },
          { collapsed: true }
        ),

        // View Thickening controls
        viewThickening: folder(
          {
            enableViewThickenDebug: {
              value: false,
              label: "🔍 Debug View Thickening",
            },
            viewThickenPower: {
              value: 4.0,
              min: 1.0,
              max: 8.0,
              step: 0.1,
              label: "📊 Thicken Curve Power",
            },
            viewThickenStrength: {
              value: 0.8,
              min: 0.0,
              max: 2.0,
              step: 0.05,
              label: "💪 Thicken Strength",
            },
          },
          { collapsed: true }
        ),
      },
      { collapsed: true }
    ),
  });
};
