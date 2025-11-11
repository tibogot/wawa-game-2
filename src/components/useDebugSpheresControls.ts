import { useControls } from "leva";

export const useDebugSpheresControls = () => {
  return useControls("🔍 DEBUG", {
    showDebugSpheres: {
      value: false,
      label: "🔴 Show Terrain Debug Spheres",
    },
  });
};
