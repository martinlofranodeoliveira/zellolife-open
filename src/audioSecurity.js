import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

const DEFAULT_MAX_AUDIO_DOWNLOAD_BYTES = 256 * 1024 * 1024;
const MAX_CONFIGURED_AUDIO_DOWNLOAD_BYTES = 1024 * 1024 * 1024;

function safeError(code) {
  // URL parser errors may retain their original input, including a complete
  // signed storage URL. Only propagate the closed application error code.
  return Object.assign(new Error(code), { code });
}

function isLoopbackHostname(hostname) {
  const value = normalizedHostname(hostname);
  return value === 'localhost' || value === '::1' || value.startsWith('127.');
}

function normalizedHostname(hostname) {
  return String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
}

function configuredStorageHostname() {
  const configured = String(process.env.AUDIO_STORAGE_ORIGIN || '').trim();
  if (!configured) return null;
  try {
    return normalizedHostname(parseUrl(configured, 'AUDIO_STORAGE_ORIGIN_INVALID').hostname);
  } catch {
    return null;
  }
}

function privateDevelopmentStorageResolutionIsAllowed(hostname) {
  return process.env.NODE_ENV !== 'production'
    && normalizedHostname(hostname) === configuredStorageHostname();
}

export function isPublicAudioAddress(value) {
  let address;
  try {
    address = ipaddr.parse(String(value || '').trim());
  } catch {
    return false;
  }

  if (address.kind() === 'ipv6' && address.isIPv4MappedAddress()) {
    address = address.toIPv4Address();
  }
  return address.range() === 'unicast';
}

function assertResolvedAddressesAllowed(hostname, addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw safeError('AUDIO_DNS_RESOLUTION_FAILED');
  }
  const allowPrivate = privateDevelopmentStorageResolutionIsAllowed(hostname);
  for (const result of addresses) {
    if (!result?.address || !net.isIP(result.address)) {
      throw safeError('AUDIO_DNS_RESOLUTION_FAILED');
    }
    if (!allowPrivate && !isPublicAudioAddress(result.address)) {
      throw safeError('AUDIO_DNS_ADDRESS_NOT_ALLOWED');
    }
  }
  return addresses;
}

/**
 * Resolve, validate and pass the exact vetted address to the socket. This is
 * deliberately an Agent lookup hook: validating DNS before Axios connects
 * would leave a DNS-rebinding/TOCTOU window.
 */
export function createPinnedAudioLookup({ resolver = dns.lookup } = {}) {
  return (hostname, options, callback) => {
    const requestedOptions = typeof options === 'object' && options !== null ? options : {};
    const literalFamily = net.isIP(hostname);
    if (literalFamily) {
      try {
        const addresses = assertResolvedAddressesAllowed(hostname, [{
          address: hostname,
          family: literalFamily,
        }]);
        if (requestedOptions.all) callback(null, addresses);
        else callback(null, addresses[0].address, addresses[0].family);
      } catch (error) {
        callback(error);
      }
      return;
    }

    resolver(hostname, { all: true, verbatim: true }, (error, results) => {
      if (error) {
        callback(safeError('AUDIO_DNS_RESOLUTION_FAILED', error));
        return;
      }
      try {
        const addresses = assertResolvedAddressesAllowed(hostname, results);
        const requestedFamily = Number(requestedOptions.family) || 0;
        const eligible = requestedFamily
          ? addresses.filter((entry) => Number(entry.family) === requestedFamily)
          : addresses;
        if (eligible.length === 0) throw safeError('AUDIO_DNS_RESOLUTION_FAILED');
        if (requestedOptions.all) callback(null, eligible);
        else callback(null, eligible[0].address, Number(eligible[0].family));
      } catch (validationError) {
        callback(validationError);
      }
    });
  };
}

export function createAudioDownloadAgents(options = {}) {
  const lookup = createPinnedAudioLookup(options);
  return {
    httpAgent: new http.Agent({ keepAlive: false, lookup }),
    httpsAgent: new https.Agent({ keepAlive: false, lookup }),
  };
}

function parseUrl(value, errorCode) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw safeError(errorCode);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw safeError(errorCode);
  }
  return url;
}

function getConfiguredStorageOrigin() {
  const configured = String(process.env.AUDIO_STORAGE_ORIGIN || '').trim();
  if (!configured) return null;
  try {
    return parseUrl(configured, 'AUDIO_STORAGE_ORIGIN_INVALID').origin;
  } catch {
    return null;
  }
}

