(function () {
  'use strict';

  angular.module('cravekart')
    .controller('RestaurantDetailController', ['$q', '$routeParams', 'Api', 'Catalog', 'CartService',
      function ($q, $routeParams, Api, Catalog, CartService) {
        var vm = this;
        vm.restaurant = null;
        vm.menu = [];
        vm.reviews = [];
        vm.loading = true;
        vm.error = '';

        vm.add = function (food) { CartService.add(food); };
        vm.stars = function (n) { return new Array(Math.max(0, Math.min(5, n || 0))); };

        vm.load = function () {
          vm.loading = true;
          vm.error = '';
          var id = $routeParams.id;
          $q.all([
            Catalog.restaurant(id),
            Catalog.foods({ restaurant: id }),
            Catalog.reviews(id).catch(function () { return []; })    // reviews are optional
          ]).then(function (res) {
            vm.restaurant = res[0];
            vm.menu = res[1];
            vm.reviews = res[2];
          }).catch(function (err) {
            vm.error = err && err.status === 404 ? 'We could not find that restaurant.' : Api.errorMessage(err);
          }).finally(function () { vm.loading = false; });
        };

        vm.load();
      }]);
})();
