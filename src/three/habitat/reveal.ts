import { Material, Mesh, Object3D, Vector4 } from 'three';

export interface HabitatReveal {
  progress: { value: number };
  window: { value: Vector4 };
}

/** A feathered screen-space wipe that preserves opaque terrain depth and shadow materials. */
export function attachHabitatReveal(root: Object3D, reveal: HabitatReveal): () => void {
  const materials = new Set<Material>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh) {
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mat) => materials.add(mat));
    }
  });
  const cleanup = [...materials].map((material) => {
    const compile = material.onBeforeCompile;
    const cacheKey = material.customProgramCacheKey;
    const originalKey = cacheKey.call(material);
    material.onBeforeCompile = function (shader, renderer) {
      compile.call(this, shader, renderer);
      shader.uniforms.uHabitatReveal = reveal.progress;
      shader.uniforms.uHabitatWindow = reveal.window;
      shader.fragmentShader = `
        uniform float uHabitatReveal;
        uniform vec4 uHabitatWindow;
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(/void main\s*\(\s*\)\s*\{/, `
        void main() {
        {
        vec2 stageUV = (gl_FragCoord.xy - uHabitatWindow.xy) / max(uHabitatWindow.zw, vec2(1.0));
        if (stageUV.x < 0.0 || stageUV.x > 1.0 || stageUV.y < 0.0 || stageUV.y > 1.0) discard;
        float edge = mix(-0.08, 1.08, uHabitatReveal);
        float coverage = 1.0 - smoothstep(edge - 0.06, edge + 0.06, stageUV.y);
        float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
        if (coverage <= grain) discard;
        }
      `);
    };
    material.customProgramCacheKey = () => `${originalKey}-habitat-reveal-v1`;
    material.needsUpdate = true;
    return () => {
      material.onBeforeCompile = compile;
      material.customProgramCacheKey = cacheKey;
      material.needsUpdate = true;
    };
  });
  return () => cleanup.forEach((detach) => detach());
}
