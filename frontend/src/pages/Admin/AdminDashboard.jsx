import { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/store';
import { FaBox, FaChartBar, FaUser, FaSignOutAlt } from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Close mobile sidebar when route changes
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Debug logging
  useEffect(() => {
    console.log('Admin Dashboard - Auth Status:', {
      isAuthenticated,
      user,
      isAdmin: user?.isAdmin
    });
  }, [isAuthenticated, user]);

  // Check authentication and admin status
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!user || !user.isAdmin) {
    console.log('Not admin user, redirecting to home');
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: '/admin', icon: FaChartBar, label: 'Dashboard', exact: true },
    { path: '/admin/products', icon: FaBox, label: 'Products' },
    { path: '/profile', icon: FaUser, label: 'Profile' },
  ];

  const handleNavClick = (path) => {
    navigate(path);
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Desktop Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="Admin avatar" />
            ) : (
              <div className="avatar-fallback">{user?.name?.[0] || 'A'}</div>
            )}
          </div>
          <h2>Admin Panel</h2>
          <p className="admin-name">{user?.name}</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path 
              : location.pathname.startsWith(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="nav-item logout" onClick={handleLogout}>
          <FaSignOutAlt className="nav-icon" />
          <span className="nav-label">Logout</span>
        </button>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="admin-bottom-bar">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="bottom-nav-icon" />
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="bottom-nav-item logout"
        >
          <FaSignOutAlt className="bottom-nav-icon" />
          <span className="bottom-nav-label">Logout</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
