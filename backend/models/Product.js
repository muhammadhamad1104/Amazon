import mongoose from 'mongoose';
import { CATEGORY_NAMES, isValidSubcategory } from '../config/productCategories.js';

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

export default mongoose.model('Product', productSchema);
