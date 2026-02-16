import React, { useEffect, useRef, useState, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ============================================================================
// EMBEDDED SHADER CODE
// ============================================================================

const SHADER_MAP_FRAGMENT = `//#include <map_fragment>
// Calculate sprite UVs using getUV function (defined in params)
float spriteSize = 1.0 / spritesPerSide;
vec2 uv1 = getUV(vSpriteUV1, vSprite1, spriteSize);
vec2 uv2 = getUV(vSpriteUV2, vSprite2, spriteSize);
vec2 uv3 = getUV(vSpriteUV3, vSprite3, spriteSize);

vec4 sprite1, sprite2, sprite3;
float test = 1.0 - alphaClamp;

if (vSpritesWeight.x >=  test) {

  sprite1 = texture2D(map, uv1);
  if (sprite1.a <= alphaClamp) discard;

  sprite2 = texture2D(map, uv2);
  sprite3 = texture2D(map, uv3);

} else if (vSpritesWeight.y >=  test) {

  sprite2 = texture2D(map, uv2);
  if (sprite2.a <= alphaClamp) discard;

  sprite1 = texture2D(map, uv1);
  sprite3 = texture2D(map, uv3);

} else if (vSpritesWeight.z >=  test) {

  sprite3 = texture2D(map, uv3);
  if (sprite3.a <= alphaClamp) discard;

  sprite1 = texture2D(map, uv1);
  sprite2 = texture2D(map, uv2);

} else {

  sprite1 = texture2D(map, uv1);
  sprite2 = texture2D(map, uv2);
  sprite3 = texture2D(map, uv3);

}

vec4 blendedColor = sprite1 * vSpritesWeight.x + sprite2 * vSpritesWeight.y + sprite3 * vSpritesWeight.z;

if (blendedColor.a <= alphaClamp) discard;

#ifndef EZ_TRANSPARENT
blendedColor = vec4(vec3(blendedColor.rgb) / blendedColor.a, 1.0);
#endif

// diffuseColor *= blendedColor;`;

const SHADER_NORMAL_FRAGMENT_BEGIN = `// #include <normal_fragment_begin>
vec3 normal = blendNormals(uv1, uv2, uv3);
vec3 nonPerturbedNormal = normal;`;

const SHADER_PARAMS_FRAGMENT = `#include <clipping_planes_pars_fragment>

uniform float spritesPerSide;
// uniform float parallaxScale;
uniform float alphaClamp;

#ifdef EZ_USE_ORM
uniform sampler2D ormMap;
#endif

varying vec4 vSpritesWeight;
varying vec2 vSprite1;
varying vec2 vSprite2;
varying vec2 vSprite3;
varying vec2 vSpriteUV1;
varying vec2 vSpriteUV2;
varying vec2 vSpriteUV3;
// varying vec2 vSpriteViewDir1;
// varying vec2 vSpriteViewDir2;
// varying vec2 vSpriteViewDir3;

// #ifdef EZ_USE_NORMAL
// flat varying vec3 vSpriteNormal1;
// flat varying vec3 vSpriteNormal2;
// flat varying vec3 vSpriteNormal3;
// #endif

#ifdef EZ_USE_NORMAL
vec3 blendNormals(vec2 uv1, vec2 uv2, vec2 uv3) {
  vec4 normalDepth1 = texture2D(normalMap, uv1); // we're reading twice if parallax enabled
  vec4 normalDepth2 = texture2D(normalMap, uv2);
  vec4 normalDepth3 = texture2D(normalMap, uv3);

  // Fix normal if blended bad

  return normalize(normalDepth1.xyz * vSpritesWeight.x + normalDepth2.xyz * vSpritesWeight.y + normalDepth3.xyz * vSpritesWeight.z);
}
#endif

// // temporaly removed
// Function to calculate UV coordinates for sprite sampling
vec2 getUV(vec2 uv_f, vec2 frame, float frame_size) {
  uv_f = clamp(uv_f, vec2(0.0), vec2(1.0));
	vec2 uv_quad = frame_size * (frame + uv_f);
	uv_f =  frame_size * (frame + uv_f);
	return clamp(uv_f, vec2(0.0), vec2(1.0));
}`;

const SHADER_PARAMS_VERTEX = `#include <clipping_planes_pars_vertex>

uniform mat4 transform; // TODO optimize
uniform float spritesPerSide;

varying vec4 vSpritesWeight;
varying vec2 vSprite1;
varying vec2 vSprite2;
varying vec2 vSprite3;
varying vec2 vSpriteUV1;
varying vec2 vSpriteUV2;
varying vec2 vSpriteUV3;
// varying vec2 vSpriteViewDir1;
// varying vec2 vSpriteViewDir2;
// varying vec2 vSpriteViewDir3;

// #ifdef EZ_USE_NORMAL
// flat varying vec3 vSpriteNormal1;
// flat varying vec3 vSpriteNormal2;
// flat varying vec3 vSpriteNormal3;
// #endif

vec2 encodeDirection(vec3 direction) {
  #ifdef EZ_USE_HEMI_OCTAHEDRON

  vec3 octahedron = direction / dot(direction, sign(direction));
  return vec2(1.0 + octahedron.x + octahedron.z, 1.0 + octahedron.z - octahedron.x) * 0.5;

  #else

  // TODO: Implement full octahedral encoding

  #endif
}

vec3 decodeDirection(vec2 gridIndex, vec2 spriteCountMinusOne) {
  vec2 gridUV = gridIndex / spriteCountMinusOne;

  #ifdef EZ_USE_HEMI_OCTAHEDRON

  vec3 position = vec3(gridUV.x - gridUV.y, 0.0, -1.0 + gridUV.x + gridUV.y);
  position.y = 1.0 - abs(position.x) - abs(position.z);

  #else

    // TODO: Implement full octahedral decoding

  #endif

  return normalize(position);
}

void computePlaneBasis(vec3 normal, out vec3 tangent, out vec3 bitangent) {
  vec3 up = vec3(0.0, 1.0, 0.0);

  if(normal.y > 0.999)
    up = vec3(-1.0, 0.0, 0.0);

  #ifndef EZ_USE_HEMI_OCTAHEDRON
  if(normal.y < -0.999)
    up = vec3(1.0, 0.0, 0.0);
  #endif

  tangent = normalize(cross(up, normal));
  bitangent = cross(normal, tangent);
}

vec3 projectVertex(vec3 normal) {
  vec3 x, y;
  computePlaneBasis(normal, x, y);
  return x * position.x + y * position.y;
}

void computeSpritesWeight(vec2 gridFract) {
  vSpritesWeight = vec4(min(1.0 - gridFract.x, 1.0 - gridFract.y), abs(gridFract.x - gridFract.y), min(gridFract.x, gridFract.y), ceil(gridFract.x - gridFract.y));
}

vec2 projectToPlaneUV(vec3 normal, vec3 tangent, vec3 bitangent, vec3 cameraPosition, vec3 viewDir) {
  float denom = dot(viewDir, normal);
  
  // // Avoid division by zero when view direction is parallel to plane
  // if (abs(denom) < 1e-6) {
  //   return vec2(0.5); // Return center UV as fallback
  // }
  
  float t = -dot(cameraPosition, normal) / denom;

  vec3 hit = cameraPosition + viewDir * t;
  vec2 uv = vec2(dot(tangent, hit), dot(bitangent, hit));
  return uv + 0.5;
}

vec3 projectDirectionToBasis(vec3 dir, vec3 normal, vec3 tangent, vec3 bitangent) {
  return vec3(dot(dir, tangent), dot(dir, bitangent), dot(dir, normal));
}`;

const SHADER_VERTEX = `// #include <project_vertex>

vec2 spritesMinusOne = vec2(spritesPerSide - 1.0);

#if defined USE_INSTANCING || defined USE_INSTANCING_INDIRECT
mat4 instanceMatrix2 = instanceMatrix * transform; // find a way to remove transform matrix

vec3 cameraPosLocal = (inverse(instanceMatrix2 * modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
#else
vec3 cameraPosLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
#endif

vec3 cameraDir = normalize(cameraPosLocal);

vec3 projectedVertex = projectVertex(cameraDir);
vec3 viewDirLocal = normalize(projectedVertex - cameraPosLocal);

vec2 grid = encodeDirection(cameraDir) * spritesMinusOne;
vec2 gridFloor = min(floor(grid), spritesMinusOne);

vec2 gridFract = fract(grid);

computeSpritesWeight(gridFract);

vSprite1 = gridFloor;
vSprite2 = min(vSprite1 + mix(vec2(0.0, 1.0), vec2(1.0, 0.0), vSpritesWeight.w), spritesMinusOne);
vSprite3 = min(vSprite1 + vec2(1.0), spritesMinusOne);

vec3 spriteNormal1 = decodeDirection(vSprite1, spritesMinusOne);
vec3 spriteNormal2 = decodeDirection(vSprite2, spritesMinusOne);
vec3 spriteNormal3 = decodeDirection(vSprite3, spritesMinusOne);

// #ifdef EZ_USE_NORMAL
// vSpriteNormal1 = spriteNormal1;
// vSpriteNormal2 = spriteNormal2;
// vSpriteNormal3 = spriteNormal3;
// #endif

vec3 planeX1, planeY1, planeX2, planeY2, planeX3, planeY3;
computePlaneBasis(spriteNormal1, planeX1, planeY1);
computePlaneBasis(spriteNormal2, planeX2, planeY2);
computePlaneBasis(spriteNormal3, planeX3, planeY3);

vSpriteUV1 = projectToPlaneUV(spriteNormal1, planeX1, planeY1, cameraPosLocal, viewDirLocal);
vSpriteUV2 = projectToPlaneUV(spriteNormal2, planeX2, planeY2, cameraPosLocal, viewDirLocal);
vSpriteUV3 = projectToPlaneUV(spriteNormal3, planeX3, planeY3, cameraPosLocal, viewDirLocal);

// vSpriteViewDir1 = projectDirectionToBasis(-viewDirLocal, spriteNormal1, planeX1, planeY1).xy;
// vSpriteViewDir2 = projectDirectionToBasis(-viewDirLocal, spriteNormal2, planeX2, planeY2).xy;
// vSpriteViewDir3 = projectDirectionToBasis(-viewDirLocal, spriteNormal3, planeX3, planeY3).xy;

vec4 mvPosition = vec4(projectedVertex, 1.0);

#if defined USE_INSTANCING || defined USE_INSTANCING_INDIRECT
    mvPosition = instanceMatrix2 * mvPosition;
#endif

mvPosition = modelViewMatrix * mvPosition;

gl_Position = projectionMatrix * mvPosition;`;

const ATLAS_FRAGMENT_SHADER = `precision highp float;
precision highp int;

// #include <alphatest_pars_fragment>
uniform float alphaTest;
uniform mat3 normalMatrix;
uniform sampler2D map;

varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vHighPrecisionZW;

layout(location = 0) out vec4 gAlbedo;
layout(location = 1) out vec4 gNormalDepth;

void main() {
    vec4 albedo = texture(map, vUv);
    if (albedo.a < alphaTest) discard; // FIX

    vec3 normal = normalize( vNormal );
    #ifdef DOUBLE_SIDED
        float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
        normal *= faceDirection;
    #endif
    normal = normalize(normalMatrix * normal);

    float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;

    gAlbedo = linearToOutputTexel(albedo);
    gNormalDepth = vec4(normal, 1.0 - fragCoordZ);
}`;

const ATLAS_VERTEX_SHADER = `precision highp float; // do we need this?
precision highp int;

varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vHighPrecisionZW;

void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * vec3(normal));

    vec4 mvPosition = vec4(position, 1.0);
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;

    vHighPrecisionZW = gl_Position.zw;
}`;

// ============================================================================
// EMBEDDED UTILITY FUNCTIONS
// ============================================================================

function computeObjectBoundingSphere(
  obj: THREE.Object3D,
  target = new THREE.Sphere(),
  forceComputeBoundingSphere = false
): THREE.Sphere {
  const sphere = new THREE.Sphere();
  target.makeEmpty();
  traverse(obj);

  return target;

  function traverse(obj: THREE.Object3D): void {
    if ((obj as THREE.Mesh).isMesh) {
      const geometry = (obj as THREE.Mesh).geometry;
      if (forceComputeBoundingSphere || !geometry.boundingSphere)
        geometry.computeBoundingSphere();

      sphere.copy(geometry.boundingSphere).applyMatrix4(obj.matrixWorld);
      target.union(sphere);
    }

    for (const child of obj.children) {
      traverse(child);
    }
  }
}

function hemiOctaGridToDir(
  grid: THREE.Vector2,
  target = new THREE.Vector3()
): THREE.Vector3 {
  target.set(grid.x - grid.y, 0, -1 + grid.x + grid.y);
  target.y = 1 - Math.abs(target.x) - Math.abs(target.z);
  return target;
}

function octaGridToDir(
  grid: THREE.Vector2,
  target = new THREE.Vector3()
): THREE.Vector3 {
  const absolute = new THREE.Vector3();
  target.set(2 * (grid.x - 0.5), 0, 2 * (grid.y - 0.5));
  absolute.set(Math.abs(target.x), 0, Math.abs(target.z));
  target.y = 1 - absolute.x - absolute.z;

  if (target.y < 0) {
    target.x = Math.sign(target.x) * (1 - absolute.z);
    target.z = Math.sign(target.z) * (1 - absolute.x);
  }

  return target;
}

// ============================================================================
// EMBEDDED TEXTURE ATLAS CREATION
// ============================================================================

interface CreateTextureAtlasParams {
  renderer: THREE.WebGLRenderer;
  useHemiOctahedron: boolean;
  target: THREE.Object3D;
  textureSize?: number;
  spritesPerSide?: number;
  cameraFactor?: number;
}

interface TextureAtlas {
  renderTarget: THREE.WebGLRenderTarget;
  albedo: THREE.Texture;
  normalDepth: THREE.Texture;
}

function createTextureAtlas(params: CreateTextureAtlasParams): TextureAtlas {
  const { renderer, target, useHemiOctahedron } = params;

  if (!renderer) throw new Error('"renderer" is mandatory.');
  if (!target) throw new Error('"target" is mandatory.');
  if (useHemiOctahedron == null)
    throw new Error('"useHemiOctahedron" is mandatory.');

  const atlasSize = params.textureSize ?? 2048;
  const countPerSide = params.spritesPerSide ?? 16;
  const countPerSideMinusOne = countPerSide - 1;
  const spriteSize = atlasSize / countPerSide;

  const camera = new THREE.OrthographicCamera();
  const bSphere = new THREE.Sphere();
  const oldScissor = new THREE.Vector4();
  const oldViewport = new THREE.Vector4();
  const coords = new THREE.Vector2();
  const userDataMaterialKey = "ez_originalMaterial";

  computeObjectBoundingSphere(target, bSphere, true);

  const cameraFactor = params.cameraFactor ?? 1;

  function updateCamera(): void {
    camera.left = -bSphere.radius;
    camera.right = bSphere.radius;
    camera.top = bSphere.radius;
    camera.bottom = -bSphere.radius;

    camera.zoom = cameraFactor;
    camera.near = 0.001;
    camera.far = bSphere.radius * 2 + 0.001;

    camera.updateProjectionMatrix();
  }

  function setupRenderer() {
    const oldPixelRatio = renderer.getPixelRatio();
    const oldScissorTest = renderer.getScissorTest();
    const oldClearAlpha = renderer.getClearAlpha();
    renderer.getScissor(oldScissor);
    renderer.getViewport(oldViewport);

    const renderTarget = new THREE.WebGLRenderTarget(atlasSize, atlasSize, {
      count: 2,
      generateMipmaps: false,
    });

    const albedo = 0;
    const normalDepth = 1;

    renderTarget.textures[albedo].minFilter = THREE.LinearFilter;
    renderTarget.textures[albedo].magFilter = THREE.LinearFilter;
    renderTarget.textures[albedo].type = THREE.UnsignedByteType;
    renderTarget.textures[albedo].colorSpace = renderer.outputColorSpace;

    renderTarget.textures[normalDepth].minFilter = THREE.NearestFilter;
    renderTarget.textures[normalDepth].magFilter = THREE.NearestFilter;
    renderTarget.textures[normalDepth].type = THREE.HalfFloatType;
    renderTarget.textures[normalDepth].colorSpace = THREE.LinearSRGBColorSpace;

    renderer.setRenderTarget(renderTarget);
    renderer.setScissorTest(true);
    renderer.setPixelRatio(1);
    renderer.setClearAlpha(0);

    return { renderTarget, oldPixelRatio, oldScissorTest, oldClearAlpha };
  }

  function restoreRenderer(
    oldPixelRatio: number,
    oldScissorTest: boolean,
    oldClearAlpha: number
  ): void {
    renderer.setRenderTarget(null);
    renderer.setScissorTest(oldScissorTest);
    renderer.setViewport(oldViewport.x, oldViewport.y, oldViewport.z, oldViewport.w);
    renderer.setScissor(oldScissor.x, oldScissor.y, oldScissor.z, oldScissor.w);
    renderer.setPixelRatio(oldPixelRatio);
    renderer.setClearAlpha(oldClearAlpha);
  }

  function createMaterial(material: THREE.Material): THREE.ShaderMaterial {
    const uniforms: { [uniform: string]: THREE.IUniform } = {
      map: { value: (material as THREE.MeshStandardMaterial).map },
      alphaTest: { value: (material as THREE.MeshStandardMaterial).alphaTest },
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: ATLAS_VERTEX_SHADER,
      fragmentShader: ATLAS_FRAGMENT_SHADER,
      glslVersion: THREE.GLSL3,
      side: material.side,
      transparent: material.transparent,
    });
  }

  function overrideTargetMaterial(target: THREE.Object3D): void {
    target.traverse((mesh) => {
      if ((mesh as THREE.Mesh).material) {
        const material = (mesh as THREE.Mesh).material;
        mesh.userData[userDataMaterialKey] = material;
        const overrideMaterial = Array.isArray(material)
          ? material.map((mat) => createMaterial(mat))
          : createMaterial(material);
        (mesh as THREE.Mesh).material = overrideMaterial;
      }
    });
  }

  function restoreTargetMaterial(target: THREE.Object3D): void {
    target.traverse((mesh) => {
      if (mesh.userData[userDataMaterialKey]) {
        (mesh as THREE.Mesh).material = mesh.userData[userDataMaterialKey];
        delete mesh.userData[userDataMaterialKey];
      }
    });
  }

  function renderView(col: number, row: number): void {
    coords.set(col / countPerSideMinusOne, row / countPerSideMinusOne);

    if (useHemiOctahedron) hemiOctaGridToDir(coords, camera.position);
    else octaGridToDir(coords, camera.position);

    camera.position
      .setLength(bSphere.radius * cameraFactor)
      .add(bSphere.center);
    camera.lookAt(bSphere.center);

    const xOffset = (col / countPerSide) * atlasSize;
    const yOffset = (row / countPerSide) * atlasSize;
    renderer.setViewport(xOffset, yOffset, spriteSize, spriteSize);
    renderer.setScissor(xOffset, yOffset, spriteSize, spriteSize);
    renderer.render(target, camera);
  }

  updateCamera();
  const { renderTarget, oldPixelRatio, oldScissorTest, oldClearAlpha } =
    setupRenderer();
  overrideTargetMaterial(target);

  for (let row = 0; row < countPerSide; row++) {
    for (let col = 0; col < countPerSide; col++) {
      renderView(col, row);
    }
  }

  restoreRenderer(oldPixelRatio, oldScissorTest, oldClearAlpha);
  restoreTargetMaterial(target);

  return {
    renderTarget,
    albedo: renderTarget.textures[0],
    normalDepth: renderTarget.textures[1],
  };
}

