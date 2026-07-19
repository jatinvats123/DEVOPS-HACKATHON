import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import {
  createMonitoring,
  deleteMonitor,
  getMonitors,
} from '../features/monitoring/services/monitor.api';
import { useMonitorEvents } from '../features/monitoring/useMonitorEvents';
import StatusBadge from '../components/common/StatusBadge';
import Input from '../components/common/Input';

const REFRESH_MS = 15000;

const emptyForm = {
  title: '',
  url: '',
  type: 'website',
  interval: 60,
  timeout: 5000,
};

const Dashboard = () => {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMonitors = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getMonitors();
      setMonitors(response?.data || []);
    } catch {
      if (!silent) toast.error('Failed to load monitors');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitors();
    const timer = setInterval(() => fetchMonitors(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchMonitors]);

  // Merge real-time status updates into the list instantly (no poll wait)
  const onMonitorUpdate = useCallback((payload) => {
    setMonitors((list) =>
      list.map((m) =>
        String(m._id) === payload.monitorId
          ? { ...m, status: payload.status, lastChecked: payload.lastChecked }
          : m
      )
    );
  }, []);
  useMonitorEvents({ onMonitorUpdate });

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.url) {
      toast.error('URL is required');
      return;
    }
    setSubmitting(true);
    try {
      await createMonitoring({
        ...form,
        interval: Number(form.interval) || 60,
        timeout: Number(form.timeout) || 5000,
      });
      toast.success('Monitor created');
      setShowModal(false);
      setForm(emptyForm);
      fetchMonitors(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create monitor');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (monitor) => {
    if (!window.confirm(`Delete monitor "${monitor.title}"?`)) return;
    setDeletingId(monitor._id);
    try {
      await deleteMonitor(monitor._id);
      toast.success('Monitor deleted');
      setMonitors((list) => list.filter((m) => m._id !== monitor._id));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete monitor');
    } finally {
      setDeletingId(null);
    }
  };

  const upCount = monitors.filter((m) => m.status === 'UP').length;
  const downCount = monitors.length - upCount;

  const stats = [
    { label: 'Monitors', value: monitors.length, color: 'text-white' },
    { label: 'Operational', value: upCount, color: 'text-emerald-400' },
    {
      label: 'Down',
      value: downCount,
      color: downCount ? 'text-red-400' : 'text-white',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Monitors
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Auto-refreshes every {REFRESH_MS / 1000}s
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          + New monitor
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-panel p-5">
            <p className="text-[13px] text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monitor list */}
      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-white" />
          </div>
        ) : monitors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge bg-panel/40 py-20 text-center">
            <h3 className="text-base font-medium text-white">No monitors yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              Add your first website or API and WatchTower will start checking it
              right away.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
            >
              + Add your first monitor
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-edge">
            {monitors.map((monitor, i) => (
              <div
                key={monitor._id}
                className={`group flex items-center justify-between gap-4 bg-panel px-5 py-4 transition-colors hover:bg-panel-2 ${
                  i > 0 ? 'border-t border-edge' : ''
                }`}
              >
                <Link
                  to={`/monitors/${monitor._id}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      monitor.status === 'UP' ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-white group-hover:text-white">
                      {monitor.title || 'Untitled monitor'}
                    </h3>
                    <p className="truncate font-mono text-xs text-zinc-500">
                      {monitor.url}
                    </p>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="hidden items-center gap-4 text-xs text-zinc-600 md:flex">
                    <span className="rounded bg-panel-2 px-2 py-0.5 uppercase tracking-wide text-zinc-500">
                      {monitor.type}
                    </span>
                    <span>{monitor.interval}s</span>
                    {monitor.lastChecked && (
                      <span>
                        {new Date(monitor.lastChecked).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <StatusBadge
                    status={monitor.status}
                    pulse={monitor.status === 'UP'}
                  />
                  <button
                    onClick={() => onDelete(monitor)}
                    disabled={deletingId === monitor._id}
                    className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    aria-label="Delete monitor"
                    title="Delete monitor"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v11a1 1 0 001 1h6a1 1 0 001-1V7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create monitor modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-edge bg-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">New monitor</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-panel-2 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onCreate} className="mt-6 space-y-4">
              <Input
                label="Title"
                id="title"
                name="title"
                placeholder="My website"
                value={form.title}
                onChange={onChange}
              />
              <Input
                label="URL"
                id="url"
                name="url"
                placeholder="https://example.com"
                value={form.url}
                onChange={onChange}
              />
              <div className="space-y-1.5">
                <label
                  htmlFor="type"
                  className="block text-[13px] font-medium text-zinc-400"
                >
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={onChange}
                  className="block w-full rounded-lg border border-edge bg-panel px-3.5 py-2.5 text-sm text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/40"
                >
                  <option value="website">Website</option>
                  <option value="api">API</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Interval (sec)"
                  id="interval"
                  name="interval"
                  type="number"
                  min={10}
                  value={form.interval}
                  onChange={onChange}
                />
                <Input
                  label="Timeout (ms)"
                  id="timeout"
                  name="timeout"
                  type="number"
                  min={1000}
                  step={500}
                  value={form.timeout}
                  onChange={onChange}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create monitor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
