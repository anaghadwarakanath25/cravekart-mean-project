(function () {
  'use strict';

  /*
   * CartService
   *  - Logged-in customer  -> the cart lives on the server (/api/cart).
   *  - Guest (not logged in) -> the cart lives in localStorage and is merged into the
   *    server cart as soon as the user logs in.
   *  - Restaurant / admin accounts cannot order (the API only allows customers).
   * The server always recalculates prices at checkout; totals shown here are estimates.
   */
  angular.module('cravekart')
    .factory('CartService', ['$rootScope', '$q', '$window', 'Api', 'AuthService', 'Catalog', 'Toast', 'API_CONFIG',
      function ($rootScope, $q, $window, Api, AuthService, Catalog, Toast, API_CONFIG) {

        var GUEST_KEY = 'cravekart-guest-cart';
        var MAX_QTY = 20;
        var OTHER_RESTAURANT = 'Your cart has items from another restaurant. Clear the cart and add this item?';

        var svc = {
          lines: [], restaurant: null,
          loading: false, busy: false,
          count: 0, subtotal: 0, deliveryFee: 0, tax: 0, total: 0
        };

        function round2(n) { return Math.round(n * 100) / 100; }

        function recalc() {
          svc.count = svc.lines.reduce(function (n, l) { return n + l.quantity; }, 0);
          svc.subtotal = svc.lines.reduce(function (n, l) { return n + l.food.price * l.quantity; }, 0);
          svc.deliveryFee = svc.lines.length && svc.restaurant ? (svc.restaurant.deliveryFee || 0) : 0;
          svc.tax = round2(svc.subtotal * API_CONFIG.taxRate);
          svc.total = round2(svc.subtotal + svc.deliveryFee + svc.tax);
        }

        function reset() { svc.lines = []; svc.restaurant = null; recalc(); }

        svc.isServerCart = function () { return AuthService.hasRole('customer'); };
        svc.isBlocked = function () { return AuthService.isLoggedIn() && !AuthService.hasRole('customer'); };

        /* ---------- server cart ---------- */
        function applyServer(cart) {
          cart = cart || {};
          svc.restaurant = cart.restaurant ? {
            id: cart.restaurant._id, name: cart.restaurant.name,
            deliveryFee: cart.restaurant.deliveryFee || 0, isOpen: cart.restaurant.isOpen !== false
          } : null;
          svc.lines = (cart.items || []).filter(function (i) { return i.food; }).map(function (i) {
            return {
              key: i._id, itemId: i._id, quantity: i.quantity,
              food: {
                id: i.food._id, name: i.food.name, image: i.food.image || '', price: i.food.price,
                isVeg: i.food.isVeg !== false, available: i.food.isAvailable !== false,
                restaurantName: svc.restaurant ? svc.restaurant.name : ''
              }
            };
          });
          recalc();
        }

        /* ---------- guest cart ---------- */
        function readGuest() {
          try { return JSON.parse($window.localStorage.getItem(GUEST_KEY)) || { restaurant: null, lines: [] }; }
          catch (e) { return { restaurant: null, lines: [] }; }
        }
        function writeGuest() {
          try { $window.localStorage.setItem(GUEST_KEY, JSON.stringify({ restaurant: svc.restaurant, lines: svc.lines })); } catch (e) { /* ignore */ }
        }
        function applyGuest() {
          var g = readGuest();
          svc.restaurant = g.restaurant;
          svc.lines = g.lines || [];
          recalc();
          // The delivery fee isn't part of a food document, so fetch it once for the guest cart's restaurant.
          if (svc.restaurant && svc.restaurant.deliveryFee == null) {
            var rid = svc.restaurant.id;
            Catalog.restaurant(rid).then(function (r) {
              if (svc.restaurant && svc.restaurant.id === rid) {
                svc.restaurant.deliveryFee = r.deliveryFee;
                svc.restaurant.isOpen = r.isOpen;
                writeGuest(); recalc();
              }
            });
          }
        }
        function clearGuestStorage() { try { $window.localStorage.removeItem(GUEST_KEY); } catch (e) { /* ignore */ } }

        /* ---------- public API ---------- */
        svc.load = function () {
          if (svc.isServerCart()) {
            svc.loading = true;
            return Api.cart().then(function (d) { applyServer(d.cart); }, function (err) {
              Toast.error(Api.errorMessage(err));
            }).finally(function () { svc.loading = false; });
          }
          if (svc.isBlocked()) { reset(); return $q.when(); }
          applyGuest();
          return $q.when();
        };

        svc.add = function (food, qty) {
          qty = qty || 1;
          if (svc.isBlocked()) {
            Toast.info('Please log in with a customer account to order food.');
            return $q.reject();
          }
          return svc.isServerCart() ? addServer(food, qty, false) : addGuest(food, qty);
        };

        function addedToast(food) { Toast.success(food.name + ' added to cart'); }

        function addServer(food, qty, retried) {
          svc.busy = true;
          return Api.addCartItem(food.id, qty).then(function (d) {
            applyServer(d.cart); addedToast(food);
          }, function (err) {
            if (err.status === 409 && !retried && $window.confirm(OTHER_RESTAURANT)) {
              return Api.clearCart().then(function () { return addServer(food, qty, true); });
            }
            if (err.status !== 409) { Toast.error(Api.errorMessage(err)); }
            return $q.reject(err);
          }).finally(function () { svc.busy = false; });
        }

        function addGuest(food, qty) {
          if (svc.restaurant && svc.restaurant.id !== food.restaurantId) {
            if (!$window.confirm(OTHER_RESTAURANT)) { return $q.reject(); }
            reset();
          }
          if (!svc.restaurant) { svc.restaurant = { id: food.restaurantId, name: food.restaurantName, deliveryFee: null }; }
          var existing = svc.lines.filter(function (l) { return l.food.id === food.id; })[0];
          if (existing) { existing.quantity = Math.min(MAX_QTY, existing.quantity + qty); }
          else {
            svc.lines.push({
              key: food.id, quantity: qty,
              food: { id: food.id, name: food.name, image: food.image, price: food.price, isVeg: food.isVeg, restaurantName: food.restaurantName }
            });
          }
          writeGuest(); applyGuest(); addedToast(food);
          return $q.when();
        }

        svc.setQuantity = function (line, qty) {
          if (qty < 1) { return svc.remove(line); }
          qty = Math.min(MAX_QTY, qty);
          if (!svc.isServerCart()) { line.quantity = qty; writeGuest(); recalc(); return $q.when(); }
          svc.busy = true;
          return Api.updateCartItem(line.itemId, qty).then(function (d) { applyServer(d.cart); }, function (err) {
            Toast.error(Api.errorMessage(err));
          }).finally(function () { svc.busy = false; });
        };

        svc.remove = function (line) {
          if (!svc.isServerCart()) {
            svc.lines = svc.lines.filter(function (l) { return l !== line; });
            if (!svc.lines.length) { svc.restaurant = null; }
            writeGuest(); recalc(); return $q.when();
          }
          svc.busy = true;
          return Api.removeCartItem(line.itemId).then(function (d) { applyServer(d.cart); }, function (err) {
            Toast.error(Api.errorMessage(err));
          }).finally(function () { svc.busy = false; });
        };

        svc.clear = function () {
          if (!svc.isServerCart()) { reset(); clearGuestStorage(); return $q.when(); }
          svc.busy = true;
          return Api.clearCart().then(reset, function (err) {
            Toast.error(Api.errorMessage(err));
          }).finally(function () { svc.busy = false; });
        };

        /** Called after a successful order (the server empties its own cart). */
        svc.afterOrder = function () { reset(); clearGuestStorage(); };

        /* Move guest items into the server cart right after a customer logs in. */
        function mergeGuestCart() {
          var guest = readGuest();
          if (!guest.lines || !guest.lines.length) { return svc.load(); }
          var skipped = 0;
          var chain = guest.lines.reduce(function (p, line) {
            return p.then(function () {
              return Api.addCartItem(line.food.id, line.quantity).catch(function () { skipped++; });
            });
          }, $q.when());
          return chain.then(function () {
            clearGuestStorage();
            if (skipped) { Toast.info('Some saved items could not be added because your account cart is from another restaurant.'); }
            return svc.load();
          });
        }

        $rootScope.$on('auth:login', function () {
          if (svc.isServerCart()) { mergeGuestCart(); } else { svc.load(); }
        });
        $rootScope.$on('auth:logout', function () { reset(); svc.load(); });

        recalc();
        return svc;
      }]);
})();
