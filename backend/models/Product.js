import mongoose from 'mongoose';
import { CATEGORY_NAMES, isValidSubcategory } from '../config/productCategories.js';
import {
  DEFAULT_PRODUCT_SIZE_OPTIONS,
  deriveSizeStockFromSizePricing,
  calculateTotalStockFromSizeStock,
  normalizeSizePricingMap,
  selectDisplayPricingFromSizePricing,
  normalizeSizeStockMap,
  normalizeStockQuantity
} from '../utils/sizeStock.js';

export const PRODUCT_SIZES = DEFAULT_PRODUCT_SIZE_OPTIONS;

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  category: {
    type: String,
    required: true,
    enum: CATEGORY_NAMES
  },
  subcategory: {
    type: String,
    default: '',
    trim: true,
    validate: {
      validator: function(subcategory) {
        return isValidSubcategory(this.category, (subcategory || '').trim());
      },
      message: 'Invalid subcategory for selected category'
    }
  },
  brand: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  images: [String],
  sizePricing: {
    type: Map,
    of: new mongoose.Schema({
      quantity: {
        type: Number,
        min: 0,
        set: normalizeStockQuantity
      },
      price: {
        type: Number,
        min: 0
      },
      originalPrice: {
        type: Number,
        min: 0
      }
    }, { _id: false }),
    default: () => ({})
  },
  sizeStock: {
    type: Map,
    of: {
      type: Number,
      min: 0,
      set: normalizeStockQuantity
    },
    default: () => ({})
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    rating: Number,
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

productSchema.pre('validate', function(next) {
  const normalizedSizePricing = normalizeSizePricingMap(
    this.sizePricing,
    this.sizeStock,
    this.price,
    this.originalPrice
  );

  this.sizePricing = normalizedSizePricing;

  const derivedSizeStock = deriveSizeStockFromSizePricing(normalizedSizePricing);
  const normalizedSizeStock = normalizeSizeStockMap(derivedSizeStock, this.stock);

  const displayPricing = selectDisplayPricingFromSizePricing(
    normalizedSizePricing,
    this.price,
    this.originalPrice
  );

  this.sizeStock = normalizedSizeStock;
  this.stock = calculateTotalStockFromSizeStock(normalizedSizeStock);
  this.price = displayPricing.price;
  this.originalPrice = displayPricing.originalPrice;

  next();
});

export default mongoose.model('Product', productSchema);