// ============================================================================
// EMBEDDED MATERIAL CREATION
// ============================================================================

interface OctahedralImpostorUniforms {
  spritesPerSide: THREE.IUniform<number>;
  alphaClamp: THREE.IUniform<number>;
  transform: THREE.IUniform<THREE.Matrix4>;
}

interface OctahedralImpostorMaterial {
  transparent?: boolean;
  alphaClamp?: number;
  scale?: number;
  translation?: THREE.Vector3;
}

type MaterialConstructor<T extends THREE.Material> = new () => T;

interface CreateOctahedralImpostor<T extends THREE.Material>
  extends OctahedralImpostorMaterial,
    CreateTextureAtlasParams {
  baseType: MaterialConstructor<T>;
}

declare module "three" {
  interface Material extends OctahedralImpostorMaterial {
    isOctahedralImpostorMaterial: boolean;
    ezImpostorUniforms?: OctahedralImpostorUniforms;
    ezImpostorDefines?: {
      EZ_USE_HEMI_OCTAHEDRON?: boolean;
      EZ_USE_NORMAL?: boolean;
      EZ_USE_ORM?: boolean;
      EZ_TRANSPARENT?: boolean;
    };
  }
}

function createOctahedralImpostorMaterial<T extends THREE.Material>(
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

  const { albedo, normalDepth } = createTextureAtlas(parameters);

  const material = new parameters.baseType();
  material.isOctahedralImpostorMaterial = true;
  material.transparent = parameters.transparent ?? false;
  (material as any).map = albedo;
  (material as any).normalMap = normalDepth;

  material.ezImpostorDefines = {};

  if (parameters.useHemiOctahedron)
    material.ezImpostorDefines.EZ_USE_HEMI_OCTAHEDRON = true;
  if (parameters.transparent) material.ezImpostorDefines.EZ_TRANSPARENT = true;
  material.ezImpostorDefines.EZ_USE_NORMAL = true;

  const { scale, translation, spritesPerSide, alphaClamp } = parameters;

  material.ezImpostorUniforms = {
    spritesPerSide: { value: spritesPerSide ?? 16 },
    alphaClamp: { value: alphaClamp ?? 0.4 },
    transform: {
      value: new THREE.Matrix4()
        .makeScale(scale, scale, scale)
        .setPosition(translation),
    },
  };

  overrideMaterialCompilation(material);

  return material;
}

