// Kills anything left LISTENING on the liveness-smoke port and — more
// importantly — the wrangler/npm/shell supervisor chain above it, whose respawn
// would bring workerd straight back. Names are allow-listed so it can never
// touch an unrelated process; a foreign listener on the port is reported and
// skipped.
//
// Run standalone (`node scripts/kill-smoke-orphans.mjs`), from
// test-liveness-smoke.mjs teardown, or as its own CI workflow step (the
// liveness-smoke job runs it on ubuntu-latest — hence the Linux half below).
//
// Windows: netstat -ano → taskkill /T /F from the top of the supervisor chain
// (taskkill is the only reliable tree-kill there; children first can lose the
// respawn race).
// Linux (CI runners): ss -ltnp → /proc walk for the parent chain, then SIGKILL
// every process below the topmost allowed ancestor.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const IS_WINDOWS = process.platform === "win32";

// Processes that may sit between the smoke and workerd, plus workerd itself.
const ALLOWED = new Set([
  "workerd.exe",
  "workerd",
  "node.exe",
  "node",
  "cmd.exe",
  "cmd",
  "npm.exe",
  "npm",
  "npx.exe",
  "npx",
  "pwsh.exe",
  "powershell.exe", // Spawned shells (taskkill chain) — never the frame's parent
  // POSIX shells wrapping `npx wrangler` (shell:true / script shims)
  "sh",
  "bash",
  "dash",
]);
// ✓ never follows parents outside this set — iexplore, sshd, the IDE…
const PORTS = [8787, 8788];

// --- platform-specific primitives ------------------------------------------

/** PIDs of processes LISTENING on the port (best-effort; empty on tool failure). */
function listListeners(port) {
  const pids = [];
  try {
    if (IS_WINDOWS) {
      const lines = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
      for (const line of lines.split("\n")) {
        if (line.includes(`:${port} `) && /LISTENING/.test(line)) {
          const pid = Number(line.trim().split(/\s+/).pop());
          if (Number.isInteger(pid) && pid > 0) pids.push(pid);
        }
      }
    } else {
      // iproute2's ss ships in the ubuntu runner base image; -p prints the
      // owning pid only for OUR processes (exactly the ones we may kill).
      const lines = execFileSync("ss", ["-ltnp"], { encoding: "utf8" });
      const portMatcher = new RegExp(`:${port}\\b`);
      const pidMatcher = /pid=(\d+)/;
      for (const line of lines.split("\n")) {
        if (!/LISTEN/.test(line) || !portMatcher.test(line)) continue;
        const m = line.match(pidMatcher);
        if (m) pids.push(Number(m[1]));
      }
    }
  } catch {
    // no listener info: report nothing, kill nothing
  }
  return pids;
}

function nameOf(pid) {
  try {
    if (IS_WINDOWS) {
      return execFileSync(
        "powershell",
        ["-NoProfile", "-Command", `(Get-Process -Id ${pid}).ProcessName`],
        { encoding: "utf8" },
      ).trim();
    }
    return readFileSync(`/proc/${pid}/comm`, "utf8").trim();
  } catch {
    return ""; // dead or owned by another session
  }
}

function parentOf(pid) {
  try {
    if (IS_WINDOWS) {
      const out = execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').ParentProcessId`,
        ],
        { encoding: "utf8" },
      ).trim();
      return Number(out) || null;
    }
    const status = readFileSync(`/proc/${pid}/status`, "utf8");
    const m = status.match(/^PPid:\s*(\d+)/m);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

// Windows: taskkill /T only walks the tree it can see; killing the TOP of the
// chain with /T is the only reliable way to take the supervisor AND its
// respawn race with it. Returns false when the PID dies between scan and kill.
function taskkillTree(pid) {
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

// Linux: collect the whole descendant tree of `top` by walking /proc, then
// SIGKILL everything at once — SIGTERM would just let wrangler's supervisor
// respawn workerd, which is the failure mode this cleaner exists to prevent.
// Returns true when at least one kill went through.
function killTreePosix(top) {
  const victims = new Set([top]);
  for (let round = 0; round < 10; round++) {
    let grew = false;
    try {
      for (const entry of readdirSync("/proc")) {
        if (!/^\d+$/.test(entry)) continue;
        const pid = Number(entry);
        if (victims.has(pid)) continue;
        if (parentOf(pid) !== null && victims.has(parentOf(pid))) {
          victims.add(pid);
          grew = true;
        }
      }
    } catch {
      break;
    }
    if (!grew) break;
  }
  let killedAny = false;
  for (const pid of victims) {
    try {
      process.kill(pid, "SIGKILL");
      killedAny = true;
    } catch {
      // already dead, or another user's process (ESRCH / EPERM)
    }
  }
  return killedAny;
}

function killTree(pid) {
  return IS_WINDOWS ? taskkillTree(pid) : killTreePosix(pid);
}

let killed = 0;
for (const port of PORTS) {
  for (const pid of listListeners(port)) {
    // Walk UP to the topmost allowed ancestor — that's the supervisor.
    let top = pid;
    for (let hop = 0; hop < 10; hop++) {
      const parent = parentOf(top);
      if (!parent || !ALLOWED.has(nameOf(parent)) || parent === top) break;
      top = parent;
    }
    if (top !== pid && killTree(top)) {
      console.log(
        `port ${port}: killed tree from PID ${top} (was above listener ${pid} / ${nameOf(pid)})`,
      );
      killed++;
    } else if (ALLOWED.has(nameOf(pid))) {
      if (killTree(pid)) {
        console.log(`port ${port}: killed listener PID ${pid} (${nameOf(pid)})`);
        killed++;
      } else {
        console.log(`port ${port}: could not kill listener PID ${pid} (${nameOf(pid)})`);
      }
    } else {
      console.log(
        `port ${port}: PID ${pid} (${nameOf(pid) || "gone"}) is not a smoke process — skipping`,
      );
    }
  }
}
console.log(killed === 0 ? "no smoke orphans found" : `done (${killed} tree(s) killed)`);
