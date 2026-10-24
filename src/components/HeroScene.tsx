import { useEffect, useRef } from "react";

/**
 * Hero WebGL scene — floating game props rendered with raw WebGL.
 *
 * No three.js: the whole scene is a handful of procedural meshes (a studded
 * Roblox brick, a coin, a speaker and a gamepad), one lit shader and a slow
 * orbit. That keeps the bundle small and gives full control over the look.
 *
 * Guard rails:
 * - renders only while the hero is on screen and the tab is visible
 * - one still frame for prefers-reduced-motion
 * - device pixel ratio capped, buffers/meshes released on unmount
 * - if WebGL is unavailable the canvas simply stays invisible and the CSS
 *   glow behind it remains as the fallback
 */

type Vec3 = [number, number, number];

type Mesh = {
  positions: number[];
  normals: number[];
  indices: number[];
};

type Part = {
  mesh: Mesh;
  color: Vec3;
  metal: number;
  /** Local transform, column-major. */
  local: Float32Array;
};

type Prop = {
  parts: Part[];
  pos: Vec3;
  rot: Vec3;
  scale: number;
  phase: number;
  bob: number;
  spin: number;
  wobble: number;
};

// ---------------------------------------------------------------------------
// Small column-major matrix helpers (only what the scene needs)
// ---------------------------------------------------------------------------

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function multiply(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4]!;
    const b1 = b[c * 4 + 1]!;
    const b2 = b[c * 4 + 2]!;
    const b3 = b[c * 4 + 3]!;
    out[c * 4] = a[0]! * b0 + a[4]! * b1 + a[8]! * b2 + a[12]! * b3;
    out[c * 4 + 1] = a[1]! * b0 + a[5]! * b1 + a[9]! * b2 + a[13]! * b3;
    out[c * 4 + 2] = a[2]! * b0 + a[6]! * b1 + a[10]! * b2 + a[14]! * b3;
    out[c * 4 + 3] = a[3]! * b0 + a[7]! * b1 + a[11]! * b2 + a[15]! * b3;
  }
  return out;
}

/**
 * Translation * Ry * Rx * Rz * uniform-scale.
 * The rotation order lets props spin around their own vertical axis while
 * keeping their base tilt, which is what makes the coin read as a coin.
 */
function trs(
  out: Float32Array,
  tx: number,
  ty: number,
  tz: number,
  rx: number,
  ry: number,
  rz: number,
  scale = 1,
): Float32Array {
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);

  const m00 = cy * cz + sy * sx * sz;
  const m01 = -cy * sz + sy * sx * cz;
  const m02 = sy * cx;
  const m10 = cx * sz;
  const m11 = cx * cz;
  const m12 = -sx;
  const m20 = -sy * cz + cy * sx * sz;
  const m21 = sy * sz + cy * sx * cz;
  const m22 = cy * cx;

  out[0] = m00 * scale;
  out[1] = m10 * scale;
  out[2] = m20 * scale;
  out[3] = 0;
  out[4] = m01 * scale;
  out[5] = m11 * scale;
  out[6] = m21 * scale;
  out[7] = 0;
  out[8] = m02 * scale;
  out[9] = m12 * scale;
  out[10] = m22 * scale;
  out[11] = 0;
  out[12] = tx;
  out[13] = ty;
  out[14] = tz;
  out[15] = 1;
  return out;
}

function perspective(out: Float32Array, fovY: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovY / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) / (near - far);
  out[15] = 0;
  return out;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

function emptyMesh(): Mesh {
  return { positions: [], normals: [], indices: [] };
}

