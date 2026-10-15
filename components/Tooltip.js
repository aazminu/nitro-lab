"use client";

import { ACCESS } from "@/components/Live";
import { allowlist } from "@/lib/site";

const byMatch = Object.fromEntries(allowlist.map((c) => [c.match, c]));

// Shows details for a hovered diagram box. Positioned inside `wrap`,
// outside any scroll container, so it never adds scrollbars.
const TIP_W = 320;

export default function Tooltip({ hover, data, wrap }) {
  if (!hover || !wrap) return null;
  const { n, el } = hover;
  const box = wrap.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const center = r.left - box.left + r.width / 2;
  const left = Math.min(Math.max(center, TIP_W / 2 + 8), box.width - TIP_W / 2 - 8);
  const below = r.bottom - box.top < box.height * 0.55;
  const style = below
    ? { left, top: r.bottom - box.top + 8 }
    : { left, bottom: box.bottom - r.top + 8 };

  return (
    <div className="tip" role="tooltip" style={style}>
      <div className="tip-head">
        <strong>{n.title}</strong>
        {n.access && <span className={`badge ${n.access}`}>{ACCESS[n.access].short}</span>}
      </div>
      <p>{n.info}</p>
      {n.match && (
        <ul>
          {n.match.map((m) => {
            const c = byMatch[m];
            const st = data?.containers?.[m];
            return (
              <li key={m}>
                <span className={st?.state === "running" ? "ok" : st ? "bad" : ""}>{st ? st.status : "checking"}</span>
                <span>{c.label}</span>
                <code>
                  {c.image}
                  {c.port ? `, port ${c.port}` : ""}
                </code>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

