class Random {
    static number(max, min = 0) {
       if (crypto && typeof crypto.getRandomValues === 'function') {
          return Random.numberWithCSPRG(max, min);
       } else {
          return Random.numberWithoutCSPRG(max, min);
       }
    }
 
    static numberWithCSPRG(max, min) {
       const randomBuffer = new Uint32Array(1);
 
       window.crypto.getRandomValues(randomBuffer);
 
       let randomNumber = randomBuffer[0] / (0xffffffff + 1);
 
       min = Math.ceil(min);
       max = Math.floor(max);
       return Math.floor(randomNumber * (max - min + 1)) + min;
    }
 
    static numberWithoutCSPRG(max, min) {
       return Math.floor(Math.random() * (max - min)) + min;
    }
 }