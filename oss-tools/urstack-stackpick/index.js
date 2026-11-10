// ─────────────────────────────────────────────────────────────────────────────
// urstack-stackpick — AI/LLM Stack Recommender (Core Module)
// https://urstack-ai.vercel.app
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const os = require('os');
const { execSync } = require('child_process');

// ─── Model Database ──────────────────────────────────────────────────────────
// Each entry: { name, family, params, quantizations[], minRam, minVram,
//               recRam, recVram, context, useCase, runtime[], notes }
// RAM/VRAM in GB. "minRam" = minimum for Q4_K_M, "recRam" = recommended for FP16/BF16.

const MODEL_DB = [
  // ── DeepSeek R1 family ──
  {
    name: 'deepseek-r1:7b',
    family: 'DeepSeek R1',
    params: '7B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 6, minVram: 4, recRam: 16, recVram: 8,
    context: 32768, useCase: 'Reasoning, math, code',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Best small reasoning model; strong at math & logic'
  },
  {
    name: 'deepseek-r1:14b',
    family: 'DeepSeek R1',
    params: '14B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 10, minVram: 8, recRam: 32, recVram: 16,
    context: 32768, useCase: 'Reasoning, math, code, analysis',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Balanced reasoning model; great for most tasks'
  },
  {
    name: 'deepseek-r1:32b',
    family: 'DeepSeek R1',
    params: '32B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 20, minVram: 16, recRam: 64, recVram: 24,
    context: 32768, useCase: 'Advanced reasoning, research, complex code',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Excellent reasoning; Q4 fits in 24GB VRAM'
  },
  {
    name: 'deepseek-r1:70b',
    family: 'DeepSeek R1',
    params: '70B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K'],
    minRam: 40, minVram: 36, recRam: 128, recVram: 48,
    context: 32768, useCase: 'Frontier reasoning, research',
    runtime: ['vllm', 'llama.cpp'],
    notes: 'Needs high-end GPU or multi-GPU; frontier-level reasoning'
  },

  // ── Qwen 3 family ──
  {
    name: 'qwen3:8b',
    family: 'Qwen 3',
    params: '8B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 6, minVram: 4, recRam: 16, recVram: 8,
    context: 32768, useCase: 'General, multilingual, code',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Strong multilingual support; hybrid thinking mode'
  },
  {
    name: 'qwen3:32b',
    family: 'Qwen 3',
    params: '32B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 20, minVram: 16, recRam: 64, recVram: 24,
    context: 32768, useCase: 'Complex reasoning, multilingual, code',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Best Qwen for consumer GPUs at Q4; excellent at code'
  },
  {
    name: 'qwen3:72b',
    family: 'Qwen 3',
    params: '72B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K'],
    minRam: 42, minVram: 36, recRam: 128, recVram: 48,
    context: 32768, useCase: 'Frontier multilingual, research',
    runtime: ['vllm', 'llama.cpp'],
    notes: 'Top-tier multilingual; needs multi-GPU for full speed'
  },

  // ── Llama 3 family ──
  {
    name: 'llama3.3:8b',
    family: 'Llama 3.3',
    params: '8B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 6, minVram: 4, recRam: 16, recVram: 8,
    context: 131072, useCase: 'General, chat, instruction following',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Meta\'s workhorse; huge context window; very fast'
  },
  {
    name: 'llama3.3:70b',
    family: 'Llama 3.3',
    params: '70B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K'],
    minRam: 40, minVram: 36, recRam: 128, recVram: 48,
    context: 131072, useCase: 'Advanced general, code, analysis',
    runtime: ['vllm', 'llama.cpp'],
    notes: 'Near-GPT-4 level; needs high-end GPU setup'
  },

  // ── Gemma 4 family ──
  {
    name: 'gemma4:9b',
    family: 'Gemma 4',
    params: '9B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 6, minVram: 5, recRam: 16, recVram: 8,
    context: 32768, useCase: 'General, code, summarization',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Google\'s efficient open model; strong at structured output'
  },
  {
    name: 'gemma4:27b',
    family: 'Gemma 4',
    params: '27B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 18, minVram: 14, recRam: 48, recVram: 24,
    context: 32768, useCase: 'Advanced general, code, reasoning',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Excellent quality/size ratio; fits in 24GB VRAM at Q4'
  },

  // ── Mistral family ──
  {
    name: 'mistral:7b',
    family: 'Mistral',
    params: '7B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 6, minVram: 4, recRam: 16, recVram: 8,
    context: 32768, useCase: 'General, chat, instruction following',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Pioneer small model; very fast inference'
  },
  {
    name: 'mistral-nemo:12b',
    family: 'Mistral',
    params: '12B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 8, minVram: 6, recRam: 24, recVram: 12,
    context: 131072, useCase: 'General, code, long context',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Co-developed with NVIDIA; huge 128K context'
  },
  {
    name: 'mistral-small:24b',
    family: 'Mistral',
    params: '24B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 16, minVram: 12, recRam: 48, recVram: 24,
    context: 32768, useCase: 'Advanced general, code, reasoning',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Best Mistral for consumer hardware; strong all-rounder'
  },
  {
    name: 'mistral-large:123b',
    family: 'Mistral',
    params: '123B',
    quantizations: ['Q4_K_M', 'Q5_K_M'],
    minRam: 72, minVram: 64, recRam: 256, recVram: 96,
    context: 32768, useCase: 'Frontier general, enterprise',
    runtime: ['vllm'],
    notes: 'Enterprise-grade; requires multi-GPU (A100/H100)'
  },

  // ── Phi family ──
  {
    name: 'phi4:14b',
    family: 'Phi 4',
    params: '14B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 10, minVram: 8, recRam: 32, recVram: 16,
    context: 16384, useCase: 'Reasoning, math, code, STEM',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Microsoft\'s small STEM powerhouse; punches above its weight'
  },
  {
    name: 'phi4-mini:3.8b',
    family: 'Phi 4',
    params: '3.8B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 4, minVram: 3, recRam: 8, recVram: 4,
    context: 8192, useCase: 'Lightweight reasoning, edge devices',
    runtime: ['ollama', 'llama.cpp'],
    notes: 'Tiny but capable; runs on almost anything'
  },

  // ── Codestral ──
  {
    name: 'codestral:22b',
    family: 'Codestral',
    params: '22B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 14, minVram: 12, recRam: 48, recVram: 24,
    context: 32768, useCase: 'Code generation, refactoring, debugging',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Purpose-built for code; 80+ languages; fill-in-the-middle'
  },

  // ── StarCoder2 ──
  {
    name: 'starcoder2:15b',
    family: 'StarCoder 2',
    params: '15B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 10, minVram: 8, recRam: 32, recVram: 16,
    context: 16384, useCase: 'Code generation, code completion',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Trained on The Stack v2; strong code completion'
  },
  {
    name: 'starcoder2:3b',
    family: 'StarCoder 2',
    params: '3B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 4, minVram: 2, recRam: 8, recVram: 4,
    context: 16384, useCase: 'Code completion, IDE integration',
    runtime: ['ollama', 'llama.cpp'],
    notes: 'Lightweight coding assistant; great for autocomplete'
  },

  // ── Command R family ──
  {
    name: 'command-r:35b',
    family: 'Command R',
    params: '35B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 22, minVram: 16, recRam: 64, recVram: 24,
    context: 131072, useCase: 'RAG, enterprise, long context',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Cohere\'s RAG-optimized model; grounded generation'
  },

  // ── Mixtral MoE ──
  {
    name: 'mixtral:8x7b',
    family: 'Mixtral',
    params: '47B (8x7B MoE)',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K'],
    minRam: 28, minVram: 24, recRam: 64, recVram: 48,
    context: 32768, useCase: 'General, code, multilingual',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'Mixture of Experts; only 12B active per token; very efficient'
  },

  // ── Nous Hermes ──
  {
    name: 'nous-hermes2:34b',
    family: 'Nous Hermes 2',
    params: '34B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 22, minVram: 16, recRam: 64, recVram: 24,
    context: 4096, useCase: 'Instruction following, creative writing',
    runtime: ['ollama', 'llama.cpp'],
    notes: 'Fine-tuned Yi-34B; excellent instruction following'
  },

  // ── TinyLlama ──
  {
    name: 'tinyllama:1.1b',
    family: 'TinyLlama',
    params: '1.1B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 2, minVram: 1, recRam: 4, recVram: 2,
    context: 2048, useCase: 'Edge devices, mobile, testing',
    runtime: ['ollama', 'llama.cpp'],
    notes: 'Ultra-lightweight; good for prototyping & edge deployment'
  },

  // ── Granite Code ──
  {
    name: 'granite-code:20b',
    family: 'Granite Code',
    params: '20B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
    minRam: 14, minVram: 10, recRam: 40, recVram: 20,
    context: 8192, useCase: 'Enterprise code, multilingual code',
    runtime: ['ollama', 'vllm', 'llama.cpp'],
    notes: 'IBM\'s enterprise code model; 116 programming languages'
  },
  {
    name: 'granite-code:8b',
    family: 'Granite Code',
    params: '8B',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
    minRam: 6, minVram: 4, recRam: 16, recVram: 8,
    context: 8192, useCase: 'Code generation, enterprise code',
    runtime: ['ollama', 'llama.cpp'],
    notes: 'Compact IBM code model; strong at enterprise patterns'
  },
];

