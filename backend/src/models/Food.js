const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  customisations: [{
    groupName: { type: String },
    options: [{ name: String, additionalPrice: { type: Number, default: 0 } }]
  }]
}, { timestamps: true });

foodSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Food', foodSchema);
