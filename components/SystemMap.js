"use client";

import { useRef, useState } from "react";
import {
  AppWindow,
  Archive,
  Activity,
  Cable,
  Cloud,
  Database,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  Images,
  Laptop,
  ListOrdered,
  Music,
  Radio,
  Rocket,
  Search,
  ScanFace,
  Server,
  ShieldCheck,
  Smartphone,
  Split,
  Zap,
} from "lucide-react";
import { useLive, containerState, shortStatus, gb } from "@/components/Live";
import Tooltip from "@/components/Tooltip";
import { projects, services, platform, tailnetHost } from "@/lib/site";

const [grab, paper, queue] = projects;
const find = (list, label) => list.find((c) => c.label.includes(label)).match;
const svc = (name) => services.find((s) => s.name === name).containers.map((c) => c.match);

// positions use the 1240 x 825 viewBox
const NODES = [
  // outside
  { x: 20, y: 40, w: 180, access: "external", title: "Visitor's browser", sub: "any device", icon: Globe,
    info: "Loads a project's frontend, which then calls that project's API over HTTPS." },
  { x: 20, y: 135, w: 180, access: "external", title: "Project frontends", sub: "hosted separately", icon: AppWindow,
    info: "The Next.js and React frontends are deployed elsewhere. Only the backends run on this server." },
  { x: 20, y: 235, w: 180, access: "external", title: "Cloudflare", sub: "DNS, TLS, edge proxy", icon: Cloud,
    info: "Runs DNS for abdullahazmi.com and terminates HTTPS. Every *.abdullahazmi.com hostname is mapped to the tunnel, so visitors only ever see Cloudflare's IP addresses." },
  { x: 20, y: 345, w: 180, access: "external", title: "GitHub", sub: "source and webhooks", icon: GitBranch,
    info: "Pushing to a project's main branch sends a webhook to Coolify. Coolify then pulls the code and deploys a new container." },
  { x: 20, y: 620, w: 180, access: "external", dy: 34, title: "My phone", sub: "Tailscale client", icon: Smartphone,
    info: "Backs up photos to Immich over Tailscale from anywhere." },
  { x: 20, y: 710, w: 180, access: "external", dy: 34, title: "My laptop", sub: "Tailscale client", icon: Laptop,
    info: `Used for SSH and for the Coolify, Uptime Kuma and Paperless dashboards. All of it goes through Tailscale to "${tailnetHost}".` },

  { x: 1035, y: 190, w: 190, access: "external", dy: 22, title: "Amazon S3", sub: "object storage", icon: Archive,
    info: "Stores the original event photos uploaded to GrabPic." },
  { x: 1035, y: 250, w: 190, access: "external", dy: 22, title: "Amazon SQS", sub: "message queue", icon: ListOrdered,
    info: "Holds face detection jobs. The worker on the home server polls this queue, so it never needs a public address." },
  { x: 1035, y: 325, w: 190, access: "external", dy: 22, title: "Supabase", sub: "Postgres with pgvector", icon: Database,
    info: "Stores face embeddings and runs the nearest-neighbor search that matches a selfie to photos." },
  { x: 1035, y: 525, w: 190, access: "external", dy: 22, title: "Spotify Web API", sub: "OAuth, listening data", icon: Music,
    info: "Queue Up signs users in with Spotify and pulls their listening history to compute matches." },

  // host
  { x: 350, y: 182, w: 165, title: "cloudflared", sub: "tunnel connector", icon: Cable, access: "host",
    info: "A systemd service on the host. It holds outbound connections to Cloudflare and forwards every *.abdullahazmi.com request to Traefik on port 80." },
  { x: 350, y: 280, w: 165, title: "Traefik", sub: "reverse proxy", icon: Split, access: "public", match: ["coolify-proxy"],
    info: "Routes each request to a container by its Host header. Coolify writes these routes as Docker labels on deploy. This status page is served through it too." },
  { x: 350, y: 380, w: 165, title: "Coolify", sub: "CI/CD and deploys", icon: Rocket, access: "private",
    match: platform.containers.filter((c) => c.match !== "coolify-proxy").map((c) => c.match),
    info: "Self-hosted deployment platform. It builds images with BuildKit, runs the containers, stores environment variables and configures Traefik." },
  { x: 350, y: 640, w: 165, dy: 34, title: "Tailscale", sub: "WireGuard mesh VPN", icon: ShieldCheck, access: "host",
    info: `Only devices I have signed in and approved can join my tailnet. They reach the server as "${tailnetHost}" for SSH, dashboards and private apps. None of these have a public hostname.` },

  // GrabPic
  { x: 565, y: 204, dy: 22, title: "REST API", sub: "Spring Boot", icon: Server, access: "public", match: [find(grab.containers, "REST")],
    info: "grabpic-api.abdullahazmi.com. Handles uploads and auth with JWTs. It rate limits each IP through Redis and hands photos off to S3 and SQS." },
  { x: 565, y: 264, dy: 22, title: "Redis", sub: "rate limiting", icon: Zap, access: "internal", match: [find(grab.containers, "Redis")],
    info: "Counts requests per IP with a limit of 60 per minute. It publishes no ports and sits on Coolify's private Docker network." },
  { x: 770, y: 264, dy: 22, title: "Face detection", sub: "background worker", icon: ScanFace, access: "internal", match: [find(grab.containers, "worker")],
    info: "Polls SQS for new photos and detects the faces in each one. It then writes the face embeddings to Supabase. It has no public hostname." },
  { x: 565, y: 324, dy: 22, title: "AI search", sub: "selfie matching", icon: Search, access: "public", match: [find(grab.containers, "AI search")],
    info: "grabpic-ai.abdullahazmi.com. Turns a guest's selfie into an embedding and finds the closest matches in Supabase." },
  // PaperPulse
  { x: 565, y: 429, dy: 22, title: "REST API", sub: "FastAPI", icon: Server, access: "public", match: [find(paper.containers, "FastAPI")],
    info: "paperpulse-api.abdullahazmi.com. Serves recommendations and answers questions with retrieval-augmented generation. A nightly job ranks new papers for each user." },
  { x: 770, y: 429, dy: 22, title: "Neo4j", sub: "graph database", icon: Database, access: "internal", match: [find(paper.containers, "Neo4j")],
    info: "Stores papers, authors and topics as a graph for retrieval. The API connects over the Bolt protocol on port 7687." },
  // Queue Up
  { x: 565, y: 536, dy: 22, title: "API + WebSockets", sub: "Spring Boot", icon: Server, access: "public", match: [find(queue.containers, "API")],
    info: "queue-up.abdullahazmi.com. Computes matches from Spotify data and relays chat messages over WebSockets." },
  { x: 770, y: 572, h: 40, dy: 22, title: "PostgreSQL 17", icon: Database, access: "internal", match: [find(queue.containers, "PostgreSQL")],
    info: "Stores users, matches and chat history. It publishes no ports." },
  // private apps
  { x: 565, y: 672, dy: 34, title: "Immich", sub: `photo backup, :2283`, icon: Images, access: "private", match: svc("Immich"),
    info: `Self-hosted Google Photos alternative at ${tailnetHost}:2283. Face recognition runs on the GPU through CUDA.` },
  { x: 770, y: 672, dy: 34, title: "Paperless-ngx", sub: "document OCR, :8010", icon: FileText, access: "private", match: svc("Paperless-ngx"),
    info: `Scanned document archive with OCR and full-text search at ${tailnetHost}:8010.` },
  { x: 565, y: 726, dy: 34, title: "Uptime Kuma", sub: "monitoring, :3002", icon: Activity, access: "private", match: svc("Uptime Kuma"),
    info: `Checks every app on a schedule and alerts me when one goes down. Dashboard at ${tailnetHost}:3002.` },
  { x: 770, y: 726, dy: 34, title: "Samba + Homepage", sub: "file share, dashboard", icon: FolderOpen, access: "private", match: svc("Samba and Homepage"),
    info: `A network drive at smb://${tailnetHost} and a start page at ${tailnetHost}:3000 that links to every service.` },
];

