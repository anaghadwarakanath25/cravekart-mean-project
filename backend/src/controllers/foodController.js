const Food = require('../models/Food');
const Restaurant = require('../models/Restaurant');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const filter = { isAvailable: true };
  if (req.query.restaurant) filter.restaurant = req.query.restaurant;
  if (req.query.veg === 'true') filter.isVeg = true;
  if (req.query.veg === 'false') filter.isVeg = false;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const foods = await Food.find(filter).populate('restaurant', 'name address.area rating isOpen').sort({ isPopular: -1, name: 1 }).limit(100);
  res.json({ success: true, count: foods.length, foods });
});

exports.getOne = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id).populate('restaurant', 'name rating deliveryFee isOpen');
  if (!food || !food.isAvailable) return res.status(404).json({ success: false, message: 'Food item not found or unavailable.' });
  res.json({ success: true, food });
});

exports.create = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.body.restaurant);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
  if (req.user.role !== 'admin' && restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You cannot add food to this restaurant.' });
  }
  const food = await Food.create(req.body);
  res.status(201).json({ success: true, food });
});

exports.update = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id).populate('restaurant');
  if (!food) return res.status(404).json({ success: false, message: 'Food item not found.' });
  if (req.user.role !== 'admin' && food.restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You cannot edit this food item.' });
  }
  const allowed = ['name', 'description', 'price', 'image', 'category', 'isVeg', 'isAvailable', 'isPopular', 'customisations'];
  allowed.forEach(key => { if (req.body[key] !== undefined) food[key] = req.body[key]; });
  await food.save();
  res.json({ success: true, food });
});

exports.remove = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id).populate('restaurant');
  if (!food) return res.status(404).json({ success: false, message: 'Food item not found.' });
  if (req.user.role !== 'admin' && food.restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You cannot delete this food item.' });
  }
  await food.deleteOne();
  res.json({ success: true, message: 'Food item deleted.' });
});
