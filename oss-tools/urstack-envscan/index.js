// urstack-envscan — Core scanner module
// https://urstack-ai.vercel.app
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');

// ─── Severity levels ───────────────────────────────────────────────────────────
const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// ─── Secret detection patterns (30+ rules) ─────────────────────────────────────
const SECRET_PATTERNS = [
  // ── Cloud Provider Keys ──
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    regex: /(?:^|[^A-Za-z0-9/+=])(AKIA[0-9A-Z]{16})(?:[^A-Za-z0-9/+=]|$)/,
    severity: SEVERITY.CRITICAL,
    message: 'AWS Access Key ID detected. Rotate immediately and use IAM roles instead.',
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    regex: /(?:aws_secret_access_key|aws_secret_key|secret_access_key)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i,
    severity: SEVERITY.CRITICAL,
    message: 'AWS Secret Access Key detected. Rotate immediately.',
  },
  {
    id: 'aws-mws-key',
    name: 'AWS MWS Key',
    regex: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    severity: SEVERITY.CRITICAL,
    message: 'AWS MWS key detected.',
  },
  {
    id: 'gcp-service-account',
    name: 'GCP Service Account JSON',
    regex: /"type"\s*:\s*"service_account"/,
    severity: SEVERITY.CRITICAL,
    message: 'GCP service account JSON key detected. Use Workload Identity Federation instead.',
  },
  {
    id: 'gcp-api-key',
    name: 'GCP API Key',
    regex: /AIza[0-9A-Za-z_-]{35}/,
    severity: SEVERITY.HIGH,
    message: 'Google Cloud API key detected. Restrict key usage in GCP Console.',
  },
  {
    id: 'azure-storage-key',
    name: 'Azure Storage Account Key',
    regex: /(?:AccountKey|azure[_-]?storage[_-]?key)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{88})['"]?/i,
    severity: SEVERITY.CRITICAL,
    message: 'Azure storage account key detected. Use Managed Identity or SAS tokens.',
  },
  {
    id: 'azure-connection-string',
    name: 'Azure Connection String',
    regex: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[A-Za-z0-9/+=]{88}/,
    severity: SEVERITY.CRITICAL,
    message: 'Azure storage connection string with key detected.',
  },

  // ── AI/ML API Keys ──
  {
    id: 'openai-api-key',
    name: 'OpenAI API Key',
    regex: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/,
    severity: SEVERITY.CRITICAL,
    message: 'OpenAI API key detected. Rotate key and use environment variables.',
  },
  {
    id: 'openai-api-key-v2',
    name: 'OpenAI API Key (new format)',
    regex: /sk-proj-[A-Za-z0-9_-]{80,}/,
    severity: SEVERITY.CRITICAL,
    message: 'OpenAI project API key detected. Rotate immediately.',
  },
  {
    id: 'anthropic-api-key',
    name: 'Anthropic API Key',
    regex: /sk-ant-api03-[A-Za-z0-9_-]{93}/,
    severity: SEVERITY.CRITICAL,
    message: 'Anthropic API key detected. Rotate immediately.',
  },
  {
    id: 'huggingface-token',
    name: 'Hugging Face Access Token',
    regex: /hf_[A-Za-z0-9]{34,}/,
    severity: SEVERITY.HIGH,
    message: 'Hugging Face access token detected.',
  },

  // ── Payment Processor Keys ──
  {
    id: 'stripe-secret-key',
    name: 'Stripe Secret Key',
    regex: /sk_live_[0-9a-zA-Z]{24,}/,
    severity: SEVERITY.CRITICAL,
    message: 'Stripe live secret key detected! Rotate immediately in Stripe Dashboard.',
  },
  {
    id: 'stripe-publishable-key',
    name: 'Stripe Publishable Key (Live)',
    regex: /pk_live_[0-9a-zA-Z]{24,}/,
    severity: SEVERITY.MEDIUM,
    message: 'Stripe live publishable key detected. Restrict by domain in Stripe Dashboard.',
  },
  {
    id: 'stripe-restricted-key',
    name: 'Stripe Restricted Key',
    regex: /rk_live_[0-9a-zA-Z]{24,}/,
    severity: SEVERITY.HIGH,
    message: 'Stripe restricted live key detected.',
  },
  {
    id: 'payu-merchant-key',
    name: 'PayU Merchant Key',
    regex: /(?:payu[_-]?merchant[_-]?key|PAYU_KEY)\s*[=:]\s*['"]?([a-zA-Z0-9]{6,})['"]?/i,
    severity: SEVERITY.HIGH,
    message: 'PayU merchant key detected.',
  },
  {
    id: 'razorpay-key',
    name: 'Razorpay API Key',
    regex: /rzp_(?:live|test)_[A-Za-z0-9]{14,}/,
    severity: SEVERITY.HIGH,
    message: 'Razorpay API key detected.',
  },

  // ── SCM Tokens ──
  {
    id: 'github-pat',
    name: 'GitHub Personal Access Token',
    regex: /ghp_[A-Za-z0-9]{36}/,
    severity: SEVERITY.CRITICAL,
    message: 'GitHub personal access token detected. Revoke and regenerate.',
  },
  {
    id: 'github-fine-grained-pat',
    name: 'GitHub Fine-Grained PAT',
    regex: /github_pat_[A-Za-z0-9_]{82}/,
    severity: SEVERITY.CRITICAL,
    message: 'GitHub fine-grained personal access token detected.',
  },
  {
    id: 'github-oauth',
    name: 'GitHub OAuth Token',
    regex: /gho_[A-Za-z0-9]{36}/,
    severity: SEVERITY.CRITICAL,
    message: 'GitHub OAuth access token detected.',
  },
  {
    id: 'github-app-token',
    name: 'GitHub App Token',
    regex: /(?:ghu|ghs)_[A-Za-z0-9]{36}/,
    severity: SEVERITY.CRITICAL,
    message: 'GitHub App token detected.',
  },
  {
    id: 'gitlab-pat',
    name: 'GitLab Personal Access Token',
    regex: /glpat-[A-Za-z0-9_-]{20,}/,
    severity: SEVERITY.CRITICAL,
    message: 'GitLab personal access token detected.',
  },
  {
    id: 'bitbucket-app-password',
    name: 'Bitbucket App Password',
    regex: /(?:bitbucket[_-]?app[_-]?password|BITBUCKET_PASSWORD)\s*[=:]\s*['"]?([A-Za-z0-9]{20,})['"]?/i,
    severity: SEVERITY.HIGH,
    message: 'Bitbucket app password detected.',
  },

  // ── Communication / Webhook ──
  {
    id: 'slack-webhook',
    name: 'Slack Webhook URL',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]{8,}\/B[A-Za-z0-9]{8,}\/[A-Za-z0-9]{24,}/,
    severity: SEVERITY.HIGH,
    message: 'Slack webhook URL detected. Regenerate the webhook.',
  },
  {
    id: 'slack-bot-token',
    name: 'Slack Bot Token',
    regex: /xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24,}/,
    severity: SEVERITY.CRITICAL,
    message: 'Slack bot token detected.',
  },
  {
    id: 'slack-user-token',
    name: 'Slack User Token',
    regex: /xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}/,
    severity: SEVERITY.CRITICAL,
    message: 'Slack user token detected.',
  },
  {
    id: 'discord-webhook',
    name: 'Discord Webhook URL',
    regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/,
    severity: SEVERITY.HIGH,
    message: 'Discord webhook URL detected.',
  },
  {
    id: 'discord-bot-token',
    name: 'Discord Bot Token',
    regex: /(?:discord[_-]?(?:bot[_-]?)?token)\s*[=:]\s*['"]?([A-Za-z0-9._-]{50,})['"]?/i,
    severity: SEVERITY.CRITICAL,
    message: 'Discord bot token detected.',
  },
  {
    id: 'telegram-bot-token',
    name: 'Telegram Bot Token',
    regex: /[0-9]{8,10}:[A-Za-z0-9_-]{35}/,
    severity: SEVERITY.HIGH,
    message: 'Telegram bot token detected. Revoke via @BotFather.',
  },

  // ── Email / Messaging Services ──
  {
    id: 'resend-api-key',
    name: 'Resend API Key',
    regex: /re_[A-Za-z0-9]{20,}/,
    severity: SEVERITY.HIGH,
    message: 'Resend API key detected.',
  },
  {
    id: 'sendgrid-api-key',
    name: 'SendGrid API Key',
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/,
    severity: SEVERITY.HIGH,
    message: 'SendGrid API key detected.',
  },
  {
    id: 'mailgun-api-key',
    name: 'Mailgun API Key',
    regex: /key-[0-9a-zA-Z]{32}/,
    severity: SEVERITY.HIGH,
    message: 'Mailgun API key detected.',
  },
  {
    id: 'twilio-api-key',
    name: 'Twilio API Key',
    regex: /SK[0-9a-fA-F]{32}/,
    severity: SEVERITY.HIGH,
    message: 'Twilio API key detected.',
  },

  // ── Database Connection Strings ──
  {
    id: 'postgres-connection',
    name: 'PostgreSQL Connection String',
    regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^/]+/,
    severity: SEVERITY.CRITICAL,
    message: 'PostgreSQL connection string with credentials detected.',
  },
  {
    id: 'mysql-connection',
    name: 'MySQL Connection String',
    regex: /mysql:\/\/[^:]+:[^@]+@[^/]+/,
    severity: SEVERITY.CRITICAL,
    message: 'MySQL connection string with credentials detected.',
  },
  {
    id: 'mongodb-connection',
    name: 'MongoDB Connection String',
    regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^/]+/,
    severity: SEVERITY.CRITICAL,
    message: 'MongoDB connection string with credentials detected.',
  },
  {
    id: 'redis-connection',
    name: 'Redis Connection String',
    regex: /redis:\/\/[^:]*:[^@]+@[^/]+/,
    severity: SEVERITY.HIGH,
    message: 'Redis connection string with credentials detected.',
  },

  // ── Auth Tokens ──
  {
    id: 'jwt-token',
    name: 'JSON Web Token',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    severity: SEVERITY.MEDIUM,
    message: 'JWT token detected. Ensure it is not a long-lived production token.',
  },
  {
    id: 'bearer-token',
    name: 'Bearer Token in Code',
    regex: /['"]Bearer\s+[A-Za-z0-9_.-]{20,}['"]/,
    severity: SEVERITY.HIGH,
    message: 'Hardcoded Bearer token detected.',
  },

  // ── Private Keys ──
  {
    id: 'private-key-rsa',
    name: 'RSA Private Key',
    regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
    severity: SEVERITY.CRITICAL,
    message: 'RSA private key detected. Never commit private keys to repos.',
  },
  {
    id: 'private-key-ec',
    name: 'EC Private Key',
    regex: /-----BEGIN EC PRIVATE KEY-----/,
    severity: SEVERITY.CRITICAL,
    message: 'EC private key detected.',
  },
  {
    id: 'private-key-openssh',
    name: 'OpenSSH Private Key',
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    severity: SEVERITY.CRITICAL,
    message: 'OpenSSH private key detected.',
  },
  {
    id: 'pgp-private-key',
    name: 'PGP Private Key',
    regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/,
    severity: SEVERITY.CRITICAL,
    message: 'PGP private key block detected.',
  },

  // ── Other Services ──
  {
    id: 'firebase-config',
    name: 'Firebase Config with API Key',
    regex: /(?:firebase|FIREBASE).*(?:apiKey|api_key)\s*[=:]\s*['"]?AIza[A-Za-z0-9_-]{35}['"]?/,
    severity: SEVERITY.MEDIUM,
    message: 'Firebase config with API key detected. Apply security rules.',
  },
  {
    id: 'npm-token',
    name: 'NPM Access Token',
    regex: /(?:\/\/registry\.npmjs\.org\/:_authToken=|npm_[A-Za-z0-9]{36})/,
    severity: SEVERITY.CRITICAL,
    message: 'NPM access token detected. Revoke and regenerate.',
  },
  {
    id: 'pypi-token',
    name: 'PyPI API Token',
    regex: /pypi-[A-Za-z0-9_-]{100,}/,
    severity: SEVERITY.CRITICAL,
    message: 'PyPI API token detected.',
  },
  {
    id: 'docker-hub-token',
    name: 'Docker Hub Token',
    regex: /dckr_pat_[A-Za-z0-9_-]{20,}/,
    severity: SEVERITY.HIGH,
    message: 'Docker Hub personal access token detected.',
  },
  {
    id: 'vercel-token',
    name: 'Vercel Token',
    regex: /(?:vercel[_-]?token|VERCEL_TOKEN)\s*[=:]\s*['"]?([A-Za-z0-9]{24,})['"]?/i,
    severity: SEVERITY.HIGH,
    message: 'Vercel deployment token detected.',
  },
  {
    id: 'supabase-key',
    name: 'Supabase Service Role Key',
    regex: /(?:supabase[_-]?service[_-]?role[_-]?key|SUPABASE_SERVICE_ROLE_KEY)\s*[=:]\s*['"]?(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)['"]?/i,
    severity: SEVERITY.CRITICAL,
    message: 'Supabase service role key (full DB access) detected.',
  },
  {
    id: 'shopify-access-token',
    name: 'Shopify Access Token',
    regex: /shpat_[a-fA-F0-9]{32}/,
    severity: SEVERITY.HIGH,
    message: 'Shopify admin access token detected.',
  },
  {
    id: 'shopify-shared-secret',
    name: 'Shopify Shared Secret',
    regex: /shpss_[a-fA-F0-9]{32}/,
    severity: SEVERITY.HIGH,
    message: 'Shopify shared secret detected.',
  },

  // ── Generic Patterns ──
  {
    id: 'generic-api-key',
    name: 'Generic API Key Assignment',
    regex: /(?:api[_-]?key|apikey|api[_-]?secret|access[_-]?token|auth[_-]?token|secret[_-]?key)\s*[=:]\s*['"]([A-Za-z0-9_\-/.+=]{16,})['"](?!\s*(?:process\.env|os\.environ|System\.getenv|\$\{))/i,
    severity: SEVERITY.HIGH,
    message: 'Hardcoded API key or secret detected. Use environment variables.',
  },
  {
    id: 'generic-password',
    name: 'Hardcoded Password',
    regex: /(?:password|passwd|pwd|db_pass|db_password|database_password)\s*[=:]\s*['"]([^'"]{8,})['"](?!\s*(?:process\.env|os\.environ))/i,
    severity: SEVERITY.HIGH,
    message: 'Hardcoded password detected. Use a secrets manager.',
  },
];

// ─── Sensitive file patterns ────────────────────────────────────────────────────
const SENSITIVE_FILES = [
  {
    pattern: /^\.env$/,
    severity: SEVERITY.CRITICAL,
    message: '.env file found in repository. Must be gitignored.',
  },
  {
    pattern: /^\.env\.(local|production|staging|development|prod|dev)$/,
    severity: SEVERITY.CRITICAL,
    message: 'Environment file found. Should not be committed.',
  },
  {
    pattern: /^\.env\..*$/,
    severity: SEVERITY.HIGH,
    message: 'Environment-variant file detected.',
  },
  {
    pattern: /^id_rsa$/,
    severity: SEVERITY.CRITICAL,
    message: 'RSA private key file (id_rsa) found in repository.',
  },
  {
    pattern: /^id_ed25519$/,
    severity: SEVERITY.CRITICAL,
    message: 'Ed25519 private key file found in repository.',
  },
  {
    pattern: /^id_ecdsa$/,
    severity: SEVERITY.CRITICAL,
    message: 'ECDSA private key file found in repository.',
  },
  {
    pattern: /\.pem$/,
    severity: SEVERITY.HIGH,
    message: 'PEM certificate/key file found. Verify it does not contain private keys.',
  },
  {
    pattern: /\.key$/,
    severity: SEVERITY.HIGH,
    message: 'Key file found in repository.',
  },
  {
    pattern: /\.p12$/,
    severity: SEVERITY.HIGH,
    message: 'PKCS12 keystore file found.',
  },
  {
    pattern: /\.pfx$/,
    severity: SEVERITY.HIGH,
    message: 'PFX certificate file found.',
  },
  {
    pattern: /^credentials\.json$/,
    severity: SEVERITY.CRITICAL,
    message: 'Credentials JSON file found. Likely contains service account keys.',
  },
  {
    pattern: /^service[_-]?account.*\.json$/i,
    severity: SEVERITY.CRITICAL,
    message: 'Service account key file found.',
  },
  {
    pattern: /^\.npmrc$/,
    severity: SEVERITY.HIGH,
    message: '.npmrc may contain auth tokens.',
  },
  {
    pattern: /^\.pypirc$/,
    severity: SEVERITY.HIGH,
    message: '.pypirc may contain PyPI credentials.',
  },
  {
    pattern: /^\.docker\/config\.json$/,
    severity: SEVERITY.HIGH,
    message: 'Docker config may contain registry credentials.',
  },
  {
    pattern: /^\.htpasswd$/,
    severity: SEVERITY.HIGH,
    message: 'htpasswd file with password hashes found.',
  },
  {
    pattern: /^wp-config\.php$/,
    severity: SEVERITY.HIGH,
    message: 'WordPress config with database credentials found.',
  },
];

// ─── Directories to skip ────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'vendor', 'dist', 'build',
  '__pycache__', '.tox', '.pytest_cache', '.mypy_cache', '.next',
  '.nuxt', 'coverage', '.nyc_output', '.terraform', 'bower_components',
]);

// ─── File extensions to scan ────────────────────────────────────────────────────
const SCAN_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.java', '.php',
  '.cs', '.rs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh',
  '.yml', '.yaml', '.json', '.xml', '.toml', '.ini', '.cfg', '.conf',
  '.env', '.properties', '.tf', '.hcl', '.dockerfile', '.sql',
  '.md', '.txt', '.html', '.htm', '.vue', '.svelte', '.astro',
  '.r', '.R', '.jl', '.dart', '.gradle', '.cmake', '.make',
]);

