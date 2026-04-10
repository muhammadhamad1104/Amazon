import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartAPI } from '../../api/api';
import { useCartStore, useAuthStore } from '../../store/store';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import { formatPKR } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/media';
import { getDisplaySize, getSizeStockForProduct } from '../../utils/sizeStock';
import './Cart.css';

const FIXED_SHIPPING_CHARGE = 200;

const Cart = () => {
  const [loading, setLoading] = useState(true);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { cart, setCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

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
      setCart(data);
    } catch (error) {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, size, newQuantity) => {
    try {
      const { data } = await cartAPI.update({
        productId,
        size,
        quantity: newQuantity
      });
      setCart(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update cart');
    }
  };

  const removeItem = async (productId, size) => {
    try {
      const { data } = await cartAPI.remove(productId, size);
      setCart(data);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const openRemoveConfirm = (item) => {
    if (!item?.product?._id) return;
    setPendingRemove({
      id: item.product._id,
      size: getDisplaySize(item.size),
      name: item.product.name
    });
  };

  const cancelRemove = () => setPendingRemove(null);

  const confirmRemove = async () => {
    if (!pendingRemove?.id) return;
    await removeItem(pendingRemove.id, pendingRemove.size);
    setPendingRemove(null);
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setCart({ items: [], totalPrice: 0 });
      toast.success('Cart cleared');
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  const openClearConfirm = () => setShowClearConfirm(true);
  const cancelClear = () => setShowClearConfirm(false);
  const confirmClear = async () => {
    await clearCart();
    setShowClearConfirm(false);
  };

  if (loading) return <Loader />;

  const subtotal = cart?.items?.reduce((acc, item) => 
    acc + (item.product?.price || 0) * item.quantity, 0
  ) || 0;

  const tax = 0;
  const shipping = FIXED_SHIPPING_CHARGE;
  const total = subtotal + tax + shipping;

  return (
    <div className="cart-page">
      {/* Hero Header */}
      <div className="cart-page-header">
        <h1 className="cart-page-title">Shopping Cart</h1>
      </div>

      <div className="cart-container">
        {!cart?.items || cart.items.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Add some products to get started</p>
            <Link to="/products" className="shop-now-btn">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              <div className="cart-header">
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Total</span>
                <span>Action</span>
              </div>

              {cart.items.map((item) => {
                const itemSize = getDisplaySize(item.size);
                const sizeStock = getSizeStockForProduct(item.product, itemSize);

                return (
                <div key={`${item.product?._id}-${itemSize}`} className="cart-item">
                  <div className="item-product">
                    <Link to={`/product/${item.product?._id}`}>
                      <img src={resolveImageUrl(item.product?.image)} alt={item.product?.name} />
                    </Link>
                    <div className="item-info">
                      <Link to={`/product/${item.product?._id}`} className="item-name">
                        {item.product?.name}
                      </Link>
                      <p className="item-brand">{item.product?.brand}</p>
                      <p className="item-size">Size: {itemSize}</p>
                      {sizeStock < 10 && (
                        <p className="low-stock">Only {sizeStock} left in size {itemSize}!</p>
                      )}
                    </div>
                  </div>

                  <div className="item-price">
                    {formatPKR(item.product?.price)}
                  </div>

                  <div className="item-quantity">
                    <button
                      onClick={() => updateQuantity(item.product?._id, itemSize, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="qty-btn"
                    >
                      <FaMinus />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product?._id, itemSize, item.quantity + 1)}
                      disabled={item.quantity >= sizeStock}
                      className="qty-btn"
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className="item-total">
                    {formatPKR((item.product?.price || 0) * item.quantity)}
                  </div>

                  <div className="item-action">
                    <button
                      onClick={() => openRemoveConfirm(item)}
                      className="remove-btn"
                      title="Remove item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              )})}

              <div className="cart-actions">
                <button onClick={openClearConfirm} className="clear-cart-btn">
                  Clear Cart
                </button>
                <Link to="/products" className="continue-shopping-btn">
                  Continue Shopping
                </Link>
              </div>
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              
              <div className="summary-row">
                <span>Subtotal ({cart.items.length} items)</span>
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
                onClick={() => navigate('/checkout')}
                className="checkout-btn"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {pendingRemove && (
        <div className="cart-confirm-overlay" onClick={cancelRemove}>
          <div className="cart-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Remove item?</h4>
            <p>
              Are you sure you want to remove {pendingRemove.name ? <strong>{pendingRemove.name}</strong> : 'this item'}
              {pendingRemove.size ? ` (size ${pendingRemove.size})` : ''} from your cart?
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={cancelRemove}>Cancel</button>
              <button className="btn-danger" onClick={confirmRemove}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="cart-confirm-overlay" onClick={cancelClear}>
          <div className="cart-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Clear cart?</h4>
            <p>This will remove all items from your cart. Are you sure you want to continue?</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={cancelClear}>Cancel</button>
              <button className="btn-danger" onClick={confirmClear}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
