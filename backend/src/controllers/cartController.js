const Cart = require('../models/Cart');
const Food = require('../models/Food');
const asyncHandler = require('../utils/asyncHandler');

async function getPopulatedCart(userId) {
  return Cart.findOne({ user: userId }).populate('restaurant', 'name deliveryFee isOpen')
    .populate('items.food', 'name description price image isVeg isAvailable restaurant');
}

exports.getCart = asyncHandler(async (req, res) => {
  let cart = await getPopulatedCart(req.user._id);
  if (!cart) cart = { items: [], restaurant: null };
  res.json({ success: true, cart });
});

exports.addItem = asyncHandler(async (req, res) => {
  const { foodId, quantity = 1 } = req.body;
  const qty = Number(quantity);
  if (!foodId || !Number.isInteger(qty) || qty < 1 || qty > 20) {
    return res.status(400).json({ success: false, message: 'Provide a valid foodId and quantity between 1 and 20.' });
  }

  const food = await Food.findById(foodId);
  if (!food || !food.isAvailable) return res.status(404).json({ success: false, message: 'Food item is unavailable.' });

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, restaurant: food.restaurant, items: [] });

  if (cart.restaurant && cart.restaurant.toString() !== food.restaurant.toString()) {
    return res.status(409).json({ success: false, message: 'Your cart contains items from another restaurant. Clear the cart before adding this item.' });
  }
  cart.restaurant = food.restaurant;
  const existing = cart.items.find(item => item.food.toString() === foodId);
  if (existing) existing.quantity = Math.min(20, existing.quantity + qty);
  else cart.items.push({ food: foodId, quantity: qty });
  await cart.save();

  res.status(201).json({ success: true, message: 'Item added to cart.', cart: await getPopulatedCart(req.user._id) });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return res.status(400).json({ success: false, message: 'Quantity must be between 1 and 20.' });
  }
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
  const item = cart.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Cart item not found.' });
  item.quantity = quantity;
  await cart.save();
  res.json({ success: true, cart: await getPopulatedCart(req.user._id) });
});

exports.removeItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
  const item = cart.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Cart item not found.' });
  item.deleteOne();
  if (cart.items.length === 0) cart.restaurant = null;
  await cart.save();
  res.json({ success: true, cart: await getPopulatedCart(req.user._id) });
});

exports.clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [], restaurant: null } }, { upsert: true });
  res.json({ success: true, message: 'Cart cleared.' });
});
