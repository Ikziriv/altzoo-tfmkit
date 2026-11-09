import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector4 } from 'three';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { sampleTerrainY, habitatZoom, restingCenterY } = await server.ssrLoadModule('/src/three/habitat/placement.ts');
  const { HABITAT_SPECS } = await server.ssrLoadModule('/src/three/habitat/specs.ts');
  const { attachHabitatReveal } = await server.ssrLoadModule('/src/three/habitat/reveal.ts');

  for (const spec of Object.values(HABITAT_SPECS)) {
    const ground = sampleTerrainY(spec, 0, 0);
    assert.ok(Number.isFinite(ground), `${spec.id}: invalid ground height`);
    if (!spec.hasWater) {
      for (const [x, z] of [[0, 0], [0.2, 0.2], [-0.3, 0.1]]) {
        assert.equal(sampleTerrainY(spec, x, z), spec.groundY, `${spec.id}: uneven foot clearing`);
      }
    }
    for (const prop of [...spec.props, ...spec.boulders]) {
      assert.ok(Number.isFinite(sampleTerrainY(spec, prop.x, prop.z)), `${spec.id}: invalid prop placement`);
    }
    for (const minY of [-0.5, -0.23, -0.08]) {
      for (const size of [0.88, 0.9, 1.1]) {
        for (const zoom of [0.7, 1, 1.8, 3]) {
          const feet = restingCenterY(minY, size, ground, zoom) + minY * size * zoom;
          assert.ok(Math.abs(feet - ground * habitatZoom(zoom)) < 1e-10, `${spec.id}: feet drift at zoom ${zoom}`);
        }
      }
    }
  }

  const material = new MeshStandardMaterial();
  const geometry = new PlaneGeometry();
  const root = new Group();
  root.add(new Mesh(geometry, material));
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey;
  const reveal = { progress: { value: 0 }, window: { value: new Vector4(10, 20, 600, 400) } };
  const detach = attachHabitatReveal(root, reveal);
  const shader = { uniforms: {}, fragmentShader: 'void main() { float edge = 1.0; gl_FragColor = vec4(edge); }' };
  material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.uHabitatReveal, reveal.progress);
  assert.ok(shader.fragmentShader.includes('gl_FragCoord.xy'));
  assert.ok(shader.fragmentShader.includes('discard'));
  assert.match(shader.fragmentShader, /discard;\s*}\s*float edge/, 'Reveal locals must not collide with water shader locals');
  assert.equal(material.transparent, false, 'Reveal must retain opaque depth ordering');
  detach();
  assert.equal(material.onBeforeCompile, compile, 'Reveal hook must clean up');
  assert.equal(material.customProgramCacheKey, cacheKey, 'Shader cache hook must clean up');
  geometry.dispose();
  material.dispose();
  console.log('Habitat checks passed: five terrains, prop heights, 180 grounded zoom cases, reveal shader and cleanup.');
} finally {
  await server.close();
}
