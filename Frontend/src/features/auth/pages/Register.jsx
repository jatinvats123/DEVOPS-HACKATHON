import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { setUser, setAuthenticated } from '../state/authSlice';
import { RiPulseLine, RiArrowLeftLine } from '@remixicon/react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { env } from '../../../config/env';
import '../../../styles/auth.css';

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { handleRegister, handleVerifyOtp, handleGoogleSignIn } = useAuth();
  const { loading, error, otp, userId, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const [step, setStep] = useState('register'); // 'register', 'otp'
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [otpValue, setOtpValue] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const errors = {};
    if (!formData.fullname.trim()) errors.fullname = 'Full name is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = 'Invalid email format';
    if (!formData.password) errors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = 'Passwords do not match';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name])
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const response = await handleRegister({
        fullname: formData.fullname,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (response && response.data && response.data.token) {
        navigate('/dashboard', { replace: true });
      } else if (
        otp.sent ||
        (response && response.data && response.data.otpSent)
      ) {
        setStep('otp');
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setValidationErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }
    try {
      const response = await handleVerifyOtp(userId, otpValue);
      if (response) {
        if (response.data && response.data.token) {
          dispatch(setUser(response.data.user));
          dispatch(setAuthenticated(true));
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    } catch (err) {
      console.error('OTP verification failed:', err);
    }
  };

  if (step === 'otp') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <button
            onClick={() => setStep('register')}
            className="auth-back-button"
          >
            <RiArrowLeftLine className="w-5 h-5" />
            Back
          </button>

          <h1 className="auth-title">Verify your email</h1>
          <p className="auth-subtitle">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-[#141413]">{formData.email}</span>
          </p>

          {error && <div className="error-message">{error}</div>}

          <form className="auth-form" onSubmit={handleOtpSubmit}>
            <div className="form-group">
              <label className="auth-label">Verification Code</label>
              <input
                type="text"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                placeholder="000000"
                maxLength="6"
                className={`auth-otp-input ${validationErrors.otp ? 'input-error' : ''}`}
                disabled={loading}
              />
              {validationErrors.otp && (
                <span className="field-error">{validationErrors.otp}</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-button-primary"
              disabled={loading || otpValue.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
          </form>

          <p className="auth-footer mt-8">
            Didn't receive a code?{' '}
            <button className="text-[#cc785c] hover:underline">Resend</button>
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

        <h1 className="auth-title">Create your account</h1>

        {/* Same control as the login screen. Signing up with Google and signing
            in with Google are the same call — the backend creates the account
            on first use — so there is no separate "register with Google" path
            to keep in step. */}
        <GoogleSignInButton
          onCredential={handleGoogleSignIn}
          disabled={loading}
          label="Continue with Google"
        />

        {env.GOOGLE_CLIENT_ID && (
          <div className="auth-divider">
            <span>OR</span>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleRegisterSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="auth-label">Full Name</label>
              <input
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                placeholder="Jane Doe"
                disabled={loading}
                className={validationErrors.fullname ? 'input-error' : ''}
              />
              {validationErrors.fullname && (
                <span className="field-error">{validationErrors.fullname}</span>
              )}
            </div>
            <div className="form-group">
              <label className="auth-label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="janedoe"
                disabled={loading}
                className={validationErrors.username ? 'input-error' : ''}
              />
              {validationErrors.username && (
                <span className="field-error">{validationErrors.username}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="auth-label">Work Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@company.com"
              disabled={loading}
              className={validationErrors.email ? 'input-error' : ''}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              disabled={loading}
              className={validationErrors.password ? 'input-error' : ''}
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label className="auth-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              disabled={loading}
              className={validationErrors.confirmPassword ? 'input-error' : ''}
            />
            {validationErrors.confirmPassword && (
              <span className="field-error">
                {validationErrors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-button-primary"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <p className="text-[11px] text-[#6c6a64] text-center mt-10 leading-relaxed">
          By creating an account, you agree to our{' '}
          <a href="#" className="underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default Register;
