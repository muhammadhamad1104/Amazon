import express from 'express';
import Product, { PRODUCT_SIZES } from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  calculateTotalStockFromSizeStock,
  calculateTotalStockFromSizePricing,
  deriveSizeStockFromSizePricing,
  normalizeSizePricingMap,
  normalizeSizeStockMap,
  normalizeStockQuantity,
  selectDisplayPricingFromSizePricing
} from '../utils/sizeStock.js';
import {
  CATEGORY_NAMES,
  categoryNeedsSubcategory,
  getSubcategories
} from '../config/productCategories.js';

const router = express.Router();
const MAX_PRODUCT_IMAGES = 10;

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return undefined;
};

const parseJsonValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return value;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return value;
  }
};

const parseSizeStock = (value, fallbackStock = 0) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = parseJsonValue(value);

  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    return null;
  }

  return normalizeSizeStockMap(parsedValue, fallbackStock);
};

const parseSizePricing = (value, fallbackSizeStock = {}, fallbackPrice = 0, fallbackOriginalPrice = 0) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = parseJsonValue(value);

  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    return null;
  }

  return normalizeSizePricingMap(
    parsedValue,
    fallbackSizeStock,
    fallbackPrice,
    fallbackOriginalPrice
  );
};

const getUploadedFiles = (req) => {
  const uploaded = [];

  if (Array.isArray(req.files)) {
    uploaded.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((fileGroup) => {
      if (Array.isArray(fileGroup)) {
        uploaded.push(...fileGroup);
      }
    });
  }

  if (req.file) {
    uploaded.push(req.file);
  }

  return uploaded;
};

const buildUploadedImageUrls = (req) => {
  return getUploadedFiles(req)
    .map((file) => (file?.filename ? `/uploads/${file.filename}` : ''))
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_IMAGES);
};

const normalizeUniqueImages = (images = []) => {
  return [...new Set(
    images
      .map((image) => toTrimmedString(image))
      .filter(Boolean)
  )].slice(0, MAX_PRODUCT_IMAGES);
};

const parseImageUrls = (value) => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const parsedImages = [];

  rawValues.forEach((rawValue) => {
    const parsedValue = parseJsonValue(rawValue);

    if (Array.isArray(parsedValue)) {
      parsedImages.push(...parsedValue);
      return;
    }

    const normalizedValue = toTrimmedString(parsedValue);
    if (normalizedValue) {
      parsedImages.push(normalizedValue);
    }
  });

  return normalizeUniqueImages(parsedImages);
};

const parseImageFileIds = (value) => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const parsedValue = parseJsonValue(value);
  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .map((entry) => toTrimmedString(entry))
    .filter(Boolean);
};

const parseImageOrder = (value) => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const parsedValue = parseJsonValue(value);
  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }

      const type = toTrimmedString(entry.type).toLowerCase();
      const imageValue = toTrimmedString(entry.value);

      if ((type !== 'url' && type !== 'file') || !imageValue) {
        return null;
      }

      return { type, value: imageValue };
    })
    .filter(Boolean);
};

const buildOrderedImages = ({
  imageOrder = [],
  uploadedImageUrls = [],
  imageFileIds = [],
  imageUrlsFromBody = [],
  imageUrlFromBody = ''
}) => {
  const fileIdToUploadedUrl = new Map();

  imageFileIds.forEach((fileId, index) => {
    const uploadedUrl = uploadedImageUrls[index];
    if (fileId && uploadedUrl && !fileIdToUploadedUrl.has(fileId)) {
      fileIdToUploadedUrl.set(fileId, uploadedUrl);
    }
  });

  if (imageOrder.length > 0) {
    const consumedUploadedUrls = new Set();

    const orderedImages = imageOrder.reduce((accumulator, imageEntry) => {
      if (imageEntry.type === 'url') {
        accumulator.push(imageEntry.value);
        return accumulator;
      }

      const uploadedUrl = fileIdToUploadedUrl.get(imageEntry.value);
      if (uploadedUrl) {
        consumedUploadedUrls.add(uploadedUrl);
        accumulator.push(uploadedUrl);
      }

      return accumulator;
    }, []);

    const remainingUploadedImages = uploadedImageUrls.filter((uploadedUrl) => !consumedUploadedUrls.has(uploadedUrl));

    return normalizeUniqueImages([
      ...orderedImages,
      ...remainingUploadedImages
    ]);
  }

  return normalizeUniqueImages([
    ...imageUrlsFromBody,
    imageUrlFromBody,
    ...uploadedImageUrls
  ]);
};

