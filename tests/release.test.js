import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { renderDocument, validateDocument } from '../src/document.js';

test('rendering never interprets input markup or invents information', () => {
  const result = renderDocument({ locale: 'PT-BR', sections: [{ heading: '<img src=x>', text: 'A & B\n<script>secret</script>' }] });
  assert.equal(result.locale, 'pt-br');
  assert.equal(result.html, '<h2>&lt;img src=x&gt;</h2><p>A &amp; B<br />&lt;script&gt;secret&lt;/script&gt;</p>');
});

test('invalid documents and excessive content fail closed', () => {
  assert.throws(() => validateDocument({ locale: 'fr', sections: [] }), /DOCUMENT_LOCALE_INVALID/);
  assert.throws(() => validateDocument({ locale: 'pt-br', sections: [{ heading: 'x', text: 'x'.repeat(180000) }] }), /DOCUMENT_TOO_LARGE/);
  assert.throws(() => validateDocument({ locale: 'pt-br', sections: Array.from({ length: 101 }, () => ({ heading: 'x', text: '' })) }), /DOCUMENT_SECTIONS_INVALID/);
});

test('CLI processes the synthetic example without a service or credentials', () => {
  const result = spawnSync(process.execPath, ['src/cli.js', 'examples/synthetic-document.json'], { encoding: 'utf8', cwd: new URL('..', import.meta.url) });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).locale, 'pt-br');
  assert.equal(result.stderr, '');
});

test('CLI does not leak input text or filename on malformed JSON', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'zello-open-'));
  try {
    const file = path.join(directory, 'synthetic-sensitive-filename.json');
    await writeFile(file, '{"synthetic_sensitive_marker":');
    const result = spawnSync(process.execPath, ['src/cli.js', file], { encoding: 'utf8', cwd: new URL('..', import.meta.url) });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), 'DOCUMENT_INPUT_INVALID');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI rejects files beyond its bounded input limit', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'zello-open-'));
  try {
    const file = path.join(directory, 'large.json');
    await writeFile(file, ' '.repeat(1024 * 1024 + 1));
    const result = spawnSync(process.execPath, ['src/cli.js', file], { encoding: 'utf8', cwd: new URL('..', import.meta.url) });
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'DOCUMENT_FILE_TOO_LARGE');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
