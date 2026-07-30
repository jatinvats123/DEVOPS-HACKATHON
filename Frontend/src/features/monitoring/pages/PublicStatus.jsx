import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { RiPulseLine, RiRefreshLine } from '@remixicon/react';
import { getPublicStatusPage } from '../services/statusPage.api';

/**
 * The public status page.
 *
 * Rendered for anonymous visitors, so it deliberately mounts outside
 * ProtectedRoute and outside the dashboard Layout — no sidebar, no navbar, no
 * session probe. A customer checking whether the API is down must not be
 * redirected to a login screen.
 *
 * It also renders nothing it was not explicitly given: the API returns a
 * hand-picked projection (display name, state, uptime) and this component has
 * no access to monitor URLs or ids because they never leave the server.
 */

const REFRESH_MS = 60_000;

const TONE = {
  UP: {
    label: 'Operational',
    dot: 'bg-[#1c6b3f]',
    text: 'text-[#1c6b3f]',
  },
  DOWN: {
    label: 'Down',
    dot: 'bg-[#c33333]',
    text: 'text-[#c33333]',
  },
  PAUSED: {
    label: 'Paused',
    dot: 'bg-[#8a877f]',
    text: 'text-[#6c6a64]',
  },
};

const formatUptime = (value) =>
  // null means "never checked", which is not the same claim as 100%.
  value == null ? 'No data' : `${value.toFixed(2)}%`;

const formatTime = (iso) => {
  if (!iso) return 'never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'never' : d.toLocaleString();
};

function PublicStatus() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(null);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      try {
        const res = await getPublicStatusPage(slug);
        setPage(res?.data ?? null);
        setError('');
        setRefreshedAt(new Date());
      } catch (err) {
        if (err.response?.status === 404) {
          setError('This status page does not exist, or is not published.');
        } else {
          setError(
            'Could not load this status page. Please try again shortly.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Poll rather than open a socket: this page is public and may be open in
    // many tabs during an incident, which is the worst moment to be holding a
    // websocket per anonymous viewer.
    const id = setInterval(() => load({ quiet: true }), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141413] flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#cc785c]"
          role="status"
          aria-label="Loading status"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#141413] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <RiPulseLine className="w-10 h-10 text-[#cc785c] mx-auto mb-6" />
          <h1 className="text-3xl font-light font-serif mb-4">
            Status unavailable
          </h1>
          <p className="text-[#a8a49c]">{error}</p>
        </div>
      </div>
    );
  }

  const operational = page.overall === 'OPERATIONAL';

  return (
    <div className="min-h-screen bg-[#141413] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <header className="flex items-center justify-between gap-4 mb-16">
          <div className="flex items-center gap-3">
            <RiPulseLine className="w-6 h-6 text-[#cc785c]" />
            <span className="text-sm tracking-widest uppercase font-semibold">
              {page.name}
            </span>
          </div>
          <button
            onClick={() => load({ quiet: true })}
            className="text-[10px] uppercase tracking-widest font-bold text-[#a8a49c] hover:text-white flex items-center gap-2"
          >
            <RiRefreshLine className="w-4 h-4" /> Refresh
          </button>
        </header>

        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                operational ? 'bg-[#4ade80]' : 'bg-[#f87171]'
              } animate-pulse`}
              aria-hidden="true"
            />
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#a8a49c]">
              Live status
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-light font-serif mb-6">
            {operational ? (
              <>
                All systems are{' '}
                <span className="text-[#cc785c]">operational</span>.
              </>
            ) : (
              <>
                Some systems are{' '}
                <span className="text-[#f87171]">degraded</span>.
              </>
            )}
          </h1>

          {page.description && (
            <p className="text-[#a8a49c] text-lg max-w-lg">
              {page.description}
            </p>
          )}
        </section>

        {page.services.length === 0 ? (
          <p className="text-[#a8a49c]">
            No services are listed on this page yet.
          </p>
        ) : (
          <div className="border-t border-white/10">
            {page.services.map((service, i) => {
              const tone = TONE[service.status] ?? TONE.PAUSED;
              return (
                <div
                  key={`${service.name}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-6 border-b border-white/10"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-words">{service.name}</p>
                    <p className="text-xs text-[#6c6a64] mt-1">
                      30-day uptime {formatUptime(service.uptime['30d'])}
                      {service.avgResponseMs != null &&
                        ` · ${service.avgResponseMs}ms avg`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* State is never colour-only: the dot is decorative and
                        the word carries the meaning, so this stays readable
                        for colour-blind visitors and in high-contrast mode. */}
                    <span
                      className={`w-2 h-2 rounded-full ${tone.dot}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold ${tone.text}`}
                    >
                      {tone.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="mt-16 text-xs text-[#6c6a64]">
          <p>
            Last checked {formatTime(page.updatedAt)}
            {refreshedAt && ` · refreshed ${refreshedAt.toLocaleTimeString()}`}
          </p>
          <p className="mt-2">Powered by WatchTower</p>
        </footer>
      </div>
    </div>
  );
}

export default PublicStatus;
