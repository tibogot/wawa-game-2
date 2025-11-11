import React from "react";
import { useControls, folder } from "leva";
import { Clouds, Cloud } from "@react-three/drei";

export const CloudSystem: React.FC = () => {
  const {
    enabled,
    cloudPosition,
    cloudScale,
    cloudSegments,
    bounds,
    concentrate,
    cloudVolume,
    smallestVolume,
    cloudFade,
    cloudOpacity,
    cloudColor,
    speed,
    growth,
    cloudSeed,
    cloudsLimit,
    cloudsRange,
    frustumCulled,
  } = useControls("🌤️ AMBIENCE", {
    clouds: folder(
      {
        enabled: { value: false, label: "☁️ Enable Clouds" },
        cloudPosition: {
          value: [0, 40, 0],
          label: "Position",
          step: 50,
        },
        cloudScale: {
          value: [1, 1, 1],
          label: "Scale",
          step: 0.1,
        },
        bounds: {
          value: [10, 2, 2],
          label: "Bounds",
          step: 1,
        },
        cloudSegments: {
          value: 40,
          label: "Segments",
          min: 10,
          max: 100,
          step: 5,
        },
        concentrate: {
          value: "inside" as "random" | "inside" | "outside",
          label: "Concentrate",
          options: ["random", "inside", "outside"],
        },
        cloudVolume: {
          value: 8,
          label: "Volume",
          min: 1,
          max: 20,
          step: 1,
        },
        smallestVolume: {
          value: 0.25,
          label: "Smallest Volume",
          min: 0.1,
          max: 1,
          step: 0.05,
        },
        cloudFade: {
          value: 10,
          label: "Fade Distance",
          min: 0,
          max: 50,
          step: 1,
        },
        cloudOpacity: {
          value: 1,
          label: "Opacity",
          min: 0,
          max: 1,
          step: 0.1,
        },
        cloudColor: {
          value: "#ffffff",
          label: "Color",
        },
        speed: {
          value: 0,
          label: "Animation Speed",
          min: 0,
          max: 2,
          step: 0.1,
        },
        growth: {
          value: 4,
          label: "Growth Factor",
          min: 1,
          max: 10,
          step: 0.5,
        },
        cloudSeed: {
          value: 0,
          label: "Seed",
          min: 0,
          max: 1000,
          step: 1,
        },
        cloudsLimit: {
          value: 200,
          label: "Clouds Limit",
          min: 50,
          max: 500,
          step: 10,
        },
        cloudsRange: {
          value: 200,
          label: "Clouds Range (200 = all)",
          min: 0,
          max: 200,
          step: 10,
        },
        frustumCulled: {
          value: false,
          label: "Frustum Culled",
        },
      },
      { collapsed: true }
    ),
  });

  if (!enabled) return null;

  return (
    <Clouds
      limit={cloudsLimit}
      range={cloudsRange === 200 ? undefined : cloudsRange}
      frustumCulled={frustumCulled}
    >
      <Cloud
        position={cloudPosition}
        scale={cloudScale}
        bounds={bounds}
        segments={cloudSegments}
        concentrate={concentrate as "random" | "inside" | "outside"}
        volume={cloudVolume}
        smallestVolume={smallestVolume}
        fade={cloudFade}
        color={cloudColor}
        opacity={cloudOpacity}
        speed={speed}
        growth={growth}
        seed={cloudSeed}
      />
    </Clouds>
  );
};
