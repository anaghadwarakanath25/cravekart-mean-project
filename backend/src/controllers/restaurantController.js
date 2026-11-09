const Restaurant = require('../models/Restaurant');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const filter = { isActive: true, isApproved: true };
  if (req.query.search) filter.$text = { $search: req.query.search };
  if (req.query.area) filter['address.area'] = new RegExp(req.query.area, 'i');
  if (req.query.open === 'true') filter.isOpen = true;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const [restaurants, total] = await Promise.all([
    Restaurant.find(filter).sort({ rating: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Restaurant.countDocuments(filter)
  ]);
  res.json({ success: true, count: restaurants.length, total, page, pages: Math.ceil(total / limit), restaurants });
});

exports.getOne = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isActive: true, isApproved: true });
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
  res.json({ success: true, restaurant });
});

exports.create = asyncHandler(async (req, res) => {
  const data = { ...req.body, owner: req.user.role === 'admin' && req.body.owner ? req.body.owner : req.user._id };
  const restaurant = await Restaurant.create(data);
  res.status(201).json({ success: true, restaurant });
});

exports.update = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
  if (req.user.role !== 'admin' && restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You cannot edit this restaurant.' });
  }
  const allowed = ['name', 'description', 'cuisine', 'image', 'coverImage', 'address', 'phone', 'openingTime', 'closingTime', 'deliveryFee', 'estimatedDeliveryMinutes', 'isOpen'];
  allowed.forEach(key => { if (req.body[key] !== undefined) restaurant[key] = req.body[key]; });
  await restaurant.save();
  res.json({ success: true, restaurant });
});

exports.approve = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, { isApproved: Boolean(req.body.isApproved) }, { new: true, runValidators: true });
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
  res.json({ success: true, restaurant });
});
