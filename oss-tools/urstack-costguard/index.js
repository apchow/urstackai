'use strict';

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Database — $/1M tokens (updated late 2026)
// ─────────────────────────────────────────────────────────────────────────────
const PRICING = {
  // ── OpenAI ──────────────────────────────────────────────────────────────
  'gpt-4o': {
    provider: 'OpenAI', input: 2.50, output: 10.00,
    context: 128000, note: 'Flagship multimodal',
  },
  'gpt-4o-mini': {
    provider: 'OpenAI', input: 0.15, output: 0.60,
    context: 128000, note: 'Cheapest OpenAI option',
  },
  'gpt-6-astra': {
    provider: 'OpenAI', input: 4.00, output: 16.00,
    context: 256000, note: 'Next-gen flagship',
  },
  'gpt-6.1-sol': {
    provider: 'OpenAI', input: 5.00, output: 20.00,
    context: 256000, note: 'Extended reasoning model',
  },
  'o1': {
    provider: 'OpenAI', input: 15.00, output: 60.00,
    context: 200000, note: 'Reasoning model',
  },
  'o1-mini': {
    provider: 'OpenAI', input: 3.00, output: 12.00,
    context: 128000, note: 'Small reasoning model',
  },
  'o3': {
    provider: 'OpenAI', input: 10.00, output: 40.00,
    context: 200000, note: 'Advanced reasoning',
  },
  'o3-mini': {
    provider: 'OpenAI', input: 1.10, output: 4.40,
    context: 200000, note: 'Efficient reasoning',
  },
  'o4-mini': {
    provider: 'OpenAI', input: 1.10, output: 4.40,
    context: 200000, note: 'Latest efficient reasoning',
  },

  // ── Anthropic ───────────────────────────────────────────────────────────
  'claude-sonnet-4': {
    provider: 'Anthropic', input: 3.00, output: 15.00,
    context: 200000, note: 'Balanced coding model',
  },
  'claude-sonnet-5': {
    provider: 'Anthropic', input: 3.00, output: 15.00,
    context: 200000, note: 'Claude Sonnet 5',
  },
  'claude-sonnet-5.5': {
    provider: 'Anthropic', input: 3.50, output: 17.50,
    context: 200000, note: 'Latest Sonnet — top-tier coding',
  },
  'claude-opus-5': {
    provider: 'Anthropic', input: 15.00, output: 75.00,
    context: 200000, note: 'Deep analysis & research',
  },
  'claude-opus-5.5': {
    provider: 'Anthropic', input: 18.00, output: 90.00,
    context: 200000, note: 'Latest Opus — premium reasoning',
  },
  'claude-haiku-4': {
    provider: 'Anthropic', input: 0.80, output: 4.00,
    context: 200000, note: 'Fast & cheap',
  },
  'claude-fable-5.1': {
    provider: 'Anthropic', input: 1.50, output: 7.50,
    context: 200000, note: 'Mid-tier creative model',
  },

  // ── Google ──────────────────────────────────────────────────────────────
  'gemini-2.5-pro': {
    provider: 'Google', input: 1.25, output: 10.00,
    context: 1000000, note: 'Long-context pro',
  },
  'gemini-2.5-flash': {
    provider: 'Google', input: 0.15, output: 0.60,
    context: 1000000, note: 'Fast & affordable',
  },
  'gemini-3.5-flash-lite': {
    provider: 'Google', input: 0.05, output: 0.20,
    context: 1000000, note: 'Ultra-cheap batch processing',
  },
  'gemini-3.8-flash': {
    provider: 'Google', input: 0.10, output: 0.40,
    context: 1000000, note: 'Latest Flash — best value',
  },
  'gemini-3.8-pro': {
    provider: 'Google', input: 2.00, output: 12.00,
    context: 2000000, note: 'Frontier-class reasoning',
  },

  // ── Open-Source / Third-Party ───────────────────────────────────────────
  'deepseek-r1': {
    provider: 'DeepSeek', input: 0.55, output: 2.19,
    context: 128000, note: 'Reasoning (open-source)',
  },
  'deepseek-v3': {
    provider: 'DeepSeek', input: 0.27, output: 1.10,
    context: 128000, note: 'General purpose (open-source)',
  },
  'mistral-large-4': {
    provider: 'Mistral', input: 2.00, output: 6.00,
    context: 128000, note: 'Flagship European model',
  },
  'mistral-medium': {
    provider: 'Mistral', input: 0.40, output: 1.20,
    context: 128000, note: 'Mid-tier Mistral',
  },
  'codestral': {
    provider: 'Mistral', input: 0.30, output: 0.90,
    context: 256000, note: 'Code-focused model',
  },
  'qwen3': {
    provider: 'Alibaba', input: 0.30, output: 0.90,
    context: 128000, note: 'Alibaba flagship',
  },
  'llama-3': {
    provider: 'Meta', input: 0.20, output: 0.60,
    context: 128000, note: 'Open weights (hosted pricing)',
  },
  'llama-4-maverick': {
    provider: 'Meta', input: 0.25, output: 0.75,
    context: 1000000, note: 'MoE open-source model',
  },
  'grok-3': {
    provider: 'xAI', input: 3.00, output: 15.00,
    context: 131072, note: 'xAI flagship model',
  },
  'grok-3-mini': {
    provider: 'xAI', input: 0.30, output: 0.50,
    context: 131072, note: 'Lightweight reasoning',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config helpers
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG_FILE = '.costguard.json';

function findConfig(startDir) {
  let dir = startDir || process.cwd();
  while (true) {
    const candidate = path.join(dir, CONFIG_FILE);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function loadConfig(dir) {
  const cfgPath = findConfig(dir);
  if (!cfgPath) return null;
  try {
    return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  } catch {
    return null;
  }
}

function saveConfig(config, dir) {
  const cfgPath = path.join(dir || process.cwd(), CONFIG_FILE);
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return cfgPath;
}

function createDefaultConfig(opts = {}) {
  return {
    version: 1,
    budget: {
      maxUsd: opts.budget || 10.00,
      alertPercent: opts.alertAt || 80,
      hardKill: opts.hardKill !== false,
    },
    session: {
      startedAt: new Date().toISOString(),
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      requests: [],
    },
    defaultModel: opts.model || 'claude-sonnet-5.5',
    createdAt: new Date().toISOString(),
    createdBy: 'urstack-costguard',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate token count from text.
 * Uses the widely-cited ~4 characters per token heuristic for English text,
 * with adjustment for code (slightly more tokens per character).
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Rough heuristic: 1 token ≈ 4 chars for English, ~3.5 for code
  const hasCode = /[{}();=<>]/.test(text);
  const charsPerToken = hasCode ? 3.5 : 4;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Estimate token count from word count.
 * Standard: ~1.33 tokens per English word, ~1.5 for technical text.
 */
function estimateTokensFromWords(wordCount) {
  return Math.ceil(wordCount * 1.33);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost calculation
// ─────────────────────────────────────────────────────────────────────────────

function getModelPricing(modelName) {
  const key = modelName.toLowerCase().trim();
  if (PRICING[key]) return { name: key, ...PRICING[key] };

  // Fuzzy match — try partial
  for (const [k, v] of Object.entries(PRICING)) {
    if (k.includes(key) || key.includes(k)) {
      return { name: k, ...v };
    }
  }
  return null;
}

function calculateCost(inputTokens, outputTokens, modelName) {
  const model = getModelPricing(modelName);
  if (!model) return null;

  const inputCost = (inputTokens / 1_000_000) * model.input;
  const outputCost = (outputTokens / 1_000_000) * model.output;
  const totalCost = inputCost + outputCost;

  return {
    model: model.name,
    provider: model.provider,
    inputTokens,
    outputTokens,
    inputCost: round(inputCost),
    outputCost: round(outputCost),
    totalCost: round(totalCost),
    pricing: { input: model.input, output: model.output },
  };
}

function round(n) {
  return Math.round(n * 1_000_000) / 1_000_000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget tracking
// ─────────────────────────────────────────────────────────────────────────────

function recordUsage(config, inputTokens, outputTokens, modelName) {
  const cost = calculateCost(inputTokens, outputTokens, modelName);
  if (!cost) return { error: `Unknown model: ${modelName}` };

  config.session.totalInputTokens += inputTokens;
  config.session.totalOutputTokens += outputTokens;
  config.session.totalCostUsd = round(config.session.totalCostUsd + cost.totalCost);
  config.session.requests.push({
    timestamp: new Date().toISOString(),
    model: cost.model,
    inputTokens,
    outputTokens,
    costUsd: cost.totalCost,
  });

  const budgetUsed = config.session.totalCostUsd;
  const budgetMax = config.budget.maxUsd;
  const pct = budgetMax > 0 ? (budgetUsed / budgetMax) * 100 : 0;

  return {
    cost,
    budgetUsed: round(budgetUsed),
    budgetMax,
    budgetPercent: round(pct),
    overBudget: pct >= 100,
    alertTriggered: pct >= config.budget.alertPercent,
  };
}

function getBudgetStatus(config) {
  const budgetUsed = config.session.totalCostUsd;
  const budgetMax = config.budget.maxUsd;
  const pct = budgetMax > 0 ? (budgetUsed / budgetMax) * 100 : 0;
  const remaining = Math.max(0, budgetMax - budgetUsed);

  return {
    budgetUsed: round(budgetUsed),
    budgetMax,
    budgetRemaining: round(remaining),
    budgetPercent: Math.min(100, round(pct)),
    overBudget: pct >= 100,
    alertTriggered: pct >= config.budget.alertPercent,
    alertPercent: config.budget.alertPercent,
    requestCount: config.session.requests.length,
    totalInputTokens: config.session.totalInputTokens,
    totalOutputTokens: config.session.totalOutputTokens,
    sessionStarted: config.session.startedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Model comparison
// ─────────────────────────────────────────────────────────────────────────────

function compareModels(inputTokens, outputTokens, filterProviders) {
  const results = [];
  for (const [name, model] of Object.entries(PRICING)) {
    if (filterProviders && filterProviders.length > 0) {
      if (!filterProviders.some(p => model.provider.toLowerCase() === p.toLowerCase())) {
        continue;
      }
    }
    const cost = calculateCost(inputTokens, outputTokens, name);
    if (cost) results.push(cost);
  }
  results.sort((a, b) => a.totalCost - b.totalCost);
  return results;
}

function listModels() {
  const models = [];
  for (const [name, m] of Object.entries(PRICING)) {
    models.push({
      name,
      provider: m.provider,
      inputPer1M: m.input,
      outputPer1M: m.output,
      context: m.context,
      note: m.note,
    });
  }
  models.sort((a, b) => a.provider.localeCompare(b.provider) || a.inputPer1M - b.inputPer1M);
  return models;
}

// ─────────────────────────────────────────────────────────────────────────────
// Report generation
// ─────────────────────────────────────────────────────────────────────────────

function generateReport(config) {
  const status = getBudgetStatus(config);
  const byModel = {};

  for (const req of config.session.requests) {
    if (!byModel[req.model]) {
      byModel[req.model] = { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    }
    byModel[req.model].requests += 1;
    byModel[req.model].inputTokens += req.inputTokens;
    byModel[req.model].outputTokens += req.outputTokens;
    byModel[req.model].costUsd = round(byModel[req.model].costUsd + req.costUsd);
  }

  return {
    status,
    breakdown: byModel,
    requests: config.session.requests,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  PRICING,
  CONFIG_FILE,
  findConfig,
  loadConfig,
  saveConfig,
  createDefaultConfig,
  estimateTokens,
  estimateTokensFromWords,
  getModelPricing,
  calculateCost,
  recordUsage,
  getBudgetStatus,
  compareModels,
  listModels,
  generateReport,
};
