(function () {
  'use strict';

  angular.module('cravekart', ['ngRoute'])

    .constant('API_CONFIG', window.CRAVEKART_CONFIG)

    .config(['$routeProvider', '$httpProvider', '$locationProvider',
      function ($routeProvider, $httpProvider, $locationProvider) {

        // AngularJS 1.6+ defaults to "#!/" – use plain "#/" URLs instead.
        $locationProvider.hashPrefix('');
        $httpProvider.interceptors.push('AuthInterceptor');

        function page(template, controller, title, extra) {
          return angular.extend({
            templateUrl: 'views/' + template + '.html',
            controller: controller,
            controllerAs: 'vm',
            title: title
          }, extra || {});
        }

        $routeProvider
          .when('/', page('home', 'HomeController', 'Home'))
          .when('/restaurants', page('restaurants', 'RestaurantsController', 'Explore Restaurants'))
          .when('/restaurants/:id', page('restaurant-detail', 'RestaurantDetailController', 'Restaurant Menu'))
          .when('/cart', page('cart', 'CartController', 'Your Cart'))
          .when('/checkout', page('checkout', 'CheckoutController', 'Checkout', { access: ['customer'] }))
          .when('/login', page('auth', 'AuthController', 'Login', { resolve: { mode: function () { return 'login'; } } }))
          .when('/register', page('auth', 'AuthController', 'Create Account', { resolve: { mode: function () { return 'register'; } } }))
          .when('/dashboard', page('dashboard', 'DashboardController', 'My Orders', { access: ['customer'] }))
          .when('/restaurant-panel', page('operations', 'OperationsController', 'Restaurant Portal', {
            access: ['restaurant'], resolve: { role: function () { return 'restaurant'; } }
          }))
          .when('/admin-panel', page('operations', 'OperationsController', 'Admin Portal', {
            access: ['admin'], resolve: { role: function () { return 'admin'; } }
          }))
          .otherwise({ redirectTo: '/' });
      }])

    .run(['$rootScope', '$location', '$window', 'AuthService', 'CartService', 'Toast',
      function ($rootScope, $location, $window, AuthService, CartService, Toast) {

        // Route guard: routes with an `access` array need a logged-in user with one of those roles.
        $rootScope.$on('$routeChangeStart', function (event, next) {
          var roles = next && next.access;
          if (!roles) { return; }
          if (!AuthService.isLoggedIn()) {
            $location.path('/login').search({ next: $location.path() });
            return;
          }
          if (!AuthService.hasRole.apply(AuthService, roles)) {
            Toast.error('You do not have access to that page.');
            $location.path(AuthService.homePath()).search({});
          }
        });

        $rootScope.$on('$routeChangeSuccess', function (event, current) {
          $rootScope.pageTitle = (current && current.title ? current.title + ' | ' : '') + 'CraveKart';
          $window.scrollTo(0, 0);
        });

        // Refresh the signed-in user from the API once on startup (also validates the stored token).
        AuthService.refresh();
        CartService.load();
      }]);
})();