const GROUPS = [
  { name: "GrabPic", note: grab.tagline, x: 556, y: 194, w: 418, h: 210 },
  { name: "PaperPulse", note: paper.tagline, x: 556, y: 419, w: 418, h: 92 },
  { name: "Queue Up", note: queue.tagline, x: 556, y: 526, w: 418, h: 118 },
];

// the two kinds of software on the server
const SECTIONS = [
  { title: "Personal projects", note: "public APIs for apps I built", kind: "projects", x: 543, y: 164, w: 444, h: 490 },
  { title: "Self-hosted apps", note: "for my own use, private over Tailscale", kind: "selfhosted", x: 543, y: 671, w: 444, h: 150 },
];

// [points, label, [x, y, anchor], style]  style: "dashed" | "bus" | "private" | "private-bus"
const EDGES = [
  ["110,86 110,135", "HTTPS", [118, 114, "start"]],
  ["110,181 110,235", "API calls over HTTPS", [118, 212, "start"]],
  ["200,258 325,258 325,205 350,205", "tunnel", [206, 252, "start"]],
  ["432,228 432,280", "HTTP :80", [440, 258, "start"]],
  ["515,303 535,303"],
  ["535,227 535,559", null, null, "bus", 22],
  ["535,227 565,227", null, null, null, 22],
  ["535,347 565,347", null, null, null, 22],
  ["535,452 565,452", null, null, null, 22],
  ["535,559 565,559", null, null, null, 22],
  ["200,368 325,368 325,403 350,403", "webhook", [206, 362, "start"]],
  ["432,380 432,326", "writes routes", [440, 357, "start"], "dashed"],
  ["200,643 325,643 325,656 350,656", "WireGuard", [206, 637, "start"], "private", 34],
  ["200,733 338,733 338,672 350,672", "WireGuard", [206, 727, "start"], "private", 34],
  ["515,663 542,663 542,749", null, null, "private-bus", 34],
  ["542,695 565,695", null, null, "private", 34],
  ["542,749 565,749", null, null, "private", 34],
  ["662,250 662,264", null, null, null, 22],
  ["760,213 1035,213", "stores photos", [900, 208], null, 22],
  ["760,236 1012,236 1012,266 1035,266", "enqueues jobs", [900, 231], null, 22],
  ["1035,284 965,284", "polls", [1000, 279], null, 22],
  ["867,310 867,340 1035,340", "writes embeddings", [950, 335], null, 22],
  ["760,358 1035,358", "vector search", [900, 372], null, 22],
  ["760,452 770,452", null, null, null, 22],
  ["662,582 662,592 770,592", null, null, null, 22],
  ["760,548 1035,548", "OAuth, listening data", [900, 543], null, 22],
];

