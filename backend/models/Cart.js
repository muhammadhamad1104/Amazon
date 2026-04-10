import mongoose from 'mongoose';
import { normalizeSizeLabel } from '../utils/sizeStock.js';

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    size: {
      type: String,
      required: true,
      default: 'L',
      trim: true,
      uppercase: true,
      minlength: 1,
      maxlength: 20,
      set: (value) => normalizeSizeLabel(value) || 'L'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  }],
  totalPrice: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Cart', cartSchema);
