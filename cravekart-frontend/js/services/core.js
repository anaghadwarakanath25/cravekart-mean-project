(function () {
  'use strict';

  angular.module('cravekart')

    /* ---------- Token / user persistence ---------- */
    .factory('TokenStore', ['$window', function ($window) {
      var KEY = 'cravekart-auth';
      function read() {
        try { return JSON.parse($window.localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
      }
      return {
        get: function () { return read().token || null; },
        user: function () { return read().user || null; },
        set: function (token, user) {
          try { $window.localStorage.setItem(KEY, JSON.stringify({ token: token, user: user })); } catch (e) { /* storage unavailable */ }
        },
        setUser: function (user) { this.set(this.get(), user); },
        clear: function () { try { $window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
      };
    }])

    /* ---------- Toast notifications ---------- */
    .factory('Toast', ['$timeout', function ($timeout) {
      var svc = { items: [], seq: 0 };
      function push(type, message) {
        var t = { id: ++svc.seq, type: type, message: message };
        svc.items.push(t);
        $timeout(function () { svc.dismiss(t); }, type === 'error' ? 6000 : 3200);
      }
      svc.success = function (m) { push('success', m); };
      svc.error = function (m) { push('error', m); };
      svc.info = function (m) { push('info', m); };
      svc.dismiss = function (t) {
        var i = svc.items.indexOf(t);
        if (i > -1) { svc.items.splice(i, 1); }
      };
      return svc;
    }])

    /* ---------- $http interceptor: Bearer token + 401 handling ---------- */
    .factory('AuthInterceptor', ['$q', '$injector', 'TokenStore', 'API_CONFIG',
      function ($q, $injector, TokenStore, API_CONFIG) {
        function isApi(url) { return url && url.indexOf(API_CONFIG.apiUrl) === 0; }
        return {
          request: function (config) {
            var token = TokenStore.get();
            if (token && isApi(config.url)) {
              config.headers = config.headers || {};
              config.headers.Authorization = 'Bearer ' + token;
            }
            return config;
          },
          responseError: function (rejection) {
            var url = rejection.config && rejection.config.url;
            var isCredentialCall = /\/auth\/(login|register)$/.test(url || '');
            if (rejection.status === 401 && isApi(url) && !isCredentialCall && TokenStore.get()) {
              var AuthService = $injector.get('AuthService');
              AuthService.clear();
              $injector.get('Toast').info('Your session has expired. Please log in again.');
              $injector.get('$location').path('/login');
            }
            return $q.reject(rejection);
          }
        };
      }])

    /* ---------- Thin REST client: one method per backend endpoint ---------- */
    .factory('Api', ['$http', 'API_CONFIG', function ($http, API_CONFIG) {
      var base = API_CONFIG.apiUrl;
      function unwrap(res) { return res.data; }
      function get(path, params) { return $http.get(base + path, { params: params }).then(unwrap); }
      function post(path, body) { return $http.post(base + path, body || {}).then(unwrap); }
      function patch(path, body) { return $http.patch(base + path, body || {}).then(unwrap); }
      function del(path) { return $http.delete(base + path).then(unwrap); }

      return {
        /** Turns any $http failure into a readable message. */
        errorMessage: function (err) {
          if (!err) { return 'Something went wrong. Please try again.'; }
          if (err.status === -1 || err.status === 0) {
            return 'Cannot reach the CraveKart API at ' + base + '. Is the backend running?';
          }
          var d = err.data || {};
          if (d.errors && d.errors.length && d.errors[0].message) { return d.errors[0].message; }
          return d.message || ('Request failed (' + err.status + ').');
        },

        // auth
        login: function (body) { return post('/auth/login', body); },
        register: function (body) { return post('/auth/register', body); },
        me: function () { return get('/auth/me'); },
        updateProfile: function (body) { return patch('/auth/profile', body); },

        // catalogue
        restaurants: function (params) { return get('/restaurants', params); },
        restaurant: function (id) { return get('/restaurants/' + id); },
        createRestaurant: function (body) { return post('/restaurants', body); },
        updateRestaurant: function (id, body) { return patch('/restaurants/' + id, body); },
        approveRestaurant: function (id, isApproved) { return patch('/restaurants/' + id + '/approval', { isApproved: isApproved }); },
        foods: function (params) { return get('/foods', params); },
        createFood: function (body) { return post('/foods', body); },
        updateFood: function (id, body) { return patch('/foods/' + id, body); },
        deleteFood: function (id) { return del('/foods/' + id); },
        categories: function () { return get('/categories'); },
        createCategory: function (body) { return post('/categories', body); },
        deleteCategory: function (id) { return del('/categories/' + id); },

        // cart (customer)
        cart: function () { return get('/cart'); },
        addCartItem: function (foodId, quantity) { return post('/cart/items', { foodId: foodId, quantity: quantity }); },
        updateCartItem: function (itemId, quantity) { return patch('/cart/items/' + itemId, { quantity: quantity }); },
        removeCartItem: function (itemId) { return del('/cart/items/' + itemId); },
        clearCart: function () { return del('/cart'); },

        // addresses, coupons, reviews
        addresses: function () { return get('/addresses'); },
        createAddress: function (body) { return post('/addresses', body); },
        validateCoupon: function (code, subtotal) { return post('/coupons/validate', { code: code, subtotal: subtotal }); },
        coupons: function () { return get('/coupons'); },
        createCoupon: function (body) { return post('/coupons', body); },
        reviews: function (restaurantId) { return get('/reviews/restaurant/' + restaurantId); },
        createReview: function (body) { return post('/reviews', body); },

        // orders
        createOrder: function (body) { return post('/orders', body); },
        myOrders: function () { return get('/orders/my-orders'); },
        restaurantOrders: function () { return get('/orders/restaurant-orders'); },
        adminOrders: function () { return get('/orders/admin/all'); },
        updateOrderStatus: function (id, status) { return patch('/orders/' + id + '/status', { status: status }); },
        cancelOrder: function (id, reason) { return patch('/orders/' + id + '/cancel', { reason: reason }); },

        // admin
        adminDashboard: function () { return get('/admin/dashboard'); },
        adminUsers: function () { return get('/admin/users'); },
        updateUser: function (id, body) { return patch('/admin/users/' + id, body); }
      };
    }]);
})();
