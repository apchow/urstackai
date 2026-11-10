'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// urstack-trace — Universal Stack Trace Analyzer
// Free open-source diagnostic tool by UrStack AI
// https://urstack-ai.vercel.app
// ──────────────────────────────────────────────────────────────────────────────

// ─── Error Pattern Database ──────────────────────────────────────────────────

const ERROR_PATTERNS = {
  python: [
    {
      id: 'py-import-error',
      pattern: /ImportError:\s*(.+)/i,
      errorType: 'ImportError',
      severity: 'high',
      suggest: (match) => [
        `Module not found: ${match[1].trim()}`,
        'Fix: Install the missing package with pip:',
        `  pip install <package-name>`,
        'If the module is local, ensure the file exists and your PYTHONPATH is correct.',
        'Check for typos in the import statement.',
      ],
    },
    {
      id: 'py-module-not-found',
      pattern: /ModuleNotFoundError:\s*No module named '([^']+)'/i,
      errorType: 'ModuleNotFoundError',
      severity: 'high',
      suggest: (match) => [
        `Module '${match[1]}' is not installed or not found.`,
        'Fix: Install it:',
        `  pip install ${match[1]}`,
        'If using a virtual environment, make sure it is activated.',
        'If the module is part of your project, check your directory structure and __init__.py files.',
      ],
    },
    {
      id: 'py-type-error',
      pattern: /TypeError:\s*(.+)/i,
      errorType: 'TypeError',
      severity: 'medium',
      suggest: (match) => {
        const msg = match[1].trim();
        const tips = [`Type mismatch: ${msg}`];
        if (msg.includes('argument')) {
          tips.push('Fix: Check the number and types of arguments passed to the function.');
          tips.push('Use type() or isinstance() to debug the value types at runtime.');
        } else if (msg.includes("'NoneType'")) {
          tips.push('Fix: A value is None when it shouldn\'t be. Check if a function is returning None unexpectedly.');
          tips.push('Add a guard: if value is not None: ...');
        } else if (msg.includes('not subscriptable')) {
          tips.push('Fix: You are trying to index a non-indexable type (e.g., int, NoneType).');
          tips.push('Verify the variable actually holds a list/dict/tuple before indexing.');
        } else {
          tips.push('Fix: Verify data types at each step. Use print(type(x)) to debug.');
        }
        return tips;
      },
    },
    {
      id: 'py-attribute-error',
      pattern: /AttributeError:\s*'?(\w+)'?\s*object has no attribute '(\w+)'/i,
      errorType: 'AttributeError',
      severity: 'medium',
      suggest: (match) => [
        `'${match[1]}' object has no attribute '${match[2]}'.`,
        'Fix: Check for typos in the attribute or method name.',
        `Verify that '${match[2]}' is defined in the '${match[1]}' class or module.`,
        'Use dir(obj) to list available attributes.',
        'If using an older/newer version of a library, check the API docs for changes.',
      ],
    },
    {
      id: 'py-key-error',
      pattern: /KeyError:\s*(.+)/i,
      errorType: 'KeyError',
      severity: 'medium',
      suggest: (match) => [
        `Dictionary key not found: ${match[1].trim()}`,
        'Fix: Use dict.get(key, default) instead of dict[key] for safer access.',
        'Check available keys with print(dict.keys()).',
        'Ensure the key exists before accessing: if key in my_dict: ...',
      ],
    },
    {
      id: 'py-value-error',
      pattern: /ValueError:\s*(.+)/i,
      errorType: 'ValueError',
      severity: 'medium',
      suggest: (match) => [
        `Invalid value: ${match[1].trim()}`,
        'Fix: Validate input before passing it to the function.',
        'Add try/except ValueError around the conversion.',
        'Use input validation (e.g., str.isdigit() before int()).',
      ],
    },
    {
      id: 'py-file-not-found',
      pattern: /FileNotFoundError:\s*(.+)/i,
      errorType: 'FileNotFoundError',
      severity: 'high',
      suggest: (match) => [
        `File not found: ${match[1].trim()}`,
        'Fix: Verify the file path is correct (use os.path.abspath() to check).',
        'Ensure the working directory is what you expect: print(os.getcwd()).',
        'Use pathlib.Path for cross-platform path handling.',
        'Check file permissions if the file exists but is not accessible.',
      ],
    },
    {
      id: 'py-indentation-error',
      pattern: /IndentationError:\s*(.+)/i,
      errorType: 'IndentationError',
      severity: 'high',
      suggest: (match) => [
        `Indentation problem: ${match[1].trim()}`,
        'Fix: Use consistent indentation — either tabs or spaces, never mix.',
        'Configure your editor to use 4 spaces per indent (PEP 8 standard).',
        'Use "python -tt script.py" to detect mixed tabs/spaces.',
        'Most editors have "Convert Indentation to Spaces" command.',
      ],
    },
    {
      id: 'py-syntax-error',
      pattern: /SyntaxError:\s*(.+)/i,
      errorType: 'SyntaxError',
      severity: 'high',
      suggest: (match) => {
        const msg = match[1].trim();
        const tips = [`Syntax error: ${msg}`];
        if (msg.includes('EOL')) {
          tips.push('Fix: You have an unterminated string literal. Check for missing closing quotes.');
        } else if (msg.includes('unexpected EOF')) {
          tips.push('Fix: Missing closing bracket, parenthesis, or block body (pass/...).');
        } else if (msg.includes('invalid syntax')) {
          tips.push('Fix: Check the line (and the line above) for:');
          tips.push('  - Missing colons after if/for/def/class statements');
          tips.push('  - Mismatched brackets or parentheses');
          tips.push('  - Using Python 3 syntax in Python 2 or vice versa');
        } else {
          tips.push('Fix: Check the indicated line and the line before it for syntax issues.');
        }
        return tips;
      },
    },
    {
      id: 'py-recursion-error',
      pattern: /RecursionError:\s*(.+)/i,
      errorType: 'RecursionError',
      severity: 'high',
      suggest: (match) => [
        `Maximum recursion depth exceeded: ${match[1].trim()}`,
        'Fix: Your function is calling itself infinitely. Check the base case.',
        'Ensure the recursive call is progressing toward the base case.',
        'Consider converting recursion to iteration (using a loop or stack).',
        'If recursion depth is intentionally large: sys.setrecursionlimit(N)',
      ],
    },
  ],

  node: [
    {
      id: 'node-reference-error',
      pattern: /ReferenceError:\s*(\w+)\s+is not defined/i,
      errorType: 'ReferenceError',
      severity: 'high',
      suggest: (match) => [
        `'${match[1]}' is not defined.`,
        'Fix: Ensure the variable/function is declared before use.',
        'Check for typos in the variable name.',
        `If '${match[1]}' is from a module, add: const ${match[1]} = require('...');`,
        'Check scope: variables inside functions are not accessible outside.',
      ],
    },
    {
      id: 'node-type-error',
      pattern: /TypeError:\s*(.+)/i,
      errorType: 'TypeError',
      severity: 'medium',
      suggest: (match) => {
        const msg = match[1].trim();
        const tips = [`TypeError: ${msg}`];
        if (msg.includes('is not a function')) {
          tips.push('Fix: The value you\'re trying to call is not a function.');
          tips.push('Check the import/require — you may need to access a property (e.g., .default).');
          tips.push('Verify the object has the method you\'re calling (use console.log).');
        } else if (msg.includes('Cannot read propert')) {
          tips.push('Fix: You\'re accessing a property on undefined or null.');
          tips.push('Add null checks: if (obj && obj.prop) or use optional chaining: obj?.prop');
        } else if (msg.includes('Cannot set propert')) {
          tips.push('Fix: You\'re trying to set a property on undefined or null.');
          tips.push('Initialize the object before setting properties on it.');
        } else {
          tips.push('Fix: Check the types of values involved. Use typeof and console.log to debug.');
        }
        return tips;
      },
    },
    {
      id: 'node-syntax-error',
      pattern: /SyntaxError:\s*(.+)/i,
      errorType: 'SyntaxError',
      severity: 'high',
      suggest: (match) => {
        const msg = match[1].trim();
        const tips = [`SyntaxError: ${msg}`];
        if (msg.includes('Unexpected token')) {
          tips.push('Fix: Check for missing brackets, commas, or semicolons.');
          tips.push('If parsing JSON: validate the JSON string with JSON.parse() in a try/catch.');
        } else if (msg.includes('Unexpected end of input')) {
          tips.push('Fix: Missing closing bracket } or ) somewhere in the code.');
        } else {
          tips.push('Fix: Review the indicated line for syntax issues.');
        }
        return tips;
      },
    },
    {
      id: 'node-module-not-found',
      pattern: /Error:\s*Cannot find module '([^']+)'/i,
      errorType: 'MODULE_NOT_FOUND',
      severity: 'high',
      suggest: (match) => [
        `Module '${match[1]}' not found.`,
        'Fix: Install the package:',
        `  npm install ${match[1]}`,
        'If it\'s a local file, check the relative path (it must start with ./ or ../).',
        'Run "npm ls" to verify installed packages.',
        'Delete node_modules and package-lock.json, then run "npm install".',
      ],
    },
    {
      id: 'node-enoent',
      pattern: /Error:\s*ENOENT[:\s]*no such file or directory[,\s]*\w*\s*'([^']+)'/i,
      errorType: 'ENOENT',
      severity: 'high',
      suggest: (match) => [
        `File or directory not found: ${match[1]}`,
        'Fix: Verify the path exists using fs.existsSync() before accessing.',
        'Check if the path is relative — use path.resolve() or path.join(__dirname, ...).',
        'Ensure the working directory (process.cwd()) is correct.',
      ],
    },
    {
      id: 'node-econnrefused',
      pattern: /Error:\s*connect ECONNREFUSED\s*([\d.:]+)/i,
      errorType: 'ECONNREFUSED',
      severity: 'high',
      suggest: (match) => [
        `Connection refused to ${match[1]}`,
        'Fix: The server at that address is not running or not accepting connections.',
        'Check that the service (database, API, etc.) is started.',
        'Verify the host and port are correct.',
        'Check firewall rules and network configuration.',
      ],
    },
    {
      id: 'node-esm-require',
      pattern: /ERR_REQUIRE_ESM|require\(\) of ES Module/i,
      errorType: 'ERR_REQUIRE_ESM',
      severity: 'high',
      suggest: () => [
        'Cannot require() an ES module.',
        'Fix: The package has migrated to ESM-only. Options:',
        '  1. Use dynamic import: const pkg = await import("package-name")',
        '  2. Rename your file to .mjs and use import syntax',
        '  3. Add "type": "module" to your package.json',
        '  4. Downgrade the package to the last CJS-compatible version',
      ],
    },
    {
      id: 'node-eaddrinuse',
      pattern: /Error:\s*listen EADDRINUSE[:\s]*([\d.:]+)/i,
      errorType: 'EADDRINUSE',
      severity: 'medium',
      suggest: (match) => [
        `Port already in use: ${match[1]}`,
        'Fix: Another process is using this port. Find and kill it:',
        '  Linux/macOS: lsof -ti :PORT | xargs kill -9',
        '  Windows: netstat -ano | findstr :PORT  then  taskkill /PID <PID> /F',
        'Or use a different port in your configuration.',
      ],
    },
  ],

  go: [
    {
      id: 'go-panic',
      pattern: /panic:\s*(.+)/i,
      errorType: 'panic',
      severity: 'critical',
      suggest: (match) => {
        const msg = match[1].trim();
        const tips = [`Go panic: ${msg}`];
        if (msg.includes('nil pointer dereference') || msg.includes('invalid memory address')) {
          tips.push('Fix: You are dereferencing a nil pointer.');
          tips.push('Add nil checks before accessing pointer values: if ptr != nil { ... }');
          tips.push('Trace back to where the variable is assigned — it may not be initialized.');
          tips.push('Check function return values for nil before using them.');
        } else if (msg.includes('index out of range')) {
          tips.push('Fix: Array/slice index is out of bounds.');
          tips.push('Check the length of the slice before indexing: if i < len(slice) { ... }');
          tips.push('Use range-based for loops instead of manual indexing when possible.');
        } else if (msg.includes('assignment to entry in nil map')) {
          tips.push('Fix: Map was not initialized. Use make(map[K]V) before assigning.');
        } else {
          tips.push('Fix: Add recover() in a deferred function to handle panics gracefully.');
          tips.push('Review the goroutine stack trace below for the exact location.');
        }
        return tips;
      },
    },
    {
      id: 'go-nil-pointer',
      pattern: /runtime error:\s*invalid memory address or nil pointer dereference/i,
      errorType: 'nil pointer dereference',
      severity: 'critical',
      suggest: () => [
        'Nil pointer dereference detected.',
        'Fix: A pointer variable is nil when accessed.',
        'Add nil checks: if ptr != nil { ... }',
        'Check function return values — especially from functions that return (*T, error).',
        'Use the goroutine stack trace to find the exact line.',
      ],
    },
    {
      id: 'go-deadlock',
      pattern: /fatal error:\s*all goroutines are asleep - deadlock!/i,
      errorType: 'deadlock',
      severity: 'critical',
      suggest: () => [
        'Deadlock: All goroutines are blocked.',
        'Fix: Common causes:',
        '  - Unbuffered channel with no receiver/sender',
        '  - Waiting on a WaitGroup that is never Done()',
        '  - Mutex locked but never unlocked',
        'Ensure every channel send has a corresponding receive.',
        'Use buffered channels if appropriate: make(chan T, size)',
        'Use "go run -race" to detect race conditions.',
      ],
    },
    {
      id: 'go-index-out-of-range',
      pattern: /runtime error:\s*index out of range\s*\[(\d+)\]\s*with length (\d+)/i,
      errorType: 'index out of range',
      severity: 'high',
      suggest: (match) => [
        `Index ${match[1]} is out of range for slice/array of length ${match[2]}.`,
        'Fix: Validate the index before accessing:',
        `  if idx < len(slice) { value := slice[idx] }`,
        'Use range-based iteration: for i, v := range slice { ... }',
        'Check that the data source populated the slice as expected.',
      ],
    },
  ],

  rust: [
    {
      id: 'rust-panic-unwrap',
      pattern: /thread '(.+)' panicked at (?:'([^']*)'|"([^"]*)")?/i,
      errorType: 'panic',
      severity: 'critical',
      suggest: (match) => {
        const thread = match[1];
        const msg = (match[2] || match[3] || '').trim();
        const tips = [`Thread '${thread}' panicked${msg ? ': ' + msg : ''}.`];
        if (msg.includes('unwrap()') || msg.includes('called `Option::unwrap()` on a `None` value')) {
          tips.push('Fix: unwrap() was called on a None value.');
          tips.push('Use pattern matching or combinators instead:');
          tips.push('  if let Some(val) = option { ... }');
          tips.push('  option.unwrap_or(default)');
          tips.push('  option.unwrap_or_else(|| compute_default())');
          tips.push('  Use the ? operator for Result/Option propagation.');
        } else if (msg.includes('called `Result::unwrap()` on an `Err` value')) {
          tips.push('Fix: unwrap() was called on an Err Result.');
          tips.push('Handle the error properly:');
          tips.push('  match result { Ok(v) => ..., Err(e) => ... }');
          tips.push('  result.unwrap_or_default()');
          tips.push('  Use the ? operator to propagate errors up.');
        } else if (msg.includes('index out of bounds')) {
          tips.push('Fix: Array/vector index out of bounds.');
          tips.push('Use .get(index) which returns Option<&T> instead of panicking.');
          tips.push('Check the collection length before indexing.');
        } else {
          tips.push('Fix: Review the panic message and backtrace.');
          tips.push('Set RUST_BACKTRACE=1 for a full backtrace.');
          tips.push('Consider using Result<T, E> instead of panic!/unwrap.');
        }
        return tips;
      },
    },
    {
      id: 'rust-borrow',
      pattern: /error\[E\d+\]:\s*(cannot borrow .+ as .+ because .+)/i,
      errorType: 'borrow checker error',
      severity: 'high',
      suggest: (match) => [
        `Borrow checker: ${match[1]}`,
        'Fix: Rust enforces that you cannot have mutable and immutable borrows simultaneously.',
        'Strategies:',
        '  - Narrow the scope of borrows (use blocks { })',
        '  - Clone the data if shared ownership is needed: value.clone()',
        '  - Use Rc<T> / Arc<T> for shared ownership',
        '  - Use RefCell<T> / Mutex<T> for interior mutability',
        '  - Restructure code to avoid overlapping borrows',
      ],
    },
    {
      id: 'rust-move',
      pattern: /error\[E\d+\]:\s*(use of moved value:?\s*.+)/i,
      errorType: 'use of moved value',
      severity: 'high',
      suggest: (match) => [
        `Move error: ${match[1]}`,
        'Fix: The value has been moved and can no longer be used.',
        'Options:',
        '  - Clone the value before the move: value.clone()',
        '  - Use references (&value) instead of moving',
        '  - Implement Copy trait if the type is small and simple',
        '  - Use Rc<T>/Arc<T> for shared ownership',
      ],
    },
    {
      id: 'rust-lifetime',
      pattern: /error\[E\d+\]:\s*(.+lifetime.+)/i,
      errorType: 'lifetime error',
      severity: 'high',
      suggest: (match) => [
        `Lifetime error: ${match[1]}`,
        'Fix: The compiler cannot verify that a reference lives long enough.',
        'Add explicit lifetime annotations to functions: fn foo<\'a>(x: &\'a str) -> &\'a str',
        'Ensure returned references don\'t outlive the data they point to.',
        'Consider returning an owned value (String instead of &str) if lifetimes are complex.',
      ],
    },
  ],

  java: [
    {
      id: 'java-null-pointer',
      pattern: /java\.lang\.NullPointerException(?::\s*(.+))?/i,
      errorType: 'NullPointerException',
      severity: 'high',
      suggest: (match) => {
        const msg = match[1] ? match[1].trim() : '';
        const tips = ['NullPointerException: Attempted to use a null reference.'];
        if (msg) tips[0] += ` (${msg})`;
        tips.push('Fix: Add null checks before accessing objects:');
        tips.push('  if (obj != null) { obj.method(); }');
        tips.push('Use Optional<T> for values that may be absent (Java 8+).');
        tips.push('Check method return values — many APIs return null on failure.');
        tips.push('Use Objects.requireNonNull() to fail fast with a clear message.');
        return tips;
      },
    },
    {
      id: 'java-class-not-found',
      pattern: /java\.lang\.ClassNotFoundException:\s*(.+)/i,
      errorType: 'ClassNotFoundException',
      severity: 'high',
      suggest: (match) => [
        `Class not found: ${match[1].trim()}`,
        'Fix: The class is not on the classpath.',
        'Ensure the JAR containing the class is included in your dependencies.',
        'If using Maven/Gradle, add the dependency to pom.xml / build.gradle.',
        'Check for typos in the fully qualified class name.',
        'Verify the class has been compiled (mvn compile / javac).',
      ],
    },
    {
      id: 'java-array-index',
      pattern: /java\.lang\.ArrayIndexOutOfBoundsException(?::\s*(?:Index )?(\d+))?/i,
      errorType: 'ArrayIndexOutOfBoundsException',
      severity: 'medium',
      suggest: (match) => {
        const idx = match[1] || 'unknown';
        return [
          `Array index out of bounds: ${idx}`,
          'Fix: Check array length before accessing:',
          '  if (i >= 0 && i < array.length) { ... }',
          'Use enhanced for-loop when possible: for (var item : array) { ... }',
          'Verify loop boundaries — off-by-one errors are common.',
          'Consider using ArrayList instead of raw arrays for dynamic sizing.',
        ];
      },
    },
    {
      id: 'java-stack-overflow',
      pattern: /java\.lang\.StackOverflowError/i,
      errorType: 'StackOverflowError',
      severity: 'critical',
      suggest: () => [
        'StackOverflowError: Infinite or excessively deep recursion.',
        'Fix: Check your recursive method for a proper base case.',
        'Ensure the recursive call progresses toward the base case.',
        'Convert recursion to iteration if the depth can be large.',
        'Increase stack size with -Xss flag if recursion depth is intentionally large:',
        '  java -Xss4m MyClass',
      ],
    },
    {
      id: 'java-class-cast',
      pattern: /java\.lang\.ClassCastException:\s*(.+)/i,
      errorType: 'ClassCastException',
      severity: 'medium',
      suggest: (match) => [
        `Invalid cast: ${match[1].trim()}`,
        'Fix: Use instanceof before casting:',
        '  if (obj instanceof TargetType t) { ... }  // Java 16+ pattern matching',
        'Check the actual runtime type with obj.getClass().getName().',
        'Use generics to catch type mismatches at compile time.',
      ],
    },
    {
      id: 'java-concurrent-modification',
      pattern: /java\.util\.ConcurrentModificationException/i,
      errorType: 'ConcurrentModificationException',
      severity: 'medium',
      suggest: () => [
        'ConcurrentModificationException: Collection modified during iteration.',
        'Fix: Do not add/remove elements while iterating with a for-each loop.',
        'Use Iterator.remove() to safely remove during iteration.',
        'Use ConcurrentHashMap or CopyOnWriteArrayList for concurrent access.',
        'Collect items to remove in a separate list, then removeAll() after the loop.',
      ],
    },
  ],
};

