const router = require('express').Router();
const controller = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', controller.list);
router.post('/', protect, authorize('admin'), controller.create);
router.patch('/:id', protect, authorize('admin'), controller.update);
router.delete('/:id', protect, authorize('admin'), controller.remove);

module.exports = router;
