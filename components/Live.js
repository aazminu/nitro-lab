"use client";

import { createContext, useContext, useEffect, useState } from "react";

const LiveContext = createContext({ data: null, history: [], lost: false });
const HISTORY = 300;

export function LiveProvider({ children }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("history", (e) => setHistory(JSON.parse(e.data)));
    es.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setData(d);
      setLost(false);
      setHistory((h) => {
        const t = Date.parse(d.at);
        if (h.length && h[h.length - 1].t >= t) return h;
        const point = {
          t,
          cpu: d.cpuPct,
          cpuT: d.cpuTemp ?? null,
          mem: d.memUsed / d.memTotal,
          gpuT: d.gpu?.temp ?? null,
          gpuU: d.gpu?.util ?? null,
        };
        return [...h, point].slice(-HISTORY);
      });
    };
    es.onerror = () => setLost(true); // EventSource retries on its own
    es.addEventListener("busy", () => {
      es.close();
      setLost(true);
    });
    return () => es.close();
  }, []);

  return <LiveContext.Provider value={{ data, history, lost }}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

export const GB = 1024 ** 3;
export const gb = (n) => `${(n / GB).toFixed(1)} GB`;

export function duration(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (d > 0) return `${plural(d, "day")}, ${plural(h, "hour")}`;
  if (h > 0) return `${plural(h, "hour")}, ${plural(m, "minute")}`;
  return plural(m, "minute");
}

// "Up 6 days (healthy)" -> "up 6 days"
export function shortStatus(c) {
  if (!c) return "checking";
  if (c.state === "missing") return "not found";
  return c.status
    .replace(/\s*\(.*\)$/, "")
    .replace(/^Up/, "up")
    .replace(/^Exited.*/, "stopped")
    .replace("About an", "1")
    .replace("About a", "1")
    .replace("Less than a second", "0 seconds");
}

export function containerState(data, matches) {
  const list = matches.map((m) => data?.containers?.[m]);
  if (!data?.containers) return { state: "unknown", up: 0, total: matches.length, list };
  const up = list.filter((c) => c?.state === "running").length;
  return {
    state: up === matches.length ? "up" : up === 0 ? "down" : "partial",
    up,
    total: matches.length,
    list,
  };
}

export function ago(iso, now) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 2) return "just now";
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  return `${m} minute${m === 1 ? "" : "s"} ago`;
}

// re-render every second for "x seconds ago" labels
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export const ACCESS = {
  public: { label: "Public through Cloudflare", short: "Public" },
  private: { label: "Private, over Tailscale", short: "Tailscale" },
  internal: { label: "Internal Docker network", short: "Internal" },
  host: { label: "Runs directly on the host", short: "Host service" },
  external: { label: "Outside the home network", short: "External" },
};
