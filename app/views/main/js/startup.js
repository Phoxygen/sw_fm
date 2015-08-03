setTimeout(function() {
  'use strict';

  var kRootPath = '../../';
  var kPaths = {
    configuration: getPath('configuration.json'),
    registrations: getPath('bridge/smuggler.js'),
    client: getPath('bridge/client.js')
  };

  Utils.importScript(kPaths.registrations)
    .then(getConfiguration.bind(null, kPaths.configuration))
    .then(registerServers)
    //.then(registerServiceWorker)
    .then(Utils.importScript.bind(null, kPaths.client))
    .then(registerClients);
    //.then(attachListeners);


  function debug(str) {
    console.log.call(console, '[startup] ', str);
  }

  function getPath(url) {
    return kRootPath + url;
  }

  function getConfiguration(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.send();

    return new Promise(function(resolve, reject) {
      xhr.addEventListener('load', function() {
        resolve(xhr.response);
      });

      xhr.addEventListener('error', function() {
        reject(xhr.statusText);
      });
    });
  }


  function registerServers(configuration) {
    var channel = new BroadcastChannel('smuggler');
    channel.postMessage({
      name: 'config',
      config: configuration
    });
    channel.close();
  }


  function registerClients() {
    window.logicAPI = new Client('logic');
    // we keep a ref to the events server to prevent it from being unloaded
    window.eventAPI = new Client('events');
  }

});

