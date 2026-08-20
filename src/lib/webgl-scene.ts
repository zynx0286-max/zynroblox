import * as THREE from "three";

// WebGL hero scene — deliberately simple and robust.
//
// Uses only built-in materials (no custom shaders) so it cannot silently fail
// to compile on low-end GPUs. Low-poly, capped pixel ratio, paused offscreen.
// Lives in its own module so WebGLHero lazy-imports it and three.js never
// ships to SSR / the Cloudflare worker.

export interface WebGLSceneOptions {
  reduced: boolean;
}

export function mountWebGLScene(canvas: HTMLCanvasElement, options: WebGLSceneOptions) {
  const reduced = options.reduced;

  // Feature-detect WebGL; if unavailable, leave the CSS fallback showing.
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "default",
    });
  } catch {
    return () => {};
  }
  if (!renderer) return () => {};

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim() || "#7c7cff";

  // Low-poly wireframe "globe" — the hero's centrepiece.
  const wireGeo = new THREE.IcosahedronGeometry(2.3, 6);
  const wireMat = new THREE.MeshBasicMaterial({
    color: primary,
    wireframe: true,
    transparent: true,
    opacity: 0.55,
  });
  const globe = new THREE.Mesh(wireGeo, wireMat);
  scene.add(globe);

  // Solid dark core so it reads as a 3D volume, not a flat scribble.
  const coreGeo = new THREE.IcosahedronGeometry(1.9, 3);
  const coreMat = new THREE.MeshBasicMaterial({
    color: "#0b0b18",
    transparent: true,
    opacity: 0.95,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  // Sparse particle field.
  const COUNT = 700;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = 6 + Math.random() * 16;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi) - 5;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({
    color: primary,
    size: 0.045,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  let raf = 0;
  let running = true;
  let scroll = 0;
  let px = 0;
  let py = 0;
  let cpx = 0;
  let cpy = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    px = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    py = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
  };
  const onScroll = () => {
    scroll = Math.min(window.scrollY / 1200, 3);
  };

  let t = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!running) return;
    t += 0.004;
    cpx += (px - cpx) * 0.05;
    cpy += (py - cpy) * 0.05;

    globe.rotation.y = t + cpx * 0.35;
    globe.rotation.x = cpy * 0.3 + Math.sin(t * 0.5) * 0.08;
    globe.position.z = scroll * 1.5;
    core.rotation.y = -t * 0.7;
    core.position.z = globe.position.z;
    particles.rotation.y = t * 0.12;
    camera.position.x = cpx * 1.1;
    camera.position.y = cpy * 0.7;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };

  resize();
  onScroll();

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        running = entries[0]?.isIntersecting ?? false;
      },
      { rootMargin: "160px" },
    );
    io.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    canvas.addEventListener("pointermove", onPointer, { passive: true });
    raf = requestAnimationFrame(tick);
  }

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    wireGeo.dispose();
    wireMat.dispose();
    coreGeo.dispose();
    coreMat.dispose();
    pGeo.dispose();
    pMat.dispose();
    renderer.dispose();
  };
}