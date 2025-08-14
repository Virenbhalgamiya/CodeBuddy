const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Groq API (OpenAI-compatible)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// In-memory session store for follow-up flow (per clientId)
const sessions = new Map(); // clientId -> { last_user_question: string, last_ai_answer: string }

function getSession(clientId) {
  const key = String(clientId || 'default_client');
  if (!sessions.has(key)) sessions.set(key, { last_user_question: '', last_ai_answer: '' });
  return sessions.get(key);
}

// Code execution timeout (5 seconds)
const EXECUTION_TIMEOUT = 5000;

// Language configurations
const languageConfigs = {
  python: {
    extension: 'py',
    command: 'python',
    template: '# Python code\n'
  },
  javascript: {
    extension: 'js',
    command: 'node',
    template: '// JavaScript code\n'
  },
  java: {
    extension: 'java',
    command: 'javac', // Compilation; running requires 'java' after compiling
    template: 'public class Main { public static void main(String[] args) { System.out.println("Hello, World!"); } }'
  },
  cpp: {
    extension: 'cpp',
    command: 'g++',
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}'
  },
  csharp: {
    extension: 'cs',
    command: 'dotnet-script',
    template: 'using System;\nclass Program { static void Main() { Console.WriteLine("Hello, World!"); } }'
  },
  go: {
    extension: 'go',
    command: 'go run',
    template: 'package main\nimport "fmt"\nfunc main() { fmt.Println("Hello, World!") }'
  },
  rust: {
    extension: 'rs',
    command: 'rustc', // Compilation; running requires './a.out' or similar
    template: 'fn main() {\n    println!("Hello, World!");\n}'
  },
  typescript: {
    extension: 'ts',
    command: 'ts-node',
    template: '// TypeScript code\n'
  },
  ruby: {
    extension: 'rb',
    command: 'ruby',
    template: '# Ruby code\nputs "Hello, World!"'
  },
  php: {
    extension: 'php',
    command: 'php',
    template: '<?php\necho "Hello, World!";\n?>'
  },
  swift: {
    extension: 'swift',
    command: 'swift',
    template: 'print("Hello, World!")'
  },
  kotlin: {
    extension: 'kt',
    command: 'kotlinc', // Compilation; running requires 'kotlin' after compiling
    template: 'fun main() {\n    println("Hello, World!")\n}'
  }
};

// Documentation map for inline links
const docMap = {
  Python: {
    pandas: 'https://pandas.pydata.org/docs/',
    DataFrame: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html',
    read_csv: 'https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html',
    numpy: 'https://numpy.org/doc/',
    np: 'https://numpy.org/doc/',
    matplotlib: 'https://matplotlib.org/stable/',
    plt: 'https://matplotlib.org/stable/',
    dict: 'https://docs.python.org/3/library/stdtypes.html#mapping-types-dict',
    list: 'https://docs.python.org/3/library/stdtypes.html#lists',
    set: 'https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset',
    tuple: 'https://docs.python.org/3/library/stdtypes.html#tuples',
    range: 'https://docs.python.org/3/library/functions.html#func-range',
    print: 'https://docs.python.org/3/library/functions.html#print'
  },
  C: {
    printf: 'https://en.cppreference.com/w/c/io/fprintf',
    malloc: 'https://en.cppreference.com/w/c/memory/malloc',
    free: 'https://en.cppreference.com/w/c/memory/free'
  },
  JavaScript: {
    Array: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
    map: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
    filter: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter',
    reduce: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce',
    fetch: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    Promise: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise'
  },
  Cpp: {
    vector: 'https://en.cppreference.com/w/cpp/container/vector',
    string: 'https://en.cppreference.com/w/cpp/string/basic_string',
    map: 'https://en.cppreference.com/w/cpp/container/map'
  }
};

function asGoogle(term) {
  const q = encodeURIComponent(`${term} documentation`);
  return `https://www.google.com/search?q=${q}`;
}

