import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux'
import { RouterProvider } from 'react-router'
import { store } from './app.store'
import { router } from './app.routes'
import { setUser, setAuthenticated } from '../features/auth/state/authSlice'
import { useAuth } from '../features/auth/hooks/useAuth';
import { useState } from 'react';

function AppContent() {
  const dispatch = useDispatch();
  const { handleGetUserProfile } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth state from cookie on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await handleGetUserProfile();
        if (response) {
          dispatch(setAuthenticated(true));
        }
      } catch (err) {
        console.log('Not authenticated');
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [dispatch, handleGetUserProfile]);

  if (isInitializing) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#faf9f5]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#cc785c]"></div>
    </div>;
  }

  return <RouterProvider router={router} />
}

const App = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

export default App