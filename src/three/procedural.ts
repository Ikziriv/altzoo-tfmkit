import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

export type ProceduralId = 'nautilus';

export interface ProceduralRig {
  root: Group;
  height: number;
  update: (t: number, dt: number, moveW: number) => void;
}

/** Creates a procedural vertex-colored / textured high-craft 3D animal with live skeletal/sine animation. */
export function createProceduralAnimal(id: ProceduralId): ProceduralRig {
  const rig = buildRawProceduralAnimal(id);
  rig.update(0.3, 0.016, 0);
  rig.root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(rig.root);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  rig.root.position.sub(center);

  const norm = new Group();
  norm.scale.setScalar(1 / maxDim);
  norm.add(rig.root);

  return {
    root: norm,
    height: size.y / maxDim,
    update: rig.update,
  };
}

function buildRawProceduralAnimal(id: ProceduralId): ProceduralRig {
  switch (id) {
    case 'nautilus':
      return buildNautilus();
  }
}

/* ------------------------------------------------------------------
   Chambered Nautilus (Nautilus pompilius) — Logarithmic flame-striped shell
------------------------------------------------------------------- */
function buildNautilus(): ProceduralRig {
  const root = new Group();

  // Procedural flame-stripe texture on canvas
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f5ede0';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#b94722';
  for (let x = 0; x < 512; x += 22) {
    g.beginPath();
    g.moveTo(x, 0);
    g.quadraticCurveTo(x + 14, 90, x - 6, 200);
    g.lineTo(x + 8, 200);
    g.quadraticCurveTo(x + 26, 90, x + 12, 0);
    g.closePath();
    g.fill();
  }
  const shellTex = new CanvasTexture(c);

  // Logarithmic spiral shell built on a parametric grid
  const turns = 2.65 * Math.PI;
  const uSeg = 72;
  const vSeg = 32;
  const geo = new BufferGeometry();
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let iu = 0; iu <= uSeg; iu++) {
    const u = iu / uSeg;
    const theta = u * turns;
    const rad = 0.045 * Math.exp(0.28 * theta);
    const tubeR = rad * 0.56;
    const cx = -Math.sin(theta) * rad;
    const cy = Math.cos(theta) * rad;
    for (let iv = 0; iv <= vSeg; iv++) {
      const v = iv / vSeg;
      const phi = v * Math.PI * 2;
      const nX = -Math.sin(theta) * Math.cos(phi);
      const nY = Math.cos(theta) * Math.cos(phi);
      const z = Math.sin(phi) * tubeR * 0.78;
      pos.push(cx + nX * tubeR, cy + nY * tubeR, z);
      uvs.push(u * 3.5, v);
    }
  }
  for (let iu = 0; iu < uSeg; iu++) {
    for (let iv = 0; iv < vSeg; iv++) {
      const a = iu * (vSeg + 1) + iv;
      const b = a + 1;
      const d = a + (vSeg + 1);
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  geo.setAttribute('position', new (bellAttrCtor())(new Float32Array(pos), 3));
  geo.setAttribute('uv', new (bellAttrCtor())(new Float32Array(uvs), 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const shellMat = new MeshStandardMaterial({ map: shellTex, roughness: 0.28, metalness: 0.06, side: DoubleSide });
  const shell = new Mesh(geo, shellMat);
  shell.rotation.y = Math.PI / 2;
  root.add(shell);

  // Textured hood & 18 slender tentacles emerging forward (+Z)
  const tentMat = new MeshStandardMaterial({ color: '#e8d4bc', roughness: 0.45 });
  const tentacles: { mesh: Mesh; baseY: number; phase: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const tGeo = new CylinderGeometry(0.005, 0.014, 0.34, 6, 10);
    tGeo.rotateX(Math.PI / 2);
    tGeo.translate(0, 0, 0.17);
    const m = new Mesh(tGeo, tentMat);
    const a = (i / 16) * Math.PI * 1.4 - Math.PI * 0.7;
    const by = -0.16 + Math.sin(a) * 0.08;
    m.position.set(Math.cos(a) * 0.08, by, 0.16);
    root.add(m);
    tentacles.push({ mesh: m, baseY: by, phase: i * 0.55 });
  }

  // Pinhole eye
  const eyeMat = new MeshStandardMaterial({ color: '#f2e8da', roughness: 0.3 });
  const pupilMat = new MeshStandardMaterial({ color: '#111', roughness: 0.1 });
  for (const s of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.055, 16, 16), eyeMat);
    eye.position.set(s * 0.14, -0.05, 0.14);
    const p = new Mesh(new SphereGeometry(0.032, 12, 12), pupilMat);
    p.position.set(s * 0.175, -0.05, 0.15);
    root.add(eye, p);
  }

  return {
    root,
    height: 0.82,
    update(t, _dt, moveW) {
      const rate = 2.2 + moveW * 2;
      root.rotation.x = Math.sin(t * rate * 0.7) * 0.07;
      for (const tc of tentacles) {
        tc.mesh.rotation.x = Math.sin(t * rate + tc.phase) * 0.18;
        tc.mesh.rotation.y = Math.cos(t * rate * 0.8 + tc.phase) * 0.14;
      }
    },
  };
}

function bellAttrCtor() {
  return BufferAttribute;
}
