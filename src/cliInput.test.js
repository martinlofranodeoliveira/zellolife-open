import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readDocumentSource } from './documentInput.js';

const MAX_BYTES = 1024 * 1024;
const document = JSON.stringify({
  locale: 'pt-br',
  sections: [{ heading: 'Exemplo sintético', text: 'Texto em português: ação 🩺.' }],
});
const directories = [];

function cli(argument, input) {
  return spawnSync(process.execPath, ['src/cli.js', argument], {
    encoding: 'utf8', input, cwd: new URL('..', import.meta.url),
  });
}

async function file(contents) {
  const directory = await mkdtemp(path.join(tmpdir(), 'zello-input-'));
  directories.push(directory);
  const filename = path.join(directory, 'synthetic-document.json');
  await writeFile(filename, contents);
  return filename;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('bounded CLI document streams', () => {
  it('renders a pipe and a file identically without a temporary input file', async () => {
    const fromFile = cli(await file(document));
    const fromPipe = cli('-', document);
    expect(fromFile.status).toBe(0);
    expect(fromPipe.status).toBe(0);
    expect(fromPipe.stdout).toBe(fromFile.stdout);
    expect(fromPipe.stderr).toBe('');
    expect(JSON.parse(fromPipe.stdout).html).toContain('ação 🩺.');
  });

  it('accepts exactly 1 MiB and rejects excess bytes on either input source', async () => {
    const bytes = Buffer.byteLength(document);
    const exact = document + ' '.repeat(MAX_BYTES - bytes);
    for (const argument of ['-', await file(exact)]) {
      const result = cli(argument, argument === '-' ? exact : undefined);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    }
    const excessive = exact + ' ';
    for (const argument of ['-', await file(excessive)]) {
      const result = cli(argument, argument === '-' ? excessive : undefined);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.trim()).toBe('DOCUMENT_FILE_TOO_LARGE');
    }
  });

  it('preserves multibyte UTF-8 split across stream chunks', async () => {
    const bytes = Buffer.from(document);
    async function* chunks() {
      for (const byte of bytes) yield Buffer.from([byte]);
    }
    expect(await readDocumentSource(chunks())).toBe(document);
  });

  it('rejects invalid or truncated UTF-8 rather than replacing supplied text', async () => {
    const prefix = Buffer.from('{"locale":"pt-br","sections":[{"heading":"Synthetic","text":"');
    const suffix = Buffer.from('"}]}');
    for (const malformed of [[0xc3, 0x28], [0xed, 0xa0, 0x80], [0xf0, 0x9f]]) {
      const source = Buffer.concat([prefix, Buffer.from(malformed), suffix]);
      for (const argument of ['-', await file(source)]) {
        const result = cli(argument, argument === '-' ? source : undefined);
        expect(result.status).toBe(1);
        expect(result.stdout).toBe('');
        expect(result.stderr.trim()).toBe('DOCUMENT_INPUT_INVALID');
      }
    }
    async function* truncated() { yield Buffer.from([0xe2, 0x82]); }
    await expect(readDocumentSource(truncated())).rejects.toThrow('DOCUMENT_INPUT_INVALID');
  });

  it('keeps malformed piped JSON and file-read errors closed', () => {
    for (const result of [cli('-', '{"synthetic-marker":'), cli('not-a-real-synthetic-input.json')]) {
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.trim()).toBe('DOCUMENT_INPUT_INVALID');
    }
    expect(cli('--help').stdout).toContain('standard input');
  });
});