// ─── Quantization Info ───────────────────────────────────────────────────────

const QUANT_INFO = {
  'FP16':   { bitsPerParam: 16, ramMultiplier: 1.0,   qualityLoss: 'None',       speed: 'Slowest' },
  'Q8_0':   { bitsPerParam: 8,  ramMultiplier: 0.55,  qualityLoss: 'Negligible',  speed: 'Slow' },
  'Q6_K':   { bitsPerParam: 6,  ramMultiplier: 0.42,  qualityLoss: 'Minimal',     speed: 'Medium' },
  'Q5_K_M': { bitsPerParam: 5,  ramMultiplier: 0.37,  qualityLoss: 'Very Low',    speed: 'Medium-Fast' },
  'Q4_K_M': { bitsPerParam: 4,  ramMultiplier: 0.30,  qualityLoss: 'Low',         speed: 'Fast' },
};

// ─── Hardware Detection ──────────────────────────────────────────────────────

function detectHardware() {
  const totalRam = Math.round(os.totalmem() / (1024 ** 3) * 10) / 10;
  const freeRam  = Math.round(os.freemem() / (1024 ** 3) * 10) / 10;
  const cpus     = os.cpus();
  const platform = os.platform();
  const arch     = os.arch();

  const hw = {
    os: platform,
    osVersion: os.release(),
    arch,
    cpu: cpus.length > 0 ? cpus[0].model.trim() : 'Unknown',
    cores: cpus.length,
    totalRam,
    freeRam,
    gpu: null,
    vram: null,
  };

  // Attempt GPU detection
  try {
    if (platform === 'win32') {
      // NVIDIA
      try {
        const nvOut = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe','pipe','pipe'] });
        const lines = nvOut.trim().split('\n');
        if (lines.length > 0 && lines[0].includes(',')) {
          const parts = lines[0].split(',').map(s => s.trim());
          hw.gpu = parts[0];
          hw.vram = Math.round(parseInt(parts[1], 10) / 1024 * 10) / 10;
        }
      } catch (_) { /* no nvidia */ }

      // AMD via PowerShell if no NVIDIA
      if (!hw.gpu) {
        try {
          const psOut = execSync('powershell -Command "Get-CimInstance Win32_VideoController | Select-Object -First 1 -ExpandProperty Name"', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe','pipe','pipe'] });
          const gpuName = psOut.trim();
          if (gpuName && !gpuName.toLowerCase().includes('basic') && !gpuName.toLowerCase().includes('microsoft')) {
            hw.gpu = gpuName;
            // Try to get VRAM
            try {
              const vramOut = execSync('powershell -Command "(Get-CimInstance Win32_VideoController | Select-Object -First 1).AdapterRAM / 1GB"', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe','pipe','pipe'] });
              const vramVal = parseFloat(vramOut.trim());
              if (vramVal > 0) hw.vram = Math.round(vramVal * 10) / 10;
            } catch (_) {}
          }
        } catch (_) {}
      }
    } else if (platform === 'linux') {
      // NVIDIA
      try {
        const nvOut = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe','pipe','pipe'] });
        const lines = nvOut.trim().split('\n');
        if (lines.length > 0 && lines[0].includes(',')) {
          const parts = lines[0].split(',').map(s => s.trim());
          hw.gpu = parts[0];
          hw.vram = Math.round(parseInt(parts[1], 10) / 1024 * 10) / 10;
        }
      } catch (_) { /* no nvidia */ }

      // AMD ROCm
      if (!hw.gpu) {
        try {
          const rocmOut = execSync('rocm-smi --showproductname', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe','pipe','pipe'] });
          const match = rocmOut.match(/Card series:\s*(.+)/i);
          if (match) hw.gpu = match[1].trim();
        } catch (_) {}
      }
    } else if (platform === 'darwin') {
      // macOS — Apple Silicon unified memory
      try {
        const spOut = execSync('system_profiler SPDisplaysDataType', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe','pipe','pipe'] });
        const chipMatch = spOut.match(/Chipset Model:\s*(.+)/i);
        if (chipMatch) {
          hw.gpu = chipMatch[1].trim();
          // Apple Silicon shares RAM as VRAM
          if (hw.gpu.toLowerCase().includes('apple')) {
            hw.vram = totalRam; // unified memory
            hw.unifiedMemory = true;
          }
        }
      } catch (_) {}
    }
  } catch (_) {
    // GPU detection failed entirely, continue without it
  }

  return hw;
}

// ─── Recommendation Engine ───────────────────────────────────────────────────

/**
 * Estimate which quantization levels fit the given memory constraints.
 * Returns array of { quant, estimatedRam, fits, performanceTier }
 */
function evaluateQuantizations(model, availableRam, availableVram) {
  const results = [];
  // Parse base param count
  const paramMatch = model.params.match(/([\d.]+)B/);
  if (!paramMatch) return results;
  const baseParams = parseFloat(paramMatch[1]);

  for (const quant of model.quantizations) {
    const qi = QUANT_INFO[quant];
    if (!qi) continue;

    // Estimate memory: params * bits / 8 + overhead (~1.2x for KV cache, runtime)
    const rawGB = (baseParams * qi.bitsPerParam) / 8;
    const estimatedRam = Math.round(rawGB * 1.2 * 10) / 10;

    const fitsRam  = estimatedRam <= availableRam;
    const fitsVram = availableVram != null ? estimatedRam <= availableVram : false;

    let performanceTier;
    if (fitsVram) {
      const headroom = availableVram / estimatedRam;
      if (headroom >= 2.0) performanceTier = 'fast';
      else if (headroom >= 1.3) performanceTier = 'medium';
      else performanceTier = 'slow';
    } else if (fitsRam) {
      performanceTier = 'cpu-only';
    } else {
      performanceTier = 'insufficient';
    }

    results.push({
      quant,
      estimatedRam,
      fitsRam,
      fitsVram,
      performanceTier,
      qualityLoss: qi.qualityLoss,
    });
  }

  return results;
}

/**
 * Recommend models for given hardware specs.
 * @param {object} opts — { ram: number, vram: number|null }
 * @returns {Array} sorted recommendations
 */
function recommend(opts) {
  const { ram, vram } = opts;
  const recommendations = [];

  for (const model of MODEL_DB) {
    const quantEvals = evaluateQuantizations(model, ram, vram);
    const runnableQuants = quantEvals.filter(q => q.fitsRam || q.fitsVram);
    if (runnableQuants.length === 0) continue;

    // Pick best quant: prefer highest quality that fits in VRAM, else highest that fits RAM
    const vramFit = runnableQuants.filter(q => q.fitsVram);
    const best = vramFit.length > 0
      ? vramFit[0]   // first = highest quality (FP16 listed first in quant arrays)
      : runnableQuants[0];

    // Score: prefer GPU-runnable, then higher params, then better quant
    const paramMatch = model.params.match(/([\d.]+)B/);
    const paramVal = paramMatch ? parseFloat(paramMatch[1]) : 0;

    let score = 0;
    if (best.fitsVram) score += 100;
    if (best.performanceTier === 'fast') score += 50;
    else if (best.performanceTier === 'medium') score += 30;
    else if (best.performanceTier === 'slow') score += 10;
    score += Math.min(paramVal, 40); // reward bigger models, cap at 40

    recommendations.push({
      model: model.name,
      family: model.family,
      params: model.params,
      bestQuant: best.quant,
      estimatedMemory: best.estimatedRam + ' GB',
      tier: best.performanceTier,
      qualityLoss: best.qualityLoss,
      useCase: model.useCase,
      runtime: model.runtime,
      context: model.context,
      notes: model.notes,
      allQuants: quantEvals,
      score,
    });
  }

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations;
}

/**
 * Get all models in the database.
 */
function getAllModels() {
  return MODEL_DB.map(m => ({
    name: m.name,
    family: m.family,
    params: m.params,
    quantizations: m.quantizations,
    minRam: m.minRam + ' GB',
    minVram: m.minVram + ' GB',
    recRam: m.recRam + ' GB',
    recVram: m.recVram + ' GB',
    context: m.context,
    useCase: m.useCase,
    runtime: m.runtime.join(', '),
    notes: m.notes,
  }));
}

/**
 * Compare specific models side by side.
 * @param {string[]} names — model names or partial matches
 */
function compareModels(names) {
  const results = [];
  for (const search of names) {
    const needle = search.toLowerCase().replace(/[_\s]/g, '-');
    const found = MODEL_DB.filter(m =>
      m.name.toLowerCase().includes(needle) ||
      m.family.toLowerCase().replace(/\s/g, '-').includes(needle)
    );
    for (const m of found) {
      if (!results.find(r => r.name === m.name)) {
        results.push(m);
      }
    }
  }
  return results;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  detectHardware,
  recommend,
  getAllModels,
  compareModels,
  evaluateQuantizations,
  MODEL_DB,
  QUANT_INFO,
};
