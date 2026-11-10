// UrStack AI Snippets — VS Code Extension
// https://urstack-ai.vercel.app
//
// Provides 200+ AI/LLM integration snippets, error analysis,
// and quick access to the UrStack AI developer tool directory.

const vscode = require('vscode');

const URSTACK_URL = 'https://urstack-ai.vercel.app';

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // --- Status Bar Item ---
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    50
  );
  statusBarItem.text = '$(zap) UrStack AI';
  statusBarItem.tooltip = 'Open UrStack AI — 76+ AI Tools Directory';
  statusBarItem.command = 'urstack.openDocs';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // --- Command: Analyze Selected Error ---
  const analyzeErrorCmd = vscode.commands.registerCommand(
    'urstack.analyzeError',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection).trim();

      if (!selectedText) {
        vscode.window.showWarningMessage(
          'Select an error message first, then run this command.'
        );
        return;
      }

      // Show a webview panel with error diagnosis
      const panel = vscode.window.createWebviewPanel(
        'urstackErrorAnalysis',
        'UrStack: Error Analysis',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      panel.webview.html = getErrorAnalysisHTML(selectedText);
    }
  );

  // --- Command: Open UrStack Docs ---
  const openDocsCmd = vscode.commands.registerCommand(
    'urstack.openDocs',
    () => {
      vscode.env.openExternal(vscode.Uri.parse(URSTACK_URL));
    }
  );

  context.subscriptions.push(analyzeErrorCmd, openDocsCmd);

  // --- Activation Notification ---
  vscode.window.showInformationMessage(
    'UrStack AI Snippets loaded — 200+ AI integration patterns ready',
    'Open UrStack AI'
  ).then((choice) => {
    if (choice === 'Open UrStack AI') {
      vscode.env.openExternal(vscode.Uri.parse(URSTACK_URL));
    }
  });
}

/**
 * Generates the HTML for the error analysis webview panel.
 * Provides local pattern-matching diagnosis plus a link to UrStack AI.
 */
