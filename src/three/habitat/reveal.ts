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
        float radial = length((stageUV - vec2(0.5, 0.45)) * vec2(0.85, 1.05));
        float sweep = mix(stageUV.y * 0.65 + radial * 0.45, radial, 0.35);
        float edge = mix(-0.18, 1.18, uHabitatReveal);
        float coverage = 1.0 - smoothstep(edge - 0.16, edge + 0.16, sweep);
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        if (coverage <= ign) discard;
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
