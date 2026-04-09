import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api/api';
import { useAuthStore } from '../../store/store';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import './OrderDetail.css';

const CANCEL_WINDOW_HOURS = 24;
const CANCEL_WINDOW_MS = CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
const NON_CANCELLABLE_STATUSES = new Set(['Shipped', 'Received', 'Delivered', 'Cancelled']);

const formatDuration = (ms) => {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrder();
  }, [id, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      const { data } = await ordersAPI.getById(id);
      setOrder(data);
    } catch (error) {
      toast.error('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        const { data } = await ordersAPI.cancel(id);
        setOrder(data);
        toast.success('Order cancelled successfully');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to cancel order');
      }
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

  if (loading) return <Loader />;
  if (!order) return null;

  const paymentStatus = order.isPaid || order?.paymentResult?.status === 'Cleared' ? 'Cleared' : 'Pending';
  const subtotal = (order.items || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const cancelWindowRemainingMs = (new Date(order.createdAt).getTime() + CANCEL_WINDOW_MS) - Date.now();
  const cancellationWindowOpen = cancelWindowRemainingMs > 0;
  const statusAllowsCancellation = !NON_CANCELLABLE_STATUSES.has(order.status);
  const canCancel = statusAllowsCancellation && cancellationWindowOpen;

  const cancelMessage = !statusAllowsCancellation
    ? `Order cannot be cancelled after status ${order.status}.`
    : cancellationWindowOpen
      ? `You can cancel this order for ${formatDuration(cancelWindowRemainingMs)} more.`
      : `Cancellation window expired. Orders can only be cancelled within ${CANCEL_WINDOW_HOURS} hours.`;

  return (
    <div className="order-detail-page">
      <div className="order-detail-container">
        <div className="order-detail-header">
          <div>
            <h1>Order Details</h1>
            <p className="order-id">Order #{order._id.slice(-8).toUpperCase()}</p>
          </div>
          <div 
            className="order-status-badge"
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {order.status}
          </div>
        </div>

        <div className="order-detail-content">
          {/* Order Info */}
          <div className="order-section">
            <h2>Order Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Order Date:</span>
                <span className="info-value">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Payment Method:</span>
                <span className="info-value">{order.paymentMethod}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Payment Status:</span>
                <span className={`info-value ${paymentStatus === 'Cleared' ? 'paid' : 'unpaid'}`}>
                  {paymentStatus}
                </span>
              </div>
              {paymentStatus === 'Cleared' && order.paidAt && (
                <div className="info-item">
                  <span className="info-label">Paid At:</span>
                  <span className="info-value">
                    {new Date(order.paidAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="order-section">
            <h2>Shipping Address</h2>
            <div className="address-box">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="order-section">
            <h2>Order Items</h2>
            <div className="order-items-list">
              {order.items.map((item, index) => (
                <div key={index} className="order-detail-item">
                  <img src={item.image} alt={item.name} />
                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p>Quantity: {item.quantity}</p>
                    <p className="item-price">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-section">
            <h2>Order Summary</h2>
            <div className="summary-details">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (0%):</span>
                <span>${order.taxPrice.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>${order.shippingPrice.toFixed(2)}</span>
              </div>
              <div className="summary-total">
                <span>Total:</span>
                <span>${order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="order-actions-section">
            <p className={`cancel-order-note ${canCancel ? 'open' : 'blocked'}`}>{cancelMessage}</p>
            {canCancel && (
              <button onClick={handleCancelOrder} className="cancel-order-btn">
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
