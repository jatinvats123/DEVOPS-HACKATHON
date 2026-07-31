import { useEffect, useState } from 'react';
import { getUptimeMetrics } from '../services/metrics.api';

/**
 * Real uptime over rolling 24h / 7d / 30d windows, aggregated server-side.
 *
 * Distinct from the "Asset Distribution" donut, which shows how many monitors
 * are up RIGHT NOW. That is a point-in-time snapshot, not uptime — conflating
 * the two is how a dashboard ends up reporting 100% during an outage that
 * started an hour ago.
 */

const WINDOW_LABELS = [
  ['24h', 'Last 24 hours'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
];

/**
 * Status is never conveyed by colour alone — each tier carries a text label
 * too (WCAG AA; this matters especially on a status dashboard).
 */
// Colours are all >= 4.5:1 on the card background, and each tier carries a text
// label so the tier is legible without perceiving colour at all.
const tierFor = (uptime) => {
  if (uptime === null || uptime === undefined)
    return { label: 'No data', className: 'text-[#5a5750]' };
  if (uptime >= 99.9) return { label: 'Healthy', className: 'text-[#1c6b3f]' };
  if (uptime >= 99) return { label: 'Degraded', className: 'text-[#8a5a00]' };
  return { label: 'Unhealthy', className: 'text-[#96271a]' };
};

const UptimeWindows = ({ monitorId, monitorTitle }) => {
  const [windows, setWindows] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!monitorId) return undefined;

    let cancelled = false;

    const load = async () => {
      setState('loading');
      try {
        const res = await getUptimeMetrics(monitorId);
        if (cancelled) return;
        setWindows(res?.data?.windows ?? null);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [monitorId]);

  if (!monitorId) return null;

  return (
    <section
      className="bg-white border border-[#e6dfd8] p-8 rounded-xl shadow-sm"
      aria-labelledby="uptime-windows-heading"
    >
      <div className="flex items-baseline justify-between mb-8">
        <h2 id="uptime-windows-heading" className="luxury-heading text-xl">
          Uptime
        </h2>
        {monitorTitle && (
          <span className="text-xs text-[#6c6a64] font-mono truncate max-w-[50%]">
            {monitorTitle}
          </span>
        )}
      </div>

      {state === 'loading' && (
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
          aria-busy="true"
        >
          {WINDOW_LABELS.map(([key]) => (
            <div key={key} className="animate-pulse">
              <div className="h-3 w-16 bg-[#e6dfd8] rounded mb-3" />
              <div className="h-8 w-20 bg-[#e6dfd8] rounded" />
            </div>
          ))}
        </div>
      )}

      {state === 'error' && (
        <p role="alert" className="text-sm text-[#a33a2a]">
          Could not load uptime metrics. Retry in a moment.
        </p>
      )}

      {state === 'ready' && (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {WINDOW_LABELS.map(([key, label]) => {
              const w = windows?.[key];
              const tier = tierFor(w?.uptime);
              return (
                <div key={key}>
                  <dt className="luxury-label mb-2">{label}</dt>
                  <dd>
                    <span className="text-2xl font-semibold text-[#141413]">
                      {/* null means "no checks in this window" — showing 100%
                          here would be an outright lie. */}
                      {w?.uptime === null || w?.uptime === undefined
                        ? '—'
                        : `${w.uptime.toFixed(2)}%`}
                    </span>
                    <span className={`block text-xs mt-1 ${tier.className}`}>
                      {tier.label}
                    </span>
                    <span className="block text-[11px] text-[#6c6a64] mt-1">
                      {w?.totalChecks ?? 0} checks
                      {w?.avgLatencyMs != null && ` · ${w.avgLatencyMs}ms avg`}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>

          {/* Text alternative to the numbers above, for screen readers and for
              anyone who wants the figure without parsing the layout. */}
          <p className="sr-only">
            {WINDOW_LABELS.map(([key, label]) => {
              const w = windows?.[key];
              return w?.uptime == null
                ? `${label}: no data. `
                : `${label}: ${w.uptime.toFixed(2)} percent uptime across ${w.totalChecks} checks. `;
            }).join('')}
          </p>
        </>
      )}
    </section>
  );
};

export default UptimeWindows;
