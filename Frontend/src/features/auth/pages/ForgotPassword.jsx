import { useState } from 'react';
import { Link } from 'react-router';
import { RiPulseLine } from '@remixicon/react';
import { forgotPassword } from '../services/auth.api';
import '../../../styles/auth.css';

/**
 * Request a password reset link.
 *
 * The route this page serves, `/forgot-password`, was linked from the login
 * screen but never existed in the router — the link fell through to the
 * catch-all and rendered the 404 page, so the flow was unreachable from the
 * only place it is entered.
 */
function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setFieldError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('Invalid email format');
      return;
    }
    setFieldError('');

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      // The endpoint answers 200 whether or not the account exists, so reaching
      // here means the request itself failed — not that the email was unknown.
      setError(
        err.response?.data?.message ||
          'Could not send the reset link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <RiPulseLine className="w-10 h-10 text-[#cc785c]" />
          </div>
          <h1 className="auth-title">Check your email</h1>

          {/*
            Deliberately does not confirm whether an account exists for this
            address. The API is silent about it to avoid becoming an
            account-enumeration oracle, and saying "we sent it" here would leak
            exactly what the API withholds.
          */}
          <p className="auth-note">
            If an account exists for <strong>{email.trim()}</strong>, a reset
            link is on its way. It is valid for 15 minutes and can be used once.
          </p>
          <p className="auth-note">
            Nothing arrived? Check the spam folder, or{' '}
            <button
              type="button"
              className="auth-link-inline"
              onClick={() => setSent(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#000',
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              try a different address
            </button>
            .
          </p>

          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
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

        <h1 className="auth-title">Reset password</h1>
        <p className="auth-note">
          Enter the email address on your account and we will send you a link to
          choose a new password.
        </p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="auth-label" htmlFor="fp-email">
              Email Address
            </label>
            <input
              id="fp-email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError('');
              }}
              placeholder="you@work.com"
              disabled={loading}
              autoComplete="email"
              autoFocus
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'fp-email-error' : undefined}
              className={fieldError ? 'input-error' : ''}
            />
            {fieldError && (
              <span className="field-error" id="fp-email-error">
                {fieldError}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-button-primary"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-footer">
          Remembered it? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
