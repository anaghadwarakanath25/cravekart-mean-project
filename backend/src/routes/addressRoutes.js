const router = require('express').Router();
const controller = require('../controllers/addressController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('customer'));
router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
