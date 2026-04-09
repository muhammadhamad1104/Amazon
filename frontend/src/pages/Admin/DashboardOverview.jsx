import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';
import { FaBox, FaShoppingCart, FaDollarSign, FaUsers } from 'react-icons/fa';
import Loader from '../../components/Loader/Loader';
import { formatCategoryLabel } from '../../constants/productCategories';
import './DashboardOverview.css';

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    recentProducts: [],
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="dashboard-overview">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p className="dashboard-subtitle">Welcome to your admin dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card products">
          <div className="stat-icon-wrapper">
            <FaBox className="stat-icon" />
          </div>
          <div className="stat-info">
            <h3>Total Products</h3>
            <p className="stat-number">{stats.totalProducts}</p>
          </div>
        </div>

        <div className="stat-card orders">
          <div className="stat-icon-wrapper">
            <FaShoppingCart className="stat-icon" />
          </div>
          <div className="stat-info">
            <h3>Total Orders</h3>
            <p className="stat-number">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="stat-card revenue">
          <div className="stat-icon-wrapper">
            <FaDollarSign className="stat-icon" />
          </div>
          <div className="stat-info">
            <h3>Total Revenue</h3>
            <p className="stat-number">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card users">
          <div className="stat-icon-wrapper">
            <FaUsers className="stat-icon" />
          </div>
          <div className="stat-info">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className="recent-products-section">
        <h2>Recent Products</h2>
        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentProducts.map((product) => (
                <tr key={product._id}>
                  <td>
                    <img src={product.image} alt={product.name} className="product-thumb" />
                  </td>
                  <td>{product.name}</td>
                  <td><span className="category-badge">{formatCategoryLabel(product.category, product.subcategory)}</span></td>
                  <td className="price-cell">${product.price.toFixed(2)}</td>
                  <td>
                    <span className={`stock-badge ${product.stock > 10 ? 'in-stock' : 'low-stock'}`}>
                      {product.stock} units
                    </span>
                  </td>
                  <td>
                    <span className="rating-badge">⭐ {product.rating.toFixed(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
