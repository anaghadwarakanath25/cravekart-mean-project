const router = require('express').Router();
const controller = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');

router.post('/validate', protect, authorize('customer'), controller.validate);
router.get('/', protect, authorize('admin'), controller.list);
router.post('/', protect, authorize('admin'), controller.create);

module.exports = router;
