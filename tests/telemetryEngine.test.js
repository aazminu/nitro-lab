import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCpuUtilization,
  classifyThermalState,
  TelemetryAnomalyDetector,
  parseDockerContainerStatus,
  computeBackoffDelayMs,
  evaluateContainerFleetHealth,
  computeErrorBudget,
} from '../lib/telemetryEngine.js';

test('computeCpuUtilization calculates delta % and guards against counter wraparound', () => {
  assert.equal(computeCpuUtilization(null, { idle: 100, total: 200 }), null);
  assert.equal(computeCpuUtilization({ idle: 100, total: 200 }, { idle: 125, total: 300 }), 75);
  // Counter wraparound or negative delta -> 0
  assert.equal(computeCpuUtilization({ idle: 500, total: 1000 }, { idle: 400, total: 900 }), 0);
  // Idle delta exceeding total delta -> clamped to 0
  assert.equal(computeCpuUtilization({ idle: 100, total: 200 }, { idle: 250, total: 300 }), 0);
});

test('classifyThermalState maps temperatures into nominal, elevated, throttling_risk, and critical', () => {
  assert.equal(classifyThermalState(null), 'unknown');
  assert.equal(classifyThermalState(55), 'nominal');
  assert.equal(classifyThermalState(74), 'elevated');
  assert.equal(classifyThermalState(88), 'throttling_risk');
  assert.equal(classifyThermalState(97), 'critical');
});

test('TelemetryAnomalyDetector flags sudden CPU, thermal, and memory pressure anomalies', () => {
  const detector = new TelemetryAnomalyDetector({ minSamples: 4, zThreshold: 2.0 });
  const baseline = [
    { cpuPct: 15, cpuTemp: 50, memUsed: 6e9, memTotal: 16e9 },
    { cpuPct: 17, cpuTemp: 51, memUsed: 6.2e9, memTotal: 16e9 },
    { cpuPct: 16, cpuTemp: 49, memUsed: 6.1e9, memTotal: 16e9 },
    { cpuPct: 18, cpuTemp: 52, memUsed: 6.3e9, memTotal: 16e9 },
  ];
  for (const snap of baseline) {
    const res = detector.observeSnapshot(snap);
    assert.equal(res.alerts.length, 0);
  }

  const spike = detector.observeSnapshot({
    cpuPct: 96,
    cpuTemp: 91,
    memUsed: 15.2e9,
    memTotal: 16e9,
  });
  assert.equal(spike.thermalState, 'throttling_risk');
  assert.ok(spike.alerts.some((a) => a.metric === 'cpuPct' && a.type === 'spike'));
  assert.ok(spike.alerts.some((a) => a.metric === 'cpuTemp' && a.type === 'thermal_spike'));
  assert.ok(spike.alerts.some((a) => a.metric === 'memPct' && a.type === 'memory_pressure'));
});

test('parseDockerContainerStatus detects OOM kills (137), unhealthy containers, and missing states', () => {
  const missing = parseDockerContainerStatus(null);
  assert.equal(missing.state, 'missing');

  const oom = parseDockerContainerStatus({
    State: 'exited',
    Status: 'Exited (137) 10 seconds ago',
  });
  assert.equal(oom.exitCode, 137);
  assert.equal(oom.oomKilled, true);
  assert.equal(oom.isCrashLooping, true);

  const healthy = parseDockerContainerStatus({
    State: 'running',
    Status: 'Up 6 hours (healthy)',
  });
  assert.equal(healthy.health, 'healthy');
  assert.equal(healthy.isCrashLooping, false);
});

test('evaluateContainerFleetHealth matches 24-char Coolify prefixes and exact container names', () => {
  const allowlist = [
    { label: 'GrabPic REST API', match: 'ajb7bzgj6arfogwvybizd9oc' },
    { label: 'Cloudflared Tunnel', match: 'cloudflared' },
    { label: 'Redis Cache', match: 'redis' },
  ];
  const dockerList = [
    {
      Names: ['/ajb7bzgj6arfogwvybizd9oc-09124812'],
      State: 'running',
      Status: 'Up 2 days (healthy)',
    },
    {
      Names: ['/cloudflared'],
      State: 'restarting',
      Status: 'Restarting (1) 4 seconds ago',
      RestartCount: 4,
    },
  ];

  const report = evaluateContainerFleetHealth(dockerList, allowlist);
  assert.equal(report.totalAllowlisted, 3);
  assert.equal(report.healthyCount, 1);
  assert.equal(report.degradedCount, 2);
  assert.equal(report.containers.ajb7bzgj6arfogwvybizd9oc.state, 'running');
  assert.equal(report.containers.redis.state, 'missing');
  assert.equal(report.incidents.length, 2);
  assert.equal(computeBackoffDelayMs(4, { baseMs: 2000, maxMs: 300000 }), 32000);
});

test('computeErrorBudget calculates composite SLA availability and burn rate', () => {
  const ok = computeErrorBudget({ api: 0.999, worker: 0.998 }, 0.995);
  assert.equal(ok.breached, false);
  assert.ok(ok.burnRate < 1.0);
  assert.ok(ok.errorBudgetRemainingPct > 50);

  const breached = computeErrorBudget({ api: 0.999, worker: 0.980 }, 0.995);
  assert.equal(breached.breached, true);
  assert.equal(breached.worstMonitor.name, 'worker');
  assert.equal(breached.errorBudgetRemainingPct, 0);
});
