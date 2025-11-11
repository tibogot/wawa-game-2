import { useControls, folder } from "leva";

export const useLeafPileMountainControls = () => {
  return useControls("🌿 FOLIAGE", {
    leafPileMountain: folder(
      {
        leafPileMountainEnabled: {
          value: false,
          label: "🗻 Enable Leaf Pile Mountain",
        },
        leafPileMountainCount: {
          value: 1500,
          label: "Leaves Count",
          min: 500,
          max: 3000,
          step: 100,
        },
        leafPileMountainPileRadius: {
          value: 6,
          label: "Pile Radius",
          min: 3,
          max: 15,
          step: 0.5,
        },
        leafPileMountainPileHeight: {
          value: 2.5,
          label: "Pile Height",
          min: 1.0,
          max: 5.0,
          step: 0.1,
        },
        leafPileMountainPositionX: {
          value: 0,
          label: "Position X",
          min: -50,
          max: 50,
          step: 1,
        },
        leafPileMountainPositionZ: {
          value: 0,
          label: "Position Z",
          min: -50,
          max: 50,
          step: 1,
        },
        leafPileMountainInteractionRange: {
          value: 10,
          label: "Interaction Range",
          min: 5,
          max: 25,
          step: 1,
        },
        leafPileMountainPushStrength: {
          value: 1.2,
          label: "Push Strength",
          min: 0.1,
          max: 3.0,
          step: 0.1,
        },
        leafPileMountainSwirlStrength: {
          value: 0.8,
          label: "Swirl Strength",
          min: 0.1,
          max: 2.0,
          step: 0.1,
        },
        leafPileMountainExplosionStrength: {
          value: 1.5,
          label: "Explosion Strength",
          min: 0.5,
          max: 3.0,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
  });
};

