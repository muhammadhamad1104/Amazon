import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  PRODUCT_CATEGORY_OPTIONS,
  getSubcategoryOptions
} from '../../constants/productCategories';
import './ProductFormModal.css';

const ProductFormModal = ({ product, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    brand: '',
    category: '',
    subcategory: '',
    stock: '',
    image: '',
    featured: false
  });
  const [imageMode, setImageMode] = useState('url');
  const [imageFile, setImageFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = PRODUCT_CATEGORY_OPTIONS;
  const subcategories = getSubcategoryOptions(formData.category);

  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        brand: product.brand || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        stock: product.stock || '',
        image: product.image || '',
        featured: product.featured || false
      });
      setImageMode('url');
      setImageFile(null);
      setFilePreview('');
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'category') {
      setFormData({
        ...formData,
        category: value,
        subcategory: ''
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleImageModeChange = (mode) => {
    setImageMode(mode);
    if (mode === 'url') {
      setImageFile(null);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview('');
      }
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview('');
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller');
      return;
    }

    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
    setImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasImageUrl = formData.image.trim().length > 0;
    const hasImageFile = Boolean(imageFile);
    const hasExistingImage = Boolean(product?.image);

    if (imageMode === 'url' && !hasImageUrl && !hasExistingImage) {
      toast.error('Please provide an image URL');
      return;
    }

    if (imageMode === 'file' && !hasImageFile && !hasExistingImage) {
      toast.error('Please upload an image file');
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('description', formData.description.trim());
    payload.append('price', formData.price);
    payload.append('brand', formData.brand.trim());
    payload.append('category', formData.category);
    payload.append('subcategory', formData.subcategory || '');
    payload.append('stock', formData.stock);
    payload.append('featured', String(Boolean(formData.featured)));

    if (imageMode === 'url' && hasImageUrl) {
      payload.append('imageUrl', formData.image.trim());
    }

    if (imageMode === 'file' && hasImageFile) {
      payload.append('imageFile', imageFile);
    }

    setSaving(true);
    try {
      await onSave(payload);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="name">Product Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="brand">Brand *</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                placeholder="Enter brand name"
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Enter product description"
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="price">Price ($) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-field">
              <label htmlFor="stock">Stock Quantity *</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-field">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="subcategory">Subcategory {subcategories.length > 0 ? '*' : '(optional)'}</label>
              <select
                id="subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                required={subcategories.length > 0}
                disabled={!formData.category || subcategories.length === 0}
              >
                <option value="">
                  {subcategories.length > 0 ? 'Select subcategory' : 'No subcategory required'}
                </option>
                {subcategories.map((subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Product Image *</label>
            <div className="image-mode-toggle">
              <label className="mode-option">
                <input
                  type="radio"
                  name="imageMode"
                  value="url"
                  checked={imageMode === 'url'}
                  onChange={() => handleImageModeChange('url')}
                />
                <span>Image URL</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  name="imageMode"
                  value="file"
                  checked={imageMode === 'file'}
                  onChange={() => handleImageModeChange('file')}
                />
                <span>Upload Image</span>
              </label>
            </div>

            {imageMode === 'url' ? (
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            ) : (
              <input
                type="file"
                id="imageFile"
                name="imageFile"
                accept="image/*"
                onChange={handleImageFileChange}
              />
            )}

            {(formData.image || filePreview || product?.image) && (
              <div className="image-preview">
                <img src={filePreview || formData.image || product?.image} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-field checkbox-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
              />
              <span>Mark as Featured Product</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
