import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { resetPassword } from '../features/auth/services/auth.api';
import Input from '../components/common/Input';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, form.password);
      toast.success('Password reset — you can sign in now');
      navigate('/login');
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Invalid or expired reset link'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Set a new password
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Choose a strong password you don&apos;t use elsewhere.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-edge bg-panel p-6"
        >
          <Input
            label="New password"
            id="password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={onChange}
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            id="confirm"
            name="confirm"
            type="password"
            placeholder="Re-enter password"
            value={form.confirm}
            onChange={onChange}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Back to{' '}
          <Link to="/login" className="text-zinc-200 hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
