#!/usr/bin/env node
/**
 * Glassbox repository validator.
 *
 * Zero-dependency, ESM, Node 18+. Run from the repository root:
 *
 *   node tools/validate.mjs
 *
 * Checks:
 *   1. frontmatter - skills/<name>/SKILL.md has a frontmatter block whose
 *                    name equals the directory, a description of 50-620
 *                    characters, and license: MIT. Warns when a SKILL.md is
 *                    longer than 300 lines, a references/*.md file is longer
 *                    than 350 lines, or a skill has no references/ directory.
 *   2. links       - every relative markdown link target resolves on disk.
 *   3. hygiene     - secret shapes, email addresses, IPv4 addresses outside
 *                    the RFC 5737 test ranges, and absolute local paths.
 *   4. urls        - warns on URL hosts outside a small allowlist.
 *
 * Every file is scanned except a known-binary extension denylist; symlinked
 * files and directories are skipped. Exit code is 0 when no errors are found,
 * 1 otherwise. Warnings do not fail the run.
 */

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(ROOT, 'skills');

// Known-binary extensions. Every other file is treated as text and scanned.
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz',
  '.exe', '.dll', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mov', '.node',
  '.wasm',
]);

// Hosts allowed to appear in URLs. Anything else is an advisory warning.
// 127.0.0.1 is loopback: it appears only in locally-running example servers.
const URL_ALLOWLIST = new Set([
  'github.com',
  'skills.sh',
  'img.shields.io',
  'raw.githubusercontent.com',
  'www.w3.org',
  'vercel.com',
  'example.com',
  'opensource.org',
  'choosealicense.com',
  '127.0.0.1',
]);

// IPv4 prefixes reserved for documentation (RFC 5737).
const DOC_RANGES = [
  [192, 0, 2],
  [198, 51, 100],
  [203, 0, 113],
];

