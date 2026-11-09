(function () {
  'use strict';

  angular.module('cravekart')
    .controller('CheckoutController', ['$location', 'Api', 'AuthService', 'CartService', 'Toast', 'API_CONFIG',
      function ($location, Api, AuthService, CartService, Toast, API_CONFIG) {
        var vm = this;
        var user = AuthService.user || {};

        vm.cart = CartService;
        vm.payment = 'COD';
        vm.addresses = [];
        vm.selectedAddressId = null;
        vm.saveAddress = true;
        vm.form = {
          recipientName: user.name || '', phone: /^[0-9]{10}$/.test(user.phone || '') ? user.phone : '',
          line1: '', area: '', landmark: '',
          city: API_CONFIG.defaultCity, state: API_CONFIG.defaultState, postalCode: '', notes: ''
        };

        vm.couponCode = '';
        vm.coupon = null;
        vm.discount = 0;
        vm.couponError = '';
        vm.couponBusy = false;
        vm.placing = false;
        vm.error = '';
        vm.order = null;      // set after a successful order -> shows the confirmation modal

        CartService.load();
        Api.addresses().then(function (d) {
          vm.addresses = d.addresses;
          var def = d.addresses.filter(function (a) { return a.isDefault; })[0] || d.addresses[0];
          if (def) { vm.useAddress(def); }
        }, function () { /* saved addresses are optional */ });

        vm.useAddress = function (a) {
          vm.selectedAddressId = a._id;
          vm.saveAddress = false;
          vm.form.recipientName = a.recipientName; vm.form.phone = a.phone; vm.form.line1 = a.line1;
          vm.form.area = a.area; vm.form.landmark = a.landmark || ''; vm.form.city = a.city;
          vm.form.state = a.state; vm.form.postalCode = a.postalCode;
        };
        vm.useNewAddress = function () { vm.selectedAddressId = null; vm.saveAddress = true; };

        vm.total = function () {
          return Math.max(0, Math.round((CartService.subtotal + CartService.deliveryFee + CartService.tax - vm.discount) * 100) / 100);
        };

        vm.applyCoupon = function () {
          var code = (vm.couponCode || '').trim();
          vm.couponError = '';
          if (!code) { return; }
          vm.couponBusy = true;
          Api.validateCoupon(code, CartService.subtotal).then(function (d) {
            vm.coupon = d.coupon;
            vm.discount = d.discount;
            Toast.success('Coupon ' + d.coupon.code + ' applied');
          }, function (err) {
            vm.coupon = null; vm.discount = 0;
            vm.couponError = Api.errorMessage(err);
          }).finally(function () { vm.couponBusy = false; });
        };
        vm.removeCoupon = function () { vm.coupon = null; vm.discount = 0; vm.couponCode = ''; vm.couponError = ''; };

        vm.placeOrder = function (form) {
          vm.error = '';
          if (form.$invalid) { vm.error = 'Please complete the highlighted delivery details.'; return; }
          vm.placing = true;
          var body = {
            deliveryAddress: {
              recipientName: vm.form.recipientName, phone: vm.form.phone, line1: vm.form.line1, landmark: vm.form.landmark,
              area: vm.form.area, city: vm.form.city, state: vm.form.state, postalCode: vm.form.postalCode
            },
            paymentMethod: vm.payment,
            couponCode: vm.coupon ? vm.coupon.code : '',
            notes: vm.form.notes
          };
          Api.createOrder(body).then(function (d) {
            vm.order = d.order;
            CartService.afterOrder();
            if (vm.saveAddress && !vm.selectedAddressId) {
              Api.createAddress(angular.extend({ label: 'Home', isDefault: !vm.addresses.length }, body.deliveryAddress));
            }
          }, function (err) { vm.error = Api.errorMessage(err); }).finally(function () { vm.placing = false; });
        };

        vm.finish = function () { $location.path('/dashboard'); };
      }]);
})();
