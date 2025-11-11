import { useControls, folder } from "leva";

export const useMovingShadowPlanesControls = () => {
  return useControls("🔍 DEBUG", {
    movingShadowPlanes: folder(
      {
        enabled: {
          value: false,
          label: "✨ Enable Shadow Planes (Cloud Placeholders)",
        },
        planeCount: {
          value: 8,
          min: 1,
          max: 20,
          step: 1,
          label: "☁️ Plane Count (More = More Shadows)",
        },
        planeSize: {
          value: 20,
          min: 5,
          max: 50,
          step: 5,
          label: "📏 Plane Size (Diameter)",
        },
        planeHeight: {
          value: 30,
          min: 3,
          max: 50,
          step: 0.5,
          label: "📍 Height Above Ground (6-8m = Natural)",
        },
        moveSpeed: {
          value: 0.5,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "💨 Movement Speed (Like Wind)",
        },
        moveRange: {
          value: 50,
          min: 20,
          max: 100,
          step: 10,
          label: "🗺️ Movement Range (How Far They Travel)",
        },
        planeOpacity: {
          value: 0.0,
          min: 0.0,
          max: 1.0,
          step: 0.05,
          label: "👁️ Plane Opacity (0=Invisible, 1=Visible)",
        },
        planeColor: {
          value: "#808080",
          label: "🎨 Plane Color (If Visible)",
        },
        followPlayer: {
          value: true,
          label: "🏃 Follow Player (Shadows Always Nearby)",
        },
      },
      { collapsed: true }
    ),
  });
};
