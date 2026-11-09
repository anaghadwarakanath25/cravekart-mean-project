/*
 * Demo mode switch: when API_CONFIG.useMock is true, requests to the API URL are answered
 * by js/mock/mock-server.js inside the browser instead of going over the network.
 * Every other request (fonts, images, view templates) is passed through untouched.
 */
(function () {
  'use strict';

  angular.module('cravekart').config(['$provide', 'API_CONFIG', function ($provide, API_CONFIG) {
    if (!API_CONFIG.useMock) { return; }

    $provide.decorator('$httpBackend', ['$delegate', function ($delegate) {
      function mockBackend(method, url, data, callback, headers) {
        if (url.indexOf(API_CONFIG.apiUrl) !== 0) { return $delegate.apply(this, arguments); }
        var res;
        try {
          res = window.CraveKartMock.handle(method, url.slice(API_CONFIG.apiUrl.length), data, headers);
        } catch (e) {
          res = { status: 500, body: { success: false, message: 'Demo server error: ' + e.message } };
        }
        setTimeout(function () {
          callback(res.status, JSON.stringify(res.body), 'Content-Type: application/json\n', '');
        }, 120);                                   // small delay so loading states are visible
      }
      return angular.extend(mockBackend, $delegate);
    }]);
  }]);
})();
