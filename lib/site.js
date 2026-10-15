// All page content lives here.
//
// `match` ties an entry to a real container:
//   - Coolify apps are named like "agyagczkxvu3adrftdtpkfnz-020141617359".
//     The first part is the app's Coolify ID and stays the same across deploys,
//     so match on that. It also appears in the app's URL in the Coolify dashboard.
//   - Containers with fixed names match on the full name.
// Only containers listed here are ever reported by the API.
//
// `access`: "public"   reachable from the internet through Cloudflare Tunnel
//           "private"  not exposed to the internet, reached over Tailscale
//           "internal" only reachable from other containers on its Docker network
//
// `monitor` (optional): monitor name on the Uptime Kuma status page.

export const owner = {
  name: "Abdullah Azmi",
  portfolio: "https://abdullahazmi.com",
  github: "https://github.com/aazminu",
  linkedin: "https://linkedin.com/in/aazminu",
};

// Tailscale MagicDNS name of the server
export const tailnetHost = "nitro";

// Public hostname of this page
export const pageHost = "lab.abdullahazmi.com";

export const projects = [
  {
    name: "GrabPic",
    tagline: "Face search for event photos",
    icon: "ScanFace",
    why: "Event photos usually end up in one huge shared album. Finding yourself means scrolling through hundreds of pictures. With GrabPic a guest uploads one selfie and gets back only the photos they appear in. Face embeddings find the matches in under 200 ms.",
    api: "https://grabpic-api.abdullahazmi.com",
    live: null, // frontend URL
    code: "https://github.com/aazminu/grab-pic",
    containers: [
      { label: "GrabPic REST API", match: "ajb7bzgj6arfogwvybizd9oc", image: "aazminu/grab-pic", port: "8080", access: "public", url: "grabpic-api.abdullahazmi.com", monitor: null },
      { label: "GrabPic AI search service", match: "izufuphdystnelhmflkz1w3j", image: "aazminu/grab-pic", port: "5000", access: "public", url: "grabpic-ai.abdullahazmi.com", monitor: null },
      { label: "GrabPic face detection worker", match: "dif634us5vgfbt4gvzxtlkjf", image: "aazminu/grab-pic", port: "3000", access: "internal" },
      { label: "GrabPic Redis", match: "3lfhrgzuy1rpdfxfugy0xuep", image: "redis:7.2", port: "6379", access: "internal" },
    ],
  },
  {
    name: "PaperPulse",
    tagline: "Personalized research paper digest",
    icon: "BookOpen",
    why: "Hundreds of new research papers come out every day. Nobody has time to skim them all. Every night PaperPulse ranks the new papers against each user's interests and picks the 25 most relevant. Users can then ask questions about those papers. Answers come from retrieval-augmented generation over a Neo4j graph.",
    api: "https://paperpulse-api.abdullahazmi.com",
    live: null,
    code: "https://github.com/aazminu/paper-pulse",
    containers: [
      { label: "PaperPulse FastAPI backend", match: "n7bks9vmybfaelywq7g6molq", image: "aazminu/paper-pulse", port: "8000", access: "public", url: "paperpulse-api.abdullahazmi.com", monitor: null },
      { label: "PaperPulse Neo4j", match: "paperpulse-neo4j", image: "neo4j:5.26-community", port: "7474, 7687", access: "internal" },
    ],
  },
  {
    name: "Queue Up",
    tagline: "Social matching through music taste",
    icon: "Music",
    why: "Music taste says a lot about a person. Most social apps ignore it anyway. Queue Up matches people by their Spotify listening history. Matched users can then chat in real time over WebSockets.",
    api: "https://queue-up.abdullahazmi.com",
    live: null,
    code: "https://github.com/aazminu/Queue-Up",
    containers: [
      { label: "Queue Up REST and WebSocket API", match: "agyagczkxvu3adrftdtpkfnz", image: "aazminu/Queue-Up", port: "8080", access: "public", url: "queue-up.abdullahazmi.com", monitor: null },
      { label: "Queue Up PostgreSQL", match: "queueup-postgres", image: "postgres:17", port: "5432", access: "internal" },
    ],
  },
];

export const services = [
  {
    name: "Immich",
    role: "Photo and video backup from my phone, with face recognition on the GPU",
    port: "2283",
    containers: [
      { label: "Immich server", match: "immich_server", image: "immich-server:v3", port: "2283", access: "private" },
      { label: "Immich machine learning (CUDA)", match: "immich_machine_learning", image: "immich-machine-learning:v3-cuda", port: "3003", access: "internal" },
      { label: "Immich Postgres with vector search", match: "immich_postgres", image: "immich-app/postgres:14-vectorchord", port: "5432", access: "internal" },
      { label: "Immich Valkey (Redis-compatible cache)", match: "immich_redis", image: "valkey/valkey:9", port: "6379", access: "internal" },
    ],
  },
  {
    name: "Paperless-ngx",
    role: "Scanned document archive with OCR and full-text search",
    port: "8010",
    containers: [
      { label: "Paperless-ngx web app", match: "paperless", image: "paperless-ngx:latest", port: "8010", access: "private" },
      { label: "Apache Tika (text extraction)", match: "paperless-tika", image: "apache/tika:3.2.3.0-full", port: "9998", access: "internal" },
      { label: "Gotenberg (Office files to PDF)", match: "paperless-gotenberg", image: "gotenberg/gotenberg:8", port: "3000", access: "internal" },
      { label: "Paperless PostgreSQL", match: "paperless-db", image: "postgres:16", port: "5432", access: "internal" },
      { label: "Paperless Redis (task queue)", match: "paperless-redis", image: "redis:7", port: "6379", access: "internal" },
    ],
  },
  {
    name: "Uptime Kuma",
    role: "Health checks and alerts for every app on the server",
    port: "3002",
    containers: [{ label: "Uptime Kuma", match: "uptime-kuma", image: "louislam/uptime-kuma:1", port: "3002", access: "private" }],
  },
  {
    name: "Samba and Homepage",
    role: "Network file share and a dashboard linking to every service",
    port: null,
    containers: [
      { label: "Samba file share", match: "samba", image: "servercontainers/samba", port: "445", access: "private" },
      { label: "Homepage dashboard", match: "homepage", image: "gethomepage/homepage", port: "3000", access: "private" },
    ],
  },
];

