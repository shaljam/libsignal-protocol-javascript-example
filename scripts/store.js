const STORE_PREFIX = 'store';
const STORE_PREFIX_SESSION = 'session:';
const STORE_PREFIX_IDENTITYKEY = 'identityKey:';
const STORE_PREFIX_PREKEY = '25519KeypreKey:';
const STORE_PREFIX_SIGNEDPREKEY = '25519KeysignedKey:';

//@TODO create SignalStore interface in order to know which functions are required by Signal

D_SENDING = 1;
D_RECEIVING = 2;

class Store {

    constructor(storage, connection, deviceNumber) { //@TODO add ts type
        this.storage = storage;
        this.connection = connection;
        this.deviceNumber = deviceNumber;
        this.Direction = {
            SENDING: 1,
            RECEIVING: 2
        }
    }

    getOwnDeviceList() {
        return this.get('deviceList', []);
    }

    setOwnDeviceList(deviceList) {
        this.put('deviceList', deviceList);
    }

    getDeviceList(identifier) {
        return this.get('deviceList:' + identifier, []);
    }

    setDeviceList(identifier, deviceList) {
        this.put('deviceList:' + identifier, deviceList);
    }

    isReady() {
        return this.get('deviceId') && this.get('identityKey') && this.get('registrationId');
    }

    isPublished() {
        return this.get('published') === 'true' || this.get('published') === true;
    }

    getIdentityKeyPair() {
        return Promise.resolve(this.get('identityKey'));
    }

    getLocalRegistrationId() {
        return Promise.resolve(this.get('registrationId'));
    }

    getDeviceId() {
        return parseInt(this.get('deviceId'));
    }

    put(key, value) {
        if (key === undefined || value === undefined || key === null || value === null)
            throw new Error('Tried to store undefined/null');

        //@REVIEW serialization is done in storage.setItem
        let stringified = JSON.stringify(value, function (key, value) {
            if (value instanceof ArrayBuffer) {
                return ArrayBufferUtils.toArray(value)
            }

            return value;
        });

        if (key.includes('identityKey')) {
            console.log('put %s: %s \n %s \n\n', key, value, stringified);
        }
        

        this.storage.setItem(STORE_PREFIX, key, {
            v: stringified
        });
    }

    get(key, defaultValue) {
        if (key === null || key === undefined)
            throw new Error('Tried to get value for undefined/null key');

        const data = this.storage.getItem(STORE_PREFIX, key);

        if (data) {
            let r = JSON.parse(data.v, function (key1, value) {
                if (/Key$/.test(key1)) {
                // if (key.includes('Key')) {
                    console.log('get %s has Key %s', key, key1);
                    return ArrayBufferUtils.fromArray(value);
                }

                return value;
            });

            if (key === 'identityKey') {
                console.log('get %s: %s \n %s\n\n', key, data, r);
            }

            return r;
        }

        return defaultValue;
    }

    remove(key) {
        if (key === null || key === undefined)
            throw new Error('Tried to remove value for undefined/null key');

        this.storage.removeItem(STORE_PREFIX, key);
    }

    isTrustedIdentity(identifier, identityKey) {
        if (identifier === null || identifier === undefined) {
            throw new Error('tried to check identity key for undefined/null key');
        }

        if (!(identityKey instanceof ArrayBuffer)) {
            throw new Error('Expected identityKey to be an ArrayBuffer');
        }

        let trusted = this.get(STORE_PREFIX_IDENTITYKEY + identifier);
        console.log('trusted %s \t %s \t %s', trusted === undefined, trusted, STORE_PREFIX_IDENTITYKEY + identifier);
        if (trusted === undefined) {
            return Promise.resolve(true);
        }

        return Promise.resolve(ArrayBufferUtils.isEqual(identityKey, trusted));
    }

    saveIdentity(identifier, identityKey) {
        if (identifier === null || identifier === undefined)
            throw new Error('Tried to put identity key for undefined/null key');

        let address = new SignalProtocolAddress.fromString(identifier);

        let existing = this.get(STORE_PREFIX_IDENTITYKEY + address.toString());
        this.put(STORE_PREFIX_IDENTITYKEY + address.toString(), identityKey); //@REVIEW stupid?

        return Promise.resolve(existing && ArrayBufferUtils.isEqual(identityKey, existing));
    }

    loadPreKey(keyId) {
        let res = this.get(STORE_PREFIX_PREKEY + keyId);
        if (res !== undefined) {
            res = {
                pubKey: res.pubKey,
                privKey: res.privKey
            };
        }

        return Promise.resolve(res);
    }

    storePreKey(keyId, keyPair) {
        return Promise.resolve(this.put(STORE_PREFIX_PREKEY + keyId, keyPair));
    }

    removePreKey(keyId) {
        //@TODO publish new bundle

        return Promise.resolve(this.remove(STORE_PREFIX_PREKEY + keyId));
    }

    loadSignedPreKey(keyId) {
        let res = this.get(STORE_PREFIX_SIGNEDPREKEY + keyId);
        if (res !== undefined) {
            res = {
                pubKey: res.pubKey,
                privKey: res.privKey
            };
        }

        return Promise.resolve(res);
    }

    storeSignedPreKey(keyId, keyPair) {
        return Promise.resolve(this.put(STORE_PREFIX_SIGNEDPREKEY + keyId, keyPair));
    }

    removeSignedPreKey(keyId) {
        return Promise.resolve(this.remove(STORE_PREFIX_SIGNEDPREKEY + keyId));
    }

    loadSession(identifier) {
        return Promise.resolve(this.get(STORE_PREFIX_SESSION + identifier));
    }

    storeSession(identifier, record) {
        return Promise.resolve(this.put(STORE_PREFIX_SESSION + identifier, record));
    }

    removeSession(identifier) {
        return Promise.resolve(this.remove(STORE_PREFIX_SESSION + identifier));
    }

    hasSession(identifier) {
        return !!this.get(STORE_PREFIX_SESSION + identifier)
    }

    removeAllSessions(identifier) {
        //@TODO implement removeAllSessions
        // for (var id in this.store) {
        //    if (id.startsWith(this.STORE_prefix + ':' + 'session' + identifier)) {
        //       localStorage.removeItem(this.STORE_prefix + ':' + id);
        //    }
        // }
        return Promise.resolve();
    }

    async getPreKeyBundle(address) {
        const node = NS_BUNDLES + address.getDeviceId();

        // TODO: get bundle form localstorage
        var bundleElement = await this.connection.getBundle(address.getDeviceId());

        if (bundleElement === undefined) {
            return Promise.reject('Found no bundle');
        }

        const bundle = Bundle.fromJSON(bundleElement);

        //@REVIEW registrationId??? Gajim uses probably own registration id.
        return bundle.toSignalBundle(address.getDeviceId())
    }
}
