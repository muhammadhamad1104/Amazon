import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api/api';
import { useAuthStore } from '../../store/store';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import { formatPKR } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/media';
import { getDisplaySize } from '../../utils/sizeStock';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const { data } = await ordersAPI.getMyOrders();
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': '#ffa500',
      'Processing': '#007bff',
      'Shipped': '#17a2b8',
      'Received': '#28a745',
      'Delivered': '#28a745',
      'Cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getPaymentStatus = (order) => (
    order?.isPaid || order?.paymentResult?.status === 'Cleared' ? 'Cleared' : 'Pending'
  );

  const getPaymentStatusColor = (paymentStatus) => {
    const colors = {
      'Pending': '#f59e0b',
      'Cleared': '#10b981'
    };
    return colors[paymentStatus] || '#6c757d';
  };

  if (loading) return <Loader />;

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>My Orders</h1>

        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here</p>
            <Link to="/products" className="shop-now-btn">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order #{order._id.slice(-8).toUpperCase()}</h3>
                    <p className="order-date">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="order-badges">
                    <div
                      className="order-status"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </div>
                    <div
                      className="payment-status"
                      style={{ backgroundColor: getPaymentStatusColor(getPaymentStatus(order)) }}
                    >
                      Payment: {getPaymentStatus(order)}
                    </div>
                  </div>
                </div>

                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <img src={resolveImageUrl(item.image)} alt={item.name} />
                      <div className="order-item-details">
                        <h4>{item.name}</h4>
                        <p>Size: {getDisplaySize(item.size)}</p>
                        <p>Quantity: {item.quantity}</p>
                        <p className="item-price">{formatPKR(item.price)} each</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-footer">
                  <div className="order-summary">
                    <div className="summary-item">
                      <span>Payment Method:</span>
                      <strong>{order.paymentMethod}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Total Amount:</span>
                      <strong className="total-price">{formatPKR(order.totalPrice)}</strong>
                    </div>
                  </div>

                  <div className="order-actions">
                    <Link to={`/order/${order._id}`} className="view-details-btn">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
