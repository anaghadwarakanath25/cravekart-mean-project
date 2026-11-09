const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:4200')
  .split(',')
  .map(origin => origin.trim());

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'CraveKart API is running.', version: '1.0.0' });
});
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/restaurants', require('./routes/restaurantRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/addresses', require('./routes/addressRoutes'));
app.use('/api/foods', require('./routes/foodRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
