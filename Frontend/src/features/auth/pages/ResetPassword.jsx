import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { RiPulseLine } from '@remixicon/react';
import { resetPassword } from '../services/auth.api';
import '../../../styles/auth.css';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Choose a new password using the token from the emailed link.
 *
 * This page is the destination the reset email now points at. The link
 * previously pointed at `/api/auth/reset-password/:token`, which exists only as
 * a POST route — clicking it in a mail client issued a GET, matched no API
 * route, and fell through to the SPA shell. There was nowhere to type a new
 * password, so the flow could not be completed at all.
 *
 * The token is validated server-side on submit rather than on mount: a
 * "check if this token is valid" endpoint would let anyone test tokens without
 * ever committing to a password, and it would tell them which guesses were
 * close.
 */
function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.password) {
      next.password = 'Password is required';
    } else if (form.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    // Checked here as well as on the server: a typo in a password you cannot
    // see is the single most likely way to be locked out by this form.
    if (form.confirm !== form.password) {
      next.confirm = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
      // Long enough to read the confirmation, short enough not to feel stuck.
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not reset the password. The link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <RiPulseLine className="w-10 h-10 text-[#cc785c]" />
          </div>
          <h1 className="auth-title">Password updated</h1>
          <div className="auth-success" role="status">
            Your password has been changed. Taking you to sign in…
          </div>
          <p className="auth-footer">
            <Link to="/login">Sign in now</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <RiPulseLine className="w-10 h-10 text-[#cc785c]" />
        </div>

        <h1 className="auth-title">New password</h1>
        <p className="auth-note">
          Choose a new password for your account. This link can only be used
          once.
        </p>

        {error && (
          <div className="error-message" role="alert">
            {error}
            {/* An expired link is the most common failure, and it is
                unrecoverable from this page — offer the way forward. */}
            <br />
            <Link to="/forgot-password">Request a new link</Link>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="auth-label" htmlFor="rp-password">
              New Password
            </label>
            <input
              id="rp-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              disabled={loading}
              autoComplete="new-password"
              autoFocus
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'rp-password-error' : 'rp-password-hint'
              }
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password ? (
              <span className="field-error" id="rp-password-error">
                {errors.password}
              </span>
            ) : (
              <span className="auth-hint" id="rp-password-hint">
                Minimum {MIN_PASSWORD_LENGTH} characters.
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="auth-label" htmlFor="rp-confirm">
              Confirm Password
            </label>
            <input
              id="rp-confirm"
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Re-enter your new password"
              disabled={loading}
              autoComplete="new-password"
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? 'rp-confirm-error' : undefined}
              className={errors.confirm ? 'input-error' : ''}
            />
            {errors.confirm && (
              <span className="field-error" id="rp-confirm-error">
                {errors.confirm}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-button-primary"
            disabled={loading}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
