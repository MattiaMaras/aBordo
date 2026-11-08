import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../common/Button';
import { buildCar, buildStage, LIME, type Anchor } from './carModel';

// Modello 3D reale (credito nel footer). Orientamento: se il muso guardasse dalla parte sbagliata, cambia questo valore.
const MODEL_URL = '/models/ferrari.glb';
const MODEL_YAW = -Math.PI / 2;
const MODEL_LENGTH = 4.4;

// Posizione dei punti come frazioni della scatola dell'auto: [lunghezza, altezza, larghezza]
const ANCHOR_FRACTIONS: Record<string, { at: [number, number, number]; normal: [number, number, number] }> = {
  tagliando: { at: [0.72, 0.6, 0], normal: [0, 1, 0.2] },
  revisione: { at: [0.3, 0.88, 0], normal: [0.3, 1, 0] },
  assicurazione: { at: [0, 0.6, 1.02], normal: [0, 0, 1] },
  gomme: { at: [0.58, 0.22, 1.02], normal: [0, 0, 1] },
  freni: { at: [-0.58, 0.22, 1.02], normal: [0, 0, 1] },
  adblue: { at: [-1.0, 0.55, 0], normal: [-1, 0.2, 0] },
};

interface Props { onGetStarted: () => void }

type Tone = 'red' | 'amber' | 'green';

// Dati dimostrativi (esempio): ogni capitolo punta a una parte dell'auto.
const CHAPTERS: { id: string; title: string; text: string; example: string; tone: Tone }[] = [
  { id: 'tagliando', title: 'Tagliando', text: 'A data e a chilometri. Ti avvisiamo quando mancano pochi km.', example: 'tra 2.340 km', tone: 'green' },
  { id: 'revisione', title: 'Revisione', text: 'Inserisci l\'ultima: calcoliamo noi la prossima, due anni dopo.', example: 'tra 188 giorni', tone: 'green' },
  { id: 'assicurazione', title: 'Assicurazione', text: 'Tre email: a 30 giorni, a 7 giorni e il giorno della scadenza.', example: 'tra 6 giorni', tone: 'red' },
  { id: 'gomme', title: 'Gomme', text: 'Cambio stagionale e inversione, con il promemoria a sei mesi.', example: 'tra 19 giorni', tone: 'amber' },
  { id: 'freni', title: 'Freni', text: 'Pastiglie e dischi: l\'ultimo controllo resta nello storico, con i km.', example: 'ultimo a 62.000 km', tone: 'green' },
  { id: 'adblue', title: 'AdBlue', text: 'Il consumo varia: avvisiamo a chilometri e ti chiediamo di aggiornarli.', example: 'tra 1.200 km', tone: 'amber' },
];

// Camera per ogni "tappa": 0 = apertura, 1..6 = capitoli, 7 = chiusura
const STOPS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [5.4, 1.8, 5.8], look: [0, 0.55, 0] },
  { pos: [3.9, 1.6, 2.9], look: [1.5, 0.75, 0] },
  { pos: [3.0, 1.9, 3.8], look: [0.7, 0.95, 0] },
  { pos: [0.6, 1.3, 4.9], look: [0, 0.8, 0.6] },
  { pos: [2.7, 0.75, 3.5], look: [1.35, 0.4, 0.8] },
  { pos: [-2.6, 0.8, 3.6], look: [-1.35, 0.4, 0.8] },
  { pos: [-4.4, 1.5, 2.9], look: [-1.9, 0.7, 0] },
  { pos: [5.8, 2.3, 6.4], look: [0, 0.5, 0] },
];

