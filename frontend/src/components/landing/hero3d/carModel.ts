import * as THREE from 'three';

export const LIME = 0xbef23c;

export interface Anchor { position: THREE.Vector3; normal: THREE.Vector3 }

/**
 * Auto coupé generata da codice (nessun file 3D esterno): sagoma laterale estrusa,
 * vetri, ruote e contorni lime. Ritorna il gruppo, le ruote (da far girare) e i punti
 * a cui agganciare le scadenze.
 */
export function buildCar() {
  const car = new THREE.Group();
  const W = 1.7; // larghezza

  // Sagoma laterale (x = lunghezza, y = altezza) con archi per le ruote
  const s = new THREE.Shape();
  s.moveTo(-2.15, 0.3);
  s.lineTo(-2.18, 0.62);
  s.quadraticCurveTo(-2.1, 0.8, -1.7, 0.83);
  s.bezierCurveTo(-1.3, 0.87, -1.1, 1.22, -0.55, 1.26);
  s.quadraticCurveTo(-0.1, 1.3, 0.3, 1.22);
  s.bezierCurveTo(0.75, 1.1, 1.1, 0.88, 1.55, 0.8);
  s.quadraticCurveTo(2.05, 0.74, 2.2, 0.55);
  s.lineTo(2.2, 0.32);
  s.lineTo(1.77, 0.3);
  s.absarc(1.35, 0.36, 0.42, 0, Math.PI, false);
  s.lineTo(-0.93, 0.36);
  s.absarc(-1.35, 0.36, 0.42, 0, Math.PI, false);
  s.lineTo(-2.15, 0.3);

  const bodyGeo = new THREE.ExtrudeGeometry(s, {
    depth: W, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.09, bevelSegments: 5, curveSegments: 40,
  });
  bodyGeo.translate(0, 0, -W / 2);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({
    color: 0x222a36, metalness: 0.8, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.25,
  }));
  car.add(body);

  // Contorni lime: l'aspetto "gemello digitale"
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeo, 28),
    new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.75 })
  );
  car.add(edges);

  // Vetri: leggermente più larghi del corpo per sporgere ai lati
  const g = new THREE.Shape();
  g.moveTo(-1.2, 0.88); g.lineTo(-0.62, 1.19); g.lineTo(0.28, 1.19); g.lineTo(0.92, 0.9); g.closePath();
  const glassDepth = W + 0.34;
  const glassGeo = new THREE.ExtrudeGeometry(g, { depth: glassDepth, bevelEnabled: false });
  glassGeo.translate(0, 0, -glassDepth / 2);
  car.add(new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({
    color: 0x05070a, metalness: 0.9, roughness: 0.05, envMapIntensity: 1.6,
  })));

  // Fari e luce posteriore
  const headMat = new THREE.MeshBasicMaterial({ color: 0xf3ffd0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  [-0.55, 0.55].forEach((z) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.36), headMat);
    h.position.set(2.27, 0.52, z); car.add(h);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 1.35), tailMat);
  tail.position.set(-2.27, 0.64, 0); car.add(tail);

  // Ruote
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.9, metalness: 0.1 });
  const rimMat = new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.3 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x8c96a8, metalness: 0.9, roughness: 0.35 });
  const wheels: THREE.Group[] = [];
  const makeWheel = (x: number, z: number) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 40), tireMat);
    tire.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.028, 12, 48), rimMat);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 32), discMat);
    disc.rotation.x = Math.PI / 2;
    // cerchione, disco e razze sulla faccia esterna dello pneumatico (altrimenti restano nascosti)
    const side = z > 0 ? 1 : -1;
    rim.position.z = side * 0.158;
    disc.position.z = side * 0.152;
    w.add(tire, rim, disc);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.04), rimMat);
      spoke.rotation.z = (i * Math.PI) / 5;
      spoke.position.z = side * 0.162;
      w.add(spoke);
    }
    w.position.set(x, 0.36, z);
    car.add(w);
    wheels.push(w);
  };
  [[1.35, 0.8], [1.35, -0.8], [-1.35, 0.8], [-1.35, -0.8]].forEach(([x, z]) => makeWheel(x, z));

  // Dove agganciare ogni scadenza (coordinate locali dell'auto)
  const anchors: Record<string, Anchor> = {
    tagliando: { position: new THREE.Vector3(1.55, 0.84, 0), normal: new THREE.Vector3(0, 1, 0.25).normalize() },
    revisione: { position: new THREE.Vector3(0.95, 0.96, 0), normal: new THREE.Vector3(0.6, 0.8, 0).normalize() },
    assicurazione: { position: new THREE.Vector3(0, 0.82, 0.95), normal: new THREE.Vector3(0, 0, 1) },
    gomme: { position: new THREE.Vector3(1.35, 0.36, 1.0), normal: new THREE.Vector3(0, 0, 1) },
    freni: { position: new THREE.Vector3(-1.35, 0.36, 1.0), normal: new THREE.Vector3(0, 0, 1) },
    adblue: { position: new THREE.Vector3(-2.24, 0.72, 0), normal: new THREE.Vector3(-1, 0.2, 0).normalize() },
  };

  return { car, wheels, anchors };
}

/** Pavimento: alone radiale, anelli e linea di scansione. */
export function buildStage() {
  const stage = new THREE.Group();

  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(190,242,60,0.16)');
  grad.addColorStop(0.55, 'rgba(190,242,60,0.04)');
  grad.addColorStop(1, 'rgba(190,242,60,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 64),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.04; stage.add(floor);

  [[2.7, 0.35], [4.3, 0.16], [6, 0.08]].forEach(([r, o]) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r, r + 0.012, 160),
      new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.03; stage.add(ring);
  });

  // Linea di scansione che attraversa l'auto
  const sc = document.createElement('canvas'); sc.width = 8; sc.height = 128;
  const sctx = sc.getContext('2d')!;
  const sg = sctx.createLinearGradient(0, 0, 0, 128);
  sg.addColorStop(0, 'rgba(190,242,60,0)'); sg.addColorStop(0.5, 'rgba(190,242,60,0.9)'); sg.addColorStop(1, 'rgba(190,242,60,0)');
  sctx.fillStyle = sg; sctx.fillRect(0, 0, 8, 128);
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.7),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  scan.rotation.y = Math.PI / 2; scan.position.y = 0.8; stage.add(scan);

  return { stage, scan };
}
