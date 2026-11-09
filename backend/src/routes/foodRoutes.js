const router = require('express').Router();
const controller = require('../controllers/foodController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', protect, authorize('restaurant', 'admin'), controller.create);
router.patch('/:id', protect, authorize('restaurant', 'admin'), controller.update);
router.delete('/:id', protect, authorize('restaurant', 'admin'), controller.remove);

module.exports = router;
