require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const Food = require('../models/Food');
const Coupon = require('../models/Coupon');

async function seed() {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      Restaurant.deleteMany({}),
      Category.deleteMany({}),
      Food.deleteMany({}),
      Coupon.deleteMany({})
    ]);

    const [admin, owner, customer] = await User.create([
      { name: 'CraveKart Admin', email: 'admin@cravekart.local', phone: '9000000001', password: 'Admin@12345', role: 'admin' },
      { name: 'Demo Restaurant Owner', email: 'owner@cravekart.local', phone: '9000000002', password: 'Owner@12345', role: 'restaurant' },
      { name: 'Demo Customer', email: 'customer@cravekart.local', phone: '9000000003', password: 'Customer@12345', role: 'customer' }
    ]);

    const categories = await Category.create([
      { name: 'Pizza', slug: 'pizza' },
      { name: 'Burgers', slug: 'burgers' },
      { name: 'Biryani', slug: 'biryani' },
      { name: 'South Indian', slug: 'south-indian' },
      { name: 'Chinese', slug: 'chinese' },
      { name: 'Desserts', slug: 'desserts' },
      { name: 'Beverages', slug: 'beverages' }
    ]);

    const restaurant = await Restaurant.create({
      owner: owner._id,
      name: 'The Spice Route',
      description: 'A demo restaurant serving comforting Indian favourites.',
      cuisine: ['North Indian', 'Mughlai'],
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900',
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
      address: { line1: 'Demo Main Road', area: 'Vijayanagar', city: 'Mysuru', state: 'Karnataka', postalCode: '570017' },
      phone: '9000000010',
      deliveryFee: 25,
      estimatedDeliveryMinutes: 30,
      rating: 4.7,
      isOpen: true,
      isApproved: true
    });

    const categoryByName = Object.fromEntries(categories.map(c => [c.name, c._id]));
    await Food.create([
      { restaurant: restaurant._id, category: categoryByName['South Indian'], name: 'Masala Dosa', description: 'Crispy dosa with potato masala and chutney.', price: 129, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=700', isVeg: true, isPopular: true },
      { restaurant: restaurant._id, category: categoryByName.Biryani, name: 'Chicken Dum Biryani', description: 'Aromatic basmati rice and house spices.', price: 289, image: 'https://images.unsplash.com/photo-1563379091339-03246963d96a?w=700', isVeg: false, isPopular: true },
      { restaurant: restaurant._id, category: categoryByName['North Indian'] || null, name: 'Paneer Tikka Bowl', description: 'Smoky paneer, rice and mint chutney.', price: 249, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700', isVeg: true, isPopular: true }
    ]);

    await Coupon.create([
      { code: 'WELCOME10', description: '10% off your first demo order', discountType: 'percentage', discountValue: 10, maxDiscount: 100, minOrderValue: 199, usageLimit: 500 },
      { code: 'CRAVE50', description: '₹50 off orders above ₹299', discountType: 'fixed', discountValue: 50, minOrderValue: 299, usageLimit: 500 }
    ]);

    console.log('\nCraveKart sample data created.');
    console.log('Admin:    admin@cravekart.local / Admin@12345');
    console.log('Owner:    owner@cravekart.local / Owner@12345');
    console.log('Customer: customer@cravekart.local / Customer@12345');
    console.log('Change demo credentials and JWT_SECRET before any deployment.\n');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
