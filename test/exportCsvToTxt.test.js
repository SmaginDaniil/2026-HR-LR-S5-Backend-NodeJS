const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const exportCsvToTxt = require('../src/exportCsvToTxt');

const assetsDir = path.join(__dirname, '..', 'src', 'assets');

test('streams, validates, filters, and enriches movie records', async () => {
  const stats = await exportCsvToTxt();
  const lines = (await fs.readFile(path.join(assetsDir, 'movies.txt'), 'utf8'))
    .trim()
    .split(/\r?\n/);
  const records = lines.map((line) => JSON.parse(line));

  assert.deepEqual(stats, {
    processed: 15,
    exported: 8,
    skipped: { invalid: 1, filtered: 6 },
    byDecade: { '1990s': 2, '2000s': 2, '2010s': 4 },
  });
  assert.equal(records.length, 8);
  assert.deepEqual(records[0], {
    movie: 'Inception',
    director: 'Christopher Nolan',
    year: 2010,
    rating: 8.8,
    decade: '2010s',
    length: '2h 28m',
  });
  assert.equal(records.some((record) => record.movie === 'Crouching Tiger; Hidden Dragon'), false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(assetsDir, 'summary.json'), 'utf8')), stats);

  const relaxedStats = await exportCsvToTxt({ minRating: 7.9 });
  const relaxedRecords = (await fs.readFile(path.join(assetsDir, 'movies.txt'), 'utf8'))
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.equal(relaxedStats.exported, 10);
  assert.equal(relaxedRecords[9].movie, 'Crouching Tiger; Hidden Dragon');

  await exportCsvToTxt();
});
