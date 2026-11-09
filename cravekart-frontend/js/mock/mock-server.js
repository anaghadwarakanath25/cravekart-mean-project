/*
 * CraveKart DEMO-MODE server (runs inside the browser, no backend needed).
 * It answers the same URLs and JSON shapes as the real Express API, and keeps its data in
 * localStorage ("cravekart-mock-db") so carts, orders, accounts etc. survive page reloads.
 * Turn it off with `useMock: false` in js/config.js to use the real backend.
 * NOTE: demo passwords are stored in plain text in your browser – demo only.
 */
(function (global) {
  'use strict';

  var DB_KEY = 'cravekart-mock-db';
  var db = null;

  function uid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function iso(daysAgo, hours) { return new Date(Date.now() - (daysAgo || 0) * 864e5 - (hours || 0) * 36e5).toISOString(); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------------- seed data ---------------- */
  function seed() {
    var now = iso(30);
    var d = { users: [], categories: [], restaurants: [], foods: [], coupons: [], carts: {}, orders: [], addresses: [], reviews: [] };

    d.users = [
      { _id: 'u-admin', name: 'CraveKart Admin', email: 'admin@cravekart.local', phone: '9000000001', password: 'Admin@12345', role: 'admin', isActive: true, createdAt: now },
      { _id: 'u-owner', name: 'Demo Restaurant Owner', email: 'owner@cravekart.local', phone: '9000000002', password: 'Owner@12345', role: 'restaurant', isActive: true, createdAt: now },
      { _id: 'u-customer', name: 'Demo Customer', email: 'customer@cravekart.local', phone: '9000000003', password: 'Customer@12345', role: 'customer', isActive: true, createdAt: now }
    ];

    ['Pizza', 'Burgers', 'Biryani', 'South Indian', 'Chinese', 'Desserts', 'Beverages'].forEach(function (n) {
      d.categories.push({ _id: 'cat-' + n.toLowerCase().replace(/ /g, '-'), name: n, slug: n.toLowerCase().replace(/ /g, '-'), image: '', isActive: true });
    });
    function cat(n) { var c = d.categories.filter(function (x) { return x.name === n; })[0]; return c ? c._id : null; }

    function R(id, owner, name, cuisine, rating, eta, fee, image, area) {
      d.restaurants.push({ _id: id, owner: owner, name: name, description: 'Freshly made favourites from ' + name + '.', cuisine: cuisine, image: image, coverImage: image,
        address: { line1: '', area: area, city: 'Mysuru', state: 'Karnataka', postalCode: '' }, phone: '9000000010', deliveryFee: fee, estimatedDeliveryMinutes: eta,
        rating: rating, isOpen: true, isApproved: true, isActive: true, createdAt: now });
    }
    R('r1', 'u-owner', 'The Spice Route', ['North Indian', 'Mughlai'], 4.7, 28, 25, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900', 'Indiranagar');
    R('r2', 'u-x', 'Napoli Pizzeria', ['Italian', 'Pizza'], 4.6, 33, 20, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900', 'Koramangala');
    R('r3', 'u-x', 'Dosa & Co.', ['South Indian', 'Breakfast'], 4.8, 18, 15, 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=900', 'Jayanagar');
    R('r4', 'u-x', 'Wok This Way', ['Chinese', 'Asian'], 4.5, 28, 25, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900', 'HSR Layout');
    R('r5', 'u-x', 'Burger District', ['Burgers', 'Fast Food'], 4.4, 23, 20, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900', 'Vijayanagar');
    R('r6', 'u-x', 'Biryani House', ['Biryani', 'Hyderabadi'], 4.6, 35, 30, 'https://images.unsplash.com/photo-1563379091339-03246963d96a?w=900', 'Mysuru Road');
    R('r7', 'u-x', 'Sweet Treats', ['Desserts', 'Bakery'], 4.7, 25, 0, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=900', 'Saraswathipuram');
    R('r8', 'u-x', 'Juice Junction', ['Beverages', 'Healthy'], 4.3, 15, 15, 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=900', 'Kuvempunagar');

    function F(id, rid, c, name, desc, price, img, veg, popular) {
      d.foods.push({ _id: id, restaurant: rid, category: c, name: name, description: desc, price: price, image: img, isVeg: veg, isAvailable: true, isPopular: !!popular, customisations: [], createdAt: now });
    }
    F('f101', 'r1', null, 'Paneer Tikka Bowl', 'Smoky paneer, fragrant rice, mint chutney and fresh salad.', 249, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700', true, true);
    F('f102', 'r2', cat('Pizza'), 'Classic Margherita', 'Fresh mozzarella, basil and our slow-cooked tomato sauce.', 299, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700', true, true);
    F('f103', 'r3', cat('South Indian'), 'Masala Dosa', 'Golden crisp dosa with potato masala and coconut chutney.', 129, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=700', true, true);
    F('f104', 'r6', cat('Biryani'), 'Chicken Dum Biryani', 'Aromatic basmati rice, tender chicken and house-made spices.', 289, 'https://images.unsplash.com/photo-1563379091339-03246963d96a?w=700', false, true);
    F('f105', 'r5', cat('Burgers'), 'Crispy Veggie Burger', 'Crispy vegetable patty, lettuce, pickles and house sauce.', 179, 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=700', true, false);
    F('f106', 'r4', cat('Chinese'), 'Chilli Garlic Noodles', 'Wok-tossed noodles with crunchy vegetables and chilli garlic sauce.', 219, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=700', true, false);
    F('f107', 'r7', cat('Desserts'), 'Chocolate Lava Cake', 'Warm chocolate cake with a rich molten centre.', 149, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=700', true, false);
    F('f108', 'r8', cat('Beverages'), 'Fresh Mango Smoothie', 'A chilled, creamy smoothie made with ripe mangoes.', 119, 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=700', true, false);
    F('f109', 'r1', cat('Biryani'), 'Veg Dum Biryani', 'Fragrant rice layered with vegetables and saffron.', 229, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=700', true, false);
    F('f110', 'r1', null, 'Butter Naan', 'Soft tandoor naan brushed with butter.', 49, 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=700', true, false);

    d.coupons = [
      { _id: 'cp1', code: 'WELCOME10', description: '10% off your first order', discountType: 'percentage', discountValue: 10, maxDiscount: 100, minOrderValue: 199, usageLimit: 500, usedCount: 0, expiresAt: null, isActive: true, createdAt: now },
      { _id: 'cp2', code: 'CRAVE50', description: '₹50 off orders above ₹299', discountType: 'fixed', discountValue: 50, maxDiscount: null, minOrderValue: 299, usageLimit: 500, usedCount: 0, expiresAt: null, isActive: true, createdAt: now }
    ];

    function order(num, rid, lines, status, daysAgo, pay) {
      var items = [], sub = 0;
      lines.forEach(function (l) {
        var f = d.foods.filter(function (x) { return x._id === l[0]; })[0];
        items.push({ food: f._id, name: f.name, image: f.image, unitPrice: f.price, quantity: l[1] }); sub += f.price * l[1];
      });
      var r = d.restaurants.filter(function (x) { return x._id === rid; })[0];
      var tax = round2(sub * 0.05);
      d.orders.push({ _id: 'o-' + num, orderNumber: num, customer: 'u-customer', restaurant: rid, items: items,
        deliveryAddress: { recipientName: 'Demo Customer', phone: '9000000003', line1: '12 Demo Street', landmark: 'Near Park', area: 'Vijayanagar', city: 'Mysuru', state: 'Karnataka', postalCode: '570017' },
        paymentMethod: pay || 'COD', paymentStatus: status === 'delivered' ? 'paid' : 'pending', subtotal: sub, deliveryFee: r.deliveryFee, tax: tax, discount: 0,
        total: round2(sub + r.deliveryFee + tax), couponCode: '', status: status, notes: '', cancellationReason: '', createdAt: iso(daysAgo), updatedAt: iso(daysAgo) });
    }
    order('CK4817', 'r1', [['f101', 1], ['f110', 2]], 'delivered', 6, 'UPI');
    order('CK4818', 'r3', [['f103', 2]], 'delivered', 4, 'COD');
    order('CK4819', 'r1', [['f101', 2]], 'preparing', 0.05, 'COD');
    order('CK4820', 'r1', [['f109', 1]], 'placed', 0.01, 'COD');
    return d;
  }

  function load() {
    if (db) { return db; }
    try { db = JSON.parse(global.localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
    if (!db || !db.users) { db = seed(); save(); }
    return db;
  }
  function save() { try { global.localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } }
  function find(list, id) { return list.filter(function (x) { return x._id === id; })[0]; }

  /* ---------------- helpers: shapes ---------------- */
  var ok = function (body, status) { return { status: status || 200, body: Object.assign({ success: true }, body) }; };
  var err = function (status, message) { return { status: status, body: { success: false, message: message } }; };
  function pubUser(u) { return { id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role }; }
  function safeUser(u) { var c = clone(u); delete c.password; return c; }

  function foodView(f, detailed) {
    var r = find(db.restaurants, f.restaurant) || {};
    var c = clone(f);
    c.restaurant = detailed ? { _id: r._id, name: r.name, rating: r.rating, deliveryFee: r.deliveryFee, isOpen: r.isOpen }
                            : { _id: r._id, name: r.name, address: { area: (r.address || {}).area }, rating: r.rating, isOpen: r.isOpen };
    return c;
  }
  function cartView(userId) {
    var c = db.carts[userId];
    if (!c || !c.items.length) { return { items: [], restaurant: null }; }
    var r = find(db.restaurants, c.restaurant);
    return {
      restaurant: r ? { _id: r._id, name: r.name, deliveryFee: r.deliveryFee, isOpen: r.isOpen } : null,
      items: c.items.map(function (i) {
        var f = find(db.foods, i.food) || {};
        return { _id: i._id, quantity: i.quantity, food: { _id: f._id, name: f.name, description: f.description, price: f.price, image: f.image, isVeg: f.isVeg, isAvailable: f.isAvailable, restaurant: f.restaurant } };
      })
    };
  }
  function orderView(o, who) {
    var c = clone(o), r = find(db.restaurants, o.restaurant) || {}, u = find(db.users, o.customer) || {};
    c.restaurant = { _id: r._id, name: r.name, image: r.image, phone: r.phone, owner: r.owner };
    if (who !== 'mine') { c.customer = { _id: u._id, name: u.name, email: u.email, phone: u.phone }; }
    return c;
  }
  function discountFor(coupon, subtotal) {
    var disc = coupon.discountType === 'percentage' ? subtotal * coupon.discountValue / 100 : coupon.discountValue;
    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) { disc = Math.min(disc, coupon.maxDiscount); }
    return round2(disc);
  }
  function couponProblem(coupon, subtotal, notFoundStatus) {
    if (!coupon) { return [notFoundStatus, 'Coupon not found.']; }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) { return [400, 'Coupon has expired.']; }
    if (coupon.usedCount >= coupon.usageLimit) { return [400, 'Coupon usage limit reached.']; }
    if (subtotal < coupon.minOrderValue) { return [400, 'Minimum order value is ₹' + coupon.minOrderValue + '.']; }
    return null;
  }

  /* ---------------- request handler ---------------- */
  function handle(method, rawPath, rawBody, headers) {
    load();
    var u = new URL(rawPath, 'http://mock');
    var path = u.pathname, q = {};
    u.searchParams.forEach(function (v, k) { q[k] = v; });
    var body = {};
    try { body = rawBody ? JSON.parse(rawBody) : {}; } catch (e) { body = {}; }
    var token = ((headers && (headers.Authorization || headers.authorization)) || '').replace('Bearer ', '');
    var me = token.indexOf('mock-') === 0 ? find(db.users, token.slice(5)) : null;
    if (me && !me.isActive) { me = null; }

    function need(roles) {
      if (!me) { return err(401, 'Authentication required. Send a Bearer token.'); }
      if (roles && roles.length && roles.indexOf(me.role) === -1) { return err(403, 'You do not have permission to perform this action.'); }
      return null;
    }
    var m, g, deny;

    /* ----- health & auth ----- */
    if (path === '/health') { return ok({ message: 'API healthy (demo mode)' }); }

    if (path === '/auth/register' && method === 'POST') {
      if (!body.name || !body.email || !body.password) { return err(400, 'Name, email and password are required.'); }
      if (body.password.length < 8) { return err(400, 'Password must contain at least 8 characters.'); }
      var email = String(body.email).toLowerCase().trim();
      if (db.users.some(function (x) { return x.email === email; })) { return err(409, 'An account with this email already exists.'); }
      var nu = { _id: uid(), name: body.name.trim(), email: email, phone: body.phone || '', password: body.password, role: 'customer', isActive: true, createdAt: iso(0) };
      db.users.push(nu); save();
      return ok({ message: 'Registration successful.', token: 'mock-' + nu._id, user: pubUser(nu) }, 201);
    }
    if (path === '/auth/login' && method === 'POST') {
      if (!body.email || !body.password) { return err(400, 'Email and password are required.'); }
      var lu = db.users.filter(function (x) { return x.email === String(body.email).toLowerCase().trim(); })[0];
      if (!lu || lu.password !== body.password) { return err(401, 'Invalid email or password.'); }
      if (!lu.isActive) { return err(403, 'This account is inactive.'); }
      return ok({ message: 'Login successful.', token: 'mock-' + lu._id, user: pubUser(lu) });
    }
    if (path === '/auth/me') { if ((deny = need())) { return deny; } return ok({ user: safeUser(me) }); }
    if (path === '/auth/profile' && method === 'PATCH') {
      if ((deny = need())) { return deny; }
      if (typeof body.name === 'string' && body.name.trim()) { me.name = body.name.trim(); }
      if (typeof body.phone === 'string') { me.phone = body.phone.trim(); }
      save(); return ok({ message: 'Profile updated.', user: safeUser(me) });
    }

    /* ----- categories ----- */
    if (path === '/categories') {
      if (method === 'GET') { var cs = db.categories.filter(function (c) { return c.isActive; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); return ok({ count: cs.length, categories: cs }); }
      if (method === 'POST') {
        if ((deny = need(['admin']))) { return deny; }
        if (!body.name || !body.slug) { return err(400, 'Category name and slug are required.'); }
        if (db.categories.some(function (c) { return c.name === body.name || c.slug === body.slug; })) { return err(409, 'A record with this name already exists.'); }
        var nc = { _id: uid(), name: body.name, slug: String(body.slug).toLowerCase(), image: body.image || '', isActive: true }; db.categories.push(nc); save(); return ok({ category: nc }, 201);
      }
    }
    if ((m = path.match(/^\/categories\/([^/]+)$/)) && method === 'DELETE') {
      if ((deny = need(['admin']))) { return deny; }
      var dc = find(db.categories, m[1]); if (!dc) { return err(404, 'Category not found.'); }
      dc.isActive = false; save(); return ok({ message: 'Category deactivated.', category: dc });
    }

    /* ----- restaurants ----- */
    if (path === '/restaurants') {
      if (method === 'GET') {
        var rs = db.restaurants.filter(function (r) { return r.isActive && r.isApproved; });
        if (q.search) { var s = q.search.toLowerCase(); rs = rs.filter(function (r) { return (r.name + ' ' + r.cuisine.join(' ')).toLowerCase().indexOf(s) > -1; }); }
        if (q.open === 'true') { rs = rs.filter(function (r) { return r.isOpen; }); }
        rs.sort(function (a, b) { return b.rating - a.rating; });
        var limit = Math.min(50, Math.max(1, Number(q.limit) || 12)), page = Math.max(1, Number(q.page) || 1);
        var slice = rs.slice((page - 1) * limit, page * limit);
        return ok({ count: slice.length, total: rs.length, page: page, pages: Math.ceil(rs.length / limit), restaurants: slice });
      }
      if (method === 'POST') {
        if ((deny = need(['restaurant', 'admin']))) { return deny; }
        if (!body.name) { return err(400, 'Restaurant name is required.'); }
        var nr = Object.assign({ cuisine: [], image: '', coverImage: '', address: {}, phone: '', deliveryFee: 25, estimatedDeliveryMinutes: 30, rating: 0, isOpen: true, description: '' },
          body, { _id: uid(), owner: me.role === 'admin' && body.owner ? body.owner : me._id, isApproved: false, isActive: true, createdAt: iso(0) });
        db.restaurants.push(nr); save(); return ok({ restaurant: nr }, 201);
      }
    }
    if ((m = path.match(/^\/restaurants\/([^/]+)$/))) {
      var rr = find(db.restaurants, m[1]);
      if (method === 'GET') { return rr && rr.isActive && rr.isApproved ? ok({ restaurant: rr }) : err(404, 'Restaurant not found.'); }
      if (method === 'PATCH') {
        if ((deny = need(['restaurant', 'admin']))) { return deny; }
        if (!rr) { return err(404, 'Restaurant not found.'); }
        if (me.role !== 'admin' && rr.owner !== me._id) { return err(403, 'You cannot edit this restaurant.'); }
        ['name', 'description', 'cuisine', 'image', 'coverImage', 'address', 'phone', 'openingTime', 'closingTime', 'deliveryFee', 'estimatedDeliveryMinutes', 'isOpen'].forEach(function (k) { if (body[k] !== undefined) { rr[k] = body[k]; } });
        save(); return ok({ restaurant: rr });
      }
    }
    if ((m = path.match(/^\/restaurants\/([^/]+)\/approval$/)) && method === 'PATCH') {
      if ((deny = need(['admin']))) { return deny; }
      var ar = find(db.restaurants, m[1]); if (!ar) { return err(404, 'Restaurant not found.'); }
      ar.isApproved = !!body.isApproved; save(); return ok({ restaurant: ar });
    }

    /* ----- foods ----- */
    if (path === '/foods') {
      if (method === 'GET') {
        var fs = db.foods.filter(function (f) { return f.isAvailable; });
        if (q.restaurant) { fs = fs.filter(function (f) { return f.restaurant === q.restaurant; }); }
        if (q.veg === 'true') { fs = fs.filter(function (f) { return f.isVeg; }); }
        if (q.veg === 'false') { fs = fs.filter(function (f) { return !f.isVeg; }); }
        if (q.category) { fs = fs.filter(function (f) { return f.category === q.category; }); }
        if (q.search) { var fq = q.search.toLowerCase(); fs = fs.filter(function (f) { return (f.name + ' ' + f.description).toLowerCase().indexOf(fq) > -1; }); }
        fs.sort(function (a, b) { return (Number(b.isPopular) - Number(a.isPopular)) || a.name.localeCompare(b.name); });
        fs = fs.slice(0, 100);
        return ok({ count: fs.length, foods: fs.map(function (f) { return foodView(f, false); }) });
      }
      if (method === 'POST') {
        if ((deny = need(['restaurant', 'admin']))) { return deny; }
        var fr = find(db.restaurants, body.restaurant); if (!fr) { return err(404, 'Restaurant not found.'); }
        if (me.role !== 'admin' && fr.owner !== me._id) { return err(403, 'You cannot add food to this restaurant.'); }
        if (!body.name || !(Number(body.price) >= 0)) { return err(400, 'Food name and a valid price are required.'); }
        var nf = { _id: uid(), restaurant: body.restaurant, category: body.category || null, name: body.name, description: body.description || '', price: Number(body.price), image: body.image || '',
          isVeg: body.isVeg !== false, isAvailable: true, isPopular: !!body.isPopular, customisations: [], createdAt: iso(0) };
        db.foods.push(nf); save(); return ok({ food: nf }, 201);
      }
    }
    if ((m = path.match(/^\/foods\/([^/]+)$/))) {
      var ff = find(db.foods, m[1]);
      if (method === 'GET') { return ff && ff.isAvailable ? ok({ food: foodView(ff, true) }) : err(404, 'Food item not found or unavailable.'); }
      if (method === 'PATCH' || method === 'DELETE') {
        if ((deny = need(['restaurant', 'admin']))) { return deny; }
        if (!ff) { return err(404, 'Food item not found.'); }
        var fo = find(db.restaurants, ff.restaurant);
        if (me.role !== 'admin' && (!fo || fo.owner !== me._id)) { return err(403, 'You cannot edit this food item.'); }
        if (method === 'DELETE') { db.foods = db.foods.filter(function (x) { return x._id !== ff._id; }); save(); return ok({ message: 'Food item deleted.' }); }
        ['name', 'description', 'price', 'image', 'category', 'isVeg', 'isAvailable', 'isPopular', 'customisations'].forEach(function (k) { if (body[k] !== undefined) { ff[k] = body[k]; } });
        save(); return ok({ food: ff });
      }
    }

    /* ----- cart (customer) ----- */
    if (path === '/cart' || path.indexOf('/cart/') === 0) {
      if ((deny = need(['customer']))) { return deny; }
      var cart = db.carts[me._id] = db.carts[me._id] || { restaurant: null, items: [] };
      if (path === '/cart' && method === 'GET') { return ok({ cart: cartView(me._id) }); }
      if (path === '/cart' && method === 'DELETE') { cart.items = []; cart.restaurant = null; save(); return ok({ message: 'Cart cleared.' }); }
      if (path === '/cart/items' && method === 'POST') {
        var qty = Number(body.quantity === undefined ? 1 : body.quantity);
        if (!body.foodId || qty % 1 !== 0 || qty < 1 || qty > 20) { return err(400, 'Provide a valid foodId and quantity between 1 and 20.'); }
        var cf = find(db.foods, body.foodId); if (!cf || !cf.isAvailable) { return err(404, 'Food item is unavailable.'); }
        if (cart.restaurant && cart.restaurant !== cf.restaurant) { return err(409, 'Your cart contains items from another restaurant. Clear the cart before adding this item.'); }
        cart.restaurant = cf.restaurant;
        var ex = cart.items.filter(function (i) { return i.food === cf._id; })[0];
        if (ex) { ex.quantity = Math.min(20, ex.quantity + qty); } else { cart.items.push({ _id: uid(), food: cf._id, quantity: qty }); }
        save(); return ok({ message: 'Item added to cart.', cart: cartView(me._id) }, 201);
      }
      if ((m = path.match(/^\/cart\/items\/([^/]+)$/))) {
        var it = find(cart.items, m[1]); if (!it) { return err(404, 'Cart item not found.'); }
        if (method === 'PATCH') {
          var nq = Number(body.quantity); if (nq % 1 !== 0 || nq < 1 || nq > 20) { return err(400, 'Quantity must be between 1 and 20.'); }
          it.quantity = nq;
        } else if (method === 'DELETE') {
          cart.items = cart.items.filter(function (x) { return x !== it; });
          if (!cart.items.length) { cart.restaurant = null; }
        }
        save(); return ok({ cart: cartView(me._id) });
      }
    }

    /* ----- addresses (customer) ----- */
    if (path === '/addresses' || path.indexOf('/addresses/') === 0) {
      if ((deny = need(['customer']))) { return deny; }
      var mine = db.addresses.filter(function (a) { return a.user === me._id; });
      if (path === '/addresses' && method === 'GET') { mine.sort(function (a, b) { return Number(b.isDefault) - Number(a.isDefault); }); return ok({ count: mine.length, addresses: mine }); }
      if (path === '/addresses' && method === 'POST') {
        ['recipientName', 'phone', 'line1', 'area', 'city', 'state', 'postalCode'].forEach(function (k) { if (!body[k]) { deny = err(400, 'Address field "' + k + '" is required.'); } });
        if (deny) { return deny; }
        if (body.isDefault) { mine.forEach(function (a) { a.isDefault = false; }); }
        var na = Object.assign({ label: 'Home', landmark: '', isDefault: false }, body, { _id: uid(), user: me._id, createdAt: iso(0) });
        db.addresses.push(na); save(); return ok({ address: na }, 201);
      }
      if ((m = path.match(/^\/addresses\/([^/]+)$/))) {
        var ad = find(mine, m[1]); if (!ad) { return err(404, 'Address not found.'); }
        if (method === 'DELETE') { db.addresses = db.addresses.filter(function (a) { return a !== ad; }); save(); return ok({ message: 'Address deleted.' }); }
        if (method === 'PATCH') {
          if (body.isDefault === true) { mine.forEach(function (a) { a.isDefault = false; }); }
          ['label', 'recipientName', 'phone', 'line1', 'landmark', 'area', 'city', 'state', 'postalCode', 'isDefault'].forEach(function (k) { if (body[k] !== undefined) { ad[k] = body[k]; } });
          save(); return ok({ address: ad });
        }
      }
    }

    /* ----- coupons ----- */
    if (path === '/coupons/validate' && method === 'POST') {
      if ((deny = need(['customer']))) { return deny; }
      var sub = Number(body.subtotal);
      if (!body.code || !isFinite(sub) || sub < 0) { return err(400, 'Coupon code and valid subtotal are required.'); }
      var cp = db.coupons.filter(function (c) { return c.code === String(body.code).toUpperCase().trim() && c.isActive; })[0];
      var prob = couponProblem(cp, sub, 404); if (prob) { return err(prob[0], prob[1]); }
      return ok({ coupon: { code: cp.code, description: cp.description }, discount: discountFor(cp, sub) });
    }
    if (path === '/coupons') {
      if ((deny = need(['admin']))) { return deny; }
      if (method === 'GET') { return ok({ coupons: db.coupons.slice().reverse() }); }
      if (method === 'POST') {
        if (!body.code || !body.discountType || !(Number(body.discountValue) >= 0)) { return err(400, 'Code, discount type and value are required.'); }
        var code = String(body.code).toUpperCase().trim();
        if (db.coupons.some(function (c) { return c.code === code; })) { return err(409, 'A record with this code already exists.'); }
        var ncp = { _id: uid(), code: code, description: body.description || '', discountType: body.discountType, discountValue: Number(body.discountValue),
          maxDiscount: body.maxDiscount === undefined ? null : body.maxDiscount, minOrderValue: body.minOrderValue || 0, usageLimit: body.usageLimit || 1000, usedCount: 0, expiresAt: null, isActive: true, createdAt: iso(0) };
        db.coupons.push(ncp); save(); return ok({ coupon: ncp }, 201);
      }
    }

    /* ----- reviews ----- */
    if ((m = path.match(/^\/reviews\/restaurant\/([^/]+)$/)) && method === 'GET') {
      var rv = db.reviews.filter(function (r) { return r.restaurant === m[1]; }).reverse().map(function (r) {
        var c = find(db.users, r.customer) || {}; return Object.assign({}, r, { customer: { _id: c._id, name: c.name } });
      });
      return ok({ count: rv.length, reviews: rv });
    }
    if (path === '/reviews' && method === 'POST') {
      if ((deny = need(['customer']))) { return deny; }
      var ro = db.orders.filter(function (o) { return o._id === body.orderId && o.customer === me._id && o.status === 'delivered'; })[0];
      if (!ro) { return err(400, 'Only delivered orders can be reviewed.'); }
      var rating = Number(body.rating); if (!(rating >= 1 && rating <= 5)) { return err(400, 'Rating must be between 1 and 5.'); }
      if (db.reviews.some(function (r) { return r.order === ro._id; })) { return err(409, 'A record with this order already exists.'); }
      var nrv = { _id: uid(), customer: me._id, restaurant: ro.restaurant, order: ro._id, rating: rating, comment: (body.comment || '').slice(0, 1000), createdAt: iso(0) };
      db.reviews.push(nrv);
      // keep the restaurant's displayed rating in step with its reviews
      var all = db.reviews.filter(function (r) { return r.restaurant === ro.restaurant; });
      var rest = find(db.restaurants, ro.restaurant); rest.rating = round2((rest.rating * 10 + all.reduce(function (n, r) { return n + r.rating; }, 0)) / (10 + all.length));
      save(); return ok({ review: nrv }, 201);
    }

    /* ----- orders ----- */
    if (path === '/orders' && method === 'POST') {
      if ((deny = need(['customer']))) { return deny; }
      var a = body.deliveryAddress;
      if (!a || !a.recipientName || !a.phone || !a.line1 || !a.area || !a.city || !a.state || !a.postalCode) { return err(400, 'Complete delivery address is required.'); }
      var pay = body.paymentMethod || 'COD';
      if (['COD', 'UPI', 'CARD'].indexOf(pay) === -1) { return err(400, 'Unsupported payment method.'); }
      var oc = db.carts[me._id];
      if (!oc || !oc.items.length) { return err(400, 'Your cart is empty.'); }
      var orst = find(db.restaurants, oc.restaurant);
      if (!orst || !orst.isActive || !orst.isApproved || !orst.isOpen) { return err(400, 'This restaurant is currently unavailable.'); }
      var osub = 0, oitems = [];
      for (var i = 0; i < oc.items.length; i++) {
        var of = find(db.foods, oc.items[i].food);
        if (!of || !of.isAvailable) { return err(400, 'One or more cart items are no longer available. Refresh your cart.'); }
        osub += of.price * oc.items[i].quantity;
        oitems.push({ food: of._id, name: of.name, image: of.image, unitPrice: of.price, quantity: oc.items[i].quantity });
      }
      var otax = round2(osub * 0.05), odisc = 0, ocode = '';
      if (body.couponCode) {
        var oco = db.coupons.filter(function (c) { return c.code === String(body.couponCode).toUpperCase().trim() && c.isActive; })[0];
        var op = couponProblem(oco, osub, 400); if (op) { return err(op[0], op[0] === 400 && !oco ? 'Invalid or inactive coupon.' : op[1]); }
        odisc = Math.min(discountFor(oco, osub), osub + otax + orst.deliveryFee); ocode = oco.code; oco.usedCount++;
      }
      var norder = { _id: uid(), orderNumber: 'CK' + Date.now() + Math.floor(1000 + Math.random() * 9000), customer: me._id, restaurant: orst._id, items: oitems, deliveryAddress: a,
        paymentMethod: pay, paymentStatus: 'pending', subtotal: osub, deliveryFee: orst.deliveryFee, tax: otax, discount: odisc,
        total: Math.max(0, round2(osub + orst.deliveryFee + otax - odisc)), couponCode: ocode, status: 'placed', notes: body.notes || '', cancellationReason: '', createdAt: iso(0), updatedAt: iso(0) };
      db.orders.push(norder); oc.items = []; oc.restaurant = null; save();
      return ok({ message: 'Order placed successfully.', order: norder }, 201);
    }
    if (path === '/orders/my-orders') {
      if ((deny = need(['customer']))) { return deny; }
      var mo = db.orders.filter(function (o) { return o.customer === me._id; }).sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; });
      return ok({ count: mo.length, orders: mo.map(function (o) { return orderView(o, 'mine'); }) });
    }
    if (path === '/orders/restaurant-orders') {
      if ((deny = need(['restaurant']))) { return deny; }
      var ids = db.restaurants.filter(function (r) { return r.owner === me._id; }).map(function (r) { return r._id; });
      var ro2 = db.orders.filter(function (o) { return ids.indexOf(o.restaurant) > -1; }).sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; });
      return ok({ count: ro2.length, orders: ro2.map(function (o) { return orderView(o); }) });
    }
    if (path === '/orders/admin/all') {
      if ((deny = need(['admin']))) { return deny; }
      var ao = db.orders.slice().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }).slice(0, 200);
      return ok({ count: ao.length, orders: ao.map(function (o) { return orderView(o); }) });
    }
    if ((m = path.match(/^\/orders\/([^/]+)$/)) && method === 'GET') {
      if ((deny = need())) { return deny; }
      var go = find(db.orders, m[1]); if (!go) { return err(404, 'Order not found.'); }
      var gr = find(db.restaurants, go.restaurant) || {};
      if (!(me.role === 'admin' || go.customer === me._id || (me.role === 'restaurant' && gr.owner === me._id))) { return err(403, 'You cannot view this order.'); }
      return ok({ order: orderView(go) });
    }
    if ((m = path.match(/^\/orders\/([^/]+)\/status$/)) && method === 'PATCH') {
      if ((deny = need(['restaurant', 'admin']))) { return deny; }
      if (['accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'rejected'].indexOf(body.status) === -1) { return err(400, 'Invalid order status.'); }
      var so = find(db.orders, m[1]); if (!so) { return err(404, 'Order not found.'); }
      var sr = find(db.restaurants, so.restaurant) || {};
      if (me.role !== 'admin' && sr.owner !== me._id) { return err(403, 'You cannot update this order.'); }
      if (['cancelled', 'rejected', 'delivered'].indexOf(so.status) > -1) { return err(400, 'Cannot update an order that is ' + so.status + '.'); }
      so.status = body.status; so.updatedAt = iso(0); if (so.status === 'delivered') { so.paymentStatus = 'paid'; }
      save(); return ok({ message: 'Order status updated.', order: so });
    }
    if ((m = path.match(/^\/orders\/([^/]+)\/cancel$/)) && method === 'PATCH') {
      if ((deny = need(['customer']))) { return deny; }
      var co = db.orders.filter(function (o) { return o._id === m[1] && o.customer === me._id; })[0];
      if (!co) { return err(404, 'Order not found.'); }
      if (['placed', 'accepted'].indexOf(co.status) === -1) { return err(400, 'This order can no longer be cancelled.'); }
      co.status = 'cancelled'; co.cancellationReason = body.reason || 'Cancelled by customer'; co.updatedAt = iso(0);
      save(); return ok({ message: 'Order cancelled.', order: co });
    }

    /* ----- admin ----- */
    if (path === '/admin/dashboard') {
      if ((deny = need(['admin']))) { return deny; }
      return ok({ stats: {
        customers: db.users.filter(function (x) { return x.role === 'customer'; }).length, restaurants: db.restaurants.length, foods: db.foods.length, orders: db.orders.length,
        revenue: db.orders.filter(function (o) { return o.status === 'delivered'; }).reduce(function (n, o) { return n + o.total; }, 0),
        pendingRestaurants: db.restaurants.filter(function (r) { return !r.isApproved; }).length } });
    }
    if (path === '/admin/users') {
      if ((deny = need(['admin']))) { return deny; }
      return ok({ count: db.users.length, users: db.users.slice().reverse().map(safeUser) });
    }
    if ((m = path.match(/^\/admin\/users\/([^/]+)$/)) && method === 'PATCH') {
      if ((deny = need(['admin']))) { return deny; }
      var tu = find(db.users, m[1]); if (!tu) { return err(404, 'User not found.'); }
      if (typeof body.isActive === 'boolean') { tu.isActive = body.isActive; }
      if (['customer', 'restaurant', 'admin'].indexOf(body.role) > -1) { tu.role = body.role; }
      save(); return ok({ user: safeUser(tu) });
    }

    return err(404, 'Route not found: ' + method + ' ' + path);
  }

  global.CraveKartMock = {
    handle: handle,
    reset: function () { try { global.localStorage.removeItem(DB_KEY); } catch (e) { /* ignore */ } db = null; }
  };
})(window);
