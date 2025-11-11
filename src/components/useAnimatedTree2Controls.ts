import { useControls, folder } from "leva";

export const useAnimatedTree2Controls = () => {
  return useControls("🌿 FOLIAGE", {
    animatedTree2: folder(
      {
        animatedTree2Enabled: {
          value: false,
          label: "🌳 Enable Animated Tree 2",
        },
        position: folder(
          {
            animatedTree2PositionX: {
              value: 0,
              min: -100,
              max: 100,
              step: 1,
              label: "📍 Pos X",
            },
            animatedTree2PositionY: {
              value: 0,
              min: -10,
              max: 10,
              step: 0.1,
              label: "📍 Pos Y",
            },
            animatedTree2PositionZ: {
              value: 0,
              min: -100,
              max: 100,
              step: 1,
              label: "📍 Pos Z",
            },
          },
          { collapsed: true }
        ),
        animatedTree2Scale: {
          value: 1,
          min: 0.1,
          max: 5,
          step: 0.1,
          label: "📏 Scale",
        },
        animatedTree2MouseInteraction: {
          value: true,
          label: "🖱️ Enable Mouse Interaction",
        },
        shadows: folder(
          {
            animatedTree2CastShadow: {
              value: true,
              label: "🌑 Cast Shadows",
            },
            animatedTree2ReceiveShadow: {
              value: true,
              label: "🌑 Receive Shadows",
            },
          },
          { collapsed: true }
        ),
        colors: folder(
          {
            animatedTree2ColorA: {
              value: "#b45252",
              label: "🎨 Color A (Base)",
            },
            animatedTree2ColorB: {
              value: "#d3a068",
              label: "🎨 Color B (Middle)",
            },
            animatedTree2ColorC: {
              value: "#ede19e",
              label: "🎨 Color C (Tip)",
            },
            animatedTree2GradientThreshold: {
              value: 0.7,
              min: 0.1,
              max: 0.9,
              step: 0.05,
              label: "🎨 Gradient Threshold",
            },
            animatedTree2GradientPower: {
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
            animatedTree2ModelPath: {
              value:
                "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/tree.glb",
              label: "🌲 Tree Model Path",
            },
            animatedTree2NoiseTexturePath: {
              value:
                "https://raw.githubusercontent.com/ceramicSoda/treeshader/main/assets/noise.png",
              label: "🌀 Noise Texture Path",
            },
            animatedTree2PoleTexturePath: {
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

