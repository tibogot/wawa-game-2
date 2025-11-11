import { useControls } from "leva";

/**
 * GrassControls - Leva controls configuration for SimonDevGrass15
 *
 * Extracted from SimonDevGrass14Simple to separate concerns
 * Contains all UI controls for grass rendering, effects, and animations
 */
export const useGrassControls = () => {
  return useControls("FOLIAGE/simonDevGrass/v15", {
    enableThickening: {
      value: true,
      label: "Enable View-Space Thickening",
    },
    thicknessMultiplier: {
      value: 2.5,
      min: 1.0,
      max: 5.0,
      step: 0.1,
      label: "Thickness Multiplier",
    },
    enableDebugShader: {
      value: false,
      label: "Enable Debug Gradient Shader",
    },
    enableDebugVertex: {
      value: false,
      label: "Enable Debug Wave Motion",
    },
    useFloat16: {
      value: true,
      label: "Use Float16 (Half Precision)",
    },
    enableNormalMap: {
      value: true,
      label: "Enable Blue Gradient Normal Map",
    },
    enableBaseToTipGradient: {
      value: true,
      label: "Enable Base-to-Tip Gradient",
    },
    baseColor: {
      value: "#0d3303",
      label: "Base Color (Dark Green)",
    },
    tipColor: {
      value: "#80801a",
      label: "Tip Color (Yellowish)",
    },
    gradientShaping: {
      value: 4.0,
      min: 1.0,
      max: 10.0,
      step: 0.5,
      label: "Gradient Shaping",
    },
    enableNormalBlending: {
      value: false,
      label: "Enable Normal Blending",
    },
    terrainBlendStart: {
      value: 10.0,
      min: 5.0,
      max: 50.0,
      step: 1.0,
      label: "Terrain Blend Start Distance",
    },
    terrainBlendEnd: {
      value: 30.0,
      min: 10.0,
      max: 100.0,
      step: 1.0,
      label: "Terrain Blend End Distance",
    },
    enableAmbientOcclusion: {
      value: true,
      label: "Enable Ambient Occlusion",
    },
    grassDensity: {
      value: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: "Grass Density (0=no grass, 1=full grass)",
    },
    aoStrength: {
      value: 0.1,
      min: 0.0,
      max: 0.5,
      step: 0.05,
      label: "AO Strength (0=no effect, 0.5=max dark)",
    },
    aoHeightPower: {
      value: 1.0,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      label: "AO Height Power (1=linear, 3=strong curve)",
    },
    aoDebugMode: {
      value: false,
      label: "AO Debug Mode (Red = High AO, Green = Low AO)",
    },
    enableWindMovement: {
      value: false,
      label: "Enable Basic Wind Movement",
    },
    windStrength: {
      value: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "Wind Strength",
    },
    windSpeed: {
      value: 1.0,
      min: 0.1,
      max: 3.0,
      step: 0.1,
      label: "Wind Speed",
    },
    enableAdvancedWind: {
      value: false,
      label: "Enable Advanced Wind (Direction + Strength)",
    },
    windDirectionScale: {
      value: 0.05,
      min: 0.01,
      max: 0.1,
      step: 0.01,
      label: "Wind Direction Scale",
    },
    windStrengthScale: {
      value: 0.25,
      min: 0.1,
      max: 0.5,
      step: 0.05,
      label: "Wind Strength Scale",
    },
    windStrengthMultiplier: {
      value: 1.25,
      min: 0.5,
      max: 2.0,
      step: 0.1,
      label: "Wind Strength Multiplier",
    },
    // SimonDevGrass12 wind controls
    windFrequency: {
      value: 0.1,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: "Wind Frequency",
    },
    windAmplitude: {
      value: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "Wind Amplitude",
    },
    windTurbulence: {
      value: 1.0,
      min: 0.1,
      max: 2.0,
      step: 0.1,
      label: "Wind Turbulence",
    },
    flappingIntensity: {
      value: 1.0,
      min: 0.0,
      max: 3.0,
      step: 0.1,
      label: "Flapping Intensity",
    },
    windDirectionX: {
      value: 1.0,
      min: -2.0,
      max: 2.0,
      step: 0.1,
      label: "Wind Direction X",
    },
    windDirectionZ: {
      value: 0.5,
      min: -2.0,
      max: 2.0,
      step: 0.1,
      label: "Wind Direction Z",
    },
    // Wind Noise Controls
    windNoiseScale: {
      value: 1.0,
      min: 0.01,
      max: 10.0,
      step: 0.1,
      label: "Wind Noise Scale (spatial frequency)",
    },
    windNoiseSpeed: {
      value: 1.0,
      min: 0.01,
      max: 10.0,
      step: 0.1,
      label: "Wind Noise Speed (temporal frequency)",
    },
    windNoiseAmplitude: {
      value: 1.0,
      min: 0.01,
      max: 10.0,
      step: 0.1,
      label: "Wind Noise Amplitude (intensity)",
    },
    // Player Interaction Controls
    enablePlayerInteraction: {
      value: false,
      label: "Enable Player Interaction",
    },
    playerInteractionRadius: {
      value: 3.0,
      min: 1.0,
      max: 10.0,
      step: 0.1,
      label: "Player Interaction Radius",
    },
    playerInteractionStrength: {
      value: 0.5,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "Player Interaction Strength",
    },
    playerInteractionRepel: {
      value: true,
      label: "Player Interaction Repel (true = bend away, false = bend toward)",
    },
  });
};

export default useGrassControls;
