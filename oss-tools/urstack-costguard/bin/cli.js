#!/usr/bin/env node
'use strict';

const {
  PRICING,
  loadConfig,
  saveConfig,
  createDefaultConfig,
  estimateTokens,
  getModelPricing,
  calculateCost,
  recordUsage,
  getBudgetStatus,
  compareModels,
  listModels,
  generateReport,
} = require('../index');

// ─────────────────────────────────────────────────────────────────────────────
// ANSI color helpers (zero dependencies)
// ─────────────────────────────────────────────────────────────────────────────
const isColorEnabled = process.stdout.isTTY !== false && !process.env.NO_COLOR;

const c = {
  reset:   isColorEnabled ? '\x1b[0m' : '',
  bold:    isColorEnabled ? '\x1b[1m' : '',
  dim:     isColorEnabled ? '\x1b[2m' : '',
  red:     isColorEnabled ? '\x1b[31m' : '',
  green:   isColorEnabled ? '\x1b[32m' : '',
  yellow:  isColorEnabled ? '\x1b[33m' : '',
  blue:    isColorEnabled ? '\x1b[34m' : '',
  magenta: isColorEnabled ? '\x1b[35m' : '',
  cyan:    isColorEnabled ? '\x1b[36m' : '',
  white:   isColorEnabled ? '\x1b[37m' : '',
  bgRed:   isColorEnabled ? '\x1b[41m' : '',
  bgGreen: isColorEnabled ? '\x1b[42m' : '',
  bgYellow:isColorEnabled ? '\x1b[43m' : '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Argument parsing (zero dependencies)
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith('-') ? args[0] : null;
  const flags = {};
  const positional = [];

  let dashDashIndex = args.indexOf('--');
  const parseEnd = dashDashIndex >= 0 ? dashDashIndex : args.length;
  const trailingArgs = dashDashIndex >= 0 ? args.slice(dashDashIndex + 1) : [];

  for (let i = command ? 1 : 0; i < parseEnd; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else if (i + 1 < parseEnd && !args[i + 1].startsWith('-')) {
        flags[arg.slice(2)] = args[i + 1];
        i++;
      } else {
        flags[arg.slice(2)] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      if (i + 1 < parseEnd && !args[i + 1].startsWith('-')) {
        flags[arg.slice(1)] = args[i + 1];
        i++;
      } else {
        flags[arg.slice(1)] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional, trailingArgs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────
function banner() {
  console.log(`
${c.bold}${c.cyan}  ╔═══════════════════════════════════════════════════╗
  ║   💰  UrStack CostGuard — AI API Cost Monitor   ║
  ╚═══════════════════════════════════════════════════╝${c.reset}
`);
}

function footer() {
  console.log(`
${c.dim}──────────────────────────────────────────────────────────────
💰 Powered by UrStack AI — https://urstack-ai.vercel.app
   $2/task hard kill-switch workflows: https://urstack-ai.vercel.app
──────────────────────────────────────────────────────────────${c.reset}
`);
}

function budgetMeter(percent, width = 30) {
  const filled = Math.round((Math.min(percent, 100) / 100) * width);
  const empty = width - filled;
  let barColor = c.green;
  if (percent >= 90) barColor = c.red;
  else if (percent >= 70) barColor = c.yellow;
  const bar = barColor + '█'.repeat(filled) + c.dim + '░'.repeat(empty) + c.reset;
  return `[${bar}] ${percent.toFixed(1)}%`;
}

function formatUsd(n) {
  return '$' + n.toFixed(6);
}

function formatUsd2(n) {
  return '$' + n.toFixed(2);
}

function padRight(s, len) {
  return String(s).padEnd(len);
}

function padLeft(s, len) {
  return String(s).padStart(len);
}

function tableRow(...cols) {
  return cols.map(([val, width, align]) => {
    const s = String(val);
    return align === 'right' ? padLeft(s, width) : padRight(s, width);
  }).join('  ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdHelp() {
  banner();
  console.log(`${c.bold}USAGE${c.reset}
  ${c.cyan}costguard${c.reset} <command> [options]

${c.bold}COMMANDS${c.reset}
  ${c.green}init${c.reset}                              Create .costguard.json config
  ${c.green}status${c.reset}                            Show current session spend & remaining budget
  ${c.green}calc${c.reset}                              Calculate cost for a token count or prompt
  ${c.green}compare${c.reset}                           Compare cost across all models
  ${c.green}wrap${c.reset} -- <command>                  Wrap a command with spend monitoring
  ${c.green}models${c.reset}                            List all models with pricing
  ${c.green}report${c.reset}                            Generate spend report from logs
  ${c.green}reset${c.reset}                             Reset session spend data
  ${c.green}help${c.reset}                              Show this help message

${c.bold}OPTIONS${c.reset}
  ${c.yellow}--budget${c.reset} <usd>                    Set max budget in USD (default: 10.00)
  ${c.yellow}--alert-at${c.reset} <percent>              Alert threshold (default: 80)
  ${c.yellow}--model${c.reset} <model-name>              Model to use for calculation
  ${c.yellow}--tokens${c.reset} <count>                  Total token count (split 70/30 in/out)
  ${c.yellow}--input-tokens${c.reset} <count>            Input token count
  ${c.yellow}--output-tokens${c.reset} <count>           Output token count
  ${c.yellow}--prompt${c.reset} <text>                   Estimate tokens from text
  ${c.yellow}--provider${c.reset} <name>                 Filter by provider (OpenAI, Anthropic, etc.)

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Initialize with $5 budget${c.reset}
  costguard init --budget 5.00

  ${c.dim}# Calculate cost for 50K tokens on GPT-4o${c.reset}
  costguard calc --tokens 50000 --model gpt-4o

  ${c.dim}# Estimate cost from a prompt${c.reset}
  costguard calc --prompt "Refactor the auth module to use JWT" --model claude-sonnet-5.5

  ${c.dim}# Compare 10K tokens across all models${c.reset}
  costguard compare --tokens 10000

  ${c.dim}# Wrap a command with monitoring${c.reset}
  costguard wrap -- claude code "fix the bug"
`);
  footer();
}

function cmdInit(flags) {
  const budget = parseFloat(flags.budget) || 10.00;
  const alertAt = parseInt(flags['alert-at'], 10) || 80;
  const model = flags.model || 'claude-sonnet-5.5';

  const config = createDefaultConfig({ budget, alertAt, model });
  const cfgPath = saveConfig(config);

  banner();
  console.log(`  ${c.green}✓${c.reset} Created ${c.bold}${cfgPath}${c.reset}`);
  console.log(`  ${c.cyan}Budget:${c.reset}    ${formatUsd2(budget)}`);
  console.log(`  ${c.cyan}Alert at:${c.reset}  ${alertAt}%`);
  console.log(`  ${c.cyan}Model:${c.reset}     ${model}`);
  console.log(`  ${c.cyan}Hard kill:${c.reset} enabled`);
  console.log(`\n  ${c.dim}Run ${c.cyan}costguard status${c.dim} to check your budget.${c.reset}`);
  footer();
}

function cmdStatus() {
  const config = loadConfig();
  if (!config) {
    console.error(`\n  ${c.red}✗${c.reset} No .costguard.json found. Run ${c.cyan}costguard init${c.reset} first.\n`);
    process.exit(1);
  }

  const s = getBudgetStatus(config);
  banner();

  console.log(`  ${c.bold}Session Budget${c.reset}`);
  console.log(`  ${budgetMeter(s.budgetPercent)}`);
  console.log();
  console.log(`  ${c.cyan}Spent:${c.reset}       ${c.bold}${formatUsd2(s.budgetUsed)}${c.reset} of ${formatUsd2(s.budgetMax)}`);
  console.log(`  ${c.cyan}Remaining:${c.reset}   ${c.green}${formatUsd2(s.budgetRemaining)}${c.reset}`);
  console.log(`  ${c.cyan}Requests:${c.reset}    ${s.requestCount}`);
  console.log(`  ${c.cyan}Tokens:${c.reset}      ${s.totalInputTokens.toLocaleString()} in / ${s.totalOutputTokens.toLocaleString()} out`);
  console.log(`  ${c.cyan}Session:${c.reset}     ${s.sessionStarted}`);

  if (s.overBudget) {
    console.log(`\n  ${c.bgRed}${c.white}${c.bold} ⚠ BUDGET EXCEEDED ${c.reset} — hard kill-switch would trigger`);
  } else if (s.alertTriggered) {
    console.log(`\n  ${c.bgYellow}${c.bold} ⚠ ALERT ${c.reset} — you've used ${s.budgetPercent.toFixed(1)}% of your budget`);
  }

  footer();
}

function cmdCalc(flags) {
  let inputTokens, outputTokens;
  const model = flags.model || 'claude-sonnet-5.5';

  if (flags.prompt) {
    const estimated = estimateTokens(String(flags.prompt));
    inputTokens = estimated;
    outputTokens = Math.ceil(estimated * 0.5); // assume 50% response ratio
    console.log(`\n  ${c.dim}Estimated ${estimated} input tokens from prompt text${c.reset}`);
  } else if (flags['input-tokens'] && flags['output-tokens']) {
    inputTokens = parseInt(flags['input-tokens'], 10);
    outputTokens = parseInt(flags['output-tokens'], 10);
  } else if (flags.tokens) {
    const total = parseInt(flags.tokens, 10);
    inputTokens = Math.ceil(total * 0.7);  // 70/30 split
    outputTokens = total - inputTokens;
  } else {
    console.error(`\n  ${c.red}✗${c.reset} Provide --tokens, --prompt, or --input-tokens + --output-tokens\n`);
    process.exit(1);
  }

  const pricing = getModelPricing(model);
  if (!pricing) {
    console.error(`\n  ${c.red}✗${c.reset} Unknown model: ${model}. Run ${c.cyan}costguard models${c.reset} to see available models.\n`);
    process.exit(1);
  }

  const cost = calculateCost(inputTokens, outputTokens, model);
  banner();

  console.log(`  ${c.bold}Cost Estimate${c.reset}  —  ${c.cyan}${cost.model}${c.reset} (${cost.provider})`);
  console.log();
  console.log(`  ${c.cyan}Input tokens:${c.reset}   ${inputTokens.toLocaleString()} × $${pricing.input}/1M  =  ${formatUsd(cost.inputCost)}`);
  console.log(`  ${c.cyan}Output tokens:${c.reset}  ${outputTokens.toLocaleString()} × $${pricing.output}/1M  =  ${formatUsd(cost.outputCost)}`);
  console.log(`  ${'─'.repeat(50)}`);
  console.log(`  ${c.bold}Total:${c.reset}          ${c.bold}${c.green}${formatUsd(cost.totalCost)}${c.reset}`);

  // Context: how many requests fit in typical budgets
  if (cost.totalCost > 0) {
    const perDollar = Math.floor(1 / cost.totalCost);
    console.log(`\n  ${c.dim}≈ ${perDollar.toLocaleString()} requests like this per $1.00${c.reset}`);
    console.log(`  ${c.dim}≈ ${(perDollar * 2).toLocaleString()} per UrStack's $2/task budget${c.reset}`);
  }

  // Also record to session if config exists
  const config = loadConfig();
  if (config) {
    recordUsage(config, inputTokens, outputTokens, model);
    saveConfig(config);
    console.log(`\n  ${c.dim}📝 Recorded to session budget${c.reset}`);
  }

  footer();
}

function cmdCompare(flags) {
  let inputTokens, outputTokens;
  const providerFilter = flags.provider ? [flags.provider] : null;

  if (flags.tokens) {
    const total = parseInt(flags.tokens, 10);
    inputTokens = Math.ceil(total * 0.7);
    outputTokens = total - inputTokens;
  } else if (flags['input-tokens'] && flags['output-tokens']) {
    inputTokens = parseInt(flags['input-tokens'], 10);
    outputTokens = parseInt(flags['output-tokens'], 10);
  } else {
    inputTokens = 7000;
    outputTokens = 3000;
  }

  const results = compareModels(inputTokens, outputTokens, providerFilter);
  banner();

  console.log(`  ${c.bold}Cost Comparison${c.reset}  —  ${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens`);
  console.log();

  // Table header
  const header = tableRow(
    ['Model', 24], ['Provider', 12], ['Input $/1M', 11, 'right'],
    ['Output $/1M', 12, 'right'], ['Total Cost', 12, 'right']
  );
  console.log(`  ${c.bold}${header}${c.reset}`);
  console.log(`  ${'─'.repeat(75)}`);

  const cheapest = results[0]?.totalCost || 0;

  for (const r of results) {
    const multiplier = cheapest > 0 ? r.totalCost / cheapest : 1;
    let costColor = c.green;
    if (multiplier > 10) costColor = c.red;
    else if (multiplier > 3) costColor = c.yellow;

    const row = tableRow(
      [r.model, 24], [r.provider, 12],
      ['$' + r.pricing.input.toFixed(2), 11, 'right'],
      ['$' + r.pricing.output.toFixed(2), 12, 'right'],
      [costColor + formatUsd(r.totalCost) + c.reset, 12 + (costColor.length + c.reset.length), 'right']
    );
    console.log(`  ${row}`);
  }

  if (results.length > 1) {
    const cheapName = results[0].model;
    const expName = results[results.length - 1].model;
    const ratio = results[results.length - 1].totalCost / results[0].totalCost;
    console.log(`\n  ${c.dim}💡 ${expName} is ${ratio.toFixed(0)}x more expensive than ${cheapName}${c.reset}`);
  }

  footer();
}

function cmdModels(flags) {
  const models = listModels();
  const providerFilter = flags.provider;

  banner();
  console.log(`  ${c.bold}Model Pricing Reference${c.reset}  —  ${models.length} models\n`);

  let currentProvider = '';
  for (const m of models) {
    if (providerFilter && m.provider.toLowerCase() !== providerFilter.toLowerCase()) continue;

    if (m.provider !== currentProvider) {
      currentProvider = m.provider;
      console.log(`  ${c.bold}${c.magenta}${currentProvider}${c.reset}`);
    }
    const inPrice = padLeft('$' + m.inputPer1M.toFixed(2), 8);
    const outPrice = padLeft('$' + m.outputPer1M.toFixed(2), 8);
    const ctx = padLeft((m.context / 1000) + 'K', 8);
    console.log(`    ${c.cyan}${padRight(m.name, 24)}${c.reset} ${inPrice} in  ${outPrice} out  ${ctx} ctx  ${c.dim}${m.note}${c.reset}`);
  }

  footer();
}

function cmdWrap(flags, trailingArgs) {
  if (trailingArgs.length === 0) {
    console.error(`\n  ${c.red}✗${c.reset} Usage: costguard wrap -- <command>\n`);
    console.error(`  ${c.dim}Example: costguard wrap -- claude code "fix the bug"${c.reset}\n`);
    process.exit(1);
  }

  let config = loadConfig();
  if (!config) {
    config = createDefaultConfig({ budget: parseFloat(flags.budget) || 10.00 });
    saveConfig(config);
    console.log(`  ${c.dim}Created .costguard.json with $${config.budget.maxUsd.toFixed(2)} budget${c.reset}`);
  }

  const status = getBudgetStatus(config);
  if (status.overBudget) {
    console.error(`\n  ${c.bgRed}${c.white}${c.bold} ⛔ BUDGET EXCEEDED ${c.reset}`);
    console.error(`  Spent: ${formatUsd2(status.budgetUsed)} of ${formatUsd2(status.budgetMax)}`);
    console.error(`  ${c.red}Command blocked by CostGuard circuit breaker.${c.reset}`);
    console.error(`\n  ${c.dim}Run ${c.cyan}costguard reset${c.dim} to clear the session or ${c.cyan}costguard init --budget <amount>${c.dim} to increase.${c.reset}\n`);
    process.exit(1);
  }

  const command = trailingArgs.join(' ');
  banner();
  console.log(`  ${c.bold}Wrapped Command${c.reset}: ${c.cyan}${command}${c.reset}`);
  console.log(`  ${c.bold}Budget Guard${c.reset}:   ${budgetMeter(status.budgetPercent)}`);
  console.log(`  ${c.bold}Remaining${c.reset}:      ${c.green}${formatUsd2(status.budgetRemaining)}${c.reset}`);
  console.log();

  if (status.alertTriggered) {
    console.log(`  ${c.bgYellow}${c.bold} ⚠ WARNING ${c.reset} ${status.budgetPercent.toFixed(1)}% of budget used. Proceeding cautiously.\n`);
  }

  // Execute the child process
  const { execSync } = require('child_process');
  const startTime = Date.now();

  try {
    console.log(`  ${c.dim}─── Command Output ────────────────────────────────${c.reset}\n`);
    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`\n  ${c.dim}─── End Output ────────────────────────────────────${c.reset}`);
  } catch (err) {
    const code = err.status || 1;
    console.log(`\n  ${c.dim}─── End Output (exit code: ${code}) ────────────────${c.reset}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Estimate tokens based on typical AI coding assistant usage patterns
  // This is a rough heuristic — actual tracking requires API key integration
  const estimatedInputTokens = 4000;   // typical prompt context
  const estimatedOutputTokens = 2000;  // typical response
  const model = flags.model || config.defaultModel || 'claude-sonnet-5.5';

  const result = recordUsage(config, estimatedInputTokens, estimatedOutputTokens, model);
  saveConfig(config);

  console.log(`\n  ${c.bold}CostGuard Summary${c.reset}`);
  console.log(`  ${c.cyan}Duration:${c.reset}     ${elapsed}s`);
  console.log(`  ${c.cyan}Est. cost:${c.reset}    ${formatUsd(result.cost.totalCost)} (${model})`);
  console.log(`  ${c.cyan}Session:${c.reset}      ${budgetMeter(result.budgetPercent)}`);
  console.log(`  ${c.cyan}Total spent:${c.reset}  ${formatUsd2(result.budgetUsed)} of ${formatUsd2(result.budgetMax)}`);

  if (result.overBudget) {
    console.log(`\n  ${c.bgRed}${c.white}${c.bold} ⛔ BUDGET EXCEEDED ${c.reset} — future commands will be blocked`);
  } else if (result.alertTriggered) {
    console.log(`\n  ${c.bgYellow}${c.bold} ⚠ ALERT ${c.reset} — approaching budget limit`);
  }

  footer();
}

function cmdReport() {
  const config = loadConfig();
  if (!config) {
    console.error(`\n  ${c.red}✗${c.reset} No .costguard.json found. Run ${c.cyan}costguard init${c.reset} first.\n`);
    process.exit(1);
  }

  const report = generateReport(config);
  banner();

  console.log(`  ${c.bold}Spend Report${c.reset}`);
  console.log(`  ${budgetMeter(report.status.budgetPercent)}`);
  console.log();
  console.log(`  ${c.cyan}Total spent:${c.reset}  ${c.bold}${formatUsd2(report.status.budgetUsed)}${c.reset} of ${formatUsd2(report.status.budgetMax)}`);
  console.log(`  ${c.cyan}Requests:${c.reset}     ${report.status.requestCount}`);
  console.log(`  ${c.cyan}Tokens:${c.reset}       ${report.status.totalInputTokens.toLocaleString()} in / ${report.status.totalOutputTokens.toLocaleString()} out`);
  console.log(`  ${c.cyan}Session:${c.reset}      ${report.status.sessionStarted}`);

  const modelNames = Object.keys(report.breakdown);
  if (modelNames.length > 0) {
    console.log(`\n  ${c.bold}Breakdown by Model${c.reset}\n`);
    const header = tableRow(
      ['Model', 24], ['Requests', 10, 'right'], ['Input Tok', 12, 'right'],
      ['Output Tok', 12, 'right'], ['Cost', 12, 'right']
    );
    console.log(`  ${c.bold}${header}${c.reset}`);
    console.log(`  ${'─'.repeat(74)}`);

    for (const [model, data] of Object.entries(report.breakdown)) {
      const row = tableRow(
        [model, 24], [data.requests, 10, 'right'],
        [data.inputTokens.toLocaleString(), 12, 'right'],
        [data.outputTokens.toLocaleString(), 12, 'right'],
        [formatUsd(data.costUsd), 12, 'right']
      );
      console.log(`  ${row}`);
    }
  }

  if (report.requests.length > 0) {
    console.log(`\n  ${c.bold}Recent Requests${c.reset} (last 10)\n`);
    const recent = report.requests.slice(-10);
    for (const req of recent) {
      const time = req.timestamp.replace('T', ' ').slice(0, 19);
      console.log(`  ${c.dim}${time}${c.reset}  ${padRight(req.model, 22)}  ${formatUsd(req.costUsd)}`);
    }
  }

  footer();
}

function cmdReset() {
  const config = loadConfig();
  if (!config) {
    console.error(`\n  ${c.red}✗${c.reset} No .costguard.json found.\n`);
    process.exit(1);
  }

  config.session = {
    startedAt: new Date().toISOString(),
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    requests: [],
  };
  saveConfig(config);

  console.log(`\n  ${c.green}✓${c.reset} Session data reset. Budget: ${formatUsd2(config.budget.maxUsd)}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  const { command, flags, positional, trailingArgs } = parseArgs(process.argv);

  if (flags.version || flags.v) {
    const pkg = require('../package.json');
    console.log(`costguard v${pkg.version}`);
    return;
  }

  switch (command) {
    case 'init':
      cmdInit(flags);
      break;
    case 'status':
      cmdStatus(flags);
      break;
    case 'calc':
    case 'calculate':
    case 'estimate':
      cmdCalc(flags);
      break;
    case 'compare':
    case 'cmp':
      cmdCompare(flags);
      break;
    case 'models':
    case 'pricing':
      cmdModels(flags);
      break;
    case 'wrap':
    case 'run':
      cmdWrap(flags, trailingArgs);
      break;
    case 'report':
      cmdReport(flags);
      break;
    case 'reset':
      cmdReset(flags);
      break;
    case 'help':
    default:
      cmdHelp();
      break;
  }
}

main();
