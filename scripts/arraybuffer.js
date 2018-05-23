// require('array-buffer-concat');
// require('base64-arraybuffer')

let decoder = new(window).TextDecoder('utf-8');
var encoder = new(window).TextEncoder('utf-8');

function bufferConcat () {
    var length = 0
    var buffer = null
  
    for (var i in arguments) {
      buffer = arguments[i]
      length += buffer.byteLength
    }
  
    var joined = new Uint8Array(length)
    var offset = 0
  
    for (var i in arguments) {
      buffer = arguments[i]
      joined.set(new Uint8Array(buffer), offset)
      offset += buffer.byteLength
    }
  
    return joined.buffer
  }
  
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  
    // Use a lookup table to find the index.
    var lookup = new Uint8Array(256);
    for (var i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }

    class Base64ArrayBuffer {
  
    static encode(arraybuffer) {
      var bytes = new Uint8Array(arraybuffer),
      i, len = bytes.length, base64 = "";
  
      for (i = 0; i < len; i+=3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
      }
  
      if ((len % 3) === 2) {
        base64 = base64.substring(0, base64.length - 1) + "=";
      } else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + "==";
      }
  
      return base64;
    }
  
    static decode(base64) {
      var bufferLength = base64.length * 0.75,
      len = base64.length, i, p = 0,
      encoded1, encoded2, encoded3, encoded4;
  
      if (base64[base64.length - 1] === "=") {
        bufferLength--;
        if (base64[base64.length - 2] === "=") {
          bufferLength--;
        }
      }
  
      var arraybuffer = new ArrayBuffer(bufferLength),
      bytes = new Uint8Array(arraybuffer);
  
      for (i = 0; i < len; i+=4) {
        encoded1 = lookup[base64.charCodeAt(i)];
        encoded2 = lookup[base64.charCodeAt(i+1)];
        encoded3 = lookup[base64.charCodeAt(i+2)];
        encoded4 = lookup[base64.charCodeAt(i+3)];
  
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
      }
  
      return arraybuffer;
    };
}
  

class ArrayBufferUtils {
    static concat(a, b) {
        return bufferConcat(a, b);
    }

    static decode(a) {
        return decoder.decode(a);
    }

    static encode(s) {
        return encoder.encode(s); //@REVIEW returns Uint8Array  
    }

    static toBase64(a) {
        return Base64ArrayBuffer.encode(a);
    }

    static fromBase64(s) {
        return Base64ArrayBuffer.decode(s);
    }

    static toString(thing) {
        if (typeof thing === 'string') {
            return thing;
        }
        return new(window).dcodeIO.ByteBuffer.wrap(thing).toString('binary');
    }

    static isEqual(a, b) {
        // TODO: Special-case arraybuffers, etc
        if (a === undefined || b === undefined) {
            return false;
        }

        a = ArrayBufferUtils.toString(a);
        b = ArrayBufferUtils.toString(b);

        let maxLength = Math.max(a.length, b.length);
        if (maxLength < 5) {
            throw new Error("a/b compare too short");
        }

        return a.substring(0, Math.min(maxLength, a.length)) == b.substring(0, Math.min(maxLength, b.length));
    }

    static toArray(a) {
        return Array.apply([], new Uint8Array(a));
    }

    static fromArray(a) {
        return new Uint8Array(a).buffer;
    }
}
