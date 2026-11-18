const { EventEmitter } = require('node:events');

let nextTimerId = 0;

class WithTime extends EventEmitter {
  execute(asyncFunc, ...args) {
    if (typeof asyncFunc !== 'function') {
      return Promise.reject(new TypeError('asyncFunc must be a function'));
    }

    const timerLabel = `WithTime:${++nextTimerId}`;

    return new Promise((resolve, reject) => {
      let completed = false;

      const finish = (err, result) => {
        if (completed) {
          return;
        }
        completed = true;

        console.timeEnd(timerLabel);

        let listenerError;
        try {
          if (err) {
            this.emit('error', err);
          } else if (result !== undefined) {
            this.emit('data', result);
          }
        } catch (error) {
          listenerError = error;
        } finally {
          try {
            this.emit('end');
          } catch (error) {
            listenerError = listenerError || error;
          }
        }

        if (listenerError) {
          reject(listenerError);
        } else if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      };

      console.time(timerLabel);
      try {
        this.emit('begin');
      } catch (error) {
        finish(error);
        return;
      }

      try {
        asyncFunc(...args, finish);
      } catch (error) {
        finish(error);
      }
    });
  }
}

module.exports = WithTime;
