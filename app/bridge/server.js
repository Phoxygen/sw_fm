(function(exports) {
'use strict';

function ServerFactory(name) {
  return createServer(name);
}

function sendToSmuggler(server, command) {
  var smuggler = new BroadcastChannel('smuggler');
  smuggler.postMessage({
    name: command,
    type: 'server',
  });
  smuggler.close();
}

function createServer(name) {

  function Server(name) {
    this.name = name;

    this.port = null;

    this.listen();
    // the server register itself when it is ready
    this.port = new BroadcastChannel('logic');

    // we keep a ref to the listener to be able to remove it.
    this.port.onMessageListener = e => {this.onmessage.call(this, this.port, e.data);};
    this.port.addEventListener(
      'message',
      this.port.onMessageListener
    );
  }

  Server.prototype.onglobalmessage = function(data) {

    if (data.type === 'unregister') {
      this.unregisterClient();
    }
  };

  Server.prototype.unregisterClient = function() {
    debug(this.name, 'Unregistering client');

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

  Server.prototype.listen = function() {
    this.onglobalmessageListener = e => this.onglobalmessage(e.data);
    addEventListener('message', this.onglobalmessageListener);
  };

  Server.prototype.unlisten = function() {
    removeEventListener('message', this.onglobalmessageListener);
    this.onglobalmessageListener = null;
  };

  Server.prototype.unregister = function() {
    debug(this.name, 'Unregistering server ');
    sendToSmuggler(this, 'unregister');
  };

  var server = new Server(name);

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