const getUploadErrorMessage = (error) => {
  if (error?.name !== 'MulterError') {
    return '';
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return 'Each image must be 5MB or smaller';
  }

  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return `You can upload maximum ${MAX_PRODUCT_IMAGES} images`;
  }

  return error.message || 'Image upload failed';
};

const normalizeProductPayload = (req, existingProduct = null) => {
  const { body = {} } = req;
  const payload = {};

  if (body.name !== undefined) payload.name = toTrimmedString(body.name);
  if (body.description !== undefined) payload.description = toTrimmedString(body.description);
  if (body.brand !== undefined) payload.brand = toTrimmedString(body.brand);
  if (body.category !== undefined) payload.category = toTrimmedString(body.category);
  if (body.subcategory !== undefined) payload.subcategory = toTrimmedString(body.subcategory);

  const parsedPrice = parseNumber(body.price);
  if (parsedPrice !== undefined) payload.price = parsedPrice;

  const parsedOriginalPrice = parseNumber(body.originalPrice);
  if (parsedOriginalPrice !== undefined) payload.originalPrice = parsedOriginalPrice;

  const parsedStock = parseNumber(body.stock);
  let parsedSizeStock = parseSizeStock(body.sizeStock);
  let parsedSizePricing = parseSizePricing(
    body.sizePricing,
    parsedSizeStock || {},
    parsedPrice,
    parsedOriginalPrice ?? parsedPrice
  );

  if (!parsedSizeStock) {
    const hasSizeStockFields = PRODUCT_SIZES.some((size) => (
      body[`sizeStock${size}`] !== undefined || body[`size${size}`] !== undefined
    ));

    if (hasSizeStockFields) {
      const sizeStockFromFields = PRODUCT_SIZES.reduce((accumulator, size) => {
        accumulator[size] = body[`sizeStock${size}`] ?? body[`size${size}`] ?? 0;
        return accumulator;
      }, {});
      parsedSizeStock = normalizeSizeStockMap(sizeStockFromFields, parsedStock);
    }
  }

  if (!parsedSizePricing && parsedSizeStock) {
    parsedSizePricing = normalizeSizePricingMap(
      {},
      parsedSizeStock,
      parsedPrice,
      parsedOriginalPrice ?? parsedPrice
    );
  }

  if (parsedSizePricing && Object.keys(parsedSizePricing).length > 0) {
    payload.sizePricing = parsedSizePricing;
    payload.sizeStock = deriveSizeStockFromSizePricing(parsedSizePricing);
    payload.stock = calculateTotalStockFromSizePricing(parsedSizePricing);

    const displayPricing = selectDisplayPricingFromSizePricing(
      parsedSizePricing,
      parsedPrice,
      parsedOriginalPrice ?? parsedPrice
    );

    payload.price = displayPricing.price;
    payload.originalPrice = displayPricing.originalPrice;
  } else if (parsedSizeStock) {
    payload.sizeStock = parsedSizeStock;
    payload.stock = calculateTotalStockFromSizeStock(parsedSizeStock);

    if (parsedPrice !== undefined) {
      payload.price = parsedPrice;
      payload.originalPrice = parsedOriginalPrice ?? parsedPrice;
    }
  } else if (parsedStock !== undefined) {
    payload.sizeStock = normalizeSizeStockMap({}, parsedStock);
    payload.stock = normalizeStockQuantity(parsedStock);

    if (parsedPrice !== undefined) {
      payload.price = parsedPrice;
      payload.originalPrice = parsedOriginalPrice ?? parsedPrice;
    }
  } else {
    if (parsedPrice !== undefined) {
      payload.price = parsedPrice;
    }

    if (parsedOriginalPrice !== undefined) {
      payload.originalPrice = parsedOriginalPrice;
    }
  }

  const parsedFeatured = parseBoolean(body.featured);
  if (parsedFeatured !== undefined) payload.featured = parsedFeatured;

  const forceSoldOut = parseBoolean(body.forceSoldOut);
  if (forceSoldOut === true) {
    if (payload.sizePricing && typeof payload.sizePricing === 'object') {
      payload.sizePricing = Object.entries(payload.sizePricing).reduce((accumulator, [size, variant]) => {
        accumulator[size] = {
          ...(variant || {}),
          quantity: 0
        };
        return accumulator;
      }, {});
    }

    payload.sizeStock = {};
    payload.stock = 0;
  }

  const uploadedImageUrls = buildUploadedImageUrls(req);
  const imageUrlFromBody = toTrimmedString(body.imageUrl || body.image);
  const imageUrlsFromBody = parseImageUrls(body.imageUrls);
  const imageFileIds = parseImageFileIds(body.imageFileIds);
  const imageOrder = parseImageOrder(body.imageOrder);
  const hasExplicitImageOrder = imageOrder.length > 0;

  const existingImages = normalizeUniqueImages([
    ...(Array.isArray(existingProduct?.images) ? existingProduct.images : []),
    existingProduct?.image
  ]);

  const submittedImages = buildOrderedImages({
    imageOrder,
    uploadedImageUrls,
    imageFileIds,
    imageUrlsFromBody,
    imageUrlFromBody
  });

  const keepExistingImages = parseBoolean(body.keepExistingImages);
  const shouldMergeExistingImages = Boolean(existingProduct)
    && !hasExplicitImageOrder
    && keepExistingImages !== false;

  const combinedImages = shouldMergeExistingImages
    ? normalizeUniqueImages([...existingImages, ...submittedImages])
    : submittedImages;

  if (combinedImages.length > 0) {
    payload.images = combinedImages;
    payload.image = combinedImages[0];
  } else if (existingImages.length > 0) {
    payload.images = existingImages;
    payload.image = existingImages[0];
  }

  return payload;
};

