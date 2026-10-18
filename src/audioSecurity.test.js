import { beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { once } from 'node:events';
import {
  AUDIO_DOWNLOAD_DEFAULT_LIMIT_BYTES,
  assertAllowedAudioDownloadUrl,
  assertAllowedLegacyAudioUrl,
  createPinnedAudioLookup,
  createAudioDownloadAgents,
  getAudioMaxDownloadBytes,
  isPublicAudioAddress,
  isInternalAudioPath,
  validateAudioRedirect,
} from './audioSecurity.js';

const originalEnv = { ...process.env };

function runLookup({ hostname = 'storage.example', results, options = {}, resolverError } = {}) {
  const resolver = (_requestedHostname, requestedOptions, callback) => {
    expect(requestedOptions).toEqual({ all: true, verbatim: true });
    callback(resolverError || null, results);
  };
  return new Promise((resolve, reject) => {
    createPinnedAudioLookup({ resolver })(hostname, options, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
}

describe('recorded-audio URL security', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AUDIO_STORAGE_ORIGIN;
    delete process.env.AUDIO_LEGACY_URL_ALLOWED_HOSTS;
    delete process.env.AUDIO_MAX_DOWNLOAD_BYTES;
    process.env.NODE_ENV = 'test';
  });

  it('accepts only internal object paths from request bodies', () => {
    expect(isInternalAudioPath('consultation_user_1.webm')).toBe(true);
    expect(isInternalAudioPath('folder/consultation.webm')).toBe(true);
    expect(isInternalAudioPath('https://storage.example/audio.webm')).toBe(false);
    expect(isInternalAudioPath('//storage.example/audio.webm')).toBe(false);
    expect(isInternalAudioPath('../audio.webm')).toBe(false);
    expect(isInternalAudioPath('folder/../audio.webm')).toBe(false);
    expect(isInternalAudioPath('folder\\audio.webm')).toBe(false);
  });

  it('denies remote URLs by default and requires an exact trusted host', () => {
    expect(() => assertAllowedAudioDownloadUrl('https://storage.example/audio.webm'))
      .toThrow('AUDIO_URL_NOT_ALLOWED');

    process.env.AUDIO_LEGACY_URL_ALLOWED_HOSTS = 'storage.example,cdn.example:8443';
    expect(assertAllowedLegacyAudioUrl('https://storage.example/audio.webm').host)
      .toBe('storage.example');
    expect(assertAllowedLegacyAudioUrl('https://cdn.example:8443/audio.webm').host)
      .toBe('cdn.example:8443');
    expect(() => assertAllowedLegacyAudioUrl('https://evil.storage.example/audio.webm'))
      .toThrow('AUDIO_URL_NOT_ALLOWED');
    expect(() => assertAllowedLegacyAudioUrl('http://storage.example/audio.webm'))
      .toThrow('AUDIO_URL_HTTPS_REQUIRED');
  });

  it('trusts the configured storage origin while keeping legacy HTTP denied', () => {
    process.env.AUDIO_STORAGE_ORIGIN = 'http://storage.localhost:8000';
    expect(assertAllowedAudioDownloadUrl('http://storage.localhost:8000/storage/audio.webm').origin)
      .toBe('http://storage.localhost:8000');
    expect(() => assertAllowedLegacyAudioUrl('http://storage.localhost:8000/storage/audio.webm'))
      .toThrow('AUDIO_URL_HTTPS_REQUIRED');

    process.env.AUDIO_STORAGE_ORIGIN = 'https://storage.example';
    expect(assertAllowedLegacyAudioUrl('https://storage.example/storage/audio.webm').host)
      .toBe('storage.example');
  });

  it('allows insecure localhost only outside production and only when allowlisted', () => {
    process.env.AUDIO_LEGACY_URL_ALLOWED_HOSTS = 'localhost:8000';
    expect(assertAllowedLegacyAudioUrl('http://localhost:8000/audio.webm').host)
      .toBe('localhost:8000');
    process.env.NODE_ENV = 'production';
    expect(() => assertAllowedLegacyAudioUrl('http://localhost:8000/audio.webm'))
      .toThrow('AUDIO_URL_NOT_ALLOWED');
    expect(() => assertAllowedLegacyAudioUrl('https://localhost:8000/audio.webm'))
      .toThrow('AUDIO_URL_NOT_ALLOWED');
  });

  it('validates every redirect destination against the same host policy', () => {
    process.env.AUDIO_LEGACY_URL_ALLOWED_HOSTS = 'storage.example';
    expect(validateAudioRedirect({ href: 'https://storage.example/next.webm' }).host)
      .toBe('storage.example');
    expect(() => validateAudioRedirect({
      protocol: 'http:',
      hostname: '169.254.169.254',
      path: '/latest/meta-data',
    })).toThrow('AUDIO_URL_NOT_ALLOWED');
    expect(() => validateAudioRedirect({ href: 'https://redirect-attacker.example/audio.webm' }))
      .toThrow('AUDIO_URL_NOT_ALLOWED');
  });

  it.each([
    '127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1',
    '[::1]', '[fc00::1]', '[fe80::1]',
    '[::ffff:127.0.0.1]', '[::ffff:10.0.0.1]',
    '2130706433', '0x7f000001', '0177.0.0.1',
  ])('rejects an allowlisted private literal before Node can skip DNS (%s)', (host) => {
    process.env.NODE_ENV = 'production';
    process.env.AUDIO_STORAGE_ORIGIN = `http://${host}:8123`;
    expect(() => assertAllowedAudioDownloadUrl(`http://${host}:8123/audio.webm`))
      .toThrow('AUDIO_URL_NOT_ALLOWED');
    delete process.env.AUDIO_STORAGE_ORIGIN;
    process.env.AUDIO_LEGACY_URL_ALLOWED_HOSTS = new URL(`https://${host}:8123`).host;
    expect(() => assertAllowedLegacyAudioUrl(`https://${host}:8123/audio.webm`))
      .toThrow('AUDIO_URL_NOT_ALLOWED');
  });

  it.each(['93.184.216.34', '[2606:4700:4700::1111]', '[::ffff:93.184.216.34]'])(
    'accepts an explicitly trusted public literal without making a request (%s)', (host) => {
      process.env.NODE_ENV = 'production';
      process.env.AUDIO_STORAGE_ORIGIN = `https://${host}`;
      expect(assertAllowedAudioDownloadUrl(`https://${host}/audio.webm`).origin)
        .toBe(new URL(`https://${host}`).origin);
    },
  );

  it.each(['127.0.0.1', '[::1]', '[::ffff:127.0.0.1]', '[fc00::1]'])(
    'permits a private literal only for explicitly configured development storage (%s)', (host) => {
      process.env.AUDIO_LEGACY_URL_ALLOWED_HOSTS = new URL(`https://${host}:8123`).host;
      expect(() => assertAllowedAudioDownloadUrl(`https://${host}:8123/audio.webm`))
        .toThrow('AUDIO_URL_NOT_ALLOWED');
      process.env.AUDIO_STORAGE_ORIGIN = `http://${host}:8123`;
      expect(assertAllowedAudioDownloadUrl(`http://${host}:8123/audio.webm`).origin)
        .toBe(new URL(`http://${host}:8123`).origin);
    },
  );

  it('blocks mapped-loopback transport before a synthetic local server receives a request', async () => {
    let received = 0;
    let resolutions = 0;
    const server = http.createServer((_req, res) => { received += 1; res.end('synthetic'); });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { httpAgent, httpsAgent } = createAudioDownloadAgents({ resolver: () => { resolutions += 1; } });
    try {
      const url = `http://[::ffff:127.0.0.1]:${server.address().port}/synthetic.webm`;
      process.env.NODE_ENV = 'production';
      process.env.AUDIO_STORAGE_ORIGIN = new URL(url).origin;
      const attemptDownload = () => http.get(assertAllowedAudioDownloadUrl(url), { agent: httpAgent });
      expect(attemptDownload).toThrow('AUDIO_URL_NOT_ALLOWED');
      expect(received).toBe(0);
      expect(resolutions).toBe(0);
    } finally {
      httpAgent.destroy();
      httpsAgent.destroy();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it.each([
    '127.0.0.1',
    '169.254.169.254',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    'fe80::1',
    'fc00::1',
    '::ffff:127.0.0.1',
    '::ffff:0a00:0001',
  ])('rejects non-public DNS destinations (%s)', async (address) => {
    await expect(runLookup({
      results: [{ address, family: address.includes(':') ? 6 : 4 }],
    })).rejects.toThrow('AUDIO_DNS_ADDRESS_NOT_ALLOWED');
    expect(isPublicAudioAddress(address)).toBe(false);
  });

  it('fails closed when one answer in a DNS set is private', async () => {
    await expect(runLookup({
      results: [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ],
    })).rejects.toThrow('AUDIO_DNS_ADDRESS_NOT_ALLOWED');
  });

  it('pins a vetted public DNS answer without resolving a second time', async () => {
    let resolutionCount = 0;
    const lookup = createPinnedAudioLookup({
      resolver: (_hostname, _options, callback) => {
        resolutionCount += 1;
        callback(null, [{ address: '93.184.216.34', family: 4 }]);
      },
    });
    const result = await new Promise((resolve, reject) => {
      lookup('storage.example', {}, (error, address, family) => {
        if (error) reject(error);
        else resolve({ address, family });
      });
    });
    expect(result).toEqual({ address: '93.184.216.34', family: 4 });
    expect(resolutionCount).toBe(1);
    expect(isPublicAudioAddress(result.address)).toBe(true);
  });

  it('rejects literal private addresses without invoking DNS', async () => {
    let resolutionCount = 0;
    const lookup = createPinnedAudioLookup({
      resolver: () => { resolutionCount += 1; },
    });
    await expect(new Promise((resolve, reject) => {
      lookup('127.0.0.1', {}, (error, address) => {
        if (error) reject(error);
        else resolve(address);
      });
    })).rejects.toThrow('AUDIO_DNS_ADDRESS_NOT_ALLOWED');
    expect(resolutionCount).toBe(0);
  });

  it('permits a private resolution only for the exact development storage host', async () => {
    process.env.AUDIO_STORAGE_ORIGIN = 'http://storage.internal:8000';
    await expect(runLookup({
      hostname: 'storage.internal',
      results: [{ address: '10.20.30.40', family: 4 }],
    })).resolves.toEqual({ address: '10.20.30.40', family: 4 });

    process.env.NODE_ENV = 'production';
    await expect(runLookup({
      hostname: 'storage.internal',
      results: [{ address: '10.20.30.40', family: 4 }],
    })).rejects.toThrow('AUDIO_DNS_ADDRESS_NOT_ALLOWED');
  });

  it('maps resolver failures to a safe error code', async () => {
    await expect(runLookup({
      resolverError: new Error('resolver implementation detail'),
    })).rejects.toThrow('AUDIO_DNS_RESOLUTION_FAILED');
  });

  it('defaults to 256 MB and rejects invalid limit configuration', () => {
    expect(getAudioMaxDownloadBytes()).toBe(AUDIO_DOWNLOAD_DEFAULT_LIMIT_BYTES);
    process.env.AUDIO_MAX_DOWNLOAD_BYTES = '16';
    expect(getAudioMaxDownloadBytes()).toBe(16);
    process.env.AUDIO_MAX_DOWNLOAD_BYTES = '0';
    expect(() => getAudioMaxDownloadBytes()).toThrow('AUDIO_MAX_DOWNLOAD_BYTES_INVALID');
  });
});
