import { useControls, folder } from "leva";

export const useAnimatedTree3Controls = () => {
  return useControls("🌿 FOLIAGE", {
    animatedTree3: folder(
      {
        animatedTree3Enabled: {
          value: false,
          label: "🌳 Enable Animated Tree 3",
        },
        position: folder(
          {
            animatedTree3PositionX: {
              value: 0,
              min: -100,
              max: 100,
              step: 1,
              label: "📍 Pos X",
            },
            animatedTree3PositionY: {
              value: 0,
              min: -10,
              max: 10,
              step: 0.1,
              label: "📍 Pos Y",
            },
            animatedTree3PositionZ: {
              value: 0,
              min: -100,
              max: 100,
              step: 1,
              label: "📍 Pos Z",
            },
          },
          { collapsed: true }
        ),
        animatedTree3Scale: {
          value: 1,
          min: 0.1,
          max: 5,
          step: 0.1,
          label: "📏 Scale",
        },
        shadows: folder(
          {
            animatedTree3CastShadow: {
              value: true,
              label: "🌑 Cast Shadows",
            },
            animatedTree3ReceiveShadow: {
              value: true,
              label: "🌑 Receive Shadows",
            },
          },
          { collapsed: true }
        ),
        colors: folder(
          {
            animatedTree3ColorA: {
              value: "#b45252",
              label: "🎨 Color A (Base)",
            },
            animatedTree3ColorB: {
              value: "#d3a068",
              label: "🎨 Color B (Middle)",
            },
            animatedTree3ColorC: {
              value: "#ede19e",
              label: "🎨 Color C (Tip)",
            },
            animatedTree3GradientThreshold: {
              value: 0.7,
              min: 0.1,
              max: 0.9,
              step: 0.05,
              label: "🎨 Gradient Threshold",
            },
            animatedTree3GradientPower: {
              value: 1.0,
              min: 0.1,
              max: 3.0,
              step: 0.1,
              label: "🎨 Gradient Power",
            },
          },
          { collapsed: true }
        ),
        assets: folder(
          {
            animatedTree3ModelPath: {
              value:
                "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/tree.glb",
              label: "🌲 Tree Model Path",
            },
            animatedTree3NoiseTexturePath: {
              value:
                "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/noise.png",
              label: "🌀 Noise Texture Path",
            },
            animatedTree3PoleTexturePath: {
              value:
                "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/texture.jpg",
              label: "🌳 Pole Texture Path",
            },
          },
          { collapsed: true }
        ),
      },
      { collapsed: true }
    ),
  });
};
