import express from 'express';
import Product, { PRODUCT_SIZES } from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  calculateTotalStockFromSizeStock,
  normalizeSizeStockMap,
  normalizeStockQuantity
} from '../utils/sizeStock.js';
import {
  CATEGORY_NAMES,
  categoryNeedsSubcategory,
  getSubcategories
} from '../config/productCategories.js';

const router = express.Router();

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

const parseSizeStock = (value, fallbackStock = 0) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  let parsedValue = value;

  if (typeof value === 'string') {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    return null;
  }

  return normalizeSizeStockMap(parsedValue, fallbackStock);
};

const buildUploadedImageUrl = (req, file) => {
  if (!file) return '';
  return `/uploads/${file.filename}`;
};

const normalizeProductPayload = (req) => {
  const { body = {}, file } = req;
  const payload = {};

  if (body.name !== undefined) payload.name = toTrimmedString(body.name);
  if (body.description !== undefined) payload.description = toTrimmedString(body.description);
  if (body.brand !== undefined) payload.brand = toTrimmedString(body.brand);
  if (body.category !== undefined) payload.category = toTrimmedString(body.category);
  if (body.subcategory !== undefined) payload.subcategory = toTrimmedString(body.subcategory);

  const parsedPrice = parseNumber(body.price);
  if (parsedPrice !== undefined) payload.price = parsedPrice;

  const parsedStock = parseNumber(body.stock);
  let parsedSizeStock = parseSizeStock(body.sizeStock);

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

  if (parsedSizeStock) {
    payload.sizeStock = parsedSizeStock;
    payload.stock = calculateTotalStockFromSizeStock(parsedSizeStock);
  } else if (parsedStock !== undefined) {
    payload.sizeStock = normalizeSizeStockMap({}, parsedStock);
    payload.stock = normalizeStockQuantity(parsedStock);
  }

  const parsedFeatured = parseBoolean(body.featured);
  if (parsedFeatured !== undefined) payload.featured = parsedFeatured;

  const uploadedImageUrl = buildUploadedImageUrl(req, file);
  const imageUrlFromBody = toTrimmedString(body.imageUrl || body.image);

  if (uploadedImageUrl) {
    payload.image = uploadedImageUrl;
    payload.images = [uploadedImageUrl];
  } else if (imageUrlFromBody) {
    payload.image = imageUrlFromBody;
    payload.images = [imageUrlFromBody];
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
    const products = await Product.find({ featured: true }).limit(8);
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
router.post('/', protect, admin, upload.single('imageFile'), async (req, res) => {
  try {
    const payload = normalizeProductPayload(req);

    if (!payload.image) {
      return res.status(400).json({ message: 'Please provide either an image URL or upload an image file' });
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
    res.status(500).json({ message: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', protect, admin, upload.single('imageFile'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      const payload = normalizeProductPayload(req);

      const nextCategory = payload.category || product.category;
      const nextSubcategory = payload.subcategory !== undefined ? payload.subcategory : (product.subcategory || '');

      const categoryError = validateCategorySelection(nextCategory, nextSubcategory);
      if (categoryError) {
        return res.status(400).json({ message: categoryError });
      }

      if (payload.name !== undefined) product.name = payload.name;
      if (payload.description !== undefined) product.description = payload.description;
      if (payload.price !== undefined) product.price = payload.price;
      if (payload.brand !== undefined) product.brand = payload.brand;
      if (payload.stock !== undefined) product.stock = payload.stock;
      if (payload.sizeStock !== undefined) product.sizeStock = payload.sizeStock;
      if (payload.featured !== undefined) product.featured = payload.featured;
      if (payload.category !== undefined) product.category = payload.category;
      if (payload.subcategory !== undefined) product.subcategory = payload.subcategory;
      if (payload.image !== undefined) {
        product.image = payload.image;
        product.images = payload.images || [payload.image];
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
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
