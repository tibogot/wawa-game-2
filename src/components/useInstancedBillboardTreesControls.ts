import { useControls, folder } from "leva";

export const useInstancedBillboardTreesControls = () => {
  return useControls("🌿 FOLIAGE", {
    instancedBillboardTrees: folder(
      {
        instancedBillboardTreesEnabled: {
          value: false,
          label: "🌲 Enable Instanced Billboard Trees",
        },
        instancedBillboardTreeCount: {
          value: 50,
          label: "Tree Count",
          min: 1,
          max: 1000,
          step: 5,
        },
        instancedBillboardPositionX: {
          value: 800,
          label: "Center X",
          min: -2000,
          max: 2000,
          step: 50,
        },
        instancedBillboardPositionY: {
          value: 0,
          label: "Center Y",
          min: -50,
          max: 50,
          step: 1,
        },
        billboardYOffset: {
          value: -6.81,
          label: "📐 Y Offset (Floor Adjustment)",
          min: -20,
          max: 20,
          step: 0.1,
        },
        instancedBillboardPositionZ: {
          value: 0,
          label: "Center Z",
          min: -2000,
          max: 2000,
          step: 50,
        },
        instancedBillboardRadius: {
          value: 500,
          label: "Forest Radius",
          min: 10,
          max: 2000,
          step: 5,
        },
        instancedBillboardMinRadius: {
          value: 20,
          label: "Min Radius (Inner Ring)",
          min: 0,
          max: 150,
          step: 5,
        },
        billboardScaleRangeMin: {
          value: 0.8,
          label: "Min Scale",
          min: 0.5,
          max: 1.5,
          step: 0.1,
        },
        billboardScaleRangeMax: {
          value: 1.2,
          label: "Max Scale",
          min: 0.5,
          max: 2.0,
          step: 0.1,
        },
        billboardCastShadow: {
          value: false,
          label: "☀️ Cast Shadows",
        },
        billboardReceiveShadow: {
          value: true,
          label: "☀️ Receive Shadows",
        },
        billboardEnableTransparentSorting: {
          value: true,
          label: "🍃 Enable Transparent Sorting",
        },
        billboardEnableBVH: {
          value: true,
          label: "🔍 Enable BVH Culling",
        },
        billboardBvhMargin: {
          value: 0.1,
          label: "BVH Margin",
          min: 0,
          max: 1,
          step: 0.1,
        },
        billboardEnableViewThickening: {
          value: true,
          label: "🍃 Enable View Thickening",
        },
        billboardViewThickenPower: {
          value: 2.0,
          label: "📊 Thicken Curve Power",
          min: 1.0,
          max: 5.0,
          step: 0.5,
        },
        billboardViewThickenStrength: {
          value: 0.3,
          label: "💪 Thicken Strength",
          min: 0.0,
          max: 1.5,
          step: 0.1,
        },
        billboardAoEnabled: {
          value: true,
          label: "🌑 Enable Ambient Occlusion",
        },
        billboardAoIntensity: {
          value: 1.0,
          label: "AO Intensity",
          min: 0.0,
          max: 2.0,
          step: 0.1,
        },
        billboardBackscatterEnabled: {
          value: false,
          label: "💡 Enable Subsurface Scattering",
        },
        billboardBackscatterIntensity: {
          value: 0.5,
          label: "SSS Intensity",
          min: 0.0,
          max: 2.0,
          step: 0.1,
        },
        billboardBackscatterColor: {
          value: "#ccffb3",
          label: "SSS Color",
        },
        billboardBackscatterPower: {
          value: 2.0,
          label: "SSS Power",
          min: 1.0,
          max: 5.0,
          step: 0.5,
        },
        billboardFrontScatterStrength: {
          value: 0.3,
          label: "Front Scatter Strength",
          min: 0.0,
          max: 1.0,
          step: 0.1,
        },
        billboardRimSSSStrength: {
          value: 0.5,
          label: "Rim SSS Strength",
          min: 0.0,
          max: 1.0,
          step: 0.1,
        },
        billboardLightDirectionX: {
          value: 1.0,
          label: "Light Dir X",
          min: -1.0,
          max: 1.0,
          step: 0.1,
        },
        billboardLightDirectionY: {
          value: 1.0,
          label: "Light Dir Y",
          min: -1.0,
          max: 1.0,
          step: 0.1,
        },
        billboardLightDirectionZ: {
          value: 0.5,
          label: "Light Dir Z",
          min: -1.0,
          max: 1.0,
          step: 0.1,
        },
      },
      { collapsed: true }
    ),
    billboardRotation: folder(
      {
        billboardEnableRotation: {
          value: true,
          label: "🔄 Enable Billboard Rotation",
        },
        billboardRotationDampingDistance: {
          value: 10.0,
          label: "🔄 Rotation Damping Start (units)",
          min: 0.0,
          max: 50.0,
          step: 1.0,
        },
        billboardRotationStopDistance: {
          value: 5.0,
          label: "🔄 Rotation Stop Distance (units)",
          min: 0.0,
          max: 20.0,
          step: 0.5,
        },
        billboardRotationThreshold: {
          value: 0.05,
          label: "🔄 Rotation Threshold (radians)",
          min: 0.0,
          max: 0.5,
          step: 0.01,
        },
        billboardRotationSmoothing: {
          value: 0.05,
          label: "🔄 Rotation Smoothing (Lower=faster, Higher=slower)",
          min: 0.0,
          max: 1.0,
          step: 0.01,
        },
      },
      { collapsed: true }
    ),
    transparency: folder(
      {
        billboardAlphaTest: {
          value: 0.1,
          label: "🎨 Alpha Test Threshold (Lower = firmer edges)",
          min: 0.0,
          max: 1.0,
          step: 0.01,
        },
        billboardPremultiplyAlpha: {
          value: true,
          label: "🎨 Premultiply Alpha (Fixes white edges)",
        },
        billboardEdgeBleedCompensation: {
          value: 1.0,
          label: "🎨 Edge Bleed Compensation",
          min: 0.5,
          max: 2.0,
          step: 0.1,
        },
        billboardDistanceAlphaTest: {
          value: true,
          label: "🎨 Distance-Based Alpha Test",
        },
        billboardDistanceAlphaStart: {
          value: 50.0,
          label: "Distance Alpha Start",
          min: 0.0,
          max: 200.0,
          step: 5.0,
        },
        billboardDistanceAlphaEnd: {
          value: 200.0,
          label: "Distance Alpha End",
          min: 50.0,
          max: 500.0,
          step: 5.0,
        },
      },
      { collapsed: true }
    ),
  });
};
