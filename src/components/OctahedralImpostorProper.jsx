import React, { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { OctahedralImpostor as CoreOctahedralImpostor } from "../octahedral-impostor/core/octahedralImpostor";

/**
 * Proper Octahedral Impostor Component
 * Thin React-three-fiber wrapper around the core OctahedralImpostor class
 * used by the forest LOD system. This gives you a SINGLE impostor mesh
 * using the exact same atlas + shader technique as the forest.
 */
export function OctahedralImpostorProper({
  glbPath,
  spritesPerSide = 12,
  textureSize = 1024,
  useHemiOctahedron = true,
  alphaClamp = 0.4,
  transparent = true,
  ...props
}) {
  const { gl } = useThree();
  const [impostor, setImpostor] = useState(null);

  // Load the GLB model
  const gltf = useGLTF(glbPath);

  // Create the impostor once the GLTF is loaded
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    // Clone the scene so the atlas generation can freely override materials
    const target = gltf.scene.clone(true);

    console.log("OctahedralImpostorProper: creating core impostor from model");

    const impostorInstance = new CoreOctahedralImpostor({
      renderer: gl,
      target,
      useHemiOctahedron,
      transparent,
      alphaClamp,
      spritesPerSide,
      textureSize,
      baseType: THREE.MeshLambertMaterial,
    });

    setImpostor(impostorInstance);

    return () => {
      if (impostorInstance.geometry) {
        impostorInstance.geometry.dispose();
      }
      if (impostorInstance.material && impostorInstance.material.dispose) {
        impostorInstance.material.dispose();
      }
    };
  }, [
    gl,
    gltf,
    useHemiOctahedron,
    transparent,
    alphaClamp,
    spritesPerSide,
    textureSize,
  ]);

  if (!impostor) {
    // While atlas is being generated, render nothing or a tiny placeholder
    return null;
  }

  // Allow caller to override position/rotation/scale via props
  return <primitive object={impostor} {...props} />;
}

OctahedralImpostorProper.preload = (glbPath) => useGLTF.preload(glbPath);

export default OctahedralImpostorProper;
