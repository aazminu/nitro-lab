import {
  Activity,
  AppWindow,
  Gpu,
  Undo2,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Briefcase,
  Cable,
  Cloud,
  Code,
  Container,
  Cpu,
  FolderGit2,
  Globe,
  HardDrive,
  KeyRound,
  Laptop,
  Lock,
  MemoryStick,
  Music,
  Network,
  Plug,
  ScanFace,
  Server,
  ShieldCheck,
  Split,
  Terminal,
  UserRound,
  Wifi,
  Workflow,
} from "lucide-react";
import { LiveProvider } from "@/components/Live";
import Mark from "@/components/Mark";
import { LiveBadge, LocalNotice, Vitals, Inventory } from "@/components/LiveBits";
import SystemMap from "@/components/SystemMap";
import Charts from "@/components/Charts";
import ProjectDiagram from "@/components/ProjectDiagram";
import {
  owner,
  projects,
  services,
  platform,
  hardware,
  requestStory,
  allowlist,
  tailnetHost,
  pageHost,
} from "@/lib/site";

const ICONS = { AppWindow, BookOpen, Gpu, Undo2, Cable, Container, Cpu, Globe, HardDrive, Laptop, Lock, MemoryStick, Music, Plug, ScanFace, Server, Split, Terminal, Wifi };

