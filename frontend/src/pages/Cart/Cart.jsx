import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartAPI } from '../../api/api';
import { useCartStore, useAuthStore } from '../../store/store';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import { formatPKR } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/media';
import { getDisplaySize, getSizePricingForProduct, getColorStockForProduct } from '../../utils/sizeStock';
import PriceDisplay from '../../components/PriceDisplay/PriceDisplay';
import './Cart.css';

const FIXED_SHIPPING_CHARGE = 200;

const Cart = () => {
  const [loading, setLoading] = useState(true);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const {
    cart,
    setCart,
    updateGuestItem,
    removeGuestItem,
    clearCart: clearGuestCart
  } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      return;
    }

    setLoading(false);
  }, [isAuthenticated]);

  // Local quantity tracking map to prevent race conditions on fast consecutive clicks
  const [localQuantities, setLocalQuantities] = useState({});
  const pendingUpdatesRef = useRef({});

  // Synchronize local quantities from cart items
  useEffect(() => {
    if (cart?.items) {
      setLocalQuantities((prev) => {
        const next = { ...prev };
        cart.items.forEach((item) => {
          const key = `${item.product?._id}-${getDisplaySize(item.size)}-${item.color || 'Default'}`;
          if (!pendingUpdatesRef.current[key]) {
            next[key] = item.quantity;
          }
        });
        return next;
      });
    }
  }, [cart]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingUpdatesRef.current).forEach(clearTimeout);
    };
  }, []);

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

  const handleQtyChange = (productId, size, color, delta) => {
    const key = `${productId}-${size}-${color}`;
    const currentQty = localQuantities[key] ?? 1;
    const item = cart?.items?.find(
      (it) => it.product?._id === productId && getDisplaySize(it.size) === size && (it.color || 'Default') === color
    );
    if (!item) return;

    const maxStock = getColorStockForProduct(item.product, size, color);
    const newQty = Math.max(1, Math.min(maxStock, currentQty + delta));

    if (newQty === currentQty) return;

    setLocalQuantities((prev) => ({
      ...prev,
      [key]: newQty
    }));

    if (pendingUpdatesRef.current[key]) {
      clearTimeout(pendingUpdatesRef.current[key]);
    }

    pendingUpdatesRef.current[key] = setTimeout(async () => {
      delete pendingUpdatesRef.current[key];
      
      if (!isAuthenticated) {
        updateGuestItem({ productId, size, color, quantity: newQty });
        return;
      }

      try {
        const { data } = await cartAPI.update({
          productId,
          size,
          color,
          quantity: newQty
        });
        setCart(data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update quantity');
        fetchCart();
      }
    }, 300);
  };

  const removeItem = async (productId, size, color) => {
    if (!isAuthenticated) {
      removeGuestItem({ productId, size, color });
      toast.success('Item removed from cart');
      return;
    }

    try {
      const { data } = await cartAPI.remove(productId, size, color);
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
      color: item.color || 'Default',
      name: item.product.name
    });
  };

  const cancelRemove = () => setPendingRemove(null);

  const confirmRemove = async () => {
    if (!pendingRemove?.id) return;
    await removeItem(pendingRemove.id, pendingRemove.size, pendingRemove.color);
    setPendingRemove(null);
  };

  const clearCart = async () => {
    if (!isAuthenticated) {
      clearGuestCart();
      toast.success('Cart cleared');
      return;
    }

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
    acc + (getSizePricingForProduct(item.product, getDisplaySize(item.size)).price || 0) * item.quantity, 0
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
                const itemColor = item.color || 'Default';
                const sizePricing = getSizePricingForProduct(item.product, itemSize);
                const itemQty = localQuantities[`${item.product?._id}-${itemSize}-${itemColor}`] ?? item.quantity;
                const maxStock = getColorStockForProduct(item.product, itemSize, itemColor);
                const isPlusDisabled = itemQty >= maxStock;
                const isMinusDisabled = itemQty <= 1;

                return (
                <div key={`${item.product?._id}-${itemSize}-${itemColor}`} className="cart-item">
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
                      <p className="item-size">Color: {itemColor} <span className="item-stock-avail">({maxStock} available)</span></p>
                    </div>
                  </div>

                  <div className="item-price">
                    <PriceDisplay
                      product={item.product}
                      size={itemSize}
                      variant="compact"
                      className="cart-price-display"
                    />
                  </div>

                  <div className="item-quantity">
                    <button
                      onClick={() => handleQtyChange(item.product?._id, itemSize, itemColor, -1)}
                      disabled={isMinusDisabled}
                      className="qty-btn"
                    >
                      <FaMinus />
                    </button>
                    <span className="qty-value">{itemQty}</span>
                    <button
                      onClick={() => handleQtyChange(item.product?._id, itemSize, itemColor, 1)}
                      disabled={isPlusDisabled}
                      className="qty-btn"
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className="item-total">
                    {formatPKR((sizePricing.price || 0) * itemQty)}
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
              {pendingRemove.size ? ` (size ${pendingRemove.size}` : ''}
              {pendingRemove.color ? `, color ${pendingRemove.color})` : pendingRemove.size ? ')' : ''}
              {!pendingRemove.size && pendingRemove.color ? ` (color ${pendingRemove.color})` : ''}
              {' '}from your cart?
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
