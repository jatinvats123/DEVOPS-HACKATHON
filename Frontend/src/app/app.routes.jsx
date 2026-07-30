import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { useSelector } from 'react-redux';

import ProtectedRoute from './ProtectedRoute';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { LoadingRegion, SkeletonStatCards } from '../components/ui/Skeleton';

/**
 * Route-level code splitting.
 *
 * Everything used to arrive in one bundle: Lighthouse measured 189 KB of 260 KB
 * as unused on first load. A visitor on the login page was downloading and
 * parsing the dashboard, Recharts, the AI chat widget and every settings screen
 * before they could type a password.
 *
 * Login and Register stay EAGER on purpose — they are the entry points, and
 * splitting them would add a network round trip to the very first paint, making
 * the metric that matters worse in order to improve a number.
 */
import Login from '../features/auth/pages/Login';
import Register from '../features/auth/pages/Register';

/**
 * The password-reset pair is lazy where Login/Register are eager: they are
 * reached rarely and never as a first paint, so they cost nothing to defer.
 */
const ForgotPassword = lazy(
  () => import('../features/auth/pages/ForgotPassword')
);
const ResetPassword = lazy(
  () => import('../features/auth/pages/ResetPassword')
);

/** The public status page — no session, no Layout, no ProtectedRoute. */
const PublicStatus = lazy(
  () => import('../features/monitoring/pages/PublicStatus')
);

const Layout = lazy(() => import('../components/Layout'));
const Dashboard = lazy(() => import('../features/monitoring/pages/Dashboard'));
const Monitoring = lazy(
  () => import('../features/monitoring/pages/Monitoring')
);
const Incidents = lazy(() => import('../features/monitoring/pages/Incidents'));
const IncidentDetail = lazy(
  () => import('../features/monitoring/pages/IncidentDetail')
);
const Alerts = lazy(() => import('../features/monitoring/pages/Alerts'));
const StatusPages = lazy(
  () => import('../features/monitoring/pages/StatusPages')
);
const Settings = lazy(() => import('../features/monitoring/pages/Settings'));
const NotFound = lazy(() => import('./NotFound'));

/**
 * Every lazy route is wrapped in BOTH a Suspense boundary and an error
 * boundary. The error boundary is not optional here: a lazy import rejects on a
 * network failure or after a deploy invalidates the old chunk hashes, and an
 * unhandled rejection in a lazy import blanks the entire application.
 */
const RouteShell = ({ children, label }) => (
  <ErrorBoundary
    title="This page failed to load"
    description="The page could not be loaded. This is often a stale tab after a new version was deployed — reloading usually fixes it."
  >
    <Suspense
      fallback={
        <LoadingRegion label={`Loading ${label}`}>
          <div className="p-6 sm:p-10">
            <SkeletonStatCards count={4} />
          </div>
        </LoadingRegion>
      }
    >
      {children}
    </Suspense>
  </ErrorBoundary>
);

const Home = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
};

const protectedPages = [
  { path: '/dashboard', element: <Dashboard />, label: 'dashboard' },
  { path: '/monitors', element: <Monitoring />, label: 'monitors' },
  { path: '/incidents', element: <Incidents />, label: 'incidents' },
  {
    path: '/incidents/:incidentId',
    element: <IncidentDetail />,
    label: 'incident',
  },
  { path: '/alerts', element: <Alerts />, label: 'alerts' },
  { path: '/status-pages', element: <StatusPages />, label: 'status pages' },
  { path: '/settings', element: <Settings />, label: 'settings' },
];

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    // Linked from the login screen. Without this route the link resolved to the
    // catch-all and rendered the 404 page.
    path: '/forgot-password',
    element: (
      <RouteShell label="password reset">
        <ForgotPassword />
      </RouteShell>
    ),
  },
  {
    // Destination of the emailed reset link.
    path: '/reset-password/:token',
    element: (
      <RouteShell label="password reset">
        <ResetPassword />
      </RouteShell>
    ),
  },
  {
    /**
     * Public status page. Deliberately OUTSIDE the ProtectedRoute subtree — a
     * customer checking whether the service is down must never be bounced to a
     * login screen, which is the one thing that would make the page useless at
     * the moment it matters.
     */
    path: '/status/:slug',
    element: (
      <RouteShell label="status page">
        <PublicStatus />
      </RouteShell>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <RouteShell label="workspace">
          <Layout />
        </RouteShell>
      </ProtectedRoute>
    ),
    children: protectedPages.map(({ path, element, label }) => ({
      path,
      element: <RouteShell label={label}>{element}</RouteShell>,
    })),
  },
  {
    path: '*',
    element: (
      <RouteShell label="page">
        <NotFound />
      </RouteShell>
    ),
  },
]);