// ─── Frame Parsers ───────────────────────────────────────────────────────────

const FRAME_PARSERS = {
  python: {
    // File "path/to/file.py", line 42, in function_name
    frameRegex: /File "([^"]+)", line (\d+)(?:, in (.+))?/g,
    parseFrame: (match) => ({
      file: match[1],
      line: parseInt(match[2], 10),
      function: match[3] || '<module>',
    }),
  },
  node: {
    // at functionName (file:line:col) or at file:line:col
    frameRegex: /at\s+(?:(.+?)\s+\()?([^()]+?):(\d+):(\d+)\)?/g,
    parseFrame: (match) => ({
      file: match[2],
      line: parseInt(match[3], 10),
      column: parseInt(match[4], 10),
      function: match[1] || '<anonymous>',
    }),
  },
  go: {
    // /path/to/file.go:42 +0x1a2
    frameRegex: /^\s*(\S+\.go):(\d+)/gm,
    parseFrame: (match) => ({
      file: match[1],
      line: parseInt(match[2], 10),
    }),
  },
  rust: {
    // N: 0x... - crate::module::function at /path/to/file.rs:42:10
    frameRegex: /\d+:\s+\S+\s+-\s+(.+?)\s+at\s+([^:]+):(\d+)(?::(\d+))?/g,
    parseFrame: (match) => ({
      function: match[1],
      file: match[2],
      line: parseInt(match[3], 10),
      column: match[4] ? parseInt(match[4], 10) : undefined,
    }),
  },
  java: {
    // at package.Class.method(File.java:42)
    frameRegex: /at\s+([\w.$]+)\(([^:)]+?)(?::(\d+))?\)/g,
    parseFrame: (match) => ({
      function: match[1],
      file: match[2],
      line: match[3] ? parseInt(match[3], 10) : undefined,
    }),
  },
};

