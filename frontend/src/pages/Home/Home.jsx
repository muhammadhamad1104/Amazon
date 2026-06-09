import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { productsAPI } from '../../api/api';
import ProductCard from '../../components/ProductCard/ProductCard';
import Loader from '../../components/Loader/Loader';
import CategorySidebar from '../../components/CategorySidebar/CategorySidebar';
import AdTicker from '../../components/AdTicker/AdTicker';
import { toast } from 'react-toastify';
import './Home.css';

const CATEGORY_DETAILS = {
  "Women's Unstitched Collection": {
    title: "Women's Unstitched Collection",
    description: "Step into the season with our premium unstitched fabrics, designed to turn heads and made to last."
  },
  "Kids wear": {
    title: "Kids Wear",
    description: "Bright, comfortable, and playful outfits designed for your little ones' active days."
  },
  "Thrifted pre-loved shoes": {
    title: "Thrifted Pre-Loved Shoes",
    description: "Step sustainably and stylishly in our curated collection of premium pre-loved shoes."
  },
  "Accessories": {
    title: "Accessories",
    description: "The perfect finishing touches to elevate any look, from statement bags to elegant jewelry."
  },
  "Beauty": {
    title: "Beauty & Cosmetics",
    description: "Reveal your natural radiance with our carefully selected beauty and skincare essentials."
  }
};

const CategoryScrollRow = ({ title, description, products }) => {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.8;

      if (direction === 'left') {
        if (scrollLeft <= 5) {
          // Loop around to end
          scrollContainerRef.current.scrollTo({
            left: scrollWidth - clientWidth,
            behavior: 'smooth'
          });
        } else {
          scrollContainerRef.current.scrollTo({
            left: scrollLeft - scrollAmount,
            behavior: 'smooth'
          });
        }
      } else {
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          // Loop around to start
          scrollContainerRef.current.scrollTo({
            left: 0,
            behavior: 'smooth'
          });
        } else {
          scrollContainerRef.current.scrollTo({
            left: scrollLeft + scrollAmount,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  return (
    <div className="category-scroll-section">
      <div className="category-header-block">
        <h2 className="category-section-title">{title}</h2>
        {description && <p className="category-section-description">{description}</p>}
      </div>

      <div className="scroll-wrapper">
        <button
          className="scroll-arrow-btn scroll-arrow-left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          &#8249;
        </button>

        <div className="category-scroll-container" ref={scrollContainerRef}>
          {products.map((product) => (
            <div key={product._id} className="scroll-product-card-wrapper">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          className="scroll-arrow-btn scroll-arrow-right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          &#8250;
        </button>
      </div>
    </div>
  );
};

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const { data } = await productsAPI.getFeatured();
        setFeaturedProducts(data);
      } catch (error) {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Group products by top-level category
  const categoriesWithProducts = Object.keys(CATEGORY_DETAILS).map((catName) => {
    const products = featuredProducts.filter((p) => p.category === catName);
    return {
      name: catName,
      details: CATEGORY_DETAILS[catName],
      products
    };
  }).filter((item) => item.products.length > 0);

  return (
    <div className="home">
      {/* Main Content Area with Sidebar and Ad */}
      <section className="home-top-section">
        <div className="home-container">
          <div className="sidebar-section">
            <CategorySidebar />
          </div>

          <div className="ad-section">
            <AdTicker />
          </div>
        </div>
      </section>

      {/* Featured Products by Category */}
      <section className="featured-section">
        <div className="container">
          {loading ? (
            <Loader />
          ) : categoriesWithProducts.length > 0 ? (
            categoriesWithProducts.map((item) => (
              <CategoryScrollRow
                key={item.name}
                title={item.details.title}
                description={item.details.description}
                products={item.products}
              />
            ))
          ) : (
            <div className="no-products-found">
              <p>No featured products available at the moment.</p>
            </div>
          )}

          <div className="view-all-container">
            <Link to="/products" className="view-all-btn">View All Products</Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">🚚</span>
              <h3>Flat Shipping</h3>
              <p>PKR 200 shipping on every order</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔒</span>
              <h3>Secure Payment</h3>
              <p>100% secure transactions</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">↩️</span>
              <h3>Easy Returns</h3>
              <p>30-day return policy</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🎧</span>
              <h3>24/7 Support</h3>
              <p>Dedicated customer service</p>
            </div>
          </div>
        </div>
      </section>

      <a
        className="whatsapp-float-btn"
        href="https://wa.me/923473941140"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <FaWhatsapp aria-hidden="true" />
      </a>
    </div>
  );
};

export default Home;