/** Flat-shaded box, centred on the origin. */
function boxMesh(w: number, h: number, d: number): Mesh {
  const mesh = emptyMesh();
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const faces: Array<{ n: Vec3; verts: Vec3[] }> = [
    {
      n: [0, 0, 1],
      verts: [
        [-x, -y, z],
        [x, -y, z],
        [x, y, z],
        [-x, y, z],
      ],
    },
    {
      n: [0, 0, -1],
      verts: [
        [x, -y, -z],
        [-x, -y, -z],
        [-x, y, -z],
        [x, y, -z],
      ],
    },
    {
      n: [1, 0, 0],
      verts: [
        [x, -y, z],
        [x, -y, -z],
        [x, y, -z],
        [x, y, z],
      ],
    },
    {
      n: [-1, 0, 0],
      verts: [
        [-x, -y, -z],
        [-x, -y, z],
        [-x, y, z],
        [-x, y, -z],
      ],
    },
    {
      n: [0, 1, 0],
      verts: [
        [-x, y, z],
        [x, y, z],
        [x, y, -z],
        [-x, y, -z],
      ],
    },
    {
      n: [0, -1, 0],
      verts: [
        [-x, -y, -z],
        [x, -y, -z],
        [x, -y, z],
        [-x, -y, z],
      ],
    },
  ];

  for (const face of faces) {
    const base = mesh.positions.length / 3;
    for (const v of face.verts) {
      mesh.positions.push(v[0], v[1], v[2]);
      mesh.normals.push(face.n[0], face.n[1], face.n[2]);
    }
    mesh.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return mesh;
}

/** Smooth-sided cylinder on the Y axis, with caps. */
function cylinderMesh(radius: number, height: number, segments = 32): Mesh {
  const mesh = emptyMesh();
  const hy = height / 2;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const base = mesh.positions.length / 3;

    mesh.positions.push(c0 * radius, -hy, s0 * radius);
    mesh.positions.push(c1 * radius, -hy, s1 * radius);
    mesh.positions.push(c1 * radius, hy, s1 * radius);
    mesh.positions.push(c0 * radius, hy, s0 * radius);
    for (const [c, s] of [
      [c0, s0],
      [c1, s1],
      [c1, s1],
      [c0, s0],
    ] as const) {
      mesh.normals.push(c, 0, s);
    }
    mesh.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  for (const side of [1, -1]) {
    const centre = mesh.positions.length / 3;
    mesh.positions.push(0, hy * side, 0);
    mesh.normals.push(0, side, 0);
    const ring = mesh.positions.length / 3;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      mesh.positions.push(Math.cos(a) * radius, hy * side, Math.sin(a) * radius);
      mesh.normals.push(0, side, 0);
    }
    for (let i = 0; i < segments; i++) {
      const a = ring + i;
      const b = ring + ((i + 1) % segments);
      if (side > 0) mesh.indices.push(centre, a, b);
      else mesh.indices.push(centre, b, a);
    }
  }

  return mesh;
}

function local(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0): Float32Array {
  return trs(new Float32Array(16), px, py, pz, rx, ry, rz, 1);
}

// Palette (linear-ish sRGB values used directly by the shader).
const BLUE: Vec3 = [0.16, 0.4, 1];
const BLUE_LIGHT: Vec3 = [0.36, 0.58, 1];
const WHITE: Vec3 = [0.92, 0.95, 1];
const CYAN: Vec3 = [0.22, 0.78, 0.95];
const DARK: Vec3 = [0.055, 0.075, 0.12];
const STEEL: Vec3 = [0.72, 0.79, 0.94];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

function studdedBrick(): Part[] {
  const parts: Part[] = [
    { mesh: boxMesh(1.18, 0.5, 1.18), color: BLUE, metal: 0.3, local: local() },
  ];
  const stud = cylinderMesh(0.11, 0.08);
  for (const [x, z] of [
    [-0.29, -0.29],
    [0.29, -0.29],
    [-0.29, 0.29],
    [0.29, 0.29],
  ] as const) {
    parts.push({
      mesh: stud,
      color: BLUE_LIGHT,
      metal: 0.4,
      local: local(x, 0.29, z),
    });
  }
  return parts;
}

function coin(): Part[] {
  return [
    {
      mesh: cylinderMesh(0.56, 0.1, 40),
      color: STEEL,
      metal: 0.95,
      local: local(),
    },
    {
      mesh: cylinderMesh(0.45, 0.08, 40),
      color: BLUE,
      metal: 0.55,
      local: local(0, 0.08),
    },
    // A little "Z" stamped into the face.
    { mesh: boxMesh(0.26, 0.03, 0.06), color: WHITE, metal: 0.5, local: local(0, 0.13, -0.09) },
    { mesh: boxMesh(0.26, 0.03, 0.06), color: WHITE, metal: 0.5, local: local(0, 0.13, 0.09) },
    {
      mesh: boxMesh(0.3, 0.03, 0.055),
      color: WHITE,
      metal: 0.5,
      local: local(0, 0.13, 0, 0, -0.95),
    },
  ];
}

function speaker(): Part[] {
  return [
    { mesh: boxMesh(0.95, 1.25, 0.5), color: DARK, metal: 0.15, local: local() },
    {
      mesh: cylinderMesh(0.3, 0.09, 36),
      color: BLUE,
      metal: 0.5,
      local: local(0, 0.1, 0.27, Math.PI / 2),
    },
    {
      mesh: cylinderMesh(0.13, 0.07, 28),
      color: STEEL,
      metal: 0.85,
      local: local(0, 0.5, 0.27, Math.PI / 2),
    },
    {
      mesh: boxMesh(0.07, 0.07, 0.03),
      color: CYAN,
      metal: 0.2,
      local: local(0.33, -0.47, 0.26),
    },
  ];
}

