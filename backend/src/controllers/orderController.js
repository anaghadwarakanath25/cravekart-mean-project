const Cart = require('../models/Cart');
const Food = require('../models/Food');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');

const TAX_RATE = 0.05;

exports.createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress, paymentMethod = 'COD', couponCode = '', notes = '' } = req.body;
  if (!deliveryAddress || !deliveryAddress.recipientName || !deliveryAddress.phone || !deliveryAddress.line1 ||
      !deliveryAddress.area || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.postalCode) {
    return res.status(400).json({ success: false, message: 'Complete delivery address is required.' });
  }
  if (!['COD', 'UPI', 'CARD'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Unsupported payment method.' });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Your cart is empty.' });

  const restaurant = await Restaurant.findById(cart.restaurant);
  if (!restaurant || !restaurant.isActive || !restaurant.isApproved || !restaurant.isOpen) {
    return res.status(400).json({ success: false, message: 'This restaurant is currently unavailable.' });
  }

  const foodIds = cart.items.map(item => item.food);
  const foods = await Food.find({ _id: { $in: foodIds }, isAvailable: true });
  if (foods.length !== cart.items.length) {
    return res.status(400).json({ success: false, message: 'One or more cart items are no longer available. Refresh your cart.' });
  }

  const foodMap = new Map(foods.map(food => [food._id.toString(), food]));
  let subtotal = 0;
  const orderItems = cart.items.map(item => {
    const food = foodMap.get(item.food.toString());
    if (food.restaurant.toString() !== restaurant._id.toString()) {
      throw new Error('Cart contains an item from a different restaurant.');
    }
    subtotal += food.price * item.quantity;
    return {
      food: food._id,
      name: food.name,
      image: food.image,
      unitPrice: food.price,
      quantity: item.quantity
    };
  });

  const deliveryFee = Number(restaurant.deliveryFee || 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
    if (!coupon) return res.status(400).json({ success: false, message: 'Invalid or inactive coupon.' });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Coupon has expired.' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
    if (subtotal < coupon.minOrderValue) return res.status(400).json({ success: false, message: `Minimum order value for this coupon is ₹${coupon.minOrderValue}.` });
    discount = coupon.discountType === 'percentage'
      ? subtotal * coupon.discountValue / 100
      : coupon.discountValue;
    if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(Math.round(discount * 100) / 100, subtotal + tax + deliveryFee);
    appliedCoupon = coupon;
  }

  const total = Math.max(0, Math.round((subtotal + deliveryFee + tax - discount) * 100) / 100);
  const order = await Order.create({
    customer: req.user._id, restaurant: restaurant._id, items: orderItems, deliveryAddress,
    paymentMethod, paymentStatus: 'pending', subtotal, deliveryFee, tax, discount, total,
    couponCode: appliedCoupon ? appliedCoupon.code : '', notes
  });

  if (appliedCoupon) {
    await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: 1 } });
  }
  await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [], restaurant: null } });

  res.status(201).json({ success: true, message: 'Order placed successfully.', order });
});

exports.myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('restaurant', 'name image phone')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('restaurant', 'name image phone owner').populate('customer', 'name email phone');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  const ownerId = order.restaurant.owner?._id?.toString() || order.restaurant.owner?.toString();
  const allowed = req.user.role === 'admin' ||
    order.customer._id.toString() === req.user._id.toString() ||
    (req.user.role === 'restaurant' && ownerId === req.user._id.toString());
  if (!allowed) return res.status(403).json({ success: false, message: 'You cannot view this order.' });
  res.json({ success: true, order });
});

exports.restaurantOrders = asyncHandler(async (req, res) => {
  const restaurants = await Restaurant.find({ owner: req.user._id }).select('_id');
  const ids = restaurants.map(item => item._id);
  const orders = await Order.find({ restaurant: { $in: ids } })
    .populate('customer', 'name phone')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

exports.adminOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('customer', 'name email')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, count: orders.length, orders });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const allowedStatuses = ['accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'rejected'];
  const { status } = req.body;
  if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid order status.' });

  const order = await Order.findById(req.params.id).populate('restaurant', 'owner');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (req.user.role !== 'admin' && order.restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You cannot update this order.' });
  }
  if (['cancelled', 'rejected', 'delivered'].includes(order.status)) {
    return res.status(400).json({ success: false, message: `Cannot update an order that is ${order.status}.` });
  }
  order.status = status;
  await order.save();
  res.json({ success: true, message: 'Order status updated.', order });
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (!['placed', 'accepted'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'This order can no longer be cancelled.' });
  }
  order.status = 'cancelled';
  order.cancellationReason = req.body.reason || 'Cancelled by customer';
  await order.save();
  res.json({ success: true, message: 'Order cancelled.', order });
});
