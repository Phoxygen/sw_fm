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

  function startServer() {

    // check if a starting or started server
    // is already fullfilling this contract
    if (!server) {
      // otherwise start it
      debug('startServer: Starting server ');
      server = getServer('servers/index.html');
      server.registered = false;
    }

  }

  function registerClientToServer(server, clientUuid) {
    server.postMessage({
      uuid: clientUuid,
      type: 'register'
    });
  }

  function unregisterClientToServer(server, clientUuid) {
    server.postMessage({
      uuid: clientUuid,
      type: 'unregister'
    });
  }

  // TODO: Add version support
  var kEmptyRegistration = 'Empty registration are not allowed.';
  function register(registration) {
    if (!registration) {
      throw new Error(kEmptyRegistration);
    }

    switch (registration.type) {
      case 'client':
        client = registration.uuid;

        if (server && server.ready) {
          registerClientToServer(server, registration.uuid);
        } else {
          startServer();
        }

        break;

      case 'server':

        // start can fail
        if (server) {
          if (client) {
            registerClientToServer(server, client);
          }
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
        var uuid = registration.uuid;
        debug('Unregistering client  with uuid ' + uuid);
        // unregister in the smuggler
        client = null;
        if (server && server.ready) {
          // unregister in the server
          unregisterClientToServer(server, uuid);
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

