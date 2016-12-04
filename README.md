# WebRTC

## Description
WebRTC multi conference implementation using Noje.js (Socket.io) as signaling server

---


## How to install 

- Intall node legacy
```
apt-get install nodejs-legacy
```

- Intall dependencies
```
npm install
```

- Start node server
```
node index.js
```

---

## Local server setup

- Create a record within the **hosts** file with a domain like *.domain.com that points to the localhost (I’m using you will use a subdomain)
```
sudo nano /etc/hosts
```
```python
127.0.0.1 my.domain.com
```

- Setup your local subdomain within the **server.js** file
```javascript
expressApp.use(vhost('my.domain.com', function (req, res, next)
```

- Setup your local cert and key paths within the **config.json** file
```javascript
"KEY_LOCAL": "my_path_to_key_file",
"CERT_LOCAL": "my_path_to_crt_file"
```

- Install the vHost module
```javascript
npm install vhost
```

- Start the node server and connect to 

[https://my.domain.com:5555/](https://my.domain.com:5555/)


---

## Architecture

- The **index.js** file is the node js Server which requires a config file and the server itself.
- **Room** module: provides a public API to create, join, clear, status handlers, etc
- **Videostream** module: provides a very simple API to access the camera stream
- **SocketIO** module: provides a very simple API to generate a Socket.io object

---

## API

### Room
```javascript
/**
 * Check whether webRTC is avaiable in the current browser
 * @returns {Boolean}
 */
Room.isRTC = function()
```
```javascript
/**
 * Join existing room
 * @param {type} r Room id
 * @param {type} completion Completion callback provides room id, user id and stream
 * @returns {undefined}
 */
Room.joinRoom = function(r, completion)
```
```javascript
/**
 * Clear all rooms but the current
 * @param {type} r Current room id
 * @returns {undefined}
 */
Room.clearRooms = function(r)
```
```javascript
/**
 * Create a new room
 * @param {type} Completion callback provides room id, user id and stream
 * @returns {undefined}
 */
Room.createRoom = function(completion)
```
```javascript
/**
 * Initial setup
 * @param {type} s Stream
 * @returns {undefined}
 */
Room.init = function(s)
```
Callbacks:
```javascript
Room.peer_streamHandler = function(callback)
Room.peer_disconnectedHandler = function(callback)
```
### Videostream
```javascript
 /**
  * Get user media (stream)
  * @param {type} completion Completion callback providing the stream,
  * if operation successful. Otherwise it will provide the error.
  * @returns {undefined}
  */
Videostream.getUserMedia = function (completion)
```
### SocketIO
```javascript
/**
 * Get socket
 * @returns Socket.io object
 */
SocketIO.get = function()
```

---

## Know bugs

### CORS issue
Athough CORS is theoretically enabled, there is CORS error whenn trying to access the TURN server. 

As a workaround the following Chrome extension can be installed:

https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi

### Scalabilty
When we have session with n peers each of these n peers should establish n-1 RTCPeerConnection with the other peers in the room. 
This means that his video stream will be encoded n-1 times and will be sent n-1 times through the network. 
This is very inefficient and is almost impractical in production, when communication between multiple parties is required. 
Solution for this problem is the usage of WebRTC gateway, e.g. I’m using Janus.