function Section({ icon: Icon, title, children, id }) {
  return (
    <section className="wide section" id={id}>
      <h2>
        <Icon size={22} aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  const matches = allowlist.map((c) => c.match);

  const publicRows = [
    ...projects.flatMap((p) => p.containers.filter((c) => c.url).map((c) => [c.label, c.url])),
    ["This status page", pageHost],
  ];
  const privateRows = [
    ["SSH", `ssh aazminu@${tailnetHost}`],
    ["Coolify dashboard", `${tailnetHost}:8000`],
    ...services
      .flatMap((s) => s.containers)
      .filter((c) => c.access === "private")
      .map((c) => [c.label, c.match === "samba" ? `smb://${tailnetHost}` : `${tailnetHost}:${c.port}`]),
  ];

  return (
    <LiveProvider>
      <header className="top">
        <div className="wide top-inner">
          <a href="#" className="brand">
            <Mark size={26} />
            Abdullah's Home Server
          </a>
          <nav aria-label="Links">
            <LiveBadge />
            <a href={owner.portfolio}>
              <Briefcase size={16} aria-hidden="true" /> Portfolio
            </a>
            <a href={owner.github}>
              <FolderGit2 size={16} aria-hidden="true" /> GitHub
            </a>
            <a href={owner.linkedin}>
              <UserRound size={16} aria-hidden="true" /> LinkedIn
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="wide intro">
          <h1>A self-hosted server for my personal projects</h1>
          <p className="lede">
            I converted my old gaming laptop into a Linux server that hosts the backends of my personal projects.
            Public traffic arrives through a Cloudflare Tunnel, so my home network has no open ports, while admin
            tools and personal apps stay private behind Tailscale. The whole setup costs about $1 a month to run;
            the same workloads on AWS would cost roughly $100.
          </p>
          <p className="lede">
            Every status, chart and number on this page is read from the server in real time.
          </p>
          <p className="chips-label">Built with</p>
          <ul className="chips" aria-label="Built with">
            <li><Terminal size={15} aria-hidden="true" /> Ubuntu Server 26.04</li>
            <li><Container size={15} aria-hidden="true" /> Docker</li>
            <li><Workflow size={15} aria-hidden="true" /> Coolify CI/CD</li>
            <li><Split size={15} aria-hidden="true" /> Traefik</li>
            <li><Cable size={15} aria-hidden="true" /> Cloudflare Tunnel</li>
            <li><ShieldCheck size={15} aria-hidden="true" /> Tailscale</li>
            <li><Activity size={15} aria-hidden="true" /> Uptime Kuma</li>
          </ul>
          <Vitals allowlist={matches} />
          <LocalNotice />
        </section>

        <Section icon={Network} title="Architecture" id="architecture">
          <ul className="legend" aria-label="Legend">
            <li><span className="swatch public" /> Public through Cloudflare</li>
            <li><span className="swatch private" /> Private, reached over Tailscale</li>
            <li><span className="swatch internal" /> Internal Docker network only</li>
            <li><span className="swatch host" /> Service running directly on the host</li>
            <li><span className="swatch external" /> Outside my home network</li>
          </ul>
          <SystemMap />
          <p className="caption">
            The colored bar on each app shows its live Docker status. Hover, tap or tab to a box to see its role,
            image, port and container status.
            <span className="scroll-hint"> Scroll sideways to see the full diagram.</span>
          </p>
        </Section>

        <Section icon={Globe} title="Following one request through the system" id="requests">
          <p className="section-note">
            Here's what happens, step by step, when someone uses one of my projects.
          </p>
          <ol className="story">
            {requestStory.map((s) => {
              const Icon = ICONS[s.icon];
              return (
                <li key={s.lead}>
                  <span className="story-icon">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <p>
                    <strong>{s.lead}</strong> {s.text}
                  </p>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section icon={KeyRound} title="What's public and what's private" id="access">
          <div className="access">
            <div className="access-col public">
              <h3>
                <Globe size={17} aria-hidden="true" /> Public through Cloudflare
              </h3>
              <p>
                Anyone can reach these. The tunnel forwards every *.abdullahazmi.com hostname to Traefik, which
                routes it to the matching container.
              </p>
              <dl>
                {publicRows.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd><code>{v}</code></dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="access-col private">
              <h3>
                <ShieldCheck size={17} aria-hidden="true" /> Private, reached over Tailscale
              </h3>
              <p>
                These have no public hostname and aren't routed through the tunnel. I reach them from anywhere on
                devices I've approved in Tailscale, using the server's MagicDNS name.
              </p>
              <dl>
                {privateRows.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd><code>{v}</code></dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="access-col internal">
              <h3>
                <Lock size={17} aria-hidden="true" /> Internal only
              </h3>
              <p>
                Databases, caches and helper services don't publish any ports. Only containers on the same Docker
                network can reach them, by service name.
              </p>
              <dl>
                <div><dt>Databases</dt><dd>4 PostgreSQL instances and Neo4j</dd></div>
                <div><dt>Caches and queues</dt><dd>3 Redis instances and Valkey</dd></div>
                <div><dt>Workers and helpers</dt><dd>GrabPic face worker, Immich ML, Tika, Gotenberg</dd></div>
                <div><dt>This page</dt><dd>Read-only Docker socket proxy</dd></div>
              </dl>
            </div>
          </div>
        </Section>

        <Section icon={Activity} title="Live metrics, last 10 minutes" id="metrics">
          <Charts />
        </Section>

        <Section icon={FolderGit2} title="Projects hosted here" id="projects">
          <div className="projects">
            {projects.map((p) => {
              const Icon = ICONS[p.icon];
              return (
                <article key={p.name} className="project">
                  <div className="project-head">
                    <span className="project-icon">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <div className="project-title">
                      <h3>{p.name}</h3>
                      <p className="kicker">Personal project: {p.tagline.charAt(0).toLowerCase() + p.tagline.slice(1)}</p>
                    </div>
                    <div className="project-links">
                      {p.live && (
                        <a href={p.live}>
                          Live demo <ArrowUpRight size={15} aria-hidden="true" />
                        </a>
                      )}
                      {p.code && (
                        <a href={p.code}>
                          <Code size={15} aria-hidden="true" /> Source
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="why">{p.why}</p>
                  <ProjectDiagram name={p.name} />
                </article>
              );
            })}
          </div>
        </Section>

        <Section icon={Boxes} title="Container inventory" id="containers">
          <p className="section-note">
            {allowlist.length} containers grouped by the app they belong to, with live status from Docker.
          </p>
          <Inventory
            groups={[
              ...projects.map((p) => ({ name: p.name, containers: p.containers })),
              ...services.map((s) => ({ name: s.name, containers: s.containers })),
              { name: "Coolify platform", containers: platform.containers },
            ]}
          />
        </Section>

        <Section icon={HardDrive} title="Hardware" id="hardware">
          <ul className="spec">
            {hardware.map(([icon, k, v]) => {
              const Icon = ICONS[icon];
              return (
                <li key={k}>
                  <Icon size={18} aria-hidden="true" />
                  <span className="spec-key">{k}</span>
                  <span>{v}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      </main>

      <footer className="wide">
        <h2>
          <Code size={22} aria-hidden="true" />
          How this page works
        </h2>
        <p>
          This page is a Next.js app running on the same server it describes. Every two seconds, a background job
          on the server records CPU, memory, GPU and disk usage. Every ten seconds, it also checks container health
          through a proxy that only allows read access to the Docker API.
        </p>
        <p>
          Your browser receives these readings as they happen over Server-Sent Events, so nothing on the page
          needs to refresh. Containers that aren't shown here are filtered out on the server, so their names and
          status never leave the machine.
        </p>
      </footer>
    </LiveProvider>
  );
}
