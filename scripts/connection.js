class Connection {
    constructor(username) {
        this.username = username;
        this.resolves = {};
        let connection = this;
        var websocket = new WebSocket("ws://localhost:2222/connection");
        this.websocket = websocket;
        this.messagesDiv = document.getElementById('messages');

        let connected = function() {
        }

        this.send = function (o) {
            websocket.send(JSON.stringify(o));
        };

        websocket.onopen = function (event) {
            console.log('socket opened');
    
            this.send(JSON.stringify({
                type: 'register',
                username: connection.username
            }));
        };
    
        websocket.onmessage = function (event) {
            console.log('received message %s', event.data);
    
            var msg = JSON.parse(event.data);
    
            switch (msg.type) {
                case 'registered':
                    let devices = msg.devices;
                    console.log('registered, already registered devices: \n%s', JSON.stringify(devices, null, 4));

                    connection.username;

                    let storage = new Storage();
                    connection.omemo = new Omemo(storage, connection, devices.length);
                    if (devices.length > 0) {
                        connection.updateDevices({
                            username: connection.username,
                            devices: devices
                        })
                    }

                    connection.omemo.prepare();
                    break;
                case 'devices':
                    connection.updateDevices(msg);
                    break;
                case 'bundle':
                    let deviceId = msg.deviceId;
                    if (!(deviceId in connection.resolves)) {
                        break;
                    }

                    let bundle = msg.bundle;

                    let resolves = connection.resolves[deviceId]

                    let l = resolves.length
                    for (i = 0; i < l; i++) {
                        let resolve = resolves.pop();

                        resolve(bundle);
                    }

                    break;
                case 'message':
                    if('encrypted' in msg) {
                        connection.decrypt(msg);
                    }
                    else {
                        console.log('received not encrypted message: %s', message);
                    }

                    
                    break;
                default:
                    console.warn('unknown message type: %s', msg.type);
            }
        };

        websocket.onclose = function(event) {
            console.log('close %s', event);
        };
    
        window.onbeforeunload = function () {
            websocket.onclose = function () {}; // disable onclose handler first
            websocket.close();
        };
    }

    publishDevices(devices) {
        console.log('sending devices: \n%s', JSON.stringify(devices, null, 4));
        this.send({
            type: 'devices',
            username: this.username,
            devices: devices
        });
    }

    publishBundle(deviceId, bundle) {
        this.send({
            type: 'bundle',
            deviceId: deviceId,
            username: this.username,
            bundle: bundle
        });
    }

    async sendMessage(to, message) {
        let encryptedMessage = await this.omemo.encrypt(to, message);
        console.log('sending message: %s to %s', message, to);
        this.send({
            type: 'message',
            from: this.username,
            to: to,
            encrypted: encryptedMessage
        });

        var newNode = document.createElement('div');      
        newNode.innerHTML = 'me: ' + message;
        this.messagesDiv.appendChild(newNode);
    }

    async decrypt(message) {
        let decrypted = await this.omemo.decrypt(message);
        console.log('decrypted message: %s', decrypted);
        var newNode = document.createElement('div');      
        newNode.innerHTML = message.from + ': ' + decrypted;
        this.messagesDiv.appendChild(newNode);
        return decrypted;
    }

    updateDevices(message) {
        let ownJid = this.username;

        let deviceIds = message.devices;

        if (ownJid === message.username) {
            this.omemo.storeOwnDeviceList(deviceIds);

            //@TODO handle own update (check for own device id)
        } else {
            this.omemo.storeDeviceList(message.username, deviceIds);
        }
    }

    getBundle(deviceId) {
        let connection = this;
        return new Promise(function(resolve, reject){
            if (!(deviceId in connection.resolves)) {
                connection.resolves[deviceId] = [];
            }

            connection.resolves[deviceId].push(resolve);
            connection.send({
                type: 'getBundle',
                deviceId: deviceId
            });
          });
    }
}