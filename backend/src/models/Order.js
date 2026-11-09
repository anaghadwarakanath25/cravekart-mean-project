const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  items: [{
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    selectedOptions: [{ groupName: String, optionName: String, additionalPrice: Number }]
  }],
  deliveryAddress: {
    recipientName: String, phone: String, line1: String, landmark: String,
    area: String, city: String, state: String, postalCode: String
  },
  paymentMethod: { type: String, enum: ['COD', 'UPI', 'CARD'], default: 'COD' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true },
  tax: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  couponCode: { type: String, default: '' },
  status: {
    type: String,
    enum: ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'],
    default: 'placed'
  },
  notes: { type: String, default: '' },
  cancellationReason: { type: String, default: '' }
}, { timestamps: true });

orderSchema.pre('validate', function () {
  if (!this.orderNumber) {
    this.orderNumber = `CK${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
  }
});

module.exports = mongoose.model('Order', orderSchema);
