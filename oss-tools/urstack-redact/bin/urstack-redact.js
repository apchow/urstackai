#!/usr/bin/env node
'use strict';
const fs = require('fs');

const RULES = [
  { id: 'AWS_KEY', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: 'GITHUB_TOKEN', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { id: 'STRIPE_KEY', re: /\b(sk|rk)_live_[A-Za-z0-9]{20,}\b/g },
  { id: 'OPENAI_KEY', re: /\bsk-(?:proj-|svcacct-|admin-|ant-)?[A-Za-z0-9_-]{20,}\b/g },
  { id: 'GOOGLE_KEY', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: 'SLACK_TOKEN', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: 'RESEND_KEY', re: /\bre_[A-Za-z0-9_]{16,}\b/g },
  { id: 'PRIVATE_KEY', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { id: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}\b/g },
  { id: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { id: 'PAN', re: /\b(?:\d[ -]?){12,18}\d\b/g, luhn: true },
  { id: 'PHONE', re: /(?:\+\d{1,3}[ -]?)?\b\d{10}\b/g }
];

function luhnOk(num) {
  const d = num.replace(/\D/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

function redact(text) {
  const counts = {};
  let out = text;
  for (const rule of RULES) {
    const seen = [];
    out = out.replace(rule.re, (match) => {
      if (rule.luhn && !luhnOk(match)) return match;
      if (rule.id === 'PHONE' && /^\d{4}-\d{2}-\d{2}$/.test(match)) return match;
      const idx = seen.indexOf(match);
      if (idx === -1) { seen.push(match); return '<' + rule.id + '_' + (seen.length) + '>'; }
      return '<' + rule.id + '_' + (idx + 1) + '>';
    });
    if (seen.length) counts[rule.id] = seen.length;
  }
  return { out, counts };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log('urstack-redact — strip secrets and PII from text before it leaves the machine\n');
    console.log('  urstack-redact [file]            # redacted text to stdout');
    console.log('  cat notes.txt | urstack-redact');
    console.log('  urstack-redact draft.md --stats  # counts to stderr');
    console.log('  urstack-redact draft.md --map    # how many of each placeholder');
    console.log('\nPlaceholders are stable per run (<EMAIL_1>, <EMAIL_2>) and never include the value.');
    return;
  }
  const file = argv.find(a => !a.startsWith('-'));
  let text;
  if (file && file !== '-') {
    if (!fs.existsSync(file)) { console.error('urstack-redact: no such file: ' + file); process.exit(2); }
    text = fs.readFileSync(file, 'utf8');
  } else {
    try { text = fs.readFileSync(0, 'utf8'); } catch (e) { text = ''; }
  }
  if (!text) { console.error('urstack-redact: no input (pass a file or pipe text in).'); process.exit(2); }

  const { out, counts } = redact(text);
  process.stdout.write(out);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (argv.includes('--map') || argv.includes('--stats')) {
    console.error('');
    console.error('urstack-redact: ' + total + ' span(s) replaced' + (total ? ' — ' + Object.entries(counts).map(([k, v]) => k + '×' + v).join(', ') : ''));
  }
  process.exit(0);
}

main();
