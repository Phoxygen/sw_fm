(function() {
  'use strict';

  var server;
  var client;

  function debug(str, args) {
    console.log.bind(console, '[smuggler]').apply(console, arguments);
  };

  function getServer(url) {
    var w = document.createElement('iframe');
    w.hidden = true;
    w.src = url;

    setTimeout(function() {
      document.body.appendChild(w);
    });

    return {
      postMessage: function(msg) {
        debug('postmessage ready');
        w.contentWindow.postMessage(msg, '*');
      },
      terminate: function() {
        document.body.removeChild(w);
        w = null;
      }
    };
  };

  var channel = new BroadcastChannel('smuggler');
  channel.onmessage = function(msg) {
    switch (msg.data.name) {
      case 'register':
        register(msg.data);
        break;

      case 'unregister':
        unregister(msg.data);
        break;

      default:
        throw new Error('Not Implemented: ' + msg.data.name);
        break;
    }
  };


  // TODO: Add version support
  var kEmptyRegistration = 'Empty registration are not allowed.';
  function register(registration) {
    if (!registration) {
      throw new Error(kEmptyRegistration);
    }

    switch (registration.type) {
      case 'client':
        client = registration.uuid;
        server = getServer('servers/index.html');
        server.registered = false;

        break;

      case 'server':

        // start can fail
        if (server) {
          server.postMessage({ type: 'register' });
          server.ready = true;
        }

        break;

      default:
        throw new Error(registration.type + ': ' + kUnknowRegistrationType);
        break;
    }
  };

  function unregister(registration) {

    switch (registration.type) {
      case 'client':
        debug('Unregistering client');
        // unregister in the smuggler
        client = null;
        if (server && server.ready) {
          // unregister in the server
          server.postMessage({ type: 'unregister' });
        }
        break;
      case 'server':
        debug('Unregistering server');
        if (server) {
          server.ready = false;
          server.terminate();
          server = null;
        }
        break;
      default:
        throw new Error(registration.type + ': ' + kUnknowRegistrationType);
        break;
    }
  };

})();

