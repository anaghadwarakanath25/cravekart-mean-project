(function () {
  'use strict';

  angular.module('cravekart')
    .controller('AuthController', ['$location', '$routeParams', 'mode', 'Api', 'AuthService', 'Toast',
      function ($location, $routeParams, mode, Api, AuthService, Toast) {
        var vm = this;
        vm.mode = mode;                       // 'login' | 'register'
        vm.showPassword = false;
        vm.busy = false;
        vm.error = '';
        vm.f = { name: '', email: '', phone: '', password: '', confirm: '' };

        // Already signed in? Go straight to the right portal.
        if (AuthService.isLoggedIn()) { $location.path(AuthService.homePath()).search({}); }

        // Demo accounts created by `npm run seed` in /backend (local development only).
        vm.demoAccounts = [
          { label: 'Customer', email: 'customer@cravekart.local', password: 'Customer@12345' },
          { label: 'Restaurant', email: 'owner@cravekart.local', password: 'Owner@12345' },
          { label: 'Admin', email: 'admin@cravekart.local', password: 'Admin@12345' }
        ];
        vm.fillDemo = function (a) { vm.f.email = a.email; vm.f.password = a.password; vm.error = ''; };

        function afterAuth(user) {
          Toast.success('Welcome, ' + user.name.split(' ')[0] + '!');
          var next = $routeParams.next;
          // only follow internal paths, and only ones this role may open
          var safe = next && next.charAt(0) === '/' && next.indexOf('//') !== 0 && user.role === 'customer';
          $location.url(safe ? next : AuthService.homePath());
        }

        vm.submit = function (form) {
          vm.error = '';
          if (form.$invalid) { vm.error = 'Please check the highlighted fields.'; return; }
          if (mode === 'register' && vm.f.password !== vm.f.confirm) { vm.error = 'Passwords do not match.'; return; }
          vm.busy = true;
          var request = mode === 'login'
            ? AuthService.login(vm.f.email, vm.f.password)
            : AuthService.register({ name: vm.f.name, email: vm.f.email, phone: vm.f.phone, password: vm.f.password });
          request.then(afterAuth, function (err) { vm.error = Api.errorMessage(err); })
            .finally(function () { vm.busy = false; });
        };
      }]);
})();
