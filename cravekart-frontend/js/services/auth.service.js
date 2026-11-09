(function () {
  'use strict';

  angular.module('cravekart')
    .factory('AuthService', ['$rootScope', 'Api', 'TokenStore', function ($rootScope, Api, TokenStore) {

      var svc = { user: TokenStore.user() };

      function normalise(u) {
        if (!u) { return null; }
        return { id: u.id || u._id, name: u.name, email: u.email, phone: u.phone || '', role: u.role };
      }

      svc.isLoggedIn = function () { return !!(svc.user && TokenStore.get()); };
      svc.hasRole = function () {
        var roles = Array.prototype.slice.call(arguments);
        return svc.isLoggedIn() && roles.indexOf(svc.user.role) > -1;
      };
      svc.homePath = function () {
        if (!svc.isLoggedIn()) { return '/'; }
        return { admin: '/admin-panel', restaurant: '/restaurant-panel' }[svc.user.role] || '/dashboard';
      };
      svc.initials = function () {
        if (!svc.user || !svc.user.name) { return '?'; }
        return svc.user.name.split(' ').filter(Boolean).map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase();
      };

      function startSession(data) {
        svc.user = normalise(data.user);
        TokenStore.set(data.token, svc.user);
        $rootScope.$broadcast('auth:login', svc.user);
        return svc.user;
      }

      svc.login = function (email, password) {
        return Api.login({ email: email, password: password }).then(startSession);
      };
      svc.register = function (details) {
        return Api.register(details).then(startSession);
      };

      /** Clears local session state without calling the API (JWT is stateless). */
      svc.clear = function () {
        svc.user = null;
        TokenStore.clear();
        $rootScope.$broadcast('auth:logout');
      };
      svc.logout = svc.clear;

      /** Re-validates the stored token against /auth/me and refreshes the cached profile. */
      svc.refresh = function () {
        if (!TokenStore.get()) { return; }
        return Api.me().then(function (data) {
          svc.user = normalise(data.user);
          TokenStore.setUser(svc.user);
        }, function (err) {
          // 401 is handled by the interceptor; ignore network errors so the user stays signed in offline.
          return err;
        });
      };

      svc.updateProfile = function (body) {
        return Api.updateProfile(body).then(function (data) {
          svc.user = normalise(data.user);
          TokenStore.setUser(svc.user);
          return svc.user;
        });
      };

      return svc;
    }]);
})();
