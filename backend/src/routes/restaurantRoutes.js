const router = require('express').Router();
const controller = require('../controllers/restaurantController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', protect, authorize('restaurant', 'admin'), controller.create);
router.patch('/:id', protect, authorize('restaurant', 'admin'), controller.update);
router.patch('/:id/approval', protect, authorize('admin'), controller.approve);

module.exports = router;
