// One shared sampler for the whole server. Viewers only listen to it,
// so 50 open tabs cost the same as 1.
import os from "node:os";
import { readdir, readFile, statfs } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { allowlist } from "@/lib/site";

const run = promisify(execFile);

const FAST_MS = 2000; // cpu, memory, uptime
const SLOW_EVERY = 5; // disks, gpu, containers every 5th tick (10s)
const MAX_CLIENTS = 200;
const KUMA_EVERY = 30; // uptime percentages every 60s

const DISKS = [
  { label: "System", path: "/host/data" },
  { label: "Storage", path: "/host/storage" },
];

const HISTORY = 300; // 10 minutes of 2s samples

// state lives on globalThis so the instrumentation hook and the route
// handlers share one loop even if they load separate copies of this module
const state = (globalThis.__nitroSampler ??= {
  clients: new Set(),
  timer: null,
  tick: 0,
  prevCpu: null,
  slow: { disks: [], gpu: null, containers: null },
  kuma: null,
  latest: null,
  history: [],
});

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const c of os.cpus()) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

function cpuPercent() {
  const now = cpuTimes();
  const prev = state.prevCpu;
  state.prevCpu = now;
  if (!prev) return null;
  const total = now.total - prev.total;
  const idle = now.idle - prev.idle;
  return total > 0 ? Math.round((1 - idle / total) * 100) : 0;
}

// CPU package temperature from the coretemp hwmon driver (Intel),
// falling back to the x86_pkg_temp thermal zone. Returns °C or null.
let tempPath;
async function findTempPath() {
  try {
    for (const d of await readdir("/sys/class/hwmon")) {
      const base = `/sys/class/hwmon/${d}`;
      const name = (await readFile(`${base}/name`, "utf8")).trim();
      if (name === "coretemp" || name === "k10temp") return `${base}/temp1_input`;
    }
  } catch {}
  try {
    for (const d of await readdir("/sys/class/thermal")) {
      if (!d.startsWith("thermal_zone")) continue;
      const base = `/sys/class/thermal/${d}`;
      const type = (await readFile(`${base}/type`, "utf8")).trim();
      if (type === "x86_pkg_temp") return `${base}/temp`;
    }
  } catch {}
  return null;
}

async function cpuTemp() {
  if (tempPath === undefined) tempPath = await findTempPath();
  if (!tempPath) return null;
  try {
    return Math.round(Number(await readFile(tempPath, "utf8")) / 1000);
  } catch {
    return null;
  }
}

async function diskUsage() {
  const out = [];
  for (const d of DISKS) {
    try {
      const s = await statfs(d.path);
      const total = s.blocks * s.bsize;
      out.push({ label: d.label, used: total - s.bavail * s.bsize, total });
    } catch {
      // not mounted
    }
  }
  return out;
}

async function gpu() {
  try {
    const { stdout } = await run(
      "nvidia-smi",
      ["--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
      { timeout: 3000 }
    );
    const [name, temp, util, memUsed, memTotal] = stdout.trim().split(",").map((x) => x.trim());
    return {
      name: name.replace(/ Laptop GPU$/, ""),
      temp: Number(temp),
      util: Number(util),
      memUsed: Number(memUsed),
      memTotal: Number(memTotal),
    };
  } catch {
    return null;
  }
}

// Talks to a read-only docker socket proxy, never the raw socket.
// Only containers in the allowlist are returned, keyed by their `match` value.
async function containers() {
  const base = process.env.DOCKER_PROXY_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/containers/json?all=1`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const list = await res.json();
    const out = {};
    for (const { match } of allowlist) {
      const names = (c) => c.Names.map((n) => n.replace(/^\//, ""));
      // exact name first; Coolify IDs (24 chars) also match "<id>-<deploy>"
      const c =
        list.find((c) => names(c).includes(match)) ??
        (/^[a-z0-9]{24}$/.test(match)
          ? list.find((c) => names(c).some((n) => n.startsWith(`${match}-`)))
          : undefined);
      out[match] = c ? { state: c.State, status: c.Status } : { state: "missing", status: "not found" };
    }
    return out;
  } catch {
    return null;
  }
}

// Reads a public Uptime Kuma status page. Returns { "Monitor name": 0.9993 }.
async function kuma() {
  const base = process.env.UPTIME_KUMA_URL;
  const slug = process.env.UPTIME_KUMA_SLUG;
  if (!base || !slug) return null;
  try {
    const opts = { signal: AbortSignal.timeout(4000) };
    const [page, beats] = await Promise.all([
      fetch(`${base}/api/status-page/${slug}`, opts).then((r) => r.json()),
      fetch(`${base}/api/status-page/heartbeat/${slug}`, opts).then((r) => r.json()),
    ]);
    const out = {};
    for (const group of page.publicGroupList ?? []) {
      for (const m of group.monitorList ?? []) {
        const pct = beats.uptimeList?.[`${m.id}_24`];
        if (typeof pct === "number") out[m.name] = pct;
      }
    }
    return out;
  } catch {
    return null;
  }
}

async function refreshSlow() {
  const [disks, g, c] = await Promise.all([diskUsage(), gpu(), containers()]);
  state.slow = { disks, gpu: g, containers: c };
}

export async function sample() {
  if (state.tick % SLOW_EVERY === 0) await refreshSlow();
  if (state.tick % KUMA_EVERY === 0) state.kuma = await kuma();
  state.tick++;
  const cpus = os.cpus();
  state.latest = {
    uptime: os.uptime(),
    cpu: cpus[0]?.model?.replace(/\s+/g, " ").trim() ?? null,
    cores: cpus.length,
    cpuPct: cpuPercent(),
    cpuTemp: await cpuTemp(),
    load: os.loadavg()[0],
    memUsed: os.totalmem() - os.freemem(),
    memTotal: os.totalmem(),
    ...state.slow,
    kuma: state.kuma,
    onServer: Boolean(process.env.DOCKER_PROXY_URL),
    at: new Date().toISOString(),
  };
  return state.latest;
}

function broadcast(text) {
  for (const send of state.clients) send(text);
}

async function loop() {
  try {
    const d = await sample();
    state.history.push({
      t: Date.parse(d.at),
      cpu: d.cpuPct,
      cpuT: d.cpuTemp,
      mem: d.memUsed / d.memTotal,
      gpuT: d.gpu?.temp ?? null,
      gpuU: d.gpu?.util ?? null,
    });
    if (state.history.length > HISTORY) state.history.shift();
    if (state.clients.size) broadcast(`data: ${JSON.stringify(d)}\n\n`);
  } catch {
    // skip this tick
  }
}

// Runs for as long as the server is up, so the charts already have
// history when someone opens the page. Called from instrumentation.js.
export function start() {
  if (state.timer) return;
  loop();
  state.timer = setInterval(loop, FAST_MS);
}

export function subscribe(send) {
  if (state.clients.size >= MAX_CLIENTS) return null;
  start();
  state.clients.add(send);
  send(`event: history\ndata: ${JSON.stringify(state.history)}\n\n`);
  if (state.latest) send(`data: ${JSON.stringify(state.latest)}\n\n`);
  return () => state.clients.delete(send);
}

export function latest() {
  return state.latest;
}