// ─── Language Detection ──────────────────────────────────────────────────────

const LANGUAGE_SIGNATURES = [
  {
    language: 'python',
    patterns: [
      /Traceback \(most recent call last\)/i,
      /File ".*\.py", line \d+/i,
      /^\w+Error:/m,
      /ModuleNotFoundError/,
      /IndentationError/,
    ],
    weight: 0,
  },
  {
    language: 'node',
    patterns: [
      /at\s+.+\(.+:\d+:\d+\)/,
      /node:internal/,
      /at Module\._compile/,
      /ERR_REQUIRE_ESM/,
      /ENOENT|ECONNREFUSED|EADDRINUSE/,
      /ReferenceError:\s*\w+\s+is not defined/,
    ],
    weight: 0,
  },
  {
    language: 'go',
    patterns: [
      /goroutine \d+/,
      /panic:/,
      /\.go:\d+/,
      /runtime error:/,
      /all goroutines are asleep/,
    ],
    weight: 0,
  },
  {
    language: 'rust',
    patterns: [
      /thread '.+' panicked/,
      /\.rs:\d+/,
      /RUST_BACKTRACE/,
      /note: run with.*RUST_BACKTRACE/,
      /error\[E\d+\]/,
    ],
    weight: 0,
  },
  {
    language: 'java',
    patterns: [
      /at\s+[\w.]+\(\w+\.java:\d+\)/,
      /java\.lang\.\w+Exception/,
      /Exception in thread/,
      /Caused by:/,
      /\.java:\d+\)/,
    ],
    weight: 0,
  },
];

