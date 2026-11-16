#!/usr/bin/env node
'use strict';

const { detectHardware, recommend, getAllModels, compareModels } = require('../index.js');
const { version } = require('../package.json');

const HELP = `
urstack-stackpick ${version} — match local models to your hardware

USAGE
  stackpick                 detect hardware, list the models that fit
  stackpick scan            same, explicit
  stackpick list            list every model in the database
  stackpick compare A B     compare two models by name fragment
  stackpick doctor          print detected hardware only

OPTIONS
  --ram <GB>     override detected system RAM
  --vram <GB>    override detected VRAM (0 = CPU only)
  --json         machine-readable output
  -h, --help     show this help
`;

function flag(args, names) {
  for (let i = 0; i < args.length; i++) {
    if (names.includes(args[i])) return args[i + 1];
    const eq = args[i].indexOf('=');
    if (eq > -1 && names.includes(args[i].slice(0, eq))) return args[i].slice(eq + 1);
  }
  return undefined;
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) { console.log(HELP); return 0; }
  const json = args.includes('--json');

  const hw = detectHardware();
  const ramArg = flag(args, ['--ram']);
  const vramArg = flag(args, ['--vram']);
  const ram = ramArg !== undefined ? Number(ramArg) : hw.totalRam;
  const vram = vramArg !== undefined ? Number(vramArg) : (hw.vram || 0);
  const freeVram = vram > 0 ? Math.round(vram * 0.9 * 10) / 10 : 0;

  if (isNaN(ram) || isNaN(vram)) { console.error('stackpick: --ram and --vram take a number of GB'); return 2; }

  const cmd = (args[0] && !args[0].startsWith('-')) ? args[0] : 'scan';

  if (cmd === 'doctor') {
    if (json) console.log(JSON.stringify({ ...hw, usedRam: ram, usedVram: vram }, null, 2));
    else {
      console.log('\nHardware');
      console.log(`  CPU    ${hw.cpu} (${hw.cores} cores)`);
      console.log(`  RAM    ${hw.totalRam} GB total, ${hw.freeRam} GB free  ->  budgeting ${ram} GB`);
      console.log(`  GPU    ${hw.gpu || 'none detected'}`);
      console.log(`  VRAM   ${hw.vram ? hw.vram + ' GB' : 'none'}  ->  budgeting ${freeVram || 0} GB\n`);
    }
    return 0;
  }

  if (cmd === 'list') {
    const models = getAllModels();
    if (json) console.log(JSON.stringify(models, null, 2));
    else {
      console.log(`\n${models.length} models in the database\n`);
      for (const m of models) console.log(`  ${pad(m.name, 30)} ${pad(m.params, 6)} ${pad(m.family, 10)} ${m.useCase || ''}`);
      console.log('');
    }
    return 0;
  }

  if (cmd === 'compare') {
    const names = args.slice(1).filter(a => !a.startsWith('-'));
    if (names.length < 2) { console.error('stackpick: compare needs two model names, e.g. stackpick compare llama mistral'); return 2; }
    const result = compareModels(names);
    console.log(json ? JSON.stringify(result, null, 2) : result);
    return 0;
  }

  const recs = recommend({ ram, vram: freeVram });
  if (json) { console.log(JSON.stringify({ hardware: { ram, vram: freeVram }, models: recs }, null, 2)); return 0; }

  console.log(`\nHardware: ${hw.cores} cores, ${ram} GB RAM${freeVram ? `, ${freeVram} GB usable VRAM` : ', CPU only'}`);
  if (recs.length === 0) {
    console.log('\nNothing in the database fits that budget. Try --ram with more memory, or a 1B-class model.\n');
    return 0;
  }
  console.log(`\n${recs.length} models fit — best first\n`);
  for (const r of recs.slice(0, 15)) {
    console.log(`  ${pad(r.model, 28)} ${pad(r.bestQuant, 8)} ${pad(r.estimatedMemory, 9)} ${pad(r.tier, 8)} ${r.useCase || ''}`);
  }
  console.log(`\nPull one:  ollama pull ${(recs[0].model || '').toLowerCase().replace(/[^a-z0-9.]+/g, '-')}\n`);
  return 0;
}

process.exitCode = main();
