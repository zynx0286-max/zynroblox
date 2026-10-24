import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";

/**
 * The courtyard — ZYN's Roblox avatar as a playable WebGL scene.
 *
 * Three.js is imported only by this lazily-loaded component, so the rest of
 * the site never pays for it. The avatar and environment are procedural: no
 * model downloads, no image textures, no external assets.
 *
 * Controls: WASD / arrows move, Space jumps, drag orbits, wheel zooms.
 * Coarse pointers get a joystick and a jump button instead.
 */

const PROFILE_URL = "https://www.roblox.com/users/1752054483/profile";
const FLOOR_LIMIT = 15;

type JoystickVector = { x: number; y: number };

type TouchControlsProps = {
  joystick: { current: JoystickVector };
  jump: { current: boolean };
};

export default function ProfileScene({ onReady }: { onReady?: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystick = useRef<JoystickVector>({ x: 0, y: 0 });
  const jumpQueued = useRef(false);
  const onReadyRef = useRef(onReady);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const coarse =
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    setCoarsePointer(coarse);
  }, []);

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x08080c, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080c);
    scene.fog = new THREE.FogExp2(0x08080c, 0.032);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 140);

    // -----------------------------------------------------------------------
    // Light
    // -----------------------------------------------------------------------

    scene.add(new THREE.HemisphereLight(0x8d9bc8, 0x07070a, 0.9));
    scene.add(new THREE.AmbientLight(0x8f93a6, 0.28));

    const moonLight = new THREE.DirectionalLight(0xdce5ff, 1.75);
    moonLight.position.set(14, 26, 16);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024);
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 70;
    moonLight.shadow.camera.left = -20;
    moonLight.shadow.camera.right = 20;
    moonLight.shadow.camera.top = 20;
    moonLight.shadow.camera.bottom = -20;
    moonLight.shadow.bias = -0.0006;
    scene.add(moonLight);
    scene.add(moonLight.target);

    // Electric blue rim light ties the courtyard back to the portfolio.
    const rimLight = new THREE.DirectionalLight(0x4d6dff, 1.15);
    rimLight.position.set(-14, 10, -18);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x8da6ff, 14, 24, 2);
    fillLight.position.set(0, 6, 6);
    scene.add(fillLight);

    // -----------------------------------------------------------------------
    // Procedural textures
    // -----------------------------------------------------------------------

    const makeTexture = (
      size: number,
      draw: (ctx: CanvasRenderingContext2D, s: number) => void,
      colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
    ) => {
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = size;
      textureCanvas.height = size;
      const ctx = textureCanvas.getContext("2d");
      if (ctx) draw(ctx, size);
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = colorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      return texture;
    };

    const softTexture = makeTexture(
      128,
      (ctx, s) => {
        const gradient = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.32, "rgba(255,255,255,0.6)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, s, s);
      },
      THREE.NoColorSpace,
    );

    const stoneTexture = makeTexture(1024, (ctx, s) => {
      const rand = seededRandom(0x51a7);
      const base = ctx.createLinearGradient(0, 0, s, s);
      base.addColorStop(0, "#1b1b22");
      base.addColorStop(0.55, "#121218");
      base.addColorStop(1, "#0b0b0f");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);

      for (let i = 0; i < 5200; i++) {
        const value = 18 + Math.floor(rand() * 34);
        ctx.fillStyle = `rgba(${value},${value},${value + 5},${0.03 + rand() * 0.06})`;
        const size = 1 + rand() * 3;
        ctx.fillRect(rand() * s, rand() * s, size, size);
      }

      ctx.strokeStyle = "rgba(4,4,7,0.8)";
      ctx.lineWidth = 5;
      const tiles = 6;
      for (let i = 0; i <= tiles; i++) {
        const p = (i / tiles) * s + (rand() - 0.5) * 12;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
      }

      ctx.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.18 + rand() * 0.28})`;
        let x = rand() * s;
        let y = rand() * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let step = 0; step < 5; step++) {
          x += (rand() - 0.5) * 42;
          y += rand() * 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.repeat.set(12, 12);

    const shirtFrontTexture = makeTexture(512, (ctx, s) => {
      const rand = seededRandom(0x0f2a);
      ctx.fillStyle = "#0b0b0f";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2400; i++) {
        ctx.fillStyle = `rgba(255,255,255,${rand() * 0.022})`;
        ctx.fillRect(rand() * s, rand() * s, 1, 1 + rand() * 2);
      }

      // Pale polo collar and open neck.
      ctx.strokeStyle = "#c9c9d2";
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(s * 0.22, -10);
      ctx.lineTo(s * 0.5, s * 0.28);
      ctx.lineTo(s * 0.78, -10);
      ctx.stroke();
      ctx.fillStyle = "#08080b";
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -5);
      ctx.lineTo(s * 0.5, s * 0.22);
      ctx.lineTo(s * 0.7, -5);
      ctx.fill();

      ctx.fillStyle = "#26262f";
      ctx.fillRect(s * 0.49, s * 0.2, 6, s * 0.28);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#b9b9c4";
        ctx.beginPath();
        ctx.arc(s * 0.5, s * (0.25 + i * 0.07), 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gold crest on the chest.
      ctx.strokeStyle = "#c4a75e";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(s * 0.29, s * 0.44, 27, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#0b0b0f";
      ctx.beginPath();
      ctx.arc(s * 0.29, s * 0.44, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c4a75e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s * 0.29, s * 0.405);
      ctx.lineTo(s * 0.29, s * 0.475);
      ctx.moveTo(s * 0.265, s * 0.43);
      ctx.lineTo(s * 0.315, s * 0.43);
      ctx.stroke();

      // NEW YORK across the lower chest.
      ctx.fillStyle = "#ebebf0";
      ctx.font = "bold 44px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NEW YORK", s / 2, s * 0.82);
      ctx.fillStyle = "rgba(235,235,240,0.5)";
      ctx.fillRect(s * 0.34, s * 0.865, s * 0.32, 2);
    });

    const shirtBackTexture = makeTexture(512, (ctx, s) => {
      ctx.fillStyle = "#0b0b0f";
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(190,190,205,0.18)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.22);
      ctx.lineTo(s * 0.5, s * 0.72);
      ctx.moveTo(s * 0.35, s * 0.4);
      ctx.lineTo(s * 0.65, s * 0.4);
      ctx.stroke();
      ctx.strokeStyle = "rgba(190,190,205,0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.16);
      ctx.lineTo(s * 0.5, s * 0.8);
      ctx.stroke();
    });

    const pantsTexture = makeTexture(256, (ctx, s) => {
      const rand = seededRandom(0x77c1);
      ctx.fillStyle = "#1b1b22";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1800; i++) {
        const value = 25 + Math.floor(rand() * 26);
        ctx.fillStyle = `rgba(${value},${value},${value + 6},${0.12 + rand() * 0.2})`;
        ctx.fillRect(rand() * s, rand() * s, 1, 1);
      }
      ctx.strokeStyle = "rgba(80,80,96,0.38)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(12, s);
      ctx.moveTo(s - 12, 0);
      ctx.lineTo(s - 12, s);
      ctx.stroke();
      ctx.strokeStyle = "rgba(10,10,14,0.7)";
      ctx.beginPath();
      ctx.moveTo(s / 2, 0);
      ctx.lineTo(s / 2, s);
      ctx.stroke();
      ctx.strokeStyle = "rgba(110,110,128,0.24)";
      ctx.strokeRect(24, 30, 70, 70);
    });

    const faceTexture = makeTexture(512, (ctx, s) => {
      const face = ctx.createRadialGradient(s * 0.5, s * 0.42, 20, s * 0.5, s * 0.5, s * 0.7);
      face.addColorStop(0, "#ececf2");
      face.addColorStop(0.68, "#dedee7");
      face.addColorStop(1, "#bcbcc9");
      ctx.fillStyle = face;
      ctx.fillRect(0, 0, s, s);

      // Smoky eye sockets.
      ctx.fillStyle = "rgba(38,36,44,0.7)";
      ctx.beginPath();
      ctx.ellipse(s * 0.32, s * 0.4, 50, 27, -0.05, 0, Math.PI * 2);
      ctx.ellipse(s * 0.68, s * 0.4, 50, 27, 0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#0b0b0f";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.36);
      ctx.quadraticCurveTo(s * 0.32, s * 0.32, s * 0.43, s * 0.37);
      ctx.moveTo(s * 0.57, s * 0.37);
      ctx.quadraticCurveTo(s * 0.68, s * 0.32, s * 0.8, s * 0.36);
      ctx.stroke();

      for (const x of [s * 0.32, s * 0.68]) {
        ctx.fillStyle = "#7e1d2a";
        ctx.beginPath();
        ctx.arc(x, s * 0.41, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c83446";
        ctx.beginPath();
        ctx.arc(x, s * 0.41, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#09090c";
        ctx.beginPath();
        ctx.arc(x, s * 0.41, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(x - 5, s * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nose and mouth.
      ctx.strokeStyle = "rgba(70,65,78,0.4)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.47);
      ctx.lineTo(s * 0.49, s * 0.56);
      ctx.lineTo(s * 0.52, s * 0.57);
      ctx.stroke();

      ctx.strokeStyle = "#1a1419";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(s * 0.38, s * 0.68);
      ctx.quadraticCurveTo(s * 0.5, s * 0.74, s * 0.62, s * 0.68);
      ctx.stroke();

      ctx.fillStyle = "#0a0a0d";
      ctx.beginPath();
      ctx.ellipse(s * 0.5, s * 0.7, 39, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      for (const x of [s * 0.43, s * 0.57]) {
        ctx.fillStyle = "#f4f4f7";
        ctx.beginPath();
        ctx.moveTo(x - 7, s * 0.675);
        ctx.lineTo(x + 3, s * 0.745);
        ctx.lineTo(x + 10, s * 0.672);
        ctx.fill();
      }

      // A small stitched scar under the right eye.
      ctx.strokeStyle = "rgba(90,80,92,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.72, s * 0.55);
      ctx.lineTo(s * 0.79, s * 0.6);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const t = i / 2;
        const x = s * (0.72 + t * 0.07);
        const y = s * (0.55 + t * 0.05);
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 4);
        ctx.lineTo(x + 4, y + 4);
        ctx.stroke();
      }
    });

    // -----------------------------------------------------------------------
    // Floor and ritual rings
    // -----------------------------------------------------------------------

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.93, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x5572c9,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    for (const [radius, width, opacity] of [
      [4.65, 0.08, 0.28],
      [6.9, 0.035, 0.1],
    ] as const) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + width, 128),
        ringMaterial.clone(),
      );
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      scene.add(ring);
    }

    // -----------------------------------------------------------------------
    // Gothic arches, crosses and moon
    // -----------------------------------------------------------------------

    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b1b22,
      roughness: 0.9,
      metalness: 0.08,
    });
    const crossMaterial = new THREE.MeshStandardMaterial({
      color: 0x15151b,
      roughness: 0.32,
      metalness: 0.78,
    });
    const gemMaterial = new THREE.MeshStandardMaterial({
      color: 0x24356b,
      emissive: 0x264aff,
      emissiveIntensity: 1.4,
      roughness: 0.22,
      metalness: 0.5,
    });

    const makeArch = () => {
      const group = new THREE.Group();
      const columnGeometry = new THREE.BoxGeometry(1.1, 7.5, 1.1);
      for (const side of [-1, 1]) {
        const column = new THREE.Mesh(columnGeometry, stoneMaterial);
        column.position.set(side * 2.8, 3.75, 0);
        group.add(column);

        const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.7), stoneMaterial);
        base.position.set(side * 2.8, 0.25, 0);
        group.add(base);

        const capital = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.6), stoneMaterial);
        capital.position.set(side * 2.8, 7.45, 0);
        group.add(capital);
      }

      const beamGeometry = new THREE.BoxGeometry(4.2, 0.58, 0.85);
      for (const side of [-1, 1]) {
        const beam = new THREE.Mesh(beamGeometry, stoneMaterial);
        beam.position.set(side * 1.45, 8.45, 0);
        beam.rotation.z = side * 0.66;
        group.add(beam);
      }

      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 4), stoneMaterial);
      finial.position.set(0, 10.1, 0);
      finial.rotation.y = Math.PI / 4;
      group.add(finial);

      return group;
    };

    for (const [x, z, scale, rotY] of [
      [-9.5, -14, 1.15, 0.12],
      [0, -17, 1.3, 0],
      [9.5, -14, 1.15, -0.12],
    ] as const) {
      const arch = makeArch();
      arch.position.set(x, 0, z);
      arch.scale.setScalar(scale);
      arch.rotation.y = rotY;
      scene.add(arch);
    }

    const makeCross = (scale: number) => {
      const group = new THREE.Group();

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.5, 0.28), crossMaterial);
      post.castShadow = true;
      group.add(post);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.36, 0.28), crossMaterial);
      arm.position.y = 0.78;
      arm.castShadow = true;
      group.add(arm);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.055, 8, 32), crossMaterial);
      ring.position.y = 0.78;
      group.add(ring);

      const flareGeometry = new THREE.ConeGeometry(0.24, 0.58, 4);
      for (const [x, y, rot] of [
        [-1.33, 0.78, Math.PI / 2],
        [1.33, 0.78, -Math.PI / 2],
        [0, 2.45, 0],
        [0, -2.45, Math.PI],
      ] as const) {
        const flare = new THREE.Mesh(flareGeometry, crossMaterial);
        flare.position.set(x, y, 0);
        flare.rotation.z = rot;
        group.add(flare);
      }

      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), gemMaterial);
      gem.position.set(0, 0.78, 0.17);
      group.add(gem);

      group.scale.setScalar(scale);
      return group;
    };

    const crosses: { group: THREE.Group; baseY: number; phase: number }[] = [];
    for (const [x, y, z, scale, rotY, phase] of [
      [-7.4, 2.5, -6, 1.0, 0.35, 0.4],
      [7.2, 3.1, -7.2, 1.16, -0.42, 2.1],
      [-11.2, 3.4, -11.5, 1.25, 0.15, 4.2],
      [11.5, 2.9, -12.5, 1.05, -0.28, 1.2],
      [-4.2, 2.1, -13.5, 0.8, 0.6, 5.1],
      [4.6, 3.7, -15.5, 1.0, -0.55, 3.4],
      [0, 4.4, -19.5, 1.45, 0, 0.9],
      [-9.5, 3.1, 1.5, 1.15, 0.65, 2.8],
      [9.8, 3.6, 0.5, 1.25, -0.7, 4.8],
    ] as const) {
      const group = makeCross(scale);
      group.position.set(x, y, z);
      group.rotation.y = rotY;
      scene.add(group);
      crosses.push({ group, baseY: y, phase });
    }

    // Moon halo (outside the fog so it stays as a backdrop).
    const moonMaterial = new THREE.SpriteMaterial({
      map: softTexture,
      color: 0xb7c6ea,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const moon = new THREE.Sprite(moonMaterial);
    moon.scale.set(23, 23, 1);
    moon.position.set(-7, 15, -32);
    scene.add(moon);

    const moonCore = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 48),
      new THREE.MeshBasicMaterial({
        color: 0xcdd7f2,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    moonCore.position.set(-7, 15, -31.9);
    scene.add(moonCore);

    // Low drifting mist.
    const mists: THREE.Sprite[] = [];
    const mistBaseOpacity = [0.075, 0.045, 0.06, 0.035];
    for (let i = 0; i < 4; i++) {
      const material = new THREE.SpriteMaterial({
        map: softTexture,
        color: 0x8390b5,
        transparent: true,
        opacity: mistBaseOpacity[i] ?? 0.04,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mist = new THREE.Sprite(material);
      mist.scale.set(24, 10, 1);
      mist.position.set(i % 2 === 0 ? -7 : 8, 2 + i * 0.4, -6 - i * 4);
      scene.add(mist);
      mists.push(mist);
    }

    // -----------------------------------------------------------------------
    // Drifting ash
    // -----------------------------------------------------------------------

    const emberCount = coarse ? 320 : 540;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberSeeds = new Float32Array(emberCount * 2);
    const emberRand = seededRandom(0x20dd);
    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (emberRand() - 0.5) * 42;
      emberPositions[i * 3 + 1] = emberRand() * 18;
      emberPositions[i * 3 + 2] = (emberRand() - 0.5) * 42 - 5;
      emberSeeds[i * 2] = 0.25 + emberRand() * 0.55;
      emberSeeds[i * 2 + 1] = emberRand() * Math.PI * 2;
    }
    const emberGeometry = new THREE.BufferGeometry();
    emberGeometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
    const emberMaterial = new THREE.PointsMaterial({
      map: softTexture,
      color: 0xb9c7e8,
      size: coarse ? 0.2 : 0.15,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      alphaTest: 0.01,
    });
    const embers = new THREE.Points(emberGeometry, emberMaterial);
    scene.add(embers);

    // -----------------------------------------------------------------------
    // Avatar
    // -----------------------------------------------------------------------

    const rig = buildAvatar(shirtFrontTexture, shirtBackTexture, pantsTexture, faceTexture);

    // -----------------------------------------------------------------------
    // Input
    // -----------------------------------------------------------------------

    const keys = new Set<string>();
    let dragging = false;
    let dragPointer: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "ArrowDown" ||
        event.code === "ArrowLeft" ||
        event.code === "ArrowRight"
      ) {
        event.preventDefault();
      }
      keys.add(event.code);
      if (event.code === "Space" && !event.repeat) jumpQueued.current = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragPointer = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragPointer) return;
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      camYaw -= dx * 0.006;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.005, 0.06, 1.15);
      canvas.dataset["interacted"] = "true";
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragPointer) return;
      dragging = false;
      dragPointer = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camDist = THREE.MathUtils.clamp(camDist + event.deltaY * 0.01, 5.5, 18);
      canvas.dataset["interacted"] = "true";
    };

    // -----------------------------------------------------------------------
    // Scene state
    // -----------------------------------------------------------------------

    const state = {
      pos: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(),
      yaw: 0,
      targetYaw: 0,
      verticalVelocity: 0,
      grounded: true,
      walk: 0,
    };

    let camYaw = 0.42;
    let camPitch = 0.2;
    let camDist = 10.4;
    let intro = reduceMotion ? 1 : 0;
    const followPos = state.pos.clone();

    const clock = new THREE.Clock();
    let elapsed = 0;
    let frames = 0;
    let announced = false;
    let running = false;
    let onScreen = true;
    let pageVisible = document.visibilityState === "visible";
    let disposed = false;
    let animationFrame = 0;
    let loopError: string | null = null;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const update = (dt: number) => {
      const forwardInput =
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
        (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        joystick.current.y;
      const rightInput =
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) +
        joystick.current.x;

      let inputX = rightInput;
      let inputZ = forwardInput;
      const length = Math.hypot(inputX, inputZ);
      if (length > 1) {
        inputX /= length;
        inputZ /= length;
      }

      const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
      const move = new THREE.Vector3()
        .addScaledVector(forward, inputZ)
        .addScaledVector(right, inputX);

      const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const speed = sprinting ? 7.8 : 4.6;
      const targetVelocity = move.multiplyScalar(speed);
      state.velocity.lerp(targetVelocity, 1 - Math.exp(-12 * dt));
      if (state.velocity.lengthSq() < 0.0004) state.velocity.set(0, 0, 0);

      state.pos.addScaledVector(state.velocity, dt);
      const radius = Math.hypot(state.pos.x, state.pos.z);
      if (radius > FLOOR_LIMIT) {
        state.pos.x = (state.pos.x / radius) * FLOOR_LIMIT;
        state.pos.z = (state.pos.z / radius) * FLOOR_LIMIT;
      }

      const moving = state.velocity.lengthSq() > 0.08;
      if (moving) {
        state.targetYaw = Math.atan2(state.velocity.x, state.velocity.z);
      }
      let yawDelta = state.targetYaw - state.yaw;
      yawDelta = ((((yawDelta + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
      state.yaw += yawDelta * Math.min(1, 14 * dt);

      if (jumpQueued.current) {
        jumpQueued.current = false;
        if (state.grounded) {
          state.verticalVelocity = 9.2;
          state.grounded = false;
        }
      }

      if (!state.grounded) {
        state.verticalVelocity -= 26 * dt;
        state.pos.y += state.verticalVelocity * dt;
        if (state.pos.y <= 0) {
          state.pos.y = 0;
          state.verticalVelocity = 0;
          state.grounded = true;
        }
      }

      rig.character.position.copy(state.pos);
      rig.character.rotation.y = state.yaw;

      const damp = THREE.MathUtils.damp;
      if (!state.grounded) {
        rig.armL.rotation.x = damp(rig.armL.rotation.x, -0.9, 10, dt);
        rig.armR.rotation.x = damp(rig.armR.rotation.x, -0.9, 10, dt);
        rig.legL.rotation.x = damp(rig.legL.rotation.x, 0.35, 10, dt);
        rig.legR.rotation.x = damp(rig.legR.rotation.x, -0.25, 10, dt);
        rig.upper.position.y = 0;
      } else if (moving) {
        state.walk += dt * (sprinting ? 13 : 9) * Math.min(1, state.velocity.length() / 4);
        const swing = Math.sin(state.walk) * (sprinting ? 0.9 : 0.64);
        rig.armL.rotation.x = swing;
        rig.armR.rotation.x = -swing;
        rig.legL.rotation.x = -swing * 1.1;
        rig.legR.rotation.x = swing * 1.1;
        rig.upper.position.y = Math.abs(Math.sin(state.walk * 2)) * 0.045;
        rig.head.rotation.z = Math.sin(state.walk) * 0.02;
      } else {
        rig.armL.rotation.x = damp(rig.armL.rotation.x, 0, 8, dt);
        rig.armR.rotation.x = damp(rig.armR.rotation.x, 0, 8, dt);
        rig.legL.rotation.x = damp(rig.legL.rotation.x, 0, 8, dt);
        rig.legR.rotation.x = damp(rig.legR.rotation.x, 0, 8, dt);
        rig.upper.position.y = reduceMotion ? 0 : Math.sin(elapsed * 1.6) * 0.018;
        rig.head.rotation.z = damp(rig.head.rotation.z, 0, 6, dt);
      }

      followPos.lerp(state.pos, 1 - Math.exp(-9 * dt));
      intro = Math.min(1, intro + dt / 1.3);
      const introEase = 1 - Math.pow(1 - intro, 3);
      const distance = camDist + (1 - introEase) * 3.2;
      const horizontal = Math.cos(camPitch) * distance;
      camera.position.set(
        followPos.x + Math.sin(camYaw) * horizontal,
        Math.max(0.7, followPos.y + 3.55 + Math.sin(camPitch) * distance),
        followPos.z + Math.cos(camYaw) * horizontal,
      );
      camera.lookAt(followPos.x, followPos.y + 3.15, followPos.z);

      if (!reduceMotion) {
        for (const cross of crosses) {
          cross.group.position.y = cross.baseY + Math.sin(elapsed * 0.55 + cross.phase) * 0.22;
          cross.group.rotation.y += dt * 0.035;
        }

        const positions = emberGeometry.getAttribute("position") as THREE.BufferAttribute;
        const array = positions.array as Float32Array;
        for (let i = 0; i < emberCount; i++) {
          const speed = emberSeeds[i * 2] ?? 0.4;
          const phase = emberSeeds[i * 2 + 1] ?? 0;
          const index = i * 3;
          const nextY = (array[index + 1] ?? 0) + speed * dt;
          array[index + 1] = nextY;
          array[index] = (array[index] ?? 0) + Math.sin(elapsed * 0.35 + phase) * 0.05 * dt;
          if (nextY > 19) {
            array[index + 1] = 0.2;
            array[index] = (Math.sin(phase * 7.3) * 0.5 + 0.5) * 42 - 21;
          }
        }
        positions.needsUpdate = true;

        for (let i = 0; i < mists.length; i++) {
          const mist = mists[i];
          if (!mist) continue;
          mist.position.x += Math.sin(elapsed * 0.08 + i) * 0.004;
        }
      }
    };

    const render = () => {
      renderer.render(scene, camera);
      frames++;
      if (!announced) {
        announced = true;
        setReady(true);
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

    let lastFrame = performance.now();
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

    const resetInput = () => {
      keys.clear();
      dragging = false;
      dragPointer = null;
      joystick.current = { x: 0, y: 0 };
    };

    const onVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      if (!pageVisible) {
        resetInput();
        stop();
      } else {
        start();
      }
    };

    const onBlur = () => {
      resetInput();
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
    camera.position.set(0, 5.9, 10.4);
    camera.lookAt(0, 3.15, 0);
    render();
    start();

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("lostpointercapture", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Dev-only handle: lets the browser tests inspect the avatar without
    // shipping a debug surface to production (Vite eliminates the branch).
    const debug = import.meta.env.DEV
      ? {
          getState: () => ({
            x: Number(state.pos.x.toFixed(3)),
            y: Number(state.pos.y.toFixed(3)),
            z: Number(state.pos.z.toFixed(3)),
            yaw: Number(state.yaw.toFixed(3)),
            camYaw: Number(camYaw.toFixed(3)),
            camPitch: Number(camPitch.toFixed(3)),
            camDist: Number(camDist.toFixed(3)),
            frames,
            running,
            onScreen,
            pageVisible,
            loopError,
          }),
        }
      : null;
    if (debug && import.meta.env.DEV) {
      (window as unknown as { __zynProfile?: typeof debug }).__zynProfile = debug;
    }

    return () => {
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("lostpointercapture", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      if (debug && import.meta.env.DEV) {
        delete (window as unknown as { __zynProfile?: typeof debug }).__zynProfile;
      }

      const disposedResources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh | THREE.Points | THREE.Sprite;
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Points ||
          object instanceof THREE.Sprite
        ) {
          if (renderable.geometry && !disposedResources.has(renderable.geometry)) {
            renderable.geometry.dispose();
            disposedResources.add(renderable.geometry);
          }
          const materials = Array.isArray(renderable.material)
            ? renderable.material
            : [renderable.material];
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
        }
      });

      renderer.dispose();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 select-none">
      <canvas
        ref={canvasRef}
        aria-label="Interactive 3D courtyard with ZYN's Roblox avatar"
        className="absolute inset-0 block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />

      {failed ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#08080c] px-6 text-center">
          <div className="max-w-sm">
            <p className="font-mono text-[0.58rem] tracking-[0.2em] text-primary uppercase">
              WebGL unavailable
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.04em] text-white">
              The courtyard needs a WebGL browser.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Enable hardware acceleration or open this page in a recent browser. The profile is
              still available on Roblox.
            </p>
            <a
              href={PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 font-mono text-[0.58rem] tracking-[0.14em] text-white uppercase transition-colors hover:border-primary/60"
            >
              Open Roblox profile
            </a>
          </div>
        </div>
      ) : null}

      {coarsePointer && !failed ? <TouchControls joystick={joystick} jump={jumpQueued} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function buildAvatar(
  shirtFrontTexture: THREE.Texture,
  shirtBackTexture: THREE.Texture,
  pantsTexture: THREE.Texture,
  faceTexture: THREE.Texture,
) {
  const character = new THREE.Group();
  const upper = new THREE.Group();
  character.add(upper);

  const skin = new THREE.MeshStandardMaterial({ color: 0xd9d9e2, roughness: 0.64 });
  const shirtSide = new THREE.MeshStandardMaterial({ color: 0x0b0b0f, roughness: 0.9 });
  const shirtFront = new THREE.MeshStandardMaterial({ map: shirtFrontTexture, roughness: 0.86 });
  const shirtBack = new THREE.MeshStandardMaterial({ map: shirtBackTexture, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ map: pantsTexture, roughness: 0.93 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x08080b, roughness: 0.9 });
  const hat = new THREE.MeshStandardMaterial({ color: 0x070709, roughness: 0.78 });
  const horn = new THREE.MeshStandardMaterial({
    color: 0x0b0b0e,
    roughness: 0.34,
    metalness: 0.35,
  });
  const boot = new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.72 });
  const silver = new THREE.MeshStandardMaterial({
    color: 0xb6bac7,
    metalness: 0.9,
    roughness: 0.24,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), [
    shirtSide,
    shirtSide,
    shirtSide,
    shirtSide,
    shirtFront,
    shirtBack,
  ]);
  torso.position.y = 3;
  torso.castShadow = true;
  upper.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(2.03, 0.17, 1.03), hair);
  belt.position.y = 2.06;
  upper.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.19, 0.06), silver);
  buckle.position.set(0, 2.06, 0.54);
  upper.add(buckle);

  const head = new THREE.Group();
  head.position.y = 4.6;
  upper.add(head);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.16, 1.16), [
    skin,
    skin,
    skin,
    skin,
    new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.62 }),
    skin,
  ]);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Messy fringe and sideburns.
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.36, 1.25), hair);
  hairCap.position.set(0, 0.56, 0.01);
  head.add(hairCap);

  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.82, 0.34), hair);
  hairBack.position.set(0, 0.16, -0.54);
  head.add(hairBack);

  for (const side of [-1, 1]) {
    const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.82, 1.08), hair);
    sideburn.position.set(side * 0.62, 0.12, 0.02);
    head.add(sideburn);
  }

  const fringeGeometry = new THREE.BoxGeometry(0.2, 0.58, 0.13);
  for (let i = 0; i < 7; i++) {
    const strand = new THREE.Mesh(fringeGeometry, hair);
    const x = -0.46 + i * 0.154;
    strand.position.set(x, 0.3 - Math.abs(x) * 0.18, 0.62);
    strand.rotation.z = (i - 3) * 0.11;
    strand.scale.y = 0.8 + ((i * 37) % 5) * 0.08;
    strand.castShadow = true;
    head.add(strand);
  }
  const longBang = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.92, 0.12), hair);
  longBang.position.set(0.32, 0.03, 0.63);
  longBang.rotation.z = 0.34;
  head.add(longBang);

  // Necklace: a thin chain and a tiny cross pendant.
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 24), silver);
  chain.rotation.x = Math.PI / 2;
  chain.position.y = 4.03;
  upper.add(chain);
  const pendantV = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.03), silver);
  pendantV.position.set(0, 3.72, 0.52);
  upper.add(pendantV);
  const pendantH = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.03), silver);
  pendantH.position.set(0, 3.76, 0.52);
  upper.add(pendantH);

  // Hat with a crooked crown and thorned horns.
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 0.6, 0.02);
  hatGroup.rotation.z = -0.07;
  hatGroup.rotation.x = 0.04;
  head.add(hatGroup);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.08, 32), hat);
  brim.castShadow = true;
  hatGroup.add(brim);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.08, 0.22, 32), horn);
  band.position.y = 0.12;
  hatGroup.add(band);
  const hatBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.04), silver);
  hatBuckle.position.set(0, 0.12, 1.03);
  hatGroup.add(hatBuckle);

  const lowerCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.98, 1.95, 32), hat);
  lowerCrown.position.y = 0.98;
  lowerCrown.castShadow = true;
  hatGroup.add(lowerCrown);

  const upperCrown = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.95, 24), hat);
  upperCrown.position.set(-0.12, 2.05, 0);
  upperCrown.rotation.z = 0.34;
  upperCrown.castShadow = true;
  hatGroup.add(upperCrown);

  const makeHorn = (side: number) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.78, 0.12, 0.12),
      new THREE.Vector3(side * 1.2, 0.62, 0.04),
      new THREE.Vector3(side * 1.47, 1.3, -0.1),
      new THREE.Vector3(side * 1.36, 2.05, -0.36),
      new THREE.Vector3(side * 1.12, 2.55, -0.56),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 26, 0.085, 6, false), horn);
    tube.castShadow = true;
    hatGroup.add(tube);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 8), horn);
    const end = curve.getPointAt(1);
    const tangent = curve.getTangentAt(1).normalize();
    tip.position.copy(end);
    tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    hatGroup.add(tip);

    for (let i = 0; i < 2; i++) {
      const t = 0.38 + i * 0.25;
      const point = curve.getPointAt(t);
      const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), horn);
      thorn.position.set(point.x + side * 0.1, point.y, point.z - 0.06);
      thorn.rotation.z = side * -0.9;
      thorn.rotation.x = 0.3;
      hatGroup.add(thorn);
    }
  };
  makeHorn(-1);
  makeHorn(1);

  // Arms with pale hands.
  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.45, 3.84, 0);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.62, 0.94), shirtSide);
    sleeve.position.y = -0.76;
    sleeve.castShadow = true;
    pivot.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.12, 0.99), hair);
    cuff.position.y = -1.5;
    pivot.add(cuff);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.4, 0.78), skin);
    hand.position.y = -1.76;
    hand.castShadow = true;
    pivot.add(hand);
    upper.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Legs with boots.
  const makeLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.5, 2, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.94, 2, 0.94), pants);
    leg.position.y = -1;
    leg.castShadow = true;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.3, 1.28), boot);
    shoe.position.set(0, -1.85, 0.14);
    shoe.castShadow = true;
    pivot.add(shoe);
    character.add(pivot);
    return pivot;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  character.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = true;
  });

  return { character, upper, head, armL, armR, legL, legR };
}

// ---------------------------------------------------------------------------
// Touch controls
// ---------------------------------------------------------------------------

function TouchControls({ joystick, jump }: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointer = useRef<number | null>(null);

  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    const knob = knobRef.current;
    if (!pad || !knob) return;
    const rect = pad.getBoundingClientRect();
    const radius = rect.width / 2 - 18;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }
    joystick.current = { x: dx / radius, y: dy / radius };
    knob.style.transition = "none";
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const release = () => {
    activePointer.current = null;
    joystick.current = { x: 0, y: 0 };
    if (knobRef.current) {
      knobRef.current.style.transition = "transform 140ms ease-out";
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
  };

  return (
    <>
      <div
        ref={padRef}
        role="group"
        aria-label="Movement joystick"
        className="absolute bottom-[max(1.4rem,env(safe-area-inset-bottom))] left-5 z-30 size-32 touch-none rounded-full border border-white/15 bg-black/35 backdrop-blur-md"
        onPointerDown={(event) => {
          event.preventDefault();
          activePointer.current = event.pointerId;
          padRef.current?.setPointerCapture(event.pointerId);
          update(event);
        }}
        onPointerMove={(event) => {
          if (activePointer.current === event.pointerId) update(event);
        }}
        onPointerUp={(event) => {
          if (activePointer.current === event.pointerId) release();
        }}
        onPointerCancel={release}
      >
        <div className="pointer-events-none absolute inset-4 rounded-full border border-white/6" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={knobRef}
            className="size-12 rounded-full border border-white/30 bg-white/12 shadow-[0_0_24px_rgba(80,110,255,0.25)]"
          />
        </div>
        <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[0.48rem] tracking-[0.16em] text-white/35 uppercase">
          Move
        </span>
      </div>

      <button
        type="button"
        aria-label="Jump"
        className="absolute right-5 bottom-[max(1.4rem,env(safe-area-inset-bottom))] z-30 size-20 touch-none rounded-full border border-white/20 bg-black/40 font-mono text-[0.54rem] tracking-[0.16em] text-white/75 uppercase backdrop-blur-md transition-colors active:border-primary/70 active:text-white"
        onPointerDown={(event) => {
          event.preventDefault();
          jump.current = true;
        }}
      >
        Jump
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

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
