# libsignal-protocol-javascript example
An example on "how to use `libsignal-protocol-javascript`?"

## Components
- `server.js`
- `index.html` and `scripts`

## How to run
- Run server with node: `node server.js`. (It only requires `ws` I think)
- Open `index.html` in browser. Register with a username and send messages to other usernames.
> Note that because tabs share `localStorage`, using multiple tabs from the same browser won't work. Try different browsers or Private/Incognito Windows/Tabs.

## What's changed in libsignal-protocol.js
`libsignal-protocol.js` was sending `SignalProtocolAddress.getName()` when calling `storage.isTrustedidentity()`, and it was wrong. Because every username (`SignalProtocolAddress.getName()`) can have multiple `devices`, `identityKeys` should be persistent for every address (`username` AND `deviceId`). So calls to `storage.isTrustedIdentity()` are sending `remoteAddress.toString()` instead of `remoteAddress.getName()`. See [this](https://github.com/signalapp/libsignal-protocol-java/blob/370406c6f4472115303a5f090fb4f85657064c41/java/src/main/java/org/whispersystems/libsignal/state/impl/InMemoryIdentityKeyStore.java) also.

I applied the changes to `libsignal-protocol.js` in a different commit, so it's possible to see what's changed.

## Libraries used
- [libsignal-protocol-javascript](https://github.com/signalapp/libsignal-protocol-javascript/blob/f5a838f1ccc9bddb5e93b899a63de2dea9670e10/dist/libsignal-protocol.js)
- [jsxc-plugin-omemo](https://github.com/jsxc/jsxc-plugin-omemo/tree/5e8a59dab895b9a00cb31820978adf7687a2d512)
- [array-buffer-concat](https://github.com/jessetane/array-buffer-concat/blob/1be7ee00c229a60e5c2d5b36d9433973c794f1be/index.js)
- [base64-arraybuffer](https://github.com/niklasvh/base64-arraybuffer/blob/e9457ccb7b140f5ae54a2880c8e9b967ffb03a7d/lib/base64-arraybuffer.js)


I mainly used `jsxc-plugin-omemo` for the structure and classed (it was in TypeScript and I wasn't comfortable with that, so converted it to js). So the classes are almost doing what they where doing.