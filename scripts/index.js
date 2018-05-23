const NUM_PRE_KEYS = 10;
const NS_BASE = 'eu.siacs.conversations.axolotl';
const NS_DEVICELIST = NS_BASE + '.devicelist';
const NS_BUNDLES = NS_BASE + '.bundles:';
const AES_KEY_LENGTH = 128;
const AES_TAG_LENGTH = 128;
const AES_EXTRACTABLE = true;

localStorage.clear();

let libsignal = (window).libsignal;

let KeyHelper = libsignal.KeyHelper;
let SignalProtocolAddress = libsignal.SignalProtocolAddress;
let SessionBuilder = libsignal.SessionBuilder;
let SessionCipher = libsignal.SessionCipher;
let FingerprintGenerator = libsignal.FingerprintGenerator;

var connection;

function sendMessage() {
    if (connection === undefined) {
        return;
    }

    let to = document.getElementById('to').value;
    let message = document.getElementById('message').value;

    connection.sendMessage(to, message);
}

function register() {
    if (connection !== undefined) {
        return;
    }

    let username = document.getElementById('username').value;
    connection = new Connection(username);
}
