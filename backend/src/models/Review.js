const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

reviewSchema.index({ customer: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
