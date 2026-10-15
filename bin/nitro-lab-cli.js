#!/usr/bin/env node
import {
  TelemetryAnomalyDetector,
  evaluateContainerFleetHealth,
  computeErrorBudget,
} from '../lib/telemetryEngine.js';

const cmd = process.argv[2] || 'audit-fleet';

if (cmd === 'audit-fleet') {
  const allowlist = [
    { label: 'GrabPic REST API', match: 'ajb7bzgj6arfogwvybizd9oc' },
    { label: 'PaperPulse FastAPI backend', match: 'n7bks9vmybfaelywq7g6molq' },
    { label: 'Traefik Reverse Proxy', match: 'traefik' },
  ];
  const mockDocker = [
    {
      Names: ['/ajb7bzgj6arfogwvybizd9oc-184210'],
      State: 'running',
      Status: 'Up 14 hours (healthy)',
    },
    {
      Names: ['/n7bks9vmybfaelywq7g6molq-184299'],
      State: 'exited',
      Status: 'Exited (137) 42 seconds ago',
      RestartCount: 3,
    },
    {
      Names: ['/traefik'],
      State: 'running',
      Status: 'Up 9 days (healthy)',
    },
  ];
  const fleet = evaluateContainerFleetHealth(mockDocker, allowlist);
  const sla = computeErrorBudget(
    { 'GrabPic API': 0.9994, 'PaperPulse API': 0.9921, 'Traefik Edge': 0.9999 },
    0.995
  );
  console.log(JSON.stringify({ fleet, sla }, null, 2));
} else if (cmd === 'simulate-anomalies') {
  const detector = new TelemetryAnomalyDetector({ minSamples: 4, zThreshold: 2.2 });
  const series = [
    { cpuPct: 18, cpuTemp: 52, memUsed: 8e9, memTotal: 16e9 },
    { cpuPct: 20, cpuTemp: 53, memUsed: 8.2e9, memTotal: 16e9 },
    { cpuPct: 19, cpuTemp: 52, memUsed: 8.1e9, memTotal: 16e9 },
    { cpuPct: 21, cpuTemp: 54, memUsed: 8.3e9, memTotal: 16e9 },
    { cpuPct: 94, cpuTemp: 89, memUsed: 15.1e9, memTotal: 16e9 },
  ];
  const results = series.map((s) => detector.observeSnapshot(s));
  console.log(JSON.stringify(results[results.length - 1], null, 2));
} else {
  console.error(`Unknown subcommand: ${cmd}. Use audit-fleet | simulate-anomalies`);
  process.exit(1);
}
