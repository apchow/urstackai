#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const REQUIRED = ['When to use', 'Inputs', 'Steps', 'Guardrails', 'Output'];

function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function scaffold(name, dir) {
  const slug = slugify(name);
  const target = path.join(dir || 'skills', slug);
  fs.mkdirSync(target, { recursive: true });
  const file = path.join(target, 'SKILL.md');
  if (fs.existsSync(file)) { console.error('urstack-skill: ' + file + ' already exists'); process.exit(1); }
  const body = [
    '---',
    'name: ' + slug,
    'description: One sentence on when an agent should load this skill.',
    'version: 0.1.0',
    '---',
    '',
    '# ' + slug.replace(/-/g, ' '),
    '',
    '## When to use',
    '',
    '- Trigger: the situation that should load this skill.',
    '- Do **not** use when: the near-miss case that should not.',
    '',
    '## Inputs',
    '',
    '| name | required | example |',
    '| --- | --- | --- |',
    '| input | yes | sample value |',
    '',
    '## Steps',
    '',
    '1. First concrete action.',
    '2. Second concrete action.',
    '3. Verify the result before reporting.',
    '',
    '## Guardrails',
    '',
    '- Never invent data you were not given.',
    '- Stop and ask when a required input is missing.',
    '- Do not send anything to a network unless the user asked for it.',
    '',
    '## Output',
    '',
    'State the exact shape the agent must return (markdown section, JSON keys, or both).',
    ''
  ].join('\n');
  fs.writeFileSync(file, body, 'utf8');
  console.log('created ' + file);
  console.log('next: fill in Steps and Guardrails, then `urstack-skill check ' + target + '`');
}

function check(target) {
  const file = fs.statSync(target).isDirectory() ? path.join(target, 'SKILL.md') : target;
  if (!fs.existsSync(file)) { console.error('urstack-skill: no SKILL.md at ' + target); process.exit(2); }
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(String.fromCharCode(10)).map(function (l) { return l.replace(String.fromCharCode(13), ''); });
  const problems = [];

  if (lines[0] !== '---') problems.push('missing YAML front matter (first line must be ---)');
  else {
    let end = -1;
    for (let i = 1; i < lines.length; i++) if (lines[i] === '---') { end = i; break; }
    if (end < 0) problems.push('front matter is not closed with ---');
    else {
      const fm = lines.slice(1, end);
      if (!fm.some(function (l) { return l.indexOf('name:') === 0; })) problems.push('front matter needs `name:`');
      if (!fm.some(function (l) { return l.indexOf('description:') === 0; })) problems.push('front matter needs `description:`');
    }
  }

  const headings = lines
    .filter(function (l) { return l.trim().indexOf('## ') === 0; })
    .map(function (l) { return l.trim().slice(3).trim().toLowerCase(); });
  REQUIRED.forEach(function (h) {
    if (headings.indexOf(h.toLowerCase()) === -1) problems.push('missing section: ## ' + h);
  });

  const words = text.split(' ').join(String.fromCharCode(10)).split(String.fromCharCode(10)).filter(function (w) { return w.trim(); }).length;
  if (words < 60) problems.push('too thin (' + words + ' words) — an agent needs concrete steps');

  const shown = file.split(String.fromCharCode(92)).join('/');
  if (!problems.length) {
    console.log('PASS  ' + shown + '  (' + words + ' words, 5/5 sections)');
    return 0;
  }
  console.error('FAIL  ' + shown);
  problems.forEach(function (p) { console.error('  - ' + p); });
  return 1;
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    console.log('urstack-skill — scaffold and validate SKILL.md playbooks\n');
    console.log('  urstack-skill new "pr review"     # writes skills/pr-review/SKILL.md');
    console.log('  urstack-skill check skills/       # validate every skill in a folder');
    console.log('  urstack-skill list skills/\n');
    console.log('A valid skill has front matter (name, description) and five sections:');
    console.log('  ' + REQUIRED.join(' · '));
    return;
  }
  if (cmd === 'new') {
    const name = argv.slice(1).filter(a => !a.startsWith('-'))[0];
    if (!name) { console.error('urstack-skill: give it a name, e.g. `urstack-skill new "pr review"`'); process.exit(2); }
    const dir = argv.find(a => a.startsWith('--dir='));
    scaffold(name, dir ? dir.split('=')[1] : 'skills');
    return;
  }
  if (cmd === 'check' || cmd === 'list') {
    const target = argv.slice(1).filter(a => !a.startsWith('-'))[0] || 'skills';
    if (!fs.existsSync(target)) { console.error('urstack-skill: no such path: ' + target); process.exit(2); }
    const files = [];
    const walk = (p) => {
      if (fs.statSync(p).isFile()) { if (path.basename(p) === 'SKILL.md') files.push(p); return; }
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        walk(path.join(p, e.name));
      }
    };
    walk(target);
    if (!files.length) { console.error('urstack-skill: no SKILL.md found under ' + target); process.exit(1); }
    if (cmd === 'list') { files.forEach(f => console.log(f)); return; }
    let fails = 0;
    files.forEach(f => { fails += check(f); });
    process.exit(fails ? 1 : 0);
  }
  console.error('urstack-skill: unknown command "' + cmd + '"');
  process.exit(2);
}

main();
