import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  PRODUCT_CATEGORY_OPTIONS,
  getSubcategoryOptions
} from '../../constants/productCategories';
import { resolveImageUrl } from '../../utils/media';
import {
  DEFAULT_SIZE_OPTIONS,
  normalizeSizeLabel,
  normalizeSizePricingMap,
  sortSizeKeys
} from '../../utils/sizeStock';
import './ProductFormModal.css';

const createInitialSizePricing = () => ({});

const createInitialSizeOptions = () => [...DEFAULT_SIZE_OPTIONS];

const toEditableSizePricing = (product = null) => {
  const normalized = normalizeSizePricingMap(
    product?.sizePricing,
    product?.sizeStock,
    product?.price || 0,
    product?.originalPrice || product?.price || 0
  );

  return Object.entries(normalized).reduce((accumulator, [size, quantity]) => {
    accumulator[size] = {
      quantity: String(quantity.quantity || 0),
      originalPrice: String(quantity.originalPrice || 0),
      price: String(quantity.price || 0)
    };
    return accumulator;
  }, {});
};

const getDefaultVariantPricing = (sizePricing = {}) => {
  const existingVariant = Object.values(sizePricing).find((variant) => (
    Number(variant?.price) > 0 || Number(variant?.originalPrice) > 0
  ));

  const fallbackPrice = existingVariant?.price || '';
  const fallbackOriginalPrice = existingVariant?.originalPrice || fallbackPrice || '';

  return {
    quantity: '1',
    originalPrice: String(fallbackOriginalPrice),
    price: String(fallbackPrice)
  };
};

