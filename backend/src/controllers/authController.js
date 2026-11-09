const User = require('../models/User');
const createToken = require('../utils/createToken');
const asyncHandler = require('../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must contain at least 8 characters.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (await User.findOne({ email: normalizedEmail })) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  // Public registration always creates a customer. Elevated roles are assigned by an administrator.
  const user = await User.create({ name, email: normalizedEmail, phone, password, role: 'customer' });
  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    token: createToken(user),
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'This account is inactive.' });
  }

  res.json({
    success: true,
    message: 'Login successful.',
    token: createToken(user),
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});


exports.updateProfile = asyncHandler(async (req, res) => {
  const updates = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
  if (typeof req.body.phone === 'string') updates.phone = req.body.phone.trim();

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  }).select('-password');

  res.json({ success: true, message: 'Profile updated.', user });
});
