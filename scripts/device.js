class Device {
   constructor(jid, id, store) {
      this.address = new SignalProtocolAddress(jid, id);
      this.store = store;
   }

   async decrypt(ciphertext, preKey = false) {
      let sessionCipher = new SessionCipher(this.store, this.address);
      let plaintextBuffer;

      if (preKey)
         plaintextBuffer = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
      else
         plaintextBuffer = await sessionCipher.decryptWhisperMessage(ciphertext, 'binary');

      return plaintextBuffer;
   }

   async encrypt(plaintext) {
      try {
         if (!this.store.hasSession(this.address.toString())) {
            await this.establishSession();
         }

         let session = this.getSession();
         let ciphertext = await session.encrypt(plaintext);

         return {
            preKey: ciphertext.type === 3,
            ciphertext: ciphertext,
            deviceId: this.address.getDeviceId()
         }
      } catch (err) {
         console.log('Error:', err)
         console.warn('Could not encrypt data for device with id ' + this.address.getDeviceId());

         return null; // Otherwise Promise.all throws an error
      }
   }

   processPreKeyMessage(preKeyBundle) {
      let builder = new SessionBuilder(this.store, this.address);

      return builder.processPreKey(preKeyBundle);
   }

   async establishSession() {
      let signalBundle = await this.store.getPreKeyBundle(this.address);

      this.processPreKeyMessage(signalBundle);
   }

   getSession() {
      if (!this.session) {
         this.session = new SessionCipher(this.store, this.address);
      }

      return this.session;
   }
}
