import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DEVELOPERS } from "@/data/developers";

/**
 * The roster stage — three holographic panels circling a dark core.
 *
 * The carousel auto-rotates so each developer gets a turn at the front, and
 * can be spun by dragging (fine pointers only). The avatar textures are local
 * public Roblox thumbnails, so there is no runtime CORS dependency.
 */

type StageProps = { onReady?: () => void; paused?: boolean };

const PANEL_RADIUS = 4.35;
const PANEL_Y = 2.9;

export default function DeveloperStage({ onReady, paused = false }: StageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);
  const pausedRef = useRef(paused);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    const coarse =
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.35 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x05060a, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.FogExp2(0x05060a, 0.024);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);

    scene.add(new THREE.HemisphereLight(0x7187c9, 0x05060a, 1.3));
    scene.add(new THREE.AmbientLight(0x8e97b6, 0.22));

    const keyLight = new THREE.DirectionalLight(0xdde7ff, 1.3);
    keyLight.position.set(6, 9, 8);
    scene.add(keyLight);

    const coreLight = new THREE.PointLight(0x3c5aff, 24, 20, 2);
    coreLight.position.set(0, 3.1, 0);
    scene.add(coreLight);

    // -----------------------------------------------------------------------
    // Procedural textures
    // -----------------------------------------------------------------------

    const makeTexture = (
      width: number,
      height: number,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
      colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
    ) => {
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = width;
      textureCanvas.height = height;
      const ctx = textureCanvas.getContext("2d");
      if (ctx) draw(ctx, width, height);
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = colorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      return texture;
    };

    const softTexture = makeTexture(
      128,
      128,
      (ctx, w, h) => {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.3, "rgba(255,255,255,0.55)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      },
      THREE.NoColorSpace,
    );

    const floorTexture = makeTexture(1024, 1024, (ctx, w, h) => {
      const rand = seededRandom(0x7a11);
      const center = w / 2;
      const base = ctx.createRadialGradient(center, center, 0, center, center, center);
      base.addColorStop(0, "#0d1322");
      base.addColorStop(0.35, "#090d17");
      base.addColorStop(0.7, "#06080f");
      base.addColorStop(1, "#04050a");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(center, center);

      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * Math.PI * 2;
        const inner = 90;
        const outer = 495;
        ctx.strokeStyle = "rgba(79,105,205,0.1)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
      }

      for (const [radius, width, alpha] of [
        [150, 1, 0.12],
        [290, 1.4, 0.16],
        [430, 1.4, 0.13],
        [495, 2.4, 0.32],
      ] as const) {
        ctx.strokeStyle = `rgba(87,117,232,${alpha})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 96; i++) {
        const angle = (i / 96) * Math.PI * 2;
        const tick = i % 8 === 0 ? 16 : 7;
        ctx.strokeStyle = i % 8 === 0 ? "rgba(114,143,255,0.4)" : "rgba(84,108,196,0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 495, Math.sin(angle) * 495);
        ctx.lineTo(Math.cos(angle) * (495 + tick), Math.sin(angle) * (495 + tick));
        ctx.stroke();
      }

      for (let i = 0; i < 260; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = 40 + rand() * 480;
        const size = 1 + rand() * 2.5;
        ctx.fillStyle = `rgba(120,150,255,${0.04 + rand() * 0.08})`;
        ctx.fillRect(Math.cos(angle) * radius, Math.sin(angle) * radius, size, size);
      }

      ctx.restore();
    });

    const backplateTexture = makeTexture(512, 640, (ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "#111827");
      gradient.addColorStop(0.45, "#090d17");
      gradient.addColorStop(1, "#05070c");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(108,137,255,0.16)";
      ctx.lineWidth = 1;
      ctx.strokeRect(18.5, 18.5, w - 37, h - 37);
      for (let y = 24; y < h; y += 4) {
        ctx.fillStyle = "rgba(130,155,255,0.025)";
        ctx.fillRect(0, y, w, 1);
      }
      const glow = ctx.createRadialGradient(w / 2, h * 0.34, 10, w / 2, h * 0.34, w * 0.5);
      glow.addColorStop(0, "rgba(70,105,255,0.15)");
      glow.addColorStop(1, "rgba(70,105,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    });

    const labelTextures: THREE.Texture[] = [];
    for (let i = 0; i < DEVELOPERS.length; i++) {
      const dev = DEVELOPERS[i];
      if (!dev) continue;
      labelTextures.push(
        makeTexture(1024, 256, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "rgba(118,145,255,0.4)";
          ctx.fillRect(0, 0, w, 2);

          ctx.font = "600 25px 'IBM Plex Mono', monospace";
          ctx.fillStyle = "rgba(151,170,224,0.72)";
          ctx.fillText(`0${i + 1} / ROBLOX PROFILE`, 28, 44);

          ctx.font = "800 70px Archivo, Arial, sans-serif";
          ctx.fillStyle = "#eef1fb";
          ctx.fillText(dev.username.toUpperCase(), 26, 126);

          ctx.font = "500 28px 'IBM Plex Mono', monospace";
          ctx.fillStyle = "rgba(137,158,211,0.8)";
          ctx.fillText(dev.role.toUpperCase(), 28, 174);

          ctx.fillStyle = "#5577ff";
          ctx.fillRect(28, 198, 86, 4);

          if (dev.verified) {
            ctx.font = "600 22px 'IBM Plex Mono', monospace";
            ctx.fillStyle = "rgba(120,151,255,0.9)";
            ctx.fillText("VERIFIED", w - 150, 44);
          }

          void h;
        }),
      );
    }

    // -----------------------------------------------------------------------
    // Platform, core and backdrop
    // -----------------------------------------------------------------------

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(7.5, 7.8, 0.6, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0b0e16,
        roughness: 0.4,
        metalness: 0.72,
      }),
    );
    platform.position.y = -0.3;
    scene.add(platform);

    const floorDisc = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 96),
      new THREE.MeshBasicMaterial({
        map: floorTexture,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.position.y = 0.008;
    scene.add(floorDisc);

    const outerRimMaterial = new THREE.MeshBasicMaterial({
      color: 0x5c7cff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const outerRim = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.018, 6, 160), outerRimMaterial);
    outerRim.rotation.x = -Math.PI / 2;
    outerRim.position.y = 0.014;
    scene.add(outerRim);

    const hubRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x4869ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const hubRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.012, 6, 128), hubRingMaterial);
    hubRing.rotation.x = -Math.PI / 2;
    hubRing.position.y = 0.02;
    scene.add(hubRing);

    const outerFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1 }),
    );
    outerFloor.rotation.x = -Math.PI / 2;
    outerFloor.position.y = -0.62;
    scene.add(outerFloor);

    const backdropMaterial = new THREE.SpriteMaterial({
      map: softTexture,
      color: 0x243a9e,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const backdrop = new THREE.Sprite(backdropMaterial);
    backdrop.scale.set(26, 20, 1);
    backdrop.position.set(0, 4.4, -8);
    scene.add(backdrop);

    const core = new THREE.Group();
    core.position.set(0, 3.1, 0);
    scene.add(core);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2, 1),
      new THREE.MeshBasicMaterial({
        color: 0x3657e8,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
        toneMapped: false,
      }),
    );
    core.add(wire);

    const coreInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({
        color: 0x0a0e18,
        metalness: 0.8,
        roughness: 0.22,
        emissive: 0x1b3299,
        emissiveIntensity: 1.6,
      }),
    );
    core.add(coreInner);

    const coreRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x6f8dff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const coreRings: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6 + i * 0.34, 0.011, 6, 96),
        coreRingMaterial,
      );
      ring.rotation.set(1.15 + i * 0.6, 0.25 + i * 0.8, 0.4);
      core.add(ring);
      coreRings.push(ring);
    }

    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: softTexture,
        color: 0x2d4cff,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    coreGlow.scale.set(7.5, 7.5, 1);
    core.add(coreGlow);

    const pillar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 11),
      new THREE.MeshBasicMaterial({
        map: softTexture,
        color: 0x233a9e,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    pillar.position.set(0, 4.8, -2.6);
    scene.add(pillar);

    // -----------------------------------------------------------------------
    // Avatar panels
    // -----------------------------------------------------------------------

    const carousel = new THREE.Group();
    scene.add(carousel);

    const frameMaterial = new THREE.MeshBasicMaterial({
      color: 0x7794ff,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x4d6dff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      map: softTexture,
      color: 0x3f60ff,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    const backplateMaterial = new THREE.MeshBasicMaterial({
      map: backplateTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    const avatarGeometry = new THREE.PlaneGeometry(3.6, 3.6);
    const labelGeometry = new THREE.PlaneGeometry(3.2, 0.8);
    const topBarGeometry = new THREE.BoxGeometry(4.02, 0.055, 0.04);
    const sideBarGeometry = new THREE.BoxGeometry(0.055, 4.9, 0.04);
    const cornerGeometry = new THREE.BoxGeometry(0.2, 0.055, 0.04);
    const ringGeometry = new THREE.TorusGeometry(1.15, 0.014, 6, 64);
    const discGeometry = new THREE.CircleGeometry(1.05, 48);
    const beamGeometry = new THREE.CylinderGeometry(0.004, 0.004, 2.35, 6);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x5c7cff,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const discMaterial = new THREE.MeshBasicMaterial({
      color: 0x080d16,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });

    const loader = new THREE.TextureLoader();
    const panelData: { group: THREE.Group; baseY: number; phase: number }[] = [];

    DEVELOPERS.forEach((dev, index) => {
      const angle = (index / DEVELOPERS.length) * Math.PI * 2;
      const group = new THREE.Group();
      group.position.set(Math.sin(angle) * PANEL_RADIUS, PANEL_Y, Math.cos(angle) * PANEL_RADIUS);
      group.rotation.y = angle;

      const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 6.8), innerGlowMaterial);
      halo.position.z = -0.3;
      group.add(halo);

      const backplate = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 4.9), backplateMaterial);
      group.add(backplate);

      const avatarTexture = loader.load(dev.avatar);
      avatarTexture.colorSpace = THREE.SRGBColorSpace;
      avatarTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const avatarMaterial = new THREE.MeshBasicMaterial({
        map: avatarTexture,
        transparent: true,
        alphaTest: 0.01,
        depthWrite: true,
        toneMapped: false,
      });

      const avatarFront = new THREE.Mesh(avatarGeometry, avatarMaterial);
      avatarFront.position.set(0, 0.2, 0.065);
      group.add(avatarFront);

      const avatarBack = new THREE.Mesh(avatarGeometry, avatarMaterial);
      avatarBack.position.set(0, 0.2, -0.065);
      avatarBack.rotation.y = Math.PI;
      group.add(avatarBack);

      const labelTexture = labelTextures[index];
      if (labelTexture) {
        const labelMaterial = new THREE.MeshBasicMaterial({
          map: labelTexture,
          transparent: true,
          alphaTest: 0.01,
          depthWrite: false,
          toneMapped: false,
        });
        const labelFront = new THREE.Mesh(labelGeometry, labelMaterial);
        labelFront.position.set(0, -1.9, 0.07);
        group.add(labelFront);
        const labelBack = new THREE.Mesh(labelGeometry, labelMaterial);
        labelBack.position.set(0, -1.9, -0.07);
        labelBack.rotation.y = Math.PI;
        group.add(labelBack);
      }

      for (const y of [-2.42, 2.42]) {
        const bar = new THREE.Mesh(topBarGeometry, frameMaterial);
        bar.position.set(0, y, 0);
        group.add(bar);
      }
      for (const x of [-1.96, 1.96]) {
        const bar = new THREE.Mesh(sideBarGeometry, frameMaterial);
        bar.position.set(x, 0, 0);
        group.add(bar);
      }
      for (const x of [-1.96, 1.96]) {
        for (const y of [-2.42, 2.42]) {
          const corner = new THREE.Mesh(cornerGeometry, frameMaterial);
          corner.position.set(x, y, 0);
          group.add(corner);
        }
      }

      const topGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.075, 0),
        new THREE.MeshBasicMaterial({
          color: 0x9fb4ff,
          transparent: true,
          opacity: 0.9,
          toneMapped: false,
        }),
      );
      topGem.position.set(0, 2.64, 0);
      group.add(topGem);

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -PANEL_Y + 0.38;
      group.add(ring);

      const disc = new THREE.Mesh(discGeometry, discMaterial);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -PANEL_Y + 0.02;
      group.add(disc);

      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.y = -PANEL_Y + 1.55;
      group.add(beam);

      carousel.add(group);
      panelData.push({ group, baseY: PANEL_Y, phase: index * 1.9 });
    });

    // -----------------------------------------------------------------------
    // Stars and dust
    // -----------------------------------------------------------------------

    const starCount = 220;
    const starPositions = new Float32Array(starCount * 3);
    const starRand = seededRandom(0x1f4d);
    for (let i = 0; i < starCount; i++) {
      const angle = starRand() * Math.PI * 2;
      const radius = 14 + starRand() * 18;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = 1.5 + starRand() * 14;
      starPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      map: softTexture,
      color: 0x94a9ef,
      size: 0.09,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      alphaTest: 0.01,
    });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    const dustCount = coarse ? 220 : 360;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSeeds = new Float32Array(dustCount * 2);
    const dustRand = seededRandom(0x3e77);
    for (let i = 0; i < dustCount; i++) {
      const angle = dustRand() * Math.PI * 2;
      const radius = 0.8 + dustRand() * 8.5;
      dustPositions[i * 3] = Math.cos(angle) * radius;
      dustPositions[i * 3 + 1] = 0.4 + dustRand() * 7;
      dustPositions[i * 3 + 2] = Math.sin(angle) * radius;
      dustSeeds[i * 2] = 0.16 + dustRand() * 0.42;
      dustSeeds[i * 2 + 1] = dustRand() * Math.PI * 2;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      map: softTexture,
      color: 0x9db4ff,
      size: 0.075,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      alphaTest: 0.01,
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    // -----------------------------------------------------------------------
    // Interaction and loop
    // -----------------------------------------------------------------------

    let dragging = false;
    let lastPointerX = 0;
    let dragPointer: number | null = null;
    let onScreen = true;
    let pageVisible = document.visibilityState === "visible";
    let running = false;
    let disposed = false;
    let announced = false;
    let animationFrame = 0;
    let frames = 0;
    let elapsed = 0;
    let intro = reduceMotion ? 1 : 0;
    let loopError: string | null = null;
    let lastFrame = performance.now();

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      dragging = true;
      dragPointer = event.pointerId;
      lastPointerX = event.clientX;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointers (and some browser edge cases) have no active
        // capture target; dragging still works without it.
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragPointer) return;
      const dx = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      carousel.rotation.y += dx * 0.006;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragPointer) return;
      dragging = false;
      dragPointer = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onBlur = () => {
      dragging = false;
      dragPointer = null;
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const aspect = width / height;
      const portrait = aspect < 0.95;
      renderer.setSize(width, height, false);
      camera.aspect = aspect;
      camera.fov = portrait ? 48 : 42;
      camera.position.set(0, portrait ? 6 : 5, portrait ? 17.5 : 12.8);
      camera.updateProjectionMatrix();
      camera.lookAt(0, portrait ? 2.5 : 2.7, 0);
    };

    const update = (dt: number) => {
      // The roster rotation is the point of the stage, so it keeps moving even
      // when the OS asks for reduced motion; the decorative motion below does not.
      if (!dragging && !pausedRef.current) carousel.rotation.y += dt * 0.19;

      intro = Math.min(1, intro + dt / 1.2);
      const ease = 1 - Math.pow(1 - intro, 3);
      carousel.scale.setScalar(0.94 + ease * 0.06);

      if (!reduceMotion) {
        for (let i = 0; i < panelData.length; i++) {
          const panel = panelData[i];
          if (!panel) continue;
          panel.group.position.y = panel.baseY + Math.sin(elapsed * 0.75 + panel.phase) * 0.055;
          panel.group.rotation.z = Math.sin(elapsed * 0.5 + panel.phase) * 0.006;
        }

        core.rotation.y += dt * 0.12;
        coreRings.forEach((ring, i) => {
          ring.rotation.z += dt * (i === 0 ? 0.12 : -0.09);
        });
      }

      if (!reduceMotion) {
        const positions = dustGeometry.getAttribute("position") as THREE.BufferAttribute;
        const array = positions.array as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          const speed = dustSeeds[i * 2] ?? 0.2;
          const phase = dustSeeds[i * 2 + 1] ?? 0;
          const index = i * 3;
          const nextY = (array[index + 1] ?? 0) + speed * dt;
          array[index + 1] = nextY;
          array[index] = (array[index] ?? 0) + Math.sin(elapsed * 0.25 + phase) * 0.003;
          if (nextY > 7.5) {
            array[index + 1] = 0.4;
            array[index] = Math.cos(phase) * (1 + (Math.sin(phase * 2.7) + 1) * 4);
          }
        }
        positions.needsUpdate = true;
      }

      if (!reduceMotion) {
        camera.position.x = Math.sin(elapsed * 0.12) * 0.22;
        camera.lookAt(0, camera.aspect < 0.95 ? 2.5 : 2.7, 0);
      }
    };

    const render = () => {
      renderer.render(scene, camera);
      frames++;
      if (!announced) {
        announced = true;
        onReadyRef.current?.();
      }
    };

    const tick = (now: number) => {
      animationFrame = 0;
      if (!running || disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
      lastFrame = now;
      elapsed += dt;
      try {
        update(dt);
        render();
      } catch (error) {
        loopError = error instanceof Error ? error.message : String(error);
        stop();
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    const canRun = () => !disposed && onScreen && pageVisible;
    const start = () => {
      if (running || !canRun()) return;
      running = true;
      lastFrame = performance.now();
      animationFrame = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const onVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      if (!pageVisible) {
        dragging = false;
        dragPointer = null;
        stop();
      } else {
        start();
      }
    };

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          onScreen = Boolean(entries[0]?.isIntersecting);
          if (!onScreen) stop();
          else start();
        },
        { threshold: 0.01 },
      );
      intersectionObserver.observe(host);
    }

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);

    resize();
    render();
    start();

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const debug = import.meta.env.DEV
      ? {
          getState: () => ({
            rotation: Number(carousel.rotation.y.toFixed(3)),
            frames,
            running,
            onScreen,
            loopError,
            paused: pausedRef.current,
            panels: panelData.length,
          }),
        }
      : null;
    if (debug && import.meta.env.DEV) {
      (window as unknown as { __zynDevelopers?: typeof debug }).__zynDevelopers = debug;
    }

    return () => {
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      if (debug && import.meta.env.DEV) {
        delete (window as unknown as { __zynDevelopers?: typeof debug }).__zynDevelopers;
      }

      const disposedResources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
      scene.traverse((object) => {
        if (
          !(object instanceof THREE.Mesh) &&
          !(object instanceof THREE.Points) &&
          !(object instanceof THREE.Sprite)
        ) {
          return;
        }
        const geometry = object.geometry;
        if (geometry && !disposedResources.has(geometry)) {
          geometry.dispose();
          disposedResources.add(geometry);
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (!material || disposedResources.has(material)) continue;
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture && !disposedResources.has(value)) {
              value.dispose();
              disposedResources.add(value);
            }
          }
          material.dispose();
          disposedResources.add(material);
        }
      });

      renderer.dispose();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 select-none">
      <canvas
        ref={canvasRef}
        aria-label="Auto-rotating 3D stage showing Fondatix, synpletic and prayaIot"
        className="absolute inset-0 block h-full w-full touch-pan-y outline-none"
      />
      {failed ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#05060a]/90 px-6 text-center">
          <div className="max-w-sm">
            <p className="font-mono text-[0.56rem] tracking-[0.2em] text-primary uppercase">
              WebGL unavailable
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              This browser could not open the 3D stage. The full roster and profile links are below.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
