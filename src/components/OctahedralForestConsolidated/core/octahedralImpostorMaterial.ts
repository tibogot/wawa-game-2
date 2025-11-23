import { IUniform, Material, Matrix4, Vector3, GLSL3 } from "three";
import shaderChunkMapFragment from "../shaders/impostor/octahedral_impostor_shader_map_fragment.glsl?raw";
import shaderChunkNormalFragmentBegin from "../shaders/impostor/octahedral_impostor_shader_normal_fragment_begin.glsl?raw";
import shaderChunkParamsFragment from "../shaders/impostor/octahedral_impostor_shader_params_fragment.glsl?raw";
import shaderChunkParamsVertex from "../shaders/impostor/octahedral_impostor_shader_params_vertex.glsl?raw";
import shaderChunkVertex from "../shaders/impostor/octahedral_impostor_shader_vertex.glsl?raw";
import {
  createTextureAtlas,
  CreateTextureAtlasParams,
} from "../utils/createTextureAtlas";

// TODO: fix normal from top
// TODO: use not standard normalMap uniform
// TODO: use define to avoid paralax mapping if useless

export type OctahedralImpostorDefinesKeys =
  | "EZ_USE_HEMI_OCTAHEDRON"
  | "EZ_USE_NORMAL"
  | "EZ_USE_ORM"
  | "EZ_TRANSPARENT";
export type OctahedralImpostorDefines = {
  [key in OctahedralImpostorDefinesKeys]?: boolean;
};

export type UniformValue<T> = T extends IUniform<infer U> ? U : never;
export type MaterialConstructor<T extends Material> = new () => T;

export interface OctahedralImpostorUniforms {
  spritesPerSide: IUniform<number>;
  // ormMap: IUniform<Texture>;
  // parallaxScale: IUniform<number>;
  alphaClamp: IUniform<number>;
  transform: IUniform<Matrix4>;
}

export interface CreateOctahedralImpostor<T extends Material>
  extends OctahedralImpostorMaterial,
    CreateTextureAtlasParams {
  baseType: MaterialConstructor<T>;
}

export interface OctahedralImpostorMaterial {
  transparent?: boolean;
  // parallaxScale?: number;
  alphaClamp?: number;
  scale?: number;
  translation?: Vector3;
}

declare module "three" {
  interface Material extends OctahedralImpostorMaterial {
    isOctahedralImpostorMaterial: boolean;
    ezImpostorUniforms?: OctahedralImpostorUniforms;
    ezImpostorDefines?: OctahedralImpostorDefines;
  }
}

export function createOctahedralImpostorMaterial<T extends Material>(
  parameters: CreateOctahedralImpostor<T>
): T {
  if (!parameters)
    throw new Error(
      "createOctahedralImpostorMaterial: parameters is required."
    );
  if (!parameters.baseType)
    throw new Error("createOctahedralImpostorMaterial: baseType is required.");
  if (!parameters.useHemiOctahedron)
    throw new Error(
      "createOctahedralImpostorMaterial: useHemiOctahedron is required."
    );

  console.log("📦 Shader chunks loaded:");
  console.log(
    "  - Map Fragment:",
    typeof shaderChunkMapFragment,
    shaderChunkMapFragment?.substring(0, 50)
  );
  console.log(
    "  - Normal Fragment Begin:",
    typeof shaderChunkNormalFragmentBegin
  );
  console.log(
    "  - Params Fragment:",
    typeof shaderChunkParamsFragment,
    shaderChunkParamsFragment?.substring(0, 50)
  );
  console.log(
    "  - Params Vertex:",
    typeof shaderChunkParamsVertex,
    shaderChunkParamsVertex?.substring(0, 50)
  );
  console.log(
    "  - Vertex:",
    typeof shaderChunkVertex,
    shaderChunkVertex?.substring(0, 50)
  );

  const { albedo, normalDepth } = createTextureAtlas(parameters); // TODO normal only if lights

  const material = new parameters.baseType();
  material.isOctahedralImpostorMaterial = true;
  material.transparent = parameters.transparent ?? false;
  (material as any).map = albedo; // TODO remove any
  (material as any).normalMap = normalDepth; // TODO only if lights

  material.ezImpostorDefines = {};

  if (parameters.useHemiOctahedron)
    material.ezImpostorDefines.EZ_USE_HEMI_OCTAHEDRON = true;
  if (parameters.transparent) material.ezImpostorDefines.EZ_TRANSPARENT = true;
  material.ezImpostorDefines.EZ_USE_NORMAL = true; // TODO only if lights
  // material.ezImpostorDefines.EZ_USE_ORM = true; // TODO only if lights

  const { scale, translation, spritesPerSide, alphaClamp } = parameters;
  // const { scale, translation, spritesPerSide, parallaxScale, alphaClamp } = parameters;

  material.ezImpostorUniforms = {
    spritesPerSide: { value: spritesPerSide ?? 16 }, // TODO config default value
    // ormMap: { value: null },
    // parallaxScale: { value: parallaxScale ?? 0 },
    alphaClamp: { value: alphaClamp ?? 0.4 },
    transform: {
      value: new Matrix4()
        .makeScale(scale, scale, scale)
        .setPosition(translation),
    },
  };

  overrideMaterialCompilation(material);

  return material;
}

