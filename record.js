const REC_STOPPED = 0;
const REC_RECORDING = 1;
const REC_COUNTDOWN = 2;
const PLAY_PLAYING = 3;
const PLAY_PAUSED = 4;

const file_extensions = {
    "video/mpeg": ".mpeg",
    "video/mp4": ".mp4",
    "video/ogg": ".ogv",
    "video/quicktime": ".mov",
    "video/vnd.vivo": ".vivo",
    "video/webm": ".webm",
    "video/x-msvideo": ".avi",
    "video/x-sgi-movie": ".movie",
}

const vid = document.querySelector("#cam");
const playback = document.querySelector("#playback");
const audio = document.querySelector("audio");
const countdown = document.querySelector("#countdown");
const btnRecord = document.querySelector("#btnRecord");
const btnStop = document.querySelector("#btnStop");
const btnDownload = document.querySelector("#btnDownload");
const btnPlayback = document.querySelector("#btnPlayback");
const btnCam = document.querySelector("#btnCam");
const btnSwitchCam = document.querySelector("#btnSwitchCam");
const camDropdown = document.querySelector("#camDropdown");
const micDropdown = document.querySelector("#micDropdown");
const mainContainer = document.querySelector("#main");
const initNav = document.querySelectorAll(".initNav");
const mainNav = document.querySelectorAll(".mainNav");
const initMain = document.querySelector("#initMain");
const voiceDropdown = document.querySelector("#voice");
const debugField = document.querySelector("#debug");
const btnUpload = document.querySelector("#btnUpload");
const conductor = document.querySelector("#conductor");
const tutorial = document.querySelector("#tutorial");
const btnPlayConductor = document.querySelector("#btnPlayConductor");
const httpsNotice = document.querySelector("#httpsNotice");
const httpsLink = document.querySelector("#httpsLink");
const mainPage = document.querySelector("#page");

var recorder;
var recorderOptions = {};
var chunks = [];
var videoData;
var camStream;
var countdownNum = -1;
var recordState = REC_STOPPED;
var useCam = -1;
var useMic = -1;
var cameras = [];
var microphones = [];
var mediaCanPlayThrough = false;

/*if (MediaRecorder.isTypeSupported("video/mp4")) {
    recorderOptions.mimeType = "video/mp4";
} else if (MediaRecorder.isTypeSupported("video/webm")) {
    recorderOptions.mimeType = "video/webm";
}*/
vid.volume = 0;
playback.addEventListener("pause", (e) => {
    if (recordState == PLAY_PLAYING || recordState == PLAY_PAUSED) {
        recordState = PLAY_PAUSED;
    }
});
playback.addEventListener("play", (e) => {
    if (recordState == PLAY_PLAYING || recordState == PLAY_PAUSED) {
        recordState = PLAY_PLAYING;
    }
});

function initStream(stream) {
    vid.srcObject = stream;
    camStream = stream;
    recorder = new MediaRecorder(stream, recorderOptions);
    attachStreamToVu(stream);
    //recorder.start()
    console.log(recorder.state);
    recorder.onstop = (e) => {
        console.log(recorder.state);
        var blob = new Blob(chunks, { 'type': recorder.mimeType });
        chunks = [];
        var dataUrl = URL.createObjectURL(blob);
        videoData = dataUrl;
        /*var reader = new FileReader();
        reader.onloadend = function () {
            var base64data = reader.result;
            videoData = base64data;
            //console.log(base64data);
        }
        reader.readAsDataURL(blob);*/
        //console.log(blob);
    };
    recorder.ondataavailable = function (e) {
        chunks.push(e.data);
    }
    var vidTrack = stream.getVideoTracks();
    if (vidTrack.length > 0) {
        var settings = vidTrack[0].getSettings()
        debugField.innerText = "Videogroesse: " + settings.width + "x" + settings.height;
    }
}

function onVideoError(err) {
    console.error(err);
    alert("Fehler beim Öffnen der Kamera: " + err);
}

