import { useControls } from "leva";

export const useFlowingLinesControls = () => {
  return useControls("🌊 FLOWING LINES", {
    enabled: { value: false, label: "🌊 Enable Flowing Lines" },
    lineCount: {
      value: 10,
      min: 1,
      max: 30,
      step: 1,
      label: "Line Count",
    },
    lineLength: {
      value: 10.0,
      min: 1.0,
      max: 50.0,
      step: 1.0,
      label: "Line Length",
    },
    lineWidth: {
      value: 5.0,
      min: 1.0,
      max: 20.0,
      step: 1.0,
      label: "Line Width",
    },
    heightOffset: {
      value: 5.0,
      min: 0.1,
      max: 20.0,
      step: 0.5,
      label: "Height Above Terrain",
    },
    verticalWave: {
      value: 0.04,
      min: 0.0,
      max: 0.2,
      step: 0.01,
      label: "Vertical Wave Amount",
    },
    animationSpeed: {
      value: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: "Animation Speed",
    },
    pathRadius: {
      value: 20.0,
      min: 1.0,
      max: 100.0,
      step: 1.0,
      label: "Path Radius",
    },
    pathFrequency: {
      value: 5.0,
      min: 1.0,
      max: 10.0,
      step: 0.5,
      label: "Path Frequency",
    },
    lineColor: {
      value: "#ffffff",
      label: "Line Color",
    },
    lineOpacity: {
      value: 1.0,
      min: 0.1,
      max: 1.0,
      step: 0.1,
      label: "Line Opacity",
    },
    segments: {
      value: 20,
      min: 10,
      max: 40,
      step: 5,
      label: "Segments (Quality)",
    },
    boundaryRadius: {
      value: 1000,
      min: 10,
      max: 10000,
      step: 100,
      label: "Boundary Radius",
    },
  });
};
