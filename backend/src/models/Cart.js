const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
  items: [{
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    selectedOptions: [{ groupName: String, optionName: String, additionalPrice: Number }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
