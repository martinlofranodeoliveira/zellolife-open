import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const excluded = new Set(['node_modules', '.git', 'coverage']);
const forbiddenNames = /^(?:\.env(?:\..+)?|.*\.(?:db|sqlite3?|dump|pem|key|p12|log)|credentials(?:\..+)?|id_(?:rsa|ed25519))$/i;
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['JSON Web Token', /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{12,}/g],
  ['GitHub credential', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ['cloud credential', /(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})/g],
  ['service credential', /(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{20,})/g],
  ['literal credential', /(?:api[_-]?key|auth[_-]?token|password|client[_-]?secret)\s*[:=]\s*['"][A-Za-z0-9_+/=-]{20,}['"]/gi],
  ['wallet address', /prl1[a-z0-9]{30,}/g],
  ['personal path', /\/(?:home|Users)\/[A-Za-z0-9._-]+\//g],
  ['external object identifier', /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi],
];
const findings = [];
let files = 0;

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      findings.push({ file: relative, category: 'symlink requires review' });
      continue;
    }
    if (entry.isDirectory()) {
      await visit(absolute);
      continue;
    }
    if (!entry.isFile()) continue;
    files += 1;
    if (entry.name !== '.env.example' && forbiddenNames.test(entry.name)) {
      findings.push({ file: relative, category: 'operational file' });
    }
    const text = await readFile(absolute, 'utf8');
    for (const [category, pattern] of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) findings.push({ file: relative, category });
    }
    const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    if (emails.some((email) => !/@(?:[^@]+\.)?(?:example\.(?:com|org|net)|example|invalid|test)$/i.test(email))) {
      findings.push({ file: relative, category: 'non-synthetic email address' });
    }
  }
}
await visit(root);
// Never print matched values. Filenames and categories are sufficient to review.
console.log(JSON.stringify({ scannedFiles: files, findings }, null, 2));
if (findings.length) process.exitCode = 1;
