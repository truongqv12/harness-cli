import crypto from 'node:crypto';
import fs from 'node:fs';

function readFileWithRetry(filePath) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM'].includes(error.code)) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
    }
  }
  throw lastError;
}

export function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(readFileWithRetry(filePath));
  return hash.digest('hex');
}

export function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}
