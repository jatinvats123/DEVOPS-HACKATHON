import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/hooks/useAuth';
import Input from '../components/common/Input';

const OTP_LENGTH = 6;

const Register = () => {
  const { handleRegister, handleVerifyOtp } = useAuth();
  const navigate = useNavigate();
  const userId = useSelector((state) => state.authSlicer.userId);

  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
  });
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const otpRefs = useRef([]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const { fullname, username, email, password } = form;
    if (!fullname || !username || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await handleRegister(form);
      toast.success('Account created — check your email for the code');
      setStep('otp');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const onOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const onOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    text
      .slice(0, OTP_LENGTH)
      .split('')
      .forEach((c, i) => (next[i] = c));
    setOtp(next);
    otpRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const onVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      await handleVerifyOtp(userId, code);
      toast.success('Email verified — you can sign in now');
      navigate('/login');
    } catch (err) {
      toast.error(
        typeof err === 'string' ? err : err?.message || 'Invalid or expired code'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {step === 'form' ? (
          <>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Start monitoring in under a minute.
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="mt-8 space-y-4 rounded-xl border border-edge bg-panel p-6"
            >
              <Input
                label="Full name"
                id="fullname"
                name="fullname"
                placeholder="Jane Doe"
                value={form.fullname}
                onChange={onChange}
              />
              <Input
                label="Username"
                id="username"
                name="username"
                placeholder="janedoe"
                value={form.username}
                onChange={onChange}
                autoComplete="username"
              />
              <Input
                label="Email"
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={onChange}
                autoComplete="email"
              />
              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={onChange}
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link to="/login" className="text-zinc-200 hover:text-white">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Verify your email
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                We sent a 6-digit code to{' '}
                <span className="text-zinc-300">{form.email}</span>
              </p>
            </div>

            <form
              onSubmit={onVerify}
              className="mt-8 rounded-xl border border-edge bg-panel p-6"
            >
              <div
                className="flex justify-center gap-2"
                onPaste={onOtpPaste}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(i, e)}
                    className="h-12 w-10 rounded-lg border border-edge bg-surface text-center text-lg font-semibold text-white transition-colors focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/40"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Verifying…' : 'Verify email'}
              </button>

              <p className="mt-4 text-center text-xs text-zinc-600">
                The code expires in 20 minutes.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
