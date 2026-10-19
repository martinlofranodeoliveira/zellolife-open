#!/usr/bin/env node
import { renderDocument } from './document.js';
import { createReadStream } from 'node:fs';
import { readDocumentSource } from './documentInput.js';

const argument = process.argv[2];
if (!argument || argument === '--help') {
  console.log('Usage: zello-open <document.json|->\nUse - to read JSON from standard input (UTF-8, at most 1 MiB).\nRenders supplied text as safe document HTML. No storage, network or AI inference.');
  process.exit(argument ? 0 : 2);
}
try {
  // No temporary file is needed for pipes. Both sources share one byte budget.
  const stream = argument === '-' ? process.stdin : createReadStream(argument);
  const source = await readDocumentSource(stream);
  process.stdout.write(`${JSON.stringify(renderDocument(JSON.parse(source)), null, 2)}\n`);
} catch (error) {
  // Never print document contents, input paths or raw JSON parse errors.
  const allowed = /^DOCUMENT_[A-Z_]+$/;
  const code = allowed.test(error?.message || '') ? error.message : 'DOCUMENT_INPUT_INVALID';
  console.error(code);
  process.exitCode = 1;
}
