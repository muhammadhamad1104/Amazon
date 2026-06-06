import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import {
  DEFAULT_VARIANT_COLOR,
  getProductAvailableSizes,
  getSizePricingForProduct,
  getSizeColorsForProduct,
  isColorAvailableForProduct,
  normalizeColorLabel,
  normalizeSizeLabel,
  getColorStockForProduct
} from '../utils/sizeStock.js';

const router = express.Router();

const normalizeSize = (value) => normalizeSizeLabel(value);
const normalizeColor = (value) => normalizeColorLabel(value) || DEFAULT_VARIANT_COLOR;

const ensureCartItemVariants = (cart) => {
  let changed = false;

  cart.items.forEach((item) => {
    const normalizedSize = normalizeSize(item.size);
    if (!normalizedSize) {
      item.size = 'L';
      changed = true;
    }

    const normalizedColor = normalizeColor(item.color);
    if (!normalizedColor || item.color !== normalizedColor) {
      item.color = normalizedColor;
      changed = true;
    }
  });

  return changed;
};

const findCartItemIndex = (cart, productId, size, color) => cart.items.findIndex((item) => (
  item.product.toString() === productId &&
  item.size === size &&
  normalizeColor(item.color) === color
));

const validateSelectedVariant = (product, size, color) => {
  const normalizedSize = normalizeSize(size);
  if (!normalizedSize) {
    return 'Please select a valid size';
  }

  const availableSizes = getProductAvailableSizes(product);
  if (availableSizes.length > 0 && !availableSizes.includes(normalizedSize)) {
    return `Size ${normalizedSize} is not available. Available sizes: ${availableSizes.join(', ')}`;
  }

  const normalizedColor = normalizeColorLabel(color);
  if (!normalizedColor) {
    return 'Please select a valid color';
  }

  if (!isColorAvailableForProduct(product, normalizedSize, normalizedColor)) {
    const availableColors = getSizeColorsForProduct(product, normalizedSize);
    if (availableColors.length > 0) {
      return `Color ${normalizedColor} is not available for size ${normalizedSize}. Available colors: ${availableColors.join(', ')}`;
    }

    return `No colors are available for size ${normalizedSize}`;
  }

  return '';
};

const recalculateCartTotal = async (cart) => {
  await cart.populate('items.product');
  cart.totalPrice = cart.items.reduce((total, item) => {
    if (!item.product) return total;

    const sizePricing = getSizePricingForProduct(item.product, item.size);
    return total + ((sizePricing.price || 0) * item.quantity);
  }, 0);
};

// Get user cart
router.get('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const variantsNormalized = ensureCartItemVariants(cart);
    const previousTotal = Number(cart.totalPrice || 0);
    await recalculateCartTotal(cart);
    const totalChanged = Math.abs(previousTotal - Number(cart.totalPrice || 0)) > 0.0001;

    if (variantsNormalized || totalChanged) {
      await cart.save();
      await cart.populate('items.product');
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add item to cart
router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;

    const quantityInput = (
      quantity === undefined || quantity === null || String(quantity).trim() === ''
    ) ? 1 : quantity;
    const requestedQuantity = Math.floor(Number(quantityInput));
    if (requestedQuantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const normalizedSize = normalizeSize(size);
    if (!normalizedSize) {
      return res.status(400).json({ message: 'Please select a valid size' });
    }

    const normalizedColor = normalizeColorLabel(color);
    if (!normalizedColor) {
      return res.status(400).json({ message: 'Please select a valid color' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variantError = validateSelectedVariant(product, normalizedSize, normalizedColor);
    if (variantError) {
      return res.status(400).json({ message: variantError });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    ensureCartItemVariants(cart);

    const existingItemIndex = findCartItemIndex(cart, productId, normalizedSize, normalizedColor);
    const existingQuantity = existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0;
    const nextQuantity = existingQuantity + requestedQuantity;

    const availableStock = getColorStockForProduct(product, normalizedSize, normalizedColor);
    if (nextQuantity > availableStock) {
      return res.status(400).json({
        message: `Cannot add more items. Only ${availableStock} units of size ${normalizedSize} / color ${normalizedColor} are available in stock.`
      });
    }

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = nextQuantity;
    } else {
      cart.items.push({
        product: productId,
        size: normalizedSize,
        color: normalizeColor(normalizedColor),
        quantity: requestedQuantity
      });
    }

    await recalculateCartTotal(cart);

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update cart item quantity
router.put('/update', protect, async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;

    const nextQuantity = Math.floor(Number(quantity || 0));
    const normalizedSize = normalizeSize(size);
    const hasExplicitSize = size !== undefined && size !== null && String(size).trim() !== '';
    const normalizedColor = normalizeColorLabel(color);
    const hasExplicitColor = color !== undefined && color !== null && String(color).trim() !== '';

    if (hasExplicitSize && !normalizedSize) {
      return res.status(400).json({ message: 'Please provide a valid size' });
    }

    if (hasExplicitColor && !normalizedColor) {
      return res.status(400).json({ message: 'Please provide a valid color' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    ensureCartItemVariants(cart);

    const itemIndex = cart.items.findIndex((item) => {
      const isSameProduct = item.product.toString() === productId;
      if (!isSameProduct) return false;

      if (normalizedSize && item.size !== normalizedSize) return false;
      if (normalizedColor && normalizeColor(item.color) !== normalizeColor(normalizedColor)) return false;

      return true;
    });

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (nextQuantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const itemSize = cart.items[itemIndex].size;
      const itemColor = cart.items[itemIndex].color;
      const availableStock = getColorStockForProduct(product, itemSize, itemColor);
      if (nextQuantity > availableStock) {
        return res.status(400).json({
          message: `Only ${availableStock} units of size ${itemSize} / color ${itemColor} are available in stock.`
        });
      }

      cart.items[itemIndex].quantity = nextQuantity;
    }

    await recalculateCartTotal(cart);

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove item from cart
router.delete('/remove/:productId', protect, async (req, res) => {
  try {
    const normalizedSize = normalizeSize(req.query.size);
    const normalizedColor = normalizeColorLabel(req.query.color);
    const hasExplicitSize = Object.prototype.hasOwnProperty.call(req.query, 'size') && String(req.query.size).trim() !== '';
    const hasExplicitColor = Object.prototype.hasOwnProperty.call(req.query, 'color') && String(req.query.color).trim() !== '';

    if (hasExplicitSize && !normalizedSize) {
      return res.status(400).json({ message: 'Please provide a valid size' });
    }

    if (hasExplicitColor && !normalizedColor) {
      return res.status(400).json({ message: 'Please provide a valid color' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    ensureCartItemVariants(cart);

    cart.items = cart.items.filter((item) => {
      const isSameProduct = item.product.toString() === req.params.productId;
      if (!isSameProduct) return true;

      if (normalizedSize && item.size !== normalizedSize) return true;
      if (normalizedColor && normalizeColor(item.color) !== normalizeColor(normalizedColor)) return true;

      return false;
    });

    await recalculateCartTotal(cart);

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Clear cart
router.delete('/clear', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
