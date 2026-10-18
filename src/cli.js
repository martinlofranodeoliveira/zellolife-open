#!/usr/bin/env node
import { renderDocument } from './document.js';

const MAX_FILE_BYTES = 1024 * 1024;
const argument = process.argv[2];
if (!argument || argument === '--help') {
  console.log('Usage: zello-open <document.json>\nRenders supplied text as safe document HTML. No storage, network or AI inference.');
  process.exit(argument ? 0 : 2);
}
try {
  // A bounded stream prevents loading arbitrarily large files before validation.
  const { open } = await import('node:fs/promises');
  const file = await open(argument, 'r');
  let source;
  try {
    const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
    let total = 0;
    while (total <= MAX_FILE_BYTES) {
      const { bytesRead } = await file.read(buffer, total, buffer.length - total, null);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    if (total > MAX_FILE_BYTES) throw new Error('DOCUMENT_FILE_TOO_LARGE');
    source = buffer.subarray(0, total).toString('utf8');
  } finally {
    await file.close();
  }
  process.stdout.write(`${JSON.stringify(renderDocument(JSON.parse(source)), null, 2)}\n`);
} catch (error) {
  // Never print document contents, input paths or raw JSON parse errors.
  const allowed = /^DOCUMENT_[A-Z_]+$/;
  const code = allowed.test(error?.message || '') ? error.message : 'DOCUMENT_INPUT_INVALID';
  console.error(code);
  process.exitCode = 1;
}
