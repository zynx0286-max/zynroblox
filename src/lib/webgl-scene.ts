import * as THREE from "three";

// WebGL hero scene. Deliberately in its own module so WebGLHero can import it
// with a dynamic `import()` — three.js (~750 kB) then ships only as a client
// async chunk and never bloats the SSR/Cloudflare worker bundle.

const SHADERS = {
  vertex: /* glsl */ `
    uniform float uTime;
    uniform float uScroll;
    varying float vDisp;
    varying vec3 vNormalW;

    float noise(vec3 p) {
      return sin(p.x * 1.5 + uTime * 0.6) * 0.5
           + sin(p.y * 1.8 - uTime * 0.5) * 0.5
           + sin(p.z * 2.1 + uTime * 0.4) * 0.5;
    }

    void main() {
      float n = noise(position * 0.6);
      float disp = n * (0.35 + uScroll * 0.25);
      vec3 p = position + normal * disp;
      vDisp = disp;
      vNormalW = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragment: /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uScroll;
    varying float vDisp;
    varying vec3 vNormalW;
    void main() {
      float fres = pow(1.0 - max(dot(vNormalW, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
      float m = clamp(vDisp * 1.4 + 0.5, 0.0, 1.0) + uScroll * 0.15;
      vec3 col = mix(uColorA, uColorB, clamp(m, 0.0, 1.0));
      float a = 0.35 + fres * 0.5;
      gl_FragColor = vec4(col, a);
    }
  `,
  particleVertex: /* glsl */ `
    uniform float uTime;
    attribute float aSize;
    varying float vAlpha;
    void main() {
      vec3 p = position;
      p.y += sin(uTime * 0.2 + p.x * 0.3) * 0.15;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = aSize * (180.0 / -mv.z);
      vAlpha = 0.25 + 0.35 * (aSize / 1.9);
      gl_Position = projectionMatrix * mv;
    }
  `,
  particleFragment: /* glsl */ `
    uniform vec3 uColor;
    varying float vAlpha;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      float glow = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(uColor, glow * vAlpha);
    }
  `,
};

export interface WebGLSceneOptions {
  reduced: boolean;
}

export function mountWebGLScene(canvas: HTMLCanvasElement, options: WebGLSceneOptions) {
  const reduced = options.reduced;

  let renderer: THREE.WebGLRenderer | null = null;
  let wireform: THREE.Mesh | null = null;
  let particles: THREE.Points | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let raf = 0;
  let running = true;
  let io: IntersectionObserver | null = null;
  let scroll = 0;
  let px = 0;
  let py = 0;
  let cpx = 0;
  let cpy = 0;
  let disposed = false;

  const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const colorA = new THREE.Color(primary || "#7c7cff");
  const colorB = new THREE.Color(accent || "#5fd0ff");

  let initFailed = false;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    initFailed = true;
  }
  if (initFailed || !renderer) {
    // WebGL unavailable — leave the CSS fallback background visible.
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a12, 0.06);

  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  // Displaced wireform: high-frequency icosahedron displaced along normals.
  const geo = new THREE.IcosahedronGeometry(2.2, 40);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    wireframe: true,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
    },
    vertexShader: SHADERS.vertex,
    fragmentShader: SHADERS.fragment,
  });
  wireform = new THREE.Mesh(geo, mat);
  wireform.scale.setScalar(1.1);
  scene.add(wireform);

  // Particle field — drifting starfield.
  const count = 1800;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 18;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(p) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    positions[i * 3 + 2] = r * Math.cos(p) - 6;
    sizes[i] = Math.random() * 1.6 + 0.3;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pgeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const pmat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: colorA },
    },
    vertexShader: SHADERS.particleVertex,
    fragmentShader: SHADERS.particleFragment,
  });
  particles = new THREE.Points(pgeo, pmat);
  scene.add(particles);

  const resize = () => {
    if (!renderer || !camera) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const uOf = (m: THREE.Material | THREE.Material[], k: string): number => {
    const single = Array.isArray(m) ? m[0] : m;
    const u = (single as THREE.ShaderMaterial).uniforms?.[k]?.value;
    return typeof u === "number" ? u : 0;
  };

  const perfStart = performance.now();
  const renderFrame = () => {
    if (!renderer || !camera || !wireform || !particles) return;
    const t = uOf(wireform.material, "uTime") + (performance.now() - perfStart) * 0.001;
    cpx += (px - cpx) * 0.05;
    cpy += (py - cpy) * 0.05;

    const umat = wireform.material as THREE.ShaderMaterial;
    umat.uniforms["uTime"]!.value = t;
    umat.uniforms["uScroll"]!.value = scroll;
    wireform.rotation.y = t * 0.08 + cpx * 0.4;
    wireform.rotation.x = cpy * 0.4;
    wireform.position.z = scroll * 1.6;

    const pumat = particles.material as THREE.ShaderMaterial;
    pumat.uniforms["uTime"]!.value = t;
    particles.rotation.y = t * 0.02;
    particles.rotation.x = cpy * 0.1;

    camera.position.x = cpx * 1.2;
    camera.position.y = cpy * 0.8;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!running || !renderer) return;
    renderFrame();
  };

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    px = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    py = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
  };
  const onScroll = () => {
    scroll = Math.min(window.scrollY / 1000, 4);
  };

  resize();
  onScroll();

  if (reduced) {
    renderFrame();
    return cleanup;
  }

  io = new IntersectionObserver(
    (entries) => {
      running = entries[0]?.isIntersecting ?? false;
    },
    { rootMargin: "120px" },
  );
  io.observe(canvas);
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  canvas.addEventListener("pointermove", onPointer, { passive: true });
  raf = requestAnimationFrame(tick);

  return cleanup;

  function cleanup() {
    if (disposed) return;
    disposed = true;
    running = false;
    cancelAnimationFrame(raf);
    io?.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", onScroll);
    canvas.removeEventListener("pointermove", onPointer);
    wireform?.geometry.dispose();
    disposeMaterial(wireform?.material);
    particles?.geometry.dispose();
    disposeMaterial(particles?.material);
    renderer?.dispose();
  }
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return;
  const list = Array.isArray(material) ? material : [material];
  for (const m of list) m.dispose();
}
