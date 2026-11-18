# 2026-HR-LR-S5-Backend-NodeJS

## Install and test

```sh
npm install
npm test
```

## Timed callback operations

`WithTime` extends Node.js `EventEmitter`. `execute` emits `begin`, then emits
`data` with a defined result or `error` with a failed operation, and always
emits `end` when the callback completes. It returns a promise for the result.

```js
const { WithTime, fetchPost } = require('./src');

const request = new WithTime();
request.on('begin', () => console.log('Request started'));
request.on('data', (post) => console.log(post));
request.on('error', (error) => console.error(error));
request.on('end', () => console.log('Request finished'));

request.execute(fetchPost);
```

## Streaming movie export

`exportCsvToTxt()` reads `src/assets/movies.csv` one parsed row at a time,
writes qualifying records to `src/assets/movies.txt`, and writes processing
statistics to `src/assets/summary.json`. The returned promise resolves with the
same statistics after both output files are complete. Thresholds can be
overridden:

```js
const { exportCsvToTxt } = require('./src');

exportCsvToTxt({ minYear: 2000, minRating: 8.7 })
  .then((stats) => console.log(stats))
  .catch((error) => console.error(error));
```
