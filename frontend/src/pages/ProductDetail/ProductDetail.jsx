import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cartAPI, productsAPI } from '../../api/api';
import { useAuthStore, useCartStore } from '../../store/store';
import {
  FaSearchPlus,
  FaShoppingCart,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaTimes,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import Loader from '../../components/Loader/Loader';
import PriceDisplay from '../../components/PriceDisplay/PriceDisplay';
import { toast } from 'react-toastify';
import { formatCategoryLabel } from '../../constants/productCategories';
import { resolveImageUrl } from '../../utils/media';
import {
  getDisplaySize,
  getProductAvailableSizes,
  getProductSizeStockMap,
  getSizeColorsForProduct
} from '../../utils/sizeStock';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const addToCartInFlightRef = useRef(false);
  const thumbnailStripRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0
  });
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const { isAuthenticated } = useAuthStore();
  const { setCart, addGuestItem } = useCartStore();

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productsAPI.getById(id);
      setProduct(data);
      setSelectedImage(0);
      setIsImageViewerOpen(false);
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
    const fallbackSize = sizeOptions[0] || '';

    setSelectedSize((currentSize) => (
      sizeOptions.includes(currentSize) ? currentSize : fallbackSize
    ));
  }, [product]);

  useEffect(() => {
    if (!product || !selectedSize) {
      setSelectedColor('');
      return;
    }

    const availableColors = getSizeColorsForProduct(product, selectedSize);
    const fallbackColor = availableColors[0] || '';

    setSelectedColor((currentColor) => (
      availableColors.includes(currentColor) ? currentColor : fallbackColor
    ));
  }, [product, selectedSize]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsImageViewerOpen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleAddToCart = async () => {
    if (isAddingToCart || addToCartInFlightRef.current) {
      return;
    }

    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }

    if (!selectedColor) {
      toast.error('Please select a color');
      return;
    }

    if (!isAuthenticated) {
      addGuestItem({
        product,
        size: selectedSize,
        color: selectedColor,
        quantity: 1
      });
      toast.success(`Added ${selectedSize} / ${selectedColor} to cart`);
      return;
    }

    addToCartInFlightRef.current = true;
    setIsAddingToCart(true);

    try {
      const { data } = await cartAPI.add({
        productId: product._id,
        size: selectedSize,
        color: selectedColor
      });
      setCart(data);
      toast.success(`Added ${selectedSize} / ${selectedColor} to cart`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      addToCartInFlightRef.current = false;
      setIsAddingToCart(false);
    }
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
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

    for (let index = 0; index < fullStars; index += 1) {
      stars.push(<FaStar key={index} className="star filled" />);
    }

    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className="star filled" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let index = 0; index < emptyStars; index += 1) {
      stars.push(<FaRegStar key={`empty-${index}`} className="star" />);
    }

    return stars;
  };

  const getPointerX = (event) => {
    if (event.touches?.[0]) {
      return event.touches[0].clientX;
    }

    if (event.changedTouches?.[0]) {
      return event.changedTouches[0].clientX;
    }

    return event.clientX ?? event.pageX ?? 0;
  };

  const startThumbnailDrag = (event) => {
    if (!thumbnailStripRef.current) return;

    dragStateRef.current.isDragging = true;
    dragStateRef.current.startX = getPointerX(event);
    dragStateRef.current.startScrollLeft = thumbnailStripRef.current.scrollLeft;
    thumbnailStripRef.current.classList.add('dragging');
  };

  const moveThumbnailDrag = (event) => {
    if (!thumbnailStripRef.current || !dragStateRef.current.isDragging) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    const deltaX = getPointerX(event) - dragStateRef.current.startX;
    thumbnailStripRef.current.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  };

  const stopThumbnailDrag = () => {
    if (!thumbnailStripRef.current) return;

    dragStateRef.current.isDragging = false;
    thumbnailStripRef.current.classList.remove('dragging');
  };

  const scrollThumbnails = (direction) => {
    if (!thumbnailStripRef.current) return;

    const scrollStep = Math.max(thumbnailStripRef.current.clientWidth * 0.7, 120);
    thumbnailStripRef.current.scrollBy({
      left: direction * scrollStep,
      behavior: 'smooth'
    });
  };

  const goToNextImage = (event) => {
    event?.stopPropagation?.();
    if (!images.length) return;
    setSelectedImage((current) => (current + 1) % images.length);
  };

  const goToPreviousImage = (event) => {
    event?.stopPropagation?.();
    if (!images.length) return;
    setSelectedImage((current) => (current - 1 + images.length) % images.length);
  };

  if (loading) return <Loader />;
  if (!product) return null;

  const images = (product.images && product.images.length > 0 ? product.images : [product.image])
    .map((image) => resolveImageUrl(image))
    .filter(Boolean);

  const sizeStock = getProductSizeStockMap(product);
  const sizeOptions = getProductAvailableSizes(product);
  const totalStock = Object.values(sizeStock).reduce((sum, value) => sum + value, 0);
  const activeSize = getDisplaySize(selectedSize, sizeOptions[0] || 'L');
  const sizeColors = getSizeColorsForProduct(product, activeSize);
  const activeColor = sizeColors.includes(selectedColor) ? selectedColor : (sizeColors[0] || '');

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        <div className="product-images">
          <div className="main-image-wrapper">
            <button
              type="button"
              className="main-image"
              onClick={() => setIsImageViewerOpen(true)}
              title="View full screen"
            >
              <img src={images[selectedImage] || resolveImageUrl(product.image)} alt={product.name} />
              <span className="zoom-hint"><FaSearchPlus /> View Full Screen</span>
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="main-image-nav prev"
                  onClick={goToPreviousImage}
                  aria-label="Show previous image"
                >
                  <FaChevronLeft />
                </button>

                <button
                  type="button"
                  className="main-image-nav next"
                  onClick={goToNextImage}
                  aria-label="Show next image"
                >
                  <FaChevronRight />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="thumbnail-strip-wrapper">
              <button
                type="button"
                className="thumbnail-nav-btn prev"
                onClick={() => scrollThumbnails(-1)}
                aria-label="Scroll thumbnails left"
              >
                <FaChevronLeft />
              </button>

              <div
                ref={thumbnailStripRef}
                className="thumbnail-images"
                onMouseDown={startThumbnailDrag}
                onMouseMove={moveThumbnailDrag}
                onMouseUp={stopThumbnailDrag}
                onMouseLeave={stopThumbnailDrag}
                onTouchStart={startThumbnailDrag}
                onTouchMove={moveThumbnailDrag}
                onTouchEnd={stopThumbnailDrag}
                onTouchCancel={stopThumbnailDrag}
              >
                {images.map((image, index) => (
                  <img
                    key={image + index}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className={selectedImage === index ? 'active' : ''}
                    onClick={() => setSelectedImage(index)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="thumbnail-nav-btn next"
                onClick={() => scrollThumbnails(1)}
                aria-label="Scroll thumbnails right"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>

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
            <PriceDisplay product={product} size={activeSize} variant="detail" />
          </div>

          <div className="stock-info">
            {totalStock > 0 ? (
              <>
                <span className="in-stock">✓ In Stock</span>
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
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="color-selector">
                <label>Color:</label>
                <div className="color-options">
                  {sizeColors.map((color) => {
                    const isSelected = activeColor === color;
                    return (
                      <button
                        key={`${activeSize}-${color}`}
                        type="button"
                        className={`color-option-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="add-to-cart-btn"
                disabled={!activeColor || isAddingToCart}
              >
                <FaShoppingCart /> {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="reviews-section">
        <h2>Customer Reviews</h2>

        {isAuthenticated && (
          <form onSubmit={handleSubmitReview} className="review-form">
            <h3>Write a Review</h3>
            <div className="form-group">
              <label>Rating:</label>
              <select
                value={review.rating}
                onChange={(event) => setReview({ ...review, rating: Number(event.target.value) })}
              >
                {[5, 4, 3, 2, 1].map((num) => (
                  <option key={num} value={num}>{num} Stars</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Comment:</label>
              <textarea
                value={review.comment}
                onChange={(event) => setReview({ ...review, comment: event.target.value })}
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
            product.reviews.map((entry, index) => (
              <div key={index} className="review-card">
                <div className="review-header">
                  <strong>{entry.name}</strong>
                  <div className="stars">{renderStars(entry.rating)}</div>
                </div>
                <p className="review-date">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
                <p className="review-comment">{entry.comment}</p>
              </div>
            ))
          ) : (
            <p className="no-reviews">No reviews yet. Be the first to review!</p>
          )}
        </div>
      </div>

      {isImageViewerOpen && (
        <div className="image-lightbox" onClick={() => setIsImageViewerOpen(false)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={(event) => {
              event.stopPropagation();
              setIsImageViewerOpen(false);
            }}
          >
            <FaTimes />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav prev"
              onClick={goToPreviousImage}
            >
              <FaChevronLeft />
            </button>
          )}

          <img
            src={images[selectedImage] || resolveImageUrl(product.image)}
            alt={product.name}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav next"
              onClick={goToNextImage}
            >
              <FaChevronRight />
            </button>
          )}

          {images.length > 1 && (
            <div className="lightbox-counter" onClick={(event) => event.stopPropagation()}>
              {selectedImage + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDetail;