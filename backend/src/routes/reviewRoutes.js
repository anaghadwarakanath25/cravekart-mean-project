const router = require('express').Router();
const controller = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

router.get('/restaurant/:restaurantId', controller.restaurantReviews);
router.post('/', protect, authorize('customer'), controller.create);

module.exports = router;
