(function () {
  'use strict';

  angular.module('cravekart')
    .controller('CartController', ['CartService', 'AuthService',
      function (CartService, AuthService) {
        var vm = this;
        vm.cart = CartService;
        vm.auth = AuthService;
        CartService.load();      // always show the freshest server/guest cart
      }]);
})();
