import { Link } from 'react-router-dom';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { resolveImageUrl } from '../../utils/media';
import PriceDisplay from '../PriceDisplay/PriceDisplay';
import './ProductCard.css';

const ProductCard = ({ product }) => {
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

  return (
    <Link to={`/product/${product._id}`} className="product-card">
      <div className="product-image-container">
        <img src={resolveImageUrl(product.image)} alt={product.name} className="product-image" />
        {product.stock === 0 && <div className="out-of-stock-badge">Out of Stock</div>}
        {product.featured && <div className="featured-badge">Featured</div>}
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-brand">{product.brand}</p>
        
        <div className="product-rating">
          <div className="stars">{renderStars(product.rating)}</div>
          <span className="reviews-count">({product.numReviews})</span>
        </div>
        
        <div className="product-footer">
          <PriceDisplay product={product} showFromLabel />
          {product.stock > 0 && product.stock < 10 && (
            <span className="low-stock">Only {product.stock} left</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
