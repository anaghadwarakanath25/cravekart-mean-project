(function () {
  'use strict';

  var ACTION_LABELS = {
    accepted: 'Accept', rejected: 'Reject', preparing: 'Start preparing', ready: 'Mark ready',
    out_for_delivery: 'Out for delivery', delivered: 'Mark delivered'
  };

  function slugify(s) { return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  function compactMoney(n) { return n >= 100000 ? '₹' + (n / 100000).toFixed(2) + 'L' : money(Math.round(n)); }

  /*
   * One controller drives both portals:
   *   role === 'restaurant' -> /restaurant-panel (own orders, menu, settings)
   *   role === 'admin'      -> /admin-panel (platform stats, all orders, users, restaurants, coupons, categories)
   */
  angular.module('cravekart')
    .controller('OperationsController', ['$q', '$window', 'role', 'Api', 'Catalog', 'AuthService', 'Mappers', 'Toast',
      function ($q, $window, role, Api, Catalog, AuthService, Mappers, Toast) {
        var vm = this;
        var isAdmin = role === 'admin';

        vm.role = role;
        vm.user = AuthService.user;
        vm.today = new Date();
        vm.tab = 'overview';
        vm.loading = true;
        vm.error = '';
        vm.saving = false;

        vm.orders = [];
        vm.foods = [];
        vm.categories = [];
        vm.restaurants = [];       // admin: approved restaurants; restaurant role: this owner's restaurants
        vm.myRestaurant = null;
        vm.users = [];
        vm.coupons = [];
        vm.statCards = [];
        vm.popular = [];

        vm.tabs = isAdmin
          ? [{ id: 'overview', label: 'Overview', icon: 'fa-chart-pie' }, { id: 'orders', label: 'All orders', icon: 'fa-receipt' },
             { id: 'menu', label: 'Food catalogue', icon: 'fa-bowl-food' }, { id: 'customers', label: 'Customers', icon: 'fa-users' },
             { id: 'restaurants', label: 'Restaurants', icon: 'fa-store' }, { id: 'coupons', label: 'Offers & coupons', icon: 'fa-tags' },
             { id: 'categories', label: 'Categories', icon: 'fa-layer-group' }]
          : [{ id: 'overview', label: 'Overview', icon: 'fa-chart-pie' }, { id: 'orders', label: 'Incoming orders', icon: 'fa-receipt' },
             { id: 'menu', label: 'Menu management', icon: 'fa-bowl-food' }, { id: 'settings', label: 'Settings', icon: 'fa-gear' }];

        vm.newFood = { name: '', price: null, description: '', image: '', isVeg: true, isPopular: false, categoryId: '' };
        vm.newRestaurant = { name: '', cuisine: '', area: '', image: '', deliveryFee: 25, eta: 30 };
        vm.newCoupon = { code: '', description: '', discountType: 'percentage', discountValue: null, maxDiscount: null, minOrderValue: 0, usageLimit: 500 };
        vm.newCategory = { name: '' };
        vm.settings = {};
        vm.submittedRestaurant = false;

        vm.greeting = function () {
          var h = new Date().getHours();
          return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        };
        vm.actionLabel = function (s) { return ACTION_LABELS[s] || s; };

        function fail(err) { Toast.error(Api.errorMessage(err)); }
        function done(label) { return function () { Toast.success(label); }; }

        /* ---------- derived dashboard data ---------- */
        function buildSummary(adminStats) {
          if (isAdmin) {
            var s = adminStats || vm.adminStats || {};
            vm.adminStats = s;
            vm.statCards = [
              { label: 'Total orders', value: String(s.orders || 0), icon: 'fa-receipt', tone: 'peach', note: 'Across the platform' },
              { label: 'Gross revenue', value: compactMoney(s.revenue || 0), icon: 'fa-indian-rupee-sign', tone: 'green', note: 'From delivered orders' },
              { label: 'Customers', value: String(s.customers || 0), icon: 'fa-users', tone: 'lavender', note: (s.restaurants || 0) + ' restaurants · ' + (s.foods || 0) + ' dishes' },
              { label: 'Pending approvals', value: String(s.pendingRestaurants || 0), icon: 'fa-clock', tone: 'yellow', note: 'Restaurants awaiting approval' }
            ];
            var byRest = {};
            vm.orders.forEach(function (o) {
              var r = byRest[o.restaurantName || 'Unknown'] = byRest[o.restaurantName || 'Unknown'] || { name: o.restaurantName || 'Unknown', n: 0, sum: 0 };
              r.n++; r.sum += (o.status === 'cancelled' || o.status === 'rejected') ? 0 : o.total;
            });
            vm.popular = Object.keys(byRest).map(function (k) { return byRest[k]; })
              .sort(function (a, b) { return b.n - a.n; }).slice(0, 4)
              .map(function (r) { return { name: r.name, count: r.n + ' order' + (r.n === 1 ? '' : 's'), value: compactMoney(r.sum), icon: 'fa-store' }; });
          } else {
            var delivered = vm.orders.filter(function (o) { return o.status === 'delivered'; });
            var pending = vm.orders.filter(function (o) { return o.status === 'placed'; }).length;
            vm.statCards = [
              { label: 'Total orders', value: String(vm.orders.length), icon: 'fa-receipt', tone: 'peach', note: delivered.length + ' delivered' },
              { label: 'Delivered sales', value: compactMoney(delivered.reduce(function (n, o) { return n + o.total; }, 0)), icon: 'fa-indian-rupee-sign', tone: 'green', note: 'From delivered orders' },
              { label: 'Menu items', value: String(vm.foods.length), icon: 'fa-bowl-food', tone: 'lavender', note: vm.myRestaurant ? vm.myRestaurant.name : 'No restaurant yet' },
              { label: 'New orders', value: String(pending), icon: 'fa-clock', tone: 'yellow', note: 'Waiting for you to accept' }
            ];
            var items = {};
            vm.orders.forEach(function (o) {
              o.items.forEach(function (i) {
                var e = items[i.name] = items[i.name] || { name: i.name, n: 0, price: i.unitPrice };
                e.n += i.quantity;
              });
            });
            vm.popular = Object.keys(items).map(function (k) { return items[k]; })
              .sort(function (a, b) { return b.n - a.n; }).slice(0, 4)
              .map(function (e) { return { name: e.name, count: e.n + ' sold', value: money(e.price), icon: 'fa-bowl-food' }; });
          }
        }

        function setRestaurant(r) {
          vm.myRestaurant = r || null;
          vm.settings = r ? { description: r.description, phone: r.phone, deliveryFee: r.deliveryFee, estimatedDeliveryMinutes: r.eta, isOpen: r.isOpen } : {};
        }

        /* ---------- loading ---------- */
        vm.load = function () {
          vm.loading = true;
          vm.error = '';
          var p;
          if (isAdmin) {
            p = $q.all([Api.adminDashboard(), Api.adminOrders(), Catalog.restaurants(), Catalog.foods(), Catalog.categories(true)])
              .then(function (res) {
                vm.orders = res[1].orders.map(Mappers.order);
                vm.restaurants = res[2];
                vm.foods = res[3];
                vm.categories = res[4];
                buildSummary(res[0].stats);
              });
          } else {
            p = $q.all([Api.restaurantOrders(), Catalog.restaurants(), Catalog.categories(true)]).then(function (res) {
              vm.orders = res[0].orders.map(Mappers.order);
              vm.categories = res[2];
              vm.restaurants = res[1].filter(function (r) { return r.ownerId === vm.user.id; });
              setRestaurant(vm.restaurants[0]);
              return vm.myRestaurant ? Catalog.foods({ restaurant: vm.myRestaurant.id }) : [];
            }).then(function (foods) { vm.foods = foods; buildSummary(); });
          }
          return p.catch(function (err) { vm.error = Api.errorMessage(err); })
            .finally(function () { vm.loading = false; });
        };

        vm.selectRestaurant = function (r) {
          setRestaurant(r);
          Catalog.foods({ restaurant: r.id }).then(function (foods) { vm.foods = foods; buildSummary(); }, fail);
        };

        vm.setTab = function (id) {
          vm.tab = id;
          if (id === 'customers' && !vm.users.length) { vm.loadUsers(); }
          if (id === 'coupons' && !vm.coupons.length) { vm.loadCoupons(); }
        };

        vm.loadUsers = function () { Api.adminUsers().then(function (d) { vm.users = d.users; }, fail); };
        vm.loadCoupons = function () { Api.coupons().then(function (d) { vm.coupons = d.coupons; }, fail); };

        /* ---------- orders ---------- */
        vm.updateStatus = function (order, status) {
          if (status === 'rejected' && !$window.confirm('Reject order #' + order.number + '?')) { return; }
          order.busy = true;
          Api.updateOrderStatus(order.id, status).then(function (d) {
            order.status = d.order.status;
            order.nextStatuses = Mappers.nextStatuses(order.status);
            order.canCancel = ['placed', 'accepted'].indexOf(order.status) > -1;
            buildSummary();
            if (isAdmin) { Api.adminDashboard().then(function (r) { buildSummary(r.stats); }); }
            Toast.success('Order #' + order.number + ' is now ' + order.status.replace(/_/g, ' '));
          }, fail).finally(function () { order.busy = false; });
        };

        vm.downloadReport = function () {
          var rows = [['Order', 'Date', 'Customer', 'Restaurant', 'Items', 'Payment', 'Status', 'Total (INR)']];
          vm.orders.forEach(function (o) {
            rows.push([o.number, new Date(o.date).toISOString(), o.customerName, o.restaurantName, o.itemNames, o.paymentMethod, o.status, o.total]);
          });
          var csv = rows.map(function (r) {
            return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
          }).join('\r\n');
          var url = $window.URL.createObjectURL(new $window.Blob([csv], { type: 'text/csv;charset=utf-8' }));
          var a = $window.document.createElement('a');
          a.href = url; a.download = 'cravekart-orders-' + new Date().toISOString().slice(0, 10) + '.csv';
          $window.document.body.appendChild(a); a.click(); $window.document.body.removeChild(a);
          $window.URL.revokeObjectURL(url);
        };

        /* ---------- menu / food ---------- */
        vm.addFood = function (form) {
          if (form.$invalid || !vm.myRestaurant) { Toast.error('Enter a name and a price.'); return; }
          var f = vm.newFood;
          vm.saving = true;
          Api.createFood({
            restaurant: vm.myRestaurant.id, name: f.name, price: Number(f.price), description: f.description,
            image: f.image, isVeg: f.isVeg, isPopular: f.isPopular, category: f.categoryId || null
          }).then(function () {
            vm.newFood = { name: '', price: null, description: '', image: '', isVeg: true, isPopular: false, categoryId: '' };
            form.$setPristine(); form.$setUntouched();
            Toast.success('Dish added to your menu');
            return Catalog.foods({ restaurant: vm.myRestaurant.id }).then(function (foods) { vm.foods = foods; buildSummary(); });
          }, fail).finally(function () { vm.saving = false; });
        };
        vm.togglePopular = function (food) {
          Api.updateFood(food.id, { isPopular: !food.popular }).then(function () { food.popular = !food.popular; }, fail);
        };
        vm.editPrice = function (food) {
          var v = $window.prompt('New price for ' + food.name + ' (₹):', food.price);
          if (v === null) { return; }
          var price = Number(v);
          if (!isFinite(price) || price < 0 || v.trim() === '') { Toast.error('Enter a valid price.'); return; }
          Api.updateFood(food.id, { price: price }).then(function () { food.price = price; Toast.success('Price updated'); }, fail);
        };
        vm.removeFood = function (food) {
          if (!$window.confirm('Delete "' + food.name + '"?')) { return; }
          Api.deleteFood(food.id).then(function () {
            vm.foods = vm.foods.filter(function (f) { return f.id !== food.id; });
            if (isAdmin && vm.adminStats && vm.adminStats.foods) { vm.adminStats.foods--; }
            buildSummary();
            Toast.success('Dish deleted');
          }, fail);
        };

        /* ---------- restaurant settings / registration ---------- */
        vm.saveSettings = function () {
          vm.saving = true;
          var s = vm.settings;
          Api.updateRestaurant(vm.myRestaurant.id, {
            description: s.description, phone: s.phone, deliveryFee: Number(s.deliveryFee),
            estimatedDeliveryMinutes: Number(s.estimatedDeliveryMinutes), isOpen: !!s.isOpen
          }).then(function (d) {
            var updated = Mappers.restaurant(d.restaurant);
            angular.extend(vm.myRestaurant, updated);
            Toast.success('Restaurant settings saved');
          }, fail).finally(function () { vm.saving = false; });
        };

        vm.registerRestaurant = function (form) {
          if (form.$invalid) { Toast.error('Enter a restaurant name and area.'); return; }
          var r = vm.newRestaurant;
          vm.saving = true;
          Api.createRestaurant({
            name: r.name, cuisine: r.cuisine.split(',').map(function (c) { return c.trim(); }).filter(Boolean),
            image: r.image, coverImage: r.image, address: { area: r.area },
            deliveryFee: Number(r.deliveryFee), estimatedDeliveryMinutes: Number(r.eta)
          }).then(function () {
            vm.submittedRestaurant = true;
            Toast.success('Restaurant submitted for approval');
          }, fail).finally(function () { vm.saving = false; });
        };

        /* ---------- admin: users, restaurants, coupons, categories ---------- */
        vm.toggleUser = function (u) {
          Api.updateUser(u._id, { isActive: !u.isActive }).then(function (d) { u.isActive = d.user.isActive; Toast.success(u.isActive ? 'User activated' : 'User deactivated'); }, fail);
        };
        vm.changeRole = function (u) {
          Api.updateUser(u._id, { role: u.role }).then(done('Role updated'), function (err) { fail(err); vm.loadUsers(); });
        };
        vm.isSelf = function (u) { return u._id === vm.user.id; };

        vm.revokeApproval = function (r) {
          if (!$window.confirm('Remove ' + r.name + ' from the public listing?')) { return; }
          Api.approveRestaurant(r.id, false).then(function () {
            vm.restaurants = vm.restaurants.filter(function (x) { return x.id !== r.id; });
            Toast.success(r.name + ' is no longer listed');
          }, fail);
        };

        vm.createCoupon = function (form) {
          if (form.$invalid) { Toast.error('Enter a code and a discount value.'); return; }
          var c = vm.newCoupon;
          vm.saving = true;
          Api.createCoupon({
            code: c.code, description: c.description, discountType: c.discountType, discountValue: Number(c.discountValue),
            maxDiscount: c.maxDiscount === null || c.maxDiscount === '' ? null : Number(c.maxDiscount),
            minOrderValue: Number(c.minOrderValue) || 0, usageLimit: Number(c.usageLimit) || 1000
          }).then(function () {
            vm.newCoupon = { code: '', description: '', discountType: 'percentage', discountValue: null, maxDiscount: null, minOrderValue: 0, usageLimit: 500 };
            form.$setPristine(); form.$setUntouched();
            Toast.success('Coupon created');
            vm.loadCoupons();
          }, fail).finally(function () { vm.saving = false; });
        };

        vm.createCategory = function (form) {
          if (form.$invalid) { return; }
          Api.createCategory({ name: vm.newCategory.name.trim(), slug: slugify(vm.newCategory.name) }).then(function () {
            vm.newCategory = { name: '' };
            form.$setPristine(); form.$setUntouched();
            Toast.success('Category added');
            return Catalog.categories(true).then(function (c) { vm.categories = c; });
          }, fail);
        };
        vm.removeCategory = function (c) {
          if (!$window.confirm('Deactivate category "' + c.name + '"?')) { return; }
          Api.deleteCategory(c.id).then(function () {
            return Catalog.categories(true).then(function (cs) { vm.categories = cs; Toast.success('Category deactivated'); });
          }, fail);
        };

        vm.load();
      }]);
})();
