const test = require('node:test');
const assert = require('node:assert/strict');
const WithTime = require('../src/WithTime');

test('emits lifecycle events and returns the callback result', async () => {
  const timed = new WithTime();
  const events = [];
  timed.on('begin', () => events.push('begin'));
  timed.on('data', (value) => events.push(['data', value]));
  timed.on('end', () => events.push('end'));

  const result = await timed.execute((value, callback) => callback(null, value * 2), 4);

  assert.equal(result, 8);
  assert.deepEqual(events, ['begin', ['data', 8], 'end']);
});

test('emits error and end when the callback fails', async () => {
  const timed = new WithTime();
  const failure = new Error('request failed');
  const events = [];
  timed.on('begin', () => events.push('begin'));
  timed.on('error', (error) => events.push(['error', error]));
  timed.on('end', () => events.push('end'));

  await assert.rejects(timed.execute((callback) => callback(failure)), failure);
  assert.deepEqual(events, ['begin', ['error', failure], 'end']);
});

test('handles a synchronous exception and ignores duplicate callback calls', async () => {
  const timed = new WithTime();
  const failure = new Error('synchronous failure');
  let endCount = 0;
  timed.on('error', () => {});
  timed.on('end', () => {
    endCount += 1;
  });

  await assert.rejects(timed.execute(() => {
    throw failure;
  }), failure);

  await timed.execute((callback) => {
    callback(null, 'first');
    callback(null, 'second');
  });
  assert.equal(endCount, 2);
});