function countdownNext() {
    if (recordState == REC_COUNTDOWN) {
        countdownNum--;
        if (countdownNum > 0) {
            countdown.innerText = countdownNum;
            setTimeout(countdownNext, 1000);
        } else {
            if (useConductor) {
                changeVoice(selectedVoice, e => {
                    conductor.play();
                    recorder.start();
                    countdown.style.display = "none";
                    recordState = REC_RECORDING;
                    btnDownload.style.display = "none";
                    btnPlayback.style.display = "none";
                });
                conductor.currentTime = 0;
            } else {
                changeVoice(selectedVoice, e => {
                    audio.play();
                    recorder.start();
                    countdown.style.display = "none";
                    recordState = REC_RECORDING;
                    btnDownload.style.display = "none";
                    btnPlayback.style.display = "none";
                });
                audio.currentTime = 0;
            }


        }
    }
}

function stopRecording() {
    if (recordState == REC_RECORDING) {
        recorder.stop();
        btnDownload.style.display = "";
        btnPlayback.style.display = "";
        btnRecord.style.display = "";
        btnStop.style.display = "none";
        audio.pause();
        conductor.pause();
        recordState = REC_STOPPED;
    } else if (recordState == REC_COUNTDOWN) {
        recordState = REC_STOPPED;
        countdown.style.display = "none";
        btnRecord.style.display = "";
        btnStop.style.display = "none";
    }
}

function constraintsToAudioObject(supported) {
    if (supported.autoGainControl || supported.noiseSuppression || supported.echoCancellation) {
        var constraint = {};
        if (supported.autoGainControl) {
            constraint["autoGainControl"] = { "exact": true };
        }
        if (supported.noiseSuppression) {
            constraint["noiseSuppression"] = { "exact": false };
        }
        if (supported.echoCancellation) {
            constraint["echoCancellation"] = { "exact": false };
        }
        return constraint;
    } else {
        return true;
    }
}

function constraintsToVideoObject(supported) {
    return true;
    if (supported.height || supported.width) {
        var constraint = {};
        if (supported.height) {
            constraint["height"] = { "ideal": 1280 };
        }
        if (supported.width) {
            constraint["width"] = { "ideal": 720 };
        }
        return constraint;
    } else {
        return true;
    }
}

function initCamera() {
    if (recordState == REC_STOPPED) {
        vid.pause();
        vid.srcObject = null;
        const supported = navigator.mediaDevices.getSupportedConstraints();
        var options = {
            audio: constraintsToAudioObject(supported),
            video: constraintsToVideoObject(supported)
        };
        if (useCam >= 0) {
            options.video = {
                deviceId: { exact: cameras[useCam].deviceId }
            }
        } else if (useCam == -2) {
            options.video = false;
        }
        if (useMic >= 0) {
            if (options.audio == true) {
                options.audio = {
                    deviceId: { exact: microphones[useMic].deviceId }
                }
            } else {
                options.audio.deviceId = { exact: microphones[useMic].deviceId };
            }
        }
    } else if (useMic == -2) {
        options.audio = false;
    }
    console.log(options);
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(options)
            .then(initStream)
            .catch(onVideoError);
    } else if (navigator.getUserMedia) {
        navigator.getUserMedia(options, initStream, onVideoError);
    } else {
        alert("Ihr Browser unterstützt das Aufnehmen von Videos nicht. Bitte einen moderneren Browser nutzen.");
    }
}

document.querySelector("#btnPlayTrack").addEventListener("click", (e) => {
    if (audio.paused) {
        useConductor = false;
        changeVoice(selectedVoice, e => {
            audio.play();
        });
        audio.currentTime = 0;
    } else {
        audio.pause();
    }
});

btnRecord.addEventListener("click", (e) => {
    if (recordState == REC_STOPPED || recordState == PLAY_PAUSED || recordState == PLAY_PLAYING) {
        countdownNum = 3;
        countdown.style.display = "";
        countdown.innerText = countdownNum;
        btnRecord.style.display = "none";
        btnStop.style.display = "";
        recordState = REC_COUNTDOWN;
        playback.style.display = "none";
        vid.style.display = "";
        setTimeout(countdownNext, 1000);
    }
});

btnStop.addEventListener("click", stopRecording);