function detectLanguage(input) {
  const scores = LANGUAGE_SIGNATURES.map((sig) => {
    let score = 0;
    for (const pattern of sig.patterns) {
      if (pattern.test(input)) {
        score++;
      }
    }
    return { language: sig.language, score };
  });

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score === 0) {
    return { language: 'unknown', confidence: 0 };
  }

  const confidence = Math.min(scores[0].score / 3, 1);
  return { language: scores[0].language, confidence };
}

// ─── Core API ────────────────────────────────────────────────────────────────

/**
 * Parse a stack trace / error output.
 * @param {string} input — Raw error text
 * @param {string} [language='auto'] — Force language or 'auto' to detect
 * @returns {object} Parsed trace result
 */
function parseTrace(input, language = 'auto') {
  if (!input || typeof input !== 'string') {
    return { error: 'No input provided', raw: input };
  }

  const trimmed = input.trim();
  let detectedLang = language;
  let confidence = 1;

  if (language === 'auto') {
    const detection = detectLanguage(trimmed);
    detectedLang = detection.language;
    confidence = detection.confidence;
  }

  const result = {
    language: detectedLang,
    confidence,
    raw: trimmed,
    frames: [],
    errorLine: null,
    errorType: null,
    errorMessage: null,
  };

  // Extract frames
  const parser = FRAME_PARSERS[detectedLang];
  if (parser) {
    let match;
    const regex = new RegExp(parser.frameRegex.source, parser.frameRegex.flags);
    while ((match = regex.exec(trimmed)) !== null) {
      result.frames.push(parser.parseFrame(match));
    }
  }

  // Extract the primary error line
  const patterns = ERROR_PATTERNS[detectedLang];
  if (patterns) {
    for (const ep of patterns) {
      const regex = new RegExp(ep.pattern.source, ep.pattern.flags);
      const match = regex.exec(trimmed);
      if (match) {
        result.errorType = ep.errorType;
        result.errorMessage = match[0];
        result.errorLine = match[0];
        result.matchedPatternId = ep.id;
        break;
      }
    }
  }

  // Fallback: try to extract a generic error line
  if (!result.errorLine) {
    const genericError = trimmed.match(/^.*(?:Error|Exception|panic|panicked|fatal).*$/mi);
    if (genericError) {
      result.errorLine = genericError[0].trim();
      result.errorMessage = result.errorLine;
    }
  }

  return result;
}

