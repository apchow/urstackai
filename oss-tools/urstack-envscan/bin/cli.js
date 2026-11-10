#!/usr/bin/env node

// urstack-envscan — CLI secret & environment scanner
// https://urstack-ai.vercel.app

'use strict';

const path = require('path');
const {
  scanDirectory,
  scanGitHistory,
  auditIDEExtensions,
  auditSSHConfig,
  validateGitignore,
  formatFindings,
  SEVERITY,
} = require('../index');

// ─── ANSI colors ───────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// ─── CLI argument parser ───────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    paths: [],
    gitHistory: false,
    ide: false,
    ssh: false,
    format: 'text',
    severity: 'all',
    help: false,
    version: false,
    quiet: false,
    noColor: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--version':
      case '-v':
        args.version = true;
        break;
      case '--git-history':
      case '-g':
        args.gitHistory = true;
        break;
      case '--ide':
      case '-i':
        args.ide = true;
        break;
      case '--ssh':
      case '-s':
        args.ssh = true;
        break;
      case '--quiet':
      case '-q':
        args.quiet = true;
        break;
      case '--no-color':
        args.noColor = true;
        break;
      case '--format':
      case '-f':
        args.format = argv[++i] || 'text';
        break;
      case '--severity':
        args.severity = argv[++i] || 'all';
        break;
      case '--path':
      case '-p':
        args.paths.push(argv[++i]);
        break;
      default:
        if (!arg.startsWith('-')) {
          args.paths.push(arg);
        }
        break;
    }
  }

  if (args.paths.length === 0 && !args.ide && !args.ssh) {
    args.paths.push('.');
  }

  return args;
}

// ─── Help text ─────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
${c.bold}${c.cyan}urstack-envscan${c.reset} — Scan repos for leaked secrets, exposed .env files & more

${c.bold}USAGE${c.reset}
  ${c.green}envscan${c.reset} [path]              Scan a directory (default: current dir)
  ${c.green}envscan${c.reset} --path /repo         Scan a specific path
  ${c.green}envscan${c.reset} --git-history        Scan git commit history for secrets
  ${c.green}envscan${c.reset} --ide                Audit IDE extensions (VS Code, Cursor)
  ${c.green}envscan${c.reset} --ssh                Check SSH config for risks

${c.bold}OPTIONS${c.reset}
  -h, --help                 Show this help message
  -v, --version              Show version number
  -f, --format <type>        Output format: text, json, sarif (default: text)
  --severity <level>         Filter: critical, high, medium, low, all (default: all)
  -q, --quiet                Suppress banner, only output findings
  --no-color                 Disable colored output
  -g, --git-history          Scan git history for committed secrets
  -i, --ide                  Audit IDE extensions for supply-chain risks
  -s, --ssh                  Check SSH configuration for risks

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Scan current directory${c.reset}
  envscan .

  ${c.dim}# Scan with JSON output for CI/CD${c.reset}
  envscan . --format json --severity critical

  ${c.dim}# Full audit: files + git history + IDE + SSH${c.reset}
  envscan . --git-history --ide --ssh

  ${c.dim}# GitHub Actions / CI exit code check${c.reset}
  envscan . --severity high && echo "Clean" || echo "Secrets found!"

${c.bold}EXIT CODES${c.reset}
  0  No critical/high findings
  1  Critical or high-severity findings detected

${c.dim}🔒 Powered by UrStack AI — https://urstack-ai.vercel.app${c.reset}
${c.dim}   Full AST Security Audit: https://urstack-ai.vercel.app${c.reset}
`);
}

function printBanner() {
  console.log(`
${c.bold}${c.cyan}╔══════════════════════════════════════════════════════╗
║          ${c.white}🔍 urstack-envscan v1.0.0${c.cyan}                  ║
║          ${c.dim}${c.white}Secret & Environment Scanner${c.reset}${c.bold}${c.cyan}                 ║
╚══════════════════════════════════════════════════════╝${c.reset}
`);
}

function printFooter(stats) {
  const { critical, high, medium, low } = stats;
  const total = critical + high + medium + low;

  console.log(`
${c.bold}═══════════════════════════════════════════════════════${c.reset}
${c.bold}  SCAN SUMMARY${c.reset}
${c.bold}═══════════════════════════════════════════════════════${c.reset}
  ${c.bgRed}${c.white}${c.bold} CRITICAL ${c.reset} ${critical}     ${c.red}${c.bold} HIGH ${c.reset} ${high}     ${c.yellow}${c.bold} MEDIUM ${c.reset} ${medium}     ${c.blue}${c.bold} LOW ${c.reset} ${low}
  ${c.bold}Total findings:${c.reset} ${total}
${c.bold}═══════════════════════════════════════════════════════${c.reset}

