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

    this.ports = [];

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
    var channel = new BroadcastChannel(id);
    debug(this.server.name, 'channel created', channel);
    this.ports.push(channel);

    channel.postMessage({
      type: 'connected',
    });

    // we keep a ref to the listener to be able to remove it.
    channel.onMessageListener = e => {this.onmessage.call(this, channel, e.data);};
    channel.addEventListener(
      'message',
      channel.onMessageListener
    );
  };

  ServerInternal.prototype.unregisterClient = function(id) {
    debug(this.server.name, 'Unregistering client', id);
    // find the old channel and remove it from this.ports
    var index = 0;
    while (index < this.ports.length && this.ports[index].name !== id) {
      index++;
    }

    if (index < this.ports.length) {
      var removedChannel = this.ports.splice(index, 1)[0];
      removedChannel.removeEventListener('message', removedChannel.onMessageListener);
      // tell the client it's getting disconnected
      // Technically, we don't need to do that, but the client could have pending requests
      // when it disconnected. Sending a disconnected event make this client able to still deal
      // with response it might receive between the disconnection request and the disconnected event.
      removedChannel.postMessage({
        type: 'disconnected',
      });
      debug(this.server.name, 'closing channel', removedChannel);
      removedChannel.close();
    } else {
      debug('Couldn\'t find any client to remove with id ', id);
    }

    // Do we have any client left?
    if (this.ports.length === 0) {
      debug(this.server.name, 'No more client: unregistering');
      // don't accept new clients
      this.unlisten();
      // tell the smuggler we are useless
      this.unregister();
    }
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
