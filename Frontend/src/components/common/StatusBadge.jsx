const STYLES = {
  UP: 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20',
  DOWN: 'bg-red-500/8 text-red-400 border-red-500/20',
  DEGRADED: 'bg-amber-500/8 text-amber-400 border-amber-500/20',
  ONGOING: 'bg-red-500/8 text-red-400 border-red-500/20',
  RESOLVED: 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20',
};

const DOTS = {
  UP: 'bg-emerald-400',
  DOWN: 'bg-red-400',
  DEGRADED: 'bg-amber-400',
  ONGOING: 'bg-red-400',
  RESOLVED: 'bg-emerald-400',
};

const StatusBadge = ({ status, pulse = false }) => {
  const key = (status || 'UP').toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${STYLES[key] || STYLES.UP}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping-slow ${DOTS[key] || DOTS.UP}`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${DOTS[key] || DOTS.UP}`} />
      </span>
      {key}
    </span>
  );
};

export default StatusBadge;