function gamepad(): Part[] {
  return [
    { mesh: boxMesh(1.02, 0.3, 0.4), color: WHITE, metal: 0.2, local: local() },
    {
      mesh: boxMesh(0.36, 0.3, 0.62),
      color: WHITE,
      metal: 0.2,
      local: local(-0.55, -0.03, -0.12, 0, 0, -0.32),
    },
    {
      mesh: boxMesh(0.36, 0.3, 0.62),
      color: WHITE,
      metal: 0.2,
      local: local(0.55, -0.03, -0.12, 0, 0, 0.32),
    },
    { mesh: boxMesh(0.09, 0.06, 0.28), color: DARK, metal: 0.1, local: local(-0.27, 0.18) },
    { mesh: boxMesh(0.28, 0.06, 0.09), color: DARK, metal: 0.1, local: local(-0.27, 0.18) },
    {
      mesh: cylinderMesh(0.075, 0.06, 24),
      color: BLUE,
      metal: 0.4,
      local: local(0.22, 0.18, 0.1),
    },
    {
      mesh: cylinderMesh(0.075, 0.06, 24),
      color: CYAN,
      metal: 0.4,
      local: local(0.34, 0.18, -0.06),
    },
    {
      mesh: cylinderMesh(0.06, 0.05, 20),
      color: STEEL,
      metal: 0.7,
      local: local(0, 0.18, 0),
    },
  ];
}

