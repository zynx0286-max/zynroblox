import * as THREE from "three";

export interface WebGLSceneOptions {
  reduced: boolean;
}

export function mountWebGLScene(canvas: HTMLCanvasElement, options: WebGLSceneOptions) {
  const reduced = options.reduced;

  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return () => {};
  }
  if (!renderer) return () => {};

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a14);

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Primary color from CSS
  const primaryHex = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  const primary = new THREE.Color(primaryHex || "#7c7cff");

  // Wireframe sphere - the main visual
  const sphereGeometry = new THREE.IcosahedronGeometry(3.2, 24);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: primary,
    wireframe: true,
    transparent: true,
    opacity: 0.8,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.rotation.x = Math.PI / 6;
  scene.add(sphere);

  // Inner glow core
  const coreGeometry = new THREE.IcosahedronGeometry(2.5, 2);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a0a1a,
    transparent: true,
    opacity: 0.95,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(core);

  // Particle field
  const PARTICLE_COUNT = 800;
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = 6 + Math.random() * 8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: primary,
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    mouseY = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  canvas.addEventListener("pointermove", onPointer, { passive: true });

  let time = 0;
  const tick = () => {
    if (!canvas.isConnected) return;

    time += 0.016;

    targetX += (mouseX - targetX) * 0.04;
    targetY += (mouseY - targetY) * 0.04;

    sphere.rotation.y = targetX * 0.8 + time * 0.05;
    sphere.rotation.x = targetY * 0.5 + Math.sin(time * 0.2) * 0.1;
    core.rotation.y = -targetX * 0.6;
    core.rotation.x = targetY * 0.4;

    particles.rotation.y = time * 0.06;
    particles.rotation.x = Math.sin(time * 0.1) * 0.1;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    requestAnimationFrame(tick);
  }

  return () => {
    sphereGeometry.dispose();
    sphereMaterial.dispose();
    coreGeometry.dispose();
    coreMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    renderer.dispose();
  };
}