btnDownload.addEventListener("click", (e) => {
    if (videoData && (recordState == REC_STOPPED || recordState == PLAY_PAUSED || recordState == PLAY_PLAYING)) {
        var link = document.createElement("a");
        link.href = videoData;
        if (file_extensions[recorder.mimeType]) {
            link.download = "VirtualChoir_" + songName + file_extensions[recorder.mimeType];
        } else {
            link.download = "VirtualChoir_" + songName + ".webm";
        }
        document.body.append(link);
        link.click();
        link.remove();
    } else {
        alert("Es wurde noch kein Video aufgezeichnet oder die Aufnahme läuft noch.");
    }
});

btnPlayback.addEventListener("click", (e) => {
    if (videoData && (recordState == REC_STOPPED || recordState == PLAY_PAUSED)) {
        recordState = PLAY_PLAYING;
        playback.style.display = "";
        vid.style.display = "none";
        conductor.style.display = "none";
        btnCam.style.display = "";
        playback.src = videoData;
        playback.play();
    }
});

btnCam.addEventListener("click", (e) => {
    if (recordState == PLAY_PLAYING || recordState == PLAY_PAUSED) {
        audio.pause();
        playback.pause();
        playback.style.display = "none";
        vid.style.display = "";
        if (useConductor) {
            conductor.style.display = "";
        }
        btnCam.style.display = "none";
        recordState = REC_STOPPED;
    }
});

/*btnSwitchCam.addEventListener("click", (e) => {
    if (recordState == REC_STOPPED) {
        isFrontCam = !isFrontCam;
        initCamera();
    }
});*/

function switchCamera(e) {
    if (recordState == REC_STOPPED) {
        useCam = parseInt(e.target.getAttribute("camera"));
        initCamera();
    } else {
        alert("Gerät kann nur gewechselt werden, wenn das Kamerabild angezeigt wird und keine Aufnahme läuft");
    }
    e.preventDefault();
    return false;
}

function switchMic(e) {
    if (recordState == REC_STOPPED) {
        useMic = parseInt(e.target.getAttribute("mic"));
        initCamera();
    } else {
        alert("Gerät kann nur gewechselt werden, wenn das Kamerabild angezeigt wird und keine Aufnahme läuft");
    }
    e.preventDefault();
    return false;
}

function createDropdownLink(innerText, attribute, value, onclick, parent) {
    var lnk = document.createElement("a");
    lnk.classList.add("dropdown-item");
    lnk.setAttribute(attribute, value);
    lnk.innerText = innerText;
    lnk.href = "#";
    lnk.addEventListener("click", onclick);
    parent.appendChild(lnk);
}

function populateDeviceList() {
    createDropdownLink("Standard", "camera", -1, switchCamera, camDropdown);
    createDropdownLink("Standard", "mic", -1, switchMic, micDropdown);

    if (navigator.mediaDevices) {
        navigator.mediaDevices.enumerateDevices()
            .then(function (devices) {
                devices.forEach(function (device) {
                    if (device.kind == "videoinput") {
                        cameras.push(device);
                        createDropdownLink(device.label, "camera", cameras.length - 1, switchCamera, camDropdown);
                    } else if (device.kind == "audioinput") {
                        microphones.push(device);
                        createDropdownLink(device.label, "mic", microphones.length - 1, switchMic, micDropdown);
                    }
                });
            })
            .catch(function (err) {
                alert(err.name + ": " + err.message);
            });
    }

    createDropdownLink("Keine", "camera", -2, switchCamera, camDropdown);

}

document.querySelector("#btnAudioVideo").addEventListener("click", (e) => {
    init();
    e.preventDefault();
    return false;
});

document.querySelector("#btnAudioOnly").addEventListener("click", (e) => {
    useCam = -2;
    init();
    e.preventDefault();
    return false;
});

document.querySelector("#btnTutorial").addEventListener("click", (e) => {
    initMain.style.display = "none";
    tutorial.style.display = "";
    e.preventDefault();
    return false;
});

