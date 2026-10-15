"use client";

import { AppWindow, Archive, Database, ListOrdered, Music, ScanFace, Search, Server, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { useLive, containerState } from "@/components/Live";
import Tooltip from "@/components/Tooltip";
import { projects } from "@/lib/site";

const find = (name, label) =>
  projects.find((p) => p.name === name).containers.find((c) => c.label.includes(label)).match;

// Zones: elsewhere (x 0-170), home server (198-536), cloud services (555-740)
const LAYOUTS = {
  GrabPic: {
    h: 215,
    nodes: [
      { x: 15, y: 90, w: 140, title: "Next.js", sub: "frontend", icon: AppWindow, access: "external", info: "The web app guests and organizers use. It is hosted separately and calls both public APIs over HTTPS." },
      { x: 212, y: 20, title: "Spring Boot", sub: "REST API", icon: Server, access: "public", match: find("GrabPic", "REST"), info: "grabpic-api.abdullahazmi.com. Handles uploads and JWT auth, rate limits through Redis, and hands photos to S3 and SQS." },
      { x: 212, y: 90, title: "Redis", sub: "rate limiter", icon: Zap, access: "internal", match: find("GrabPic", "Redis"), info: "Tracks requests per IP with a limit of 60 per minute. It has no public port." },
      { x: 212, y: 160, title: "AI search", sub: "selfie matching", icon: Search, access: "public", match: find("GrabPic", "AI search"), info: "grabpic-ai.abdullahazmi.com. Turns a selfie into an embedding and finds the closest faces in Supabase." },
      { x: 372, y: 90, title: "Face worker", sub: "face detection", icon: ScanFace, access: "internal", match: find("GrabPic", "worker"), info: "Polls SQS for new photos, detects faces and writes their embeddings to Supabase. It has no public hostname." },
      { x: 570, y: 20, title: "Amazon S3", sub: "photo storage", icon: Archive, access: "external", info: "Stores the original event photos." },
      { x: 570, y: 90, title: "Amazon SQS", sub: "job queue", icon: ListOrdered, access: "external", info: "Queues face detection jobs so uploads return right away." },
      { x: 570, y: 160, title: "Supabase", sub: "face embeddings", icon: Database, access: "external", info: "Postgres with pgvector. Stores face embeddings and runs nearest-neighbor search." },
    ],
    edges: [
      ["155,105 185,105 185,43 212,43"],
      ["155,121 192,121 192,183 212,183"],
      ["287,66 287,90"],
      ["362,43 570,43", "stores photos", [466, 38]],
      ["362,56 540,56 540,105 570,105", "enqueues jobs", [451, 69]],
      ["570,121 522,121"],
      ["447,136 447,176 570,176", "writes embeddings", [508, 171]],
      ["362,190 570,190", "vector search", [466, 203]],
    ],
  },
  PaperPulse: {
    h: 200,
    nodes: [
      { x: 15, y: 55, w: 140, title: "Next.js", sub: "frontend", icon: AppWindow, access: "external", info: "The PaperPulse web app. It is hosted separately and calls the API over HTTPS." },
      { x: 212, y: 55, title: "FastAPI", sub: "API, nightly ranking", icon: Server, access: "public", match: find("PaperPulse", "FastAPI"), info: "paperpulse-api.abdullahazmi.com. Ranks new papers every night and answers questions with retrieval-augmented generation." },
      { x: 212, y: 140, title: "Neo4j", sub: "graph for RAG", icon: Database, access: "internal", match: find("PaperPulse", "Neo4j"), info: "Graph of papers, authors and topics used for retrieval. The API connects over Bolt." },
      { x: 570, y: 55, title: "PostgreSQL", sub: "pgvector search", icon: Database, access: "external", info: "Stores users and paper embeddings for vector search. It is hosted separately." },
    ],
    edges: [
      ["155,78 212,78"],
      ["287,101 287,140", "Bolt", [295, 125, "start"]],
      ["362,78 570,78", "SQL, vector search", [466, 72]],
    ],
  },
  "Queue Up": {
    h: 200,
    nodes: [
      { x: 15, y: 55, w: 140, title: "React", sub: "frontend", icon: AppWindow, access: "external", info: "The Queue Up web app. It is hosted separately and connects over HTTPS and WebSockets." },
      { x: 212, y: 55, title: "Spring Boot", sub: "REST + WebSockets", icon: Server, access: "public", match: find("Queue Up", "API"), info: "queue-up.abdullahazmi.com. Computes matches from Spotify data and relays chat messages over WebSockets." },
      { x: 212, y: 140, title: "PostgreSQL 17", sub: "users, chats", icon: Database, access: "internal", match: find("Queue Up", "PostgreSQL"), info: "Stores users, matches and chat history. It has no public port." },
      { x: 570, y: 55, title: "Spotify Web API", sub: "listening history", icon: Music, access: "external", info: "Signs users in with OAuth and provides their listening history." },
    ],
    edges: [
      ["155,78 212,78"],
      ["287,101 287,140", "JDBC", [295, 125, "start"]],
      ["362,78 570,78", "OAuth, listening data", [466, 72]],
    ],
  },
};

const COLOR = { up: "var(--up)", down: "var(--down)", partial: "var(--warn)", unknown: "var(--faint)" };

export default function ProjectDiagram({ name }) {
  const { data } = useLive();
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const L = LAYOUTS[name];
  if (!L) return null;
  const id = `arrow-${name.replace(/\s/g, "")}`;

  return (
    <div className="mini-wrap" ref={wrapRef}>
    <div className="mini-scroll">
      <svg viewBox={`0 0 740 ${L.h + 36}`} className="mini" role="img" aria-label={`${name}: what runs on the home server and what runs elsewhere`}>
        <defs>
          <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" className="arrowhead" />
          </marker>
        </defs>

        <rect x="1" y="1" width="169" height={L.h + 34} rx="8" className="zone external" />
        <rect x="198" y="1" width="338" height={L.h + 34} rx="8" className="zone zone-home" />
        <rect x="555" y="1" width="184" height={L.h + 34} rx="8" className="zone external" />
        <text x="85" y="22" textAnchor="middle" className="zone-label">Hosted elsewhere</text>
        <text x="367" y="22" textAnchor="middle" className="zone-label strong">Home server</text>
        <text x="647" y="22" textAnchor="middle" className="zone-label">Cloud services</text>

        <g transform="translate(0 30)">
        {L.edges.map(([pts, label, at], i) => (
          <g key={i}>
            <polyline points={pts} className="edge" markerEnd={`url(#${id})`} />
            {label && (
              <text x={at[0]} y={at[1]} textAnchor={at[2] ?? "middle"} className="edge-label">
                {label}
              </text>
            )}
          </g>
        ))}

        {L.nodes.map((n, i) => {
          const w = n.w ?? (n.x > 550 ? 155 : 150);
          const cs = n.match ? containerState(data, [n.match]) : null;
          const Icon = n.icon;
          const pad = cs ? 13 : 10;
          return (
            <g
              key={i}
              className={`node access-${n.access}`}
              transform={`translate(${n.x} ${n.y})`}
              tabIndex={0}
              role="button"
              aria-label={`${n.title}. ${n.info}`}
              onMouseEnter={(e) => setHover({ n: { ...n, match: n.match ? [n.match] : undefined }, el: e.currentTarget })}
              onFocus={(e) => setHover({ n: { ...n, match: n.match ? [n.match] : undefined }, el: e.currentTarget })}
              onClick={(e) => setHover({ n: { ...n, match: n.match ? [n.match] : undefined }, el: e.currentTarget })}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
            >
              <rect width={w} height="46" rx="6" className="node-box" />
              {cs && <rect x="1" y="1" width="5" height="44" rx="2" fill={COLOR[cs.state]} />}
              <Icon x={pad} y={15} width={16} height={16} className="node-icon" />
              <text x={pad + 23} y="20" className="node-title">
                {n.title}
              </text>
              <text x={pad + 23} y="36" className="node-sub">
                {n.sub}
              </text>
            </g>
          );
        })}
        </g>
      </svg>
    </div>
    <Tooltip hover={hover} data={data} wrap={wrapRef.current} />
    </div>
  );
}
