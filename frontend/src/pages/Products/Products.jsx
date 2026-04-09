import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../../api/api';
import ProductCard from '../../components/ProductCard/ProductCard';
import Loader from '../../components/Loader/Loader';
import { toast } from 'react-toastify';
import { FaFilter } from 'react-icons/fa';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [productsToShow, setProductsToShow] = useState(6); // Show 6 products initially (2 rows of 3)
  const observer = useRef();

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'All',
    search: searchParams.get('search') || '',
    sort: 'newest',
    minPrice: '',
    maxPrice: ''
  });

  const categories = ['All', 'Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports', 'Toys', 'Beauty', 'Other'];

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  useEffect(() => {
    const loadMoreProducts = () => {
      if (productsToShow > products.length) {
        setDisplayedProducts(products);
        setLoadingMore(false);
      } else if (productsToShow > displayedProducts.length) {
        // Show loading when fetching more products
        setLoadingMore(true);
        setTimeout(() => {
          setDisplayedProducts(products.slice(0, productsToShow));
          setLoadingMore(false);
        }, 500); // Small delay to show loader
      } else {
        setDisplayedProducts(products.slice(0, productsToShow));
      }
    };
    loadMoreProducts();
  }, [products, productsToShow]);

  const lastProductRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayedProducts.length < products.length) {
          setProductsToShow((prev) => prev + 6);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMore, displayedProducts.length, products.length]
  );

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category !== 'All') params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.sort) params.sort = filters.sort;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      const { data } = await productsAPI.getAll(params);
      setProducts(data);
      setProductsToShow(6); // Reset to initial count when filters change
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      category: 'All',
      search: '',
      sort: 'newest',
      minPrice: '',
      maxPrice: ''
    });
    setSearchParams({});
    setProductsToShow(6); // Reset to initial count
  };

  return (
    <div className="products-page">
      {/* Hero Header */}
      <div className="products-page-header">
        <h1 className="products-page-title">Our Products</h1>
        <p className="products-page-subtitle">Discover amazing products from our collection</p>
      </div>

      <div className="products-container">
        {/* Filters Sidebar */}
        <aside className={`filters-sidebar ${showFilters ? 'show' : ''}`}>
          <div className="filters-header">
            <h3>Filters</h3>
            <button 
              className="close-filters"
              onClick={() => setShowFilters(false)}
            >
              ✕
            </button>
          </div>

          <div className="filter-group">
            <h4>Category</h4>
            <select 
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <h4>Sort By</h4>
            <select 
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          <div className="filter-group">
            <h4>Price Range</h4>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="price-input"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="price-input"
              />
            </div>
          </div>

          <button onClick={resetFilters} className="reset-btn">
            Reset Filters
          </button>
        </aside>

        {/* Products Grid */}
        <div className="products-content">
          <div className="products-header">
            <h1>Products</h1>
            <button 
              className="toggle-filters-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter /> Filters
            </button>
          </div>

          {filters.search && (
            <p className="search-info">
              Showing results for: <strong>{filters.search}</strong>
            </p>
          )}

          <p className="results-count">
            {products.length} {products.length === 1 ? 'product' : 'products'} found
          </p>

          {loading ? (
            <Loader />
          ) : products.length === 0 ? (
            <div className="no-products">
              <p>No products found</p>
              <button onClick={resetFilters} className="btn-primary">
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {displayedProducts.map((product, index) => {
                  if (displayedProducts.length === index + 1) {
                    return (
                      <div ref={lastProductRef} key={product._id}>
                        <ProductCard product={product} />
                      </div>
                    );
                  } else {
                    return <ProductCard key={product._id} product={product} />;
                  }
                })}
              </div>
              {loadingMore && (
                <div className="loading-more">
                  <Loader />
                  <p>Loading more products...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