const ProductFormModal = ({ product, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    category: '',
    subcategory: '',
    sizePricing: createInitialSizePricing(),
    image: '',
    featured: false
  });
  const [imageMode, setImageMode] = useState('url');
  const [imageFile, setImageFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [sizeOptions, setSizeOptions] = useState(createInitialSizeOptions());
  const [newSizeInput, setNewSizeInput] = useState('');
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
      const editableSizePricing = toEditableSizePricing(product);
      const productSizeOptions = sortSizeKeys([
        ...DEFAULT_SIZE_OPTIONS,
        ...Object.keys(editableSizePricing)
      ]);

      setFormData({
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        sizePricing: editableSizePricing,
        image: product.image || '',
        featured: product.featured || false
      });
      setSizeOptions(productSizeOptions);
      setNewSizeInput('');
      setImageMode('url');
      setImageFile(null);
      setFilePreview('');
    } else {
      setFormData({
        name: '',
        description: '',
        brand: '',
        category: '',
        subcategory: '',
        sizePricing: createInitialSizePricing(),
        image: '',
        featured: false
      });
      setSizeOptions(createInitialSizeOptions());
      setNewSizeInput('');
      setImageMode('url');
      setImageFile(null);
      setFilePreview('');
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'category') {
      setFormData((prev) => ({
        ...prev,
        category: value,
        subcategory: ''
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const selectedSizes = sortSizeKeys(Object.keys(formData.sizePricing || {}));

  const toggleSizeSelection = (size) => {
    const normalizedSize = normalizeSizeLabel(size);
    if (!normalizedSize) return;

    setFormData((prev) => {
      const nextSizePricing = { ...(prev.sizePricing || {}) };

      if (Object.prototype.hasOwnProperty.call(nextSizePricing, normalizedSize)) {
        delete nextSizePricing[normalizedSize];
      } else {
        nextSizePricing[normalizedSize] = getDefaultVariantPricing(prev.sizePricing || {});
      }

      return {
        ...prev,
        sizePricing: nextSizePricing
      };
    });
  };

  const handleAddCustomSize = () => {
    const normalizedSize = normalizeSizeLabel(newSizeInput);

    if (!normalizedSize) {
      toast.error('Please enter a valid size name');
      return;
    }

    setSizeOptions((prev) => sortSizeKeys([...prev, normalizedSize]));

    setFormData((prev) => ({
      ...prev,
      sizePricing: {
        ...(prev.sizePricing || {}),
        [normalizedSize]: prev.sizePricing?.[normalizedSize] || getDefaultVariantPricing(prev.sizePricing || {})
      }
    }));

    setNewSizeInput('');
  };

  const handleSizePricingChange = (size, field, value) => {
    const normalizedSize = normalizeSizeLabel(size);
    if (!normalizedSize) return;

    setFormData((prev) => ({
      ...prev,
      sizePricing: {
        ...prev.sizePricing,
        [normalizedSize]: {
          ...(prev.sizePricing?.[normalizedSize] || getDefaultVariantPricing(prev.sizePricing || {})),
          [field]: value
        }
      }
    }));
  };

  const handleSizePricingBlur = (size, field) => {
    const normalizedSize = normalizeSizeLabel(size);
    if (!normalizedSize) return;

    setFormData((prev) => {
      const currentVariant = prev.sizePricing?.[normalizedSize] || getDefaultVariantPricing(prev.sizePricing || {});
      const currentValue = currentVariant[field] ?? '';
      let normalizedValue = currentValue;

      if (field === 'quantity') {
        const parsedQuantity = Math.floor(Number(currentValue));
        normalizedValue = Number.isFinite(parsedQuantity) && parsedQuantity > 0
          ? String(parsedQuantity)
          : '1';
      } else {
        const parsedPrice = Number(currentValue);
        normalizedValue = Number.isFinite(parsedPrice) && parsedPrice > 0
          ? String(parsedPrice)
          : '';
      }

      return {
        ...prev,
        sizePricing: {
          ...prev.sizePricing,
          [normalizedSize]: {
            ...currentVariant,
            [field]: normalizedValue
          }
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const activeSizes = sortSizeKeys(Object.keys(formData.sizePricing || {}));

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

    if (activeSizes.length === 0) {
      toast.error('Select at least one size and set its quantity');
      return;
    }

    const sizePricingPayload = {};

    for (const size of activeSizes) {
      const sizeVariant = formData.sizePricing?.[size] || {};
      const parsedQuantity = Math.floor(Number(sizeVariant.quantity || 0));
      const parsedOriginalPrice = Number(sizeVariant.originalPrice || 0);
      const parsedNewPrice = Number(sizeVariant.price || 0);

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        toast.error(`Please enter a quantity greater than 0 for size ${size}`);
        return;
      }

      if (!Number.isFinite(parsedOriginalPrice) || parsedOriginalPrice <= 0) {
        toast.error(`Please enter a valid original price for size ${size}`);
        return;
      }

      if (!Number.isFinite(parsedNewPrice) || parsedNewPrice <= 0) {
        toast.error(`Please enter a valid new price for size ${size}`);
        return;
      }

      sizePricingPayload[size] = {
        quantity: parsedQuantity,
        originalPrice: parsedOriginalPrice,
        price: parsedNewPrice
      };
    }

    const totalStock = Object.values(sizePricingPayload).reduce(
      (sum, value) => sum + value.quantity,
      0
    );

    const displayVariant = Object.values(sizePricingPayload).reduce((current, candidate) => (
      !current || candidate.price < current.price ? candidate : current
    ), null);

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('description', formData.description.trim());
    payload.append('brand', formData.brand.trim());
    payload.append('category', formData.category);
    payload.append('subcategory', formData.subcategory || '');
    payload.append('sizePricing', JSON.stringify(sizePricingPayload));
    payload.append('sizeStock', JSON.stringify(Object.fromEntries(
      Object.entries(sizePricingPayload).map(([size, variant]) => [size, variant.quantity])
    )));
    payload.append('price', String(displayVariant?.price || 0));
    payload.append('originalPrice', String(displayVariant?.originalPrice || displayVariant?.price || 0));
    payload.append('stock', String(totalStock));
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
            <label>Sizes, Quantity and Pricing *</label>
            <div className="size-selector-grid">
              {sizeOptions.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    className={`size-toggle-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSizeSelection(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <div className="custom-size-row">
              <input
                type="text"
                value={newSizeInput}
                onChange={(event) => setNewSizeInput(event.target.value)}
                placeholder="Add custom size (e.g. 28 or 4 PIECE)"
              />
              <button type="button" className="add-size-btn" onClick={handleAddCustomSize}>
                Add Size
              </button>
            </div>

            {selectedSizes.length > 0 ? (
              <div className="size-stock-grid">
                {selectedSizes.map((size) => (
                  <div key={size} className="size-stock-field">
                    <span>{size}</span>
                    <label className="size-metric-group">
                      <small>Quantity</small>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.sizePricing?.[size]?.quantity || ''}
                        onChange={(event) => handleSizePricingChange(size, 'quantity', event.target.value)}
                        onBlur={() => handleSizePricingBlur(size, 'quantity')}
                        placeholder="Qty"
                        required
                      />
                    </label>
                    <label className="size-metric-group">
                      <small>Original Price</small>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sizePricing?.[size]?.originalPrice || ''}
                        onChange={(event) => handleSizePricingChange(size, 'originalPrice', event.target.value)}
                        onBlur={() => handleSizePricingBlur(size, 'originalPrice')}
                        placeholder="Old price"
                        required
                      />
                    </label>
                    <label className="size-metric-group">
                      <small>New Price</small>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sizePricing?.[size]?.price || ''}
                        onChange={(event) => handleSizePricingChange(size, 'price', event.target.value)}
                        onBlur={() => handleSizePricingBlur(size, 'price')}
                        placeholder="New price"
                        required
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="size-stock-empty">No size selected yet. Select one or more sizes above.</p>
            )}

            <p className="size-stock-total">
              Total stock: {selectedSizes.reduce(
                (sum, size) => sum + Math.max(0, Math.floor(Number(formData.sizePricing?.[size]?.quantity || 0))),
                0
              )}
            </p>
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
                <img src={resolveImageUrl(filePreview || formData.image || product?.image)} alt="Preview" />
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
