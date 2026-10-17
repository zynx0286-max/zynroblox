// Kills anything left LISTENING on the liveness-smoke port and — more
// importantly — the wrangler/npm/cmd supervisor chain above it, whose respawn
// would bring workerd straight back. Names are allow-listed so it can never
// touch an unrelated process; a foreign listener on the port is reported and
// skipped.
//
// Run standalone (`node scripts/kill-smoke-orphans.mjs`) or from
// test-liveness-smoke.mjs teardown.
import { execFileSync } from "node:child_process";

// Processes that may sit between the smoke and workerd, plus workerd itself.
const ALLOWED = new Set([
  "workerd.exe", "workerd",
  "node.exe", "node",
  "cmd.exe", "cmd",
  "npm.exe", "npm",
  "npx.exe", "npx",
  "pwsh.exe", "powershell.exe", // Spawned shells (taskkill chain) — never the frame's parent
]);
// ✓ never follows parents outside this set — iexplore, sshd, the IDE…
const PORTS = [8787, 8788];

function nameOf(pid) {
  try {
    return execFileSync("powershell", ["-NoProfile", "-Command", `(Get-Process -Id ${pid}).ProcessName`], {
      encoding: "utf8",
    }).trim();
  } catch {
    return ""; // dead or owned by another session
  }
}

function parentOf(pid) {
  try {
    const out = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').ParentProcessId`],
      { encoding: "utf8" },
    ).trim();
    return Number(out) || null;
  } catch {
    return null;
  }
}

// taskkill /T only walks the tree it can see; killing the TOP of the chain
// with /T is the only reliable way on Windows to take the supervisor AND its
// respawn race with it. Returns false when the PID dies between scan and kill.
function taskkillTree(pid) {
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

let killed = 0;
for (const port of PORTS) {
  const pids = new Set();
  try {
    const lines = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
    for (const line of lines.split("\n")) {
      if (line.includes(`:${port} `) && /LISTENING/.test(line)) {
        const pid = Number(line.trim().split(/\s+/).pop());
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    }
  } catch {
    continue;
  }
  for (const pid of pids) {
    // Walk UP to the topmost allowed ancestor — that's the supervisor.
    let top = pid;
    for (let hop = 0; hop < 10; hop++) {
      const parent = parentOf(top);
      if (!parent || !ALLOWED.has(nameOf(parent)) || parent === top) break;
      top = parent;
    }
    if (top !== pid && taskkillTree(top)) {
      console.log(`port ${port}: killed tree from PID ${top} (was above listener ${pid} / ${nameOf(pid)})`);
      killed++;
    } else if (ALLOWED.has(nameOf(pid))) {
      if (taskkillTree(pid)) {
        console.log(`port ${port}: killed listener PID ${pid} (${nameOf(pid)})`);
        killed++;
      } else {
        console.log(`port ${port}: could not kill listener PID ${pid} (${nameOf(pid)})`);
      }
    } else {
      console.log(`port ${port}: PID ${pid} (${nameOf(pid) || "gone"}) is not a smoke process — skipping`);
    }
  }
}
console.log(killed === 0 ? "no smoke orphans found" : `done (${killed} tree(s) killed)`);