// Secret-shaped detector patterns. These are patterns, not credentials; no
// real value appears anywhere in this file.
const SECRET_PATTERNS = [
  { label: 'access token shape', re: /ghp_[A-Za-z0-9]{20,}/g },
  { label: 'access token shape', re: /github_pat_[A-Za-z0-9_]{20,}/g },
  { label: 'api key shape', re: /sk-[A-Za-z0-9]{20,}/g },
  { label: 'cloud key id shape', re: /AKIA[0-9A-Z]{16}/g },
  { label: 'chat token shape', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  // The literal is split so this file never matches its own detector.
  { label: 'private key block', re: new RegExp('-----BEGIN [A-Z ]*PRIVATE' + ' KEY-----', 'g') },
  { label: 'token shape', re: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}/g },
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const IPV4_RE = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
const WINDOWS_PATH_RE = /(?:^|[^A-Za-z0-9])[A-Za-z]:[\\/]/;
const POSIX_PATH_RE = /\/(?:home|Users|root)\//;
const URL_RE = /https?:\/\/[^\s"'`<>()\[\]]+/g;
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const FRONTMATTER_NAME_RE = /^name\s*:\s*(.*)$/;
const FRONTMATTER_LICENSE_RE = /^license\s*:\s*(.*)$/;
const FRONTMATTER_DESC_RE = /^description\s*:\s*(.*)$/;

const issues = [];

function report(check, level, file, line, message) {
  issues.push({ check, level, file, line, message });
}

function toPosix(p) {
  return p.split('\\').join('/');
}

function readText(file) {
  return readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) walk(full, out);
    else if (!BINARY_EXTENSIONS.has(extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function fieldValue(frontmatter, pattern) {
  for (const line of frontmatter) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function fieldLine(frontmatter, pattern) {
  const index = frontmatter.findIndex((line) => pattern.test(line));
  return index === -1 ? 2 : index + 2;
}

// Extracts a description written as a folded block (>- or |), a quoted
// string, or a plain single line, and normalizes it to one text line.
function descriptionValue(frontmatter) {
  const index = frontmatter.findIndex((line) => FRONTMATTER_DESC_RE.test(line));
  if (index === -1) return '';
  const match = frontmatter[index].match(FRONTMATTER_DESC_RE);
  const raw = match ? match[1].trim() : '';

  if (raw === '>-' || raw === '>' || raw === '|' || raw === '|-') {
    const parts = [];
    for (let i = index + 1; i < frontmatter.length; i += 1) {
      const line = frontmatter[i];
      if (!/^\s/.test(line)) break;
      if (line.trim()) parts.push(line.trim());
    }
    return normalizeText(parts.join(' '));
  }

  if (raw.startsWith('"') || raw.startsWith("'")) {
    const quote = raw[0];
    const collected = [raw.slice(1)];
    let i = index;
    while (!collected[collected.length - 1].trimEnd().endsWith(quote)) {
      i += 1;
      if (i >= frontmatter.length) break;
      collected.push(frontmatter[i].trim());
    }
    const last = collected[collected.length - 1].trimEnd();
    if (last.endsWith(quote) && last.length > 0) {
      collected[collected.length - 1] = last.slice(0, -1);
    }
    return normalizeText(collected.join(' '));
  }

  return normalizeText(raw);
}

// Check 1: skill frontmatter.
function checkFrontmatter() {
  if (!existsSync(SKILLS_DIR)) {
    report('frontmatter', 'error', SKILLS_DIR, 0, 'skills directory not found');
    return 0;
  }

  const dirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of dirs) {
    const file = join(SKILLS_DIR, name, 'SKILL.md');
    if (!existsSync(file)) {
      report('frontmatter', 'error', file, 0, 'skill directory has no SKILL.md');
      continue;
    }

    const lines = readText(file).split(/\r?\n/);
    if (lines[0].trim() !== '---') {
      report('frontmatter', 'error', file, 1, 'missing frontmatter block');
      continue;
    }

    let end = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === '---') {
        end = i;
        break;
      }
    }
    if (end === -1) {
      report('frontmatter', 'error', file, 1, 'unterminated frontmatter block');
      continue;
    }

    const frontmatter = lines.slice(1, end);

    const declaredName = fieldValue(frontmatter, FRONTMATTER_NAME_RE);
    if (!declaredName) {
      report('frontmatter', 'error', file, fieldLine(frontmatter, FRONTMATTER_NAME_RE), 'missing name field');
    } else if (declaredName !== name) {
      report(
        'frontmatter',
        'error',
        file,
        fieldLine(frontmatter, FRONTMATTER_NAME_RE),
        `name '${declaredName}' does not match directory '${name}'`,
      );
    }

    const license = fieldValue(frontmatter, FRONTMATTER_LICENSE_RE);
    if (!license) {
      report('frontmatter', 'error', file, fieldLine(frontmatter, FRONTMATTER_LICENSE_RE), 'missing license field');
    } else if (license.toLowerCase() !== 'mit') {
      report(
        'frontmatter',
        'error',
        file,
        fieldLine(frontmatter, FRONTMATTER_LICENSE_RE),
        `license must be MIT, found '${license}'`,
      );
    }

    const description = descriptionValue(frontmatter);
    if (!description) {
      report('frontmatter', 'error', file, fieldLine(frontmatter, FRONTMATTER_DESC_RE), 'missing description field');
    } else if (description.length < 50 || description.length > 620) {
      report(
        'frontmatter',
        'error',
        file,
        fieldLine(frontmatter, FRONTMATTER_DESC_RE),
        `description is ${description.length} chars (expected 50-620)`,
      );
    }

    if (lines.length > 300) {
      report('frontmatter', 'warning', file, 1, `SKILL.md is ${lines.length} lines (guideline: 300 max)`);
    }

    const refsDir = join(SKILLS_DIR, name, 'references');
    if (!existsSync(refsDir)) {
      report('frontmatter', 'warning', file, 1, 'no references/ directory');
    } else {
      for (const entry of readdirSync(refsDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
        const refFile = join(refsDir, entry.name);
        const refLines = readText(refFile).split(/\r?\n/).length;
        if (refLines > 350) {
          report(
            'frontmatter',
            'warning',
            refFile,
            1,
            `references file is ${refLines} lines (guideline: 350 max)`,
          );
        }
      }
    }
  }

  return dirs.length;
}

// Turns a raw markdown link target into a relative path, or '' when the
// target should be ignored (external URL, anchor, mail address).
function parseLinkTarget(raw) {
  let target = raw.trim();
  if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
  target = target.split(/\s+/)[0];
  if (!target || target.startsWith('#')) return '';
  if (/^(https?:|mailto:|tel:|data:)/i.test(target)) return '';
  const hash = target.indexOf('#');
  if (hash >= 0) target = target.slice(0, hash);
  try {
    target = decodeURIComponent(target);
  } catch (err) {
    // Keep the raw target when it is not percent-encoded.
  }
  return target.trim();
}

// Check 2: relative markdown links resolve on disk.
function checkLinks(files) {
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const lines = readText(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      LINK_RE.lastIndex = 0;
      let match;
      while ((match = LINK_RE.exec(line)) !== null) {
        const target = parseLinkTarget(match[1]);
        if (!target) continue;
        const resolved = target.startsWith('/')
          ? resolve(ROOT, '.' + target)
          : resolve(dirname(file), target);
        if (!existsSync(resolved)) {
          report('links', 'error', file, index + 1, `broken relative link '${target}'`);
        }
      }
    });
  }
}

// Check 3: hygiene - secrets, emails, IPv4 addresses, local paths.
function checkHygiene(files) {
  for (const file of files) {
    const lines = readText(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      for (const pattern of SECRET_PATTERNS) {
        pattern.re.lastIndex = 0;
        if (pattern.re.test(line)) {
          report('hygiene', 'error', file, lineNumber, `possible ${pattern.label}`);
        }
      }

      EMAIL_RE.lastIndex = 0;
      let email;
      while ((email = EMAIL_RE.exec(line)) !== null) {
        const domain = email[0].slice(email[0].lastIndexOf('@') + 1).toLowerCase();
        if (domain === 'example.com' || domain.endsWith('.example.com')) continue;
        report('hygiene', 'error', file, lineNumber, `email address '${email[0]}' is outside the allowed example domain`);
      }

      IPV4_RE.lastIndex = 0;
      let ip;
      while ((ip = IPV4_RE.exec(line)) !== null) {
        const octets = ip.slice(1, 5).map(Number);
        if (octets.some((octet) => octet > 255)) continue;
        const documented = DOC_RANGES.some(
          (range) => range[0] === octets[0] && range[1] === octets[1] && range[2] === octets[2],
        );
        const loopback = octets[0] === 127; // locally-running example servers
        if (!documented && !loopback) {
          report('hygiene', 'error', file, lineNumber, `IPv4 address '${ip[0]}' is outside the RFC 5737 test ranges`);
        }
      }

      if (WINDOWS_PATH_RE.test(line) || POSIX_PATH_RE.test(line)) {
        report('hygiene', 'error', file, lineNumber, 'absolute local path');
      }
    });
  }
}

