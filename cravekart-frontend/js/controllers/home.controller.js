(function () {
  'use strict';

  angular.module('cravekart')
    .controller('HomeController', ['$q', '$location', 'Api', 'Catalog', 'CartService',
      function ($q, $location, Api, Catalog, CartService) {
        var vm = this;
        vm.query = '';
        vm.categories = [];
        vm.restaurants = [];
        vm.foods = [];
        vm.loading = true;
        vm.error = '';

        vm.add = function (food) { CartService.add(food); };
        vm.search = function () { $location.path('/restaurants').search({ search: vm.query }); };
        vm.goCategory = function (name) { $location.path('/restaurants').search({ category: name }); };

        vm.load = function () {
          vm.loading = true;
          vm.error = '';
          $q.all([Catalog.categories(), Catalog.restaurants({ limit: 3 }), Catalog.foods()])
            .then(function (res) {
              vm.categories = res[0];
              vm.restaurants = res[1];
              vm.foods = res[2].slice(0, 4);     // API returns popular dishes first
            })
            .catch(function (err) { vm.error = Api.errorMessage(err); })
            .finally(function () { vm.loading = false; });
        };

        vm.load();
      }]);
})();
