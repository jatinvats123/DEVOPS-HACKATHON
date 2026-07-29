import { useEffect, useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router';
import { store } from './app.store';
import { router } from './app.routes';
import { setAuthenticated } from '../features/auth/state/authSlice';
import { useAuth } from '../features/auth/hooks/useAuth';
import ErrorBoundary from '../components/ui/ErrorBoundary';

function AppContent() {
  const dispatch = useDispatch();
  const { handleGetUserProfile } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore the session from the auth cookie. A 401 here is the NORMAL answer
  // for a signed-out visitor, not an error — see apiRequest, which no longer
  // logs it as one.
  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      try {
        const response = await handleGetUserProfile();
        if (!cancelled && response) dispatch(setAuthenticated(true));
      } catch {
        // Not signed in. Nothing to do — the router sends them to /login.
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    initAuth();
    return () => {
      cancelled = true;
    };
  }, [dispatch, handleGetUserProfile]);

  if (isInitializing) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center bg-[#faf9f5]"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading WatchTower</span>
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#cc785c]"
          aria-hidden="true"
        />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

const App = () => (
  // Outermost boundary. Nothing above this can catch a render error, so without
  // it a throw during initialisation yields a blank white page with no
  // explanation and no way back.
  <ErrorBoundary
    title="WatchTower failed to start"
    description="The application could not be initialised. Reloading the page usually resolves this."
  >
    <Provider store={store}>
      <AppContent />
    </Provider>
  </ErrorBoundary>
);

export default App;
