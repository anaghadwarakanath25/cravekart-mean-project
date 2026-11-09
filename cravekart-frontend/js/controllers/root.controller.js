(function () {
  'use strict';

  angular.module('cravekart')
    .controller('RootController', ['$location', 'AuthService', 'CartService', 'Toast', 'API_CONFIG',
      function ($location, AuthService, CartService, Toast, API_CONFIG) {
        var vm = this;
        vm.auth = AuthService;
        vm.cart = CartService;
        vm.toasts = Toast;
        vm.city = API_CONFIG.defaultCity;
        vm.mock = !!API_CONFIG.useMock;

        // Demo mode only: wipe the in-browser database, login and guest cart, then reload.
        vm.resetDemo = function () {
          if (!window.confirm('Reset all demo data (accounts, carts, orders) in this browser?')) { return; }
          window.CraveKartMock.reset();
          ['cravekart-auth', 'cravekart-guest-cart'].forEach(function (k) { window.localStorage.removeItem(k); });
          window.location.hash = '#/';
          window.location.reload();
        };

        vm.isActive = function (path, exact) {
          var current = $location.path();
          return exact ? current === path : current.indexOf(path) === 0;
        };

        vm.logout = function () {
          AuthService.logout();
          Toast.info('You have been logged out.');
          $location.path('/');
        };
      }]);
})();
