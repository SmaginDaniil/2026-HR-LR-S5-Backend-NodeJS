const fs = require('node:fs');
const path = require('node:path');
const csv = require('csvtojson');

const assetsDir = path.join(__dirname, 'assets');

function toMovieRecord(row) {
  const yearText = String(row.Year ?? '').trim();
  const ratingText = String(row.Rating ?? '').trim().replace(',', '.');
  const year = Number(yearText);
  const rating = Number(ratingText);

  if (
    !row.Movie ||
    !row.Director ||
    yearText === '' ||
    ratingText === '' ||
    !Number.isFinite(year) ||
    !Number.isFinite(rating)
  ) {
    return { invalid: true };
  }

  const duration = Number(row.Duration);
  if (!Number.isFinite(duration) || duration < 0) {
    return { invalid: true };
  }

  return {
    invalid: false,
    movie: {
      movie: row.Movie,
      director: row.Director,
      year,
      rating,
      decade: `${Math.floor(year / 10) * 10}s`,
      length: `${Math.floor(duration / 60)}h ${duration % 60}m`,
    },
  };
}

function writeLine(stream, line) {
  if (stream.write(`${line}\n`)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.removeListener('drain', onDrain);
      stream.removeListener('error', onError);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    stream.once('drain', onDrain);
    stream.once('error', onError);
  });
}

function closeStream(stream) {
  if (!stream || stream.closed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    stream.once('close', resolve);
    if (!stream.destroyed) {
      stream.destroy();
    }
  });
}

async function exportCsvToTxt({ minYear = 1995, minRating = 8.5 } = {}) {
  const inputPath = path.join(assetsDir, 'movies.csv');
  const outputPath = path.join(assetsDir, 'movies.txt');
  const summaryPath = path.join(assetsDir, 'summary.json');
  const stats = {
    processed: 0,
    exported: 0,
    skipped: { invalid: 0, filtered: 0 },
    byDecade: {},
  };
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  const parser = csv({ delimiter: ';' });
  let outputError;
  const onOutputError = (error) => {
    outputError = error;
    parser.destroy(error);
  };

  input.on('error', (error) => parser.destroy(error));
  output.on('error', onOutputError);
  input.pipe(parser);

  try {
    await parser.subscribe(async (row) => {
      if (outputError) {
        throw outputError;
      }

      stats.processed += 1;
      const parsed = toMovieRecord(row);

      if (parsed.invalid) {
        stats.skipped.invalid += 1;
        return;
      }

      const { movie } = parsed;
      if (movie.year < minYear || movie.rating < minRating) {
        stats.skipped.filtered += 1;
        return;
      }

      await writeLine(output, JSON.stringify(movie));
      stats.exported += 1;
      stats.byDecade[movie.decade] = (stats.byDecade[movie.decade] || 0) + 1;
    });

    if (outputError) {
      throw outputError;
    }

    await new Promise((resolve, reject) => {
      output.once('error', reject);
      output.end(resolve);
    });

    await fs.promises.writeFile(summaryPath, `${JSON.stringify(stats, null, 2)}\n`);
    return stats;
  } catch (error) {
    parser.destroy();
    input.destroy();
    output.destroy();
    await Promise.all([closeStream(input), closeStream(parser), closeStream(output)]);
    throw error;
  }
}

module.exports = exportCsvToTxt;
