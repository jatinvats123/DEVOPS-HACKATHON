import { Link } from 'react-router';
import { useSelector } from 'react-redux';

const features = [
  {
    title: 'Uptime monitoring',
    desc: 'Automatic HTTP checks of your websites and APIs, with latency and status-code tracking on every request.',
  },
  {
    title: 'AI incident analysis',
    desc: 'Each incident is analyzed to give you a summary, root cause, and clear fix steps — instantly.',
  },
  {
    title: 'Instant email alerts',
    desc: 'Get notified the moment a service goes down, and again when it recovers with total downtime.',
  },
  {
    title: 'Logs & history',
    desc: 'Full check history with response times, status codes, and errors for every monitor.',
  },
  {
    title: 'Smart retry logic',
    desc: 'Triple-checks before declaring downtime, so flaky networks never trigger false alarms.',
  },
  {
    title: 'Secure by default',
    desc: 'JWT auth with email OTP verification, rate limiting, and hardened HTTP headers out of the box.',
  },
];

const services = [
  { name: 'api.example.com', latency: '82ms', up: true },
  { name: 'dashboard.example.com', latency: '145ms', up: true },
  { name: 'cdn.example.com', latency: '38ms', up: true },
  { name: 'payments.example.com', latency: '—', up: false },
];

const Home = () => {
  const isAuthenticated = useSelector(
    (state) => state.authSlicer.isAuthenticated
  );

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1 text-xs text-zinc-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping-slow" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              All systems operational
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Uptime monitoring,
              <br />
              <span className="text-zinc-500">without the noise.</span>
            </h1>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400">
              WatchTower watches your websites and APIs around the clock, emails
              you the second something breaks, and uses AI to explain why — and
              how to fix it.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                {isAuthenticated ? 'Go to dashboard' : 'Start for free'}
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="rounded-md border border-edge px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* Right status panel */}
          <div className="rounded-xl border border-edge bg-panel p-1.5 shadow-2xl shadow-black/40">
            <div className="rounded-lg border border-edge/60 bg-surface">
              <div className="flex items-center justify-between border-b border-edge/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-xs text-zinc-600">status.example.com</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-sm font-medium text-white">
                    Service status
                  </span>
                  <span className="text-xs text-zinc-600">updated just now</span>
                </div>
                <div className="divide-y divide-edge/50">
                  {services.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-2 w-2 rounded-full ${s.up ? 'bg-emerald-400' : 'bg-red-400'}`}
                        />
                        <span className="font-mono text-[13px] text-zinc-300">
                          {s.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-zinc-600">
                          {s.latency}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${s.up ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                          {s.up ? 'Operational' : 'Down'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px bg-edge/60" />
      </div>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Everything you need to stay online
        </h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-zinc-400">
          Reliable monitoring for developers, without the enterprise price tag.
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-surface p-6 transition-colors hover:bg-panel"
            >
              <h3 className="text-[15px] font-medium text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-xl border border-edge bg-panel px-8 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Start monitoring in under a minute
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-zinc-400">
            Add your first URL and WatchTower starts checking it right away.
          </p>
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="mt-7 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            {isAuthenticated ? 'Go to dashboard' : 'Get started free'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-edge/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs text-black">
              ▲
            </span>
            <span className="text-zinc-400">WatchTower</span>
          </div>
          <span>DevOps Hackathon · React, Express &amp; MongoDB</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
