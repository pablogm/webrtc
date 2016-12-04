'use strict';

/**
 * Main 
 * @author Pablo GM <invanzert@gmail.com>
 * @type @exp;document@call;getElementById
 */

// Members

var node            = document.getElementById("videos");
var clearBtn        = document.getElementById("clearBtn");
var roomLink        = document.getElementById("roomLink");
var peers           = [];
var videoElements   = [];

var room = getAllUrlParams().room;
//var room = prompt("Enter room name");

//console.log("We are in room: " + room);
 
Videostream.getUserMedia(gotStream);

if(Room.isRTC()) {
    
    console.log("WebRTC supported");
}
else {
    
    console.log("WebRTC is not supported by your browser. You can try the app with Chrome and Firefox.");
}

function gotStream(stream) {
    
    if(stream) {
     
        Room.init(stream);
     
        console.log('Adding local stream.');        
    }
    else {
        
        console.log('Error getting local stream.');
    }
}

Room.peer_streamHandler(gotPeerStream);

function gotPeerStream(peer) {
    
    if(peer) {
     
        console.log('Client connected, adding new stream');
        
        console.log('peer: ' + peer.stream.id);
        
        peers.push({
            id: peer.id,
            stream: window.URL.createObjectURL(peer.stream)
        });
                                
        videoElements[peer.to] = "<video id=\"local\" src=\""+window.URL.createObjectURL(peer.stream)+"\" autoplay></video>";
        
        console.log("==== Video Elements id: " + peer.to + " value: " + JSON.stringify(videoElements) + " ====");
                        
        node.innerHTML = getInnerTextFromvideoElements();
    }
}

Room.peer_disconnectedHandler(gotPeerDisconnected);

function gotPeerDisconnected(peer) {
    
    if(peer) {
     
        console.log('Client disconnected, removing stream');
        
        peers.filter(function (p) {
        
            return p.id !== peer.id;
        });
        
        delete videoElements[peer.id];
        
        node.innerHTML = getInnerTextFromvideoElements();
    }
}

if (room == undefined) {
    
    console.log("Create room");
    
    Room.createRoom(gotCreatedRoom);
}
else {
    
    console.log("Join room " + room);
    
    Room.joinRoom(room, gotJoinedRoom);
}

function gotCreatedRoom(roomid, id, stream) {
    
    console.log('Created room with id: ' + roomid);
    
    var url = window.location.href + "?room=" + roomid;
    
    roomLink.href       = url;
    roomLink.innerHTML  = url;
    
    videoElements[id] = "<video id=\"local\" src=\""+window.URL.createObjectURL(stream)+"\" autoplay></video>";
    
    console.log("==== Video Elements id: " + id + " value: " + JSON.stringify(videoElements) + " ====");
        
    node.innerHTML = getInnerTextFromvideoElements();
    
    clearBtn.onclick = function() { 
        
        Room.clearRooms(roomid);
    };
}

function gotJoinedRoom(roomid, id, stream) {
    
    console.log('Joined room with id: ' + roomid);
    
    videoElements[id] = "<video id=\"local\" src=\""+window.URL.createObjectURL(stream)+"\" autoplay></video>";
    
    console.log("==== Video Elements id: " + id + " value: " + JSON.stringify(videoElements) + " ====");
        
    node.innerHTML = getInnerTextFromvideoElements();
    
    clearBtn.onclick = function() { 
        
        Room.clearRooms(roomid);
    };
}

function getInnerTextFromvideoElements() {
    
    var st = "";
    
    for (var key in videoElements) {
        
        console.log("key: " + key + " value: " + videoElements[key]);
        
        st += videoElements[key];
    }
    
    return st;
}

///////////////////////////////////////////

function getAllUrlParams(url) {

  // get query string from url (optional) or window
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

  // we'll store the parameters here
  var obj = {};

  // if query string exists
  if (queryString) {

    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split('#')[0];

    // split our query string into its component parts
    var arr = queryString.split('&');

    for (var i=0; i<arr.length; i++) {
      // separate the keys and the values
      var a = arr[i].split('=');

      // in case params look like: list[]=thing1&list[]=thing2
      var paramNum = undefined;
      var paramName = a[0].replace(/\[\d*\]/, function(v) {
        paramNum = v.slice(1,-1);
        return '';
      });

      // set parameter value (use 'true' if empty)
      var paramValue = typeof(a[1])==='undefined' ? true : a[1];

      // (optional) keep case consistent
      paramName = paramName.toLowerCase();
      paramValue = paramValue.toLowerCase();

      // if parameter name already exists
      if (obj[paramName]) {
        // convert value to array (if still string)
        if (typeof obj[paramName] === 'string') {
          obj[paramName] = [obj[paramName]];
        }
        // if no array index number specified...
        if (typeof paramNum === 'undefined') {
          // put the value on the end of the array
          obj[paramName].push(paramValue);
        }
        // if array index number specified...
        else {
          // put the value at that index number
          obj[paramName][paramNum] = paramValue;
        }
      }
      // if param name doesn't exist yet, set it
      else {
        obj[paramName] = paramValue;
      }
    }
  }

  return obj;
}