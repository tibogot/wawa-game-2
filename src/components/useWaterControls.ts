import { useControls, folder } from "leva";
import * as THREE from "three";

export const useWaterControls = () => {
  return useControls("🌊 Water", {
    water: folder(
      {
        waterEnabled: {
          value: false,
          label: "🌊 Enable Water",
        },
        waterBaseMaterial: {
          options: {
            MeshPhysicalMaterial: THREE.MeshPhysicalMaterial,
            MeshBasicMaterial: THREE.MeshBasicMaterial,
            MeshMatcapMaterial: THREE.MeshMatcapMaterial,
            MeshNormalMaterial: THREE.MeshNormalMaterial,
            MeshStandardMaterial: THREE.MeshStandardMaterial,
            MeshPhongMaterial: THREE.MeshPhongMaterial,
            MeshToonMaterial: THREE.MeshToonMaterial,
            MeshLambertMaterial: THREE.MeshLambertMaterial,
            MeshDepthMaterial: THREE.MeshDepthMaterial,
          },
          value: THREE.MeshPhysicalMaterial,
          label: "📦 Base Material",
        },
        waterColor: {
          value: "#52a7f7",
          label: "🎨 Water Color",
        },
        waterHighlightColor: {
          value: "#b3ffff",
          label: "✨ Highlight Color",
        },
        waterBrightness: {
          value: 0.5,
          min: 0,
          max: 1,
          step: 0.01,
          label: "💡 Brightness",
        },
        waterFlatshading: {
          value: false,
          label: "🔲 Flat Shading",
        },
        waterSize: {
          value: 5,
          min: 1,
          max: 100,
          step: 1,
          label: "📐 Size",
        },
        waterSegments: {
          value: 64,
          min: 16,
          max: 512,
          step: 8,
          label: "🔲 Segments",
        },
        // Shader uniform controls
        waterOffset: {
          value: 0.4,
          min: 0,
          max: 1,
          step: 0.01,
          label: "📊 Offset",
        },
        waterContrast: {
          value: 3.1,
          min: 0,
          max: 10,
          step: 0.1,
          label: "🎭 Contrast",
        },
        waterTimeSpeed: {
          value: 5,
          min: 0.1,
          max: 10,
          step: 0.1,
          label: "⏱️ Time Speed",
        },
        waterHeight: {
          value: 0.2,
          min: 0.1,
          max: 1.0,
          step: 0.01,
          label: "📏 Height/Thickness",
        },
        waterWaveAmplitude: {
          value: 1.0,
          min: 0,
          max: 3.0,
          step: 0.1,
          label: "🌊 Wave Amplitude",
        },
        waterWaveFrequency: {
          value: 1.0,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "📊 Wave Frequency/Sparsity",
        },
        waterPositionX: {
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: "📍 Position X",
        },
        waterPositionY: {
          value: 0,
          min: -10,
          max: 10,
          step: 0.1,
          label: "📍 Position Y",
        },
        waterPositionZ: {
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: "📍 Position Z",
        },
      },
      { collapsed: true }
    ),
  });
};