/**
 * Diagnose a parsed trace and provide fix suggestions.
 * @param {object} parsedTrace — Output from parseTrace()
 * @returns {object} Diagnosis with suggestions
 */
function diagnose(parsedTrace) {
  if (!parsedTrace || parsedTrace.error) {
    return {
      error: parsedTrace ? parsedTrace.error : 'No parsed trace provided',
      suggestions: [],
      severity: 'unknown',
    };
  }

  const diagnosis = {
    language: parsedTrace.language,
    confidence: parsedTrace.confidence,
    errorType: parsedTrace.errorType,
    errorMessage: parsedTrace.errorMessage,
    frames: parsedTrace.frames,
    frameCount: parsedTrace.frames.length,
    suggestions: [],
    severity: 'unknown',
    topFrame: parsedTrace.frames.length > 0 ? parsedTrace.frames[0] : null,
    bottomFrame:
      parsedTrace.frames.length > 0
        ? parsedTrace.frames[parsedTrace.frames.length - 1]
        : null,
  };

  // For Python, the most relevant frame is the last one (bottom of trace)
  if (parsedTrace.language === 'python' && diagnosis.bottomFrame) {
    diagnosis.originFrame = diagnosis.bottomFrame;
  } else if (diagnosis.topFrame) {
    diagnosis.originFrame = diagnosis.topFrame;
  }

  // Match against patterns
  const patterns = ERROR_PATTERNS[parsedTrace.language];
  if (patterns) {
    for (const ep of patterns) {
      const regex = new RegExp(ep.pattern.source, ep.pattern.flags);
      const match = regex.exec(parsedTrace.raw);
      if (match) {
        diagnosis.suggestions = ep.suggest(match);
        diagnosis.severity = ep.severity;
        diagnosis.matchedPattern = ep.id;
        break;
      }
    }
  }

  // If no pattern matched, give generic advice
  if (diagnosis.suggestions.length === 0) {
    diagnosis.severity = 'unknown';
    diagnosis.suggestions = [
      `Detected error in ${parsedTrace.language || 'unknown language'}: ${parsedTrace.errorLine || 'Unable to extract error message'}`,
      'Suggestions:',
      '  - Review the stack trace frames below to identify the origin of the error.',
      '  - Search for the error message online for specific solutions.',
      '  - Add logging around the failing code to narrow down the issue.',
      `  - For advanced diagnostics, try UrStack AI: https://urstack-ai.vercel.app`,
    ];
  }

  return diagnosis;
}

