setTimeout(function() {
  'use strict';

  var kRootPath = './';
  var kPaths = {
    registrations: getPath('bridge/smuggler.js'),
    client: getPath('bridge/client.js')
  };

  importScript(kPaths.registrations)
    .then(importScript.bind(null, kPaths.client))
    .then(registerClients);

  function importScript(src) {
    var script = document.createElement('script');
    script.src = src;
    document.head.appendChild(script);

    return new Promise(function(resolve, reject) {
      script.addEventListener('load', resolve);
      script.addEventListener('error', reject);
    });
  }

  function debug(str) {
    console.log.call(console, '[startup] ', str);
  }

  function getPath(url) {
    return kRootPath + url;
  }

  function registerClients() {
    window.logicAPI = new Client('logic');
  }

});

