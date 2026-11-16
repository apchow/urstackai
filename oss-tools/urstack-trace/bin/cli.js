#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseTrace, diagnose, formatOutput } = require('../index.js');
const { version } = require('../package.json');

const HELP = `
urstack-trace ${version} — diagnose a stack trace in one command

USAGE
  urstack-trace <file>             analyze a trace / error log
  cat err.log | urstack-trace      analyze stdin

OPTIONS
  -l, --language <lang>   auto | python | node | java | go | rust   (default: auto)
  -f, --format <fmt>      text | markdown                            (default: text)
      --json              print the diagnosis as JSON
  -h, --help              show this help
  -v, --version           print version

EXIT CODES
  0  no recognizable error signature
  1  diagnosis produced (use in CI)
  2  bad usage / unreadable input
`;

function flag(args, names) {
  for (let i = 0; i < args.length; i++) {
    if (names.includes(args[i])) return args[i + 1];
    const eq = args[i].indexOf('=');
    if (eq > -1 && names.includes(args[i].slice(0, eq))) return args[i].slice(eq + 1);
  }
  return undefined;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) { console.log(HELP); return 0; }
  if (args.includes('-v') || args.includes('--version')) { console.log(version); return 0; }

  const language = flag(args, ['-l', '--language', '--lang']) || 'auto';
  const json = args.includes('--json');
  const format = json ? 'text' : (flag(args, ['-f', '--format']) || (args.includes('--markdown') ? 'markdown' : 'text'));
  const positional = args.filter(a => !a.startsWith('-') && ![language, format].includes(a));
  const file = positional[0];

  let input;
  if (file) {
    try { input = fs.readFileSync(path.resolve(file), 'utf8'); }
    catch (e) { console.error(`urstack-trace: cannot read ${file}: ${e.message}`); return 2; }
  } else {
    if (process.stdin.isTTY) { console.log(HELP); return 2; }
    try { input = fs.readFileSync(0, 'utf8'); } catch (_) { input = ''; }
  }

  if (!input || !input.trim()) {
    console.error('urstack-trace: no input. Pass a file or pipe a log.');
    return 2;
  }

  const diagnosis = diagnose(parseTrace(input, language));
  if (json) console.log(JSON.stringify(diagnosis, null, 2));
  else console.log(formatOutput(diagnosis, format));

  return diagnosis.matchedPattern ? 1 : 0;
}

process.exitCode = main();