const validateCategorySelection = (category, subcategory = '') => {
  if (!category) return 'Category is required';

  if (!CATEGORY_NAMES.includes(category)) {
    return 'Invalid category selected';
  }

  const validSubcategories = getSubcategories(category);
  const normalizedSubcategory = (subcategory || '').trim();

  if (categoryNeedsSubcategory(category) && !normalizedSubcategory) {
    return `Subcategory is required for ${category}`;
  }

  if (!categoryNeedsSubcategory(category) && normalizedSubcategory) {
    return `Subcategory is not allowed for ${category}`;
  }

  if (normalizedSubcategory && !validSubcategories.includes(normalizedSubcategory)) {
    return `Invalid subcategory for ${category}`;
  }

  return '';
};

const validateProductPayload = (payload, { isUpdate = false } = {}) => {
  const requiredStringFields = [
    ['name', 'Product name is required'],
    ['description', 'Product description is required'],
    ['brand', 'Brand is required'],
    ['category', 'Category is required']
  ];

  for (const [fieldName, errorMessage] of requiredStringFields) {
    const fieldValue = payload[fieldName];
    const hasField = fieldValue !== undefined;

    if (!isUpdate && !toTrimmedString(fieldValue)) {
      return errorMessage;
    }

    if (isUpdate && hasField && !toTrimmedString(fieldValue)) {
      return errorMessage;
    }
  }

  if (!isUpdate) {
    if (!payload.sizePricing || Object.keys(payload.sizePricing).length === 0) {
      return 'Please add at least one size variant with colors and pricing';
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      return 'Product price must be greater than zero';
    }

    if (!Number.isFinite(payload.originalPrice) || payload.originalPrice <= 0) {
      return 'Original price must be greater than zero';
    }
  }

  return '';
};

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, search, sort, minPrice, maxPrice } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (subcategory && subcategory !== 'All') {
      query.subcategory = subcategory;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOption = {};
    if (sort === 'price-asc') sortOption.price = 1;
    else if (sort === 'price-desc') sortOption.price = -1;
    else if (sort === 'rating') sortOption.rating = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;

    const products = await Product.find(query).sort(sortOption);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ featured: true });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create product (Admin only)
