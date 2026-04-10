import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartAPI, ordersAPI } from '../../api/api';
import { useCartStore, useAuthStore } from '../../store/store';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import { formatPKR } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/media';
import { getDisplaySize } from '../../utils/sizeStock';
import './Checkout.css';

const FIXED_SHIPPING_CHARGE = 200;

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, setCart, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shippingAddress, setShippingAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'USA'
  });

  const [paymentMethod, setPaymentMethod] = useState('Credit Card');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      const { data } = await cartAPI.get();
      if (!data.items || data.items.length === 0) {
        toast.error('Your cart is empty');
        navigate('/cart');
        return;
      }
      setCart(data);
    } catch (error) {
      toast.error('Failed to load cart');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const orderItems = cart.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        size: getDisplaySize(item.size),
        image: item.product.image
      }));

      const { data } = await ordersAPI.create({
        items: orderItems,
        shippingAddress,
        paymentMethod
      });

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order/${data._id}`, { replace: true });
    } catch (error) {
      setSubmitting(false);
      toast.error(error.response?.data?.message || 'Failed to place order');
    }
  };

  if (loading) return <Loader />;

  const subtotal = cart?.items?.reduce((acc, item) => 
    acc + item.product.price * item.quantity, 0
  ) || 0;
  const tax = 0;
  const shipping = FIXED_SHIPPING_CHARGE;
  const total = subtotal + tax + shipping;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Checkout</h1>

        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="checkout-content">
            {/* Shipping Address */}
            <div className="checkout-section">
              <h2>Shipping Address</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Street Address *</label>
                  <input
                    type="text"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                    required
                    placeholder="123 Main St"
                  />
                </div>

                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    required
                    placeholder="New York"
                  />
                </div>

                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                    required
                    placeholder="NY"
                  />
                </div>

                <div className="form-group">
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    value={shippingAddress.zipCode}
                    onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
                    required
                    placeholder="10001"
                  />
                </div>

                <div className="form-group">
                  <label>Country *</label>
                  <input
                    type="text"
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                    required
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="checkout-section">
              <h2>Payment Method</h2>
              <div className="payment-options">
                {['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery'].map(method => (
                  <label key={method} className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="checkout-section">
              <h2>Order Items</h2>
              <div className="order-items">
                {cart?.items?.map(item => (
                  <div key={`${item.product._id}-${getDisplaySize(item.size)}`} className="order-item">
                    <img src={resolveImageUrl(item.product.image)} alt={item.product.name} />
                    <div className="order-item-info">
                      <h3>{item.product.name}</h3>
                      <p>Size: {getDisplaySize(item.size)}</p>
                      <p>Quantity: {item.quantity}</p>
                    </div>
                    <div className="order-item-price">
                      {formatPKR(item.product.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="order-summary-sidebar">
            <div className="summary-card">
              <h2>Order Summary</h2>
              
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPKR(subtotal)}</span>
              </div>

              <div className="summary-row">
                <span>Tax (0%)</span>
                <span>{formatPKR(tax)}</span>
              </div>

              <div className="summary-row">
                <span>Shipping</span>
                <span>{formatPKR(shipping)}</span>
              </div>

              <div className="summary-total">
                <span>Total</span>
                <span>{formatPKR(total)}</span>
              </div>

              <button 
                type="submit" 
                className="place-order-btn"
                disabled={submitting}
              >
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
