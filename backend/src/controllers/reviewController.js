const Review = require('../models/Review');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const { orderId, rating, comment = '' } = req.body;
  const order = await Order.findOne({ _id: orderId, customer: req.user._id, status: 'delivered' });
  if (!order) return res.status(400).json({ success: false, message: 'Only delivered orders can be reviewed.' });
  const review = await Review.create({
    customer: req.user._id, restaurant: order.restaurant, order: order._id, rating, comment
  });
  res.status(201).json({ success: true, review });
});

exports.restaurantReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ restaurant: req.params.restaurantId })
    .populate('customer', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: reviews.length, reviews });
});
