import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useAuth } from '../../features/auth/hooks/useAuth';

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? 'text-white'
      : 'text-zinc-400 hover:text-white'
  }`;

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.authSlicer);
  const { handleLogout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await handleLogout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-surface/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-sm text-black">
            ▲
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            WatchTower
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/settings" className={navLinkClass}>
                Settings
              </NavLink>
            </>
          )}
          <div className="mx-2 h-4 w-px bg-edge" />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-zinc-400 md:inline">
                {user?.fullname || user?.username}
              </span>
              <button
                onClick={onLogout}
                className="rounded-md border border-edge px-3.5 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-white px-3.5 py-1.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-md p-1.5 text-zinc-300 hover:bg-panel-2 sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="space-y-1 border-t border-edge/70 px-4 py-3 sm:hidden">
          <NavLink to="/" className={navLinkClass} end onClick={() => setOpen(false)}>
            Home
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={navLinkClass} onClick={() => setOpen(false)}>
                Dashboard
              </NavLink>
              <NavLink to="/settings" className={navLinkClass} onClick={() => setOpen(false)}>
                Settings
              </NavLink>
            </>
          )}
          {isAuthenticated ? (
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-panel-2"
            >
              Log out
            </button>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass} onClick={() => setOpen(false)}>
                Sign in
              </NavLink>
              <NavLink to="/register" className={navLinkClass} onClick={() => setOpen(false)}>
                Sign up
              </NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