function overrideMaterialCompilation(material: THREE.Material): void {
  const onBeforeCompileBase = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    shader.defines = { ...shader.defines, ...material.ezImpostorDefines };
    shader.uniforms = { ...shader.uniforms, ...material.ezImpostorUniforms };

    shader.vertexShader = shader.vertexShader
      .replace('#include <clipping_planes_pars_vertex>', SHADER_PARAMS_VERTEX)
      .replace('#include <project_vertex>', SHADER_VERTEX);

    shader.fragmentShader = shader.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `${SHADER_MAP_FRAGMENT}\n vec4 diffuseColor = vec4( diffuse, opacity );`)
      .replace('#include <clipping_planes_pars_fragment>', SHADER_PARAMS_FRAGMENT)
      .replace('#include <normal_fragment_begin>', SHADER_NORMAL_FRAGMENT_BEGIN)
      .replace('#include <normal_fragment_maps>', '// #include <normal_fragment_maps>')
      .replace('#include <map_fragment>', 'diffuseColor *= blendedColor;');

    onBeforeCompileBase?.call(material, shader, renderer);
  };

  const customProgramCacheKeyBase = material.customProgramCacheKey;

  material.customProgramCacheKey = () => {
    const hemiOcta = !!material.ezImpostorDefines?.EZ_USE_HEMI_OCTAHEDRON;
    const useNormal = !!material.ezImpostorDefines?.EZ_USE_NORMAL;
    const useOrm = !!material.ezImpostorDefines?.EZ_USE_ORM;
    const transparent = !!material.transparent;

    return `ez_${hemiOcta}_${transparent}_${useNormal}_${useOrm}_${customProgramCacheKeyBase.call(
      material
    )}`;
  };
}

