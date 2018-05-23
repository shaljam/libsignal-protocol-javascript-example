class Peer {
    constructor(jid, store) {
        this.jid = jid;
        this.store = store;
        this.devices = {};
    }

    async encrypt(plaintext) {
        let remoteDeviceIds = this.store.getDeviceList(this.jid);
        let ownDeviceIds = this.store.getOwnDeviceList().filter((id) => {
            return id !== this.store.getDeviceId();
        });

        let aes = await this.encryptWithAES(plaintext);
        let promises = [];

        for (let id of remoteDeviceIds) {
            let device = this.getDevice(id);

            promises.push(device.encrypt(aes.keydata));
        }

        for (let id of ownDeviceIds) {
            let device = this.getOwnDevice(id);

            promises.push(device.encrypt(aes.keydata));
        }

        let keys = await Promise.all(promises);

        keys = keys.filter(key => key !== null);

        if (keys.length === 0) {
            throw 'Could not encrypt data with any Signal session';
        }

        return {
            keys: keys,
            iv: aes.iv,
            payload: aes.payload
        };
    }

    decrypt(deviceId, ciphertext, preKey = false) {
        let device = this.getDevice(deviceId);

        return device.decrypt(ciphertext, preKey);
    }

    getDevice(id) {
        if (!this.devices[id]) {
            this.devices[id] = new Device(this.jid, id, this.store);
        }

        return this.devices[id];
    }

    getOwnDevice(id) {
        if (!Peer.ownDevices[id]) {
            Peer.ownDevices[id] = new Device(Peer.ownJid, id, this.store);
        }

        return Peer.ownDevices[id];
    }

    static setOwnJid(jid) { //@REVIEW
        Peer.ownJid = jid;
        Peer.ownDevices = {};
    }

    async encryptWithAES(plaintext) {
        let iv = window.crypto.getRandomValues(new Uint8Array(12));
        let key = await this.generateAESKey();
        let encrypted = await this.generateAESencryptedMessage(iv, key, plaintext);

        let ciphertext = encrypted.ciphertext;
        let authenticationTag = encrypted.authenticationTag;

        let keydata = await window.crypto.subtle.exportKey('raw', key)

        return {
            keydata: ArrayBufferUtils.concat(keydata, authenticationTag),
            iv: iv,
            payload: ciphertext
        }
    }

    async generateAESKey() {
        let algo = {
            name: 'AES-GCM',
            length: AES_KEY_LENGTH,
        };
        let keyUsage = ['encrypt', 'decrypt'];

        let key = await window.crypto.subtle.generateKey(algo, AES_EXTRACTABLE, keyUsage);

        return key;
    }

    async generateAESencryptedMessage(iv, key, plaintext) {
        let encryptOptions = {
            name: 'AES-GCM',
            iv: iv,
            tagLength: AES_TAG_LENGTH
        };
        let encodedPlaintext = ArrayBufferUtils.encode(plaintext);

        let encrypted = await window.crypto.subtle.encrypt(encryptOptions, key, encodedPlaintext);
        let ciphertextLength = encrypted.byteLength - ((128 + 7) >> 3);
        let ciphertext = encrypted.slice(0, ciphertextLength)
        let authenticationTag = encrypted.slice(ciphertextLength);

        return {
            ciphertext: ciphertext,
            authenticationTag: authenticationTag
        };
    }
}
