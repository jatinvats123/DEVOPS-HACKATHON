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