// ============================================================================
// EMBEDDED OCTAHEDRAL IMPOSTOR CLASS
// ============================================================================

class OctahedralImpostor<M extends THREE.Material = THREE.Material> extends THREE.Mesh<
  THREE.PlaneGeometry,
  M
> {
  constructor(materialOrParams: M | CreateOctahedralImpostor<M>) {
    super(new THREE.PlaneGeometry(), null);

    if (!(materialOrParams as M).isOctahedralImpostorMaterial) {
      const mesh = (materialOrParams as CreateOctahedralImpostor<M>).target;
      const sphere = computeObjectBoundingSphere(mesh, new THREE.Sphere(), true);

      this.scale.multiplyScalar(sphere.radius * 2);
      this.position.copy(sphere.center);

      materialOrParams.scale = sphere.radius * 2;
      materialOrParams.translation = sphere.center.clone();

      materialOrParams = createOctahedralImpostorMaterial(
        materialOrParams as CreateOctahedralImpostor<M>
      );
    }

    this.material = materialOrParams as M;
  }

  public override clone(): this {
    const impostor = new OctahedralImpostor(this.material);
    impostor.scale.copy(this.scale);
    impostor.position.copy(this.position);
    return impostor as this;
  }
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

export interface StandaloneOctahedralImpostorProps {
  modelPath: string;
  spritesPerSide?: number;
  textureSize?: number;
  useHemiOctahedron?: boolean;
  transparent?: boolean;
  alphaClamp?: number;
  baseMaterial?: MaterialConstructor<THREE.Material>;
  cameraFactor?: number;
  onReady?: (impostor: OctahedralImpostor) => void;
  onError?: (error: Error) => void;
  showOriginalWhileLoading?: boolean;
  hideOriginalWhenReady?: boolean;
  [key: string]: any;
}

export const StandaloneOctahedralImpostor: React.FC<
  StandaloneOctahedralImpostorProps
> = ({
  modelPath,
  spritesPerSide = 16,
  textureSize = 2048,
  useHemiOctahedron = true,
  transparent = false,
  alphaClamp = 0.45,
  baseMaterial = THREE.MeshLambertMaterial,
  cameraFactor = 1,
  onReady,
  onError,
  showOriginalWhileLoading = false,
  hideOriginalWhenReady = true,
  ...props
}) => {
  const { gl } = useThree();
  const [impostor, setImpostor] = useState<OctahedralImpostor | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const originalModelRef = useRef<THREE.Object3D | null>(null);

  const gltf = useGLTF(modelPath);

  const originalModel = useMemo(() => {
    if (!gltf?.scene) return null;
    const clone = gltf.scene.clone(true);
    originalModelRef.current = clone;
    return clone;
  }, [gltf]);

  useEffect(() => {
    if (!gltf?.scene || !originalModel) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    const target = originalModel.clone(true);

    try {
      const impostorInstance = new OctahedralImpostor({
        renderer: gl,
        target,
        useHemiOctahedron,
        transparent,
        alphaClamp,
        spritesPerSide,
        textureSize,
        cameraFactor,
        baseType: baseMaterial,
      });

      setImpostor(impostorInstance);
      setIsGenerating(false);

      if (onReady) {
        onReady(impostorInstance);
      }

      if (hideOriginalWhenReady && originalModelRef.current) {
        originalModelRef.current.visible = false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsGenerating(false);

      if (onError) {
        onError(error);
      }
    }
  }, [
    gl,
    gltf,
    originalModel,
    modelPath,
    useHemiOctahedron,
    transparent,
    alphaClamp,
    spritesPerSide,
    textureSize,
    cameraFactor,
    baseMaterial,
    onReady,
    onError,
    hideOriginalWhenReady,
  ]);

  useEffect(() => {
    return () => {
      if (impostor) {
        if (impostor.geometry) {
          impostor.geometry.dispose();
        }
        if (impostor.material) {
          if (Array.isArray(impostor.material)) {
            impostor.material.forEach((mat) => {
              if (mat.map) mat.map.dispose();
              if (mat.normalMap) mat.normalMap.dispose();
              mat.dispose();
            });
          } else {
            const mat = impostor.material as any;
            if (mat.map) mat.map.dispose();
            if (mat.normalMap) mat.normalMap.dispose();
            mat.dispose();
          }
        }
      }
    };
  }, [impostor]);

  if (error) {
    return null;
  }

  if (isGenerating || !impostor) {
    if (showOriginalWhileLoading && originalModel) {
      return <primitive object={originalModel} {...props} />;
    }
    return null;
  }

  return <primitive object={impostor} {...props} />;
};

StandaloneOctahedralImpostor.preload = (modelPath: string) => {
  useGLTF.preload(modelPath);
};

export default StandaloneOctahedralImpostor;


















