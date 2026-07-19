import { useEffect, useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { store } from './app.store';
import { router } from './app.routes';
import { getUserProfile } from '../features/auth/services/auth.api';
import { setUser, setAuthenticated } from '../features/auth/state/authSlice';

// Restore the session from the httpOnly auth cookie on first load
const AuthBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    getUserProfile()
      .then((response) => {
        if (!mounted) return;
        dispatch(setUser(response?.data));
        dispatch(setAuthenticated(true));
      })
      .catch(() => {
        // Not logged in — that's fine
      })
      .finally(() => mounted && setChecked(true));
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-white" />
      </div>
    );
  }

  return children;
};

const App = () => {
  return (
    <Provider store={store}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#131316',
            color: '#e4e4e7',
            border: '1px solid #26262b',
            fontSize: '14px',
          },
        }}
      />
    </Provider>
  );
};

export default App;
