(function(exports) {
'use strict';

function ServerFactory(name, version, methods) {
  return createServer(name, version, methods);
}

function sendToSmuggler(serverInternal, command) {
  var smuggler = new BroadcastChannel('smuggler');
  smuggler.postMessage({
    name: command,
    type: 'server',
    contract: serverInternal.server.name,
    version: serverInternal.server.version,
  });
  smuggler.close();
}

function createServer(name, version, methods) {
  /*
   * ServerInternal
   */
  function ServerInternal(server, methods) {
    this.server = server;
    this.methods = methods;

    this.port = null;

    this.listen();
    // the server register itself when it is ready
    this.register();
  }

  ServerInternal.prototype.onglobalmessage = function(data) {

    if (data.type === 'register') {
      this.registerClient(data.uuid);
    } else if (data.type === 'unregister') {
      this.unregisterClient(data.uuid);
    }
  };

  ServerInternal.prototype.registerClient = function(id) {
    debug(this.server.name, 'Registering client ' + id);
    this.port = new BroadcastChannel(id);

    this.port.postMessage({
      type: 'connected',
    });

    // we keep a ref to the listener to be able to remove it.
    this.port.onMessageListener = e => {this.onmessage.call(this, this.port, e.data);};
    this.port.addEventListener(
      'message',
      this.port.onMessageListener
    );
  };

  ServerInternal.prototype.unregisterClient = function(id) {
    debug(this.server.name, 'Unregistering client', id);

    this.port.removeEventListener('message', this.port.onMessageListener);
    this.port.postMessage({
      type: 'disconnected',
    });
    this.port.close();
    this.port = null;
    // don't accept new clients
    this.unlisten();
    // tell the smuggler we are useless
    this.unregister();
  };

  ServerInternal.prototype.listen = function() {
    this.onglobalmessageListener = e => this.onglobalmessage(e.data);
    addEventListener('message', this.onglobalmessageListener);
  };

  ServerInternal.prototype.unlisten = function() {
    removeEventListener('message', this.onglobalmessageListener);
    this.onglobalmessageListener = null;
  };

  ServerInternal.prototype.register = function() {
    debug(this.server.name, ' [connect]');
    sendToSmuggler(this, 'register');
  };

  ServerInternal.prototype.unregister = function() {
    debug(this.server.name, 'Unregistering server ');
    sendToSmuggler(this, 'unregister');
  };

  /*
   * Server
   */
  function Server(name, version) {
    this.name = name;
    this.version = version;
  }

  var server = new Server(name, version);
  var internal = new ServerInternal(server, methods);

  return server;
}


/*
 * Utils
 */
function debug() {
  console.log.bind(console, '[server]').apply(console, arguments);
}


exports.Server = ServerFactory;
})(this);
