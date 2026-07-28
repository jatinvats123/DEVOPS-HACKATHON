import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router';
import { RiNotification3Line, RiMenuLine } from '@remixicon/react';
import { getAllIncidents } from '../services/incident.api';

const TITLES = {
  '/dashboard': 'Overview',
  '/monitors': 'Monitors',
  '/incidents': 'Journal',
  '/alerts': 'Alert Center',
  '/status-pages': 'Status Pages',
  '/settings': 'Settings',
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const Navbar = ({ onMobileMenuToggle }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const title =
    TITLES[location.pathname] ||
    (location.pathname.startsWith('/incidents/') ? 'Incident' : 'Overview');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllIncidents();
      setIncidents(res?.data || []);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once so the unread dot is accurate, then refresh when opened
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ongoing = incidents.filter((i) => i.status === 'ONGOING').length;

  return (
    <header className="px-6 md:px-10 py-8 md:py-10 flex items-center justify-between bg-transparent z-10 shrink-0">
      <div className="flex items-center gap-6">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 -ml-2 text-[#141413] hover:bg-[#f5f0e8] rounded-xl lg:hidden transition-colors"
          aria-label="Toggle menu"
        >
          <RiMenuLine className="w-6 h-6" />
        </button>
        <div>
          <h1 className="luxury-heading text-2xl md:text-3xl leading-none">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative p-2 rounded-xl hover:bg-[#f5f0e8] transition-colors"
            aria-label="Notifications"
            aria-expanded={open}
          >
            <RiNotification3Line className="w-6 h-6 text-[#6c6a64] hover:text-[#cc785c] transition-colors" />
            {ongoing > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#cc785c] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {ongoing > 9 ? '9+' : ongoing}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] bg-white border border-[#e6dfd8] rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6dfd8]">
                <p className="text-sm font-semibold text-[#141413]">
                  Notifications
                </p>
                {ongoing > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#cc785c]">
                    {ongoing} active
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading && incidents.length === 0 ? (
                  <div className="p-8 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#cc785c]" />
                  </div>
                ) : incidents.length === 0 ? (
                  <p className="p-8 text-sm text-[#6c6a64] text-center">
                    No incidents. Everything is healthy.
                  </p>
                ) : (
                  incidents.slice(0, 8).map((inc) => (
                    <button
                      key={inc._id}
                      onClick={() => {
                        setOpen(false);
                        navigate(`/incidents/${inc._id}`);
                      }}
                      className="w-full text-left px-5 py-4 border-b border-[#e6dfd8]/60 hover:bg-[#faf9f5] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#141413] truncate">
                          {inc.monitorId?.title || 'Untitled monitor'}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            inc.status === 'ONGOING'
                              ? 'text-[#cc785c]'
                              : 'text-[#6c6a64]'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6c6a64] mt-1 truncate">
                        {inc.reason || 'Incident recorded'}
                      </p>
                      <p className="text-[11px] text-[#6c6a64] mt-1">
                        {timeAgo(inc.createdAt || inc.startTime)}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <Link
                to="/incidents"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-center text-xs font-semibold text-[#cc785c] hover:bg-[#faf9f5] transition-colors"
              >
                View all incidents
              </Link>
            </div>
          )}
        </div>

        <Link
          to="/settings"
          className="flex items-center gap-4 border border-[#e6dfd8] rounded-full pl-2 pr-4 py-1.5 hover:bg-white transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#cc785c] flex items-center justify-center text-white text-xs font-medium overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              user?.fullname?.[0] || 'U'
            )}
          </div>
          <span className="text-sm font-medium text-[#141413] hidden sm:block">
            {user?.fullname || user?.username}
          </span>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