function urlHost(url) {
  const match = url.match(/^https?:\/\/([^/?#]+)/i);
  if (!match) return '';
  // Strip userinfo and port so hosts compare by name alone.
  const authority = match[1].toLowerCase();
  const host = authority.slice(authority.lastIndexOf('@') + 1).split(':')[0];
  return host;
}

// Check 4: URL hosts outside the allowlist are warnings.
function checkUrls(files) {
  for (const file of files) {
    const lines = readText(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      URL_RE.lastIndex = 0;
      let url;
      while ((url = URL_RE.exec(line)) !== null) {
        const host = urlHost(url[0]);
        if (!host) continue;
        const allowed = URL_ALLOWLIST.has(host)
          || [...URL_ALLOWLIST].some((domain) => host.endsWith('.' + domain));
        if (!allowed) {
          report('urls', 'warning', file, index + 1, `URL host '${host}' is outside the allowlist`);
        }
      }
    });
  }
}

function printIssues() {
  const groups = [
    ['frontmatter', 'Skill frontmatter'],
    ['links', 'Relative links'],
    ['hygiene', 'Hygiene'],
    ['urls', 'URL allowlist'],
  ];
  let printed = false;
  for (const [check, title] of groups) {
    const group = issues.filter((issue) => issue.check === check);
    if (group.length === 0) continue;
    printed = true;
    console.log(`\n${title}:`);
    for (const issue of group) {
      const location = issue.line > 0
        ? `${toPosix(relative(ROOT, issue.file))}:${issue.line}`
        : toPosix(relative(ROOT, issue.file));
      console.log(`  ${location}: ${issue.level}: ${issue.message}`);
    }
  }
  if (!printed) console.log('No issues found.');
}

function main() {
  const files = walk(ROOT);
  const skillCount = checkFrontmatter();
  checkLinks(files);
  checkHygiene(files);
  checkUrls(files);
  printIssues();

  const errors = issues.filter((issue) => issue.level === 'error').length;
  const warnings = issues.filter((issue) => issue.level === 'warning').length;
  console.log(`\nskills: ${skillCount}  files: ${files.length}  errors: ${errors}  warnings: ${warnings}`);
  process.exitCode = errors > 0 ? 1 : 0;
}

main();