function getErrorAnalysisHTML(errorText) {
  const diagnosis = analyzeError(errorText);
  const encodedError = encodeURIComponent(errorText);
  const urstackLink = `${URSTACK_URL}?error=${encodedError}`;

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UrStack Error Analysis</title>
  <style>
    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      padding: 20px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.6;
    }
    h1 { font-size: 1.4em; margin-bottom: 4px; }
    h2 { font-size: 1.1em; margin-top: 20px; color: var(--vscode-textLink-foreground); }
    .error-box {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      padding: 12px 16px;
      border-radius: 6px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.9em;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 12px 0;
    }
    .diagnosis {
      background: var(--vscode-textBlockQuote-background, #1e1e2e);
      border-left: 4px solid var(--vscode-textLink-foreground, #3794ff);
      padding: 12px 16px;
      border-radius: 4px;
      margin: 12px 0;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 600;
      margin-right: 6px;
    }
    .tag-category {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .tag-severity-high { background: #d32f2f; color: #fff; }
    .tag-severity-medium { background: #f57c00; color: #fff; }
    .tag-severity-low { background: #388e3c; color: #fff; }
    a {
      color: var(--vscode-textLink-foreground, #3794ff);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    .cta {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 24px;
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
      border-radius: 6px;
      font-weight: 600;
      text-decoration: none;
    }
    .cta:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
      text-decoration: none;
    }
    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-widget-border, #333);
      font-size: 0.85em;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <h1>⚡ UrStack Error Analysis</h1>
  <p>Quick local diagnosis of the selected error.</p>

  <h2>Selected Error</h2>
  <div class="error-box">${escapeHtml(errorText)}</div>

  <h2>Diagnosis</h2>
  <div class="diagnosis">
    <span class="tag tag-category">${diagnosis.category}</span>
    <span class="tag tag-severity-${diagnosis.severity}">${diagnosis.severity.toUpperCase()}</span>
    <p><strong>${diagnosis.title}</strong></p>
    <p>${diagnosis.explanation}</p>
    ${diagnosis.fix ? `<p><strong>Suggested fix:</strong> ${diagnosis.fix}</p>` : ''}
  </div>

  <h2>Need Deeper Analysis?</h2>
  <p>Get AI-powered root cause analysis, fix suggestions, and related documentation:</p>
  <a class="cta" href="${urstackLink}">🔍 Analyze with UrStack AI</a>

  <div class="footer">
    <p>
      Powered by <a href="${URSTACK_URL}">UrStack AI</a> —
      76+ AI Tools Directory · 24-Hour Code Rescue · Free Error Analyzer
    </p>
  </div>
</body>
</html>`;
}

/**
 * Local error pattern matching — provides instant offline diagnosis.
 */
function analyzeError(errorText) {
  const text = errorText.toLowerCase();

  const patterns = [
    // --- API Key / Auth ---
    {
      test: (t) => /api[_\s-]?key|auth|unauthorized|401|403|invalid.*key|authentication/i.test(t),
      result: {
        category: 'Authentication',
        severity: 'high',
        title: 'API Key / Authentication Error',
        explanation: 'The request failed due to missing, invalid, or expired API credentials.',
        fix: 'Check your API key is set correctly in environment variables. Ensure the key has the required permissions and hasn\'t expired. Use the `ur-env-safe` snippet for safe credential loading.',
      },
    },
    // --- Rate Limiting ---
    {
      test: (t) => /rate[_\s-]?limit|429|too many requests|quota|throttl/i.test(t),
      result: {
        category: 'Rate Limiting',
        severity: 'medium',
        title: 'Rate Limit Exceeded',
        explanation: 'You\'ve hit the API provider\'s request rate or token quota limit.',
        fix: 'Implement exponential backoff with the `ur-retry-backoff` snippet. Consider the `ur-cost-guard` snippet to set spend limits. Check your plan\'s rate limits.',
      },
    },
    // --- Token / Context Length ---
    {
      test: (t) => /token|context.*(length|limit|window|exceed)|max.*length|too (long|large)/i.test(t),
      result: {
        category: 'Token Limit',
        severity: 'medium',
        title: 'Token / Context Length Exceeded',
        explanation: 'The input or total conversation exceeds the model\'s context window.',
        fix: 'Use the `ur-token-count` snippet to pre-check token counts. Truncate or summarize conversation history. Consider a model with a larger context window.',
      },
    },
    // --- Model Not Found ---
    {
      test: (t) => /model.*not.*found|invalid.*model|does not exist|no such model|unknown model/i.test(t),
      result: {
        category: 'Configuration',
        severity: 'medium',
        title: 'Model Not Found',
        explanation: 'The specified model name is invalid or not available for your account.',
        fix: 'Check the model name against the provider\'s current model list. Ensure your API plan has access to the requested model. Model names are case-sensitive.',
      },
    },
    // --- Connection / Network ---
    {
      test: (t) => /econnrefused|enotfound|timeout|network|connect|dns|socket|ssl|tls|certificate/i.test(t),
      result: {
        category: 'Network',
        severity: 'high',
        title: 'Connection / Network Error',
        explanation: 'Failed to establish a connection to the API endpoint.',
        fix: 'Check your internet connection and firewall settings. If using Ollama, ensure the server is running locally. Verify the API base URL is correct. Use the `ur-circuit-breaker` snippet for resilient connections.',
      },
    },
    // --- JSON / Parse ---
    {
      test: (t) => /json|parse|syntax.*error|unexpected token|unexpected end/i.test(t),
      result: {
        category: 'Parsing',
        severity: 'medium',
        title: 'JSON / Parse Error',
        explanation: 'The response couldn\'t be parsed as valid JSON, or the request body has a syntax error.',
        fix: 'If parsing LLM output, use structured output mode (function calling or JSON mode). Check for streaming responses that need chunked parsing. Validate your request body.',
      },
    },
    // --- Import / Module ---
    {
      test: (t) => /import|module.*not.*found|no module|cannot find|require.*failed|modulenotfounderror/i.test(t),
      result: {
        category: 'Dependencies',
        severity: 'low',
        title: 'Module / Import Error',
        explanation: 'A required package or module could not be found.',
        fix: 'Install the missing package: `pip install <package>` or `npm install <package>`. Check your virtual environment is activated. Verify package name spelling.',
      },
    },
    // --- Type / Validation ---
    {
      test: (t) => /type.*error|validation|invalid.*param|invalid.*argument|expected.*got|pydantic/i.test(t),
      result: {
        category: 'Validation',
        severity: 'medium',
        title: 'Type / Validation Error',
        explanation: 'A function or API received data in an unexpected format or type.',
        fix: 'Check the expected parameter types in the API docs. Use TypeScript types or Pydantic models for validation. The `ur-openai-function` snippet shows proper schema definition.',
      },
    },
    // --- Memory / Resource ---
    {
      test: (t) => /out of memory|oom|memory|heap|allocation|cuda|gpu/i.test(t),
      result: {
        category: 'Resources',
        severity: 'high',
        title: 'Memory / Resource Exhaustion',
        explanation: 'The process ran out of available memory (RAM or GPU VRAM).',
        fix: 'Reduce batch size or context length. Use a smaller model or quantized variant. For GPU errors, check VRAM availability. Consider offloading to a cloud API.',
      },
    },
    // --- CORS ---
    {
      test: (t) => /cors|cross.origin|access-control|blocked by|preflight/i.test(t),
      result: {
        category: 'CORS',
        severity: 'medium',
        title: 'CORS Policy Error',
        explanation: 'The browser blocked a cross-origin API request.',
        fix: 'Never call AI APIs directly from the browser — use a backend proxy. The `ur-next-ai-route` or `ur-express-ai` snippets show the proper server-side pattern.',
      },
    },
    // --- Timeout ---
    {
      test: (t) => /timeout|timed out|deadline|504/i.test(t),
      result: {
        category: 'Timeout',
        severity: 'medium',
        title: 'Request Timeout',
        explanation: 'The API request took too long and was terminated.',
        fix: 'Increase the request timeout. Use streaming responses for long-running generations. Consider the `ur-retry-backoff` snippet for automatic retries.',
      },
    },
    // --- Permission / Access ---
    {
      test: (t) => /permission|access denied|forbidden|not allowed|insufficient/i.test(t),
      result: {
        category: 'Permissions',
        severity: 'high',
        title: 'Permission / Access Denied',
        explanation: 'Your account or API key lacks the required permissions for this operation.',
        fix: 'Check your API plan includes the requested model/feature. Verify IAM roles if using cloud services. Contact the provider to upgrade access.',
      },
    },
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return pattern.result;
    }
  }

  // Default fallback
  return {
    category: 'General',
    severity: 'medium',
    title: 'Unrecognized Error Pattern',
    explanation:
      'This error doesn\'t match a known local pattern. Use UrStack AI for a deeper AI-powered analysis.',
    fix: 'Click the "Analyze with UrStack AI" button below for AI-powered root cause analysis and tailored fix suggestions.',
  };
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function deactivate() {}

module.exports = { activate, deactivate };
