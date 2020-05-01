const vuMeter = document.querySelector("#vuMeter");

var vuAudioContext;
var vuAudioContextSource;
var vuMeterProcessor;
var vuMeterGain;

function initVuMeter() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        vuAudioContext = new AudioContext();
        vuAudioContext.resume();
        vuMeterGain = vuAudioContext.createGain();
        var lastVol = 0;
        var lastPeak = 0;
        vuMeterProcessor = vuAudioContext.createScriptProcessor(512);
        vuMeterGain.connect(vuMeterProcessor);
        vuMeterProcessor.onaudioprocess = e => {
            var audio = e.inputBuffer.getChannelData(0);
            const len = audio.length;
            var sumSquare = 0.0;
            var thisPeak = 0;
            const normalizeFactor = 0.5 / (lastPeak);
            //console.log(normalizeFactor);
            if (useNormalization) {
                vuMeterGain.gain.value = isFinite(normalizeFactor) && normalizeFactor > 0 ? normalizeFactor : 1;
            }
            for (var i = 0; i < len; i++) {
                if (Math.abs(audio[i]) > thisPeak) {
                    thisPeak = Math.abs(audio[i]);
                }
                /* if (i >= 10 && i <= len - 10) {
                    var isClip = true;
                    for (var a = 1; a < len && a < 10; a++) {
                        if (audio[i - a] < audio[i] - 0.001 || audio[i - a] > audio[i] + 0.001 || (audio[i - a] < 0.1 && audio[i - a] > -0.1)) {
                            isClip = false;
                            break;
                        }
                    }
                    if (isClip) {
                        //console.log("Clip lower!");
                    }
                } */
                sumSquare += audio[i] * audio[i];
            }
            lastPeak = thisPeak;
            //console.log(Math.sqrt(sumSquare / len) + ";" + (sumAbs / len));
            lastVol = Math.max(lastVol * 0.90, Math.sqrt(sumSquare / len))
            vuMeter.style.height = (lastVol * 100.0) + "%";
        };
    } catch (e) {
        console.log(e);
        alert('Web Audio API nicht unterstützt. Bitte neueren Browser verwenden!');
    }
}

function attachStreamToVu(stream) {
    if (vuAudioContext && vuMeterProcessor) {
        vuAudioContextSource = vuAudioContext.createMediaStreamSource(stream);
        vuAudioContextSource.connect(vuMeterGain);
        vuMeterProcessor.connect(vuAudioContext.destination);
    }
}

function detatchVuMeter() {
    vuAudioContextSource.disconnect();
    vuMeterProcessor.disconnect();
    vuAudioContextSource = undefined;
}