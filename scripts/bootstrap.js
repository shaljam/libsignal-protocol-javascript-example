class Bootstrap {
   constructor(store, connection) {
       this.store = store;
       this.connection = connection;
   }

   async prepare() {
      if (!this.store.isReady()) {
         await this.setup();
      }

      if (!this.store.isPublished()) {
         let bundle = await this.generateBundle();
         let node = NS_BUNDLES + this.store.getDeviceId();

         // @TODO catch error
         await this.connection.publishBundle(this.store.getDeviceId(), bundle.toObject());
         this.store.put('published', true);

         // @TODO catch error
         await this.addDeviceIdToDeviceList();
      }

      console.debug('OMEMO prepared');
   }

   setup() {
      return Promise.all([
         this.generateDeviceId(),
         KeyHelper.generateIdentityKeyPair(),
         KeyHelper.generateRegistrationId(),
      ]).then(([deviceId, identityKey, registrationId]) => {
         this.store.put('deviceId', deviceId);
         this.store.put('identityKey', identityKey);
         this.store.put('registrationId', registrationId);
      });
   }

   generateDeviceId() {
      return Promise.resolve(Random.number(Math.pow(2, 31) - 1, 1));
   }

   async generateBundle() {
      console.debug('Generate OMEMO bundle');

      let preKeyPromises = [];

      for (let i = 0; i < NUM_PRE_KEYS; i++) {
         preKeyPromises.push(this.generatePreKey(i));
      }

      preKeyPromises.push(this.generateSignedPreKey(1));

      let preKeys = await Promise.all(preKeyPromises);
      let identityKey = await this.store.getIdentityKeyPair();

      return new Bundle({
         identityKey: identityKey,
         signedPreKey: preKeys.pop(),
         preKeys: preKeys
      });
   }

   async generatePreKey(id) {
      let preKey = await KeyHelper.generatePreKey(id);

      this.store.storePreKey(id, preKey.keyPair);

      return preKey;
   }

   async generateSignedPreKey(id) {
      let identity = await this.store.getIdentityKeyPair();
      let signedPreKey = await KeyHelper.generateSignedPreKey(identity, id);

      this.store.storeSignedPreKey(id, signedPreKey.keyPair);

      return signedPreKey;
   }

   addDeviceIdToDeviceList() {
      let jid = this.connection.username;
      let deviceIds = this.store.getOwnDeviceList();
      let ownDeviceId = this.store.getDeviceId();

      if (deviceIds.indexOf(ownDeviceId) < 0) { //@REVIEW string vs number
         deviceIds.push(ownDeviceId);
      }

      return this.connection.publishDevices(deviceIds);
   }
}
