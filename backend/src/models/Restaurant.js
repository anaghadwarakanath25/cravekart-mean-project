const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  cuisine: [{ type: String, trim: true }],
  image: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  address: {
    line1: { type: String, default: '' },
    area: { type: String, default: '' },
    city: { type: String, default: 'Mysuru' },
    state: { type: String, default: 'Karnataka' },
    postalCode: { type: String, default: '' }
  },
  phone: { type: String, default: '' },
  openingTime: { type: String, default: '09:00' },
  closingTime: { type: String, default: '22:00' },
  deliveryFee: { type: Number, default: 25, min: 0 },
  estimatedDeliveryMinutes: { type: Number, default: 30, min: 1 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  isOpen: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

restaurantSchema.index({ name: 'text', cuisine: 'text', 'address.area': 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
