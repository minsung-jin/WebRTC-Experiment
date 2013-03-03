﻿var config = {
    openSocket: function (config) {
        if (!window.Firebase) return;
        var channel = config.channel || location.hash.replace('#', '') || 'audio-only-calls';
        var socket = new Firebase('https://chat.firebaseIO.com/' + channel);
        socket.channel = channel;
        socket.on("child_added", function (data) {
            config.onmessage && config.onmessage(data.val());
        });
        socket.send = function (data) {
            this.push(data);
        }
        config.onopen && setTimeout(config.onopen, 1);
        socket.onDisconnect().remove();
        return socket;
    },
    onRemoteStream: function (media) {
        var audio = media.audio;
        audio.setAttribute('controls', true);

        participants.insertBefore(audio, participants.childNodes[0]);

        audio.play();
        rotateAudio(audio);

        if (saveRecordedStreams) saveRecordedStreams.style.display = '';

        /* recording remote stream */
        if (typeof remoteStreamRecorder === 'undefined') window.remoteStreamRecorder = null;
        remoteStreamRecorder = RecordRTC({
            stream: media.stream,
            audioWorkerPath: audioWorkerPath
        });
        remoteStreamRecorder.recordAudio();

        if (saveRemoteStream) saveRemoteStream.style.display = '';
    },
    onRoomFound: function (room) {
        var alreadyExist = document.getElementById(room.broadcaster);
        if (alreadyExist) return;

        if (typeof roomsList === 'undefined') roomsList = document.body;

        var tr = document.createElement('tr');
        tr.setAttribute('id', room.broadcaster);
        tr.innerHTML = '<td style="width:80%;">' + room.roomName + ' is calling you!</td>' +
            '<td><button class="join" id="' + room.roomToken + '">Receive Call</button></td>';
        roomsList.insertBefore(tr, roomsList.childNodes[0]);

        tr.onclick = function () {
            var tr = this;
            captureUserMedia(function () {
                broadcastUI.joinRoom({
                    roomToken: tr.querySelector('.join').id,
                    joinUser: tr.id
                });
            });
            hideUnnecessaryStuff();
        };
    }
};

function createButtonClickHandler() {
    captureUserMedia(function () {
        broadcastUI.createRoom({
            roomName: (document.getElementById('your-name') || {}).value || 'Anonymous'
        });
    });
    hideUnnecessaryStuff();
}

function captureUserMedia(callback) {
    var audio = document.createElement('audio');
    audio.setAttribute('autoplay', true);
    audio.setAttribute('controls', true);
    participants.insertBefore(audio, participants.childNodes[0]);

    getUserMedia({
        video: audio,
        constraints: {
            audio: true,
            video: false
        },
        onsuccess: function (stream) {
            config.attachStream = stream;

            audio.setAttribute('muted', true);
            rotateAudio(audio);

            // recording local stream
            if (typeof localStreamRecorder === 'undefined') window.localStreamRecorder = null;
            localStreamRecorder = RecordRTC({
                stream: stream,
                audioWorkerPath: audioWorkerPath
            });
            localStreamRecorder.recordAudio();
            if (saveLocalStream) saveLocalStream.style.display = '';

            callback && callback();
        },
        onerror: function () {
            alert('unable to get access to your headphone (microphone).');
        }
    });
}

/* on page load: get public rooms */
var broadcastUI = broadcast(config);

/* UI specific */
var participants = document.getElementById("participants") || document.body;
var startConferencing = document.getElementById('start-audio-only-call');
var roomsList = document.getElementById('rooms-list');
var saveRecordedStreams = document.getElementById('save-recorded-streams');

if (startConferencing) startConferencing.onclick = createButtonClickHandler;

function hideUnnecessaryStuff() {
    var visibleElements = document.getElementsByClassName('visible'),
        length = visibleElements.length;
    for (var i = 0; i < length; i++) {
        visibleElements[i].style.display = 'none';
    }
}

function rotateAudio(audio) {
    audio.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(0deg)';
    setTimeout(function () {
        audio.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(360deg)';
    }, 1000);
}

/* saving recorded local/remove audio streams */
var saveRemoteStream = document.getElementById('save-remote-stream'),
    saveLocalStream = document.getElementById('save-local-stream');

if (saveRemoteStream) saveRemoteStream.onclick = function () {
    if (remoteStreamRecorder) {
        remoteStreamRecorder.stopAudio();
        setTimeout(remoteStreamRecorder.save, 1000);
    }
    this.parentNode.removeChild(this);
};

if (saveLocalStream) saveLocalStream.onclick = function () {
    if (localStreamRecorder) {
        localStreamRecorder.stopAudio();
        setTimeout(localStreamRecorder.save, 1000);
    }
    this.parentNode.removeChild(this);
};

/* setting worker file URL */
var remoteStreamRecorder, localStreamRecorder;
var audioWorkerPath = 'audio-recorder.js';