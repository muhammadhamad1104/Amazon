import { useState, useEffect, useRef, useCallback } from 'react';
import { productsAPI } from '../../api/api';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import Loader from '../../components/Loader/Loader';
import ProductFormModal from './ProductFormModal';
import { formatCategoryLabel } from '../../constants/productCategories';
import './ProductsManagement.css';

const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [productsToShow, setProductsToShow] = useState(10); // Show 10 products initially
  const observer = useRef();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.subcategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
      setProductsToShow(10); // Reset to initial count when filtering
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  // Lazy loading effect
  useEffect(() => {
    const loadMoreProducts = () => {
      if (productsToShow > filteredProducts.length) {
        setDisplayedProducts(filteredProducts);
        setLoadingMore(false);
      } else if (productsToShow > displayedProducts.length) {
        // Show loading when fetching more products
        setLoadingMore(true);
        setTimeout(() => {
          setDisplayedProducts(filteredProducts.slice(0, productsToShow));
          setLoadingMore(false);
        }, 500); // Small delay to show loader
      } else {
        setDisplayedProducts(filteredProducts.slice(0, productsToShow));
      }
    };
    loadMoreProducts();
  }, [filteredProducts, productsToShow]);

  // Intersection observer for infinite scroll
  const lastProductRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayedProducts.length < filteredProducts.length) {
          setProductsToShow((prev) => prev + 10);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMore, displayedProducts.length, filteredProducts.length]
  );

  const fetchProducts = async () => {
    try {
      const { data } = await productsAPI.getAll({});
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await productsAPI.delete(productId);
      toast.success('Product deleted successfully');
      fetchProducts();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, productData);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(productData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
      throw error;
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="products-management">
      <div className="products-header">
        <div>
          <h1>Products Management</h1>
          <p className="products-subtitle">Manage your product catalog</p>
        </div>
        <button className="add-product-btn" onClick={handleAddProduct}>
          <FaPlus /> Add New Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products by name, category, subcategory, or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="products-count">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          {displayedProducts.length < filteredProducts.length && (
            <span className="showing-count"> (showing {displayedProducts.length})</span>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Rating</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedProducts.map((product, index) => {
              const isLastProduct = displayedProducts.length === index + 1;
              return (
                <tr 
                  key={product._id}
                  ref={isLastProduct ? lastProductRef : null}
                >
                  <td>
                    <img src={product.image} alt={product.name} className="product-image" />
                  </td>
                  <td>
                    <div className="product-name-cell">
                      <strong>{product.name}</strong>
                    </div>
                  </td>
                  <td>{product.brand}</td>
                  <td>
                    <span className="category-tag">{formatCategoryLabel(product.category, product.subcategory)}</span>
                  </td>
                  <td className="price-cell">${product.price.toFixed(2)}</td>
                  <td>
                    <span className={`stock-tag ${product.stock > 10 ? 'high' : product.stock > 0 ? 'low' : 'out'}`}>
                      {product.stock} units
                    </span>
                  </td>
                  <td>
                    <span className="rating-display">⭐ {product.rating.toFixed(1)}</span>
                    <span className="reviews-count">({product.numReviews})</span>
                  </td>
                  <td>
                    <span className={`featured-badge ${product.featured ? 'yes' : 'no'}`}>
                      {product.featured ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEditProduct(product)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => setDeleteConfirm(product)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loadingMore && (
          <div className="loading-more">
            <Loader />
            <p>Loading more products...</p>
          </div>
        )}

        {filteredProducts.length === 0 && !loading && (
          <div className="no-products">
            <p>No products found</p>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <ProductFormModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDeleteProduct(deleteConfirm._id)}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsManagement;
