"use client";

import { Cpu, Gauge, MemoryStick, Thermometer } from "lucide-react";
import { useLive, gb } from "@/components/Live";

const W = 320;
const H = 90;
const WINDOW_MS = 10 * 60 * 1000;

function Chart({ title, icon: Icon, value, points, min, max, ticks, color, unit }) {
  const now = points.length ? points[points.length - 1].t : Date.now();
  const x = (t) => W - ((now - t) / WINDOW_MS) * W;
  const y = (v) => H - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * H;

  const valid = points.filter((p) => p.v != null);
  const line = valid.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = valid.length
    ? `${line}L${x(valid[valid.length - 1].t).toFixed(1)},${H}L${x(valid[0].t).toFixed(1)},${H}Z`
    : "";

  return (
    <figure className="chart">
      <figcaption>
        <span className="chart-title">
          <Icon size={15} aria-hidden="true" /> {title}
        </span>
        <span className="chart-value" style={{ color }}>
          {value ?? "–"}
          {value != null && <small>{unit}</small>}
        </span>
      </figcaption>
      <div className="plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {ticks.map((t) => (
            <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} className="grid" />
          ))}
          {area && <path d={area} fill={color} opacity="0.12" />}
          {line && <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />}
        </svg>
        {ticks.map((t) => (
          <span key={t} className="tick" style={{ top: `${(y(t) / H) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="axis">
        <span>10 min ago</span>
        <span>now</span>
      </div>
    </figure>
  );
}

function Bar({ label, used, total, format }) {
  const pct = total ? (used / total) * 100 : 0;
  return (
    <div className="bar">
      <div className="bar-head">
        <span>{label}</span>
        <span className="muted">
          {format(used)} of {format(total)}
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Charts() {
  const { data, history } = useLive();
  const series = (k) => history.map((p) => ({ t: p.t, v: k === "mem" ? (p.mem != null ? p.mem * 100 : null) : p[k] }));

  return (
    <>
      <div className="charts">
        <Chart
          title="CPU"
          icon={Cpu}
          value={data?.cpuPct}
          unit="%"
          points={series("cpu")}
          min={0}
          max={100}
          ticks={[50, 100]}
          color="var(--c-cpu)"
        />
        <Chart
          title="CPU temp"
          icon={Thermometer}
          value={data?.cpuTemp}
          unit="°C"
          points={series("cpuT")}
          min={30}
          max={100}
          ticks={[50, 70, 90]}
          color="var(--c-ctemp)"
        />
        <Chart
          title="Memory"
          icon={MemoryStick}
          value={data ? Math.round((data.memUsed / data.memTotal) * 100) : null}
          unit="%"
          points={series("mem")}
          min={0}
          max={100}
          ticks={[50, 100]}
          color="var(--c-mem)"
        />
        <Chart
          title="GPU temp"
          icon={Thermometer}
          value={data?.gpu?.temp}
          unit="°C"
          points={series("gpuT")}
          min={30}
          max={90}
          ticks={[50, 70, 90]}
          color="var(--c-temp)"
        />
        <Chart
          title="GPU load"
          icon={Gauge}
          value={data?.gpu?.util}
          unit="%"
          points={series("gpuU")}
          min={0}
          max={100}
          ticks={[50, 100]}
          color="var(--c-gpu)"
        />
      </div>

      {data && (
        <div className="bars">
          <Bar label="Memory" used={data.memUsed} total={data.memTotal} format={gb} />
          {data.gpu && (
            <Bar
              label={`${data.gpu.name} VRAM`}
              used={data.gpu.memUsed}
              total={data.gpu.memTotal}
              format={(n) => `${(n / 1024).toFixed(1)} GB`}
            />
          )}
          {data.disks?.map((d) => (
            <Bar key={d.label} label={`${d.label} drive`} used={d.used} total={d.total} format={gb} />
          ))}
        </div>
      )}
    </>
  );
}
