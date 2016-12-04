'use strict';

/**
 * Socket manager
 * @author Pablo GM <invanzert@gmail.com>
 * @type @exp;SocketIO
 */

var SocketIO = SocketIO || {REVISION: '1'};

SocketIO.socket = null;
SocketIO.SIGNALIG_SERVER_URL = "";
 
/**
 * Get socket
 * @returns {Function|Sender.createConnection|uglify.createConnection|WebSocket.createConnection|module.exports.createConnection|Receiver.createConnection|nodeunit@call;testCase.createConnection|ActiveXObfuscator.createConnection}
 */
SocketIO.get = function () 
{
    if(!SocketIO.socket) {

        SocketIO.socket = io.connect(SocketIO.SIGNALIG_SERVER_URL);
    }

    return SocketIO.socket;
};