export const platform = {
  name: "Coolify",
  role: "Self-hosted CI/CD. Builds each app from GitHub on push and configures Traefik routes",
  containers: [
    { label: "Traefik reverse proxy", match: "coolify-proxy", image: "traefik:v3.6", port: "80", access: "public" },
    { label: "Coolify dashboard", match: "coolify", image: "coollabsio/coolify:4.3.17", port: "8000", access: "private" },
    { label: "Coolify realtime (WebSockets)", match: "coolify-realtime", image: "coolify-realtime:1.0.18", port: "6001, 6002", access: "private" },
    { label: "Coolify PostgreSQL", match: "coolify-db", image: "postgres:15-alpine", port: "5432", access: "internal" },
    { label: "Coolify Redis", match: "coolify-redis", image: "redis:7-alpine", port: "6379", access: "internal" },
    { label: "Coolify Sentinel (metrics agent)", match: "coolify-sentinel", image: "coollabsio/sentinel:1.0.1", port: null, access: "internal" },
    { label: "BuildKit (image builds)", match: "buildx_buildkit_coolify-railpack0", image: "moby/buildkit", port: null, access: "internal" },
  ],
};

// Follows one public request from start to finish
export const requestStory = [
  {
    icon: "AppWindow",
    lead: "It starts in the browser.",
    text: "A visitor opens one of my project frontends, which are hosted separately. The frontend sends an API request to a subdomain such as grabpic-api.abdullahazmi.com.",
  },
  {
    icon: "Globe",
    lead: "DNS points to Cloudflare.",
    text: "Cloudflare runs DNS for my domain. The lookup returns a Cloudflare address, so my home IP address is never published.",
  },
  {
    icon: "Lock",
    lead: "Cloudflare handles HTTPS.",
    text: "The request reaches Cloudflare's edge over HTTPS. Cloudflare decrypts it there and blocks abusive traffic before anything reaches my network.",
  },
  {
    icon: "Cable",
    lead: "The request travels through a tunnel that is already open.",
    text: "The cloudflared service on my server keeps an encrypted outbound connection to Cloudflare. Every subdomain of abdullahazmi.com is mapped to that tunnel, so Cloudflare sends the request back through it. My router never accepts an incoming connection and has no ports forwarded.",
  },
  {
    icon: "Split",
    lead: "Traefik routes it to the right app.",
    text: "cloudflared hands the request to Traefik on port 80. Traefik reads the Host header and finds the route Coolify created when it deployed that app. It then passes the request to the app's container.",
  },
  {
    icon: "Container",
    lead: "The app handles the request.",
    text: "The container runs the application code. It reaches its database or Redis cache by name over a private Docker network. Some apps also call cloud services like Amazon S3 or the Spotify API.",
  },
  {
    icon: "Undo2",
    lead: "The response goes back the same way.",
    text: "The reply leaves the container through Traefik. It then travels up the tunnel to Cloudflare and back to the visitor's browser. At no point does the visitor connect to my home network directly.",
  },
  {
    icon: "Lock",
    lead: "Databases stay out of reach.",
    text: "PostgreSQL, Redis and Neo4j publish no ports. Only containers on the same Docker network can connect to them.",
  },
];

export const hardware = [
  ["Laptop", "Machine", "Acer Nitro 5 gaming laptop"],
  ["Cpu", "CPU", "Intel Core i7-11800H with 8 cores and 16 threads"],
  ["Gpu", "GPU", "NVIDIA GeForce RTX 3050 Ti with 4 GB of VRAM. Containers use it through the NVIDIA Container Toolkit"],
  ["MemoryStick", "Memory", "32 GB DDR4"],
  ["HardDrive", "System drive", "1 TB Samsung 990 EVO NVMe for the OS, Docker images and app data"],
  ["HardDrive", "Storage drive", "512 GB WD SN530 NVMe for the photo library and backups"],
  ["Wifi", "Network", "Wi-Fi, since running ethernet to its location isn't possible"],
  ["Plug", "Power", "Always on wall power because the battery no longer holds a charge"],
  ["Terminal", "OS", "Ubuntu Server 26.04 LTS with Docker Engine"],
];

// every container the API may report on
export const allowlist = [
  ...projects.flatMap((p) => p.containers),
  ...services.flatMap((s) => s.containers),
  ...platform.containers,
];
