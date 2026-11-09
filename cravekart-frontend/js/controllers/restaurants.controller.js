(function () {
  'use strict';

  angular.module('cravekart')
    .controller('RestaurantsController', ['$q', '$routeParams', 'Api', 'Catalog', 'CartService',
      function ($q, $routeParams, Api, Catalog, CartService) {
        var vm = this;
        var allRestaurants = [], allFoods = [];

        vm.search = $routeParams.search || '';
        vm.selectedCategories = $routeParams.category ? [$routeParams.category] : [];
        vm.vegOnly = false;
        vm.minRating = 0;
        vm.sortBy = 'recommended';
        vm.categories = [];        // filter options built from API categories + restaurant cuisines
        vm.restaurants = [];
        vm.foods = [];
        vm.loading = true;
        vm.error = '';

        function has(text, needle) { return String(text || '').toLowerCase().indexOf(needle.toLowerCase()) > -1; }

        vm.refresh = function () {
          var q = vm.search.trim();
          var cats = vm.selectedCategories;

          var restaurants = allRestaurants.filter(function (r) {
            if (q && !(has(r.name, q) || has(r.cuisineText, q) || has(r.area, q))) { return false; }
            if (r.rating < vm.minRating) { return false; }
            if (cats.length) {
              var match = cats.some(function (c) {
                return has(r.cuisineText, c) || allFoods.some(function (f) { return f.restaurantId === r.id && f.category === c; });
              });
              if (!match) { return false; }
            }
            return true;
          });
          if (vm.sortBy === 'rating') { restaurants.sort(function (a, b) { return b.rating - a.rating; }); }
          if (vm.sortBy === 'fast') { restaurants.sort(function (a, b) { return a.eta - b.eta; }); }
          vm.restaurants = restaurants;

          vm.foods = allFoods.filter(function (f) {
            if (q && !(has(f.name, q) || has(f.category, q) || has(f.restaurantName, q))) { return false; }
            if (cats.length && !cats.some(function (c) { return has(f.category, c); })) { return false; }
            if (vm.vegOnly && !f.isVeg) { return false; }
            return f.restaurantRating >= vm.minRating;
          });
        };

        vm.isSelected = function (cat) { return vm.selectedCategories.indexOf(cat) > -1; };
        vm.toggleCategory = function (cat) {
          var i = vm.selectedCategories.indexOf(cat);
          if (i > -1) { vm.selectedCategories.splice(i, 1); } else { vm.selectedCategories.push(cat); }
          vm.refresh();
        };
        vm.clearFilters = function () {
          vm.search = ''; vm.selectedCategories = []; vm.vegOnly = false; vm.minRating = 0; vm.sortBy = 'recommended';
          vm.refresh();
        };
        vm.add = function (food) { CartService.add(food); };

        vm.load = function () {
          vm.loading = true;
          vm.error = '';
          $q.all([Catalog.categories(), Catalog.restaurants(), Catalog.foods()])
            .then(function (res) {
              allRestaurants = res[1];
              allFoods = res[2];
              var names = res[0].map(function (c) { return c.name; });
              allRestaurants.forEach(function (r) {
                r.cuisine.forEach(function (c) {
                  if (!names.some(function (n) { return n.toLowerCase() === c.toLowerCase(); })) { names.push(c); }
                });
              });
              // keep a category passed in via the URL selectable even if the API doesn't list it
              vm.selectedCategories.forEach(function (c) { if (names.indexOf(c) === -1) { names.push(c); } });
              vm.categories = names;
              vm.refresh();
            })
            .catch(function (err) { vm.error = Api.errorMessage(err); })
            .finally(function () { vm.loading = false; });
        };

        vm.load();
      }]);
})();
