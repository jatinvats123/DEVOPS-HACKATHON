
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { setUser, setAuthenticated } from '../state/authSlice';
import '../../../styles/auth.css';

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { handleRegister, handleVerifyOtp } = useAuth();
  const { loading, error, otp, userId, isAuthenticated } = useSelector(state => state.auth);
  
  const [step, setStep] = useState('register'); // 'register', 'otp'
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [otpData, setOtpData] = useState({
    otp: '',
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullname.trim()) {
      errors.fullname = 'Full name is required';
    } else if (formData.fullname.trim().length < 2) {
      errors.fullname = 'Full name must be at least 2 characters';
    }
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, _ and -';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleOtpChange = (e) => {
    const { value } = e.target;
    setOtpData({ otp: value });
    if (validationErrors.otp) {
      setValidationErrors(prev => ({ ...prev, otp: '' }));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const response = await handleRegister({
        fullname: formData.fullname,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      // If response contains token, useAuth already handled login, just redirect
      if (response && response.data && response.data.token) {
        navigate('/dashboard', { replace: true });
      } else if (response && otp.sent) {
        // Otherwise, move to OTP verification
        setStep('otp');
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    
    if (!otpData.otp || otpData.otp.length !== 6) {
      setValidationErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    try {
      const response = await handleVerifyOtp(userId, otpData.otp);
      if (response) {
        // If response contains token, useAuth should ideally handle it, but verifyOtp is a thunk
        // Let's check if the thunk handles login. If not, we do it here or in useAuth.
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
          <h1 className="auth-title">Verify OTP</h1>
          <p className="auth-subtitle">Enter the OTP sent to {formData.email}</p>

          {error && <div className="error-message">{error}</div>}

          <form className="auth-form" onSubmit={handleOtpSubmit}>
            <div className="form-group">
              <label htmlFor="otp">One-Time Password</label>
              <input
                type="text"
                id="otp"
                value={otpData.otp}
                onChange={handleOtpChange}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                disabled={loading}
                className={validationErrors.otp ? 'input-error' : ''}
              />
              {validationErrors.otp && (
                <span className="field-error">{validationErrors.otp}</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading || otpData.otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <button
            onClick={() => setStep('register')}
            className="auth-link-button"
            style={{ marginTop: '16px' }}
          >
            ← Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start monitoring your DevOps infrastructure</p>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label htmlFor="fullname">Full Name</label>
            <input
              type="text"
              id="fullname"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              placeholder="John Doe"
              disabled={loading}
              className={validationErrors.fullname ? 'input-error' : ''}
            />
            {validationErrors.fullname && (
              <span className="field-error">{validationErrors.fullname}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              disabled={loading}
              className={validationErrors.username ? 'input-error' : ''}
            />
            {validationErrors.username && (
              <span className="field-error">{validationErrors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={loading}
              className={validationErrors.email ? 'input-error' : ''}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                disabled={loading}
                className={validationErrors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={loading}
                className={validationErrors.confirmPassword ? 'input-error' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span className="field-error">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="auth-link-button">
          Login here
        </Link>
      </div>
    </div>
  );
}

export default Register;