(function () {
  'use strict';

  /* Category icons/colours (the API only stores name/slug/image). */
  var CATEGORY_STYLE = {
    'pizza': { icon: 'fa-pizza-slice', color: '#fff0e7' },
    'burgers': { icon: 'fa-burger', color: '#fff4d9' },
    'biryani': { icon: 'fa-bowl-food', color: '#fce9e5' },
    'south indian': { icon: 'fa-utensils', color: '#e9f4e9' },
    'chinese': { icon: 'fa-bowl-rice', color: '#f1eafe' },
    'desserts': { icon: 'fa-ice-cream', color: '#ffeaf1' },
    'beverages': { icon: 'fa-mug-hot', color: '#e8f3fb' }
  };
  var FALLBACK_COLORS = ['#fff0e7', '#fff4d9', '#fce9e5', '#e9f4e9', '#f1eafe', '#ffeaf1', '#e8f3fb'];

  var NEXT_STATUS = {
    placed: ['accepted', 'rejected'],
    accepted: ['preparing', 'rejected'],
    preparing: ['ready'],
    ready: ['out_for_delivery'],
    out_for_delivery: ['delivered']
  };

  angular.module('cravekart')

    /* ---------- API document -> UI model mappers ---------- */
    .factory('Mappers', function () {
      var m = {};

      m.category = function (c, index) {
        var style = CATEGORY_STYLE[(c.name || '').toLowerCase()] || {};
        return {
          id: c._id, name: c.name, slug: c.slug, image: c.image,
          icon: style.icon || 'fa-utensils',
          color: style.color || FALLBACK_COLORS[(index || 0) % FALLBACK_COLORS.length]
        };
      };

      m.restaurant = function (r) {
        var cuisine = r.cuisine || [];
        var addr = r.address || {};
        return {
          id: r._id,
          ownerId: r.owner && (r.owner._id || r.owner),
          name: r.name,
          description: r.description || '',
          cuisine: cuisine,
          cuisineText: cuisine.join(' · '),
          rating: r.rating || 0,
          image: r.image || r.coverImage || '',
          coverImage: r.coverImage || r.image || '',
          area: addr.area || '',
          city: addr.city || '',
          phone: r.phone || '',
          deliveryFee: r.deliveryFee || 0,
          eta: r.estimatedDeliveryMinutes || 30,
          isOpen: r.isOpen !== false,
          isApproved: r.isApproved
        };
      };

      /** categoryMap: { categoryId: categoryName } (the foods API returns the category as a bare id). */
      m.food = function (f, categoryMap) {
        var rest = f.restaurant && typeof f.restaurant === 'object' ? f.restaurant : null;
        var catId = f.category && (f.category._id || f.category);
        return {
          id: f._id,
          name: f.name,
          description: f.description || '',
          price: f.price,
          image: f.image || '',
          isVeg: f.isVeg !== false,
          popular: !!f.isPopular,
          available: f.isAvailable !== false,
          categoryId: catId || null,
          category: (categoryMap && catId && categoryMap[catId]) || '',
          restaurantId: rest ? rest._id : f.restaurant,
          restaurantName: rest ? rest.name : '',
          restaurantRating: rest ? (rest.rating || 0) : 0,
          restaurantOpen: rest ? rest.isOpen !== false : true
        };
      };

      m.nextStatuses = function (status) { return NEXT_STATUS[status] || []; };

      m.order = function (o) {
        var rest = o.restaurant && typeof o.restaurant === 'object' ? o.restaurant : {};
        var cust = o.customer && typeof o.customer === 'object' ? o.customer : {};
        var items = (o.items || []).map(function (i) {
          return { name: i.name, image: i.image || '', quantity: i.quantity, unitPrice: i.unitPrice };
        });
        return {
          id: o._id,
          number: o.orderNumber,
          status: o.status,
          date: o.createdAt,
          items: items,
          itemCount: items.reduce(function (n, i) { return n + i.quantity; }, 0),
          itemNames: items.map(function (i) { return i.quantity + ' × ' + i.name; }).join(', '),
          subtotal: o.subtotal, deliveryFee: o.deliveryFee, tax: o.tax, discount: o.discount, total: o.total,
          paymentMethod: o.paymentMethod,
          restaurantId: rest._id || o.restaurant,
          restaurantName: rest.name || '',
          customerName: cust.name || (o.deliveryAddress && o.deliveryAddress.recipientName) || '',
          canCancel: ['placed', 'accepted'].indexOf(o.status) > -1,
          nextStatuses: NEXT_STATUS[o.status] || []
        };
      };

      return m;
    })

    /* ---------- Catalogue loading with mapping ---------- */
    .factory('Catalog', ['$q', 'Api', 'Mappers', function ($q, Api, Mappers) {
      var svc = {};
      var categoriesPromise = null;

      svc.categories = function (force) {
        if (!categoriesPromise || force) {
          categoriesPromise = Api.categories().then(function (data) {
            return data.categories.map(Mappers.category);
          }, function (err) { categoriesPromise = null; return $q.reject(err); });
        }
        return categoriesPromise;
      };

      svc.categoryMap = function () {
        return svc.categories().then(function (cats) {
          var map = {};
          cats.forEach(function (c) { map[c.id] = c.name; });
          return map;
        }, function () { return {}; });   // categories are cosmetic: never block foods on them
      };

      svc.restaurants = function (params) {
        return Api.restaurants(angular.extend({ limit: 50 }, params)).then(function (data) {
          return data.restaurants.map(Mappers.restaurant);
        });
      };

      svc.restaurant = function (id) {
        return Api.restaurant(id).then(function (data) { return Mappers.restaurant(data.restaurant); });
      };

      svc.foods = function (params) {
        return $q.all([Api.foods(params), svc.categoryMap()]).then(function (res) {
          return res[0].foods.map(function (f) { return Mappers.food(f, res[1]); });
        });
      };

      svc.reviews = function (restaurantId) {
        return Api.reviews(restaurantId).then(function (data) { return data.reviews; });
      };

      return svc;
    }]);
})();
