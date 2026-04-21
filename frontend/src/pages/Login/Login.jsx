import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaFacebook, FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { authAPI } from '../../api/api';
import { useAuthStore } from '../../store/store';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const data = response.data;
      
      if (!data || !data.token) {
        throw new Error('Invalid response from server');
      }
      
      // Store user data and token first
      login(data, data.token);
      
      // Show success message
      toast.success(`Welcome ${data.name}!`);
      
      // Wait a moment for state to update before navigating
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect based on user role
      if (data.isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Login error:', error);
      }
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    toast.info('Facebook OAuth integration coming soon!');
  };

  const handleGoogleLogin = () => {
    toast.info('Google OAuth integration coming soon!');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Sign In</h1>
        
        {/* OAuth Buttons */}
        <div className="oauth-buttons">
          <button type="button" className="oauth-btn facebook-btn" onClick={handleFacebookLogin}>
            <FaFacebook className="oauth-icon" />
            Continue with Facebook
          </button>
          
          <button type="button" className="oauth-btn google-btn" onClick={handleGoogleLogin}>
            <FaGoogle className="oauth-icon" />
            Continue with Google
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
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
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>New customer? <Link to="/register">Create your account</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
