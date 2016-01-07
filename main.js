(function () {
  'use strict';

  var initInjector = angular.injector(["ng"]);
  var $http = initInjector.get("$http");

  var app = angular.module('myApp', ['ng-admin']);

  app.controller('myCtrl', function() {});

  app.config(function(RestangularProvider, $httpProvider) {
      RestangularProvider.addFullRequestInterceptor(function(element, operation, what, url, headers, params, httpConfig) {
          headers = headers || {};
          headers['Prefer'] = 'return=representation';

          if (operation === 'getList') {
              headers['Range-Unit'] = what;
              headers['Range'] = ((params._page - 1) * params._perPage) + '-' + (params._page * params._perPage - 1);
              delete params._page;
              delete params._perPage;

              if (params._sortField) {
                  params.order = params._sortField + '.' + params._sortDir.toLowerCase();
                  delete params._sortField;
                  delete params._sortDir;
              }
          }
      });

      RestangularProvider.addResponseInterceptor(function(data, operation, what, url, response, deferred) {
          switch (operation) {
              case 'get':
                  return data[0];
              case 'getList':
                  response.totalCount = response.headers('Content-Range').split('/')[1];
                  break;
          }

          return data;
      });

      // @see https://github.com/mgonto/restangular/issues/603
      $httpProvider.interceptors.push(function() {
          return {
              request: function(config) {
                  var pattern = /\/(\d+)$/;

                  if (pattern.test(config.url)) {
                      config.params = config.params || {};
                      config.params['id'] = 'eq.' + pattern.exec(config.url)[1];
                      config.url = config.url.replace(pattern, '');
                  }

                  return config;
              },
          };
      });
  });

  fetchData().then(fetchFields).then(bootstrapApplication);

  function fetchData() {
    return $http.get("http://localhost:3000/");
  }

  function fetchFields(response) {
    app.tables = response.data[0];
    // needs to be recursive
    // need to figure out automatic selection of fields for lists vs records
    // should there be tables of views?
    return $http({
      method: 'OPTIONS',
      url: "http://localhost:3000/" + app.tables.name
    });

  }

  function bootstrapApplication(response) {

    var tableName = app.tables.name;

    app.config(function (NgAdminConfigurationProvider) {

      var nga = NgAdminConfigurationProvider;

      var app = nga
         .application('Ng-admin + PostgREST', true)
         .baseApiUrl('http://localhost:3000/');

      var table = nga.entity(tableName);

      app.addEntity(table);

      table.listView()
        .fields(response.data.columns.map(function(col) {
          return nga.field(col.name);
        }));

      nga.configure(app);

  });

  angular.bootstrap(document.getElementsByTagName('body')[0], ["myApp"]);

  }

}());
