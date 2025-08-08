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
  cpp: {
    extension: 'cpp',
    command: 'g++',
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}'
  }
};

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
      temperature: 0.7
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('LLM API Error:', error);
    throw new Error('Failed to get response from AI assistant');
  }
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
    const prompt = `Analyze this error and provide conceptual guidance on how to approach fixing it. Focus on what concepts are involved, what to check, and the reasoning process - but do NOT provide any code solutions or syntax examples:\n\n${error}`;
    
    const explanation = await getLLMResponse(prompt, context, false);
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ask conceptual question
app.post('/api/ask-question', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const prompt = `Provide conceptual guidance and reasoning for this programming question. Focus on explaining the underlying concepts, logic, and thought process - but do NOT provide any code examples, syntax, or function implementations:\n\n${question}`;
    
    const answer = await getLLMResponse(prompt, '', true);
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

    const prompt = `Analyze this ${language} code and explain what it does in a clear, educational way. Focus on the logic, purpose, and how it works:

${code}

Provide a concise explanation that would help a student understand what this code accomplishes.`;
    
    const explanation = await getLLMResponse(prompt);
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ error: error.message });
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