// Files to always scan regardless of extension
const ALWAYS_SCAN_NAMES = new Set([
  '.env', '.env.local', '.env.production', '.env.staging', '.env.development',
  '.env.prod', '.env.dev', '.env.test', 'Dockerfile', 'docker-compose.yml',
  'docker-compose.yaml', 'Makefile', '.npmrc', '.pypirc', '.htpasswd',
  'Vagrantfile', 'Procfile', '.gitignore', 'wp-config.php',
]);

// Max file size to scan (1 MB)
const MAX_FILE_SIZE = 1 * 1024 * 1024;

// ─── Shannon entropy ────────────────────────────────────────────────────────────
function shannonEntropy(str) {
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const len = str.length;
  let entropy = 0;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ─── Check if file is binary ────────────────────────────────────────────────────
function isBinaryFile(filePath) {
  try {
    const buffer = Buffer.alloc(512);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}

// ─── Walk directory recursively ─────────────────────────────────────────────────
function walkDir(dir, fileList = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return fileList;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (entry.isFile()) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

// ─── Should scan this file? ─────────────────────────────────────────────────────
function shouldScan(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Always scan known important files
  if (ALWAYS_SCAN_NAMES.has(basename)) return true;
  if (basename.startsWith('.env')) return true;

  // Check extension
  if (ext && SCAN_EXTENSIONS.has(ext)) return true;

  // Files without extensions (scripts)
  if (!ext && basename !== '') return false;

  return false;
}

// ─── Scan a single file for secrets ─────────────────────────────────────────────
function scanFile(filePath, rootDir) {
  const findings = [];
  const relPath = path.relative(rootDir, filePath);
  const basename = path.basename(filePath);

  // Check sensitive file patterns
  for (const sf of SENSITIVE_FILES) {
    if (sf.pattern.test(basename)) {
      findings.push({
        ruleId: 'sensitive-file',
        severity: sf.severity,
        file: relPath,
        message: sf.message,
        line: null,
        match: null,
      });
    }
  }

  // Skip binary files and files that are too large
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) return findings;
    if (stat.size === 0) return findings;
  } catch {
    return findings;
  }

  if (isBinaryFile(filePath)) return findings;
  if (!shouldScan(filePath)) return findings;

  // Read file content
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return findings;
  }

  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Skip comment-only lines that are documentation about patterns
    // (avoids flagging README examples, etc.)
    const trimmed = line.trim();
    if (trimmed.startsWith('//') && trimmed.includes('regex:')) continue;
    if (trimmed.startsWith('#') && trimmed.includes('example:')) continue;

    for (const pattern of SECRET_PATTERNS) {
      const match = line.match(pattern.regex);
      if (match) {
        // Verify it's not a placeholder / example
        const matchedStr = match[1] || match[0];
        if (isPlaceholder(matchedStr)) continue;

        // For generic patterns, check entropy
        if (pattern.id.startsWith('generic-') && match[1]) {
          const entropy = shannonEntropy(match[1]);
          if (entropy < 3.0) continue; // Low entropy = likely a placeholder
        }

        findings.push({
          ruleId: pattern.id,
          severity: pattern.severity,
          file: relPath,
          line: lineNum + 1,
          message: pattern.message,
          match: matchedStr,
        });
      }
    }
  }

  return findings;
}