/**
 * Format a diagnosis for output.
 * @param {object} diagnosis — Output from diagnose()
 * @param {'text'|'json'|'markdown'} [format='text']
 * @returns {string} Formatted output
 */
function formatOutput(diagnosis, format = 'text') {
  if (format === 'json') {
    return JSON.stringify(diagnosis, null, 2);
  }

  if (format === 'markdown') {
    return formatMarkdown(diagnosis);
  }

  return formatText(diagnosis);
}

function formatText(d) {
  const lines = [];
  const sep = '─'.repeat(60);

  lines.push(sep);
  lines.push('  UrStack Trace Analyzer — Diagnosis Report');
  lines.push(sep);
  lines.push('');

  // Language & Confidence
  lines.push(`  Language:    ${(d.language || 'unknown').toUpperCase()}`);
  if (d.confidence !== undefined && d.confidence < 1) {
    lines.push(`  Confidence:  ${Math.round(d.confidence * 100)}%`);
  }

  // Severity
  const sevIcons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢', unknown: '⚪' };
  lines.push(`  Severity:    ${sevIcons[d.severity] || '⚪'} ${(d.severity || 'unknown').toUpperCase()}`);
  lines.push('');

  // Error
  if (d.errorType) {
    lines.push(`  Error Type:  ${d.errorType}`);
  }
  if (d.errorMessage) {
    lines.push(`  Message:     ${d.errorMessage}`);
  }
  lines.push('');

  // Origin Frame
  if (d.originFrame) {
    lines.push('  📍 Origin:');
    lines.push(`     File:     ${d.originFrame.file || 'unknown'}`);
    if (d.originFrame.line) lines.push(`     Line:     ${d.originFrame.line}`);
    if (d.originFrame.function) lines.push(`     Function: ${d.originFrame.function}`);
    lines.push('');
  }

  // Stack Frames
  if (d.frames && d.frames.length > 0) {
    lines.push('  📚 Stack Frames:');
    const maxFrames = Math.min(d.frames.length, 10);
    for (let i = 0; i < maxFrames; i++) {
      const f = d.frames[i];
      const loc = [f.file, f.line, f.column].filter(Boolean).join(':');
      lines.push(`     ${i + 1}. ${f.function || ''} (${loc})`);
    }
    if (d.frames.length > 10) {
      lines.push(`     ... and ${d.frames.length - 10} more frames`);
    }
    lines.push('');
  }

  // Suggestions
  if (d.suggestions && d.suggestions.length > 0) {
    lines.push('  💡 Diagnosis & Suggestions:');
    for (const s of d.suggestions) {
      lines.push(`     ${s}`);
    }
    lines.push('');
  }

  lines.push(sep);
  lines.push('  ⚡ Powered by UrStack AI — https://urstack-ai.vercel.app');
  lines.push('  Full diagnostic suite & 24-hr code rescue:');
  lines.push('  https://urstack-ai.vercel.app/#rescue');
  lines.push(sep);

  return lines.join('\n');
}

