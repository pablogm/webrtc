'use strict';

/**
 * Conference Room
 * @author Pablo GM <invanzert@gmail.com>
 * @type @exp;Room
 */

var Room = Room || {REVISION: '1'};

Room.turnReady = false;

Room.stream             = null;
Room.roomId;
Room.currentId;
Room.connected          = false;
Room.socket             = SocketIO.get();
Room.peerConnections    = {};
Room.iceConfig          = { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }]};
Room.peer_stream;
Room.peer_disconnected;

//// API ///////////////////////////////////////////////////////////////////////

/**
 * Check whether webRTC is avaiable in the current browser
 * @returns {Boolean}
 */
Room.isRTC = function() {
    
    if (!window.RTCPeerConnection || !navigator.getUserMedia) {

        return false;
    }
    
    return true;
};

/**
 * Join existing room
 * @param {type} r Room id
 * @param {type} completion Completion callback provides room id, user id and stream
 * @returns {undefined}
 */
Room.joinRoom = function(r, completion) {
    
    if(!Room.connected) {
        
        Room.socket.emit('init', { room: r }, function (roomid, id) {
            
            Room.currentId  = id;
            Room.roomId     = roomid;
            
            console.log("Room.socket.emit joinRoom callback id " + roomid);
            
            if (location.hostname !== 'localhost') {
    
                requestTurn(
                    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
                );
            }
    
            completion(Room.roomId, Room.currentId, Room.stream);
        });
        
        Room.connected = true;
    }
};

/**
 * Clear all rooms but the current
 * @param {type} r Current room id
 * @returns {undefined}
 */
Room.clearRooms = function(r) {
    
    console.log("Clear all rooms but " + r);
    
    Room.socket.emit('clear', r);
}

/**
 * Create a new room
 * @param {type} Completion callback provides room id, user id and stream
 * @returns {undefined}
 */
Room.createRoom = function(completion) {
    
    Room.socket.emit('init', null, function (roomid, id) {

        Room.roomId     = roomid;
        Room.currentId  = id;
        Room.connected  = true;
        
        console.log("Room.socket.emit createRoom callback id " + roomid);
        
        completion(Room.roomId, Room.currentId, Room.stream);
    });
};

/**
 * Initial setup
 * @param {type} s Stream
 * @returns {undefined}
 */
Room.init = function(s) {
    
    Room.socket.id  = Math.random() * Date.now();
    Room.stream     = s;
    Room.addHandlers(Room.socket);
    
    console.log("init");  
    
    console.log('<<< My stream id ' + s.id);
    console.log('<<< My scoked id ' + Room.socket.id);
};

Room.peer_streamHandler = function(callback) {
    
    Room.peer_stream = callback;
};

Room.peer_disconnectedHandler = function(callback) {
    
    Room.peer_disconnected = callback;
};


//// PRIVATE ///////////////////////////////////////////////////////////////////

/**
 * Get peer connection
 * @param {type} id peer Id 
 * @returns {RTCPeerConnection|Room.getPeerConnection.pc}
 */
Room.getPeerConnection = function(id) {
    
    // Check whether we have associated peer connection to the given id, 
    // if we do we simply return it.
    if (Room.peerConnections[id]) {
        
        return Room.peerConnections[id];
    }
    
    // If we don’t have such peer connection we create a new one
    var pc = new RTCPeerConnection(Room.iceConfig);
    
    // We cache it
    Room.peerConnections[id] = pc;
    
    console.log("<<< stream >>>" + Room.stream);
    
    pc.addStream(Room.stream);
    
    // Add onicecandidate and onaddstream handlers
    pc.onicecandidate = function (evnt) {
    
        Room.socket.emit('msg', { by: Room.currentId, to: id, ice: evnt.candidate, type: 'ice' });
    };
    pc.onaddstream = function (evnt) {
      
        console.log('<<< Received new stream ' + evnt.stream.id);
            
        // Visualize video
        if (Room.peer_stream && typeof(Room.peer_stream) === "function") {
            
            console.log("Room.peer_stream is a funtion!!!");
            
            Room.peer_stream({
                id: Room.currentId,
                stream: evnt.stream,
                to: id
            });
        }
    };
    return pc;
};

/**
 * SDP (Session Description Protocol) offer
 * @param {type} id Peer id
 * @returns {undefined}
 */