const TONE_CLASS: Record<Tone, string> = {
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  green: 'bg-green-50 text-green-700 border-green-200',
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const Hero3D: React.FC<Props> = ({ onGetStarted }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [active, setActive] = useState(0); // 0 apertura, 1..6 capitoli, 7 chiusura
  const [ready, setReady] = useState(false);

  const total = STOPS.length;
  const wrapHeightVh = useMemo(() => total * 85, [total]);

  useEffect(() => {
    const host = canvasHostRef.current;
    const wrap = wrapRef.current;
    if (!host || !wrap) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    const look = new THREE.Vector3(...STOPS[0].look);
    camera.position.set(...STOPS[0].pos);

    const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(4, 6, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(LIME, 1.8); rim.position.set(-5, 2.5, -4); scene.add(rim);

    // Parte con l'auto procedurale; se il modello reale si carica, lo sostituisce
    const built = buildCar();
    let car: THREE.Object3D = built.car;
    let wheels: THREE.Group[] = built.wheels;
    let anchors: Record<string, Anchor> = built.anchors;
    scene.add(car);
    const { stage, scan } = buildStage();
    scene.add(stage);
    const carWorld = new THREE.Matrix4();

    let disposed = false;
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);
    gltfLoader.load(MODEL_URL, (gltf) => {
      if (disposed) return;
      const holder = new THREE.Group();
      gltf.scene.rotation.y = MODEL_YAW;
      holder.add(gltf.scene);
      // normalizza: lunghezza fissa lungo X, centrata, appoggiata a terra
      const raw = new THREE.Box3().setFromObject(holder);
      holder.scale.setScalar(MODEL_LENGTH / Math.max(0.0001, raw.getSize(new THREE.Vector3()).x));
      const root = new THREE.Group();
      root.add(holder);
      const box = new THREE.Box3().setFromObject(root);
      const c = box.getCenter(new THREE.Vector3());
      holder.position.set(-c.x, -0.04 - box.min.y, -c.z);
      root.updateMatrixWorld(true);
      const fit = new THREE.Box3().setFromObject(root);
      const ctr = fit.getCenter(new THREE.Vector3());
      const sz = fit.getSize(new THREE.Vector3());
      const next: Record<string, Anchor> = {};
      Object.entries(ANCHOR_FRACTIONS).forEach(([id, f]) => {
        next[id] = {
          position: new THREE.Vector3(ctr.x + f.at[0] * sz.x / 2, fit.min.y + f.at[1] * sz.y, ctr.z + f.at[2] * sz.z / 2),
          normal: new THREE.Vector3(...f.normal).normalize(),
        };
      });
      scene.remove(car);
      scene.add(root);
      car = root; wheels = []; anchors = next;
    }, undefined, () => { /* resta l'auto procedurale */ });

    const size = { w: 1, h: 1 };
    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      size.w = w; size.h = h;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // su schermi stretti allarga il campo visivo perché l'auto resti intera
      camera.fov = w / h < 0.9 ? 52 : w / h < 1.4 ? 42 : 36;
      if (w / h > 1.05) camera.setViewOffset(w, h, -w * 0.17, 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Parallasse del mouse, smorzata
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // Si renderizza solo quando la sezione è visibile
    let visible = true;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 });
    io.observe(wrap);

    const desiredPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    const a = new THREE.Vector3(); const b = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    let lastActive = -1;
    let raf = 0;
    let last = performance.now();
    let t0 = last;
    let firstFrame = true;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = (now - t0) / 1000;

      // Progresso dello scroll dentro la sezione alta
      const r = wrap.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = clamp01(-r.top / span);
      const u = p * (total - 1);
      const i = Math.min(total - 2, Math.floor(u));
      const t = smooth(u - i);
      a.set(...STOPS[i].pos); b.set(...STOPS[i + 1].pos); desiredPos.copy(a).lerp(b, t);
      a.set(...STOPS[i].look); b.set(...STOPS[i + 1].look); desiredLook.copy(a).lerp(b, t);

      // schermi meno larghi: camera più lontana, così l'auto resta intera
      const asp = size.w / size.h;
      const zoomOut = asp < 0.9 ? 1.5 : asp < 1.5 ? 1.22 : 1;
      desiredPos.sub(desiredLook).multiplyScalar(zoomOut).add(desiredLook);

      // leggera oscillazione + parallasse
      pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 4));
      pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 4));
      desiredPos.x += pointer.sx * 0.45;
      desiredPos.y += -pointer.sy * 0.22 + Math.sin(elapsed * 0.6) * 0.04;

      const k = 1 - Math.exp(-dt * 5);
      camera.position.lerp(desiredPos, firstFrame ? 1 : k);
      look.lerp(desiredLook, firstFrame ? 1 : k);
      camera.lookAt(look);

      // Ruote che girano piano; l'auto "respira"
      wheels.forEach((w) => { w.rotation.z -= dt * 0.9; });
      car.position.y = Math.sin(elapsed * 1.2) * 0.008;

      // Scansione iniziale: attraversa l'auto una volta
      const scanT = Math.min(1, elapsed / 2.6);
      scan.position.x = -2.8 + scanT * 5.6;
      (scan.material as THREE.MeshBasicMaterial).opacity = scanT < 1 ? Math.sin(scanT * Math.PI) * 0.85 : 0;

      // Punti agganciati all'auto: proiettati ogni frame, nascosti se girati dall'altra parte
      car.updateMatrixWorld();
      carWorld.copy(car.matrixWorld);
      const activeIdx = Math.round(u);
      const near = Math.abs(u - activeIdx) < 0.4;
      CHAPTERS.forEach((c, ci) => {
        const el = dotRefs.current[c.id];
        if (!el) return;
        const an = anchors[c.id];
        tmp.copy(an.position).applyMatrix4(carWorld);
        const facing = an.normal.dot(a.copy(camera.position).sub(tmp).normalize()) > 0.05;
        tmp.project(camera);
        const x = (tmp.x * 0.5 + 0.5) * size.w;
        const y = (-tmp.y * 0.5 + 0.5) * size.h;
        const on = tmp.z < 1 && facing;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        el.style.opacity = on ? (near && activeIdx === ci + 1 ? '1' : activeIdx === 0 ? '0.25' : '0.55') : '0';
        el.style.pointerEvents = on ? 'auto' : 'none';
        el.dataset.active = near && activeIdx === ci + 1 ? 'true' : 'false';
      });

      if (activeIdx !== lastActive && near) { lastActive = activeIdx; setActive(activeIdx); }

      renderer.render(scene, camera);
      if (firstFrame) { firstFrame = false; setReady(true); }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      draco.dispose();
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          const mm = x as THREE.MeshBasicMaterial;
          mm.map?.dispose(); x.dispose();
        });
      });
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [total]);

  // Un clic su un punto porta al suo capitolo
  const goTo = (index: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const span = wrap.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (index / (total - 1)) * span, behavior: 'smooth' });
  };

  const chapter = active >= 1 && active <= CHAPTERS.length ? CHAPTERS[active - 1] : null;
  const intro = active === 0;
  const outro = active === total - 1;

  return (
    <section ref={wrapRef} style={{ height: `${wrapHeightVh}vh` }} className="relative" aria-label="Il tuo veicolo con tutte le sue scadenze">
      <div ref={stickyRef} className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden">
        <div ref={canvasHostRef} className="absolute inset-0" aria-hidden="true" />

        {/* Leggibilità del testo sopra la scena */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-50/80 via-gray-50/20 to-transparent md:from-gray-50/70 md:via-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-gray-50 to-transparent" aria-hidden="true" />

        {/* Punti sulle parti dell'auto */}
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => { dotRefs.current[c.id] = el; }}
            type="button"
            onClick={() => goTo(i + 1)}
            aria-label={`${c.title}: vai al dettaglio`}
            className="group absolute left-0 top-0 z-10 h-9 w-9 opacity-0 transition-opacity duration-200 focus:outline-none"
          >
            <span className="absolute inset-0 m-auto h-3.5 w-3.5 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(190,242,60,0.25)] transition-transform duration-200 group-hover:scale-125 group-focus-visible:ring-2 group-focus-visible:ring-white" />
            <span className="absolute inset-0 m-auto h-3.5 w-3.5 rounded-full bg-blue-500/60 animate-ping group-data-[active=false]:hidden" />
          </button>
        ))}

        {/* Testo */}
        <div className="relative z-20 mx-auto flex h-full max-w-7xl items-end px-4 pb-10 sm:px-6 md:items-center md:pb-0 lg:px-8">
          <div className="max-w-xl">
            {intro && (
              <div key="intro" className="hero3d-in">
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-surface/80 px-3.5 py-1.5 text-sm text-gray-600 backdrop-blur">
                  Avvisi via email prima di ogni scadenza
                </p>
                <h1 className="mb-5 text-4xl font-semibold leading-[1.05] tracking-tight text-gray-900 md:text-6xl">
                  Il tuo veicolo, con tutte le sue <span className="text-blue-500">scadenze</span>.
                </h1>
                <p className="mb-8 max-w-md text-lg leading-relaxed text-gray-600">
                  Scorri e guarda dove si nasconde ogni scadenza: A Bordo la tiene d'occhio e ti scrive in tempo.
                </p>
                <Button size="lg" onClick={onGetStarted} className="px-7 py-3.5 text-base shadow-[0_8px_30px_-8px_rgba(190,242,60,0.55)]">
                  Inizia gratis <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            )}

            {chapter && (
              <div key={chapter.id} className="hero3d-in rounded-2xl border border-gray-200 bg-surface/85 p-6 backdrop-blur-md">
                <p className="mb-2 font-mono text-xs tracking-wider text-blue-500">
                  {String(active).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}
                </p>
                <h2 className="mb-2 text-3xl font-semibold tracking-tight text-gray-900">{chapter.title}</h2>
                <p className="mb-4 leading-relaxed text-gray-600">{chapter.text}</p>
                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-sm ${TONE_CLASS[chapter.tone]}`}>
                  {chapter.example}
                </span>
                <span className="ml-2 text-xs text-gray-500">esempio</span>
              </div>
            )}

            {outro && (
              <div key="outro" className="hero3d-in">
                <h2 className="mb-4 text-3xl font-semibold tracking-tight text-gray-900 md:text-5xl">
                  Metti in regola il tuo veicolo <span className="text-blue-500">in 2 minuti</span>
                </h2>
                <p className="mb-7 max-w-md text-lg text-gray-600">Inserisci gli ultimi interventi: alle prossime scadenze pensiamo noi.</p>
                <Button size="lg" onClick={onGetStarted} className="px-7 py-3.5 text-base shadow-[0_8px_30px_-8px_rgba(190,242,60,0.55)]">
                  Crea il tuo account <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Indicatore di avanzamento */}
        <div className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex" aria-hidden="true">
          {STOPS.map((_, i) => (
            <button key={i} type="button" tabIndex={-1} onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-[height,background-color] duration-200 ease-out ${i === active ? 'h-6 bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'} w-1.5`} />
          ))}
        </div>

        {!ready && <div className="absolute inset-0 z-30 flex items-center justify-center text-sm text-gray-500" aria-live="polite">Preparo la scena 3D…</div>}
      </div>

      {/* Alternativa testuale per chi usa lettori di schermo */}
      <ul className="sr-only">
        {CHAPTERS.map((c) => <li key={c.id}>{c.title}: {c.text}</li>)}
      </ul>
    </section>
  );
};

export default Hero3D;
