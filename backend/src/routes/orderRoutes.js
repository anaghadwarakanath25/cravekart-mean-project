const router = require('express').Router();
const controller = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('customer'), controller.createOrder);
router.get('/my-orders', protect, authorize('customer'), controller.myOrders);
router.get('/restaurant-orders', protect, authorize('restaurant'), controller.restaurantOrders);
router.get('/admin/all', protect, authorize('admin'), controller.adminOrders);
router.get('/:id', protect, controller.getOrder);
router.patch('/:id/status', protect, authorize('restaurant', 'admin'), controller.updateStatus);
router.patch('/:id/cancel', protect, authorize('customer'), controller.cancelOrder);

module.exports = router;