Room.makeOffer = function(id) {
        
    var pc = Room.getPeerConnection(id);
    
    pc.createOffer(function (sdp) {
        
        pc.setLocalDescription(sdp);
        
        console.log('Creating an offer for', id);
        
        Room.socket.emit('msg', { by: Room.currentId, to: id, sdp: sdp, type: 'sdp-offer' });
    }, 
    function (e) {
        console.log(e);
    },
    { mandatory: { OfferToReceiveVideo: true, OfferToReceiveAudio: false }}); 
};

/**
 * The socket.io events handled in this service are:
 * - peer.connected - fired when new peer joins the room. Once this event is fired we initiate new SDP offer to this peer
 * - peer.disconnected - fired when peer disconnects
 * - msg - fired when new SDP offer/answer or ICE candidate are received
 */
Room.addHandlers = function(socket) {
    
    Room.socket.on('peer.connected', function (params) {
    
        console.log("makeOffer");
        
        Room.makeOffer(params.id);
    });
    
    Room.socket.on('peer.disconnected', function (data) {
        
        console.log("remove video component");
        
        // TODO: remove video component
        
        if (Room.peer_disconnected && typeof(Room.peer_disconnected) === "function") {
            
            console.log("Room.peer_disconnected is a funtion!!!");
            
            Room.peer_disconnected([data]);
        }
    });
    
    Room.socket.on('msg', function (data) {
    
        console.log("message " + JSON.stringify(data));
        
        Room.handleMessage(data);
    });
};

/**
 * Main function to handle socket messages
 * @param {type} data
 * @returns {undefined}
 */
Room.handleMessage = function(data) {
    
    // We get the peer connection with the peer with id pointed by the by property
    var pc = Room.getPeerConnection(data.by);
    
    switch (data.type) {
        
        case 'sdp-offer':
            // If we receive this message, this means that we have just connected to the room 
            // and the rest of the peers inside this room want to initiate new peer connection with us
            //
            // In order to answer them with our ICE candidates, video codecs, etc. 
            // we create a new answer using createAnswer but before that 
            // we setRemoteDescription (the description of the remote peer). 
            // Once we prepare the SDP answer we send it to the appropriate peer via the server.
            pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {

                console.log('Setting remote description by offer');

                pc.createAnswer().then(
                    function (sdp) {

                    console.log('[[[[Setting local description]]]]');

                    pc.setLocalDescription(sdp);                    

                    Room.socket.emit('msg', { by: Room.currentId, to: data.by, sdp: sdp, type: 'sdp-answer' });
                    },
                    function(error) {
                        
                        console.log('Failed to create session description: ' + error.toString());
                    }
                );
            });
        break;
            
        case 'sdp-answer':
                
            // If we receive SDP answer by given peer, this means that we have already sent SDN offer to this peer. 
            // We set the remote description and we hope that we’ll successfully initiate the media connection 
            // between us (we hope we’re not both behind symmetric NATs).
            pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {

                console.log('Setting remote description by answer');
            }, 
            function (e) {

                console.error(e);
            });
        break;
                
        case 'ice':
                
            // If in the process of negotiation new ICE candidates are being discovered 
            // the RTCPeerConnection instance will trigger onicecandidate event, 
            // which will redirect new msg message to the peer with whom we’re currently negotiating. 
            // We simply add the ICE candidate to the appropriate peer connection using the addIceCandidate method.
            if (data.ice) {

                console.log('Adding ice candidates');

                pc.addIceCandidate(new RTCIceCandidate(data.ice));
            }
        break;
    }
};


/////////////////////////////////////////////////////////

function requestTurn(turnURL) {
    
    var turnExists = false;
    
    for (var i in Room.iceConfig.iceServers) {
        
      if (Room.iceConfig.iceServers[i].url.substr(0, 5) === 'turn:') {
          
            turnExists      = true;
            Room.turnReady  = true;
            break;
      }
    }
    
    if (!turnExists) {
        
        console.log('Getting TURN server from ', turnURL);
        
        // No TURN server. Get one from computeengineondemand.appspot.com:
        var xhr = new XMLHttpRequest();
        
        xhr.onreadystatechange = function() {
            
            if (xhr.readyState === 4 && xhr.status === 200) {
                
                var turnServer = JSON.parse(xhr.responseText);
              
                console.log('Got TURN server: ', turnServer);
                
                Room.iceConfig.iceServers.push({
                  'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
                  'credential': turnServer.password
                });
              
                Room.turnReady = true;
            }
        };
        xhr.open('GET', turnURL, true);
        xhr.send();
    }
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
    
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('m=audio') !== -1) {
      mLineIndex = i;
      break;
    }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
          opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
    
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
    
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
    
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length - 1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

///////////////////////////////////////////