function overrideMaterialCompilation(material: Material): void {
  const onBeforeCompileBase = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    console.log("🔧 onBeforeCompile called - Injecting shader chunks...");

    shader.defines = { ...shader.defines, ...material.ezImpostorDefines };
    shader.uniforms = { ...shader.uniforms, ...material.ezImpostorUniforms };

    // DON'T force GLSL 3.0 - use default GLSL 1.0 for compatibility
    // shader.glslVersion = GLSL3;

    console.log("  Defines:", shader.defines);
    console.log("  Uniforms:", Object.keys(shader.uniforms));
    console.log("  GLSL Version:", shader.glslVersion || "default (1.0)");

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <clipping_planes_pars_vertex>",
        shaderChunkParamsVertex
      )
      .replace("#include <project_vertex>", shaderChunkVertex);

    console.log("  ✅ Vertex shader modified");

    // TODO improve
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <clipping_planes_pars_fragment>",
        shaderChunkParamsFragment
      )
      .replace(
        "#include <normal_fragment_begin>",
        shaderChunkNormalFragmentBegin
      )
      .replace(
        "#include <normal_fragment_maps>",
        "// #include <normal_fragment_maps>"
      )
      // Inject blendedColor calculation AFTER diffuseColor is declared
      .replace(
        "#include <map_fragment>",
        `${shaderChunkMapFragment}\n\tdiffuseColor *= blendedColor;`
      );

    console.log("  ✅ Fragment shader modified");
    console.log("  Fragment shader length:", shader.fragmentShader.length);

    // Debug: Check where getUV is defined
    const getUVIndex = shader.fragmentShader.indexOf("vec2 getUV(");
    const mainIndex = shader.fragmentShader.indexOf("void main()");

    console.log("🔍 Function placement check:");
    console.log("  - getUV defined at position:", getUVIndex);
    console.log("  - main() starts at position:", mainIndex);
    console.log(
      "  - getUV defined BEFORE main():",
      getUVIndex > -1 && getUVIndex < mainIndex
    );

    if (getUVIndex > -1) {
      console.log("📝 FRAGMENT SHADER - getUV function area (300 chars):");
      console.log(
        shader.fragmentShader.substring(
          Math.max(0, getUVIndex - 100),
          getUVIndex + 200
        )
      );
    }

    if (mainIndex > -1) {
      console.log("📝 FRAGMENT SHADER - Start of main() (600 chars):");
      console.log(shader.fragmentShader.substring(mainIndex, mainIndex + 600));
    }

    // Save full shader for debugging if needed
    (window as any).__lastFragmentShader = shader.fragmentShader;
    console.log("💾 Full fragment shader saved to window.__lastFragmentShader");

    onBeforeCompileBase?.call(material, shader, renderer);
  };

  const customProgramCacheKeyBase = material.customProgramCacheKey;

  material.customProgramCacheKey = () => {
    const hemiOcta = !!material.ezImpostorDefines.EZ_USE_HEMI_OCTAHEDRON;
    const useNormal = !!material.ezImpostorDefines.EZ_USE_NORMAL;
    const useOrm = !!material.ezImpostorDefines.EZ_USE_ORM;
    const transparent = !!material.transparent;

    return `ez_${hemiOcta}_${transparent}_${useNormal}_${useOrm}_${customProgramCacheKeyBase.call(
      material
    )}`;
  };
}
