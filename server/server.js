const WebSocket = require('ws');

const wss = new WebSocket.Server({ host: 'localhost', port: 2222 });

function send(ws, o) {
    ws.send(JSON.stringify(o));
}

var websockets = {};
var bundles = {};
var devices = {};

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(event) {
        console.log('received: %s', event);

        const message = JSON.parse(event);

        switch(message.type) {
            case 'register':
                let username = message.username;
                ws.username = username;
                if (username in websockets) {
                    websockets[username].push(ws);
                }
                else {
                    websockets[username] = [ws];
                }

                let devs = username in devices ? devices[username] : []

                ws.send(JSON.stringify({ type: 'registered', devices: devs}));
                for (dev in devices) {
                    if (dev === username) {
                        continue;
                    }
                    
                    ws.send(JSON.stringify({ type: 'devices', username: dev, devices: devices[dev] }));
                }
                break;
            case 'bundle':
                bundles[message.deviceId] = message.bundle;
                break;
            case 'devices':
                devices[message.username] = message.devices;
                sendToAll(ws, message);
                break;
            case 'getBundle':
                let deviceId = message.deviceId;
                if (deviceId in bundles) {
                    ws.send(JSON.stringify({
                        type: 'bundle',
                        deviceId: deviceId,
                        bundle: bundles[deviceId]
                    }));
                }
                break;
            case 'message':
                let to = message.to;
                if (!(to in websockets)) {
                    console.warn('cannot find message recipient %s', to);
                    break;
                }

                sendToUserSockets(ws, to, message);
                break;
            default:
                console.warn('unknown message type: %s', message.type);
                break;
        }
    });
});

let sendToAll = function(ws, message) {
    for (key in websockets) {
        sendToUserSockets(ws, key, message);
    }
}

let sendToUserSockets = function(ws, key, message) {
    var userSockets = websockets[key];
    var badSockets = [];

    for (i = 0; i < userSockets.length; i++) {
        let websocket = userSockets[i];

        if (websocket == ws) {
            continue;
        }

        if (websocket.readyState != 1) {
            console.log('skipping bad websocket');
            badSockets.push(i);    
            continue;
        }

        websocket.send(JSON.stringify(message));
    }

    if (badSockets.length == userSockets.length) { // all user sockets closed
        delete websockets[key];
        return;
    }

    badSockets.forEach(function(i) {
        userSockets.splice(i, 1);
    });

    if (userSockets.length > 0) {
        websockets[key] = userSockets;
        return;
    }

    delete websockets[key];
}
