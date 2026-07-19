import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { getLogsByMonitorId } from '../features/monitoring/services/monitor.api';
import { getIncidentsByMonitorId } from '../features/monitoring/services/incident.api';
import { useMonitorEvents } from '../features/monitoring/useMonitorEvents';
import StatusBadge from '../components/common/StatusBadge';

const REFRESH_MS = 15000;

const formatDuration = (seconds) => {
  if (!seconds || seconds < 60) return `${seconds || 0}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const MonitorDetail = () => {
  const { monitorId } = useParams();
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('logs'); // 'logs' | 'incidents'
  const [expandedIncident, setExpandedIncident] = useState(null);

  const fetchData = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [logsRes, incidentsRes] = await Promise.allSettled([
          getLogsByMonitorId(monitorId),
          getIncidentsByMonitorId(monitorId),
        ]);
        if (logsRes.status === 'fulfilled') {
          setLogs(logsRes.value?.data || []);
        }
        if (incidentsRes.status === 'fulfilled') {
          setIncidents(incidentsRes.value?.data || []);
        }
        if (
          !silent &&
          logsRes.status === 'rejected' &&
          incidentsRes.status === 'rejected'
        ) {
          toast.error('Failed to load monitor data');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [monitorId]
  );

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Refresh instantly when this monitor reports a new check or incident
  const onLive = useCallback(
    (payload) => {
      if (payload?.monitorId === monitorId) fetchData(true);
    },
    [monitorId, fetchData]
  );
  useMonitorEvents({
    onMonitorUpdate: onLive,
    onIncidentNew: onLive,
    onIncidentResolved: onLive,
  });

  const monitor = logs[0]?.monitorId || incidents[0]?.monitorId;
  const latencies = logs.filter((l) => l.latency != null).map((l) => l.latency);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;
  const upLogs = logs.filter((l) => l.status === 'UP').length;
  const uptime = logs.length ? ((upLogs / logs.length) * 100).toFixed(1) : null;
  const currentStatus = logs[0]?.status;

  const stats = [
    {
      label: `Uptime · last ${logs.length}`,
      value: uptime != null ? `${uptime}%` : '—',
      color: 'text-emerald-400',
    },
    {
      label: 'Avg latency',
      value: avgLatency != null ? `${avgLatency}ms` : '—',
      color: 'text-white',
    },
    {
      label: 'Incidents',
      value: incidents.length,
      color: incidents.length ? 'text-amber-400' : 'text-white',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        ← Back to monitors
      </Link>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-white" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-white">
                  {monitor?.title || 'Monitor'}
                </h1>
                {currentStatus && (
                  <StatusBadge
                    status={currentStatus}
                    pulse={currentStatus === 'UP'}
                  />
                )}
              </div>
              {monitor?.url && (
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate font-mono text-sm text-zinc-500 hover:text-zinc-300"
                >
                  {monitor.url}
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-panel p-5">
                <p className="text-[13px] text-zinc-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${s.color}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Latency bars */}
          {logs.length > 0 && (
            <div className="mt-6 rounded-xl border border-edge bg-panel p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-zinc-400">
                  Response time
                </p>
                <p className="text-xs text-zinc-600">oldest → newest</p>
              </div>
              <div className="mt-4 flex h-24 items-end gap-0.5 overflow-hidden">
                {[...logs]
                  .slice(0, 60)
                  .reverse()
                  .map((log) => {
                    const max = Math.max(...latencies, 1);
                    const h = log.latency
                      ? Math.max(6, (log.latency / max) * 100)
                      : 100;
                    return (
                      <div
                        key={log._id}
                        title={`${log.status} · ${log.latency ?? '—'}ms · ${new Date(log.timestamp).toLocaleString()}`}
                        className={`flex-1 rounded-sm transition-all ${
                          log.status === 'UP'
                            ? 'bg-emerald-500/50 hover:bg-emerald-400'
                            : 'bg-red-500/50 hover:bg-red-400'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-8 flex gap-1 border-b border-edge">
            {[
              { id: 'logs', label: `Logs (${logs.length})` },
              { id: 'incidents', label: `Incidents (${incidents.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Logs tab */}
          {tab === 'logs' &&
            (logs.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">
                No checks recorded yet — the first check runs within seconds of
                creating a monitor.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-edge">
                <table className="w-full min-w-140 text-left text-sm">
                  <thead className="bg-panel text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Latency</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge bg-panel/40">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-panel-2/50">
                        <td className="px-4 py-3">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-300">
                          {log.latency != null ? `${log.latency}ms` : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-400">
                          {log.statusCode ?? '—'}
                        </td>
                        <td className="max-w-60 truncate px-4 py-3 text-red-400/80">
                          {log.error || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Incidents tab */}
          {tab === 'incidents' &&
            (incidents.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">
                No incidents — this monitor has been healthy.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident._id}
                    className="rounded-xl border border-edge bg-panel p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <StatusBadge
                          status={incident.status}
                          pulse={incident.status === 'ONGOING'}
                        />
                        <span className="text-sm text-zinc-400">
                          {new Date(incident.startTime).toLocaleString()}
                        </span>
                      </div>
                      {incident.status === 'RESOLVED' && (
                        <span className="text-xs text-zinc-600">
                          downtime: {formatDuration(incident.duration)}
                        </span>
                      )}
                    </div>

                    {incident.reason && (
                      <p className="mt-3 rounded-lg border border-edge/60 bg-surface px-3 py-2 font-mono text-xs text-amber-300/90">
                        {incident.reason}
                      </p>
                    )}

                    {incident.aiSummary && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setExpandedIncident(
                              expandedIncident === incident._id
                                ? null
                                : incident._id
                            )
                          }
                          className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
                        >
                          AI analysis{' '}
                          <span className="text-xs text-zinc-600">
                            {expandedIncident === incident._id ? '▲' : '▼'}
                          </span>
                        </button>
                        {expandedIncident === incident._id && (
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-edge/60 bg-surface p-4 font-sans text-sm leading-relaxed text-zinc-300">
                            {incident.aiSummary}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </>
      )}
    </div>
  );
};

export default MonitorDetail;
