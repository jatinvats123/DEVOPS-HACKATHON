import { useState } from 'react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/hooks/useAuth';
import Input from '../components/common/Input';

const ForgotPassword = () => {
  const { handleForgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setSubmitting(true);
    try {
      await handleForgotPassword(email);
      setSent(true);
      toast.success('Reset link sent — check your inbox');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {sent ? (
          <div className="rounded-xl border border-edge bg-panel p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              ✓
            </div>
            <h1 className="mt-5 text-lg font-semibold tracking-tight text-white">
              Check your email
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              If an account exists for{' '}
              <span className="text-zinc-200">{email}</span>, a password reset
              link is on its way.
            </p>
            <Link
              to="/login"
              className="mt-7 inline-block rounded-md border border-edge px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Reset your password
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="mt-8 space-y-4 rounded-xl border border-edge bg-panel p-6"
            >
              <Input
                label="Email"
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-zinc-500">
              Remembered it?{' '}
              <Link to="/login" className="text-zinc-200 hover:text-white">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
