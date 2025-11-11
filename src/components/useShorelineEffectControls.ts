import { useControls } from "leva";

export const useShorelineEffectControls = () => {
  return useControls("🌊 Shoreline Effect", {
    enabled: {
      value: false,
      label: "Enable Shoreline Effect",
    },
    shorelineIntensity: {
      value: 2.5,
      min: 0.0,
      max: 5.0,
      step: 0.1,
      label: "Shoreline Intensity",
    },
    shorelineWidth: {
      value: 15.0,
      min: 2.0,
      max: 50.0,
      step: 1.0,
      label: "Shoreline Width",
    },
    shorelineColor1: {
      value: "#ffffff",
      label: "Shoreline Color (Bright)",
    },
    shorelineColor2: {
      value: "#87ceeb",
      label: "Shoreline Color (Fade)",
    },
    waveSpeed: {
      value: 3.0,
      min: 0.0,
      max: 10.0,
      step: 0.1,
      label: "Wave Speed",
    },
    waveAmplitude: {
      value: 1.5,
      min: 0.0,
      max: 3.0,
      step: 0.1,
      label: "Wave Amplitude",
    },
    noiseScale: {
      value: 0.02,
      min: 0.005,
      max: 0.1,
      step: 0.005,
      label: "Noise Scale",
    },
    gradientSharpness: {
      value: 2.0,
      min: 0.5,
      max: 5.0,
      step: 0.1,
      label: "Gradient Sharpness",
    },
    waterLevel: {
      value: 10.0,
      min: 0.0,
      max: 50.0,
      step: 0.5,
      label: "Water Level",
    },
    debugMode: {
      value: false,
      label: "Debug Mode (Show All Areas)",
    },
  });
};

