/**
 * nitro-lab Server Telemetry, EWMA/Welford Thermal Anomaly Detector,
 * Docker Socket-Proxy Container Fleet Auditor, and SLA Error-Budget Engine.
 */

/**
 * Compute multi-core CPU utilization percentage from two cumulative tick snapshots.
 * Guards against OS counter resets/wraparounds and clamps output to [0, 100].
 * @param {{idle: number, total: number}|null} prev
 * @param {{idle: number, total: number}|null} curr
 * @returns {number|null}
 */
export function computeCpuUtilization(prev, curr) {
  if (!prev || !curr) return null;
  const totalDelta = Number(curr.total) - Number(prev.total);
  const idleDelta = Number(curr.idle) - Number(prev.idle);
  if (!Number.isFinite(totalDelta) || !Number.isFinite(idleDelta) || totalDelta <= 0 || idleDelta < 0) {
    return 0;
  }
  const busyRatio = 1 - idleDelta / totalDelta;
  return Math.max(0, Math.min(100, Math.round(busyRatio * 100)));
}

/**
 * Classify CPU/GPU package temperature (°C) into operational thermal tiers.
 * @param {number|null} tempC
 * @param {{elevated?: number, throttling?: number, critical?: number}} thresholds
 */
export function classifyThermalState(
  tempC,
  { elevated = 70, throttling = 85, critical = 95 } = {}
) {
  if (tempC === null || tempC === undefined || !Number.isFinite(Number(tempC))) {
    return 'unknown';
  }
  const t = Number(tempC);
  if (t >= critical) return 'critical';
  if (t >= throttling) return 'throttling_risk';
  if (t >= elevated) return 'elevated';
  return 'nominal';
}

/**
 * Online EWMA and Welford variance anomaly detector for server telemetry streams.
 */
export class TelemetryAnomalyDetector {
  constructor({ alpha = 0.25, zThreshold = 2.5, minSamples = 5 } = {}) {
    this.alpha = alpha;
    this.zThreshold = zThreshold;
    this.minSamples = minSamples;
    this.metrics = new Map();
  }

  _updateMetric(name, value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return null;
    }
    const x = Number(value);
    let m = this.metrics.get(name);
    if (!m) {
      m = { count: 1, mean: x, m2: 0.0, ewma: x };
      this.metrics.set(name, m);
      return { value: x, ewma: x, std: 0.0, zScore: 0.0, isAnomaly: false };
    }

    // Compute z-score against prior running distribution before updating
    const priorVariance = m.count > 1 ? m.m2 / (m.count - 1) : 0.0;
    const priorStd = Math.sqrt(Math.max(0, priorVariance));
    const zScore = priorStd > 1e-6 ? (x - m.mean) / priorStd : 0.0;
    const isAnomaly = m.count >= this.minSamples && Math.abs(zScore) >= this.zThreshold;

    // Welford update
    m.count += 1;
    const delta = x - m.mean;
    m.mean += delta / m.count;
    const delta2 = x - m.mean;
    m.m2 += delta * delta2;
    m.ewma = this.alpha * x + (1 - this.alpha) * m.ewma;

    return {
      value: x,
      ewma: Number(m.ewma.toFixed(3)),
      std: Number(priorStd.toFixed(3)),
      zScore: Number(zScore.toFixed(3)),
      isAnomaly,
    };
  }

  observeSnapshot(snapshot) {
    const cpuStat = this._updateMetric('cpuPct', snapshot.cpuPct);
    const tempStat = this._updateMetric('cpuTemp', snapshot.cpuTemp);
    const memRatio =
      snapshot.memTotal > 0 ? (snapshot.memUsed / snapshot.memTotal) * 100 : null;
    const memStat = this._updateMetric('memPct', memRatio);
    const gpuTempStat = this._updateMetric('gpuTemp', snapshot.gpu?.temp ?? null);

    const thermalState = classifyThermalState(snapshot.cpuTemp);
    const gpuThermalState = classifyThermalState(snapshot.gpu?.temp ?? null, {
      elevated: 68,
      throttling: 82,
      critical: 90,
    });

    const alerts = [];
    if (cpuStat?.isAnomaly && cpuStat.zScore > 0) {
      alerts.push({ metric: 'cpuPct', type: 'spike', zScore: cpuStat.zScore, value: cpuStat.value });
    }
    if (tempStat?.isAnomaly && tempStat.zScore > 0) {
      alerts.push({ metric: 'cpuTemp', type: 'thermal_spike', zScore: tempStat.zScore, value: tempStat.value });
    }
    if (thermalState === 'throttling_risk' || thermalState === 'critical') {
      alerts.push({ metric: 'cpuTemp', type: thermalState, value: snapshot.cpuTemp });
    }
    if (memRatio !== null && memRatio >= 90) {
      alerts.push({ metric: 'memPct', type: 'memory_pressure', value: Number(memRatio.toFixed(2)) });
    }

    return {
      at: snapshot.at || new Date().toISOString(),
      thermalState,
      gpuThermalState,
      stats: {
        cpuPct: cpuStat,
        cpuTemp: tempStat,
        memPct: memStat,
        gpuTemp: gpuTempStat,
      },
      alerts,
    };
  }
}

/**
 * Parse a Docker status string and container state into structured diagnostics.
 */
