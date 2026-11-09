(function () {
  'use strict';

  var STATUS_LABELS = {
    placed: 'Order placed', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready for pickup',
    out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled', rejected: 'Rejected'
  };

  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='#fff1e8'/>" +
    "<text x='50%' y='53%' font-family='sans-serif' font-size='30' font-weight='700' fill='#f26a38' text-anchor='middle'>CraveKart</text></svg>");

  angular.module('cravekart')

    /* ₹ amounts: whole numbers without decimals, otherwise 2 decimals */
    .filter('inr', ['numberFilter', function (numberFilter) {
      return function (value) {
        var n = Number(value);
        if (!isFinite(n)) { return ''; }
        return numberFilter(n, Math.round(n) === n ? 0 : 2);
      };
    }])

    .filter('orderStatus', function () {
      return function (status) { return STATUS_LABELS[status] || status; };
    })

    /* Image with graceful fallback for empty / broken URLs: <img ck-img="{{url}}"> */
    .directive('ckImg', function () {
      return {
        restrict: 'A',
        link: function (scope, el, attrs) {
          attrs.$observe('ckImg', function (url) { el.attr('src', url || PLACEHOLDER); });
          el.on('error', function () { if (el.attr('src') !== PLACEHOLDER) { el.attr('src', PLACEHOLDER); } });
        }
      };
    })

    .component('ckFoodCard', {
      bindings: { food: '<', onAdd: '&' },
      templateUrl: 'views/components/food-card.html'
    })

    .component('ckRestaurantCard', {
      bindings: { restaurant: '<' },
      templateUrl: 'views/components/restaurant-card.html'
    })

    /* Small reusable loading / error panel */
    .component('ckState', {
      bindings: { loading: '<', error: '<', onRetry: '&' },
      template:
        '<div class="state-box" ng-if="$ctrl.loading"><span class="spinner"></span> Loading…</div>' +
        '<div class="state-box state-error" ng-if="!$ctrl.loading && $ctrl.error">' +
        '<i class="fa-solid fa-triangle-exclamation"></i><p>{{$ctrl.error}}</p>' +
        '<button class="btn btn-primary" ng-click="$ctrl.onRetry()">Try again</button></div>'
    });
})();
