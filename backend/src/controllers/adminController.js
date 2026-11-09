const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

exports.dashboard = asyncHandler(async (req, res) => {
  const [customers, restaurants, foods, orders, revenueResult, pendingRestaurants] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Restaurant.countDocuments(),
    Food.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Restaurant.countDocuments({ isApproved: false })
  ]);
  res.json({
    success: true,
    stats: {
      customers, restaurants, foods, orders,
      revenue: revenueResult[0]?.total || 0,
      pendingRestaurants
    }
  });
});

exports.users = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(300);
  res.json({ success: true, count: users.length, users });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const allowed = {};
  if (typeof req.body.isActive === 'boolean') allowed.isActive = req.body.isActive;
  if (['customer', 'restaurant', 'admin'].includes(req.body.role)) allowed.role = req.body.role;
  const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true }).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, user });
});
