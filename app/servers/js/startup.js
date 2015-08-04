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

var port = new BroadcastChannel('logic');
function Server() {
  addEventListener('message', onglobalmessage);
  // we keep a ref to the listener to be able to remove it.
  port.onMessageListener = e => {console.log('got message', e);};
  port.addEventListener(
    'message',
    port.onMessageListener
  );
}

function onglobalmessage(e) {
  if (e.data.type === 'unregister') {
    debug('Unregistering client');

    port.removeEventListener('message', port.onMessageListener);
    port.postMessage({ type: 'disconnected', });
    port.close();
    port = null;
    // don't accept new clients
    removeEventListener('message', onglobalmessage);
    // tell the smuggler we are useless
    sendToSmuggler('unregister');
  }
};

var s1 = new Server();

