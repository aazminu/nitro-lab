"use client";

import { Clock, Boxes, Radio, TriangleAlert, WifiOff } from "lucide-react";
import { useLive, useNow, ago, duration, containerState, shortStatus, ACCESS } from "@/components/Live";

// Steady label while readings keep arriving. It only changes when data goes stale.
export function LiveBadge() {
  const { data, lost } = useLive();
  const now = useNow();
  const age = data ? (now - Date.parse(data.at)) / 1000 : null;

  if (lost) {
    return (
      <span className="live-badge off">
        <WifiOff size={15} aria-hidden="true" /> Reconnecting to the server
      </span>
    );
  }
  if (!data) {
    return (
      <span className="live-badge pending">
        <Radio size={15} aria-hidden="true" /> Connecting
      </span>
    );
  }
  if (age > 8) {
    return (
      <span className="live-badge off">
        <Radio size={15} aria-hidden="true" /> Last update {ago(data.at, now)}
      </span>
    );
  }
  return (
    <span className="live-badge">
      <Radio size={15} aria-hidden="true" /> Live from the server
    </span>
  );
}

export function LocalNotice() {
  const { data } = useLive();
  if (!data || data.onServer) return null;
  return (
    <p className="local-notice">
      <TriangleAlert size={16} aria-hidden="true" />
      Local preview. These readings come from the computer running <code>npm run dev</code>, not the home server,
      and container status only appears once the page is deployed.
    </p>
  );
}

export function Vitals({ allowlist }) {
  const { data } = useLive();
  const cs = containerState(data, allowlist);
  return (
    <ul className="vitals">
      <li>
        <Clock size={18} aria-hidden="true" />
        <span>
          <b>{data ? duration(data.uptime) : "…"}</b> since the last reboot
        </span>
      </li>
      <li>
        <Boxes size={18} aria-hidden="true" />
        <span>
          <b>{data?.containers ? `${cs.up} of ${cs.total}` : "…"}</b> listed containers running
        </span>
      </li>
    </ul>
  );
}

export function Inventory({ groups }) {
  const { data } = useLive();
  return (
    <div className="table-scroll">
      <table className="inventory">
        <thead>
          <tr>
            <th scope="col">Container</th>
            <th scope="col">Image</th>
            <th scope="col">Port</th>
            <th scope="col">Access</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.name}>
            <tr className="inv-group">
              <th colSpan={5} scope="rowgroup">
                {g.name}
              </th>
            </tr>
            {g.containers.map((c) => {
              const s = data?.containers?.[c.match];
              const state = !s ? "" : s.state === "running" ? "ok" : "bad";
              return (
                <tr key={c.match}>
                  <td>{c.label}</td>
                  <td>
                    <code>{c.image}</code>
                  </td>
                  <td className="num">{c.port ?? "none"}</td>
                  <td>
                    <span className={`badge ${c.access}`}>{ACCESS[c.access].short}</span>
                  </td>
                  <td className={state}>{s ? shortStatus(s) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
