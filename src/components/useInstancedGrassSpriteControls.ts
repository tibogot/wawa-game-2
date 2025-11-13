import { useControls, folder } from "leva";

export const useInstancedGrassSpriteControls = () => {
  return useControls("🌿 FOLIAGE", {
    instancedGrassSprite: folder(
      {
        instancedGrassSpriteEnabled: {
          value: false,
          label: "🌱 Enable Instanced Grass Sprite",
        },
        instancedGrassSpriteCount: {
          value: 100,
          label: "Grass Count",
          min: 1,
          max: 5000,
          step: 10,
        },
        instancedGrassSpritePositionX: {
          value: 0,
          label: "Center X",
          min: -200,
          max: 200,
          step: 5,
        },
        instancedGrassSpritePositionY: {
          value: 0,
          label: "Center Y",
          min: -50,
          max: 50,
          step: 1,
        },
        instancedGrassSpritePositionZ: {
          value: 0,
          label: "Center Z",
          min: -200,
          max: 200,
          step: 5,
        },
        instancedGrassSpriteRadius: {
          value: 50,
          label: "Field Radius",
          min: 10,
          max: 500,
          step: 5,
        },
        instancedGrassSpriteMinRadius: {
          value: 0,
          label: "Min Radius (Inner Ring)",
          min: 0,
          max: 200,
          step: 5,
        },
        instancedGrassSpriteScaleRangeMin: {
          value: 0.8,
          label: "Min Scale",
          min: 0.5,
          max: 1.5,
          step: 0.1,
        },
        instancedGrassSpriteScaleRangeMax: {
          value: 1.2,
          label: "Max Scale",
          min: 0.5,
          max: 2.0,
          step: 0.1,
        },
        instancedGrassSpriteScale: {
          value: 5.0,
          label: "📏 Global Scale",
          min: 0.1,
          max: 10.0,
          step: 0.1,
        },
        instancedGrassSpriteCastShadow: {
          value: true,
          label: "☀️ Cast Shadows",
        },
        instancedGrassSpriteReceiveShadow: {
          value: true,
          label: "☀️ Receive Shadows",
        },
        instancedGrassSpriteEnableTransparentSorting: {
          value: true,
          label: "🌱 Enable Transparent Sorting",
        },
        instancedGrassSpriteEnableBVH: {
          value: true,
          label: "🔍 Enable BVH Culling",
        },
        instancedGrassSpriteBvhMargin: {
          value: 0.1,
          label: "BVH Margin",
          min: 0,
          max: 1,
          step: 0.1,
        },
        instancedGrassSpriteEnableViewThickening: {
          value: true,
          label: "🌱 Enable View Thickening",
        },
        instancedGrassSpriteViewThickenPower: {
          value: 2.0,
          label: "📊 Thicken Curve Power",
          min: 1.0,
          max: 5.0,
          step: 0.5,
        },
        instancedGrassSpriteViewThickenStrength: {
          value: 0.3,
          label: "💪 Thicken Strength",
          min: 0.0,
          max: 1.5,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};
