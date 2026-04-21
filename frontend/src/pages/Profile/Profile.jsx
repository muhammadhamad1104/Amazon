import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/api';
import { useAuthStore } from '../../store/store';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaArrowLeft, FaCamera } from 'react-icons/fa';
import { resolveImageUrl } from '../../utils/media';
import './Profile.css';

const Profile = () => {
  const { user, isAuthenticated, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const { data } = await authAPI.getProfile();
      
      if (!data) {
        throw new Error('No profile data received');
      }
      
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        avatar: data.avatar || '',
        address: {
          street: data.address?.street || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          zipCode: data.address?.zipCode || '',
          country: data.address?.country || ''
        },
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setAvatarPreview(data.avatar || '');
      setLoading(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Profile fetch error:', error);
      }
      setLoading(false);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please log in again.');
        logout();
        navigate('/login');
        return;
      }
      
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your connection and try again.');
      } else if (!error.response) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load profile');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdating(true);

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        avatar: avatarPreview || formData.avatar,
        address: formData.address
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      const { data } = await authAPI.updateProfile(updateData);
      
      // Update user in store with new data
      updateUser(data);
      
      // Clear password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Profile updated successfully!');
      setUpdating(false);
    } catch (error) {
      setUpdating(false);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB guard for base64 payload size
    if (file.size > maxSizeBytes) {
      toast.error('Please choose an image under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <Loader />;

  return (
    <div className="profile-page">
      <div className="profile-container">
        {user?.isAdmin && (
          <button className="back-to-dashboard" onClick={() => navigate('/admin')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
        )}

        <div className="profile-header">
          <div className="profile-avatar">
            {avatarPreview ? (
              <img src={resolveImageUrl(avatarPreview)} alt="Profile" />
            ) : (
              <FaUser />
            )}
            <label className="avatar-upload" title="Upload profile photo">
              <FaCamera />
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="profile-info">
            <h1>{user?.name}</h1>
            <p>{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Personal Information */}
          <div className="form-section">
            <h2>Personal Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <FaUser /> Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FaEnvelope /> Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FaPhone /> Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Address Information (hide for admin) */}
          {!user?.isAdmin && (
            <div className="form-section">
              <h2>
                <FaMapMarkerAlt /> Shipping Address
              </h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: {...formData.address, street: e.target.value}
                    })}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: {...formData.address, city: e.target.value}
                    })}
                    placeholder="New York"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: {...formData.address, state: e.target.value}
                    })}
                    placeholder="NY"
                  />
                </div>

                <div className="form-group">
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: {...formData.address, zipCode: e.target.value}
                    })}
                    placeholder="10001"
                  />
                </div>

                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: {...formData.address, country: e.target.value}
                    })}
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Change Password */}
          <div className="form-section">
            <h2>Change Password</h2>
            <p className="section-note">Leave blank if you don't want to change your password</p>
            <div className="form-grid">
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="update-btn" disabled={updating}>
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
