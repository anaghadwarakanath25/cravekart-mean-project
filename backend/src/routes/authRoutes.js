const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { register, login, me, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Enter a valid email.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
], validate, register);
router.post('/login', [
  body('email').isEmail().withMessage('Enter a valid email.'),
  body('password').notEmpty().withMessage('Password is required.')
], validate, login);
router.get('/me', protect, me);
router.patch('/profile', protect, updateProfile);

module.exports = router;
