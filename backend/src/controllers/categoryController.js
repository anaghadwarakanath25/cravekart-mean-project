const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, count: categories.length, categories });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, slug, image = '' } = req.body;
  if (!name || !slug) return res.status(400).json({ success: false, message: 'Category name and slug are required.' });
  const category = await Category.create({ name, slug, image });
  res.status(201).json({ success: true, category });
});

exports.update = asyncHandler(async (req, res) => {
  const allowed = ['name', 'slug', 'image', 'isActive'];
  const updates = {};
  allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
  const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  res.json({ success: true, category });
});

exports.remove = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  res.json({ success: true, message: 'Category deactivated.', category });
});
