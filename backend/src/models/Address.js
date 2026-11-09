const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label: { type: String, default: 'Home' },
  recipientName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  landmark: { type: String, default: '' },
  area: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema);
