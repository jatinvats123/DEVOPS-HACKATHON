import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/hooks/useAuth';
import Input from '../components/common/Input';

const Login = () => {
  const { handleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const isEmail = form.identifier.includes('@');
      await handleLogin({
        [isEmail ? 'email' : 'username']: form.identifier,
        password: form.password,
      });
      toast.success('Welcome back');
      navigate(location.state?.from || '/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Sign in to WatchTower
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Welcome back. Enter your details.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-edge bg-panel p-6"
        >
          <Input
            label="Email or username"
            id="identifier"
            name="identifier"
            type="text"
            placeholder="you@example.com"
            value={form.identifier}
            onChange={onChange}
            autoComplete="username"
          />
          <div>
            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              autoComplete="current-password"
            />
            <div className="mt-2 flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-zinc-200 hover:text-white">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