router.post('/', protect, admin, upload.fields([
  { name: 'imageFiles', maxCount: MAX_PRODUCT_IMAGES },
  { name: 'imageFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const payload = normalizeProductPayload(req);

    if (!payload.sizePricing && payload.sizeStock) {
      payload.sizePricing = normalizeSizePricingMap(
        {},
        payload.sizeStock,
        payload.price,
        payload.originalPrice || payload.price
      );
    }

    const payloadError = validateProductPayload(payload);
    if (payloadError) {
      return res.status(400).json({ message: payloadError });
    }

    if (!payload.image || !Array.isArray(payload.images) || payload.images.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one image URL or upload image file(s)' });
    }

    if (payload.images.length > MAX_PRODUCT_IMAGES) {
      return res.status(400).json({ message: `You can add maximum ${MAX_PRODUCT_IMAGES} images per product` });
    }

    const categoryError = validateCategorySelection(payload.category, payload.subcategory);
    if (categoryError) {
      return res.status(400).json({ message: categoryError });
    }

    if (!payload.subcategory) {
      payload.subcategory = '';
    }

    const product = new Product(payload);
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    const uploadError = getUploadErrorMessage(error);
    if (uploadError) {
      return res.status(400).json({ message: uploadError });
    }

    res.status(500).json({ message: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', protect, admin, upload.fields([
  { name: 'imageFiles', maxCount: MAX_PRODUCT_IMAGES },
  { name: 'imageFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      const payload = normalizeProductPayload(req, product);

      const payloadError = validateProductPayload(payload, { isUpdate: true });
      if (payloadError) {
        return res.status(400).json({ message: payloadError });
      }

      if (payload.sizeStock !== undefined && payload.sizePricing === undefined) {
        const fallbackPrice = payload.price !== undefined ? payload.price : product.price;
        const fallbackOriginalPrice = payload.originalPrice !== undefined
          ? payload.originalPrice
          : (product.originalPrice || fallbackPrice);

        payload.sizePricing = normalizeSizePricingMap(
          {},
          payload.sizeStock,
          fallbackPrice,
          fallbackOriginalPrice
        );
      }

      const nextCategory = payload.category || product.category;
      const nextSubcategory = payload.subcategory !== undefined ? payload.subcategory : (product.subcategory || '');

      const categoryError = validateCategorySelection(nextCategory, nextSubcategory);
      if (categoryError) {
        return res.status(400).json({ message: categoryError });
      }

      if (payload.name !== undefined) product.name = payload.name;
      if (payload.description !== undefined) product.description = payload.description;
      if (payload.price !== undefined) product.price = payload.price;
      if (payload.originalPrice !== undefined) product.originalPrice = payload.originalPrice;
      if (payload.brand !== undefined) product.brand = payload.brand;
      if (payload.stock !== undefined) product.stock = payload.stock;
      if (payload.sizeStock !== undefined) product.sizeStock = payload.sizeStock;
      if (payload.sizePricing !== undefined) product.sizePricing = payload.sizePricing;
      if (payload.featured !== undefined) product.featured = payload.featured;
      if (payload.category !== undefined) product.category = payload.category;
      if (payload.subcategory !== undefined) product.subcategory = payload.subcategory;
      if (payload.image !== undefined) {
        product.image = payload.image;
      }

      if (payload.images !== undefined) {
        if (payload.images.length > MAX_PRODUCT_IMAGES) {
          return res.status(400).json({ message: `You can add maximum ${MAX_PRODUCT_IMAGES} images per product` });
        }
        product.images = payload.images;
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    const uploadError = getUploadErrorMessage(error);
    if (uploadError) {
      return res.status(400).json({ message: uploadError });
    }

    res.status(500).json({ message: error.message });
  }
});

// Delete product (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add product review
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: 'Product already reviewed' });
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id
      };

      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

      await product.save();
      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