function changeVoice(voice, oncanplaythrough) {
    audio.pause();
    conductor.pause();
    if (useConductor) {
        conductor.oncanplaythrough = undefined;
        audio.style.display = "none";
        conductor.style.display = "";
        vid.classList.add("camSmall");
        if (conductor.src != videoFiles[voice]) {
            conductor.src = videoFiles[voice];
            conductor.oncanplaythrough = e => {
                mediaCanPlayThrough = true;
                if (oncanplaythrough) {
                    oncanplaythrough(e);
                }
            }
        } else {
            if (mediaCanPlayThrough) {
                oncanplaythrough({});
            } else {
                conductor.oncanplaythrough = e => {
                    mediaCanPlayThrough = true;
                    if (oncanplaythrough) {
                        oncanplaythrough(e);
                    }
                }
            }
            console.log("Not loaded conductor");
        }
    } else {
        audio.oncanplaythrough = undefined;
        audio.style.display = "";
        conductor.style.display = "none";
        vid.classList.remove("camSmall");
        if (audio.src != audioFiles[voice]) {
            mediaCanPlayThrough = false;
            audio.src = audioFiles[voice];
            audio.oncanplaythrough = e => {
                mediaCanPlayThrough = true;
                if (oncanplaythrough) {
                    oncanplaythrough(e);
                }
            }
        } else {
            if (mediaCanPlayThrough) {
                oncanplaythrough({});
            } else {
                audio.oncanplaythrough = e => {
                    mediaCanPlayThrough = true;
                    if (oncanplaythrough) {
                        oncanplaythrough(e);
                    }
                }
            }
            console.log("Not loaded audio");
        }
    }
    selectedVoice = voice;
}

function changeVoiceEvent(e) {
    changeVoice(e.target.getAttribute("voice"), e => { });
}

function init() {
    for (const voice in audioFiles) {
        if (audioFiles.hasOwnProperty(voice)) {
            //const element = audioFiles[voice];
            createDropdownLink(voice, "voice", voice, changeVoiceEvent, voiceDropdown);
        }
    }
    changeVoice(selectedVoice, e => { });

    mainContainer.style.display = "";
    initMain.style.display = "none";
    //tutorial.style.display = "none";

    for (var i = 0; i < mainNav.length; i++) {
        mainNav[i].style.display = "initial";
    }
    for (var i = 0; i < initNav.length; i++) {
        initNav[i].style.display = "none";
    }

    if (!videoFiles.Sopran || !videoFiles.Alt || !videoFiles.Tenor || !videoFiles.Bass) {
        btnPlayConductor.style.display = "none";
    }

    populateDeviceList();
    initVuMeter();
    initCamera();
}

conductor.addEventListener("end", e => {
    conductor.currentTime = 0;
});

btnPlayConductor.addEventListener("click", e => {
    if (conductor.paused) {
        useConductor = true;
        changeVoice(selectedVoice, e => {
            conductor.play();
        });
        conductor.currentTime = 0;
    } else {
        conductor.pause();
    }
});

function addStaticText() {
    if (!window.location.protocol.includes("https")) {
        window.location.protocol = "https:";
        httpsLink.href = "https" + window.location.href.substr(window.location.href.indexOf("://"))
        httpsNotice.style.display = "";
        return;
    }
    if (typeof navigator.getUserMedia === 'undefined' && typeof !navigator.mediaDevices === 'undefined') {
        httpsNotice.innerHTML = "Ihr Browser unterstützt die Nutzung der Kamera/des Mikrofons nicht. Bitte verwenden Sie einen moderneren Browser.<br>\n"
            + "Getestete Browser: Google Chrome (Version 80), Mozilla Firefox (Version 74), Chrome für Android (Version 80)";
        httpsNotice.style.display = "";
        return;
    }
    if (typeof MediaRecorder === 'undefined') {
        httpsNotice.innerHTML = "Ihr Browser unterstützt die Aufnahme von Bild/Ton nicht. Bitte verwenden Sie einen moderneren Browser.<br>\n"
            + "Getestete Browser: Google Chrome (Version 80), Mozilla Firefox (Version 74), Chrome für Android (Version 80)";
        httpsNotice.style.display = "";
        return;
    }
    mainPage.style.display = "";
    for (const voice in uploadLinks) {
        if (uploadLinks.hasOwnProperty(voice)) {
            const element = uploadLinks[voice];
            document.querySelector("#upload" + voice).href = element;
        }
    }
    var pieceNames = document.querySelectorAll(".pieceName");
    for (var i = 0; i < pieceNames.length; i++) {
        pieceNames[i].innerText = songName;
    }
}

addStaticText();

//initMain.innerText = JSON.stringify(constraintsToAudioObject(navigator.mediaDevices.getSupportedConstraints()));