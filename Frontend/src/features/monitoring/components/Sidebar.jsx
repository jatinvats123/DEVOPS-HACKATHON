import { useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import {
  RiDashboardLine,
  RiMacbookLine,
  RiAlertLine,
  RiNotification3Line,
  RiHeartPulseLine,
  RiSettings4Line,
  RiPulseLine,
  RiLogoutBoxLine,
  RiCloseLine,
} from '@remixicon/react';
import { useAuth } from '../../auth/hooks/useAuth';

const Sidebar = ({ isMobileMenuOpen = false, setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { handleLogout } = useAuth();

  const asideRef = useRef(null);
  const closeButtonRef = useRef(null);

  const menuItems = [
    { name: 'Dashboard', icon: RiDashboardLine, path: '/dashboard' },
    { name: 'Monitors', icon: RiMacbookLine, path: '/monitors' },
    { name: 'Incidents', icon: RiAlertLine, path: '/incidents' },
    { name: 'Alerts', icon: RiNotification3Line, path: '/alerts' },
    { name: 'Status Pages', icon: RiHeartPulseLine, path: '/status-pages' },
    { name: 'Settings', icon: RiSettings4Line, path: '/settings' },
  ];

  const closeDrawer = () => setIsMobileMenuOpen?.(false);

  const handleLogoutClick = () => {
    handleLogout();
    navigate('/login', { replace: true });
  };

  // Auto-close on navigation. Without this the drawer stays over the page the
  // user just asked for.
  useEffect(() => {
    setIsMobileMenuOpen?.(false);
    // Only the destination should retrigger this, not a new setter identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Escape to dismiss, and hold focus inside the drawer while it is open.
  // Below lg the drawer covers the page, so tabbing to the content behind it
  // would move focus somewhere the user cannot see.
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab' || !asideRef.current) return;

      const focusable = asideRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // The page behind must not scroll while the drawer is over it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Backdrop — below lg only, where the drawer overlays the content. */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#141413]/40 backdrop-blur-sm lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        id="app-sidebar"
        // Off-canvas below lg, docked from lg up. `lg:static` returns it to the
        // flex flow so the desktop layout is byte-for-byte what it was.
        className={`luxury-sidebar fixed inset-y-0 left-0 z-50 flex h-full max-w-[85vw] flex-col transition-transform duration-300 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
        aria-hidden={undefined}
      >
        <div className="flex items-start justify-between px-6 pt-8 pb-6 sm:px-8 lg:py-12 lg:mb-4">
          <h2 className="luxury-heading text-2xl flex items-center gap-3">
            <RiPulseLine className="w-8 h-8 text-[#cc785c] shrink-0" />
            WatchTower
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#6c6a64] transition-colors hover:bg-white hover:text-[#141413] lg:hidden"
            aria-label="Close menu"
          >
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-0 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `group flex items-center gap-4 luxury-sidebar-item ${
                  isActive ? 'active' : ''
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0 transition-colors group-hover:text-[#cc785c]" />
              <span className="tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#e6dfd8] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 sm:pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white transition-all cursor-pointer group">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#cc785c] flex items-center justify-center text-white font-medium">
              {user?.fullname?.[0] || user?.username?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#141413] truncate">
                {user?.fullname || user?.username}
              </p>
              <p className="text-[11px] text-[#6c6a64] truncate">Free Plan</p>
            </div>
            <button
              onClick={handleLogoutClick}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#6c6a64] transition-colors hover:text-[#cc785c] lg:mr-0 lg:h-auto lg:w-auto"
              aria-label="Log out"
            >
              <RiLogoutBoxLine className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
