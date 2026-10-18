import { createRequire } from 'node:module';

import sanitizeHtml from 'sanitize-html';
import { describe, expect, it } from 'vitest';

import { sanitizeReportHtml } from './reportHtmlSafety.js';

const require = createRequire(import.meta.url);

describe('report HTML allowlist', () => {
  it('preserves the supported document structure', () => {
    expect(sanitizeReportHtml(
      '<h2>Achados</h2><table><tbody><tr><td colspan="2">Normal</td></tr></tbody></table>',
    )).toBe(
      '<h2>Achados</h2><table><tbody><tr><td colspan="2">Normal</td></tr></tbody></table>',
    );
  });

  it.each([
    '<img src=x onerror=alert(1)>',
    '<svg><script>alert(1)</script></svg>',
    '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<form action="https://evil.test"><input name=x></form>',
    '<p style="background:url(https://evil.test)" class=x onclick=alert(1)>Texto</p>',
    '<a href="javascript:alert(1)">link</a>',
    '<textarea></textarea/><img src=x onerror=alert(1)>',
    '<xmp></xmp/><img src=x onerror=alert(1)>',
    '<svg><textarea><img src=x onerror=alert(1)></textarea></svg>',
    '<math><xmp><img src=x onerror=alert(1)></xmp></math>',
  ])('removes executable or remote-loading markup: %s', (payload) => {
    const sanitized = sanitizeReportHtml(payload);
    expect(sanitized).not.toMatch(
      /<(?:script|style|img|svg|math|iframe|form|input|a)\b|\b(?:on\w+|style|class|href|src|srcdoc|action)=|javascript:/i,
    );
  });

  it('pins the sanitize-html release containing the upstream raw-text fixes', () => {
    expect(require('sanitize-html/package.json').version).toBe('2.17.6');
  });

  it.each([
    {
      name: 'textarea solidus close',
      payload: '<textarea></textarea/><img src=x onerror=alert(1)>',
      allowedTags: ['textarea'],
    },
    {
      name: 'xmp solidus close',
      payload: '<xmp></xmp/><img src=x onerror=alert(1)>',
      allowedTags: ['xmp'],
    },
    {
      name: 'SVG raw-text namespace confusion',
      payload: '<svg><textarea><img src=x onerror=alert(1)></textarea></svg>',
      allowedTags: ['svg', 'textarea'],
    },
    {
      name: 'MathML raw-text namespace confusion',
      payload: '<math><xmp><img src=x onerror=alert(1)></xmp></math>',
      allowedTags: ['math', 'xmp'],
    },
  ])('dependency neutralizes upstream mXSS: $name', ({ payload, allowedTags }) => {
    const sanitized = sanitizeHtml(payload, {
      allowedTags,
      allowedAttributes: {},
      disallowedTagsMode: 'discard',
    });

    expect(sanitized).not.toMatch(/<img\b|\bonerror\s*=/i);
  });
});