const STATUS_COLOR = { up: "var(--up)", down: "var(--down)", partial: "var(--warn)", unknown: "var(--faint)" };

function Node({ n, data, onHover }) {
  const w = n.w ?? 195;
  const h = n.h ?? 46;
  const cs = n.match ? containerState(data, n.match) : null;
  const live = cs && data?.containers;
  const color = cs ? STATUS_COLOR[cs.state] : undefined;
  const status = live ? (cs.total > 1 ? `${cs.up} of ${cs.total} containers up` : shortStatus(cs.list[0])) : n.sub;
  const Icon = n.icon;
  const pad = cs ? 14 : 10;

  const show = (e) => onHover({ n, el: e.currentTarget });

  return (
    <g
      className={`node access-${n.access ?? "external"}`}
      transform={`translate(${n.x} ${n.y + (n.dy ?? 0)})`}
      tabIndex={0}
      role="button"
      aria-label={`${n.title}. ${n.info}`}
      onMouseEnter={show}
      onFocus={show}
      onClick={show}
      onMouseLeave={() => onHover(null)}
      onBlur={() => onHover(null)}
    >
      <rect width={w} height={h} rx="6" className="node-box" />
      {cs && <rect x="1" y="1" width="5" height={h - 2} rx="2" fill={color} />}
      <Icon x={pad} y={h / 2 - 8} width={16} height={16} className="node-icon" />
      <text x={pad + 24} y={status ? 20 : h / 2 + 4} className="node-title">
        {n.title}
      </text>
      {status && (
        <text x={pad + 24} y="36" className="node-sub" fill={live ? color : undefined}>
          {status}
        </text>
      )}
    </g>
  );
}

// small two-line stat in the server header; the value flashes when it changes
function Stat({ x, label, value }) {
  return (
    <g>
      <text x={x} y="130" className="stat-label">
        {label}
      </text>
      <text key={value} x={x} y="148" className="stat-value flash">
        {value}
      </text>
    </g>
  );
}