export function parseDockerContainerStatus(container) {
  if (!container) {
    return {
      state: 'missing',
      status: 'not found',
      health: 'missing',
      exitCode: null,
      oomKilled: false,
      isCrashLooping: false,
    };
  }

  const state = (container.State || 'unknown').toLowerCase();
  const status = container.Status || '';
  let health = 'none';
  if (/\(healthy\)/i.test(status)) health = 'healthy';
  else if (/\(unhealthy\)/i.test(status)) health = 'unhealthy';
  else if (/\(health:\s*starting\)/i.test(status)) health = 'starting';

  let exitCode = null;
  const exitMatch = status.match(/(?:Exited|Restarting)\s*\((\d+)\)/i);
  if (exitMatch) {
    exitCode = Number(exitMatch[1]);
  } else if (typeof container.ExitCode === 'number') {
    exitCode = container.ExitCode;
  }

  const oomKilled = Boolean(container.OOMKilled) || exitCode === 137;
  const isCrashLooping =
    state === 'restarting' ||
    health === 'unhealthy' ||
    oomKilled ||
    (state === 'exited' && exitCode !== null && exitCode !== 0);

  return {
    state,
    status,
    health,
    exitCode,
    oomKilled,
    isCrashLooping,
  };
}

/**
 * Compute capped exponential backoff delay (ms) for container restart remediation.
 */
export function computeBackoffDelayMs(restartCount, { baseMs = 2000, maxMs = 300000 } = {}) {
  const n = Math.max(0, Math.floor(Number(restartCount) || 0));
  const raw = baseMs * Math.pow(2, Math.min(n, 20));
  return Math.min(maxMs, raw);
}

/**
 * Match Docker socket-proxy `/containers/json?all=1` array against allowlist entries
 * (supporting both exact container names and 24-char Coolify deployment IDs)
 * and generate fleet health summary + remediation actions.
 */
export function evaluateContainerFleetHealth(dockerList, allowlist) {
  const list = Array.isArray(dockerList) ? dockerList : [];
  const entries = Array.isArray(allowlist) ? allowlist : [];

  const containersByMatch = {};
  const incidents = [];
  let runningCount = 0;
  let healthyCount = 0;

  for (const item of entries) {
    const matchKey = item.match;
    const cleanNames = (c) => (c.Names || []).map((n) => n.replace(/^\//, ''));
    const matched =
      list.find((c) => cleanNames(c).includes(matchKey)) ??
      (/^[a-z0-9]{24}$/.test(matchKey)
        ? list.find((c) => cleanNames(c).some((n) => n.startsWith(`${matchKey}-`)))
        : undefined);

    const diag = parseDockerContainerStatus(matched);
    containersByMatch[matchKey] = diag;

    if (diag.state === 'running') runningCount++;
    if (diag.state === 'running' && diag.health !== 'unhealthy') healthyCount++;

    if (diag.state !== 'running' || diag.isCrashLooping) {
      const restarts = Number(matched?.RestartCount || (diag.state === 'restarting' ? 3 : 1));
      incidents.push({
        match: matchKey,
        label: item.label || matchKey,
        state: diag.state,
        status: diag.status,
        oomKilled: diag.oomKilled,
        exitCode: diag.exitCode,
        recommendedBackoffMs: computeBackoffDelayMs(restarts),
        action: diag.oomKilled
          ? 'increase_memory_limit_and_restart'
          : diag.state === 'missing'
          ? 'redeploy_stack'
          : 'inspect_logs_and_restart_with_backoff',
      });
    }
  }

  return {
    totalAllowlisted: entries.length,
    runningCount,
    healthyCount,
    degradedCount: entries.length - healthyCount,
    containers: containersByMatch,
    incidents,
  };
}

/**
 * Compute composite SLA uptime and 30-day error-budget burn rate from Uptime Kuma monitors.
 * @param {Record<string, number>} uptimeMap Monitor name -> [0, 1] availability ratio
 * @param {number} slaTarget Target availability in [0, 1), e.g., 0.995 (99.5%)
 */
export function computeErrorBudget(uptimeMap, slaTarget = 0.995) {
  const entries = Object.entries(uptimeMap || {}).filter(
    ([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
  );

  if (entries.length === 0) {
    return {
      monitorCount: 0,
      meanUptime: null,
      worstMonitor: null,
      slaTarget,
      errorBudgetRemainingPct: 100,
      burnRate: 0,
      breached: false,
    };
  }

  const allowedDowntime = Math.max(1e-9, 1 - slaTarget);
  let sum = 0;
  let worstName = entries[0][0];
  let worstVal = entries[0][1];

  for (const [name, val] of entries) {
    sum += val;
    if (val < worstVal) {
      worstVal = val;
      worstName = name;
    }
  }

  const meanUptime = sum / entries.length;
  const actualDowntime = Math.max(0, 1 - meanUptime);
  const burnRate = actualDowntime / allowedDowntime;
  const remainingPct = Math.max(0, Math.min(100, (1 - burnRate) * 100));

  return {
    monitorCount: entries.length,
    meanUptime: Number(meanUptime.toFixed(6)),
    worstMonitor: { name: worstName, uptime: worstVal },
    slaTarget,
    errorBudgetRemainingPct: Number(remainingPct.toFixed(2)),
    burnRate: Number(burnRate.toFixed(3)),
    breached: meanUptime < slaTarget,
  };
}
