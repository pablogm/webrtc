'use strict';

/**
 * Video Stream Manager
 * @author Pablo GM <invanzert@gmail.com>
 * @type @exp;Videostream
 */

var Videostream = Videostream || {REVISION: '1'};

Videostream.stream = null;
 
 /**
  * Get user media (stream)
  * @param {type} completion Completion callback providing the stream,
  * if operation successful. Otherwise it will provide the error.
  * @returns {undefined}
  */
Videostream.getUserMedia = function (completion) 
{
    if(Videostream.stream) {
        
        completion(Videostream.stream);
    }
    else {
     
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
        })
        .then(function(s) {

            console.log('got user media');

            Videostream.stream = s;
            
            completion(Videostream.stream);
        })
        .catch(function(e) {

            console.log('getUserMedia() error: ' + e.name);

            completion(null);
        });
    }
};