export default function SystemMap() {
  const { data, history, lost } = useLive();
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  // CPU over the last 2 minutes, drawn as a sparkline in the server header
  const recent = history.slice(-60).filter((p) => p.cpu != null);
  const spark = recent
    .map((p, i) => `${i ? "L" : "M"}${(628 - ((recent.length - 1 - i) / 59) * 72).toFixed(1)},${(145 - (Math.min(p.cpu, 100) / 100) * 18).toFixed(1)}`)
    .join("");
  const cpu = data?.cpuPct ?? null;
  const ram = data ? `${(data.memUsed / 1024 ** 3).toFixed(1)}/${gb(data.memTotal)}` : null;

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div className="map-scroll">
        <div className="map-inner">
          <svg viewBox="0 0 1240 860" className="map" aria-label="Architecture diagram of the home server">
            <defs>
              <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" className="arrowhead" />
              </marker>
              <marker id="arrow-private" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" className="arrowhead private" />
              </marker>
            </defs>

            {/* home network */}
            <rect x="250" y="100" width="750" height="745" rx="14" className="home" />
            <text x="268" y="89" className="home-label">
              Home network
            </text>

            {/* server */}
            <rect x="330" y="115" width="660" height="715" rx="10" className="server" />
            <path d="M330,157 H990" className="server-rule" />
            <Server x={348} y={127} width={18} height={18} className="node-icon" />
            <text x="374" y="135" className="server-name">
              Home server
            </text>
            <text x="374" y="150" className="server-sub">
              Acer Nitro 5 laptop
            </text>

            {/* live readout */}
            <g className={`live-readout ${data && !lost ? "on" : "off"}`}>
              <Radio x={500} y={129} width={14} height={14} className="live-icon" />
              <text x="518" y="141" className="live-word">
                {data && !lost ? "Live" : lost ? "Offline" : "…"}
              </text>
              <rect x="552" y="125" width="80" height="22" rx="3" className="spark-bg" />
              {spark && <path d={spark} className="spark" />}
              <title>CPU usage over the last 2 minutes</title>
            </g>
            <line x1="648" y1="124" x2="648" y2="148" className="readout-divider" />
            <Stat x={662} label="CPU" value={cpu != null ? `${cpu}%` : "–"} />
            <Stat x={710} label="CPU temp" value={data?.cpuTemp != null ? `${data.cpuTemp}°C` : "–"} />
            <Stat x={772} label="RAM" value={ram ?? "–"} />
            {data?.gpu && <Stat x={876} label="GPU" value={`${data.gpu.util}%`} />}
            {data?.gpu && <Stat x={922} label="GPU temp" value={`${data.gpu.temp}°C`} />}

            {/* home router: a translucent band the connections pass through */}
            <g className="router">
              <rect x="270" y="176" width="36" height="604" rx="8" />
              <text x="288" y="800" textAnchor="middle">
                <tspan x="288" className="router-title">Router</tspan>
                <tspan x="288" dy="15">no inbound</tspan>
                <tspan x="288" dy="13">ports open</tspan>
              </text>
            </g>

            {SECTIONS.map((sec) => (
              <g key={sec.title}>
                <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h} rx="10" className={`section-box ${sec.kind}`} />
                <text x={sec.x + 12} y={sec.y + 20} className={`section-label ${sec.kind}`}>
                  <tspan className="section-title">{sec.title}</tspan>
                  <tspan dx="8">{sec.note}</tspan>
                </text>
              </g>
            ))}

            {GROUPS.map((g) => (
              <g key={g.name}>
                <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="7" className="group" />
                <text x={g.x + 14} y={g.y + 20} className="group-label">
                  <tspan className="group-name">{g.name}</tspan>
                  <tspan dx="8">{g.note}</tspan>
                </text>
              </g>
            ))}

            {EDGES.map(([pts, , , style, dy], i) => {
              const priv = style?.startsWith("private");
              const noArrow = style === "bus" || style === "private-bus";
              return (
                <polyline
                  key={i}
                  points={pts}
                  transform={dy ? `translate(0 ${dy})` : undefined}
                  className={`edge ${style === "dashed" ? "dashed" : ""} ${priv ? "private" : ""}`}
                  markerEnd={noArrow ? undefined : priv ? "url(#arrow-private)" : "url(#arrow)"}
                />
              );
            })}

            {NODES.map((n, i) => (
              <Node key={i} n={n} data={data} onHover={setHover} />
            ))}

            {/* labels go last so nothing covers them */}
            {EDGES.filter((e) => e[1]).map(([, label, at, style, dy]) => (
              <text
                key={label + at[0] + at[1]}
                x={at[0]}
                y={at[1] + (dy ?? 0)}
                textAnchor={at[2] ?? "middle"}
                className={`edge-label ${style?.startsWith("private") ? "private" : ""}`}
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      </div>
      <Tooltip hover={hover} data={data} wrap={wrapRef.current} />
    </div>
  );
}
