const Address = require('../models/Address');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, count: addresses.length, addresses });
});

exports.create = asyncHandler(async (req, res) => {
  const data = { ...req.body, user: req.user._id };
  if (data.isDefault) await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
  const address = await Address.create(data);
  res.status(201).json({ success: true, address });
});

exports.update = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: 'Address not found.' });

  if (req.body.isDefault === true) {
    await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
  }

  const allowed = ['label', 'recipientName', 'phone', 'line1', 'landmark', 'area', 'city', 'state', 'postalCode', 'isDefault'];
  allowed.forEach(key => { if (req.body[key] !== undefined) address[key] = req.body[key]; });
  await address.save();
  res.json({ success: true, address });
});

exports.remove = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: 'Address not found.' });
  res.json({ success: true, message: 'Address deleted.' });
});