// ─── Check for placeholder/example values ───────────────────────────────────────
function isPlaceholder(value) {
  if (!value || typeof value !== 'string') return false;
  const lower = value.toLowerCase();
  const placeholders = [
    'your_', 'your-', 'example', 'placeholder', 'xxx', 'test',
    'dummy', 'sample', 'fake', 'change_me', 'changeme', 'replace',
    'insert_', 'insert-', 'todo', 'fixme', 'fill_in', '<your',
    'put_your', 'enter_your', 'my_secret', 'my_key', 'secret_here',
    'key_here', 'token_here', 'password_here', 'xxxxxxxxx', '000000',
    'aaaaaa', 'abcdef', '123456', 'none', 'null', 'undefined',
    'process.env', 'os.environ', 'env(', '${',
  ];
  return placeholders.some((p) => lower.includes(p));
}

// ─── Main directory scanner ─────────────────────────────────────────────────────
async function scanDirectory(dirPath) {
  const findings = [];

  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  const files = walkDir(dirPath);

  for (const file of files) {
    const fileFindings = scanFile(file, dirPath);
    findings.push(...fileFindings);
  }

  return findings;
}

// ─── Git history scanner ────────────────────────────────────────────────────────
async function scanGitHistory(dirPath) {
  const findings = [];

  try {
    // Check if it's a git repo
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: dirPath,
      stdio: 'pipe',
    });
  } catch {
    findings.push({
      ruleId: 'git-not-found',
      severity: SEVERITY.LOW,
      file: dirPath,
      line: null,
      message: 'Not a git repository. Skipping git history scan.',
      match: null,
    });
    return findings;
  }

  try {
    // Get list of files ever tracked
    const trackedRaw = execSync('git log --all --diff-filter=A --name-only --pretty=format:', {
      cwd: dirPath,
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    }).toString();

    const trackedFiles = [...new Set(trackedRaw.split('\n').filter(Boolean))];

    // Check if sensitive files were ever committed
    for (const file of trackedFiles) {
      const basename = path.basename(file);
      for (const sf of SENSITIVE_FILES) {
        if (sf.pattern.test(basename)) {
          findings.push({
            ruleId: 'git-history-sensitive-file',
            severity: sf.severity,
            file: `(git history) ${file}`,
            line: null,
            message: `${sf.message} File was previously committed to git history.`,
            match: null,
          });
        }
      }
    }

    // Scan recent diffs for secrets (last 50 commits for performance)
    let diffOutput;
    try {
      diffOutput = execSync('git log -50 --all -p --no-color', {
        cwd: dirPath,
        stdio: 'pipe',
        maxBuffer: 50 * 1024 * 1024,
      }).toString();
    } catch {
      diffOutput = '';
    }

    if (diffOutput) {
      const diffLines = diffOutput.split('\n');
      let currentFile = '(git diff)';
      let commitHash = '';

      for (let i = 0; i < diffLines.length; i++) {
        const line = diffLines[i];

        // Track current file
        const fileMatch = line.match(/^diff --git a\/(.+) b\//);
        if (fileMatch) {
          currentFile = fileMatch[1];
          continue;
        }

        const commitMatch = line.match(/^commit ([a-f0-9]{40})/);
        if (commitMatch) {
          commitHash = commitMatch[1].substring(0, 8);
          continue;
        }

        // Only scan added lines
        if (!line.startsWith('+') || line.startsWith('+++')) continue;

        for (const pattern of SECRET_PATTERNS) {
          const match = line.match(pattern.regex);
          if (match) {
            const matchedStr = match[1] || match[0];
            if (isPlaceholder(matchedStr)) continue;

            findings.push({
              ruleId: `git-${pattern.id}`,
              severity: pattern.severity,
              file: `(commit ${commitHash}) ${currentFile}`,
              line: null,
              message: `[Git History] ${pattern.message}`,
              match: matchedStr,
            });
          }
        }
      }
    }

    // Check if .env files are currently tracked
    try {
      const currentTracked = execSync('git ls-files', {
        cwd: dirPath,
        stdio: 'pipe',
      }).toString();

      const trackedNow = currentTracked.split('\n').filter(Boolean);
      for (const file of trackedNow) {
        const basename = path.basename(file);
        if (basename.startsWith('.env')) {
          findings.push({
            ruleId: 'env-tracked',
            severity: SEVERITY.CRITICAL,
            file: file,
            line: null,
            message: `${basename} is currently tracked by git! Run: git rm --cached ${file}`,
            match: null,
          });
        }
      }
    } catch {
      // Ignore
    }
  } catch (err) {
    findings.push({
      ruleId: 'git-scan-error',
      severity: SEVERITY.LOW,
      file: dirPath,
      line: null,
      message: `Error scanning git history: ${err.message}`,
      match: null,
    });
  }

  // Deduplicate git findings by ruleId + file
  const seen = new Set();
  return findings.filter((f) => {
    const key = `${f.ruleId}::${f.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── IDE extension audit ────────────────────────────────────────────────────────
const KNOWN_RISKY_EXTENSIONS = [
  {
    id: 'ms-ceintl',
    pattern: /^ms-ceintl\./,
    riskVersions: [],
    severity: SEVERITY.LOW,
    message: 'Microsoft localization extension — generally safe.',
  },
  // Known supply-chain incidents
  {
    id: 'cursor-backdoor',
    pattern: /^anysphere\.cursor/i,
    riskVersions: ['2.1.313'],
    severity: SEVERITY.CRITICAL,
    message: 'Cursor extension version flagged in supply-chain advisory. Verify integrity. See: https://urstack-ai.vercel.app',
  },
  {
    id: 'event-stream',
    pattern: /event[_-]?stream/i,
    riskVersions: ['3.3.6'],
    severity: SEVERITY.CRITICAL,
    message: 'Extension depends on compromised event-stream@3.3.6 (CVE-2018-16492).',
  },
  {
    id: 'coa-compromise',
    pattern: /^coa\b/i,
    riskVersions: ['2.0.3', '2.0.4', '2.1.1', '2.1.3', '3.0.1', '3.1.3'],
    severity: SEVERITY.CRITICAL,
    message: 'Extension depends on compromised coa package.',
  },
];

async function auditIDEExtensions() {
  const findings = [];
  const homeDir = os.homedir();

  const extensionDirs = [
    path.join(homeDir, '.cursor', 'extensions'),
    path.join(homeDir, '.vscode', 'extensions'),
    path.join(homeDir, '.vscode-insiders', 'extensions'),
    // Linux/WSL paths
    path.join(homeDir, '.config', 'Code', 'User', 'extensions'),
  ];

  for (const extDir of extensionDirs) {
    if (!fs.existsSync(extDir)) continue;

    const ideName = extDir.includes('.cursor') ? 'Cursor' : 'VS Code';
    let extensions;
    try {
      extensions = fs.readdirSync(extDir, { withFileTypes: true });
    } catch {
      continue;
    }

    let totalExtensions = 0;
    let riskyExtensions = 0;

    for (const ext of extensions) {
      if (!ext.isDirectory()) continue;
      totalExtensions++;

      const extName = ext.name.toLowerCase();
      const extFullPath = path.join(extDir, ext.name);

      // Extract version from directory name (format: publisher.name-version)
      const versionMatch = ext.name.match(/-(\d+\.\d+\.\d+.*)$/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      // Check against known risky extensions
      for (const risky of KNOWN_RISKY_EXTENSIONS) {
        if (risky.pattern.test(extName)) {
          if (risky.riskVersions.length === 0 || risky.riskVersions.includes(version)) {
            if (risky.severity !== SEVERITY.LOW) {
              riskyExtensions++;
            }
            findings.push({
              ruleId: `ide-${risky.id}`,
              severity: risky.severity,
              file: `[${ideName}] ${ext.name}`,
              line: null,
              message: risky.message,
              match: null,
            });
          }
        }
      }

      // Check for extensions requesting dangerous permissions
      const packageJsonPath = path.join(extFullPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkgContent = fs.readFileSync(packageJsonPath, 'utf8');
          const pkg = JSON.parse(pkgContent);

          // Check for extensions that access filesystem/network extensively
          const activationEvents = (pkg.activationEvents || []).join(' ');
          if (activationEvents.includes('*') && !extName.includes('ms-')) {
            findings.push({
              ruleId: 'ide-wildcard-activation',
              severity: SEVERITY.MEDIUM,
              file: `[${ideName}] ${ext.name}`,
              line: null,
              message: 'Extension activates on all events (*). May impact performance and security.',
              match: null,
            });
          }

          // Check for potential command injection in extensions
          if (pkg.dependencies) {
            const riskyDeps = ['event-stream', 'flatmap-stream', 'coa', 'rc', 'ua-parser-js'];
            for (const dep of riskyDeps) {
              if (pkg.dependencies[dep]) {
                findings.push({
                  ruleId: 'ide-risky-dependency',
                  severity: SEVERITY.HIGH,
                  file: `[${ideName}] ${ext.name}`,
                  line: null,
                  message: `Extension depends on '${dep}' which has known supply-chain compromise history.`,
                  match: null,
                });
              }
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    // Summary finding
    if (totalExtensions > 0) {
      findings.push({
        ruleId: 'ide-summary',
        severity: riskyExtensions > 0 ? SEVERITY.MEDIUM : SEVERITY.LOW,
        file: `[${ideName}] ${extDir}`,
        line: null,
        message: `Scanned ${totalExtensions} extensions. ${riskyExtensions} potential risk(s) found.`,
        match: null,
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      ruleId: 'ide-none-found',
      severity: SEVERITY.LOW,
      file: '(IDE extensions)',
      line: null,
      message: 'No IDE extension directories found.',
      match: null,
    });
  }

  return findings;
}

// ─── SSH config audit ───────────────────────────────────────────────────────────
async function auditSSHConfig() {
  const findings = [];
  const homeDir = os.homedir();
  const sshDir = path.join(homeDir, '.ssh');

  if (!fs.existsSync(sshDir)) {
    findings.push({
      ruleId: 'ssh-no-dir',
      severity: SEVERITY.LOW,
      file: sshDir,
      line: null,
      message: 'No .ssh directory found.',
      match: null,
    });
    return findings;
  }

  // Check for overly permissive SSH config
  const sshConfig = path.join(sshDir, 'config');
  if (fs.existsSync(sshConfig)) {
    try {
      const content = fs.readFileSync(sshConfig, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for wildcard host with password auth
        if (/^Host\s+\*/i.test(line)) {
          findings.push({
            ruleId: 'ssh-wildcard-host',
            severity: SEVERITY.MEDIUM,
            file: sshConfig,
            line: i + 1,
            message: 'Wildcard SSH host config detected. Be specific with host patterns.',
            match: null,
          });
        }

        // StrictHostKeyChecking disabled
        if (/StrictHostKeyChecking\s+no/i.test(line)) {
          findings.push({
            ruleId: 'ssh-no-hostkey-check',
            severity: SEVERITY.HIGH,
            file: sshConfig,
            line: i + 1,
            message: 'StrictHostKeyChecking disabled. Vulnerable to MITM attacks.',
            match: null,
          });
        }

        // PasswordAuthentication enabled
        if (/PasswordAuthentication\s+yes/i.test(line)) {
          findings.push({
            ruleId: 'ssh-password-auth',
            severity: SEVERITY.MEDIUM,
            file: sshConfig,
            line: i + 1,
            message: 'Password authentication enabled. Prefer key-based authentication.',
            match: null,
          });
        }

        // ForwardAgent yes (risky)
        if (/ForwardAgent\s+yes/i.test(line)) {
          findings.push({
            ruleId: 'ssh-forward-agent',
            severity: SEVERITY.MEDIUM,
            file: sshConfig,
            line: i + 1,
            message: 'SSH agent forwarding enabled. Compromised hosts could use your keys.',
            match: null,
          });
        }

        // PermitRootLogin
        if (/PermitRootLogin\s+yes/i.test(line)) {
          findings.push({
            ruleId: 'ssh-root-login',
            severity: SEVERITY.HIGH,
            file: sshConfig,
            line: i + 1,
            message: 'Root login permitted via SSH. Disable and use sudo.',
            match: null,
          });
        }
      }
    } catch {
      // Can't read config
    }
  }

  // Check SSH key files
  try {
    const sshFiles = fs.readdirSync(sshDir);

    for (const file of sshFiles) {
      const filePath = path.join(sshDir, file);
      if (!fs.statSync(filePath).isFile()) continue;

      // Check for unprotected private keys
      if (['id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa'].includes(file)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');

          // Check if private key is encrypted
          if (content.includes('PRIVATE KEY-----') && !content.includes('ENCRYPTED')) {
            findings.push({
              ruleId: 'ssh-unencrypted-key',
              severity: SEVERITY.MEDIUM,
              file: filePath,
              line: null,
              message: `SSH private key '${file}' is not passphrase-protected. Use ssh-keygen -p to add one.`,
              match: null,
            });
          }

          // Check for DSA keys (deprecated)
          if (file === 'id_dsa') {
            findings.push({
              ruleId: 'ssh-dsa-key',
              severity: SEVERITY.HIGH,
              file: filePath,
              line: null,
              message: 'DSA key found. DSA is deprecated and insecure. Use Ed25519 or RSA ≥4096.',
              match: null,
            });
          }
        } catch {
          // Can't read key file
        }
      }

      // Check for authorized_keys issues
      if (file === 'authorized_keys') {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const keys = content.split('\n').filter(Boolean);

          if (keys.length > 20) {
            findings.push({
              ruleId: 'ssh-many-authorized-keys',
              severity: SEVERITY.MEDIUM,
              file: filePath,
              line: null,
              message: `${keys.length} authorized keys found. Review and remove stale keys.`,
              match: null,
            });
          }

          for (let i = 0; i < keys.length; i++) {
            if (keys[i].includes('ssh-dss')) {
              findings.push({
                ruleId: 'ssh-dsa-authorized',
                severity: SEVERITY.HIGH,
                file: filePath,
                line: i + 1,
                message: 'DSA key in authorized_keys. DSA is deprecated.',
                match: null,
              });
            }
          }
        } catch {
          // Can't read authorized_keys
        }
      }

      // Check known_hosts for potential issues
      if (file === 'known_hosts' || file === 'known_hosts.old') {
        // Just note its existence (not a finding per se)
      }
    }
  } catch {
    // Can't read .ssh directory
  }

  if (findings.length === 0) {
    findings.push({
      ruleId: 'ssh-clean',
      severity: SEVERITY.LOW,
      file: sshDir,
      line: null,
      message: 'SSH configuration looks reasonable.',
      match: null,
    });
  }

  return findings;
}

// ─── .gitignore validation ──────────────────────────────────────────────────────
async function validateGitignore(dirPath) {
  const findings = [];
  const gitignorePath = path.join(dirPath, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    findings.push({
      ruleId: 'no-gitignore',
      severity: SEVERITY.MEDIUM,
      file: '.gitignore',
      line: null,
      message: 'No .gitignore file found. Create one to prevent accidental secret commits.',
      match: null,
    });
    return findings;
  }

  let content;
  try {
    content = fs.readFileSync(gitignorePath, 'utf8');
  } catch {
    return findings;
  }

  const rules = content.split('\n').map((l) => l.trim()).filter(Boolean);

  const requiredPatterns = [
    { pattern: '.env', label: '.env files', severity: SEVERITY.HIGH },
    { pattern: '.env.local', label: '.env.local', severity: SEVERITY.HIGH },
    { pattern: '.env.production', label: '.env.production', severity: SEVERITY.HIGH },
    { pattern: '*.pem', label: 'PEM files', severity: SEVERITY.MEDIUM },
    { pattern: '*.key', label: 'key files', severity: SEVERITY.MEDIUM },
    { pattern: 'id_rsa', label: 'RSA private keys', severity: SEVERITY.MEDIUM },
  ];

  for (const req of requiredPatterns) {
    const isIgnored = rules.some((r) => {
      if (r.startsWith('#')) return false;
      // Simple glob matching
      return r === req.pattern || r === `*${req.pattern}` || r.includes(req.pattern);
    });

    if (!isIgnored) {
      findings.push({
        ruleId: 'gitignore-missing-pattern',
        severity: req.severity,
        file: '.gitignore',
        line: null,
        message: `'${req.pattern}' (${req.label}) is not in .gitignore. Add it to prevent accidental commits.`,
        match: null,
      });
    }
  }

  return findings;
}

// ─── Format findings (utility) ──────────────────────────────────────────────────
function formatFindings(findings, format) {
  switch (format) {
    case 'json':
      return JSON.stringify(findings, null, 2);
    case 'text':
    default:
      return findings
        .map(
          (f) =>
            `[${f.severity.toUpperCase()}] ${f.ruleId} — ${f.file}${f.line ? `:${f.line}` : ''}\n  ${f.message}`
        )
        .join('\n\n');
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────────
module.exports = {
  scanDirectory,
  scanGitHistory,
  auditIDEExtensions,
  auditSSHConfig,
  validateGitignore,
  formatFindings,
  SEVERITY,
  SECRET_PATTERNS,
  SENSITIVE_FILES,
  shannonEntropy,
};
