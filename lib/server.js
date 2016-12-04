
/**
 * WebRTC node js Server
 * @author Pablo GM <invanzert@gmail.com>
 * @type type
 */

// Dependencies
var express     = require('express'),
    expressApp  = express(),
    socketio    = require('socket.io'),
    https       = require('https'),
    fs          = require('fs'),
    uuid        = require('node-uuid'),
    vhost       = require('vhost')
    rooms       = {},
    userIds     = {};
   
expressApp.use(vhost('my.domain.com', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
}));

// Configure the home directory
expressApp.use(express.static(__dirname + '/../'));

exports.run = function (config) {

    /*
    var options = {
        key: fs.readFileSync(config.KEY),
        cert: fs.readFileSync(config.CERT),
        ca: fs.readFileSync(config.CA)
    };
      */
      
    var options = {
        key: fs.readFileSync(config.KEY_LOCAL),
        cert: fs.readFileSync(config.CERT_LOCAL),
    };

    var server = https.createServer(options, expressApp);

    server.listen(config.PORT);
  
    console.log('Listening on', config.PORT);
  
    socketio.listen(server, { log: false })
    .on('connection', function (socket) {

        var currentRoom, id;

        // Handle init message
        socket.on('init', function (data, fn) {
            
            currentRoom = (data || {}).room || uuid.v4();
                        
            if (!data) {
                
                // The room is not created. 
                // We create a new room and add the current client to it.
                // We generate the room randomly using node-uuid module.
                rooms[currentRoom]  = [socket];
                id                  = userIds[currentRoom] = 0;
                
                // Callback function
                fn(currentRoom, id);
                
                console.log('Room created, with #', currentRoom);
                
                console.log(Object.keys(rooms).length + ' rooms in this server.');
            } 
            else {
                
                // If the room is already created we join the current client 
                // to the room by adding its socket to the collection of 
                // sockets associated to the given room
                
                var room = rooms[currentRoom];
                
                if (!room) {
                    return;
                }
                
                userIds[currentRoom] += 1;
                
                id = userIds[currentRoom];
                
                // Callback function
                fn(currentRoom, id);
                
                // Notify all other peers associated to the room 
                // about the newly connected peer.
                room.forEach(function (s) {
                  
                    s.emit('peer.connected', { id: id });
                    
                    console.log('peer.connected ' + id);
                });
                
                room[id] = socket;
                
                console.log('Peer connected to room', currentRoom, 'with #', id);
            }
        });// init

        // Handle message
        socket.on('msg', function (data) {
            
            // The msg event is an SDP (exchange audio & video info) message 
            // or ICE (exchange network info) candidate, 
            // which should be redirected from specific peer to another peer:
            
            var to = parseInt(data.to, 10); // peer id
            
            if (rooms[currentRoom] && rooms[currentRoom][to]) {
              
                console.log('Redirecting message to', to, 'by', data.by);
              
                // Emit the message to the specified peer 
                // in the to property of the event data object
                rooms[currentRoom][to].emit('msg', data);
            } 
            else {
              
                console.warn('Invalid user');
            }
        });// msg
        
        // Handle clear event
        socket.on('clear', function (r) {
            
            for (var key in rooms) {
            
                if (key != r) {
                    
                    delete rooms[key];
                }
            }
        });//clear

        // Handle disconnect event
        socket.on('disconnect', function () {
            
            if (!currentRoom || !rooms[currentRoom]) {
                return;
            }
            
            // Remove the socket from the collection 
            // of sockets associated with the given room
            var index = rooms[currentRoom].indexOf(socket);
            delete rooms[currentRoom][index];
            
            // Emit peer.disconnected event to all other peers in the room, 
            // with the id of the disconnected peer
            rooms[currentRoom].forEach(function (socket) {
                
                if (socket) {
                    
                    socket.emit('peer.disconnected', { id: socket.id });
                }
            });
        });// disconnect
    });// connection
};

