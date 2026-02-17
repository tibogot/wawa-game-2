import { useControls, folder } from "leva";

export default function useMap23Controls() {
  const controls = useControls("MAP 23 TERRAIN", {
    terrain: folder(
      {
        terrainSize: {
          value: 200,
          min: 50,
          max: 500,
          step: 10,
          label: "Terrain Size",
        },
        segments: {
          value: 128,
          min: 32,
          max: 256,
          step: 16,
          label: "Segments",
        },
        heightAmplitude: {
          value: 15,
          min: 1,
          max: 60,
          step: 1,
          label: "Height Amplitude",
        },
        noiseFrequency: {
          value: 0.008,
          min: 0.001,
          max: 0.05,
          step: 0.001,
          label: "Noise Frequency",
        },
        octaves: {
          value: 4,
          min: 1,
          max: 8,
          step: 1,
          label: "Octaves",
        },
        seed: {
          value: 42,
          min: 0,
          max: 99999,
          step: 1,
          label: "Seed",
        },
      },
      { collapsed: false }
    ),
  });

  const raw = controls.terrain ?? controls;
  return raw;
}
