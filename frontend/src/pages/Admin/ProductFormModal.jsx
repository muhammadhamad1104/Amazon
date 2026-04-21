import { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  PRODUCT_CATEGORY_OPTIONS,
  getSubcategoryOptions
} from '../../constants/productCategories';
import { resolveImageUrl } from '../../utils/media';
import {
  DEFAULT_SIZE_OPTIONS,
  normalizeColorList,
  normalizeSizeLabel,
  normalizeSizePricingMap,
  sortSizeKeys
} from '../../utils/sizeStock';
import './ProductFormModal.css';

const MAX_PRODUCT_IMAGES = 5;

const createInitialSizePricing = () => ({});

const createInitialSizeOptions = () => [...DEFAULT_SIZE_OPTIONS];

const createInitialImageUrls = (product = null) => {
  const normalizedImages = [...new Set([
    ...(Array.isArray(product?.images) ? product.images : []),
    product?.image
  ].map((image) => String(image || '').trim()).filter(Boolean))].slice(0, MAX_PRODUCT_IMAGES);

  return normalizedImages.length > 0 ? normalizedImages : [''];
};

const toEditableSizePricing = (product = null) => {
  const normalized = normalizeSizePricingMap(
    product?.sizePricing,
    product?.sizeStock,
    product?.price || 0,
    product?.originalPrice || product?.price || 0
  );

  return Object.entries(normalized).reduce((accumulator, [size, variant]) => {
    accumulator[size] = {
      colors: (variant.colors || []).join(', '),
      originalPrice: String(variant.originalPrice || 0),
      price: String(variant.price || 0)
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
    colors: '',
    originalPrice: String(fallbackOriginalPrice),
    price: String(fallbackPrice)
  };
};

const normalizeImageUrls = (urls = []) => {
  return [...new Set(
    urls
      .map((url) => String(url || '').trim())
      .filter(Boolean)
  )].slice(0, MAX_PRODUCT_IMAGES);
};

const ProductFormModal = ({ product, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    category: '',
    subcategory: '',
    sizePricing: createInitialSizePricing(),
    imageUrls: [''],
    featured: false
  });
  const [imageMode, setImageMode] = useState('url');
  const [imageFiles, setImageFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [sizeOptions, setSizeOptions] = useState(createInitialSizeOptions());
  const [newSizeInput, setNewSizeInput] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = PRODUCT_CATEGORY_OPTIONS;
  const subcategories = getSubcategoryOptions(formData.category);

  useEffect(() => {
    return () => {
      filePreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [filePreviews]);

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
        imageUrls: createInitialImageUrls(product),
        featured: product.featured || false
      });
      setSizeOptions(productSizeOptions);
    } else {
      setFormData({
        name: '',
        description: '',
        brand: '',
        category: '',
        subcategory: '',
        sizePricing: createInitialSizePricing(),
        imageUrls: [''],
        featured: false
      });
      setSizeOptions(createInitialSizeOptions());
    }

    setNewSizeInput('');
    setImageMode('url');
    setImageFiles([]);
    setFilePreviews([]);
  }, [product]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

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

  const clearSelectedImageFiles = () => {
    filePreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    setImageFiles([]);
    setFilePreviews([]);
  };

  const handleImageModeChange = (mode) => {
    setImageMode(mode);

    if (mode === 'url') {
      clearSelectedImageFiles();
    }
  };

  const handleImageFilesChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);

    if (nextFiles.length === 0) {
      clearSelectedImageFiles();
      return;
    }

    if (nextFiles.length > MAX_PRODUCT_IMAGES) {
      toast.error(`You can upload maximum ${MAX_PRODUCT_IMAGES} images`);
      return;
    }

    for (const file of nextFiles) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select valid image files only');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Each image must be 5MB or smaller');
        return;
      }
    }

    clearSelectedImageFiles();
    setImageFiles(nextFiles);
    setFilePreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleImageUrlChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.map((url, urlIndex) => (urlIndex === index ? value : url))
    }));
  };

  const addImageUrlField = () => {
    setFormData((prev) => {
      if (prev.imageUrls.length >= MAX_PRODUCT_IMAGES) {
        toast.error(`You can add maximum ${MAX_PRODUCT_IMAGES} image URLs`);
        return prev;
      }

      return {
        ...prev,
        imageUrls: [...prev.imageUrls, '']
      };
    });
  };

  const removeImageUrlField = (index) => {
    setFormData((prev) => {
      if (prev.imageUrls.length <= 1) {
        return {
          ...prev,
          imageUrls: ['']
        };
      }

      return {
        ...prev,
        imageUrls: prev.imageUrls.filter((_, urlIndex) => urlIndex !== index)
      };
    });
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
      if (field === 'colors') {
        normalizedValue = normalizeColorList(currentValue).join(', ');
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const activeSizes = sortSizeKeys(Object.keys(formData.sizePricing || {}));

    if (activeSizes.length === 0) {
      toast.error('Select at least one size and add colors for it');
      return;
    }

    const sizePricingPayload = {};

    for (const size of activeSizes) {
      const sizeVariant = formData.sizePricing?.[size] || {};
      const parsedColors = normalizeColorList(sizeVariant.colors || '');
      const parsedOriginalPrice = Number(sizeVariant.originalPrice || 0);
      const parsedNewPrice = Number(sizeVariant.price || 0);

      if (parsedColors.length === 0) {
        toast.error(`Please add at least one color for size ${size}`);
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
        colors: parsedColors,
        // Quantity is auto-derived from colors for backward compatibility.
        quantity: parsedColors.length,
        originalPrice: parsedOriginalPrice,
        price: parsedNewPrice
      };
    }

    const displayVariant = Object.values(sizePricingPayload).reduce((current, candidate) => (
      !current || candidate.price < current.price ? candidate : current
    ), null);

    const totalStock = Object.values(sizePricingPayload).reduce(
      (sum, variant) => sum + variant.colors.length,
      0
    );

    const normalizedImageUrls = normalizeImageUrls(formData.imageUrls || []);
    const selectedFilesCount = imageFiles.length;
    const requestedImageCount = normalizedImageUrls.length + selectedFilesCount;

    if (requestedImageCount === 0) {
      toast.error('Please add at least one product image');
      return;
    }

    if (requestedImageCount > MAX_PRODUCT_IMAGES) {
      toast.error(`Maximum ${MAX_PRODUCT_IMAGES} images are allowed`);
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('description', formData.description.trim());
    payload.append('brand', formData.brand.trim());
    payload.append('category', formData.category);
    payload.append('subcategory', formData.subcategory || '');
    payload.append('sizePricing', JSON.stringify(sizePricingPayload));
    payload.append('sizeStock', JSON.stringify(Object.fromEntries(
      Object.entries(sizePricingPayload).map(([size, variant]) => [size, variant.colors.length])
    )));
    payload.append('price', String(displayVariant?.price || 0));
    payload.append('originalPrice', String(displayVariant?.originalPrice || displayVariant?.price || 0));
    payload.append('stock', String(totalStock));
    payload.append('featured', String(Boolean(formData.featured)));
    payload.append('imageUrls', JSON.stringify(normalizedImageUrls));

    if (normalizedImageUrls.length > 0) {
      payload.append('imageUrl', normalizedImageUrls[0]);
    }

    imageFiles.forEach((file) => {
      payload.append('imageFiles', file);
    });

    setSaving(true);
    try {
      await onSave(payload);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const activeImageUrls = normalizeImageUrls(formData.imageUrls || []);
  const previewImages = filePreviews.length > 0
    ? filePreviews
    : activeImageUrls.map((url) => resolveImageUrl(url)).filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(event) => event.stopPropagation()}>
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
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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
                {subcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Sizes, Colors and Pricing *</label>
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
                      <small>Colors</small>
                      <input
                        type="text"
                        value={formData.sizePricing?.[size]?.colors || ''}
                        onChange={(event) => handleSizePricingChange(size, 'colors', event.target.value)}
                        onBlur={() => handleSizePricingBlur(size, 'colors')}
                        placeholder="Red, Green, Blue"
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
              Total colors across sizes: {selectedSizes.reduce(
                (sum, size) => sum + normalizeColorList(formData.sizePricing?.[size]?.colors || '').length,
                0
              )}
            </p>
          </div>

          <div className="form-field">
            <label>Product Images (max {MAX_PRODUCT_IMAGES}) *</label>
            <div className="image-mode-toggle">
              <label className="mode-option">
                <input
                  type="radio"
                  name="imageMode"
                  value="url"
                  checked={imageMode === 'url'}
                  onChange={() => handleImageModeChange('url')}
                />
                <span>Image URLs</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  name="imageMode"
                  value="file"
                  checked={imageMode === 'file'}
                  onChange={() => handleImageModeChange('file')}
                />
                <span>Upload Images</span>
              </label>
            </div>

            {imageMode === 'url' ? (
              <div className="image-url-list">
                {formData.imageUrls.map((url, index) => (
                  <div key={`image-url-${index}`} className="image-url-row">
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => handleImageUrlChange(index, event.target.value)}
                      placeholder={`https://example.com/image-${index + 1}.jpg`}
                    />
                    <button
                      type="button"
                      className="remove-image-url-btn"
                      onClick={() => removeImageUrlField(index)}
                      disabled={formData.imageUrls.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-image-url-btn"
                  onClick={addImageUrlField}
                  disabled={formData.imageUrls.length >= MAX_PRODUCT_IMAGES}
                >
                  Add Image URL
                </button>
              </div>
            ) : (
              <input
                type="file"
                id="imageFiles"
                name="imageFiles"
                accept="image/*"
                multiple
                onChange={handleImageFilesChange}
              />
            )}

            {previewImages.length > 0 && (
              <div className="image-preview-grid">
                {previewImages.map((image, index) => (
                  <img
                    key={`preview-${index}`}
                    src={image}
                    alt={`Preview ${index + 1}`}
                  />
                ))}
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