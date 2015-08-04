(function(exports) {
'use strict';

function ClientFactory() {
  return createNewClient();
}

function createNewClient() {

  function sendToSmuggler(clientInternal, command) {
    debug('sendToSmuggler', command);
    var smuggler = new BroadcastChannel('smuggler');
    smuggler.postMessage({
      name: command,
      type: 'client',
    });
    smuggler.close();
  }

  /*
   * Client
   */
  function Client() {
    this.server = null;
    this.connect();
  }

  Client.prototype.unregister = function() {
    sendToSmuggler(this, 'unregister');
  };

  Client.prototype.connect = function() {
    debug(' [connect]');

    sendToSmuggler(this, 'register');
    this.server = new BroadcastChannel('logic');
    this.listen();
  };

  Client.prototype.disconnect = function() {
    debug(' [disconnect]');
    this.unregister();
  }

  Client.prototype.ondisconnected = function() {
    debug(' [disconnected]');

    this.server.removeEventListener('message', this.server.listener);
    this.server.close();
    this.server = null;
  };

  Client.prototype.listen = function() {
    this.server.listener = e => this.onmessage(e);
    this.server.addEventListener('message', this.server.listener);
  };

  Client.prototype.onmessage = function(e) {
    debug('on message', e.data);

    switch (e.data.type) {
      case 'disconnected':
        this.ondisconnected();
        break;

      default:
        throw new Error('Not implemented', e.data);
        break;
    }
  };

  var client = new Client();

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