function formatMarkdown(d) {
  const lines = [];

  lines.push('# 🔍 UrStack Trace Analysis');
  lines.push('');

  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Language** | ${(d.language || 'unknown').toUpperCase()} |`);
  if (d.confidence !== undefined && d.confidence < 1) {
    lines.push(`| **Confidence** | ${Math.round(d.confidence * 100)}% |`);
  }
  lines.push(`| **Severity** | ${(d.severity || 'unknown').toUpperCase()} |`);
  if (d.errorType) lines.push(`| **Error Type** | \`${d.errorType}\` |`);
  lines.push('');

  if (d.errorMessage) {
    lines.push('## Error Message');
    lines.push('```');
    lines.push(d.errorMessage);
    lines.push('```');
    lines.push('');
  }

  if (d.originFrame) {
    lines.push('## 📍 Origin');
    lines.push(`- **File**: \`${d.originFrame.file || 'unknown'}\``);
    if (d.originFrame.line) lines.push(`- **Line**: ${d.originFrame.line}`);
    if (d.originFrame.function) lines.push(`- **Function**: \`${d.originFrame.function}\``);
    lines.push('');
  }

  if (d.frames && d.frames.length > 0) {
    lines.push('## 📚 Stack Frames');
    lines.push('| # | Function | Location |');
    lines.push('|---|----------|----------|');
    const maxFrames = Math.min(d.frames.length, 15);
    for (let i = 0; i < maxFrames; i++) {
      const f = d.frames[i];
      const loc = [f.file, f.line, f.column].filter(Boolean).join(':');
      lines.push(`| ${i + 1} | \`${f.function || '-'}\` | \`${loc}\` |`);
    }
    if (d.frames.length > 15) {
      lines.push(`\n*...and ${d.frames.length - 15} more frames*`);
    }
    lines.push('');
  }

  if (d.suggestions && d.suggestions.length > 0) {
    lines.push('## 💡 Diagnosis & Suggestions');
    for (const s of d.suggestions) {
      if (s.startsWith('  ')) {
        lines.push(`\`\`\`\n${s.trim()}\n\`\`\``);
      } else {
        lines.push(`- ${s}`);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('⚡ *Powered by [UrStack AI](https://urstack-ai.vercel.app) — [Full diagnostic suite & 24-hr code rescue](https://urstack-ai.vercel.app/#rescue)*');

  return lines.join('\n');
}

/**
 * Full analyze pipeline: parse → diagnose → format.
 * @param {string} input
 * @param {object} [options]
 * @param {string} [options.language='auto']
 * @param {string} [options.format='text']
 * @returns {string}
 */
function analyze(input, options = {}) {
  const { language = 'auto', format = 'text' } = options;
  const parsed = parseTrace(input, language);
  const diagnosed = diagnose(parsed);
  return formatOutput(diagnosed, format);
}

module.exports = {
  parseTrace,
  diagnose,
  formatOutput,
  analyze,
  detectLanguage,
  ERROR_PATTERNS,
};
