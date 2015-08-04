'use strict';
function sendToSmuggler(command) {
  var smuggler = new BroadcastChannel('smuggler');
  smuggler.postMessage({
    name: command,
    type: 'server',
  });
  smuggler.close();
}

function debug() {
  console.log.bind(console, '[server]').apply(console, arguments);
}

var onglobalmessageListener = e => onglobalmessage(e.data);
var port = new BroadcastChannel('logic');
function Server() {
  addEventListener('message', onglobalmessageListener);
  // the server register itself when it is ready

  // we keep a ref to the listener to be able to remove it.
  port.onMessageListener = e => {this.onmessage.call(this, this.port, e.data);};
  port.addEventListener(
    'message',
    port.onMessageListener
  );
}

function onglobalmessage(data) {
  if (data.type === 'unregister') {
    debug('Unregistering client');

    port.removeEventListener('message', port.onMessageListener);
    port.postMessage({ type: 'disconnected', });
    port.close();
    port = null;
    // don't accept new clients
    removeEventListener('message', onglobalmessageListener);
    onglobalmessageListener = null;
    // tell the smuggler we are useless
    sendToSmuggler('unregister');
  }
};

var s1 = new Server();

