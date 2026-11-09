(function () {
  'use strict';

  angular.module('cravekart')
    .controller('DashboardController', ['$location', 'Api', 'AuthService', 'Mappers', 'Toast',
      function ($location, Api, AuthService, Mappers, Toast) {
        var vm = this;
        vm.auth = AuthService;
        vm.orders = [];
        vm.loading = true;
        vm.error = '';
        vm.review = null;        // { order, rating, comment, busy }

        vm.load = function () {
          vm.loading = true;
          vm.error = '';
          Api.myOrders().then(function (d) {
            vm.orders = d.orders.map(Mappers.order);
          }, function (err) { vm.error = Api.errorMessage(err); })
            .finally(function () { vm.loading = false; });
        };

        vm.cancel = function (order) {
          if (!window.confirm('Cancel order #' + order.number + '?')) { return; }
          order.busy = true;
          Api.cancelOrder(order.id, 'Cancelled by customer').then(function (d) {
            angular.extend(order, Mappers.order(angular.extend({}, d.order, { restaurant: { _id: order.restaurantId, name: order.restaurantName } })));
            Toast.success('Order cancelled');
          }, function (err) { Toast.error(Api.errorMessage(err)); })
            .finally(function () { order.busy = false; });
        };

        vm.openReview = function (order) { vm.review = { order: order, rating: 5, comment: '', busy: false }; };
        vm.closeReview = function () { vm.review = null; };
        vm.submitReview = function () {
          var r = vm.review;
          r.busy = true;
          Api.createReview({ orderId: r.order.id, rating: r.rating, comment: r.comment }).then(function () {
            r.order.reviewed = true;
            vm.review = null;
            Toast.success('Thanks for your review!');
          }, function (err) {
            Toast.error(Api.errorMessage(err));
            r.busy = false;
          });
        };

        vm.logout = function () {
          AuthService.logout();
          $location.path('/');
        };

        vm.load();
      }]);
})();
