import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import {
  getProductAvailableSizes,
  getSizeStockForProduct,
  normalizeSizeLabel
} from '../utils/sizeStock.js';

const router = express.Router();

const normalizeSize = (value) => normalizeSizeLabel(value);

const ensureCartItemSizes = (cart) => {
  let changed = false;

  cart.items.forEach((item) => {
    const normalizedSize = normalizeSize(item.size);
    if (!normalizedSize) {
      item.size = 'L';
      changed = true;
    }
  });

  return changed;
};

const findCartItemIndex = (cart, productId, size) => cart.items.findIndex((item) => (
  item.product.toString() === productId && item.size === size
));

const recalculateCartTotal = async (cart) => {
  await cart.populate('items.product');
  cart.totalPrice = cart.items.reduce((total, item) => {
    if (!item.product) return total;
    return total + (item.product.price * item.quantity);
  }, 0);
};

// Get user cart
router.get('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    if (ensureCartItemSizes(cart)) {
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
    const { productId, quantity, size } = req.body;

    const requestedQuantity = Math.floor(Number(quantity || 0));
    if (requestedQuantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const normalizedSize = normalizeSize(size);
    if (!normalizedSize) {
      return res.status(400).json({ message: 'Please select a valid size' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    ensureCartItemSizes(cart);

    const existingItemIndex = findCartItemIndex(cart, productId, normalizedSize);
    const existingQuantity = existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0;
    const nextQuantity = existingQuantity + requestedQuantity;

    const sizeStock = getSizeStockForProduct(product, normalizedSize);
    if (sizeStock <= 0) {
      const availableSizes = getProductAvailableSizes(product);
      if (availableSizes.length > 0) {
        return res.status(400).json({
          message: `Size ${normalizedSize} is not available. Available sizes: ${availableSizes.join(', ')}`
        });
      }

      return res.status(400).json({ message: `Size ${normalizedSize} is out of stock` });
    }

    if (sizeStock < nextQuantity) {
      return res.status(400).json({
        message: `Only ${sizeStock} item(s) available for size ${normalizedSize}`
      });
    }

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = nextQuantity;
    } else {
      cart.items.push({ product: productId, size: normalizedSize, quantity: requestedQuantity });
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
    const { productId, quantity, size } = req.body;

    const nextQuantity = Math.floor(Number(quantity || 0));
    const normalizedSize = normalizeSize(size);
    const hasExplicitSize = size !== undefined && size !== null && String(size).trim() !== '';

    if (hasExplicitSize && !normalizedSize) {
      return res.status(400).json({ message: 'Please provide a valid size' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    ensureCartItemSizes(cart);

    const itemIndex = normalizedSize
      ? findCartItemIndex(cart, productId, normalizedSize)
      : cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    const itemSize = normalizeSize(cart.items[itemIndex].size) || 'L';

    if (nextQuantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const sizeStock = getSizeStockForProduct(product, itemSize);
      if (nextQuantity > sizeStock) {
        return res.status(400).json({
          message: `Only ${sizeStock} item(s) available for size ${itemSize}`
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
    const hasExplicitSize = Object.prototype.hasOwnProperty.call(req.query, 'size') && String(req.query.size).trim() !== '';

    if (hasExplicitSize && !normalizedSize) {
      return res.status(400).json({ message: 'Please provide a valid size' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    ensureCartItemSizes(cart);

    cart.items = cart.items.filter((item) => {
      const isSameProduct = item.product.toString() === req.params.productId;
      if (!isSameProduct) return true;
      if (!normalizedSize) return false;
      return item.size !== normalizedSize;
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
