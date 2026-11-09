const Coupon = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');

exports.validate = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code || !Number.isFinite(Number(subtotal)) || Number(subtotal) < 0) {
    return res.status(400).json({ success: false, message: 'Coupon code and valid subtotal are required.' });
  }
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Coupon has expired.' });
  if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
  if (Number(subtotal) < coupon.minOrderValue) return res.status(400).json({ success: false, message: `Minimum order value is ₹${coupon.minOrderValue}.` });
  let discount = coupon.discountType === 'percentage' ? Number(subtotal) * coupon.discountValue / 100 : coupon.discountValue;
  if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  res.json({ success: true, coupon: { code: coupon.code, description: coupon.description }, discount: Math.round(discount * 100) / 100 });
});

exports.create = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
});

exports.list = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, coupons });
});
