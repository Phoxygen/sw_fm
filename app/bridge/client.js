(function(exports) {
'use strict';

function ClientFactory(name) {
  return createNewClient(name);
}

const kErrors = {
  NotImplemented: 'Not Implemented.',
  NoPromise: 'No Promise Found.',
  Disconnected: 'Client has been disconnected',
  Connecting: 'Client currently connecting'
}

const kSuccesses = {
  Connected: 'Connected',
  Disconnected: 'Disconnected'
}

const kStates = {
  Disconnected: 0,
  Connecting: 1,
  Connected: 2,
  Disconnecting: 3
}

function createNewClient(name) {

  function sendToSmuggler(clientInternal, command) {
    debug('sendToSmuggler', command);
    var kRegistrationChannelName = 'smuggler';
    var smuggler = new BroadcastChannel(kRegistrationChannelName);
    smuggler.postMessage({
      name: command,
      type: 'client',
    });
    smuggler.close();
  }

   /*
   * Deferred
   */
  function Deferred() {
    var deferred = {};
    deferred.promise = new Promise(function(resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  }


  /*
   * Client
   */
  function Client(name) {
    this.name = name;

    this.server = null;

    this.state = kStates.Disconnected;
    // deferred for connection and disconnection
    this.connectionDeferred = null;

    this.connect();
  }

  Client.prototype.register = function() {
    sendToSmuggler(this, 'register');
  };

  Client.prototype.unregister = function() {
    sendToSmuggler(this, 'unregister');
  };

  Client.prototype.connect = function() {
    debug(this.name, ' [connect]');

    switch (this.state) {
      case kStates.Connected:
        return Promise.resolve(kSuccesses.Connected);
      case kStates.Connecting:
        return this.connectionDeferred.promise;
      case kStates.Disconnecting:
        return this.connectionDeferred.promise.then(() => this.connect());
      case kStates.Disconnected:
        this.state = kStates.Connecting;
        this.connectionDeferred = new Deferred();
        this.register();
        // It might not be the first time we connect
        this.server = new BroadcastChannel('logic');
        this.listen();
        return this.connectionDeferred.promise;
      default:
        throw new Error('Unsupported state: ' + this.state);
        break;
    }
  };

  Client.prototype.onconnected = function() {
    debug(this.name, ' [connected]');
    this.connectionDeferred.resolve(kSuccesses.Connected);
    this.connectionDeferred = null;

    if (this.state !== kStates.Connected) {
      this.state = kStates.Connected;
    }
  };

  Client.prototype.disconnect = function() {
    debug(this.name + ' [disconnect]');
    switch (this.state) {
      case kStates.Disconnected:
        return Promise.resolve(kSuccesses.Disconnected);
      case kStates.Connecting:
        // we reject disconnection request if we are connecting
        // to avoid losing any calls
        return Promise.reject(kErrors.Connecting);
      case kStates.Disconnecting:
        return this.connectionDeferred.promise;
      case kStates.Connected:
        this.state = kStates.Disconnecting;
        this.connectionDeferred = new Deferred();
        this.unregister();
        return this.connectionDeferred.promise;
      default:
        throw new Error('Unsupported state: ' + this.state);
        break;
    }
  }

  Client.prototype.ondisconnected = function() {
    debug(this.name + ' [disconnected]');

    switch (this.state) {
      case kStates.Disconnected:
        // nothing to do :-)
        break;
      case kStates.Connecting:
        this.connectionDeferred.reject(kErrors.Disconnected);
        break;
      // we should not receive disconnected without requesting it, but...
      case kStates.Connected:
      case kStates.Disconnecting:
        // unlisten
        for (var [fn, eventName] of this.server.listeners) {
          this.server.removeEventListener(eventName, fn);
        }
        this.server.close();
        this.server = null;
        this.state = kStates.Disconnected;
        if (this.connectionDeferred) {
          this.connectionDeferred.resolve(kSuccesses.Disconnected);
        }
        break;
      default:
        throw new Error('Unsupported state: ' + this.state);
        break;
    }
  };

  Client.prototype.listen = function() {
    // we maintain a map of listener <-> event to be able to remove them
    this.server.listeners = new Map();
    var listener = e => this.onmessage(e);
    this.server.listeners.set(listener, 'message');
    this.server.addEventListener('message', listener);
  };

  Client.prototype.onmessage = function(e) {
    debug(this.name, 'on message', e.data);

    switch (e.data.type) {
      case 'connected':
        this.onconnected(e.data.interface);
        break;

      case 'disconnected':
        this.ondisconnected();
        break;

      default:
        throw new Error('Not implemented', e.data);
        break;
    }
  };

  var client = new Client(name);

  return client;
}


/*
 * Utils
 */

function debug() {
  console.log.bind(console, '[client]').apply(console, arguments);
}


exports.Client = ClientFactory;
})(this);