function buildProps(): Prop[] {
  return [
    {
      parts: studdedBrick(),
      pos: [-1.5, 0.18, 0.2],
      rot: [0.32, 0.55, -0.06],
      scale: 0.92,
      phase: 0.4,
      bob: 0.13,
      spin: 0.12,
      wobble: 0.07,
    },
    {
      parts: coin(),
      pos: [-0.35, 1.08, -0.45],
      rot: [Math.PI / 2, 0.2, 0.18],
      scale: 0.84,
      phase: 2.1,
      bob: 0.11,
      spin: 0.2,
      wobble: 0.12,
    },
    {
      parts: speaker(),
      pos: [0.72, 0.02, 0.32],
      rot: [0, -0.25, 0.03],
      scale: 0.95,
      phase: 4.2,
      bob: 0.09,
      spin: 0.08,
      wobble: 0.04,
    },
    {
      parts: gamepad(),
      pos: [1.28, 0.96, 0.28],
      rot: [0.72, -0.28, 0.1],
      scale: 0.8,
      phase: 5.3,
      bob: 0.14,
      spin: 0.14,
      wobble: 0.1,
    },
  ];
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormalMat;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  gl_Position = uViewProj * world;
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec3 uColor;
uniform vec3 uCamera;
uniform float uMetal;
varying vec3 vNormal;
varying vec3 vWorld;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamera - vWorld);
  vec3 key = normalize(vec3(-0.55, 0.9, 0.75));
  vec3 fill = normalize(vec3(0.85, 0.2, -0.5));

  float diffuse = max(dot(N, key), 0.0);
  float fillLight = max(dot(N, fill), 0.0);
  vec3 halfDir = normalize(key + V);
  float spec = pow(max(dot(N, halfDir), 0.0), mix(18.0, 90.0, uMetal));
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.4);

  vec3 color = uColor * (0.24 + 0.9 * diffuse);
  color += vec3(0.1, 0.2, 0.5) * fillLight * 0.5;
  color += vec3(0.55, 0.72, 1.0) * spec * (0.22 + uMetal * 0.9);
  color += vec3(0.14, 0.3, 0.95) * fresnel * 0.6;

  gl_FragColor = vec4(color, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type GpuPart = {
  pos: WebGLBuffer;
  norm: WebGLBuffer;
  idx: WebGLBuffer;
  count: number;
  color: Vec3;
  metal: number;
  local: Float32Array;
};

type GpuProp = {
  parts: GpuPart[];
  pos: Vec3;
  rot: Vec3;
  scale: number;
  phase: number;
  bob: number;
  spin: number;
  wobble: number;
};

export function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: "high-performance",
    }) ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const compile = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("[hero-scene] shader compile failed:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[hero-scene] program link failed:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const loc = {
      position: gl.getAttribLocation(program, "aPosition"),
      normal: gl.getAttribLocation(program, "aNormal"),
      viewProj: gl.getUniformLocation(program, "uViewProj"),
      model: gl.getUniformLocation(program, "uModel"),
      normalMat: gl.getUniformLocation(program, "uNormalMat"),
      color: gl.getUniformLocation(program, "uColor"),
      metal: gl.getUniformLocation(program, "uMetal"),
      camera: gl.getUniformLocation(program, "uCamera"),
    };

    const gpuParts: GpuPart[] = [];
    const buffer = (data: Float32Array | Uint16Array, target: number) => {
      const b = gl.createBuffer();
      if (!b) throw new Error("WebGL buffer allocation failed");
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return b;
    };

    let props: GpuProp[] = [];
    try {
      props = buildProps().map((prop) => ({
        ...prop,
        parts: prop.parts.map((part) => {
          const gpu: GpuPart = {
            pos: buffer(new Float32Array(part.mesh.positions), gl.ARRAY_BUFFER),
            norm: buffer(new Float32Array(part.mesh.normals), gl.ARRAY_BUFFER),
            idx: buffer(new Uint16Array(part.mesh.indices), gl.ELEMENT_ARRAY_BUFFER),
            count: part.mesh.indices.length,
            color: part.color,
            metal: part.metal,
            local: part.local,
          };
          gpuParts.push(gpu);
          return gpu;
        }),
      }));
    } catch {
      gl.deleteProgram(program);
      return;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const viewProj = new Float32Array(16);
    const projection = new Float32Array(16);
    const view = new Float32Array(16);
    const group = new Float32Array(16);
    const propMatrix = new Float32Array(16);
    const world = new Float32Array(16);
    const model = new Float32Array(16);
    const normalMat = new Float32Array(9);

    let width = 1;
    let height = 1;
    let distance = 6.4;
    let pointerX = 0;
    let pointerY = 0;
    let easedX = 0;
    let easedY = 0;
    let visible = true;
    let running = false;
    let frame = 0;
    let disposed = false;

    // Drag-to-spin state. `spinOffset` is the manual rotation layered on top of
    // the idle orbit; `tiltOffset` is the manual vertical tilt. Velocities give
    // a short, decaying flick after release.
    let dragging = false;
    let dragId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let lastMoveAt = 0;
    let spinOffset = 0;
    let tiltOffset = 0;
    let spinVel = 0;
    let tiltVel = 0;

    // Scroll progress through the hero (0 at rest, 1 once it has scrolled a
    // full viewport height away). Eased in the render loop so the props turn
    // and the camera pulls back as the copy drifts up.
    let scrollP = 0;
    let scrollEased = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl.viewport(0, 0, width, height);

      const aspect = rect.width / Math.max(1, rect.height);
      distance = 6.4 * Math.max(1, 0.95 / Math.max(0.5, Math.min(aspect, 0.95)));
      perspective(projection, (38 * Math.PI) / 180, Math.max(0.4, aspect), 0.1, 40);
      view.set(IDENTITY);
      view[14] = -distance;
      multiply(viewProj, projection, view);
    };

    const render = (now: number) => {
      const t = reduceMotion ? 2.4 : now / 1000;
      easedX += (pointerX - easedX) * 0.055;
      easedY += (pointerY - easedY) * 0.055;
      scrollEased += (scrollP - scrollEased) * 0.09;

      if (!dragging) {
        spinOffset += spinVel;
        spinVel *= 0.93;
        if (Math.abs(spinVel) < 0.0002) spinVel = 0;

        tiltOffset = Math.max(-0.5, Math.min(0.5, tiltOffset + tiltVel));
        tiltVel *= 0.9;
        tiltOffset *= 0.985;
        if (Math.abs(tiltOffset) < 0.001) tiltOffset = 0;
      }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);

      trs(
        group,
        0,
        0.02,
        0,
        -0.05 + easedY * 0.18 + tiltOffset + scrollEased * 0.1,
        0.18 * Math.sin(t * 0.14) + easedX * 0.3 + spinOffset + scrollEased * 0.55,
        0,
        1,
      );
      gl.uniformMatrix4fv(loc.viewProj, false, viewProj);
      gl.uniform3f(loc.camera, 0, 0, distance + scrollEased * 1.7);

      gl.enableVertexAttribArray(loc.position);
      gl.enableVertexAttribArray(loc.normal);

      for (const prop of props) {
        const bob = Math.sin(t * 0.75 + prop.phase) * prop.bob;
        trs(
          propMatrix,
          prop.pos[0],
          prop.pos[1] + bob,
          prop.pos[2],
          prop.rot[0] + Math.sin(t * 0.5 + prop.phase) * prop.wobble,
          prop.rot[1] + t * prop.spin,
          prop.rot[2] + Math.cos(t * 0.42 + prop.phase) * prop.wobble * 0.6,
          prop.scale,
        );
        multiply(world, group, propMatrix);

        for (const part of prop.parts) {
          multiply(model, world, part.local);
          gl.uniformMatrix4fv(loc.model, false, model);
          normalMat[0] = model[0]!;
          normalMat[1] = model[1]!;
          normalMat[2] = model[2]!;
          normalMat[3] = model[4]!;
          normalMat[4] = model[5]!;
          normalMat[5] = model[6]!;
          normalMat[6] = model[8]!;
          normalMat[7] = model[9]!;
          normalMat[8] = model[10]!;
          gl.uniformMatrix3fv(loc.normalMat, false, normalMat);
          gl.uniform3f(loc.color, part.color[0], part.color[1], part.color[2]);
          gl.uniform1f(loc.metal, part.metal);

          gl.bindBuffer(gl.ARRAY_BUFFER, part.pos);
          gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, part.norm);
          gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.idx);
          gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_SHORT, 0);
        }
      }

      if (canvas.dataset["ready"] !== "true") {
        canvas.dataset["ready"] = "true";
        // Only advertise drag once the scene actually renders, so the custom
        // cursor never promises an interaction the WebGL fallback cannot do.
        canvas.dataset["cursorLabel"] = "DRAG";
      }
    };

    const tick = (now: number) => {
      frame = 0;
      if (!running || disposed) return;
      render(now);
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduceMotion || disposed) return;
      running = true;
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    resize();
    if (reduceMotion) {
      render(0);
      canvas.dataset["ready"] = "true";
    } else {
      start();
    }

    const onResize = () => {
      resize();
      if (reduceMotion) render(0);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      pointerY = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    };

    const onScroll = () => {
      if (reduceMotion) return;
      const rect = host.getBoundingClientRect();
      const span = Math.max(1, rect.height);
      scrollP = Math.min(1, Math.max(0, -rect.top / span));
    };

    const hideHint = () => {
      if (hintRef.current) hintRef.current.style.opacity = "0";
    };

    const onDragStart = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      lastMoveAt = performance.now();
      spinVel = 0;
      tiltVel = 0;
      hideHint();
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* ignore: capture is a nice-to-have */
      }
    };

    const onDragMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      lastMoveAt = performance.now();

      spinOffset += dx * 0.006;
      tiltOffset = Math.max(-0.5, Math.min(0.5, tiltOffset + dy * 0.003));
      spinVel = Math.max(-0.22, Math.min(0.22, dx * 0.004));
      tiltVel = Math.max(-0.06, Math.min(0.06, dy * 0.002));

      if (reduceMotion) render(0);
    };

    const onDragEnd = (event: PointerEvent) => {
      if (event.pointerId !== dragId) return;
      dragging = false;
      dragId = null;
      // Only carry inertia when the pointer was still moving on release.
      if (performance.now() - lastMoveAt > 90) {
        spinVel = 0;
        tiltVel = 0;
      }
      try {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        /* ignore */
      }
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (!visible) stop();
      else if (!reduceMotion) start();
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          visible = Boolean(entry?.isIntersecting);
          if (!visible) stop();
          else if (!reduceMotion) start();
        },
        { threshold: 0.02 },
      );
      io.observe(host);
    }

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => onResize()) : null;
    ro?.observe(host);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("pointerdown", onDragStart);
    canvas.addEventListener("pointermove", onDragMove);
    canvas.addEventListener("pointerup", onDragEnd);
    canvas.addEventListener("pointercancel", onDragEnd);
    canvas.addEventListener("lostpointercapture", onDragEnd);

    return () => {
      disposed = true;
      stop();
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDragStart);
      canvas.removeEventListener("pointermove", onDragMove);
      canvas.removeEventListener("pointerup", onDragEnd);
      canvas.removeEventListener("pointercancel", onDragEnd);
      canvas.removeEventListener("lostpointercapture", onDragEnd);
      for (const part of gpuParts) {
        gl.deleteBuffer(part.pos);
        gl.deleteBuffer(part.norm);
        gl.deleteBuffer(part.idx);
      }
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="zyn-scene absolute inset-0 h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
      />
      <div
        ref={hintRef}
        aria-hidden
        className="zyn-drag-hint pointer-events-none absolute inset-x-0 bottom-9 z-10 flex justify-center transition-opacity duration-500"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/65 px-3 py-1.5 font-mono text-[0.52rem] tracking-[0.16em] text-muted-foreground uppercase backdrop-blur-sm">
          <span className="text-primary">↔</span>
          Drag to spin
        </span>
      </div>
    </>
  );
}
