import { useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/hooks/useAuth';
import Input from '../components/common/Input';

const Settings = () => {
  const user = useSelector((state) => state.authSlicer.user);
  const { handleChangePassword } = useAuth();
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirm: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.oldPassword || !form.newPassword) {
      toast.error('Fill in both password fields');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await handleChangePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed');
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (user?.fullname || user?.username || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Settings
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage your account and security.
      </p>

      {/* Profile */}
      <section className="mt-8 rounded-xl border border-edge bg-panel p-6">
        <h2 className="text-sm font-medium text-white">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-panel-2 text-sm font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {user?.fullname || '—'}
            </p>
            <p className="truncate text-sm text-zinc-500">
              @{user?.username} · {user?.email}
            </p>
          </div>
        </div>
      </section>

      {/* Change password */}
      <section className="mt-6 rounded-xl border border-edge bg-panel p-6">
        <h2 className="text-sm font-medium text-white">Change password</h2>
        <form onSubmit={onSubmit} className="mt-4 max-w-sm space-y-4">
          <Input
            label="Current password"
            id="oldPassword"
            name="oldPassword"
            type="password"
            placeholder="••••••••"
            value={form.oldPassword}
            onChange={onChange}
            autoComplete="current-password"
          />
          <Input
            label="New password"
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="At least 6 characters"
            value={form.newPassword}
            onChange={onChange}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            id="confirm"
            name="confirm"
            type="password"
            placeholder="Re-enter new password"
            value={form.confirm}
            onChange={onChange}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Settings;
