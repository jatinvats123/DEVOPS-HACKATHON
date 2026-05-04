import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux'
import { RouterProvider } from 'react-router'
import { store } from './app.store'
import { router } from './app.routes'
import { setUser, setAuthenticated } from '../features/auth/state/authSlice'

function AppContent() {
  const dispatch = useDispatch();

  // Initialize auth state from localStorage on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        dispatch(setUser(JSON.parse(user)));
        dispatch(setAuthenticated(true));
      } catch (err) {
        console.error('Failed to restore auth state:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [dispatch]);

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