const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, default: null },
  minOrderValue: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 1000 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