${c.dim}🔒 Powered by UrStack AI — https://urstack-ai.vercel.app${c.reset}
${c.dim}   Full AST Security Audit: https://urstack-ai.vercel.app${c.reset}
${c.dim}   Air-Gapped AI (GyanSutr): https://github.com/apchow/gyansutr${c.reset}
`);
}

function severityIcon(sev) {
  switch (sev) {
    case SEVERITY.CRITICAL:
      return `${c.bgRed}${c.white}${c.bold} CRIT ${c.reset}`;
    case SEVERITY.HIGH:
      return `${c.red}${c.bold} HIGH ${c.reset}`;
    case SEVERITY.MEDIUM:
      return `${c.yellow}${c.bold}  MED ${c.reset}`;
    case SEVERITY.LOW:
      return `${c.blue}${c.bold}  LOW ${c.reset}`;
    default:
      return `${c.dim} INFO ${c.reset}`;
  }
}

function printTextFindings(findings) {
  if (findings.length === 0) {
    console.log(`\n  ${c.green}${c.bold}✅ No secrets or misconfigurations found!${c.reset}\n`);
    return;
  }

  for (const f of findings) {
    const icon = severityIcon(f.severity);
    const fileLine = f.line ? `:${f.line}` : '';
    console.log(`  ${icon} ${c.bold}${f.ruleId}${c.reset}`);
    console.log(`         ${c.dim}File:${c.reset} ${f.file}${fileLine}`);
    console.log(`         ${f.message}`);
    if (f.match) {
      // Redact most of the match for security
      const redacted = f.match.length > 12
        ? f.match.substring(0, 8) + '****' + f.match.substring(f.match.length - 4)
        : '****';
      console.log(`         ${c.dim}Match:${c.reset} ${c.red}${redacted}${c.reset}`);
    }
    console.log('');
  }
}

// ─── SARIF output format ───────────────────────────────────────────────────────
function toSarif(findings) {
  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'urstack-envscan',
            version: '1.0.0',
            informationUri: 'https://urstack-ai.vercel.app',
            rules: [...new Set(findings.map((f) => f.ruleId))].map((id) => ({
              id,
              shortDescription: { text: id },
            })),
          },
        },
        results: findings.map((f) => ({
          ruleId: f.ruleId,
          level: f.severity === SEVERITY.CRITICAL || f.severity === SEVERITY.HIGH ? 'error' : 'warning',
          message: { text: f.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: f.file },
                region: f.line ? { startLine: f.line } : undefined,
              },
            },
          ],
        })),
      },
    ],
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);

  if (args.noColor) {
    Object.keys(c).forEach((k) => (c[k] = ''));
  }

  if (args.version) {
    console.log('urstack-envscan v1.0.0');
    process.exit(0);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.quiet && args.format === 'text') {
    printBanner();
  }

  let allFindings = [];

  // File scanning
  for (const p of args.paths) {
    const absPath = path.resolve(p);
    if (args.format === 'text' && !args.quiet) {
      console.log(`  ${c.cyan}📂 Scanning directory:${c.reset} ${absPath}\n`);
    }

    const findings = await scanDirectory(absPath);
    allFindings = allFindings.concat(findings);

    // .gitignore validation
    const gitignoreFindings = await validateGitignore(absPath);
    allFindings = allFindings.concat(gitignoreFindings);
  }

  // Git history scan
  if (args.gitHistory) {
    if (args.format === 'text' && !args.quiet) {
      console.log(`  ${c.cyan}📜 Scanning git history...${c.reset}\n`);
    }
    for (const p of args.paths) {
      const absPath = path.resolve(p);
      const gitFindings = await scanGitHistory(absPath);
      allFindings = allFindings.concat(gitFindings);
    }
  }

  // IDE extension audit
  if (args.ide) {
    if (args.format === 'text' && !args.quiet) {
      console.log(`  ${c.cyan}🧩 Auditing IDE extensions...${c.reset}\n`);
    }
    const ideFindings = await auditIDEExtensions();
    allFindings = allFindings.concat(ideFindings);
  }

  // SSH config audit
  if (args.ssh) {
    if (args.format === 'text' && !args.quiet) {
      console.log(`  ${c.cyan}🔑 Auditing SSH configuration...${c.reset}\n`);
    }
    const sshFindings = await auditSSHConfig();
    allFindings = allFindings.concat(sshFindings);
  }

  // Apply severity filter
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  if (args.severity !== 'all') {
    const minSev = severityOrder[args.severity] || 0;
    allFindings = allFindings.filter((f) => (severityOrder[f.severity] || 0) >= minSev);
  }

  // Sort by severity (critical first)
  allFindings.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

  // Output
  switch (args.format) {
    case 'json':
      console.log(JSON.stringify(allFindings, null, 2));
      break;
    case 'sarif':
      console.log(JSON.stringify(toSarif(allFindings), null, 2));
      break;
    case 'text':
    default:
      printTextFindings(allFindings);
      break;
  }

  // Stats & footer
  const stats = {
    critical: allFindings.filter((f) => f.severity === SEVERITY.CRITICAL).length,
    high: allFindings.filter((f) => f.severity === SEVERITY.HIGH).length,
    medium: allFindings.filter((f) => f.severity === SEVERITY.MEDIUM).length,
    low: allFindings.filter((f) => f.severity === SEVERITY.LOW).length,
  };

  if (args.format === 'text' && !args.quiet) {
    printFooter(stats);
  }

  // Exit code 1 if critical or high findings
  if (stats.critical > 0 || stats.high > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(2);
});
