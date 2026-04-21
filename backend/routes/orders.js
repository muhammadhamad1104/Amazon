import express from 'express';
import nodemailer from 'nodemailer';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import { getSmtpTransportConfig } from '../utils/smtpConfig.js';
import {
  DEFAULT_VARIANT_COLOR,
  getProductAvailableSizes,
  getSizeColorsForProduct,
  getSizePricingForProduct,
  isColorAvailableForProduct,
  normalizeColorLabel,
  normalizeSizeLabel
} from '../utils/sizeStock.js';

const router = express.Router();

const CANCEL_WINDOW_HOURS = 24;
const FIXED_SHIPPING_PRICE = 200;
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Received', 'Delivered', 'Cancelled'];
const NON_CANCELLABLE_STATUSES = new Set(['Shipped', 'Received', 'Delivered', 'Cancelled']);

const normalizeSize = (value) => normalizeSizeLabel(value);
const normalizeColor = (value) => normalizeColorLabel(value) || DEFAULT_VARIANT_COLOR;

const getDisplaySize = (value) => normalizeSize(value) || 'N/A';

const getDisplayColor = (value) => normalizeColorLabel(value) || DEFAULT_VARIANT_COLOR;

const hasMailConfig = () => (
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const createTransporter = () => nodemailer.createTransport(getSmtpTransportConfig());

const buildItemsHtml = (items = []) => items.map((item) => (
  `<li>${item.name} - Size: ${getDisplaySize(item.size)} - Color: ${getDisplayColor(item.color)} - Qty: ${item.quantity} - Rs ${Number(item.price || 0).toFixed(2)} each</li>`
)).join('');

const buildItemsText = (items = []) => items.map((item) => (
  `- ${item.name} | Size: ${getDisplaySize(item.size)} | Color: ${getDisplayColor(item.color)} | Qty: ${item.quantity} | Rs ${Number(item.price || 0).toFixed(2)} each`
)).join('\n');

const sendOrderPlacementNotifications = async ({ order, customerName, customerEmail }) => {
  if (!hasMailConfig() || !customerEmail) return;

  const receiverEmail = process.env.ORDER_ADMIN_EMAIL || process.env.CONTACT_RECEIVER_EMAIL || 'irfwardrobe@gmail.com';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const orderRef = order._id.toString().slice(-8).toUpperCase();
  const itemsHtml = buildItemsHtml(order.items);
  const itemsText = buildItemsText(order.items);

  const customerMail = {
    from: `IRFWARDROBE Orders <${fromEmail}>`,
    to: customerEmail,
    subject: `Order Confirmation #${orderRef}`,
    text: [
      `Assalam o Alaikum ${customerName || 'Customer'},`,
      '',
      `Your order #${orderRef} has been placed successfully.`,
      `Current status: ${order.status}`,
      '',
      'Items:',
      itemsText,
      '',
      `Shipping: Rs ${Number(order.shippingPrice || 0).toFixed(2)}`,
      `Total: Rs ${Number(order.totalPrice || 0).toFixed(2)}`,
      '',
      'Thank you for shopping with IRFWARDROBE.'
    ].join('\n'),
    html: `
      <h2>Order Confirmed</h2>
      <p>Assalam o Alaikum ${customerName || 'Customer'},</p>
      <p>Your order <strong>#${orderRef}</strong> has been placed successfully.</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Items:</strong></p>
      <ul>${itemsHtml}</ul>
      <p><strong>Shipping:</strong> Rs ${Number(order.shippingPrice || 0).toFixed(2)}</p>
      <p><strong>Total:</strong> Rs ${Number(order.totalPrice || 0).toFixed(2)}</p>
      <p>Thank you for shopping with IRFWARDROBE.</p>
    `
  };

  const adminMail = {
    from: `IRFWARDROBE Orders <${fromEmail}>`,
    to: receiverEmail,
    subject: `New Order Placed #${orderRef}`,
    text: [
      `A new order has been placed.`,
      `Order ID: #${orderRef}`,
      `Customer: ${customerName || 'N/A'} (${customerEmail})`,
      `Status: ${order.status}`,
      '',
      'Items:',
      itemsText,
      '',
      `Shipping: Rs ${Number(order.shippingPrice || 0).toFixed(2)}`,
      `Total: Rs ${Number(order.totalPrice || 0).toFixed(2)}`,
      '',
      'Please check this order in admin dashboard.'
    ].join('\n'),
    html: `
      <h2>New Order Placed</h2>
      <p><strong>Order ID:</strong> #${orderRef}</p>
      <p><strong>Customer:</strong> ${customerName || 'N/A'} (${customerEmail})</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Items:</strong></p>
      <ul>${itemsHtml}</ul>
      <p><strong>Shipping:</strong> Rs ${Number(order.shippingPrice || 0).toFixed(2)}</p>
      <p><strong>Total:</strong> Rs ${Number(order.totalPrice || 0).toFixed(2)}</p>
      <p>Please check this order in admin dashboard.</p>
    `
  };

  try {
    const transporter = createTransporter();
    await Promise.all([
      transporter.sendMail(customerMail),
      transporter.sendMail(adminMail)
    ]);
  } catch (emailError) {
    console.error('Order notification email failed:', emailError.message);
  }
};

// Create new order
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    const requestedItems = items.map((item) => ({
      product: item?.product,
      quantity: Math.floor(Number(item?.quantity || 0)),
      size: normalizeSize(item?.size),
      color: normalizeColorLabel(item?.color),
      image: item?.image,
      name: item?.name
    }));

    const invalidItem = requestedItems.find((item) => (
      !item.product || !item.size || !item.color || item.quantity <= 0
    ));

    if (invalidItem) {
      return res.status(400).json({ message: 'Each order item must include valid product, size, color, and quantity' });
    }

    const productIds = [...new Set(requestedItems.map((item) => item.product.toString()))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    for (const item of requestedItems) {
      const product = productMap.get(item.product.toString());
      if (!product) {
        return res.status(404).json({ message: 'One or more products are no longer available' });
      }

      const availableSizes = getProductAvailableSizes(product);
      if (availableSizes.length > 0 && !availableSizes.includes(item.size)) {
        return res.status(400).json({
          message: `Size ${item.size} is not available for ${product.name}. Available sizes: ${availableSizes.join(', ')}`
        });
      }

      if (!isColorAvailableForProduct(product, item.size, item.color)) {
        const availableColors = getSizeColorsForProduct(product, item.size);
        return res.status(400).json({
          message: availableColors.length > 0
            ? `Color ${item.color} is not available for ${product.name} size ${item.size}. Available colors: ${availableColors.join(', ')}`
            : `No colors are available for ${product.name} size ${item.size}`
        });
      }
    }

    const normalizedItems = requestedItems.map((item) => {
      const product = productMap.get(item.product.toString());
      const sizePricing = getSizePricingForProduct(product, item.size);

      return {
        product: product._id,
        name: product.name,
        price: Number(sizePricing.price || product.price || 0),
        originalPrice: Number(sizePricing.originalPrice || sizePricing.price || product.originalPrice || product.price || 0),
        quantity: item.quantity,
        image: item.image || product.image,
        size: item.size,
        color: normalizeColor(item.color)
      };
    });

    const itemsPrice = normalizedItems.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0);
    const taxPrice = 0;
    const shippingPrice = FIXED_SHIPPING_PRICE;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    const order = new Order({
      user: req.user._id,
      items: normalizedItems,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
      status: 'Pending'
    });

    const createdOrder = await order.save();

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], totalPrice: 0 }
    );

    await sendOrderPlacementNotifications({
      order: createdOrder,
      customerName: req.user.name,
      customerEmail: req.user.email
    });

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user orders
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders for admin
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (order) {
      if (order.user._id.toString() === req.user._id.toString() || req.user.isAdmin) {
        res.json(order);
      } else {
        res.status(403).json({ message: 'Not authorized to view this order' });
      }
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order to paid
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOwner = order.user.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status || 'Cleared',
      updateTime: req.body.update_time || new Date().toISOString(),
      emailAddress: req.body.email_address || req.user.email
    };

    if (order.status === 'Pending') {
      order.status = 'Processing';
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin status and payment update
router.put('/:id/admin-status', protect, admin, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;

    if (!status && !paymentStatus) {
      return res.status(400).json({ message: 'Provide status and/or paymentStatus to update order' });
    }

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    if (paymentStatus && !['Pending', 'Cleared'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status) {
      order.status = status;

      const receivedLike = status === 'Received' || status === 'Delivered';
      order.isDelivered = receivedLike;
      order.deliveredAt = receivedLike ? (order.deliveredAt || Date.now()) : undefined;
    }

    if (paymentStatus) {
      const paymentResultBase = order.paymentResult?.toObject?.() || order.paymentResult || {};

      if (paymentStatus === 'Cleared') {
        order.isPaid = true;
        order.paidAt = order.paidAt || Date.now();
        order.paymentResult = {
          ...paymentResultBase,
          status: 'Cleared',
          updateTime: new Date().toISOString()
        };
      } else {
        order.isPaid = false;
        order.paidAt = undefined;
        order.paymentResult = {
          ...paymentResultBase,
          status: 'Pending',
          updateTime: new Date().toISOString()
        };
      }
    }

    const updatedOrder = await order.save();
    const populatedOrder = await Order.findById(updatedOrder._id).populate('user', 'name email');
    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel order (within 24 hours)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (NON_CANCELLABLE_STATUSES.has(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order with status ${order.status}` });
    }

    const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();
    const cancelWindowMs = CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
    if (orderAgeMs > cancelWindowMs) {
      return res.status(400).json({
        message: `Cancellation window expired. Orders can only be cancelled within ${CANCEL_WINDOW_HOURS} hours.`
      });
    }

    order.status = 'Cancelled';
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
