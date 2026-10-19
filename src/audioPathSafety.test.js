import { describe, expect, it } from 'vitest';
import { isInternalAudioPath } from './audioSecurity.js';

const storageBase = 'https://storage.example/internal/audio/';

describe('internal audio paths remain relative before and after one decode', () => {
  it('rejects browser-normalized controls that can turn a path into another origin', () => {
    for (const control of ['\n', '\r', '\t']) {
      const value = `/${control}/attacker.example/synthetic.webm`;
      expect(new URL(value, storageBase).origin).toBe('https://attacker.example');
      expect(isInternalAudioPath(value)).toBe(false);
      expect(isInternalAudioPath(`folder/${control}../${control}../outside.webm`)).toBe(false);
    }
  });

  it('rejects all ASCII C0 controls and DEL wherever supplied', () => {
    for (const code of [...Array.from({ length: 32 }, (_, index) => index), 127]) {
      const control = String.fromCharCode(code);
      for (const value of [`${control}audio.webm`, `folder/a${control}udio.webm`, `audio.webm${control}`]) {
        expect(isInternalAudioPath(value), JSON.stringify(value)).toBe(false);
      }
      const encoded = `%${code.toString(16).padStart(2, '0')}`;
      expect(isInternalAudioPath(`folder/a${encoded}udio.webm`), encoded).toBe(false);
    }
  });

  it('rejects absolute paths, schemes, traversal and empty segments', () => {
    for (const value of [
      '/audio.webm', '//attacker.example/audio.webm', 'https://attacker.example/audio.webm',
      'https:attacker.example', 'custom+audio:v1', 'C:audio.webm',
      '.', '..', './audio.webm', '../audio.webm', 'folder/./audio.webm', 'folder/../audio.webm',
      'folder//audio.webm', 'folder/', 'folder\\audio.webm', 'audio.webm?download=1', 'audio.webm#part',
    ]) {
      expect(isInternalAudioPath(value), value).toBe(false);
    }
  });

  it('rejects encoded structural characters, traversal and nested escaping', () => {
    for (const value of [
      '%2e', '%2E%2e/audio.webm', 'folder/.%2e/audio.webm', 'folder/%2e./audio.webm',
      'folder/%2e%2e/%2e%2e/outside.webm', 'folder%2faudio.webm', 'folder/%2Faudio.webm',
      'folder%5caudio.webm', 'audio.webm%3fdownload=1', 'audio.webm%23part',
      '%68ttps%3aattacker.example', 'https%3Aattacker.example', '%20https%3aattacker.example',
      '%20audio.webm', 'audio.webm%20', '%2e%2e%20',
      'folder/%252e%252e/audio.webm', 'folder/%252faudio.webm', 'audio%25.webm',
    ]) {
      expect(isInternalAudioPath(value), value).toBe(false);
    }
  });

  it('rejects malformed escapes and invalid escaped UTF-8 without throwing', () => {
    for (const value of [
      '%', 'audio%.webm', 'audio%0.webm', 'audio%GG.webm', 'audio%C3%28.webm',
      'audio%E2%82.webm', 'audio%C0%AF.webm', 'audio%ED%A0%80.webm', 'audio%FF.webm',
    ]) {
      expect(() => isInternalAudioPath(value), value).not.toThrow();
      expect(isInternalAudioPath(value), value).toBe(false);
    }
  });

  it('preserves useful relative names and benign escapes without normalizing input', () => {
    const values = [
      'synthetic.webm', 'folder/synthetic.webm', 'folder/synthetic audio.webm',
      'áudio/例示.webm', 'folder/synthetic%20audio.webm', '%C3%A1udio/%E4%BE%8B%E7%A4%BA.webm',
      'folder/audio%2Ewebm', 'folder/http:synthetic.webm', 'folder/.hidden.webm',
    ];
    for (const value of values) {
      expect(isInternalAudioPath(value), value).toBe(true);
      for (const form of [value, decodeURIComponent(value)]) {
        const resolved = new URL(form, storageBase);
        expect(resolved.origin, form).toBe('https://storage.example');
        expect(resolved.pathname.startsWith('/internal/audio/'), form).toBe(true);
      }
    }
  });

  it('keeps the original length bound and returns false without coercing nonstrings', () => {
    expect(isInternalAudioPath('a'.repeat(2048))).toBe(true);
    expect(isInternalAudioPath('a'.repeat(2049))).toBe(false);
    for (const value of ['', ' audio.webm', 'audio.webm ', null, undefined, 1, false, [], {}, Symbol('synthetic')]) {
      expect(isInternalAudioPath(value)).toBe(false);
    }
    expect(isInternalAudioPath({ toString() { throw new Error('must not coerce'); } })).toBe(false);
  });
});
