const router = require('express').Router();
const controller = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.get('/dashboard', controller.dashboard);
router.get('/users', controller.users);
router.patch('/users/:id', controller.updateUser);

module.exports = router;
