import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI, cartAPI } from '../../api/api';
import { useAuthStore, useCartStore } from '../../store/store';
import { FaStar, FaStarHalfAlt, FaRegStar, FaShoppingCart } from 'react-icons/fa';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import { formatCategoryLabel } from '../../constants/productCategories';
import { formatPKR } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/media';
import {
  getDisplaySize,
  getProductAvailableSizes,
  getProductSizeStockMap
} from '../../utils/sizeStock';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const addToCartInFlightRef = useRef(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const { isAuthenticated } = useAuthStore();
  const { setCart } = useCartStore();

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productsAPI.getById(id);
      setProduct(data);
    } catch {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (!product) return;

    const sizeOptions = getProductAvailableSizes(product);
    const firstAvailableSize = sizeOptions[0] || '';

    setSelectedSize((currentSize) => (sizeOptions.includes(currentSize) ? currentSize : firstAvailableSize));
    setQuantity(1);
  }, [product]);

  const handleAddToCart = async () => {
    if (isAddingToCart || addToCartInFlightRef.current) {
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }

    addToCartInFlightRef.current = true;
    setIsAddingToCart(true);

    try {
      const { data } = await cartAPI.add({
        productId: product._id,
        quantity,
        size: selectedSize
      });
      setCart(data);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      addToCartInFlightRef.current = false;
      setIsAddingToCart(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      navigate('/login');
      return;
    }

    try {
      await productsAPI.addReview(product._id, review);
      toast.success('Review submitted!');
      setReview({ rating: 5, comment: '' });
      fetchProduct();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="star filled" />);
    }
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className="star filled" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className="star" />);
    }
    return stars;
  };

  if (loading) return <Loader />;
  if (!product) return null;

  const images = (product.images && product.images.length > 0
    ? product.images
    : [product.image])
    .map((image) => resolveImageUrl(image))
    .filter(Boolean);
  const sizeStock = getProductSizeStockMap(product);
  const sizeOptions = getProductAvailableSizes(product);
  const totalStock = Object.values(sizeStock).reduce((sum, value) => sum + value, 0);
  const activeSize = getDisplaySize(selectedSize, sizeOptions[0] || 'L');
  const selectedSizeStock = sizeStock[activeSize] || 0;

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        {/* Product Images */}
        <div className="product-images">
          <div className="main-image">
            <img src={images[selectedImage] || resolveImageUrl(product.image)} alt={product.name} />
          </div>
          {images.length > 1 && (
            <div className="thumbnail-images">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${product.name} ${index + 1}`}
                  className={selectedImage === index ? 'active' : ''}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-brand">Brand: {product.brand}</p>

          <div className="rating-section">
            <div className="stars">{renderStars(product.rating)}</div>
            <span className="rating-text">
              {product.rating.toFixed(1)} ({product.numReviews} reviews)
            </span>
          </div>

          <div className="price-section">
            <span className="price">{formatPKR(product.price)}</span>
          </div>

          <div className="stock-info">
            {totalStock > 0 ? (
              <>
                <span className="in-stock">✓ In Stock</span>
                <span className="size-stock-note">Size {activeSize}: {selectedSizeStock} available</span>
                {selectedSizeStock > 0 && selectedSizeStock < 10 && (
                  <span className="low-stock-warning">
                    Only {selectedSizeStock} left in size {activeSize}
                  </span>
                )}
              </>
            ) : (
              <span className="out-of-stock">✕ Out of Stock</span>
            )}
          </div>

          <div className="description">
            <h3>About this item</h3>
            <p>{product.description}</p>
          </div>

          <div className="product-meta">
            <p><strong>Category:</strong> {formatCategoryLabel(product.category, product.subcategory)}</p>
          </div>

          {totalStock > 0 && (
            <div className="purchase-section">
              <div className="size-selector">
                <label>Size:</label>
                <div className="size-options">
                  {sizeOptions.map((size) => {
                    const stockForSize = sizeStock[size];
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`size-option-btn ${isSelected ? 'active' : ''}`}
                        disabled={stockForSize === 0}
                        onClick={() => {
                          setSelectedSize(size);
                          setQuantity(1);
                        }}
                      >
                        {size}
                        <span>{stockForSize}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="quantity-selector">
                <label>Quantity:</label>
                <select 
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="quantity-select"
                  disabled={selectedSizeStock <= 0}
                >
                  {[...Array(Math.min(selectedSizeStock, 10))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="add-to-cart-btn"
                disabled={selectedSizeStock <= 0 || isAddingToCart}
              >
                <FaShoppingCart /> {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2>Customer Reviews</h2>

        {isAuthenticated && (
          <form onSubmit={handleSubmitReview} className="review-form">
            <h3>Write a Review</h3>
            <div className="form-group">
              <label>Rating:</label>
              <select 
                value={review.rating}
                onChange={(e) => setReview({...review, rating: Number(e.target.value)})}
              >
                {[5, 4, 3, 2, 1].map(num => (
                  <option key={num} value={num}>{num} Stars</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Comment:</label>
              <textarea
                value={review.comment}
                onChange={(e) => setReview({...review, comment: e.target.value})}
                required
                rows="4"
                placeholder="Share your experience with this product"
              />
            </div>
            <button type="submit" className="submit-review-btn">Submit Review</button>
          </form>
        )}

        <div className="reviews-list">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((review, index) => (
              <div key={index} className="review-card">
                <div className="review-header">
                  <strong>{review.name}</strong>
                  <div className="stars">{renderStars(review.rating)}</div>
                </div>
                <p className="review-date">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
                <p className="review-comment">{review.comment}</p>
              </div>
            ))
          ) : (
            <p className="no-reviews">No reviews yet. Be the first to review!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
