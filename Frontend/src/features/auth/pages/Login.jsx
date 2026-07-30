import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { RiPulseLine } from '@remixicon/react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { env } from '../../../config/env';
import '../../../styles/auth.css';

function Login() {
  const navigate = useNavigate();

  const { handleLogin, handleGoogleSignIn } = useAuth();
  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = 'Invalid email format';
    if (!formData.password) errors.password = 'Password is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name])
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await handleLogin({ email: formData.email, password: formData.password });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <RiPulseLine className="w-10 h-10 text-[#cc785c]" />
        </div>

        <h1 className="auth-title">Welcome back</h1>

        {/* The divider below was already here, dividing nothing — this is the
            slot it was always meant to separate. GoogleSignInButton renders
            null when no client id is configured, and the divider follows it,
            so an unconfigured deployment shows neither. */}
        <GoogleSignInButton
          onCredential={handleGoogleSignIn}
          disabled={loading}
        />

        {env.GOOGLE_CLIENT_ID && (
          <div className="auth-divider">
            <span>OR</span>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@work.com"
              disabled={loading}
              className={validationErrors.email ? 'input-error' : ''}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <div className="password-header">
              <label className="auth-label">Password</label>
              <Link to="/forgot-password" title="Forgot Password?">
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              disabled={loading}
              className={validationErrors.password ? 'input-error' : ''}
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="auth-button-primary"
            disabled={loading}
          >
            {loading ? 'Continuing...' : 'Continue'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
