class Omemo {
  constructor(storage, connection, deviceNumber) {
    this.connection = connection;
    this.store = new Store(storage, connection, deviceNumber);
    this.peers = {};

    Peer.setOwnJid(connection.username);
    this.deviceNumber = deviceNumber;
  }

  storeOwnDeviceList(deviceList) {
    this.store.setOwnDeviceList(deviceList);
  }

  storeDeviceList(identifier, deviceList) {
    this.store.setDeviceList(identifier, deviceList);
  }

  prepare() {
    if (!this.bootstrap) {
      this.bootstrap = new Bootstrap(this.store, this.connection);
    }

    return this.bootstrap.prepare();
  }

  encrypt(contact, message, xmlElement) {
    const peer = this.getPeer(contact);

    return peer.encrypt(message).then((encryptedMessages) => {
      const stanza = Stanza.buildEncryptedStanza(encryptedMessages, this.store.getDeviceId());

      //  $(xmlElement.tree()).find(`html[xmlns="${Strophe.NS.XHTML_IM}"]`).remove();
      //  $(xmlElement.tree()).find('>body').remove();

      //  xmlElement.cnode(stanza.tree());
      //  xmlElement.up().c('store', {
      //     xmlns: 'urn:xmpp:hints'
      //  }).up();

      //  message.encrypted = stanza;

      return stanza;
    })
    // .catch((msg) => {
    //    console.warn(msg); //@TODO show warning

    //    return message;
    // });
  }

  async decrypt(stanza) {
    if (stanza.type !== 'message') {
      throw 'Root element is no message element';
    }

    const encryptedElement = stanza.encrypted;

    if (encryptedElement === undefined) {
      throw 'No encrypted stanza found';
    }

    const from = stanza.from;
    const encryptedData = Stanza.parseEncryptedStanza(encryptedElement);

    if (!encryptedData) {
      throw 'Could not parse encrypted stanza';
    }

    const ownDeviceId = this.store.getDeviceId();
    const ownPreKeyFiltered = encryptedData.keys.filter(function (preKey) {
      return ownDeviceId === preKey.deviceId;
    });

    if (ownPreKeyFiltered.length !== 1) {
      return Promise.reject(`Found ${ownPreKeyFiltered.length} PreKeys which match my device id (${ownDeviceId}).`);
    }

    const ownPreKey = ownPreKeyFiltered[0]; //@TODO rename var
    const peer = this.getPeer(from);
    //   const exportedKey;

    var exportedKey;
    try {
      exportedKey = await peer.decrypt(encryptedData.sourceDeviceId, ownPreKey.ciphertext, ownPreKey.preKey);
    } catch (err) {
      throw 'Error during decryption: ' + err;
    }

    const exportedAESKey = exportedKey.slice(0, 16);
    const authenticationTag = exportedKey.slice(16);

    if (authenticationTag.byteLength !== 16) {
      //@TODO authentication tag is also allowed to be larger
      throw "Authentication tag too short";
    }

    const iv = (encryptedData).iv;
    const ciphertextAndAuthenticationTag = ArrayBufferUtils.concat((encryptedData).payload, authenticationTag);

    return this.decryptWithAES(exportedAESKey, iv, ciphertextAndAuthenticationTag);
  }

  async decryptWithAES(exportedAESKey, iv, data) {
    const key = await window.crypto.subtle.importKey('raw', exportedAESKey, {
      name: 'AES-GCM'
    }, false, ['decrypt']);

    const decryptedBuffer = await window.crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: iv,
      tagLength: AES_TAG_LENGTH
    }, key, data);

    return ArrayBufferUtils.decode(decryptedBuffer);
  }

  getPeer(jid) {
    if (!this.peers[jid]) {
      this.peers[jid] = new Peer(jid, this.store);
    }

    return this.peers[jid];
  }
}