// Preferred documentation domains by language for higher-accuracy links
function preferredDocDomains(language) {
  const l = (language || '').toLowerCase();
  if (l === 'python') return ['docs.python.org', 'pandas.pydata.org', 'numpy.org', 'matplotlib.org', 'scipy.org', 'pytorch.org'];
  if (l === 'javascript' || l === 'js' || l === 'typescript' || l === 'ts') return ['developer.mozilla.org', 'nodejs.org', 'tc39.es'];
  if (l === 'java') return ['docs.oracle.com', 'openjdk.org'];
  if (l === 'cpp' || l === 'c++') return ['en.cppreference.com'];
  if (l === 'c') return ['en.cppreference.com'];
  if (l === 'go') return ['go.dev', 'pkg.go.dev'];
  if (l === 'rust') return ['doc.rust-lang.org'];
  if (l === 'ruby') return ['ruby-doc.org'];
  if (l === 'php') return ['www.php.net'];
  if (l === 'swift') return ['swift.org', 'developer.apple.com'];
  if (l === 'kotlin') return ['kotlinlang.org'];
  if (l === 'csharp' || l === 'c#') return ['learn.microsoft.com'];
  return [];
}

function buildGoogleSiteSearchLink(language, term) {
  const domains = preferredDocDomains(language);
  const queryTerm = `${term} ${language}`.trim();
  if (domains.length === 0) {
    return `https://www.google.com/search?q=${encodeURIComponent(queryTerm + ' documentation')}`;
  }
  // Use site filters to prefer official docs
  const siteFilter = domains.map(d => `site:${d}`).join(' OR ');
  const q = `${queryTerm} documentation ${siteFilter}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function detectLanguageKey(lang) {
  const l = (lang || '').toLowerCase();
  if (l === 'python') return 'Python';
  if (l === 'javascript' || l === 'js') return 'JavaScript';
  if (l === 'cpp' || l === 'c++') return 'Cpp';
  if (l === 'c') return 'C';
  return 'Python';
}

function extractTermsFromCode(code, language) {
  if (!code) return [];
  const langKey = detectLanguageKey(language);
  const terms = new Set();
  const lines = code.split(/\r?\n/);

  // Simple import detection
  if (langKey === 'Python') {
    for (const line of lines) {
      const m1 = line.match(/^\s*import\s+([\w_]+)/);
      if (m1) terms.add(m1[1]);
      const m2 = line.match(/^\s*from\s+([\w_]+)/);
      if (m2) terms.add(m2[1]);
    }
  } else if (langKey === 'JavaScript') {
    for (const line of lines) {
      const m = line.match(/from\s+['"]([^'"]+)['"]/);
      if (m) terms.add(m[1]);
    }
  } else if (langKey === 'Cpp' || langKey === 'C') {
    for (const line of lines) {
      const m = line.match(/^\s*#include\s*[<"]([^>"]+)[>"]/);
      if (m) terms.add(m[1].split('/').pop());
    }
  }

  // Identifier pass: pick known keys present in code
  const langMap = docMap[langKey] || {};
  const words = code.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  for (const w of words) {
    if (langMap[w]) terms.add(w);
  }

  // Cap to 30 candidates before mapping
  return Array.from(terms).slice(0, 30);
}

function buildInlineDocLinks(language, codeOrTerm) {
  const langKey = detectLanguageKey(language);
  const langMap = docMap[langKey] || {};
  const maxLinks = 15;
  let candidates = [];
  if (typeof codeOrTerm === 'string' && codeOrTerm.includes('\n')) {
    candidates = extractTermsFromCode(codeOrTerm, language);
  } else if (typeof codeOrTerm === 'string') {
    candidates = [codeOrTerm];
  }
  const links = [];
  for (const term of candidates) {
    let docUrl = langMap[term] || langMap[term.replace(/^[A-Z][a-z]+/, (x) => x.toLowerCase())] || null;
    if (!docUrl) docUrl = asGoogle(term);
    if (typeof docUrl === 'string' && docUrl.startsWith('http')) {
      const httpsUrl = docUrl.replace(/^http:/, 'https:');
      links.push({ term, doc_url: httpsUrl });
    }
    if (links.length >= maxLinks) break;
  }
  return links;
}

// Helper function to safely execute code
async function executeCode(code, language) {
  return new Promise((resolve, reject) => {
    const config = languageConfigs[language];
    if (!config) {
      return reject(new Error('Unsupported language'));
    }

    const filename = `temp_${uuidv4()}.${config.extension}`;
    const filepath = `./temp/${filename}`;

    try {
      // Write code to temporary file
      writeFileSync(filepath, code);

      let command;
      if (language === 'cpp') {
        // For C++, compile first then run
        const outputFile = `./temp/output_${uuidv4()}`;
        command = `${config.command} ${filepath} -o ${outputFile} && ${outputFile}`;
      } else {
        command = `${config.command} ${filepath}`;
      }

      exec(command, { timeout: EXECUTION_TIMEOUT }, (error, stdout, stderr) => {
        // Clean up temporary files
        try {
          unlinkSync(filepath);
          if (language === 'cpp') {
            const outputFile = command.split(' ').pop();
            unlinkSync(outputFile);
          }
        } catch (cleanupError) {
          console.log('Cleanup error:', cleanupError.message);
        }

        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    } catch (writeError) {
      reject(new Error(`Failed to write temporary file: ${writeError.message}`));
    }
  });
}

// Helper function to get LLM response using Groq API
async function getLLMResponse(prompt, context = '', isConceptual = false) {
  try {
    const fullPrompt = context ? `${context}\n\nQuestion: ${prompt}` : prompt;
    
    // Different system prompts based on the type of request
    let systemPrompt;
    if (isConceptual) {
      systemPrompt = `You are a conceptual programming mentor. Your role is to provide ONLY conceptual guidance, reasoning, and thought processes. 

CRITICAL RULES:
- NEVER provide code snippets, syntax examples, or function implementations
- NEVER show actual code solutions
- Focus ONLY on explaining concepts, logic, and reasoning
- Provide guidance on what to think about and how to approach problems
- Explain the underlying principles and concepts involved
- Guide users through the thought process without giving direct answers

Your responses should help users understand the concepts and develop their problem-solving skills, not provide ready-made solutions.`;
    } else {
      systemPrompt = `You are a helpful coding assistant focused on error analysis and debugging guidance. 

CRITICAL RULES:
- NEVER provide code snippets, syntax examples, or function implementations
- NEVER show actual code solutions or fixes
- Focus ONLY on explaining what went wrong and how to think about fixing it
- Provide conceptual guidance on what to check and where the mistake might be
- Explain the reasoning behind the error and what concepts are involved
- Guide users through the debugging thought process without giving direct code solutions

Your responses should help users understand the error and develop their debugging skills, not provide ready-made fixes.`;
    }
    
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192", // Using LLaMA 3 70B model
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('LLM API Error:', error);
    throw new Error('Failed to get response from AI assistant');
  }
}

// Heuristic concept extraction and brief summary generator
const conceptCatalog = [
  { name: 'Recursion', patterns: [/def\s+\w+\s*\(.*\)\s*:\s*\n\s*return\s*\w+\(.*\)/i, /recursive/i], description: 'A function calling itself to solve smaller subproblems.', link: 'https://en.wikipedia.org/wiki/Recursion_(computer_science)' },
  { name: 'Binary Search', patterns: [/low\s*=\s*0.*high|mid\s*=\s*(low\s*\+\s*high)\s*\/\s*2/i, /binary\s*search/i], description: 'Efficient search by halving the range on sorted data.', link: 'https://en.wikipedia.org/wiki/Binary_search_algorithm' },
  { name: 'Sliding Window', patterns: [/window|left\s*=|right\s*=/i, /sliding\s*window/i], description: 'Maintain a moving subrange to optimize sequence processing.', link: 'https://en.wikipedia.org/wiki/Sliding_window_protocol' },
  { name: 'Depth-First Search', patterns: [/dfs\b|stack\b|recursion\b/i], description: 'Traverse deeper along paths before backtracking.', link: 'https://en.wikipedia.org/wiki/Depth-first_search' },
  { name: 'Breadth-First Search', patterns: [/bfs\b|queue\b/i], description: 'Explore neighbors level by level.', link: 'https://en.wikipedia.org/wiki/Breadth-first_search' },
  { name: 'Dynamic Programming', patterns: [/dp\b|memo(i[sz])?e|cache\b|bottom[- ]up|top[- ]down/i], description: 'Break problems into overlapping subproblems and reuse results.', link: 'https://en.wikipedia.org/wiki/Dynamic_programming' },
  { name: 'Hash Map', patterns: [/dict\b|\bmap\b|HashMap\b/i], description: 'Key–value storage for fast lookups.', link: 'https://en.wikipedia.org/wiki/Hash_table' },
  { name: 'Stack', patterns: [/stack\b|append\(|push\(|pop\(/i], description: 'LIFO structure for nested or backtracking logic.', link: 'https://en.wikipedia.org/wiki/Stack_(abstract_data_type)' },
  { name: 'Queue', patterns: [/queue\b|popleft\(|enqueue|dequeue/i], description: 'FIFO structure for scheduling or BFS.', link: 'https://en.wikipedia.org/wiki/Queue_(abstract_data_type)' },
  { name: 'Two Pointers', patterns: [/i\s*<\s*j|left\s*<\s*right/i], description: 'Use two indices to scan from ends or positions.', link: 'https://www.geeksforgeeks.org/two-pointers-technique/' }
];

function extractConcepts(code, language) {
  const concepts = [];
  for (const c of conceptCatalog) {
    if (c.patterns.some((p) => p.test(code))) {
      concepts.push({ name: c.name, description: c.description, link: c.link });
    }
  }
  // Cap to 10
  return concepts.slice(0, 10);
}

function generateBriefSummary(code, language) {
  const lines = (code || '').split(/\r?\n/);
  const hasImports = /\bimport\b|#include\b|from\b/.test(code);
  const hasIO = /print\(|console\.log\(|scanf|printf|read|write/.test(code);
  const hasLoop = /for\b|while\b/.test(code);
  const hasFunc = /def\b|function\b|\bclass\b|\)\s*{/.test(code);
  const parts = [];
  parts.push('This code processes data using basic program flow.');
  if (hasImports) parts.push('It imports or includes external modules.');
  if (hasLoop) parts.push('It iterates over data using loops.');
  if (hasFunc) parts.push('It organizes logic in functions or classes.');
  if (hasIO) parts.push('It produces output for inspection.');
  const sent = parts.slice(0, 3).join(' ');
  return sent || 'This code performs straightforward computations and control flow.';
}

function attachSummaryAndConcepts(language, code) {
  return {
    code_summary: generateBriefSummary(code, language),
    key_concepts: extractConcepts(code, language)
  };
}

async function generateDynamicSummaryAndConcepts(code, language) {
  const prompt = `Extract a short, plain-language summary and relevant theoretical concepts from this ${language} code.\n\nRETURN ONLY JSON with this schema and nothing else:\n{\n  "code_summary": "<2-3 sentence summary>",\n  "key_concepts": [\n    { "name": "<concept>", "description": "<one-line purpose>", "link": "<safe https link>" }\n  ]\n}\n\nRules:\n- No code in the summary.\n- Pick only relevant concepts (algorithms, data structures, programming concepts).\n- Links must be safe and reputable (Wikipedia, official docs, MDN, W3Schools, GeeksforGeeks).\n- Keep everything concise and beginner-friendly.\n\nCode:\n${code}`;
  try {
    const raw = await getLLMResponse(prompt, `Language: ${language}`, true);
    const match = raw && typeof raw === 'string' ? raw.match(/\{[\s\S]*\}$/) : null;
    const parsed = match ? JSON.parse(match[0]) : JSON.parse(raw);
    if (parsed && typeof parsed.code_summary === 'string' && Array.isArray(parsed.key_concepts)) {
      // sanitize links to https and cap items
      let concepts = parsed.key_concepts
        .filter((c) => c && c.name && c.description)
        .slice(0, 10)
        .map((c) => ({
          name: String(c.name),
          description: String(c.description),
          link: c.link ? String(c.link).replace(/^http:/, 'https:') : undefined
        }));
      // Ensure dynamic, accurate links by building a Google site-filtered search if link is missing or looks generic
      concepts = concepts.map((c) => {
        const hasGoodLink = c.link && /^https:\/\//.test(c.link) && !/google\.com\/search\?q=$/.test(c.link);
        return {
          ...c,
          link: hasGoodLink ? c.link : buildGoogleSiteSearchLink(language, c.name)
        };
      });
      return { code_summary: parsed.code_summary, key_concepts: concepts };
    }
  } catch (e) {
    // fall through to heuristic
  }
  // heuristic fallback
  const fallback = attachSummaryAndConcepts(language, code);
  // Upgrade fallback concept links with dynamic site-filtered search
  fallback.key_concepts = (fallback.key_concepts || []).map((c) => ({
    ...c,
    link: buildGoogleSiteSearchLink(language, c.name)
  }));
  return fallback;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Virtual Teaching Assistant Backend is running' });
});

// Execute code
app.post('/api/execute', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    if (!languageConfigs[language]) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    const result = await executeCode(code, language);
    res.json({ success: true, output: result, error: null });
  } catch (error) {
    res.json({ success: false, output: null, error: error.message });
  }
});

// Get error explanation from LLM
app.post('/api/solve-error', async (req, res) => {
  try {
    const { error, code, language } = req.body;

    if (!error) {
      return res.status(400).json({ error: 'Error message is required' });
    }

    const context = code ? `Code:\n${code}\n\nLanguage: ${language}\n\nError:` : '';
    const prompt = `Analyze this error and provide conceptual guidance to approach fixing it. Return output as 3-4 very short bullet points. Start each with '- '. Keep each bullet 12 words or less. No introductions, no headings, no summaries.\n\n${error}`;
    
    const explanation = await getLLMResponse(prompt, context, false);
    const inline_doc_links = buildInlineDocLinks(language, code || '');
    const { code_summary, key_concepts } = await generateDynamicSummaryAndConcepts(code || '', language);
    res.json({ explanation, inline_doc_links, code_summary, key_concepts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ask conceptual question
app.post('/api/ask-question', async (req, res) => {
  try {
    const { question, clientId } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const prompt = `Provide conceptual guidance and reasoning for this programming question. Focus on underlying concepts and approach. Return output as 3-4 very short bullet points. Start each with '- '. Keep each bullet 12 words or less. No introductions, no headings, no summaries.\n\n${question}`;
    
    const answer = await getLLMResponse(prompt, '', true);
    // Track session state for follow-ups
    const session = getSession(clientId);
    session.last_user_question = question;
    session.last_ai_answer = answer;
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get live explanation for code content
app.post('/api/explain-code', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const prompt = `Analyze this ${language} code and explain what it does clearly.\n\n${code}\n\nReturn output as 3-4 very short bullet points. Start each with '- '. Keep each bullet 12 words or less. No introductions, no headings, no summaries.`;
    
    const explanation = await getLLMResponse(prompt);
    const inline_doc_links = buildInlineDocLinks(language, code);
    const { code_summary, key_concepts } = await generateDynamicSummaryAndConcepts(code, language);
    res.json({ explanation, inline_doc_links, code_summary, key_concepts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get keyword explanation with enhanced features
app.post('/api/explain-keyword', async (req, res) => {
  try {
    const { keyword, context } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const prompt = `CRITICAL RULE (DO NOT IGNORE THIS RULE): For EVERY library, keyword, function, or class you explain (e.g., pandas, numpy, map, DataFrame, print), you MUST append two links in parentheses immediately after the explanation: (Docs: <official_link>, Beginner Guide: <tutorial_link>). If you do not know the exact official link, use (Search: https://www.google.com/search?q=<term>+documentation). Do NOT skip adding links for any recognized term, even if it appears multiple times. Use this exact format for every term.

EXAMPLE:
pandas: A Python data analysis library (Docs: https://pandas.pydata.org/docs/, Beginner Guide: https://realpython.com/pandas-python-explore-dataset/)

Explain the programming keyword/concept "${keyword}" in a clear, educational way. 

Context: ${context || 'General programming context'}

Return output as 3-5 very short bullet points. Start each with '- '. Keep each bullet 12 words or less. No introductions, no headings, no summaries.

Please provide:
1. A clear explanation of what this keyword/concept does
2. If it's a library, function, or framework, include official documentation links and a beginner-friendly tutorial link in parentheses
3. If the code context suggests a specific programming pattern (like sliding window, binary search, DFS, BFS, dynamic programming), briefly describe the pattern, its purpose, and common use cases
4. For each main logic section, explain the reasoning behind why the code produces the correct result
5. Include time and space complexity analysis in Big-O notation where relevant`;
    
    const explanation = await getLLMResponse(prompt, context, true);
    const ctx = (context || '').toLowerCase();
    const inferredLang = ctx.includes('javascript') ? 'JavaScript' : ctx.includes('python') ? 'Python' : ctx.includes('c++') || ctx.includes('cpp') ? 'Cpp' : ctx.includes(' c ') || ctx.startsWith('c ') ? 'C' : 'Python';
    const inline_doc_links = buildInlineDocLinks(inferredLang, keyword);
    res.json({ explanation, inline_doc_links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced code analysis with pattern detection and "Why This Works" mode
app.post('/api/analyze-code', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const prompt = `CRITICAL RULE (DO NOT IGNORE THIS RULE): For EVERY library, keyword, function, or class you explain (e.g., pandas, numpy, map, DataFrame, print), you MUST append two links in parentheses immediately after the explanation: (Docs: <official_link>, Beginner Guide: <tutorial_link>). If you do not know the exact official link, use (Search: https://www.google.com/search?q=<term>+documentation). Do NOT skip adding links for any recognized term, even if it appears multiple times. Use this exact format for every term.\n\nEXAMPLE:\npandas: A Python data analysis library (Docs: https://pandas.pydata.org/docs/, Beginner Guide: https://realpython.com/pandas-python-explore-dataset/)\n\nPerform a comprehensive analysis of this ${language} code with the following enhancements:\n\n${code}\n\nReturn output primarily as very short bullet points. Start each bullet with '- '. Keep bullets concise (≤ 12 words). No introductions, no headings, no summaries.\n\nPlease provide:\n1. Basic explanation: what the code does and its purpose\n2. Inline Concept Links: include official docs and beginner tutorials in parentheses\n3. Code Pattern Detection: detect known patterns, with name, purpose, use cases\n4. "Why This Works": reasoning plus Big-O time and space complexity`;
    
    const analysis = await getLLMResponse(prompt, `Language: ${language}`, true);
    const inline_doc_links = buildInlineDocLinks(language, code);
    const { code_summary, key_concepts } = await generateDynamicSummaryAndConcepts(code, language);
    res.json({ analysis, inline_doc_links, code_summary, key_concepts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate interactive follow-up questions (no more than 5, unique, concise)
app.post('/api/follow-ups', async (req, res) => {
  try {
    const { clientId, code, language } = req.body;
    const session = getSession(clientId);

    let baseContext = '';
    // If no last question yet and code is present, use code + detected concepts
    if (!session.last_user_question && typeof code === 'string' && code.trim().length > 0) {
      const { key_concepts } = await generateDynamicSummaryAndConcepts(code, language || '');
      const conceptNames = (key_concepts || []).map((c) => c.name).slice(0, 8);
      baseContext = `Code (truncated to 400 chars):\n${code.slice(0, 400)}\n\nDetected Concepts: ${conceptNames.join(', ')}`;
    } else if (session.last_user_question && session.last_ai_answer) {
      // Use last Q/A context
      baseContext = `Last Question: ${session.last_user_question}\nLast Answer: ${session.last_ai_answer}`;
    } else {
      return res.json({ follow_up_questions: [] });
    }

    const fuPrompt = `Based on the context below, generate 3-5 SHORT follow-up questions that encourage deeper thinking.\nRules:\n- Max 20 words each\n- No duplicates\n- No introductions\n- No numbering\n- Only questions\n\nContext:\n${baseContext}`;

    const raw = await getLLMResponse(fuPrompt, '', true);
    // Parse bullets/lines into array
    let lines = (raw || '').split(/\r?\n/).map((l) => l.replace(/^[-•\s]+/, '').trim()).filter(Boolean);
    // Deduplicate, cap 5, enforce length
    const seen = new Set();
    const follow_up_questions = [];
    for (const l of lines) {
      const q = l.endsWith('?') ? l : `${l}?`;
      const short = q.length > 140 ? q.slice(0, 137) + '…' : q; // hard cap safeguard
      const normalized = short.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        follow_up_questions.push(short);
      }
      if (follow_up_questions.length >= 5) break;
    }
    return res.json({ follow_up_questions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Removed /api/pseudo-explain and /api/pseudocode-with-hover feature endpoints

// Dynamic line fix suggestion endpoint
app.post('/api/line-fix-suggestion', async (req, res) => {
  try {
    const { code, language, error, line } = req.body;
    if (!code || !language || !error || !line) {
      return res.status(400).json({ error: 'code, language, error, and line are required' });
    }

    const llmPrompt = `You are a coding tutor. Propose a minimal, safe, context-aware fix for the error at line ${line} in this ${language} code. RETURN ONLY JSON with fields: {"label": "<short button text>", "edit": {"startLine": int, "startColumn": int, "endLine": int, "endColumn": int, "text": "<replacement text>"}}. Do not include any extra text.

Code:\n${code}\n
Error:\n${error}\n
Rules:
- Keep changes minimal.
- Do not rewrite unrelated lines.
- Prefer adding imports/definitions at the top when needed.
- If unsure, leave edit as null but provide a helpful label.`;

    let suggestion = null;
    try {
      const raw = await getLLMResponse(llmPrompt, `Language: ${language}`, true);
      const match = raw && typeof raw === 'string' ? raw.match(/\{[\s\S]*\}$/) : null;
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(raw);
      if (parsed && parsed.label) {
        suggestion = {
          label: String(parsed.label).slice(0, 120),
          edit: parsed.edit && typeof parsed.edit === 'object' ? {
            startLine: Number(parsed.edit.startLine),
            startColumn: Number(parsed.edit.startColumn),
            endLine: Number(parsed.edit.endLine),
            endColumn: Number(parsed.edit.endColumn),
            text: String(parsed.edit.text || '')
          } : null
        };
      }
    } catch (e) {
      // Fall back to heuristics
    }

    if (!suggestion) {
      // Heuristic fallbacks for common Python symbols
      const isPython = (language || '').toLowerCase() === 'python';
      const lines = code.split(/\r?\n/);
      const lineText = lines[line - 1] || '';
      if (isPython && /\bpd\b/.test(lineText) && !/import\s+pandas\s+as\s+pd/.test(code)) {
        suggestion = { label: 'Add import pandas as pd', edit: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1, text: 'import pandas as pd\n' } };
      } else if (isPython && /\bnp\b/.test(lineText) && !/import\s+numpy\s+as\s+np/.test(code)) {
        suggestion = { label: 'Add import numpy as np', edit: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1, text: 'import numpy as np\n' } };
      } else if (isPython && /\bplt\b/.test(lineText) && !/import\s+matplotlib\.pyplot\s+as\s+plt/.test(code)) {
        suggestion = { label: 'Add import matplotlib.pyplot as plt', edit: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1, text: 'import matplotlib.pyplot as plt\n' } };
      } else {
        suggestion = { label: 'Review this line: define variable or import symbol', edit: null };
      }
    }

    return res.json(suggestion);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Get supported languages
app.get('/api/languages', (req, res) => {
  const languages = Object.keys(languageConfigs).map(lang => ({
    name: lang,
    displayName: lang.charAt(0).toUpperCase() + lang.slice(1),
    extension: languageConfigs[lang].extension,
    template: languageConfigs[lang].template
  }));
  res.json(languages);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Create temp directory if it doesn't exist
const fs = require('fs');
const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Virtual Teaching Assistant Backend running on port ${PORT}`);
  console.log(`📚 Supported languages: ${Object.keys(languageConfigs).join(', ')}`);
  console.log(`🤖 LLM Integration: ${process.env.GROQ_API_KEY ? 'Enabled' : 'Disabled (set GROQ_API_KEY)'}`);
}); 