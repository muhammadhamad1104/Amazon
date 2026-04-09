import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaSearch, FaSignOutAlt, FaBars, FaTimes, FaTrash } from 'react-icons/fa';
import { useAuthStore, useCartStore } from '../../store/store';
import { useState, useEffect } from 'react';
import { cartAPI } from '../../api/api';
import { toast } from 'react-toastify';
import { formatPKR } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/media';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { cart, setCart } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const isAdmin = isAuthenticated && user?.isAdmin;
  const isAdminRoute = location.pathname.startsWith('/admin');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${searchTerm}`);
      setShowMobileMenu(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowMobileMenu(false);
  };

  const cartItemsCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const handleRemoveFromCart = async (productId) => {
    try {
      const { data } = await cartAPI.remove(productId);
      setCart(data);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove item');
    }
  };

  const confirmRemove = (productId) => {
    setPendingRemoveId(productId);
  };

  const cancelRemove = () => setPendingRemoveId(null);

  const handleConfirmRemove = async () => {
    if (!pendingRemoveId) return;
    await handleRemoveFromCart(pendingRemoveId);
    setPendingRemoveId(null);
  };

  const toggleCartDropdown = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      setShowCartDropdown(!showCartDropdown);
    } else {
      navigate('/cart');
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.cart-dropdown-container') && !e.target.closest('.cart-icon-btn')) {
        setShowCartDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide header on admin pages
  if (isAdminRoute) {
    return null;
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <img src="/logo2.jpeg" alt="IRFWARDROBE logo" className="logo-image" />
          <span className="logo-text">IRF WARDROBE</span>
        </Link>

        <form className="search-bar" onSubmit={handleSearch}>
          <button 
            type="button" 
            className="search-icon-btn"
            onClick={handleSearch}
            aria-label="Search"
          >
            <FaSearch className="search-icon" />
          </button>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {/* {!isAdmin && (
            <button type="submit" className="search-btn">
              Search
            </button>
          )} */}
        </form>

        {/* Hamburger Menu Button */}
        <button 
          className="hamburger-btn"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="Toggle menu"
        >
          {showMobileMenu ? <FaTimes /> : <FaBars />}
        </button>

        <nav className={`nav-links ${showMobileMenu ? 'show' : ''}`}>
          {isAdmin ? (
            <>
              <Link to="/admin" className="nav-link admin-link" onClick={() => setShowMobileMenu(false)}>
                📊 Admin Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/products" className="nav-link" onClick={() => setShowMobileMenu(false)}>
                Products
              </Link>
              
              <Link to="/about" className="nav-link" onClick={() => setShowMobileMenu(false)}>
                About
              </Link>
              
              <Link to="/contact" className="nav-link" onClick={() => setShowMobileMenu(false)}>
                Contact
              </Link>
            </>
          )}

          {isAuthenticated ? (
            <>
              {/* Cart with Dropdown */}
              <div className="cart-dropdown-container">
                <button 
                  onClick={toggleCartDropdown}
                  className="nav-link cart-link cart-icon-btn"
                >
                  <FaShoppingCart />
                  <span className="cart-text">Cart</span>
                  {cartItemsCount > 0 && (
                    <span className="cart-badge">{cartItemsCount}</span>
                  )}
                </button>

                {/* Cart Dropdown */}
                {showCartDropdown && cartItemsCount > 0 && (
                  <div className="cart-dropdown">
                    <div className="cart-dropdown-header">
                      <h3>Shopping Cart</h3>
                      <span className="cart-count">{cartItemsCount} items</span>
                    </div>
                    <div className="cart-dropdown-items">
                      {cart.items.map((item) => (
                        <div key={item.product._id} className="cart-dropdown-item">
                          <img src={resolveImageUrl(item.product.image)} alt={item.product.name} />
                          <div className="cart-item-info">
                            <h4>{item.product.name}</h4>
                            <p className="cart-item-price">
                              {formatPKR(item.product.price)} × {item.quantity}
                            </p>
                          </div>
                          <button
                            className="remove-cart-item"
                            onClick={() => confirmRemove(item.product._id)}
                            aria-label="Remove item"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="cart-dropdown-footer">
                      <div className="cart-total">
                        <span>Subtotal:</span>
                        <span className="total-price">{formatPKR(cart.totalPrice)}</span>
                      </div>
                      <Link 
                        to="/cart" 
                        className="view-cart-btn"
                        onClick={() => {
                          setShowCartDropdown(false);
                          setShowMobileMenu(false);
                        }}
                      >
                        View Cart
                      </Link>
                      <Link 
                        to="/checkout" 
                        className="checkout-btn"
                        onClick={() => {
                          setShowCartDropdown(false);
                          setShowMobileMenu(false);
                        }}
                      >
                        Checkout
                      </Link>
                    </div>
                  </div>
                )}

                {showCartDropdown && cartItemsCount === 0 && (
                  <div className="cart-dropdown empty">
                    <p>Your cart is empty</p>
                    <Link 
                      to="/products" 
                      className="shop-now-btn"
                      onClick={() => {
                        setShowCartDropdown(false);
                        setShowMobileMenu(false);
                      }}
                    >
                      Shop Now
                    </Link>
                  </div>
                )}
                {pendingRemoveId && (
                  <div className="cart-confirm-overlay" onClick={cancelRemove}>
                    <div className="cart-confirm-modal" onClick={(e) => e.stopPropagation()}>
                      <h4>Remove item?</h4>
                      <p>Are you sure you want to remove this item from your cart?</p>
                      <div className="confirm-actions">
                        <button className="btn-cancel" onClick={cancelRemove}>Cancel</button>
                        <button className="btn-danger" onClick={handleConfirmRemove}>Remove</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="user-menu">
                <button className="nav-link user-btn">
                  {user?.avatar ? (
                    <span className="user-avatar">
                      <img src={resolveImageUrl(user.avatar)} alt="Profile" />
                    </span>
                  ) : (
                    <FaUser />
                  )}
                  <span>{user?.name}</span>
                </button>
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowMobileMenu(false)}>
                    Profile
                  </Link>
                  <Link to="/orders" className="dropdown-item" onClick={() => setShowMobileMenu(false)}>
                    Orders
                  </Link>
                  <button onClick={handleLogout} className="dropdown-item logout-btn">
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={() => setShowMobileMenu(false)}>
                Login
              </Link>
              <Link to="/register" className="btn-primary" onClick={() => setShowMobileMenu(false)}>
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