function getLegacyAllowedHosts() {
  const configured = String(process.env.AUDIO_LEGACY_URL_ALLOWED_HOSTS || '').trim();
  if (!configured) return new Set();

  const hosts = new Set();
  for (const rawEntry of configured.split(',')) {
    const entry = rawEntry.trim().toLowerCase();
    if (!entry) continue;
    if (
      entry.includes('://') ||
      entry.includes('/') ||
      entry.includes('?') ||
      entry.includes('#') ||
      entry.includes('@') ||
      entry.includes('*')
    ) {
      throw safeError('AUDIO_LEGACY_URL_ALLOWLIST_INVALID');
    }
    let parsed;
    try {
      parsed = new URL(`https://${entry}`);
    } catch {
      throw safeError('AUDIO_LEGACY_URL_ALLOWLIST_INVALID');
    }
    if (!parsed.hostname || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw safeError('AUDIO_LEGACY_URL_ALLOWLIST_INVALID');
    }
    hosts.add(parsed.host.toLowerCase());
  }
  return hosts;
}

function insecureLoopbackIsAllowed(url) {
  return process.env.NODE_ENV !== 'production' && isLoopbackHostname(url.hostname);
}

function urlMatchesConfiguredStorage(url) {
  const storageOrigin = getConfiguredStorageOrigin();
  return Boolean(storageOrigin && url.origin === storageOrigin);
}

function assertAllowedUrl(value, { legacy = false } = {}) {
  const url = parseUrl(value, 'AUDIO_URL_INVALID');
  const matchesStorage = urlMatchesConfiguredStorage(url);
  const matchesLegacyHost = getLegacyAllowedHosts().has(url.host.toLowerCase());

  if (!matchesStorage && !matchesLegacyHost) {
    throw safeError('AUDIO_URL_NOT_ALLOWED');
  }
  // Node bypasses Agent.lookup for literal IP addresses. Validate the parsed
  // canonical hostname here as well as in the DNS hook, including mapped IPv4
  // addresses and non-decimal IPv4 strings normalized by the WHATWG parser.
  const hostname = normalizedHostname(url.hostname);
  if (net.isIP(hostname) && !isPublicAudioAddress(hostname)
    && !privateDevelopmentStorageResolutionIsAllowed(hostname)) {
    throw safeError('AUDIO_URL_NOT_ALLOWED');
  }
  if (isLoopbackHostname(url.hostname) && process.env.NODE_ENV === 'production') {
    throw safeError('AUDIO_URL_NOT_ALLOWED');
  }

  if (url.protocol !== 'https:') {
    const generatedByConfiguredStorage = matchesStorage && !legacy;
    if (!generatedByConfiguredStorage && !insecureLoopbackIsAllowed(url)) {
      throw safeError('AUDIO_URL_HTTPS_REQUIRED');
    }
  }

  return url;
}

export function isInternalAudioPath(value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || value !== value.trim()) {
    return false;
  }
  if (
    /^[A-Za-z][A-Za-z\d+.-]*:/.test(value) ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    return false;
  }
  const segments = value.replace(/^\/+/, '').split('/');
  return segments.length > 0 && segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

export function assertAllowedLegacyAudioUrl(value) {
  return assertAllowedUrl(value, { legacy: true });
}

export function assertAllowedAudioDownloadUrl(value) {
  return assertAllowedUrl(value, { legacy: false });
}

export function validateAudioRedirect(options) {
  let value = options?.href;
  if (!value) {
    const protocol = options?.protocol || 'https:';
    let host = options?.host;
    if (!host && options?.hostname) {
      const hostname = String(options.hostname).includes(':')
        ? `[${String(options.hostname).replace(/^\[|\]$/g, '')}]`
        : String(options.hostname);
      host = `${hostname}${options.port ? `:${options.port}` : ''}`;
    }
    if (!host) throw safeError('AUDIO_REDIRECT_URL_INVALID');
    value = `${protocol}//${host}${options?.path || options?.pathname || '/'}`;
  }
  return assertAllowedAudioDownloadUrl(value);
}

export function getAudioMaxDownloadBytes() {
  const raw = process.env.AUDIO_MAX_DOWNLOAD_BYTES;
  if (!raw) return DEFAULT_MAX_AUDIO_DOWNLOAD_BYTES;
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_CONFIGURED_AUDIO_DOWNLOAD_BYTES
  ) {
    throw safeError('AUDIO_MAX_DOWNLOAD_BYTES_INVALID');
  }
  return value;
}

export const AUDIO_DOWNLOAD_DEFAULT_LIMIT_BYTES = DEFAULT_MAX_AUDIO_DOWNLOAD_BYTES;
