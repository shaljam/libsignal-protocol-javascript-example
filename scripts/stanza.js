class Stanza {
    static buildEncryptedStanza(message, ownDeviceId) {
        //   <encrypted xmlns='eu.siacs.conversations.axolotl'>
        //     <header sid='27183'>
        //       <key rid='31415'>BASE64ENCODED...</key>
        //       <key prekey="true" rid='12321'>BASE64ENCODED...</key>
        //       <!-- ... -->
        //       <iv>BASE64ENCODED...</iv>
        //     </header>
        //   </encrypted>
        var encryptedElement = {
            header: {
                sid: ownDeviceId,
                keys: [],
                iv: ArrayBufferUtils.toBase64(message.iv)
            },
            payload: ArrayBufferUtils.toBase64(message.payload)
        };

        let keys = message.keys.map(function (key) {
            return {
                rid: key.deviceId,
                prekey: key.preKey ? true : undefined,
                value: btoa(key.ciphertext.body)
            };
        });

        encryptedElement.header.keys = keys

        return encryptedElement;
    }

    static parseEncryptedStanza(encryptedElement) {
        let headerElement = encryptedElement.header;
        let payloadElement = encryptedElement.payload;

        if (headerElement === undefined) {
            return false;
        }

        let sourceDeviceId = headerElement.sid;
        let iv = ArrayBufferUtils.fromBase64(headerElement.iv);
        let payload = ArrayBufferUtils.fromBase64(payloadElement);

        let keys = headerElement.keys.map(function (keyElement) {
            return {
                preKey: keyElement.prekey,
                ciphertext: atob(keyElement.value),
                deviceId: keyElement.rid
            };
        }); //@REVIEW maybe index would be better

        return {
            sourceDeviceId: sourceDeviceId,
            keys: keys,
            iv: iv,
            payload: payload
        };
    }
}
